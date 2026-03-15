"use client"

import { useState, useTransition, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getUsageReport, type UsageReportRow } from "@/lib/actions/reports"
import { formatNumber, formatCurrency, formatDate } from "@/lib/utils"
import { Loader2 } from "lucide-react"

const CATEGORY_OPTIONS = [
  { value: "all", label: "ทั้งหมด" },
  { value: "implant", label: "Implant" },
  { value: "abutment", label: "Abutment" },
  { value: "crown", label: "Crown" },
  { value: "instrument", label: "เครื่องมือ" },
  { value: "consumable", label: "วัสดุสิ้นเปลือง" },
  { value: "other", label: "อื่นๆ" },
]

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORY_OPTIONS.filter((o) => o.value !== "all").map((o) => [o.value, o.label])
)

export function UsageReportTab() {
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [category, setCategory] = useState("all")
  const [data, setData] = useState<UsageReportRow[]>([])
  const [isPending, startTransition] = useTransition()
  const [searched, setSearched] = useState(false)

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
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">เลือกช่วงวันที่และหมวด</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">จาก</label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">ถึง</label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">หมวด</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSearch} disabled={isPending || !from || !to}>
              {isPending ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
              ค้นหา
            </Button>
          </div>
        </CardContent>
      </Card>

      {searched && (
        <Card>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                ไม่พบข้อมูลในช่วงวันที่ที่เลือก
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>วันที่</TableHead>
                    <TableHead>เลขเคส</TableHead>
                    <TableHead>คนไข้</TableHead>
                    <TableHead>HN</TableHead>
                    <TableHead>วัสดุ</TableHead>
                    <TableHead>REF</TableHead>
                    <TableHead>หมวด</TableHead>
                    <TableHead className="text-right">จำนวน</TableHead>
                    <TableHead className="text-right">ราคา/หน่วย</TableHead>
                    <TableHead className="text-right">รวม</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grouped.map(([date, group]) => (
                    <>
                      {group.rows.map((row, idx) => (
                        <TableRow key={`${row.case_id}-${row.product_ref}-${idx}`}>
                          {idx === 0 ? (
                            <TableCell rowSpan={group.rows.length} className="align-top font-medium">
                              {formatDate(date)}
                            </TableCell>
                          ) : null}
                          <TableCell>{row.case_number}</TableCell>
                          <TableCell>{row.patient_name}</TableCell>
                          <TableCell>{row.patient_hn}</TableCell>
                          <TableCell>{row.product_name}</TableCell>
                          <TableCell>{row.product_ref}</TableCell>
                          <TableCell>
                            {CATEGORY_LABELS[row.product_category] ?? row.product_category}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(row.quantity_used)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(row.unit_cost)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(row.total_cost)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow key={`subtotal-${date}`}>
                        <TableCell
                          colSpan={9}
                          className="bg-muted/30 text-right text-xs font-medium"
                        >
                          รวมวันที่ {formatDate(date)}
                        </TableCell>
                        <TableCell className="bg-muted/30 text-right text-xs font-bold">
                          {formatCurrency(group.subtotal)}
                        </TableCell>
                      </TableRow>
                    </>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={9} className="text-right font-bold">
                      รวมทั้งหมด
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(grandTotal)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
