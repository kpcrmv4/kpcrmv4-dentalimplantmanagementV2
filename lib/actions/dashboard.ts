"use server"

import { createClient } from "@/lib/supabase/server"
import type { CaseStatus, AppointmentStatus } from "@/types/database"

export type TrafficLight = "green" | "yellow" | "orange" | "red" | "neutral"

export type DashboardCase = {
  id: string
  case_number: string
  scheduled_date: string | null
  scheduled_time: string | null
  case_status: CaseStatus
  appointment_status: AppointmentStatus
  procedure_type: string | null
  patient_name: string
  patient_hn: string
  dentist_name: string
  tooth_positions: number[] | null
  trafficLight: TrafficLight
}

function deriveTrafficLight(status: CaseStatus): TrafficLight {
  if (status === "ready") return "green"
  if (status === "pending_order" || status === "pending_preparation") return "orange"
  return "neutral" // completed, cancelled
}

export async function getDashboardCases(
  year: number,
  month: number
): Promise<DashboardCase[]> {
  const supabase = await createClient()

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`

  const { data, error } = await supabase
    .from("cases")
    .select(
      "id, case_number, scheduled_date, scheduled_time, case_status, appointment_status, procedure_type, tooth_positions, patients(hn, full_name), users!cases_dentist_id_fkey(full_name)"
    )
    .gte("scheduled_date", startDate)
    .lt("scheduled_date", endDate)
    .neq("case_status", "cancelled")
    .order("scheduled_date")
    .order("scheduled_time", { nullsFirst: false })

  if (error) throw error

  const mapped = (data ?? []).map((c) => {
    const patient = c.patients as unknown as { hn: string; full_name: string } | null
    const dentist = c.users as unknown as { full_name: string } | null
    return {
      id: c.id,
      case_number: c.case_number,
      scheduled_date: c.scheduled_date,
      scheduled_time: c.scheduled_time,
      case_status: c.case_status as CaseStatus,
      appointment_status: (c.appointment_status ?? "pending") as AppointmentStatus,
      procedure_type: c.procedure_type,
      patient_name: patient?.full_name ?? "ไม่ระบุ",
      patient_hn: patient?.hn ?? "-",
      dentist_name: dentist?.full_name ?? "ไม่ระบุ",
      tooth_positions: c.tooth_positions,
      trafficLight: deriveTrafficLight(c.case_status as CaseStatus),
    }
  })

  // Upgrade orange → yellow for cases that have an active PO (status = 'ordered')
  const orangeCases = mapped.filter((c) => c.trafficLight === "orange")
  if (orangeCases.length > 0) {
    const orangeIds = orangeCases.map((c) => c.id)
    const { data: poLinks } = await supabase
      .from("case_reservations")
      .select("case_id, product_id, po_items(purchase_orders(status))")
      .in("case_id", orangeIds)

    const casesWithOrderedPO = new Set<string>()
    for (const link of poLinks ?? []) {
      const poItems = link.po_items as unknown as { purchase_orders: { status: string } | null }[] | null
      if (poItems) {
        for (const item of poItems) {
          if (item.purchase_orders?.status === "ordered") {
            casesWithOrderedPO.add(link.case_id)
          }
        }
      }
    }

    for (const c of mapped) {
      if (c.trafficLight === "orange" && casesWithOrderedPO.has(c.id)) {
        c.trafficLight = "yellow"
      }
    }
  }

  return mapped
}

export async function getUnreadyCases(): Promise<DashboardCase[]> {
  const supabase = await createClient()
  const today = new Date().toISOString().split("T")[0]

  const { data, error } = await supabase
    .from("cases")
    .select(
      "id, case_number, scheduled_date, scheduled_time, case_status, appointment_status, procedure_type, tooth_positions, patients(hn, full_name), users!cases_dentist_id_fkey(full_name)"
    )
    .gte("scheduled_date", today)
    .not("case_status", "in", '("ready","completed","cancelled")')
    .order("scheduled_date")
    .limit(10)

  if (error) throw error

  return (data ?? []).map((c) => {
    const patient = c.patients as unknown as { hn: string; full_name: string } | null
    const dentist = c.users as unknown as { full_name: string } | null
    return {
      id: c.id,
      case_number: c.case_number,
      scheduled_date: c.scheduled_date,
      scheduled_time: c.scheduled_time,
      case_status: c.case_status as CaseStatus,
      appointment_status: (c.appointment_status ?? "pending") as AppointmentStatus,
      procedure_type: c.procedure_type,
      patient_name: patient?.full_name ?? "ไม่ระบุ",
      patient_hn: patient?.hn ?? "-",
      dentist_name: dentist?.full_name ?? "ไม่ระบุ",
      tooth_positions: c.tooth_positions,
      trafficLight: deriveTrafficLight(c.case_status as CaseStatus),
    }
  })
}

export type LowStockItem = {
  id: string
  ref: string
  name: string
  brand: string | null
  unit: string
  totalStock: number
  minStock: number
}

export async function getLowStockItems(): Promise<LowStockItem[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("products")
    .select("id, ref, name, brand, unit, min_stock_level, inventory(quantity, reserved_quantity)")
    .eq("is_active", true)
    .order("name")

  if (error) throw error

  const items: LowStockItem[] = []
  for (const p of data ?? []) {
    const rows = (p.inventory as Array<{ quantity: number; reserved_quantity: number }>) ?? []
    const totalStock = rows.reduce((sum, r) => sum + r.quantity - r.reserved_quantity, 0)
    if (totalStock <= p.min_stock_level) {
      items.push({
        id: p.id,
        ref: p.ref,
        name: p.name,
        brand: p.brand,
        unit: p.unit,
        totalStock,
        minStock: p.min_stock_level,
      })
    }
  }
  return items
}

export async function getEmergencyAlerts(): Promise<DashboardCase[]> {
  const supabase = await createClient()
  const today = new Date()
  const twoDaysLater = new Date(today)
  twoDaysLater.setDate(today.getDate() + 2)

  const todayStr = today.toISOString().split("T")[0]
  const futureStr = twoDaysLater.toISOString().split("T")[0]

  const { data, error } = await supabase
    .from("cases")
    .select(
      "id, case_number, scheduled_date, scheduled_time, case_status, appointment_status, procedure_type, tooth_positions, patients(hn, full_name), users!cases_dentist_id_fkey(full_name)"
    )
    .gte("scheduled_date", todayStr)
    .lte("scheduled_date", futureStr)
    .not("case_status", "in", '("ready","completed","cancelled")')
    .order("scheduled_date")

  if (error) throw error

  return (data ?? []).map((c) => {
    const patient = c.patients as unknown as { hn: string; full_name: string } | null
    const dentist = c.users as unknown as { full_name: string } | null
    return {
      id: c.id,
      case_number: c.case_number,
      scheduled_date: c.scheduled_date,
      scheduled_time: c.scheduled_time,
      case_status: c.case_status as CaseStatus,
      appointment_status: (c.appointment_status ?? "pending") as AppointmentStatus,
      procedure_type: c.procedure_type,
      patient_name: patient?.full_name ?? "ไม่ระบุ",
      patient_hn: patient?.hn ?? "-",
      dentist_name: dentist?.full_name ?? "ไม่ระบุ",
      tooth_positions: c.tooth_positions,
      trafficLight: deriveTrafficLight(c.case_status as CaseStatus),
    }
  })
}
