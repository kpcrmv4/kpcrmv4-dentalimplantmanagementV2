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
