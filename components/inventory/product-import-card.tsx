"use client"

import { useState, useRef, useTransition } from "react"
import ExcelJS from "exceljs"
import { Download, Upload, Loader2, AlertTriangle, CheckCircle2, Pencil, X, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getTemplateData, validateImportData, bulkCreateProducts } from "@/lib/actions/product-import"
import type { ImportProductRow } from "@/lib/actions/product-import"

// ─── Excel Template Column Definitions ─────────────────────────────

const TEMPLATE_COLUMNS = [
  { key: "ref", header: "รหัสสินค้า", example: "IMP-001", width: 15 },
  { key: "name", header: "ชื่อสินค้า", example: "Implant Fixture 4.0x10mm", width: 30 },
  { key: "category", header: "หมวดหมู่ (slug)", example: "implant", width: 18 },
  { key: "brand", header: "ยี่ห้อ", example: "Straumann", width: 18 },
  { key: "model", header: "รุ่น", example: "BLT", width: 15 },
  { key: "description", header: "รายละเอียด", example: "Implant fixture titanium", width: 30 },
  { key: "unit", header: "หน่วย", example: "ชิ้น", width: 10 },
  { key: "min_stock_level", header: "จำนวนขั้นต่ำ", example: "5", width: 14 },
  { key: "cost_price", header: "ราคาทุน", example: "15000", width: 12 },
  { key: "selling_price", header: "ราคาขาย", example: "25000", width: 12 },
  { key: "diameter", header: "เส้นผ่านศูนย์กลาง (mm)", example: "4.0", width: 20 },
  { key: "length", header: "ความยาว (mm)", example: "10.0", width: 15 },
  { key: "lot_number", header: "เลข Lot", example: "LOT-2025-001", width: 18 },
  { key: "quantity", header: "จำนวนสต็อก", example: "10", width: 14 },
  { key: "expiry_date", header: "วันหมดอายุ (YYYY-MM-DD)", example: "2027-12-31", width: 24 },
] as const

// ─── Download Template ─────────────────────────────────────────────

async function downloadTemplate(
  categories: Array<{ slug: string; name: string }>,
  brands: Array<{ name: string }>
) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet("Products")

  // Set column widths
  sheet.columns = TEMPLATE_COLUMNS.map(col => ({
    key: col.key,
    width: col.width,
  }))

  // Row 1: Headers with styling
  const headerRow = sheet.addRow(TEMPLATE_COLUMNS.map(col => col.header))
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } }
    cell.alignment = { horizontal: "center", vertical: "middle" }
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    }
  })

  // Color inventory columns differently (lot, quantity, expiry)
  const invStartCol = TEMPLATE_COLUMNS.findIndex(c => c.key === "lot_number") + 1
  for (let c = invStartCol; c <= TEMPLATE_COLUMNS.length; c++) {
    const cell = headerRow.getCell(c)
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF548235" } }
  }

  // Row 2: Example data
  const exampleRow = sheet.addRow(TEMPLATE_COLUMNS.map(col => col.example))
  exampleRow.eachCell(cell => {
    cell.font = { italic: true, color: { argb: "FF808080" } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF2CC" } }
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    }
  })

  // Add data validation (dropdown lists) for category and brand columns
  const categoryColIndex = TEMPLATE_COLUMNS.findIndex(c => c.key === "category") + 1
  const brandColIndex = TEMPLATE_COLUMNS.findIndex(c => c.key === "brand") + 1

  if (categories.length > 0) {
    const categoryList = categories.map(c => c.slug)
    for (let row = 2; row <= 1000; row++) {
      sheet.getCell(row, categoryColIndex).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`"${categoryList.join(",")}"`],
        showErrorMessage: true,
        errorTitle: "หมวดหมู่ไม่ถูกต้อง",
        error: `กรุณาเลือกจาก: ${categoryList.join(", ")}`,
      }
    }
  }

  if (brands.length > 0) {
    const brandList = brands.map(b => b.name)
    for (let row = 2; row <= 1000; row++) {
      sheet.getCell(row, brandColIndex).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`"${brandList.join(",")}"`],
        showErrorMessage: true,
        errorTitle: "ยี่ห้อไม่ถูกต้อง",
        error: `กรุณาเลือกจาก: ${brandList.join(", ")}`,
      }
    }
  }

  // Add helper sheet with category mapping
  const helperSheet = workbook.addWorksheet("หมวดหมู่และยี่ห้อ")
  helperSheet.columns = [
    { header: "slug หมวดหมู่", key: "slug", width: 20 },
    { header: "ชื่อหมวดหมู่", key: "name", width: 25 },
    { header: "", key: "spacer", width: 5 },
    { header: "ยี่ห้อ", key: "brand", width: 25 },
  ]

  const headerRow2 = helperSheet.getRow(1)
  headerRow2.eachCell(cell => {
    cell.font = { bold: true }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2EFDA" } }
  })

  const maxRows = Math.max(categories.length, brands.length)
  for (let i = 0; i < maxRows; i++) {
    helperSheet.addRow({
      slug: categories[i]?.slug ?? "",
      name: categories[i]?.name ?? "",
      spacer: "",
      brand: brands[i]?.name ?? "",
    })
  }

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "product_import_template.xlsx"
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Parse Excel File ──────────────────────────────────────────────

