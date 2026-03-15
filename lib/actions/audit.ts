"use server"

import { createClient } from "@/lib/supabase/server"

export async function getAuditLogs(filters?: {
  table_name?: string
  action?: string
  search?: string
  limit?: number
}) {
  const supabase = await createClient()
  let query = supabase
    .from("audit_logs")
    .select("*, performer:users!audit_logs_performed_by_fkey(full_name)")
    .order("performed_at", { ascending: false })

  if (filters?.table_name) {
    query = query.eq("table_name", filters.table_name)
  }
  if (filters?.action) {
    query = query.eq("action", filters.action)
  }
  if (filters?.search) {
    query = query.or(
      `table_name.ilike.%${filters.search}%,record_id.ilike.%${filters.search}%`
    )
  }

  const { data, error } = await query.limit(filters?.limit ?? 100)
  if (error) throw error
  return data ?? []
}

export async function getAuditTables() {
  return [
    "users",
    "patients",
    "suppliers",
    "products",
    "inventory",
    "cases",
    "case_reservations",
    "purchase_orders",
    "purchase_order_items",
    "notifications",
  ]
}
