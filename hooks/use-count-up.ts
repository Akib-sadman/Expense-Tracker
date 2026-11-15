"use client"

import { useEffect, useRef, useState } from "react"
import { usePerformance } from "@/contexts/performance-context"

export function useCountUp(target: number, options?: { durationMs?: number; active?: boolean }) {
  const { reducedMotion, performanceMode } = usePerformance()
  const durationMs = options?.durationMs ?? 600
  const active = options?.active ?? true
  const [value, setValue] = useState(reducedMotion || performanceMode || !active ? target : 0)
  const frameRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (reducedMotion || performanceMode || !active) {
      setValue(target)
      return
    }

    const startValue = 0
    const startTime = performance.now()

    const tick = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / durationMs, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(startValue + (target - startValue) * eased)
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      }
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [target, durationMs, active, reducedMotion, performanceMode])

  return value
}
