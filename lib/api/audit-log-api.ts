import axios from "axios"
import { API_BASE } from "@/lib/api/api-base"

export interface AuditEvent {
  id: string
  action: string
  targetType?: string
  targetId?: string
  metadata: Record<string, unknown>
  createdAt: string
}

export async function fetchAuditLog(userId: string, page: number, limit = 20): Promise<AuditEvent[]> {
  const base = API_BASE
  const res = await axios.get(`${base}/api/v1/users/${userId}/audit-log`, { params: { page, limit }, withCredentials: true })
  return res.data.data.events
}
