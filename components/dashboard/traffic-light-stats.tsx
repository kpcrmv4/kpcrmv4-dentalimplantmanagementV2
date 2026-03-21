import {
  ClipboardList,
  Layers,
  Phone,
  Settings,
  CheckCircle2,
  Package,
} from "lucide-react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { getDashboardCases } from "@/lib/actions/dashboard"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

export async function TrafficLightStats() {
  const now = new Date()
  const cases = await getDashboardCases(now.getFullYear(), now.getMonth() + 1)

  const total = cases.length
  const completed = cases.filter((c) => c.case_status === "completed").length
  const active = total - completed
  const pendingAppt = cases.filter((c) => c.appointment_status === "pending" && c.case_status !== "completed").length

  // Material readiness (traffic light) — only for non-completed cases
  const activeCases = cases.filter((c) => c.case_status !== "completed")
  const ready = activeCases.filter((c) => c.trafficLight === "green").length
  const ordered = activeCases.filter((c) => c.trafficLight === "yellow").length
  const waiting = activeCases.filter((c) => c.trafficLight === "orange").length
  const missing = activeCases.filter((c) => c.trafficLight === "red").length

  // Case status breakdown
  const pendingOrder = activeCases.filter((c) => c.case_status === "pending_order").length
  const pendingPrep = activeCases.filter((c) => c.case_status === "pending_preparation").length

  return (
    <div className="space-y-4">
      {/* ── Section 1: Case Summary ── */}
      <div>
        <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <ClipboardList className="h-3.5 w-3.5" />
          สรุปเคสเดือนนี้
        </h2>
        <div className="grid grid-cols-4 gap-2">
          <SummaryCard
            label="ทั้งหมด"
            value={total}
            icon={Layers}
            color="blue"
            href="/cases?period=month"
          />
          <SummaryCard
            label="รอยืนยันนัด"
            value={pendingAppt}
            icon={Phone}
            color="amber"
            href="/cases?period=month&appt=pending"
          />
          <SummaryCard
            label="ดำเนินการ"
            value={active}
            icon={Settings}
            color="indigo"
            href="/cases?period=month&status=pending_order"
          />
          <SummaryCard
            label="เสร็จสิ้น"
            value={completed}
            icon={CheckCircle2}
            color="emerald"
            href="/cases?period=month&status=completed"
          />
        </div>
      </div>

      {/* ── Section 2: Material Readiness ── */}
      <div>
        <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Package className="h-3.5 w-3.5" />
          สถานะวัสดุเคส
        </h2>
        <div className="grid grid-cols-4 gap-2">
          <MaterialCard label="พร้อม" value={ready} color="green" href="/cases?period=month&status=ready" />
          <MaterialCard label="สั่งแล้ว" value={ordered} color="yellow" href="/cases?period=month&material=ordered" />
          <MaterialCard label="รอสั่ง" value={waiting} color="orange" href="/cases?period=month&material=waiting" />
          <MaterialCard label="ยังไม่สั่ง" value={missing} color="red" href="/cases?period=month&material=missing" />
        </div>
        {/* Case status breakdown */}
        <div className="mt-2 grid grid-cols-3 gap-2">
          <MaterialCard label="รอสั่งของ" value={pendingOrder} color="orange" href="/cases?period=month&status=pending_order" />
          <MaterialCard label="รอจัดของ" value={pendingPrep} color="yellow" href="/cases?period=month&status=pending_preparation" />
          <MaterialCard label="พร้อม" value={ready} color="green" href="/cases?period=month&status=ready" />
        </div>
      </div>
    </div>
  )
}

const SUMMARY_STYLES = {
  blue: {
    border: "border-blue-200 dark:border-blue-500/30",
    bg: "bg-blue-50/50 dark:bg-blue-500/10",
    text: "text-blue-700 dark:text-blue-400",
    label: "text-blue-600/80 dark:text-blue-400/80",
    icon: "text-blue-200 dark:text-blue-500/20",
  },
  amber: {
    border: "border-amber-200 dark:border-amber-500/30",
    bg: "bg-amber-50/50 dark:bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-400",
    label: "text-amber-600/80 dark:text-amber-400/80",
    icon: "text-amber-200 dark:text-amber-500/20",
  },
  indigo: {
    border: "border-indigo-200 dark:border-indigo-500/30",
    bg: "bg-indigo-50/50 dark:bg-indigo-500/10",
    text: "text-indigo-700 dark:text-indigo-400",
    label: "text-indigo-600/80 dark:text-indigo-400/80",
    icon: "text-indigo-200 dark:text-indigo-500/20",
  },
  emerald: {
    border: "border-emerald-200 dark:border-emerald-500/30",
    bg: "bg-emerald-50/50 dark:bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-400",
    label: "text-emerald-600/80 dark:text-emerald-400/80",
    icon: "text-emerald-200 dark:text-emerald-500/20",
  },
} as const

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
  href,
}: {
  label: string
  value: number
  icon: LucideIcon
  color: keyof typeof SUMMARY_STYLES
  href?: string
}) {
  const s = SUMMARY_STYLES[color]
  const content = (
    <Card className={cn(s.border, s.bg, "relative overflow-hidden", href && "cursor-pointer transition-shadow hover:shadow-md")}>
      <CardContent className="relative flex flex-col items-center py-3">
        <Icon className={cn("absolute right-1 top-1 h-3.5 w-3.5 pointer-events-none", s.icon)} strokeWidth={2} />
        <span className={cn("relative text-2xl font-bold", s.text)}>{value}</span>
        <span className={cn("relative mt-0.5 text-[10px] font-medium leading-tight text-center", s.label)}>{label}</span>
      </CardContent>
    </Card>
  )
  if (href) return <Link href={href}>{content}</Link>
  return content
}

function MaterialCard({
  label,
  value,
  color,
  href,
}: {
  label: string
  value: number
  color: "green" | "yellow" | "orange" | "red"
  href?: string
}) {
  const styles = {
    green: {
      dot: "bg-green-500",
      text: "text-green-700 dark:text-green-400",
    },
    yellow: {
      dot: "bg-yellow-500",
      text: "text-yellow-700 dark:text-yellow-400",
    },
    orange: {
      dot: "bg-orange-500",
      text: "text-orange-700 dark:text-orange-400",
    },
    red: {
      dot: "bg-red-500",
      text: "text-red-700 dark:text-red-400",
    },
  }

  const s = styles[color]

  const content = (
    <Card className={cn("bg-card", href && "cursor-pointer transition-shadow hover:shadow-md")}>
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
  if (href) return <Link href={href}>{content}</Link>
  return content
}
