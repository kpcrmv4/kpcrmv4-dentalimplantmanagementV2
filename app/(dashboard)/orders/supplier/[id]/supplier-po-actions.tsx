"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  Ban,
  Check,
  Loader2,
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
import { approveSupplierOrder, cancelSupplierOrder } from "@/lib/actions/supplier-orders"

type ActionConfig = {
  label: string
  action: "approve" | "cancel"
  icon: typeof Check
  variant: "default" | "destructive" | "outline"
  color?: string
  confirm?: string
  adminOnly?: boolean
}

const STATUS_ACTIONS: Record<string, ActionConfig[]> = {
  pending_approval: [
    { label: "อนุมัติ", action: "approve", icon: Check, variant: "default", color: "bg-green-600 hover:bg-green-700 text-white", adminOnly: true },
    { label: "ยกเลิก PO", action: "cancel", icon: Ban, variant: "destructive", confirm: "ต้องการยกเลิกใบสั่งซื้อนี้?" },
  ],
}

export function SupplierPOActions({
  orderId,
  status,
  isAdmin,
}: {
  orderId: string
  status: string
  isAdmin: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    label: string
    action: "approve" | "cancel"
    message: string
  } | null>(null)

  const actions = (STATUS_ACTIONS[status] ?? []).filter(
    (a) => !a.adminOnly || isAdmin
  )

  if (actions.length === 0) return null

  function handleAction(action: "approve" | "cancel", confirmMessage?: string, label?: string) {
    if (confirmMessage) {
      setConfirmDialog({ label: label ?? "", action, message: confirmMessage })
      return
    }
    executeAction(action)
  }

  function executeAction(action: "approve" | "cancel") {
    setError(null)
    setConfirmDialog(null)
    startTransition(async () => {
      try {
        if (action === "approve") {
          await approveSupplierOrder(orderId)
        } else {
          await cancelSupplierOrder(orderId)
        }
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
          {actions.map((a) => {
            const Icon = a.icon
            return (
              <Button
                key={a.action}
                variant={a.variant}
                className={`w-full h-10 ${a.color ?? ""}`}
                disabled={isPending}
                onClick={() => handleAction(a.action, a.confirm, a.label)}
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="mr-2 h-4 w-4" />
                )}
                {a.label}
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
              onClick={() => confirmDialog && executeAction(confirmDialog.action)}
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
