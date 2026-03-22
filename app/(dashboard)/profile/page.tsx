"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  User,
  Lock,
  LogOut,
  Shield,
  Loader2,
  MessageCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"

const ROLE_LABELS: Record<string, string> = {
  admin: "ผู้ดูแลระบบ",
  dentist: "ทันตแพทย์",
  stock_staff: "เจ้าหน้าที่สต็อก",
  assistant: "ผู้ช่วยทันตแพทย์",
  cs: "CS",
}

export default function ProfilePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get("tab") === "security" ? "security" : "profile"

  const [user, setUser] = useState<{
    full_name: string
    email: string
    phone: string
    role: string
    line_user_id: string
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // Password
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ text: string; success: boolean } | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return
      const { data } = await supabase
        .from("users")
        .select("full_name, email, phone, role, line_user_id")
        .eq("id", authUser.id)
        .single()
      if (data) {
        setUser({
          full_name: data.full_name as string,
          email: data.email as string,
          phone: (data.phone as string) ?? "",
          role: data.role as string,
          line_user_id: (data.line_user_id as string) ?? "",
        })
      }
    }
    load()
  }, [])

  async function handleSave() {
    if (!user) return
    setSaving(true)
    setMessage(null)
    try {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) throw new Error("Unauthorized")
      const { error } = await supabase
        .from("users")
        .update({
          full_name: user.full_name,
          phone: user.phone || null,
          line_user_id: user.line_user_id || null,
        })
        .eq("id", authUser.id)
      if (error) throw error
      setMessage("บันทึกสำเร็จ")
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword() {
    if (!newPassword || !confirmPassword) {
      setPasswordMessage({ text: "กรุณากรอกรหัสผ่านให้ครบ", success: false })
      return
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ text: "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร", success: false })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ text: "รหัสผ่านใหม่ไม่ตรงกัน", success: false })
      return
    }

    setSavingPassword(true)
    setPasswordMessage(null)
    try {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser?.email) throw new Error("ไม่พบข้อมูลผู้ใช้")

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: authUser.email,
        password: currentPassword,
      })
      if (signInError) {
        setPasswordMessage({ text: "รหัสผ่านปัจจุบันไม่ถูกต้อง", success: false })
        return
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      setPasswordMessage({ text: "เปลี่ยนรหัสผ่านสำเร็จ", success: true })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err) {
      setPasswordMessage({
        text: err instanceof Error ? err.message : "เกิดข้อผิดพลาด",
        success: false,
      })
    } finally {
      setSavingPassword(false)
    }
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  if (!user) {
    return (
      <div className="space-y-4 p-4 lg:p-6">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold">โปรไฟล์</h1>
        <p className="text-sm text-muted-foreground">จัดการข้อมูลส่วนตัวและความปลอดภัย</p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="mb-6 w-full sm:w-auto">
          <TabsTrigger value="profile" className="gap-1.5">
            <User className="h-3.5 w-3.5" />
            <span>โปรไฟล์</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            <span>ความปลอดภัย</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: โปรไฟล์ */}
        <TabsContent value="profile">
          <div className="mx-auto max-w-xl space-y-4">
            {/* User info summary */}
            <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
                {user.full_name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{user.full_name}</p>
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              </div>
              <Badge variant="secondary" className="shrink-0">
                {ROLE_LABELS[user.role] ?? user.role}
              </Badge>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">ข้อมูลส่วนตัว</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">ชื่อ-นามสกุล</Label>
                    <Input
                      value={user.full_name}
                      onChange={(e) => setUser({ ...user, full_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">เบอร์โทร</Label>
                    <Input
                      value={user.phone}
                      onChange={(e) => setUser({ ...user, phone: e.target.value })}
                      placeholder="08x-xxx-xxxx"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs">
                    <MessageCircle className="h-3 w-3" />
                    LINE User ID
                  </Label>
                  <Input
                    value={user.line_user_id}
                    onChange={(e) => setUser({ ...user, line_user_id: e.target.value })}
                    placeholder="สำหรับรับแจ้งเตือนผ่าน LINE"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    ใช้สำหรับรับการแจ้งเตือนส่วนตัวผ่าน LINE
                  </p>
                </div>

                {message ? (
                  <p className={`text-sm rounded-lg px-3 py-2 ${
                    message === "บันทึกสำเร็จ"
                      ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                      : "bg-destructive/10 text-destructive"
                  }`}>
                    {message}
                  </p>
                ) : null}

                <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังบันทึก...</> : "บันทึกข้อมูล"}
                </Button>
              </CardContent>
            </Card>

            {/* Logout button */}
            <Button variant="destructive" className="w-full" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              ออกจากระบบ
            </Button>
          </div>
        </TabsContent>

        {/* Tab: ความปลอดภัย */}
        <TabsContent value="security">
          <div className="mx-auto max-w-xl space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Lock className="h-4 w-4" />
                  เปลี่ยนรหัสผ่าน
                </CardTitle>
                <p className="text-xs text-muted-foreground">รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">รหัสผ่านปัจจุบัน</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่านปัจจุบัน"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">รหัสผ่านใหม่</Label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="อย่างน้อย 6 ตัวอักษร"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">ยืนยันรหัสผ่านใหม่</Label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                    />
                  </div>
                </div>

                {passwordMessage ? (
                  <p className={`text-sm rounded-lg px-3 py-2 ${
                    passwordMessage.success
                      ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                      : "bg-destructive/10 text-destructive"
                  }`}>
                    {passwordMessage.text}
                  </p>
                ) : null}

                <Button
                  onClick={handleChangePassword}
                  disabled={savingPassword}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  {savingPassword ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังเปลี่ยน...</> : "เปลี่ยนรหัสผ่าน"}
                </Button>
              </CardContent>
            </Card>

            {/* Logout button */}
            <Button variant="destructive" className="w-full" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              ออกจากระบบ
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
