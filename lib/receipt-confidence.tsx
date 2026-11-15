import { Badge } from "@/components/ui/badge"

export const LOW_CONFIDENCE_THRESHOLD = 0.75

export function confidenceBadge(confidence: number | null | undefined) {
  if (confidence === null || confidence === undefined || confidence === 0) {
    return <Badge variant="outline" className="text-xs text-muted-foreground">not detected</Badge>
  }
  const pct = Math.round(confidence * 100)
  if (confidence >= LOW_CONFIDENCE_THRESHOLD) {
    return <Badge variant="outline" className="text-xs border-green-500/30 text-green-700 dark:text-green-300 bg-green-500/10">{pct}%</Badge>
  }
  return <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10">{pct}% - check this</Badge>
}

export function fieldRingClass(confidence: number | null | undefined) {
  if (confidence !== null && confidence !== undefined && confidence < LOW_CONFIDENCE_THRESHOLD) {
    return "ring-1 ring-amber-300"
  }
  return ""
}
