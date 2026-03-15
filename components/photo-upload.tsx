"use client"

import { useState, useRef, useCallback } from "react"
import { Camera, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface PhotoUploadProps {
  caseId: string
  reservationId: string
  existingPhotoUrl?: string | null
  onUploaded: (url: string) => void
}

function compressImage(file: File, maxSize: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height * maxSize) / width)
          width = maxSize
        } else {
          width = Math.round((width * maxSize) / height)
          height = maxSize
        }
      }

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Canvas context not available"))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error("Failed to compress image"))
          }
        },
        "image/jpeg",
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Failed to load image"))
    }

    img.src = url
  })
}

export function PhotoUpload({
  caseId,
  reservationId,
  existingPhotoUrl,
  onUploaded,
}: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(existingPhotoUrl ?? null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setError(null)
      setUploading(true)

      try {
        // Show local preview immediately
        const localUrl = URL.createObjectURL(file)
        setPreview(localUrl)

        // Compress
        const compressed = await compressImage(file, 1200, 0.7)

        // Upload
        const formData = new FormData()
        formData.append("file", compressed, file.name)
        formData.append("caseId", caseId)
        formData.append("reservationId", reservationId)

        const res = await fetch("/api/upload-photo", {
          method: "POST",
          body: formData,
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || "อัปโหลดไม่สำเร็จ")
        }

        URL.revokeObjectURL(localUrl)
        setPreview(data.url)
        onUploaded(data.url)
      } catch (err) {
        setError(err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ")
        setPreview(existingPhotoUrl ?? null)
      } finally {
        setUploading(false)
        // Reset input so the same file can be re-selected
        if (inputRef.current) {
          inputRef.current.value = ""
        }
      }
    },
    [caseId, reservationId, existingPhotoUrl, onUploaded]
  )

  const handleRemovePreview = useCallback(() => {
    setPreview(existingPhotoUrl ?? null)
    setError(null)
    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }, [existingPhotoUrl])

  return (
    <div className="space-y-2">
      <Label>ภาพถ่ายหลักฐาน</Label>

      {preview ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="ภาพถ่ายหลักฐาน"
            className="h-32 w-32 rounded-md border object-cover"
          />
          {!uploading && (
            <button
              type="button"
              onClick={handleRemovePreview}
              className="absolute -right-2 -top-2 rounded-full bg-destructive p-0.5 text-destructive-foreground shadow-sm hover:bg-destructive/90"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/40">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="h-32 w-32 flex-col gap-2 border-dashed"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <>
              <Camera className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">ถ่ายภาพ</span>
            </>
          )}
        </Button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {!preview && !uploading && (
        <p className="text-xs text-muted-foreground">
          กดเพื่อถ่ายภาพหรือเลือกจากอัลบั้ม
        </p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
