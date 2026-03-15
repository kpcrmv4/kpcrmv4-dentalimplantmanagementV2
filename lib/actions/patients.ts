"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { generateHN } from "@/lib/utils"

export async function getPatients(search?: string) {
  const supabase = await createClient()
  let query = supabase
    .from("patients")
    .select("*")
    .order("created_at", { ascending: false })

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,hn.ilike.%${search}%`
    )
  }

  const { data, error } = await query.limit(50)
  if (error) throw error
  return data
}

export async function getPatientById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .single()
  if (error) throw error
  return data
}

export async function createPatient(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const hn = formData.get("hn") as string || generateHN()

  const { data, error } = await supabase
    .from("patients")
    .insert({
      hn,
      full_name: formData.get("full_name") as string,
      gender: (formData.get("gender") as string) || null,
      date_of_birth: (formData.get("date_of_birth") as string) || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) throw error
  revalidatePath("/patients")
  return data
}

export async function updatePatient(id: string, formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("patients")
    .update({
      full_name: formData.get("full_name") as string,
      gender: (formData.get("gender") as string) || null,
      date_of_birth: (formData.get("date_of_birth") as string) || null,
    })
    .eq("id", id)

  if (error) throw error
  revalidatePath("/patients")
}

export async function searchPatients(query: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("patients")
    .select("id, hn, full_name")
    .or(`full_name.ilike.%${query}%,hn.ilike.%${query}%`)
    .limit(10)

  if (error) throw error
  return data
}
