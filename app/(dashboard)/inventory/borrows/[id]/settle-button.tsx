"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, ArrowLeftRight, DollarSign, Loader2, X, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { settleBorrowItem, uploadBorrowPhoto } from "@/lib/actions/borrows"

export function SettleButton({ itemId, borrowId }: { itemId: string; borrowId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showModal, setShowModal] = useState(false)
  const [type, setType] = useState<"return" | "exchange" | "payment">("return")
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)

  function handleSettle() {
    setError(null)
    startTransition(async () => {
      try {
        await settleBorrowItem(itemId, {
          type,
          amount: amount ? parseFloat(amount) : undefined,
          note: note || undefined,
        })
        setShowModal(false)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "ดำเนินการไม่สำเร็จ")
      }
    })
  }

  return (
    <>
      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setShowModal(true)}>
        <Check className="mr-1 h-3 w-3" /> ชำระ
      </Button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
          <div className="mx-4 w-full max-w-sm rounded-lg bg-background p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold">ชำระรายการยืม</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {error && <p className="mb-3 text-xs text-destructive">{error}</p>}

            <div className="space-y-3">
              <div className="flex gap-2">
                <Button size="sm" variant={type === "return" ? "default" : "outline"} onClick={() => setType("return")} className="flex-1 text-xs">
                  <Check className="mr-1 h-3 w-3" /> คืนของ
                </Button>
                <Button size="sm" variant={type === "exchange" ? "default" : "outline"} onClick={() => setType("exchange")} className="flex-1 text-xs">
                  <ArrowLeftRight className="mr-1 h-3 w-3" /> แลก
                </Button>
                <Button size="sm" variant={type === "payment" ? "default" : "outline"} onClick={() => setType("payment")} className="flex-1 text-xs">
                  <DollarSign className="mr-1 h-3 w-3" /> ชำระเงิน
                </Button>
              </div>

              {type === "payment" && (
                <div>
                  <Label className="text-xs">จำนวนเงิน (บาท)</Label>
                  <Input type="number" step="0.01" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" placeholder="0.00" />
                </div>
              )}

              <div>
                <Label className="text-xs">หมายเหตุ</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="mt-1" rows={2} placeholder="รายละเอียดเพิ่มเติม..." />
              </div>

              <Button className="w-full" onClick={handleSettle} disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                ยืนยัน
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export function PhotoUploadButton({ borrowId }: { borrowId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("folder", "borrows")

        const res = await fetch("/api/upload-photo", { method: "POST", body: formData })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "อัปโหลดไม่สำเร็จ")

        await uploadBorrowPhoto(borrowId, data.url, file.name)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ")
      }
    })
  }

  return (
    <div>
      <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted">
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        แนบรูปหลักฐาน
        <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={isPending} />
      </label>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}
