import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Calendar, User, Stethoscope } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { getCaseById } from "@/lib/actions/cases"
import { formatDate } from "@/lib/utils"
import { CaseActions } from "./case-actions"

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending_appointment: { label: "รอทำนัด", color: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400" },
  pending_order: { label: "รอสั่งของ", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400" },
  pending_preparation: { label: "รอจัดของ", color: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400" },
  ready: { label: "พร้อม", color: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" },
  completed: { label: "เสร็จสิ้น", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" },
  cancelled: { label: "ยกเลิก", color: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" },
}

const RESERVATION_STATUS: Record<string, { label: string; color: string }> = {
  reserved: { label: "จองแล้ว", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400" },
  prepared: { label: "จัดเตรียมแล้ว", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" },
  consumed: { label: "ใช้แล้ว", color: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" },
  returned: { label: "คืนแล้ว", color: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400" },
}

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let caseData: Awaited<ReturnType<typeof getCaseById>>
  try {
    caseData = await getCaseById(id)
  } catch {
    notFound()
  }

  const status = STATUS_CONFIG[caseData.case_status] ?? STATUS_CONFIG.pending_appointment
  const patient = caseData.patients as Record<string, unknown> | null
  const dentist = caseData.dentist as Record<string, unknown> | null
  const assistant = caseData.assistant as Record<string, unknown> | null
  const reservations = caseData.reservations as Array<Record<string, unknown>>
  const canOrder = ["pending_appointment", "pending_order"].includes(caseData.case_status)
  const canCancel = !["completed", "cancelled"].includes(caseData.case_status)

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/cases"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{caseData.case_number}</h1>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
              {status.label}
            </span>
          </div>
        </div>
      </div>

      {/* Patient Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4" />
            ข้อมูลคนไข้
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p><span className="text-muted-foreground">ชื่อ:</span> {String(patient?.full_name ?? "")}</p>
          <p><span className="text-muted-foreground">HN:</span> {String(patient?.hn ?? "")}</p>
        </CardContent>
      </Card>

      {/* Treatment Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Stethoscope className="h-4 w-4" />
            การรักษา
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <p><span className="text-muted-foreground">แพทย์:</span> {String(dentist?.full_name ?? "-")}</p>
            <p><span className="text-muted-foreground">ผู้ช่วย:</span> {String(assistant?.full_name ?? "-")}</p>
            {caseData.procedure_type ? (
              <p><span className="text-muted-foreground">หัตถการ:</span> {String(caseData.procedure_type)}</p>
            ) : null}
            {caseData.scheduled_date ? (
              <p className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">นัด:</span>{" "}
                {formatDate(String(caseData.scheduled_date))}
                {caseData.scheduled_time ? ` ${String(caseData.scheduled_time)}` : ""}
              </p>
            ) : null}
          </div>

          {/* Tooth Positions */}
          {(caseData.tooth_positions as number[])?.length > 0 && (
            <>
              <Separator />
              <div>
                <span className="text-muted-foreground">ตำแหน่งฟัน:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(caseData.tooth_positions as number[]).map((t: number) => (
                    <Badge key={t} variant="outline">{t}</Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {caseData.notes ? (
            <>
              <Separator />
              <p><span className="text-muted-foreground">หมายเหตุ:</span> {String(caseData.notes)}</p>
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* Materials / Reservations */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">วัสดุที่สั่ง ({reservations.length})</CardTitle>
            {canOrder && (
              <Button size="sm" asChild>
                <Link href={`/shop?case_id=${id}`}>สั่งวัสดุ</Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {reservations.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              ยังไม่มีรายการวัสดุ
            </p>
          ) : (
            <div className="space-y-2">
              {reservations.map((r) => {
                const product = r.products as Record<string, unknown> | null
                const inventory = r.inventory as Record<string, unknown> | null
                const rStatus = RESERVATION_STATUS[r.status as string] ?? RESERVATION_STATUS.reserved

                return (
                  <div key={r.id as string} className="flex items-start justify-between rounded-lg border p-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{String(product?.name ?? "")}</p>
                      <p className="text-xs text-muted-foreground">
                        {String(product?.brand ?? "")} · REF: {String(product?.ref ?? "")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        จำนวน: {Number(r.quantity_reserved)} {String(product?.unit ?? "")}
                        {r.quantity_used != null ? ` (ใช้จริง: ${Number(r.quantity_used)})` : ""}
                      </p>
                      {inventory ? (
                        <p className="text-xs text-muted-foreground">
                          LOT: {String(inventory.lot_number)}
                          {inventory.expiry_date ? ` · Exp: ${formatDate(String(inventory.expiry_date))}` : ""}
                        </p>
                      ) : null}
                    </div>
                    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${rStatus.color}`}>
                      {rStatus.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons (client component) */}
      <CaseActions
        caseId={id}
        caseStatus={caseData.case_status}
        canCancel={canCancel}
        reservations={reservations.map((r) => ({
          id: r.id as string,
          status: r.status as string,
          productId: r.product_id as string,
          productName: String((r.products as Record<string, unknown>)?.name ?? ""),
          quantityReserved: Number(r.quantity_reserved),
        }))}
      />
    </div>
  )
}
