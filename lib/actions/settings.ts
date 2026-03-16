"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

// ─── Procedure Types ────────────────────────────────────────────────

export async function getProcedureTypes() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("procedure_types")
    .select("id, name, sort_order, is_active")
    .order("sort_order")

  if (error) {
    // Table might not exist yet — fall back to defaults
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Get max sort_order
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
  revalidatePath("/admin/settings")
}

export async function updateProcedureType(id: string, data: { name?: string; sort_order?: number; is_active?: boolean }) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("procedure_types")
    .update(data)
    .eq("id", id)

  if (error) throw error
  revalidatePath("/admin/settings")
}

export async function deleteProcedureType(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("procedure_types")
    .delete()
    .eq("id", id)

  if (error) throw error
  revalidatePath("/admin/settings")
}

// ─── Product Categories ─────────────────────────────────────────────

export async function getProductCategories() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("product_categories")
    .select("id, slug, name, sort_order, is_active")
    .order("sort_order")

  if (error) {
    // Table might not exist yet — fall back to defaults
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
  const supabase = await createClient()
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
  revalidatePath("/admin/settings")
}

export async function updateProductCategory(id: string, data: { name?: string; slug?: string; sort_order?: number; is_active?: boolean }) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("product_categories")
    .update(data)
    .eq("id", id)

  if (error) throw error
  revalidatePath("/admin/settings")
}

export async function deleteProductCategory(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("product_categories")
    .delete()
    .eq("id", id)

  if (error) throw error
  revalidatePath("/admin/settings")
}

// ─── Helper: get category label map ─────────────────────────────────

export async function getCategoryLabelMap(): Promise<Record<string, string>> {
  const categories = await getProductCategories()
  return Object.fromEntries(categories.map((c) => [c.slug, c.name]))
}
