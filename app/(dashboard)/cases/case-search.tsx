"use client"

import { useRouter } from "next/navigation"
import { useState, useRef } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

const STATUS_CHIPS = [
  { value: "all", label: "ทั้งหมด" },
  { value: "pending_appointment", label: "รอทำนัด" },
  { value: "pending_order", label: "รอสั่งของ" },
  { value: "pending_preparation", label: "รอจัดของ" },
  { value: "ready", label: "พร้อม" },
  { value: "completed", label: "เสร็จสิ้น" },
]

export function CaseSearch({
  defaultSearch,
  defaultStatus,
}: {
  defaultSearch?: string
  defaultStatus?: string
}) {
  const router = useRouter()
  const [search, setSearch] = useState(defaultSearch ?? "")
  const [status, setStatus] = useState(defaultStatus ?? "all")
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function navigate(q: string, s: string) {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (s && s !== "all") params.set("status", s)
    router.push(`/cases?${params.toString()}`)
  }

  function handleSearchChange(q: string) {
    setSearch(q)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => navigate(q, status), 300)
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="ค้นหาเลขเคส..."
          className="pl-9"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {/* Status chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_CHIPS.map((chip) => (
          <button
            key={chip.value}
            onClick={() => {
              setStatus(chip.value)
              navigate(search, chip.value)
            }}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              status === chip.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  )
}
