"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Plus, Pencil, ToggleLeft, ToggleRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  createSupplier,
  updateSupplier,
  toggleSupplierActive,
} from "@/lib/actions/suppliers"

interface Supplier {
  id: string
  code: string
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  line_id: string | null
  address: string | null
  lead_time_days: number | null
  delivery_score: number | null
  is_active: boolean
  created_at: string
  product_count: number
  po_count: number
}

interface SupplierListProps {
  suppliers: Supplier[]
}

export function SupplierList({ suppliers }: SupplierListProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    if (!search.trim()) return suppliers
    const q = search.toLowerCase()
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q)
    )
  }, [suppliers, search])

  function openCreate() {
    setEditingSupplier(null)
    setDialogOpen(true)
  }

  function openEdit(supplier: Supplier) {
    setEditingSupplier(supplier)
    setDialogOpen(true)
  }

  function handleToggleActive(id: string) {
    startTransition(async () => {
      try {
        await toggleSupplierActive(id)
        router.refresh()
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : "เกิดข้อผิดพลาด")
      }
    })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)

    startTransition(async () => {
      try {
        if (editingSupplier) {
          await updateSupplier(editingSupplier.id, formData)
        } else {
          await createSupplier(formData)
        }
        setDialogOpen(false)
        router.refresh()
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
      }
    })
  }

  function scoreColor(score: number | null) {
    if (score === null || score === undefined) return "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400"
    if (score >= 7) return "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
    if (score >= 5) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400"
    return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="ค้นหาด้วยชื่อหรือรหัส..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          เพิ่ม Supplier
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>รหัส</TableHead>
              <TableHead>ชื่อ</TableHead>
              <TableHead>ผู้ติดต่อ</TableHead>
              <TableHead>โทร</TableHead>
              <TableHead>Lead Time</TableHead>
              <TableHead>คะแนน</TableHead>
              <TableHead className="text-center">สินค้า</TableHead>
              <TableHead className="text-center">PO</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  ไม่พบข้อมูล
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.code}</TableCell>
                  <TableCell>
                    <Link
                      href={`/suppliers/${s.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {s.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{s.contact_person ?? "-"}</TableCell>
                  <TableCell className="text-sm">{s.phone ?? "-"}</TableCell>
                  <TableCell className="text-sm">
                    {s.lead_time_days !== null ? `${s.lead_time_days} วัน` : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={scoreColor(s.delivery_score)}>
                      {s.delivery_score !== null ? s.delivery_score.toFixed(1) : "-"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-sm">{s.product_count}</TableCell>
                  <TableCell className="text-center text-sm">{s.po_count}</TableCell>
                  <TableCell>
                    <Badge
                      variant={s.is_active ? "default" : "secondary"}
                      className={
                        s.is_active
                          ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-500/20 dark:text-gray-400"
                      }
                    >
                      {s.is_active ? "ใช้งาน" : "ปิดใช้งาน"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(s)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={isPending}
                        onClick={() => handleToggleActive(s.id)}
                      >
                        {s.is_active ? (
                          <ToggleRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? "แก้ไข Supplier" : "เพิ่ม Supplier"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">รหัส *</Label>
                <Input
                  id="code"
                  name="code"
                  required
                  defaultValue={editingSupplier?.code ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">ชื่อ *</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  defaultValue={editingSupplier?.name ?? ""}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_person">ผู้ติดต่อ</Label>
                <Input
                  id="contact_person"
                  name="contact_person"
                  defaultValue={editingSupplier?.contact_person ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">โทรศัพท์</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={editingSupplier?.phone ?? ""}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">อีเมล</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={editingSupplier?.email ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="line_id">LINE ID</Label>
                <Input
                  id="line_id"
                  name="line_id"
                  defaultValue={editingSupplier?.line_id ?? ""}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">ที่อยู่</Label>
              <Input
                id="address"
                name="address"
                defaultValue={editingSupplier?.address ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead_time_days">Lead Time (วัน)</Label>
              <Input
                id="lead_time_days"
                name="lead_time_days"
                type="number"
                min={0}
                defaultValue={editingSupplier?.lead_time_days ?? ""}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
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
