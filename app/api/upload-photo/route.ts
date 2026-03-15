import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "ไม่ได้รับอนุญาต" },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const caseId = formData.get("caseId") as string | null
    const reservationId = formData.get("reservationId") as string | null

    if (!file || !caseId || !reservationId) {
      return NextResponse.json(
        { error: "กรุณาระบุไฟล์ caseId และ reservationId" },
        { status: 400 }
      )
    }

    const timestamp = Date.now()
    const ext = file.name.split(".").pop() || "jpg"
    const filePath = `${caseId}/${reservationId}_${timestamp}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from("case-photos")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json(
        { error: `อัปโหลดไม่สำเร็จ: ${uploadError.message}` },
        { status: 500 }
      )
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("case-photos").getPublicUrl(filePath)

    const { error: updateError } = await supabase
      .from("case_reservations")
      .update({
        photo_url: publicUrl,
        photo_uploaded_at: new Date().toISOString(),
      })
      .eq("id", reservationId)

    if (updateError) {
      return NextResponse.json(
        { error: `อัปเดตข้อมูลไม่สำเร็จ: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: publicUrl })
  } catch (err) {
    console.error("Upload photo error:", err)
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดภายในระบบ" },
      { status: 500 }
    )
  }
}
