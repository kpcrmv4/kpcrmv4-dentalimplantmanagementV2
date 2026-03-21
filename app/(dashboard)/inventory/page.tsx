import Link from "next/link"
import { Plus, Package, PackageCheck, Clock, TrendingDown, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getStockSummary, getProductIdsWithActivePOs, getInventoryByLot } from "@/lib/actions/inventory"
import { getCategories } from "@/lib/actions/products"
import { getBrands } from "@/lib/actions/settings"
import { InventorySearch } from "./inventory-search"
import { InventoryList } from "./inventory-list"

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; view?: string; expiry_before?: string; category?: string; brand?: string; model?: string; diameter?: string; length?: string }>
}) {
  const params = await searchParams
  const search = params.q || ""
  const filter = params.filter || ""
  const view = params.view || ""
  const expiryBefore = params.expiry_before || ""
  const category = params.category || ""
  const brand = params.brand || ""
  const model = params.model || ""
  const diameter = params.diameter || ""
  const length = params.length || ""

  const isLotView = view === "lot"

  // Fetch data based on view mode
  let products: Awaited<ReturnType<typeof getStockSummary>> = []
  let lotItems: Awaited<ReturnType<typeof getInventoryByLot>> = []

  if (isLotView) {
    lotItems = await getInventoryByLot({
      search: search || undefined,
      expiry_before: expiryBefore || undefined,
    })
  } else {
    products = await getStockSummary()
  }

  const [categories, brandsData] = await Promise.all([getCategories(), getBrands()])
  const activeBrands = brandsData.filter((b: { is_active: boolean }) => b.is_active)

  // Extract distinct filter values from products
  const distinctModels = Array.from(new Set(products.map((p) => p.model).filter(Boolean))) as string[]
  const distinctDiameters = Array.from(new Set(products.map((p) => p.diameter).filter((d) => d != null))).map(String).sort((a, b) => Number(a) - Number(b))
  const distinctLengths = Array.from(new Set(products.map((p) => p.length).filter((l) => l != null))).map(String).sort((a, b) => Number(a) - Number(b))

  // Compute summary from unfiltered product data
  const totalProducts = products.length
  const lowStockCount = products.filter((p) => p.isLowStock).length
  const totalStockQty = products.reduce((s, p) => s + p.totalStock, 0)

  // Count expiring lots (within 90 days)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const ninetyDaysLater = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

  let expiringLotCount = 0
  if (isLotView) {
    expiringLotCount = lotItems.filter((l) => {
      if (!l.expiry_date) return false
      const d = new Date(l.expiry_date)
      return d <= ninetyDaysLater
    }).length
  }

  // Apply filters after computing summary (so summary reflects totals)
  let filteredProducts = products
  if (!isLotView) {
    if (search) {
      const q = search.toLowerCase()
      filteredProducts = filteredProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.ref.toLowerCase().includes(q) ||
          (p.brand?.toLowerCase().includes(q) ?? false)
      )
    }
    if (filter === "low") {
      filteredProducts = filteredProducts.filter((p) => p.isLowStock)
    }
    if (filter === "ordering") {
      const activePOProductIds = await getProductIdsWithActivePOs()
      filteredProducts = filteredProducts.filter((p) => activePOProductIds.has(p.id))
    }
    if (category) {
      filteredProducts = filteredProducts.filter((p) => p.category === category)
    }
    if (brand) {
      filteredProducts = filteredProducts.filter((p) => p.brand?.toLowerCase() === brand.toLowerCase())
    }
    if (model) {
      filteredProducts = filteredProducts.filter((p) => p.model?.toLowerCase() === model.toLowerCase())
    }
    if (diameter) {
      filteredProducts = filteredProducts.filter((p) => p.diameter != null && String(p.diameter) === diameter)
    }
    if (length) {
      filteredProducts = filteredProducts.filter((p) => p.length != null && String(p.length) === length)
    }
  }

  const isEmpty = isLotView ? lotItems.length === 0 : filteredProducts.length === 0

  return (
    <div className="space-y-3 p-3 sm:p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg sm:text-xl font-semibold">สต็อกวัสดุ</h1>
        <div className="flex gap-1.5 sm:gap-2">
          <Button size="sm" variant="ghost" asChild className="h-8 text-xs sm:text-sm">
            <Link href="/inventory/settings">
              <Settings className="mr-1 h-3.5 w-3.5" />
              <span className="hidden sm:inline">ตั้งค่า</span>
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild className="h-8 text-xs sm:text-sm">
            <Link href="/inventory/products/new">
              <Plus className="mr-1 h-3.5 w-3.5" />
              <span className="hidden sm:inline">เพิ่มสินค้า</span>
              <span className="sm:hidden">เพิ่ม</span>
            </Link>
          </Button>
          <Button size="sm" asChild className="h-8 text-xs sm:text-sm">
            <Link href="/inventory/receive">
              <Plus className="mr-1 h-3.5 w-3.5" />
              <span className="hidden sm:inline">รับของเข้า</span>
              <span className="sm:hidden">รับของ</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards - only show in product view */}
      {!isLotView && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <SummaryCard
            icon={<PackageCheck className="h-4 w-4 text-blue-600" />}
            label="สินค้าทั้งหมด"
            value={totalProducts}
            unit="รายการ"
            color="blue"
          />
          <SummaryCard
            icon={<Package className="h-4 w-4 text-green-600" />}
            label="สต็อกรวม"
            value={totalStockQty}
            unit="ชิ้น"
            color="green"
          />
          <SummaryCard
            icon={<TrendingDown className="h-4 w-4 text-orange-600" />}
            label="ใกล้หมด"
            value={lowStockCount}
            unit="รายการ"
            color={lowStockCount > 0 ? "orange" : "green"}
            highlight={lowStockCount > 0}
          />
          <SummaryCard
            icon={<Clock className="h-4 w-4 text-red-600" />}
            label="ใกล้หมดอายุ"
            value="—"
            sublabel="ดูในโหมด LOT"
            color="gray"
          />
        </div>
      )}

      {/* Summary Cards - LOT view */}
      {isLotView && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          <SummaryCard
            icon={<Package className="h-4 w-4 text-blue-600" />}
            label="LOT ทั้งหมด"
            value={lotItems.length}
            unit="รายการ"
            color="blue"
          />
          <SummaryCard
            icon={<Clock className="h-4 w-4 text-orange-600" />}
            label="ใกล้หมดอายุ (90 วัน)"
            value={expiringLotCount}
            unit="LOT"
            color={expiringLotCount > 0 ? "orange" : "green"}
            highlight={expiringLotCount > 0}
          />
          <SummaryCard
            icon={<PackageCheck className="h-4 w-4 text-green-600" />}
            label="สต็อกรวม"
            value={lotItems.reduce((s, l) => s + l.available, 0)}
            unit="ชิ้น"
            color="green"
            className="col-span-2 sm:col-span-1"
          />
        </div>
      )}

      {/* Search & Filters */}
      <InventorySearch
        defaultValue={search}
        currentFilter={filter}
        currentView={view}
        currentExpiryBefore={expiryBefore}
        lowStockCount={lowStockCount}
        currentCategory={category}
        currentBrand={brand}
        currentModel={model}
        currentDiameter={diameter}
        currentLength={length}
        categories={categories}
        brands={activeBrands}
        models={distinctModels}
        diameters={distinctDiameters}
        lengths={distinctLengths}
      />

      {/* List */}
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Package className="mb-3 h-12 w-12 opacity-40" />
          <p className="text-sm font-medium">ไม่พบสินค้า</p>
          <p className="text-xs mt-1">ลองเปลี่ยนคำค้นหาหรือตัวกรอง</p>
        </div>
      ) : isLotView ? (
        <InventoryList products={[]} lotItems={lotItems} viewMode="lot" />
      ) : (
        <InventoryList products={filteredProducts} lotItems={[]} viewMode="product" />
      )}
    </div>
  )
}

