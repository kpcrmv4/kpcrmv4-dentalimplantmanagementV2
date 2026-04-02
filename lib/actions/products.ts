"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { ProductCategory } from "@/types/database"
import type { Database } from "@/types/supabase"

type ProductCategoryEnum = Database["public"]["Enums"]["product_category"]

// ─── Existing Functions ──────────────────────────────────────────────

export async function getProducts(filters?: {
  category?: ProductCategory
  search?: string
  supplier_id?: string
  brand?: string
  model?: string
  diameter?: string
  length?: string
}) {
  const supabase = await createClient()
  let query = supabase
    .from("products")
    .select("*, suppliers(name), inventory(quantity, reserved_quantity)")
    .eq("is_active", true)
    .order("name")

  if (filters?.category) {
    query = query.eq("category", filters.category as never)
  }
  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,ref.ilike.%${filters.search}%,brand.ilike.%${filters.search}%,model.ilike.%${filters.search}%`
    )
  }
  if (filters?.supplier_id) {
    query = query.eq("supplier_id", filters.supplier_id)
  }
  if (filters?.brand) {
    query = query.ilike("brand", filters.brand)
  }
  if (filters?.model) {
    query = query.ilike("model", filters.model)
  }
  if (filters?.diameter) {
    query = query.eq("diameter", parseFloat(filters.diameter))
  }
  if (filters?.length) {
    query = query.eq("length", parseFloat(filters.length))
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
  // product_categories table not in generated Supabase types yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data, error } = await supabase
    .from("product_categories")
    .select("slug, name")
    .eq("is_active", true)
    .order("sort_order")

  if (error || !data || data.length === 0) {
    // Fallback if table doesn't exist yet
    return [
      { value: "implant", label: "Implant" },
      { value: "abutment", label: "Abutment" },
      { value: "crown", label: "Crown" },
      { value: "instrument", label: "เครื่องมือ" },
      { value: "consumable", label: "วัสดุสิ้นเปลือง" },
      { value: "other", label: "อื่นๆ" },
    ]
  }

  return data.map((c: { slug: string; name: string }) => ({ value: c.slug, label: c.name }))
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

// ─── Create Product ──────────────────────────────────────────────────

export async function createProduct(formData: FormData) {
  const supabase = await createClient()

  const ref = formData.get("ref") as string | null
  const name = formData.get("name") as string | null

  if (!ref?.trim() || !name?.trim()) {
    throw new Error("กรุณากรอกรหัสสินค้าและชื่อสินค้า")
  }

  const costPriceRaw = formData.get("cost_price") as string | null
  const sellingPriceRaw = formData.get("selling_price") as string | null
  const minStockRaw = formData.get("min_stock_level") as string | null

  const productData = {
    ref: ref.trim(),
    name: name.trim(),
    brand: (formData.get("brand") as string | null)?.trim() || null,
    category: ((formData.get("category") as string) || "other") as ProductCategoryEnum,
    description: (formData.get("description") as string | null)?.trim() || null,
    unit: (formData.get("unit") as string | null)?.trim() || "ชิ้น",
    min_stock_level: minStockRaw ? parseInt(minStockRaw, 10) : 0,
    cost_price: costPriceRaw ? parseFloat(costPriceRaw) : null,
    selling_price: sellingPriceRaw ? parseFloat(sellingPriceRaw) : null,
    supplier_id: (formData.get("supplier_id") as string | null) || null,
    image_url: (formData.get("image_url") as string | null)?.trim() || null,
    model: (formData.get("model") as string | null)?.trim() || null,
    diameter: formData.get("diameter") ? parseFloat(formData.get("diameter") as string) : null,
    length: formData.get("length") ? parseFloat(formData.get("length") as string) : null,
    volume: (formData.get("volume") as string | null)?.trim() || null,
    weight: (formData.get("weight") as string | null)?.trim() || null,
    dimension: (formData.get("dimension") as string | null)?.trim() || null,
    abutment_height: formData.get("abutment_height") ? parseFloat(formData.get("abutment_height") as string) : null,
    gingival_height: formData.get("gingival_height") ? parseFloat(formData.get("gingival_height") as string) : null,
  }

  const { data, error } = await supabase
    .from("products")
    .insert(productData)
    .select()
    .single()

  if (error) {
    if (error.code === "23505") {
      throw new Error("รหัสสินค้านี้มีอยู่ในระบบแล้ว")
    }
    throw new Error("ไม่สามารถสร้างสินค้าได้: " + error.message)
  }

  revalidatePath("/inventory")
  return data
}

// ─── Update Product ──────────────────────────────────────────────────

export async function updateProduct(id: string, formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new Error("กรุณาเข้าสู่ระบบก่อนทำรายการ")
  }

  const ref = formData.get("ref") as string | null
  const name = formData.get("name") as string | null

  if (!ref?.trim() || !name?.trim()) {
    throw new Error("กรุณากรอกรหัสสินค้าและชื่อสินค้า")
  }

  const costPriceRaw = formData.get("cost_price") as string | null
  const sellingPriceRaw = formData.get("selling_price") as string | null
  const minStockRaw = formData.get("min_stock_level") as string | null

  const productData = {
    ref: ref.trim(),
    name: name.trim(),
    brand: (formData.get("brand") as string | null)?.trim() || null,
    category: ((formData.get("category") as string) || "other") as ProductCategoryEnum,
    description: (formData.get("description") as string | null)?.trim() || null,
    unit: (formData.get("unit") as string | null)?.trim() || "ชิ้น",
    min_stock_level: minStockRaw ? parseInt(minStockRaw, 10) : 0,
    cost_price: costPriceRaw ? parseFloat(costPriceRaw) : null,
    selling_price: sellingPriceRaw ? parseFloat(sellingPriceRaw) : null,
    supplier_id: (formData.get("supplier_id") as string | null) || null,
    image_url: (formData.get("image_url") as string | null)?.trim() || null,
    model: (formData.get("model") as string | null)?.trim() || null,
    diameter: formData.get("diameter") ? parseFloat(formData.get("diameter") as string) : null,
    length: formData.get("length") ? parseFloat(formData.get("length") as string) : null,
    volume: (formData.get("volume") as string | null)?.trim() || null,
    weight: (formData.get("weight") as string | null)?.trim() || null,
    dimension: (formData.get("dimension") as string | null)?.trim() || null,
    abutment_height: formData.get("abutment_height") ? parseFloat(formData.get("abutment_height") as string) : null,
    gingival_height: formData.get("gingival_height") ? parseFloat(formData.get("gingival_height") as string) : null,
  }

  const { data, error } = await supabase
    .from("products")
    .update(productData)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    if (error.code === "23505") {
      throw new Error("รหัสสินค้านี้มีอยู่ในระบบแล้ว")
    }
    throw new Error("ไม่สามารถแก้ไขสินค้าได้: " + error.message)
  }

  revalidatePath("/inventory")
  revalidatePath(`/inventory/products/${id}`)
  return data
}

// ─── Toggle Product Active (Soft Delete) ─────────────────────────────

export async function toggleProductActive(id: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new Error("กรุณาเข้าสู่ระบบก่อนทำรายการ")
  }

  // Get current status
  const { data: product, error: fetchError } = await supabase
    .from("products")
    .select("is_active")
    .eq("id", id)
    .single()

  if (fetchError) {
    throw new Error("ไม่พบสินค้าที่ต้องการ")
  }

  const { data, error } = await supabase
    .from("products")
    .update({ is_active: !product.is_active })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    throw new Error("ไม่สามารถเปลี่ยนสถานะสินค้าได้: " + error.message)
  }

  revalidatePath("/inventory")
  return data
}

// ─── Enhanced Product Detail ─────────────────────────────────────────

export async function getProductDetail(id: string) {
  const supabase = await createClient()

  // Fetch product with supplier info
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("*, suppliers(name, code)")
    .eq("id", id)
    .single()

  if (productError) {
    throw new Error("ไม่พบข้อมูลสินค้า")
  }

  // Fetch inventory lots (non-fatal — show empty if fails)
  const { data: inventoryLots } = await supabase
    .from("inventory")
    .select("id, lot_number, quantity, reserved_quantity, expiry_date, received_date")
    .eq("product_id", id)
    .order("expiry_date", { ascending: true })

  const lots = (inventoryLots ?? []).map((lot) => ({
    ...lot,
    available_quantity: lot.quantity - lot.reserved_quantity,
  }))

  const total_in_stock = lots.reduce((sum, l) => sum + l.quantity, 0)
  const total_reserved = lots.reduce((sum, l) => sum + l.reserved_quantity, 0)
  const total_available = lots.reduce((sum, l) => sum + l.available_quantity, 0)

  // Fetch pending order quantity from purchase_order_items (non-fatal)
  const { data: pendingItems } = await supabase
    .from("purchase_order_items")
    .select("quantity, purchase_orders!inner(status)")
    .eq("product_id", id)
    .in("purchase_orders.status", [
      "draft",
      "pending_approval",
      "approved",
      "ordered",
    ])

  const pending_order_quantity = (pendingItems ?? []).reduce(
    (sum, item) => sum + (item.quantity ?? 0),
    0
  )

  return {
    ...product,
    supplier: product.suppliers as { name: string; code: string } | null,
    inventory_lots: lots,
    stock_summary: {
      total_in_stock,
      total_reserved,
      total_available,
    },
    pending_order_quantity,
  }
}

// ─── Product Order History ───────────────────────────────────────────

export async function getProductOrderHistory(productId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("purchase_order_items")
    .select(
      `
      quantity,
      unit_price,
      purchase_orders!inner(
        po_number,
        status,
        expected_delivery_date,
        created_at,
        suppliers(name)
      )
    `
    )
    .eq("product_id", productId)
    .order("created_at", { referencedTable: "purchase_orders", ascending: false })
    .limit(20)

  if (error || !data) {
    return []
  }

  return data.map((item) => {
    const po = item.purchase_orders as unknown as {
      po_number: string
      status: string
      expected_delivery_date: string | null
      created_at: string
      suppliers: { name: string } | null
    }
    return {
      po_number: po.po_number,
      supplier_name: po.suppliers?.name ?? null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      status: po.status,
      expected_delivery_date: po.expected_delivery_date,
      created_at: po.created_at,
    }
  })
}

// ─── Product Usage History ───────────────────────────────────────────

export async function getProductUsageHistory(productId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("case_reservations")
    .select(
      `
      quantity_reserved,
      quantity_used,
      status,
      reserved_at,
      cases!inner(
        case_number,
        scheduled_date,
        patients(full_name)
      )
    `
    )
    .eq("product_id", productId)
    .order("reserved_at", { ascending: false })
    .limit(20)

  if (error || !data) {
    return []
  }

  return data.map((item) => {
    const caseData = item.cases as unknown as {
      case_number: string
      scheduled_date: string | null
      patients: { full_name: string } | null
    }
    const patient = caseData.patients
    return {
      case_number: caseData.case_number,
      patient_name: patient?.full_name ?? null,
      quantity_reserved: item.quantity_reserved,
      quantity_used: item.quantity_used,
      status: item.status,
      reserved_at: item.reserved_at,
      scheduled_date: caseData.scheduled_date,
    }
  })
}

// ─── Upload Product Image ────────────────────────────────────────────

export async function uploadProductImage(productId: string, imageUrl: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new Error("กรุณาเข้าสู่ระบบก่อนทำรายการ")
  }

  const { data, error } = await supabase
    .from("products")
    .update({ image_url: imageUrl })
    .eq("id", productId)
    .select()
    .single()

  if (error) {
    throw new Error("ไม่สามารถบันทึกรูปภาพได้: " + error.message)
  }

  revalidatePath("/inventory")
  revalidatePath(`/inventory/products/${productId}`)
  return data
}

// ─── Product List (lightweight, for dropdowns) ──────────────────────

export async function getProductList() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("products")
    .select("id, name, ref")
    .eq("is_active", true)
    .order("name")
    .limit(500)

  if (error) return []
  return data ?? []
}
