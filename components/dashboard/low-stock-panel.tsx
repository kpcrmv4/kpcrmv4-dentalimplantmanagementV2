import Link from "next/link"
import { Package } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getLowStockItems } from "@/lib/actions/dashboard"
import { cn } from "@/lib/utils"

export async function LowStockPanel() {
  const items = await getLowStockItems()

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
          <Package className="h-4 w-4 text-orange-500" />
          สต๊อกใกล้หมด
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            สต็อกปกติทุกรายการ
          </p>
        ) : (
          <div className="space-y-1.5">
            {items.map((item) => {
              const ratio = item.minStock > 0 ? item.totalStock / item.minStock : 0
              return (
                <Link key={item.id} href="/inventory">
                  <div className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{item.name}</p>
                      {item.brand && (
                        <p className="text-[10px] text-muted-foreground">{item.brand}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p
                        className={cn(
                          "text-xs font-semibold",
                          ratio <= 0.3 ? "text-red-600" : "text-orange-600"
                        )}
                      >
                        {item.totalStock} / {item.minStock}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{item.unit}</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
