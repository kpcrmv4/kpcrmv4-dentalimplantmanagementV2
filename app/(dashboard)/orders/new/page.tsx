"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Trash2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { getSuppliers, getProductsBySupplier } from "@/lib/actions/inventory"
import { createPurchaseOrder } from "@/lib/actions/orders"
import { getSupplierWithScore } from "@/lib/actions/suppliers"
import { formatCurrency } from "@/lib/utils"

interface POItem {
  product_id: string
  name: string
  ref: string
  unit: string
  quantity: number
  unit_price: number
}

interface SupplierInfo {
  lead_time_days: number | null
  delivery_score: number | null
}

export default function NewOrderPage() {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<Array<{ id: string; code: string; name: string }>>([])
  const [products, setProducts] = useState<Array<{ id: string; ref: string; name: string; brand: string | null; category: string; unit: string; model: string | null; diameter: number | null; length: number | null }>>([])
  const [selectedSupplier, setSelectedSupplier] = useState("")
  const [items, setItems] = useState<POItem[]>([])
  const [notes, setNotes] = useState("")
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("")
  const [supplierInfo, setSupplierInfo] = useState<SupplierInfo | null>(null)
  const [supplierSearch, setSupplierSearch] = useState("")
  const [productSearch, setProductSearch] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filteredSuppliers = suppliers.filter((s) =>
    supplierSearch === ""
      ? true
      : `${s.name} ${s.code}`.toLowerCase().includes(supplierSearch.toLowerCase())
  )

  const filteredProducts = productSearch === ""
    ? []
    : products.filter((p) => {
        const q = productSearch.toLowerCase()
        return (
          p.name.toLowerCase().includes(q) ||
          p.ref.toLowerCase().includes(q) ||
          (p.brand?.toLowerCase().includes(q) ?? false) ||
          (p.category?.toLowerCase().includes(q) ?? false) ||
          (p.model?.toLowerCase().includes(q) ?? false) ||
          (p.diameter != null && String(p.diameter).includes(q)) ||
          (p.length != null && String(p.length).includes(q))
        )
      })

  useEffect(() => {
    getSuppliers().then(setSuppliers).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedSupplier) {
      getProductsBySupplier(selectedSupplier).then(setProducts).catch(() => {})
      getSupplierWithScore(selectedSupplier).then((info) => {
        if (info) {
          setSupplierInfo({ lead_time_days: info.lead_time_days, delivery_score: info.delivery_score })
          if (info.lead_time_days) {
            const expected = new Date()
            expected.setDate(expected.getDate() + info.lead_time_days)
            setExpectedDeliveryDate(expected.toISOString().split("T")[0])
          }
        }
      }).catch(() => {})
    }
  }, [selectedSupplier])

  function addProduct(product: { id: string; ref: string; name: string; unit: string }) {
    if (items.some((i) => i.product_id === product.id)) return
    setItems((prev) => [
      ...prev,
      { product_id: product.id, name: product.name, ref: product.ref, unit: product.unit, quantity: 1, unit_price: 0 },
    ])
  }

  function updateItem(index: number, field: "quantity" | "unit_price", value: number) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0)

  async function handleSubmit() {
    if (!selectedSupplier || items.length === 0) return
    setSubmitting(true)
    setError(null)
    try {
      await createPurchaseOrder(
        selectedSupplier,
        items.map((i) => ({ product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price })),
        notes,
        expectedDeliveryDate || undefined
      )
      router.push("/orders")
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/orders"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-xl font-semibold">สร้างใบสั่งซื้อ</h1>
      </div>

      {/* Supplier */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">เลือก Supplier</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหา Supplier..."
              value={supplierSearch}
              onChange={(e) => setSupplierSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          {filteredSuppliers.map((s) => (
            <button
              key={s.id}
              onClick={() => { setSelectedSupplier(s.id); setItems([]); setProductSearch("") }}
              className={`w-full rounded-lg border p-2 text-left text-sm transition-colors ${
                selectedSupplier === s.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              }`}
            >
              {s.name} ({s.code})
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Supplier Info Badges */}
      {selectedSupplier && supplierInfo ? (
        <div className="flex flex-wrap gap-2">
          {supplierInfo.lead_time_days != null ? (
            <Badge variant="outline" className="text-xs">
              Lead Time: {supplierInfo.lead_time_days} วัน
            </Badge>
          ) : null}
          {supplierInfo.delivery_score != null ? (
            <Badge
              variant="outline"
              className={`text-xs ${
                supplierInfo.delivery_score >= 8
                  ? "border-green-300 text-green-700"
                  : supplierInfo.delivery_score >= 5
                    ? "border-yellow-300 text-yellow-700"
                    : "border-red-300 text-red-700"
              }`}
            >
              คะแนนจัดส่ง: {supplierInfo.delivery_score}/10
            </Badge>
          ) : null}
        </div>
      ) : null}

      {/* Products */}
      {selectedSupplier ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">เลือกสินค้า</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="พิมพ์เพื่อค้นหาสินค้า..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            {productSearch === "" && (
              <p className="text-xs text-muted-foreground py-1">พิมพ์ชื่อหรือ REF เพื่อค้นหาสินค้า</p>
            )}
            {filteredProducts.map((p) => {
              const inList = items.some((i) => i.product_id === p.id)
              return (
                <button
                  key={p.id}
                  onClick={() => addProduct(p)}
                  disabled={inList}
                  className={`w-full rounded-lg border p-2 text-left text-sm transition-colors ${
                    inList ? "bg-muted/50 opacity-50" : "hover:bg-muted/50"
                  }`}
                >
                  {p.name} · REF: {p.ref}
                </button>
              )
            })}
          </CardContent>
        </Card>
      ) : null}

      {/* Items with price */}
      {items.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">รายการ ({items.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item, idx) => (
              <div key={item.product_id}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">REF: {item.ref}</p>
                  </div>
                  <button onClick={() => removeItem(idx)} className="p-1 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">จำนวน ({item.unit})</Label>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 0)}
                      className="mt-0.5"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">ราคาต่อหน่วย (฿)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.unit_price}
                      onChange={(e) => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)}
                      className="mt-0.5"
                    />
                  </div>
                </div>
                <Separator className="mt-3" />
              </div>
            ))}
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-medium">รวม</span>
              <span className="text-sm font-bold">{formatCurrency(totalAmount)}</span>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Expected Delivery + Notes */}
      {items.length > 0 ? (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">วันที่คาดว่าจะได้รับ</Label>
            <Input
              type="date"
              value={expectedDeliveryDate}
              onChange={(e) => setExpectedDeliveryDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">หมายเหตุ</Label>
            <Textarea
              placeholder="หมายเหตุเพิ่มเติม..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
              rows={2}
            />
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {items.length > 0 ? (
        <Button
          className="w-full"
          disabled={submitting || items.length === 0}
          onClick={handleSubmit}
        >
          {submitting ? "กำลังสร้าง..." : `สร้างใบสั่งซื้อ (${formatCurrency(totalAmount)})`}
        </Button>
      ) : null}
    </div>
  )
}
