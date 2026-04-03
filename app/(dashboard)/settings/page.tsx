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
  Truck,
  Package,
  ShoppingCart,
  AlertTriangle,
  Monitor,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  updateSupplierLineSettings,
} from "@/lib/actions/settings"

// ─── Constants ──────────────────────────────────────────────────────

const ALL_ROLES = [
  { key: "admin", label: "Admin" },
  { key: "dentist", label: "ทันตแพทย์" },
  { key: "stock_staff", label: "สต๊อก" },
  { key: "assistant", label: "ผู้ช่วย" },
  { key: "cs", label: "CS" },
] as const

type NotifSetting = Record<string, unknown>

// Category definitions for grouping notification events
const CATEGORIES: Array<{
  key: string
  label: string
  description: string
  icon: React.ReactNode
  eventTypes: string[]
}> = [
  {
    key: "case",
    label: "เคส & นัดหมาย",
    description: "แจ้งเตือนเกี่ยวกับเคสใหม่ วัสดุพร้อม เลื่อนนัด",
    icon: <Users className="h-4 w-4" />,
    eventTypes: ["case_assigned", "stock_received", "material_prepared", "material_lock_request"],
  },
  {
    key: "stock",
    label: "สต๊อก & วัสดุ",
    description: "แจ้งเตือนสินค้าหมด ใกล้หมด ใกล้หมดอายุ",
    icon: <Package className="h-4 w-4" />,
    eventTypes: ["low_stock", "out_of_stock", "expiring_soon"],
  },
  {
    key: "po",
    label: "ใบสั่งซื้อ",
    description: "แจ้งเตือนเมื่อสร้าง/อนุมัติใบสั่งซื้อ",
    icon: <ShoppingCart className="h-4 w-4" />,
    eventTypes: ["po_created", "po_approved"],
  },
  {
    key: "emergency",
    label: "เคสด่วน",
    description: "แจ้งเตือนเคสที่นัดภายใน 48 ชม. แต่วัสดุยังไม่พร้อม",
    icon: <AlertTriangle className="h-4 w-4" />,
    eventTypes: ["emergency_case"],
  },
  {
    key: "system",
    label: "ระบบ",
    description: "การแจ้งเตือนระบบทั่วไป",
    icon: <Monitor className="h-4 w-4" />,
    eventTypes: ["system"],
  },
]

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

// ─── Notification Event Row ─────────────────────────────────────────

