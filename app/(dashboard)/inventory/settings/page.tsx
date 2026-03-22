"use client"

import { useState, useEffect, useTransition } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Trash2, GripVertical, Loader2 } from "lucide-react"
import ProductImportCard from "@/components/inventory/product-import-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  getProductCategories,
  addProductCategory,
  updateProductCategory,
  deleteProductCategory,
  getBrands,
  addBrand,
  updateBrand,
  deleteBrand,
} from "@/lib/actions/settings"

// ─── Editable List Section ──────────────────────────────────────────

function EditableListSection({
  title,
  description,
  items,
  onAdd,
  onToggle,
  onDelete,
  isLoading,
  showSlug,
}: {
  title: string
  description: string
  items: Array<{ id: string; name: string; slug?: string; is_active: boolean }>
  onAdd: (name: string, slug?: string) => Promise<void>
  onToggle: (id: string, isActive: boolean) => Promise<void>
  onDelete: (id: string) => Promise<void>
  isLoading: boolean
  showSlug?: boolean
}) {
  const [newName, setNewName] = useState("")
  const [newSlug, setNewSlug] = useState("")
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleAdd() {
    if (!newName.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        await onAdd(newName.trim(), showSlug ? (newSlug.trim() || newName.trim().toLowerCase().replace(/\s+/g, "_")) : undefined)
        setNewName("")
        setNewSlug("")
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
      }
    })
  }

  function handleToggle(id: string, currentActive: boolean) {
    startTransition(async () => {
      try {
        await onToggle(id, !currentActive)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
      }
    })
  }

  function handleDelete(id: string) {
    if (!confirm("ต้องการลบรายการนี้?")) return
    startTransition(async () => {
      try {
        await onDelete(id)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "ลบไม่สำเร็จ อาจมีข้อมูลที่อ้างอิงอยู่")
      }
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-1.5">
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                  !item.is_active ? "opacity-50" : ""
                }`}
              >
                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium">{item.name}</span>
                  {showSlug && item.slug && (
                    <span className="ml-2 text-xs text-muted-foreground">({item.slug})</span>
                  )}
                </div>
                <Badge
                  variant={item.is_active ? "default" : "secondary"}
                  className="shrink-0 cursor-pointer text-[10px]"
                  onClick={() => handleToggle(item.id, item.is_active)}
                >
                  {item.is_active ? "ใช้งาน" : "ปิด"}
                </Badge>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  disabled={isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {items.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">ยังไม่มีรายการ</p>
            )}
          </div>
        )}

        {/* Add new */}
        <div className="flex gap-2 pt-1">
          {showSlug && (
            <Input
              placeholder="slug (ภาษาอังกฤษ)"
              value={newSlug}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSlug(e.target.value)}
              className="flex-1 h-9 text-sm"
            />
          )}
          <Input
            placeholder="ชื่อรายการใหม่..."
            value={newName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && handleAdd()}
            className="flex-1 h-9 text-sm"
          />
          <Button
            size="sm"
            className="h-9 shrink-0"
            onClick={handleAdd}
            disabled={!newName.trim() || isPending}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Inventory Settings Page ────────────────────────────────────────

export default function InventorySettingsPage() {
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug?: string; is_active: boolean }>>([])
  const [brands, setBrands] = useState<Array<{ id: string; name: string; is_active: boolean }>>([])

  async function reload() {
    const [cats, brs] = await Promise.all([getProductCategories(), getBrands()])
    setCategories(cats.map((c) => ({ id: c.id, name: c.name, slug: c.slug, is_active: c.is_active })))
    setBrands(brs.map((b: { id: string; name: string; is_active: boolean }) => ({ id: b.id, name: b.name, is_active: b.is_active })))
    setLoading(false)
  }

  useEffect(() => { reload() }, [])

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/inventory">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">ตั้งค่าสินค้า</h1>
          <p className="text-sm text-muted-foreground">จัดการหมวดหมู่และยี่ห้อสินค้า</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <EditableListSection
          title="หมวดหมู่สินค้า"
          description="รายการหมวดหมู่สินค้าที่ใช้ในระบบสต็อก"
          items={categories}
          isLoading={loading}
          showSlug
          onAdd={async (name: string, slug?: string) => {
            await addProductCategory(slug ?? name.toLowerCase(), name)
            await reload()
          }}
          onToggle={async (id: string, isActive: boolean) => {
            await updateProductCategory(id, { is_active: isActive })
            await reload()
          }}
          onDelete={async (id: string) => {
            await deleteProductCategory(id)
            await reload()
          }}
        />

        <EditableListSection
          title="ยี่ห้อ (Brands)"
          description="รายการยี่ห้อสินค้าที่ใช้ในระบบ"
          items={brands}
          isLoading={loading}
          onAdd={async (name: string) => {
            await addBrand(name)
            await reload()
          }}
          onToggle={async (id: string, isActive: boolean) => {
            await updateBrand(id, { is_active: isActive })
            await reload()
          }}
          onDelete={async (id: string) => {
            await deleteBrand(id)
            await reload()
          }}
        />
      </div>

      {/* Product Import Section */}
      <ProductImportCard />
    </div>
  )
}
