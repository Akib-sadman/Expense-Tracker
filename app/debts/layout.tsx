import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Debts",
  description: "Track and pay down debts.",
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
