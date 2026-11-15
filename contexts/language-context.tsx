"use client"

import { createContext, useContext, useMemo } from "react"
import { useAuth } from "./auth-context"
import en from "@/lib/i18n/translations/en.json"
import bn from "@/lib/i18n/translations/bn.json"

const TRANSLATIONS: Record<string, Record<string, string>> = { en, bn }

const LanguageContext = createContext<{ language: string; t: (key: string) => string } | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { state: authState } = useAuth()
  const language = authState.user?.preferences?.language || "en"
  const dict = TRANSLATIONS[language] || TRANSLATIONS.en

  const t = useMemo(() => {
    return (key: string) => dict[key] ?? TRANSLATIONS.en[key] ?? key
  }, [dict])

  return <LanguageContext.Provider value={{ language, t }}>{children}</LanguageContext.Provider>
}

export function useTranslation() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error("useTranslation must be used within a LanguageProvider")
  return context
}
