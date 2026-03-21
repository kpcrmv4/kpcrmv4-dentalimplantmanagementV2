"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

// ─── Types (tables not yet in generated Supabase types) ─────────────

type ProcedureType = { id: string; name: string; sort_order: number; is_active: boolean }
type ProductCategoryRow = { id: string; slug: string; name: string; sort_order: number; is_active: boolean }

// These tables aren't in generated Supabase types yet (migration pending).
// Cast to `any` so `.from("procedure_types")` / `.from("product_categories")` compile.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function db() { return (await createClient()) as any }

// ─── Procedure Types ────────────────────────────────────────────────

export async function getProcedureTypes(): Promise<ProcedureType[]> {
  const supabase = await db()
  const { data, error } = await supabase
    .from("procedure_types")
    .select("id, name, sort_order, is_active")
    .order("sort_order")

  if (error) {
    return [
      { id: "default-1", name: "Implant", sort_order: 1, is_active: true },
      { id: "default-2", name: "Crown", sort_order: 2, is_active: true },
      { id: "default-3", name: "Bridge", sort_order: 3, is_active: true },
      { id: "default-4", name: "Abutment", sort_order: 4, is_active: true },
      { id: "default-5", name: "Bone Graft", sort_order: 5, is_active: true },
      { id: "default-6", name: "อื่นๆ", sort_order: 99, is_active: true },
    ]
  }
  return data ?? []
}

export async function addProcedureType(name: string) {
  const supabase = await db()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: existing } = await supabase
    .from("procedure_types")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1

  const { error } = await supabase
    .from("procedure_types")
    .insert({ name: name.trim(), sort_order: nextOrder })

  if (error) {
    if (error.code === "23505") throw new Error("ชื่อหัตถการนี้มีอยู่แล้ว")
    throw error
  }
  revalidatePath("/settings")
  revalidatePath("/inventory")
}

export async function updateProcedureType(id: string, data: { name?: string; sort_order?: number; is_active?: boolean }) {
  const supabase = await db()
  const { error } = await supabase
    .from("procedure_types")
    .update(data)
    .eq("id", id)

  if (error) throw error
  revalidatePath("/settings")
  revalidatePath("/inventory")
}

export async function deleteProcedureType(id: string) {
  const supabase = await db()
  const { error } = await supabase
    .from("procedure_types")
    .delete()
    .eq("id", id)

  if (error) throw error
  revalidatePath("/settings")
  revalidatePath("/inventory")
}

// ─── Product Categories ─────────────────────────────────────────────

export async function getProductCategories(): Promise<ProductCategoryRow[]> {
  const supabase = await db()
  const { data, error } = await supabase
    .from("product_categories")
    .select("id, slug, name, sort_order, is_active")
    .order("sort_order")

  if (error) {
    return [
      { id: "default-1", slug: "implant", name: "Implant", sort_order: 1, is_active: true },
      { id: "default-2", slug: "abutment", name: "Abutment", sort_order: 2, is_active: true },
      { id: "default-3", slug: "crown", name: "Crown", sort_order: 3, is_active: true },
      { id: "default-4", slug: "instrument", name: "เครื่องมือ", sort_order: 4, is_active: true },
      { id: "default-5", slug: "consumable", name: "วัสดุสิ้นเปลือง", sort_order: 5, is_active: true },
      { id: "default-6", slug: "other", name: "อื่นๆ", sort_order: 99, is_active: true },
    ]
  }
  return data ?? []
}

export async function addProductCategory(slug: string, name: string) {
  const supabase = await db()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: existing } = await supabase
    .from("product_categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1

  const { error } = await supabase
    .from("product_categories")
    .insert({ slug: slug.trim().toLowerCase(), name: name.trim(), sort_order: nextOrder })

  if (error) {
    if (error.code === "23505") throw new Error("slug นี้มีอยู่แล้ว")
    throw error
  }
  revalidatePath("/settings")
  revalidatePath("/inventory")
}

export async function updateProductCategory(id: string, data: { name?: string; slug?: string; sort_order?: number; is_active?: boolean }) {
  const supabase = await db()
  const { error } = await supabase
    .from("product_categories")
    .update(data)
    .eq("id", id)

  if (error) throw error
  revalidatePath("/settings")
  revalidatePath("/inventory")
}

