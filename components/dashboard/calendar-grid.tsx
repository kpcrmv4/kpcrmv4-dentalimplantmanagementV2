"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  format,
  isToday,
} from "date-fns"
import { th } from "date-fns/locale"
import { cn } from "@/lib/utils"
import type { DashboardCase, TrafficLight } from "@/lib/actions/dashboard"
import type { UserRole } from "@/types/database"

// Start week on Monday
const WEEKDAYS_SHORT = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"]
const WEEKDAYS_FULL = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"]

const DOT_COLORS: Record<TrafficLight, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  orange: "bg-yellow-500",
  red: "bg-red-500",
  neutral: "bg-blue-500",
}

export function CalendarGrid({
  cases,
  currentMonth,
  selectedDate,
  onDateSelect,
  onPrevMonth,
  onNextMonth,
}: {
  cases: DashboardCase[]
  currentMonth: Date
  selectedDate: Date | null
  onDateSelect: (date: Date) => void
  onPrevMonth: () => void
  onNextMonth: () => void
  role?: UserRole
}) {
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  // weekStartsOn: 1 = Monday
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  // Count cases only in the current month for the legend
  const monthCases = cases.filter((c) => {
    if (!c.scheduled_date) return false
    const d = new Date(c.scheduled_date)
    return isSameMonth(d, currentMonth)
  })
  const activeCases = monthCases.filter((c) => c.case_status !== "completed" && c.case_status !== "cancelled")

  // Group cases by date string
  const casesByDate = new Map<string, DashboardCase[]>()
  for (const c of cases) {
    if (!c.scheduled_date) continue
    const key = c.scheduled_date
    const existing = casesByDate.get(key) ?? []
    existing.push(c)
    casesByDate.set(key, existing)
  }

  // Counts for legend
  const countReady = activeCases.filter((c) => c.trafficLight === "green").length
  const countPendingPrep = activeCases.filter((c) => c.case_status === "pending_preparation").length
  const countPendingOrder = activeCases.filter((c) => c.case_status === "pending_order").length
  const countCompleted = monthCases.filter((c) => c.case_status === "completed").length

  return (
    <div>
      {/* Month navigation header */}
      <div className="flex items-center justify-between rounded-t-xl bg-primary/5 px-4 py-3 dark:bg-primary/10">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPrevMonth}
          className="h-8 w-8 rounded-lg hover:bg-primary/10"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-bold tracking-wide text-primary">
          {format(currentMonth, "MMMM yyyy", { locale: th })}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNextMonth}
          className="h-8 w-8 rounded-lg hover:bg-primary/10"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-3">
        {/* Weekday headers */}
        <div className="mb-1 grid grid-cols-7 rounded-lg bg-muted/60 dark:bg-muted/30">
          {WEEKDAYS_SHORT.map((d, i) => (
            <div
              key={d}
              className={cn(
                "py-2 text-center text-[11px] font-bold uppercase tracking-wider lg:text-xs",
                i >= 5
                  ? "text-red-400 dark:text-red-400/80"
                  : "text-muted-foreground"
              )}
            >
              <span className="lg:hidden">{d}</span>
              <span className="hidden lg:inline">{WEEKDAYS_FULL[i]}</span>
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd")
            const inMonth = isSameMonth(day, currentMonth)

            // Only show content for days in current month
            if (!inMonth) {
              return (
                <div
                  key={dateStr}
                  className="relative flex flex-col items-center justify-center rounded-lg py-3 min-h-[3rem]"
                />
              )
            }

            const dayCases = casesByDate.get(dateStr) ?? []
            const selected = selectedDate && isSameDay(day, selectedDate)
            const today = isToday(day)
            const hasCases = dayCases.length > 0
            const dayOfWeek = day.getDay() // 0=Sun, 6=Sat
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

            // Unique traffic light colors present
            const lights = Array.from(
              new Set(dayCases.map((c) => c.trafficLight))
            ) as TrafficLight[]

            return (
              <button
                key={dateStr}
                onClick={() => onDateSelect(day)}
                className={cn(
                  "relative flex flex-col items-center justify-center rounded-lg py-3 transition-all",
                  "min-h-[3rem]",
                  !selected && "hover:bg-accent",
                  isWeekend && !selected && "bg-red-50/50 dark:bg-red-500/5",
                  hasCases && !selected && !isWeekend && "bg-primary/5 dark:bg-primary/10",
                  selected &&
                    "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20",
                  today && !selected && "font-bold"
                )}
              >
                <span
                  className={cn(
                    "text-sm leading-none",
                    today &&
                      !selected &&
                      "flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold"
                  )}
                >
                  {format(day, "d")}
                </span>

                {/* Case count + dots */}
                {hasCases && (
                  <div className="mt-1 flex items-center gap-0.5">
                    <span
                      className={cn(
                        "text-[9px] leading-none font-bold",
                        selected
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      )}
                    >
                      {dayCases.length}
                    </span>
                    {lights.slice(0, 3).map((l) => (
                      <span
                        key={l}
                        className={cn(
                          "h-2 w-2 rounded-full",
                          selected ? "bg-primary-foreground/60" : DOT_COLORS[l]
                        )}
                      />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 border-t pt-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <span className="font-bold text-red-600 dark:text-red-400">{countPendingOrder}</span> รอสั่งของ
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
            <span className="font-bold text-yellow-600 dark:text-yellow-400">{countPendingPrep}</span> รอจัดของ
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <span className="font-bold text-green-600 dark:text-green-400">{countReady}</span> พร้อม
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            <span className="font-bold text-blue-600 dark:text-blue-400">{countCompleted}</span> เสร็จ
          </span>
        </div>
      </div>
    </div>
  )
}
