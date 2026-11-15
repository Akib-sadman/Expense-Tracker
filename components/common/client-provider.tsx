"use client"

import { useEffect, useState } from "react"
import "@/lib/api/axios-defaults"
import { AuthProvider } from "@/contexts/auth-context"
import { ExpenseProvider } from "@/contexts/expense-context"
import { AccountProvider } from "@/contexts/account-context"
import { BillsProvider } from "@/contexts/bills-context"
import { GoalsProvider } from "@/contexts/goals-context"
import { SubscriptionsProvider } from "@/contexts/subscriptions-context"
import { DebtsProvider } from "@/contexts/debts-context"
import { GroupsProvider } from "@/contexts/groups-context"
import { AiChatProvider } from "@/contexts/ai-chat-context"
import { ReportsProvider } from "@/contexts/reports-context"
import { ImportExportProvider } from "@/contexts/import-export-context"
import { HouseholdProvider } from "@/contexts/household-context"
import { ThemeProvider } from "@/contexts/theme-context"
import { PerformanceProvider } from "@/contexts/performance-context"
import { LanguageProvider } from "@/contexts/language-context"
import { Toaster } from "@/components/ui/toaster"

export default function ClientProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary/30 mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <ThemeProvider>
      <PerformanceProvider>
        <AuthProvider>
          <LanguageProvider>
            <HouseholdProvider>
              <AccountProvider>
                <BillsProvider>
                  <GoalsProvider>
                    <SubscriptionsProvider>
                      <DebtsProvider>
                        <GroupsProvider>
                          <AiChatProvider>
                            <ReportsProvider>
                              <ImportExportProvider>
                                <ExpenseProvider>
                                  {children}
                                  <Toaster />
                                </ExpenseProvider>
                              </ImportExportProvider>
                            </ReportsProvider>
                          </AiChatProvider>
                        </GroupsProvider>
                      </DebtsProvider>
                    </SubscriptionsProvider>
                  </GoalsProvider>
                </BillsProvider>
              </AccountProvider>
            </HouseholdProvider>
          </LanguageProvider>
        </AuthProvider>
      </PerformanceProvider>
    </ThemeProvider>
  )
}
