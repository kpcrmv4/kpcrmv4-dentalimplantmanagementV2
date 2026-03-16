import Link from "next/link"
import { Package, ClipboardList, ShoppingCart, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const features = [
  {
    icon: ClipboardList,
    title: "จัดการเคส",
    description: "ติดตามเคสรักษา ตั้งแต่สร้างนัดจนเสร็จสิ้น พร้อมเลือกตำแหน่งฟัน",
  },
  {
    icon: Package,
    title: "จัดการสต็อก",
    description: "ติดตาม LOT/Expiry, FIFO, แจ้งเตือนใกล้หมดอายุ และสินค้าใกล้หมด",
  },
  {
    icon: ShoppingCart,
    title: "สั่งซื้อวัสดุ",
    description: "ใบสั่งซื้อ อนุมัติ ติดตามสถานะ และรับของเข้าคลัง",
  },
  {
    icon: Bell,
    title: "แจ้งเตือนอัตโนมัติ",
    description: "แจ้งเตือนผ่านแอป, LINE และ Push Notification ตามบทบาท",
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-background dark:to-background">
      {/* Hero */}
      <section className="px-4 py-20 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Package className="h-4 w-4" />
            Dental Implant Management
          </div>
          <h1 className="mb-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            ระบบจัดการสต็อกวัสดุ
            <br />
            <span className="text-primary">และรากฟันเทียม</span>
          </h1>
          <p className="mb-8 text-lg text-muted-foreground">
            จัดการเคส สต็อก ใบสั่งซื้อ และรายงาน ในที่เดียว
            พร้อมแจ้งเตือนอัตโนมัติสำหรับทุกบทบาท
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/login">เข้าสู่ระบบ</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Card key={feature.title} className="border-0 shadow-md">
              <CardHeader>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>Dental Implant Management v2.0</p>
      </footer>
    </div>
  )
}
