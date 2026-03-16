import {
  ClipboardList,
  CheckCircle2,
  Clock,
  Package,
  AlertTriangle,
  CalendarCheck,
  Ban,
  TrendingUp,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { getDashboardCases } from "@/lib/actions/dashboard"
import { cn } from "@/lib/utils"

export async function TrafficLightStats() {
  const now = new Date()
  const cases = await getDashboardCases(now.getFullYear(), now.getMonth() + 1)

  const total = cases.length
  const completed = cases.filter((c) => c.case_status === "completed").length
  const active = total - completed

  // Material readiness (traffic light) — only for non-completed cases
  const activeCases = cases.filter((c) => c.case_status !== "completed")
  const ready = activeCases.filter((c) => c.trafficLight === "green").length
  const ordered = activeCases.filter((c) => c.trafficLight === "yellow").length
  const waiting = activeCases.filter((c) => c.trafficLight === "orange").length
  const missing = activeCases.filter((c) => c.trafficLight === "red").length

  return (
    <div className="space-y-4">
      {/* ── Section 1: Case Summary ── */}
      <div>
        <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <ClipboardList className="h-3.5 w-3.5" />
          สรุปเคสเดือนนี้
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-500/30 dark:bg-blue-500/10">
            <CardContent className="flex flex-col items-center py-3">
              <span className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {total}
              </span>
              <span className="mt-0.5 text-[11px] font-medium text-blue-600/80 dark:text-blue-400/80">
                ทั้งหมด
              </span>
            </CardContent>
          </Card>
          <Card className="border-indigo-200 bg-indigo-50/50 dark:border-indigo-500/30 dark:bg-indigo-500/10">
            <CardContent className="flex flex-col items-center py-3">
              <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">
                {active}
              </span>
              <span className="mt-0.5 text-[11px] font-medium text-indigo-600/80 dark:text-indigo-400/80">
                ดำเนินการ
              </span>
            </CardContent>
          </Card>
          <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-500/10">
            <CardContent className="flex flex-col items-center py-3">
              <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {completed}
              </span>
              <span className="mt-0.5 text-[11px] font-medium text-emerald-600/80 dark:text-emerald-400/80">
                เสร็จสิ้น
              </span>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Section 2: Material Readiness ── */}
      <div>
        <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Package className="h-3.5 w-3.5" />
          สถานะวัสดุเคส
        </h2>
        <div className="grid grid-cols-4 gap-2">
          <MaterialCard
            label="พร้อม"
            value={ready}
            color="green"
          />
          <MaterialCard
            label="สั่งแล้ว"
            value={ordered}
            color="yellow"
          />
          <MaterialCard
            label="รอสั่ง"
            value={waiting}
            color="orange"
          />
          <MaterialCard
            label="ยังไม่สั่ง"
            value={missing}
            color="red"
          />
        </div>
      </div>
    </div>
  )
}

function MaterialCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: "green" | "yellow" | "orange" | "red"
}) {
  const styles = {
    green: {
      dot: "bg-green-500",
      text: "text-green-700 dark:text-green-400",
      bg: "bg-card",
    },
    yellow: {
      dot: "bg-yellow-500",
      text: "text-yellow-700 dark:text-yellow-400",
      bg: "bg-card",
    },
    orange: {
      dot: "bg-orange-500",
      text: "text-orange-700 dark:text-orange-400",
      bg: "bg-card",
    },
    red: {
      dot: "bg-red-500",
      text: "text-red-700 dark:text-red-400",
      bg: "bg-card",
    },
  }

  const s = styles[color]

  return (
    <Card className={s.bg}>
      <CardContent className="flex flex-col items-center py-2.5">
        <div className="flex items-center gap-1.5">
          <span className={cn("h-2 w-2 rounded-full", s.dot)} />
          <span className={cn("text-xl font-bold", s.text)}>{value}</span>
        </div>
        <span className="mt-0.5 text-[10px] font-medium text-muted-foreground">
          {label}
        </span>
      </CardContent>
    </Card>
  )
}
