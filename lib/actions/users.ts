"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { UserRole } from "@/types/database"

export async function getUsers() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: currentUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()
  if (currentUser?.role !== "admin") throw new Error("Admin only")

  const { data, error } = await supabase
    .from("users")
    .select("id, email, full_name, role, is_active, phone, created_at")
    .order("full_name")

  if (error) throw error
  return data
}

export async function updateUserRole(userId: string, role: UserRole) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: currentUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()
  if (currentUser?.role !== "admin") throw new Error("Admin only")

  const { error } = await supabase
    .from("users")
    .update({ role })
    .eq("id", userId)
  if (error) throw error
  revalidatePath("/admin/users")
}

export async function toggleUserActive(userId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: currentUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()
  if (currentUser?.role !== "admin") throw new Error("Admin only")

  const { data: targetUser } = await supabase
    .from("users")
    .select("is_active")
    .eq("id", userId)
    .single()
  if (!targetUser) throw new Error("User not found")

  const { error } = await supabase
    .from("users")
    .update({ is_active: !targetUser.is_active })
    .eq("id", userId)
  if (error) throw error
  revalidatePath("/admin/users")
}
