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
  if (status === "pending_preparation") return "orange"
  if (status === "pending_order") return "red"
  return "neutral" // completed, cancelled
}

export async function getDashboardCases(
  year: number,
  month: number,
  dentistId?: string
): Promise<DashboardCase[]> {
  const supabase = await createClient()

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`

  let query = supabase
    .from("cases")
    .select(
      "id, case_number, scheduled_date, scheduled_time, case_status, appointment_status, procedure_type, tooth_positions, patients(hn, full_name), users!cases_dentist_id_fkey(full_name)"
    )
    .gte("scheduled_date", startDate)
    .lt("scheduled_date", endDate)
    .neq("case_status", "cancelled")
    .order("scheduled_date")
    .order("scheduled_time", { nullsFirst: false })

  if (dentistId) {
    query = query.eq("dentist_id", dentistId)
  }

  const { data, error } = await query

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

    // Get product_ids reserved for orange cases
    const { data: reservations } = await supabase
      .from("case_reservations")
      .select("case_id, product_id")
      .in("case_id", orangeIds)

    const productIds = Array.from(
      new Set((reservations ?? []).map((r) => r.product_id))
    )

    const casesWithOrderedPO = new Set<string>()

    if (productIds.length > 0) {
      // Find which products have an active PO
      const { data: poItems } = await supabase
        .from("purchase_order_items")
        .select("product_id, purchase_orders(status)")
        .in("product_id", productIds)

      const orderedProductIds = new Set<string>()
      for (const item of poItems ?? []) {
        const po = item.purchase_orders as unknown as { status: string } | null
        if (po?.status === "ordered") {
          orderedProductIds.add(item.product_id)
        }
      }

      // Map back: if a reservation's product has an ordered PO → mark case as yellow
      for (const r of reservations ?? []) {
        if (orderedProductIds.has(r.product_id)) {
          casesWithOrderedPO.add(r.case_id)
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

export async function getUnreadyCases(dentistId?: string): Promise<DashboardCase[]> {
  const supabase = await createClient()
  const today = new Date().toISOString().split("T")[0]

  let query = supabase
    .from("cases")
    .select(
      "id, case_number, scheduled_date, scheduled_time, case_status, appointment_status, procedure_type, tooth_positions, patients(hn, full_name), users!cases_dentist_id_fkey(full_name)"
    )
    .gte("scheduled_date", today)
    .not("case_status", "in", '("ready","completed","cancelled")')
    .order("scheduled_date")
    .limit(10)

  if (dentistId) {
    query = query.eq("dentist_id", dentistId)
  }

  const { data, error } = await query

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

export type EmergencyAlert = DashboardCase & {
  materialSummary: string
  isOverdue: boolean
}

export async function getEmergencyAlerts(dentistId?: string): Promise<EmergencyAlert[]> {
  const supabase = await createClient()
  const now = new Date()
  const fortyEightHoursLater = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  // Use a wider date range then filter precisely with datetime
  const pastDayStr = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  const futureStr = fortyEightHoursLater.toISOString().split("T")[0]

  let query = supabase
    .from("cases")
    .select(
      "id, case_number, scheduled_date, scheduled_time, case_status, appointment_status, procedure_type, tooth_positions, patients(hn, full_name), users!cases_dentist_id_fkey(full_name)"
    )
    .gte("scheduled_date", pastDayStr)
    .lte("scheduled_date", futureStr)
    .not("case_status", "in", '("ready","completed","cancelled")')
    .order("scheduled_date")

  if (dentistId) {
    query = query.eq("dentist_id", dentistId)
  }

  const { data, error } = await query

  if (error) throw error

  // Filter precisely: include overdue cases and cases within 48h
  const cases = (data ?? [])
    .map((c) => {
      const patient = c.patients as unknown as { hn: string; full_name: string } | null
      const dentist = c.users as unknown as { full_name: string } | null

      // Build actual datetime for precise comparison
      const dateStr = c.scheduled_date ?? ""
      const timeStr = c.scheduled_time ?? "23:59"
      const scheduledDt = new Date(`${dateStr}T${timeStr.slice(0, 5)}:00`)

      const isOverdue = scheduledDt < now
      const isWithin48h = scheduledDt >= now && scheduledDt <= fortyEightHoursLater

      if (!isOverdue && !isWithin48h) return null

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
        isOverdue,
      }
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)

  if (cases.length === 0) return []

  // Fetch material reservation details for these cases
  const caseIds = cases.map((c) => c.id)
  const { data: reservations } = await supabase
    .from("case_reservations")
    .select("case_id, status, products(name)")
    .in("case_id", caseIds)

  // Build material summary per case
  const materialMap = new Map<string, { reserved: string[]; prepared: string[] }>()
  for (const r of reservations ?? []) {
    if (!materialMap.has(r.case_id)) {
      materialMap.set(r.case_id, { reserved: [], prepared: [] })
    }
    const entry = materialMap.get(r.case_id)!
    const productName = (r.products as unknown as { name: string } | null)?.name ?? "ไม่ระบุ"
    if (r.status === "reserved") {
      entry.reserved.push(productName)
    } else if (r.status === "prepared") {
      entry.prepared.push(productName)
    }
  }

  return cases.map((c) => {
    const mat = materialMap.get(c.id)
    let materialSummary = ""
    if (c.case_status === "pending_order") {
      const reserved = mat?.reserved ?? []
      materialSummary = reserved.length > 0
        ? `ของขาด: ${reserved.join(", ")}`
        : "รอสั่งของ"
    } else if (c.case_status === "pending_preparation") {
      const reserved = mat?.reserved ?? []
      materialSummary = reserved.length > 0
        ? `รอจัดของ: ${reserved.join(", ")}`
        : "รอจัดเตรียมวัสดุ"
    } else {
      materialSummary = "วัสดุยังไม่พร้อม"
    }
    return { ...c, materialSummary }
  })
}
