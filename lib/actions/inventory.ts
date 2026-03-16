"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { ProductCategory } from "@/types/database"

export async function getInventory(filters?: {
  product_id?: string
  category?: ProductCategory
  search?: string
  low_stock_only?: boolean
}) {
  const supabase = await createClient()
  let query = supabase
    .from("inventory")
    .select(`
      *,
      products!inner(id, ref, name, brand, category, unit, min_stock_level, suppliers(name))
    `)
    .gt("quantity", 0)
    .order("expiry_date", { ascending: true, nullsFirst: false })

  if (filters?.product_id) {
    query = query.eq("product_id", filters.product_id)
  }
  if (filters?.category) {
    query = query.eq("products.category", filters.category)
  }
  if (filters?.search) {
    query = query.or(
      `products.name.ilike.%${filters.search}%,products.ref.ilike.%${filters.search}%,lot_number.ilike.%${filters.search}%`,
    )
  }

  const { data, error } = await query.limit(200)
  if (error) throw error
  return data ?? []
}

export async function getStockSummary() {
  const supabase = await createClient()

  // Get products with their total available stock
  const { data, error } = await supabase
    .from("products")
    .select(`
      id, ref, name, brand, category, unit, min_stock_level,
      suppliers(name),
      inventory(quantity, reserved_quantity)
    `)
    .eq("is_active", true)
    .order("name")

  if (error) throw error

  return (data ?? []).map((p) => {
    const rows = (p.inventory as Array<{ quantity: number; reserved_quantity: number }>) ?? []
    const totalStock = rows.reduce((sum, r) => sum + r.quantity - r.reserved_quantity, 0)
    const isLowStock = totalStock <= p.min_stock_level
    return {
      ...p,
      totalStock,
      isLowStock,
      supplierName: (p.suppliers as unknown as { name: string } | null)?.name ?? null,
    }
  })
}

export async function getLowStockCount() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("products")
    .select("id, min_stock_level, inventory(quantity, reserved_quantity)")
    .eq("is_active", true)

  if (error) throw error

  let count = 0
  for (const p of data ?? []) {
    const rows = (p.inventory as Array<{ quantity: number; reserved_quantity: number }>) ?? []
    const total = rows.reduce((sum, r) => sum + r.quantity - r.reserved_quantity, 0)
    if (total <= p.min_stock_level) count++
  }
  return count
}

export async function getInventoryForProduct(productId: string) {
  const supabase = await createClient()

  // FIFO order: earliest expiry first, then oldest received
  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .eq("product_id", productId)
    .gt("quantity", 0)
    .order("expiry_date", { ascending: true, nullsFirst: false })
    .order("received_date", { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function receiveGoods(
  items: Array<{
    product_id: string
    lot_number: string
    quantity: number
    expiry_date: string | null
    po_id: string | null
    invoice_number: string | null
  }>
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Batch insert inventory rows
  const rows = items.map((item) => ({
    product_id: item.product_id,
    lot_number: item.lot_number,
    quantity: item.quantity,
    reserved_quantity: 0,
    expiry_date: item.expiry_date || null,
    received_date: new Date().toISOString().split("T")[0],
    po_id: item.po_id || null,
    invoice_number: item.invoice_number || null,
  }))

  const { error } = await supabase.from("inventory").insert(rows)
  if (error) throw error

  revalidatePath("/inventory")
  revalidatePath("/dashboard")
}

export async function getAvailableStock(productId: string): Promise<number> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("inventory")
    .select("quantity, reserved_quantity")
    .eq("product_id", productId)
    .gt("quantity", 0)

  if (error) throw error
  return (data ?? []).reduce((sum, r) => sum + r.quantity - r.reserved_quantity, 0)
}

export async function suggestLotFEFO(
  productId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  quantity: number
): Promise<Array<{ id: string; lot_number: string; expiry_date: string | null; available: number }>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("inventory")
    .select("id, lot_number, expiry_date, quantity, reserved_quantity")
    .eq("product_id", productId)
    .gt("quantity", 0)
    .order("expiry_date", { ascending: true, nullsFirst: false })
    .order("received_date", { ascending: true })

  if (error) throw error

  return (data ?? [])
    .map((row) => ({
      id: row.id,
      lot_number: row.lot_number,
      expiry_date: row.expiry_date,
      available: row.quantity - row.reserved_quantity,
    }))
    .filter((row) => row.available > 0)
}

export async function getSuppliers() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, code, name")
    .eq("is_active", true)
    .order("name")

  if (error) throw error
  return data ?? []
}

