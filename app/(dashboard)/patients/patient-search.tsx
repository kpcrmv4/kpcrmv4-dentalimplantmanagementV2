"use client"

import { useRouter } from "next/navigation"
import { useState, useRef } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

export function PatientSearch({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter()
  const [value, setValue] = useState(defaultValue ?? "")
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleChange(q: string) {
    setValue(q)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams()
      if (q) params.set("q", q)
      router.push(`/patients?${params.toString()}`)
    }, 300)
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="ค้นหาชื่อ, HN, หรือเบอร์โทร..."
        className="pl-9"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
      />
    </div>
  )
}
