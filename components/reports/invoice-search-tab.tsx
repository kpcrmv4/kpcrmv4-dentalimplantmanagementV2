"use client"

import { useState, useEffect, useTransition } from "react"
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
import { searchByInvoice, type InvoiceSearchResult } from "@/lib/actions/reports"
import { formatNumber, formatDate } from "@/lib/utils"
import { Loader2, Search } from "lucide-react"
import { getProductCategories } from "@/lib/actions/settings"

export function InvoiceSearchTab() {
  const [query, setQuery] = useState("")
  const [data, setData] = useState<InvoiceSearchResult[]>([])
  const [isPending, startTransition] = useTransition()
  const [searched, setSearched] = useState(false)
  const [categoryLabels, setCategoryLabels] = useState<Record<string, string>>({})

  useEffect(() => {
    getProductCategories().then((cats) => {
      setCategoryLabels(Object.fromEntries(cats.map((c: { slug: string; name: string }) => [c.slug, c.name])))
    })
  }, [])

  function handleSearch() {
    if (!query.trim()) return
    startTransition(async () => {
      const result = await searchByInvoice(query.trim())
      setData(result)
      setSearched(true)
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">ค้นหาด้วยเลข Invoice</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="flex-1 max-w-sm">
              <label className="mb-1 block text-xs text-muted-foreground">เลข Invoice</label>
              <Input
                type="text"
                placeholder="กรอกเลข Invoice..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch()
                }}
              />
            </div>
            <Button onClick={handleSearch} disabled={isPending || !query.trim()}>
              {isPending ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <Search className="mr-1 size-4" />
              )}
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
                ไม่พบข้อมูลสำหรับเลข Invoice ที่ค้นหา
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>วัสดุ</TableHead>
                    <TableHead>REF</TableHead>
                    <TableHead>หมวด</TableHead>
                    <TableHead>LOT</TableHead>
                    <TableHead className="text-right">จำนวน</TableHead>
                    <TableHead>วันที่รับ</TableHead>
                    <TableHead>วันหมดอายุ</TableHead>
                    <TableHead>เลข Invoice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row.productName}</TableCell>
                      <TableCell>{row.productRef}</TableCell>
                      <TableCell>
                        {categoryLabels[row.category] ?? row.category}
                      </TableCell>
                      <TableCell>{row.lotNumber}</TableCell>
                      <TableCell className="text-right">{formatNumber(row.quantity)}</TableCell>
                      <TableCell>{formatDate(row.receivedDate)}</TableCell>
                      <TableCell>
                        {row.expiryDate ? formatDate(row.expiryDate) : "-"}
                      </TableCell>
                      <TableCell>{row.invoiceNumber ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
