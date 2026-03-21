"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToothPositionSelector } from "@/components/features/tooth-position-selector"
import { createCase, getDentists } from "@/lib/actions/cases"
import { searchPatients, getPatientById } from "@/lib/actions/patients"
import { getProcedureTypes } from "@/lib/actions/settings"

export default function NewCasePage() {
  return (
    <Suspense fallback={<div className="p-6">กำลังโหลด...</div>}>
      <NewCaseForm />
    </Suspense>
  )
}

function NewCaseForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Patient search
  const [patientQuery, setPatientQuery] = useState("")
  const [patientResults, setPatientResults] = useState<Array<{ id: string; hn: string; full_name: string }>>([])
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; hn: string; full_name: string } | null>(null)

  // Staff lists
  const [dentists, setDentists] = useState<Array<{ id: string; full_name: string }>>([])

  const [procedureTypes, setProcedureTypes] = useState<Array<{ id: string; name: string; is_active: boolean }>>([])

  // Form fields (managed state for Radix Select)
  const [procedureType, setProcedureType] = useState("")
  const [dentistId, setDentistId] = useState("")

  // Tooth positions
  const [toothPositions, setToothPositions] = useState<number[]>([])

  useEffect(() => {
    Promise.all([getDentists(), getProcedureTypes()]).then(([d, pt]) => {
      setDentists(d)
      setProcedureTypes(pt)
    })

    // Auto-select patient if patient_id is provided in URL
    const patientId = searchParams.get("patient_id")
    if (patientId) {
      getPatientById(patientId).then((patient) => {
        if (patient) {
          setSelectedPatient({
            id: patient.id,
            hn: patient.hn,
            full_name: patient.full_name,
          })
        }
      }).catch(() => {
        // Patient not found, user can search manually
      })
    }
  }, [searchParams])

  async function handlePatientSearch(query: string) {
    setPatientQuery(query)
    if (query.length < 2) {
      setPatientResults([])
      return
    }
    const results = await searchPatients(query)
    setPatientResults(results)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedPatient) {
      setError("กรุณาเลือกคนไข้")
      return
    }
    if (!dentistId) {
      setError("กรุณาเลือกแพทย์ผู้รักษา")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData(e.currentTarget)
      formData.set("patient_id", selectedPatient.id)
      formData.set("dentist_id", dentistId)
      formData.set("procedure_type", procedureType)

      formData.set("tooth_positions", JSON.stringify(toothPositions))
      const result = await createCase(formData)
      router.push(`/cases/${result.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/cases"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-xl font-semibold">สร้างเคสใหม่</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {/* Step 1: Patient Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. เลือกคนไข้</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedPatient ? (
              <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
                <div>
                  <p className="text-sm font-medium">{selectedPatient.full_name}</p>
                  <p className="text-xs text-muted-foreground">HN: {selectedPatient.hn}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedPatient(null)}>
                  เปลี่ยน
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="ค้นหาชื่อหรือ HN..."
                    className="pl-9"
                    value={patientQuery}
                    onChange={(e) => handlePatientSearch(e.target.value)}
                  />
                </div>
                {patientResults.length > 0 && (
                  <div className="space-y-1 rounded-lg border p-2">
                    {patientResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedPatient(p)
                          setPatientResults([])
                          setPatientQuery("")
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                      >
                        <span className="font-medium">{p.full_name}</span>
                        <span className="text-xs text-muted-foreground">({p.hn})</span>
                      </button>
                    ))}
                  </div>
                )}
                <Button type="button" variant="outline" size="sm" asChild>
                  <Link href="/patients/new">+ สร้างคนไข้ใหม่</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Tooth Positions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. ตำแหน่งฟัน</CardTitle>
          </CardHeader>
          <CardContent>
            <ToothPositionSelector
              selected={toothPositions}
              onChange={setToothPositions}
            />
          </CardContent>
        </Card>

        {/* Step 3: Treatment Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. รายละเอียดการรักษา</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>ประเภทหัตถการ</Label>
                <Select value={procedureType} onValueChange={setProcedureType}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกหัตถการ" />
                  </SelectTrigger>
                  <SelectContent>
                    {procedureTypes.filter((pt: { id: string; name: string; is_active: boolean }) => pt.is_active).map((pt: { id: string; name: string }) => (
                      <SelectItem key={pt.id} value={pt.name}>{pt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>แพทย์ผู้รักษา *</Label>
                <Select value={dentistId} onValueChange={setDentistId}>
                  <SelectTrigger className={!dentistId && error ? "border-destructive" : ""}>
                    <SelectValue placeholder="เลือกแพทย์" />
                  </SelectTrigger>
                  <SelectContent>
                    {dentists.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduled_date">วันนัด</Label>
                <Input id="scheduled_date" name="scheduled_date" type="date" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduled_time">เวลานัด</Label>
                <Input id="scheduled_time" name="scheduled_time" type="time" />
              </div>

            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">หมายเหตุ</Label>
              <Textarea id="notes" name="notes" placeholder="หมายเหตุเพิ่มเติม..." rows={3} />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            ยกเลิก
          </Button>
          <Button type="submit" disabled={loading || !selectedPatient}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            สร้างเคส
          </Button>
        </div>
      </form>
    </div>
  )
}
