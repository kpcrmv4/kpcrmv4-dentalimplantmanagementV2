"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  AlertTriangle,
  Loader2,
  Send,
  ShoppingCart,
  Truck,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  createSupplierOrder,
  checkSupplierLineId,
  getSupplierOrdersForCase,
} from "@/lib/actions/supplier-orders"

interface OutOfStockItem {
  productId: string
  productName: string
  productBrand: string
  productRef: string
  productUnit: string
  quantity: number
  supplierId: string | null
  supplierName: string | null
}

export function CaseSupplierOrder({
  caseId,
  outOfStockItems,
}: {
  caseId: string
  outOfStockItems: OutOfStockItem[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{
    type: "borrow" | "purchase"
    supplierId: string
    supplierName: string
    items: OutOfStockItem[]
  } | null>(null)
  const [notes, setNotes] = useState("")
  const [lineWarning, setLineWarning] = useState<string | null>(null)
  const [existingOrders, setExistingOrders] = useState<Array<{ borrow_number: string; order_type: string; status: string; supplier_name: string }>>([])

  useEffect(() => {
    getSupplierOrdersForCase(caseId).then((orders) => {
      setExistingOrders(
        orders.map((o: Record<string, unknown>) => ({
          borrow_number: String(o.borrow_number ?? ""),
          order_type: String(o.order_type ?? "borrow"),
          status: String(o.status ?? ""),
          supplier_name: String((o.suppliers as Record<string, unknown>)?.name ?? "-"),
        }))
      )
    }).catch(() => {})
  }, [caseId])

  if (outOfStockItems.length === 0) return null

  // Group by supplier
  const bySupplier = new Map<string, { name: string; items: OutOfStockItem[] }>()
  const noSupplier: OutOfStockItem[] = []

  for (const item of outOfStockItems) {
    if (item.supplierId) {
      const existing = bySupplier.get(item.supplierId)
      if (existing) {
        existing.items.push(item)
      } else {
        bySupplier.set(item.supplierId, { name: item.supplierName ?? "-", items: [item] })
      }
    } else {
      noSupplier.push(item)
    }
  }

  async function openOrderDialog(type: "borrow" | "purchase", supplierId: string, supplierName: string, items: OutOfStockItem[]) {
    setError(null)
    setLineWarning(null)
    setNotes("")

    // Check LINE ID
    const check = await checkSupplierLineId(supplierId)
    if (!check.hasLineId && type === "borrow") {
      setLineWarning(`Supplier "${check.supplierName}" ยังไม่มี LINE User ID — ไม่สามารถส่งใบยืมได้ กรุณาเพิ่ม LINE ID ใน Supplier ก่อน`)
      return
    }
    if (!check.hasLineId && type === "purchase") {
      setLineWarning(`Supplier "${check.supplierName}" ยังไม่มี LINE User ID — จะไม่สามารถส่ง LINE แจ้งหลังอนุมัติได้`)
    }

    setDialog({ type, supplierId, supplierName, items })
  }

  function handleSubmit() {
    if (!dialog) return
    setError(null)
    startTransition(async () => {
      try {
        const result = await createSupplierOrder({
          caseId,
          supplierId: dialog.supplierId,
          orderType: dialog.type,
          items: dialog.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
          notes: notes || undefined,
        })
        setDialog(null)
        setSuccess(
          dialog.type === "borrow"
            ? `ส่งใบยืม ${result.borrowNumber} ไป ${dialog.supplierName} ทาง LINE แล้ว`
            : `สร้างใบซื้อ ${result.borrowNumber} รออนุมัติ`
        )
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
      }
    })
  }

  return (
    <>
      <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50/50 dark:bg-red-500/5 p-3 space-y-3">
        <div className="flex items-center gap-1.5">
          <Truck className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
          <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">
            สั่งของจาก Supplier ({outOfStockItems.length} รายการขาด)
          </h2>
        </div>

        {/* Existing orders */}
        {existingOrders.length > 0 && (
          <div className="space-y-1">
            {existingOrders.map((o) => (
              <div key={o.borrow_number} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                  o.order_type === "borrow"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400"
                }`}>
                  {o.order_type === "borrow" ? "ยืม" : "ซื้อ"}
                </span>
                <span>{o.borrow_number}</span>
                <span>→ {o.supplier_name}</span>
                <span className="text-[10px]">({o.status})</span>
              </div>
            ))}
          </div>
        )}

        {/* LINE warning */}
        {lineWarning && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-500/10 p-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="text-xs text-amber-800 dark:text-amber-300">{lineWarning}</p>
              <button onClick={() => setLineWarning(null)} className="text-[11px] text-amber-600 underline mt-1">ปิด</button>
            </div>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="flex items-center gap-2 rounded-lg border border-green-400 bg-green-50 dark:bg-green-500/10 p-2.5">
            <Send className="h-3.5 w-3.5 text-green-600" />
            <p className="text-xs text-green-800 dark:text-green-300">{success}</p>
            <button onClick={() => setSuccess(null)} className="ml-auto"><X className="h-3 w-3 text-green-600" /></button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
            <p className="text-xs text-destructive">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto"><X className="h-3 w-3 text-destructive" /></button>
          </div>
        )}

        {/* Items grouped by supplier */}
        {Array.from(bySupplier.entries()).map(([supplierId, { name, items }]) => (
          <div key={supplierId} className="rounded-lg border bg-card p-2.5 space-y-2">
            <p className="text-xs font-medium">{name}</p>
            <div className="space-y-1">
              {items.map((item) => (
                <div key={item.productId} className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">
                    {item.productName} {item.productBrand ? `(${item.productBrand})` : ""}
                  </span>
                  <span className="font-medium">{item.quantity} {item.productUnit}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => openOrderDialog("borrow", supplierId, name, items)}
                disabled={isPending}
              >
                <Send className="mr-1 h-3 w-3" /> ยืม
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-8 text-xs"
                onClick={() => openOrderDialog("purchase", supplierId, name, items)}
                disabled={isPending}
              >
                <ShoppingCart className="mr-1 h-3 w-3" /> ซื้อ
              </Button>
            </div>
          </div>
        ))}

        {/* Items without supplier */}
        {noSupplier.length > 0 && (
          <div className="rounded-lg border border-dashed p-2.5 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">ไม่ระบุ Supplier</p>
            {noSupplier.map((item) => (
              <div key={item.productId} className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{item.productName}</span>
                <span>{item.quantity} {item.productUnit}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order Dialog */}
      <Dialog open={!!dialog} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialog?.type === "borrow" ? "ยืมวัสดุ" : "สั่งซื้อวัสดุ"} — {dialog?.supplierName}
            </DialogTitle>
            <DialogDescription>
              {dialog?.type === "borrow"
                ? "ส่งใบยืมทาง LINE ไปยัง Supplier ทันที"
                : "สร้างใบสั่งซื้อ รอ Admin อนุมัติก่อนส่ง"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Items preview */}
            <div className="rounded-lg border bg-muted/30 p-2.5 space-y-1">
              {dialog?.items.map((item) => (
                <div key={item.productId} className="flex items-center justify-between text-xs">
                  <span>{item.productName} <span className="text-muted-foreground">REF: {item.productRef}</span></span>
                  <span className="font-medium">{item.quantity} {item.productUnit}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">หมายเหตุ (ไม่บังคับ)</Label>
              <Textarea
                placeholder="เช่น ต้องการภายในวัน..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {lineWarning && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-500/10 p-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
                <p className="text-[11px] text-amber-700 dark:text-amber-300">{lineWarning}</p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              className={`w-full h-11 ${dialog?.type === "borrow" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
              onClick={handleSubmit}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : dialog?.type === "borrow" ? (
                <Send className="mr-2 h-4 w-4" />
              ) : (
                <ShoppingCart className="mr-2 h-4 w-4" />
              )}
              {isPending
                ? "กำลังดำเนินการ..."
                : dialog?.type === "borrow"
                  ? "ส่งใบยืมทาง LINE"
                  : "สร้างใบสั่งซื้อ (รออนุมัติ)"}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setDialog(null)}>
              ยกเลิก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
