import axios from "axios"
import { API_BASE } from "@/lib/api/api-base"

export async function revokeOtherSessions(userId: string): Promise<void> {
  const base = API_BASE
  await axios.post(`${base}/api/v1/users/${userId}/sessions/revoke-others`, {}, { withCredentials: true })
}
