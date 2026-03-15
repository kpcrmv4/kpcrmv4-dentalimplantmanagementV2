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

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]

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
}: {
  cases: DashboardCase[]
  currentMonth: Date
  selectedDate: Date | null
  onDateSelect: (date: Date) => void
  onPrevMonth: () => void
  onNextMonth: () => void
}) {
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
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
      {/* Month navigation */}
      <div className="mb-3 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={onPrevMonth} className="h-8 w-8">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-semibold">
          {format(currentMonth, "MMMM yyyy", { locale: th })}
        </h2>
        <Button variant="ghost" size="icon" onClick={onNextMonth} className="h-8 w-8">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="py-1 text-center text-[11px] font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd")
          const dayCases = casesByDate.get(dateStr) ?? []
          const inMonth = isSameMonth(day, currentMonth)
          const selected = selectedDate && isSameDay(day, selectedDate)
          const today = isToday(day)

          // Unique traffic light colors present
          const lights = Array.from(new Set(dayCases.map((c) => c.trafficLight))).filter(
            (l) => l !== "neutral"
          ) as TrafficLight[]

          return (
            <button
              key={dateStr}
              onClick={() => onDateSelect(day)}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-md py-1.5 text-sm transition-colors",
                !inMonth && "text-muted-foreground/40",
                inMonth && "hover:bg-muted",
                selected && "bg-primary/10 font-semibold text-primary",
                today && !selected && "font-semibold text-primary"
              )}
            >
              <span className="text-xs leading-none">{format(day, "d")}</span>
              {/* Dots */}
              <div className="flex gap-0.5">
                {lights.length > 0
                  ? lights.map((l) => (
                      <span
                        key={l}
                        className={cn("h-1.5 w-1.5 rounded-full", DOT_COLORS[l])}
                      />
                    ))
                  : <span className="h-1.5" /> /* spacer to keep alignment */}
              </div>
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500" /> พร้อม
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-yellow-500" /> สั่งแล้ว/รอรับ
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-orange-500" /> รอของ
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-500" /> ขาด
        </span>
      </div>
    </div>
  )
}
