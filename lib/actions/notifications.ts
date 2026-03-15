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
}) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("notifications")
    .insert({
      user_id: params.user_id,
      type: params.type,
      title: params.title,
      message: params.message,
      data: params.data ?? null,
      is_read: false,
      sent_via: ["in_app", "discord"],
    })

  if (error) throw error

  // Fire-and-forget discord notification
  sendDiscordWebhook(params.title, params.message).catch(() => {})

  revalidatePath("/notifications")
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