export async function getProductsBySupplier(supplierId: string, category?: ProductCategory) {
  const supabase = await createClient()
  let query = supabase
    .from("products")
    .select("id, ref, name, brand, category, unit")
    .eq("supplier_id", supplierId)
    .eq("is_active", true)
    .order("name")

  if (category) {
    query = query.eq("category", category)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getProductIdsWithActivePOs(): Promise<Set<string>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("purchase_order_items")
    .select("product_id, purchase_orders!inner(status)")
    .in("purchase_orders.status", ["draft", "pending_approval", "approved", "ordered"])
  return new Set((data ?? []).map((d) => d.product_id))
}

export async function getDeadStock(days: number = 90) {
  const supabase = await createClient()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString().split("T")[0]

  // Products with stock but no reservations or inventory received since cutoff
  const { data: products, error } = await supabase
    .from("products")
    .select("id, ref, name, brand, category, unit, inventory(quantity, reserved_quantity, received_date)")
    .eq("is_active", true)

  if (error) throw error

  const deadItems: Array<{
    id: string; ref: string; name: string; brand: string | null
    category: string; unit: string; totalStock: number; lastReceived: string | null
  }> = []

  for (const p of products ?? []) {
    const rows = (p.inventory as Array<{ quantity: number; reserved_quantity: number; received_date: string }>) ?? []
    const totalStock = rows.reduce((sum, r) => sum + r.quantity - r.reserved_quantity, 0)
    if (totalStock <= 0) continue

    const lastReceived = rows.length > 0
      ? rows.reduce((latest, r) => r.received_date > latest ? r.received_date : latest, rows[0].received_date)
      : null

    if (!lastReceived || lastReceived < cutoffStr) {
      deadItems.push({
        id: p.id, ref: p.ref, name: p.name, brand: p.brand,
        category: p.category, unit: p.unit, totalStock, lastReceived,
      })
    }
  }

  return deadItems
}

export async function checkAutoReorder() {
  const supabase = await createClient()

  // Get products below min stock
  const { data: products, error } = await supabase
    .from("products")
    .select("id, ref, name, min_stock_level, supplier_id, inventory(quantity, reserved_quantity)")
    .eq("is_active", true)

  if (error) throw error

  // Get products that already have active POs
  const { data: activePOItems } = await supabase
    .from("purchase_order_items")
    .select("product_id, purchase_orders!inner(status)")
    .in("purchase_orders.status", ["draft", "pending_approval", "approved", "ordered"])

  const productsWithActivePO = new Set(
    (activePOItems ?? []).map((i) => i.product_id)
  )

  const needsReorder: Array<{ id: string; ref: string; name: string; totalStock: number; minStock: number }> = []

  for (const p of products ?? []) {
    if (productsWithActivePO.has(p.id)) continue

    const rows = (p.inventory as Array<{ quantity: number; reserved_quantity: number }>) ?? []
    const totalStock = rows.reduce((sum, r) => sum + r.quantity - r.reserved_quantity, 0)

    if (totalStock <= p.min_stock_level) {
      needsReorder.push({
        id: p.id, ref: p.ref, name: p.name, totalStock, minStock: p.min_stock_level,
      })
    }
  }

  return needsReorder
}
