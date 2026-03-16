"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getDentistPerformance, type DentistPerformanceRow } from "@/lib/actions/reports"
import { formatCurrency, formatNumber } from "@/lib/utils"
import { Loader2 } from "lucide-react"

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
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">เลือกช่วงวันที่</CardTitle>
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
            <Button onClick={handleSearch} disabled={isPending || !from || !to}>
              {isPending ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
              ค้นหา
            </Button>
          </div>
        </CardContent>
      </Card>

      {searched && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">รายได้รวม</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">ต้นทุนรวม</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(totalCost)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">กำไรรวม</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(totalProfit)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Data Table */}
          <Card>
            <CardContent className="p-0">
              {data.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  ไม่พบข้อมูลในช่วงวันที่ที่เลือก
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ชื่อหมอ</TableHead>
                      <TableHead className="text-right">เคสทั้งหมด</TableHead>
                      <TableHead className="text-right">เคสเสร็จ</TableHead>
                      <TableHead className="text-right">รายได้</TableHead>
                      <TableHead className="text-right">ต้นทุน</TableHead>
                      <TableHead className="text-right">กำไร</TableHead>
                      <TableHead className="text-right">ต้นทุนเฉลี่ย/เคส</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((row) => (
                      <TableRow key={row.dentist_id}>
                        <TableCell className="font-medium">{row.dentist_name}</TableCell>
                        <TableCell className="text-right">{formatNumber(row.total_cases)}</TableCell>
                        <TableCell className="text-right">{formatNumber(row.completed_cases)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.total_revenue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.total_cost)}</TableCell>
                        <TableCell
                          className={`text-right font-medium ${
                            row.profit >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {formatCurrency(row.profit)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(row.avg_cost_per_case)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
