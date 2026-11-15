"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { hoverLift } from "@/lib/motion"
import { useInView } from "@/hooks/use-in-view"

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  strong?: boolean
  interactive?: boolean
  reveal?: boolean
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, strong: _strong, interactive, reveal, ...props }, forwardedRef) => {
    const { ref: revealRef, inView } = useInView<HTMLDivElement>()

    const setRefs = (node: HTMLDivElement | null) => {
      revealRef(node)
      if (typeof forwardedRef === "function") forwardedRef(node)
      else if (forwardedRef) forwardedRef.current = node
    }

    return (
      <div
        ref={setRefs}
        className={cn(
          "rounded-lg border border-transparent bg-card text-card-foreground shadow-neu-raised dark:shadow-neu-raised-dark transition-shadow",
          interactive && hoverLift,
          reveal && "transition-[opacity,transform] duration-motion-slow ease-motion",
          reveal && !inView && "opacity-0 translate-y-2",
          className
        )}
        {...props}
      />
    )
  }
)
GlassCard.displayName = "GlassCard"

export { GlassCard }
