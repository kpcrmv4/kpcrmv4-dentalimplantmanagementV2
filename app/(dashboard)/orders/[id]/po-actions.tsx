"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  Ban,
  Check,
  Loader2,
  Send,
  Truck,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { updatePOStatus } from "@/lib/actions/orders"
import type { POStatus } from "@/types/database"

// Status transitions: which actions are available for each status
const STATUS_ACTIONS: Record<string, Array<{
  label: string
  targetStatus: POStatus
  icon: typeof Check
  variant: "default" | "destructive" | "outline"
  color?: string
  confirm?: string
  adminOnly?: boolean
}>> = {
  draft: [
    { label: "ส่งขออนุมัติ", targetStatus: "pending_approval" as POStatus, icon: Send, variant: "default" },
    { label: "ยกเลิก PO", targetStatus: "cancelled" as POStatus, icon: Ban, variant: "destructive", confirm: "ต้องการยกเลิกใบสั่งซื้อนี้?" },
  ],
  pending_approval: [
    { label: "อนุมัติ", targetStatus: "approved" as POStatus, icon: Check, variant: "default", color: "bg-green-600 hover:bg-green-700 text-white", adminOnly: true },
    { label: "ส่งกลับแก้ไข", targetStatus: "draft" as POStatus, icon: X, variant: "outline", adminOnly: true },
    { label: "ยกเลิก PO", targetStatus: "cancelled" as POStatus, icon: Ban, variant: "destructive", confirm: "ต้องการยกเลิกใบสั่งซื้อนี้?" },
  ],
  approved: [
    { label: "สั่งซื้อแล้ว", targetStatus: "ordered" as POStatus, icon: Truck, variant: "default" },
    { label: "ยกเลิก PO", targetStatus: "cancelled" as POStatus, icon: Ban, variant: "destructive", confirm: "ต้องการยกเลิกใบสั่งซื้อนี้?" },
  ],
  ordered: [
    { label: "รับของครบ", targetStatus: "received" as POStatus, icon: Check, variant: "default", color: "bg-emerald-600 hover:bg-emerald-700 text-white" },
    { label: "ยกเลิก PO", targetStatus: "cancelled" as POStatus, icon: Ban, variant: "destructive", confirm: "ต้องการยกเลิกใบสั่งซื้อนี้?" },
  ],
}

export function POActions({
  poId,
  status,
  isAdmin,
}: {
  poId: string
  status: string
  isAdmin: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    label: string
    targetStatus: POStatus
    message: string
  } | null>(null)

  const actions = (STATUS_ACTIONS[status] ?? []).filter(
    (a) => !a.adminOnly || isAdmin
  )

  if (actions.length === 0) return null

  function handleAction(targetStatus: POStatus, confirmMessage?: string, label?: string) {
    if (confirmMessage) {
      setConfirmDialog({ label: label ?? "", targetStatus, message: confirmMessage })
      return
    }
    executeAction(targetStatus)
  }

  function executeAction(targetStatus: POStatus) {
    setError(null)
    setConfirmDialog(null)
    startTransition(async () => {
      try {
        await updatePOStatus(poId, targetStatus)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
      }
    })
  }

  return (
    <>
      <div className="rounded-xl border bg-card p-3 space-y-3">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
            <p className="text-xs text-destructive">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto shrink-0">
              <X className="h-3 w-3 text-destructive" />
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <Button
                key={action.targetStatus}
                variant={action.variant}
                className={`w-full h-10 ${action.color ?? ""}`}
                disabled={isPending}
                onClick={() => handleAction(action.targetStatus, action.confirm, action.label)}
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="mr-2 h-4 w-4" />
                )}
                {action.label}
              </Button>
            )
          })}
        </div>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{confirmDialog?.label}</DialogTitle>
            <DialogDescription>{confirmDialog?.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="destructive"
              className="w-full h-11"
              onClick={() => confirmDialog && executeAction(confirmDialog.targetStatus)}
              disabled={isPending}
            >
              {isPending ? "กำลังดำเนินการ..." : "ยืนยัน"}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setConfirmDialog(null)}>
              ยกเลิก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
