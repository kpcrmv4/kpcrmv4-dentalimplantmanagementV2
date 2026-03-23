import Link from "next/link"
import {
  ClipboardList,
  Phone,
  CheckCircle2,
  TrendingUp,
} from "lucide-react"
import { getDashboardCases } from "@/lib/actions/dashboard"
import { cn } from "@/lib/utils"

export async function TrafficLightStats() {
  const now = new Date()
  const cases = await getDashboardCases(now.getFullYear(), now.getMonth() + 1)

  const total = cases.length
  const completed = cases.filter((c) => c.case_status === "completed").length
  const activeCases = cases.filter((c) => c.case_status !== "completed")
  const active = activeCases.length
  const pendingAppt = cases.filter(
    (c) => c.appointment_status === "pending" && c.case_status !== "completed"
  ).length

  // Material readiness
  const ready = activeCases.filter((c) => c.trafficLight === "green").length
  const ordered = activeCases.filter((c) => c.trafficLight === "yellow").length
  const pendingOrder = activeCases.filter((c) => c.case_status === "pending_order").length
  const pendingPrep = activeCases.filter((c) => c.case_status === "pending_preparation").length

  return (
    <div className="space-y-3">
      {/* Row 1: Key metrics in a single compact row */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Link href="/cases?period=month">
          <div className="group flex items-center gap-3 rounded-xl border bg-card p-3 transition-all hover:shadow-md">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-500/20">
              <ClipboardList className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-tight text-blue-700 dark:text-blue-400">{total}</p>
              <p className="text-[10px] text-muted-foreground">เคสทั้งหมด</p>
            </div>
          </div>
        </Link>

        <Link href="/cases?period=month&status=pending_order">
          <div className="group flex items-center gap-3 rounded-xl border bg-card p-3 transition-all hover:shadow-md">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-500/20">
              <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-tight text-indigo-700 dark:text-indigo-400">{active}</p>
              <p className="text-[10px] text-muted-foreground">ดำเนินการ</p>
            </div>
          </div>
        </Link>

        <Link href="/cases?period=month&appt=pending">
          <div className="group flex items-center gap-3 rounded-xl border bg-card p-3 transition-all hover:shadow-md">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/20">
              <Phone className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-tight text-amber-700 dark:text-amber-400">{pendingAppt}</p>
              <p className="text-[10px] text-muted-foreground">รอทำนัด</p>
            </div>
          </div>
        </Link>

        <Link href="/cases?period=month&status=completed">
          <div className="group flex items-center gap-3 rounded-xl border bg-card p-3 transition-all hover:shadow-md">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/20">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-tight text-emerald-700 dark:text-emerald-400">{completed}</p>
              <p className="text-[10px] text-muted-foreground">เสร็จสิ้น</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Row 2: Material status - single compact bar */}
      <div className="rounded-xl border bg-card p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          สถานะวัสดุ
        </p>

        {/* Progress bar */}
        {active > 0 && (
          <div className="mb-2.5 flex h-2 overflow-hidden rounded-full bg-muted">
            {ready > 0 && (
              <div
                className="bg-green-500 transition-all"
                style={{ width: `${(ready / active) * 100}%` }}
              />
            )}
            {ordered > 0 && (
              <div
                className="bg-yellow-500 transition-all"
                style={{ width: `${(ordered / active) * 100}%` }}
              />
            )}
            {pendingPrep > 0 && (
              <div
                className="bg-orange-400 transition-all"
                style={{ width: `${(pendingPrep / active) * 100}%` }}
              />
            )}
            {pendingOrder > 0 && (
              <div
                className="bg-red-400 transition-all"
                style={{ width: `${(pendingOrder / active) * 100}%` }}
              />
            )}
          </div>
        )}

        {/* Inline legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <StatusChip
            color="green"
            label="พร้อม"
            value={ready}
            href="/cases?period=month&status=ready"
          />
          <StatusChip
            color="yellow"
            label="สั่งแล้ว"
            value={ordered}
            href="/cases?period=month&material=ordered"
          />
          <StatusChip
            color="orange"
            label="รอจัดของ"
            value={pendingPrep}
            href="/cases?period=month&status=pending_preparation"
          />
          <StatusChip
            color="red"
            label="รอสั่งของ"
            value={pendingOrder}
            href="/cases?period=month&status=pending_order"
          />
        </div>
      </div>
    </div>
  )
}

function StatusChip({
  color,
  label,
  value,
  href,
}: {
  color: "green" | "yellow" | "orange" | "red"
  label: string
  value: number
  href: string
}) {
  const dotColor = {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    orange: "bg-orange-400",
    red: "bg-red-400",
  }[color]

  const textColor = {
    green: "text-green-700 dark:text-green-400",
    yellow: "text-yellow-700 dark:text-yellow-400",
    orange: "text-orange-700 dark:text-orange-400",
    red: "text-red-700 dark:text-red-400",
  }[color]

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-1 py-0.5 transition-colors hover:bg-muted",
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", dotColor)} />
      <span className={cn("text-sm font-bold tabular-nums", textColor)}>
        {value}
      </span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </Link>
  )
}
