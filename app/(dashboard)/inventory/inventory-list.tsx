"use client"

import { useState } from "react"
import Link from "next/link"
import { LayoutList, LayoutGrid, AlertTriangle, ChevronRight, Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type Product = {
  id: string
  ref: string
  name: string
  brand: string | null
  unit: string
  min_stock_level: number
  totalStock: number
  isLowStock: boolean
  supplierName: string | null
}

type LotItem = {
  id: string
  product_id: string
  product_name: string
  ref: string
  brand: string | null
  unit: string
  supplier_name: string | null
  lot_number: string
  expiry_date: string | null
  quantity: number
  reserved_quantity: number
  available: number
}

function getExpiryInfo(expiryDate: string | null): {
  label: string
  color: "red" | "orange" | "green" | "gray"
  daysUntil: number | null
} {
  if (!expiryDate) {
    return { label: "ไม่ระบุ", color: "gray", daysUntil: null }
  }

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  const diffTime = expiry.getTime() - now.getTime()
  const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (daysUntil < 0) {
    return { label: "หมดอายุแล้ว", color: "red", daysUntil }
  }
  if (daysUntil < 30) {
    return { label: `${daysUntil} วัน`, color: "red", daysUntil }
  }
  if (daysUntil < 90) {
    return { label: `${daysUntil} วัน`, color: "orange", daysUntil }
  }
  return { label: `${daysUntil} วัน`, color: "green", daysUntil }
}

function ExpiryBadge({ expiryDate }: { expiryDate: string | null }) {
  const { label, color } = getExpiryInfo(expiryDate)

  const colorClasses = {
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    gray: "bg-muted text-muted-foreground",
  }

  const formatted = expiryDate
    ? new Date(expiryDate).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "2-digit",
      })
    : null

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${colorClasses[color]}`}
    >
      <Clock className="h-3 w-3" />
      {formatted ?? label}
      {formatted && <span className="opacity-70">({label})</span>}
    </span>
  )
}

export function InventoryList({
  products,
  lotItems,
  viewMode,
}: {
  products: Product[]
  lotItems: LotItem[]
  viewMode: "product" | "lot"
}) {
  const [view, setView] = useState<"card" | "compact">("compact")

  if (viewMode === "lot") {
    return <LotView items={lotItems} />
  }

  return (
    <>
      {/* View Toggle */}
      <div className="flex justify-end">
        <div className="flex rounded-lg border bg-muted p-0.5">
          <button
            onClick={() => setView("compact")}
            className={`rounded-md p-1.5 transition-colors ${
              view === "compact"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="มุมมองกะทัดรัด"
          >
            <LayoutList className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("card")}
            className={`rounded-md p-1.5 transition-colors ${
              view === "card"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="มุมมองการ์ด"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Compact View */}
      {view === "compact" ? (
        <div className="rounded-lg border divide-y">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/inventory/products/${product.id}`}
              className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate">{product.name}</p>
                  {product.isLowStock && (
                    <AlertTriangle className="h-3 w-3 shrink-0 text-orange-500" />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  {product.brand ?? ""} · {product.ref}
                  {product.supplierName ? ` · ${product.supplierName}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1 ml-2 shrink-0">
                <div
                  className={`text-right ${
                    product.isLowStock ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"
                  }`}
                >
                  <span className="text-sm font-bold">{product.totalStock}</span>
                  <span className="ml-0.5 text-[10px] text-muted-foreground">
                    {product.unit}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        /* Card View */
        <div className="space-y-2">
          {products.map((product) => {
            const stockColor = product.isLowStock
              ? "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-500/10"
              : "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-500/10"

            return (
              <Link key={product.id} href={`/inventory/products/${product.id}`} className="block">
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardContent className="flex items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium leading-tight truncate">
                          {product.name}
                        </p>
                        {product.isLowStock && (
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {product.brand ?? ""} · REF: {product.ref}
                      </p>
                      {product.supplierName && (
                        <p className="text-[10px] text-muted-foreground">
                          {product.supplierName}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        Min: {product.min_stock_level} {product.unit}
                      </p>
                    </div>
                    <div
                      className={`flex flex-col items-center rounded-lg px-3 py-1.5 ${stockColor}`}
                    >
                      <span className="text-lg font-bold">
                        {product.totalStock}
                      </span>
                      <span className="text-[10px]">{product.unit}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}

function LotView({ items }: { items: LotItem[] }) {
  return (
    <div className="space-y-1">
      {/* Header row */}
      <div className="hidden sm:grid sm:grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
        <div>สินค้า / LOT</div>
        <div className="w-28 text-center">วันหมดอายุ</div>
        <div className="w-24 text-right">คงเหลือ</div>
        <div className="w-6" />
      </div>

      <div className="rounded-lg border divide-y">
        {items.map((item) => {
          const { color } = getExpiryInfo(item.expiry_date)
          const borderColor =
            color === "red"
              ? "border-l-red-500"
              : color === "orange"
              ? "border-l-orange-400"
              : color === "green"
              ? "border-l-green-400"
              : "border-l-transparent"

          return (
            <Link
              key={item.id}
              href={`/inventory/products/${item.product_id}`}
              className={`flex flex-col sm:grid sm:grid-cols-[1fr_auto_auto_auto] sm:items-center gap-1 sm:gap-2 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors border-l-[3px] ${borderColor}`}
            >
              {/* Product info + LOT */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate">{item.product_name}</p>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <p className="text-[11px] text-muted-foreground">
                    REF: {item.ref}
                  </p>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                    LOT: {item.lot_number}
                  </Badge>
                  {item.brand && (
                    <p className="text-[10px] text-muted-foreground">{item.brand}</p>
                  )}
                  {item.supplier_name && (
                    <p className="text-[10px] text-muted-foreground">· {item.supplier_name}</p>
                  )}
                </div>
              </div>

              {/* Expiry */}
              <div className="w-auto sm:w-28 flex sm:justify-center">
                <ExpiryBadge expiryDate={item.expiry_date} />
              </div>

              {/* Quantity */}
              <div className="w-auto sm:w-24 flex items-baseline gap-1 sm:justify-end">
                <span className="text-sm font-bold text-foreground">
                  {item.available}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {item.unit}
                </span>
                {item.reserved_quantity > 0 && (
                  <span className="text-[10px] text-orange-500">
                    (จอง {item.reserved_quantity})
                  </span>
                )}
              </div>

              {/* Chevron */}
              <div className="hidden sm:flex w-6 justify-center">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          )
        })}
      </div>

      {/* Summary */}
      <p className="text-[11px] text-muted-foreground text-right px-1 pt-1">
        แสดง {items.length} รายการ (เรียงตามวันหมดอายุ)
      </p>
    </div>
  )
}
