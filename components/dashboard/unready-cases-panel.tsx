import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getUnreadyCases } from "@/lib/actions/dashboard"
import { formatDate } from "@/lib/utils"
import { cn } from "@/lib/utils"

const STATUS_LABELS: Record<string, string> = {
  pending_appointment: "รอทำนัด",
  pending_order: "รอสั่งของ",
  pending_preparation: "รอจัดของ",
  case_assigned: "มอบหมายแล้ว",
  po_created: "สร้าง PO แล้ว",
  po_approved: "PO อนุมัติ",
}

const TRAFFIC_DOT: Record<string, string> = {
  red: "bg-red-500",
  orange: "bg-orange-500",
}

export async function UnreadyCasesPanel() {
  const cases = await getUnreadyCases()

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          เคสที่วัสดุยังไม่พร้อม
        </CardTitle>
      </CardHeader>
      <CardContent>
        {cases.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            ไม่มีเคสที่ต้องดำเนินการ
          </p>
        ) : (
          <div className="space-y-1.5">
            {cases.map((c) => (
              <Link key={c.id} href={`/cases/${c.id}`}>
                <div className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50">
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      TRAFFIC_DOT[c.trafficLight] ?? "bg-gray-400"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium">{c.case_number}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {STATUS_LABELS[c.case_status] ?? c.case_status}
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {c.patient_name} &middot;{" "}
                      {c.scheduled_date ? formatDate(c.scheduled_date) : "ไม่ระบุวัน"}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