function NotificationEventRow({
  setting,
  onUpdate,
}: {
  setting: NotifSetting
  onUpdate: (id: string, data: Record<string, unknown>) => Promise<void>
}) {
  const [isPending, startTransition] = useTransition()
  const targetRoles = (setting.target_roles as string[]) ?? []

  function toggleRole(role: string) {
    const newRoles = targetRoles.includes(role)
      ? targetRoles.filter((r) => r !== role)
      : [...targetRoles, role]
    startTransition(async () => {
      await onUpdate(setting.id as string, { target_roles: newRoles })
    })
  }

  function toggleChannel(channel: string, value: boolean) {
    startTransition(async () => {
      await onUpdate(setting.id as string, { [channel]: value })
    })
  }

  const isActive = setting.is_active as boolean

  return (
    <div className={`rounded-lg border p-3 space-y-3 transition-colors ${!isActive ? "opacity-50" : "hover:bg-muted/30"}`}>
      {/* Row 1: Event info + active toggle */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{setting.event_label as string}</p>
            <Badge variant={isActive ? "default" : "secondary"} className="text-[10px] shrink-0">
              {isActive ? "เปิด" : "ปิด"}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
            {setting.description as string}
          </p>
        </div>
        <Switch
          checked={isActive}
          disabled={isPending}
          onCheckedChange={(val) => {
            startTransition(async () => {
              await onUpdate(setting.id as string, { is_active: val })
            })
          }}
        />
      </div>

      {isActive && (
        <>
          {/* Row 2: Channels — always single row */}
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-[11px] font-medium text-muted-foreground shrink-0">ช่องทาง:</span>
            <label className="flex items-center gap-1 cursor-pointer shrink-0">
              <Switch
                className="scale-[0.65] sm:scale-75"
                checked={setting.default_in_app as boolean}
                disabled={isPending}
                onCheckedChange={(val) => toggleChannel("default_in_app", val)}
              />
              <span className="text-[11px] sm:text-xs">In-App</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer shrink-0">
              <Switch
                className="scale-[0.65] sm:scale-75"
                checked={setting.default_line as boolean}
                disabled={isPending}
                onCheckedChange={(val) => toggleChannel("default_line", val)}
              />
              <span className="text-[11px] sm:text-xs">LINE</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer shrink-0">
              <Switch
                className="scale-[0.65] sm:scale-75"
                checked={setting.default_discord as boolean}
                disabled={isPending}
                onCheckedChange={(val) => toggleChannel("default_discord", val)}
              />
              <span className="text-[11px] sm:text-xs">Discord</span>
            </label>
          </div>

          {/* Row 3: Target Roles */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[11px] font-medium text-muted-foreground w-16 shrink-0">ส่งถึง:</span>
            {ALL_ROLES.map((role) => {
              const isSelected = targetRoles.includes(role.key)
              return (
                <button
                  key={role.key}
                  disabled={isPending}
                  onClick={() => toggleRole(role.key)}
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 text-muted-foreground border-transparent hover:border-border"
                  }`}
                >
                  {role.label}
                </button>
              )
            })}
          </div>
        </>
      )}

      {isPending && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>กำลังบันทึก...</span>
        </div>
      )}
    </div>
  )
}

// ─── Notification Category Section ──────────────────────────────────

function NotificationCategorySection({
  category,
  settings,
  onUpdate,
}: {
  category: (typeof CATEGORIES)[number]
  settings: NotifSetting[]
  onUpdate: (id: string, data: Record<string, unknown>) => Promise<void>
}) {
  const categorySettings = settings.filter((s) =>
    category.eventTypes.includes(s.event_type as string)
  )

  if (categorySettings.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          {category.icon}
          {category.label}
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">{category.description}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {categorySettings.map((ns) => (
          <NotificationEventRow key={ns.id as string} setting={ns} onUpdate={onUpdate} />
        ))}
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
  const [notifSettings, setNotifSettings] = useState<Array<NotifSetting>>([])

  // Admin: LINE
  const [lineToken, setLineToken] = useState("")
  const [lineEnabled, setLineEnabled] = useState(false)
  const [savingLine, setSavingLine] = useState(false)
  const [lineMessage, setLineMessage] = useState<string | null>(null)

  // Admin: Supplier LINE
  const [supplierBorrowEnabled, setSupplierBorrowEnabled] = useState(true)
  const [supplierPurchaseEnabled, setSupplierPurchaseEnabled] = useState(true)

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
            setSupplierBorrowEnabled(lineCfg.supplier_line_borrow_enabled ?? true)
            setSupplierPurchaseEnabled(lineCfg.supplier_line_purchase_enabled ?? true)
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

  async function reloadNotifSettings() {
    const ns = await getNotificationSettings()
    setNotifSettings(ns)
  }

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

  async function handleUpdateNotif(id: string, data: Record<string, unknown>) {
    await updateNotificationSetting(id, data as {
      default_in_app?: boolean
      default_line?: boolean
      default_discord?: boolean
      is_active?: boolean
      target_roles?: string[]
    })
    await reloadNotifSettings()
  }

  async function handleSupplierLineToggle(
    field: "supplier_line_borrow_enabled" | "supplier_line_purchase_enabled",
    value: boolean
  ) {
    if (field === "supplier_line_borrow_enabled") setSupplierBorrowEnabled(value)
    else setSupplierPurchaseEnabled(value)
    await updateSupplierLineSettings({ [field]: value })
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
          <div className="mx-auto max-w-3xl space-y-4">
            {/* Info banner */}
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20 px-4 py-3">
              <p className="text-xs text-blue-800 dark:text-blue-300">
                ตั้งค่าแจ้งเตือนแต่ละเหตุการณ์: เลือกช่องทาง (In-App / LINE / Discord) และ Role ที่จะได้รับแจ้งเตือน
              </p>
            </div>

            {systemLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Internal notification categories */}
                {CATEGORIES.map((category) => (
                  <NotificationCategorySection
                    key={category.key}
                    category={category}
                    settings={notifSettings}
                    onUpdate={handleUpdateNotif}
                  />
                ))}

                {/* Supplier Direct LINE */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Truck className="h-4 w-4" />
                      LINE ถึง Supplier (Direct Message)
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground">
                      ส่งข้อความ LINE ตรงถึง Supplier (ใช้ LINE User ID ของ Supplier)
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {/* Borrow */}
                    <div className="rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">ขอยืมวัสดุ</p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                            ส่ง LINE แจ้ง Supplier ทันทีเมื่อสร้างใบยืมวัสดุ พร้อมรายละเอียดเคส/รายการสินค้า
                          </p>
                        </div>
                        <Switch
                          checked={supplierBorrowEnabled}
                          onCheckedChange={(val) => handleSupplierLineToggle("supplier_line_borrow_enabled", val)}
                        />
                      </div>
                    </div>

                    {/* Purchase approved */}
                    <div className="rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">อนุมัติใบสั่งซื้อ</p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                            ส่ง LINE แจ้ง Supplier เมื่อ Admin อนุมัติใบสั่งซื้อ พร้อมรายละเอียดสินค้าที่สั่ง
                          </p>
                        </div>
                        <Switch
                          checked={supplierPurchaseEnabled}
                          onCheckedChange={(val) => handleSupplierLineToggle("supplier_line_purchase_enabled", val)}
                        />
                      </div>
                    </div>

                    <p className="text-[10px] text-muted-foreground pt-1">
                      * Supplier ต้องมี LINE User ID ในข้อมูล Supplier จึงจะส่ง LINE ได้
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
