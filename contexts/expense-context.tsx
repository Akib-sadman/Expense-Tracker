import { createContext, useContext, useReducer, useEffect } from "react";
import { useAuth } from "./auth-context";
import axios from "axios";
import { API_BASE } from "@/lib/api/api-base"

export type TransactionType = "expense" | "income" | "transfer" | "refund";

export interface Expense {
  id: string;
  date: Date;
  vendor: string;
  category: string;
  amount: number;
  type: TransactionType;
  accountId?: string;
  transferAccountId?: string;
  paymentMethod?: string;
  subcategory?: string;
  tags: string[];
  description: string;
  notes?: string;
  receiptImage?: string;
  items?: Array<{ id: number; name: string; price: number }>;
  householdId?: string | null;
  originalCurrency?: string;
  originalAmount?: number;
  exchangeRate?: number;
  rateDate?: string;
  rateSource?: "manual" | "automatic";
  updatedAt?: string;
}

export function effectiveSpendAmount(expense: Pick<Expense, "type" | "amount">): number {
  if (expense.type === "expense") return expense.amount;
  if (expense.type === "refund") return -expense.amount;
  return 0;
}

export interface Budget {
  [categoryId: string]: number;
}

export interface BudgetStatus {
  category: string;
  limit: number;
  rolledOver: number;
  effectiveLimit: number;
  spent: number;
  remaining: number;
  pct: number;
  alertThresholdPct: number;
  rolloverEnabled: boolean;
  isOverBudget: boolean;
  isNearThreshold: boolean;
}

export interface ExpenseSearchFilters {
  category?: string;
  subcategory?: string;
  type?: TransactionType;
  accountId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  tags?: string;
  limit?: number;
}

interface ExpenseState {
  expenses: Expense[];
  budgets: Budget;
  totalBudget: number;
  /** Overall monthly budget; null when not set (fall back to the category total). */
  monthlyBudget: number | null;
  hasLoadedInitialData: boolean;
}

type ExpenseAction =
  | { type: "ADD_EXPENSE"; payload: Expense }
  | { type: "UPDATE_EXPENSE"; payload: { id: string; expense: Partial<Expense> } }
  | { type: "DELETE_EXPENSE"; payload: string }
  | { type: "SET_BUDGET"; payload: { categoryId: string; amount: number } }
  | { type: "SET_BUDGETS"; payload: Budget }
  | { type: "SET_MONTHLY_BUDGET"; payload: number | null }
  | { type: "LOAD_DATA"; payload: ExpenseState };

const initialState: ExpenseState = {
  expenses: [],
  budgets: {
    food: 0,
    transport: 0,
    shopping: 0,
    bills: 0,
    entertainment: 0,
    healthcare: 0,
    education: 0,
    travel: 0,
    groceries: 0,
    other: 0,
  },
  totalBudget: 0,
  monthlyBudget: null,
  hasLoadedInitialData: false,
};

function expenseReducer(state: ExpenseState, action: ExpenseAction): ExpenseState {
  switch (action.type) {
    case "ADD_EXPENSE":
      return { ...state, expenses: [...state.expenses, action.payload] };
    case "UPDATE_EXPENSE":
      return {
        ...state,
        expenses: state.expenses.map((expense) =>
          expense.id === action.payload.id ? { ...expense, ...action.payload.expense } : expense
        ),
      };
    case "DELETE_EXPENSE":
      return {
        ...state,
        expenses: state.expenses.filter((expense) => expense.id !== action.payload),
      };
    case "SET_BUDGET":
      return {
        ...state,
        budgets: { ...state.budgets, [action.payload.categoryId]: action.payload.amount },
      };
    case "SET_BUDGETS":
      return {
        ...state,
        budgets: action.payload,
        totalBudget: Object.values(action.payload).reduce((sum, budget) => sum + budget, 0),
      };
    case "SET_MONTHLY_BUDGET":
      return { ...state, monthlyBudget: action.payload };
    case "LOAD_DATA":
      return action.payload;
    default:
      return state;
  }
}

