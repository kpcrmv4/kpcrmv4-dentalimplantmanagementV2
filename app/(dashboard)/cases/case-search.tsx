"use client"

import { useRouter } from "next/navigation"
import { useState, useRef, useCallback } from "react"
import { Search, List, Clock, CalendarIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { th } from "date-fns/locale"

const STATUS_CHIPS = [
  { value: "all", label: "ทั้งหมด" },
  { value: "waiting_doctor", label: "รอแพทย์สั่งของ" },
  { value: "pending_order", label: "รอสั่งของ" },
  { value: "pending_preparation", label: "รอจัดของ" },
  { value: "ready", label: "พร้อม" },
  { value: "completed", label: "เสร็จสิ้น" },
]

const APPT_CHIPS = [
  { value: "all", label: "ทั้งหมด" },
  { value: "pending", label: "รอทำนัด" },
  { value: "confirmed", label: "นัดแล้ว" },
]

const PERIOD_CHIPS = [
  { value: "today", label: "วันนี้" },
  { value: "week", label: "สัปดาห์" },
  { value: "month", label: "เดือนนี้" },
  { value: "year", label: "ปีนี้" },
  { value: "all", label: "ทั้งหมด" },
]

export function CaseSearch({
  defaultSearch,
  defaultStatus,
  defaultPeriod,
  defaultDate,
  defaultView,
  defaultAppt,
}: {
  defaultSearch?: string
  defaultStatus?: string
  defaultPeriod?: string
  defaultDate?: string
  defaultView?: string
  defaultAppt?: string
}) {
  const router = useRouter()
  const [search, setSearch] = useState(defaultSearch ?? "")
  const [status, setStatus] = useState(defaultStatus ?? "all")
  const [appt, setAppt] = useState(defaultAppt ?? "all")
  const [period, setPeriod] = useState(defaultPeriod ?? "today")
  const [view, setView] = useState<"list" | "timeline">(
    (defaultView as "list" | "timeline") ?? "timeline"
  )
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    defaultDate ? new Date(defaultDate) : undefined
  )
  const [calendarOpen, setCalendarOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const navigate = useCallback(
    (q: string, s: string, p: string, v: string, a: string, date?: Date) => {
      const params = new URLSearchParams()
      if (q) params.set("q", q)
      if (s && s !== "all") params.set("status", s)
      if (a && a !== "all") params.set("appt", a)
      if (p && p !== "today") params.set("period", p)
      if (v && v !== "timeline") params.set("view", v)
      if (date) params.set("date", format(date, "yyyy-MM-dd"))
      router.push(`/cases?${params.toString()}`)
    },
    [router]
  )

  function handleSearchChange(q: string) {
    setSearch(q)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(
      () => navigate(q, status, period, view, appt, selectedDate),
      300
    )
  }

  function handlePeriodChange(p: string) {
    setPeriod(p)
    setSelectedDate(undefined)
    navigate(search, status, p, view, appt)
  }

  function handleStatusChange(s: string) {
    setStatus(s)
    navigate(search, s, period, view, appt, selectedDate)
  }

  function handleApptChange(a: string) {
    setAppt(a)
    navigate(search, status, period, view, a, selectedDate)
  }

  function handleViewChange(v: "list" | "timeline") {
    setView(v)
    navigate(search, status, period, v, appt, selectedDate)
  }

  function handleDateSelect(date: Date | undefined) {
    setSelectedDate(date)
    setCalendarOpen(false)
    if (date) {
      setPeriod("custom")
      navigate(search, status, "custom", view, appt, date)
    } else {
      setPeriod("today")
      navigate(search, status, "today", view, appt)
    }
  }

  return (
    <div className="space-y-3">
      {/* Search + View Toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="ค้นหาเลขเคส / ชื่อคนไข้ / ชื่อหมอ..."
            className="pl-9"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <div className="flex rounded-lg border bg-muted p-0.5">
          <Button
            variant={view === "list" ? "default" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => handleViewChange("list")}
            title="มุมมองรายการ"
          >
            <List className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={view === "timeline" ? "default" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => handleViewChange("timeline")}
            title="มุมมองไทม์ไลน์"
          >
            <Clock className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Filter groups - single row on desktop */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        {/* Period filter + Date picker */}
        <div className="flex items-center gap-1.5 overflow-x-auto rounded-lg border border-blue-200/60 bg-blue-50/50 px-2.5 py-1.5 dark:border-blue-900/40 dark:bg-blue-950/20">
          <span className="shrink-0 text-[10px] font-medium text-blue-600 dark:text-blue-400">ช่วงเวลา</span>
          {PERIOD_CHIPS.map((chip) => (
            <button
              key={chip.value}
              onClick={() => handlePeriodChange(chip.value)}
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                period === chip.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-blue-100 dark:hover:bg-blue-900/30"
              }`}
            >
              {chip.label}
            </button>
          ))}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                  period === "custom"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-blue-100 dark:hover:bg-blue-900/30"
                }`}
              >
                <CalendarIcon className="h-3 w-3" />
                {selectedDate
                  ? format(selectedDate, "d MMM", { locale: th })
                  : "เลือกวัน"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                locale={th}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Status chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto rounded-lg border border-amber-200/60 bg-amber-50/50 px-2.5 py-1.5 dark:border-amber-900/40 dark:bg-amber-950/20">
          <span className="shrink-0 text-[10px] font-medium text-amber-600 dark:text-amber-400">สถานะ</span>
          {STATUS_CHIPS.map((chip) => (
            <button
              key={chip.value}
              onClick={() => handleStatusChange(chip.value)}
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                status === chip.value
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-amber-100 dark:hover:bg-amber-900/30"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Appointment status chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto rounded-lg border border-emerald-200/60 bg-emerald-50/50 px-2.5 py-1.5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <span className="shrink-0 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">นัดหมาย</span>
          {APPT_CHIPS.map((chip) => (
            <button
              key={chip.value}
              onClick={() => handleApptChange(chip.value)}
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                appt === chip.value
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
