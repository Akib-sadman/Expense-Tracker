import axios from "axios"
import { API_BASE } from "@/lib/api/api-base"

export async function fetchExchangeRate(from: string, to: string): Promise<{ rate: number; asOf: string }> {
  const base = API_BASE
  const res = await axios.get(`${base}/api/v1/exchange-rates`, { params: { from, to }, withCredentials: true })
  return res.data.data
}
