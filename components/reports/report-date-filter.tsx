"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { CalendarIcon } from "lucide-react"

const PERIOD_OPTIONS = [
  { value: "month", label: "เดือนนี้" },
  { value: "custom", label: "เลือกช่วงวัน" },
  { value: "all", label: "ทั้งหมด" },
]

export function ReportDateFilter({
  currentPeriod,
  currentFrom,
  currentTo,
}: {
  currentPeriod: string
  currentFrom?: string
  currentTo?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [from, setFrom] = useState(currentFrom || "")
  const [to, setTo] = useState(currentTo || "")

  function navigate(period: string, customFrom?: string, customTo?: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("period", period)
    if (period === "custom" && customFrom && customTo) {
      params.set("from", customFrom)
      params.set("to", customTo)
    } else {
      params.delete("from")
      params.delete("to")
    }
    router.push(`/reports?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {PERIOD_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => {
            if (opt.value === "custom") {
              // Switch to custom mode but don't navigate yet (need dates)
              const params = new URLSearchParams(searchParams.toString())
              params.set("period", "custom")
              if (from && to) {
                params.set("from", from)
                params.set("to", to)
              }
              router.push(`/reports?${params.toString()}`)
            } else {
              navigate(opt.value)
            }
          }}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            currentPeriod === opt.value
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          } ${opt.value === "custom" ? "flex items-center gap-1" : ""}`}
        >
          {opt.value === "custom" && <CalendarIcon className="h-3 w-3" />}
          {opt.label}
        </button>
      ))}

      {currentPeriod === "custom" && (
        <div className="flex items-center gap-1.5 ml-1">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-7 rounded-md border bg-background px-2 text-xs"
          />
          <span className="text-xs text-muted-foreground">ถึง</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-7 rounded-md border bg-background px-2 text-xs"
          />
          <button
            onClick={() => {
              if (from && to) navigate("custom", from, to)
            }}
            disabled={!from || !to}
            className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            ดู
          </button>
        </div>
      )}
    </div>
  )
}
