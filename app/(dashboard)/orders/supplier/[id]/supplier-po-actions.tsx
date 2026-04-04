"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  Ban,
  Check,
  Loader2,
  RotateCcw,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { approveSupplierOrder, rejectSupplierOrder, cancelSupplierOrder } from "@/lib/actions/supplier-orders"

type ActionType = "approve" | "reject" | "cancel"

type ActionConfig = {
  label: string
  action: ActionType
  icon: typeof Check
  variant: "default" | "destructive" | "outline"
  color?: string
  confirm?: string
  adminOnly?: boolean
  needsReason?: boolean
}

const STATUS_ACTIONS: Record<string, ActionConfig[]> = {
  pending_approval: [
    { label: "อนุมัติ", action: "approve", icon: Check, variant: "default", color: "bg-green-600 hover:bg-green-700 text-white", adminOnly: true },
    { label: "ส่งกลับแก้ไข", action: "reject", icon: RotateCcw, variant: "outline", adminOnly: true, needsReason: true },
    { label: "ยกเลิก PO", action: "cancel", icon: Ban, variant: "destructive", confirm: "ต้องการยกเลิกใบสั่งซื้อนี้?", adminOnly: true },
  ],
  sent: [
    { label: "ยกเลิก PO", action: "cancel", icon: Ban, variant: "destructive", confirm: "ใบสั่งซื้อนี้ส่งไปยัง Supplier แล้ว ต้องการยกเลิกจริงหรือไม่?", adminOnly: true },
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
    action: ActionType
    message: string
  } | null>(null)
  const [rejectDialog, setRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  const actions = (STATUS_ACTIONS[status] ?? []).filter(
    (a) => !a.adminOnly || isAdmin
  )

  if (actions.length === 0) return null

  function handleAction(action: ActionType, confirmMessage?: string, label?: string, needsReason?: boolean) {
    if (needsReason) {
      setRejectReason("")
      setRejectDialog(true)
      return
    }
    if (confirmMessage) {
      setConfirmDialog({ label: label ?? "", action, message: confirmMessage })
      return
    }
    executeAction(action)
  }

  function executeAction(action: ActionType, reason?: string) {
    setError(null)
    setConfirmDialog(null)
    setRejectDialog(false)
    startTransition(async () => {
      try {
        if (action === "approve") {
          await approveSupplierOrder(orderId)
        } else if (action === "reject") {
          await rejectSupplierOrder(orderId, reason)
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
                onClick={() => handleAction(a.action, a.confirm, a.label, a.needsReason)}
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

      {/* Reject Dialog */}
      <Dialog open={rejectDialog} onOpenChange={(open) => !open && setRejectDialog(false)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ส่งกลับแก้ไข</DialogTitle>
            <DialogDescription>ใบสั่งซื้อจะถูกยกเลิกและแจ้งผู้สร้างให้ทำใหม่</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-sm">เหตุผล (ไม่บังคับ)</Label>
            <Textarea
              placeholder="เช่น ราคาไม่ถูกต้อง, จำนวนผิด..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              className="w-full h-11"
              onClick={() => executeAction("reject", rejectReason || undefined)}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              {isPending ? "กำลังดำเนินการ..." : "ยืนยันส่งกลับ"}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setRejectDialog(false)}>
              ยกเลิก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
