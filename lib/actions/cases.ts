"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { generateCaseNumber, formatDate } from "@/lib/utils"
import type { CaseStatus, ReservationStatus } from "@/types/database"
import { createNotification } from "./notifications"

export async function getCases(filters?: {
  status?: CaseStatus
  dentist_id?: string
  search?: string
}) {
  const supabase = await createClient()
  let query = supabase
    .from("cases")
    .select("*, patients!inner(hn, full_name), users!cases_dentist_id_fkey(full_name)")
    .order("created_at", { ascending: false })

  if (filters?.status) {
    query = query.eq("case_status", filters.status)
  }
  if (filters?.dentist_id) {
    query = query.eq("dentist_id", filters.dentist_id)
  }
  if (filters?.search) {
    query = query.or(
      `case_number.ilike.%${filters.search}%,patients.full_name.ilike.%${filters.search}%,patients.hn.ilike.%${filters.search}%`
    )
  }

  const { data, error } = await query.limit(50)
  if (error) throw error
  return data
}

export async function getCaseById(id: string) {
  const supabase = await createClient()

  const [caseResult, reservationsResult] = await Promise.all([
    supabase
      .from("cases")
      .select(`
        *,
        patients(id, hn, full_name),
        dentist:users!cases_dentist_id_fkey(id, full_name),
        assistant:users!cases_assistant_id_fkey(id, full_name)
      `)
      .eq("id", id)
      .single(),
    supabase
      .from("case_reservations")
      .select(`
        *,
        products(id, ref, name, brand, category, unit, model, diameter, length, volume, weight, dimension, abutment_height, gingival_height, supplier_id, suppliers(id, name, line_id)),
        inventory(id, lot_number, expiry_date)
      `)
      .eq("case_id", id)
      .order("reserved_at", { ascending: true }),
  ])

  if (caseResult.error) throw caseResult.error
  return {
    ...caseResult.data,
    reservations: reservationsResult.data ?? [],
  }
}

export async function createCase(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const scheduledDate = formData.get("scheduled_date") as string
  const toothPositionsRaw = formData.get("tooth_positions") as string

  let toothPositions: number[] = []
  if (toothPositionsRaw) {
    try {
      toothPositions = JSON.parse(toothPositionsRaw)
    } catch {
      toothPositions = []
    }
  }

  const { data, error } = await supabase
    .from("cases")
    .insert({
      case_number: generateCaseNumber(),
      patient_id: formData.get("patient_id") as string,
      dentist_id: formData.get("dentist_id") as string,

      scheduled_date: scheduledDate || null,
      scheduled_time: (formData.get("scheduled_time") as string) || null,
      case_status: "pending_order",
      appointment_status: "pending",
      procedure_type: (formData.get("procedure_type") as string) || null,
      tooth_positions: toothPositions,
      notes: (formData.get("notes") as string) || null,

      created_by: user.id,
    })
    .select()
    .single()

  if (error) throw error
  revalidatePath("/cases")

  // Notify dentist about new case with full details
  const dentistId = formData.get("dentist_id") as string
  if (dentistId) {
    // Fetch patient and dentist info for the notification
    const [{ data: patient }, { data: dentist }] = await Promise.all([
      supabase.from("patients").select("full_name, hn").eq("id", data.patient_id).single(),
      supabase.from("users").select("full_name").eq("id", dentistId).single(),
    ])

    const patientName = patient?.full_name ?? "-"
    const patientHN = patient?.hn ?? "-"
    const dentistName = dentist?.full_name ?? "-"
    const procedure = data.procedure_type ?? "-"
    const scheduledInfo = data.scheduled_date
      ? `${formatDate(String(data.scheduled_date))}${data.scheduled_time ? ` ${String(data.scheduled_time).slice(0, 5)}` : ""}`
      : "ยังไม่ระบุ"

    const STATUS_LABELS: Record<string, string> = {
      pending_order: "รอสั่งของ",
      pending_preparation: "รอจัดของ",
      ready: "พร้อม",
      completed: "เสร็จสิ้น",
      cancelled: "ยกเลิก",
    }
    const statusLabel = STATUS_LABELS[data.case_status] ?? data.case_status

    const appUrl = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "")

    const detailMessage = [
      `🦷 เคสใหม่ ${data.case_number}`,
      ``,
      `👤 คนไข้: ${patientName}`,
      `🏥 HN: ${patientHN}`,
      `👨‍⚕️ ทันตแพทย์: ${dentistName}`,
      `🔧 หัตถการ: ${procedure}`,
      `📅 วันนัดหมาย: ${scheduledInfo}`,
      `📋 สถานะ: ${statusLabel}`,
      ...(appUrl ? [``, `🔗 เข้าสู่ระบบ: ${appUrl}/login`] : []),
    ].join("\n")

    const { smartNotify } = await import("./notifications")
    smartNotify({
      type: "case_assigned",
      title: "เคสใหม่",
      message: detailMessage,
      data: { case_id: data.id, case_number: data.case_number },
    }).catch(() => {})
  }

  return data
}

