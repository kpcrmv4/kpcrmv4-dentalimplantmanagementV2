import Link from "next/link"
import { ArrowLeft, Truck, Phone, Mail, MapPin, Clock, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  getSupplierDetails,
  getSupplierPOHistory,
  calculateDeliveryScore,
} from "@/lib/actions/suppliers"
import { formatDate, formatCurrency } from "@/lib/utils"

const PO_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "แบบร่าง", color: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400" },
  pending_approval: { label: "รออนุมัติ", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400" },
  approved: { label: "อนุมัติแล้ว", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" },
  ordered: { label: "สั่งแล้ว", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400" },
  received: { label: "รับครบ", color: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" },
  cancelled: { label: "ยกเลิก", color: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" },
}

function scoreColor(score: number | null) {
  if (score === null || score === undefined) return "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400"
  if (score >= 7) return "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
  if (score >= 5) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400"
  return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
}

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [supplier, poHistory, deliveryScore] = await Promise.all([
    getSupplierDetails(id),
    getSupplierPOHistory(id),
    calculateDeliveryScore(id),
  ])

  const score = deliveryScore ?? supplier.delivery_score ?? null

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/suppliers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">{supplier.name}</h1>
          <p className="text-sm text-muted-foreground font-mono">{supplier.code}</p>
        </div>
        <div className="ml-auto">
          <Badge
            variant="secondary"
            className={`text-lg px-4 py-1 ${scoreColor(score)}`}
          >
            <Star className="mr-1 h-4 w-4" />
            {score !== null ? score.toFixed(1) : "-"} / 10
          </Badge>
        </div>
      </div>

      {/* Supplier Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="h-4 w-4" />
            ข้อมูล Supplier
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">โทรศัพท์</p>
                  <p className="text-sm">{supplier.phone ?? "-"}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">อีเมล</p>
                  <p className="text-sm">{supplier.email ?? "-"}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">LINE ID</p>
                <p className="text-sm">{supplier.line_id ?? "-"}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">ผู้ติดต่อ</p>
                <p className="text-sm">{supplier.contact_person ?? "-"}</p>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">ที่อยู่</p>
                  <p className="text-sm">{supplier.address ?? "-"}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Lead Time</p>
                  <p className="text-sm">
                    {supplier.lead_time_days !== null
                      ? `${supplier.lead_time_days} วัน`
                      : "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">สถานะ:</span>
            <Badge
              variant={supplier.is_active ? "default" : "secondary"}
              className={
                supplier.is_active
                  ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-500/20 dark:text-gray-400"
              }
            >
              {supplier.is_active ? "ใช้งาน" : "ปิดใช้งาน"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* PO History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ประวัติใบสั่งซื้อ</CardTitle>
        </CardHeader>
        <CardContent>
          {!poHistory || poHistory.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              ยังไม่มีประวัติใบสั่งซื้อ
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="text-center">จำนวนรายการ</TableHead>
                    <TableHead className="text-right">ยอดรวม</TableHead>
                    <TableHead>วันที่สั่ง</TableHead>
                    <TableHead>วันที่คาดรับ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {poHistory.map((po) => {
                    const statusConfig =
                      PO_STATUS_CONFIG[po.status] ?? PO_STATUS_CONFIG.draft
                    return (
                      <TableRow key={po.id}>
                        <TableCell>
                          <Link
                            href="/orders"
                            className="text-sm font-medium hover:underline"
                          >
                            {po.po_number}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={statusConfig.color}
                          >
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {po.items_count}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {po.total_amount
                            ? formatCurrency(Number(po.total_amount))
                            : "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {po.created_at ? formatDate(po.created_at) : "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {po.expected_delivery_date
                            ? formatDate(po.expected_delivery_date)
                            : "-"}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
