"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Loader2,
  Minus,
  Package,
  Pencil,
  Plus,
  Search,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { returnReservation, addMaterialToCase } from "@/lib/actions/cases"
import { getProducts } from "@/lib/actions/products"

const RESERVATION_STATUS: Record<string, { label: string; color: string }> = {
  reserved: { label: "จองแล้ว", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400" },
  prepared: { label: "จัดเตรียมแล้ว", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" },
  consumed: { label: "ใช้แล้ว", color: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" },
  returned: { label: "คืนแล้ว", color: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400" },
}

interface ReservationItem {
  id: string
  status: string
  productId: string
  productName: string
  productBrand: string
  productRef: string
  productUnit: string
  quantityReserved: number
  lotNumber: string | null
  expiryDate: string | null
}

interface ProductOption {
  id: string
  name: string
  brand: string | null
  ref: string
  unit: string
  totalStock: number
}

export function CaseMaterialsEditor({
  caseId,
  caseStatus,
  reservations,
  formatDate,
}: {
  caseId: string
  caseStatus: string
  reservations: ReservationItem[]
  formatDate: (d: string) => string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Remove confirmation dialog
  const [removeDialog, setRemoveDialog] = useState<ReservationItem | null>(null)

  // Add material dialog
  const [addDialog, setAddDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<ProductOption[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null)
  const [addQuantity, setAddQuantity] = useState("1")

  // Save result notification
  const [saveResult, setSaveResult] = useState<{ outOfStock: string[] } | null>(null)

  const canEdit = ["ready", "pending_preparation"].includes(caseStatus)
  const activeReservations = reservations.filter((r) => !["returned", "consumed"].includes(r.status))

  // === Remove Handlers ===
  function handleRemove(r: ReservationItem) {
    setRemoveDialog(r)
  }

  function confirmRemove() {
    if (!removeDialog) return
    setError(null)
    startTransition(async () => {
      try {
        await returnReservation(removeDialog.id)
        setRemoveDialog(null)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
      }
    })
  }

  // === Add Material Handlers ===
  async function handleSearch(query: string) {
    setSearchQuery(query)
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    setSearchLoading(true)
    try {
      const products = await getProducts({ search: query })
      setSearchResults(products.map((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        ref: p.ref,
        unit: p.unit,
        totalStock: p.totalStock,
      })))
    } catch {
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  function openAddDialog() {
    setAddDialog(true)
    setSearchQuery("")
    setSearchResults([])
    setSelectedProduct(null)
    setAddQuantity("1")
  }

  function confirmAdd() {
    if (!selectedProduct) return
    const qty = parseInt(addQuantity, 10)
    if (isNaN(qty) || qty <= 0) return

    setError(null)
    startTransition(async () => {
      try {
        const result = await addMaterialToCase(caseId, selectedProduct.id, qty)
        setAddDialog(false)

        if (!result.hasStock) {
          setSaveResult({ outOfStock: [selectedProduct.name] })
        }

        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
      }
    })
  }

  return (
    <>
      {/* Materials Section */}
      <div className="rounded-xl border bg-card p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            <h2 className="text-sm font-semibold">วัสดุที่สั่ง ({activeReservations.length})</h2>
          </div>
          {canEdit && (
            <Button
              size="sm"
              variant={isEditing ? "default" : "outline"}
              className="h-7 text-xs"
              onClick={() => {
                setIsEditing(!isEditing)
                setSaveResult(null)
              }}
            >
              {isEditing ? (
                <><Check className="mr-1 h-3 w-3" /> เสร็จ</>
              ) : (
                <><Pencil className="mr-1 h-3 w-3" /> แก้ไข</>
              )}
            </Button>
          )}
        </div>

        {/* Out of stock warning */}
        {saveResult && saveResult.outOfStock.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-500/10 p-2.5 mb-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                วัสดุไม่เพียงพอในสต๊อก
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                {saveResult.outOfStock.join(", ")} — สถานะเคสเปลี่ยนเป็น &quot;รอจัดของ&quot;
              </p>
              <button
                onClick={() => setSaveResult(null)}
                className="text-[11px] text-amber-600 underline mt-1"
              >
                ปิด
              </button>
            </div>
          </div>
        )}

        {activeReservations.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            ยังไม่มีรายการวัสดุ
          </p>
        ) : (
          <div className="space-y-1.5">
            {reservations.map((r) => {
              if (["returned", "consumed"].includes(r.status) && !isEditing) return null
              const rStatus = RESERVATION_STATUS[r.status] ?? RESERVATION_STATUS.reserved
              const isActive = !["returned", "consumed"].includes(r.status)

              return (
                <div
                  key={r.id}
                  className={`flex items-start gap-2 rounded-lg border p-2.5 ${
                    !isActive ? "opacity-50" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight">{r.productName}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {r.productBrand} · REF: {r.productRef}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      จำนวน: {r.quantityReserved} {r.productUnit}
                    </p>
                    {r.lotNumber && (
                      <p className="text-[11px] text-muted-foreground">
                        LOT: {r.lotNumber}
                        {r.expiryDate ? ` · Exp: ${formatDate(r.expiryDate)}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${rStatus.color}`}>
                      {rStatus.label}
                    </span>
                    {isEditing && isActive && (
                      <button
                        onClick={() => handleRemove(r)}
                        className="rounded-full p-1 text-destructive hover:bg-destructive/10 transition-colors"
                        title="ลบรายการ"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Add material button */}
        {isEditing && (
          <button
            onClick={openAddDialog}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 p-3 mt-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Plus className="h-4 w-4" />
            เพิ่มวัสดุ
          </button>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto shrink-0">
            <X className="h-4 w-4 text-destructive" />
          </button>
        </div>
      )}

      {/* ── Remove Confirmation Dialog ── */}
      <Dialog open={!!removeDialog} onOpenChange={(open) => !open && setRemoveDialog(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ยืนยันการลบรายการ</DialogTitle>
            <DialogDescription>
              {removeDialog?.productName} จะถูกคืนกลับเข้าสต๊อก
              {removeDialog?.lotNumber ? ` (LOT: ${removeDialog.lotNumber})` : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="destructive"
              className="w-full h-11"
              onClick={confirmRemove}
              disabled={isPending}
            >
              {isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังคืนของ...</>
              ) : (
                "ยืนยันลบ — คืนเข้าสต๊อก"
              )}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setRemoveDialog(null)}>
              ยกเลิก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Material Dialog ── */}
      <Dialog open={addDialog} onOpenChange={(open) => { if (!open) setAddDialog(false) }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>เพิ่มวัสดุ</DialogTitle>
            <DialogDescription>
              ค้นหาสินค้าจากชื่อ, REF, หรือแบรนด์
            </DialogDescription>
          </DialogHeader>

          {!selectedProduct ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาสินค้า..."
                  className="pl-8 h-10"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1">
                {searchLoading && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!searchLoading && searchQuery.length >= 2 && searchResults.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">ไม่พบสินค้า</p>
                )}
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProduct(p)}
                    className="flex w-full items-center justify-between rounded-lg border p-3 text-left text-sm hover:bg-muted transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {p.brand ?? ""} · REF: {p.ref}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className={`text-xs font-medium ${p.totalStock > 0 ? "text-green-600" : "text-destructive"}`}>
                        {p.totalStock > 0 ? `${p.totalStock} ${p.unit}` : "หมด"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border p-3 bg-muted/50">
                <p className="text-sm font-medium">{selectedProduct.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {selectedProduct.brand ?? ""} · REF: {selectedProduct.ref}
                </p>
                <p className={`text-xs mt-1 ${selectedProduct.totalStock > 0 ? "text-green-600" : "text-destructive"}`}>
                  สต๊อกคงเหลือ: {selectedProduct.totalStock} {selectedProduct.unit}
                </p>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="text-xs text-primary underline mt-1"
                >
                  เปลี่ยนสินค้า
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">จำนวน</label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={addQuantity}
                  onChange={(e) => setAddQuantity(e.target.value)}
                  className="h-12 text-lg text-center"
                />
              </div>

              {selectedProduct.totalStock <= 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-500/10 p-3">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                      สินค้าไม่มีในสต๊อก
                    </p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                      สามารถเพิ่มได้ แต่สถานะเคสจะเปลี่ยนเป็น &quot;รอจัดของ&quot;
                    </p>
                  </div>
                </div>
              )}

              {selectedProduct.totalStock > 0 && parseInt(addQuantity, 10) > selectedProduct.totalStock && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-500/10 p-3">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                      จำนวนเกินสต๊อก
                    </p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                      สต๊อกเหลือ {selectedProduct.totalStock} {selectedProduct.unit} — สถานะเคสจะเปลี่ยนเป็น &quot;รอจัดของ&quot;
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            {selectedProduct && (
              <Button
                className="w-full h-11"
                onClick={confirmAdd}
                disabled={isPending || !addQuantity || parseInt(addQuantity, 10) <= 0}
              >
                {isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังเพิ่ม...</>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    เพิ่มวัสดุ
                    {selectedProduct.totalStock <= 0 || parseInt(addQuantity, 10) > selectedProduct.totalStock
                      ? " (ของขาด)"
                      : ""}
                  </>
                )}
              </Button>
            )}
            <Button variant="outline" className="w-full" onClick={() => setAddDialog(false)}>
              ยกเลิก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
