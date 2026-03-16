"use client"

import Link from "next/link"
import {
  AlertTriangle,
  ChevronRight,
  Clock,
  Package,
} from "lucide-react"
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

function ExpiryBadge({ expiryDate, compact }: { expiryDate: string | null; compact?: boolean }) {
  const { label, color } = getExpiryInfo(expiryDate)

  const colorClasses = {
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    gray: "bg-muted text-muted-foreground",
  }

  const dotColor = {
    red: "bg-red-500",
    orange: "bg-orange-400",
    green: "bg-green-500",
    gray: "bg-gray-400",
  }

  const formatted = expiryDate
    ? new Date(expiryDate).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "2-digit",
      })
    : null

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] ${
        color === "red" ? "text-red-600 dark:text-red-400 font-medium" :
        color === "orange" ? "text-orange-600 dark:text-orange-400" :
        "text-muted-foreground"
      }`}>
        <span className={`h-1.5 w-1.5 rounded-full ${dotColor[color]}`} />
        {formatted ?? label}
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] sm:text-[11px] font-medium ${colorClasses[color]}`}
    >
      <Clock className="h-3 w-3" />
      {formatted ?? label}
      {formatted && <span className="opacity-60">({label})</span>}
    </span>
  )
}

function StockBadge({ stock, unit, isLow, minStock }: { stock: number; unit: string; isLow: boolean; minStock: number }) {
  return (
    <div className="text-right">
      <div className="flex items-baseline justify-end gap-0.5">
        <span
          className={`text-sm sm:text-base font-bold tabular-nums ${
            isLow
              ? "text-orange-600 dark:text-orange-400"
              : "text-foreground"
          }`}
        >
          {stock.toLocaleString()}
        </span>
        <span className="text-[10px] text-muted-foreground">{unit}</span>
      </div>
      {isLow && (
        <span className="text-[9px] sm:text-[10px] text-orange-500">
          ขั้นต่ำ {minStock}
        </span>
      )}
    </div>
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
  if (viewMode === "lot") {
    return <LotView items={lotItems} />
  }

  return <ProductView products={products} />
}

// ─── Product View ──────────────────────────────────────────────

function ProductView({ products }: { products: Product[] }) {
  return (
    <div>
      {/* Desktop table header */}
      <div className="hidden sm:grid sm:grid-cols-[1fr_120px_100px_24px] gap-3 px-3 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider border-b">
        <div>สินค้า</div>
        <div className="text-center">สถานะ</div>
        <div className="text-right">คงเหลือ</div>
        <div />
      </div>

      <div className="divide-y rounded-lg border sm:border-t-0 sm:rounded-t-none">
        {products.map((product) => {
          const statusColor = product.isLowStock
            ? "orange"
            : product.totalStock === 0
            ? "red"
            : "green"

          return (
            <Link
              key={product.id}
              href={`/inventory/products/${product.id}`}
              className="group flex items-center gap-3 px-3 py-2.5 sm:py-2 hover:bg-muted/50 active:bg-muted transition-colors sm:grid sm:grid-cols-[1fr_120px_100px_24px]"
            >
              {/* Product Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate leading-tight">
                    {product.name}
                  </p>
                  {product.isLowStock && (
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] sm:text-[11px] text-muted-foreground font-mono">
                    {product.ref}
                  </span>
                  {product.brand && (
                    <>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
                        {product.brand}
                      </span>
                    </>
                  )}
                  {product.supplierName && (
                    <>
                      <span className="text-muted-foreground/40 hidden sm:inline">·</span>
                      <span className="text-[10px] sm:text-[11px] text-muted-foreground truncate hidden sm:inline">
                        {product.supplierName}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Status Badge - hidden on mobile (shown via stock color instead) */}
              <div className="hidden sm:flex sm:justify-center">
                <StatusPill status={statusColor} />
              </div>

              {/* Stock */}
              <StockBadge
                stock={product.totalStock}
                unit={product.unit}
                isLow={product.isLowStock}
                minStock={product.min_stock_level}
              />

              {/* Chevron */}
              <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground shrink-0 transition-colors" />
            </Link>
          )
        })}
      </div>

      <p className="text-[10px] sm:text-[11px] text-muted-foreground text-right px-1 pt-2">
        แสดง {products.length} รายการ
      </p>
    </div>
  )
}

function StatusPill({ status }: { status: "green" | "orange" | "red" }) {
  const config = {
    green: {
      label: "ปกติ",
      className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    },
    orange: {
      label: "ใกล้หมด",
      className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    },
    red: {
      label: "หมดสต็อก",
      className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    },
  }

  const { label, className } = config[status]

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${className}`}>
      {label}
    </span>
  )
}

// ─── LOT View ──────────────────────────────────────────────────

function LotView({ items }: { items: LotItem[] }) {
  // Group by product for better readability
  const grouped = new Map<string, { product: { id: string; name: string; ref: string; brand: string | null }; lots: LotItem[] }>()
  for (const item of items) {
    const key = item.product_id
    if (!grouped.has(key)) {
      grouped.set(key, {
        product: { id: item.product_id, name: item.product_name, ref: item.ref, brand: item.brand },
        lots: [],
      })
    }
    grouped.get(key)!.lots.push(item)
  }

  return (
    <div className="space-y-2">
      {Array.from(grouped.values()).map(({ product, lots }) => {
        const totalAvailable = lots.reduce((s, l) => s + l.available, 0)
        const totalReserved = lots.reduce((s, l) => s + l.reserved_quantity, 0)

        return (
          <div key={product.id} className="rounded-lg border overflow-hidden">
            {/* Product header */}
            <Link
              href={`/inventory/products/${product.id}`}
              className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/30 hover:bg-muted/60 transition-colors border-b"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm font-semibold truncate">{product.name}</span>
                </div>
                <div className="flex items-center gap-1.5 ml-5">
                  <span className="text-[10px] sm:text-[11px] font-mono text-muted-foreground">
                    {product.ref}
                  </span>
                  {product.brand && (
                    <>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="text-[10px] sm:text-[11px] text-muted-foreground">
                        {product.brand}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <span className="text-sm font-bold">{totalAvailable}</span>
                  {totalReserved > 0 && (
                    <span className="text-[10px] text-orange-500 ml-1">
                      (จอง {totalReserved})
                    </span>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              </div>
            </Link>

            {/* LOT rows */}
            <div className="divide-y divide-dashed">
              {lots.map((lot) => {
                const { color } = getExpiryInfo(lot.expiry_date)
                const borderColor =
                  color === "red"
                    ? "border-l-red-500"
                    : color === "orange"
                    ? "border-l-orange-400"
                    : color === "green"
                    ? "border-l-green-400"
                    : "border-l-transparent"

                return (
                  <div
                    key={lot.id}
                    className={`flex items-center justify-between gap-2 px-3 py-2 border-l-[3px] ${borderColor} ml-0`}
                  >
                    {/* LOT info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px] h-[18px] px-1.5 font-mono shrink-0">
                          {lot.lot_number}
                        </Badge>
                        <ExpiryBadge expiryDate={lot.expiry_date} compact />
                      </div>
                      {lot.supplier_name && (
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 ml-0.5">
                          {lot.supplier_name}
                        </p>
                      )}
                    </div>

                    {/* Quantity */}
                    <div className="flex items-baseline gap-0.5 shrink-0">
                      <span className="text-sm font-semibold tabular-nums">
                        {lot.available}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {lot.unit}
                      </span>
                      {lot.reserved_quantity > 0 && (
                        <span className="text-[10px] text-orange-500 ml-0.5">
                          (จอง {lot.reserved_quantity})
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      <p className="text-[10px] sm:text-[11px] text-muted-foreground text-right px-1 pt-1">
        แสดง {items.length} LOT จาก {grouped.size} สินค้า (เรียงตามวันหมดอายุ)
      </p>
    </div>
  )
}
