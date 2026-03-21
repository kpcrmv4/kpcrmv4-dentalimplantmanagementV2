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

export async function createUser(email: string, password: string, fullName: string, role: UserRole) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Verify admin
  const { data: currentUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()
  if (currentUser?.role !== "admin") throw new Error("Admin only")

  // Use service role client for admin operations
  const { createClient: createServiceClient } = await import("@/lib/supabase/service")
  const serviceSupabase = createServiceClient()

  // Create auth user
  const { data: newAuthUser, error: authError } = await serviceSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    if (authError.message.includes("already")) throw new Error("อีเมลนี้มีอยู่ในระบบแล้ว")
    throw authError
  }

  // Create user profile
  const { error: profileError } = await serviceSupabase
    .from("users")
    .insert({
      id: newAuthUser.user.id,
      email,
      full_name: fullName,
      role,
      is_active: true,
    })

  if (profileError) throw profileError
  revalidatePath("/admin/users")
}

export async function updateUserProfile(userId: string, data: { full_name?: string; phone?: string; email?: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: currentUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()
  if (currentUser?.role !== "admin") throw new Error("Admin only")

  const updateData: Record<string, unknown> = {}
  if (data.full_name !== undefined) updateData.full_name = data.full_name
  if (data.phone !== undefined) updateData.phone = data.phone || null

  const { error } = await supabase
    .from("users")
    .update(updateData)
    .eq("id", userId)
  if (error) throw error
  revalidatePath("/admin/users")
}

export async function resetUserPassword(userId: string, newPassword: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: currentUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()
  if (currentUser?.role !== "admin") throw new Error("Admin only")

  const { createClient: createServiceClient } = await import("@/lib/supabase/service")
  const serviceSupabase = createServiceClient()

  const { error } = await serviceSupabase.auth.admin.updateUserById(userId, {
    password: newPassword,
  })

  if (error) throw error
}

export async function deleteUser(userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  if (user.id === userId) throw new Error("ไม่สามารถลบตัวเองได้")

  const { data: currentUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()
  if (currentUser?.role !== "admin") throw new Error("Admin only")

  // Soft delete: deactivate user
  const { error } = await supabase
    .from("users")
    .update({ is_active: false })
    .eq("id", userId)

  if (error) throw error
  revalidatePath("/admin/users")
}
