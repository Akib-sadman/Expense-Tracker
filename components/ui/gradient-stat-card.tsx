"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { hoverLift } from "@/lib/motion"
import { useInView } from "@/hooks/use-in-view"
import { useCountUp } from "@/hooks/use-count-up"

export type GradientStatCardTone = "brand" | "blue" | "teal" | "orange" | "pink" | "splitly"

const TONE_TINT: Record<GradientStatCardTone, string> = {
  brand: "",
  blue: "tint-info",
  teal: "tint-success",
  orange: "tint-warning",
  pink: "",
  splitly: "tint-primary",
}

const TONE_MARKER: Record<GradientStatCardTone, string> = {
  brand: "bg-primary",
  blue: "bg-chart-3",
  teal: "bg-primary",
  orange: "bg-warning",
  pink: "bg-muted-foreground",
  splitly: "bg-chart-1",
}

export interface GradientStatCardProps {
  label: string
  value?: React.ReactNode
  countUp?: { value: number; format?: (n: number) => string; durationMs?: number }
  subtitle?: React.ReactNode
  icon?: LucideIcon
  tone?: GradientStatCardTone
  reveal?: boolean
  className?: string
  valueClassName?: string
}

export const GradientStatCard = React.forwardRef<HTMLDivElement, GradientStatCardProps>(
  ({ label, value, countUp, subtitle, icon: Icon, tone = "brand", reveal, className, valueClassName }, forwardedRef) => {
    const { ref: revealRef, inView } = useInView<HTMLDivElement>()
    const shouldAnimate = !reveal || inView
    const animatedValue = useCountUp(countUp?.value ?? 0, { durationMs: countUp?.durationMs, active: shouldAnimate && !!countUp })
    const format = countUp?.format ?? ((n: number) => Math.round(n).toLocaleString())
    const displayValue = countUp ? format(animatedValue) : value

    const setRefs = (node: HTMLDivElement | null) => {
      revealRef(node)
      if (typeof forwardedRef === "function") forwardedRef(node)
      else if (forwardedRef) forwardedRef.current = node
    }

    return (
      <Card
        ref={setRefs}
        className={cn(
          "select-none",
          tone === "brand" ? "bg-primary text-primary-foreground border-transparent" : TONE_TINT[tone],
          hoverLift,
          reveal && "transition-[opacity,transform] duration-motion-slow ease-motion",
          reveal && !inView && "opacity-0 translate-y-2",
          className
        )}
      >
        <CardContent className="p-6 space-y-1">
          <p className={cn("text-sm flex items-center gap-2", tone === "brand" ? "text-primary-foreground/80" : "text-muted-foreground")}>
            <span aria-hidden className={cn("inline-block h-2 w-2 rounded-full", tone === "brand" ? "bg-primary-foreground" : TONE_MARKER[tone])} />
            {Icon && <Icon className="w-4 h-4" />}
            {label}
          </p>
          <div className={cn("text-3xl font-bold", valueClassName)}>{displayValue}</div>
          {subtitle && <p className={cn("text-sm flex items-center gap-1", tone === "brand" ? "text-primary-foreground/80" : "text-muted-foreground")}>{subtitle}</p>}
        </CardContent>
      </Card>
    )
  }
)
GradientStatCard.displayName = "GradientStatCard"
