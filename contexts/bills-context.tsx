"use client"

import { createContext, useContext, useReducer, useEffect } from "react";
import { useAuth } from "./auth-context";
import axios from "axios";
import { API_BASE } from "@/lib/api/api-base"

export type BillRecurrence = "one_time" | "monthly";

export interface Bill {
  id: string;
  userId: string;
  name: string;
  category: string;
  amount: number;
  recurrence: BillRecurrence;
  dueDay?: number;
  dueDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  paid: boolean;
  daysUntilDue: number;
  isOverdue: boolean;
  isDueSoon: boolean;
  currentPayment: { id: string; billId: string; period: string; amount: number; paidAt: string } | null;
}

export interface CreateBillInput {
  name: string;
  category: string;
  amount: number;
  recurrence: BillRecurrence;
  dueDay?: number;
  dueDate?: string;
}

export interface UpdateBillInput {
  name?: string;
  category?: string;
  amount?: number;
  dueDay?: number;
  dueDate?: string;
  isActive?: boolean;
}

interface BillsState {
  bills: Bill[];
  isLoading: boolean;
  loadError: string | null;
}

type BillsAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_LOAD_ERROR"; payload: string | null }
  | { type: "SET_BILLS"; payload: Bill[] }
  | { type: "UPSERT_BILL"; payload: Bill }
  | { type: "REMOVE_BILL"; payload: string }
  | { type: "RESET" };

const initialState: BillsState = { bills: [], isLoading: false, loadError: null };

function reducer(state: BillsState, action: BillsAction): BillsState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_LOAD_ERROR":
      return { ...state, loadError: action.payload };
    case "SET_BILLS":
      return { ...state, bills: action.payload };
    case "UPSERT_BILL": {
      const exists = state.bills.some((b) => b.id === action.payload.id);
      const bills = exists ? state.bills.map((b) => (b.id === action.payload.id ? action.payload : b)) : [...state.bills, action.payload];
      return { ...state, bills };
    }
    case "REMOVE_BILL":
      return { ...state, bills: state.bills.filter((b) => b.id !== action.payload) };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

const BillsContext = createContext<{
  state: BillsState;
  refreshBills: () => Promise<void>;
  reloadBills: () => Promise<void>;
  createBill: (input: CreateBillInput) => Promise<{ success: boolean; error?: string }>;
  updateBill: (id: string, input: UpdateBillInput) => Promise<{ success: boolean; error?: string }>;
  deleteBill: (id: string) => Promise<{ success: boolean; error?: string }>;
  payBill: (id: string, input?: { period?: string; amount?: number }) => Promise<{ success: boolean; error?: string }>;
  undoBillPayment: (id: string, period?: string) => Promise<{ success: boolean; error?: string }>;
} | null>(null);

export function BillsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const base = (API_BASE) + "/api/v1/bills";
  const { state: authState } = useAuth();

  const refreshBills = async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const res = await axios.get(base, { withCredentials: true });
      dispatch({ type: "SET_BILLS", payload: res.data.data });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const reloadBills = async () => {
    dispatch({ type: "SET_LOAD_ERROR", payload: null });
    try {
      await refreshBills();
    } catch (err: any) {
      console.error("Error loading bills:", err);
      dispatch({ type: "SET_LOAD_ERROR", payload: err?.response?.data?.error?.message || "Could not load your bills." });
    }
  };

  useEffect(() => {
    dispatch({ type: "RESET" });
    if (!authState.isAuthenticated) return;
    reloadBills();
  }, [authState.isAuthenticated, authState.user?.id]);

  const createBill = async (input: CreateBillInput) => {
    try {
      await axios.post(base, input, { withCredentials: true });
      await refreshBills().catch(() => {});
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not create bill." };
    }
  };

  const updateBill = async (id: string, input: UpdateBillInput) => {
    try {
      await axios.put(`${base}/${id}`, input, { withCredentials: true });
      await refreshBills().catch(() => {});
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not update bill." };
    }
  };

  const deleteBill = async (id: string) => {
    try {
      await axios.delete(`${base}/${id}`, { withCredentials: true });
      dispatch({ type: "REMOVE_BILL", payload: id });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not delete bill." };
    }
  };

  const payBill = async (id: string, input: { period?: string; amount?: number } = {}) => {
    try {
      await axios.post(`${base}/${id}/pay`, input, { withCredentials: true });
      await refreshBills().catch(() => {});
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not mark bill paid." };
    }
  };

  const undoBillPayment = async (id: string, period?: string) => {
    try {
      const query = period ? `?period=${encodeURIComponent(period)}` : "";
      await axios.delete(`${base}/${id}/payments${query}`, { withCredentials: true });
      await refreshBills().catch(() => {});
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not undo payment." };
    }
  };

  return (
    <BillsContext.Provider value={{ state, refreshBills, reloadBills, createBill, updateBill, deleteBill, payBill, undoBillPayment }}>
      {children}
    </BillsContext.Provider>
  );
}

export function useBills() {
  const context = useContext(BillsContext);
  if (!context) throw new Error("useBills must be used within a BillsProvider");
  return context;
}
