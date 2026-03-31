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
  const { data: order, error: orderError } = await supabase
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
  const { error: itemsError } = await supabase
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
  const { data: order } = await supabase
    .from("inventory_borrows")
    .select("*, suppliers(name, line_id)")
    .eq("id", orderId)
    .single()

  if (!order) throw new Error("ไม่พบใบสั่ง")
  if (order.order_type !== "purchase") throw new Error("ใบนี้ไม่ใช่ใบซื้อ")
  if (order.status !== "pending_approval") throw new Error("ใบนี้ไม่ได้อยู่ในสถานะรออนุมัติ")

  // Update status
  const { error } = await supabase
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

  const { error } = await supabase
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

  const { data, error } = await supabase
    .from("inventory_borrows")
    .select(`
      *,
      suppliers(name, line_id),
      requester:users!inventory_borrows_requested_by_fkey(full_name),
      approver:users!inventory_borrows_approved_by_fkey(full_name),
      inventory_borrow_items(
        id, product_id, quantity, unit_price, status, lot_number,
        products(name, ref, brand, unit)
      )
    `)
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data ?? []
}