export async function updateCaseStatus(id: string, status: CaseStatus) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from("cases")
    .update({ case_status: status })
    .eq("id", id)

  if (error) throw error
  revalidatePath("/cases")
  revalidatePath(`/cases/${id}`)
}

/**
 * Mark case as "ready" — validates that ALL reservations are "prepared" first.
 * Returns { success: false, unprepared: [...] } if any items are not ready.
 */
export async function markCaseReady(caseId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Verify case exists and is in the correct status
  const { data: caseData } = await supabase
    .from("cases")
    .select("case_status, case_number, dentist:users!cases_dentist_id_fkey(full_name)")
    .eq("id", caseId)
    .single()

  if (!caseData) throw new Error("ไม่พบเคส")
  if (caseData.case_status !== "pending_preparation") {
    throw new Error("เคสไม่อยู่ในสถานะรอจัดของ")
  }

  // Get all active reservations (exclude returned)
  const { data: reservations } = await supabase
    .from("case_reservations")
    .select("id, status, product_id, products(name)")
    .eq("case_id", caseId)
    .neq("status", "returned")

  if (!reservations || reservations.length === 0) {
    throw new Error("ไม่มีรายการวัสดุในเคสนี้")
  }

  // Check which items are NOT yet prepared
  const unprepared = reservations
    .filter((r) => r.status !== "prepared" && r.status !== "consumed")
    .map((r) => ({
      id: r.id,
      productName: (r.products as Record<string, unknown>)?.name as string ?? "ไม่ทราบชื่อ",
    }))

  if (unprepared.length > 0) {
    return { success: false as const, unprepared }
  }

  // All items prepared — update case status to ready
  const { error } = await supabase
    .from("cases")
    .update({ case_status: "ready" as CaseStatus })
    .eq("id", caseId)

  if (error) throw error
  revalidatePath("/cases")
  revalidatePath(`/cases/${caseId}`)
  revalidatePath("/preparation")

  // Notify about material ready
  const { smartNotify } = await import("./notifications")
  smartNotify({
    type: "material_prepared",
    title: "วัสดุพร้อมแล้ว",
    message: `เคส ${caseData.case_number} ทพ.${(caseData.dentist as Record<string, unknown>)?.full_name ?? "-"} วัสดุถูกจัดเตรียมเรียบร้อยแล้ว`,
    data: { case_id: caseId },
  }).catch(() => {})

  return { success: true as const, unprepared: [] }
}

