"use client"

import { useState, useTransition } from "react"
import { addMonths, subMonths, format, isSameDay } from "date-fns"
import { CalendarGrid } from "./calendar-grid"
import { DayCaseList } from "./day-case-list"
import { getDashboardCases } from "@/lib/actions/dashboard"
import type { DashboardCase } from "@/lib/actions/dashboard"
import type { UserRole } from "@/types/database"

export function CaseCalendar({
  initialCases,
  initialYear,
  initialMonth,
  role,
}: {
  initialCases: DashboardCase[]
  initialYear: number
  initialMonth: number
  role?: UserRole
}) {
  const [cases, setCases] = useState(initialCases)
  const [currentMonth, setCurrentMonth] = useState(
    new Date(initialYear, initialMonth - 1, 1)
  )
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [isPending, startTransition] = useTransition()

  function handleMonthChange(newMonth: Date) {
    setCurrentMonth(newMonth)
    startTransition(async () => {
      const year = newMonth.getFullYear()
      const month = newMonth.getMonth() + 1
      const data = await getDashboardCases(year, month)
      setCases(data)
    })
  }

  const selectedCases = selectedDate
    ? cases.filter(
        (c) =>
          c.scheduled_date &&
          isSameDay(new Date(c.scheduled_date), selectedDate)
      )
    : []

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_300px]">
      {/* Calendar */}
      <div className="rounded-xl border bg-card">
        <div className={isPending ? "opacity-60 transition-opacity" : ""}>
          <CalendarGrid
            cases={cases}
            currentMonth={currentMonth}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            onPrevMonth={() => handleMonthChange(subMonths(currentMonth, 1))}
            onNextMonth={() => handleMonthChange(addMonths(currentMonth, 1))}
            role={role}
          />
        </div>
      </div>

      {/* Day detail panel */}
      <div className="rounded-xl border bg-card p-3">
        <h3 className="mb-2 text-xs font-semibold text-muted-foreground">
          เคสวัน{selectedDate ? format(selectedDate, "ที่ d") : "..."}
        </h3>
        <DayCaseList cases={selectedCases} selectedDate={selectedDate} role={role} />
      </div>
    </div>
  )
}
