import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import ClientProvider from "@/components/common/client-provider"
import HydrationSuppressor from "@/components/common/hydration-suppressor"

const inter = Inter({ subsets: ["latin"] })

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Pocketwise | Personal & Family Finance Tracker",
    template: "%s | Pocketwise",
  },
  description:
    "Track spending, budgets, and bills across personal and shared household finances, with AI-powered insights. Free to get started.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Pocketwise | Personal & Family Finance Tracker",
    description:
      "Track spending, budgets, and bills across personal and shared household finances, with AI-powered insights.",
    type: "website",
    siteName: "Pocketwise",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pocketwise | Personal & Family Finance Tracker",
    description:
      "Track spending, budgets, and bills across personal and shared household finances, with AI-powered insights.",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <HydrationSuppressor>
          <ClientProvider>{children}</ClientProvider>
        </HydrationSuppressor>
      </body>
    </html>
  )
}
