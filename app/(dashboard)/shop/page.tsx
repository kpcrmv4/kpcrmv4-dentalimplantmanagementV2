import { Suspense } from "react"
import { getProducts, getCategories } from "@/lib/actions/products"
import { ShopClient } from "./shop-client"

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; case_id?: string }>
}) {
  const params = await searchParams
  const category = params.category || undefined
  const search = params.q || undefined
  const caseId = params.case_id || null

  const [products, categories] = await Promise.all([
    getProducts({ category, search }),
    getCategories(),
  ])

  return (
    <Suspense fallback={<ShopSkeleton />}>
      <ShopClient
        products={products}
        currentCategory={category ?? null}
        currentSearch={search ?? ""}
        caseId={caseId}
        categories={categories}
      />
    </Suspense>
  )
}

function ShopSkeleton() {
  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="flex gap-2 overflow-x-auto">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 w-20 shrink-0 animate-pulse rounded-full bg-muted" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  )
}
