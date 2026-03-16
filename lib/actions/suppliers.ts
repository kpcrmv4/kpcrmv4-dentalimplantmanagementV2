"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export async function getSupplierDetails(supplierId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", supplierId)
    .single()

  if (error) throw error
  return data
}

export async function updateLeadTime(supplierId: string, leadTimeDays: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from("suppliers")
    .update({ lead_time_days: leadTimeDays })
    .eq("id", supplierId)

  if (error) throw error
  revalidatePath("/orders")
}

export async function calculateDeliveryScore(supplierId: string) {
  const supabase = await createClient()

  // Get completed POs for this supplier that have expected_delivery_date
  const { data: pos, error } = await supabase
    .from("purchase_orders")
    .select("expected_delivery_date, updated_at, status")
    .eq("supplier_id", supplierId)
    .eq("status", "received")
    .not("expected_delivery_date", "is", null)
    .order("updated_at", { ascending: false })
    .limit(20)

  if (error) throw error
  if (!pos || pos.length === 0) return null

  // Score: percentage of POs delivered on or before expected date
  let onTime = 0
  for (const po of pos) {
    const expected = new Date(po.expected_delivery_date!)
    const actual = new Date(po.updated_at)
    if (actual <= expected) onTime++
  }

  const score = Math.round((onTime / pos.length) * 10 * 10) / 10 // 0-10 scale, 1 decimal

  // Save score
  await supabase
    .from("suppliers")
    .update({ delivery_score: score })
    .eq("id", supplierId)

  revalidatePath("/orders")
  return score
}

export async function getSupplierWithScore(supplierId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name, code, lead_time_days, delivery_score")
    .eq("id", supplierId)
    .single()

  if (error) throw error
  return data
}

export async function getAllSuppliers() {
  const supabase = await createClient()

  const { data: suppliers, error } = await supabase
    .from("suppliers")
    .select(`
      id,
      code,
      name,
      contact_person,
      phone,
      email,
      line_id,
      address,
      lead_time_days,
      delivery_score,
      is_active,
      created_at,
      products:products(count),
      purchase_orders:purchase_orders(count)
    `)
    .order("name")

  if (error) throw new Error("ไม่สามารถดึงข้อมูลซัพพลายเออร์ได้")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = suppliers?.map((s: any) => ({
    id: s.id as string,
    code: s.code as string,
    name: s.name as string,
    contact_person: s.contact_person as string | null,
    phone: s.phone as string | null,
    email: s.email as string | null,
    line_id: s.line_id as string | null,
    address: s.address as string | null,
    lead_time_days: s.lead_time_days as number | null,
    delivery_score: s.delivery_score as number | null,
    is_active: s.is_active as boolean,
    created_at: s.created_at as string,
    product_count: (s.products?.[0]?.count ?? 0) as number,
    po_count: (s.purchase_orders?.[0]?.count ?? 0) as number,
  }))

  return result
}

export async function createSupplier(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนดำเนินการ")

  const code = formData.get("code") as string
  const name = formData.get("name") as string

  if (!code || !code.trim()) {
    throw new Error("กรุณาระบุรหัสซัพพลายเออร์")
  }
  if (!name || !name.trim()) {
    throw new Error("กรุณาระบุชื่อซัพพลายเออร์")
  }

  const leadTimeDaysRaw = formData.get("lead_time_days") as string
  const leadTimeDays = leadTimeDaysRaw ? parseInt(leadTimeDaysRaw, 10) : null

  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      code: code.trim(),
      name: name.trim(),
      contact_person: (formData.get("contact_person") as string)?.trim() || null,
      phone: (formData.get("phone") as string)?.trim() || null,
      email: (formData.get("email") as string)?.trim() || null,
      line_id: (formData.get("line_id") as string)?.trim() || null,
      address: (formData.get("address") as string)?.trim() || null,
      lead_time_days: leadTimeDays,
    })
    .select()
    .single()

  if (error) throw new Error("ไม่สามารถสร้างซัพพลายเออร์ได้: " + error.message)

  revalidatePath("/suppliers")
  return data
}

export async function updateSupplier(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนดำเนินการ")

  const code = formData.get("code") as string
  const name = formData.get("name") as string

  if (!code || !code.trim()) {
    throw new Error("กรุณาระบุรหัสซัพพลายเออร์")
  }
  if (!name || !name.trim()) {
    throw new Error("กรุณาระบุชื่อซัพพลายเออร์")
  }

  const leadTimeDaysRaw = formData.get("lead_time_days") as string
  const leadTimeDays = leadTimeDaysRaw ? parseInt(leadTimeDaysRaw, 10) : null

  const { data, error } = await supabase
    .from("suppliers")
    .update({
      code: code.trim(),
      name: name.trim(),
      contact_person: (formData.get("contact_person") as string)?.trim() || null,
      phone: (formData.get("phone") as string)?.trim() || null,
      email: (formData.get("email") as string)?.trim() || null,
      line_id: (formData.get("line_id") as string)?.trim() || null,
      address: (formData.get("address") as string)?.trim() || null,
      lead_time_days: leadTimeDays,
    })
    .eq("id", id)
    .select()
    .single()

  if (error) throw new Error("ไม่สามารถอัปเดตซัพพลายเออร์ได้: " + error.message)

  revalidatePath("/suppliers")
  return data
}

export async function toggleSupplierActive(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนดำเนินการ")

  // Get current status
  const { data: supplier, error: fetchError } = await supabase
    .from("suppliers")
    .select("is_active")
    .eq("id", id)
    .single()

  if (fetchError || !supplier) throw new Error("ไม่พบข้อมูลซัพพลายเออร์")

  const { error } = await supabase
    .from("suppliers")
    .update({ is_active: !supplier.is_active })
    .eq("id", id)

  if (error) throw new Error("ไม่สามารถเปลี่ยนสถานะซัพพลายเออร์ได้")

  revalidatePath("/suppliers")
}

export async function getSupplierPOHistory(supplierId: string) {
  const supabase = await createClient()

  const { data: pos, error } = await supabase
    .from("purchase_orders")
    .select(`
      id,
      po_number,
      status,
      total_amount,
      expected_delivery_date,
      created_at,
      purchase_order_items:purchase_order_items(count)
    `)
    .eq("supplier_id", supplierId)
    .order("created_at", { ascending: false })
    .limit(20)

  if (error) throw new Error("ไม่สามารถดึงประวัติใบสั่งซื้อได้")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = pos?.map((po: any) => ({
    id: po.id as string,
    po_number: po.po_number as string,
    status: po.status as string,
    total_amount: po.total_amount as number | null,
    expected_delivery_date: po.expected_delivery_date as string | null,
    created_at: po.created_at as string,
    items_count: (po.purchase_order_items?.[0]?.count ?? 0) as number,
  }))

  return result
}
