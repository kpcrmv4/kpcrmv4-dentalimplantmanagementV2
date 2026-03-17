"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Loader2,
  Package,
  ShieldCheck,
  User,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { assignLot, markCaseReady } from "@/lib/actions/cases"
import { suggestLotFEFO } from "@/lib/actions/inventory"
import { format, parseISO, isToday, isTomorrow } from "date-fns"
import { th } from "date-fns/locale"
import type { PreparationCase, PreparationReservation } from "@/lib/actions/preparation"

function formatDateLabel(dateStr: string | null): string {
  if (!dateStr) return "ไม่ระบุวัน"
  const d = parseISO(dateStr)
  if (isToday(d)) return "วันนี้"
  if (isTomorrow(d)) return "พรุ่งนี้"
  return format(d, "EEE d MMM", { locale: th })
}

interface LotOption {
  id: string
  lot_number: string
  expiry_date: string | null
  available: number
}

export function PreparationList({
  pending,
  ready,
}: {
  pending: PreparationCase[]
  ready: PreparationCase[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [expandedCase, setExpandedCase] = useState<string | null>(
    pending.length > 0 ? pending[0].id : null
  )
  const [error, setError] = useState<string | null>(null)

  // Assign LOT dialog state
  const [assignDialog, setAssignDialog] = useState<PreparationReservation | null>(null)

  const [lots, setLots] = useState<LotOption[]>([])
  const [selectedLot, setSelectedLot] = useState("")
  const [lotsLoading, setLotsLoading] = useState(false)

  // Ready dialog state
  const [readyDialog, setReadyDialog] = useState<string | null>(null)
  const [unpreparedItems, setUnpreparedItems] = useState<Array<{ id: string; productName: string }>>([])

  function toggleCase(caseId: string) {
    setExpandedCase((prev) => (prev === caseId ? null : caseId))
  }

  async function openAssignDialog(r: PreparationReservation, caseId: string) {
    setAssignDialog(r)
    setAssignCaseId(caseId)
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

  function handleMarkReady(caseId: string) {
    setError(null)
    setUnpreparedItems([])
    startTransition(async () => {
      try {
        const result = await markCaseReady(caseId)
        if (!result.success) {
          setUnpreparedItems(result.unprepared)
          setReadyDialog(caseId)
          return
        }
        setReadyDialog(null)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
      }
    })
  }

  return (
    <>
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto shrink-0">
            <X className="h-4 w-4 text-destructive" />
          </button>
        </div>
      )}

      {/* ─── Section: Pending Preparation ─── */}
      {pending.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Package className="h-4 w-4 text-orange-500" />
            <h2 className="text-sm font-semibold">รอจัดของ ({pending.length})</h2>
          </div>
          <div className="space-y-2">
            {pending.map((c) => {
              const isExpanded = expandedCase === c.id
              const allPrepared = c.preparedItems === c.totalItems && c.totalItems > 0
              return (
                <div
                  key={c.id}
                  className={cn(
                    "rounded-xl border bg-card overflow-hidden transition-all",
                    c.isUrgent && "border-red-300 dark:border-red-500/40"
                  )}
                >
                  {/* Case Header (expandable) */}
                  <button
                    onClick={() => toggleCase(c.id)}
                    className="flex w-full items-center gap-3 p-3 text-left active:bg-muted/50 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold">{c.caseNumber}</span>
                        {c.isUrgent && (
                          <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">
                            ด่วน
                          </Badge>
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          {formatDateLabel(c.scheduledDate)}
                          {c.scheduledTime ? ` ${c.scheduledTime.slice(0, 5)}` : ""}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <User className="h-3 w-3 shrink-0" />
                        <span className="truncate">{c.patientName}</span>
                        <span>({c.patientHn})</span>
                      </div>
                    </div>
                    {/* Progress */}
                    <div className="shrink-0 text-right">
                      <span
                        className={cn(
                          "text-sm font-bold",
                          allPrepared
                            ? "text-green-600 dark:text-green-400"
                            : "text-orange-600 dark:text-orange-400"
                        )}
                      >
                        {c.preparedItems}/{c.totalItems}
                      </span>
                      <div className="mt-1 h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            allPrepared ? "bg-green-500" : "bg-orange-500"
                          )}
                          style={{
                            width: c.totalItems > 0 ? `${(c.preparedItems / c.totalItems) * 100}%` : "0%",
                          }}
                        />
                      </div>
                    </div>
                  </button>

                  {/* Expanded: Reservation List */}
                  {isExpanded && (
                    <div className="border-t px-3 pb-3 pt-2 space-y-1.5">
                      {c.reservations.map((r) => {
                        const isPrepared = r.status === "prepared" || r.status === "consumed"
                        return (
                          <button
                            key={r.id}
                            disabled={isPrepared}
                            onClick={() => !isPrepared && openAssignDialog(r, c.id)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-lg border-2 p-2.5 text-left transition-all",
                              isPrepared
                                ? "border-green-300 dark:border-green-500/40 bg-green-50 dark:bg-green-500/10 cursor-default"
                                : "border-dashed border-orange-300 dark:border-orange-500/40 bg-orange-50 dark:bg-orange-500/10 active:scale-[0.98]"
                            )}
                          >
                            {isPrepared ? (
                              <Check className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                            ) : (
                              <Package className="h-4 w-4 shrink-0 text-orange-500" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium">{r.productName}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {r.productBrand} · {r.quantityReserved} {r.productUnit}
                                {isPrepared && r.lotNumber ? ` · LOT: ${r.lotNumber}` : ""}
                              </p>
                            </div>
                            {!isPrepared && (
                              <span className="shrink-0 text-[10px] font-medium text-orange-600 dark:text-orange-400">
                                เลือก LOT
                              </span>
                            )}
                          </button>
                        )
                      })}

                      {/* Mark Ready button */}
                      {allPrepared && (
                        <Button
                          className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white"
                          size="sm"
                          onClick={() => {
                            setReadyDialog(c.id)
                            handleMarkReady(c.id)
                          }}
                          disabled={isPending}
                        >
                          <ShieldCheck className="mr-1.5 h-4 w-4" />
                          ยืนยันเคสพร้อมแล้ว
                        </Button>
                      )}

                      {/* Link to case detail */}
                      <Link
                        href={`/cases/${c.id}`}
                        className="flex items-center justify-center gap-1 pt-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
                      >
                        <ClipboardCheck className="h-3 w-3" />
                        ดูรายละเอียดเคส
                      </Link>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── Section: Ready Cases ─── */}
      {ready.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <ClipboardCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
            <h2 className="text-sm font-semibold">พร้อมแล้ว - รอบันทึกใช้ ({ready.length})</h2>
          </div>
          <div className="space-y-1.5">
            {ready.map((c) => (
              <Link key={c.id} href={`/cases/${c.id}`}>
                <div className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/50">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/20">
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold">{c.caseNumber}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDateLabel(c.scheduledDate)}
                        {c.scheduledTime ? ` ${c.scheduledTime.slice(0, 5)}` : ""}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <User className="h-3 w-3 shrink-0" />
                      <span className="truncate">{c.patientName}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {pending.length === 0 && ready.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <ClipboardCheck className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">ไม่มีเคสที่ต้องจัดเตรียม</p>
        </div>
      )}

      {/* ══════════════ DIALOGS ══════════════ */}

      {/* Assign LOT Dialog */}
      <Dialog open={!!assignDialog} onOpenChange={(open) => !open && setAssignDialog(null)}>
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
            <Select value={selectedLot} onValueChange={setSelectedLot}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="เลือก LOT" />
              </SelectTrigger>
              <SelectContent>
                {lots.map((lot) => (
                  <SelectItem key={lot.id} value={lot.id}>
                    {lot.lot_number} · เหลือ {lot.available} ชิ้น
                    {lot.expiry_date ? ` · Exp: ${lot.expiry_date}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button className="w-full h-11" onClick={handleAssignLot} disabled={!selectedLot || isPending}>
              {isPending ? "กำลังบันทึก..." : "ยืนยัน"}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setAssignDialog(null)}>
              ยกเลิก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Ready Dialog (shows when unprepared items found) */}
      <Dialog
        open={!!readyDialog && unpreparedItems.length > 0}
        onOpenChange={(open) => {
          if (!open) {
            setReadyDialog(null)
            setUnpreparedItems([])
          }
        }}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ยังจัดของไม่ครบ</DialogTitle>
            <DialogDescription>
              ยังมีวัสดุที่ยังไม่ได้ assign LOT
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 space-y-2">
            <ul className="list-disc list-inside text-sm text-destructive/90 space-y-0.5">
              {unpreparedItems.map((item) => (
                <li key={item.id}>{item.productName}</li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">กรุณาจัด LOT ให้ครบก่อน</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setReadyDialog(null)
                setUnpreparedItems([])
              }}
            >
              เข้าใจแล้ว
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
