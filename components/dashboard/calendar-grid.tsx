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
  orange: "bg-orange-500",
  red: "bg-red-500",
  neutral: "bg-gray-400",
}

export function CalendarGrid({
  cases,
  currentMonth,
  selectedDate,
  onDateSelect,
  onPrevMonth,
  onNextMonth,
  role,
}: {
  cases: DashboardCase[]
  currentMonth: Date
  selectedDate: Date | null
  onDateSelect: (date: Date) => void
  onPrevMonth: () => void
  onNextMonth: () => void
  role?: UserRole
}) {
  const isCs = role === "cs"
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  // weekStartsOn: 1 = Monday
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  // Group cases by date string
  const casesByDate = new Map<string, DashboardCase[]>()
  for (const c of cases) {
    if (!c.scheduled_date) continue
    const key = c.scheduled_date
    const existing = casesByDate.get(key) ?? []
    existing.push(c)
    casesByDate.set(key, existing)
  }

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
            const dayCases = casesByDate.get(dateStr) ?? []
            const inMonth = isSameMonth(day, currentMonth)
            const selected = selectedDate && isSameDay(day, selectedDate)
            const today = isToday(day)
            const hasCases = dayCases.length > 0
            const dayOfWeek = day.getDay() // 0=Sun, 6=Sat
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

            // Unique traffic light colors present
            const lights = Array.from(
              new Set(dayCases.map((c) => c.trafficLight))
            ).filter((l) => l !== "neutral") as TrafficLight[]

            // CS: count unconfirmed appointments
            const pendingAppts = isCs
              ? dayCases.filter(
                  (c) =>
                    c.appointment_status === "pending" &&
                    !["completed", "cancelled"].includes(c.case_status)
                ).length
              : 0

            return (
              <button
                key={dateStr}
                onClick={() => onDateSelect(day)}
                className={cn(
                  "relative flex flex-col items-center justify-center rounded-lg py-2.5 text-sm transition-all",
                  "min-h-[2.75rem]",
                  !inMonth && "text-muted-foreground/25",
                  inMonth && !selected && "hover:bg-accent",
                  inMonth && isWeekend && !selected && "bg-red-50/50 dark:bg-red-500/5",
                  hasCases && inMonth && !selected && !isWeekend && "bg-primary/5 dark:bg-primary/10",
                  selected &&
                    "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20",
                  today && !selected && "font-bold"
                )}
              >
                <span
                  className={cn(
                    "text-xs leading-none",
                    today &&
                      !selected &&
                      "flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold"
                  )}
                >
                  {format(day, "d")}
                </span>

                {/* Case indicators */}
                <div className="mt-0.5 flex h-2 items-center gap-px">
                  {isCs && hasCases ? (
                    <>
                      <span
                        className={cn(
                          "text-[7px] leading-none font-bold",
                          selected
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        )}
                      >
                        {dayCases.length}
                      </span>
                      {pendingAppts > 0 && (
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            selected
                              ? "bg-primary-foreground/60"
                              : "bg-amber-500"
                          )}
                        />
                      )}
                    </>
                  ) : lights.length > 0 ? (
                    lights.slice(0, 3).map((l) => (
                      <span
                        key={l}
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          selected ? "bg-primary-foreground/60" : DOT_COLORS[l]
                        )}
                      />
                    ))
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 border-t pt-3">
          {isCs ? (
            <>
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> รอทำนัด
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="font-semibold">3</span> จำนวนเคส
              </span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-green-500" /> พร้อม
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-yellow-500" /> สั่งแล้ว
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-orange-500" /> รอของ
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-red-500" /> ขาด
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
