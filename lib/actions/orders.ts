"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { POStatus } from "@/types/database"

function generatePONumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const random = String(Math.floor(Math.random() * 9999)).padStart(4, "0")
  return `PO${year}${month}${random}`
}

export async function getPurchaseOrders(filters?: {
  status?: POStatus
  search?: string
}) {
  const supabase = await createClient()
  let query = supabase
    .from("purchase_orders")
    .select(`
      *,
      suppliers(name),
      requester:users!purchase_orders_requested_by_fkey(full_name),
      approver:users!purchase_orders_approved_by_fkey(full_name),
      purchase_order_items(id, quantity, unit_price, total_price, products(name, ref))
    `)
    .order("created_at", { ascending: false })

  if (filters?.status) {
    query = query.eq("status", filters.status)
  }
  if (filters?.search) {
    query = query.ilike("po_number", `%${filters.search}%`)
  }

  const { data, error } = await query.limit(50)
  if (error) throw error
  return data ?? []
}

export async function getPurchaseOrderById(id: string) {
  const supabase = await createClient()

  const [poResult, itemsResult] = await Promise.all([
    supabase
      .from("purchase_orders")
      .select(`
        *,
        suppliers(id, name, code, contact_person, phone, email),
        requester:users!purchase_orders_requested_by_fkey(full_name),
        approver:users!purchase_orders_approved_by_fkey(full_name)
      `)
      .eq("id", id)
      .single(),
    supabase
      .from("purchase_order_items")
      .select("*, products(name, ref, brand, unit)")
      .eq("po_id", id),
  ])

  if (poResult.error) throw poResult.error
  return {
    ...poResult.data,
    items: itemsResult.data ?? [],
  }
}

export async function createPurchaseOrder(
  supplierId: string,
  items: Array<{ product_id: string; quantity: number; unit_price: number }>,
  notes?: string,
  expectedDeliveryDate?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Create PO
  const { data: po, error: poError } = await supabase
    .from("purchase_orders")
    .insert({
      po_number: generatePONumber(),
      supplier_id: supplierId,
      status: "draft" as POStatus,
      notes: notes || null,
      expected_delivery_date: expectedDeliveryDate || null,
      requested_by: user.id,
      total_amount: items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0),
    })
    .select()
    .single()

  if (poError) throw poError

  // Insert items
  const { error: itemsError } = await supabase
    .from("purchase_order_items")
    .insert(
      items.map((item) => ({
        po_id: po.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }))
    )

  if (itemsError) throw itemsError

  revalidatePath("/orders")
  return po
}

export async function getOverduePOs() {
  const supabase = await createClient()
  const today = new Date().toISOString().split("T")[0]

  const { data, error } = await supabase
    .from("purchase_orders")
    .select("id, po_number, expected_delivery_date, status, suppliers(name)")
    .eq("status", "ordered")
    .lt("expected_delivery_date", today)
    .not("expected_delivery_date", "is", null)
    .order("expected_delivery_date")

  if (error) throw error
  return (data ?? []).map((po) => ({
    id: po.id,
    poNumber: po.po_number,
    expectedDate: po.expected_delivery_date,
    supplierName: (po.suppliers as unknown as { name: string } | null)?.name ?? "-",
  }))
}

export async function updatePOStatus(id: string, status: POStatus) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const update: Record<string, unknown> = { status }
  if (status === "approved") {
    update.approved_by = user.id
    update.approved_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from("purchase_orders")
    .update(update)
    .eq("id", id)

  if (error) throw error
  revalidatePath("/orders")
  revalidatePath(`/orders/${id}`)
}
