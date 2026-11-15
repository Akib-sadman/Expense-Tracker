
import axios from "axios"
import { API_BASE } from "@/lib/api/api-base"

const base = (API_BASE) + "/api/v1"

export interface ReceiptLineItem {
  name: string
  unitPriceCents: number
  quantity: number
  confidence: number
}

export interface ReceiptFieldConfidence {
  merchant: number | null
  receiptDate: number | null
  total: number | null
  subtotal: number | null
  tax: number | null
  paymentMethod: number | null
}

export interface Receipt {
  id: string
  userId: string
  storagePath: string
  merchant: string | null
  receiptDate: string | null 
  currency: string
  subtotalCents: number | null
  taxCents: number | null
  totalCents: number | null
  paymentMethod: string | null
  suggestedCategory: string | null
  lineItems: ReceiptLineItem[]
  fieldConfidence: ReceiptFieldConfidence
  rawOcrText: string
  status: "pending" | "converted" | "dismissed"
  mimeType: string
  fileSizeBytes: number
  createdAt: string
}

export interface ReceiptListFilters {
  page?: number
  limit?: number
  status?: Receipt["status"]
  search?: string
  dateFrom?: string
  dateTo?: string
}

export interface ConfirmReceiptInput {
  vendor: string
  category: string
  amount: number
  date?: string
  paymentMethod?: string | null
  description?: string
  notes?: string
  items?: Array<{ name?: string; price?: number }>
}

type ApiResult<T> = { success: true; data: T } | { success: false; error: string }

function errorMessage(error: any, fallback: string): string {
  return error?.response?.data?.error?.message || fallback
}

export async function uploadReceipt(file: File, { force = false }: { force?: boolean } = {}): Promise<
  ApiResult<{ receipt: Receipt; imageUrl: string; possibleDuplicates: Receipt[] }>
> {
  try {
    const form = new FormData()
    form.append("file", file)
    const url = `${base}/receipts${force ? "?force=true" : ""}`
    const response = await axios.post(url, form, { withCredentials: true })
    return { success: true, data: response.data.data }
  } catch (error: any) {
    if (error?.response?.status === 409 && error?.response?.data?.error?.details?.code === "duplicate_image") {
      return { success: false, error: "duplicate_image" }
    }
    return { success: false, error: errorMessage(error, "Could not upload receipt.") }
  }
}

export async function listReceipts(filters: ReceiptListFilters = {}): Promise<ApiResult<Receipt[]>> {
  try {
    const params = new URLSearchParams()
    if (filters.page) params.set("page", String(filters.page))
    if (filters.limit) params.set("limit", String(filters.limit))
    if (filters.status) params.set("status", filters.status)
    if (filters.search) params.set("search", filters.search)
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom)
    if (filters.dateTo) params.set("dateTo", filters.dateTo)
    const response = await axios.get(`${base}/receipts?${params.toString()}`, { withCredentials: true })
    return { success: true, data: response.data.data }
  } catch (error: any) {
    return { success: false, error: errorMessage(error, "Could not load receipts.") }
  }
}

export async function getReceipt(id: string): Promise<ApiResult<{ receipt: Receipt; imageUrl: string }>> {
  try {
    const response = await axios.get(`${base}/receipts/${id}`, { withCredentials: true })
    return { success: true, data: response.data.data }
  } catch (error: any) {
    return { success: false, error: errorMessage(error, "Could not load receipt.") }
  }
}

export async function deleteReceipt(id: string): Promise<ApiResult<{ ok: true }>> {
  try {
    const response = await axios.delete(`${base}/receipts/${id}`, { withCredentials: true })
    return { success: true, data: response.data.data }
  } catch (error: any) {
    return { success: false, error: errorMessage(error, "Could not delete receipt.") }
  }
}

export async function confirmReceipt(id: string, input: ConfirmReceiptInput): Promise<ApiResult<any>> {
  try {
    const response = await axios.post(`${base}/receipts/${id}/confirm`, input, { withCredentials: true })
    return { success: true, data: response.data.data }
  } catch (error: any) {
    return { success: false, error: errorMessage(error, "Could not save this receipt as an expense.") }
  }
}
