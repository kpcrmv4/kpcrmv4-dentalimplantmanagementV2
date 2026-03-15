"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getCostReport, type CostReportItem } from "@/lib/actions/reports"
import { formatNumber, formatCurrency, formatDate } from "@/lib/utils"
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react"

const CATEGORY_LABELS: Record<string, string> = {
  implant: "Implant",
  abutment: "Abutment",
  crown: "Crown",
  instrument: "เครื่องมือ",
  consumable: "วัสดุสิ้นเปลือง",
  other: "อื่นๆ",
}

export function CostPerCaseTab() {
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [data, setData] = useState<CostReportItem[]>([])
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [searched, setSearched] = useState(false)

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
                    <TableHead className="w-8" />
                    <TableHead>เลขเคส</TableHead>
                    <TableHead>คนไข้</TableHead>
                    <TableHead>HN</TableHead>
                    <TableHead>วันนัด</TableHead>
                    <TableHead className="text-right">ต้นทุนรวม</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((c) => (
                    <>
                      <TableRow
                        key={c.caseId}
                        className="cursor-pointer"
                        onClick={() => toggleRow(c.caseId)}
                      >
                        <TableCell>
                          {expandedRows.has(c.caseId) ? (
                            <ChevronDown className="size-4" />
                          ) : (
                            <ChevronRight className="size-4" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{c.caseNumber}</TableCell>
                        <TableCell>{c.patientName}</TableCell>
                        <TableCell>{c.patientHn}</TableCell>
                        <TableCell>{c.scheduledDate ? formatDate(c.scheduledDate) : "-"}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(c.totalCost)}
                        </TableCell>
                      </TableRow>
                      {expandedRows.has(c.caseId) && c.items.length > 0 && (
                        <TableRow key={`${c.caseId}-detail`}>
                          <TableCell colSpan={6} className="bg-muted/30 p-0">
                            <div className="px-8 py-2">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>วัสดุ</TableHead>
                                    <TableHead>REF</TableHead>
                                    <TableHead>หมวด</TableHead>
                                    <TableHead className="text-right">จำนวน</TableHead>
                                    <TableHead className="text-right">ราคา/หน่วย</TableHead>
                                    <TableHead className="text-right">รวม</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {c.items.map((item, idx) => (
                                    <TableRow key={idx}>
                                      <TableCell>{item.productName}</TableCell>
                                      <TableCell>{item.productRef}</TableCell>
                                      <TableCell>
                                        {CATEGORY_LABELS[item.category] ?? item.category}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {formatNumber(item.quantity)}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {formatCurrency(item.unitCost)}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {formatCurrency(item.subtotal)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={5} className="text-right font-bold">
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
