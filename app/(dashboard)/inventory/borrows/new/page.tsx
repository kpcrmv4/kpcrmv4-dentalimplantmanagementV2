"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createBorrow } from "@/lib/actions/borrows"
import { getSuppliers } from "@/lib/actions/inventory"

type BorrowItem = {
  id: string
  product_name: string
  product_id: string
  quantity: string
  lot_number: string
  expiry_date: string
}

function createEmptyItem(): BorrowItem {
  return {
    id: crypto.randomUUID(),
    product_name: "",
    product_id: "",
    quantity: "1",
    lot_number: "",
    expiry_date: "",
  }
}

export default function NewBorrowPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [sourceType, setSourceType] = useState<string>("clinic")
  const [sourceName, setSourceName] = useState("")
  const [supplierId, setSupplierId] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<BorrowItem[]>([createEmptyItem()])
  const [suppliers, setSuppliers] = useState<Array<{ id: string; code: string; name: string }>>([])
  const [products, setProducts] = useState<Array<{ id: string; name: string; ref: string }>>([])

  useEffect(() => {
    getSuppliers().then(setSuppliers)
    // Load all products for selection
    import("@/lib/actions/products").then(async (mod) => {
      const prods = await mod.getProductList()
      setProducts(prods)
    }).catch(() => {})
  }, [])

  function addItem() {
    setItems((prev) => [...prev, createEmptyItem()])
  }

  function removeItem(id: string) {
    setItems((prev) => prev.length <= 1 ? prev : prev.filter((i) => i.id !== id))
  }

  function updateItem(id: string, field: keyof Omit<BorrowItem, "id">, value: string) {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, [field]: value } : i))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!sourceName.trim()) {
      setError("กรุณาระบุแหล่งที่ยืม")
      return
    }

    const validItems = items.filter((i) => i.product_id && i.lot_number.trim())
    if (validItems.length === 0) {
      setError("กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ")
      return
    }

    startTransition(async () => {
      try {
        const borrow = await createBorrow({
          source_type: sourceType as "clinic" | "supplier",
          source_name: sourceName.trim(),
          supplier_id: sourceType === "supplier" ? supplierId : undefined,
          due_date: dueDate || undefined,
          notes: notes || undefined,
          items: validItems.map((i) => ({
            product_id: i.product_id,
            quantity: parseInt(i.quantity) || 1,
            lot_number: i.lot_number.trim(),
            expiry_date: i.expiry_date || undefined,
          })),
        })
        router.push(`/inventory/borrows/${borrow.id}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : "สร้างรายการไม่สำเร็จ")
      }
    })
  }

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/inventory/borrows"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-xl font-semibold">สร้างรายการยืมใหม่</h1>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">ข้อมูลการยืม</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>ประเภทแหล่งยืม *</Label>
                <Select value={sourceType} onValueChange={setSourceType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clinic">คลินิกอื่น</SelectItem>
                    <SelectItem value="supplier">Supplier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {sourceType === "supplier" && suppliers.length > 0 && (
                <div className="space-y-2">
                  <Label>เลือก Supplier</Label>
                  <Select value={supplierId} onValueChange={(val) => { setSupplierId(val); const s = suppliers.find((s) => s.id === val); if (s) setSourceName(s.name) }}>
                    <SelectTrigger><SelectValue placeholder="เลือก Supplier" /></SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>ชื่อแหล่งที่ยืม *</Label>
                <Input value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="ชื่อคลินิก/Supplier" />
              </div>
              <div className="space-y-2">
                <Label>กำหนดคืน</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>หมายเหตุ</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="หมายเหตุเพิ่มเติม..." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">รายการสินค้าที่ยืม</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-end gap-2 rounded-md border p-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <Label className="text-xs">สินค้า *</Label>
                  <Select value={item.product_id} onValueChange={(val) => updateItem(item.id, "product_id", val)}>
                    <SelectTrigger><SelectValue placeholder="เลือกสินค้า" /></SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.ref})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-20 space-y-1">
                  <Label className="text-xs">จำนวน *</Label>
                  <Input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(item.id, "quantity", e.target.value)} />
                </div>
                <div className="w-32 space-y-1">
                  <Label className="text-xs">LOT *</Label>
                  <Input value={item.lot_number} onChange={(e) => updateItem(item.id, "lot_number", e.target.value)} placeholder="LOT" />
                </div>
                <div className="w-36 space-y-1">
                  <Label className="text-xs">หมดอายุ</Label>
                  <Input type="date" value={item.expiry_date} onChange={(e) => updateItem(item.id, "expiry_date", e.target.value)} />
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeItem(item.id)} disabled={items.length <= 1}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="mr-1 h-3.5 w-3.5" /> เพิ่มสินค้า
            </Button>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="button" variant="outline" asChild>
            <Link href="/inventory/borrows">ยกเลิก</Link>
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            บันทึกรายการยืม
          </Button>
        </div>
      </form>
    </div>
  )
}
