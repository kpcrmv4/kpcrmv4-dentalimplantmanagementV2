"use client"

import { useRouter } from "next/navigation"
import { useState, useRef } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

const TABLES = [
  { value: "", label: "ทุกตาราง" },
  { value: "users", label: "users" },
  { value: "patients", label: "patients" },
  { value: "cases", label: "cases" },
  { value: "products", label: "products" },
  { value: "inventory", label: "inventory" },
  { value: "purchase_orders", label: "POs" },
]

const ACTIONS = [
  { value: "", label: "ทุก Action" },
  { value: "INSERT", label: "INSERT" },
  { value: "UPDATE", label: "UPDATE" },
  { value: "DELETE", label: "DELETE" },
]

export function AuditLogSearch({
  defaultSearch,
  currentTable,
  currentAction,
}: {
  defaultSearch: string
  currentTable: string
  currentAction: string
}) {
  const router = useRouter()
  const [value, setValue] = useState(defaultSearch)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function navigate(q: string, table: string, action: string) {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (table) params.set("table", table)
    if (action) params.set("action", action)
    router.push(`/admin/audit-logs?${params.toString()}`)
  }

  function handleSearch(q: string) {
    setValue(q)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => navigate(q, currentTable, currentAction), 300)
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="ค้นหา table, record ID..."
          className="pl-9"
          value={value}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABLES.map((t) => (
          <button
            key={t.value}
            onClick={() => navigate(value, t.value, currentAction)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium font-mono transition-colors ${
              currentTable === t.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {ACTIONS.map((a) => (
          <button
            key={a.value}
            onClick={() => navigate(value, currentTable, a.value)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              currentAction === a.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  )
}
