"use client"

import { usePerformance } from "@/contexts/performance-context"

export function useChartAnimation(): boolean {
  const { reducedMotion, performanceMode } = usePerformance()
  return !reducedMotion && !performanceMode
}
