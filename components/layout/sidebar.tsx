"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Package, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { sidebarMenus, sidebarGroupLabels, type SidebarGroup } from "@/lib/config/navigation"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { User } from "@/types/database"

interface SidebarProps {
  user: User
  notificationCount?: number
  onSignOut: () => void
}

export function Sidebar({ user, notificationCount = 0, onSignOut }: SidebarProps) {
  const pathname = usePathname()

  const filteredItems = sidebarMenus.filter(
    (item) => !item.roles || item.roles.includes(user.role)
  )

  // Find the best matching href (longest prefix match) to avoid highlighting parent routes
  const allHrefs = filteredItems.map((item) => item.href)
  const activeHref = allHrefs
    .filter((href) => pathname === href || pathname.startsWith(href + "/"))
    .sort((a, b) => b.length - a.length)[0] ?? null

  // Group items: items with a group go into that group, items without group go into "ungrouped"
  const grouped = new Map<SidebarGroup | "ungrouped", typeof filteredItems>()
  for (const item of filteredItems) {
    const key = item.group ?? "ungrouped"
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(item)
  }

  // Render order: main, inventory, system, admin, then ungrouped (settings)
  const groupOrder: (SidebarGroup | "ungrouped")[] = ["main", "inventory", "system", "admin", "ungrouped"]

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 border-r bg-background lg:block">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Package className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold">Dental Implant</span>
        </div>

        <Separator />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {groupOrder.map((groupKey) => {
            const items = grouped.get(groupKey)
            if (!items || items.length === 0) return null

            return (
              <div key={groupKey} className="mb-1">
                {/* Group label */}
                {groupKey !== "ungrouped" && groupKey !== "main" && (
                  <div className="mb-1 mt-3 px-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      {sidebarGroupLabels[groupKey]}
                    </span>
                  </div>
                )}
                {/* Separator before settings */}
                {groupKey === "ungrouped" && <Separator className="my-2" />}

                <div className="space-y-0.5">
                  {items.map((item) => {
                    const isActive = item.href === activeHref
                    const Icon = item.icon
                    const isNotification = item.href === "/notifications"
                    return (
                      <Link
                        key={item.href + item.label}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                          isActive
                            ? "bg-primary/10 font-medium text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <span className="relative">
                          <Icon className="h-4 w-4" />
                          {isNotification && notificationCount > 0 && (
                            <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-bold text-destructive-foreground">
                              {notificationCount > 99 ? "99+" : notificationCount}
                            </span>
                          )}
                        </span>
                        {item.label}
                        {isNotification && notificationCount > 0 && (
                          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                            {notificationCount > 99 ? "99+" : notificationCount}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        <Separator />

        {/* User info */}
        <div className="p-3">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
              {user.full_name.charAt(0)}
            </div>
            <div className="flex-1 truncate">
              <p className="truncate text-sm font-medium">{user.full_name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.role}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={onSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            ออกจากระบบ
          </Button>
        </div>
      </div>
    </aside>
  )
}
