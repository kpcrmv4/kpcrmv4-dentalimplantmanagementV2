"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { roleMenus, sidebarMenus, type NavItem } from "@/lib/config/navigation"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { UserRole } from "@/types/database"

interface BottomNavProps {
  role: UserRole
}

export function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  const allItems = roleMenus[role]
  // Show first 4 items in the bottom bar, 5th becomes "More"
  const visibleItems = allItems.slice(0, 4)

  // "More" menu: sidebar items for this role, excluding those already visible in bottom nav
  const visibleHrefs = new Set(visibleItems.map((i) => i.href))
  const moreItems = sidebarMenus.filter(
    (item) =>
      (!item.roles || item.roles.includes(role)) &&
      !visibleHrefs.has(item.href)
  )

  function isActive(href: string): boolean {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname === href || pathname.startsWith(href + "/")
  }

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-background lg:hidden">
        <div className="flex items-end justify-around px-1 pb-[env(safe-area-inset-bottom)]">
          {visibleItems.map((item) => (
            <BottomNavItem
              key={item.href + item.label}
              item={item}
              isActive={isActive(item.href)}
            />
          ))}
          {/* More button */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex min-w-[56px] flex-col items-center gap-0.5 py-2",
              moreOpen ? "text-primary" : "text-muted-foreground"
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-medium">เพิ่มเติม</span>
          </button>
        </div>
      </nav>

      {/* More menu sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-sm">เมนูเพิ่มเติม</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-4 gap-2">
            {moreItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl p-3 transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[11px] font-medium text-center leading-tight">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
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
