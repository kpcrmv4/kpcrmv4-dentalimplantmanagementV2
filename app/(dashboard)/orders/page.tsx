import Link from "next/link"
import { Plus, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getPurchaseOrders } from "@/lib/actions/orders"
import { formatDate, formatCurrency } from "@/lib/utils"
import { OrderSearch } from "./order-search"

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "แบบร่าง", color: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400" },
  pending_approval: { label: "รออนุมัติ", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400" },
  approved: { label: "อนุมัติแล้ว", color: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" },
  ordered: { label: "สั่งแล้ว", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" },
  partially_received: { label: "รับบางส่วน", color: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400" },
  received: { label: "รับครบ", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" },
  cancelled: { label: "ยกเลิก", color: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" },
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const params = await searchParams
  const orders = await getPurchaseOrders({
    status: params.status as never,
    search: params.q,
  })

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">ใบสั่งซื้อ</h1>
        <Button size="sm" asChild>
          <Link href="/orders/new">
            <Plus className="mr-1 h-4 w-4" />
            สร้าง PO
          </Link>
        </Button>
      </div>

      <OrderSearch
        defaultValue={params.q ?? ""}
        currentStatus={params.status ?? ""}
      />

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <FileText className="mb-2 h-10 w-10" />
          <p className="text-sm">ไม่พบใบสั่งซื้อ</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((po) => {
            const status = STATUS_CONFIG[po.status as string] ?? STATUS_CONFIG.draft
            const supplier = po.suppliers as unknown as { name: string } | null
            const requester = po.requester as unknown as { full_name: string } | null
            const itemCount = (po.purchase_order_items as unknown[])?.length ?? 0

            return (
              <Card key={po.id as string}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{String(po.po_number)}</p>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {supplier?.name ?? "-"} · {itemCount} รายการ
                      </p>
                      <p className="text-xs text-muted-foreground">
                        โดย {requester?.full_name ?? "-"} · {formatDate(String(po.created_at))}
                      </p>
                    </div>
                    {po.total_amount ? (
                      <p className="text-sm font-medium">
                        {formatCurrency(Number(po.total_amount))}
                      </p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
