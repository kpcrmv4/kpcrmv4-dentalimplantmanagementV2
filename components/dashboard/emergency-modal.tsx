"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, Clock, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { EmergencyAlert } from "@/lib/actions/dashboard"

const STATUS_LABELS: Record<string, string> = {
  pending_order: "รอสั่งของ",
  pending_preparation: "รอจัดของ",
  pending_appointment: "รอนัด",
}

/**
 * Builds a fingerprint from alert IDs to detect new cases.
 * If the fingerprint matches what's stored in sessionStorage, the modal won't show again.
 */
function buildFingerprint(alerts: EmergencyAlert[]): string {
  return alerts.map((a) => a.id).sort().join(",")
}

export function EmergencyModal({ alerts }: { alerts: EmergencyAlert[] }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (alerts.length === 0) return

    const fingerprint = buildFingerprint(alerts)
    const storageKey = "emergency_modal_dismissed"
    const dismissed = sessionStorage.getItem(storageKey)

    // Only show if there are new cases (different fingerprint)
    if (dismissed !== fingerprint) {
      setOpen(true)
    }
  }, [alerts])

  function handleDismiss() {
    const fingerprint = buildFingerprint(alerts)
    sessionStorage.setItem("emergency_modal_dismissed", fingerprint)
    setOpen(false)
  }

  if (!open || alerts.length === 0) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in-0"
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-[10%] z-50 mx-auto max-w-lg animate-in fade-in-0 zoom-in-95 slide-in-from-top-4 duration-300 sm:inset-x-auto">
        <div className="rounded-2xl border-2 border-red-300 bg-white shadow-2xl dark:border-red-500/50 dark:bg-gray-900">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-red-200 bg-red-50 px-5 py-4 dark:border-red-500/30 dark:bg-red-500/10 rounded-t-2xl">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-red-800 dark:text-red-300">
                  เคสด่วนภายใน 48 ชม.
                </h2>
                <p className="text-[11px] text-red-600/80 dark:text-red-400/80">
                  วัสดุยังไม่พร้อม {alerts.length} เคส
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-red-500 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-500/20"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Body */}
          <div className="max-h-[50vh] overflow-y-auto p-4">
            <div className="space-y-2">
              {alerts.map((c) => {
                const timeLabel = c.scheduled_time
                  ? `${c.scheduled_date} ${c.scheduled_time.slice(0, 5)}`
                  : c.scheduled_date ?? ""

                return (
                  <Link
                    key={c.id}
                    href={`/cases/${c.id}`}
                    onClick={handleDismiss}
                    className="flex items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50/50 p-3 transition-colors hover:bg-red-100/80 dark:border-red-500/20 dark:bg-red-500/5 dark:hover:bg-red-500/10"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-red-700 dark:text-red-400">
                          {c.case_number}
                        </span>
                        <Badge
                          variant="outline"
                          className="border-red-200 bg-red-100 px-1.5 py-0 text-[9px] font-medium text-red-600 dark:border-red-500/30 dark:bg-red-500/20 dark:text-red-400"
                        >
                          {STATUS_LABELS[c.case_status] ?? c.case_status}
                        </Badge>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-red-600/80 dark:text-red-300/80">
                        {c.patient_name}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 text-[10px] text-red-500 dark:text-red-400">
                      <Clock className="h-3 w-3" />
                      {timeLabel}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-red-100 px-5 py-3 dark:border-red-500/20">
            <Button
              onClick={handleDismiss}
              className="w-full rounded-xl bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
              size="sm"
            >
              รับทราบ
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
