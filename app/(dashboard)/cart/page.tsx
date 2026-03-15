"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useCartStore } from "@/lib/stores/cart-store"
import { createReservationsBatch } from "@/lib/actions/cases"
import { useState } from "react"

export default function CartPage() {
  const router = useRouter()
  const { items, caseId, caseName, updateQuantity, removeItem, clearCart } = useCartStore()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)

  function handleSubmit() {
    if (!caseId || items.length === 0) return
    setError(null)

    startTransition(async () => {
      try {
        // Batch create all reservations (atomic with stock validation)
        await createReservationsBatch(
          caseId,
          items.map((i) => ({ productId: i.productId, quantity: i.quantity }))
        )
        clearCart()
        router.push(`/cases/${caseId}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
      }
    })
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <ShoppingCart className="mb-3 h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-medium">ตะกร้าว่าง</h2>
        <p className="mt-1 text-sm text-muted-foreground">ยังไม่มีสินค้าในตะกร้า</p>
        <Button asChild className="mt-4" size="sm">
          <Link href="/shop">เลือกสินค้า</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href={caseId ? `/shop?case_id=${caseId}` : "/shop"}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">ตะกร้า ({totalItems})</h1>
          {caseName ? (
            <p className="text-xs text-muted-foreground">เคส: {caseName}</p>
          ) : null}
        </div>
      </div>

      {/* Items */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">รายการวัสดุ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item) => (
            <div key={item.productId}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.brand ?? ""} · REF: {item.ref}
                  </p>
                </div>
                <button
                  onClick={() => removeItem(item.productId)}
                  className="shrink-0 p-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <span className="text-xs text-muted-foreground">
                  {item.quantity} {item.unit}
                </span>
              </div>
              <Separator className="mt-3" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Error */}
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      {/* Submit */}
      <div className="sticky bottom-20 lg:bottom-4">
        <Button
          className="w-full"
          size="lg"
          disabled={!caseId || isPending}
          onClick={handleSubmit}
        >
          {isPending ? "กำลังสั่ง..." : `ยืนยันการสั่งของ (${totalItems} รายการ)`}
        </Button>
        {!caseId ? (
          <p className="mt-1 text-center text-xs text-destructive">
            กรุณาเลือกเคสก่อนสั่งของ
          </p>
        ) : null}
      </div>
    </div>
  )
}
