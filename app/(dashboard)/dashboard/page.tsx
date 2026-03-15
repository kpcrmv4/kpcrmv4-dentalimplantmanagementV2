import { Suspense } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { TrafficLightStats } from "@/components/dashboard/traffic-light-stats"
import { CaseCalendar } from "@/components/dashboard/case-calendar"
import { UnreadyCasesPanel } from "@/components/dashboard/unready-cases-panel"
import { LowStockPanel } from "@/components/dashboard/low-stock-panel"
import { EmergencyBanner } from "@/components/dashboard/emergency-banner"
import { getDashboardCases } from "@/lib/actions/dashboard"

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {[...Array(5)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-12 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function CalendarSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader className="pb-2">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="h-64 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="h-48 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    </div>
  )
}

function PanelSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

async function CalendarSection() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const cases = await getDashboardCases(year, month)

  return (
    <CaseCalendar
      initialCases={cases}
      initialYear={year}
      initialMonth={month}
    />
  )
}

export default function DashboardPage() {
  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div>
        <h1 className="text-xl font-semibold">แดชบอร์ด</h1>
        <p className="text-sm text-muted-foreground">
          ภาพรวมระบบจัดการสต็อกวัสดุและรากฟันเทียม
        </p>
      </div>

      <Suspense fallback={null}>
        <EmergencyBanner />
      </Suspense>

      <Suspense fallback={<StatsSkeleton />}>
        <TrafficLightStats />
      </Suspense>

      <Suspense fallback={<CalendarSkeleton />}>
        <CalendarSection />
      </Suspense>

      <div className="grid gap-4 lg:grid-cols-2">
        <Suspense fallback={<PanelSkeleton />}>
          <UnreadyCasesPanel />
        </Suspense>
        <Suspense fallback={<PanelSkeleton />}>
          <LowStockPanel />
        </Suspense>
      </div>
    </div>
  )
}
