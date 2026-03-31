"use client"

import { useState, useEffect, useTransition } from "react"
import { Shield, Plus, Pencil, Key, Trash2, Loader2, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getUsers, updateUserRole, toggleUserActive, createUser, updateUserProfile, resetUserPassword, deleteUser } from "@/lib/actions/users"
import type { UserRole } from "@/types/database"

const ROLE_LABELS: Record<string, string> = {
  admin: "ผู้ดูแล",
  dentist: "ทันตแพทย์",
  stock_staff: "เจ้าหน้าที่สต็อก",
  assistant: "ผู้ช่วย",
  cs: "ประสานงาน",
}

const ROLES: UserRole[] = ["admin", "dentist", "stock_staff", "assistant", "cs"] as UserRole[]

type UserRow = {
  id: string
  email: string
  full_name: string
  role: string
  is_active: boolean
  phone: string | null
  created_at: string
}

type ModalState =
  | { type: "none" }
  | { type: "create" }
  | { type: "edit"; user: UserRow }
  | { type: "reset_password"; user: UserRow }

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [modal, setModal] = useState<ModalState>({ type: "none" })
  const [formError, setFormError] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  // Create form
  const [newEmail, setNewEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newName, setNewName] = useState("")
  const [newRole, setNewRole] = useState<string>("assistant")

  // Edit form
  const [editName, setEditName] = useState("")
  const [editPhone, setEditPhone] = useState("")

  // Reset password form
  const [resetPw, setResetPw] = useState("")

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    try {
      setLoading(true)
      const data = await getUsers()
      setUsers(data as UserRow[])
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
    } finally {
      setLoading(false)
    }
  }

  function handleRoleChange(userId: string, newRole: string) {
    startTransition(async () => {
      const result = await updateUserRole(userId, newRole as UserRole)
      if (!result.success) {
        setError(result.error ?? "เกิดข้อผิดพลาด")
        return
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      )
    })
  }

  function handleToggleActive(userId: string) {
    startTransition(async () => {
      const result = await toggleUserActive(userId)
      if (!result.success) {
        setError(result.error ?? "เกิดข้อผิดพลาด")
        return
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, is_active: !u.is_active } : u
        )
      )
    })
  }

  function openCreate() {
    setNewEmail("")
    setNewPassword("")
    setNewName("")
    setNewRole("assistant")
    setFormError(null)
    setModal({ type: "create" })
  }

  function openEdit(user: UserRow) {
    setEditName(user.full_name)
    setEditPhone(user.phone ?? "")
    setFormError(null)
    setModal({ type: "edit", user })
  }

  function openResetPassword(user: UserRow) {
    setResetPw("")
    setFormError(null)
    setModal({ type: "reset_password", user })
  }

  async function handleCreate() {
    if (!newEmail || !newPassword || !newName) {
      setFormError("กรุณากรอกข้อมูลให้ครบ")
      return
    }
    if (newPassword.length < 6) {
      setFormError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร")
      return
    }
    setFormLoading(true)
    setFormError(null)
    try {
      const result = await createUser(newEmail, newPassword, newName, newRole as UserRole)
      if (!result.success) {
        setFormError(result.error ?? "สร้างผู้ใช้ไม่สำเร็จ")
        return
      }
      setModal({ type: "none" })
      await loadUsers()
    } catch {
      setFormError("สร้างผู้ใช้ไม่สำเร็จ")
    } finally {
      setFormLoading(false)
    }
  }

  async function handleEdit() {
    if (modal.type !== "edit") return
    setFormLoading(true)
    setFormError(null)
    try {
      const result = await updateUserProfile(modal.user.id, { full_name: editName, phone: editPhone })
      if (!result.success) {
        setFormError(result.error ?? "แก้ไขไม่สำเร็จ")
        return
      }
      setModal({ type: "none" })
      await loadUsers()
    } catch {
      setFormError("แก้ไขไม่สำเร็จ")
    } finally {
      setFormLoading(false)
    }
  }

  async function handleResetPassword() {
    if (modal.type !== "reset_password") return
    if (!resetPw || resetPw.length < 6) {
      setFormError("รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร")
      return
    }
    setFormLoading(true)
    setFormError(null)
    try {
      const result = await resetUserPassword(modal.user.id, resetPw)
      if (!result.success) {
        setFormError(result.error ?? "รีเซ็ตรหัสผ่านไม่สำเร็จ")
        return
      }
      setModal({ type: "none" })
    } catch {
      setFormError("รีเซ็ตรหัสผ่านไม่สำเร็จ")
    } finally {
      setFormLoading(false)
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm("ต้องการลบผู้ใช้นี้?")) return
    startTransition(async () => {
      const result = await deleteUser(userId)
      if (!result.success) {
        setError(result.error ?? "ลบไม่สำเร็จ")
        return
      }
      await loadUsers()
    })
  }

  if (loading) {
    return (
      <div className="space-y-4 p-4 lg:p-6">
        <div className="h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 lg:p-6">
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <h1 className="text-xl font-semibold">จัดการผู้ใช้</h1>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          เพิ่มผู้ใช้
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            ผู้ใช้ทั้งหมด ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ชื่อ</TableHead>
                  <TableHead>อีเมล</TableHead>
                  <TableHead>บทบาท</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.full_name}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.email}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={u.role}
                        onValueChange={(val) => handleRoleChange(u.id, val)}
                        disabled={isPending}
                      >
                        <SelectTrigger className="w-[140px]" size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((role) => (
                            <SelectItem key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleToggleActive(u.id)}
                      >
                        <Badge
                          variant={u.is_active ? "default" : "destructive"}
                        >
                          {u.is_active ? "ใช้งาน" : "ปิดใช้งาน"}
                        </Badge>
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)} title="แก้ไข">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openResetPassword(u)} title="รีเซ็ตรหัสผ่าน">
                          <Key className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(u.id)} title="ลบ">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Overlay */}
      {modal.type !== "none" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-background p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {modal.type === "create" && "เพิ่มผู้ใช้ใหม่"}
                {modal.type === "edit" && `แก้ไข: ${modal.user.full_name}`}
                {modal.type === "reset_password" && `รีเซ็ตรหัสผ่าน: ${modal.user.full_name}`}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setModal({ type: "none" })}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {formError && (
              <p className="mb-3 rounded-md bg-destructive/10 p-2 text-sm text-destructive">{formError}</p>
            )}

            {modal.type === "create" && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">อีเมล *</Label>
                  <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} type="email" placeholder="email@example.com" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">รหัสผ่าน *</Label>
                  <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" placeholder="อย่างน้อย 6 ตัว" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">ชื่อ-นามสกุล *</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="ชื่อ นามสกุล" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">บทบาท</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={handleCreate} disabled={formLoading}>
                  {formLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  สร้างผู้ใช้
                </Button>
              </div>
            )}

            {modal.type === "edit" && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">ชื่อ-นามสกุล</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">เบอร์โทร</Label>
                  <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="08x-xxx-xxxx" className="mt-1" />
                </div>
                <Button className="w-full" onClick={handleEdit} disabled={formLoading}>
                  {formLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  บันทึก
                </Button>
              </div>
            )}

            {modal.type === "reset_password" && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">รหัสผ่านใหม่</Label>
                  <Input value={resetPw} onChange={(e) => setResetPw(e.target.value)} type="password" placeholder="อย่างน้อย 6 ตัว" className="mt-1" />
                </div>
                <Button className="w-full" onClick={handleResetPassword} disabled={formLoading}>
                  {formLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  รีเซ็ตรหัสผ่าน
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
