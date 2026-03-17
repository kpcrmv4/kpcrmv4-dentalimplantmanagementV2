"use client"

import { useState, useEffect, useTransition, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getUsageReport, type UsageReportRow } from "@/lib/actions/reports"
import { formatNumber, formatCurrency, formatDate } from "@/lib/utils"
import { Loader2, Package, Search, Calendar } from "lucide-react"
import { getProductCategories } from "@/lib/actions/settings"

export function UsageReportTab() {
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [category, setCategory] = useState("all")
  const [data, setData] = useState<UsageReportRow[]>([])
  const [isPending, startTransition] = useTransition()
  const [searched, setSearched] = useState(false)
  const [categoryOptions, setCategoryOptions] = useState<Array<{ value: string; label: string }>>([])
  const [categoryLabels, setCategoryLabels] = useState<Record<string, string>>({})

  useEffect(() => {
    getProductCategories().then((cats) => {
      setCategoryOptions([{ value: "all", label: "ทั้งหมด" }, ...cats.map((c: { slug: string; name: string }) => ({ value: c.slug, label: c.name }))])
      setCategoryLabels(Object.fromEntries(cats.map((c: { slug: string; name: string }) => [c.slug, c.name])))
    })
  }, [])

  function handleSearch() {
    if (!from || !to) return
    startTransition(async () => {
      const result = await getUsageReport(from, to)
      setData(result)
      setSearched(true)
    })
  }

  const filtered = useMemo(() => {
    if (category === "all") return data
    return data.filter((r) => r.product_category === category)
  }, [data, category])

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, { rows: UsageReportRow[]; subtotal: number }>()
    for (const row of filtered) {
      const date = row.usage_date
      if (!map.has(date)) {
        map.set(date, { rows: [], subtotal: 0 })
      }
      const group = map.get(date)!
      group.rows.push(row)
      group.subtotal += row.total_cost
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  const grandTotal = filtered.reduce((sum, r) => sum + r.total_cost, 0)

  return (
    <div className="space-y-4">
      {/* Filters */}
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
            <div className="flex gap-2 sm:flex-row">
              <div className="flex-1 sm:w-36">
                <label className="mb-1 block text-xs text-muted-foreground">หมวด</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleSearch}
                  disabled={isPending || !from || !to}
                  className="h-10"
                >
                  {isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Search className="mr-1.5 h-4 w-4" />}
                  ค้นหา
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {searched && (
        <>
          {/* Grand Total */}
          {filtered.length > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">ต้นทุนรวมทั้งหมด</span>
                </div>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(grandTotal)}
                </span>
              </CardContent>
            </Card>
          )}

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Package className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                ไม่พบข้อมูลในช่วงวันที่ที่เลือก
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map(([date, group]) => (
                <div key={date}>
                  {/* Date header */}
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground">
                        {formatDate(date)}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      รวม {formatCurrency(group.subtotal)}
                    </span>
                  </div>

                  {/* Usage rows */}
                  <div className="space-y-1.5">
                    {group.rows.map((row, idx) => (
                      <Card key={`${row.case_id}-${row.product_ref}-${idx}`}>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{row.product_name}</p>
                              <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                                <span>REF: {row.product_ref}</span>
                                <span>{categoryLabels[row.product_category] ?? row.product_category}</span>
                              </div>
                              <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                                <span>{row.case_number}</span>
                                <span>{row.patient_name} ({row.patient_hn})</span>
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-sm font-bold tabular-nums">{formatCurrency(row.total_cost)}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {formatNumber(row.quantity_used)} x {formatCurrency(row.unit_cost)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
