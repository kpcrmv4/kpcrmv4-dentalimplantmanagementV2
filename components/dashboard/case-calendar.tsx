"use client"

import { useState, useTransition } from "react"
import { addMonths, subMonths, format, isSameDay } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">ปฏิทินเคส</CardTitle>
        </CardHeader>
        <CardContent className={isPending ? "opacity-60 transition-opacity" : ""}>
          <CalendarGrid
            cases={cases}
            currentMonth={currentMonth}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            onPrevMonth={() => handleMonthChange(subMonths(currentMonth, 1))}
            onNextMonth={() => handleMonthChange(addMonths(currentMonth, 1))}
            role={role}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            เคสวัน{selectedDate ? format(selectedDate, "ที่ d") : "..."}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DayCaseList cases={selectedCases} selectedDate={selectedDate} role={role} />
        </CardContent>
      </Card>
    </div>
  )
}
