"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function RedirectToPlanning({ tab }: { tab: string }) {
  const router = useRouter()
  useEffect(() => {
    router.replace(`/planning?tab=${tab}`)
  }, [router, tab])
  return null
}
