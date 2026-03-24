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
    query = query.eq("products.category", filters.category as never)
  }
  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,ref.ilike.%${filters.search}%`,
      { referencedTable: "products" },
    )
  }

  const { data, error } = await query.limit(200)
  if (error) throw error
  return data ?? []
}

export type StockSummaryItem = {
  id: string
  ref: string
  name: string
  brand: string | null
  category: string
  unit: string
  min_stock_level: number
  model: string | null
  diameter: number | null
  length: number | null
  totalStock: number
  isLowStock: boolean
  supplierName: string | null
  supplier_id: string | null
}

export async function getStockSummary(): Promise<StockSummaryItem[]> {
  const supabase = await createClient()

  // Get products with their total available stock
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("products")
    .select(`
      id, ref, name, brand, category, unit, min_stock_level, model, diameter, length, supplier_id,
      suppliers(name),
      inventory(quantity, reserved_quantity)
    `)
    .eq("is_active", true)
    .order("name")

  if (error) throw error

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((p: any) => {
    const rows = (p.inventory as Array<{ quantity: number; reserved_quantity: number }>) ?? []
    const totalStock = rows.reduce((sum: number, r: { quantity: number; reserved_quantity: number }) => sum + r.quantity - r.reserved_quantity, 0)
    const isLowStock = totalStock <= p.min_stock_level
    return {
      id: p.id,
      ref: p.ref,
      name: p.name,
      brand: p.brand,
      category: p.category,
      unit: p.unit,
      min_stock_level: p.min_stock_level,
      model: p.model ?? null,
      diameter: p.diameter ?? null,
      length: p.length ?? null,
      totalStock,
      isLowStock,
      supplierName: (p.suppliers as unknown as { name: string } | null)?.name ?? null,
      supplier_id: p.supplier_id ?? null,
    }
  })
}

export async function getInactiveProducts(): Promise<StockSummaryItem[]> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("products")
    .select(`
      id, ref, name, brand, category, unit, min_stock_level, model, diameter, length, supplier_id,
      suppliers(name),
      inventory(quantity, reserved_quantity)
    `)
    .eq("is_active", false)
    .order("name")

  if (error) throw error

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((p: any) => {
    const rows = (p.inventory as Array<{ quantity: number; reserved_quantity: number }>) ?? []
    const totalStock = rows.reduce((sum: number, r: { quantity: number; reserved_quantity: number }) => sum + r.quantity - r.reserved_quantity, 0)
    const isLowStock = totalStock <= p.min_stock_level
    return {
      id: p.id,
      ref: p.ref,
      name: p.name,
      brand: p.brand,
      category: p.category,
      unit: p.unit,
      min_stock_level: p.min_stock_level,
      model: p.model ?? null,
      diameter: p.diameter ?? null,
      length: p.length ?? null,
      totalStock,
      isLowStock,
      supplierName: (p.suppliers as unknown as { name: string } | null)?.name ?? null,
      supplier_id: p.supplier_id ?? null,
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

export async function getPendingPOs() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("purchase_orders")
    .select(`
      id, po_number, expected_delivery_date, created_at, status,
      suppliers(name),
      purchase_order_items(id)
    `)
    .eq("status", "ordered")
    .order("created_at", { ascending: false })

  if (error) throw error

  return (data ?? []).map((po) => ({
    id: po.id,
    po_number: po.po_number,
    expected_delivery_date: po.expected_delivery_date,
    created_at: po.created_at,
    supplier_name: (po.suppliers as unknown as { name: string } | null)?.name ?? "-",
    item_count: (po.purchase_order_items as unknown as Array<{ id: string }>)?.length ?? 0,
  }))
}

export async function getPOItems(poId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("purchase_order_items")
    .select("id, product_id, quantity, products(name, ref, brand, category, unit)")
    .eq("po_id", poId)

  if (error) throw error

  return (data ?? []).map((item) => {
    const product = item.products as unknown as {
      name: string; ref: string; brand: string | null; category: string; unit: string
    } | null
    return {
      id: item.id,
      product_id: item.product_id,
      quantity_ordered: item.quantity,
      product_name: product?.name ?? "-",
      product_ref: product?.ref ?? "-",
      product_brand: product?.brand ?? null,
      product_category: product?.category ?? "-",
      product_unit: product?.unit ?? "ชิ้น",
    }
  })
}

export async function receiveGoods(
  items: Array<{
    product_id: string
    lot_number: string
    quantity: number
    expiry_date: string | null
    po_id: string | null
    invoice_number: string | null
  }>,
  poId?: string | null
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Validate lot_number is not empty
  for (const item of items) {
    if (!item.lot_number || !item.lot_number.trim()) {
      throw new Error("กรุณาระบุ LOT Number ของสินค้าทุกรายการ")
    }
    if (item.quantity <= 0) {
      throw new Error("จำนวนต้องมากกว่า 0")
    }
  }

  // Batch insert inventory rows
  const rows = items.map((item) => ({
    product_id: item.product_id,
    lot_number: item.lot_number.trim(),
    quantity: item.quantity,
    reserved_quantity: 0,
    expiry_date: item.expiry_date || null,
    received_date: new Date().toISOString().split("T")[0],
    po_id: item.po_id || null,
    invoice_number: item.invoice_number || null,
  }))

  const { error } = await supabase.from("inventory").insert(rows)
  if (error) throw error

  // Update PO status to "received" if poId provided
  if (poId) {
    const { error: poError } = await supabase
      .from("purchase_orders")
      .update({ status: "received" })
      .eq("id", poId)
    if (poError) throw poError
    revalidatePath("/orders")
    revalidatePath(`/orders/${poId}`)
  }

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
    .select("id, ref, name, brand, category, unit, model, diameter, length")
    .eq("supplier_id", supplierId)
    .eq("is_active", true)
    .order("name")

  if (category) {
    query = query.eq("category", category as never)
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

export async function getInventoryByLot(filters?: {
  search?: string
  expiry_before?: string
  category?: ProductCategory
}) {
  const supabase = await createClient()
  let query = supabase
    .from("inventory")
    .select(`
      id, lot_number, quantity, reserved_quantity, expiry_date, received_date,
      products!inner(id, ref, name, brand, category, unit, min_stock_level, model, diameter, length, suppliers(name))
    `)
    .gt("quantity", 0)
    .order("expiry_date", { ascending: true, nullsFirst: false })

  if (filters?.category) {
    query = query.eq("products.category", filters.category as never)
  }
  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,ref.ilike.%${filters.search}%`,
      { referencedTable: "products" },
    )
  }
  if (filters?.expiry_before) {
    query = query.lte("expiry_date", filters.expiry_before)
  }

  const { data, error } = await query.limit(500)
  if (error) throw error

  return (data ?? []).map((row) => {
    const product = row.products as unknown as {
      id: string; ref: string; name: string; brand: string | null
      category: string; unit: string; min_stock_level: number
      model: string | null; diameter: number | null; length: number | null
      suppliers: { name: string } | null
    }
    const available = row.quantity - row.reserved_quantity
    return {
      id: row.id,
      product_id: product.id,
      product_name: product.name,
      ref: product.ref,
      brand: product.brand,
      category: product.category,
      model: product.model,
      diameter: product.diameter,
      length: product.length,
      unit: product.unit,
      supplier_name: product.suppliers?.name ?? null,
      lot_number: row.lot_number,
      expiry_date: row.expiry_date,
      quantity: row.quantity,
      reserved_quantity: row.reserved_quantity,
      available,
    }
  })
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

