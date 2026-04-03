"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

function generateBorrowNumber(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const r = String(Math.floor(Math.random() * 9999)).padStart(4, "0")
  return `BRW${y}${m}${r}`
}

export async function getBorrows(filters?: {
  status?: string
  source_type?: string
  search?: string
}) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("inventory_borrows")
    .select("*, users!inventory_borrows_requested_by_fkey(full_name), inventory_borrow_items(id)")
    .eq("order_type", "borrow")
    .order("created_at", { ascending: false })
    .limit(50)

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status)
  }
  if (filters?.source_type && filters.source_type !== "all") {
    query = query.eq("source_type", filters.source_type)
  }
  if (filters?.search) {
    query = query.or(`borrow_number.ilike.%${filters.search}%,source_name.ilike.%${filters.search}%`)
  }

  const { data, error } = await query
  if (error) throw error

  return (data ?? []).map((b: Record<string, unknown>) => ({
    id: b.id,
    borrow_number: b.borrow_number,
    source_type: b.source_type,
    source_name: b.source_name,
    status: b.status,
    borrow_date: b.borrow_date,
    due_date: b.due_date,
    item_count: (b.inventory_borrow_items as unknown as Array<{ id: string }>)?.length ?? 0,
    requested_by_name: (b.users as unknown as { full_name: string } | null)?.full_name ?? "ไม่ระบุ",
  }))
}

export async function getBorrowById(id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const [borrowResult, itemsResult, photosResult] = await Promise.all([
    supabase
      .from("inventory_borrows")
      .select("*, users!inventory_borrows_requested_by_fkey(full_name), suppliers(name)")
      .eq("id", id)
      .single(),
    supabase
      .from("inventory_borrow_items")
      .select("*, products(name, ref, brand, unit), cases(case_number), inventory(lot_number)")
      .eq("borrow_id", id)
      .order("created_at"),
    supabase
      .from("inventory_borrow_photos")
      .select("*, users!inventory_borrow_photos_uploaded_by_fkey(full_name)")
      .eq("borrow_id", id)
      .order("created_at"),
  ])

  if (borrowResult.error) throw borrowResult.error

  return {
    ...borrowResult.data,
    items: itemsResult.data ?? [],
    photos: photosResult.data ?? [],
  }
}

export async function createBorrow(data: {
  source_type: "clinic" | "supplier"
  source_name: string
  supplier_id?: string
  due_date?: string
  notes?: string
  items: Array<{
    product_id: string
    quantity: number
    lot_number: string
    expiry_date?: string
  }>
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: borrow, error: borrowError } = await supabase
    .from("inventory_borrows")
    .insert({
      borrow_number: generateBorrowNumber(),
      source_type: data.source_type,
      source_name: data.source_name,
      supplier_id: data.supplier_id || null,
      due_date: data.due_date || null,
      notes: data.notes || null,
      requested_by: user.id,
      status: "borrowed",
    })
    .select()
    .single()

  if (borrowError) throw borrowError

  for (const item of data.items) {
    const { data: inv, error: invError } = await supabase
      .from("inventory")
      .insert({
        product_id: item.product_id,
        lot_number: item.lot_number,
        quantity: item.quantity,
        reserved_quantity: 0,
        expiry_date: item.expiry_date || null,
        received_date: new Date().toISOString().split("T")[0],
      })
      .select("id")
      .single()

    if (invError) throw invError

    const { error: itemError } = await supabase
      .from("inventory_borrow_items")
      .insert({
        borrow_id: borrow.id,
        product_id: item.product_id,
        inventory_id: inv.id,
        quantity: item.quantity,
        status: "borrowed",
      })

    if (itemError) throw itemError
  }

  revalidatePath("/inventory/borrows")
  revalidatePath("/inventory")
  return borrow
}

export async function settleBorrowItem(
  itemId: string,
  settlement: {
    type: "return" | "exchange" | "payment"
    product_id?: string
    amount?: number
    note?: string
  }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const statusMap = { return: "returned", exchange: "exchanged", payment: "paid" }

  const { data: item, error: fetchError } = await supabase
    .from("inventory_borrow_items")
    .select("borrow_id")
    .eq("id", itemId)
    .single()

  if (fetchError) throw fetchError

  const { error } = await supabase
    .from("inventory_borrow_items")
    .update({
      status: statusMap[settlement.type],
      settlement_type: settlement.type,
      settlement_product_id: settlement.product_id || null,
      settlement_amount: settlement.amount || null,
      settlement_note: settlement.note || null,
      settled_at: new Date().toISOString(),
    })
    .eq("id", itemId)

  if (error) throw error

  const { data: remaining } = await supabase
    .from("inventory_borrow_items")
    .select("id")
    .eq("borrow_id", item.borrow_id)
    .eq("status", "borrowed")
    .limit(1)

  if (!remaining || remaining.length === 0) {
    await supabase
      .from("inventory_borrows")
      .update({ status: "returned", returned_at: new Date().toISOString() })
      .eq("id", item.borrow_id)
  }

  revalidatePath("/inventory/borrows")
  revalidatePath(`/inventory/borrows/${item.borrow_id}`)
}

export async function uploadBorrowPhoto(borrowId: string, photoUrl: string, description?: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from("inventory_borrow_photos")
    .insert({
      borrow_id: borrowId,
      photo_url: photoUrl,
      description: description || null,
      uploaded_by: user.id,
    })

  if (error) throw error
  revalidatePath(`/inventory/borrows/${borrowId}`)
}
