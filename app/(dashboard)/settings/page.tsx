"use client"

import { useState, useEffect } from "react"
import { User, Bell, Webhook } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import { getAppSettings, updateAppSettings } from "@/lib/actions/webhooks"

export default function SettingsPage() {
  const [user, setUser] = useState<{
    full_name: string
    email: string
    phone: string
    role: string
    line_user_id: string
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // Discord webhook state (admin only)
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState("")
  const [savingWebhook, setSavingWebhook] = useState(false)
  const [webhookMessage, setWebhookMessage] = useState<string | null>(null)

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

        // Load app settings for admin
        if (data.role === "admin") {
          try {
            const settings = await getAppSettings()
            if (settings?.discord_webhook_url) {
              setDiscordWebhookUrl(settings.discord_webhook_url)
            }
          } catch {
            // ignore
          }
        }
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
    <div className="space-y-4 p-4 lg:p-6">
      <h1 className="text-xl font-semibold">ตั้งค่า</h1>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4" />
            ข้อมูลส่วนตัว
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
        </CardContent>
      </Card>

      {message ? (
        <p className={`text-sm ${message === "บันทึกสำเร็จ" ? "text-green-600" : "text-destructive"}`}>
          {message}
        </p>
      ) : null}

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "กำลังบันทึก..." : "บันทึก"}
      </Button>

      {/* Discord Webhook Settings - Admin Only */}
      {user.role === "admin" && (
        <>
          <Separator className="my-2" />

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
        </>
      )}
    </div>
  )
}
