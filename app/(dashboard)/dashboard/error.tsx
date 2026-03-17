"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Dashboard error:", error)
  }, [error])

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <div className="text-center space-y-4">
        <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
        <div>
          <h2 className="text-lg font-semibold">ไม่สามารถโหลดแดชบอร์ดได้</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง
          </p>
        </div>
        <Button onClick={reset} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          ลองใหม่
        </Button>
      </div>
    </div>
  )
}
