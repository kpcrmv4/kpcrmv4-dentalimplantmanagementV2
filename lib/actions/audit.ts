"use server"

import { createClient } from "@/lib/supabase/server"

export async function getAuditLogs(filters?: {
  table_name?: string
  action?: string
  search?: string
  limit?: number
}) {
  const supabase = await createClient()

  // Build filter conditions for RPC/raw query
  // PostgREST FK joins don't work reliably on partitioned tables,
  // so we fetch audit_logs first, then resolve performer names separately.
  let query = supabase
    .from("audit_logs")
    .select("*")
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
  if (!data || data.length === 0) return []

  // Resolve performer names in a separate query
  const performerIds = Array.from(
    new Set(
      data
        .map((log) => log.performed_by)
        .filter((id): id is string => id != null)
    )
  )

  let performerMap: Record<string, string> = {}
  if (performerIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, full_name")
      .in("id", performerIds)

    performerMap = Object.fromEntries(
      (users ?? []).map((u) => [u.id, u.full_name])
    )
  }

  return data.map((log) => ({
    ...log,
    performer: log.performed_by
      ? { full_name: performerMap[log.performed_by] ?? null }
      : null,
  }))
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
