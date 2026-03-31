"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { sendLineMessage } from "./line"
import { formatDate } from "@/lib/utils"

function generateBorrowNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const random = String(Math.floor(Math.random() * 9999)).padStart(4, "0")
  return `BRW${year}${month}${random}`
}

/**
 * Check if a supplier has LINE user ID configured
 */
export async function checkSupplierLineId(supplierId: string): Promise<{ hasLineId: boolean; supplierName: string }> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("suppliers")
    .select("name, line_id")
    .eq("id", supplierId)
    .single()

  return {
    hasLineId: !!data?.line_id,
    supplierName: data?.name ?? "",
  }
}

/**
 * Create a supplier order (borrow or purchase) from a case
 * - borrow: sends LINE immediately
 * - purchase: sets status to pending_approval, waits for admin
 */
export async function createSupplierOrder(params: {
  caseId: string
  supplierId: string
  orderType: "borrow" | "purchase"
  items: Array<{ productId: string; quantity: number; unitPrice?: number }>
  notes?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Get supplier info + check LINE ID
  const { data: supplier } = await supabase
    .from("suppliers")
    .select("id, name, line_id")
    .eq("id", params.supplierId)
    .single()

  if (!supplier) throw new Error("ไม่พบ Supplier")

  if (params.orderType === "borrow" && !supplier.line_id) {
    throw new Error(`Supplier "${supplier.name}" ยังไม่มี LINE User ID กรุณาเพิ่มใน Supplier ก่อน`)
  }

  // Get case info for the LINE message
  const { data: caseData } = await supabase
    .from("cases")
    .select("case_number, scheduled_date, scheduled_time, patients(full_name, hn), users!cases_dentist_id_fkey(full_name)")
    .eq("id", params.caseId)
    .single()

  // Determine initial status
  const initialStatus = params.orderType === "borrow" ? "sent" : "pending_approval"

  // Create the borrow record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order, error: orderError } = await (supabase as any)
    .from("inventory_borrows")
    .insert({
      borrow_number: generateBorrowNumber(),
      source_type: "supplier",
      source_name: supplier.name,
      supplier_id: supplier.id,
      status: initialStatus,
      borrow_date: new Date().toISOString().split("T")[0],
      notes: params.notes || null,
      requested_by: user.id,
      order_type: params.orderType,
      case_id: params.caseId,
      line_sent_at: params.orderType === "borrow" ? new Date().toISOString() : null,
    })
    .select("id, borrow_number")
    .single()

  if (orderError) throw orderError

  // Get product details for items
  const productIds = params.items.map((i) => i.productId)
  const { data: products } = await supabase
    .from("products")
    .select("id, name, ref, brand, unit")
    .in("id", productIds)

  const productMap = new Map((products ?? []).map((p) => [p.id, p]))

  // Insert items
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: itemsError } = await (supabase as any)
    .from("inventory_borrow_items")
    .insert(
      params.items.map((item) => ({
        borrow_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice ?? 0,
        status: "borrowed",
        case_id: params.caseId,
      }))
    )

  if (itemsError) throw itemsError

  // Send LINE to supplier (for borrow: immediately, for purchase: after approval)
  if (params.orderType === "borrow" && supplier.line_id) {
    const patient = caseData?.patients as unknown as { full_name: string; hn: string } | null
    const dentist = caseData?.users as unknown as { full_name: string } | null

    const itemLines = params.items.map((item) => {
      const p = productMap.get(item.productId)
      return `  - ${p?.name ?? "สินค้า"} ${p?.brand ? `(${p.brand})` : ""} × ${item.quantity} ${p?.unit ?? "ชิ้น"}`
    }).join("\n")

    const scheduledInfo = caseData?.scheduled_date
      ? `📅 วันนัด: ${formatDate(String(caseData.scheduled_date))}${caseData.scheduled_time ? ` ${String(caseData.scheduled_time).slice(0, 5)}` : ""}`
      : ""

    const message = [
      `📋 ขอยืมวัสดุ — ${order.borrow_number}`,
      ``,
      `👤 คนไข้: ${patient?.full_name ?? "-"} (HN: ${patient?.hn ?? "-"})`,
      `🦷 แพทย์: ${dentist?.full_name ?? "-"}`,
      scheduledInfo,
      ``,
      `📦 รายการ:`,
      itemLines,
      ``,
      params.notes ? `📝 หมายเหตุ: ${params.notes}` : "",
    ].filter(Boolean).join("\n")

    await sendLineMessage(supplier.line_id, message)
  }

  // Notify admin for purchase orders
  if (params.orderType === "purchase") {
    const { smartNotify } = await import("./notifications")
    smartNotify({
      type: "po_created",
      title: "ใบสั่งซื้อรออนุมัติ",
      message: `${order.borrow_number} จาก ${supplier.name} รออนุมัติ`,
      data: { borrow_id: order.id, borrow_number: order.borrow_number },
    }).catch(() => {})
  }

  revalidatePath("/cases")
  revalidatePath(`/cases/${params.caseId}`)
  revalidatePath("/inventory/borrows")

  return { id: order.id, borrowNumber: order.borrow_number, orderType: params.orderType }
}

