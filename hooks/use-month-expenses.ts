"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { API_BASE } from "@/lib/api/api-base"

// This month's spending as the server sums it (exact cents, same month boundaries as the dashboard),
// not a client-side total over whatever expenses happen to be loaded.
export function useMonthExpenses(): number {
  const [monthExpenses, setMonthExpenses] = useState(0)
  useEffect(() => {
    let cancelled = false
    axios
      .get(`${API_BASE}/api/v1/dashboard/summary`, { withCredentials: true })
      .then((res) => {
        if (!cancelled) setMonthExpenses(res.data.data.monthExpenses ?? 0)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])
  return monthExpenses
}
