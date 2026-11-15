"use client"

import { createContext, useContext, useReducer, useEffect } from "react";
import { useAuth } from "./auth-context";
import axios from "axios";
import { API_BASE } from "@/lib/api/api-base"

export type GroupType = "trip" | "apartment" | "family_event" | "friends" | "project" | "other";

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string | null;
  displayName: string;
  isActive: boolean;
  createdAt: string;
}

export interface Group {
  id: string;
  createdBy: string;
  name: string;
  groupType: GroupType;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  members: GroupMember[];
}

export interface CreateGroupInput {
  name: string;
  groupType: GroupType;
  currency?: string;
}

export interface UpdateGroupInput {
  name?: string;
  groupType?: GroupType;
  currency?: string;
  isActive?: boolean;
}

export interface AddGroupMemberInput {
  displayName?: string;
  email?: string;
}

export type SplitType = "equal" | "exact" | "percentage" | "item";

export interface GroupExpenseShare {
  id: string;
  groupExpenseId: string;
  groupMemberId: string;
  amount: number;
}

export interface GroupExpenseItem {
  id: string;
  groupExpenseId: string;
  name: string;
  amount: number;
  memberIds: string[];
}

export interface GroupExpense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  paidBy: string;
  category?: string;
  expenseDate: string;
  splitType: SplitType;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  shares: GroupExpenseShare[];
  items?: GroupExpenseItem[];
}

export type GroupExpenseShareInput = { groupMemberId: string; amount?: number; percentage?: number };

export type GroupExpenseItemInput = { name: string; amount: number; memberIds: string[] };

export interface CreateGroupExpenseInput {
  description: string;
  amount: number;
  paidBy: string;
  category?: string;
  expenseDate?: string;
  splitType: SplitType;
  /** Account that the logging member's own share is recorded against. */
  accountId?: string | null;
  shares?: GroupExpenseShareInput[];
  items?: GroupExpenseItemInput[];
}

export interface UpdateGroupExpenseInput {
  description?: string;
  category?: string | null;
  expenseDate?: string;
}

export interface GroupBalance {
  groupMemberId: string;
  displayName: string;
  isActive: boolean;
  net: number;
}

export interface GroupSettlementTransfer {
  fromMemberId: string;
  fromDisplayName: string;
  toMemberId: string;
  toDisplayName: string;
  amount: number;
}

export interface GroupBalancesResponse {
  balances: GroupBalance[];
  settlementPlan: GroupSettlementTransfer[];
}

export interface GroupSettlement {
  id: string;
  groupId: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  note?: string;
  settledAt: string;
  createdBy: string;
  createdAt: string;
}

export interface CreateGroupSettlementInput {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  note?: string;
  settledAt?: string;
}

interface GroupsState {
  groups: Group[];
  isLoading: boolean;
  loadError: string | null;
}

type GroupsAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_LOAD_ERROR"; payload: string | null }
  | { type: "SET_GROUPS"; payload: Group[] }
  | { type: "RESET" };

const initialState: GroupsState = { groups: [], isLoading: false, loadError: null };

function reducer(state: GroupsState, action: GroupsAction): GroupsState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_LOAD_ERROR":
      return { ...state, loadError: action.payload };
    case "SET_GROUPS":
      return { ...state, groups: action.payload };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

