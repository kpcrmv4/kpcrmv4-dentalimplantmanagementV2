import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Plus, ClipboardList, Calendar as CalendarIcon, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import { CaseSearch } from "./case-search"
import type { CaseStatus } from "@/types/database"
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  format,
  parseISO,
  isToday as isTodayFn,
  isTomorrow as isTomorrowFn,
} from "date-fns"
import { th } from "date-fns/locale"

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  pending_appointment: {
    label: "รอทำนัด",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400",
    dot: "bg-purple-500",
  },
  pending_order: {
    label: "รอสั่งของ",
    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400",
    dot: "bg-yellow-500",
  },
  pending_preparation: {
    label: "รอจัดของ",
    color: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400",
    dot: "bg-orange-500",
  },
  ready: {
    label: "พร้อม",
    color: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
    dot: "bg-green-500",
  },
  completed: {
    label: "เสร็จสิ้น",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  cancelled: {
    label: "ยกเลิก",
    color: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
    dot: "bg-red-500",
  },
}

function getDateRange(
  period: string,
  customDate?: string
): { from: string; to: string } | null {
  const now = new Date()

  switch (period) {
    case "today":
      return {
        from: format(startOfDay(now), "yyyy-MM-dd"),
        to: format(endOfDay(now), "yyyy-MM-dd"),
      }
    case "week":
      return {
        from: format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
        to: format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      }
    case "month":
      return {
        from: format(startOfMonth(now), "yyyy-MM-dd"),
        to: format(endOfMonth(now), "yyyy-MM-dd"),
      }
    case "year":
      return {
        from: format(startOfYear(now), "yyyy-MM-dd"),
        to: format(endOfYear(now), "yyyy-MM-dd"),
      }
    case "custom":
      if (customDate) {
        const d = parseISO(customDate)
        return {
          from: format(startOfDay(d), "yyyy-MM-dd"),
          to: format(endOfDay(d), "yyyy-MM-dd"),
        }
      }
      return null
    case "all":
      return null
    default:
      return {
        from: format(startOfDay(now), "yyyy-MM-dd"),
        to: format(endOfDay(now), "yyyy-MM-dd"),
      }
  }
}

async function getCases(
  search?: string,
  status?: string,
  period?: string,
  customDate?: string,
  appt?: string
) {
  const supabase = await createClient()
  let query = supabase
    .from("cases")
    .select("*, patients(hn, full_name), users!cases_dentist_id_fkey(full_name)")
    .limit(100)

  if (status && status !== "all") {
    query = query.eq("case_status", status as CaseStatus)
  }
  if (appt && appt !== "all") {
    query = query.eq("appointment_status", appt as "pending" | "confirmed" | "postponed" | "cancelled")
  }
  if (search) {
    query = query.or(`case_number.ilike.%${search}%`)
  }

  // Apply date range filter
  const range = getDateRange(period ?? "today", customDate)
  if (range) {
    query = query.gte("scheduled_date", range.from).lte("scheduled_date", range.to)
  }

  // Sort by scheduled_date ASC (nearest first), then scheduled_time ASC
  query = query
    .order("scheduled_date", { ascending: true, nullsFirst: false })
    .order("scheduled_time", { ascending: true, nullsFirst: false })

  const { data, error } = await query
  if (error) return []
  return data ?? []
}

