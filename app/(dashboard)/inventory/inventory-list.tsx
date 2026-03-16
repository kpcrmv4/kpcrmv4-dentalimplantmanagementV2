"use client"

import { useState } from "react"
import Link from "next/link"
import { LayoutList, LayoutGrid, AlertTriangle, ChevronRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

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

export function InventoryList({ products }: { products: Product[] }) {
  const [view, setView] = useState<"card" | "compact">("compact")

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
