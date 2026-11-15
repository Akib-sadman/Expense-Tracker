"use client"

import AuthGuard from "@/components/auth/auth-guard"
import { RedirectToPlanning } from "@/components/planning/redirect-to-planning"

export default function BillsPage() {
  return (
    <AuthGuard>
      <RedirectToPlanning tab="bills" />
    </AuthGuard>
  )
}
