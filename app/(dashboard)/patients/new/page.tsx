"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createPatient } from "@/lib/actions/patients"
import { generateHN } from "@/lib/utils"

export default function NewPatientPage() {
  return (
    <Suspense>
      <NewPatientForm />
    </Suspense>
  )
}

function NewPatientForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [hn, setHn] = useState(generateHN())
  const [fullName, setFullName] = useState("")
  const [gender, setGender] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState("")

  const [imedOpen, setImedOpen] = useState(false)
  const [imedText, setImedText] = useState("")
  const [parseError, setParseError] = useState<string | null>(null)

  // Auto-fill form from URL parameters (e.g. ?NameFL=...&PatNum=...&PatientGenderMF=M&Birthdate_yyyyMMdd=19820126)
  useEffect(() => {
    const nameFL = searchParams.get("NameFL")
    const patNum = searchParams.get("PatNum")
    const genderMF = searchParams.get("PatientGenderMF")
    const birthdate = searchParams.get("Birthdate_yyyyMMdd")

    if (nameFL) setFullName(nameFL)
    if (patNum) setHn(patNum)
    if (genderMF === "M" || genderMF === "F") {
      setGender(genderMF)
    } else if (genderMF) {
      setGender("none")
    }
    if (birthdate && birthdate.length === 8) {
      setDateOfBirth(`${birthdate.slice(0, 4)}-${birthdate.slice(4, 6)}-${birthdate.slice(6, 8)}`)
    }
  }, [searchParams])

  function handleParse() {
    setParseError(null)
    try {
      const obj = JSON.parse(imedText)

      if (obj.NameFL) {
        setFullName(obj.NameFL)
      }
      if (obj.PatNum) {
        setHn(obj.PatNum)
      }
      if (obj.PatientGenderMF === "M") {
        setGender("M")
      } else if (obj.PatientGenderMF === "F") {
        setGender("F")
      } else {
        setGender("none")
      }
      if (obj.Birthdate_yyyyMMdd && obj.Birthdate_yyyyMMdd.length === 8) {
        const raw = obj.Birthdate_yyyyMMdd
        const formatted = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
        setDateOfBirth(formatted)
      }

      setImedOpen(false)
      setImedText("")
    } catch {
      setParseError("JSON ไม่ถูกต้อง กรุณาตรวจสอบข้อมูลที่วาง")
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.set("hn", hn)
      formData.set("full_name", fullName)
      formData.set("gender", gender === "none" ? "" : gender)
      formData.set("date_of_birth", dateOfBirth)
      await createPatient(formData)
      router.push("/patients")
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
          <Link href="/patients"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-xl font-semibold">เพิ่มคนไข้ใหม่</h1>
      </div>

      {/* iMed Import Section */}
      <Card>
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setImedOpen(!imedOpen)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">นำเข้าจาก iMed</CardTitle>
            {imedOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {imedOpen && (
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>วาง JSON Parameter จาก iMed</Label>
              <Textarea
                value={imedText}
                onChange={(e) => setImedText(e.target.value)}
                placeholder='{"NameFL": "สมชาย ใจดี", "PatNum": "HN12345", "PatientGenderMF": "M", "Birthdate_yyyyMMdd": "19820126"}'
                rows={4}
              />
            </div>
            {parseError && (
              <p className="text-sm text-destructive">{parseError}</p>
            )}
            <Button type="button" variant="secondary" onClick={handleParse}>
              แยกข้อมูล
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Patient Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ข้อมูลคนไข้</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>HN (Hospital Number)</Label>
                <Input value={hn} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">ชื่อ-นามสกุล *</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  required
                  placeholder="ชื่อ นามสกุล"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>เพศ</Label>
                <Select value={gender} onValueChange={setGender} name="gender">
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกเพศ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">ชาย</SelectItem>
                    <SelectItem value="F">หญิง</SelectItem>
                    <SelectItem value="none">ไม่ระบุ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">วันเกิด</Label>
                <Input
                  id="date_of_birth"
                  name="date_of_birth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              ข้อมูลอื่นๆ (เบอร์โทร, แพ้ยา, ประวัติ) ดูได้จากระบบ HIS (iMed)
            </p>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                บันทึก
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
