import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Plus, ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import { CaseSearch } from "./case-search"
import type { CaseStatus } from "@/types/database"

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending_appointment: { label: "รอทำนัด", color: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400" },
  pending_order: { label: "รอสั่งของ", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400" },
  pending_preparation: { label: "รอจัดของ", color: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400" },
  ready: { label: "พร้อม", color: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" },
  completed: { label: "เสร็จสิ้น", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" },
  cancelled: { label: "ยกเลิก", color: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" },
}

async function getCases(search?: string, status?: string) {
  const supabase = await createClient()
  let query = supabase
    .from("cases")
    .select("*, patients(hn, full_name)")
    .order("created_at", { ascending: false })
    .limit(50)

  if (status && status !== "all") {
    query = query.eq("case_status", status as CaseStatus)
  }
  if (search) {
    query = query.or(`case_number.ilike.%${search}%`)
  }

  const { data, error } = await query
  if (error) return []
  return data ?? []
}

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const params = await searchParams
  const cases = await getCases(params.q, params.status)

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">รายการเคส</h1>
          <p className="text-sm text-muted-foreground">
            ทั้งหมด {cases.length} เคส
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/cases/new">
            <Plus className="mr-1 h-4 w-4" />
            สร้างเคส
          </Link>
        </Button>
      </div>

      {/* Search + Filters */}
      <CaseSearch defaultSearch={params.q} defaultStatus={params.status} />

      {/* Case List */}
      {cases.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <ClipboardList className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {params.q || params.status ? "ไม่พบเคสที่ค้นหา" : "ยังไม่มีเคส"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {cases.map((c: Record<string, unknown>) => {
            const patient = c.patients as Record<string, string> | null
            const status = STATUS_CONFIG[c.case_status as string] ?? STATUS_CONFIG.pending_appointment

            return (
              <Link key={c.id as string} href={`/cases/${c.id}`}>
                <Card className="transition-colors hover:bg-muted/50">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{c.case_number as string}</p>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {String(patient?.full_name ?? "ไม่ระบุคนไข้")} ({String(patient?.hn ?? "-")})
                        </p>
                        {c.scheduled_date ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            นัด: {formatDate(String(c.scheduled_date))}
                          </p>
                        ) : null}
                      </div>
                      {(c.tooth_positions as number[])?.length > 0 && (
                        <div className="flex flex-wrap gap-0.5">
                          {(c.tooth_positions as number[]).slice(0, 4).map((t) => (
                            <Badge key={t} variant="outline" className="text-[10px]">
                              {t}
                            </Badge>
                          ))}
                          {(c.tooth_positions as number[]).length > 4 && (
                            <Badge variant="outline" className="text-[10px]">
                              +{(c.tooth_positions as number[]).length - 4}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
