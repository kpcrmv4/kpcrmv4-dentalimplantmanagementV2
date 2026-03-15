"use client"

import { useRouter } from "next/navigation"
import { useState, useRef } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

const STATUSES = [
  { value: "", label: "ทั้งหมด" },
  { value: "draft", label: "แบบร่าง" },
  { value: "pending_approval", label: "รออนุมัติ" },
  { value: "approved", label: "อนุมัติแล้ว" },
  { value: "ordered", label: "สั่งแล้ว" },
  { value: "received", label: "รับครบ" },
]

export function OrderSearch({
  defaultValue,
  currentStatus,
}: {
  defaultValue: string
  currentStatus: string
}) {
  const router = useRouter()
  const [value, setValue] = useState(defaultValue)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function navigate(q: string, status: string) {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (status) params.set("status", status)
    router.push(`/orders?${params.toString()}`)
  }

  function handleSearch(q: string) {
    setValue(q)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => navigate(q, currentStatus), 300)
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="ค้นหาเลข PO..."
          className="pl-9"
          value={value}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => navigate(value, s.value)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              currentStatus === s.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