const ExpenseContext = createContext<{
  state: ExpenseState;
  dispatch: React.Dispatch<ExpenseAction>;
  addExpense: (expense: Omit<Expense, "id" | "type" | "tags"> & { type?: TransactionType; tags?: string[] }) => Promise<{ success: boolean; error?: string }>;
  updateExpense: (
    id: string,
    expense: Partial<Omit<Expense, "paymentMethod" | "subcategory" | "updatedAt">> & { paymentMethod?: string | null; subcategory?: string | null; expectedUpdatedAt?: string }
  ) => Promise<{ success: boolean; error?: string; conflict?: boolean; currentExpense?: Expense }>;
  deleteExpense: (id: string) => Promise<{ success: boolean; error?: string }>;
  searchExpenses: (filters: ExpenseSearchFilters) => Promise<{ success: boolean; data?: Expense[]; error?: string }>;
  setBudget: (categoryId: string, amount: number) => void;
  setBudgets: (budgets: Budget) => Promise<{ success: boolean; error?: string }>;
  setMonthlyBudget: (amount: number | null) => Promise<{ success: boolean; error?: string }>;
  getMonthlyExpenses: (month?: number, year?: number) => Expense[];
  fetchBudgetStatus: () => Promise<{ success: boolean; data?: BudgetStatus[]; error?: string }>;
  updateBudgetSetting: (
    category: string,
    settings: { alertThresholdPct?: number; rolloverEnabled?: boolean }
  ) => Promise<{ success: boolean; error?: string }>;
} | null>(null);

