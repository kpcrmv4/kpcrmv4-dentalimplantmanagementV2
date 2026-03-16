"use server"

import { createClient } from "@/lib/supabase/server"

export async function getDashboardReport() {
  const supabase = await createClient()

  const today = new Date().toISOString().split("T")[0]

  const [casesTotal, casesActive, casesToday, poTotal, poPending, productsTotal] = await Promise.all([
    supabase.from("cases").select("id", { count: "exact", head: true }),
    supabase
      .from("cases")
      .select("id", { count: "exact", head: true })
      .in("case_status", ["pending_appointment", "pending_order", "pending_preparation", "ready"]),
    supabase
      .from("cases")
      .select("id", { count: "exact", head: true })
      .eq("scheduled_date", today)
      .neq("case_status", "cancelled"),
    supabase.from("purchase_orders").select("id", { count: "exact", head: true }),
    supabase
      .from("purchase_orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["draft", "pending_approval"]),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
  ])

  return {
    casesTotal: casesTotal.count ?? 0,
    casesActive: casesActive.count ?? 0,
    casesToday: casesToday.count ?? 0,
    poTotal: poTotal.count ?? 0,
    poPending: poPending.count ?? 0,
    productsTotal: productsTotal.count ?? 0,
  }
}

export async function getCaseStatusDistribution() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("cases")
    .select("case_status")

  if (error) throw error

  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    const status = row.case_status as string
    counts[status] = (counts[status] ?? 0) + 1
  }
  return counts
}

export async function getTopProducts() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("case_reservations")
    .select("product_id, quantity_reserved, products(name, ref)")

  if (error) throw error

  const productTotals: Record<string, { name: string; ref: string; total: number }> = {}
  for (const row of data ?? []) {
    const id = row.product_id as string
    const product = row.products as unknown as { name: string; ref: string } | null
    if (!product) continue
    if (!productTotals[id]) {
      productTotals[id] = { name: product.name, ref: product.ref, total: 0 }
    }
    productTotals[id].total += Number(row.quantity_reserved)
  }

  return Object.values(productTotals)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
}

export type CostReportItem = {
  caseId: string
  caseNumber: string
  patientName: string
  patientHn: string
  scheduledDate: string | null
  totalCost: number
  items: {
    productName: string
    productRef: string
    category: string
    quantity: number
    unitCost: number
    subtotal: number
  }[]
}

export async function getCostReport(from: string, to: string): Promise<CostReportItem[]> {
  const supabase = await createClient()

  const { data: cases, error: casesError } = await supabase
    .from("cases")
    .select(`
      id,
      case_number,
      scheduled_date,
      patients(full_name, hn),
      case_reservations(
        quantity_reserved,
        quantity_used,
        products(name, ref, category, cost_price)
      )
    `)
    .gte("scheduled_date", from)
    .lte("scheduled_date", to)
    .neq("case_status", "cancelled")
    .order("scheduled_date", { ascending: true })

  if (casesError) throw casesError
  if (!cases || cases.length === 0) return []

  const costResults = await Promise.all(
    cases.map((c) => supabase.rpc("get_cost_per_case", { p_case_id: c.id }))
  )

  return cases.map((c, idx) => {
    const patient = c.patients as unknown as { full_name: string; hn: string } | null
    const reservations = (c.case_reservations ?? []) as unknown as {
      quantity_reserved: number
      quantity_used: number | null
      products: { name: string; ref: string; category: string; cost_price: number | null } | null
    }[]

    const items = reservations
      .filter((r) => r.products)
      .map((r) => ({
        productName: r.products!.name,
        productRef: r.products!.ref,
        category: r.products!.category,
        quantity: r.quantity_used ?? r.quantity_reserved,
        unitCost: r.products!.cost_price ?? 0,
        subtotal: (r.quantity_used ?? r.quantity_reserved) * (r.products!.cost_price ?? 0),
      }))

    return {
      caseId: c.id,
      caseNumber: c.case_number,
      patientName: patient?.full_name ?? "-",
      patientHn: patient?.hn ?? "-",
      scheduledDate: c.scheduled_date,
      totalCost: costResults[idx].data ?? 0,
      items,
    }
  })
}

export type UsageReportRow = {
  case_id: string
  case_number: string
  patient_hn: string
  patient_name: string
  product_category: string
  product_name: string
  product_ref: string
  quantity_used: number
  total_cost: number
  unit_cost: number
  usage_date: string
}

export async function getUsageReport(from: string, to: string): Promise<UsageReportRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("get_usage_report", {
    p_from: from,
    p_to: to,
  })

  if (error) throw error
  return (data ?? []) as UsageReportRow[]
}

export type InvoiceSearchResult = {
  productName: string
  productRef: string
  category: string
  lotNumber: string
  quantity: number
  receivedDate: string
  expiryDate: string | null
  invoiceNumber: string | null
}

export type DentistPerformanceRow = {
  dentist_id: string
  dentist_name: string
  total_cases: number
  completed_cases: number
  total_revenue: number
  total_cost: number
  profit: number
  avg_cost_per_case: number
}

export async function getDentistPerformance(from: string, to: string): Promise<DentistPerformanceRow[]> {
  const supabase = await createClient()

  // @ts-expect-error RPC not yet in generated types — added via migration 006
  const { data, error } = await supabase.rpc("get_dentist_performance", {
    p_from: from,
    p_to: to,
  })

  if (error) throw error
  return (data ?? []) as unknown as DentistPerformanceRow[]
}

export async function searchByInvoice(invoiceNumber: string): Promise<InvoiceSearchResult[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("inventory")
    .select("lot_number, quantity, received_date, expiry_date, invoice_number, products(name, ref, category)")
    .ilike("invoice_number", `%${invoiceNumber}%`)
    .order("received_date", { ascending: false })

  if (error) throw error

  return (data ?? []).map((row) => {
    const product = row.products as unknown as { name: string; ref: string; category: string } | null
    return {
      productName: product?.name ?? "-",
      productRef: product?.ref ?? "-",
      category: product?.category ?? "-",
      lotNumber: row.lot_number,
      quantity: row.quantity,
      receivedDate: row.received_date,
      expiryDate: row.expiry_date,
      invoiceNumber: row.invoice_number,
    }
  })
}
