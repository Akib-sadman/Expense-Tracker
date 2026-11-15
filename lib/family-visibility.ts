import { useAuth } from "@/contexts/auth-context"
import { useHousehold } from "@/contexts/household-context"

export function useShowFamilyFeatures(): boolean {
  const { state: authState } = useAuth()
  const { state: householdState } = useHousehold()
  const context = authState.user?.onboarding?.answers?.context as string[] | undefined
  if (!context) return true
  if (context.includes("family")) return true
  return householdState.households.length > 0
}
