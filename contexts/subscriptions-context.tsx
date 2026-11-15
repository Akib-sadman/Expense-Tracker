"use client"

import { createContext, useContext, useReducer, useEffect } from "react";
import { useAuth } from "./auth-context";
import axios from "axios";
import { API_BASE } from "@/lib/api/api-base"

export type BillingCycle = "monthly" | "yearly";

export interface SubscriptionPayment {
  id: string;
  subscriptionId: string;
  amount: number;
  period: string;
  paidAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  name: string;
  provider?: string;
  category: string;
  amount: number;
  billingCycle: BillingCycle;
  nextBillingDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  paidForCurrentCycle: boolean;
  currentPayment: SubscriptionPayment | null;
  recentPayments: SubscriptionPayment[];
}

export interface CreateSubscriptionInput {
  name: string;
  provider?: string;
  category: string;
  amount: number;
  billingCycle: BillingCycle;
  nextBillingDate: string;
}

export interface UpdateSubscriptionInput {
  name?: string;
  provider?: string | null;
  category?: string;
  amount?: number;
  billingCycle?: BillingCycle;
  nextBillingDate?: string;
  isActive?: boolean;
}

export interface DetectedRecurringCharge {
  vendor: string;
  amount: number;
  category: string;
  billingCycle: BillingCycle;
  occurrenceCount: number;
  lastOccurrenceDate: string;
  suggestedNextBillingDate: string;
}

interface SubscriptionsState {
  subscriptions: Subscription[];
  isLoading: boolean;
  loadError: string | null;
}

type SubscriptionsAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_LOAD_ERROR"; payload: string | null }
  | { type: "SET_SUBSCRIPTIONS"; payload: Subscription[] }
  | { type: "RESET" };

const initialState: SubscriptionsState = { subscriptions: [], isLoading: false, loadError: null };

function reducer(state: SubscriptionsState, action: SubscriptionsAction): SubscriptionsState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_LOAD_ERROR":
      return { ...state, loadError: action.payload };
    case "SET_SUBSCRIPTIONS":
      return { ...state, subscriptions: action.payload };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

const SubscriptionsContext = createContext<{
  state: SubscriptionsState;
  refreshSubscriptions: () => Promise<void>;
  reloadSubscriptions: () => Promise<void>;
  createSubscription: (input: CreateSubscriptionInput) => Promise<{ success: boolean; error?: string }>;
  updateSubscription: (id: string, input: UpdateSubscriptionInput) => Promise<{ success: boolean; error?: string }>;
  deleteSubscription: (id: string) => Promise<{ success: boolean; error?: string }>;
  paySubscription: (id: string, input?: { period?: string; amount?: number }) => Promise<{ success: boolean; error?: string }>;
  undoSubscriptionPayment: (id: string) => Promise<{ success: boolean; error?: string }>;
  fetchDetectedCharges: () => Promise<{ success: boolean; data?: DetectedRecurringCharge[]; error?: string }>;
} | null>(null);

export function SubscriptionsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const base = (API_BASE) + "/api/v1/subscriptions";
  const { state: authState } = useAuth();

  const refreshSubscriptions = async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const res = await axios.get(base, { withCredentials: true });
      dispatch({ type: "SET_SUBSCRIPTIONS", payload: res.data.data });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const reloadSubscriptions = async () => {
    dispatch({ type: "SET_LOAD_ERROR", payload: null });
    try {
      await refreshSubscriptions();
    } catch (err: any) {
      console.error("Error loading subscriptions:", err);
      dispatch({ type: "SET_LOAD_ERROR", payload: err?.response?.data?.error?.message || "Could not load your subscriptions." });
    }
  };

  useEffect(() => {
    if (!authState.isAuthenticated) return;
    reloadSubscriptions();
  }, [authState.isAuthenticated]);

  const createSubscription = async (input: CreateSubscriptionInput) => {
    try {
      await axios.post(base, input, { withCredentials: true });
      await refreshSubscriptions().catch(() => {});
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not create subscription." };
    }
  };

  const updateSubscription = async (id: string, input: UpdateSubscriptionInput) => {
    try {
      await axios.put(`${base}/${id}`, input, { withCredentials: true });
      await refreshSubscriptions().catch(() => {});
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not update subscription." };
    }
  };

  const deleteSubscription = async (id: string) => {
    try {
      await axios.delete(`${base}/${id}`, { withCredentials: true });
      await refreshSubscriptions().catch(() => {});
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not delete subscription." };
    }
  };

  const paySubscription = async (id: string, input: { period?: string; amount?: number } = {}) => {
    try {
      await axios.post(`${base}/${id}/pay`, input, { withCredentials: true });
      await refreshSubscriptions().catch(() => {});
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not mark subscription paid." };
    }
  };

  const undoSubscriptionPayment = async (id: string) => {
    try {
      await axios.delete(`${base}/${id}/payments`, { withCredentials: true });
      await refreshSubscriptions().catch(() => {});
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not undo payment." };
    }
  };

  const fetchDetectedCharges = async () => {
    try {
      const res = await axios.get(`${base}/detected`, { withCredentials: true });
      return { success: true, data: res.data.data as DetectedRecurringCharge[] };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not detect recurring charges." };
    }
  };

  return (
    <SubscriptionsContext.Provider
      value={{ state, refreshSubscriptions, reloadSubscriptions, createSubscription, updateSubscription, deleteSubscription, paySubscription, undoSubscriptionPayment, fetchDetectedCharges }}
    >
      {children}
    </SubscriptionsContext.Provider>
  );
}

export function useSubscriptions() {
  const context = useContext(SubscriptionsContext);
  if (!context) throw new Error("useSubscriptions must be used within a SubscriptionsProvider");
  return context;
}
