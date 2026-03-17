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
  Bell,
  ClipboardCheck,
  Users,
  BarChart3,
  Shield,
  FileText,
  type LucideIcon,
} from "lucide-react"
import type { UserRole } from "@/types/database"

export interface NavItem {
  label: string
  icon: LucideIcon
  href: string
  isCenter?: boolean
  roles?: UserRole[]
}

export const roleMenus: Record<UserRole, NavItem[]> = {
  admin: [
    { label: "หน้าแรก", icon: Home, href: "/dashboard" },
    { label: "เคส", icon: ClipboardList, href: "/cases" },
    { label: "แดชบอร์ด", icon: LayoutDashboard, href: "/dashboard", isCenter: true },
    { label: "สต็อก", icon: Package, href: "/inventory" },
    { label: "ตั้งค่า", icon: Settings, href: "/settings" },
  ],
  dentist: [
    { label: "หน้าแรก", icon: Home, href: "/dashboard" },
    { label: "ปฏิทิน", icon: Calendar, href: "/cases" },
    { label: "เคสใหม่", icon: PlusCircle, href: "/cases/new", isCenter: true },
    { label: "เคสของฉัน", icon: ClipboardList, href: "/cases" },
    { label: "โปรไฟล์", icon: User, href: "/settings" },
  ],
  stock_staff: [
    { label: "หน้าแรก", icon: Home, href: "/dashboard" },
    { label: "สั่งซื้อ", icon: ShoppingCart, href: "/orders" },
    { label: "สต็อก", icon: Package, href: "/inventory", isCenter: true },
    { label: "เคส", icon: ClipboardList, href: "/cases" },
    { label: "แจ้งเตือน", icon: Bell, href: "/notifications" },
  ],
  assistant: [
    { label: "หน้าแรก", icon: Home, href: "/dashboard" },
    { label: "ปฏิทิน", icon: Calendar, href: "/calendar" },
    { label: "จัดเตรียม", icon: ClipboardCheck, href: "/preparation", isCenter: true },
    { label: "เคส", icon: ClipboardList, href: "/cases" },
    { label: "โปรไฟล์", icon: User, href: "/settings" },
  ],
  cs: [
    { label: "หน้าแรก", icon: Home, href: "/dashboard" },
    { label: "นัดหมาย", icon: Calendar, href: "/calendar" },
    { label: "เคสใหม่", icon: PlusCircle, href: "/cases/new", isCenter: true },
    { label: "คนไข้", icon: Users, href: "/patients" },
    { label: "โปรไฟล์", icon: User, href: "/settings" },
  ],
}

export const sidebarMenus: NavItem[] = [
  { label: "แดชบอร์ด", icon: LayoutDashboard, href: "/dashboard" },
  { label: "เคส", icon: ClipboardList, href: "/cases" },
  { label: "คนไข้", icon: Users, href: "/patients", roles: ["admin", "cs", "dentist"] },
  { label: "สต็อก", icon: Package, href: "/inventory", roles: ["admin", "stock_staff"] },
  { label: "ใบสั่งซื้อ", icon: ShoppingCart, href: "/orders", roles: ["admin", "stock_staff"] },
  { label: "Supplier", icon: Truck, href: "/suppliers", roles: ["admin", "stock_staff"] },
  { label: "แจ้งเตือน", icon: Bell, href: "/notifications" },
  { label: "รายงาน", icon: BarChart3, href: "/reports", roles: ["admin", "stock_staff"] },
  { label: "จัดการผู้ใช้", icon: Shield, href: "/admin/users", roles: ["admin"] },
  { label: "Audit Logs", icon: FileText, href: "/admin/audit-logs", roles: ["admin"] },
  { label: "ตั้งค่าระบบ", icon: Settings, href: "/admin/settings", roles: ["admin"] },
  { label: "ตั้งค่า", icon: Settings, href: "/settings" },
]
