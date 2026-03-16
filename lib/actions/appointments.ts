"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { AppointmentStatus } from "@/types/database"
import { cancelCase } from "./cases"

export async function confirmAppointment(caseId: string, note?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Verify case exists
  const { data: caseData } = await supabase
    .from("cases")
    .select("appointment_status, scheduled_date")
    .eq("id", caseId)
    .single()

  if (!caseData) throw new Error("ไม่พบเคส")
  if (caseData.appointment_status === "confirmed") {
    throw new Error("เคสนี้ยืนยันนัดแล้ว")
  }

  // Update appointment status
  const { error } = await supabase
    .from("cases")
    .update({ appointment_status: "confirmed" as AppointmentStatus })
    .eq("id", caseId)

  if (error) throw error

  // Log the action
  await supabase.from("case_appointment_logs").insert({
    case_id: caseId,
    action: "confirmed" as AppointmentStatus,
    note: note || "คนไข้ยืนยันมาตามนัด",
    performed_by: user.id,
  })

  revalidatePath("/cases")
  revalidatePath(`/cases/${caseId}`)
}

export async function postponeAppointment(
  caseId: string,
  newDate: string,
  note: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Verify case exists and get old date
  const { data: caseData } = await supabase
    .from("cases")
    .select("appointment_status, scheduled_date")
    .eq("id", caseId)
    .single()

  if (!caseData) throw new Error("ไม่พบเคส")

  const oldDate = caseData.scheduled_date

  // Update appointment status + scheduled_date
  const { error } = await supabase
    .from("cases")
    .update({
      appointment_status: "pending" as AppointmentStatus,
      scheduled_date: newDate,
    })
    .eq("id", caseId)

  if (error) throw error

  // Log the action
  await supabase.from("case_appointment_logs").insert({
    case_id: caseId,
    action: "postponed" as AppointmentStatus,
    note,
    old_date: oldDate,
    new_date: newDate,
    performed_by: user.id,
  })

  revalidatePath("/cases")
  revalidatePath(`/cases/${caseId}`)
}

export async function cancelAppointment(caseId: string, note: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Verify case exists
  const { data: caseData } = await supabase
    .from("cases")
    .select("appointment_status, case_status")
    .eq("id", caseId)
    .single()

  if (!caseData) throw new Error("ไม่พบเคส")
  if (["completed", "cancelled"].includes(caseData.case_status)) {
    throw new Error("เคสนี้ปิดไปแล้ว ไม่สามารถยกเลิกนัดได้")
  }

  // Update appointment status
  const { error } = await supabase
    .from("cases")
    .update({ appointment_status: "cancelled" as AppointmentStatus })
    .eq("id", caseId)

  if (error) throw error

  // Log the action
  await supabase.from("case_appointment_logs").insert({
    case_id: caseId,
    action: "cancelled" as AppointmentStatus,
    note,
    performed_by: user.id,
  })

  // Also cancel the case itself (returns reserved materials)
  await cancelCase(caseId)

  revalidatePath("/cases")
  revalidatePath(`/cases/${caseId}`)
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
