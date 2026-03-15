"use server"

import { createClient } from "@/lib/supabase/server"

export async function sendDiscordWebhook(title: string, message: string) {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from("app_settings")
      .select("discord_webhook_url")
      .limit(1)
      .single()

    if (!data?.discord_webhook_url) return

    await fetch(data.discord_webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title,
            description: message,
            color: 0x4f46e5,
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    })
  } catch {
    // Silently fail — webhook is best-effort
  }
}

export async function getAppSettings() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("app_settings")
    .select("*")
    .limit(1)
    .single()
  return data
}

export async function updateAppSettings(discordWebhookUrl: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Verify admin role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()
  if (userData?.role !== "admin") throw new Error("Admin only")

  const { error } = await supabase
    .from("app_settings")
    .update({
      discord_webhook_url: discordWebhookUrl,
      updated_at: new Date().toISOString(),
    })
    .not("id", "is", null)

  if (error) throw error
}
