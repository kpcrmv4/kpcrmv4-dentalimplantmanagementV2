import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization")
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

    const now = new Date()
    const fortyEightHoursLater = new Date(now.getTime() + 48 * 60 * 60 * 1000)
    const todayStr = now.toISOString().split("T")[0]
    const futureStr = fortyEightHoursLater.toISOString().split("T")[0]

    // Get cases within 48 hours that are NOT ready/completed/cancelled
    const { data: cases, error } = await supabase
      .from("cases")
      .select(
        "id, case_number, scheduled_date, scheduled_time, case_status, patients(full_name), users!cases_dentist_id_fkey(full_name)"
      )
      .gte("scheduled_date", todayStr)
      .lte("scheduled_date", futureStr)
      .not("case_status", "in", '("ready","completed","cancelled")')
      .order("scheduled_date")

    if (error) throw error
    if (!cases || cases.length === 0) {
      return NextResponse.json({ message: "No emergency cases", count: 0 })
    }

    // Get notification settings for emergency_case
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: setting } = await (supabase as any)
      .from("notification_settings")
      .select("default_in_app, default_line, default_discord, target_roles, is_active")
      .eq("event_type", "emergency_case")
      .single()

    if (!setting?.is_active) {
      return NextResponse.json({ message: "Emergency notifications disabled", count: 0 })
    }

    const targetRoles = (setting.target_roles ?? []) as string[]
    if (targetRoles.length === 0) {
      return NextResponse.json({ message: "No target roles configured", count: 0 })
    }

    // Build summary message
    const caseLines = cases.map((c) => {
      const patient = c.patients as unknown as { full_name: string } | null
      const statusLabel = c.case_status === "pending_order" ? "รอสั่งของ" : "รอจัดของ"
      return `• ${c.case_number} — ${patient?.full_name ?? "ไม่ระบุ"} (${c.scheduled_date} ${c.scheduled_time ?? ""}) [${statusLabel}]`
    })

    const title = `🚨 เคสด่วนภายใน 48 ชม. — ${cases.length} เคส`
    const message = `มีเคสที่วัสดุยังไม่พร้อมและนัดภายใน 48 ชั่วโมง:\n${caseLines.join("\n")}`

    // Get target users
    const { data: users } = await supabase
      .from("users")
      .select("id, line_user_id")
      .in("role", targetRoles as ("admin" | "dentist" | "stock_staff" | "assistant" | "cs")[])
      .eq("is_active", true)

    let notifiedCount = 0

    // Get app settings for LINE and Discord
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: appSettings } = await (supabase as any)
      .from("app_settings")
      .select("discord_webhook_url, line_channel_access_token, line_notify_enabled")
      .limit(1)
      .single()

    for (const user of users ?? []) {
      // In-app notification
      if (setting.default_in_app) {
        await supabase.from("notifications").insert({
          user_id: user.id,
          type: "emergency_case" as Database["public"]["Enums"]["notification_type"],
          title,
          message,
          data: { case_count: cases.length },
          is_read: false,
          sent_via: [
            setting.default_in_app ? "in_app" : null,
            setting.default_line ? "line" : null,
            setting.default_discord ? "discord" : null,
          ].filter(Boolean) as string[],
        })
      }

      // LINE notification
      if (
        setting.default_line &&
        appSettings?.line_notify_enabled &&
        appSettings?.line_channel_access_token &&
        user.line_user_id
      ) {
        try {
          await fetch("https://api.line.me/v2/bot/message/push", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${appSettings.line_channel_access_token}`,
            },
            body: JSON.stringify({
              to: user.line_user_id,
              messages: [{ type: "text", text: `${title}\n\n${message}` }],
            }),
          })
        } catch {
          // LINE is best-effort
        }
      }

      notifiedCount++
    }

    // Discord notification (once, not per user)
    if (setting.default_discord && appSettings?.discord_webhook_url) {
      try {
        await fetch(appSettings.discord_webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            embeds: [
              {
                title,
                description: message,
                color: 0xef4444, // red
                timestamp: new Date().toISOString(),
              },
            ],
          }),
        })
      } catch {
        // Discord is best-effort
      }
    }

    return NextResponse.json({
      message: "Emergency check completed",
      emergencyCases: cases.length,
      notifiedUsers: notifiedCount,
    })
  } catch (err) {
    console.error("Emergency check cron error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
