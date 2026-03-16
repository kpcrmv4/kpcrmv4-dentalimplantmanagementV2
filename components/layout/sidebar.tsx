"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Package, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { sidebarMenus } from "@/lib/config/navigation"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { User } from "@/types/database"

interface SidebarProps {
  user: User
  onSignOut: () => void
}

export function Sidebar({ user, onSignOut }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-background lg:block">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Package className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold">Dental Implant</span>
        </div>

        <Separator />

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3">
          {sidebarMenus.filter((item) => !item.roles || item.roles.includes(user.role)).map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
            const Icon = item.icon
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
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <Separator />

        {/* User info */}
        <div className="p-4">
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