/**
 * Approve a purchase order and send LINE to supplier
 */
export async function approveSupplierOrder(orderId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Verify admin
  const { data: currentUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()
  if (currentUser?.role !== "admin") throw new Error("Admin only")

  // Get the order
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order } = await (supabase as any)
    .from("inventory_borrows")
    .select("*, suppliers(name, line_id)")
    .eq("id", orderId)
    .single()

  if (!order) throw new Error("ไม่พบใบสั่ง")
  if (order.order_type !== "purchase") throw new Error("ใบนี้ไม่ใช่ใบซื้อ")
  if (order.status !== "pending_approval") throw new Error("ใบนี้ไม่ได้อยู่ในสถานะรออนุมัติ")

  // Update status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("inventory_borrows")
    .update({
      status: "sent",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      line_sent_at: new Date().toISOString(),
    })
    .eq("id", orderId)

  if (error) throw error

  // Send LINE to supplier
  const supplier = order.suppliers as unknown as { name: string; line_id: string | null } | null
  if (supplier?.line_id) {
    // Get items and case info
    const { data: items } = await supabase
      .from("inventory_borrow_items")
      .select("quantity, unit_price, products(name, brand, unit)")
      .eq("borrow_id", orderId)

    const { data: caseData } = order.case_id
      ? await supabase
          .from("cases")
          .select("case_number, scheduled_date, patients(full_name, hn), users!cases_dentist_id_fkey(full_name)")
          .eq("id", order.case_id)
          .single()
      : { data: null }

    const patient = caseData?.patients as unknown as { full_name: string; hn: string } | null
    const dentist = caseData?.users as unknown as { full_name: string } | null

    const itemLines = (items ?? []).map((item) => {
      const p = item.products as unknown as { name: string; brand: string | null; unit: string } | null
      return `  - ${p?.name ?? "สินค้า"} ${p?.brand ? `(${p.brand})` : ""} × ${item.quantity} ${p?.unit ?? "ชิ้น"}`
    }).join("\n")

    const message = [
      `🛒 ใบสั่งซื้อ — ${order.borrow_number}`,
      ``,
      patient ? `👤 คนไข้: ${patient.full_name} (HN: ${patient.hn})` : "",
      dentist ? `🦷 แพทย์: ${dentist.full_name}` : "",
      caseData?.scheduled_date ? `📅 วันนัด: ${formatDate(String(caseData.scheduled_date))}` : "",
      ``,
      `📦 รายการ:`,
      itemLines,
      ``,
      order.notes ? `📝 หมายเหตุ: ${order.notes}` : "",
    ].filter(Boolean).join("\n")

    await sendLineMessage(supplier.line_id, message)
  }

  revalidatePath("/inventory/borrows")
  revalidatePath(`/cases/${order.case_id}`)
}

/**
 * Mark supplier order as received
 */
export async function markOrderReceived(orderId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("inventory_borrows")
    .update({ status: "borrowed" })
    .eq("id", orderId)

  if (error) throw error

  revalidatePath("/inventory/borrows")
}

/**
 * Get supplier orders for a specific case
 */
export async function getSupplierOrdersForCase(caseId: string) {
  const supabase = await createClient()

  // Use raw query to access new columns not yet in generated types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("inventory_borrows")
    .select(`
      id, borrow_number, source_type, source_name, status, borrow_date, notes,
      order_type, case_id, approved_by, approved_at, line_sent_at,
      converted_to_id, converted_from_id, created_at,
      suppliers(name, line_id),
      inventory_borrow_items(
        id, product_id, quantity, unit_price, status, lot_number,
        products(name, ref, brand, unit)
      )
    `)
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as Array<Record<string, unknown>>
}

// ═══════════════════════════════════════
// Phase 2: Return items (flexible)
// ═══════════════════════════════════════

/**
 * Create a return record for a supplier order (borrow).
 * Items can be different product/qty/price from original.
 * Returns require admin approval.
 */
export async function createSupplierReturn(params: {
  borrowId: string
  items: Array<{ productId: string; quantity: number; unitPrice: number; lotNumber?: string; notes?: string }>
  notes?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: returnRecord, error: returnError } = await (supabase as any)
    .from("supplier_order_returns")
    .insert({
      borrow_id: params.borrowId,
      status: "pending",
      notes: params.notes || null,
      created_by: user.id,
    })
    .select("id")
    .single()

  if (returnError) throw returnError

  // Insert return items
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: itemsError } = await (supabase as any)
    .from("supplier_order_return_items")
    .insert(
      params.items.map((item) => ({
        return_id: returnRecord.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        lot_number: item.lotNumber || null,
        notes: item.notes || null,
      }))
    )

  if (itemsError) throw itemsError

  // Notify admin about pending return
  const { smartNotify } = await import("./notifications")
  smartNotify({
    type: "system",
    title: "คืนของรออนุมัติ",
    message: `ใบยืมมีการคืนของ ${params.items.length} รายการ รออนุมัติ`,
    data: { borrow_id: params.borrowId },
  }).catch(() => {})

  revalidatePath("/inventory/borrows")
  return { returnId: returnRecord.id }
}

