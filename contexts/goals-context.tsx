"use client"

import { createContext, useContext, useReducer, useEffect } from "react";
import { useAuth } from "./auth-context";
import axios from "axios";
import { API_BASE } from "@/lib/api/api-base"

export interface GoalSchedule {
  amount: number;
  day: number;
  nextContributionDate: string;
  contributedThisCycle: boolean;
  contributionsRemaining: number;
  isOverdue: boolean;
  isDueSoon: boolean;
}

export interface GoalContribution {
  id: string;
  goalId: string;
  amount: number;
  note?: string;
  contributedAt: string;
}

export interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  targetDate?: string;
  scheduleAmount?: number;
  scheduleDay?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  savedAmount: number;
  remaining: number;
  percentComplete: number;
  isAchieved: boolean;
  schedule: GoalSchedule | null;
  contributions: GoalContribution[];
}

export interface CreateGoalInput {
  name: string;
  targetAmount: number;
  targetDate?: string;
  scheduleAmount?: number;
  scheduleDay?: number;
}

export interface UpdateGoalInput {
  name?: string;
  targetAmount?: number;
  targetDate?: string | null;
  scheduleAmount?: number | null;
  scheduleDay?: number | null;
  isActive?: boolean;
}

interface GoalsState {
  goals: Goal[];
  isLoading: boolean;
  hasLoaded: boolean;
  loadError: string | null;
}

type GoalsAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_LOAD_ERROR"; payload: string | null }
  | { type: "SET_GOALS"; payload: Goal[] }
  | { type: "RESET" };

const initialState: GoalsState = { goals: [], isLoading: false, hasLoaded: false, loadError: null };

function reducer(state: GoalsState, action: GoalsAction): GoalsState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_LOAD_ERROR":
      return { ...state, loadError: action.payload };
    case "SET_GOALS":
      return { ...state, goals: action.payload, hasLoaded: true };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

const GoalsContext = createContext<{
  state: GoalsState;
  refreshGoals: () => Promise<void>;
  reloadGoals: () => Promise<void>;
  createGoal: (input: CreateGoalInput) => Promise<{ success: boolean; error?: string }>;
  updateGoal: (id: string, input: UpdateGoalInput) => Promise<{ success: boolean; error?: string }>;
  deleteGoal: (id: string) => Promise<{ success: boolean; error?: string }>;
  addContribution: (id: string, input: { amount: number; note?: string }) => Promise<{ success: boolean; error?: string }>;
  removeContribution: (goalId: string, contributionId: string) => Promise<{ success: boolean; error?: string }>;
} | null>(null);

export function GoalsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const base = (API_BASE) + "/api/v1/goals";
  const { state: authState } = useAuth();

  const refreshGoals = async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const res = await axios.get(base, { withCredentials: true });
      dispatch({ type: "SET_GOALS", payload: res.data.data });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const reloadGoals = async () => {
    dispatch({ type: "SET_LOAD_ERROR", payload: null });
    try {
      await refreshGoals();
    } catch (err: any) {
      console.error("Error loading goals:", err);
      dispatch({ type: "SET_LOAD_ERROR", payload: err?.response?.data?.error?.message || "Could not load your goals." });
    }
  };

  useEffect(() => {
    if (!authState.isAuthenticated) return;
    reloadGoals();
  }, [authState.isAuthenticated]);

  const createGoal = async (input: CreateGoalInput) => {
    try {
      await axios.post(base, input, { withCredentials: true });
      await refreshGoals().catch(() => {});
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not create goal." };
    }
  };

  const updateGoal = async (id: string, input: UpdateGoalInput) => {
    try {
      await axios.put(`${base}/${id}`, input, { withCredentials: true });
      await refreshGoals().catch(() => {});
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not update goal." };
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      await axios.delete(`${base}/${id}`, { withCredentials: true });
      await refreshGoals().catch(() => {});
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not delete goal." };
    }
  };

  const addContribution = async (id: string, input: { amount: number; note?: string }) => {
    try {
      await axios.post(`${base}/${id}/contributions`, input, { withCredentials: true });
      await refreshGoals().catch(() => {});
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not add contribution." };
    }
  };

  const removeContribution = async (goalId: string, contributionId: string) => {
    try {
      await axios.delete(`${base}/${goalId}/contributions/${contributionId}`, { withCredentials: true });
      await refreshGoals().catch(() => {});
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not remove contribution." };
    }
  };

  return (
    <GoalsContext.Provider value={{ state, refreshGoals, reloadGoals, createGoal, updateGoal, deleteGoal, addContribution, removeContribution }}>
      {children}
    </GoalsContext.Provider>
  );
}

export function useGoals() {
  const context = useContext(GoalsContext);
  if (!context) throw new Error("useGoals must be used within a GoalsProvider");
  return context;
}
