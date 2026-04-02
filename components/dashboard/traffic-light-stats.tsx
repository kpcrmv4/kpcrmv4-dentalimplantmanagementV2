import Link from "next/link"
import {
  Phone,
  ShoppingCart,
  PackageOpen,
  Truck,
} from "lucide-react"
import { getDashboardCases } from "@/lib/actions/dashboard"

export async function TrafficLightStats({ dentistId }: { dentistId?: string } = {}) {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }))
  const cases = await getDashboardCases(now.getFullYear(), now.getMonth() + 1, dentistId)

  const activeCases = cases.filter((c) => c.case_status !== "completed")

  // Appointment
  const pendingAppt = activeCases.filter(
    (c) => c.appointment_status === "pending"
  ).length

  // Inventory: split pending_order into 2 groups
  const pendingOrderCases = activeCases.filter((c) => c.case_status === "pending_order")
  const waitingDoctor = pendingOrderCases.filter((c) => !c.hasReservations).length
  const waitingSupplier = pendingOrderCases.filter((c) => c.hasReservations).length
  const pendingPrep = activeCases.filter((c) => c.case_status === "pending_preparation").length

  const cards = [
    {
      label: "รอทำนัด",
      value: pendingAppt,
      href: "/cases?period=month&appt=pending",
      icon: Phone,
      bg: "bg-yellow-100 dark:bg-yellow-500/20",
      iconColor: "text-yellow-600 dark:text-yellow-400",
      valueColor: "text-yellow-700 dark:text-yellow-400",
      alertBorder: pendingAppt > 0 ? "ring-2 ring-yellow-400/50" : "",
    },
    {
      label: "รอหมอสั่งของ",
      value: waitingDoctor,
      href: "/cases?period=month&status=waiting_doctor",
      icon: ShoppingCart,
      bg: "bg-purple-100 dark:bg-purple-500/20",
      iconColor: "text-purple-600 dark:text-purple-400",
      valueColor: "text-purple-700 dark:text-purple-400",
      alertBorder: waitingDoctor > 0 ? "ring-2 ring-purple-400/50" : "",
    },
    {
      label: "รอสั่ง Supplier",
      value: waitingSupplier,
      href: "/cases?period=month&status=pending_order",
      icon: Truck,
      bg: "bg-red-100 dark:bg-red-500/20",
      iconColor: "text-red-600 dark:text-red-400",
      valueColor: "text-red-700 dark:text-red-400",
      alertBorder: waitingSupplier > 0 ? "ring-2 ring-red-400/50" : "",
    },
    {
      label: "รอจัดของ",
      value: pendingPrep,
      href: "/cases?period=month&status=pending_preparation",
      icon: PackageOpen,
      bg: "bg-yellow-100 dark:bg-yellow-500/20",
      iconColor: "text-yellow-600 dark:text-yellow-400",
      valueColor: "text-yellow-700 dark:text-yellow-400",
      alertBorder: pendingPrep > 0 ? "ring-2 ring-yellow-400/50" : "",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Link key={card.label} href={card.href}>
            <div
              className={`group flex items-center gap-3 rounded-xl border bg-card p-3 transition-all hover:shadow-md ${card.value > 0 ? card.alertBorder : ""}`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${card.bg}`}
              >
                <Icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
              <div className="min-w-0">
                <p className={`text-lg font-bold leading-tight ${card.value > 0 ? card.valueColor : "text-muted-foreground"}`}>
                  {card.value}
                </p>
                <p className="text-[10px] text-muted-foreground">{card.label}</p>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
