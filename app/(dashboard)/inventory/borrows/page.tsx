import Link from "next/link"
import { Plus, ArrowLeftRight, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getBorrows } from "@/lib/actions/borrows"

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  borrowed: { label: "ยืมอยู่", variant: "destructive" },
  returned: { label: "คืนแล้ว", variant: "default" },
  exchanged: { label: "แลกแล้ว", variant: "secondary" },
  paid: { label: "ชำระแล้ว", variant: "secondary" },
  partially_returned: { label: "คืนบางส่วน", variant: "outline" },
  sent: { label: "ส่งแล้ว", variant: "secondary" },
  pending_approval: { label: "รออนุมัติ", variant: "outline" },
  closed: { label: "ปิดแล้ว", variant: "default" },
  cancelled: { label: "ยกเลิก", variant: "destructive" },
}

const SOURCE_LABELS: Record<string, string> = {
  clinic: "คลินิก",
  supplier: "Supplier",
}

export default async function BorrowsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; source?: string; q?: string }>
}) {
  const params = await searchParams
  const borrows = await getBorrows({
    status: params.status,
    source_type: params.source,
    search: params.q,
  })

  const activeBorrows = borrows.filter((b: { status: string }) => b.status === "borrowed").length

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">ยืม/แลกของ</h1>
          <p className="text-sm text-muted-foreground">
            {borrows.length} รายการ ({activeBorrows} ยืมอยู่)
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/inventory/borrows/new">
            <Plus className="mr-1 h-4 w-4" />
            สร้างรายการยืม
          </Link>
        </Button>
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 flex-wrap">
        <Link href="/inventory/borrows">
          <Badge variant={!params.status ? "default" : "outline"} className="cursor-pointer">ทั้งหมด</Badge>
        </Link>
        <Link href="/inventory/borrows?status=borrowed">
          <Badge variant={params.status === "borrowed" ? "destructive" : "outline"} className="cursor-pointer">ยืมอยู่</Badge>
        </Link>
        <Link href="/inventory/borrows?status=returned">
          <Badge variant={params.status === "returned" ? "default" : "outline"} className="cursor-pointer">คืนแล้ว</Badge>
        </Link>
        <Link href="/inventory/borrows?status=paid">
          <Badge variant={params.status === "paid" ? "secondary" : "outline"} className="cursor-pointer">ชำระแล้ว</Badge>
        </Link>
      </div>

      {borrows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <ArrowLeftRight className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">ไม่มีรายการยืม/แลก</p>
        </div>
      ) : (
        <div className="space-y-2">
          {borrows.map((b: { id: string; borrow_number: string; source_type: string; source_name: string; status: string; borrow_date: string; item_count: number }) => {
            const st = STATUS_LABELS[b.status] ?? { label: b.status, variant: "outline" as const }
            return (
              <Link key={b.id} href={`/inventory/borrows/${b.id}`}>
                <Card className="transition-colors hover:bg-muted/50">
                  <CardContent className="flex items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{b.borrow_number}</span>
                        <Badge variant={st.variant} className="text-[10px]">{st.label}</Badge>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{SOURCE_LABELS[b.source_type] ?? b.source_type}: {b.source_name}</span>
                        <span>{b.item_count} รายการ</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(b.borrow_date).toLocaleDateString("th-TH")}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
