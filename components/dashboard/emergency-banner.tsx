import Link from "next/link"
import { AlertTriangle, Clock } from "lucide-react"
import { getEmergencyAlerts } from "@/lib/actions/dashboard"
import { Badge } from "@/components/ui/badge"

const STATUS_LABELS: Record<string, string> = {
  pending_order: "รอสั่งของ",
  pending_preparation: "รอจัดของ",
  pending_appointment: "รอนัด",
}

export async function EmergencyBanner() {
  const alerts = await getEmergencyAlerts()

  if (alerts.length === 0) return null

  return (
    <div className="rounded-lg border-2 border-red-400 bg-red-50 p-4 dark:border-red-500/50 dark:bg-red-500/10">
      <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
        <AlertTriangle className="h-5 w-5 shrink-0 animate-pulse" />
        <span className="text-sm font-bold">
          Emergency — เคสด่วนภายใน 48 ชม. ที่วัสดุยังไม่พร้อม: {alerts.length} เคส
        </span>
      </div>
      <div className="mt-3 space-y-2 pl-7">
        {alerts.map((c) => {
          const timeLabel = c.scheduled_time
            ? `${c.scheduled_date} เวลา ${c.scheduled_time}`
            : c.scheduled_date ?? ""

          return (
            <Link
              key={c.id}
              href={`/cases/${c.id}`}
              className="flex flex-col gap-1 rounded-md border border-red-200 bg-white/70 p-2.5 transition-colors hover:bg-red-100/50 dark:border-red-500/30 dark:bg-red-900/10 dark:hover:bg-red-900/20 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <span className="text-sm font-semibold text-red-700 dark:text-red-400">
                  {c.case_number}
                </span>
                <span className="mx-1.5 text-red-400">—</span>
                <span className="text-sm text-red-600 dark:text-red-300">
                  {c.patient_name}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="border-red-300 bg-red-100 text-[10px] text-red-700 dark:border-red-500/40 dark:bg-red-900/30 dark:text-red-300">
                  {STATUS_LABELS[c.case_status] ?? c.case_status}
                </Badge>
                <span className="flex items-center gap-0.5 text-[11px] text-red-500 dark:text-red-400">
                  <Clock className="h-3 w-3" />
                  {timeLabel}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
