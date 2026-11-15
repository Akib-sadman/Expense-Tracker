import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Bills",
  description: "Upcoming and recurring bills.",
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
