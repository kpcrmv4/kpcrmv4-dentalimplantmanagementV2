"use client"

import { useRouter } from "next/navigation"
import { useState, useRef } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

export function InventorySearch({
  defaultValue,
  currentFilter,
}: {
  defaultValue: string
  currentFilter: string
}) {
  const router = useRouter()
  const [value, setValue] = useState(defaultValue)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function navigate(q: string, filter: string) {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (filter) params.set("filter", filter)
    router.push(`/inventory?${params.toString()}`)
  }

  function handleSearch(q: string) {
    setValue(q)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => navigate(q, currentFilter), 300)
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="ค้นหาชื่อ, REF, แบรนด์..."
          className="pl-9"
          value={value}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => navigate(value, "")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            !currentFilter
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          ทั้งหมด
        </button>
        <button
          onClick={() => navigate(value, "low")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            currentFilter === "low"
              ? "bg-orange-600 text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          ใกล้หมด
        </button>
      </div>
    </div>
  )
}
