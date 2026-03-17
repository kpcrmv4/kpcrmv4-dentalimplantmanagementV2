"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { getDentistPerformance, type DentistPerformanceRow } from "@/lib/actions/reports"
import { formatCurrency, formatNumber } from "@/lib/utils"
import { Loader2, Search, TrendingUp, TrendingDown, UserCheck, DollarSign, Receipt, PiggyBank } from "lucide-react"
import { cn } from "@/lib/utils"

export function DentistPerformanceTab() {
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [data, setData] = useState<DentistPerformanceRow[]>([])
  const [isPending, startTransition] = useTransition()
  const [searched, setSearched] = useState(false)

  function handleSearch() {
    if (!from || !to) return
    startTransition(async () => {
      const result = await getDentistPerformance(from, to)
      setData(result)
      setSearched(true)
    })
  }

  const totalRevenue = data.reduce((sum, d) => sum + d.total_revenue, 0)
  const totalCost = data.reduce((sum, d) => sum + d.total_cost, 0)
  const totalProfit = data.reduce((sum, d) => sum + d.profit, 0)

  return (
    <div className="space-y-4">
      {/* Date Range Filter */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="grid grid-cols-2 gap-2 flex-1">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">จาก</label>
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="h-10"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">ถึง</label>
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
            <Button
              onClick={handleSearch}
              disabled={isPending || !from || !to}
              className="w-full sm:w-auto"
            >
              {isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Search className="mr-1.5 h-4 w-4" />}
              ค้นหา
            </Button>
          </div>
        </CardContent>
      </Card>

      {searched && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-2">
            <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <CardContent className="flex flex-col items-center py-3 relative overflow-hidden">
                <DollarSign className="absolute right-1 top-1 h-3.5 w-3.5 text-emerald-200 dark:text-emerald-500/20 pointer-events-none" strokeWidth={2} />
                <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {formatCurrency(totalRevenue)}
                </span>
                <span className="text-[10px] font-medium text-emerald-600/80 dark:text-emerald-400/80">
                  รายได้รวม
                </span>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-500/30 dark:bg-amber-500/10">
              <CardContent className="flex flex-col items-center py-3 relative overflow-hidden">
                <Receipt className="absolute right-1 top-1 h-3.5 w-3.5 text-amber-200 dark:text-amber-500/20 pointer-events-none" strokeWidth={2} />
                <span className="text-lg font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                  {formatCurrency(totalCost)}
                </span>
                <span className="text-[10px] font-medium text-amber-600/80 dark:text-amber-400/80">
                  ต้นทุนรวม
                </span>
              </CardContent>
            </Card>
            <Card className={cn(
              totalProfit >= 0
                ? "border-blue-200 bg-blue-50/50 dark:border-blue-500/30 dark:bg-blue-500/10"
                : "border-red-200 bg-red-50/50 dark:border-red-500/30 dark:bg-red-500/10"
            )}>
              <CardContent className="flex flex-col items-center py-3 relative overflow-hidden">
                <PiggyBank className={cn(
                  "absolute right-1 top-1 h-3.5 w-3.5 pointer-events-none",
                  totalProfit >= 0
                    ? "text-blue-200 dark:text-blue-500/20"
                    : "text-red-200 dark:text-red-500/20"
                )} strokeWidth={2} />
                <span className={cn(
                  "text-lg font-bold tabular-nums",
                  totalProfit >= 0
                    ? "text-blue-700 dark:text-blue-400"
                    : "text-red-700 dark:text-red-400"
                )}>
                  {formatCurrency(totalProfit)}
                </span>
                <span className={cn(
                  "text-[10px] font-medium",
                  totalProfit >= 0
                    ? "text-blue-600/80 dark:text-blue-400/80"
                    : "text-red-600/80 dark:text-red-400/80"
                )}>
                  กำไรรวม
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Dentist Cards */}
          {data.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <UserCheck className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                ไม่พบข้อมูลในช่วงวันที่ที่เลือก
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.map((row) => (
                <Card key={row.dentist_id}>
                  <CardContent className="p-3">
                    {/* Dentist name + cases */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <UserCheck className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{row.dentist_name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatNumber(row.total_cases)} เคส ({formatNumber(row.completed_cases)} เสร็จ)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {row.profit >= 0 ? (
                          <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5 text-red-600" />
                        )}
                        <span className={cn(
                          "text-sm font-bold tabular-nums",
                          row.profit >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {formatCurrency(row.profit)}
                        </span>
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-2">
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground">รายได้</p>
                        <p className="text-xs font-medium tabular-nums">{formatCurrency(row.total_revenue)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground">ต้นทุน</p>
                        <p className="text-xs font-medium tabular-nums">{formatCurrency(row.total_cost)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground">ต้นทุน/เคส</p>
                        <p className="text-xs font-medium tabular-nums">{formatCurrency(row.avg_cost_per_case)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