// ─── Stock Demands: cases needing out-of-stock materials ─────────────

export type StockDemandItem = {
  productId: string
  productName: string
  productRef: string
  productBrand: string | null
  productUnit: string
  totalNeeded: number
  totalAvailable: number
  activePO: {
    poId: string
    poNumber: string
    status: string
    quantityOrdered: number
    expectedDeliveryDate: string | null
  } | null
  cases: Array<{
    caseId: string
    caseNumber: string
    patientName: string
    scheduledDate: string | null
    scheduledTime: string | null
    quantityNeeded: number
    isUrgent: boolean // within 48h
  }>
}

export async function getStockDemands(): Promise<StockDemandItem[]> {
  const supabase = await createClient()

  // Get all "reserved" reservations (no LOT assigned — likely no stock)
  const { data: reservations, error } = await supabase
    .from("case_reservations")
    .select(`
      id, product_id, quantity_reserved,
      cases!inner(id, case_number, case_status, scheduled_date, scheduled_time, patients(full_name)),
      products!inner(id, ref, name, brand, unit)
    `)
    .eq("status", "reserved")
    .in("cases.case_status", ["pending_order", "pending_preparation"])

  if (error) throw error
  if (!reservations || reservations.length === 0) return []

  // Get stock levels for these products
  const productIds = Array.from(new Set(reservations.map((r) => r.product_id)))
  const { data: inventoryRows } = await supabase
    .from("inventory")
    .select("product_id, quantity, reserved_quantity")
    .in("product_id", productIds)
    .gt("quantity", 0)

  const stockByProduct = new Map<string, number>()
  for (const inv of inventoryRows ?? []) {
    const current = stockByProduct.get(inv.product_id) ?? 0
    stockByProduct.set(inv.product_id, current + inv.quantity - inv.reserved_quantity)
  }

  // Check active POs for these products
  const { data: activePOItems } = await supabase
    .from("purchase_order_items")
    .select("product_id, quantity, purchase_orders!inner(id, po_number, status, expected_delivery_date)")
    .in("product_id", productIds)
    .in("purchase_orders.status", ["draft", "pending_approval", "approved", "ordered"])

  const poByProduct = new Map<string, StockDemandItem["activePO"]>()
  for (const item of activePOItems ?? []) {
    const po = item.purchase_orders as unknown as {
      id: string; po_number: string; status: string; expected_delivery_date: string | null
    }
    const existing = poByProduct.get(item.product_id)
    // Keep the most advanced PO status (ordered > approved > pending_approval > draft)
    const statusRank: Record<string, number> = { draft: 0, pending_approval: 1, approved: 2, ordered: 3 }
    if (!existing || (statusRank[po.status] ?? 0) > (statusRank[existing.status] ?? 0)) {
      poByProduct.set(item.product_id, {
        poId: po.id,
        poNumber: po.po_number,
        status: po.status,
        quantityOrdered: item.quantity,
        expectedDeliveryDate: po.expected_delivery_date,
      })
    }
  }

  // 48h threshold for urgency
  const now = new Date()
  const urgentCutoff = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  // Group by product
  const productMap = new Map<string, StockDemandItem>()

  for (const r of reservations) {
    const caseData = r.cases as unknown as {
      id: string
      case_number: string
      case_status: string
      scheduled_date: string | null
      scheduled_time: string | null
      patients: { full_name: string } | null
    }
    const product = r.products as unknown as {
      id: string; ref: string; name: string; brand: string | null; unit: string
    }

    const available = stockByProduct.get(r.product_id) ?? 0
    const needed = r.quantity_reserved

    // Only include if stock is truly insufficient
    if (available >= needed) continue

    let isUrgent = false
    if (caseData.scheduled_date) {
      const caseDate = new Date(caseData.scheduled_date)
      isUrgent = caseDate <= urgentCutoff
    }

    if (!productMap.has(r.product_id)) {
      productMap.set(r.product_id, {
        productId: product.id,
        productName: product.name,
        productRef: product.ref,
        productBrand: product.brand,
        productUnit: product.unit,
        totalNeeded: 0,
        totalAvailable: available,
        activePO: poByProduct.get(r.product_id) ?? null,
        cases: [],
      })
    }

    const entry = productMap.get(r.product_id)!
    entry.totalNeeded += needed
    entry.cases.push({
      caseId: caseData.id,
      caseNumber: caseData.case_number,
      patientName: caseData.patients?.full_name ?? "ไม่ระบุ",
      scheduledDate: caseData.scheduled_date,
      scheduledTime: caseData.scheduled_time,
      quantityNeeded: needed,
      isUrgent,
    })
  }

  // Sort: products with urgent cases first, then by total needed desc
  const result = Array.from(productMap.values())
  result.sort((a, b) => {
    const aUrgent = a.cases.some((c) => c.isUrgent) ? 1 : 0
    const bUrgent = b.cases.some((c) => c.isUrgent) ? 1 : 0
    if (aUrgent !== bUrgent) return bUrgent - aUrgent
    return b.totalNeeded - a.totalNeeded
  })

  // Sort cases within each product by date
  for (const item of result) {
    item.cases.sort((a, b) => {
      if (!a.scheduledDate && !b.scheduledDate) return 0
      if (!a.scheduledDate) return 1
      if (!b.scheduledDate) return -1
      return a.scheduledDate.localeCompare(b.scheduledDate)
    })
  }

  return result
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