function getRelativeDateLabel(dateStr: string): string {
  const d = parseISO(dateStr)
  if (isTodayFn(d)) return "วันนี้"
  if (isTomorrowFn(d)) return "พรุ่งนี้"
  return format(d, "EEEE d MMM", { locale: th })
}

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    status?: string
    period?: string
    date?: string
    view?: string
    appt?: string
  }>
}) {
  const params = await searchParams
  const currentPeriod = params.period ?? "today"
  const currentView = params.view ?? "timeline"
  const cases = await getCases(params.q, params.status, currentPeriod, params.date, params.appt)

  // Group cases by scheduled_date for timeline view
  const groupedCases: Record<string, typeof cases> = {}
  for (const c of cases) {
    const key = (c.scheduled_date as string) ?? "no_date"
    if (!groupedCases[key]) groupedCases[key] = []
    groupedCases[key].push(c)
  }
  const sortedDateKeys = Object.keys(groupedCases).sort((a, b) => {
    if (a === "no_date") return 1
    if (b === "no_date") return -1
    return a.localeCompare(b)
  })

  // Count active (non-completed, non-cancelled)
  const activeCount = cases.filter(
    (c) =>
      !["completed", "cancelled"].includes(c.case_status as string)
  ).length

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">รายการเคส</h1>
          <p className="text-sm text-muted-foreground">
            {cases.length} เคส{activeCount !== cases.length ? ` (${activeCount} ดำเนินการ)` : ""}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/cases/new">
            <Plus className="mr-1 h-4 w-4" />
            สร้างเคส
          </Link>
        </Button>
      </div>

      {/* Search + Filters */}
      <CaseSearch
        defaultSearch={params.q}
        defaultStatus={params.status}
        defaultPeriod={currentPeriod}
        defaultDate={params.date}
        defaultView={currentView}
        defaultAppt={params.appt}
      />

      {/* Case List */}
      {cases.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <ClipboardList className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {params.q || params.status
              ? "ไม่พบเคสที่ค้นหา"
              : currentPeriod === "today"
                ? "ไม่มีเคสวันนี้"
                : "ไม่มีเคสในช่วงเวลานี้"}
          </p>
        </div>
      ) : currentView === "timeline" ? (
        /* ========== Timeline View ========== */
        <div className="space-y-4">
          {sortedDateKeys.map((dateKey) => {
            const dateCases = groupedCases[dateKey]
            const dateLabel =
              dateKey === "no_date"
                ? "ยังไม่กำหนดวัน"
                : getRelativeDateLabel(dateKey)

            return (
              <div key={dateKey}>
                {/* Date header */}
                <div className="mb-2 flex items-center gap-2">
                  <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {dateLabel}
                  </span>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {dateCases.length}
                  </span>
                </div>

                {/* Timeline items */}
                <div className="relative ml-4 border-l-2 border-muted pl-4">
                  {dateCases.map((c: Record<string, unknown>) => {
                    const patient = c.patients as Record<string, string> | null
                    const dentist = c.users as Record<string, string> | null
                    const st =
                      STATUS_CONFIG[c.case_status as string] ??
                      STATUS_CONFIG.pending_order
                    const time = c.scheduled_time as string | null

                    return (
                      <Link key={c.id as string} href={`/cases/${c.id}`}>
                        <div className="group relative pb-4 last:pb-0">
                          {/* Timeline dot */}
                          <div
                            className={`absolute -left-[calc(1rem+5px)] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-background ${st.dot}`}
                          />

                          <div className="rounded-lg border bg-card p-3 transition-colors group-hover:bg-muted/50">
                            {/* Time + Status row */}
                            <div className="flex items-center gap-2">
                              {time && (
                                <span className="text-sm font-bold tabular-nums">
                                  {time.slice(0, 5)}
                                </span>
                              )}
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${st.color}`}
                              >
                                {st.label}
                              </span>
                            </div>

                            {/* Case info */}
                            <div className="mt-1.5 flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-foreground">
                                  {c.case_number as string}
                                </p>
                                <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                  <User className="h-3 w-3 shrink-0" />
                                  <span className="truncate">
                                    {String(patient?.full_name ?? "ไม่ระบุ")}
                                  </span>
                                  <span>({String(patient?.hn ?? "-")})</span>
                                </div>
                                {dentist?.full_name && (
                                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                                    ทพ. {dentist.full_name}
                                  </p>
                                )}
                                {c.procedure_type ? (
                                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                                    {String(c.procedure_type)}
                                  </p>
                                ) : null}
                              </div>
                              {(c.tooth_positions as number[])?.length > 0 && (
                                <div className="flex flex-wrap gap-0.5">
                                  {(c.tooth_positions as number[])
                                    .slice(0, 3)
                                    .map((t) => (
                                      <Badge
                                        key={t}
                                        variant="outline"
                                        className="px-1 py-0 text-[10px]"
                                      >
                                        {t}
                                      </Badge>
                                    ))}
                                  {(c.tooth_positions as number[]).length > 3 && (
                                    <Badge
                                      variant="outline"
                                      className="px-1 py-0 text-[10px]"
                                    >
                                      +{(c.tooth_positions as number[]).length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ========== List View ========== */
        <div className="space-y-4">
          {sortedDateKeys.map((dateKey) => {
            const dateCases = groupedCases[dateKey]
            const dateLabel =
              dateKey === "no_date"
                ? "ยังไม่กำหนดวัน"
                : getRelativeDateLabel(dateKey)

            return (
              <div key={dateKey}>
                {/* Date header */}
                <div className="mb-2 flex items-center gap-2">
                  <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {dateLabel}
                  </span>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {dateCases.length}
                  </span>
                </div>

                {/* List items */}
                <div className="space-y-1.5">
                  {dateCases.map((c: Record<string, unknown>) => {
                    const patient = c.patients as Record<string, string> | null
                    const dentist = c.users as Record<string, string> | null
                    const st =
                      STATUS_CONFIG[c.case_status as string] ??
                      STATUS_CONFIG.pending_order
                    const time = c.scheduled_time as string | null

                    return (
                      <Link key={c.id as string} href={`/cases/${c.id}`}>
                        <div className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50">
                          {/* Status dot + Time */}
                          <div className="flex w-14 shrink-0 flex-col items-center">
                            {time ? (
                              <>
                                <span className="text-sm font-bold tabular-nums leading-tight">
                                  {time.slice(0, 5)}
                                </span>
                                <span
                                  className={`mt-0.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium ${st.color}`}
                                >
                                  {st.label}
                                </span>
                              </>
                            ) : (
                              <>
                                <div className={`h-2.5 w-2.5 rounded-full ${st.dot}`} />
                                <span className="mt-0.5 text-[9px] font-medium text-muted-foreground">
                                  {st.label}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Main content */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-semibold">
                                {c.case_number as string}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {String(patient?.full_name ?? "ไม่ระบุคนไข้")} ({String(patient?.hn ?? "-")})
                            </p>
                            {dentist?.full_name && (
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                ทพ. {dentist.full_name}
                              </p>
                            )}
                          </div>

                          {/* Right side: tooth positions */}
                          {(c.tooth_positions as number[])?.length > 0 && (
                            <div className="flex shrink-0 flex-wrap gap-0.5">
                              {(c.tooth_positions as number[]).slice(0, 3).map((t) => (
                                <Badge
                                  key={t}
                                  variant="outline"
                                  className="px-1 py-0 text-[10px]"
                                >
                                  {t}
                                </Badge>
                              ))}
                              {(c.tooth_positions as number[]).length > 3 && (
                                <Badge
                                  variant="outline"
                                  className="px-1 py-0 text-[10px]"
                                >
                                  +{(c.tooth_positions as number[]).length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
