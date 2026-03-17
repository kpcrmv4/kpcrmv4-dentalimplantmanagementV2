"use server"

import { createClient } from "@/lib/supabase/server"
import type { CaseStatus } from "@/types/database"

export type PreparationReservation = {
  id: string
  productId: string
  productName: string
  productBrand: string
  productRef: string
  productUnit: string
  quantityReserved: number
  status: string
  inventoryId: string | null
  lotNumber: string | null
}

export type PreparationCase = {
  id: string
  caseNumber: string
  patientName: string
  patientHn: string
  scheduledDate: string | null
  scheduledTime: string | null
  caseStatus: CaseStatus
  procedureType: string | null
  toothPositions: number[] | null
  isUrgent: boolean
  reservations: PreparationReservation[]
  totalItems: number
  preparedItems: number
}

export async function getPreparationCases(): Promise<{
  pending: PreparationCase[]
  ready: PreparationCase[]
  urgentCount: number
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const today = new Date()
  const todayStr = today.toISOString().split("T")[0]
  const twoDaysLater = new Date(today)
  twoDaysLater.setDate(today.getDate() + 2)
  const urgentDateStr = twoDaysLater.toISOString().split("T")[0]

  // Fetch cases assigned to this assistant that need work
  const { data: cases, error } = await supabase
    .from("cases")
    .select(
      `id, case_number, scheduled_date, scheduled_time, case_status, procedure_type, tooth_positions,
       patients(hn, full_name),
       case_reservations(id, product_id, quantity_reserved, status, inventory_id, products(name, brand, ref, unit), inventory(lot_number))`
    )
    .eq("assistant_id", user.id)
    .in("case_status", ["pending_preparation", "ready"])
    .gte("scheduled_date", todayStr)
    .order("scheduled_date", { ascending: true })
    .order("scheduled_time", { ascending: true, nullsFirst: false })

  if (error) throw error

  const pending: PreparationCase[] = []
  const ready: PreparationCase[] = []
  let urgentCount = 0

  for (const c of cases ?? []) {
    const patient = c.patients as unknown as { hn: string; full_name: string } | null
    const reservations = (
      c.case_reservations as unknown as Array<{
        id: string
        product_id: string
        quantity_reserved: number
        status: string
        inventory_id: string | null
        products: { name: string; brand: string | null; ref: string; unit: string } | null
        inventory: { lot_number: string } | null
      }>
    ) ?? []

    const activeReservations = reservations.filter((r) => r.status !== "returned")
    const totalItems = activeReservations.length
    const preparedItems = activeReservations.filter(
      (r) => r.status === "prepared" || r.status === "consumed"
    ).length

    const isUrgent =
      c.scheduled_date != null && c.scheduled_date <= urgentDateStr

    if (isUrgent && c.case_status === "pending_preparation") {
      urgentCount++
    }

    const mapped: PreparationCase = {
      id: c.id,
      caseNumber: c.case_number,
      patientName: patient?.full_name ?? "ไม่ระบุ",
      patientHn: patient?.hn ?? "-",
      scheduledDate: c.scheduled_date,
      scheduledTime: c.scheduled_time,
      caseStatus: c.case_status as CaseStatus,
      procedureType: c.procedure_type,
      toothPositions: c.tooth_positions,
      isUrgent,
      reservations: activeReservations.map((r) => ({
        id: r.id,
        productId: r.product_id,
        productName: r.products?.name ?? "ไม่ทราบ",
        productBrand: r.products?.brand ?? "",
        productRef: r.products?.ref ?? "",
        productUnit: r.products?.unit ?? "ชิ้น",
        quantityReserved: r.quantity_reserved,
        status: r.status,
        inventoryId: r.inventory_id,
        lotNumber: r.inventory?.lot_number ?? null,
      })),
      totalItems,
      preparedItems,
    }

    if (c.case_status === "pending_preparation") {
      pending.push(mapped)
    } else {
      ready.push(mapped)
    }
  }

  return { pending, ready, urgentCount }
}
