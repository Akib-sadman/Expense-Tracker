"use client"

import type React from "react"
import { createContext, useContext, useReducer, useEffect } from "react"
import axios from "axios"
import { sessionAuthState } from "@/lib/api/axios-defaults"
import { toast } from "@/hooks/use-toast"
import { API_BASE } from "@/lib/api/api-base"

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  createdAt: Date
  twoFactorEnabled?: boolean
  emailVerified?: boolean
  preferences: {
    currency: string
    theme: "light" | "dark" | "system"
    notifications: boolean
    language: string
    notificationChannels?: { financial: boolean; family: boolean }
    exchangeRatePreference?: "manual" | "automatic"
  }
  onboarding?: {
    answers: Record<string, unknown> | null
    dashboardLayout: "saving-focused" | "debt-focused" | "spending-control" | "beginner" | "advanced" | null
    completedAt: string | null
  }
}

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

type AuthAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_USER"; payload: User | null }
  | { type: "UPDATE_USER"; payload: Partial<User> }
  | { type: "LOGOUT" }

const initialState: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
}

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload }
    case "SET_USER":
      return { ...state, user: action.payload, isAuthenticated: !!action.payload, isLoading: false }
    case "UPDATE_USER":
      return { ...state, user: state.user ? { ...state.user, ...action.payload } : null }
    case "LOGOUT":
      return { ...state, user: null, isAuthenticated: false, isLoading: false }
    default:
      return state
  }
}

const AuthContext = createContext<{
  state: AuthState
  dispatch: React.Dispatch<AuthAction>
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; twoFactorChallenge?: string }>
  verifyTwoFactor?: (challengeToken: string, code: string) => Promise<{ success: boolean; error?: string }>
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  updateProfile: (updates: Partial<User>) => Promise<{ success: boolean; error?: string }>
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>
  deleteAccount: (password: string) => Promise<{ success: boolean; error?: string }>
  refreshUser: () => Promise<void>
  loginGoogle?: (credential: string) => Promise<{ success: boolean; error?: string; twoFactorChallenge?: string }>
} | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  useEffect(() => {
    const verifySession = async () => {
      try {
        const apiUrl = API_BASE
        const response = await axios.get(`${apiUrl}/api/v1/auth/me`, { withCredentials: true })
        const user = response.data.data.user
        user.createdAt = new Date(user.createdAt)
        dispatch({ type: "SET_USER", payload: user })
      } catch (error: any) {
        if (error?.response?.status !== 401) {
          console.error("Session verification failed unexpectedly:", error)
        }
        dispatch({ type: "SET_USER", payload: null })
      }
    }

    verifySession()
  }, [])

  useEffect(() => {
    sessionAuthState.isAuthenticated = state.isAuthenticated
  }, [state.isAuthenticated])

  useEffect(() => {
    sessionAuthState.forceLogout = () => {
      dispatch({ type: "LOGOUT" })
      localStorage.removeItem("pocketwise-data")
      localStorage.removeItem("pocketwise-user")
      toast({
        title: "Session expired",
        description: "Please log in again to continue.",
        variant: "destructive",
      })
    }
  }, [])

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; twoFactorChallenge?: string }> => {
    try {
      const apiUrl = API_BASE
      const response = await axios.post(`${apiUrl}/api/v1/auth/login`, { email, password }, { withCredentials: true })
      const { user, requiresTwoFactor, challengeToken } = response.data.data
      if (requiresTwoFactor) return { success: false, twoFactorChallenge: challengeToken }
      dispatch({ type: "SET_USER", payload: user })
      return { success: true }
    } catch (error: any) {
      if (!error?.response) console.error("Unexpected error during login:", error)
      const message = error?.response?.data?.error?.message || 'Login failed.'
      return { success: false, error: message }
    }
  }

  const register = async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const apiUrl = API_BASE
      const response = await axios.post(`${apiUrl}/api/v1/auth/register`, { email, password, name }, { withCredentials: true })
      const { user } = response.data.data
      dispatch({ type: "SET_USER", payload: user })
      return { success: true }
    } catch (error: any) {
      if (!error?.response) console.error("Unexpected error during registration:", error)
      const message = error?.response?.data?.error?.message || 'Registration failed.'
      return { success: false, error: message }
    }
  }

  const logout = async () => {
    try {
      const apiUrl = API_BASE
      await axios.post(`${apiUrl}/api/v1/auth/logout`, {}, { withCredentials: true })
    } catch (err) {
      console.warn("Logout request to the server failed; clearing local session anyway:", err)
    } finally {
      dispatch({ type: "LOGOUT" })
      localStorage.removeItem("pocketwise-data")
      localStorage.removeItem("pocketwise-user")
    }
  }

  const updateProfile = async (updates: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    if (!state.user) return { success: false, error: "No user logged in" }

    try {
      const { email: _email, ...persistable } = updates
      const apiUrl = API_BASE
      const response = await axios.put(`${apiUrl}/api/v1/users/${state.user.id}`, persistable, { withCredentials: true })
      dispatch({ type: "SET_USER", payload: response.data.data.user })
      return { success: true }
    } catch (error: any) {
      if (!error?.response) console.error("Unexpected error updating profile:", error)
      const message = error?.response?.data?.error?.message || "Failed to update profile"
      return { success: false, error: message }
    }
  }

  const changePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!state.user) return { success: false, error: "No user logged in" }
    try {
      const apiUrl = API_BASE
      await axios.put(
        `${apiUrl}/api/v1/users/${state.user.id}/password`,
        { currentPassword, newPassword },
        { withCredentials: true }
      )
      return { success: true }
    } catch (error: any) {
      if (!error?.response) console.error("Unexpected error changing password:", error)
      const message = error?.response?.data?.error?.message || "Failed to change password"
      return { success: false, error: message }
    }
  }

  const deleteAccount = async (password: string): Promise<{ success: boolean; error?: string }> => {
    if (!state.user) return { success: false, error: "No user logged in" }
    try {
      const apiUrl = API_BASE
      await axios.delete(`${apiUrl}/api/v1/users/${state.user.id}`, { data: { password }, withCredentials: true })
      dispatch({ type: "LOGOUT" })
      return { success: true }
    } catch (error: any) {
      if (!error?.response) console.error("Unexpected error deleting account:", error)
      const message = error?.response?.data?.error?.message || "Failed to delete account"
      return { success: false, error: message }
    }
  }

  const refreshUser = async (): Promise<void> => {
    try {
      const apiUrl = API_BASE
      const response = await axios.get(`${apiUrl}/api/v1/auth/me`, { withCredentials: true })
      const user = response.data.data.user
      user.createdAt = new Date(user.createdAt)
      dispatch({ type: "SET_USER", payload: user })
    } catch {
    }
  }

  const value: any = { state, dispatch, login, register, logout, updateProfile, changePassword, deleteAccount, refreshUser }
  value.verifyTwoFactor = async (challengeToken: string, code: string) => {
    try {
      const response = await axios.post(`${API_BASE}/api/v1/auth/login/2fa`, { challengeToken, code }, { withCredentials: true })
      dispatch({ type: "SET_USER", payload: response.data.data.user })
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not verify the code" }
    }
  }
  value.loginGoogle = async (credential: string) => {
    try {
      const response = await axios.post(`${API_BASE}/api/v1/auth/google`, { credential }, { withCredentials: true })
      const { user, requiresTwoFactor, challengeToken } = response.data.data
      if (requiresTwoFactor) return { success: false, twoFactorChallenge: challengeToken }
      dispatch({ type: "SET_USER", payload: user })
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Google sign-in failed" }
    }
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}
