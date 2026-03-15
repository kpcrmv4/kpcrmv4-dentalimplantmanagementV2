import Link from "next/link"
import { FileQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-4 text-center">
      <FileQuestion className="h-12 w-12 text-muted-foreground" />
      <h2 className="text-lg font-semibold">ไม่พบหน้านี้</h2>
      <p className="text-sm text-muted-foreground">
        หน้าที่คุณกำลังมองหาอาจถูกย้ายหรือไม่มีอยู่แล้ว
      </p>
      <Button asChild>
        <Link href="/dashboard">กลับหน้าแรก</Link>
      </Button>
    </div>
  )
}
