"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  Webhook,
  Settings,
  Plus,
  Trash2,
  GripVertical,
  Loader2,
  MessageCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

// ─── Editable List ──────────────────────────────────────────────────

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

// ─── Settings Page (Admin only) ─────────────────────────────────────

type ProcedureType = { id: string; name: string; sort_order: number; is_active: boolean }

export default function SettingsPage() {
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Admin: Discord
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState("")
  const [savingWebhook, setSavingWebhook] = useState(false)
  const [webhookMessage, setWebhookMessage] = useState<string | null>(null)

  // Admin: System
  const [procedureTypes, setProcedureTypes] = useState<ProcedureType[]>([])
  const [systemLoading, setSystemLoading] = useState(true)
  const [notifSettings, setNotifSettings] = useState<Array<Record<string, unknown>>>([])

  // Admin: LINE
  const [lineToken, setLineToken] = useState("")
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
        .select("role")
        .eq("id", authUser.id)
        .single()
      if (data) {
        const userRole = data.role as string
        setRole(userRole)

        if (userRole !== "admin") {
          // Non-admin users shouldn't access this page, redirect to profile
          router.replace("/profile")
          return
        }

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
setLineEnabled(lineCfg.line_notify_enabled ?? false)
          }
        } catch {
          // ignore
        } finally {
          setSystemLoading(false)
        }
      }
      setLoading(false)
    }
    load()
  }, [router])

  async function reloadSystemSettings() {
    const [pt, ns] = await Promise.all([
      getProcedureTypes(), getNotificationSettings()
    ])
    setProcedureTypes(pt)
    setNotifSettings(ns)
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

  async function handleSaveLine() {
    setSavingLine(true)
    setLineMessage(null)
    try {
      await updateLineSettings({
        line_channel_access_token: lineToken || undefined,
        line_notify_enabled: lineEnabled,
      })
      setLineMessage("บันทึกสำเร็จ")
    } catch (err) {
      setLineMessage(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
    } finally {
      setSavingLine(false)
    }
  }

  if (loading || !role) {
    return (
      <div className="space-y-4 p-4 lg:p-6">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (role !== "admin") {
    return null
  }

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold">ตั้งค่าระบบ</h1>
        <p className="text-sm text-muted-foreground">จัดการการตั้งค่าระบบสำหรับผู้ดูแล</p>
      </div>

      <Tabs defaultValue="system">
        <TabsList className="mb-6 w-full sm:w-auto">
          <TabsTrigger value="system" className="gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            <span>ระบบ</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            <span>แจ้งเตือน</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: ระบบ */}
        <TabsContent value="system">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Col 1: Procedure Types */}
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

            {/* Col 2: Integrations */}
            <div className="space-y-4">
              {/* LINE */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <MessageCircle className="h-4 w-4" />
                    LINE Messaging API
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">เชื่อมต่อ LINE OA สำหรับส่งแจ้งเตือน</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <Label className="text-xs font-medium">เปิดใช้งาน LINE Notification</Label>
                    <Switch checked={lineEnabled} onCheckedChange={setLineEnabled} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Channel Access Token</Label>
                    <Input
                      value={lineToken}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLineToken(e.target.value)}
                      placeholder="Channel Access Token"
                      type="password"
                    />
                  </div>
                  {lineMessage && (
                    <p className={`text-sm rounded-lg px-3 py-2 ${
                      lineMessage.includes("สำเร็จ")
                        ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                        : "bg-destructive/10 text-destructive"
                    }`}>
                      {lineMessage}
                    </p>
                  )}

                  <Button onClick={handleSaveLine} disabled={savingLine} variant="outline" className="w-full">
                    {savingLine ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังบันทึก...</> : "บันทึก LINE Settings"}
                  </Button>
                </CardContent>
              </Card>

              {/* Discord */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Webhook className="h-4 w-4" />
                    Discord Webhook
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">ส่งแจ้งเตือนไปยัง Discord channel</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Webhook URL</Label>
                    <Input
                      value={discordWebhookUrl}
                      onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                      placeholder="https://discord.com/api/webhooks/..."
                      type="url"
                    />
                  </div>

                  {webhookMessage ? (
                    <p className={`text-sm rounded-lg px-3 py-2 ${
                      webhookMessage.includes("สำเร็จ")
                        ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                        : "bg-destructive/10 text-destructive"
                    }`}>
                      {webhookMessage}
                    </p>
                  ) : null}

                  <Button onClick={handleSaveWebhook} disabled={savingWebhook} variant="outline" className="w-full">
                    {savingWebhook ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังบันทึก...</> : "บันทึก Webhook"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab: แจ้งเตือน */}
        <TabsContent value="notifications">
          <div className="mx-auto max-w-3xl">
            <Card>
              <CardHeader className="pb-3">
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
                ) : notifSettings.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีการตั้งค่าแจ้งเตือน</p>
                ) : (
                  <div className="space-y-2">
                    {/* Table header */}
                    <div className="grid grid-cols-[1fr_60px_60px_60px] gap-2 px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      <span>เหตุการณ์</span>
                      <span className="text-center">In-App</span>
                      <span className="text-center">LINE</span>
                      <span className="text-center">Discord</span>
                    </div>
                    <Separator />
                    {notifSettings.map((ns) => (
                      <div
                        key={ns.id as string}
                        className="grid grid-cols-[1fr_60px_60px_60px] gap-2 items-center rounded-lg border px-3 py-2.5 hover:bg-muted/30 transition-colors"
                      >
                        <div>
                          <p className="text-xs font-medium">{ns.event_label as string}</p>
                          <p className="text-[10px] text-muted-foreground leading-relaxed">{ns.description as string}</p>
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
