"use client";

import { createContext, useContext, useReducer, useCallback } from "react";
import axios from "axios";
import { API_BASE } from "@/lib/api/api-base"

export interface AiConversation {
  id: string;
  userId: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface AiMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "tool";
  content?: string;
  toolCalls?: AiToolCall[];
  toolCallId?: string;
  createdAt: string;
}

export interface AiConversationWithMessages extends AiConversation {
  messages: AiMessage[];
}

export interface TransactionProposal {
  vendor: string;
  category: string;
  amount: number;
  type: "expense" | "income" | "refund";
  date: string;
  paymentMethod?: string;
  accountId?: string;
}

export type ConfirmTransactionInput = TransactionProposal;

interface AiChatState {
  conversations: AiConversation[];
  isLoading: boolean;
}

type AiChatAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_CONVERSATIONS"; payload: AiConversation[] }
  | { type: "RESET" };

const initialState: AiChatState = { conversations: [], isLoading: false };

function reducer(state: AiChatState, action: AiChatAction): AiChatState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_CONVERSATIONS":
      return { ...state, conversations: action.payload };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

const AiChatContext = createContext<{
  state: AiChatState;
  refreshConversations: () => Promise<void>;
  createConversation: () => Promise<{ success: boolean; data?: AiConversation; error?: string }>;
  getConversation: (id: string) => Promise<{ success: boolean; data?: AiConversationWithMessages; error?: string }>;
  sendMessage: (id: string, message: string) => Promise<{ success: boolean; data?: AiMessage; error?: string }>;
  removeConversation: (id: string) => Promise<{ success: boolean; error?: string }>;
  confirmTransaction: (id: string, input: ConfirmTransactionInput) => Promise<{ success: boolean; error?: string }>;
} | null>(null);

export function AiChatProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const base = (API_BASE) + "/api/v1/ai";

  const refreshConversations = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const res = await axios.get(`${base}/conversations`, { withCredentials: true });
      dispatch({ type: "SET_CONVERSATIONS", payload: res.data.data });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [base]);

  const createConversation = async () => {
    try {
      const res = await axios.post(`${base}/conversations`, {}, { withCredentials: true });
      await refreshConversations().catch(() => {});
      return { success: true, data: res.data.data as AiConversation };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not start a new conversation." };
    }
  };

  const getConversation = async (id: string) => {
    try {
      const res = await axios.get(`${base}/conversations/${id}`, { withCredentials: true });
      return { success: true, data: res.data.data as AiConversationWithMessages };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not load this conversation." };
    }
  };

  const sendMessage = async (id: string, message: string) => {
    try {
      const res = await axios.post(`${base}/conversations/${id}/messages`, { message }, { withCredentials: true });
      await refreshConversations().catch(() => {});
      return { success: true, data: res.data.data as AiMessage };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "The assistant could not answer that." };
    }
  };

  const removeConversation = async (id: string) => {
    try {
      await axios.delete(`${base}/conversations/${id}`, { withCredentials: true });
      await refreshConversations().catch(() => {});
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not delete this conversation." };
    }
  };

  const confirmTransaction = async (id: string, input: ConfirmTransactionInput) => {
    try {
      await axios.post(`${base}/conversations/${id}/transactions`, input, { withCredentials: true });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not record this transaction." };
    }
  };

  return (
    <AiChatContext.Provider
      value={{ state, refreshConversations, createConversation, getConversation, sendMessage, removeConversation, confirmTransaction }}
    >
      {children}
    </AiChatContext.Provider>
  );
}

export function useAiChat() {
  const context = useContext(AiChatContext);
  if (!context) throw new Error("useAiChat must be used within an AiChatProvider");
  return context;
}