const GroupsContext = createContext<{
  state: GroupsState;
  refreshGroups: () => Promise<void>;
  reloadGroups: () => Promise<void>;
  createGroup: (input: CreateGroupInput) => Promise<{ success: boolean; error?: string }>;
  updateGroup: (id: string, input: UpdateGroupInput) => Promise<{ success: boolean; error?: string }>;
  deleteGroup: (id: string) => Promise<{ success: boolean; error?: string }>;
  addMember: (groupId: string, input: AddGroupMemberInput) => Promise<{ success: boolean; error?: string }>;
  renameMember: (groupId: string, memberId: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
  removeMember: (groupId: string, memberId: string) => Promise<{ success: boolean; error?: string }>;
  generateShareLink: (groupId: string, memberId: string) => Promise<{ success: boolean; data?: { url: string; expiresAt: string; memberName: string; groupName: string }; error?: string }>;
  revokeShareLink: (groupId: string, memberId: string) => Promise<{ success: boolean; error?: string }>;
  fetchExpenses: (groupId: string) => Promise<{ success: boolean; data?: GroupExpense[]; error?: string }>;
  addExpense: (groupId: string, input: CreateGroupExpenseInput) => Promise<{ success: boolean; error?: string }>;
  editExpense: (groupId: string, expenseId: string, input: UpdateGroupExpenseInput) => Promise<{ success: boolean; error?: string }>;
  removeExpense: (groupId: string, expenseId: string) => Promise<{ success: boolean; error?: string }>;
  fetchBalances: (groupId: string) => Promise<{ success: boolean; data?: GroupBalancesResponse; error?: string }>;
  fetchSettlements: (groupId: string) => Promise<{ success: boolean; data?: GroupSettlement[]; error?: string }>;
  addSettlement: (groupId: string, input: CreateGroupSettlementInput) => Promise<{ success: boolean; error?: string }>;
  removeSettlement: (groupId: string, settlementId: string) => Promise<{ success: boolean; error?: string }>;
} | null>(null);

export function GroupsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const base = (API_BASE) + "/api/v1/groups";
  const { state: authState } = useAuth();

  const refreshGroups = async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const res = await axios.get(base, { withCredentials: true });
      dispatch({ type: "SET_GROUPS", payload: res.data.data });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const reloadGroups = async () => {
    dispatch({ type: "SET_LOAD_ERROR", payload: null });
    try {
      await refreshGroups();
    } catch (err: any) {
      console.error("Error loading groups:", err);
      dispatch({ type: "SET_LOAD_ERROR", payload: err?.response?.data?.error?.message || "Could not load your groups." });
    }
  };

  useEffect(() => {
    if (!authState.isAuthenticated) return;
    reloadGroups();
  }, [authState.isAuthenticated]);

  const createGroup = async (input: CreateGroupInput) => {
    try {
      await axios.post(base, input, { withCredentials: true });
      await refreshGroups().catch(() => {});
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not create group." };
    }
  };

  const updateGroup = async (id: string, input: UpdateGroupInput) => {
    try {
      await axios.put(`${base}/${id}`, input, { withCredentials: true });
      await refreshGroups().catch(() => {});
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not update group." };
    }
  };

  const deleteGroup = async (id: string) => {
    try {
      await axios.delete(`${base}/${id}`, { withCredentials: true });
      await refreshGroups().catch(() => {});
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not delete group." };
    }
  };

  const addMember = async (groupId: string, input: AddGroupMemberInput) => {
    try {
      await axios.post(`${base}/${groupId}/members`, input, { withCredentials: true });
      await refreshGroups().catch(() => {});
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not add member." };
    }
  };

  const renameMember = async (groupId: string, memberId: string, displayName: string) => {
    try {
      await axios.put(`${base}/${groupId}/members/${memberId}`, { displayName }, { withCredentials: true });
      await refreshGroups().catch(() => {});
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not rename member." };
    }
  };

  const removeMember = async (groupId: string, memberId: string) => {
    try {
      await axios.delete(`${base}/${groupId}/members/${memberId}`, { withCredentials: true });
      await refreshGroups().catch(() => {});
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not remove member." };
    }
  };

  const generateShareLink = async (groupId: string, memberId: string) => {
    try {
      const res = await axios.post(`${base}/${groupId}/members/${memberId}/share-link`, {}, { withCredentials: true });
      return { success: true, data: res.data.data as { url: string; expiresAt: string; memberName: string; groupName: string } };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not create a share link." };
    }
  };

  const revokeShareLink = async (groupId: string, memberId: string) => {
    try {
      await axios.delete(`${base}/${groupId}/members/${memberId}/share-link`, { withCredentials: true });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not revoke the share link." };
    }
  };

  const fetchExpenses = async (groupId: string) => {
    try {
      const res = await axios.get(`${base}/${groupId}/expenses`, { withCredentials: true });
      return { success: true, data: res.data.data as GroupExpense[] };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not load expenses." };
    }
  };

  const addExpense = async (groupId: string, input: CreateGroupExpenseInput) => {
    try {
      await axios.post(`${base}/${groupId}/expenses`, input, { withCredentials: true });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not add expense." };
    }
  };

  const editExpense = async (groupId: string, expenseId: string, input: UpdateGroupExpenseInput) => {
    try {
      await axios.put(`${base}/${groupId}/expenses/${expenseId}`, input, { withCredentials: true });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not update expense." };
    }
  };

  const removeExpense = async (groupId: string, expenseId: string) => {
    try {
      await axios.delete(`${base}/${groupId}/expenses/${expenseId}`, { withCredentials: true });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not remove expense." };
    }
  };

  const fetchBalances = async (groupId: string) => {
    try {
      const res = await axios.get(`${base}/${groupId}/balances`, { withCredentials: true });
      return { success: true, data: res.data.data as GroupBalancesResponse };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not load balances." };
    }
  };

  const fetchSettlements = async (groupId: string) => {
    try {
      const res = await axios.get(`${base}/${groupId}/settlements`, { withCredentials: true });
      return { success: true, data: res.data.data as GroupSettlement[] };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not load settlements." };
    }
  };

  const addSettlement = async (groupId: string, input: CreateGroupSettlementInput) => {
    try {
      await axios.post(`${base}/${groupId}/settlements`, input, { withCredentials: true });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not record settlement." };
    }
  };

  const removeSettlement = async (groupId: string, settlementId: string) => {
    try {
      await axios.delete(`${base}/${groupId}/settlements/${settlementId}`, { withCredentials: true });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not remove settlement." };
    }
  };

  return (
    <GroupsContext.Provider
      value={{
        state,
        refreshGroups,
        reloadGroups,
        createGroup,
        updateGroup,
        deleteGroup,
        addMember,
        renameMember,
        removeMember,
        generateShareLink,
        revokeShareLink,
        fetchExpenses,
        addExpense,
        editExpense,
        removeExpense,
        fetchBalances,
        fetchSettlements,
        addSettlement,
        removeSettlement,
      }}
    >
      {children}
    </GroupsContext.Provider>
  );
}

export function useGroups() {
  const context = useContext(GroupsContext);
  if (!context) throw new Error("useGroups must be used within a GroupsProvider");
  return context;
}
