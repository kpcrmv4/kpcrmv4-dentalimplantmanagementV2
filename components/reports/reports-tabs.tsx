"use client"

import type { ReactNode } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CostPerCaseTab } from "./cost-per-case-tab"
import { UsageReportTab } from "./usage-report-tab"
import { InvoiceSearchTab } from "./invoice-search-tab"
import { DentistPerformanceTab } from "./dentist-performance-tab"
import {
  BarChart3,
  Calculator,
  Package,
  FileSearch,
  UserCheck,
} from "lucide-react"

export function ReportsTabs({ overviewContent }: { overviewContent: ReactNode }) {
  return (
    <Tabs defaultValue="overview">
      <div className="-mx-4 px-4 overflow-x-auto scrollbar-none lg:mx-0 lg:px-0">
        <TabsList className="inline-flex w-max gap-1 lg:w-full lg:grid lg:grid-cols-5">
          <TabsTrigger value="overview" className="gap-1.5 text-xs whitespace-nowrap">
            <BarChart3 className="h-3.5 w-3.5 shrink-0 hidden sm:block" />
            ภาพรวม
          </TabsTrigger>
          <TabsTrigger value="cost" className="gap-1.5 text-xs whitespace-nowrap">
            <Calculator className="h-3.5 w-3.5 shrink-0 hidden sm:block" />
            ต้นทุน/เคส
          </TabsTrigger>
          <TabsTrigger value="usage" className="gap-1.5 text-xs whitespace-nowrap">
            <Package className="h-3.5 w-3.5 shrink-0 hidden sm:block" />
            การใช้วัสดุ
          </TabsTrigger>
          <TabsTrigger value="invoice" className="gap-1.5 text-xs whitespace-nowrap">
            <FileSearch className="h-3.5 w-3.5 shrink-0 hidden sm:block" />
            ค้นหา Invoice
          </TabsTrigger>
          <TabsTrigger value="dentist-performance" className="gap-1.5 text-xs whitespace-nowrap">
            <UserCheck className="h-3.5 w-3.5 shrink-0 hidden sm:block" />
            ประสิทธิภาพหมอ
          </TabsTrigger>
        </TabsList>
      </div>

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
