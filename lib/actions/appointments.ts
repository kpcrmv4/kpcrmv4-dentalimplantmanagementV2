"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { formatDate } from "@/lib/utils"
import type { AppointmentStatus } from "@/types/database"
import { cancelCase } from "./cases"

async function notifyCaseStakeholders(
  caseId: string,
  title: string,
  message: string,
  excludeUserId?: string
) {
  const supabase = await createClient()

  // Get case info to find dentist
  const { data: caseData } = await supabase
    .from("cases")
    .select("dentist_id, case_number")
    .eq("id", caseId)
    .single()

  if (!caseData) return

  // Get dentist + all active stock_staff + admin
  const { data: staffUsers } = await supabase
    .from("users")
    .select("id")
    .in("role", ["stock_staff", "admin"])
    .eq("is_active", true)

  const userIds = new Set<string>()
  if (caseData.dentist_id) userIds.add(caseData.dentist_id)
  for (const u of staffUsers ?? []) userIds.add(u.id)
  if (excludeUserId) userIds.delete(excludeUserId)

  const { createNotification } = await import("./notifications")
  for (const userId of Array.from(userIds)) {
    createNotification({
      user_id: userId,
      type: "case_assigned",
      title,
      message,
      data: { case_id: caseId, case_number: caseData.case_number },
      // Respects notification_settings defaults for in_app/line/discord
    }).catch(() => {})
  }
}

export async function confirmAppointment(caseId: string, note?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: caseData } = await supabase
    .from("cases")
    .select("appointment_status, scheduled_date, case_number")
    .eq("id", caseId)
    .single()

  if (!caseData) throw new Error("ไม่พบเคส")
  if (caseData.appointment_status === "confirmed") {
    throw new Error("เคสนี้ยืนยันนัดแล้ว")
  }

  const { error } = await supabase
    .from("cases")
    .update({ appointment_status: "confirmed" as AppointmentStatus })
    .eq("id", caseId)

  if (error) throw error

  await supabase.from("case_appointment_logs").insert({
    case_id: caseId,
    action: "confirmed" as AppointmentStatus,
    note: note || "คนไข้ยืนยันมาตามนัด",
    performed_by: user.id,
  })

  revalidatePath("/cases")
  revalidatePath(`/cases/${caseId}`)
  revalidatePath("/calendar")
}

/**
 * เลื่อนนัดไปวันที่แน่นอน → คง confirmed + เปลี่ยนวัน + แจ้งเตือนทุกคน
 */
export async function postponeAppointment(
  caseId: string,
  newDate: string,
  note: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: caseData } = await supabase
    .from("cases")
    .select("appointment_status, scheduled_date, case_number, patients(full_name)")
    .eq("id", caseId)
    .single()

  if (!caseData) throw new Error("ไม่พบเคส")

  const oldDate = caseData.scheduled_date

  // Stay confirmed, just change the date
  const { error } = await supabase
    .from("cases")
    .update({
      appointment_status: "confirmed" as AppointmentStatus,
      scheduled_date: newDate,
    })
    .eq("id", caseId)

  if (error) throw error

  await supabase.from("case_appointment_logs").insert({
    case_id: caseId,
    action: "postponed" as AppointmentStatus,
    note,
    old_date: oldDate,
    new_date: newDate,
    performed_by: user.id,
  })

  // Notify dentist + stock
  const patientName = (caseData.patients as unknown as { full_name: string } | null)?.full_name ?? ""
  const caseNumber = caseData.case_number ?? ""
  await notifyCaseStakeholders(
    caseId,
    "เลื่อนนัดหมาย",
    `เคส ${caseNumber} (${patientName}) เลื่อนนัดจาก ${oldDate ? formatDate(oldDate) : "-"} → ${formatDate(newDate)}\n${note}`,
    user.id
  )

  revalidatePath("/cases")
  revalidatePath(`/cases/${caseId}`)
  revalidatePath("/calendar")
}

/**
 * คนไข้ขอเลื่อนนัดไม่ระบุวัน → กลับเป็น pending + แจ้งเตือนทุกคน
 */
export async function unconfirmAppointment(caseId: string, note: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: caseData } = await supabase
    .from("cases")
    .select("appointment_status, case_status, case_number, scheduled_date, patients(full_name)")
    .eq("id", caseId)
    .single()

  if (!caseData) throw new Error("ไม่พบเคส")
  if (["completed", "cancelled"].includes(caseData.case_status)) {
    throw new Error("เคสนี้ปิดไปแล้ว")
  }

  const oldDate = caseData.scheduled_date

  const { error } = await supabase
    .from("cases")
    .update({
      appointment_status: "pending" as AppointmentStatus,
      scheduled_date: null,
      scheduled_time: null,
    })
    .eq("id", caseId)

  if (error) throw error

  await supabase.from("case_appointment_logs").insert({
    case_id: caseId,
    action: "pending" as AppointmentStatus,
    note,
    old_date: oldDate,
    performed_by: user.id,
  })

  // Notify dentist + stock
  const patientName = (caseData.patients as unknown as { full_name: string } | null)?.full_name ?? ""
  const caseNumber = caseData.case_number ?? ""
  await notifyCaseStakeholders(
    caseId,
    "เลื่อนนัด — ยังไม่ระบุวัน",
    `เคส ${caseNumber} (${patientName}) คนไข้ขอเลื่อนนัด ยังไม่ระบุวันใหม่\n${note}`,
    user.id
  )

  revalidatePath("/cases")
  revalidatePath(`/cases/${caseId}`)
  revalidatePath("/calendar")
}

export async function cancelAppointment(caseId: string, note: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: caseData } = await supabase
    .from("cases")
    .select("appointment_status, case_status")
    .eq("id", caseId)
    .single()

  if (!caseData) throw new Error("ไม่พบเคส")
  if (["completed", "cancelled"].includes(caseData.case_status)) {
    throw new Error("เคสนี้ปิดไปแล้ว ไม่สามารถยกเลิกนัดได้")
  }

  const { error } = await supabase
    .from("cases")
    .update({ appointment_status: "cancelled" as AppointmentStatus })
    .eq("id", caseId)

  if (error) throw error

  await supabase.from("case_appointment_logs").insert({
    case_id: caseId,
    action: "cancelled" as AppointmentStatus,
    note,
    performed_by: user.id,
  })

  await cancelCase(caseId)

  revalidatePath("/cases")
  revalidatePath(`/cases/${caseId}`)
  revalidatePath("/calendar")
}

export async function getAppointmentLogs(caseId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("case_appointment_logs")
    .select("*, users:performed_by(full_name)")
    .eq("case_id", caseId)
    .order("performed_at", { ascending: true })

  if (error) throw error
  return data ?? []
}
