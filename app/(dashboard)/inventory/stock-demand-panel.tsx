import Link from "next/link"
import { AlertTriangle, Clock, ExternalLink, Package } from "lucide-react"
import { getStockDemands } from "@/lib/actions/inventory"
import { formatDate } from "@/lib/utils"

export async function StockDemandPanel() {
  const demands = await getStockDemands()

  if (demands.length === 0) return null

  const urgentCount = demands.filter((d) => d.cases.some((c) => c.isUrgent)).length
  const totalProducts = demands.length

  return (
    <div className="space-y-2">
      {/* Urgent banner */}
      {urgentCount > 0 && (
        <div className="rounded-xl border-2 border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <h2 className="text-sm font-bold text-red-700 dark:text-red-400">
              ด่วน — เคสภายใน 48 ชม. ที่ของขาด: {urgentCount} สินค้า
            </h2>
          </div>
          <div className="space-y-2">
            {demands
              .filter((d) => d.cases.some((c) => c.isUrgent))
              .map((d) => (
                <DemandCard key={d.productId} demand={d} urgentOnly />
              ))}
          </div>
        </div>
      )}

      {/* All demands */}
      <div className="rounded-xl border bg-card p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-red-500" />
            <h2 className="text-sm font-semibold">
              สินค้าที่ต้องสั่ง ({totalProducts})
            </h2>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mb-3">
          สินค้าที่มีเคสต้องการใช้แต่สต๊อกไม่พอ
        </p>
        <div className="space-y-2">
          {demands.map((d) => (
            <DemandCard key={d.productId} demand={d} />
          ))}
        </div>
      </div>
    </div>
  )
}

function DemandCard({
  demand,
  urgentOnly,
}: {
  demand: Awaited<ReturnType<typeof getStockDemands>>[number]
  urgentOnly?: boolean
}) {
  const cases = urgentOnly
    ? demand.cases.filter((c) => c.isUrgent)
    : demand.cases
  const hasUrgent = demand.cases.some((c) => c.isUrgent)
  const shortage = Math.max(0, demand.totalNeeded - Math.max(0, demand.totalAvailable))

  return (
    <div
      className={`rounded-lg border p-2.5 ${
        hasUrgent && !urgentOnly
          ? "border-red-200 dark:border-red-500/30 bg-red-50/50 dark:bg-red-500/5"
          : ""
      }`}
    >
      {/* Product header */}
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/inventory/products/${demand.productId}`}
          className="min-w-0 flex-1 group"
        >
          <div className="flex items-center gap-1">
            <p className="text-sm font-semibold leading-tight group-hover:text-primary transition-colors">
              {demand.productName}
            </p>
            <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {demand.productBrand ?? ""} · REF: {demand.productRef}
          </p>
        </Link>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-red-600 dark:text-red-400">
            ขาด {shortage} {demand.productUnit}
          </p>
          <p className="text-[10px] text-muted-foreground">
            ต้องการ {demand.totalNeeded} · มี {Math.max(0, demand.totalAvailable)}
          </p>
        </div>
      </div>

      {/* Case list */}
      <div className="mt-2 space-y-1">
        {cases.map((c) => (
          <Link
            key={c.caseId}
            href={`/cases/${c.caseId}`}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] hover:bg-muted/50 transition-colors"
          >
            {c.isUrgent && (
              <Clock className="h-3 w-3 shrink-0 text-red-500" />
            )}
            <span className="font-medium">{c.caseNumber}</span>
            <span className="text-muted-foreground truncate">{c.patientName}</span>
            <span className="ml-auto shrink-0 text-muted-foreground">
              {c.quantityNeeded} {demand.productUnit}
            </span>
            {c.scheduledDate && (
              <span
                className={`shrink-0 ${
                  c.isUrgent
                    ? "font-medium text-red-600 dark:text-red-400"
                    : "text-muted-foreground"
                }`}
              >
                {formatDate(c.scheduledDate)}
                {c.scheduledTime ? ` ${c.scheduledTime.slice(0, 5)}` : ""}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
