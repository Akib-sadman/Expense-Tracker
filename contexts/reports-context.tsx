"use client";

import { createContext, useContext, useReducer } from "react";
import axios from "axios";
import { API_BASE } from "@/lib/api/api-base"

export interface PersonalReport {
  period: string;
  spending: { total: number; byCategory: { category: string; amount: number }[] };
  income: number;
  cashFlow: number;
  budgetPerformance: {
    totalBudget: number;
    totalSpent: number;
    byCategory: { category: string; budget: number; spent: number; percentComplete: number }[];
  };
  savingsRate: number | null;
  netWorth: { total: number; totalBalance: number; totalDebt: number };
}

export interface CashFlowMonth {
  monthsAhead: number;
  projectedBalance: number;
}

export interface BudgetOverrunRisk {
  type: string;
  severity: "info" | "warning" | "critical";
  subjectId: string;
  title: string;
  summary: string;
  evidence: Record<string, unknown>;
}

export interface GoalForecast {
  goalId: string;
  name: string;
  remaining: number;
  averageMonthlyContribution: number;
  monthsToComplete: number | null;
  projectedDate: string | null;
}

export interface HistoricalCashFlowMonth {
  month: string;
  income: number;
  expenses: number;
  cashFlow: number;
}

export interface UpcomingBill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  isOverdue: boolean;
  isDueSoon: boolean;
}

export interface PersonalForecast {
  spendingForecast: { trailingMonths: number; averageMonthlyIncome: number; averageMonthlyExpense: number; projectedNextMonthSpending: number };
  cashFlowForecast: { currentBalance: number; months: CashFlowMonth[] };
  historicalCashFlow: HistoricalCashFlowMonth[];
  upcomingBills: UpcomingBill[];
  budgetOverrunRisk: BudgetOverrunRisk[];
  goalForecasts: GoalForecast[];
}

export interface WhatIfScenarioInput {
  oneTimeExpense?: number;
  monthlyIncomeChangePct?: number;
  monthlyExpenseChangePct?: number;
  newMonthlyContribution?: number;
  monthsAhead?: number;
}

export interface WhatIfResult {
  assumptions: WhatIfScenarioInput & { monthsAhead: number };
  baseline: { currentBalance: number; avgMonthlyIncome: number; avgMonthlyExpense: number; months: CashFlowMonth[] };
  scenario: { adjustedBalance: number; adjustedIncome: number; adjustedExpense: number; months: CashFlowMonth[] };
  aiExplanation: string | null;
}

interface ReportsState {
  report: PersonalReport | null;
  forecast: PersonalForecast | null;
  isLoading: boolean;
  reportError: string | null;
  forecastError: string | null;
}

type ReportsAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_REPORT"; payload: PersonalReport }
  | { type: "SET_REPORT_ERROR"; payload: string }
  | { type: "SET_FORECAST"; payload: PersonalForecast }
  | { type: "SET_FORECAST_ERROR"; payload: string }
  | { type: "RESET" };

const initialState: ReportsState = { report: null, forecast: null, isLoading: false, reportError: null, forecastError: null };

function reducer(state: ReportsState, action: ReportsAction): ReportsState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_REPORT":
      return { ...state, report: action.payload, reportError: null };
    case "SET_REPORT_ERROR":
      return { ...state, reportError: action.payload };
    case "SET_FORECAST":
      return { ...state, forecast: action.payload, forecastError: null };
    case "SET_FORECAST_ERROR":
      return { ...state, forecastError: action.payload };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

const ReportsContext = createContext<{
  state: ReportsState;
  refreshReport: (period?: string) => Promise<void>;
  refreshForecast: () => Promise<void>;
  runWhatIf: (scenario: WhatIfScenarioInput) => Promise<{ success: boolean; data?: WhatIfResult; error?: string }>;
  reset: () => void;
} | null>(null);

export function ReportsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const base = (API_BASE) + "/api/v1/reports";

  const refreshReport = async (period?: string) => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const res = await axios.get(base, { withCredentials: true, params: period ? { period } : undefined });
      dispatch({ type: "SET_REPORT", payload: res.data.data });
    } catch (err: any) {
      dispatch({ type: "SET_REPORT_ERROR", payload: err?.response?.data?.error?.message || "Could not load your report." });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const refreshForecast = async () => {
    try {
      const res = await axios.get(`${base}/forecast`, { withCredentials: true });
      dispatch({ type: "SET_FORECAST", payload: res.data.data });
    } catch (err: any) {
      dispatch({ type: "SET_FORECAST_ERROR", payload: err?.response?.data?.error?.message || "Could not load your forecast." });
    }
  };

  const runWhatIf = async (scenario: WhatIfScenarioInput) => {
    try {
      const res = await axios.post(`${base}/what-if`, scenario, { withCredentials: true });
      return { success: true, data: res.data.data as WhatIfResult };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not run that scenario." };
    }
  };

  const reset = () => dispatch({ type: "RESET" });

  return (
    <ReportsContext.Provider value={{ state, refreshReport, refreshForecast, runWhatIf, reset }}>
      {children}
    </ReportsContext.Provider>
  );
}

export function useReports() {
  const context = useContext(ReportsContext);
  if (!context) throw new Error("useReports must be used within a ReportsProvider");
  return context;
}
