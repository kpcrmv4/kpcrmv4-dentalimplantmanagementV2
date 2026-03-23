import Link from "next/link"
import { AlertTriangle, Clock, AlertCircle } from "lucide-react"
import { getEmergencyAlerts } from "@/lib/actions/dashboard"
import { Badge } from "@/components/ui/badge"
import { formatDate, formatDateTime } from "@/lib/utils"

const STATUS_LABELS: Record<string, string> = {
  pending_order: "รอสั่งของ",
  pending_preparation: "รอจัดของ",
  pending_appointment: "รอทำนัด",
}

export async function EmergencyBanner({ dentistId }: { dentistId?: string } = {}) {
  const alerts = await getEmergencyAlerts(dentistId)

  if (alerts.length === 0) return null

  const overdue = alerts.filter((a) => a.isOverdue)
  const upcoming = alerts.filter((a) => !a.isOverdue)

  return (
    <div className="space-y-2">
      {/* Overdue cases */}
      {overdue.length > 0 && (
        <div className="rounded-lg border-2 border-orange-400 bg-orange-50 p-4 dark:border-orange-500/50 dark:bg-orange-500/10">
          <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span className="text-sm font-bold">
              เลยนัดแล้ว — วัสดุยังไม่พร้อม: {overdue.length} เคส
            </span>
          </div>
          <div className="mt-3 space-y-2 pl-7">
            {overdue.map((c) => (
              <CaseRow key={c.id} alert={c} variant="overdue" />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming urgent cases */}
      {upcoming.length > 0 && (
        <div className="rounded-lg border-2 border-red-400 bg-red-50 p-4 dark:border-red-500/50 dark:bg-red-500/10">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertTriangle className="h-5 w-5 shrink-0 animate-pulse" />
            <span className="text-sm font-bold">
              Emergency — เคสด่วนภายใน 48 ชม. ที่วัสดุยังไม่พร้อม: {upcoming.length} เคส
            </span>
          </div>
          <div className="mt-3 space-y-2 pl-7">
            {upcoming.map((c) => (
              <CaseRow key={c.id} alert={c} variant="urgent" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CaseRow({
  alert: c,
  variant,
}: {
  alert: Awaited<ReturnType<typeof getEmergencyAlerts>>[number]
  variant: "overdue" | "urgent"
}) {
  const timeLabel = c.scheduled_date
    ? c.scheduled_time
      ? formatDateTime(`${c.scheduled_date}T${c.scheduled_time}`)
      : formatDate(c.scheduled_date)
    : ""

  const isOverdue = variant === "overdue"
  const borderColor = isOverdue
    ? "border-orange-200 dark:border-orange-500/30"
    : "border-red-200 dark:border-red-500/30"
  const bgHover = isOverdue
    ? "hover:bg-orange-100/50 dark:hover:bg-orange-900/20"
    : "hover:bg-red-100/50 dark:hover:bg-red-900/20"
  const textColor = isOverdue
    ? "text-orange-700 dark:text-orange-400"
    : "text-red-700 dark:text-red-400"
  const subTextColor = isOverdue
    ? "text-orange-600 dark:text-orange-300"
    : "text-red-600 dark:text-red-300"
  const badgeClass = isOverdue
    ? "border-orange-300 bg-orange-100 text-orange-700 dark:border-orange-500/40 dark:bg-orange-900/30 dark:text-orange-300"
    : "border-red-300 bg-red-100 text-red-700 dark:border-red-500/40 dark:bg-red-900/30 dark:text-red-300"
  const timeColor = isOverdue
    ? "text-orange-500 dark:text-orange-400"
    : "text-red-500 dark:text-red-400"

  return (
    <Link
      href={`/cases/${c.id}`}
      className={`flex flex-col gap-1 rounded-md border bg-white/70 p-2.5 transition-colors dark:bg-red-900/10 sm:flex-row sm:items-center sm:justify-between ${borderColor} ${bgHover}`}
    >
      <div className="min-w-0">
        <span className={`text-sm font-semibold ${textColor}`}>
          {c.case_number}
        </span>
        <span className="mx-1.5 text-red-400">—</span>
        <span className={`text-sm ${subTextColor}`}>
          {c.patient_name}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {isOverdue && (
          <Badge variant="outline" className="border-orange-400 bg-orange-200 text-[10px] text-orange-800 dark:border-orange-500/40 dark:bg-orange-900/50 dark:text-orange-300">
            เลยนัด
          </Badge>
        )}
        <Badge variant="outline" className={`text-[10px] ${badgeClass}`}>
          {STATUS_LABELS[c.case_status] ?? c.case_status}
        </Badge>
        <span className={`flex items-center gap-0.5 text-[11px] ${timeColor}`}>
          <Clock className="h-3 w-3" />
          {timeLabel}
        </span>
      </div>
    </Link>
  )
}
