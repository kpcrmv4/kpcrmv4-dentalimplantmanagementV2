"use client"

import { useRouter } from "next/navigation"
import { useState, useRef } from "react"
import { Search, CalendarIcon, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { th } from "date-fns/locale"

export function InventorySearch({
  defaultValue,
  currentFilter,
  currentView,
  currentExpiryBefore,
}: {
  defaultValue: string
  currentFilter: string
  currentView: string
  currentExpiryBefore: string
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
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={
            isLotView
              ? "ค้นหาชื่อ, REF, LOT..."
              : "ค้นหาชื่อ, REF, แบรนด์..."
          }
          className="pl-9"
          value={value}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => handleFilterChange("")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !currentFilter
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            ทั้งหมด
          </button>
          <button
            onClick={() => handleFilterChange("low")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              currentFilter === "low"
                ? "bg-orange-600 text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            ใกล้หมด
          </button>
          <button
            onClick={() => handleFilterChange("ordering")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              currentFilter === "ordering"
                ? "bg-indigo-600 text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            กำลังสั่ง
          </button>
        </div>

        <div className="flex rounded-lg border bg-muted p-0.5">
          <button
            onClick={() => handleViewToggle("")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              !isLotView
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            ตามสินค้า
          </button>
          <button
            onClick={() => handleViewToggle("lot")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              isLotView
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            ตาม LOT
          </button>
        </div>
      </div>

      {/* Expiry date filter - only show in LOT view */}
      {isLotView && (
        <div className="flex items-center gap-2">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`h-8 text-xs ${
                  expiryDate ? "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-900/20 dark:text-orange-400" : ""
                }`}
              >
                <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                {expiryDate
                  ? `หมดอายุก่อน ${format(expiryDate, "d MMM yyyy", { locale: th })}`
                  : "แสดงเฉพาะหมดอายุก่อน..."
                }
              </Button>
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
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-muted-foreground"
              onClick={() => handleExpiryChange(undefined)}
            >
              <X className="mr-1 h-3 w-3" />
              ล้าง
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
