import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { getEmergencyAlerts } from "@/lib/actions/dashboard"

export async function EmergencyBanner() {
  const alerts = await getEmergencyAlerts()

  if (alerts.length === 0) return null

  return (
    <div className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-500/40 dark:bg-red-500/10">
      <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <span className="text-sm font-semibold">
          เคสภายใน 48 ชม. ที่ยังไม่พร้อม: {alerts.length} เคส
        </span>
      </div>
      <ul className="mt-2 space-y-1 pl-7">
        {alerts.map((c) => (
          <li key={c.id}>
            <Link
              href={`/cases/${c.id}`}
              className="text-sm text-red-600 underline-offset-2 hover:underline dark:text-red-400"
            >
              {c.case_number} — {c.patient_name} ({c.scheduled_date})
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
