import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow, differenceInYears, parse } from "date-fns"
import { th } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Date formatting
export function formatDate(date: string | Date): string {
  return format(new Date(date), "d MMM yyyy", { locale: th })
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), "d MMM yyyy HH:mm", { locale: th })
}

export function formatDateShort(date: string | Date): string {
  return format(new Date(date), "dd/MM/yyyy")
}

export function formatTimeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: th })
}

// Number formatting
export function formatNumber(num: number): string {
  return new Intl.NumberFormat("th-TH").format(num)
}

export function formatCurrency(num: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
  }).format(num)
}

// ID generators
export function generateCaseNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const random = String(Math.floor(Math.random() * 9999)).padStart(4, "0")
  return `CN${year}${month}${random}`
}

export function generateHN(): string {
  const now = new Date()
  const year = now.getFullYear()
  const random = String(Math.floor(Math.random() * 99999)).padStart(5, "0")
  return `HN${year}${random}`
}

// Helpers
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function calculateAge(dateOfBirth: string | Date): number {
  return differenceInYears(new Date(), new Date(dateOfBirth))
}

export function parseBirthdate(yyyymmdd: string): Date {
  return parse(yyyymmdd, "yyyyMMdd", new Date())
}

// Debounce
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}
