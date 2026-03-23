import { Suspense } from "react"
import { AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { TrafficLightStats } from "@/components/dashboard/traffic-light-stats"
import { CaseCalendar } from "@/components/dashboard/case-calendar"
import { UnreadyCasesPanel } from "@/components/dashboard/unready-cases-panel"
import { LowStockPanel } from "@/components/dashboard/low-stock-panel"
import { EmergencyBanner } from "@/components/dashboard/emergency-banner"
import { EmergencyModal } from "@/components/dashboard/emergency-modal"
import { getDashboardCases } from "@/lib/actions/dashboard"
import { getEmergencyAlerts } from "@/lib/actions/dashboard"
import { getCurrentUser } from "@/lib/actions/auth"

function StatsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl border bg-muted" />
        ))}
      </div>
      <div className="h-14 animate-pulse rounded-xl border bg-muted" />
    </div>
  )
}

function CalendarSkeleton() {
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_300px]">
      <div className="h-80 animate-pulse rounded-xl border bg-muted" />
      <div className="h-60 animate-pulse rounded-xl border bg-muted" />
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

async function getDentistId() {
  const user = await getCurrentUser()
  if (user?.role === "dentist") return user.id
  return undefined
}

async function CalendarSection() {
  const dentistId = await getDentistId()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const cases = await getDashboardCases(year, month, dentistId)

  return (
    <CaseCalendar
      initialCases={cases}
      initialYear={year}
      initialMonth={month}
      dentistId={dentistId}
    />
  )
}

async function EmergencySection() {
  const dentistId = await getDentistId()
  const alerts = await getEmergencyAlerts(dentistId)
  return (
    <>
      <EmergencyBanner dentistId={dentistId} />
      <EmergencyModal alerts={alerts} />
    </>
  )
}

export default async function DashboardPage() {
  const dentistId = await getDentistId()

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">แดชบอร์ด</h1>
        <p className="text-xs text-muted-foreground">
          {dentistId ? "ภาพรวมเคสของคุณ" : "ภาพรวมระบบจัดการสต็อกวัสดุและรากฟันเทียม"}
        </p>
      </div>

      {/* Emergency Banner + Modal */}
      <Suspense fallback={null}>
        <EmergencySection />
      </Suspense>

      {/* Case Summary + Material Readiness Stats */}
      <Suspense fallback={<StatsSkeleton />}>
        <TrafficLightStats dentistId={dentistId} />
      </Suspense>

      {/* Calendar */}
      <Suspense fallback={<CalendarSkeleton />}>
        <CalendarSection />
      </Suspense>

      {/* Action Panels */}
      <div>
        <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5" />
          รายการที่ต้องดำเนินการ
        </h2>
        <div className={dentistId ? "" : "grid gap-4 lg:grid-cols-2"}>
          <Suspense fallback={<PanelSkeleton />}>
            <UnreadyCasesPanel dentistId={dentistId} />
          </Suspense>
          {!dentistId && (
            <Suspense fallback={<PanelSkeleton />}>
              <LowStockPanel />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  )
}
