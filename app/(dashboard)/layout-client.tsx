"use client"

import { SWRConfig } from "swr"
import { swrConfig } from "@/lib/hooks/use-swr-config"
import { ResponsiveLayout } from "@/components/layout/responsive-layout"
import type { User } from "@/types/database"

interface DashboardLayoutClientProps {
  user: User
  notificationCount: number
  children: React.ReactNode
}

export function DashboardLayoutClient({
  user,
  notificationCount,
  children,
}: DashboardLayoutClientProps) {
  return (
    <SWRConfig value={swrConfig}>
      <ResponsiveLayout user={user} notificationCount={notificationCount}>
        {children}
      </ResponsiveLayout>
    </SWRConfig>
  )
}
