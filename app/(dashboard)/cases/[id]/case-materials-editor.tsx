"use client"

import { useState, useTransition, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronDown,
  Filter,
  Loader2,
  Minus,
  Package,
  Pencil,
  Plus,
  Save,
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
import { saveCaseMaterials } from "@/lib/actions/cases"
import { getProducts, getCategories } from "@/lib/actions/products"
import { formatDate } from "@/lib/utils"

const RESERVATION_STATUS: Record<string, { label: string; color: string }> = {
  reserved: { label: "รอจัดเตรียม", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400" },
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

interface DraftItem {
  tempId: string
  productId: string
  productName: string
  productBrand: string
  productRef: string
  productUnit: string
  quantity: number
}

interface ProductOption {
  id: string
  name: string
  brand: string | null
  ref: string
  unit: string
  totalStock: number
  category: string | null
  model: string | null
  diameter: number | null
  length: number | null
}

interface CategoryOption {
  value: string
  label: string
}

export function CaseMaterialsEditor({
  caseId,
  caseStatus,
  reservations,
}: {
  caseId: string
  caseStatus: string
  reservations: ReservationItem[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveResult, setSaveResult] = useState<{ outOfStock: string[] } | null>(null)

  // === Draft state (local, not saved to DB yet) ===
  const [draftItems, setDraftItems] = useState<DraftItem[]>([])
  const [removedIds, setRemovedIds] = useState<string[]>([])

  // Add material dialog
  const [addDialog, setAddDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<ProductOption[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null)
  const [addQuantity, setAddQuantity] = useState("1")

  // Filter state
  const [showFilters, setShowFilters] = useState(false)
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [filterCategory, setFilterCategory] = useState("")
  const [filterBrand, setFilterBrand] = useState("")
  const [filterModel, setFilterModel] = useState("")
  const [filterDiameter, setFilterDiameter] = useState("")
  const [filterLength, setFilterLength] = useState("")
  const [allFilteredProducts, setAllFilteredProducts] = useState<ProductOption[]>([])

  const canEdit = ["ready", "pending_preparation", "pending_order"].includes(caseStatus)
  const activeReservations = reservations.filter((r) => !["returned", "consumed"].includes(r.status))

  // Items currently shown = existing active reservations (minus removed) + draft items
  const displayedExisting = activeReservations.filter((r) => !removedIds.includes(r.id))
  const hasChanges = draftItems.length > 0 || removedIds.length > 0

  // === Edit mode ===
  function enterEditMode() {
    setIsEditing(true)
    setDraftItems([])
    setRemovedIds([])
    setError(null)
    setSaveResult(null)
  }

  function cancelEdit() {
    setIsEditing(false)
    setDraftItems([])
    setRemovedIds([])
    setError(null)
  }

  // === Remove handlers ===
  function removeDraft(tempId: string) {
    setDraftItems((prev) => prev.filter((d) => d.tempId !== tempId))
  }

  function removeExisting(id: string) {
    // Only allow removing "reserved" items (not prepared)
    const item = activeReservations.find((r) => r.id === id)
    if (item && item.status !== "reserved") return
    setRemovedIds((prev) => [...prev, id])
  }

  function undoRemove(id: string) {
    setRemovedIds((prev) => prev.filter((rid) => rid !== id))
  }

  // === Add material handlers ===
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchProducts = useCallback(async (
    search: string, cat: string, br: string, mod: string, dia: string, len: string,
  ) => {
    const hasFilter = cat || br || mod || dia || len
    if (!hasFilter && search.length < 2) {
      setSearchResults([])
      setAllFilteredProducts([])
      return
    }
    setSearchLoading(true)
    try {
      const products = await getProducts({
        search: search.length >= 2 ? search : undefined,
        category: cat || undefined,
        brand: br || undefined,
        model: mod || undefined,
        diameter: dia || undefined,
        length: len || undefined,
      })
      const mapped = products.map((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        ref: p.ref,
        unit: p.unit,
        totalStock: p.totalStock,
        category: p.category,
        model: (p as Record<string, unknown>).model as string | null,
        diameter: (p as Record<string, unknown>).diameter as number | null,
        length: (p as Record<string, unknown>).length as number | null,
      }))
      setSearchResults(mapped)
      if (!search) setAllFilteredProducts(mapped)
    } catch {
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }, [])

  function handleSearch(query: string) {
    setSearchQuery(query)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      fetchProducts(query, filterCategory, filterBrand, filterModel, filterDiameter, filterLength)
    }, 300)
  }

  function handleFilterChange(newCat: string, newBrand: string, newModel: string, newDia: string, newLen: string) {
    setFilterCategory(newCat)
    setFilterBrand(newBrand)
    setFilterModel(newModel)
    setFilterDiameter(newDia)
    setFilterLength(newLen)
    fetchProducts(searchQuery, newCat, newBrand, newModel, newDia, newLen)
  }

  // Cascading filter options
  let cascadeBase = allFilteredProducts
  const distinctBrands = Array.from(new Set(cascadeBase.map((p) => p.brand).filter(Boolean))).sort() as string[]
  if (filterBrand) cascadeBase = cascadeBase.filter((p) => p.brand?.toLowerCase() === filterBrand.toLowerCase())
  const distinctModels = Array.from(new Set(cascadeBase.map((p) => p.model).filter(Boolean))).sort() as string[]
  if (filterModel) cascadeBase = cascadeBase.filter((p) => p.model?.toLowerCase() === filterModel.toLowerCase())
  const distinctDiameters = Array.from(new Set(cascadeBase.map((p) => p.diameter).filter((d) => d != null))).map(String).sort((a, b) => Number(a) - Number(b))
  if (filterDiameter) cascadeBase = cascadeBase.filter((p) => p.diameter != null && String(p.diameter) === filterDiameter)
  const distinctLengths = Array.from(new Set(cascadeBase.map((p) => p.length).filter((l) => l != null))).map(String).sort((a, b) => Number(a) - Number(b))
  const activeFilterCount = [filterCategory, filterBrand, filterModel, filterDiameter, filterLength].filter(Boolean).length

  async function openAddDialog() {
    setAddDialog(true)
    setSearchQuery("")
    setSearchResults([])
    setAllFilteredProducts([])
    setSelectedProduct(null)
    setAddQuantity("1")
    setFilterCategory("")
    setFilterBrand("")
    setFilterModel("")
    setFilterDiameter("")
    setFilterLength("")
    setShowFilters(false)
    try {
      const cats = await getCategories()
      setCategories(cats)
    } catch { setCategories([]) }
  }

  function confirmAdd() {
    if (!selectedProduct) return
    const qty = parseInt(addQuantity, 10)
    if (isNaN(qty) || qty <= 0) return

    // Add to local draft (not DB)
    setDraftItems((prev) => [
      ...prev,
      {
        tempId: `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        productBrand: selectedProduct.brand ?? "",
        productRef: selectedProduct.ref,
        productUnit: selectedProduct.unit,
        quantity: qty,
      },
    ])
    setAddDialog(false)
  }

  // === Batch save ===
  function handleSave() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await saveCaseMaterials(
          caseId,
          draftItems.map((d) => ({ productId: d.productId, quantity: d.quantity })),
          removedIds
        )

        if (result.outOfStock.length > 0) {
          setSaveResult({ outOfStock: result.outOfStock })
        }

        setIsEditing(false)
        setDraftItems([])
        setRemovedIds([])
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ")
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
          {canEdit && !isEditing && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={enterEditMode}>
              <Pencil className="mr-1 h-3 w-3" /> แก้ไข
            </Button>
          )}
          {isEditing && (
            <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={cancelEdit}>
              <X className="mr-1 h-3 w-3" /> ยกเลิก
            </Button>
          )}
        </div>

        {/* Out of stock warning */}
        {saveResult && saveResult.outOfStock.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-500/10 p-2.5 mb-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-amber-800 dark:text-amber-300">วัสดุไม่เพียงพอในสต๊อก</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                {saveResult.outOfStock.join(", ")} — สถานะเคสจะเปลี่ยนเป็น &quot;รอสั่งของ&quot;
              </p>
              <button onClick={() => setSaveResult(null)} className="text-[11px] text-amber-600 underline mt-1">ปิด</button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-2 mb-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
            <p className="text-xs text-destructive">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto shrink-0"><X className="h-3 w-3 text-destructive" /></button>
          </div>
        )}

        {/* Existing reservations */}
        {displayedExisting.length === 0 && draftItems.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">ยังไม่มีรายการวัสดุ</p>
        ) : (
          <div className="space-y-1.5">
            {/* Existing items */}
            {displayedExisting.map((r) => {
              const rStatus = RESERVATION_STATUS[r.status] ?? RESERVATION_STATUS.reserved
              return (
                <div key={r.id} className="flex items-start gap-2 rounded-lg border p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight">{r.productName}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {r.productBrand} · REF: {r.productRef}
                    </p>
                    <p className="text-[11px] text-muted-foreground">จำนวน: {r.quantityReserved} {r.productUnit}</p>
                    {r.lotNumber && (
                      <p className="text-[11px] text-muted-foreground">
                        LOT: {r.lotNumber}{r.expiryDate ? ` · Exp: ${formatDate(r.expiryDate)}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${rStatus.color}`}>
                      {rStatus.label}
                    </span>
                    {isEditing && r.status === "reserved" && (
                      <button onClick={() => removeExisting(r.id)} className="rounded-full p-1 text-destructive hover:bg-destructive/10 transition-colors" title="ลบรายการ">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Removed items (strikethrough, with undo) */}
            {isEditing && removedIds.map((id) => {
              const r = activeReservations.find((r) => r.id === id)
              if (!r) return null
              return (
                <div key={`removed-${id}`} className="flex items-center gap-2 rounded-lg border border-dashed border-destructive/30 p-2.5 opacity-50">
                  <div className="min-w-0 flex-1 line-through">
                    <p className="text-sm leading-tight">{r.productName}</p>
                    <p className="text-[11px] text-muted-foreground">จำนวน: {r.quantityReserved} {r.productUnit}</p>
                  </div>
                  <button onClick={() => undoRemove(id)} className="text-xs text-primary underline shrink-0">เลิกลบ</button>
                </div>
              )
            })}

            {/* Draft items (new, not saved yet) */}
            {draftItems.map((d) => (
              <div key={d.tempId} className="flex items-start gap-2 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight">{d.productName}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {d.productBrand} · REF: {d.productRef}
                  </p>
                  <p className="text-[11px] text-muted-foreground">จำนวน: {d.quantity} {d.productUnit}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary">ใหม่</span>
                  <button onClick={() => removeDraft(d.tempId)} className="rounded-full p-1 text-destructive hover:bg-destructive/10 transition-colors">
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add material button */}
        {isEditing && (
          <>
            <button
              onClick={openAddDialog}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 p-3 mt-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Plus className="h-4 w-4" /> เพิ่มวัสดุ
            </button>

            {/* Save button */}
            <Button
              className="w-full mt-3 h-11 bg-primary hover:bg-primary/90"
              onClick={handleSave}
              disabled={isPending || !hasChanges}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isPending ? "กำลังบันทึก..." : `บันทึกการสั่ง${hasChanges ? ` (${draftItems.length} เพิ่ม, ${removedIds.length} ลบ)` : ""}`}
            </Button>
          </>
        )}
      </div>

      {/* ── Add Material Dialog ── */}
      <Dialog open={addDialog} onOpenChange={(open) => { if (!open) setAddDialog(false) }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>เพิ่มวัสดุ</DialogTitle>
            <DialogDescription>ค้นหาจากชื่อ, REF, แบรนด์, รุ่น หรือใช้ตัวกรอง</DialogDescription>
          </DialogHeader>

          {!selectedProduct ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="ค้นหาสินค้า..." className="pl-8 h-10" value={searchQuery} onChange={(e) => handleSearch(e.target.value)} autoFocus />
                </div>
                <Button
                  type="button" size="icon"
                  variant={showFilters || activeFilterCount > 0 ? "default" : "outline"}
                  className="h-10 w-10 shrink-0"
                  onClick={() => {
                    setShowFilters(!showFilters)
                    if (!showFilters && allFilteredProducts.length === 0 && !filterCategory) fetchProducts("", "", "", "", "", "")
                  }}
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </div>

              {showFilters && (
                <div className="space-y-1.5 rounded-lg border bg-muted/30 p-2.5">
                  <div className="relative">
                    <select value={filterCategory} onChange={(e) => handleFilterChange(e.target.value, "", "", "", "")} className="w-full h-8 rounded-md border bg-background px-2 text-xs appearance-none pr-7">
                      <option value="">ประเภท — ทั้งหมด</option>
                      {categories.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  {distinctBrands.length > 0 && (
                    <div className="relative">
                      <select value={filterBrand} onChange={(e) => handleFilterChange(filterCategory, e.target.value, "", "", "")} className="w-full h-8 rounded-md border bg-background px-2 text-xs appearance-none pr-7">
                        <option value="">ยี่ห้อ — ทั้งหมด</option>
                        {distinctBrands.map((b) => (<option key={b} value={b}>{b}</option>))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  )}
                  {distinctModels.length > 0 && (
                    <div className="relative">
                      <select value={filterModel} onChange={(e) => handleFilterChange(filterCategory, filterBrand, e.target.value, "", "")} className="w-full h-8 rounded-md border bg-background px-2 text-xs appearance-none pr-7">
                        <option value="">รุ่น — ทั้งหมด</option>
                        {distinctModels.map((m) => (<option key={m} value={m}>{m}</option>))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  )}
                  {(distinctDiameters.length > 0 || distinctLengths.length > 0) && (
                    <div className="flex gap-1.5">
                      {distinctDiameters.length > 0 && (
                        <div className="relative flex-1">
                          <select value={filterDiameter} onChange={(e) => handleFilterChange(filterCategory, filterBrand, filterModel, e.target.value, "")} className="w-full h-8 rounded-md border bg-background px-2 text-xs appearance-none pr-7">
                            <option value="">Ø — ทั้งหมด</option>
                            {distinctDiameters.map((d) => (<option key={d} value={d}>{d} mm</option>))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        </div>
                      )}
                      {distinctLengths.length > 0 && (
                        <div className="relative flex-1">
                          <select value={filterLength} onChange={(e) => handleFilterChange(filterCategory, filterBrand, filterModel, filterDiameter, e.target.value)} className="w-full h-8 rounded-md border bg-background px-2 text-xs appearance-none pr-7">
                            <option value="">ยาว — ทั้งหมด</option>
                            {distinctLengths.map((l) => (<option key={l} value={l}>{l} mm</option>))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  )}
                  {activeFilterCount > 0 && (
                    <button onClick={() => handleFilterChange("", "", "", "", "")} className="text-[11px] text-primary underline">ล้างตัวกรองทั้งหมด</button>
                  )}
                </div>
              )}

              <div className="max-h-60 overflow-y-auto space-y-1">
                {searchLoading && <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>}
                {!searchLoading && (searchQuery.length >= 2 || activeFilterCount > 0) && searchResults.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">ไม่พบสินค้า</p>
                )}
                {searchResults.map((p) => (
                  <button key={p.id} onClick={() => setSelectedProduct(p)} className="flex w-full items-center justify-between rounded-lg border p-2.5 text-left text-sm hover:bg-muted transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">{p.brand ?? ""}{p.model ? ` · ${p.model}` : ""} · REF: {p.ref}</p>
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
                <p className="text-[11px] text-muted-foreground">{selectedProduct.brand ?? ""} · REF: {selectedProduct.ref}</p>
                <p className={`text-xs mt-1 ${selectedProduct.totalStock > 0 ? "text-green-600" : "text-destructive"}`}>
                  สต๊อกคงเหลือ: {selectedProduct.totalStock} {selectedProduct.unit}
                </p>
                <button onClick={() => setSelectedProduct(null)} className="text-xs text-primary underline mt-1">เปลี่ยนสินค้า</button>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">จำนวน</label>
                <Input type="number" inputMode="numeric" min={1} value={addQuantity} onChange={(e) => setAddQuantity(e.target.value)} className="h-12 text-lg text-center" />
              </div>
              {selectedProduct.totalStock <= 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-500/10 p-3">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-300">สินค้าไม่มีในสต๊อก</p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">ระบบจะแจ้งเตือนสต๊อกให้อัตโนมัติเมื่อบันทึก</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            {selectedProduct && (
              <Button className="w-full h-11" onClick={confirmAdd} disabled={!addQuantity || parseInt(addQuantity, 10) <= 0}>
                <Plus className="mr-2 h-4 w-4" /> เพิ่มในรายการ
              </Button>
            )}
            <Button variant="outline" className="w-full" onClick={() => setAddDialog(false)}>ยกเลิก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
