import { createContext, useContext, useReducer, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./auth-context";
import axios from "axios";
import { API_BASE } from "@/lib/api/api-base"

export type HouseholdRole = "owner" | "admin" | "adult_member" | "limited_member" | "read_only_member";

export interface Household {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface HouseholdMember {
  id: string;
  householdId: string;
  userId: string;
  role: HouseholdRole;
  joinedAt: string;
  name?: string;
  email?: string;
  avatar?: string;
}

export interface Invitation {
  id: string;
  householdId: string;
  invitedEmail: string;
  invitedBy: string;
  role: Exclude<HouseholdRole, "owner">;
  status: "pending" | "accepted" | "declined" | "revoked";
  createdAt: string;
  respondedAt?: string;
  householdName?: string;
}

export interface HouseholdTransaction {
  id: string;
  date: string;
  vendor: string;
  category: string;
  amount: number;
  type: "expense" | "income" | "transfer" | "refund";
  accountId?: string;
  transferAccountId?: string;
  description: string;
  householdId?: string;
}

export interface HouseholdBudgets {
  [category: string]: number;
}

export interface HouseholdBillPayment {
  id: string;
  billId: string;
  period: string;
  paidBy: string;
  amount: number;
  paidAt: string;
}

export interface HouseholdBill {
  id: string;
  householdId: string;
  name: string;
  category: string;
  amount: number;
  dueDay: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  paidThisPeriod: boolean;
  currentPayment: HouseholdBillPayment | null;
  recentPayments: HouseholdBillPayment[];
}

export interface HouseholdSubscriptionPayment {
  id: string;
  subscriptionId: string;
  paidBy: string;
  amount: number;
  period: string;
  paidAt: string;
}

export interface HouseholdSubscription {
  id: string;
  householdId: string;
  name: string;
  provider?: string;
  category: string;
  amount: number;
  billingCycle: "monthly" | "yearly";
  nextBillingDate: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  paidForCurrentCycle: boolean;
  currentPayment: HouseholdSubscriptionPayment | null;
  recentPayments: HouseholdSubscriptionPayment[];
}

export interface HouseholdGoalContribution {
  id: string;
  goalId: string;
  contributedBy: string;
  amount: number;
  note?: string;
  contributedAt: string;
}

export interface HouseholdGoal {
  id: string;
  householdId: string;
  name: string;
  targetAmount: number;
  targetDate: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  savedAmount: number;
  percentComplete: number;
  isAchieved: boolean;
  contributions: HouseholdGoalContribution[];
}

export interface HouseholdContribution {
  id: string;
  householdId: string;
  userId: string;
  amount: number;
  period: string;
  recordedBy: string;
  note?: string;
  createdAt: string;
}

export interface HouseholdContributionMemberSummary {
  userId: string;
  name?: string;
  email?: string;
  avatar?: string;
  role: HouseholdRole;
  target: number;
  actual: number;
  remaining: number;
  percentComplete: number;
  contributions: HouseholdContribution[];
}

export interface HouseholdContributionSummary {
  period: string;
  members: HouseholdContributionMemberSummary[];
  householdTarget: number;
  householdActual: number;
}

export interface HouseholdReport {
  period: string;
  householdSpending: {
    total: number;
    byCategory: { category: string; amount: number }[];
  };
  budgetPerformance: {
    totalBudget: number;
    totalSpent: number;
    byCategory: { category: string; budget: number; spent: number; percentComplete: number }[];
  };
  billBurden: {
    totalMonthlyCommitted: number;
    bills: { id: string; name: string; amount: number; paidThisPeriod: boolean }[];
    subscriptions: { id: string; name: string; amount: number; billingCycle: "monthly" | "yearly"; paidForCurrentCycle: boolean }[];
    paidCount: number;
    unpaidCount: number;
  };
  savingsProgress: {
    totalTarget: number;
    totalSaved: number;
    goals: { id: string; name: string; targetAmount: number; savedAmount: number; percentComplete: number; isAchieved: boolean }[];
  };
  contributionAnalysis: HouseholdContributionSummary;
}

export interface HouseholdInsight {
  id: string;
  type: "alert" | "suggestion" | "pattern";
  message: string;
  iconColor: string;
  category?: string;
  goalId?: string;
  userId?: string;
}

export interface HouseholdInsights {
  period: string;
  insights: HouseholdInsight[];
}

export interface HouseholdCashFlowMonth {
  monthsAhead: number;
  projectedBalance: number;
}

export interface HouseholdBudgetOverrunRisk {
  type: string;
  severity: "info" | "warning" | "critical";
  subjectId: string;
  title: string;
  summary: string;
  evidence: Record<string, unknown>;
}

export interface HouseholdGoalForecast {
  goalId: string;
  name: string;
  remaining: number;
  averageMonthlyContribution: number;
  monthsToComplete: number | null;
  projectedDate: string | null;
}

export interface HouseholdHistoricalCashFlowMonth {
  month: string;
  income: number;
  expenses: number;
  cashFlow: number;
}

export interface HouseholdUpcomingBill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
}

export interface HouseholdForecast {
  spendingForecast: { trailingMonths: number; averageMonthlyIncome: number; averageMonthlyExpense: number; projectedNextMonthSpending: number };
  cashFlowForecast: { currentBalance: number; months: HouseholdCashFlowMonth[] };
  historicalCashFlow: HouseholdHistoricalCashFlowMonth[];
  upcomingBills: HouseholdUpcomingBill[];
  budgetOverrunRisk: HouseholdBudgetOverrunRisk[];
  goalForecasts: HouseholdGoalForecast[];
}

export interface HouseholdWhatIfScenarioInput {
  oneTimeExpense?: number;
  monthlyIncomeChangePct?: number;
  monthlyExpenseChangePct?: number;
  newMonthlyContribution?: number;
  monthsAhead?: number;
}

export interface HouseholdWhatIfResult {
  assumptions: HouseholdWhatIfScenarioInput & { monthsAhead: number };
  baseline: { currentBalance: number; avgMonthlyIncome: number; avgMonthlyExpense: number; months: HouseholdCashFlowMonth[] };
  scenario: { adjustedBalance: number; adjustedIncome: number; adjustedExpense: number; months: HouseholdCashFlowMonth[] };
  aiExplanation: string | null;
}

export interface HouseholdProactiveAlert {
  id: string;
  type: string;
  severity: "critical" | "warning" | "info";
  subjectId: string;
  title: string;
  summary: string;
  aiExplanation?: string;
  status: "open" | "dismissed" | "resolved";
  createdAt: string;
  resolvedAt?: string;
}

interface HouseholdState {
  households: Household[];
  currentHouseholdId: string | null;
  members: HouseholdMember[];
  myInvitations: Invitation[];
  pendingInvitations: Invitation[]; 
  transactions: HouseholdTransaction[];
  budgets: HouseholdBudgets;
  totalBudget: number;
  bills: HouseholdBill[];
  goals: HouseholdGoal[];
  contributionSummary: HouseholdContributionSummary | null;
  subscriptions: HouseholdSubscription[];
  report: HouseholdReport | null;
  insights: HouseholdInsights | null;
  forecast: HouseholdForecast | null;
  proactiveAlerts: HouseholdProactiveAlert[];
  isLoading: boolean;
  loadError: string | null;
}

type HouseholdAction =
  | { type: "RESET" }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_LOAD_ERROR"; payload: string | null }
  | { type: "SET_HOUSEHOLDS"; payload: Household[] }
  | { type: "SELECT_HOUSEHOLD"; payload: string | null }
  | { type: "SET_MEMBERS"; payload: HouseholdMember[] }
  | { type: "SET_MY_INVITATIONS"; payload: Invitation[] }
  | { type: "SET_PENDING_INVITATIONS"; payload: Invitation[] }
  | { type: "SET_TRANSACTIONS"; payload: HouseholdTransaction[] }
  | { type: "SET_BUDGETS"; payload: { budgets: HouseholdBudgets; totalBudget: number } }
  | { type: "SET_BILLS"; payload: HouseholdBill[] }
  | { type: "SET_GOALS"; payload: HouseholdGoal[] }
  | { type: "SET_CONTRIBUTION_SUMMARY"; payload: HouseholdContributionSummary }
  | { type: "SET_SUBSCRIPTIONS"; payload: HouseholdSubscription[] }
  | { type: "SET_REPORT"; payload: HouseholdReport }
  | { type: "SET_INSIGHTS"; payload: HouseholdInsights }
  | { type: "SET_FORECAST"; payload: HouseholdForecast }
  | { type: "SET_PROACTIVE_ALERTS"; payload: HouseholdProactiveAlert[] };

const initialState: HouseholdState = {
  households: [],
  currentHouseholdId: null,
  members: [],
  myInvitations: [],
  pendingInvitations: [],
  transactions: [],
  budgets: {},
  totalBudget: 0,
  bills: [],
  goals: [],
  contributionSummary: null,
  subscriptions: [],
  report: null,
  insights: null,
  forecast: null,
  proactiveAlerts: [],
  isLoading: false,
  loadError: null,
};

function householdReducer(state: HouseholdState, action: HouseholdAction): HouseholdState {
  switch (action.type) {
    case "RESET":
      return initialState;
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_LOAD_ERROR":
      return { ...state, loadError: action.payload };
    case "SET_HOUSEHOLDS":
      return { ...state, households: action.payload };
    case "SELECT_HOUSEHOLD":
      return {
        ...state,
        currentHouseholdId: action.payload,
        members: [],
        transactions: [],
        budgets: {},
        totalBudget: 0,
        bills: [],
        goals: [],
        contributionSummary: null,
        subscriptions: [],
        report: null,
        insights: null,
        forecast: null,
        proactiveAlerts: [],
      };
    case "SET_MEMBERS":
      return { ...state, members: action.payload };
    case "SET_MY_INVITATIONS":
      return { ...state, myInvitations: action.payload };
    case "SET_PENDING_INVITATIONS":
      return { ...state, pendingInvitations: action.payload };
    case "SET_TRANSACTIONS":
      return { ...state, transactions: action.payload };
    case "SET_BUDGETS":
      return { ...state, budgets: action.payload.budgets, totalBudget: action.payload.totalBudget };
    case "SET_BILLS":
      return { ...state, bills: action.payload };
    case "SET_GOALS":
      return { ...state, goals: action.payload };
    case "SET_CONTRIBUTION_SUMMARY":
      return { ...state, contributionSummary: action.payload };
    case "SET_SUBSCRIPTIONS":
      return { ...state, subscriptions: action.payload };
    case "SET_REPORT":
      return { ...state, report: action.payload };
    case "SET_INSIGHTS":
      return { ...state, insights: action.payload };
    case "SET_FORECAST":
      return { ...state, forecast: action.payload };
    case "SET_PROACTIVE_ALERTS":
      return { ...state, proactiveAlerts: action.payload };
    default:
      return state;
  }
}

const HouseholdContext = createContext<{
  state: HouseholdState;
  myRole: HouseholdRole | null;
  loadHouseholdData: () => Promise<void>;
  refreshHouseholds: () => Promise<void>;
  selectHousehold: (id: string | null) => void;
  createHousehold: (name: string) => Promise<Household>;
  deleteHousehold: (id: string) => Promise<void>;
  refreshMembers: (id: string) => Promise<void>;
  refreshMyInvitations: () => Promise<void>;
  refreshPendingInvitations: (id: string) => Promise<void>;
  refreshTransactions: (id: string) => Promise<void>;
  refreshBudgets: (id: string) => Promise<void>;
  setHouseholdBudgets: (id: string, budgets: HouseholdBudgets) => Promise<void>;
  inviteMember: (id: string, email: string, role: Exclude<HouseholdRole, "owner">) => Promise<void>;
  revokeInvitation: (householdId: string, invitationId: string) => Promise<void>;
  acceptInvitation: (invitationId: string) => Promise<void>;
  declineInvitation: (invitationId: string) => Promise<void>;
  changeMemberRole: (householdId: string, memberId: string, role: Exclude<HouseholdRole, "owner">) => Promise<void>;
  removeMember: (householdId: string, memberId: string) => Promise<void>;
  refreshBills: (id: string) => Promise<void>;
  createBill: (id: string, data: { name: string; category: string; amount: number; dueDay: number }) => Promise<void>;
  updateBill: (id: string, billId: string, data: Partial<{ name: string; category: string; amount: number; dueDay: number; isActive: boolean }>) => Promise<void>;
  deleteBill: (id: string, billId: string) => Promise<void>;
  payBill: (id: string, billId: string) => Promise<void>;
  undoBillPayment: (id: string, billId: string) => Promise<void>;
  refreshGoals: (id: string) => Promise<void>;
  createGoal: (id: string, data: { name: string; targetAmount: number; targetDate?: string | null }) => Promise<void>;
  updateGoal: (id: string, goalId: string, data: Partial<{ name: string; targetAmount: number; targetDate: string | null; isActive: boolean }>) => Promise<void>;
  deleteGoal: (id: string, goalId: string) => Promise<void>;
  addGoalContribution: (id: string, goalId: string, amount: number, note?: string) => Promise<void>;
  removeGoalContribution: (id: string, goalId: string, contributionId: string) => Promise<void>;
  refreshContributions: (id: string, period?: string) => Promise<void>;
  setContributionTarget: (id: string, userId: string, amount: number) => Promise<void>;
  recordContribution: (id: string, data: { userId?: string; amount: number; period?: string; note?: string }) => Promise<void>;
  removeContribution: (id: string, contributionId: string) => Promise<void>;
  refreshSubscriptions: (id: string) => Promise<void>;
  createSubscription: (id: string, data: { name: string; provider?: string; category: string; amount: number; billingCycle: "monthly" | "yearly"; nextBillingDate: string }) => Promise<void>;
  updateSubscription: (id: string, subscriptionId: string, data: Partial<{ name: string; provider: string | null; category: string; amount: number; billingCycle: "monthly" | "yearly"; nextBillingDate: string; isActive: boolean }>) => Promise<void>;
  deleteSubscription: (id: string, subscriptionId: string) => Promise<void>;
  paySubscription: (id: string, subscriptionId: string) => Promise<void>;
  undoSubscriptionPayment: (id: string, subscriptionId: string) => Promise<void>;
  refreshReport: (id: string, period?: string) => Promise<void>;
  refreshInsights: (id: string, period?: string) => Promise<void>;
  refreshForecast: (id: string) => Promise<void>;
  runHouseholdWhatIf: (id: string, scenario: HouseholdWhatIfScenarioInput) => Promise<{ success: boolean; data?: HouseholdWhatIfResult; error?: string }>;
  refreshProactiveAlerts: (id: string, status?: string) => Promise<void>;
  runHouseholdProactiveCheck: (id: string) => Promise<void>;
  dismissHouseholdProactiveAlert: (id: string, alertId: string) => Promise<void>;
} | null>(null);

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(householdReducer, initialState);
  const base = (API_BASE) + "/api/v1/households";
  const { state: authState } = useAuth();

  const accountTokenRef = useRef(0);

  const refreshHouseholds = useCallback(async () => {
    const token = accountTokenRef.current;
    const res = await axios.get(base, { withCredentials: true });
    if (accountTokenRef.current !== token) return;
    dispatch({ type: "SET_HOUSEHOLDS", payload: res.data.data });
  }, [base]);

  const refreshMyInvitations = useCallback(async () => {
    const token = accountTokenRef.current;
    const res = await axios.get(`${base}/invitations/mine`, { withCredentials: true });
    if (accountTokenRef.current !== token) return;
    dispatch({ type: "SET_MY_INVITATIONS", payload: res.data.data });
  }, [base]);

  const loadHouseholdData = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_LOAD_ERROR", payload: null });
    try {
      await Promise.all([refreshHouseholds(), refreshMyInvitations()]);
    } catch (error) {
      console.error("Error loading household data:", error);
      dispatch({ type: "SET_LOAD_ERROR", payload: "Could not load your household data. Please try again." });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [refreshHouseholds, refreshMyInvitations]);

  useEffect(() => {
    accountTokenRef.current += 1;
    dispatch({ type: "RESET" });
    if (!authState.isAuthenticated) return;
    loadHouseholdData();
  }, [authState.isAuthenticated, authState.user?.id, loadHouseholdData]);

  const selectHousehold = (id: string | null) => {
    dispatch({ type: "SELECT_HOUSEHOLD", payload: id });
  };

  const createHousehold = async (name: string) => {
    const res = await axios.post(base, { name }, { withCredentials: true });
    await refreshHouseholds().catch(() => {});
    return res.data.data as Household;
  };

  const deleteHousehold = async (id: string) => {
    await axios.delete(`${base}/${id}`, { withCredentials: true });
    if (state.currentHouseholdId === id) selectHousehold(null);
    await refreshHouseholds();
  };

  const refreshMembers = async (id: string) => {
    const res = await axios.get(`${base}/${id}`, { withCredentials: true });
    dispatch({ type: "SET_MEMBERS", payload: res.data.data.members });
  };

  const refreshPendingInvitations = async (id: string) => {
    const res = await axios.get(`${base}/${id}/invitations`, { withCredentials: true });
    dispatch({ type: "SET_PENDING_INVITATIONS", payload: res.data.data });
  };

  const refreshTransactions = async (id: string) => {
    const res = await axios.get(`${base}/${id}/transactions`, { withCredentials: true });
    const transactions = res.data.data.map((t: any) => ({ ...t, date: t.date }));
    dispatch({ type: "SET_TRANSACTIONS", payload: transactions });
  };

  const refreshBudgets = async (id: string) => {
    const res = await axios.get(`${base}/${id}/budgets`, { withCredentials: true });
    dispatch({ type: "SET_BUDGETS", payload: res.data.data });
  };

  const setHouseholdBudgets = async (id: string, budgets: HouseholdBudgets) => {
    const res = await axios.put(`${base}/${id}/budgets`, { budgets }, { withCredentials: true });
    dispatch({ type: "SET_BUDGETS", payload: res.data.data });
  };

  const inviteMember = async (id: string, email: string, role: Exclude<HouseholdRole, "owner">) => {
    await axios.post(`${base}/${id}/invitations`, { email, role }, { withCredentials: true });
    await refreshPendingInvitations(id).catch(() => {});
  };

  const revokeInvitation = async (householdId: string, invitationId: string) => {
    await axios.delete(`${base}/${householdId}/invitations/${invitationId}`, { withCredentials: true });
    await refreshPendingInvitations(householdId).catch(() => {});
  };

  const acceptInvitation = async (invitationId: string) => {
    await axios.post(`${base}/invitations/${invitationId}/accept`, {}, { withCredentials: true });
    await Promise.all([refreshHouseholds(), refreshMyInvitations()]);
  };

  const declineInvitation = async (invitationId: string) => {
    await axios.post(`${base}/invitations/${invitationId}/decline`, {}, { withCredentials: true });
    await refreshMyInvitations().catch(() => {});
  };

  const changeMemberRole = async (householdId: string, memberId: string, role: Exclude<HouseholdRole, "owner">) => {
    await axios.put(`${base}/${householdId}/members/${memberId}`, { role }, { withCredentials: true });
    await refreshMembers(householdId).catch(() => {});
  };

  const removeMember = async (householdId: string, memberId: string) => {
    await axios.delete(`${base}/${householdId}/members/${memberId}`, { withCredentials: true });
    await refreshMembers(householdId).catch(() => {});
  };

  const refreshBills = async (id: string) => {
    const res = await axios.get(`${base}/${id}/bills`, { withCredentials: true });
    dispatch({ type: "SET_BILLS", payload: res.data.data });
  };

  const createBill = async (id: string, data: { name: string; category: string; amount: number; dueDay: number }) => {
    await axios.post(`${base}/${id}/bills`, data, { withCredentials: true });
    await refreshBills(id).catch(() => {});
  };

  const updateBill = async (id: string, billId: string, data: Partial<{ name: string; category: string; amount: number; dueDay: number; isActive: boolean }>) => {
    await axios.put(`${base}/${id}/bills/${billId}`, data, { withCredentials: true });
    await refreshBills(id).catch(() => {});
  };

  const deleteBill = async (id: string, billId: string) => {
    await axios.delete(`${base}/${id}/bills/${billId}`, { withCredentials: true });
    await refreshBills(id).catch(() => {});
  };

  const payBill = async (id: string, billId: string) => {
    await axios.post(`${base}/${id}/bills/${billId}/pay`, {}, { withCredentials: true });
    await refreshBills(id).catch(() => {});
  };

  const undoBillPayment = async (id: string, billId: string) => {
    await axios.delete(`${base}/${id}/bills/${billId}/payments`, { withCredentials: true });
    await refreshBills(id).catch(() => {});
  };

  const refreshGoals = async (id: string) => {
    const res = await axios.get(`${base}/${id}/goals`, { withCredentials: true });
    dispatch({ type: "SET_GOALS", payload: res.data.data });
  };

  const createGoal = async (id: string, data: { name: string; targetAmount: number; targetDate?: string | null }) => {
    await axios.post(`${base}/${id}/goals`, data, { withCredentials: true });
    await refreshGoals(id).catch(() => {});
  };

  const updateGoal = async (id: string, goalId: string, data: Partial<{ name: string; targetAmount: number; targetDate: string | null; isActive: boolean }>) => {
    await axios.put(`${base}/${id}/goals/${goalId}`, data, { withCredentials: true });
    await refreshGoals(id).catch(() => {});
  };

  const deleteGoal = async (id: string, goalId: string) => {
    await axios.delete(`${base}/${id}/goals/${goalId}`, { withCredentials: true });
    await refreshGoals(id).catch(() => {});
  };

  const addGoalContribution = async (id: string, goalId: string, amount: number, note?: string) => {
    await axios.post(`${base}/${id}/goals/${goalId}/contributions`, { amount, note }, { withCredentials: true });
    await refreshGoals(id).catch(() => {});
  };

  const removeGoalContribution = async (id: string, goalId: string, contributionId: string) => {
    await axios.delete(`${base}/${id}/goals/${goalId}/contributions/${contributionId}`, { withCredentials: true });
    await refreshGoals(id).catch(() => {});
  };

  const refreshContributions = async (id: string, period?: string) => {
    const res = await axios.get(`${base}/${id}/contributions`, { withCredentials: true, params: period ? { period } : undefined });
    dispatch({ type: "SET_CONTRIBUTION_SUMMARY", payload: res.data.data });
  };

  const setContributionTarget = async (id: string, userId: string, amount: number) => {
    await axios.put(`${base}/${id}/contributions/targets/${userId}`, { amount }, { withCredentials: true });
    await refreshContributions(id, state.contributionSummary?.period).catch(() => {});
  };

  const recordContribution = async (id: string, data: { userId?: string; amount: number; period?: string; note?: string }) => {
    await axios.post(`${base}/${id}/contributions`, data, { withCredentials: true });
    await refreshContributions(id, state.contributionSummary?.period).catch(() => {});
  };

  const removeContribution = async (id: string, contributionId: string) => {
    await axios.delete(`${base}/${id}/contributions/${contributionId}`, { withCredentials: true });
    await refreshContributions(id, state.contributionSummary?.period).catch(() => {});
  };

  const refreshSubscriptions = async (id: string) => {
    const res = await axios.get(`${base}/${id}/subscriptions`, { withCredentials: true });
    dispatch({ type: "SET_SUBSCRIPTIONS", payload: res.data.data });
  };

  const createSubscription = async (id: string, data: { name: string; provider?: string; category: string; amount: number; billingCycle: "monthly" | "yearly"; nextBillingDate: string }) => {
    await axios.post(`${base}/${id}/subscriptions`, data, { withCredentials: true });
    await refreshSubscriptions(id).catch(() => {});
  };

  const updateSubscription = async (id: string, subscriptionId: string, data: Partial<{ name: string; provider: string | null; category: string; amount: number; billingCycle: "monthly" | "yearly"; nextBillingDate: string; isActive: boolean }>) => {
    await axios.put(`${base}/${id}/subscriptions/${subscriptionId}`, data, { withCredentials: true });
    await refreshSubscriptions(id).catch(() => {});
  };

  const deleteSubscription = async (id: string, subscriptionId: string) => {
    await axios.delete(`${base}/${id}/subscriptions/${subscriptionId}`, { withCredentials: true });
    await refreshSubscriptions(id).catch(() => {});
  };

  const paySubscription = async (id: string, subscriptionId: string) => {
    await axios.post(`${base}/${id}/subscriptions/${subscriptionId}/pay`, {}, { withCredentials: true });
    await refreshSubscriptions(id).catch(() => {});
  };

  const undoSubscriptionPayment = async (id: string, subscriptionId: string) => {
    await axios.delete(`${base}/${id}/subscriptions/${subscriptionId}/payments`, { withCredentials: true });
    await refreshSubscriptions(id).catch(() => {});
  };

  const refreshReport = useCallback(async (id: string, period?: string) => {
    const res = await axios.get(`${base}/${id}/reports`, { withCredentials: true, params: period ? { period } : undefined });
    dispatch({ type: "SET_REPORT", payload: res.data.data });
  }, [base]);

  const refreshInsights = useCallback(async (id: string, period?: string) => {
    const res = await axios.get(`${base}/${id}/insights`, { withCredentials: true, params: period ? { period } : undefined });
    dispatch({ type: "SET_INSIGHTS", payload: res.data.data });
  }, [base]);

  const refreshForecast = useCallback(async (id: string) => {
    const res = await axios.get(`${base}/${id}/forecast`, { withCredentials: true });
    dispatch({ type: "SET_FORECAST", payload: res.data.data });
  }, [base]);

  const runHouseholdWhatIf = async (id: string, scenario: HouseholdWhatIfScenarioInput) => {
    try {
      const res = await axios.post(`${base}/${id}/what-if`, scenario, { withCredentials: true });
      return { success: true, data: res.data.data as HouseholdWhatIfResult };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not run that scenario." };
    }
  };

  const refreshProactiveAlerts = async (id: string, status?: string) => {
    const res = await axios.get(`${base}/${id}/proactive-alerts`, { withCredentials: true, params: status && status !== "all" ? { status } : undefined });
    dispatch({ type: "SET_PROACTIVE_ALERTS", payload: res.data.data });
  };

  const runHouseholdProactiveCheck = async (id: string) => {
    await axios.post(`${base}/${id}/proactive-alerts/run`, {}, { withCredentials: true });
    await refreshProactiveAlerts(id, "open").catch(() => {});
  };

  const dismissHouseholdProactiveAlert = async (id: string, alertId: string) => {
    dispatch({ type: "SET_PROACTIVE_ALERTS", payload: state.proactiveAlerts.filter((a) => a.id !== alertId) });
    try {
      await axios.post(`${base}/${id}/proactive-alerts/${alertId}/dismiss`, {}, { withCredentials: true });
    } catch {
      await refreshProactiveAlerts(id, "open");
    }
  };

  const myRole = (() => {
    if (!state.currentHouseholdId || !authState.user) return null;
    const membership = state.members.find((m) => m.userId === authState.user!.id);
    return membership?.role ?? null;
  })();

  const value = {
    state,
    myRole,
    loadHouseholdData,
    refreshHouseholds,
    selectHousehold,
    createHousehold,
    deleteHousehold,
    refreshMembers,
    refreshMyInvitations,
    refreshPendingInvitations,
    refreshTransactions,
    refreshBudgets,
    setHouseholdBudgets,
    inviteMember,
    revokeInvitation,
    acceptInvitation,
    declineInvitation,
    changeMemberRole,
    removeMember,
    refreshBills,
    createBill,
    updateBill,
    deleteBill,
    payBill,
    undoBillPayment,
    refreshGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    addGoalContribution,
    removeGoalContribution,
    refreshContributions,
    setContributionTarget,
    recordContribution,
    removeContribution,
    refreshSubscriptions,
    createSubscription,
    updateSubscription,
    deleteSubscription,
    paySubscription,
    undoSubscriptionPayment,
    refreshReport,
    refreshInsights,
    refreshForecast,
    runHouseholdWhatIf,
    refreshProactiveAlerts,
    runHouseholdProactiveCheck,
    dismissHouseholdProactiveAlert,
  };

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}

export function useHousehold() {
  const context = useContext(HouseholdContext);
  if (!context) throw new Error("useHousehold must be used within a HouseholdProvider");
  return context;
}
