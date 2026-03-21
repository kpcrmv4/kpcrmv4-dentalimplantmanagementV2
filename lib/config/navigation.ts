import {
  Home,
  ClipboardList,
  LayoutDashboard,
  Package,
  Settings,
  Calendar,
  PlusCircle,
  User,
  ShoppingCart,
  Truck,
  ArrowLeftRight,
  Bell,
  ClipboardCheck,
  Users,
  BarChart3,
  Shield,
  FileText,
  type LucideIcon,
} from "lucide-react"
import type { UserRole } from "@/types/database"

export type SidebarGroup = "main" | "inventory" | "system" | "admin"

export interface NavItem {
  label: string
  icon: LucideIcon
  href: string
  isCenter?: boolean
  roles?: UserRole[]
  group?: SidebarGroup
}

export const sidebarGroupLabels: Record<SidebarGroup, string> = {
  main: "หลัก",
  inventory: "คลังสินค้า",
  system: "ระบบ",
  admin: "ผู้ดูแลระบบ",
}

export const roleMenus: Record<UserRole, NavItem[]> = {
  admin: [
    { label: "หน้าแรก", icon: Home, href: "/dashboard" },
    { label: "เคส", icon: ClipboardList, href: "/cases" },
    { label: "แดชบอร์ด", icon: LayoutDashboard, href: "/dashboard", isCenter: true },
    { label: "สต็อก", icon: Package, href: "/inventory" },
    { label: "เพิ่มเติม", icon: Settings, href: "/settings" },
  ],
  dentist: [
    { label: "หน้าแรก", icon: Home, href: "/dashboard" },
    { label: "ปฏิทิน", icon: Calendar, href: "/calendar" },
    { label: "เคสใหม่", icon: PlusCircle, href: "/cases/new", isCenter: true },
    { label: "เคส", icon: ClipboardList, href: "/cases" },
    { label: "เพิ่มเติม", icon: User, href: "/settings" },
  ],
  stock_staff: [
    { label: "หน้าแรก", icon: Home, href: "/dashboard" },
    { label: "สั่งซื้อ", icon: ShoppingCart, href: "/orders" },
    { label: "สต็อก", icon: Package, href: "/inventory", isCenter: true },
    { label: "เคส", icon: ClipboardList, href: "/cases" },
    { label: "เพิ่มเติม", icon: Bell, href: "/notifications" },
  ],
  assistant: [
    { label: "หน้าแรก", icon: Home, href: "/dashboard" },
    { label: "ปฏิทิน", icon: Calendar, href: "/calendar" },
    { label: "จัดเตรียม", icon: ClipboardCheck, href: "/preparation", isCenter: true },
    { label: "เคส", icon: ClipboardList, href: "/cases" },
    { label: "เพิ่มเติม", icon: User, href: "/settings" },
  ],
  cs: [
    { label: "หน้าแรก", icon: Home, href: "/dashboard" },
    { label: "นัดหมาย", icon: Calendar, href: "/calendar" },
    { label: "เคสใหม่", icon: PlusCircle, href: "/cases/new", isCenter: true },
    { label: "คนไข้", icon: Users, href: "/patients" },
    { label: "เพิ่มเติม", icon: User, href: "/settings" },
  ],
}

export const sidebarMenus: NavItem[] = [
  // Main group
  { label: "แดชบอร์ด", icon: LayoutDashboard, href: "/dashboard", group: "main" },
  { label: "ปฏิทิน", icon: Calendar, href: "/calendar", roles: ["dentist", "assistant", "cs"], group: "main" },
  { label: "เคส", icon: ClipboardList, href: "/cases", group: "main" },
  { label: "จัดเตรียม", icon: ClipboardCheck, href: "/preparation", roles: ["assistant"], group: "main" },
  { label: "คนไข้", icon: Users, href: "/patients", roles: ["admin", "cs", "dentist"], group: "main" },

  // Inventory group
  { label: "สต็อก", icon: Package, href: "/inventory", roles: ["admin", "stock_staff"], group: "inventory" },
  { label: "ใบสั่งซื้อ", icon: ShoppingCart, href: "/orders", roles: ["admin", "stock_staff"], group: "inventory" },
  { label: "Supplier", icon: Truck, href: "/suppliers", roles: ["admin", "stock_staff"], group: "inventory" },
  { label: "ยืม/แลกของ", icon: ArrowLeftRight, href: "/inventory/borrows", roles: ["admin", "stock_staff"], group: "inventory" },

  // System group
  { label: "แจ้งเตือน", icon: Bell, href: "/notifications", group: "system" },
  { label: "รายงาน", icon: BarChart3, href: "/reports", roles: ["admin", "stock_staff"], group: "system" },

  // Admin group
  { label: "จัดการผู้ใช้", icon: Shield, href: "/admin/users", roles: ["admin"], group: "admin" },
  { label: "Audit Logs", icon: FileText, href: "/admin/audit-logs", roles: ["admin"], group: "admin" },

  // Settings (no group - rendered at bottom)
  { label: "ตั้งค่า", icon: Settings, href: "/settings" },
]
