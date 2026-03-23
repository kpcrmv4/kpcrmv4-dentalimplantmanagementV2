import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ArrowLeft, Plus, User, Calendar, ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const STATUS_LABELS: Record<string, string> = {
  pending_appointment: "รอทำนัด",
  pending_order: "รอสั่งของ",
  pending_preparation: "รอจัดของ",
  ready: "พร้อม",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
}

async function getPatient(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .single()
  if (error) return null
  return data
}

async function getPatientCases(patientId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("cases")
    .select("id, case_number, scheduled_date, case_status, procedure_type, users!cases_dentist_id_fkey(full_name)")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(20)
  if (error) return []
  return data ?? []
}

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const patientData = await getPatient(id)
  if (!patientData) notFound()
  // Cast to permissive type since schema may not include all columns
  const patient = patientData as Record<string, unknown>

  const cases = await getPatientCases(id)

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/patients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{patient.full_name as string}</h1>
          <p className="text-sm text-muted-foreground">HN: {patient.hn as string}</p>
        </div>
        <Button asChild size="sm">
          <Link href={`/cases/new?patient_id=${id}`}>
            <Plus className="mr-1 h-4 w-4" />
            สร้างเคสใหม่
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4" />
            ข้อมูลคนไข้
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">ชื่อ-นามสกุล:</span>
              <span className="ml-2 font-medium">{patient.full_name as string}</span>
            </div>
            <div>
              <span className="text-muted-foreground">HN:</span>
              <span className="ml-2 font-medium">{patient.hn as string}</span>
            </div>
            {patient.phone ? (
              <div>
                <span className="text-muted-foreground">เบอร์โทร:</span>
                <span className="ml-2">{patient.phone as string}</span>
              </div>
            ) : null}
            {patient.email ? (
              <div>
                <span className="text-muted-foreground">อีเมล:</span>
                <span className="ml-2">{patient.email as string}</span>
              </div>
            ) : null}
            {patient.date_of_birth ? (
              <div>
                <span className="text-muted-foreground">วันเกิด:</span>
                <span className="ml-2">{new Date(patient.date_of_birth as string).toLocaleDateString("th-TH")}</span>
              </div>
            ) : null}
            {patient.gender ? (
              <div>
                <span className="text-muted-foreground">เพศ:</span>
                <span className="ml-2">{patient.gender as string}</span>
              </div>
            ) : null}
            {patient.allergies ? (
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">แพ้ยา:</span>
                <span className="ml-2 text-destructive">{patient.allergies as string}</span>
              </div>
            ) : null}
            {patient.medical_history ? (
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">ประวัติการแพทย์:</span>
                <span className="ml-2">{patient.medical_history as string}</span>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ClipboardList className="h-4 w-4" />
            ประวัติเคส ({cases.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cases.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">ยังไม่มีเคส</p>
          ) : (
            <div className="space-y-2">
              {cases.map((c: Record<string, unknown>) => {
                const dentist = c.users as Record<string, string> | null
                return (
                  <Link key={c.id as string} href={`/cases/${c.id}`}>
                    <div className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{c.case_number as string}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {STATUS_LABELS[c.case_status as string] ?? (c.case_status as string)}
                          </Badge>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          {c.procedure_type ? <span>{c.procedure_type as string}</span> : null}
                          {dentist?.full_name ? <span>ทพ. {dentist.full_name}</span> : null}
                        </div>
                      </div>
                      {c.scheduled_date ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(c.scheduled_date as string).toLocaleDateString("th-TH")}
                        </div>
                      ) : null}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
