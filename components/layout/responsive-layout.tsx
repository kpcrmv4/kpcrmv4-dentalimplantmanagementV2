"use client"

import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { BottomNav } from "@/components/layout/bottom-nav"
import { Header } from "@/components/layout/header"
import { createClient } from "@/lib/supabase/client"
import { useRealtimeNotifications } from "@/lib/hooks/use-realtime-notifications"
import type { User } from "@/types/database"

interface ResponsiveLayoutProps {
  user: User
  notificationCount?: number
  children: React.ReactNode
}

export function ResponsiveLayout({ user, notificationCount = 0, children }: ResponsiveLayoutProps) {
  const router = useRouter()
  const liveCount = useRealtimeNotifications(user.id, notificationCount)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <Sidebar user={user} onSignOut={handleSignOut} />

      {/* Main content */}
      <div className="lg:ml-56">
        <Header
          user={user}
          notificationCount={liveCount}
          onSignOut={handleSignOut}
        />
        <main className="pb-20 lg:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav role={user.role} />
    </div>
  )
}
