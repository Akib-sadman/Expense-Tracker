import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Goals",
  description: "Savings and financial goals.",
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
