"use client"

import { cn } from "@/lib/utils"
import { usePerformance } from "@/contexts/performance-context"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { reducedMotion, performanceMode } = usePerformance()
  return (
    <div
      className={cn(
        "rounded-md",
        reducedMotion || performanceMode ? "animate-pulse bg-muted" : "skeleton-shimmer",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
