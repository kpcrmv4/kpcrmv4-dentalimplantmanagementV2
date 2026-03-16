"use client"

import { useRouter } from "next/navigation"
import { useState, useRef } from "react"
import { Search, CalendarIcon, X, SlidersHorizontal } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { th } from "date-fns/locale"

export function InventorySearch({
  defaultValue,
  currentFilter,
  currentView,
  currentExpiryBefore,
  lowStockCount,
}: {
  defaultValue: string
  currentFilter: string
  currentView: string
  currentExpiryBefore: string
  lowStockCount: number
}) {
  const router = useRouter()
  const [value, setValue] = useState(defaultValue)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(
    currentExpiryBefore ? new Date(currentExpiryBefore) : undefined
  )
  const [calendarOpen, setCalendarOpen] = useState(false)

  function navigate(q: string, filter: string, view?: string, expiryBefore?: string) {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (filter) params.set("filter", filter)
    if (view) params.set("view", view)
    if (expiryBefore) params.set("expiry_before", expiryBefore)
    router.push(`/inventory?${params.toString()}`)
  }

  function handleSearch(q: string) {
    setValue(q)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(
      () => navigate(q, currentFilter, currentView, currentExpiryBefore),
      300
    )
  }

  function handleViewToggle(view: string) {
    navigate(value, currentFilter, view, currentExpiryBefore)
  }

  function handleFilterChange(filter: string) {
    navigate(value, filter, currentView, currentExpiryBefore)
  }

  function handleExpiryChange(date: Date | undefined) {
    setExpiryDate(date)
    setCalendarOpen(false)
    const dateStr = date ? format(date, "yyyy-MM-dd") : ""
    navigate(value, currentFilter, currentView, dateStr)
  }

  const isLotView = currentView === "lot"

  return (
    <div className="space-y-2">
      {/* Search + View toggle row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={isLotView ? "ค้นหาชื่อ, REF, LOT..." : "ค้นหาชื่อ, REF, แบรนด์..."}
            className="pl-8 h-9 text-sm"
            value={value}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {value && (
            <button
              onClick={() => handleSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {/* View Toggle */}
        <div className="flex rounded-lg border bg-muted p-0.5 shrink-0">
          <button
            onClick={() => handleViewToggle("")}
            className={`rounded-md px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium transition-colors whitespace-nowrap ${
              !isLotView
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            สินค้า
          </button>
          <button
            onClick={() => handleViewToggle("lot")}
            className={`rounded-md px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium transition-colors whitespace-nowrap ${
              isLotView
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            LOT
          </button>
        </div>
      </div>

      {/* Filter pills + expiry filter */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <FilterPill
          active={!currentFilter}
          onClick={() => handleFilterChange("")}
          color="default"
        >
          ทั้งหมด
        </FilterPill>
        <FilterPill
          active={currentFilter === "low"}
          onClick={() => handleFilterChange("low")}
          color="orange"
          count={lowStockCount > 0 ? lowStockCount : undefined}
        >
          ใกล้หมด
        </FilterPill>
        <FilterPill
          active={currentFilter === "ordering"}
          onClick={() => handleFilterChange("ordering")}
          color="indigo"
        >
          กำลังสั่ง
        </FilterPill>

        {/* Expiry date filter - show in LOT view */}
        {isLotView && (
          <>
            <div className="w-px h-4 bg-border mx-0.5" />
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <button
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] sm:text-xs font-medium transition-colors border ${
                    expiryDate
                      ? "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-900/20 dark:text-orange-400"
                      : "border-transparent bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <CalendarIcon className="h-3 w-3" />
                  {expiryDate
                    ? `ก่อน ${format(expiryDate, "d MMM yy", { locale: th })}`
                    : "หมดอายุก่อน..."}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expiryDate}
                  onSelect={handleExpiryChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {expiryDate && (
              <button
                onClick={() => handleExpiryChange(undefined)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function FilterPill({
  active,
  onClick,
  color,
  count,
  children,
}: {
  active: boolean
  onClick: () => void
  color: "default" | "orange" | "indigo"
  count?: number
  children: React.ReactNode
}) {
  const activeColors = {
    default: "bg-primary text-primary-foreground",
    orange: "bg-orange-600 text-white",
    indigo: "bg-indigo-600 text-white",
  }
  const inactiveClass = "bg-muted text-muted-foreground hover:bg-muted/80"

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] sm:text-xs font-medium transition-colors ${
        active ? activeColors[color] : inactiveClass
      }`}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span
          className={`inline-flex items-center justify-center rounded-full min-w-[16px] h-4 px-1 text-[10px] font-bold ${
            active ? "bg-white/20" : "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  )
}