// Batch create reservations with stock validation (atomic, uses FOR UPDATE lock)
export async function createReservationsBatch(
  caseId: string,
  items: Array<{ productId: string; quantity: number }>
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const itemsJson = items.map((i) => ({
    product_id: i.productId,
    quantity: i.quantity,
  }))

  const { error } = await supabase.rpc("create_reservations_batch", {
    p_case_id: caseId,
    p_items: itemsJson,
    p_user_id: user.id,
  })

  if (error) throw error

  // Re-evaluate case status (pending_order if stock missing, pending_preparation otherwise)
  await revalidateCaseReadyStatus(caseId)

  // Check for out-of-stock items and notify
  const { data: reservedItems } = await supabase
    .from("case_reservations")
    .select("product_id, quantity_reserved, products(name)")
    .eq("case_id", caseId)
    .eq("status", "reserved")

  if (reservedItems && reservedItems.length > 0) {
    // Some items have no stock — get case info for notification
    const { data: fullCase } = await supabase
      .from("cases")
      .select("case_number, scheduled_date, dentist:users!cases_dentist_id_fkey(full_name)")
      .eq("id", caseId)
      .single()

    const caseNumber = fullCase?.case_number ?? caseId
    const dentistName = (fullCase?.dentist as Record<string, unknown>)?.full_name as string ?? ""
    const dentistLabel = dentistName ? ` ทพ.${dentistName}` : ""
    const outOfStockNames = reservedItems
      .map((r) => (r.products as unknown as { name: string } | null)?.name ?? "สินค้า")

    let isUrgent = false
    if (fullCase?.scheduled_date) {
      const caseDate = new Date(fullCase.scheduled_date)
      isUrgent = caseDate <= new Date(Date.now() + 48 * 60 * 60 * 1000)
    }

    const { smartNotify } = await import("./notifications")
    if (isUrgent) {
      smartNotify({
        type: "emergency_case",
        title: "ด่วน — ของขาดสต๊อก",
        message: `เคส ${caseNumber}${dentistLabel} นัดภายใน 48 ชม. แต่ของขาด: ${outOfStockNames.join(", ")}`,
        data: { case_id: caseId, case_number: caseNumber },
      }).catch(() => {})
    } else {
      smartNotify({
        type: "out_of_stock",
        title: "สินค้าหมด — ต้องสั่งเพิ่ม",
        message: `เคส ${caseNumber}${dentistLabel} ต้องการ: ${outOfStockNames.join(", ")} แต่ไม่มีในสต๊อก`,
        data: { case_id: caseId, case_number: caseNumber },
      }).catch(() => {})
    }
  }

  revalidatePath("/cases")
  revalidatePath(`/cases/${caseId}`)
}

// Keep single createReservation for backward compatibility
export async function createReservation(
  caseId: string,
  productId: string,
  quantity: number
) {
  return createReservationsBatch(caseId, [{ productId, quantity }])
}

export async function assignLot(
  reservationId: string,
  inventoryId: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Role check: only assistant and stock_staff can assign LOT
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!userData || !["assistant", "stock_staff", "admin"].includes(userData.role)) {
    throw new Error("เฉพาะเจ้าหน้าที่สต็อกหรือผู้ช่วยเท่านั้นที่สามารถระบุ LOT ได้")
  }

  // Validate available stock on the chosen lot
  const { data: inv } = await supabase
    .from("inventory")
    .select("quantity, reserved_quantity")
    .eq("id", inventoryId)
    .single()

  if (!inv) throw new Error("ไม่พบ LOT ที่เลือก")

  const { data: reservation } = await supabase
    .from("case_reservations")
    .select("quantity_reserved, case_id")
    .eq("id", reservationId)
    .single()

  if (!reservation) throw new Error("ไม่พบรายการจอง")

  const available = inv.quantity - inv.reserved_quantity
  if (available < reservation.quantity_reserved) {
    throw new Error(`LOT นี้เหลือไม่พอ (เหลือ ${available} ชิ้น)`)
  }

  // Update reservation → prepared (trigger handles reserved_quantity)
  const { error } = await supabase
    .from("case_reservations")
    .update({
      inventory_id: inventoryId,
      lot_specified: true,
      prepared_by: user.id,
      prepared_at: new Date().toISOString(),
      status: "prepared" as ReservationStatus,
    })
    .eq("id", reservationId)

  if (error) throw error
  revalidatePath("/cases")
  revalidatePath(`/cases/${reservation.case_id}`)
  revalidatePath("/preparation")
}

export async function recordUsage(
  reservationId: string,
  quantityUsed: number
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Get reservation's case_id for revalidation & auto-complete check
  const { data: reservation } = await supabase
    .from("case_reservations")
    .select("case_id")
    .eq("id", reservationId)
    .single()

  if (!reservation) throw new Error("ไม่พบรายการจอง")

  // Update to consumed (trigger handles inventory decrement)
  const { error } = await supabase
    .from("case_reservations")
    .update({
      quantity_used: quantityUsed,
      status: "consumed" as ReservationStatus,
    })
    .eq("id", reservationId)

  if (error) throw error

  // Auto-complete case if ALL reservations are consumed
  const { data: remaining } = await supabase
    .from("case_reservations")
    .select("id")
    .eq("case_id", reservation.case_id)
    .neq("status", "consumed")
    .neq("status", "returned")
    .limit(1)

  if (!remaining || remaining.length === 0) {
    await supabase
      .from("cases")
      .update({ case_status: "completed" as CaseStatus })
      .eq("id", reservation.case_id)
      .in("case_status", ["ready", "pending_preparation"])
  }

  revalidatePath("/cases")
  revalidatePath(`/cases/${reservation.case_id}`)
}

