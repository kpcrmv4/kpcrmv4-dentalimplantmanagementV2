// Auto-generated types from Supabase - see types/supabase.ts for full Database type
// This file re-exports convenience aliases used throughout the app

export type { Database } from "./supabase"
export type { Tables, TablesInsert, TablesUpdate, Enums } from "./supabase"

import type { Database } from "./supabase"

// Enum type aliases
export type UserRole = Database["public"]["Enums"]["user_role"]
export type CaseStatus = Database["public"]["Enums"]["case_status"]
export type ReservationStatus = Database["public"]["Enums"]["reservation_status"]
export type POStatus = Database["public"]["Enums"]["po_status"]
// ProductCategory is now a TEXT column (configurable via product_categories table)
// Keeping as string for forward compatibility after migration 007
export type ProductCategory = string
export type NotificationType = Database["public"]["Enums"]["notification_type"]

// Row type aliases
export type User = Database["public"]["Tables"]["users"]["Row"]
export type Patient = Database["public"]["Tables"]["patients"]["Row"]
export type Supplier = Database["public"]["Tables"]["suppliers"]["Row"]
export type Product = Database["public"]["Tables"]["products"]["Row"]
export type InventoryItem = Database["public"]["Tables"]["inventory"]["Row"]
export type Case = Database["public"]["Tables"]["cases"]["Row"]
export type CaseReservation = Database["public"]["Tables"]["case_reservations"]["Row"]
export type PurchaseOrder = Database["public"]["Tables"]["purchase_orders"]["Row"]
export type PurchaseOrderItem = Database["public"]["Tables"]["purchase_order_items"]["Row"]
export type Notification = Database["public"]["Tables"]["notifications"]["Row"]
export type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"]
