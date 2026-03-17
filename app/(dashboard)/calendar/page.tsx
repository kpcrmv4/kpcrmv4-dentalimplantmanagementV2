import { CaseCalendar } from "@/components/dashboard/case-calendar"
import { getDashboardCases } from "@/lib/actions/dashboard"

export default async function CalendarPage() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const cases = await getDashboardCases(year, month)

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div>
        <h1 className="text-xl font-semibold">ปฏิทินเคส</h1>
        <p className="text-sm text-muted-foreground">
          ดูตารางเคสรายเดือน กดวันที่เพื่อดูรายละเอียด
        </p>
      </div>

      <CaseCalendar
        initialCases={cases}
        initialYear={year}
        initialMonth={month}
      />
    </div>
  )
}
