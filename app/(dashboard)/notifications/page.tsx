import { Bell } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { getNotifications } from "@/lib/actions/notifications"
import { formatDate } from "@/lib/utils"
import { MarkAllReadButton } from "./mark-all-read-button"

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  case_assigned: { icon: "📋", color: "bg-blue-50 dark:bg-blue-500/10" },
  po_created: { icon: "📦", color: "bg-purple-50 dark:bg-purple-500/10" },
  po_approved: { icon: "✅", color: "bg-green-50 dark:bg-green-500/10" },
  out_of_stock: { icon: "🚨", color: "bg-red-50 dark:bg-red-500/10" },
  low_stock: { icon: "⚠️", color: "bg-orange-50 dark:bg-orange-500/10" },
  expiring_soon: { icon: "⏰", color: "bg-yellow-50 dark:bg-yellow-500/10" },
  material_prepared: { icon: "🔧", color: "bg-teal-50 dark:bg-teal-500/10" },
  material_lock_request: { icon: "🔒", color: "bg-amber-50 dark:bg-amber-500/10" },
  system: { icon: "🔔", color: "bg-gray-50 dark:bg-gray-500/10" },
}

export default async function NotificationsPage() {
  const notifications = await getNotifications()
  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">แจ้งเตือน</h1>
          {unreadCount > 0 ? (
            <p className="text-xs text-muted-foreground">{unreadCount} รายการยังไม่อ่าน</p>
          ) : null}
        </div>
        {unreadCount > 0 ? <MarkAllReadButton /> : null}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Bell className="mb-2 h-10 w-10" />
          <p className="text-sm">ไม่มีการแจ้งเตือน</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const type = TYPE_CONFIG[notif.type as string] ?? TYPE_CONFIG.system
            const isRead = notif.is_read as boolean

            return (
              <Card key={notif.id as string} className={isRead ? "opacity-60" : ""}>
                <CardContent className={`flex items-start gap-3 p-3 ${!isRead ? type.color : ""}`}>
                  <span className="mt-0.5 text-lg">{type.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm leading-tight ${!isRead ? "font-medium" : ""}`}>
                        {String(notif.title)}
                      </p>
                      {!isRead ? (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                      {String(notif.message)}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {formatDate(String(notif.created_at))}
                    </p>
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
