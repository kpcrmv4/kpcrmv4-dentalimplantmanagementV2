import {
  ClipboardList,
  CheckCircle2,
  Clock,
  Package,
  AlertTriangle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getDashboardCases } from "@/lib/actions/dashboard"

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: number
  icon: React.ElementType
  color: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}

export async function TrafficLightStats() {
  const now = new Date()
  const cases = await getDashboardCases(now.getFullYear(), now.getMonth() + 1)

  const total = cases.length
  const ready = cases.filter((c) => c.trafficLight === "green").length
  const ordered = cases.filter((c) => c.trafficLight === "yellow").length
  const waiting = cases.filter((c) => c.trafficLight === "orange").length
  const missing = cases.filter((c) => c.trafficLight === "red").length

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <StatCard
        title="เคสเดือนนี้"
        value={total}
        icon={ClipboardList}
        color="bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
      />
      <StatCard
        title="พร้อม"
        value={ready}
        icon={CheckCircle2}
        color="bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400"
      />
      <StatCard
        title="สั่งแล้ว"
        value={ordered}
        icon={Package}
        color="bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400"
      />
      <StatCard
        title="รอของ"
        value={waiting}
        icon={Clock}
        color="bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400"
      />
      <StatCard
        title="ขาด"
        value={missing}
        icon={AlertTriangle}
        color="bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400"
      />
    </div>
  )
}
