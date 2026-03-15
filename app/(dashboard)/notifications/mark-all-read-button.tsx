"use client"

import { useState } from "react"
import { CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { markAllAsRead } from "@/lib/actions/notifications"
import { useRouter } from "next/navigation"

export function MarkAllReadButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      await markAllAsRead()
      router.refresh()
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="ghost" size="sm" disabled={loading} onClick={handleClick}>
      <CheckCheck className="mr-1 h-4 w-4" />
      {loading ? "กำลังอ่าน..." : "อ่านทั้งหมด"}
    </Button>
  )
}
