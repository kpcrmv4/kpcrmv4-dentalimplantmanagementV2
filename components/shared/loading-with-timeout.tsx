"use client"

import { useState, useEffect } from "react"
import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface LoadingWithTimeoutProps {
  timeout?: number
  message?: string
}

export function LoadingWithTimeout({
  timeout = 15000,
  message = "กำลังโหลด...",
}: LoadingWithTimeoutProps) {
  const [isTimeout, setIsTimeout] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsTimeout(true), timeout)
    return () => clearTimeout(timer)
  }, [timeout])

  if (isTimeout) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-sm text-muted-foreground">
          การโหลดใช้เวลานานกว่าปกติ
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            รีเฟรช
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (window.location.href = "/login")}
          >
            กลับหน้าเข้าสู่ระบบ
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
