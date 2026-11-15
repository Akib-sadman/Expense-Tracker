import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Subscriptions",
  description: "Track recurring subscriptions.",
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
