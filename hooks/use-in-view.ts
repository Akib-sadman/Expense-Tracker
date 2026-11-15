"use client"

import { useEffect, useState } from "react"
import { usePerformance } from "@/contexts/performance-context"

export function useInView<T extends HTMLElement = HTMLDivElement>(threshold = 0.15) {
  const { reducedMotion, performanceMode } = usePerformance()
  const [node, setNode] = useState<T | null>(null)
  const [inView, setInView] = useState(reducedMotion || performanceMode)

  useEffect(() => {
    if (reducedMotion || performanceMode) {
      setInView(true)
      return
    }
    if (!node) return

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true)
        observer.disconnect()
      }
    }, { threshold })

    observer.observe(node)
    return () => observer.disconnect()
  }, [reducedMotion, performanceMode, threshold, node])

  return { ref: setNode, inView }
}
