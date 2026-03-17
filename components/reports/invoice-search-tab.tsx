"use client"

import { useState, useEffect, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { searchByInvoice, type InvoiceSearchResult } from "@/lib/actions/reports"
import { formatNumber, formatDate } from "@/lib/utils"
import { Loader2, Search, FileSearch } from "lucide-react"
import { getProductCategories } from "@/lib/actions/settings"
import { Badge } from "@/components/ui/badge"

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
      {/* Search Input */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">เลข Invoice</label>
              <Input
                type="text"
                placeholder="กรอกเลข Invoice..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch()
                }}
                className="h-10"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={isPending || !query.trim()}
              className="w-full sm:w-auto"
            >
              {isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-1.5 h-4 w-4" />
              )}
              ค้นหา
            </Button>
          </div>
        </CardContent>
      </Card>

      {searched && (
        <>
          {data.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <FileSearch className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                ไม่พบข้อมูลสำหรับเลข Invoice ที่ค้นหา
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                พบ {data.length} รายการ
              </p>
              <div className="space-y-2">
                {data.map((row, idx) => (
                  <Card key={idx}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{row.productName}</p>
                          <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                            <span>REF: {row.productRef}</span>
                            <span>{categoryLabels[row.category] ?? row.category}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              LOT: {row.lotNumber}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              Invoice: {row.invoiceNumber ?? "-"}
                            </Badge>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-bold tabular-nums">
                            {formatNumber(row.quantity)}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            รับ {formatDate(row.receivedDate)}
                          </p>
                          {row.expiryDate && (
                            <p className="text-[10px] text-muted-foreground">
                              หมดอายุ {formatDate(row.expiryDate)}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
