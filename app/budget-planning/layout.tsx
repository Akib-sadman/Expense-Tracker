import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Budget Planning",
  description: "Set and track your budgets.",
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
