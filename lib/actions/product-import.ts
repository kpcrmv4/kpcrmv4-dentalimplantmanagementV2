"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function db() { return (await createClient()) as any }

export type ImportProductRow = {
  rowIndex: number
  ref: string
  name: string
  category: string
  brand: string
  model: string
  description: string
  unit: string
  min_stock_level: number
  cost_price: number | null
  selling_price: number | null
  diameter: number | null
  length: number | null
  errors: string[]
}

// ─── Get template data (categories & brands for dropdowns) ──────────

export async function getTemplateData() {
  const supabase = await db()

  const [{ data: categories }, { data: brands }] = await Promise.all([
    supabase
      .from("product_categories")
      .select("slug, name")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("brands")
      .select("name")
      .eq("is_active", true)
      .order("sort_order"),
  ])

  return {
    categories: (categories ?? []) as Array<{ slug: string; name: string }>,
    brands: (brands ?? []) as Array<{ name: string }>,
  }
}

// ─── Validate and parse imported data ───────────────────────────────

export async function validateImportData(rows: ImportProductRow[]): Promise<ImportProductRow[]> {
  const supabase = await db()

  // Fetch valid categories and brands
  const [{ data: categories }, { data: brands }] = await Promise.all([
    supabase.from("product_categories").select("slug, name").eq("is_active", true),
    supabase.from("brands").select("name").eq("is_active", true),
  ])

  const validCategorySlugs = new Set((categories ?? []).map((c: { slug: string }) => c.slug))
  const validBrandNames = new Set((brands ?? []).map((b: { name: string }) => b.name.toLowerCase()))

  // Check for existing refs
  const refs = rows.map(r => r.ref).filter(Boolean)
  const { data: existingProducts } = await supabase
    .from("products")
    .select("ref")
    .in("ref", refs)

  const existingRefs = new Set((existingProducts ?? []).map((p: { ref: string }) => p.ref))

  // Check for duplicate refs within import
  const refCounts = new Map<string, number>()
  for (const row of rows) {
    if (row.ref) {
      refCounts.set(row.ref, (refCounts.get(row.ref) || 0) + 1)
    }
  }

  return rows.map(row => {
    const errors: string[] = []

    if (!row.ref?.trim()) errors.push("รหัสสินค้าห้ามว่าง")
    if (!row.name?.trim()) errors.push("ชื่อสินค้าห้ามว่าง")

    if (row.ref && existingRefs.has(row.ref)) {
      errors.push(`รหัส "${row.ref}" มีอยู่ในระบบแล้ว`)
    }

    if (row.ref && (refCounts.get(row.ref) || 0) > 1) {
      errors.push(`รหัส "${row.ref}" ซ้ำกันในไฟล์นำเข้า`)
    }

    if (row.category && !validCategorySlugs.has(row.category)) {
      errors.push(`หมวดหมู่ "${row.category}" ไม่มีในระบบ`)
    }

    if (row.brand && !validBrandNames.has(row.brand.toLowerCase())) {
      errors.push(`ยี่ห้อ "${row.brand}" ไม่มีในระบบ`)
    }

    if (row.min_stock_level < 0) errors.push("จำนวนขั้นต่ำต้องไม่ติดลบ")
    if (row.cost_price !== null && row.cost_price < 0) errors.push("ราคาทุนต้องไม่ติดลบ")
    if (row.selling_price !== null && row.selling_price < 0) errors.push("ราคาขายต้องไม่ติดลบ")

    return { ...row, errors }
  })
}

// ─── Bulk create products ───────────────────────────────────────────

export async function bulkCreateProducts(rows: ImportProductRow[]) {
  // Cast to any since product_categories are now configurable (not enum)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนทำรายการ")

  const products = rows.map(row => ({
    ref: row.ref.trim(),
    name: row.name.trim(),
    category: row.category || "other",
    brand: row.brand?.trim() || null,
    model: row.model?.trim() || null,
    description: row.description?.trim() || null,
    unit: row.unit?.trim() || "ชิ้น",
    min_stock_level: row.min_stock_level || 0,
    cost_price: row.cost_price,
    selling_price: row.selling_price,
    diameter: row.diameter,
    length: row.length,
  }))

  const { data, error } = await supabase
    .from("products")
    .insert(products)
    .select()

  if (error) {
    if (error.code === "23505") {
      throw new Error("มีรหัสสินค้าซ้ำในระบบ กรุณาตรวจสอบอีกครั้ง")
    }
    throw new Error("ไม่สามารถนำเข้าสินค้าได้: " + error.message)
  }

  revalidatePath("/inventory")
  revalidatePath("/inventory/settings")
  return { count: data?.length ?? 0 }
}
