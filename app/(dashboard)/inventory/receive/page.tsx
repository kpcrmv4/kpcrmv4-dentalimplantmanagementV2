"use client"

import { useState, useEffect, useTransition, startTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  getPendingPOs,
  getPOItems,
  receiveGoods,
  getPendingBorrows,
  getBorrowItems,
  receiveFromBorrow,
} from "@/lib/actions/inventory"

// --- Types ---

interface LotEntry {
  lot_number: string
  quantity: number
  expiry_date: string
}

interface LineItem {
  id: string
  product_id: string
  quantity_ordered: number
  product_name: string
  product_ref: string
  product_brand: string | null
  product_category: string
  product_unit: string
}

interface ItemLots {
  lots: LotEntry[]
  sameExpiry: boolean
  expanded: boolean
}

interface PendingPO {
  id: string
  po_number: string
  expected_delivery_date: string | null
  created_at: string
  supplier_name: string
  item_count: number
}

interface PendingBorrow {
  id: string
  borrow_number: string
  borrow_date: string
  case_id: string | null
  supplier_name: string
  item_count: number
}

// --- Constants ---

const STEPS = ["เลือกแหล่ง", "ตรวจสอบรายการ", "ยืนยัน"]

function createDefaultLot(qty: number): LotEntry {
  return { lot_number: "", quantity: qty, expiry_date: "" }
}

// --- Component ---