/**
 * Close case: batch record all usage, deduct stock, return unused items.
 * Called after the assistant has recorded usage for all prepared items locally.
 */
export async function closeCaseWithUsage(
  caseId: string,
  usageData: Array<{ reservationId: string; quantityUsed: number }>
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Validate case exists and is in a closeable state
  const { data: caseData } = await supabase
    .from("cases")
    .select("case_status")
    .eq("id", caseId)
    .single()

  if (!caseData) throw new Error("ไม่พบเคส")
  if (["completed", "cancelled"].includes(caseData.case_status)) {
    throw new Error("เคสนี้ปิดแล้ว")
  }

  // Block if there are still reserved items (no LOT assigned)
  const { data: pendingLotItems } = await supabase
    .from("case_reservations")
    .select("id, product_id, products(name)")
    .eq("case_id", caseId)
    .eq("status", "reserved")

  if (pendingLotItems && pendingLotItems.length > 0) {
    const names = pendingLotItems.map((r) => (r.products as Record<string, unknown>)?.name ?? "").filter(Boolean).join(", ")
    throw new Error(`ยังมีวัสดุที่ไม่ได้จัด LOT: ${names} — กรุณาจัด LOT หรือลบออกก่อนปิดเคส`)
  }

  // Process each usage record
  for (const { reservationId, quantityUsed } of usageData) {
    // Get the reservation and its inventory lot
    const { data: reservation } = await supabase
      .from("case_reservations")
      .select("id, quantity_reserved, inventory_id, status")
      .eq("id", reservationId)
      .eq("case_id", caseId)
      .single()

    if (!reservation) continue
    if (reservation.status === "consumed") continue // already done

    // Record usage → consumed
    const { error: usageErr } = await supabase
      .from("case_reservations")
      .update({
        quantity_used: quantityUsed,
        status: "consumed" as ReservationStatus,
      })
      .eq("id", reservationId)

    if (usageErr) throw new Error(`บันทึกการใช้ไม่สำเร็จ: ${usageErr.message}`)
  }

  // Return any remaining prepared items that weren't in usageData
  const recordedIds = usageData.map((u) => u.reservationId)
  const { data: remaining } = await supabase
    .from("case_reservations")
    .select("id")
    .eq("case_id", caseId)
    .in("status", ["reserved", "prepared"])

  if (remaining && remaining.length > 0) {
    const toReturn = remaining.filter((r: { id: string }) => !recordedIds.includes(r.id))
    if (toReturn.length > 0) {
      await supabase
        .from("case_reservations")
        .update({ status: "returned" as ReservationStatus })
        .in("id", toReturn.map((r: { id: string }) => r.id))
    }
  }

  // Mark case completed
  const { error } = await supabase
    .from("cases")
    .update({ case_status: "completed" as CaseStatus })
    .eq("id", caseId)

  if (error) throw error
  revalidatePath("/cases")
  revalidatePath(`/cases/${caseId}`)
}

/**
 * Return a single reservation to inventory (prepared/reserved → returned).
 * Trigger handles releasing reserved_quantity.
 * After returning, re-evaluates case status.
 */
export async function returnReservation(reservationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: reservation } = await supabase
    .from("case_reservations")
    .select("id, status, case_id, inventory_id")
    .eq("id", reservationId)
    .single()

  if (!reservation) throw new Error("ไม่พบรายการจอง")
  if (!["reserved", "prepared"].includes(reservation.status)) {
    throw new Error("ไม่สามารถคืนรายการนี้ได้ (สถานะ: " + reservation.status + ")")
  }

  // Set status to returned (trigger releases reserved_quantity)
  const { error } = await supabase
    .from("case_reservations")
    .update({ status: "returned" as ReservationStatus })
    .eq("id", reservationId)

  if (error) throw error

  // Re-evaluate case status
  await revalidateCaseReadyStatus(reservation.case_id)

  revalidatePath("/cases")
  revalidatePath(`/cases/${reservation.case_id}`)
  revalidatePath("/preparation")
  revalidatePath("/inventory")
}

/**
 * Add a material and immediately record it as consumed (used on-site).
 * For when assistant picks a different LOT than what was prepared,
 * or uses an unplanned material during a procedure.
 * Creates reservation as "consumed" directly — trigger deducts inventory.
 */
