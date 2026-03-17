import { AlertTriangle, CheckCircle2, Package } from "lucide-react"
import { getPreparationCases } from "@/lib/actions/preparation"
import { PreparationList } from "./preparation-list"

export default async function PreparationPage() {
  const { pending, ready, urgentCount } = await getPreparationCases()

  const pendingCount = pending.length
  const readyCount = ready.length

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">จัดเตรียมวัสดุ</h1>
        <p className="text-sm text-muted-foreground">
          เตรียมของและ assign LOT สำหรับเคสที่ได้รับมอบหมาย
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border bg-card p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="text-lg font-bold">{urgentCount}</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">ด่วน</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-orange-600 dark:text-orange-400">
            <Package className="h-3.5 w-3.5" />
            <span className="text-lg font-bold">{pendingCount}</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">รอจัดของ</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="text-lg font-bold">{readyCount}</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">พร้อมแล้ว</p>
        </div>
      </div>

      {/* Preparation List */}
      <PreparationList pending={pending} ready={ready} />
    </div>
  )
}
