"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

interface ToothPositionSelectorProps {
  selected: number[]
  onChange: (teeth: number[]) => void
}

const QUADRANTS = [
  { label: "ขวาบน", teeth: [18, 17, 16, 15, 14, 13, 12, 11] },
  { label: "ซ้ายบน", teeth: [21, 22, 23, 24, 25, 26, 27, 28] },
  { label: "ขวาล่าง", teeth: [48, 47, 46, 45, 44, 43, 42, 41] },
  { label: "ซ้ายล่าง", teeth: [31, 32, 33, 34, 35, 36, 37, 38] },
]

export function ToothPositionSelector({
  selected,
  onChange,
}: ToothPositionSelectorProps) {
  function toggleTooth(tooth: number) {
    if (selected.includes(tooth)) {
      onChange(selected.filter((t) => t !== tooth))
    } else {
      onChange([...selected, tooth].sort((a, b) => a - b))
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">ตำแหน่งฟัน (FDI)</div>

      {/* Upper teeth */}
      <div className="space-y-1">
        <div className="text-center text-xs text-muted-foreground">บน (Upper)</div>
        <div className="grid grid-cols-2 gap-1">
          {QUADRANTS.slice(0, 2).map((q) => (
            <div key={q.label} className="flex flex-wrap justify-center gap-0.5">
              {q.teeth.map((tooth) => (
                <button
                  key={tooth}
                  type="button"
                  onClick={() => toggleTooth(tooth)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded border text-xs font-medium transition-colors",
                    selected.includes(tooth)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted"
                  )}
                >
                  {tooth}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-dashed" />

      {/* Lower teeth */}
      <div className="space-y-1">
        <div className="grid grid-cols-2 gap-1">
          {QUADRANTS.slice(2, 4).map((q) => (
            <div key={q.label} className="flex flex-wrap justify-center gap-0.5">
              {q.teeth.map((tooth) => (
                <button
                  key={tooth}
                  type="button"
                  onClick={() => toggleTooth(tooth)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded border text-xs font-medium transition-colors",
                    selected.includes(tooth)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted"
                  )}
                >
                  {tooth}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="text-center text-xs text-muted-foreground">ล่าง (Lower)</div>
      </div>

      {/* Selected display */}
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 pt-1">
          <span className="text-xs text-muted-foreground">เลือก:</span>
          {selected.map((tooth) => (
            <Badge key={tooth} variant="secondary" className="gap-1 text-xs">
              {tooth}
              <button type="button" onClick={() => toggleTooth(tooth)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => onChange([])}
            className="text-xs text-muted-foreground"
          >
            ล้างทั้งหมด
          </Button>
        </div>
      )}
    </div>
  )
}