function parseDateValue(cell: ExcelJS.Cell): string {
  const v = cell.value
  if (!v) return ""
  // ExcelJS may return a Date object for date cells
  if (v instanceof Date) {
    const yyyy = v.getFullYear()
    const mm = String(v.getMonth() + 1).padStart(2, "0")
    const dd = String(v.getDate()).padStart(2, "0")
    return `${yyyy}-${mm}-${dd}`
  }
  const s = String(v).trim()
  // Try to parse common date formats
  const d = new Date(s)
  if (!isNaN(d.getTime()) && s.length >= 8) {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const dd = String(d.getDate()).padStart(2, "0")
    return `${yyyy}-${mm}-${dd}`
  }
  return s
}

async function parseExcelFile(file: File): Promise<ImportProductRow[]> {
  const buffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const sheet = workbook.getWorksheet(1)
  if (!sheet) throw new Error("ไม่พบข้อมูลในไฟล์")

  const rows: ImportProductRow[] = []

  sheet.eachRow((row, rowNumber) => {
    // Skip header row (row 1)
    if (rowNumber <= 1) return

    const getValue = (colIndex: number): string => {
      const cell = row.getCell(colIndex)
      if (cell.value === null || cell.value === undefined) return ""
      return String(cell.value).trim()
    }

    const ref = getValue(1)
    const name = getValue(2)

    // Skip completely empty rows
    if (!ref && !name) return

    const costPriceStr = getValue(9)
    const sellingPriceStr = getValue(10)
    const diameterStr = getValue(11)
    const lengthStr = getValue(12)
    const quantityStr = getValue(14)

    rows.push({
      rowIndex: rowNumber,
      ref,
      name,
      category: getValue(3),
      brand: getValue(4),
      model: getValue(5),
      description: getValue(6),
      unit: getValue(7) || "ชิ้น",
      min_stock_level: parseInt(getValue(8)) || 0,
      cost_price: costPriceStr ? parseFloat(costPriceStr) : null,
      selling_price: sellingPriceStr ? parseFloat(sellingPriceStr) : null,
      diameter: diameterStr ? parseFloat(diameterStr) : null,
      length: lengthStr ? parseFloat(lengthStr) : null,
      lot_number: getValue(13),
      quantity: quantityStr ? parseInt(quantityStr) : 0,
      expiry_date: parseDateValue(row.getCell(15)),
      errors: [],
    })
  })

  if (rows.length === 0) throw new Error("ไม่พบข้อมูลสินค้าในไฟล์")

  return rows
}

// ─── Editable Cell Component ───────────────────────────────────────

