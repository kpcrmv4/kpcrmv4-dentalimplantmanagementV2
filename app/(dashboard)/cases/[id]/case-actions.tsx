"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Loader2,
  Package,
  ShieldCheck,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { assignLot, cancelCase, markCaseReady, closeCaseWithUsage } from "@/lib/actions/cases"
import { suggestLotFEFO } from "@/lib/actions/inventory"
import { PhotoUpload } from "@/components/photo-upload"

interface Reservation {
  id: string
  status: string
  productId: string
  productName: string
  productBrand: string
  productRef: string
  productUnit: string
  quantityReserved: number
  quantityUsed: number | null
  inventoryId: string | null
  lotNumber: string | null
  photoUrl: string | null
}

interface UsageRecord {
  reservationId: string
  quantityUsed: number
  photoUploaded: boolean
}

interface LotOption {
  id: string
  lot_number: string
  expiry_date: string | null
  available: number
}

export function CaseActions({
  caseId,
  caseStatus,
  canCancel,
  reservations,
}: {
  caseId: string
  caseStatus: string
  canCancel: boolean
  reservations: Reservation[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // === Usage recording (local state, not saved yet) ===
  const [usageRecords, setUsageRecords] = useState<Map<string, UsageRecord>>(new Map())

  // === Usage dialog ===
  const [usageDialog, setUsageDialog] = useState<Reservation | null>(null)
  const [editQty, setEditQty] = useState("")
  const [editPhotoUploaded, setEditPhotoUploaded] = useState(false)
  const [overuseConfirm, setOveruseConfirm] = useState(false)

  // === Assign LOT dialog ===
  const [assignDialog, setAssignDialog] = useState<Reservation | null>(null)
  const [lots, setLots] = useState<LotOption[]>([])
  const [selectedLot, setSelectedLot] = useState("")
  const [lotsLoading, setLotsLoading] = useState(false)

  // === Ready dialog ===
  const [readyDialog, setReadyDialog] = useState(false)
  const [unpreparedItems, setUnpreparedItems] = useState<Array<{ id: string; productName: string }>>([])

  // === Close case dialog ===
  const [closeCaseDialog, setCloseCaseDialog] = useState(false)

  // === Cancel dialog ===
  const [cancelDialog, setCancelDialog] = useState(false)

  const reservedItems = reservations.filter((r) => r.status === "reserved")
  const preparedItems = reservations.filter((r) => r.status === "prepared")
  const consumedItems = reservations.filter((r) => r.status === "consumed")

  // Items that can be recorded (prepared but not yet consumed on server)
  const recordableItems = preparedItems

  // Check if an item has a local usage record
  function getUsageRecord(reservationId: string): UsageRecord | undefined {
    return usageRecords.get(reservationId)
  }

  // All recordable items have been recorded locally
  const allRecorded = recordableItems.length > 0 && recordableItems.every((r) => usageRecords.has(r.id))

  // === Usage Dialog Handlers ===
  function openUsageDialog(r: Reservation) {
    const existing = usageRecords.get(r.id)
    setUsageDialog(r)
    setEditQty(existing ? String(existing.quantityUsed) : String(r.quantityReserved))
    setEditPhotoUploaded(existing?.photoUploaded ?? !!r.photoUrl)
    setOveruseConfirm(false)
  }

  function confirmUsage() {
    if (!usageDialog) return
    const qty = parseInt(editQty, 10)
    if (isNaN(qty) || qty < 0) return

    // Check if over-reserved and not yet confirmed
    if (qty > usageDialog.quantityReserved && !overuseConfirm) {
      setOveruseConfirm(true)
      return
    }

    // Save to local state
    setUsageRecords((prev: Map<string, UsageRecord>) => {
      const next = new Map(prev)
      next.set(usageDialog.id, {
        reservationId: usageDialog.id,
        quantityUsed: qty,
        photoUploaded: editPhotoUploaded,
      })
      return next
    })
    setUsageDialog(null)
    setOveruseConfirm(false)
  }

  function removeUsageRecord(reservationId: string) {
    setUsageRecords((prev: Map<string, UsageRecord>) => {
      const next = new Map(prev)
      next.delete(reservationId)
      return next
    })
  }

  // === Assign LOT Handlers ===
  async function openAssignDialog(r: Reservation) {
    setAssignDialog(r)
    setSelectedLot("")
    setLotsLoading(true)
    try {
      const data = await suggestLotFEFO(r.productId, r.quantityReserved)
      setLots(data)
    } catch {
      setLots([])
    } finally {
      setLotsLoading(false)
    }
  }

  function handleAssignLot() {
    if (!assignDialog || !selectedLot) return
    setError(null)
    startTransition(async () => {
      try {
        await assignLot(assignDialog.id, selectedLot)
        setAssignDialog(null)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
      }
    })
  }

  // === Mark Ready Handler ===
  function handleMarkReady() {
    setError(null)
    setUnpreparedItems([])
    startTransition(async () => {
      try {
        const result = await markCaseReady(caseId)
        if (!result.success) {
          setUnpreparedItems(result.unprepared)
          return
        }
        setReadyDialog(false)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
      }
    })
  }

  // === Close Case Handler ===
  function handleCloseCase() {
    setError(null)
    const records: UsageRecord[] = []
    usageRecords.forEach((v: UsageRecord) => records.push(v))
    const usageData = records.map((u) => ({
      reservationId: u.reservationId,
      quantityUsed: u.quantityUsed,
    }))

    startTransition(async () => {
      try {
        await closeCaseWithUsage(caseId, usageData)
        setCloseCaseDialog(false)
        setUsageRecords(new Map())
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
      }
    })
  }

  // === Cancel Handler ===
  function handleCancelCase() {
    setError(null)
    startTransition(async () => {
      try {
        await cancelCase(caseId)
        setCancelDialog(false)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
      }
    })
  }

  // Build close case summary data
  function buildCloseSummary() {
    return recordableItems.map((r) => {
      const record = usageRecords.get(r.id)
      return {
        ...r,
        actualUsed: record?.quantityUsed ?? 0,
        willReturn: record ? Math.max(0, r.quantityReserved - record.quantityUsed) : r.quantityReserved,
        isOveruse: record ? record.quantityUsed > r.quantityReserved : false,
      }
    })
  }

  return (
    <>
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto shrink-0">
            <X className="h-4 w-4 text-destructive" />
          </button>
        </div>
      )}

      {/* ─── Section: Assign LOT (for reserved items) ─── */}
      {reservedItems.length > 0 && (
        <div className="rounded-xl border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Package className="h-3.5 w-3.5 text-orange-500" />
            <h2 className="text-sm font-semibold">รอจัด LOT ({reservedItems.length})</h2>
          </div>
          <div className="space-y-1.5">
            {reservedItems.map((r) => (
              <button
                key={r.id}
                onClick={() => openAssignDialog(r)}
                className="flex w-full items-center gap-3 rounded-lg border-2 border-dashed border-orange-300 dark:border-orange-500/40 bg-orange-50 dark:bg-orange-500/10 p-3 text-left active:scale-[0.98] transition-transform"
              >
                <Package className="h-5 w-5 shrink-0 text-orange-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{r.productName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {r.productBrand} · จำนวน {r.quantityReserved} {r.productUnit}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Section: Mark Ready (only when all items are prepared, no reserved left) ─── */}
      {caseStatus === "pending_preparation" && reservations.length > 0 && reservedItems.length === 0 && (
        <Button
          className="w-full bg-green-600 hover:bg-green-700 text-white h-11"
          onClick={() => { setUnpreparedItems([]); setReadyDialog(true) }}
        >
          <ShieldCheck className="mr-2 h-4 w-4" />
          ยืนยันเคสพร้อมแล้ว
        </Button>
      )}

      {/* ─── Section: Record Usage (for prepared items) ─── */}
      {recordableItems.length > 0 && (
        <div className="rounded-xl border-2 border-blue-200 dark:border-blue-500/30 bg-card p-3">
          <div className="flex items-center gap-1.5 mb-3">
            <ClipboardCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-semibold">บันทึกการใช้วัสดุ</h2>
            {allRecorded && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-500/20 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:text-green-400">
                <Check className="h-3 w-3" /> บันทึกครบ
              </span>
            )}
          </div>

          <div className="space-y-2">
            {recordableItems.map((r) => {
              const record = getUsageRecord(r.id)
              const isRecorded = !!record
              const isOveruse = record ? record.quantityUsed > r.quantityReserved : false

              return (
                <div key={r.id} className="relative">
                  <button
                    onClick={() => openUsageDialog(r)}
                    className={`flex w-full items-center gap-3 rounded-lg border-2 p-3 text-left active:scale-[0.98] transition-all ${
                      isRecorded
                        ? isOveruse
                          ? "border-amber-400 dark:border-amber-500/50 bg-amber-50 dark:bg-amber-500/10"
                          : "border-green-400 dark:border-green-500/50 bg-green-50 dark:bg-green-500/10"
                        : "border-blue-300 dark:border-blue-500/40 bg-blue-50 dark:bg-blue-500/10"
                    }`}
                  >
                    {isRecorded ? (
                      <CheckCircle2 className={`h-5 w-5 shrink-0 ${isOveruse ? "text-amber-500" : "text-green-600 dark:text-green-400"}`} />
                    ) : (
                      <Camera className="h-5 w-5 shrink-0 text-blue-500" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{r.productName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {r.productBrand} · REF: {r.productRef}
                      </p>
                      {isRecorded ? (
                        <p className="text-[11px] font-medium mt-0.5">
                          <span className="text-muted-foreground">จอง: {r.quantityReserved}</span>
                          {" → "}
                          <span className={isOveruse ? "text-amber-600 dark:text-amber-400" : "text-green-700 dark:text-green-400"}>
                            ใช้จริง: {record.quantityUsed} {r.productUnit}
                          </span>
                          {isOveruse && " ⚠️"}
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          จอง: {r.quantityReserved} {r.productUnit}
                          {r.lotNumber ? ` · LOT: ${r.lotNumber}` : ""}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                  {isRecorded && (
                    <button
                      onClick={(e: React.MouseEvent) => { e.stopPropagation(); removeUsageRecord(r.id) }}
                      className="absolute -top-1.5 -right-1.5 rounded-full bg-muted border p-0.5 shadow-sm hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* ─── Close Case Button ─── */}
          <Separator className="my-3" />
          <Button
            className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700 text-white"
            disabled={!allRecorded}
            onClick={() => setCloseCaseDialog(true)}
          >
            <CheckCircle2 className="mr-2 h-5 w-5" />
            ปิดเคส
          </Button>
          {!allRecorded && (
            <p className="text-center text-[11px] text-muted-foreground mt-1.5">
              กรุณาบันทึกการใช้วัสดุให้ครบทุกรายการก่อนปิดเคส
            </p>
          )}
        </div>
      )}

      {/* ─── Already consumed summary + close case if not yet completed ─── */}
      {consumedItems.length > 0 && recordableItems.length === 0 && (
        <div className="rounded-xl border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
            <h2 className="text-sm font-semibold">วัสดุที่ใช้แล้ว ({consumedItems.length})</h2>
          </div>
          <div className="space-y-1">
            {consumedItems.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border p-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{r.productName}</p>
                  <p className="text-[11px] text-muted-foreground">{r.productBrand}</p>
                </div>
                <p className="text-sm font-medium shrink-0 ml-2">
                  ใช้ {r.quantityUsed ?? r.quantityReserved} {r.productUnit}
                </p>
              </div>
            ))}
          </div>

          {/* Close case button if all consumed but case not yet completed */}
          {reservedItems.length === 0 && preparedItems.length === 0 && caseStatus !== "completed" && (
            <>
              <Separator className="my-3" />
              <Button
                className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    try {
                      await closeCaseWithUsage(caseId, consumedItems.map((r) => ({
                        reservationId: r.id,
                        quantityUsed: r.quantityUsed ?? r.quantityReserved,
                        photoUrl: r.photoUrl ?? null,
                      })))
                      router.refresh()
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
                    }
                  })
                }}
              >
                {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                ปิดเคส
              </Button>
            </>
          )}
        </div>
      )}

      {/* ─── Cancel Case Button ─── */}
      {canCancel && (
        <button
          onClick={() => setCancelDialog(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/30 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Ban className="h-3.5 w-3.5" />
          ยกเลิกเคส
        </button>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/* DIALOGS                                        */}
      {/* ══════════════════════════════════════════════ */}

      {/* ── Usage Dialog ── */}
      <Dialog open={!!usageDialog} onOpenChange={(open: boolean) => { if (!open) { setUsageDialog(null); setOveruseConfirm(false) } }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              บันทึกการใช้: {usageDialog?.productName}
            </DialogTitle>
            <DialogDescription>
              จำนวนที่จอง: {usageDialog?.quantityReserved} {usageDialog?.productUnit}
              {usageDialog?.lotNumber ? ` · LOT: ${usageDialog.lotNumber}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="qty_used" className="text-sm">จำนวนที่ใช้จริง</Label>
              <Input
                id="qty_used"
                type="number"
                inputMode="numeric"
                min={0}
                value={editQty}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setEditQty(e.target.value); setOveruseConfirm(false) }}
                className="h-12 text-lg text-center"
              />
            </div>

            {usageDialog && (
              <PhotoUpload
                caseId={caseId}
                reservationId={usageDialog.id}
                existingPhotoUrl={usageDialog.photoUrl}
                onUploaded={() => setEditPhotoUploaded(true)}
              />
            )}

            {/* Overuse warning */}
            {overuseConfirm && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-500/10 p-3">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    ใช้มากกว่าที่จอง
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                    จอง {usageDialog?.quantityReserved} แต่ใช้จริง {editQty} {usageDialog?.productUnit}
                    — กดยืนยันอีกครั้งเพื่อบันทึก
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              className="w-full h-11"
              onClick={confirmUsage}
              disabled={!editQty || parseInt(editQty, 10) < 0}
            >
              {overuseConfirm ? "ยืนยันใช้เกินจำนวน" : "บันทึก"}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => { setUsageDialog(null); setOveruseConfirm(false) }}>
              ยกเลิก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign LOT Dialog ── */}
      <Dialog open={!!assignDialog} onOpenChange={(open: boolean) => !open && setAssignDialog(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>เลือก LOT: {assignDialog?.productName}</DialogTitle>
            <DialogDescription>
              ต้องการ {assignDialog?.quantityReserved} {assignDialog?.productUnit} — เรียงตาม FEFO
            </DialogDescription>
          </DialogHeader>
          {lotsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : lots.length === 0 ? (
            <p className="py-4 text-center text-sm text-destructive">ไม่มี LOT ที่พร้อมใช้</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
              {lots.map((lot: LotOption) => (
                <button
                  key={lot.id}
                  type="button"
                  onClick={() => setSelectedLot(lot.id)}
                  className={`flex items-center justify-between rounded-lg border p-3 text-left text-sm transition-colors ${
                    selectedLot === lot.id
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <div>
                    <div className="font-medium">{lot.lot_number}</div>
                    <div className="text-muted-foreground text-xs">
                      เหลือ {lot.available} ชิ้น
                      {lot.expiry_date ? ` · Exp: ${lot.expiry_date}` : ""}
                    </div>
                  </div>
                  {selectedLot === lot.id && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button className="w-full h-11" onClick={handleAssignLot} disabled={!selectedLot || isPending}>
              {isPending ? "กำลังบันทึก..." : "ยืนยัน"}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setAssignDialog(null)}>ยกเลิก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Mark Ready Dialog ── */}
      <Dialog open={readyDialog} onOpenChange={(open: boolean) => { if (!open) { setReadyDialog(false); setUnpreparedItems([]) } }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ยืนยันเคสพร้อม</DialogTitle>
            <DialogDescription>
              ระบบจะตรวจสอบว่าวัสดุทุกรายการจัดเตรียมเรียบร้อยแล้ว
            </DialogDescription>
          </DialogHeader>
          {unpreparedItems.length > 0 && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertCircle className="h-4 w-4" />
                วัสดุยังไม่พร้อม ({unpreparedItems.length} รายการ)
              </div>
              <ul className="list-disc list-inside text-sm text-destructive/90 space-y-0.5">
                {unpreparedItems.map((item: { id: string; productName: string }) => (
                  <li key={item.id}>{item.productName}</li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">กรุณาจัด LOT ให้ครบก่อน</p>
            </div>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              className="w-full h-11 bg-green-600 hover:bg-green-700 text-white"
              onClick={handleMarkReady}
              disabled={isPending}
            >
              {isPending ? "กำลังตรวจสอบ..." : "ยืนยันพร้อม"}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => { setReadyDialog(false); setUnpreparedItems([]) }}>ยกเลิก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Close Case Summary Dialog ── */}
      <Dialog open={closeCaseDialog} onOpenChange={setCloseCaseDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">สรุปการปิดเคส</DialogTitle>
            <DialogDescription>
              ตรวจสอบข้อมูลก่อนยืนยัน ระบบจะตัดสต๊อกตามจริงและคืนรายการที่ไม่ได้ใช้
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[50vh] overflow-y-auto space-y-2">
            {buildCloseSummary().map((item) => (
              <div
                key={item.id}
                className={`rounded-lg border p-3 space-y-1 ${
                  item.isOveruse
                    ? "border-amber-300 bg-amber-50 dark:bg-amber-500/10"
                    : item.willReturn > 0
                    ? "border-blue-200 bg-blue-50 dark:bg-blue-500/10"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium">{item.productName}</p>
                  {item.isOveruse && <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">จอง</span>
                    <p className="font-medium">{item.quantityReserved} {item.productUnit}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ใช้จริง</span>
                    <p className={`font-medium ${item.isOveruse ? "text-amber-600 dark:text-amber-400" : "text-green-700 dark:text-green-400"}`}>
                      {item.actualUsed} {item.productUnit}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">คืน</span>
                    <p className={`font-medium ${item.willReturn > 0 ? "text-blue-600 dark:text-blue-400" : ""}`}>
                      {item.willReturn > 0 ? `${item.willReturn} ${item.productUnit}` : "-"}
                    </p>
                  </div>
                </div>
                {item.lotNumber && (
                  <p className="text-[11px] text-muted-foreground">LOT: {item.lotNumber}</p>
                )}
              </div>
            ))}
          </div>

          <Separator />

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleCloseCase}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  ยืนยันปิดเคส
                </>
              )}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setCloseCaseDialog(false)} disabled={isPending}>
              ย้อนกลับ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cancel Dialog ── */}
      <Dialog open={cancelDialog} onOpenChange={setCancelDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ยืนยันการยกเลิกเคส</DialogTitle>
            <DialogDescription>
              วัสดุที่จองไว้ทั้งหมดจะถูกคืนเข้าสต๊อก การกระทำนี้ไม่สามารถย้อนกลับได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button variant="destructive" className="w-full h-11" onClick={handleCancelCase} disabled={isPending}>
              {isPending ? "กำลังยกเลิก..." : "ยืนยันยกเลิก"}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setCancelDialog(false)}>ไม่ยกเลิก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
