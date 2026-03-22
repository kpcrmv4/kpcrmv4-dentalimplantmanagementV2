"use client"

import { useState, useTransition, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import {
  Pencil,
  Package,
  AlertTriangle,
  Clock,
  ShoppingCart,
  TrendingUp,
  Image as ImageIcon,
  ToggleLeft,
  Loader2,
  Camera,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { updateProduct, toggleProductActive, uploadProductImage } from "@/lib/actions/products"
import { formatDate, formatCurrency } from "@/lib/utils"

// ─── Types ──────────────────────────────────────────────────────────

interface Category {
  value: string
  label: string
}

interface Supplier {
  id: string
  code: string
  name: string
}

interface InventoryLot {
  id: string
  lot_number: string
  quantity: number
  reserved_quantity: number
  available_quantity: number
  expiry_date: string | null
  received_date: string | null
}

interface OrderHistoryItem {
  po_number: string
  supplier_name: string | null
  quantity: number
  unit_price: number | null
  status: string
  expected_delivery_date: string | null
  created_at: string
}

interface UsageHistoryItem {
  case_number: string
  patient_name: string | null
  quantity_reserved: number
  quantity_used: number | null
  status: string
  reserved_at: string | null
  scheduled_date: string | null
}

interface ProductData {
  id: string
  ref: string
  name: string
  brand: string | null
  category: string | null
  description: string | null
  unit: string | null
  min_stock_level: number
  cost_price: number | null
  supplier_id: string | null
  image_url: string | null
  is_active: boolean
  supplier: { name: string; code: string } | null
  inventory_lots: InventoryLot[]
  stock_summary: {
    total_in_stock: number
    total_reserved: number
    total_available: number
  }
  pending_order_quantity: number
}

// ─── Status Config ──────────────────────────────────────────────────

const PO_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: "ร่าง", color: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400" },
  pending_approval: { label: "รออนุมัติ", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400" },
  approved: { label: "อนุมัติ", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" },
  ordered: { label: "สั่งแล้ว", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400" },
  partially_received: { label: "รับบางส่วน", color: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400" },
  received: { label: "รับแล้ว", color: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" },
  cancelled: { label: "ยกเลิก", color: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" },
}

const RESERVATION_STATUS: Record<string, { label: string; color: string }> = {
  reserved: { label: "จองแล้ว", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400" },
  prepared: { label: "จัดเตรียมแล้ว", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" },
  consumed: { label: "ใช้แล้ว", color: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" },
  returned: { label: "คืนแล้ว", color: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400" },
}

// Category labels are derived from the categories prop in the component

// ─── Image Compression Helper ───────────────────────────────────────

function compressImage(file: File, maxSize: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height * maxSize) / width)
          width = maxSize
        } else {
          width = Math.round((width * maxSize) / height)
          height = maxSize
        }
      }
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")
      if (!ctx) { reject(new Error("Canvas context not available")); return }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("Failed to compress")),
        "image/jpeg",
        quality
      )
    }

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image")) }
    img.src = url
  })
}

// ─── Main Client Component ──────────────────────────────────────────

export function ProductDetailClient({
  product,
  orderHistory,
  usageHistory,
  categories,
  brands,
  suppliers,
}: {
  product: ProductData
  orderHistory: OrderHistoryItem[]
  usageHistory: UsageHistoryItem[]
  categories: Category[]
  brands: { id: string; name: string }[]
  suppliers: Supplier[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Image upload state
  const [imagePreview, setImagePreview] = useState<string | null>(product.image_url)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ─── Image Upload ───────────────────────────────────────────────

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setUploading(true)
      try {
        const localUrl = URL.createObjectURL(file)
        setImagePreview(localUrl)

        const compressed = await compressImage(file, 1200, 0.7)
        const formData = new FormData()
        formData.append("file", compressed, file.name)
        formData.append("folder", "products")

        const res = await fetch("/api/upload-photo", {
          method: "POST",
          body: formData,
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "อัปโหลดไม่สำเร็จ")

        URL.revokeObjectURL(localUrl)
        setImagePreview(data.url)

        await uploadProductImage(product.id, data.url)
        router.refresh()
      } catch (err) {
        setImagePreview(product.image_url)
        setError(err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ")
      } finally {
        setUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    },
    [product.id, product.image_url, router]
  )

  // ─── Toggle Active ──────────────────────────────────────────────

  function handleToggleActive() {
    startTransition(async () => {
      try {
        await toggleProductActive(product.id)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
      }
    })
  }

  // ─── Edit Submit ────────────────────────────────────────────────

  function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    // Carry over the current image_url
    if (imagePreview && !formData.get("image_url")) {
      formData.set("image_url", imagePreview)
    }

    startTransition(async () => {
      try {
        await updateProduct(product.id, formData)
        setEditOpen(false)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "ไม่สามารถแก้ไขสินค้าได้")
      }
    })
  }

  // ─── Helpers ────────────────────────────────────────────────────

  function isExpiringSoon(dateStr: string | null): boolean {
    if (!dateStr) return false
    const expiry = new Date(dateStr)
    const now = new Date()
    const diff = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return diff <= 30 && diff >= 0
  }

  function isExpired(dateStr: string | null): boolean {
    if (!dateStr) return false
    return new Date(dateStr) < new Date()
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ─── Product Info Card ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4" />
              ข้อมูลสินค้า
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleActive}
                disabled={isPending}
              >
                <ToggleLeft className="mr-1 h-3.5 w-3.5" />
                {product.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
              </Button>
              <Button size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="mr-1 h-3.5 w-3.5" />
                แก้ไข
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row">
            {/* Image */}
            <div className="relative shrink-0">
              {imagePreview ? (
                <div className="relative h-40 w-40 overflow-hidden rounded-lg border">
                  <Image
                    src={imagePreview}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-40 w-40 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  {uploading ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    <>
                      <ImageIcon className="h-8 w-8" />
                      <span className="text-xs">เพิ่มรูปภาพ</span>
                    </>
                  )}
                </button>
              )}
              {imagePreview && !uploading && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1 right-1 rounded-full bg-background/80 p-1 shadow hover:bg-background"
                >
                  <Camera className="h-4 w-4" />
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>

            {/* Details */}
            <div className="flex-1 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{product.name}</h2>
                <Badge
                  variant={product.is_active ? "default" : "destructive"}
                  className={product.is_active ? "bg-green-600 text-white" : "bg-red-600 text-white"}
                >
                  {product.is_active ? "ใช้งาน" : "ปิดใช้งาน"}
                </Badge>
              </div>
              <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                <p><span className="text-muted-foreground">REF:</span> {product.ref}</p>
                <p><span className="text-muted-foreground">ยี่ห้อ:</span> {product.brand ?? "-"}</p>
                <p><span className="text-muted-foreground">หมวดหมู่:</span> {product.category ? (categories.find((c) => c.value === product.category)?.label ?? product.category) : "-"}</p>
                <p><span className="text-muted-foreground">หน่วย:</span> {product.unit ?? "-"}</p>
                <p><span className="text-muted-foreground">สต็อกขั้นต่ำ:</span> {product.min_stock_level}</p>
                <p><span className="text-muted-foreground">ราคาต้นทุน:</span> {product.cost_price != null ? formatCurrency(product.cost_price) : "-"}</p>
                <p><span className="text-muted-foreground">Supplier:</span> {product.supplier?.name ?? "-"}</p>
              </div>
              {product.description && (
                <>
                  <Separator />
                  <p><span className="text-muted-foreground">รายละเอียด:</span> {product.description}</p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Stock Status Card ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">สถานะสต็อก</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-500/10">
              <p className="text-xs text-blue-600 dark:text-blue-400">ในคลัง</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {product.stock_summary.total_in_stock}
              </p>
            </div>
            <div className="rounded-lg bg-orange-50 p-3 dark:bg-orange-500/10">
              <p className="text-xs text-orange-600 dark:text-orange-400">จองแล้ว</p>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                {product.stock_summary.total_reserved}
              </p>
            </div>
            <div className="rounded-lg bg-green-50 p-3 dark:bg-green-500/10">
              <p className="text-xs text-green-600 dark:text-green-400">พร้อมใช้</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                {product.stock_summary.total_available}
              </p>
            </div>
            <div className="rounded-lg bg-indigo-50 p-3 dark:bg-indigo-500/10">
              <p className="text-xs text-indigo-600 dark:text-indigo-400">กำลังสั่ง</p>
              <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                {product.pending_order_quantity}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Lot Breakdown Table ───────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">รายละเอียด LOT</CardTitle>
        </CardHeader>
        <CardContent>
          {product.inventory_lots.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">ไม่มีสต็อกในระบบ</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lot Number</TableHead>
                    <TableHead className="text-right">จำนวน</TableHead>
                    <TableHead className="text-right">จอง</TableHead>
                    <TableHead className="text-right">พร้อมใช้</TableHead>
                    <TableHead>วันหมดอายุ</TableHead>
                    <TableHead>วันที่รับ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.inventory_lots.map((lot) => (
                    <TableRow key={lot.id}>
                      <TableCell className="font-medium">{lot.lot_number}</TableCell>
                      <TableCell className="text-right">{lot.quantity}</TableCell>
                      <TableCell className="text-right">{lot.reserved_quantity}</TableCell>
                      <TableCell className="text-right">{lot.available_quantity}</TableCell>
                      <TableCell>
                        {lot.expiry_date ? (
                          <span
                            className={
                              isExpired(lot.expiry_date)
                                ? "font-medium text-red-600"
                                : isExpiringSoon(lot.expiry_date)
                                  ? "font-medium text-red-500"
                                  : ""
                            }
                          >
                            {formatDate(lot.expiry_date)}
                            {isExpired(lot.expiry_date) && (
                              <AlertTriangle className="ml-1 inline h-3.5 w-3.5 text-red-500" />
                            )}
                            {!isExpired(lot.expiry_date) && isExpiringSoon(lot.expiry_date) && (
                              <Clock className="ml-1 inline h-3.5 w-3.5 text-red-500" />
                            )}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{lot.received_date ? formatDate(lot.received_date) : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── History Tabs ──────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="orders">
            <TabsList>
              <TabsTrigger value="orders">
                <ShoppingCart className="mr-1 h-3.5 w-3.5" />
                ประวัติสั่งซื้อ
              </TabsTrigger>
              <TabsTrigger value="usage">
                <TrendingUp className="mr-1 h-3.5 w-3.5" />
                ประวัติการใช้
              </TabsTrigger>
            </TabsList>

            {/* ─── PO History ──────────────────────────────────────── */}
            <TabsContent value="orders" className="mt-4">
              {orderHistory.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">ไม่มีประวัติการสั่งซื้อ</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>เลข PO</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead className="text-right">จำนวน</TableHead>
                        <TableHead className="text-right">ราคา/หน่วย</TableHead>
                        <TableHead>สถานะ</TableHead>
                        <TableHead>วันที่คาดรับ</TableHead>
                        <TableHead>วันที่สั่ง</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderHistory.map((item, idx) => {
                        const st = PO_STATUS[item.status] ?? { label: item.status, color: "bg-gray-100 text-gray-700" }
                        return (
                          <TableRow key={`${item.po_number}-${idx}`}>
                            <TableCell className="font-medium">{item.po_number}</TableCell>
                            <TableCell>{item.supplier_name ?? "-"}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">
                              {item.unit_price != null ? formatCurrency(item.unit_price) : "-"}
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${st.color}`}>
                                {st.label}
                              </span>
                            </TableCell>
                            <TableCell>
                              {item.expected_delivery_date ? formatDate(item.expected_delivery_date) : "-"}
                            </TableCell>
                            <TableCell>{formatDate(item.created_at)}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* ─── Usage History ────────────────────────────────────── */}
            <TabsContent value="usage" className="mt-4">
              {usageHistory.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">ไม่มีประวัติการใช้งาน</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>เลขเคส</TableHead>
                        <TableHead>คนไข้</TableHead>
                        <TableHead className="text-right">จำนวนจอง</TableHead>
                        <TableHead className="text-right">จำนวนใช้</TableHead>
                        <TableHead>สถานะ</TableHead>
                        <TableHead>วันนัด</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usageHistory.map((item, idx) => {
                        const st = RESERVATION_STATUS[item.status] ?? { label: item.status, color: "bg-gray-100 text-gray-700" }
                        return (
                          <TableRow key={`${item.case_number}-${idx}`}>
                            <TableCell>
                              <Link
                                href={`/cases/${item.case_number}`}
                                className="font-medium text-primary hover:underline"
                              >
                                {item.case_number}
                              </Link>
                            </TableCell>
                            <TableCell>{item.patient_name ?? "-"}</TableCell>
                            <TableCell className="text-right">{item.quantity_reserved}</TableCell>
                            <TableCell className="text-right">{item.quantity_used ?? "-"}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${st.color}`}>
                                {st.label}
                              </span>
                            </TableCell>
                            <TableCell>
                              {item.scheduled_date ? formatDate(item.scheduled_date) : "-"}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ─── Edit Product Dialog ───────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>แก้ไขสินค้า</DialogTitle>
            <DialogDescription>แก้ไขข้อมูลสินค้า {product.ref} - {product.name}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <input type="hidden" name="image_url" value={imagePreview ?? ""} />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-ref">รหัสสินค้า (REF) *</Label>
                <Input id="edit-ref" name="ref" defaultValue={product.ref} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name">ชื่อสินค้า *</Label>
                <Input id="edit-name" name="name" defaultValue={product.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-brand">ยี่ห้อ</Label>
                <Select name="brand" defaultValue={product.brand ?? ""}>
                  <SelectTrigger id="edit-brand">
                    <SelectValue placeholder="เลือกยี่ห้อ" />
                  </SelectTrigger>
                  <SelectContent>
                    {product.brand && !brands.some((b) => b.name === product.brand) && (
                      <SelectItem value={product.brand}>{product.brand}</SelectItem>
                    )}
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={b.name}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">หมวดหมู่</Label>
                <Select name="category" defaultValue={product.category ?? ""}>
                  <SelectTrigger id="edit-category">
                    <SelectValue placeholder="เลือกหมวดหมู่" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-unit">หน่วย</Label>
                <Input id="edit-unit" name="unit" defaultValue={product.unit ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-min-stock">สต็อกขั้นต่ำ</Label>
                <Input
                  id="edit-min-stock"
                  name="min_stock_level"
                  type="number"
                  min={0}
                  defaultValue={product.min_stock_level}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cost">ราคาต้นทุน (฿)</Label>
                <Input
                  id="edit-cost"
                  name="cost_price"
                  type="number"
                  step="0.01"
                  min={0}
                  defaultValue={product.cost_price ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-supplier">Supplier</Label>
                <Select name="supplier_id" defaultValue={product.supplier_id ?? ""}>
                  <SelectTrigger id="edit-supplier">
                    <SelectValue placeholder="เลือก Supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">รายละเอียด</Label>
              <Textarea
                id="edit-description"
                name="description"
                rows={3}
                defaultValue={product.description ?? ""}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
