"use client"

import AuthGuard from "@/components/auth/auth-guard"
import Planning from "@/components/screens/planning"

export default function PlanningPage() {
  return (
    <AuthGuard>
      <Planning />
    </AuthGuard>
  )
}
