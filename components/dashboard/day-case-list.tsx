"use client"

import { useState } from "react"
import Link from "next/link"
import { ClipboardList, List, Clock, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn, formatDate } from "@/lib/utils"
import type { DashboardCase, TrafficLight } from "@/lib/actions/dashboard"

const STATUS_LABELS: Record<string, string> = {
  pending_order: "รอสั่งของ",
  pending_preparation: "รอจัดของ",
  ready: "พร้อม",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
}

const TRAFFIC_BADGE: Record<TrafficLight, string> = {
  green: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
  yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400",
  red: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
  neutral: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400",
}

const TRAFFIC_DOT: Record<TrafficLight, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
  neutral: "bg-gray-400",
}

export function DayCaseList({
  cases,
  selectedDate,
}: {
  cases: DashboardCase[]
  selectedDate: Date | null
}) {
  const [view, setView] = useState<"timeline" | "list">("timeline")

  if (!selectedDate) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <ClipboardList className="mb-2 h-8 w-8" />
        <p className="text-xs">เลือกวันที่เพื่อดูเคส</p>
      </div>
    )
  }

  if (cases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <ClipboardList className="mb-2 h-8 w-8" />
        <p className="text-xs">ไม่มีเคสในวันนี้</p>
      </div>
    )
  }

  // Sort by scheduled_time (nearest first)
  const sorted = [...cases].sort((a, b) => {
    if (!a.scheduled_time && !b.scheduled_time) return 0
    if (!a.scheduled_time) return 1
    if (!b.scheduled_time) return -1
    return a.scheduled_time.localeCompare(b.scheduled_time)
  })

  return (
    <div className="space-y-2">
      {/* Header with view toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-muted-foreground">
          {formatDate(selectedDate)} ({cases.length} เคส)
        </h3>
        <div className="flex rounded-md border bg-muted p-0.5">
          <Button
            variant={view === "timeline" ? "default" : "ghost"}
            size="icon"
            className="h-5 w-5"
            onClick={() => setView("timeline")}
            title="ไทม์ไลน์"
          >
            <Clock className="h-3 w-3" />
          </Button>
          <Button
            variant={view === "list" ? "default" : "ghost"}
            size="icon"
            className="h-5 w-5"
            onClick={() => setView("list")}
            title="รายการ"
          >
            <List className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {view === "timeline" ? (
        /* ========== Timeline View ========== */
        <div className="relative ml-3 border-l-2 border-muted pl-3">
          {sorted.map((c) => (
            <Link key={c.id} href={`/cases/${c.id}`}>
              <div className="group relative pb-3 last:pb-0">
                {/* Timeline dot */}
                <div
                  className={cn(
                    "absolute -left-[calc(0.75rem+5px)] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-background",
                    TRAFFIC_DOT[c.trafficLight]
                  )}
                />

                <div className="rounded-lg border bg-card p-2.5 transition-colors group-hover:bg-muted/50">
                  {/* Time + Status */}
                  <div className="flex items-center gap-1.5">
                    {c.scheduled_time && (
                      <span className="text-sm font-bold tabular-nums leading-tight">
                        {c.scheduled_time.slice(0, 5)}
                      </span>
                    )}
                    <span
                      className={cn(
                        "inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                        TRAFFIC_BADGE[c.trafficLight]
                      )}
                    >
                      {STATUS_LABELS[c.case_status] ?? c.case_status}
                    </span>
                  </div>

                  {/* Case info */}
                  <div className="mt-1 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium">{c.case_number}</p>
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <User className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">{c.patient_name}</span>
                        <span>({c.patient_hn})</span>
                      </div>
                      {c.procedure_type && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {c.procedure_type}
                        </p>
                      )}
                    </div>
                    {c.tooth_positions && c.tooth_positions.length > 0 && (
                      <div className="flex flex-wrap gap-0.5">
                        {c.tooth_positions.slice(0, 3).map((t) => (
                          <Badge key={t} variant="outline" className="px-1 py-0 text-[10px]">
                            {t}
                          </Badge>
                        ))}
                        {c.tooth_positions.length > 3 && (
                          <Badge variant="outline" className="px-1 py-0 text-[10px]">
                            +{c.tooth_positions.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        /* ========== List View ========== */
        <div className="space-y-1.5">
          {sorted.map((c) => (
            <Link key={c.id} href={`/cases/${c.id}`}>
              <div className="flex items-center gap-2.5 rounded-lg border p-2.5 transition-colors hover:bg-muted/50">
                {/* Time / Status dot */}
                <div className="flex w-12 shrink-0 flex-col items-center">
                  {c.scheduled_time ? (
                    <>
                      <span className="text-xs font-bold tabular-nums leading-tight">
                        {c.scheduled_time.slice(0, 5)}
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 inline-flex rounded-full px-1 py-0.5 text-[9px] font-medium",
                          TRAFFIC_BADGE[c.trafficLight]
                        )}
                      >
                        {STATUS_LABELS[c.case_status] ?? c.case_status}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className={cn("h-2 w-2 rounded-full", TRAFFIC_DOT[c.trafficLight])} />
                      <span className="mt-0.5 text-[9px] font-medium text-muted-foreground">
                        {STATUS_LABELS[c.case_status] ?? c.case_status}
                      </span>
                    </>
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-medium">{c.case_number}</span>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {c.patient_name} ({c.patient_hn})
                  </p>
                </div>

                {/* Teeth */}
                {c.tooth_positions && c.tooth_positions.length > 0 && (
                  <div className="flex shrink-0 flex-wrap gap-0.5">
                    {c.tooth_positions.slice(0, 2).map((t) => (
                      <Badge key={t} variant="outline" className="px-1 py-0 text-[10px]">
                        {t}
                      </Badge>
                    ))}
                    {c.tooth_positions.length > 2 && (
                      <Badge variant="outline" className="px-1 py-0 text-[10px]">
                        +{c.tooth_positions.length - 2}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