export function ExpenseProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(expenseReducer, initialState);
  const base = (API_BASE) + "/api/v1"
  const { state: authState } = useAuth()

  useEffect(() => {
    if (!authState.isAuthenticated) return
    const loadUserData = async () => {
      try {
        const [expRes, budRes] = await Promise.all([
          axios.get(`${base}/spending-open`, { withCredentials: true }),
          axios.get(`${base}/budgets`, { withCredentials: true }),
        ])
        const expenses = expRes.data.data.map((expense: any) => ({ ...expense, date: new Date(expense.date) }))
        const { budgets, totalBudget, monthlyBudget } = budRes.data.data
        dispatch({ type: "LOAD_DATA", payload: { expenses, budgets, totalBudget, monthlyBudget: monthlyBudget ?? null, hasLoadedInitialData: true } })
      } catch (error) {
        console.error("Error loading user data:", error)
        dispatch({ type: "LOAD_DATA", payload: { expenses: [], budgets: state.budgets, totalBudget: state.totalBudget, monthlyBudget: state.monthlyBudget, hasLoadedInitialData: true } })
      }
    }
    loadUserData()
  }, [authState.isAuthenticated])

  const addExpense = async (expense: Omit<Expense, "id" | "type" | "tags"> & { type?: TransactionType; tags?: string[] }) => {
    try {
      const response = await axios.post(`${base}/spending-open`, expense, { withCredentials: true })
      dispatch({ type: "ADD_EXPENSE", payload: response.data.data });
      return { success: true };
    } catch (error: any) {
      console.error("Error adding expense:", error);
      return { success: false, error: error?.response?.data?.error?.message || "Could not add expense." };
    }
  };

  const updateExpense = async (
    id: string,
    expense: Partial<Omit<Expense, "paymentMethod" | "subcategory" | "updatedAt">> & { paymentMethod?: string | null; subcategory?: string | null; expectedUpdatedAt?: string }
  ) => {
    try {
      const response = await axios.put(`${base}/spending-open/${id}`, expense, { withCredentials: true })
      dispatch({ type: "UPDATE_EXPENSE", payload: { id, expense: response.data.data } });
      return { success: true };
    } catch (error: any) {
      if (error?.response?.status === 409) {
        const currentExpense = error.response.data?.error?.details?.currentTransaction
        if (currentExpense) {
          dispatch({ type: "UPDATE_EXPENSE", payload: { id, expense: { ...currentExpense, date: new Date(currentExpense.date) } } });
        }
        return {
          success: false,
          conflict: true,
          error: "This transaction was changed by someone else. The latest version has been loaded - please review and try again.",
          currentExpense,
        };
      }
      console.error("Error updating expense:", error);
      return { success: false, error: error?.response?.data?.error?.message || "Could not update expense." };
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      await axios.delete(`${base}/spending-open/${id}`, { withCredentials: true })
      dispatch({ type: "DELETE_EXPENSE", payload: id });
      return { success: true };
    } catch (error: any) {
      console.error("Error deleting expense:", error);
      return { success: false, error: error?.response?.data?.error?.message || "Could not delete expense." };
    }
  };

  const searchExpenses = async (filters: ExpenseSearchFilters) => {
    try {
      const params = new URLSearchParams();
      if (filters.category) params.set("category", filters.category);
      if (filters.subcategory) params.set("subcategory", filters.subcategory);
      if (filters.type) params.set("type", filters.type);
      if (filters.accountId) params.set("accountId", filters.accountId);
      if (filters.search) params.set("search", filters.search);
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);
      if (filters.minAmount !== undefined) params.set("minAmount", String(filters.minAmount));
      if (filters.maxAmount !== undefined) params.set("maxAmount", String(filters.maxAmount));
      if (filters.tags) params.set("tags", filters.tags);
      if (filters.limit !== undefined) params.set("limit", String(filters.limit));
      const response = await axios.get(`${base}/spending-open?${params.toString()}`, { withCredentials: true });
      const data = response.data.data.map((expense: any) => ({ ...expense, date: new Date(expense.date) }));
      return { success: true, data };
    } catch (error: any) {
      console.error("Error searching expenses:", error);
      return { success: false, error: error?.response?.data?.error?.message || "Could not search expenses." };
    }
  };

  const getMonthlyExpenses = (month: number = new Date().getMonth(), year: number = new Date().getFullYear()) => {
    return state.expenses.filter((expense) => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() === month && expenseDate.getFullYear() === year;
    });
  };

  const fetchBudgetStatus = async () => {
    try {
      const res = await axios.get(`${base}/budgets/status`, { withCredentials: true });
      return { success: true, data: res.data.data.statuses as BudgetStatus[] };
    } catch (error: any) {
      console.error("Error fetching budget status:", error);
      return { success: false, error: error?.response?.data?.error?.message || "Could not load budget status." };
    }
  };

  const updateBudgetSetting = async (
    category: string,
    settings: { alertThresholdPct?: number; rolloverEnabled?: boolean }
  ) => {
    try {
      await axios.put(`${base}/budgets/${category}/settings`, settings, { withCredentials: true });
      return { success: true };
    } catch (error: any) {
      console.error("Error updating budget settings:", error);
      return { success: false, error: error?.response?.data?.error?.message || "Could not update budget settings." };
    }
  };

  const value = {
    state,
    dispatch,
    addExpense,
    updateExpense,
    deleteExpense,
    searchExpenses,
    setBudget: (categoryId: string, amount: number) => dispatch({ type: "SET_BUDGET", payload: { categoryId, amount } }),
    setBudgets: async (budgets: Budget) => {
      try {
        const res = await axios.put(`${base}/budgets`, { budgets }, { withCredentials: true })
        dispatch({ type: "SET_BUDGETS", payload: res.data.data.budgets })
        return { success: true };
      } catch (error: any) {
        console.error('Failed to save budgets', error)
        return { success: false, error: error?.response?.data?.error?.message || "Could not save budgets." };
      }
    },
    setMonthlyBudget: async (amount: number | null) => {
      try {
        const res = await axios.put(`${base}/budgets/monthly`, { amount }, { withCredentials: true })
        dispatch({ type: "SET_MONTHLY_BUDGET", payload: res.data.data.monthlyBudget })
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error?.response?.data?.error?.message || "Could not save the monthly budget." };
      }
    },
    getMonthlyExpenses,
    fetchBudgetStatus,
    updateBudgetSetting,
  };

  return <ExpenseContext.Provider value={value}>{children}</ExpenseContext.Provider>;
}

export function useExpense() {
  const context = useContext(ExpenseContext);
  if (!context) throw new Error("useExpense must be used within an ExpenseProvider");
  return context;
}
