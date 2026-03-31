import { Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getDashboardReport, getCaseStatusDistribution, getTopProducts } from "@/lib/actions/reports"
import { formatNumber } from "@/lib/utils"
import { ReportsTabs } from "@/components/reports/reports-tabs"
import { ReportDateFilter } from "@/components/reports/report-date-filter"
import { cn } from "@/lib/utils"
import {
  ClipboardList,
  Settings,
  CalendarCheck,
  Package,
  FileText,
  Clock,
  TrendingUp,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { startOfMonth, endOfMonth, format } from "date-fns"

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending_order: { label: "รอสั่งของ", color: "bg-red-500" },
  pending_preparation: { label: "รอจัดของ", color: "bg-yellow-500" },
  ready: { label: "พร้อม", color: "bg-green-500" },
  completed: { label: "เสร็จสิ้น", color: "bg-blue-500" },
  cancelled: { label: "ยกเลิก", color: "bg-red-500" },
}

const STAT_STYLES: Record<
  string,
  { border: string; bg: string; text: string; label: string; icon: string }
> = {
  blue: {
    border: "border-blue-200 dark:border-blue-500/30",
    bg: "bg-blue-50/50 dark:bg-blue-500/10",
    text: "text-blue-700 dark:text-blue-400",
    label: "text-blue-600/80 dark:text-blue-400/80",
    icon: "text-blue-200 dark:text-blue-500/20",
  },
  indigo: {
    border: "border-indigo-200 dark:border-indigo-500/30",
    bg: "bg-indigo-50/50 dark:bg-indigo-500/10",
    text: "text-indigo-700 dark:text-indigo-400",
    label: "text-indigo-600/80 dark:text-indigo-400/80",
    icon: "text-indigo-200 dark:text-indigo-500/20",
  },
  emerald: {
    border: "border-emerald-200 dark:border-emerald-500/30",
    bg: "bg-emerald-50/50 dark:bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-400",
    label: "text-emerald-600/80 dark:text-emerald-400/80",
    icon: "text-emerald-200 dark:text-emerald-500/20",
  },
  amber: {
    border: "border-amber-200 dark:border-amber-500/30",
    bg: "bg-amber-50/50 dark:bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-400",
    label: "text-amber-600/80 dark:text-amber-400/80",
    icon: "text-amber-200 dark:text-amber-500/20",
  },
  violet: {
    border: "border-violet-200 dark:border-violet-500/30",
    bg: "bg-violet-50/50 dark:bg-violet-500/10",
    text: "text-violet-700 dark:text-violet-400",
    label: "text-violet-600/80 dark:text-violet-400/80",
    icon: "text-violet-200 dark:text-violet-500/20",
  },
  rose: {
    border: "border-rose-200 dark:border-rose-500/30",
    bg: "bg-rose-50/50 dark:bg-rose-500/10",
    text: "text-rose-700 dark:text-rose-400",
    label: "text-rose-600/80 dark:text-rose-400/80",
    icon: "text-rose-200 dark:text-rose-500/20",
  },
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number
  icon: LucideIcon
  color: keyof typeof STAT_STYLES
}) {
  const s = STAT_STYLES[color]
  return (
    <Card className={cn(s.border, s.bg, "relative overflow-hidden")}>
      <CardContent className="relative flex flex-col items-center py-3">
        <Icon
          className={cn(
            "absolute right-1 top-1 h-3.5 w-3.5 pointer-events-none",
            s.icon
          )}
          strokeWidth={2}
        />
        <span className={cn("relative text-2xl font-bold", s.text)}>
          {formatNumber(value)}
        </span>
        <span
          className={cn(
            "relative mt-0.5 text-[10px] font-medium leading-tight text-center",
            s.label
          )}
        >
          {label}
        </span>
      </CardContent>
    </Card>
  )
}

async function ReportContent({ from, to }: { from?: string; to?: string }) {
  const [stats, statusDist, topProducts] = await Promise.all([
    getDashboardReport(),
    getCaseStatusDistribution(from, to),
    getTopProducts(from, to),
  ])

  const total = Object.values(statusDist).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">
        <StatCard label="เคสทั้งหมด" value={stats.casesTotal} icon={ClipboardList} color="blue" />
        <StatCard label="กำลังดำเนินการ" value={stats.casesActive} icon={Settings} color="indigo" />
        <StatCard label="เคสวันนี้" value={stats.casesToday} icon={CalendarCheck} color="emerald" />
        <StatCard label="สินค้าทั้งหมด" value={stats.productsTotal} icon={Package} color="amber" />
        <StatCard label="PO ทั้งหมด" value={stats.poTotal} icon={FileText} color="violet" />
        <StatCard label="PO รออนุมัติ" value={stats.poPending} icon={Clock} color="rose" />
      </div>

      {/* Case Status Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            การกระจายสถานะเคส
          </CardTitle>
        </CardHeader>
        <CardContent>
          {total === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
          ) : (
            <div className="space-y-2.5">
              {Object.entries(statusDist).map(([status, count]) => {
                const pct = total > 0 ? Math.round((count / total) * 100) : 0
                const config = STATUS_LABELS[status]
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("h-2 w-2 rounded-full", config?.color ?? "bg-gray-400")} />
                        <span className="text-xs font-medium">
                          {config?.label ?? status}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatNumber(count)} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", config?.color ?? "bg-gray-400")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Products */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            วัสดุที่ใช้มากที่สุด (Top 10)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
          ) : (
            <div className="space-y-2">
              {topProducts.map((p, i) => {
                const maxVal = topProducts[0].total
                const pct = maxVal > 0 ? Math.round((p.total / maxVal) * 100) : 0
                return (
                  <div key={p.ref} className="rounded-lg border p-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground">REF: {p.ref}</p>
                        </div>
                      </div>
                      <span className="shrink-0 text-sm font-bold tabular-nums ml-2">
                        {formatNumber(p.total)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/40 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ReportSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex flex-col items-center py-3">
              <div className="h-7 w-10 animate-pulse rounded bg-muted" />
              <div className="mt-1 h-3 w-14 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-6 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>
}) {
  const params = await searchParams
  const period = params.period || "month"

  let from: string | undefined
  let to: string | undefined

  if (period === "month") {
    const now = new Date()
    from = format(startOfMonth(now), "yyyy-MM-dd")
    to = format(endOfMonth(now), "yyyy-MM-dd")
  } else if (period === "custom" && params.from && params.to) {
    from = params.from
    to = params.to
  }
  // period === "all" → no date filters

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <h1 className="text-xl font-semibold">รายงาน</h1>
      <ReportsTabs
        overviewContent={
          <>
            <ReportDateFilter
              currentPeriod={period}
              currentFrom={params.from}
              currentTo={params.to}
            />
            <Suspense fallback={<ReportSkeleton />}>
              <ReportContent from={from} to={to} />
            </Suspense>
          </>
        }
      />
    </div>
  )
}
