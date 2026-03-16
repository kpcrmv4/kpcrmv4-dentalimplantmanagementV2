"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  Ban,
  CalendarClock,
  Check,
  Loader2,
  Phone,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  confirmAppointment,
  postponeAppointment,
  cancelAppointment,
} from "@/lib/actions/appointments"

const APPOINTMENT_STATUS_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  pending: {
    label: "รอยืนยัน",
    color:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  },
  confirmed: {
    label: "ยืนยันแล้ว",
    color:
      "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
  },
  postponed: {
    label: "เลื่อนนัด",
    color:
      "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400",
  },
  cancelled: {
    label: "ยกเลิกนัด",
    color: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
  },
}

export function AppointmentActions({
  caseId,
  appointmentStatus,
  caseStatus,
}: {
  caseId: string
  appointmentStatus: string
  caseStatus: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Dialogs
  const [confirmDialog, setConfirmDialog] = useState(false)
  const [postponeDialog, setPostponeDialog] = useState(false)
  const [cancelDialog, setCancelDialog] = useState(false)

  // Form state
  const [confirmNote, setConfirmNote] = useState("")
  const [postponeDate, setPostponeDate] = useState("")
  const [postponeNote, setPostponeNote] = useState("")
  const [cancelNote, setCancelNote] = useState("")

  const isCaseClosed = ["completed", "cancelled"].includes(caseStatus)
  const statusConfig =
    APPOINTMENT_STATUS_CONFIG[appointmentStatus] ??
    APPOINTMENT_STATUS_CONFIG.pending

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      try {
        await confirmAppointment(caseId, confirmNote || undefined)
        setConfirmDialog(false)
        setConfirmNote("")
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
      }
    })
  }

  function handlePostpone() {
    if (!postponeDate || !postponeNote.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        await postponeAppointment(caseId, postponeDate, postponeNote)
        setPostponeDialog(false)
        setPostponeDate("")
        setPostponeNote("")
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
      }
    })
  }

  function handleCancel() {
    if (!cancelNote.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        await cancelAppointment(caseId, cancelNote)
        setCancelDialog(false)
        setCancelNote("")
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
      }
    })
  }

  return (
    <>
      <div className="rounded-xl border bg-card p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            <h2 className="text-sm font-semibold">ยืนยันนัดหมาย</h2>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusConfig.color}`}
          >
            {statusConfig.label}
          </span>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
            <p className="text-xs text-destructive">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto shrink-0">
              <X className="h-3 w-3 text-destructive" />
            </button>
          </div>
        )}

        {!isCaseClosed && appointmentStatus !== "cancelled" && (
          <div className="flex gap-2">
            {appointmentStatus !== "confirmed" && (
              <Button
                size="sm"
                className="flex-1 h-9 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setConfirmDialog(true)}
              >
                <Check className="mr-1.5 h-3.5 w-3.5" />
                ยืนยัน
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-9"
              onClick={() => setPostponeDialog(true)}
            >
              <CalendarClock className="mr-1.5 h-3.5 w-3.5" />
              เลื่อนนัด
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-9 border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={() => setCancelDialog(true)}
            >
              <Ban className="mr-1.5 h-3.5 w-3.5" />
              ยกเลิก
            </Button>
          </div>
        )}
      </div>

      {/* ── Confirm Dialog ── */}
      <Dialog
        open={confirmDialog}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setConfirmDialog(false)
            setConfirmNote("")
          }
        }}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ยืนยันนัดหมาย</DialogTitle>
            <DialogDescription>
              บันทึกว่าคนไข้ยืนยันมาตามนัดแล้ว
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="confirm_note" className="text-sm">
                หมายเหตุ (ไม่บังคับ)
              </Label>
              <Textarea
                id="confirm_note"
                placeholder="เช่น คนไข้ยืนยันมาตามนัด"
                value={confirmNote}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setConfirmNote(e.target.value)
                }
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              className="w-full h-11 bg-green-600 hover:bg-green-700 text-white"
              onClick={handleConfirm}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              {isPending ? "กำลังบันทึก..." : "ยืนยันนัดหมาย"}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setConfirmDialog(false)
                setConfirmNote("")
              }}
            >
              ยกเลิก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Postpone Dialog ── */}
      <Dialog
        open={postponeDialog}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setPostponeDialog(false)
            setPostponeDate("")
            setPostponeNote("")
          }
        }}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>เลื่อนนัดหมาย</DialogTitle>
            <DialogDescription>
              เลือกวันนัดใหม่และระบุเหตุผลการเลื่อน
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new_date" className="text-sm">
                วันนัดใหม่
              </Label>
              <Input
                id="new_date"
                type="date"
                value={postponeDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPostponeDate(e.target.value)
                }
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="postpone_note" className="text-sm">
                เหตุผล
              </Label>
              <Textarea
                id="postpone_note"
                placeholder="เช่น คนไข้ติดธุระ ขอเลื่อนนัด"
                value={postponeNote}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setPostponeNote(e.target.value)
                }
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              className="w-full h-11"
              onClick={handlePostpone}
              disabled={isPending || !postponeDate || !postponeNote.trim()}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CalendarClock className="mr-2 h-4 w-4" />
              )}
              {isPending ? "กำลังบันทึก..." : "ยืนยันเลื่อนนัด"}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setPostponeDialog(false)
                setPostponeDate("")
                setPostponeNote("")
              }}
            >
              ยกเลิก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cancel Appointment Dialog ── */}
      <Dialog
        open={cancelDialog}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setCancelDialog(false)
            setCancelNote("")
          }
        }}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ยกเลิกนัดหมาย</DialogTitle>
            <DialogDescription>
              ยกเลิกนัดและเคส วัสดุที่จองไว้จะถูกคืนเข้าสต๊อก
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cancel_note" className="text-sm">
                เหตุผลการยกเลิก
              </Label>
              <Textarea
                id="cancel_note"
                placeholder="เช่น คนไข้ไม่ต้องการทำต่อ"
                value={cancelNote}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setCancelNote(e.target.value)
                }
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="destructive"
              className="w-full h-11"
              onClick={handleCancel}
              disabled={isPending || !cancelNote.trim()}
            >
              {isPending ? "กำลังยกเลิก..." : "ยืนยันยกเลิกนัด"}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setCancelDialog(false)
                setCancelNote("")
              }}
            >
              ไม่ยกเลิก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
