"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { generateCaseNumber } from "@/lib/utils"
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
      `case_number.ilike.%${filters.search}%,patients.full_name.ilike.%${filters.search}%`
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
        products(id, ref, name, brand, category, unit),
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

  // Validate 3-day advance rule
  if (scheduledDate) {
    const scheduled = new Date(scheduledDate)
    const today = new Date()
    const diffDays = Math.ceil((scheduled.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays < 3) {
      throw new Error("ต้องนัดล่วงหน้าอย่างน้อย 3 วัน")
    }
  }

  const { data, error } = await supabase
    .from("cases")
    .insert({
      case_number: generateCaseNumber(),
      patient_id: formData.get("patient_id") as string,
      dentist_id: formData.get("dentist_id") as string,
      assistant_id: (formData.get("assistant_id") as string) || null,
      scheduled_date: scheduledDate || null,
      scheduled_time: (formData.get("scheduled_time") as string) || null,
      case_status: scheduledDate ? "pending_order" : "pending_appointment",
      procedure_type: (formData.get("procedure_type") as string) || null,
      tooth_positions: toothPositions,
      notes: (formData.get("notes") as string) || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) throw error
  revalidatePath("/cases")
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

  // Update case status to pending_preparation
  await supabase
    .from("cases")
    .update({ case_status: "pending_preparation" as CaseStatus })
    .eq("id", caseId)

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