function EditableCell({
  value,
  onChange,
  type = "text",
  options,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  type?: "text" | "number" | "select"
  options?: Array<{ value: string; label: string }>
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [tempValue, setTempValue] = useState(value)

  if (type === "select" && options) {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-7 text-xs w-full min-w-[100px]">
          <SelectValue placeholder={placeholder || "เลือก..."} />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (!editing) {
    return (
      <button
        className="flex items-center gap-1 text-xs hover:bg-muted px-1.5 py-0.5 rounded w-full text-left group min-h-[28px]"
        onClick={() => { setTempValue(value); setEditing(true) }}
      >
        <span className={`flex-1 truncate ${!value ? "text-muted-foreground italic" : ""}`}>
          {value || placeholder || "-"}
        </span>
        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-0.5">
      <Input
        className="h-7 text-xs flex-1 min-w-[60px]"
        type={type === "number" ? "number" : "text"}
        value={tempValue}
        onChange={e => setTempValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") { onChange(tempValue); setEditing(false) }
          if (e.key === "Escape") setEditing(false)
        }}
        autoFocus
      />
      <button
        className="p-0.5 rounded hover:bg-primary/10 text-primary"
        onClick={() => { onChange(tempValue); setEditing(false) }}
      >
        <Check className="h-3 w-3" />
      </button>
      <button
        className="p-0.5 rounded hover:bg-destructive/10 text-destructive"
        onClick={() => setEditing(false)}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────

export default function ProductImportCard() {
  const [isPending, startTransition] = useTransition()
  const [downloading, setDownloading] = useState(false)
  const [importRows, setImportRows] = useState<ImportProductRow[] | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [importResult, setImportResult] = useState<{ success: boolean; createdCount: number; stockCount: number; existingCount: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<Array<{ slug: string; name: string }>>([])
  const [brands, setBrands] = useState<Array<{ name: string }>>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Download template
  async function handleDownloadTemplate() {
    setDownloading(true)
    setError(null)
    try {
      const data = await getTemplateData()

      if (data.categories.length === 0 && data.brands.length === 0) {
        setError("กรุณาเพิ่มหมวดหมู่สินค้าและยี่ห้อสินค้าก่อนดาวน์โหลดเทมเพลท")
        setDownloading(false)
        return
      }
      if (data.categories.length === 0) {
        setError("กรุณาเพิ่มหมวดหมู่สินค้าก่อนดาวน์โหลดเทมเพลท (ตั้งค่าได้ในการ์ดด้านบน)")
        setDownloading(false)
        return
      }
      if (data.brands.length === 0) {
        setError("กรุณาเพิ่มยี่ห้อสินค้าก่อนดาวน์โหลดเทมเพลท (ตั้งค่าได้ในการ์ดด้านบน)")
        setDownloading(false)
        return
      }

      setCategories(data.categories)
      setBrands(data.brands)
      await downloadTemplate(data.categories, data.brands)
    } catch {
      setError("ไม่สามารถดาวน์โหลดเทมเพลทได้")
    } finally {
      setDownloading(false)
    }
  }

  // Handle file selection
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setImportResult(null)

    startTransition(async () => {
      try {
        const data = await getTemplateData()
        setCategories(data.categories)
        setBrands(data.brands)

        const parsed = await parseExcelFile(file)
        const validated = await validateImportData(parsed)
        setImportRows(validated)
        setShowPreview(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : "ไม่สามารถอ่านไฟล์ได้")
      }
    })

    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // Update a row in the preview table
  function updateRow(index: number, field: keyof ImportProductRow, value: string | number | null) {
    if (!importRows) return
    setImportRows(prev => {
      if (!prev) return prev
      const updated = [...prev]
      const row = { ...updated[index] }

      if (field === "min_stock_level" || field === "quantity") {
        row[field] = parseInt(value as string) || 0
      } else if (field === "cost_price" || field === "selling_price" || field === "diameter" || field === "length") {
        row[field] = value ? parseFloat(value as string) : null
      } else if (field !== "rowIndex" && field !== "errors") {
        ;(row as Record<string, unknown>)[field] = value
      }

      row.errors = []
      updated[index] = row
      return updated
    })
  }

  // Remove a row from import
  function removeRow(index: number) {
    setImportRows(prev => {
      if (!prev) return prev
      return prev.filter((_, i) => i !== index)
    })
  }

  // Confirm import
  async function handleConfirmImport() {
    if (!importRows || importRows.length === 0) return

    setError(null)
    startTransition(async () => {
      try {
        const validated = await validateImportData(importRows)
        const hasErrors = validated.some(r => r.errors.length > 0)

        if (hasErrors) {
          setImportRows(validated)
          setError("กรุณาแก้ไขข้อมูลที่มีปัญหาก่อนนำเข้า")
          return
        }

        const result = await bulkCreateProducts(validated)
        setImportResult({ success: true, ...result })
        setImportRows(null)
        setShowPreview(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : "นำเข้าสินค้าไม่สำเร็จ")
      }
    })
  }

  const totalErrors = importRows?.reduce((sum, r) => sum + r.errors.length, 0) ?? 0
  const categoryOptions = categories.map(c => ({ value: c.slug, label: `${c.name} (${c.slug})` }))
  const brandOptions = brands.map(b => ({ value: b.name, label: b.name }))

  // Count summary
  const rowsWithStock = importRows?.filter(r => r.lot_number?.trim()).length ?? 0

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">นำเข้าสินค้า</CardTitle>
          <p className="text-xs text-muted-foreground">
            ดาวน์โหลดเทมเพลท Excel กรอกข้อมูลสินค้าพร้อมสต็อก แล้วนำเข้าสู่ระบบ
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <div className="flex items-start gap-2 text-sm bg-destructive/10 text-destructive rounded-lg px-3 py-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {importResult?.success && (
            <div className="flex items-center gap-2 text-sm bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-lg px-3 py-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <div>
                <p>นำเข้าสำเร็จ</p>
                <p className="text-xs mt-0.5">
                  สินค้าใหม่ {importResult.createdCount} รายการ
                  {importResult.existingCount > 0 && `, สินค้าที่มีอยู่แล้ว ${importResult.existingCount} รายการ`}
                  {importResult.stockCount > 0 && `, สต็อก ${importResult.stockCount} lot`}
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9"
              onClick={handleDownloadTemplate}
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              ดาวน์โหลดเทมเพลท
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              นำเข้าข้อมูล
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          <p className="text-[11px] text-muted-foreground">
            * เทมเพลทรองรับทั้งข้อมูลสินค้าและสต็อก (Lot, จำนวน, วันหมดอายุ) ในไฟล์เดียว
          </p>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>ตรวจสอบรายการสินค้าที่จะนำเข้า</DialogTitle>
            <DialogDescription>
              ทั้งหมด {importRows?.length ?? 0} รายการ
              {rowsWithStock > 0 && ` (${rowsWithStock} รายการมีสต็อก)`}
              {totalErrors > 0 && (
                <span className="text-destructive ml-2">
                  ({totalErrors} ข้อผิดพลาด)
                </span>
              )}
              {" — "}คลิกที่ข้อมูลเพื่อแก้ไข
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="flex items-start gap-2 text-sm bg-destructive/10 text-destructive rounded-lg px-3 py-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="overflow-auto flex-1 border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8 text-center text-xs">#</TableHead>
                  <TableHead className="text-xs min-w-[100px]">รหัส</TableHead>
                  <TableHead className="text-xs min-w-[140px]">ชื่อสินค้า</TableHead>
                  <TableHead className="text-xs min-w-[120px]">หมวดหมู่</TableHead>
                  <TableHead className="text-xs min-w-[120px]">ยี่ห้อ</TableHead>
                  <TableHead className="text-xs min-w-[80px]">รุ่น</TableHead>
                  <TableHead className="text-xs min-w-[70px]">หน่วย</TableHead>
                  <TableHead className="text-xs min-w-[80px]">ราคาทุน</TableHead>
                  <TableHead className="text-xs min-w-[80px]">ราคาขาย</TableHead>
                  <TableHead className="text-xs min-w-[110px] bg-emerald-50 dark:bg-emerald-950/30">Lot</TableHead>
                  <TableHead className="text-xs min-w-[80px] bg-emerald-50 dark:bg-emerald-950/30">จำนวน</TableHead>
                  <TableHead className="text-xs min-w-[110px] bg-emerald-50 dark:bg-emerald-950/30">วันหมดอายุ</TableHead>
                  <TableHead className="text-xs w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importRows?.map((row, idx) => (
                  <TableRow
                    key={idx}
                    className={row.errors.length > 0 ? "bg-destructive/5" : ""}
                  >
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {row.rowIndex}
                    </TableCell>
                    <TableCell>
                      <EditableCell
                        value={row.ref}
                        onChange={v => updateRow(idx, "ref", v)}
                        placeholder="รหัสสินค้า"
                      />
                    </TableCell>
                    <TableCell>
                      <EditableCell
                        value={row.name}
                        onChange={v => updateRow(idx, "name", v)}
                        placeholder="ชื่อสินค้า"
                      />
                    </TableCell>
                    <TableCell>
                      <EditableCell
                        value={row.category}
                        onChange={v => updateRow(idx, "category", v)}
                        type="select"
                        options={categoryOptions}
                        placeholder="เลือกหมวดหมู่"
                      />
                    </TableCell>
                    <TableCell>
                      <EditableCell
                        value={row.brand}
                        onChange={v => updateRow(idx, "brand", v)}
                        type="select"
                        options={brandOptions}
                        placeholder="เลือกยี่ห้อ"
                      />
                    </TableCell>
                    <TableCell>
                      <EditableCell
                        value={row.model}
                        onChange={v => updateRow(idx, "model", v)}
                        placeholder="รุ่น"
                      />
                    </TableCell>
                    <TableCell>
                      <EditableCell
                        value={row.unit}
                        onChange={v => updateRow(idx, "unit", v)}
                        placeholder="ชิ้น"
                      />
                    </TableCell>
                    <TableCell>
                      <EditableCell
                        value={row.cost_price !== null ? String(row.cost_price) : ""}
                        onChange={v => updateRow(idx, "cost_price", v)}
                        type="number"
                        placeholder="-"
                      />
                    </TableCell>
                    <TableCell>
                      <EditableCell
                        value={row.selling_price !== null ? String(row.selling_price) : ""}
                        onChange={v => updateRow(idx, "selling_price", v)}
                        type="number"
                        placeholder="-"
                      />
                    </TableCell>
                    {/* Inventory columns */}
                    <TableCell className="bg-emerald-50/50 dark:bg-emerald-950/20">
                      <EditableCell
                        value={row.lot_number}
                        onChange={v => updateRow(idx, "lot_number", v)}
                        placeholder="(ไม่มี)"
                      />
                    </TableCell>
                    <TableCell className="bg-emerald-50/50 dark:bg-emerald-950/20">
                      <EditableCell
                        value={row.quantity ? String(row.quantity) : ""}
                        onChange={v => updateRow(idx, "quantity", v)}
                        type="number"
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell className="bg-emerald-50/50 dark:bg-emerald-950/20">
                      <EditableCell
                        value={row.expiry_date}
                        onChange={v => updateRow(idx, "expiry_date", v)}
                        placeholder="YYYY-MM-DD"
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => removeRow(idx)}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {importRows?.some(r => r.errors.length > 0) && (
              <div className="p-3 border-t space-y-1">
                <p className="text-xs font-medium text-destructive">ข้อผิดพลาดที่พบ:</p>
                {importRows.map((row, idx) =>
                  row.errors.length > 0 ? (
                    <div key={idx} className="text-xs text-destructive">
                      <span className="font-medium">แถว {row.rowIndex}:</span>{" "}
                      {row.errors.join(", ")}
                    </div>
                  ) : null
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              ยกเลิก
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={isPending || !importRows || importRows.length === 0}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              ยืนยันนำเข้า {importRows?.length ?? 0} รายการ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
