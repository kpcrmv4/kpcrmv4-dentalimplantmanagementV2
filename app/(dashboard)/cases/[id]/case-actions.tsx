"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Ban, CheckCircle, Package, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { assignLot, recordUsage, cancelCase, markCaseReady } from "@/lib/actions/cases"
import { suggestLotFEFO } from "@/lib/actions/inventory"
import { PhotoUpload } from "@/components/photo-upload"

interface Reservation {
  id: string
  status: string
  productId: string
  productName: string
  quantityReserved: number
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

  // Assign LOT dialog
  const [assignDialog, setAssignDialog] = useState<Reservation | null>(null)
  const [lots, setLots] = useState<LotOption[]>([])
  const [selectedLot, setSelectedLot] = useState("")
  const [lotsLoading, setLotsLoading] = useState(false)

  // Usage dialog
  const [usageDialog, setUsageDialog] = useState<Reservation | null>(null)
  const [quantityUsed, setQuantityUsed] = useState("")
  const [photoUploaded, setPhotoUploaded] = useState(false)

  // Ready dialog
  const [readyDialog, setReadyDialog] = useState(false)
  const [unpreparedItems, setUnpreparedItems] = useState<Array<{ id: string; productName: string }>>([])

  // Cancel dialog
  const [cancelDialog, setCancelDialog] = useState(false)

  const reservedItems = reservations.filter((r) => r.status === "reserved")
  const preparedItems = reservations.filter((r) => r.status === "prepared")

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

  function openUsageDialog(r: Reservation) {
    setUsageDialog(r)
    setQuantityUsed(String(r.quantityReserved))
    setPhotoUploaded(false)
  }

  function handleRecordUsage() {
    if (!usageDialog || !quantityUsed) return
    setError(null)
    startTransition(async () => {
      try {
        await recordUsage(usageDialog.id, parseInt(quantityUsed, 10))
        setUsageDialog(null)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
      }
    })
  }

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

  return (
    <>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {/* Assign LOT buttons */}
        {reservedItems.length > 0 && (
          <div className="w-full space-y-2">
            <p className="text-xs font-medium text-muted-foreground">รอจัด LOT ({reservedItems.length} รายการ)</p>
            {reservedItems.map((r) => (
              <Button
                key={r.id}
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => openAssignDialog(r)}
              >
                <Package className="mr-2 h-3.5 w-3.5" />
                จัด LOT: {r.productName} ({r.quantityReserved})
              </Button>
            ))}
          </div>
        )}

        {/* Record Usage buttons */}
        {preparedItems.length > 0 && (
          <div className="w-full space-y-2">
            <p className="text-xs font-medium text-muted-foreground">พร้อมบันทึกการใช้ ({preparedItems.length} รายการ)</p>
            {preparedItems.map((r) => (
              <Button
                key={r.id}
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => openUsageDialog(r)}
              >
                <CheckCircle className="mr-2 h-3.5 w-3.5" />
                บันทึกการใช้: {r.productName}
              </Button>
            ))}
          </div>
        )}

        {/* Mark as Ready */}
        {caseStatus === "pending_preparation" && reservations.length > 0 && (
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => {
              setUnpreparedItems([])
              setReadyDialog(true)
            }}
          >
            <ShieldCheck className="mr-2 h-3.5 w-3.5" />
            พร้อมแล้ว
          </Button>
        )}

        {/* Cancel Case */}
        {canCancel && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setCancelDialog(true)}
          >
            <Ban className="mr-2 h-3.5 w-3.5" />
            ยกเลิกเคส
          </Button>
        )}
      </div>

      {/* Assign LOT Dialog */}
      <Dialog open={!!assignDialog} onOpenChange={(open) => !open && setAssignDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เลือก LOT สำหรับ {assignDialog?.productName}</DialogTitle>
            <DialogDescription>
              ต้องการ {assignDialog?.quantityReserved} ชิ้น — เรียงตาม FEFO (หมดอายุเร็วสุดก่อน)
            </DialogDescription>
          </DialogHeader>
          {lotsLoading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">กำลังโหลด...</p>
          ) : lots.length === 0 ? (
            <p className="py-4 text-center text-sm text-destructive">ไม่มี LOT ที่พร้อมใช้</p>
          ) : (
            <Select value={selectedLot} onValueChange={setSelectedLot}>
              <SelectTrigger>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(null)}>ยกเลิก</Button>
            <Button onClick={handleAssignLot} disabled={!selectedLot || isPending}>
              {isPending ? "กำลังบันทึก..." : "ยืนยัน"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Usage Dialog */}
      <Dialog open={!!usageDialog} onOpenChange={(open) => !open && setUsageDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>บันทึกการใช้: {usageDialog?.productName}</DialogTitle>
            <DialogDescription>
              จำนวนที่จอง: {usageDialog?.quantityReserved} ชิ้น
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="qty_used">จำนวนที่ใช้จริง</Label>
            <Input
              id="qty_used"
              type="number"
              min={0}
              max={usageDialog?.quantityReserved ?? 0}
              value={quantityUsed}
              onChange={(e) => setQuantityUsed(e.target.value)}
            />
          </div>
          {usageDialog && (
            <PhotoUpload
              caseId={caseId}
              reservationId={usageDialog.id}
              onUploaded={() => setPhotoUploaded(true)}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUsageDialog(null)}>ยกเลิก</Button>
            <Button onClick={handleRecordUsage} disabled={!quantityUsed || !photoUploaded || isPending}>
              {isPending ? "กำลังบันทึก..." : "ยืนยัน"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Ready Dialog */}
      <Dialog open={readyDialog} onOpenChange={(open) => { if (!open) { setReadyDialog(false); setUnpreparedItems([]) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันเคสพร้อมแล้ว</DialogTitle>
            <DialogDescription>
              ระบบจะตรวจสอบว่าวัสดุทุกรายการได้รับการจัดเตรียม (จัด LOT) เรียบร้อยแล้ว
            </DialogDescription>
          </DialogHeader>
          {unpreparedItems.length > 0 && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertCircle className="h-4 w-4" />
                วัสดุยังไม่พร้อม ({unpreparedItems.length} รายการ)
              </div>
              <ul className="list-disc list-inside text-sm text-destructive/90 space-y-0.5">
                {unpreparedItems.map((item) => (
                  <li key={item.id}>{item.productName}</li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">กรุณาจัด LOT ให้ครบทุกรายการก่อนกดพร้อม</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReadyDialog(false); setUnpreparedItems([]) }}>ยกเลิก</Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleMarkReady}
              disabled={isPending}
            >
              {isPending ? "กำลังตรวจสอบ..." : "ยืนยันพร้อม"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Case Dialog */}
      <Dialog open={cancelDialog} onOpenChange={setCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการยกเลิกเคส</DialogTitle>
            <DialogDescription>
              วัสดุที่จองไว้ทั้งหมดจะถูกคืนเข้าสต๊อก การกระทำนี้ไม่สามารถย้อนกลับได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog(false)}>ไม่ยกเลิก</Button>
            <Button variant="destructive" onClick={handleCancelCase} disabled={isPending}>
              {isPending ? "กำลังยกเลิก..." : "ยืนยันยกเลิก"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