export async function addAndConsumeOnSite(
  caseId: string,
  inventoryId: string,
  quantityUsed: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Validate case
    const { data: caseData } = await supabase
      .from("cases")
      .select("case_status")
      .eq("id", caseId)
      .single()

    if (!caseData) return { success: false, error: "ไม่พบเคส" }
    if (["completed", "cancelled"].includes(caseData.case_status)) {
      return { success: false, error: "ไม่สามารถเพิ่มวัสดุในเคสที่ปิดแล้ว" }
    }

    // Get inventory item details
    const { data: inv } = await supabase
      .from("inventory")
      .select("id, product_id, quantity, reserved_quantity")
      .eq("id", inventoryId)
      .single()

    if (!inv) return { success: false, error: "ไม่พบรายการสต็อก" }

    const available = inv.quantity - inv.reserved_quantity
    if (available < quantityUsed) {
      return { success: false, error: `สต็อกไม่พอ (เหลือ ${available} ชิ้น)` }
    }

    // The inventory trigger only fires on UPDATE, not INSERT.
    // Step 1: Insert as "prepared" and manually reserve inventory
    const { data: newRes, error: insertErr } = await supabase
      .from("case_reservations")
      .insert({
        case_id: caseId,
        product_id: inv.product_id,
        inventory_id: inventoryId,
        quantity_reserved: quantityUsed,
        status: "prepared" as ReservationStatus,
        reserved_by: user.id,
        reserved_at: new Date().toISOString(),
        prepared_by: user.id,
        prepared_at: new Date().toISOString(),
        lot_specified: true,
      })
      .select("id")
      .single()

    if (insertErr || !newRes) return { success: false, error: insertErr?.message ?? "สร้างรายการไม่สำเร็จ" }

    // Manually add reserved_quantity (INSERT doesn't trigger status change)
    const { error: reserveErr } = await supabase
      .from("inventory")
      .update({ reserved_quantity: inv.reserved_quantity + quantityUsed })
      .eq("id", inventoryId)

    if (reserveErr) return { success: false, error: reserveErr.message }

    // Step 2: Update to "consumed" (trigger deducts quantity + releases reserved_quantity)
    const { error: consumeErr } = await supabase
      .from("case_reservations")
      .update({
        quantity_used: quantityUsed,
        status: "consumed" as ReservationStatus,
      })
      .eq("id", newRes.id)

    if (consumeErr) return { success: false, error: consumeErr.message }

    revalidatePath("/cases")
    revalidatePath(`/cases/${caseId}`)
    revalidatePath("/inventory")
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" }
  }
}
/**
 * Batch save materials for a case (draft mode).
 * - Creates new reservations for added items
 * - Returns (soft-deletes) removed items that are still "reserved"
 * - Checks stock availability at save time
 * - Re-evaluates case status
 */
