import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  Building2,
  Calendar,
  FileText,
  Phone,
  Mail,
  User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { getPurchaseOrderById } from "@/lib/actions/orders"
import { getCurrentUser } from "@/lib/actions/auth"
import { formatDate, formatCurrency } from "@/lib/utils"
import { POActions } from "./po-actions"

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "แบบร่าง", color: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400" },
  pending_approval: { label: "รออนุมัติ", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400" },
  approved: { label: "อนุมัติแล้ว", color: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" },
  ordered: { label: "สั่งแล้ว", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" },
  partially_received: { label: "รับบางส่วน", color: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400" },
  received: { label: "รับครบ", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" },
  cancelled: { label: "ยกเลิก", color: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" },
}

export default async function PODetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [po, currentUser] = await Promise.all([
    getPurchaseOrderById(id).catch(() => null),
    getCurrentUser(),
  ])

  if (!po) notFound()

  const status = STATUS_CONFIG[po.status as string] ?? STATUS_CONFIG.draft
  const supplier = po.suppliers as Record<string, unknown> | null
  const requester = po.requester as Record<string, unknown> | null
  const approver = po.approver as Record<string, unknown> | null
  const items = po.items as Array<Record<string, unknown>>
  const isAdmin = currentUser?.role === "admin"
  const isClosed = ["received", "cancelled"].includes(po.status as string)

  return (
    <div className="mx-auto max-w-lg space-y-3 p-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="shrink-0" asChild>
          <Link href="/orders"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-semibold truncate">{String(po.po_number)}</h1>
            <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${status.color}`}>
              {status.label}
            </span>
          </div>
        </div>
      </div>

      {/* Supplier info */}
      <div className="rounded-xl border bg-card p-3 space-y-2.5">
        <div className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{String(supplier?.name ?? "-")}</span>
          {supplier?.code ? (
            <span className="text-xs text-muted-foreground">({String(supplier.code)})</span>
          ) : null}
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">ผู้สร้าง</span>
            <p className="flex items-center gap-1 text-sm font-medium leading-tight">
              <User className="h-3 w-3 text-muted-foreground" />
              {String(requester?.full_name ?? "-")}
            </p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">วันที่สร้าง</span>
            <p className="flex items-center gap-1 text-sm font-medium leading-tight">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              {formatDate(String(po.created_at))}
            </p>
          </div>
          {po.expected_delivery_date && (
            <div>
              <span className="text-xs text-muted-foreground">กำหนดส่ง</span>
              <p className="text-sm font-medium leading-tight">
                {formatDate(String(po.expected_delivery_date))}
              </p>
            </div>
          )}
          {approver?.full_name ? (
            <div>
              <span className="text-xs text-muted-foreground">อนุมัติโดย</span>
              <p className="text-sm font-medium leading-tight">
                {String(approver.full_name)}
                {po.approved_at ? ` · ${formatDate(String(po.approved_at))}` : ""}
              </p>
            </div>
          ) : null}
        </div>

        {/* Supplier contact */}
        {(supplier?.contact_person || supplier?.phone || supplier?.email) ? (
          <>
            <Separator />
            <div className="space-y-1">
              {supplier?.contact_person ? (
                <p className="text-xs text-muted-foreground">
                  ติดต่อ: {String(supplier.contact_person)}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-3">
                {supplier?.phone ? (
                  <a href={`tel:${supplier.phone}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                    <Phone className="h-3 w-3" /> {String(supplier.phone)}
                  </a>
                ) : null}
                {supplier?.email ? (
                  <a href={`mailto:${supplier.email}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                    <Mail className="h-3 w-3" /> {String(supplier.email)}
                  </a>
                ) : null}
              </div>
            </div>
          </>
        ) : null}

        {po.notes ? (
          <>
            <Separator />
            <div>
              <span className="text-xs text-muted-foreground">หมายเหตุ</span>
              <p className="text-sm">{String(po.notes)}</p>
            </div>
          </>
        ) : null}
      </div>

      {/* Items */}
      <div className="rounded-xl border bg-card p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <h2 className="text-sm font-semibold">รายการสินค้า ({items.length})</h2>
        </div>

        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">ไม่มีรายการ</p>
        ) : (
          <div className="space-y-1.5">
            {items.map((item) => {
              const product = item.products as Record<string, unknown> | null
              return (
                <div key={item.id as string} className="flex items-start gap-2 rounded-lg border p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight">{String(product?.name ?? "-")}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {product?.brand ? `${String(product.brand)} · ` : ""}REF: {String(product?.ref ?? "-")}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {Number(item.quantity)} {String(product?.unit ?? "ชิ้น")} × {formatCurrency(Number(item.unit_price))}
                    </p>
                  </div>
                  <p className="text-sm font-medium shrink-0">
                    {formatCurrency(Number(item.total_price))}
                  </p>
                </div>
              )
            })}
          </div>
        )}

        {/* Total */}
        <Separator className="my-2" />
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">รวมทั้งหมด</span>
          <span className="text-base font-bold">{formatCurrency(Number(po.total_amount ?? 0))}</span>
        </div>
      </div>

      {/* Actions */}
      {!isClosed && (
        <POActions
          poId={id}
          status={po.status as string}
          isAdmin={isAdmin}
        />
      )}
    </div>
  )
}
