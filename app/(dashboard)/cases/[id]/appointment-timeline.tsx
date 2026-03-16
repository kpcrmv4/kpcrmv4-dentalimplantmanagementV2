import { getAppointmentLogs } from "@/lib/actions/appointments"
import { formatDate } from "@/lib/utils"
import { Check, CalendarClock, Ban, Clock } from "lucide-react"

const ACTION_CONFIG: Record<
  string,
  {
    label: string
    icon: typeof Check
    dotColor: string
  }
> = {
  pending: {
    label: "สร้างเคส",
    icon: Clock,
    dotColor: "bg-gray-400",
  },
  confirmed: {
    label: "ยืนยันนัดหมาย",
    icon: Check,
    dotColor: "bg-green-500",
  },
  postponed: {
    label: "เลื่อนนัด",
    icon: CalendarClock,
    dotColor: "bg-orange-500",
  },
  cancelled: {
    label: "ยกเลิกนัด",
    icon: Ban,
    dotColor: "bg-red-500",
  },
}

function formatDateTime(isoStr: string): string {
  const d = new Date(isoStr)
  return `${formatDate(d)} ${d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`
}

export async function AppointmentTimeline({
  caseId,
}: {
  caseId: string
}) {
  const logs = await getAppointmentLogs(caseId)

  if (logs.length === 0) return null

  return (
    <div className="rounded-xl border bg-card p-3">
      <h2 className="text-sm font-semibold mb-2">ประวัตินัดหมาย</h2>
      <div className="relative ml-2 border-l-2 border-muted pl-4 space-y-3">
        {logs.map((log) => {
          const config = ACTION_CONFIG[log.action] ?? ACTION_CONFIG.pending
          const Icon = config.icon
          const performer = log.users as Record<string, unknown> | null

          return (
            <div key={log.id} className="relative">
              {/* Timeline dot */}
              <div
                className={`absolute -left-[calc(1rem+5px)] top-0.5 flex h-4 w-4 items-center justify-center rounded-full ${config.dotColor}`}
              >
                <Icon className="h-2.5 w-2.5 text-white" />
              </div>

              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-medium">{config.label}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDateTime(log.performed_at)}
                  </span>
                </div>

                {log.note && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    &ldquo;{log.note}&rdquo;
                  </p>
                )}

                {log.action === "postponed" && log.old_date && log.new_date && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {formatDate(log.old_date)} → {formatDate(log.new_date)}
                  </p>
                )}

                {performer?.full_name && (
                  <p className="text-[10px] text-muted-foreground">
                    — {String(performer.full_name)}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
