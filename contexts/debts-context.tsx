"use client"

import { createContext, useContext, useReducer, useEffect } from "react";
import { useAuth } from "./auth-context";
import axios from "axios";
import { API_BASE } from "@/lib/api/api-base"

export type DebtType = "personal_loan" | "credit_card" | "auto_loan" | "student_loan" | "mortgage" | "other";

export interface DebtPayment {
  id: string;
  debtId: string;
  amount: number;
  note?: string;
  paidAt: string;
}

export interface DebtPayoff {
  monthsRemaining: number | null;
  payoffPossible: boolean;
  projectedPayoffDate?: string;
}

export interface Debt {
  id: string;
  userId: string;
  name: string;
  debtType: DebtType;
  principal: number;
  interestRatePct: number;
  termMonths: number;
  startDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  monthlyPayment: number;
  remainingPrincipal: number;
  totalInterestPaid: number;
  totalPrincipalPaid: number;
  paymentsMade: number;
  isPaidOff: boolean;
  nextScheduledDueDate?: string;
  payments: DebtPayment[];
  payoff?: DebtPayoff;
}

export interface CreateDebtInput {
  name: string;
  debtType: DebtType;
  principal: number;
  interestRatePct: number;
  termMonths: number;
  startDate: string;
}

export interface UpdateDebtInput {
  name?: string;
  debtType?: DebtType;
  principal?: number;
  interestRatePct?: number;
  termMonths?: number;
  startDate?: string;
  isActive?: boolean;
}

export interface AmortizationPeriod {
  period: number;
  dueDate: string;
  payment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
}

interface DebtsState {
  debts: Debt[];
  isLoading: boolean;
  loadError: string | null;
}

type DebtsAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_LOAD_ERROR"; payload: string | null }
  | { type: "SET_DEBTS"; payload: Debt[] }
  | { type: "RESET" };

const initialState: DebtsState = { debts: [], isLoading: false, loadError: null };

function reducer(state: DebtsState, action: DebtsAction): DebtsState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_LOAD_ERROR":
      return { ...state, loadError: action.payload };
    case "SET_DEBTS":
      return { ...state, debts: action.payload };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

const DebtsContext = createContext<{
  state: DebtsState;
  refreshDebts: () => Promise<void>;
  reloadDebts: () => Promise<void>;
  createDebt: (input: CreateDebtInput) => Promise<{ success: boolean; error?: string }>;
  updateDebt: (id: string, input: UpdateDebtInput) => Promise<{ success: boolean; error?: string }>;
  deleteDebt: (id: string) => Promise<{ success: boolean; error?: string }>;
  addPayment: (id: string, input: { amount: number; note?: string; idempotencyKey?: string }) => Promise<{ success: boolean; error?: string }>;
  removePayment: (debtId: string, paymentId: string) => Promise<{ success: boolean; error?: string }>;
  fetchSchedule: (id: string) => Promise<{ success: boolean; data?: AmortizationPeriod[]; error?: string }>;
} | null>(null);

export function DebtsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const base = (API_BASE) + "/api/v1/debts";
  const { state: authState } = useAuth();

  const refreshDebts = async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const res = await axios.get(base, { withCredentials: true });
      dispatch({ type: "SET_DEBTS", payload: res.data.data });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const reloadDebts = async () => {
    dispatch({ type: "SET_LOAD_ERROR", payload: null });
    try {
      await refreshDebts();
    } catch (err: any) {
      console.error("Error loading debts:", err);
      dispatch({ type: "SET_LOAD_ERROR", payload: err?.response?.data?.error?.message || "Could not load your debts." });
    }
  };

  useEffect(() => {
    if (!authState.isAuthenticated) return;
    reloadDebts();
  }, [authState.isAuthenticated]);

  const createDebt = async (input: CreateDebtInput) => {
    try {
      await axios.post(base, input, { withCredentials: true });
      await refreshDebts().catch(() => {});
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not create debt." };
    }
  };

  const updateDebt = async (id: string, input: UpdateDebtInput) => {
    try {
      await axios.put(`${base}/${id}`, input, { withCredentials: true });
      await refreshDebts().catch(() => {});
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not update debt." };
    }
  };

  const deleteDebt = async (id: string) => {
    try {
      await axios.delete(`${base}/${id}`, { withCredentials: true });
      await refreshDebts().catch(() => {});
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not delete debt." };
    }
  };

  const addPayment = async (id: string, input: { amount: number; note?: string; idempotencyKey?: string }) => {
    try {
      await axios.post(`${base}/${id}/payments`, input, { withCredentials: true });
      await refreshDebts().catch(() => {});
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not add payment." };
    }
  };

  const removePayment = async (debtId: string, paymentId: string) => {
    try {
      await axios.delete(`${base}/${debtId}/payments/${paymentId}`, { withCredentials: true });
      await refreshDebts().catch(() => {});
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not remove payment." };
    }
  };

  const fetchSchedule = async (id: string) => {
    try {
      const res = await axios.get(`${base}/${id}/schedule`, { withCredentials: true });
      return { success: true, data: res.data.data as AmortizationPeriod[] };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not load schedule." };
    }
  };

  return (
    <DebtsContext.Provider value={{ state, refreshDebts, reloadDebts, createDebt, updateDebt, deleteDebt, addPayment, removePayment, fetchSchedule }}>
      {children}
    </DebtsContext.Provider>
  );
}

export function useDebts() {
  const context = useContext(DebtsContext);
  if (!context) throw new Error("useDebts must be used within a DebtsProvider");
  return context;
}
