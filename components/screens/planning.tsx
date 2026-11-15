"use client"

import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { AppShell } from "@/components/layout/app-shell"
import BudgetPlanning from "@/components/screens/budget-planning"
import Bills from "@/components/screens/bills"
import Goals from "@/components/screens/goals"
import Subscriptions from "@/components/screens/subscriptions"
import Debts from "@/components/screens/debts"

const TABS = ["budgets", "bills", "goals", "subscriptions", "debts"] as const
type PlanningTab = (typeof TABS)[number]

function PlanningTabs() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const activeTab: PlanningTab = (TABS as readonly string[]).includes(tabParam || "") ? (tabParam as PlanningTab) : "budgets"

  const setTab = (tab: string) => {
    router.replace(`/planning?tab=${tab}`, { scroll: false })
  }

  return (
    <Tabs value={activeTab} onValueChange={setTab} className="space-y-6">
      <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent)] sm:[mask-image:none] sm:w-auto">
        <TabsTrigger value="budgets" className="shrink-0">Budgets</TabsTrigger>
        <TabsTrigger value="bills" className="shrink-0">Bills</TabsTrigger>
        <TabsTrigger value="goals" className="shrink-0">Goals</TabsTrigger>
        <TabsTrigger value="subscriptions" className="shrink-0">Subscriptions</TabsTrigger>
        <TabsTrigger value="debts" className="shrink-0">Debts &amp; Loans</TabsTrigger>
      </TabsList>

      <TabsContent value="budgets">
        <BudgetPlanning />
      </TabsContent>
      <TabsContent value="bills">
        <Bills />
      </TabsContent>
      <TabsContent value="goals">
        <Goals />
      </TabsContent>
      <TabsContent value="subscriptions">
        <Subscriptions />
      </TabsContent>
      <TabsContent value="debts">
        <Debts />
      </TabsContent>
    </Tabs>
  )
}

export default function Planning() {
  return (
    <AppShell>
      <div className="p-4 lg:p-6 space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Planning</h2>
          <p className="hidden sm:block text-muted-foreground">Budgets, bills, goals, subscriptions, and debts &amp; loans.</p>
        </div>
        {}
        <Suspense fallback={null}>
          <PlanningTabs />
        </Suspense>
      </div>
    </AppShell>
  )
}
