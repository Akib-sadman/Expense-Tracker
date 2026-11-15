import axios from "axios"
import { API_BASE } from "@/lib/api/api-base"

export interface AiAuditEvent {
  id: string
  action: string
  targetType?: string
  targetId?: string
  metadata: {
    conversationId?: string
    vendor?: string
    amount?: number
    category?: string
    type?: "expense" | "income" | "refund"
    date?: string
  }
  createdAt: string
}

export async function fetchAiAuditLog(userId: string): Promise<AiAuditEvent[]> {
  const base = API_BASE
  const res = await axios.get(`${base}/api/v1/users/${userId}/audit-log`, {
    params: { action: "ai.transaction_confirmed", limit: 50 },
    withCredentials: true,
  })
  return res.data.data.events
}
