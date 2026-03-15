import { Shield, Search as SearchIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { getAuditLogs } from "@/lib/actions/audit"
import { formatDateTime } from "@/lib/utils"
import { AuditLogSearch } from "./audit-log-search"

const ACTION_COLORS: Record<string, string> = {
  INSERT: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
  UPDATE: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
}

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string; action?: string; q?: string }>
}) {
  const params = await searchParams
  const logs = await getAuditLogs({
    table_name: params.table,
    action: params.action,
    search: params.q,
  })

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">Audit Logs</h1>
      </div>

      <AuditLogSearch
        defaultSearch={params.q ?? ""}
        currentTable={params.table ?? ""}
        currentAction={params.action ?? ""}
      />

      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <SearchIcon className="mb-2 h-10 w-10" />
          <p className="text-sm">ไม่พบ Audit Log</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const actionColor = ACTION_COLORS[String(log.action)] ?? "bg-gray-100 text-gray-700"
            const performer = log.performer as unknown as { full_name: string } | null

            return (
              <Card key={log.id as string}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono font-medium ${actionColor}`}>
                          {String(log.action)}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground font-mono">
                          {String(log.table_name)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground truncate">
                        ID: {String(log.record_id)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        โดย {performer?.full_name ?? "ระบบ"} · {formatDateTime(String(log.performed_at))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
