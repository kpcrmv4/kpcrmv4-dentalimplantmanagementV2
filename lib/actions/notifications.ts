"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { NotificationType } from "@/types/database"
import { sendDiscordWebhook } from "./webhooks"

export async function getNotifications() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) throw error
  return data ?? []
}

export async function getUnreadCount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false)

  if (error) return 0
  return count ?? 0
}

export async function markAsRead(notificationId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)

  if (error) throw error
  revalidatePath("/notifications")
}

export async function markAllAsRead() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false)

  if (error) throw error
  revalidatePath("/notifications")
}

export async function createNotification(params: {
  user_id: string
  type: NotificationType
  title: string
  message: string
  data?: Record<string, string | number | boolean | null>
  overrides?: { in_app?: boolean; line?: boolean; discord?: boolean }
}) {
  const supabase = await createClient()

  // Get notification settings for this event type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: setting } = await (supabase as any)
    .from("notification_settings")
    .select("default_in_app, default_line, default_discord, is_active")
    .eq("event_type", params.type)
    .single()

  const sendInApp = params.overrides?.in_app ?? setting?.default_in_app ?? true
  const sendLine = params.overrides?.line ?? setting?.default_line ?? false
  const sendDiscord = params.overrides?.discord ?? setting?.default_discord ?? false

  const sentVia: string[] = []

  // In-app notification
  if (sendInApp) {
    const { error } = await supabase
      .from("notifications")
      .insert({
        user_id: params.user_id,
        type: params.type,
        title: params.title,
        message: params.message,
        data: params.data ?? null,
        is_read: false,
        sent_via: [], // will be updated below
      })
    if (!error) sentVia.push("in_app")
  }

  // Discord notification
  if (sendDiscord) {
    sendDiscordWebhook(params.title, params.message).catch(() => {})
    sentVia.push("discord")
  }

  // LINE notification
  if (sendLine) {
    try {
      const { data: userData } = await supabase
        .from("users")
        .select("line_user_id")
        .eq("id", params.user_id)
        .single()

      if (userData?.line_user_id) {
        const { sendLineMessage } = await import("./line")
        await sendLineMessage(userData.line_user_id, `${params.title}\n${params.message}`)
        sentVia.push("line")
      }
    } catch {
      // LINE is best-effort
    }
  }

  // Update sent_via on the notification record
  if (sendInApp && sentVia.length > 0) {
    await supabase
      .from("notifications")
      .update({ sent_via: sentVia })
      .eq("user_id", params.user_id)
      .eq("type", params.type)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(1)
  }

  revalidatePath("/notifications")
}

/**
 * Smart notify: sends notifications to users based on target_roles from notification_settings
 */
export async function smartNotify(params: {
  type: NotificationType
  title: string
  message: string
  data?: Record<string, string | number | boolean | null>
  overrides?: { in_app?: boolean; line?: boolean; discord?: boolean }
}) {
  const supabase = await createClient()

  // Get notification settings for this event type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: setting } = await (supabase as any)
    .from("notification_settings")
    .select("target_roles, is_active")
    .eq("event_type", params.type)
    .single()

  if (!setting?.is_active) return

  const targetRoles = setting.target_roles ?? []
  if (targetRoles.length === 0) return

  // Get users matching target roles
  const { data: users } = await supabase
    .from("users")
    .select("id")
    .in("role", targetRoles)
    .eq("is_active", true)

  for (const user of users ?? []) {
    await createNotification({
      user_id: user.id,
      ...params,
    })
  }
}

export async function notifyAdmins(params: {
  type: NotificationType
  title: string
  message: string
  data?: Record<string, string | number | boolean | null>
}) {
  const supabase = await createClient()

  const { data: admins } = await supabase
    .from("users")
    .select("id")
    .eq("role", "admin")
    .eq("is_active", true)

  for (const admin of admins ?? []) {
    await createNotification({
      user_id: admin.id,
      ...params,
    })
  }
}