export async function saveCaseMaterials(
  caseId: string,
  items: Array<{ productId: string; quantity: number }>,
  removedReservationIds: string[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Validate case
  const { data: caseData } = await supabase
    .from("cases")
    .select("case_status")
    .eq("id", caseId)
    .single()

  if (!caseData) throw new Error("ไม่พบเคส")
  if (["completed", "cancelled"].includes(caseData.case_status)) {
    throw new Error("ไม่สามารถแก้ไขเคสที่ปิดแล้ว")
  }

  // Step 1: Return removed reservations (only if still "reserved")
  if (removedReservationIds.length > 0) {
    const { error: returnErr } = await supabase
      .from("case_reservations")
      .update({ status: "returned" as ReservationStatus })
      .in("id", removedReservationIds)
      .eq("status", "reserved") // Only return reserved items, not prepared ones

    if (returnErr) throw new Error("ลบรายการไม่สำเร็จ: " + returnErr.message)
  }

  // Step 2: Create new reservations
  const outOfStockNames: string[] = []

  if (items.length > 0) {
    // Get product info for stock checking
    const productIds = items.map((i) => i.productId)
    const { data: products } = await supabase
      .from("products")
      .select("id, name")
      .in("id", productIds)

    const productNameMap = new Map((products ?? []).map((p) => [p.id, p.name]))

    for (const item of items) {
      // Check stock availability
      const { data: lotRows } = await supabase
        .from("inventory")
        .select("id, quantity, reserved_quantity")
        .eq("product_id", item.productId)
        .gt("quantity", 0)
        .order("expiry_date", { ascending: true, nullsFirst: false })

      let hasStock = false
      for (const lot of lotRows ?? []) {
        const available = lot.quantity - lot.reserved_quantity
        if (available >= item.quantity) {
          hasStock = true
          break
        }
      }

      if (!hasStock) {
        outOfStockNames.push(productNameMap.get(item.productId) ?? "สินค้า")
      }

      // Create reservation as "reserved"
      const { error } = await supabase
        .from("case_reservations")
        .insert({
          case_id: caseId,
          product_id: item.productId,
          quantity_reserved: item.quantity,
          status: "reserved" as ReservationStatus,
          reserved_by: user.id,
          reserved_at: new Date().toISOString(),
          lot_specified: false,
        })

      if (error) throw new Error("เพิ่มวัสดุไม่สำเร็จ: " + error.message)
    }
  }

  // Step 3: Re-evaluate case status
  await revalidateCaseReadyStatus(caseId)

  // Step 4: Notify if out of stock
  if (outOfStockNames.length > 0) {
    const { data: fullCase } = await supabase
      .from("cases")
      .select("case_number, scheduled_date, scheduled_time, patients(full_name), dentists:users!cases_dentist_id_fkey(full_name)")
      .eq("id", caseId)
      .single()

    const caseNumber = fullCase?.case_number ?? caseId
    const patientName = (fullCase?.patients as unknown as { full_name: string } | null)?.full_name ?? "ไม่ระบุ"
    const dentistName = (fullCase?.dentists as unknown as { full_name: string } | null)?.full_name ?? "ไม่ระบุ"

    let dateInfo = ""
    if (fullCase?.scheduled_date) {
      dateInfo = ` นัด ${formatDate(String(fullCase.scheduled_date))}`
      if (fullCase?.scheduled_time) {
        dateInfo += ` ${(fullCase.scheduled_time as string).slice(0, 5)}`
      }
    }

    const { smartNotify } = await import("./notifications")
    smartNotify({
      type: "out_of_stock",
      title: "สินค้าหมด — ต้องสั่งเพิ่ม",
      message: `เคส ${caseNumber} (${patientName}) ทพ.${dentistName}${dateInfo}\n${outOfStockNames.join(", ")} ไม่มีในสต๊อก`,
      data: { case_id: caseId, case_number: caseNumber },
    }).catch(() => {})
  }

  revalidatePath("/cases")
  revalidatePath(`/cases/${caseId}`)

  return {
    savedCount: items.length,
    removedCount: removedReservationIds.length,
    outOfStock: outOfStockNames,
  }
}

export async function addMaterialToCase(
  caseId: string,
  productId: string,
  quantity: number
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Validate case exists and is editable
  const { data: caseData } = await supabase
    .from("cases")
    .select("case_status")
    .eq("id", caseId)
    .single()

  if (!caseData) throw new Error("ไม่พบเคส")
  if (["completed", "cancelled"].includes(caseData.case_status)) {
    throw new Error("ไม่สามารถเพิ่มวัสดุในเคสที่ปิดแล้ว")
  }

  // Check available stock via FEFO
  const { data: lotRows } = await supabase
    .from("inventory")
    .select("id, quantity, reserved_quantity, expiry_date")
    .eq("product_id", productId)
    .gt("quantity", 0)
    .order("expiry_date", { ascending: true, nullsFirst: false })
    .order("received_date", { ascending: true })

  let hasStock = false

  for (const lot of lotRows ?? []) {
    const available = lot.quantity - lot.reserved_quantity
    if (available >= quantity) {
      hasStock = true
      break
    }
  }

  // Step 1: Create reservation as "reserved"
  const { data: newReservation, error } = await supabase
    .from("case_reservations")
    .insert({
      case_id: caseId,
      product_id: productId,
      quantity_reserved: quantity,
      status: "reserved" as ReservationStatus,
      reserved_by: user.id,
      reserved_at: new Date().toISOString(),
      lot_specified: false,
    })
    .select("id")
    .single()

  if (error) throw error

  // All reservations stay as "reserved" - stock staff must assign LOT and prepare
  // Re-evaluate case status
  const wasReady = caseData.case_status === "ready"
  await revalidateCaseReadyStatus(caseId)

  // Notify stock_staff/admin when material is out of stock
  if (!hasStock) {
    const { data: fullCase } = await supabase
      .from("cases")
      .select("case_number, scheduled_date, scheduled_time, patients(full_name), dentists:users!cases_dentist_id_fkey(full_name)")
      .eq("id", caseId)
      .single()

    const { data: product } = await supabase
      .from("products")
      .select("name")
      .eq("id", productId)
      .single()

    const productName = product?.name ?? "สินค้า"
    const caseNumber = fullCase?.case_number ?? caseId
    const patientName = (fullCase?.patients as unknown as { full_name: string } | null)?.full_name ?? "ไม่ระบุ"
    const dentistName = (fullCase?.dentists as unknown as { full_name: string } | null)?.full_name ?? "ไม่ระบุ"

    let dateInfo = ""
    if (fullCase?.scheduled_date) {
      dateInfo = ` นัด ${formatDate(String(fullCase.scheduled_date))}`
      if (fullCase?.scheduled_time) {
        dateInfo += ` ${(fullCase.scheduled_time as string).slice(0, 5)}`
      }
    }

    // Check if urgent (within 48h)
    let isUrgent = false
    if (fullCase?.scheduled_date) {
      const caseDate = new Date(fullCase.scheduled_date)
      const urgentCutoff = new Date(Date.now() + 48 * 60 * 60 * 1000)
      isUrgent = caseDate <= urgentCutoff
    }

    if (isUrgent) {
      // Urgent: notify all roles via emergency_case
      const { smartNotify } = await import("./notifications")
      smartNotify({
        type: "emergency_case",
        title: "ด่วน — ของขาดสต๊อก",
        message: `เคส ${caseNumber} (${patientName}) ทพ.${dentistName}${dateInfo}\n${productName} (${quantity} ชิ้น) ไม่มีในสต๊อก`,
        data: { case_id: caseId, product_id: productId, case_number: caseNumber },
      }).catch(() => {})
    } else {
      // Normal: notify stock_staff/admin via out_of_stock
      const { smartNotify } = await import("./notifications")
      smartNotify({
        type: "out_of_stock",
        title: "สินค้าหมด — ต้องสั่งเพิ่ม",
        message: `เคส ${caseNumber} (${patientName}) ทพ.${dentistName}${dateInfo}\n${productName} (${quantity} ชิ้น) ไม่มีในสต๊อก`,
        data: { case_id: caseId, product_id: productId, case_number: caseNumber },
      }).catch(() => {})
    }
  }

  revalidatePath("/cases")
  revalidatePath(`/cases/${caseId}`)
  revalidatePath("/preparation")
  revalidatePath("/inventory")

  return {
    hasStock,
    wasReady,
    reservationId: newReservation.id,
  }
}

/**
 * Re-evaluate case readiness after editing materials.
 * If all active reservations are prepared → ready
 * If any are still reserved → pending_preparation
 */
export async function revalidateCaseReadyStatus(caseId: string) {
  const supabase = await createClient()

  const { data: activeReservations } = await supabase
    .from("case_reservations")
    .select("id, status, product_id, quantity_reserved")
    .eq("case_id", caseId)
    .neq("status", "returned")
    .neq("status", "consumed")

  const { data: caseData } = await supabase
    .from("cases")
    .select("case_status, appointment_status, case_number, scheduled_date, scheduled_time, patients(full_name)")
    .eq("id", caseId)
    .single()

  if (!caseData || ["completed", "cancelled"].includes(caseData.case_status)) return

  let newStatus: CaseStatus | null = null

  if (!activeReservations || activeReservations.length === 0) {
    // No active reservations left
    if (["ready", "pending_preparation"].includes(caseData.case_status)) {
      newStatus = "pending_order" as CaseStatus
    }
  } else {
    const allPrepared = activeReservations.every((r) => r.status === "prepared")

    if (allPrepared) {
      if (caseData.case_status !== "ready") {
        newStatus = "ready" as CaseStatus
      }
    } else {
      // Some items are still "reserved" (not prepared) — check if stock is available
      const reservedItems = activeReservations.filter((r) => r.status === "reserved")

      if (reservedItems.length > 0) {
        const productIds = Array.from(new Set(reservedItems.map((r) => r.product_id)))
        const { data: inventoryRows } = await supabase
          .from("inventory")
          .select("product_id, quantity, reserved_quantity")
          .in("product_id", productIds)
          .gt("quantity", 0)

        const hasOutOfStock = reservedItems.some((r) => {
          const lots = (inventoryRows ?? []).filter((inv) => inv.product_id === r.product_id)
          const totalAvailable = lots.reduce((sum, inv) => sum + inv.quantity - inv.reserved_quantity, 0)
          return totalAvailable < r.quantity_reserved
        })

        const targetStatus = hasOutOfStock ? "pending_order" : "pending_preparation"
        if (caseData.case_status !== targetStatus) {
          newStatus = targetStatus as CaseStatus
        }
      } else {
        if (caseData.case_status !== "pending_preparation") {
          newStatus = "pending_preparation" as CaseStatus
        }
      }
    }
  }

  // Apply status change
  if (newStatus) {
    await supabase
      .from("cases")
      .update({ case_status: newStatus })
      .eq("id", caseId)

    // Notify CS to reschedule if appointment is confirmed but now pending_order
    if (newStatus === "pending_order" && caseData.appointment_status === "confirmed") {
      const patient = caseData.patients as unknown as { full_name: string } | null
      const caseNumber = caseData.case_number ?? caseId
      const patientName = patient?.full_name ?? "ไม่ระบุ"

      let dateInfo = ""
      if (caseData.scheduled_date) {
        dateInfo = ` นัด ${formatDate(String(caseData.scheduled_date))}`
        if (caseData.scheduled_time) {
          dateInfo += ` ${(caseData.scheduled_time as string).slice(0, 5)}`
        }
      }

      const { createNotification } = await import("./notifications")

      // Send to all CS users
      const { data: csUsers } = await supabase
        .from("users")
        .select("id")
        .eq("role", "cs")
        .eq("is_active", true)

      for (const csUser of csUsers ?? []) {
        createNotification({
          user_id: csUser.id,
          type: "system",
          title: "กรุณาเลื่อนนัด — วัสดุไม่พร้อม",
          message: `เคส ${caseNumber} (${patientName})${dateInfo} มีการเพิ่มวัสดุที่ไม่มีในสต๊อก ต้องสั่งของเพิ่ม กรุณาเลื่อนนัดลูกค้า`,
          data: { case_id: caseId, case_number: caseNumber },
          // Respects notification_settings defaults for in_app/line/discord
        }).catch(() => {})
      }
    }
  }
}

export async function cancelCase(caseId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Return all active reservations (trigger handles inventory)
  const { error: resError } = await supabase
    .from("case_reservations")
    .update({ status: "returned" as ReservationStatus })
    .eq("case_id", caseId)
    .in("status", ["reserved", "prepared"])

  if (resError) throw resError

  const { error } = await supabase
    .from("cases")
    .update({ case_status: "cancelled" as CaseStatus })
    .eq("id", caseId)

  if (error) throw error
  revalidatePath("/cases")
  revalidatePath(`/cases/${caseId}`)
}

export async function requestLockedMaterial(
  productId: string,
  requestingCaseId: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Find cases that have this product locked
  const { data: lockedReservations } = await supabase
    .from("case_reservations")
    .select("case_id, quantity_reserved, cases!inner(case_number)")
    .eq("product_id", productId)
    .in("status", ["reserved", "prepared"])

  // Get product name
  const { data: product } = await supabase
    .from("products")
    .select("name")
    .eq("id", productId)
    .single()

  // Get requesting user name
  const { data: requestingUser } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .single()

  // Notify all admins
  const { data: admins } = await supabase
    .from("users")
    .select("id")
    .eq("role", "admin")
    .eq("is_active", true)

  const lockedCases = (lockedReservations ?? [])
    .map((r) => (r.cases as Record<string, unknown>)?.case_number)
    .filter(Boolean)

  for (const admin of admins ?? []) {
    await createNotification({
      user_id: admin.id,
      type: "material_lock_request",
      title: "ขอใช้วัสดุที่ถูกล็อค",
      message: `${requestingUser?.full_name ?? "แพทย์"} ขอใช้ ${product?.name ?? "วัสดุ"} ซึ่งถูกจองไว้ในเคส ${lockedCases.join(", ")}`,
      data: {
        product_id: productId,
        requesting_case_id: requestingCaseId,
        requesting_user_id: user.id,
      },
    })
  }
}

export async function getDentists() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name")
    .eq("role", "dentist")
    .eq("is_active", true)
    .order("full_name")

  if (error) throw error
  return data
}

export async function getAssistants() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name")
    .eq("role", "assistant")
    .eq("is_active", true)
    .order("full_name")

  if (error) throw error
  return data
}
