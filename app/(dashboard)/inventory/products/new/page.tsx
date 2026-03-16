"use client"

import { useState, useEffect, useTransition, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Package,
  Loader2,
  Image as ImageIcon,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createProduct, getCategories } from "@/lib/actions/products"
import { getSuppliers } from "@/lib/actions/inventory"

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

// ─── Main Component ─────────────────────────────────────────────────

export default function NewProductPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Data loaded on mount
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [dataLoaded, setDataLoaded] = useState(false)

  // Image state
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load categories and suppliers on mount
  useEffect(() => {
    Promise.all([getCategories(), getSuppliers()]).then(([cats, sups]) => {
      setCategories([...cats])
      setSuppliers(sups)
      setDataLoaded(true)
    })
  }, [])

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
        setImageUrl(data.url)
      } catch (err) {
        setImagePreview(null)
        setImageUrl(null)
        setError(err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ")
      } finally {
        setUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    },
    []
  )

  const handleRemoveImage = useCallback(() => {
    setImagePreview(null)
    setImageUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [])

  // ─── Submit ─────────────────────────────────────────────────────

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    if (imageUrl) {
      formData.set("image_url", imageUrl)
    }

    startTransition(async () => {
      try {
        const newProduct = await createProduct(formData)
        router.push(`/inventory/products/${newProduct.id}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : "ไม่สามารถสร้างสินค้าได้")
      }
    })
  }

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/inventory">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">เพิ่มสินค้าใหม่</h1>
          <p className="text-xs text-muted-foreground">กรอกข้อมูลสินค้าเพื่อเพิ่มเข้าระบบ</p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4" />
              ข้อมูลสินค้า
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>รูปภาพสินค้า</Label>
              <div className="flex items-start gap-4">
                {imagePreview ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-32 w-32 rounded-lg border object-cover"
                    />
                    {uploading && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40">
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                      </div>
                    )}
                    {!uploading && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute -right-2 -top-2 rounded-full bg-destructive p-0.5 text-destructive-foreground shadow-sm hover:bg-destructive/90"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex h-32 w-32 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-muted-foreground hover:border-primary hover:text-primary transition-colors"
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
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-ref">รหัสสินค้า (REF) *</Label>
                <Input id="new-ref" name="ref" placeholder="เช่น IMP-001" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-name">ชื่อสินค้า *</Label>
                <Input id="new-name" name="name" placeholder="ชื่อสินค้า" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-brand">ยี่ห้อ</Label>
                <Input id="new-brand" name="brand" placeholder="ยี่ห้อ" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-category">หมวดหมู่</Label>
                <Select name="category">
                  <SelectTrigger id="new-category">
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
                <Label htmlFor="new-unit">หน่วย</Label>
                <Input id="new-unit" name="unit" placeholder="เช่น ชิ้น, ตัว, กล่อง" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-min-stock">สต็อกขั้นต่ำ</Label>
                <Input
                  id="new-min-stock"
                  name="min_stock_level"
                  type="number"
                  min={0}
                  defaultValue={0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-cost">ราคาต้นทุน (฿)</Label>
                <Input
                  id="new-cost"
                  name="cost_price"
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-supplier">Supplier</Label>
                <Select name="supplier_id">
                  <SelectTrigger id="new-supplier">
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
              <Label htmlFor="new-description">รายละเอียด</Label>
              <Textarea
                id="new-description"
                name="description"
                rows={3}
                placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับสินค้า"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" asChild>
                <Link href="/inventory">ยกเลิก</Link>
              </Button>
              <Button type="submit" disabled={isPending || !dataLoaded}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  "บันทึกสินค้า"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
