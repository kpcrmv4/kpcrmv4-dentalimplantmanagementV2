"use client"

import type { ReactNode } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CostPerCaseTab } from "./cost-per-case-tab"
import { UsageReportTab } from "./usage-report-tab"
import { InvoiceSearchTab } from "./invoice-search-tab"
import { DentistPerformanceTab } from "./dentist-performance-tab"

export function ReportsTabs({ overviewContent }: { overviewContent: ReactNode }) {
  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">ภาพรวม</TabsTrigger>
        <TabsTrigger value="cost">ต้นทุน/เคส</TabsTrigger>
        <TabsTrigger value="usage">การใช้วัสดุ</TabsTrigger>
        <TabsTrigger value="invoice">ค้นหา Invoice</TabsTrigger>
        <TabsTrigger value="dentist-performance">ประสิทธิภาพหมอ</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">{overviewContent}</TabsContent>

      <TabsContent value="cost">
        <CostPerCaseTab />
      </TabsContent>

      <TabsContent value="usage">
        <UsageReportTab />
      </TabsContent>

      <TabsContent value="invoice">
        <InvoiceSearchTab />
      </TabsContent>

      <TabsContent value="dentist-performance">
        <DentistPerformanceTab />
      </TabsContent>
    </Tabs>
  )
}