/**
 * Approve or reject a return
 */
export async function approveSupplierReturn(returnId: string, action: "approved" | "rejected") {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: currentUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()
  if (currentUser?.role !== "admin") throw new Error("Admin only")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("supplier_order_returns")
    .update({
      status: action,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", returnId)

  if (error) throw error

  // If approved, update the borrow status
  if (action === "approved") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: returnRecord } = await (supabase as any)
      .from("supplier_order_returns")
      .select("borrow_id")
      .eq("id", returnId)
      .single()

    if (returnRecord) {
      // Check if there are any non-approved returns remaining
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count } = await (supabase as any)
        .from("supplier_order_returns")
        .select("id", { count: "exact", head: true })
        .eq("borrow_id", returnRecord.borrow_id)
        .eq("status", "pending")

      // If no pending returns, mark borrow as returned
      if (!count || count === 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("inventory_borrows")
          .update({ status: "returned" })
          .eq("id", returnRecord.borrow_id)
      }
    }
  }

  revalidatePath("/inventory/borrows")
}

/**
 * Get returns for a specific borrow order
 */
export async function getReturnsForOrder(borrowId: string) {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("supplier_order_returns")
    .select(`
      id, status, return_date, notes, approved_by, approved_at, created_at,
      approver:users!supplier_order_returns_approved_by_fkey(full_name),
      supplier_order_return_items(
        id, product_id, quantity, unit_price, lot_number, notes,
        products(name, ref, brand, unit)
      )
    `)
    .eq("borrow_id", borrowId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as Array<Record<string, unknown>>
}

// ═══════════════════════════════════════
// Phase 3: Convert borrow → purchase
// ═══════════════════════════════════════

/**
 * Convert a borrow order to a purchase order.
 * Creates a new purchase record referencing the original borrow.
 * The purchase requires admin approval.
 * When approved, the original borrow is marked as 'closed'.
 */
export async function convertBorrowToPurchase(borrowId: string, notes?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Get original borrow with items
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: borrow } = await (supabase as any)
    .from("inventory_borrows")
    .select(`
      id, borrow_number, supplier_id, source_name, case_id, notes,
      inventory_borrow_items(product_id, quantity, unit_price)
    `)
    .eq("id", borrowId)
    .single()

  if (!borrow) throw new Error("ไม่พบใบยืม")
  if (borrow.order_type === "purchase") throw new Error("ใบนี้เป็นใบซื้ออยู่แล้ว")

  // Create new purchase order referencing the borrow
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: purchaseOrder, error: poError } = await (supabase as any)
    .from("inventory_borrows")
    .insert({
      borrow_number: generateBorrowNumber(),
      source_type: "supplier",
      source_name: borrow.source_name,
      supplier_id: borrow.supplier_id,
      status: "pending_approval",
      borrow_date: new Date().toISOString().split("T")[0],
      notes: notes || `แปลงจากใบยืม ${borrow.borrow_number}`,
      requested_by: user.id,
      order_type: "purchase",
      case_id: borrow.case_id,
      converted_from_id: borrowId,
    })
    .select("id, borrow_number")
    .single()

  if (poError) throw poError

  // Copy items to the new purchase order
  const items = (borrow.inventory_borrow_items ?? []) as Array<Record<string, unknown>>
  if (items.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("inventory_borrow_items")
      .insert(
        items.map((item) => ({
          borrow_id: purchaseOrder.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price ?? 0,
          status: "borrowed",
          case_id: borrow.case_id,
        }))
      )
  }

  // Mark original borrow as converted (link to new PO)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("inventory_borrows")
    .update({ converted_to_id: purchaseOrder.id })
    .eq("id", borrowId)

  // Notify admin
  const { smartNotify } = await import("./notifications")
  smartNotify({
    type: "po_created",
    title: "ใบยืม → ใบซื้อ รออนุมัติ",
    message: `แปลงใบยืม ${borrow.borrow_number} → ใบซื้อ ${purchaseOrder.borrow_number} รออนุมัติ`,
    data: { borrow_id: purchaseOrder.id, original_borrow_id: borrowId },
  }).catch(() => {})

  revalidatePath("/inventory/borrows")
  revalidatePath(`/cases/${borrow.case_id}`)

  return {
    purchaseId: purchaseOrder.id,
    purchaseNumber: purchaseOrder.borrow_number,
    originalBorrowNumber: borrow.borrow_number,
  }
}

/**
 * Close a borrow order (after purchase order is approved or return completed)
 */
export async function closeBorrowOrder(borrowId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("inventory_borrows")
    .update({ status: "closed" })
    .eq("id", borrowId)

  if (error) throw error
  revalidatePath("/inventory/borrows")
}
