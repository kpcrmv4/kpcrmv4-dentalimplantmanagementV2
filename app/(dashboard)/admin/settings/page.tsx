"use client"

import { useState, useEffect, useTransition } from "react"
import { Settings, Plus, Trash2, GripVertical, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  getProcedureTypes,
  addProcedureType,
  updateProcedureType,
  deleteProcedureType,
  getProductCategories,
  addProductCategory,
  updateProductCategory,
  deleteProductCategory,
} from "@/lib/actions/settings"

type ProcedureType = {
  id: string
  name: string
  sort_order: number
  is_active: boolean
}

type ProductCategory = {
  id: string
  slug: string
  name: string
  sort_order: number
  is_active: boolean
}

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

export default function AdminSettingsPage() {
  const [procedureTypes, setProcedureTypes] = useState<ProcedureType[]>([])
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getProcedureTypes(), getProductCategories()])
      .then(([pt, pc]) => {
        setProcedureTypes(pt)
        setProductCategories(pc)
      })
      .finally(() => setLoading(false))
  }, [])

  async function reload() {
    const [pt, pc] = await Promise.all([getProcedureTypes(), getProductCategories()])
    setProcedureTypes(pt)
    setProductCategories(pc)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 lg:p-6">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-muted-foreground" />
        <div>
          <h1 className="text-xl font-semibold">ตั้งค่าระบบ</h1>
          <p className="text-sm text-muted-foreground">จัดการรายการตัวเลือกที่ใช้ในระบบ</p>
        </div>
      </div>

      <EditableListSection
        title="ประเภทหัตถการ"
        description="รายการหัตถการที่แสดงในหน้าสร้างเคส"
        items={procedureTypes}
        isLoading={loading}
        onAdd={async (name: string) => {
          await addProcedureType(name)
          await reload()
        }}
        onToggle={async (id: string, isActive: boolean) => {
          await updateProcedureType(id, { is_active: isActive })
          await reload()
        }}
        onDelete={async (id: string) => {
          await deleteProcedureType(id)
          await reload()
        }}
      />

      <EditableListSection
        title="หมวดหมู่สินค้า"
        description="รายการหมวดหมู่สินค้าที่ใช้ในระบบสต็อก"
        items={productCategories}
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
    </div>
  )
}
