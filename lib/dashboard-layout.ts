export type DashboardLayout = "saving-focused" | "debt-focused" | "spending-control" | "beginner" | "advanced"

export function deriveDashboardLayout(a: {
  helpWith?: string[]
  currentBehavior?: string
  financialGoals?: string[]
}): DashboardLayout {
  const help = a.helpWith ?? []
  if (help.includes("Pay debt")) return "debt-focused"
  if (a.currentBehavior === "Do not track") return "beginner"
  if (help.includes("Invest") || help.includes("Understand finances")) return "advanced"
  if (help.includes("Reduce overspending") || help.includes("Track spending")) return "spending-control"
  if (help.includes("Save money") || help.includes("Build emergency fund") || (a.financialGoals?.length ?? 0) > 0) return "saving-focused"
  return "beginner"
}

export const DASHBOARD_LAYOUT_INFO: Record<DashboardLayout, { label: string; description: string }> = {
  "saving-focused": { label: "Savings-focused", description: "We'll highlight your goals and savings rate first." },
  "debt-focused": { label: "Debt-focused", description: "We'll highlight your debt payoff progress first." },
  "spending-control": { label: "Spending control", description: "We'll highlight your budget status and spending trends first." },
  advanced: { label: "Advanced", description: "We'll highlight cash flow and deeper analytics first." },
  beginner: { label: "Getting started", description: "We'll keep things simple - balance, bills, and guided insights." },
}
