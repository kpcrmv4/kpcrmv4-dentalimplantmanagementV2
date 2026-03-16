import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  getProductDetail,
  getProductOrderHistory,
  getProductUsageHistory,
  getCategories,
} from "@/lib/actions/products"
import { getSuppliers } from "@/lib/actions/inventory"
import { ProductDetailClient } from "./product-detail-client"

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let product: Awaited<ReturnType<typeof getProductDetail>>
  let orderHistory: Awaited<ReturnType<typeof getProductOrderHistory>>
  let usageHistory: Awaited<ReturnType<typeof getProductUsageHistory>>

  try {
    ;[product, orderHistory, usageHistory] = await Promise.all([
      getProductDetail(id),
      getProductOrderHistory(id),
      getProductUsageHistory(id),
    ])
  } catch {
    notFound()
  }

  const [categories, suppliers] = await Promise.all([
    getCategories(),
    getSuppliers(),
  ])

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/inventory">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{product.name}</h1>
          <p className="text-xs text-muted-foreground">REF: {product.ref}</p>
        </div>
      </div>

      {/* Client Component with all interactive parts */}
      <ProductDetailClient
        product={product}
        orderHistory={orderHistory}
        usageHistory={usageHistory}
        categories={[...categories]}
        suppliers={suppliers}
      />
    </div>
  )
}
