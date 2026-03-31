"use client"

import { useState } from "react"
import Link from "next/link"
import { Bell, LogOut, Package, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { User } from "@/types/database"

interface HeaderProps {
  user: User
  notificationCount?: number
  onSignOut: () => void
}

export function Header({ user, notificationCount = 0, onSignOut }: HeaderProps) {
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background px-4 lg:px-6">
      {/* Mobile logo */}
      <div className="flex items-center gap-2 lg:hidden">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
          <Package className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold">Dental Implant</span>
      </div>

      {/* Desktop spacer */}
      <div className="hidden lg:block" />

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <Button variant="ghost" size="icon" asChild className="relative">
          <Link href="/notifications">
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center p-0 text-[10px]"
              >
                {notificationCount > 99 ? "99+" : notificationCount}
              </Badge>
            )}
          </Link>
        </Button>

        {/* User profile button - opens sheet on all screen sizes */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => setSheetOpen(true)}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
            {user.full_name.charAt(0)}
          </div>
        </Button>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="right" className="w-72 px-4 pt-6">
            <SheetHeader className="pb-2">
              <SheetTitle className="text-left">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                    {user.full_name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{user.full_name}</p>
                    <p className="text-xs font-normal text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              </SheetTitle>
            </SheetHeader>
            <div className="grid gap-1 mt-2">
              <Link
                href="/profile"
                onClick={() => setSheetOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted"
              >
                <Settings className="h-4 w-4" />
                ตั้งค่าโปรไฟล์
              </Link>
              <div className="my-1 h-px bg-border" />
              <button
                type="button"
                onClick={() => {
                  setSheetOpen(false)
                  onSignOut()
                }}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                ออกจากระบบ
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
