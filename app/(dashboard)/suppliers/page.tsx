import { Truck } from "lucide-react"
import { getAllSuppliers } from "@/lib/actions/suppliers"
import { SupplierList } from "./supplier-list"

export default async function SuppliersPage() {
  const suppliers = await getAllSuppliers()

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">จัดการ Supplier</h1>
          <p className="text-sm text-muted-foreground">
            ทั้งหมด {suppliers?.length ?? 0} ราย
          </p>
        </div>
      </div>

      {suppliers && suppliers.length > 0 ? (
        <SupplierList suppliers={suppliers} />
      ) : (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <Truck className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลซัพพลายเออร์</p>
        </div>
      )}
    </div>
  )
}
