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
  volume: string
  weight: string
  dimension: string
  abutment_height: number | null
  gingival_height: number | null
  // Inventory fields
  lot_number: string
  quantity: number
  expiry_date: string
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
  const refs = Array.from(new Set(rows.map(r => r.ref).filter(Boolean)))
  const { data: existingProducts } = await supabase
    .from("products")
    .select("ref")
    .in("ref", refs)

  const existingRefs = new Set((existingProducts ?? []).map((p: { ref: string }) => p.ref))

  // Validate expiry date format
  const isValidDate = (dateStr: string): boolean => {
    if (!dateStr) return true // optional
    const d = new Date(dateStr)
    return !isNaN(d.getTime())
  }

  return rows.map(row => {
    const errors: string[] = []

    if (!row.ref?.trim()) errors.push("รหัสสินค้าห้ามว่าง")
    if (!row.name?.trim()) errors.push("ชื่อสินค้าห้ามว่าง")

    if (row.ref && existingRefs.has(row.ref)) {
      // Not an error for inventory — same ref can have multiple lots
      // We'll match to existing product
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

    // Inventory validation
    if (row.lot_number && row.quantity < 0) errors.push("จำนวนสต็อกต้องไม่ติดลบ")
    if (row.lot_number && row.quantity === 0) errors.push("จำนวนสต็อกต้องมากกว่า 0")
    if (row.expiry_date && !isValidDate(row.expiry_date)) {
      errors.push("รูปแบบวันหมดอายุไม่ถูกต้อง (ใช้ YYYY-MM-DD)")
    }

    return { ...row, errors }
  })
}

// ─── Bulk create products + inventory ───────────────────────────────

export async function bulkCreateProducts(rows: ImportProductRow[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนทำรายการ")

  // Group rows by ref — same ref = same product, multiple lots
  const productMap = new Map<string, ImportProductRow[]>()
  for (const row of rows) {
    const key = row.ref.trim()
    if (!productMap.has(key)) productMap.set(key, [])
    productMap.get(key)!.push(row)
  }

  // Check which refs already exist
  const allRefs = Array.from(productMap.keys())
  const { data: existingProducts } = await supabase
    .from("products")
    .select("id, ref")
    .in("ref", allRefs)

  const existingRefMap = new Map<string, string>(
    (existingProducts ?? []).map((p: { id: string; ref: string }) => [p.ref, p.id])
  )

  // Separate new products vs existing
  const newProductRefs = allRefs.filter(ref => !existingRefMap.has(ref))

  let createdCount = 0
  let stockCount = 0

  // Create new products
  if (newProductRefs.length > 0) {
    const newProducts = newProductRefs.map(ref => {
      const firstRow = productMap.get(ref)![0]
      return {
        ref: firstRow.ref.trim(),
        name: firstRow.name.trim(),
        category: firstRow.category || "other",
        brand: firstRow.brand?.trim() || null,
        model: firstRow.model?.trim() || null,
        description: firstRow.description?.trim() || null,
        unit: firstRow.unit?.trim() || "ชิ้น",
        min_stock_level: firstRow.min_stock_level || 0,
        cost_price: firstRow.cost_price,
        selling_price: firstRow.selling_price,
        diameter: firstRow.diameter,
        length: firstRow.length,
        volume: firstRow.volume?.trim() || null,
        weight: firstRow.weight?.trim() || null,
        dimension: firstRow.dimension?.trim() || null,
        abutment_height: firstRow.abutment_height,
        gingival_height: firstRow.gingival_height,
      }
    })

    const { data: created, error } = await supabase
      .from("products")
      .insert(newProducts)
      .select("id, ref")

    if (error) {
      if (error.code === "23505") {
        throw new Error("มีรหัสสินค้าซ้ำในระบบ กรุณาตรวจสอบอีกครั้ง")
      }
      throw new Error("ไม่สามารถนำเข้าสินค้าได้: " + error.message)
    }

    createdCount = created?.length ?? 0

    // Add newly created to the map
    for (const p of (created ?? [])) {
      existingRefMap.set(p.ref, p.id)
    }
  }

  // Create inventory entries for rows that have lot_number
  const inventoryRows = rows
    .filter(row => row.lot_number?.trim() && row.quantity > 0)
    .map(row => {
      const productId = existingRefMap.get(row.ref.trim())
      if (!productId) return null
      return {
        product_id: productId,
        lot_number: row.lot_number.trim(),
        quantity: row.quantity,
        expiry_date: row.expiry_date || null,
        received_date: new Date().toISOString().split("T")[0],
      }
    })
    .filter(Boolean)

  if (inventoryRows.length > 0) {
    const { error: invError } = await supabase
      .from("inventory")
      .insert(inventoryRows)

    if (invError) {
      throw new Error("สร้างสินค้าสำเร็จ แต่นำเข้าสต็อกไม่สำเร็จ: " + invError.message)
    }
    stockCount = inventoryRows.length
  }

  revalidatePath("/inventory")
  revalidatePath("/inventory/settings")
  return { createdCount, stockCount, existingCount: allRefs.length - newProductRefs.length }
}