export async function deleteProductCategory(id: string) {
  const supabase = await db()
  const { error } = await supabase
    .from("product_categories")
    .delete()
    .eq("id", id)

  if (error) throw error
  revalidatePath("/settings")
  revalidatePath("/inventory")
}

// ─── Helper: get category label map ─────────────────────────────────

export async function getCategoryLabelMap(): Promise<Record<string, string>> {
  const categories = await getProductCategories()
  return Object.fromEntries(categories.map((c) => [c.slug, c.name]))
}

// ─── Brands ─────────────────────────────────────────────────────────

export async function getBrands() {
  const supabase = await db()
  const { data, error } = await supabase
    .from("brands")
    .select("id, name, sort_order, is_active")
    .order("sort_order")

  if (error) return []
  return data ?? []
}

export async function addBrand(name: string) {
  const supabase = await db()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: existing } = await supabase
    .from("brands")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1

  const { error } = await supabase
    .from("brands")
    .insert({ name: name.trim(), sort_order: nextOrder })

  if (error) {
    if (error.code === "23505") throw new Error("ยี่ห้อนี้มีอยู่แล้ว")
    throw error
  }
  revalidatePath("/settings")
  revalidatePath("/inventory")
}

export async function updateBrand(id: string, data: { name?: string; sort_order?: number; is_active?: boolean }) {
  const supabase = await db()
  const { error } = await supabase
    .from("brands")
    .update(data)
    .eq("id", id)

  if (error) throw error
  revalidatePath("/settings")
  revalidatePath("/inventory")
}

export async function deleteBrand(id: string) {
  const supabase = await db()
  const { error } = await supabase
    .from("brands")
    .delete()
    .eq("id", id)

  if (error) throw error
  revalidatePath("/settings")
  revalidatePath("/inventory")
}

// ─── Product Models ─────────────────────────────────────────────────

export async function getProductModels(brandId?: string) {
  const supabase = await db()
  let query = supabase
    .from("product_models")
    .select("id, brand_id, name, is_active, brands(name)")
    .order("name")

  if (brandId) {
    query = query.eq("brand_id", brandId)
  }

  const { data, error } = await query
  if (error) return []
  return data ?? []
}

export async function addProductModel(brandId: string, name: string) {
  const supabase = await db()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from("product_models")
    .insert({ brand_id: brandId, name: name.trim() })

  if (error) {
    if (error.code === "23505") throw new Error("รุ่นนี้มีอยู่แล้วในยี่ห้อเดียวกัน")
    throw error
  }
  revalidatePath("/settings")
  revalidatePath("/inventory")
}

export async function updateProductModel(id: string, data: { name?: string; is_active?: boolean }) {
  const supabase = await db()
  const { error } = await supabase
    .from("product_models")
    .update(data)
    .eq("id", id)

  if (error) throw error
  revalidatePath("/settings")
  revalidatePath("/inventory")
}

export async function deleteProductModel(id: string) {
  const supabase = await db()
  const { error } = await supabase
    .from("product_models")
    .delete()
    .eq("id", id)

  if (error) throw error
  revalidatePath("/settings")
  revalidatePath("/inventory")
}

// ─── Notification Settings ──────────────────────────────────────────

export async function getNotificationSettings() {
  const supabase = await db()
  const { data, error } = await supabase
    .from("notification_settings")
    .select("*")
    .order("sort_order")

  if (error) return []
  return data ?? []
}

export async function updateNotificationSetting(
  id: string,
  data: {
    default_in_app?: boolean
    default_line?: boolean
    default_discord?: boolean
    is_active?: boolean
    target_roles?: string[]
  }
) {
  const supabase = await db()
  const { error } = await supabase
    .from("notification_settings")
    .update(data)
    .eq("id", id)

  if (error) throw error
  revalidatePath("/settings")
  revalidatePath("/inventory")
}

// ─── LINE Settings ──────────────────────────────────────────────────

export async function updateLineSettings(data: {
  line_channel_access_token?: string
  line_channel_secret?: string
  line_notify_enabled?: boolean
}) {
  const supabase = await db()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from("app_settings")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .not("id", "is", null)

  if (error) throw error
  revalidatePath("/settings")
  revalidatePath("/inventory")
}

export async function getLineSettings() {
  const supabase = await db()
  const { data } = await supabase
    .from("app_settings")
    .select("line_channel_access_token, line_channel_secret, line_notify_enabled")
    .limit(1)
    .single()

  return data
}
