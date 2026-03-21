"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { User, Bell, Webhook, Lock, LogOut, Settings, Plus, Trash2, GripVertical, Loader2, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { createClient } from "@/lib/supabase/client"
import { getAppSettings, updateAppSettings } from "@/lib/actions/webhooks"
import {
  getProcedureTypes,
  addProcedureType,
  updateProcedureType,
  deleteProcedureType,
  getNotificationSettings,
  updateNotificationSetting,
  updateLineSettings,
  getLineSettings,
} from "@/lib/actions/settings"

// ─── Editable List (reused from admin/settings) ─────────────────────

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

// ─── Settings Page ──────────────────────────────────────────────────

type ProcedureType = { id: string; name: string; sort_order: number; is_active: boolean }


export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<{
    full_name: string
    email: string
    phone: string
    role: string
    line_user_id: string
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ text: string; success: boolean } | null>(null)

  // Discord webhook state (admin only)
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState("")
  const [savingWebhook, setSavingWebhook] = useState(false)
  const [webhookMessage, setWebhookMessage] = useState<string | null>(null)

  // System settings state (admin only)
  const [procedureTypes, setProcedureTypes] = useState<ProcedureType[]>([])
  const [systemLoading, setSystemLoading] = useState(true)
  const [notifSettings, setNotifSettings] = useState<Array<Record<string, unknown>>>([])

  // LINE settings
  const [lineToken, setLineToken] = useState("")
  const [lineSecret, setLineSecret] = useState("")
  const [lineEnabled, setLineEnabled] = useState(false)
  const [savingLine, setSavingLine] = useState(false)
  const [lineMessage, setLineMessage] = useState<string | null>(null)

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

        // Load admin-only data
        if (data.role === "admin") {
          try {
            const [settings, pt, ns, lineCfg] = await Promise.all([
              getAppSettings(),
              getProcedureTypes(),
              getNotificationSettings(),
              getLineSettings(),
            ])
            if (settings?.discord_webhook_url) {
              setDiscordWebhookUrl(settings.discord_webhook_url)
            }
            setProcedureTypes(pt)
            setNotifSettings(ns)
            if (lineCfg) {
              setLineToken(lineCfg.line_channel_access_token ?? "")
              setLineSecret(lineCfg.line_channel_secret ?? "")
              setLineEnabled(lineCfg.line_notify_enabled ?? false)
            }
          } catch {
            // ignore
          } finally {
            setSystemLoading(false)
          }
        }
      }
    }
    load()
  }, [])

  async function reloadSystemSettings() {
    const [pt, ns] = await Promise.all([
      getProcedureTypes(), getNotificationSettings()
    ])
    setProcedureTypes(pt)
    setNotifSettings(ns)
  }

  async function handleSaveLine() {
    setSavingLine(true)
    setLineMessage(null)
    try {
      await updateLineSettings({
        line_channel_access_token: lineToken || undefined,
        line_channel_secret: lineSecret || undefined,
        line_notify_enabled: lineEnabled,
      })
      setLineMessage("บันทึกสำเร็จ")
    } catch (err) {
      setLineMessage(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
    } finally {
      setSavingLine(false)
    }
  }

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

  async function handleSaveWebhook() {
    setSavingWebhook(true)
    setWebhookMessage(null)
    try {
      await updateAppSettings(discordWebhookUrl)
      setWebhookMessage("บันทึก Webhook สำเร็จ")
    } catch (err) {
      setWebhookMessage(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
    } finally {
      setSavingWebhook(false)
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

  const ROLE_LABELS: Record<string, string> = {
    admin: "ผู้ดูแลระบบ",
    dentist: "ทันตแพทย์",
    stock_staff: "เจ้าหน้าที่สต็อก",
    assistant: "ผู้ช่วยทันตแพทย์",
    cs: "CS",
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
    <div className="mx-auto max-w-2xl space-y-6 p-4 lg:p-6">
      {/* ── Section: ข้อมูลส่วนตัว ── */}
      <div>
        <h1 className="text-xl font-semibold">ตั้งค่า</h1>
        <p className="text-sm text-muted-foreground">จัดการข้อมูลส่วนตัวและการตั้งค่าระบบ</p>
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          <User className="h-4 w-4" />
          ข้อมูลส่วนตัว
        </h2>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4" />
                โปรไฟล์
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">อีเมล</Label>
                <Input value={user.email} disabled className="mt-1 bg-muted" />
              </div>
              <div>
                <Label className="text-xs">บทบาท</Label>
                <Input
                  value={ROLE_LABELS[user.role] ?? user.role}
                  disabled
                  className="mt-1 bg-muted"
                />
              </div>
              <div>
                <Label className="text-xs">ชื่อ-นามสกุล</Label>
                <Input
                  value={user.full_name}
                  onChange={(e) => setUser({ ...user, full_name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">เบอร์โทร</Label>
                <Input
                  value={user.phone}
                  onChange={(e) => setUser({ ...user, phone: e.target.value })}
                  placeholder="08x-xxx-xxxx"
                  className="mt-1"
                />
              </div>
              <Separator />
              <div>
                <Label className="flex items-center gap-2 text-xs">
                  <Bell className="h-3 w-3" />
                  LINE User ID
                </Label>
                <Input
                  value={user.line_user_id}
                  onChange={(e) => setUser({ ...user, line_user_id: e.target.value })}
                  placeholder="สำหรับรับแจ้งเตือนผ่าน LINE"
                  className="mt-1"
                />
              </div>

              {message ? (
                <p className={`text-sm ${message === "บันทึกสำเร็จ" ? "text-green-600" : "text-destructive"}`}>
                  {message}
                </p>
              ) : null}

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </CardContent>
          </Card>

          {/* Password Change */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Lock className="h-4 w-4" />
                เปลี่ยนรหัสผ่าน
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">รหัสผ่านปัจจุบัน</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่านปัจจุบัน"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">รหัสผ่านใหม่</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">ยืนยันรหัสผ่านใหม่</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                  className="mt-1"
                />
              </div>

              {passwordMessage ? (
                <p className={`text-sm ${passwordMessage.success ? "text-green-600" : "text-destructive"}`}>
                  {passwordMessage.text}
                </p>
              ) : null}

              <Button
                onClick={handleChangePassword}
                disabled={savingPassword}
                variant="outline"
                className="w-full"
              >
                {savingPassword ? "กำลังเปลี่ยนรหัสผ่าน..." : "เปลี่ยนรหัสผ่าน"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Section: ตั้งค่าระบบ (Admin Only) ── */}
      {user.role === "admin" && (
        <div>
          <Separator className="mb-6" />

          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            <Settings className="h-4 w-4" />
            ตั้งค่าระบบ
          </h2>

          <div className="space-y-4">
            {/* Discord Webhook */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Webhook className="h-4 w-4" />
                  Discord Webhook
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Webhook URL</Label>
                  <Input
                    value={discordWebhookUrl}
                    onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                    placeholder="https://discord.com/api/webhooks/..."
                    className="mt-1"
                    type="url"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    ระบบจะส่งแจ้งเตือนไปยัง Discord เมื่อมีการแจ้งเตือนใหม่
                  </p>
                </div>

                {webhookMessage ? (
                  <p
                    className={`text-sm ${
                      webhookMessage.includes("สำเร็จ")
                        ? "text-green-600"
                        : "text-destructive"
                    }`}
                  >
                    {webhookMessage}
                  </p>
                ) : null}

                <Button
                  onClick={handleSaveWebhook}
                  disabled={savingWebhook}
                  variant="outline"
                  className="w-full"
                >
                  {savingWebhook ? "กำลังบันทึก..." : "บันทึก Webhook"}
                </Button>
              </CardContent>
            </Card>

            {/* Procedure Types */}
            <EditableListSection
              title="ประเภทหัตถการ"
              description="รายการหัตถการที่แสดงในหน้าสร้างเคส"
              items={procedureTypes}
              isLoading={systemLoading}
              onAdd={async (name: string) => {
                await addProcedureType(name)
                await reloadSystemSettings()
              }}
              onToggle={async (id: string, isActive: boolean) => {
                await updateProcedureType(id, { is_active: isActive })
                await reloadSystemSettings()
              }}
              onDelete={async (id: string) => {
                await deleteProcedureType(id)
                await reloadSystemSettings()
              }}
            />

            {/* LINE Messaging API */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <MessageCircle className="h-4 w-4" />
                  LINE Messaging API
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">เปิดใช้งาน LINE Notification</Label>
                  <Switch checked={lineEnabled} onCheckedChange={setLineEnabled} />
                </div>
                <div>
                  <Label className="text-xs">Channel Access Token</Label>
                  <Input
                    value={lineToken}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLineToken(e.target.value)}
                    placeholder="Channel Access Token จาก LINE Developers"
                    className="mt-1"
                    type="password"
                  />
                </div>
                <div>
                  <Label className="text-xs">Channel Secret</Label>
                  <Input
                    value={lineSecret}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLineSecret(e.target.value)}
                    placeholder="Channel Secret จาก LINE Developers"
                    className="mt-1"
                    type="password"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  สร้าง LINE Official Account แล้วเปิด Messaging API ที่ LINE Developers Console
                </p>
                {lineMessage && (
                  <p className={`text-sm ${lineMessage.includes("สำเร็จ") ? "text-green-600" : "text-destructive"}`}>
                    {lineMessage}
                  </p>
                )}
                <Button onClick={handleSaveLine} disabled={savingLine} variant="outline" className="w-full">
                  {savingLine ? "กำลังบันทึก..." : "บันทึก LINE Settings"}
                </Button>
              </CardContent>
            </Card>

            {/* Notification Preferences */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Bell className="h-4 w-4" />
                  ตั้งค่าการแจ้งเตือน
                </CardTitle>
                <p className="text-xs text-muted-foreground">กำหนดค่าเริ่มต้นว่าจะแจ้งเตือนผ่านช่องทางไหนบ้าง</p>
              </CardHeader>
              <CardContent>
                {systemLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="grid grid-cols-[1fr_60px_60px_60px] gap-2 text-[10px] font-medium text-muted-foreground uppercase">
                      <span>เหตุการณ์</span>
                      <span className="text-center">In-App</span>
                      <span className="text-center">LINE</span>
                      <span className="text-center">Discord</span>
                    </div>
                    {notifSettings.map((ns) => (
                      <div key={ns.id as string} className="grid grid-cols-[1fr_60px_60px_60px] gap-2 items-center rounded-lg border px-3 py-2">
                        <div>
                          <p className="text-xs font-medium">{ns.event_label as string}</p>
                          <p className="text-[10px] text-muted-foreground">{ns.description as string}</p>
                        </div>
                        <div className="flex justify-center">
                          <Switch
                            checked={ns.default_in_app as boolean}
                            onCheckedChange={async (val: boolean) => {
                              await updateNotificationSetting(ns.id as string, { default_in_app: val })
                              await reloadSystemSettings()
                            }}
                          />
                        </div>
                        <div className="flex justify-center">
                          <Switch
                            checked={ns.default_line as boolean}
                            onCheckedChange={async (val: boolean) => {
                              await updateNotificationSetting(ns.id as string, { default_line: val })
                              await reloadSystemSettings()
                            }}
                          />
                        </div>
                        <div className="flex justify-center">
                          <Switch
                            checked={ns.default_discord as boolean}
                            onCheckedChange={async (val: boolean) => {
                              await updateNotificationSetting(ns.id as string, { default_discord: val })
                              await reloadSystemSettings()
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      )}

      {/* Logout button - visible on small screens only */}
      <div className="block lg:hidden pt-2 pb-4">
        <Separator className="mb-4" />
        <Button
          variant="destructive"
          className="w-full"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          ออกจากระบบ
        </Button>
      </div>
    </div>
  )
}
