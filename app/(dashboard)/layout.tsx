import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardLayoutClient } from "./layout-client"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) redirect("/login")

  // Parallel fetch: user profile + notification count
  const [userResult, notifResult] = await Promise.all([
    supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .single(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", authUser.id)
      .eq("is_read", false),
  ])

  if (!userResult.data) {
    await supabase.auth.signOut()
    redirect("/login")
  }

  return (
    <DashboardLayoutClient
      user={userResult.data}
      notificationCount={notifResult.count ?? 0}
    >
      {children}
    </DashboardLayoutClient>
  )
}
