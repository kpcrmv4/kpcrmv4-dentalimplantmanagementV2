import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Plus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PatientSearch } from "./patient-search"

async function getPatients(search?: string) {
  const supabase = await createClient()
  let query = supabase
    .from("patients")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50)

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,hn.ilike.%${search}%`
    )
  }

  const { data, error } = await query
  if (error) return []
  return data ?? []
}

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const params = await searchParams
  const patients = await getPatients(params.q)

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">รายการคนไข้</h1>
          <p className="text-sm text-muted-foreground">
            ทั้งหมด {patients.length} คน
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/patients/new">
            <Plus className="mr-1 h-4 w-4" />
            เพิ่มคนไข้
          </Link>
        </Button>
      </div>

      {/* Search */}
      <PatientSearch defaultValue={params.q} />

      {/* Patient List */}
      {patients.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {params.q ? "ไม่พบคนไข้ที่ค้นหา" : "ยังไม่มีข้อมูลคนไข้"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {patients.map((patient: Record<string, unknown>) => (
            <Card key={patient.id as string}>
              <CardContent className="flex items-center gap-3 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                  {(patient.full_name as string).charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">
                      {patient.full_name as string}
                    </p>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {patient.hn as string}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    HN: {patient.hn as string}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
