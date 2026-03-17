import { createClient } from "@/lib/supabase/server"
import { CaseCalendar } from "@/components/dashboard/case-calendar"
import { getDashboardCases } from "@/lib/actions/dashboard"
import type { UserRole } from "@/types/database"

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", authUser!.id)
    .single()

  const role = (userData?.role ?? "assistant") as UserRole
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const cases = await getDashboardCases(year, month)

  const roleLabels: Record<string, { title: string; subtitle: string }> = {
    cs: { title: "ปฏิทินนัดหมาย", subtitle: "จัดการนัดหมายและยืนยันคนไข้" },
    assistant: { title: "ปฏิทินเคส", subtitle: "ดูตารางเคสและสถานะการเตรียมวัสดุ" },
  }
  const labels = roleLabels[role] ?? { title: "ปฏิทินเคส", subtitle: "ดูตารางเคสรายเดือน กดวันที่เพื่อดูรายละเอียด" }

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div>
        <h1 className="text-xl font-semibold">{labels.title}</h1>
        <p className="text-sm text-muted-foreground">{labels.subtitle}</p>
      </div>

      <CaseCalendar
        initialCases={cases}
        initialYear={year}
        initialMonth={month}
        role={role}
      />
    </div>
  )
}
