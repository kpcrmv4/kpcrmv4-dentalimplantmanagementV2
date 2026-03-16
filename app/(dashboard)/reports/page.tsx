import { Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getDashboardReport, getCaseStatusDistribution, getTopProducts } from "@/lib/actions/reports"
import { formatNumber } from "@/lib/utils"
import { ReportsTabs } from "@/components/reports/reports-tabs"

const STATUS_LABELS: Record<string, string> = {
  pending_order: "รอสั่งของ",
  pending_preparation: "รอจัดของ",
  ready: "พร้อม",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
}

async function ReportContent() {
  const [stats, statusDist, topProducts] = await Promise.all([
    getDashboardReport(),
    getCaseStatusDistribution(),
    getTopProducts(),
  ])

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">เคสทั้งหมด</p>
            <p className="text-2xl font-bold">{formatNumber(stats.casesTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">เคสที่กำลังดำเนินการ</p>
            <p className="text-2xl font-bold">{formatNumber(stats.casesActive)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">เคสวันนี้</p>
            <p className="text-2xl font-bold">{formatNumber(stats.casesToday)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">สินค้าทั้งหมด</p>
            <p className="text-2xl font-bold">{formatNumber(stats.productsTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">PO ทั้งหมด</p>
            <p className="text-2xl font-bold">{formatNumber(stats.poTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">PO รออนุมัติ</p>
            <p className="text-2xl font-bold">{formatNumber(stats.poPending)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Case Status Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">สถานะเคส</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(statusDist).length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(statusDist).map(([status, count]) => {
                const total = Object.values(statusDist).reduce((a, b) => a + b, 0)
                const pct = total > 0 ? Math.round((count / total) * 100) : 0
                return (
                  <div key={status} className="flex items-center gap-2">
                    <span className="w-20 text-xs text-muted-foreground truncate">
                      {STATUS_LABELS[status] ?? status}
                    </span>
                    <div className="flex-1">
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-12 text-right text-xs font-medium">{count} ({pct}%)</span>
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
          <CardTitle className="text-sm">วัสดุที่ใช้มากที่สุด</CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
          ) : (
            <div className="space-y-2">
              {topProducts.map((p, i) => (
                <div key={p.ref} className="flex items-center justify-between rounded-lg border p-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">REF: {p.ref}</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium">{formatNumber(p.total)}</span>
                </div>
              ))}
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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-3">
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-7 w-12 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default function ReportsPage() {
  return (
    <div className="space-y-4 p-4 lg:p-6">
      <h1 className="text-xl font-semibold">รายงาน</h1>
      <ReportsTabs
        overviewContent={
          <Suspense fallback={<ReportSkeleton />}>
            <ReportContent />
          </Suspense>
        }
      />
    </div>
  )
}
