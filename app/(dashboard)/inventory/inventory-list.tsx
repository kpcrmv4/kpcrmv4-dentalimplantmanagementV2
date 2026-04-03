"use client"

import Link from "next/link"
import {
  AlertTriangle,
  ChevronRight,
  Clock,
} from "lucide-react"

type Product = {
  id: string
  ref: string
  name: string
  brand: string | null
  unit: string
  min_stock_level: number
  model: string | null
  diameter: number | null
  length: number | null
  weight: string | null
  dimension: string | null
  abutment_height: number | null
  gingival_height: number | null
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
  model: string | null
  diameter: number | null
  length: number | null
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
  const isOutOfStock = stock === 0
  return (
    <div className="text-right">
      <div className="flex items-baseline justify-end gap-0.5">
        <span
          className={`text-sm sm:text-base font-bold tabular-nums ${
            isOutOfStock
              ? "text-red-600 dark:text-red-400"
              : isLow
              ? "text-orange-600 dark:text-orange-400"
              : "text-foreground"
          }`}
        >
          {stock.toLocaleString()}
        </span>
        <span className="text-[10px] text-muted-foreground">{unit}</span>
      </div>
      {isOutOfStock ? (
        <span className="text-[9px] sm:text-[10px] text-red-500">
          หมดสต๊อก
        </span>
      ) : isLow ? (
        <span className="text-[9px] sm:text-[10px] text-orange-500">
          ขั้นต่ำ {minStock}
        </span>
      ) : null}
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
          const statusColor = product.totalStock === 0
            ? "red"
            : product.isLowStock
            ? "orange"
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
                  {(product.isLowStock || product.totalStock === 0) && (
                    <AlertTriangle className={`h-3.5 w-3.5 shrink-0 ${product.totalStock === 0 ? "text-red-500" : "text-orange-500"}`} />
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
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
                  {product.model && (
                    <>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="text-[10px] sm:text-[11px] text-muted-foreground">
                        {product.model}
                      </span>
                    </>
                  )}
                  {(product.diameter != null || product.length != null) && (
                    <>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="text-[10px] sm:text-[11px] text-muted-foreground">
                        {product.diameter != null && product.length != null
                          ? `Ø${product.diameter} × ${product.length}mm`
                          : product.diameter != null
                          ? `Ø${product.diameter}mm`
                          : `${product.length}mm`}
                      </span>
                    </>
                  )}
                  {product.weight && (
                    <>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="text-[10px] sm:text-[11px] text-muted-foreground">{product.weight}g</span>
                    </>
                  )}
                  {product.dimension && (
                    <>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="text-[10px] sm:text-[11px] text-muted-foreground">{product.dimension}</span>
                    </>
                  )}
                  {product.abutment_height != null && (
                    <>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="text-[10px] sm:text-[11px] text-muted-foreground">AH: {product.abutment_height}</span>
                    </>
                  )}
                  {product.gingival_height != null && (
                    <>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="text-[10px] sm:text-[11px] text-muted-foreground">GH: {product.gingival_height}</span>
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
  return (
    <div className="space-y-1.5">
      {items.map((lot) => {
        const { color } = getExpiryInfo(lot.expiry_date)
        const borderColor =
          color === "red"
            ? "border-l-red-500"
            : color === "orange"
            ? "border-l-orange-400"
            : color === "green"
            ? "border-l-green-500"
            : "border-l-muted-foreground/30"

        return (
          <Link
            key={lot.id}
            href={`/inventory/products/${lot.product_id}`}
            className={`block rounded-lg border border-l-[3px] ${borderColor} px-3 py-2.5 hover:bg-muted/40 transition-colors`}
          >
            {/* Row 1: Product name + quantity */}
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-semibold truncate">{lot.product_name}</span>
              <div className="flex items-baseline gap-1 shrink-0">
                <span className="text-base font-bold tabular-nums">{lot.available}</span>
                <span className="text-[10px] text-muted-foreground">{lot.unit}</span>
                {lot.reserved_quantity > 0 && (
                  <span className="text-[10px] text-orange-500">(จอง {lot.reserved_quantity})</span>
                )}
              </div>
            </div>
            {/* Row 2: size details + LOT number + expiry */}
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {lot.model && (
                <span className="text-[10px] sm:text-[11px] text-muted-foreground">
                  {lot.model}
                </span>
              )}
              {(lot.diameter != null || lot.length != null) && (
                <span className="text-[10px] sm:text-[11px] text-muted-foreground">
                  {lot.diameter != null && lot.length != null
                    ? `Ø${lot.diameter} × ${lot.length}mm`
                    : lot.diameter != null
                    ? `Ø${lot.diameter}mm`
                    : `${lot.length}mm`}
                </span>
              )}
              {(lot.model || lot.diameter != null || lot.length != null) && (
                <span className="text-muted-foreground/30">|</span>
              )}
              <span className="text-[11px] font-mono text-muted-foreground">{lot.lot_number}</span>
              <span className="text-muted-foreground/30">|</span>
              <ExpiryBadge expiryDate={lot.expiry_date} compact />
            </div>
          </Link>
        )
      })}

      <p className="text-[10px] sm:text-[11px] text-muted-foreground text-right px-1 pt-1">
        แสดง {items.length} LOT (เรียงตามวันหมดอายุ)
      </p>
    </div>
  )
}
