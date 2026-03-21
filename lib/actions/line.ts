"use server"

import { createClient } from "@/lib/supabase/server"

export async function sendLineMessage(lineUserId: string, message: string) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settings } = await (supabase as any)
    .from("app_settings")
    .select("line_channel_access_token, line_notify_enabled")
    .limit(1)
    .single()

  if (!settings?.line_notify_enabled || !settings?.line_channel_access_token) return false

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.line_channel_access_token}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [{ type: "text", text: message }],
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function sendLineFlexMessage(
  lineUserId: string,
  altText: string,
  contents: Record<string, unknown>
) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settings } = await (supabase as any)
    .from("app_settings")
    .select("line_channel_access_token, line_notify_enabled")
    .limit(1)
    .single()

  if (!settings?.line_notify_enabled || !settings?.line_channel_access_token) return false

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.line_channel_access_token}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [{ type: "flex", altText, contents }],
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function sendLineToRoles(roles: string[], title: string, message: string) {
  const supabase = await createClient()
  const { data: users } = await supabase
    .from("users")
    .select("line_user_id")
    .in("role", roles as ("admin" | "dentist" | "stock_staff" | "assistant" | "cs")[])
    .eq("is_active", true)
    .not("line_user_id", "is", null)

  const lineUsers = (users ?? []).filter((u) => u.line_user_id)
  const results = await Promise.allSettled(
    lineUsers.map((u) => sendLineMessage(u.line_user_id!, `${title}\n${message}`))
  )
  return results.filter((r) => r.status === "fulfilled" && r.value).length
}

export async function testLineConnection(lineUserId: string) {
  return sendLineMessage(lineUserId, "ทดสอบการเชื่อมต่อ LINE สำเร็จ\nระบบ Dental Implant Management")
}
