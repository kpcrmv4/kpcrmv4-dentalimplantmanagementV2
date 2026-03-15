"use client"

import { useState, useEffect, startTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Trash2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getSuppliers, getProductsBySupplier, receiveGoods } from "@/lib/actions/inventory"
import type { ProductCategory } from "@/types/database"

interface ReceiveItem {
  product_id: string
  product_name: string
  product_ref: string
  product_category: string
  lot_number: string
  quantity: number
  expiry_date: string
  unit: string
}

const STEPS = ["เลือก Supplier", "เลือกสินค้า", "กรอกรายละเอียด", "ยืนยัน"]

export default function ReceiveInventoryPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [suppliers, setSuppliers] = useState<Array<{ id: string; code: string; name: string }>>([])
  const [products, setProducts] = useState<Array<{ id: string; ref: string; name: string; brand: string | null; category: string; unit: string }>>([])
  const [selectedSupplier, setSelectedSupplier] = useState<string>("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [items, setItems] = useState<ReceiveItem[]>([])
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getSuppliers().then(setSuppliers).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedSupplier) {
      const cat = categoryFilter !== "all" ? categoryFilter as ProductCategory : undefined
      getProductsBySupplier(selectedSupplier, cat).then(setProducts).catch(() => {})
    }
  }, [selectedSupplier, categoryFilter])

  function handleSelectSupplier(supplierId: string) {
    setSelectedSupplier(supplierId)
    setSelectedProducts([])
    setItems([])
    setCategoryFilter("all")
    startTransition(() => setStep(1))
  }

  function toggleProduct(productId: string) {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    )
  }

  function goToDetails() {
    const newItems = selectedProducts.map((pid) => {
      const product = products.find((p) => p.id === pid)!
      const existing = items.find((i) => i.product_id === pid)
      return existing ?? {
        product_id: pid,
        product_name: product.name,
        product_ref: product.ref,
        product_category: product.category,
        lot_number: "",
        quantity: 1,
        expiry_date: "",
        unit: product.unit,
      }
    })
    setItems(newItems)
    startTransition(() => setStep(2))
  }

  function updateItem(index: number, field: keyof ReceiveItem, value: string | number) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
    setSelectedProducts((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      await receiveGoods(
        items.map((item) => ({
          product_id: item.product_id,
          lot_number: item.lot_number,
          quantity: item.quantity,
          expiry_date: item.expiry_date || null,
          po_id: null,
          invoice_number: invoiceNumber || null,
        }))
      )
      router.push("/inventory")
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
    } finally {
      setSubmitting(false)
    }
  }

  const isDetailsValid = items.every(
    (item) => item.lot_number.trim() && item.quantity > 0
  )

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
            <div
              className={`h-1 rounded-full ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
            <p className={`mt-1 text-[10px] ${i <= step ? "text-primary font-medium" : "text-muted-foreground"}`}>
              {s}
            </p>
          </div>
        ))}
      </div>

      {/* Step 0: Select Supplier */}
      {step === 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">เลือก Supplier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {suppliers.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelectSupplier(s.id)}
                className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 ${
                  selectedSupplier === s.id ? "border-primary bg-primary/5" : ""
                }`}
              >
                <p className="text-sm font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.code}</p>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Step 1: Select Products */}
      {step === 1 && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">
                  เลือกสินค้า ({selectedProducts.length} รายการ)
                </CardTitle>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-36 h-8 text-xs">
                    <SelectValue placeholder="หมวดหมู่" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    <SelectItem value="implant">Implant</SelectItem>
                    <SelectItem value="abutment">Abutment</SelectItem>
                    <SelectItem value="crown">Crown</SelectItem>
                    <SelectItem value="instrument">Instrument</SelectItem>
                    <SelectItem value="consumable">Consumable</SelectItem>
                    <SelectItem value="other">อื่นๆ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {products.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  ไม่พบสินค้าของ Supplier นี้
                </p>
              ) : (
                products.map((p) => {
                  const isSelected = selectedProducts.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleProduct(p.id)}
                      className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                        isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                      }`}
                    >
                      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        isSelected ? "border-primary bg-primary text-primary-foreground" : ""
                      }`}>
                        {isSelected ? <Check className="h-3 w-3" /> : null}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.brand ?? ""} · REF: {p.ref}
                        </p>
                      </div>
                    </button>
                  )
                })
              )}
            </CardContent>
          </Card>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep(0)}>
              ย้อนกลับ
            </Button>
            <Button
              size="sm"
              disabled={selectedProducts.length === 0}
              onClick={goToDetails}
            >
              ถัดไป ({selectedProducts.length})
            </Button>
          </div>
        </>
      )}

      {/* Step 2: Enter Details */}
      {step === 2 && (
        <>
          <div className="space-y-3">
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
            {items.map((item, idx) => (
              <Card key={item.product_id}>
                <CardContent className="space-y-2 p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">REF: {item.product_ref}</p>
                    </div>
                    <button
                      onClick={() => removeItem(idx)}
                      className="p-1 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[10px]">LOT Number *</Label>
                      <Input
                        placeholder="LOT"
                        value={item.lot_number}
                        onChange={(e) => updateItem(idx, "lot_number", e.target.value)}
                        className="mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">จำนวน ({item.unit}) *</Label>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 0)}
                        className="mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">วันหมดอายุ</Label>
                      <Input
                        type="date"
                        value={item.expiry_date}
                        onChange={(e) => updateItem(idx, "expiry_date", e.target.value)}
                        className="mt-0.5"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep(1)}>
              ย้อนกลับ
            </Button>
            <Button
              size="sm"
              disabled={!isDetailsValid || items.length === 0}
              onClick={() => startTransition(() => setStep(3))}
            >
              ตรวจสอบ
            </Button>
          </div>
        </>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">สรุปรายการรับของ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {invoiceNumber ? (
                <p className="text-xs text-muted-foreground">
                  Invoice: {invoiceNumber}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Supplier: {suppliers.find((s) => s.id === selectedSupplier)?.name}
              </p>
              <Separator />
              {items.map((item) => (
                <div key={item.product_id} className="flex items-center justify-between rounded-lg border p-2">
                  <div>
                    <p className="text-sm font-medium">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      REF: {item.product_ref} · LOT: {item.lot_number}
                      {item.expiry_date ? ` · Exp: ${item.expiry_date}` : ""}
                    </p>
                  </div>
                  <span className="text-sm font-medium">
                    {item.quantity} {item.unit}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep(2)}>
              แก้ไข
            </Button>
            <Button size="sm" disabled={submitting} onClick={handleSubmit}>
              {submitting ? "กำลังบันทึก..." : "ยืนยันรับของ"}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
