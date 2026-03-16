import Link from "next/link"
import { Plus, Package, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getStockSummary, getProductIdsWithActivePOs, getInventoryByLot } from "@/lib/actions/inventory"
import { InventorySearch } from "./inventory-search"
import { InventoryList } from "./inventory-list"

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; view?: string; expiry_before?: string }>
}) {
  const params = await searchParams
  const search = params.q || ""
  const filter = params.filter || ""
  const view = params.view || ""
  const expiryBefore = params.expiry_before || ""

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

    if (search) {
      const q = search.toLowerCase()
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.ref.toLowerCase().includes(q) ||
          (p.brand?.toLowerCase().includes(q) ?? false)
      )
    }
    if (filter === "low") {
      products = products.filter((p) => p.isLowStock)
    }
    if (filter === "ordering") {
      const activePOProductIds = await getProductIdsWithActivePOs()
      products = products.filter((p) => activePOProductIds.has(p.id))
    }
  }

  const lowStockCount = isLotView ? 0 : products.filter((p) => p.isLowStock).length
  const isEmpty = isLotView ? lotItems.length === 0 : products.length === 0

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">สต็อกวัสดุ</h1>
          {lowStockCount > 0 ? (
            <p className="flex items-center gap-1 text-xs text-orange-600">
              <AlertTriangle className="h-3 w-3" />
              {lowStockCount} รายการใกล้หมด
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href="/inventory/products/new">
              <Plus className="mr-1 h-4 w-4" />
              เพิ่มสินค้า
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/inventory/receive">
              <Plus className="mr-1 h-4 w-4" />
              รับของเข้า
            </Link>
          </Button>
        </div>
      </div>

      <InventorySearch
        defaultValue={search}
        currentFilter={filter}
        currentView={view}
        currentExpiryBefore={expiryBefore}
      />

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Package className="mb-2 h-10 w-10" />
          <p className="text-sm">ไม่พบสินค้า</p>
        </div>
      ) : isLotView ? (
        <InventoryList products={[]} lotItems={lotItems} viewMode="lot" />
      ) : (
        <InventoryList products={products} lotItems={[]} viewMode="product" />
      )}
    </div>
  )
}
