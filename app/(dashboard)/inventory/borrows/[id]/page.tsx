import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Package, Calendar, User, Image as ImageIcon, Check, ArrowLeftRight, DollarSign, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { getBorrowById } from "@/lib/actions/borrows"
import { formatCurrency } from "@/lib/utils"
import { SettleButton, PhotoUploadButton } from "./settle-button"
import { CancelBorrowButton } from "./cancel-borrow-button"

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

export default async function BorrowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let borrow
  try {
    borrow = await getBorrowById(id)
  } catch {
    notFound()
  }
  if (!borrow) notFound()

  const st = STATUS_LABELS[borrow.status as string] ?? { label: borrow.status, variant: "outline" as const }
  const requester = borrow.users as Record<string, string> | null

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/inventory/borrows"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{borrow.borrow_number}</h1>
            <Badge variant={st.variant}>{st.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {borrow.source_type === "clinic" ? "คลินิก" : "Supplier"}: {borrow.source_name}
          </p>
        </div>
        <CancelBorrowButton
          borrowId={id}
          borrowNumber={borrow.borrow_number as string}
          status={borrow.status as string}
        />
      </div>

      {/* Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">ข้อมูลการยืม</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">วันที่ยืม:</span>
              <span className="ml-1">{new Date(borrow.borrow_date).toLocaleDateString("th-TH")}</span>
            </div>
            {borrow.due_date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">กำหนดคืน:</span>
                <span className="ml-1">{new Date(borrow.due_date).toLocaleDateString("th-TH")}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">ผู้ยืม:</span>
              <span className="ml-1">{requester?.full_name ?? "ไม่ระบุ"}</span>
            </div>
            {borrow.notes && (
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">หมายเหตุ:</span>
                <span className="ml-1">{borrow.notes}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4" />
            รายการสินค้า ({borrow.items?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(borrow.items ?? []).length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">ไม่มีรายการ</p>
          ) : (
            <div className="space-y-2">
              {(borrow.items as Array<Record<string, unknown>>).map((item) => {
                const product = item.products as Record<string, string> | null
                const itemSt = STATUS_LABELS[item.status as string] ?? { label: item.status as string, variant: "outline" as const }
                const caseData = item.cases as Record<string, string> | null
                const settlementProduct = item.settlement_product as Record<string, string> | null
                const isSettled = !!item.settlement_type
                const settlementType = item.settlement_type as string | null

                return (
                  <div key={item.id as string} className="rounded-lg border overflow-hidden">
                    {/* Item header */}
                    <div className="flex items-center gap-3 p-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{product?.name ?? "ไม่ทราบ"}</span>
                          <Badge variant={itemSt.variant} className="text-[10px]">{itemSt.label}</Badge>
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          <span>จำนวน: {item.quantity as number} {product?.unit ?? "ชิ้น"}</span>
                          {Number(item.unit_price) > 0 && (
                            <span>ราคา: {formatCurrency(Number(item.unit_price))}/{product?.unit ?? "ชิ้น"}</span>
                          )}
                          {caseData?.case_number && <span>เคส: {caseData.case_number}</span>}
                        </div>
                      </div>
                      {(item.status as string) === "borrowed" && (
                        <SettleButton
                          itemId={item.id as string}
                          productName={product?.name}
                          quantity={item.quantity as number}
                          unitPrice={item.unit_price ? Number(item.unit_price) : undefined}
                        />
                      )}
                    </div>

                    {/* Settlement details */}
                    {isSettled && (
                      <>
                        <Separator />
                        <div className="bg-muted/30 px-3 py-2.5 space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs font-medium">
                            {settlementType === "return" && <Check className="h-3.5 w-3.5 text-green-600" />}
                            {settlementType === "exchange" && <ArrowLeftRight className="h-3.5 w-3.5 text-blue-600" />}
                            {settlementType === "payment" && <DollarSign className="h-3.5 w-3.5 text-amber-600" />}
                            <span>
                              {settlementType === "return" ? "คืนของให้ Supplier" :
                               settlementType === "exchange" ? "แลกสินค้า" :
                               "ชำระเงิน"}
                            </span>
                          </div>

                          <div className="grid gap-1 text-xs text-muted-foreground">
                            {/* Payment amount */}
                            {settlementType === "payment" && Number(item.settlement_amount) > 0 && (
                              <div className="flex items-center gap-1">
                                <span>จำนวนเงิน:</span>
                                <span className="font-medium text-foreground">{formatCurrency(Number(item.settlement_amount))}</span>
                                {Number(item.unit_price) > 0 && (
                                  <span className="text-[10px]">
                                    (อ้างอิง: {formatCurrency(Number(item.unit_price) * Number(item.quantity))})
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Exchange product */}
                            {settlementType === "exchange" && settlementProduct != null ? (
                              <div className="flex items-center gap-1">
                                <span>สินค้าที่แลก:</span>
                                <span className="font-medium text-foreground">
                                  {settlementProduct.name}
                                  {settlementProduct.ref ? ` (${settlementProduct.ref})` : ""}
                                </span>
                              </div>
                            ) : null}

                            {/* Settlement date */}
                            {item.settled_at != null ? (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>วันที่ชำระ: {new Date(item.settled_at as string).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                              </div>
                            ) : null}

                            {/* Settlement note */}
                            {item.settlement_note != null ? (
                              <div className="mt-0.5">
                                <span>หมายเหตุ: </span>
                                <span className="italic">{String(item.settlement_note)}</span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photos */}
      {(borrow.photos ?? []).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ImageIcon className="h-4 w-4" />
              รูปภาพหลักฐาน ({borrow.photos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(borrow.photos as Array<Record<string, unknown>>).map((photo) => (
                <div key={photo.id as string} className="space-y-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.photo_url as string}
                    alt={photo.description as string ?? "หลักฐาน"}
                    className="h-32 w-full rounded-lg border object-cover"
                  />
                  {photo.description ? (
                    <p className="text-[10px] text-muted-foreground">{photo.description as string}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(borrow.status as string) === "borrowed" && (
        <PhotoUploadButton borrowId={id} />
      )}
    </div>
  )
}
