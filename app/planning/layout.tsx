import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Planning",
  description: "Budgets, bills, goals, subscriptions, and debts & loans.",
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
