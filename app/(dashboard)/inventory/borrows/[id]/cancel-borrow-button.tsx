"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Ban, Loader2, AlertTriangle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cancelSupplierOrder } from "@/lib/actions/supplier-orders"

export function CancelBorrowButton({
  borrowId,
  borrowNumber,
  status,
}: {
  borrowId: string
  borrowNumber: string
  status: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Only allow cancel for active statuses
  if (!["sent", "borrowed"].includes(status)) return null

  function handleCancel() {
    setError(null)
    startTransition(async () => {
      try {
        await cancelSupplierOrder(borrowId)
        setShowConfirm(false)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "ยกเลิกไม่สำเร็จ")
      }
    })
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-destructive border-destructive/30 hover:bg-destructive/10"
        onClick={() => setShowConfirm(true)}
      >
        <Ban className="mr-1 h-3.5 w-3.5" />
        ยกเลิกใบยืม
      </Button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowConfirm(false)}>
          <div className="mx-4 w-full max-w-sm rounded-lg bg-background p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-destructive">ยกเลิกใบยืม</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowConfirm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-500/10 p-3 mb-4">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                  ต้องการยกเลิกใบยืม {borrowNumber} จริงหรือไม่?
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                  {status === "borrowed"
                    ? "ใบยืมนี้รับของมาแล้ว การยกเลิกจะไม่คืนสินค้าโดยอัตโนมัติ"
                    : "ใบยืมนี้ส่งไปยัง Supplier แล้ว กรุณาแจ้ง Supplier ด้วย"}
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                  สถานะเคสที่เกี่ยวข้องจะถูกอัพเดทอัตโนมัติ
                </p>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-1.5 rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive mb-3">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleCancel}
                disabled={isPending}
              >
                {isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Ban className="mr-1 h-3.5 w-3.5" />}
                ยืนยันยกเลิก
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(false)}>
                ไม่ยกเลิก
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