function SummaryCard({
  icon,
  label,
  value,
  unit,
  sublabel,
  color,
  highlight,
  className,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  unit?: string
  sublabel?: string
  color: "blue" | "green" | "orange" | "red" | "gray"
  highlight?: boolean
  className?: string
}) {
  const bgMap = {
    blue: "bg-blue-50 dark:bg-blue-950/30",
    green: "bg-green-50 dark:bg-green-950/30",
    orange: "bg-orange-50 dark:bg-orange-950/30",
    red: "bg-red-50 dark:bg-red-950/30",
    gray: "bg-muted/50",
  }
  const valueColorMap = {
    blue: "text-blue-700 dark:text-blue-300",
    green: "text-green-700 dark:text-green-300",
    orange: "text-orange-700 dark:text-orange-300",
    red: "text-red-700 dark:text-red-300",
    gray: "text-muted-foreground",
  }

  return (
    <div
      className={`rounded-xl border p-2.5 sm:p-3 ${bgMap[color]} ${
        highlight ? "ring-1 ring-orange-300 dark:ring-orange-700" : ""
      } ${className ?? ""}`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] sm:text-xs text-muted-foreground font-medium truncate">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-lg sm:text-2xl font-bold ${valueColorMap[color]}`}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        {unit && (
          <span className="text-[10px] sm:text-xs text-muted-foreground">{unit}</span>
        )}
      </div>
      {sublabel && (
        <span className="text-[9px] sm:text-[10px] text-muted-foreground">{sublabel}</span>
      )}
    </div>
  )
}
