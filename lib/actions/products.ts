"use server"

import { createClient } from "@/lib/supabase/server"
import type { ProductCategory } from "@/types/database"

export async function getProducts(filters?: {
  category?: ProductCategory
  search?: string
  supplier_id?: string
}) {
  const supabase = await createClient()
  let query = supabase
    .from("products")
    .select("*, suppliers(name), inventory(quantity, reserved_quantity)")
    .eq("is_active", true)
    .order("name")

  if (filters?.category) {
    query = query.eq("category", filters.category)
  }
  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,ref.ilike.%${filters.search}%,brand.ilike.%${filters.search}%`
    )
  }
  if (filters?.supplier_id) {
    query = query.eq("supplier_id", filters.supplier_id)
  }

  const { data, error } = await query
  if (error) throw error

  // Calculate total stock per product
  return (data ?? []).map((p) => {
    const inventoryRows = (p.inventory as Array<{ quantity: number; reserved_quantity: number }>) ?? []
    const totalStock = inventoryRows.reduce((sum, inv) => sum + inv.quantity - inv.reserved_quantity, 0)
    return {
      ...p,
      totalStock,
      supplierName: (p.suppliers as { name: string } | null)?.name ?? null,
    }
  })
}

export async function getProductById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("products")
    .select("*, suppliers(name)")
    .eq("id", id)
    .single()

  if (error) throw error
  return data
}

export async function getCategories() {
  return [
    { value: "implant", label: "Implant" },
    { value: "abutment", label: "Abutment" },
    { value: "crown", label: "Crown" },
    { value: "instrument", label: "Instrument" },
    { value: "consumable", label: "Consumable" },
    { value: "other", label: "อื่นๆ" },
  ] as const
}

export async function searchDuplicates(name: string, ref: string) {
  const supabase = await createClient()

  const conditions: string[] = []
  if (name.trim()) conditions.push(`name.ilike.%${name.trim()}%`)
  if (ref.trim()) conditions.push(`ref.ilike.%${ref.trim()}%`)
  if (conditions.length === 0) return []

  const { data, error } = await supabase
    .from("products")
    .select("id, ref, name, brand, category, is_active")
    .or(conditions.join(","))
    .limit(10)

  if (error) throw error
  return data ?? []
}
