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

    if (!file) {
      return NextResponse.json(
        { error: "กรุณาเลือกไฟล์" },
        { status: 400 }
      )
    }

    // Determine upload type: product image or case photo
    const folder = formData.get("folder") as string | null
    const caseId = formData.get("caseId") as string | null
    const reservationId = formData.get("reservationId") as string | null

    const isProductUpload = folder === "products"
    const isCaseUpload = caseId && reservationId

    if (!isProductUpload && !isCaseUpload) {
      return NextResponse.json(
        { error: "กรุณาระบุ folder หรือ caseId/reservationId" },
        { status: 400 }
      )
    }

    const timestamp = Date.now()
    const ext = file.name.split(".").pop() || "jpg"

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // ─── Product Image Upload ─────────────────────────────────────
    if (isProductUpload) {
      const bucketName = "product-images"
      const filePath = `${user.id}/${timestamp}.${ext}`

      // Ensure bucket exists (ignore error if already exists)
      await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 5242880, // 5MB
      })

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
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
      } = supabase.storage.from(bucketName).getPublicUrl(filePath)

      return NextResponse.json({ url: publicUrl })
    }

    // ─── Case Photo Upload ────────────────────────────────────────
    const filePath = `${caseId}/${reservationId}_${timestamp}.${ext}`

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
      .eq("id", reservationId!)

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
