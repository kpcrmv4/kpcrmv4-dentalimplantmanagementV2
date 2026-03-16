"use client"

import { useState, useEffect, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCostReport, type CostReportItem } from "@/lib/actions/reports"
import { formatNumber, formatCurrency, formatDate } from "@/lib/utils"
import { ChevronDown, ChevronRight, Loader2, Calculator, Search } from "lucide-react"
import { getProductCategories } from "@/lib/actions/settings"
import { cn } from "@/lib/utils"

export function CostPerCaseTab() {
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [data, setData] = useState<CostReportItem[]>([])
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [searched, setSearched] = useState(false)
  const [categoryLabels, setCategoryLabels] = useState<Record<string, string>>({})

  useEffect(() => {
    getProductCategories().then((cats) => {
      setCategoryLabels(Object.fromEntries(cats.map((c: { slug: string; name: string }) => [c.slug, c.name])))
    })
  }, [])

  function handleSearch() {
    if (!from || !to) return
    startTransition(async () => {
      const result = await getCostReport(from, to)
      setData(result)
      setSearched(true)
      setExpandedRows(new Set())
    })
  }

  function toggleRow(caseId: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(caseId)) {
        next.delete(caseId)
      } else {
        next.add(caseId)
      }
      return next
    })
  }

  const grandTotal = data.reduce((sum, c) => sum + c.totalCost, 0)

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
          {/* Grand Total Card */}
          {data.length > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">ต้นทุนรวมทั้งหมด</span>
                </div>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(grandTotal)}
                </span>
              </CardContent>
            </Card>
          )}

          {data.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Calculator className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                ไม่พบข้อมูลในช่วงวันที่ที่เลือก
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.map((c) => {
                const isExpanded = expandedRows.has(c.caseId)
                return (
                  <Card key={c.caseId} className="overflow-hidden">
                    {/* Case Header - clickable to expand */}
                    <div
                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleRow(c.caseId)}
                    >
                      <div className="shrink-0 text-muted-foreground">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold">{c.caseNumber}</span>
                          {c.scheduledDate && (
                            <span className="text-[10px] text-muted-foreground">
                              {formatDate(c.scheduledDate)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {c.patientName} ({c.patientHn})
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold tabular-nums">
                          {formatCurrency(c.totalCost)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {c.items.length} รายการ
                        </p>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && c.items.length > 0 && (
                      <div className="border-t bg-muted/20 px-3 py-2 space-y-2">
                        {c.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-start justify-between gap-2 rounded-lg bg-background p-2 text-xs"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate">{item.productName}</p>
                              <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5 text-muted-foreground">
                                <span>REF: {item.productRef}</span>
                                <span>{categoryLabels[item.category] ?? item.category}</span>
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="font-medium tabular-nums">{formatCurrency(item.subtotal)}</p>
                              <p className="text-muted-foreground">
                                {formatNumber(item.quantity)} x {formatCurrency(item.unitCost)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
