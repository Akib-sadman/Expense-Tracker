import type { ReactNode } from "react"
import { BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

/** Friendly stand-in for a chart that has no data to draw yet. */
export function ChartEmpty({ title = "Nothing to chart yet", children, className }: { title?: string; children?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex h-[180px] flex-col items-center justify-center gap-1 rounded-lg bg-muted/40 px-4 text-center", className)}>
      <BarChart3 className="mb-1 h-5 w-5 text-muted-foreground" aria-hidden />
      <p className="text-sm font-medium">{title}</p>
      {children && <p className="text-xs text-muted-foreground">{children}</p>}
    </div>
  )
}
