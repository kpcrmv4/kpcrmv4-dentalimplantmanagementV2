"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { roleMenus, type NavItem } from "@/lib/config/navigation"
import type { UserRole } from "@/types/database"

interface BottomNavProps {
  role: UserRole
}

export function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname()
  const items = roleMenus[role]

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-background lg:hidden">
      <div className="flex items-end justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => (
          <BottomNavItem
            key={item.href + item.label}
            item={item}
            isActive={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))}
          />
        ))}
      </div>
    </nav>
  )
}

function BottomNavItem({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = item.icon

  if (item.isCenter) {
    return (
      <Link
        href={item.href}
        className="flex flex-col items-center -translate-y-3"
      >
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full border-4 border-background shadow-lg",
            "bg-primary text-primary-foreground"
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
        <span className="mt-0.5 text-[10px] font-medium text-primary">
          {item.label}
        </span>
      </Link>
    )
  }

  return (
    <Link
      href={item.href}
      className={cn(
        "flex min-w-[56px] flex-col items-center gap-0.5 py-2",
        isActive ? "text-primary" : "text-muted-foreground"
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[10px] font-medium">{item.label}</span>
    </Link>
  )
}