export default function ReceiveInventoryPage() {
  const router = useRouter()
  const [isPending] = useTransition()

  // Step state
  const [step, setStep] = useState(0)

  // Source type
  const [sourceType, setSourceType] = useState<"po" | "borrow">("po")

  // Step 0: PO selection
  const [pendingPOs, setPendingPOs] = useState<PendingPO[]>([])
  const [loadingPOs, setLoadingPOs] = useState(true)
  const [selectedPO, setSelectedPO] = useState<PendingPO | null>(null)

  // Step 0: Borrow selection
  const [pendingBorrows, setPendingBorrows] = useState<PendingBorrow[]>([])
  const [loadingBorrows, setLoadingBorrows] = useState(true)
  const [selectedBorrow, setSelectedBorrow] = useState<PendingBorrow | null>(null)

  // Step 1: Items + LOT entries (shared for PO and borrow)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [itemLotsMap, setItemLotsMap] = useState<Record<string, ItemLots>>({})
  const [loadingItems, setLoadingItems] = useState(false)

  // Step 2: Confirm
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // --- Load on mount ---
  useEffect(() => {
    setLoadingPOs(true)
    getPendingPOs()
      .then(setPendingPOs)
      .catch(() => {})
      .finally(() => setLoadingPOs(false))

    setLoadingBorrows(true)
    getPendingBorrows()
      .then(setPendingBorrows)
      .catch(() => {})
      .finally(() => setLoadingBorrows(false))
  }, [])

  // --- Handlers ---

  const initItemLots = (items: LineItem[]) => {
    const lotsMap: Record<string, ItemLots> = {}
    for (const item of items) {
      lotsMap[item.id] = {
        lots: [createDefaultLot(item.quantity_ordered)],
        sameExpiry: false,
        expanded: true,
      }
    }
    setItemLotsMap(lotsMap)
  }

  const handleSelectPO = useCallback(async (po: PendingPO) => {
    setSelectedPO(po)
    setLoadingItems(true)
    try {
      const items = await getPOItems(po.id)
      setLineItems(items)
      initItemLots(items)
      startTransition(() => setStep(1))
    } catch {
      // ignore
    } finally {
      setLoadingItems(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectBorrow = useCallback(async (borrow: PendingBorrow) => {
    setSelectedBorrow(borrow)
    setLoadingItems(true)
    try {
      const items = await getBorrowItems(borrow.id)
      setLineItems(items)
      initItemLots(items)
      startTransition(() => setStep(1))
    } catch {
      // ignore
    } finally {
      setLoadingItems(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleExpanded(itemId: string) {
    setItemLotsMap((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], expanded: !prev[itemId].expanded },
    }))
  }

  function addLot(itemId: string) {
    setItemLotsMap((prev) => {
      const current = prev[itemId]
      return { ...prev, [itemId]: { ...current, lots: [...current.lots, createDefaultLot(0)] } }
    })
  }

  function removeLot(itemId: string, lotIndex: number) {
    setItemLotsMap((prev) => {
      const current = prev[itemId]
      if (current.lots.length <= 1) return prev
      return { ...prev, [itemId]: { ...current, lots: current.lots.filter((_, i) => i !== lotIndex) } }
    })
  }

  function updateLot(itemId: string, lotIndex: number, field: keyof LotEntry, value: string | number) {
    setItemLotsMap((prev) => {
      const current = prev[itemId]
      const newLots = current.lots.map((lot, i) => {
        if (i !== lotIndex) {
          if (field === "expiry_date" && lotIndex === 0 && current.sameExpiry) {
            return { ...lot, expiry_date: value as string }
          }
          return lot
        }
        return { ...lot, [field]: value }
      })
      if (field === "expiry_date" && lotIndex === 0 && current.sameExpiry) {
        for (let i = 0; i < newLots.length; i++) {
          newLots[i] = { ...newLots[i], expiry_date: value as string }
        }
      }
      return { ...prev, [itemId]: { ...current, lots: newLots } }
    })
  }

  function toggleSameExpiry(itemId: string) {
    setItemLotsMap((prev) => {
      const current = prev[itemId]
      const newSameExpiry = !current.sameExpiry
      let newLots = current.lots
      if (newSameExpiry && current.lots.length > 0) {
        const firstExpiry = current.lots[0].expiry_date
        newLots = current.lots.map((lot) => ({ ...lot, expiry_date: firstExpiry }))
      }
      return { ...prev, [itemId]: { ...current, sameExpiry: newSameExpiry, lots: newLots } }
    })
  }

  // --- Validation ---

  function validateAllLots(): string | null {
    for (const item of lineItems) {
      const itemLots = itemLotsMap[item.id]
      if (!itemLots || itemLots.lots.length === 0) {
        return `กรุณาเพิ่ม LOT สำหรับ ${item.product_name}`
      }
      for (let i = 0; i < itemLots.lots.length; i++) {
        const lot = itemLots.lots[i]
        if (!lot.lot_number.trim()) {
          return `กรุณาระบุ LOT Number สำหรับ ${item.product_name} (LOT #${i + 1})`
        }
        if (lot.quantity <= 0) {
          return `จำนวนต้องมากกว่า 0 สำหรับ ${item.product_name} (LOT #${i + 1})`
        }
      }
    }
    return null
  }

  const validationError = validateAllLots()
  const isStep1Valid = validationError === null

  function goToConfirm() {
    if (!isStep1Valid) return
    startTransition(() => setStep(2))
  }

  // --- Build flat items for submission ---

  function buildReceiveItems() {
    const items: Array<{
      product_id: string
      lot_number: string
      quantity: number
      expiry_date: string | null
      po_id: string | null
      invoice_number: string | null
    }> = []

    for (const lineItem of lineItems) {
      const itemLots = itemLotsMap[lineItem.id]
      if (!itemLots) continue
      for (const lot of itemLots.lots) {
        items.push({
          product_id: lineItem.product_id,
          lot_number: lot.lot_number,
          quantity: lot.quantity,
          expiry_date: lot.expiry_date || null,
          po_id: sourceType === "po" ? (selectedPO?.id ?? null) : null,
          invoice_number: invoiceNumber || null,
        })
      }
    }
    return items
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      if (sourceType === "po") {
        const items = buildReceiveItems()
        await receiveGoods(items, selectedPO?.id ?? null)
      } else if (selectedBorrow) {
        const items = buildReceiveItems().map((item) => ({
          product_id: item.product_id,
          lot_number: item.lot_number,
          quantity: item.quantity,
          expiry_date: item.expiry_date,
          invoice_number: item.invoice_number,
        }))
        await receiveFromBorrow(items, selectedBorrow.id)
      }
      router.push("/inventory")
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
    } finally {
      setSubmitting(false)
    }
  }

  // --- Helpers ---

  function getTotalLotQty(itemId: string): number {
    return (itemLotsMap[itemId]?.lots ?? []).reduce((sum, lot) => sum + lot.quantity, 0)
  }

  const selectedSource = sourceType === "po" ? selectedPO?.po_number : selectedBorrow?.borrow_number
  const selectedSupplier = sourceType === "po" ? selectedPO?.supplier_name : selectedBorrow?.supplier_name

  function handleBack() {
    setSelectedPO(null)
    setSelectedBorrow(null)
    startTransition(() => setStep(0))
  }

  // --- Render ---

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/inventory"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-xl font-semibold">รับของเข้า</h1>
      </div>

      {/* Step Indicator */}
      <div className="flex gap-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1">
            <div className={`h-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
            <p className={`mt-1 text-[10px] ${i <= step ? "text-primary font-medium" : "text-muted-foreground"}`}>
              {s}
            </p>
          </div>
        ))}
      </div>

      {/* Step 0: เลือกแหล่ง */}
      {step === 0 && (
        <div className="space-y-3">
          {/* Source type toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setSourceType("po")}
              className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                sourceType === "po"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-muted text-muted-foreground hover:bg-muted/50"
              }`}
            >
              รับจากใบสั่งซื้อ (PO)
            </button>
            <button
              onClick={() => setSourceType("borrow")}
              className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                sourceType === "borrow"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-muted text-muted-foreground hover:bg-muted/50"
              }`}
            >
              รับจากใบยืม
            </button>
          </div>

          {/* PO list */}
          {sourceType === "po" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">เลือกใบสั่งซื้อ (PO) ที่รอรับของ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {loadingPOs || loadingItems ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">กำลังโหลด...</p>
                ) : pendingPOs.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">ไม่มีใบ PO ที่รอรับของ</p>
                ) : (
                  pendingPOs.map((po) => {
                    const isOverdue =
                      po.expected_delivery_date &&
                      po.expected_delivery_date < new Date().toISOString().split("T")[0]
                    return (
                      <button
                        key={po.id}
                        onClick={() => handleSelectPO(po)}
                        disabled={isPending || loadingItems}
                        className="flex w-full items-start justify-between rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">{po.po_number}</p>
                            {isOverdue && (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                เกินกำหนด
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{po.supplier_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {po.expected_delivery_date
                              ? `กำหนดส่ง: ${po.expected_delivery_date}`
                              : "ไม่ระบุกำหนดส่ง"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Package className="h-3.5 w-3.5" />
                          <span className="text-xs">{po.item_count} รายการ</span>
                        </div>
                      </button>
                    )
                  })
                )}
              </CardContent>
            </Card>
          )}

          {/* Borrow list */}
          {sourceType === "borrow" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">เลือกใบยืมที่รอรับของ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {loadingBorrows || loadingItems ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">กำลังโหลด...</p>
                ) : pendingBorrows.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">ไม่มีใบยืมที่รอรับของ</p>
                ) : (
                  pendingBorrows.map((borrow) => (
                    <button
                      key={borrow.id}
                      onClick={() => handleSelectBorrow(borrow)}
                      disabled={isPending || loadingItems}
                      className="flex w-full items-start justify-between rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">{borrow.borrow_number}</p>
                        <p className="text-xs text-muted-foreground">{borrow.supplier_name}</p>
                        <p className="text-xs text-muted-foreground">
                          วันที่ยืม: {borrow.borrow_date}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Package className="h-3.5 w-3.5" />
                        <span className="text-xs">{borrow.item_count} รายการ</span>
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step 1: ตรวจสอบรายการ */}
      {step === 1 && (selectedPO || selectedBorrow) && (
        <>
          {/* Source Info */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{selectedSource}</p>
                  <p className="text-xs text-muted-foreground">{selectedSupplier}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {lineItems.length} รายการ
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Items list */}
          <div className="space-y-3">
            {lineItems.map((item) => {
              const itemLots = itemLotsMap[item.id]
              if (!itemLots) return null
              const totalQty = getTotalLotQty(item.id)
              const qtyMatch = totalQty === item.quantity_ordered
              const qtyOver = totalQty > item.quantity_ordered

              return (
                <Card key={item.id}>
                  <CardContent className="p-0">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(item.id)}
                      className="flex w-full items-center justify-between p-3 text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          REF: {item.product_ref}
                          {item.product_brand ? ` · ${item.product_brand}` : ""}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            ยืม: {item.quantity_ordered} {item.product_unit}
                          </span>
                          <span className={`text-xs font-medium ${
                            qtyMatch ? "text-green-600" : qtyOver ? "text-destructive" : "text-orange-500"
                          }`}>
                            รับ: {totalQty} {item.product_unit}
                          </span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {itemLots.lots.length} LOT
                          </Badge>
                        </div>
                      </div>
                      {itemLots.expanded ? (
                        <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                    </button>

                    {itemLots.expanded && (
                      <div className="border-t px-3 pb-3 space-y-3">
                        <label className="flex items-center gap-2 pt-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={itemLots.sameExpiry}
                            onChange={() => toggleSameExpiry(item.id)}
                            className="h-3.5 w-3.5 rounded border-gray-300"
                          />
                          <span className="text-xs text-muted-foreground">
                            วันหมดอายุเหมือนกันทุก LOT
                          </span>
                        </label>

                        {itemLots.lots.map((lot, lotIdx) => (
                          <div key={lotIdx} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-medium text-muted-foreground">
                                LOT #{lotIdx + 1}
                              </span>
                              {itemLots.lots.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeLot(item.id, lotIdx)}
                                  className="p-0.5 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <Label className="text-[10px]">LOT Number *</Label>
                                <Input
                                  placeholder="LOT"
                                  value={lot.lot_number}
                                  onChange={(e) => updateLot(item.id, lotIdx, "lot_number", e.target.value)}
                                  className="mt-0.5 h-8 text-xs"
                                />
                              </div>
                              <div>
                                <Label className="text-[10px]">จำนวน ({item.product_unit}) *</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={lot.quantity || ""}
                                  onChange={(e) => updateLot(item.id, lotIdx, "quantity", parseInt(e.target.value) || 0)}
                                  className="mt-0.5 h-8 text-xs"
                                />
                              </div>
                              <div>
                                <Label className="text-[10px]">วันหมดอายุ</Label>
                                <Input
                                  type="date"
                                  value={lot.expiry_date}
                                  onChange={(e) => updateLot(item.id, lotIdx, "expiry_date", e.target.value)}
                                  disabled={itemLots.sameExpiry && lotIdx > 0}
                                  className="mt-0.5 h-8 text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        ))}

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full h-7 text-xs"
                          onClick={() => addLot(item.id)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          เพิ่ม LOT
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {validationError && (
            <p className="text-xs text-destructive">{validationError}</p>
          )}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleBack}>
              ย้อนกลับ
            </Button>
            <Button size="sm" disabled={!isStep1Valid} onClick={goToConfirm}>
              ถัดไป
            </Button>
          </div>
        </>
      )}

      {/* Step 2: ยืนยัน */}
      {step === 2 && (selectedPO || selectedBorrow) && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">สรุปรายการรับของ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  {sourceType === "po" ? "ใบ PO" : "ใบยืม"}: {selectedSource}
                </p>
                <p className="text-xs text-muted-foreground">
                  Supplier: {selectedSupplier}
                </p>
              </div>

              <div>
                <Label className="text-xs">เลขที่ใบส่งของ (Invoice)</Label>
                <Input
                  placeholder="INV-XXXX"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="mt-1"
                />
              </div>

              <Separator />

              {lineItems.map((item) => {
                const itemLots = itemLotsMap[item.id]
                if (!itemLots) return null
                return (
                  <div key={item.id} className="rounded-lg border p-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">REF: {item.product_ref}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {sourceType === "po" ? "สั่ง" : "ยืม"} {item.quantity_ordered} {item.product_unit}
                      </span>
                    </div>
                    {itemLots.lots.map((lot, lotIdx) => (
                      <div
                        key={lotIdx}
                        className="ml-3 flex items-center justify-between text-xs text-muted-foreground"
                      >
                        <span>
                          LOT: {lot.lot_number}
                          {lot.expiry_date ? ` · Exp: ${lot.expiry_date}` : ""}
                        </span>
                        <span className="font-medium text-foreground">
                          {lot.quantity} {item.product_unit}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => startTransition(() => setStep(1))}>
              แก้ไข
            </Button>
            <Button size="sm" disabled={submitting || isPending} onClick={handleSubmit}>
              {submitting ? "กำลังบันทึก..." : "ยืนยันรับของ"}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
