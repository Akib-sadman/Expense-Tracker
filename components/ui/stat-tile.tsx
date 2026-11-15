"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { GlassCard } from "@/components/ui/glass-card"
import { CardContent } from "@/components/ui/card"
import { hoverLift } from "@/lib/motion"

export type StatTileTone = "positive" | "negative" | "neutral" | "blue" | "purple" | "orange" | "teal" | "pink"

const TONE_TINT: Record<StatTileTone, string> = {
  positive: "tint-success",
  negative: "tint-danger",
  neutral: "",
  blue: "tint-info",
  purple: "",
  orange: "tint-warning",
  teal: "tint-primary",
  pink: "",
}

const TONE_CLASSES: Record<StatTileTone, { badge: string; value: string }> = {
  positive: { badge: "bg-success/15 text-success", value: "text-success" },
  negative: { badge: "bg-danger/15 text-danger", value: "text-danger" },
  neutral: { badge: "bg-muted text-muted-foreground", value: "" },
  blue: { badge: "bg-chart-3/15 text-chart-3", value: "" },
  purple: { badge: "bg-muted text-muted-foreground", value: "" },
  orange: { badge: "bg-warning/15 text-warning", value: "" },
  teal: { badge: "bg-primary/15 text-primary", value: "" },
  pink: { badge: "bg-muted text-muted-foreground", value: "" },
}

export interface StatTileProps {
  label: string
  value: React.ReactNode
  icon?: LucideIcon
  subtitle?: React.ReactNode
  tone?: StatTileTone
  className?: string
  valueClassName?: string
}

export function StatTile({ label, value, icon: Icon, subtitle, tone = "neutral", className, valueClassName }: StatTileProps) {
  return (
    <GlassCard className={cn("select-none", TONE_TINT[tone], hoverLift, className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          {Icon && (
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", TONE_CLASSES[tone].badge)}>
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>
        <p className={cn("text-2xl font-bold tracking-tight tabular-nums", TONE_CLASSES[tone].value, valueClassName)}>{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </GlassCard>
  )
}
