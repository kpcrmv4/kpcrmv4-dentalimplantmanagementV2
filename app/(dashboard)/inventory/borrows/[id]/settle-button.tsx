"use client"

import { useState, useTransition, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Check, ArrowLeftRight, DollarSign, Loader2, X, Upload, Search, Package, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { settleBorrowItem, getBorrowItemSettlementInfo, uploadBorrowPhoto } from "@/lib/actions/borrows"
import { formatCurrency } from "@/lib/utils"

interface SettlementInfo {
  product: { id: string; name: string; ref: string; brand: string; unit: string; category: string } | null
  quantity: number
  available_stock: number
  reference_price: number | null
  unit_price: number | null
}

interface ProductOption {
  id: string
  name: string
  ref: string
}

export function SettleButton({
  itemId,
  productName,
  quantity,
  unitPrice,
}: {
  itemId: string
  productName?: string
  quantity?: number
  unitPrice?: number
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showModal, setShowModal] = useState(false)
  const [type, setType] = useState<"return" | "exchange" | "payment">("return")
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Settlement info from server
  const [info, setInfo] = useState<SettlementInfo | null>(null)
  const [loadingInfo, setLoadingInfo] = useState(false)

  // Exchange product search
  const [exchangeProductId, setExchangeProductId] = useState<string | null>(null)
  const [exchangeSearch, setExchangeSearch] = useState("")
  const [exchangeResults, setExchangeResults] = useState<ProductOption[]>([])
  const [exchangeProductName, setExchangeProductName] = useState("")
  const [searchingProducts, setSearchingProducts] = useState(false)

  const loadInfo = useCallback(async () => {
    setLoadingInfo(true)
    try {
      const data = await getBorrowItemSettlementInfo(itemId)
      setInfo(data as SettlementInfo)
      // Pre-fill amount with reference price for payment
      if (data.reference_price) {
        setAmount(String(data.reference_price))
      }
    } catch {
      // Fallback - use props
    } finally {
      setLoadingInfo(false)
    }
  }, [itemId])

  useEffect(() => {
    if (showModal) {
      loadInfo()
    }
  }, [showModal, loadInfo])

  // Product search for exchange
  useEffect(() => {
    if (type !== "exchange" || exchangeSearch.length < 2) {
      setExchangeResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearchingProducts(true)
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(exchangeSearch)}`)
        if (res.ok) {
          const data = await res.json()
          setExchangeResults(data.products ?? [])
        }
      } catch {
        // Ignore
      } finally {
        setSearchingProducts(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [exchangeSearch, type])

  function handleSettle() {
    setError(null)

    // Validate
    if (type === "payment") {
      const parsedAmount = parseFloat(amount)
      if (!parsedAmount || parsedAmount <= 0) {
        setError("กรุณาระบุจำนวนเงินที่ต้องชำระ")
        return
      }
    }
    if (type === "exchange" && !exchangeProductId) {
      setError("กรุณาเลือกสินค้าที่ต้องการแลก")
      return
    }

    startTransition(async () => {
      try {
        await settleBorrowItem(itemId, {
          type,
          amount: amount ? parseFloat(amount) : undefined,
          product_id: exchangeProductId || undefined,
          note: note || undefined,
        })
        setShowModal(false)
        resetState()
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "ดำเนินการไม่สำเร็จ")
      }
    })
  }

  function resetState() {
    setType("return")
    setAmount("")
    setNote("")
    setError(null)
    setExchangeProductId(null)
    setExchangeSearch("")
    setExchangeProductName("")
    setInfo(null)
  }

  const refPrice = info?.reference_price ?? (unitPrice && quantity ? unitPrice * quantity : null)
  const refUnitPrice = info?.unit_price ?? unitPrice ?? null
  const stockAvailable = info?.available_stock ?? null
  const itemQty = info?.quantity ?? quantity ?? 0
  const pName = info?.product?.name ?? productName ?? "สินค้า"
  const pUnit = info?.product?.unit ?? "ชิ้น"

  return (
    <>
      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setShowModal(true)}>
        <Check className="mr-1 h-3 w-3" /> ชำระ
      </Button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setShowModal(false); resetState() }}>
          <div className="mx-4 w-full max-w-sm rounded-lg bg-background p-5 shadow-xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">ชำระรายการยืม</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setShowModal(false); resetState() }}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Item info */}
            {loadingInfo ? (
              <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> กำลังโหลดข้อมูล...
              </div>
            ) : (
              <div className="mb-3 rounded-lg border p-2.5 text-xs space-y-1">
                <div className="flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{pName}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-muted-foreground">
                  <span>จำนวน: {itemQty} {pUnit}</span>
                  {refUnitPrice ? <span>ราคา/หน่วย: {formatCurrency(refUnitPrice)}</span> : null}
                  {stockAvailable !== null ? (
                    <span className={stockAvailable < itemQty ? "text-orange-600" : ""}>
                      สต็อกคงเหลือ: {stockAvailable} {pUnit}
                    </span>
                  ) : null}
                </div>
                {refPrice ? (
                  <div className="text-muted-foreground">
                    มูลค่ารวม: <span className="font-medium text-foreground">{formatCurrency(refPrice)}</span>
                  </div>
                ) : null}
              </div>
            )}

            {error && (
              <div className="mb-3 flex items-center gap-1.5 rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-3">
              {/* Settlement type selector */}
              <div className="flex gap-2">
                <Button size="sm" variant={type === "return" ? "default" : "outline"} onClick={() => setType("return")} className="flex-1 text-xs">
                  <Check className="mr-1 h-3 w-3" /> คืนของ
                </Button>
                <Button size="sm" variant={type === "exchange" ? "default" : "outline"} onClick={() => setType("exchange")} className="flex-1 text-xs">
                  <ArrowLeftRight className="mr-1 h-3 w-3" /> แลก
                </Button>
                <Button size="sm" variant={type === "payment" ? "default" : "outline"} onClick={() => setType("payment")} className="flex-1 text-xs">
                  <DollarSign className="mr-1 h-3 w-3" /> ชำระเงิน
                </Button>
              </div>

              {/* Return: stock warning */}
              {type === "return" && stockAvailable !== null && stockAvailable < itemQty && (
                <div className="flex items-start gap-1.5 rounded-md border border-orange-300 bg-orange-50 p-2 text-xs text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-400">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>สต็อกคงเหลือ ({stockAvailable}) น้อยกว่าจำนวนที่ยืม ({itemQty}) — ระบบจะตัดสต็อกเท่าที่มี</span>
                </div>
              )}

              {/* Exchange: product search */}
              {type === "exchange" && (
                <div className="space-y-2">
                  <Label className="text-xs">เลือกสินค้าที่ต้องการแลก</Label>
                  {exchangeProductId ? (
                    <div className="flex items-center gap-2 rounded-md border p-2">
                      <div className="flex-1 text-xs font-medium">{exchangeProductName}</div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          setExchangeProductId(null)
                          setExchangeProductName("")
                          setExchangeSearch("")
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-8 text-xs"
                        placeholder="ค้นหาชื่อ/REF สินค้า..."
                        value={exchangeSearch}
                        onChange={(e) => setExchangeSearch(e.target.value)}
                      />
                      {searchingProducts && (
                        <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
                      )}
                      {exchangeResults.length > 0 && (
                        <div className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-md border bg-background shadow-lg">
                          {exchangeResults.map((p) => (
                            <button
                              key={p.id}
                              className="w-full px-3 py-2 text-left text-xs hover:bg-muted transition-colors"
                              onClick={() => {
                                setExchangeProductId(p.id)
                                setExchangeProductName(`${p.name}${p.ref ? ` (${p.ref})` : ""}`)
                                setExchangeSearch("")
                                setExchangeResults([])
                              }}
                            >
                              <span className="font-medium">{p.name}</span>
                              {p.ref ? <span className="ml-1 text-muted-foreground">REF: {p.ref}</span> : null}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    สินค้าใหม่จะเข้าสต็อกเมื่อรับของจริงผ่านหน้ารับของเข้า
                  </p>
                </div>
              )}

              {/* Payment: amount */}
              {type === "payment" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">จำนวนเงิน (บาท)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1"
                    placeholder="0.00"
                  />
                  {refPrice && Number(amount) !== refPrice ? (
                    <p className="text-[10px] text-muted-foreground">
                      ราคาอ้างอิง: {formatCurrency(refPrice)} ({itemQty} × {formatCurrency(refUnitPrice ?? 0)})
                    </p>
                  ) : null}
                </div>
              )}

              {/* Notes */}
              <div>
                <Label className="text-xs">หมายเหตุ</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="mt-1" rows={2} placeholder="รายละเอียดเพิ่มเติม..." />
              </div>

              <Button className="w-full" onClick={handleSettle} disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                ยืนยัน
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export function PhotoUploadButton({ borrowId }: { borrowId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("folder", "borrows")

        const res = await fetch("/api/upload-photo", { method: "POST", body: formData })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "อัปโหลดไม่สำเร็จ")

        await uploadBorrowPhoto(borrowId, data.url, file.name)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ")
      }
    })
  }

  return (
    <div>
      <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted">
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        แนบรูปหลักฐาน
        <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={isPending} />
      </label>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}
