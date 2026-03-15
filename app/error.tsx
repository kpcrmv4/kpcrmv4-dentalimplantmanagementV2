"use client"

import { useEffect } from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  // Session expired → redirect to login
  if (error.message?.includes("Unauthorized") || error.message?.includes("AUTH_")) {
    window.location.href = "/login?expired=true"
    return null
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-4 text-center">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <h2 className="text-lg font-semibold">เกิดข้อผิดพลาด</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        ระบบเกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองอีกครั้ง
      </p>
      <div className="flex gap-2">
        <Button onClick={reset} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          ลองอีกครั้ง
        </Button>
        <Button variant="ghost" onClick={() => (window.location.href = "/dashboard")}>
          กลับหน้าแรก
        </Button>
      </div>
    </div>
  )
}
