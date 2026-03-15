"use client"

import Link from "next/link"
import { ClipboardList } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn, formatDate } from "@/lib/utils"
import type { DashboardCase, TrafficLight } from "@/lib/actions/dashboard"

const STATUS_LABELS: Record<string, string> = {
  pending_appointment: "รอทำนัด",
  pending_order: "รอสั่งของ",
  pending_preparation: "รอจัดของ",
  ready: "พร้อม",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
  case_assigned: "มอบหมายแล้ว",
  po_created: "สร้าง PO แล้ว",
  po_approved: "PO อนุมัติ",
}

const TRAFFIC_BADGE: Record<TrafficLight, string> = {
  green: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
  yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400",
  red: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
  neutral: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400",
}

export function DayCaseList({
  cases,
  selectedDate,
}: {
  cases: DashboardCase[]
  selectedDate: Date | null
}) {
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

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-muted-foreground">
        {formatDate(selectedDate)} ({cases.length} เคส)
      </h3>
      {cases.map((c) => (
        <Link key={c.id} href={`/cases/${c.id}`}>
          <div className="rounded-lg border p-2.5 transition-colors hover:bg-muted/50">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium">{c.case_number}</span>
                  <span
                    className={cn(
                      "inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                      TRAFFIC_BADGE[c.trafficLight]
                    )}
                  >
                    {STATUS_LABELS[c.case_status] ?? c.case_status}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {c.patient_name} ({c.patient_hn})
                </p>
                {c.scheduled_time && (
                  <p className="text-[11px] text-muted-foreground">
                    เวลา {c.scheduled_time}
                  </p>
                )}
                {c.procedure_type && (
                  <p className="text-[11px] text-muted-foreground">
                    {c.procedure_type}
                  </p>
                )}
              </div>
              {c.tooth_positions && c.tooth_positions.length > 0 && (
                <div className="flex flex-wrap gap-0.5">
                  {c.tooth_positions.slice(0, 3).map((t) => (
                    <Badge key={t} variant="outline" className="text-[10px] px-1 py-0">
                      {t}
                    </Badge>
                  ))}
                  {c.tooth_positions.length > 3 && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      +{c.tooth_positions.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
