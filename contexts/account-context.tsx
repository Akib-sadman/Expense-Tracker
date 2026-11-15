"use client"

import { createContext, useContext, useReducer, useEffect } from "react";
import { useAuth } from "./auth-context";
import axios from "axios";
import { API_BASE } from "@/lib/api/api-base"

export type AccountType = "cash" | "bank" | "savings" | "credit_card" | "mobile_wallet" | "investment";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  startingBalance: number;
  balance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AccountState {
  accounts: Account[];
  isLoading: boolean;
  loadError: string | null;
}

type AccountAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_LOAD_ERROR"; payload: string | null }
  | { type: "SET_ACCOUNTS"; payload: Account[] }
  | { type: "UPSERT_ACCOUNT"; payload: Account }
  | { type: "REMOVE_ACCOUNT"; payload: string }
  | { type: "RESET" };

const initialState: AccountState = { accounts: [], isLoading: false, loadError: null };

function reducer(state: AccountState, action: AccountAction): AccountState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_LOAD_ERROR":
      return { ...state, loadError: action.payload };
    case "SET_ACCOUNTS":
      return { ...state, accounts: action.payload };
    case "UPSERT_ACCOUNT": {
      const exists = state.accounts.some((a) => a.id === action.payload.id);
      const accounts = exists
        ? state.accounts.map((a) => (a.id === action.payload.id ? action.payload : a))
        : [...state.accounts, action.payload];
      return { ...state, accounts };
    }
    case "REMOVE_ACCOUNT":
      return { ...state, accounts: state.accounts.filter((a) => a.id !== action.payload) };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

const AccountContext = createContext<{
  state: AccountState;
  refreshAccounts: () => Promise<void>;
  createAccount: (input: { name: string; type: AccountType; currency?: string; startingBalance?: number }) => Promise<{ success: boolean; error?: string }>;
  updateAccount: (
    id: string,
    input: Partial<{ name: string; type: AccountType; currency: string; startingBalance: number; isActive: boolean }>
  ) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: (id: string) => Promise<{ success: boolean; error?: string }>;
} | null>(null);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const base = (API_BASE) + "/api/v1/accounts";
  const { state: authState } = useAuth();

  const refreshAccounts = async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const res = await axios.get(base, { withCredentials: true });
      dispatch({ type: "SET_ACCOUNTS", payload: res.data.data });
      dispatch({ type: "SET_LOAD_ERROR", payload: null });
    } catch (err: any) {
      dispatch({ type: "SET_LOAD_ERROR", payload: err?.response?.data?.error?.message || "Could not load your accounts." });
      throw err;
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  useEffect(() => {
    dispatch({ type: "RESET" });
    if (!authState.isAuthenticated) return;
    refreshAccounts().catch((err) => console.error("Error loading accounts:", err));
  }, [authState.isAuthenticated, authState.user?.id]);

  const createAccount = async (input: { name: string; type: AccountType; currency?: string; startingBalance?: number }) => {
    try {
      const res = await axios.post(base, input, { withCredentials: true });
      dispatch({ type: "UPSERT_ACCOUNT", payload: res.data.data });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not create account." };
    }
  };

  const updateAccount = async (
    id: string,
    input: Partial<{ name: string; type: AccountType; currency: string; startingBalance: number; isActive: boolean }>
  ) => {
    try {
      const res = await axios.put(`${base}/${id}`, input, { withCredentials: true });
      dispatch({ type: "UPSERT_ACCOUNT", payload: res.data.data });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not update account." };
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      await axios.delete(`${base}/${id}`, { withCredentials: true });
      dispatch({ type: "REMOVE_ACCOUNT", payload: id });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not delete account." };
    }
  };

  return (
    <AccountContext.Provider value={{ state, refreshAccounts, createAccount, updateAccount, deleteAccount }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccounts() {
  const context = useContext(AccountContext);
  if (!context) throw new Error("useAccounts must be used within an AccountProvider");
  return context;
}
