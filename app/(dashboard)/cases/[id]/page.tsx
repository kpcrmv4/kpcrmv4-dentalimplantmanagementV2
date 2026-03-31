import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Calendar, User, Package, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { getCaseById } from "@/lib/actions/cases"
import { getCurrentUser } from "@/lib/actions/auth"
import { formatDate } from "@/lib/utils"
import { CaseActions } from "./case-actions"
import { CaseMaterialsEditor } from "./case-materials-editor"
import { AppointmentActions } from "./appointment-actions"
import { AppointmentTimeline } from "./appointment-timeline"

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending_order: { label: "รอสั่งของ", color: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" },
  pending_preparation: { label: "รอจัดของ", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400" },
  ready: { label: "พร้อม", color: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" },
  completed: { label: "เสร็จสิ้น", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" },
  cancelled: { label: "ยกเลิก", color: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" },
}

const APPT_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "รอทำนัด", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400" },
  confirmed: { label: "นัดแล้ว", color: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" },
  cancelled: { label: "ยกเลิกนัด", color: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" },
}

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [caseResult, currentUser] = await Promise.all([
    getCaseById(id).catch(() => null),
    getCurrentUser(),
  ])

  if (!caseResult) notFound()
  const caseData = caseResult

  const userRole = currentUser?.role ?? "assistant"
  const isDentist = userRole === "dentist"

  const status = STATUS_CONFIG[caseData.case_status] ?? STATUS_CONFIG.pending_order
  const patient = caseData.patients as Record<string, unknown> | null
  const dentist = caseData.dentist as Record<string, unknown> | null
  const assistant = caseData.assistant as Record<string, unknown> | null
  const reservations = caseData.reservations as Array<Record<string, unknown>>
  const canCancel = !isDentist && !["completed", "cancelled"].includes(caseData.case_status)
  const isActive = !["completed", "cancelled"].includes(caseData.case_status)

  return (
    <div className="mx-auto max-w-lg space-y-3 p-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="shrink-0" asChild>
          <Link href="/cases"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-semibold truncate">{caseData.case_number}</h1>
            <span className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${status.color}`}>
              <Package className="h-2.5 w-2.5" />
              {status.label}
            </span>
            {(() => {
              const apptStatus = caseData.case_status === "completed" ? "completed" : (caseData as Record<string, unknown>).appointment_status as string
              const appt = apptStatus === "completed"
                ? { label: "เสร็จเคสแล้ว", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" }
                : APPT_STATUS[apptStatus]
              return appt ? (
                <span className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${appt.color}`}>
                  <Phone className="h-2.5 w-2.5" />
                  {appt.label}
                </span>
              ) : null
            })()}
          </div>
        </div>
      </div>

      {/* Patient + Treatment combined card */}
      <div className="rounded-xl border bg-card p-3 space-y-2.5">
        <div className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{String(patient?.full_name ?? "")}</span>
          <span className="text-xs text-muted-foreground">HN: {String(patient?.hn ?? "")}</span>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">แพทย์</span>
            <p className="text-sm font-medium leading-tight">{String(dentist?.full_name ?? "-")}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">ผู้ช่วย</span>
            <p className="text-sm font-medium leading-tight">{String(assistant?.full_name ?? "-")}</p>
          </div>
          {caseData.procedure_type && (
            <div>
              <span className="text-xs text-muted-foreground">หัตถการ</span>
              <p className="text-sm font-medium leading-tight">{String(caseData.procedure_type)}</p>
            </div>
          )}
          {caseData.scheduled_date && (
            <div>
              <span className="text-xs text-muted-foreground">วันนัด</span>
              <p className="flex items-center gap-1 text-sm font-medium leading-tight">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                {formatDate(String(caseData.scheduled_date))}
                {caseData.scheduled_time ? ` ${String(caseData.scheduled_time).slice(0, 5)}` : ""}
              </p>
            </div>
          )}
        </div>

        {(caseData.tooth_positions as number[])?.length > 0 && (
          <>
            <Separator />
            <div>
              <span className="text-xs text-muted-foreground">ตำแหน่งฟัน</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {(caseData.tooth_positions as number[]).map((t: number) => (
                  <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {caseData.notes && (
          <>
            <Separator />
            <div>
              <span className="text-xs text-muted-foreground">หมายเหตุ</span>
              <p className="text-sm">{String(caseData.notes)}</p>
            </div>
          </>
        )}
      </div>

      {/* Appointment Confirmation - hidden for dentists */}
      {!isDentist && (
        <AppointmentActions
          caseId={id}
          appointmentStatus={(caseData as Record<string, unknown>).appointment_status as string ?? "pending"}
          caseStatus={caseData.case_status}
        />
      )}

      {/* Appointment Timeline - hidden for dentists */}
      {!isDentist && <AppointmentTimeline caseId={id} />}

      {/* Materials / Reservations (editable) */}
      <CaseMaterialsEditor
        caseId={id}
        caseStatus={caseData.case_status}
        reservations={reservations.map((r) => {
          const product = r.products as Record<string, unknown> | null
          const inventory = r.inventory as Record<string, unknown> | null
          return {
            id: r.id as string,
            status: r.status as string,
            productId: r.product_id as string,
            productName: String(product?.name ?? ""),
            productBrand: String(product?.brand ?? ""),
            productRef: String(product?.ref ?? ""),
            productUnit: String(product?.unit ?? "ชิ้น"),
            quantityReserved: Number(r.quantity_reserved),
            lotNumber: inventory ? String(inventory.lot_number) : null,
            expiryDate: inventory?.expiry_date ? String(inventory.expiry_date) : null,
          }
        })}
      />

      {/* Action Sections (client component) - hidden for dentists */}
      {isActive && !isDentist && (
        <CaseActions
          caseId={id}
          caseStatus={caseData.case_status}
          canCancel={canCancel}
          reservations={reservations.map((r) => {
            const product = r.products as Record<string, unknown> | null
            const inventory = r.inventory as Record<string, unknown> | null
            return {
              id: r.id as string,
              status: r.status as string,
              productId: r.product_id as string,
              productName: String(product?.name ?? ""),
              productBrand: String(product?.brand ?? ""),
              productRef: String(product?.ref ?? ""),
              productUnit: String(product?.unit ?? "ชิ้น"),
              quantityReserved: Number(r.quantity_reserved),
              quantityUsed: r.quantity_used != null ? Number(r.quantity_used) : null,
              inventoryId: (r.inventory_id as string) ?? null,
              lotNumber: inventory ? String(inventory.lot_number) : null,
              photoUrl: (r.photo_url as string) ?? null,
            }
          })}
        />
      )}
    </div>
  )
}
