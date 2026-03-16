"use client"

import { useRouter } from "next/navigation"
import { useState, useRef, useEffect } from "react"
import { Search, ShoppingCart, Plus, Package, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCartStore } from "@/lib/stores/cart-store"

const STOCK_COLOR: Record<string, string> = {
  high: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400",
  low: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400",
  out: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
}

function getStockLevel(stock: number): { label: string; color: string } {
  if (stock === 0) return { label: "หมดสต็อก", color: STOCK_COLOR.out }
  if (stock <= 3) return { label: `เหลือ ${stock}`, color: STOCK_COLOR.low }
  if (stock <= 10) return { label: `เหลือ ${stock}`, color: STOCK_COLOR.medium }
  return { label: `${stock} ชิ้น`, color: STOCK_COLOR.high }
}

interface ShopProduct {
  id: string
  ref: string
  name: string
  brand: string | null
  category: string
  unit: string
  totalStock: number
  supplierName: string | null
}

export function ShopClient({
  products,
  currentCategory,
  currentSearch,
  caseId,
  categories,
}: {
  products: ShopProduct[]
  currentCategory: string | null
  currentSearch: string
  caseId: string | null
  categories: Array<{ value: string; label: string }>
}) {
  const router = useRouter()
  const [searchValue, setSearchValue] = useState(currentSearch)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { addItem, items, setCaseContext, caseName } = useCartStore()
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)

  useEffect(() => {
    if (caseId) {
      setCaseContext(caseId, caseId)
    }
  }, [caseId, setCaseContext])

  function buildUrl(category: string | null, search?: string) {
    const params = new URLSearchParams()
    if (category) params.set("category", category)
    if (search) params.set("q", search)
    if (caseId) params.set("case_id", caseId)
    return `/shop?${params.toString()}`
  }

  function handleSearch(q: string) {
    setSearchValue(q)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      router.push(buildUrl(currentCategory, q))
    }, 300)
  }

  function handleAddToCart(product: ShopProduct) {
    addItem({
      productId: product.id,
      name: product.name,
      ref: product.ref,
      brand: product.brand,
      unit: product.unit,
      category: product.category,
    })
  }

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {caseId ? (
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/cases/${caseId}`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          ) : null}
          <div>
            <h1 className="text-xl font-semibold">สั่งวัสดุ</h1>
            {caseName ? (
              <p className="text-xs text-muted-foreground">เคส: {caseName}</p>
            ) : null}
          </div>
        </div>
        <Button variant="outline" size="sm" asChild className="relative">
          <Link href={caseId ? `/cart?case_id=${caseId}` : "/cart"}>
            <ShoppingCart className="mr-1 h-4 w-4" />
            ตะกร้า
            {itemCount > 0 ? (
              <Badge className="absolute -right-2 -top-2 h-5 min-w-5 rounded-full px-1 text-[10px]">
                {itemCount}
              </Badge>
            ) : null}
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="ค้นหาวัสดุ, REF, แบรนด์..."
          className="pl-9"
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {/* Category Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollSnapType: "x mandatory" }}>
        {[{ value: "", label: "ทั้งหมด" }, ...categories].map((cat) => (
          <button
            key={cat.value || "all"}
            onClick={() => router.push(buildUrl(cat.value || null, searchValue))}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              (currentCategory ?? "") === cat.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
            style={{ scrollSnapAlign: "start" }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Package className="mb-2 h-10 w-10" />
          <p className="text-sm">ไม่พบสินค้า</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => {
            const stock = getStockLevel(product.totalStock)
            const inCart = items.find((i) => i.productId === product.id)

            return (
              <div
                key={product.id}
                className="flex flex-col rounded-lg border bg-card p-3 transition-shadow hover:shadow-sm"
              >
                {/* Product Info */}
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-tight line-clamp-2">
                    {product.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {product.brand ?? ""} · {product.ref}
                  </p>
                  {product.supplierName ? (
                    <p className="text-[10px] text-muted-foreground">{product.supplierName}</p>
                  ) : null}
                </div>

                {/* Stock + Action */}
                <div className="mt-2 flex items-center justify-between">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${stock.color}`}>
                    {stock.label}
                  </span>
                  {product.totalStock > 0 ? (
                    <Button
                      size="icon"
                      variant={inCart ? "default" : "outline"}
                      className="h-7 w-7"
                      onClick={() => handleAddToCart(product)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <span className="text-[10px] text-destructive">หมด</span>
                  )}
                </div>
                {inCart ? (
                  <p className="mt-1 text-center text-[10px] text-primary">
                    ในตะกร้า: {inCart.quantity} {product.unit}
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
