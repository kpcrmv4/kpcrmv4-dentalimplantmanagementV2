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
      .select("*, cases(case_number), inventory(lot_number)")
      .eq("borrow_id", id)
      .order("created_at"),
    supabase
      .from("inventory_borrow_photos")
      .select("*, users!inventory_borrow_photos_uploaded_by_fkey(full_name)")
      .eq("borrow_id", id)
      .order("created_at"),
  ])

  if (borrowResult.error) throw borrowResult.error

  // Fetch product details separately to avoid ambiguous FK
  // (inventory_borrow_items has two FKs to products: product_id and settlement_product_id)
  const items = itemsResult.data ?? []

  // Collect both product_id and settlement_product_id
  const allProductIds = Array.from(new Set(
    items.flatMap((i: Record<string, unknown>) =>
      [i.product_id, i.settlement_product_id].filter(Boolean)
    )
  )) as string[]

  let productMap = new Map<string, Record<string, unknown>>()
  if (allProductIds.length > 0) {
    const { data: products } = await supabase
      .from("products")
      .select("id, name, ref, brand, unit")
      .in("id", allProductIds)
    productMap = new Map((products ?? []).map((p: Record<string, unknown>) => [p.id as string, p]))
  }

  const itemsWithProducts = items.map((item: Record<string, unknown>) => ({
    ...item,
    products: productMap.get(item.product_id as string) ?? null,
    settlement_product: item.settlement_product_id
      ? productMap.get(item.settlement_product_id as string) ?? null
      : null,
  }))

  return {
    ...borrowResult.data,
    items: itemsWithProducts,
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

  // ── Validate ──────────────────────────────────────────
  if (settlement.type === "payment") {
    if (!settlement.amount || settlement.amount <= 0) {
      throw new Error("กรุณาระบุจำนวนเงินที่ต้องชำระ")
    }
  }
  if (settlement.type === "exchange" && !settlement.product_id) {
    throw new Error("กรุณาเลือกสินค้าที่ต้องการแลก")
  }

  // ── Fetch item + borrow + product details ─────────────
  const { data: item, error: fetchError } = await supabase
    .from("inventory_borrow_items")
    .select("id, borrow_id, product_id, inventory_id, quantity, status")
    .eq("id", itemId)
    .single()

  if (fetchError) throw fetchError
  if (item.status !== "borrowed") throw new Error("รายการนี้ถูกชำระแล้ว")

  // Get borrow record for context
  const { data: borrow } = await supabase
    .from("inventory_borrows")
    .select("borrow_number, supplier_id, source_name")
    .eq("id", item.borrow_id)
    .single()

  // Get product name for notifications
  const { data: product } = await supabase
    .from("products")
    .select("name, ref, unit")
    .eq("id", item.product_id)
    .single()

  const statusMap = { return: "returned", exchange: "exchanged", payment: "paid" }

  // ── Inventory stock adjustments ───────────────────────
  if (settlement.type === "return") {
    // คืนของ → ตัดสต็อกออก (คืน supplier = สินค้าออกจากคลัง)
    // Find inventory lots for this product (FEFO) and deduct
    const { data: lots } = await supabase
      .from("inventory")
      .select("id, lot_number, quantity, reserved_quantity")
      .eq("product_id", item.product_id)
      .gt("quantity", 0)
      .order("expiry_date", { ascending: true, nullsFirst: false })
      .order("received_date", { ascending: true })

    let remainingQty = item.quantity
    for (const lot of (lots ?? [])) {
      if (remainingQty <= 0) break
      const available = lot.quantity - lot.reserved_quantity
      if (available <= 0) continue

      const deduct = Math.min(available, remainingQty)
      await supabase
        .from("inventory")
        .update({ quantity: lot.quantity - deduct })
        .eq("id", lot.id)
      remainingQty -= deduct
    }
    // If not enough stock, still proceed but note it
    if (remainingQty > 0 && settlement.note) {
      settlement.note += ` (สต็อกไม่พอตัด ${remainingQty} ${product?.unit ?? "ชิ้น"})`
    } else if (remainingQty > 0) {
      settlement.note = `สต็อกไม่พอตัด ${remainingQty} ${product?.unit ?? "ชิ้น"}`
    }
  } else if (settlement.type === "exchange") {
    // แลกสินค้า → ตัดสต็อกสินค้าเดิมออก (เหมือน return)
    const { data: lots } = await supabase
      .from("inventory")
      .select("id, lot_number, quantity, reserved_quantity")
      .eq("product_id", item.product_id)
      .gt("quantity", 0)
      .order("expiry_date", { ascending: true, nullsFirst: false })
      .order("received_date", { ascending: true })

    let remainingQty = item.quantity
    for (const lot of (lots ?? [])) {
      if (remainingQty <= 0) break
      const available = lot.quantity - lot.reserved_quantity
      if (available <= 0) continue

      const deduct = Math.min(available, remainingQty)
      await supabase
        .from("inventory")
        .update({ quantity: lot.quantity - deduct })
        .eq("id", lot.id)
      remainingQty -= deduct
    }
    // สินค้าใหม่จะเข้าสต็อกเมื่อรับของจริง (ผ่านหน้ารับของเข้า)
  }
  // payment → ไม่ต้องปรับสต็อก (สินค้าอยู่ในคลังอยู่แล้ว แค่จ่ายเงิน)

  // ── Update settlement on item ─────────────────────────
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

  // ── Check if all items settled → close the borrow ─────
  const { data: remaining } = await supabase
    .from("inventory_borrow_items")
    .select("id")
    .eq("borrow_id", item.borrow_id)
    .eq("status", "borrowed")
    .limit(1)

  const allSettled = !remaining || remaining.length === 0
  if (allSettled) {
    await supabase
      .from("inventory_borrows")
      .update({ status: "returned", returned_at: new Date().toISOString() })
      .eq("id", item.borrow_id)
  }

  // ── Notifications ─────────────────────────────────────
  const typeLabel = { return: "คืนของ", exchange: "แลกสินค้า", payment: "ชำระเงิน" }
  const productName = product?.name ?? "สินค้า"
  const borrowNumber = borrow?.borrow_number ?? ""

  const { smartNotify } = await import("./notifications")
  smartNotify({
    type: "system",
    title: `ชำระรายการยืม — ${typeLabel[settlement.type]}`,
    message: [
      `ใบยืม: ${borrowNumber}`,
      `สินค้า: ${productName}${product?.ref ? ` (${product.ref})` : ""} × ${item.quantity} ${product?.unit ?? "ชิ้น"}`,
      `วิธีชำระ: ${typeLabel[settlement.type]}`,
      settlement.type === "payment" && settlement.amount ? `จำนวนเงิน: ฿${Number(settlement.amount).toLocaleString()}` : "",
      settlement.note ? `หมายเหตุ: ${settlement.note}` : "",
      allSettled ? `✅ ครบทุกรายการแล้ว — ปิดใบยืม` : "",
    ].filter(Boolean).join("\n"),
    data: {
      borrow_id: item.borrow_id,
      borrow_number: borrowNumber,
      settlement_type: settlement.type,
    },
  }).catch(() => {})

  // ── Revalidate case status if borrow is linked to a case ──
  const { data: borrowForCase } = await supabase
    .from("inventory_borrows")
    .select("case_id")
    .eq("id", item.borrow_id)
    .single()

  if (borrowForCase?.case_id) {
    const { revalidateCaseReadyStatus } = await import("./cases")
    await revalidateCaseReadyStatus(borrowForCase.case_id)
    revalidatePath(`/cases/${borrowForCase.case_id}`)
  }

  // ── Revalidate ────────────────────────────────────────
  revalidatePath("/inventory/borrows")
  revalidatePath(`/inventory/borrows/${item.borrow_id}`)
  revalidatePath("/inventory")
}

/**
 * Get item details for settlement UI (product info, reference price, available stock)
 */
export async function getBorrowItemSettlementInfo(itemId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: item, error } = await supabase
    .from("inventory_borrow_items")
    .select("id, product_id, quantity, unit_price, status")
    .eq("id", itemId)
    .single()

  if (error) throw error

  // Get product details
  const { data: product } = await supabase
    .from("products")
    .select("id, name, ref, brand, unit, category")
    .eq("id", item.product_id)
    .single()

  // Get available stock for this product
  const { data: stockRows } = await supabase
    .from("inventory")
    .select("quantity, reserved_quantity")
    .eq("product_id", item.product_id)
    .gt("quantity", 0)

  const availableStock = (stockRows ?? []).reduce(
    (sum: number, r: { quantity: number; reserved_quantity: number }) =>
      sum + r.quantity - r.reserved_quantity,
    0
  )

  return {
    ...item,
    product,
    available_stock: availableStock,
    reference_price: item.unit_price ? Number(item.unit_price) * Number(item.quantity) : null,
    unit_price: item.unit_price ? Number(item.unit_price) : null,
  }
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
