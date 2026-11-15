"use client"

import AuthGuard from "@/components/auth/auth-guard"
import { RedirectToPlanning } from "@/components/planning/redirect-to-planning"

export default function DebtsPage() {
  return (
    <AuthGuard>
      <RedirectToPlanning tab="debts" />
    </AuthGuard>
  )
}
