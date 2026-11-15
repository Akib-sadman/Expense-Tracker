"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'

interface PerformanceContextType {
  reducedMotion: boolean
  reducedMotionOverride: boolean
  setReducedMotionOverride: (value: boolean) => void
  performanceMode: boolean
  setPerformanceMode: (value: boolean) => void
}

const PerformanceContext = createContext<PerformanceContextType | undefined>(undefined)

export function PerformanceProvider({ children }: { children: React.ReactNode }) {
  const [reducedMotionOverride, setReducedMotionOverrideState] = useState(false)
  const [performanceMode, setPerformanceModeState] = useState(false)
  const [systemReducedMotion, setSystemReducedMotion] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      setReducedMotionOverrideState(localStorage.getItem('reducedMotion') === 'true')
      const storedPerf = localStorage.getItem('performanceMode')
      const nav = navigator as Navigator & { deviceMemory?: number }
      const lowEnd = (navigator.hardwareConcurrency || 8) <= 4 || (nav.deviceMemory || 8) <= 3
      // No saved choice yet: weak devices start in performance mode (not persisted).
      setPerformanceModeState(storedPerf === null ? lowEnd : storedPerf === 'true')
    } catch {}

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setSystemReducedMotion(mediaQuery.matches)
    const handleChange = () => setSystemReducedMotion(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.motion = systemReducedMotion || reducedMotionOverride || performanceMode ? 'reduced' : 'full'
  }, [systemReducedMotion, reducedMotionOverride, performanceMode])

  const setReducedMotionOverride = (value: boolean) => {
    setReducedMotionOverrideState(value)
    if (mounted) {
      try {
        localStorage.setItem('reducedMotion', String(value))
      } catch {}
    }
  }

  const setPerformanceMode = (value: boolean) => {
    setPerformanceModeState(value)
    if (mounted) {
      try {
        localStorage.setItem('performanceMode', String(value))
      } catch {}
    }
  }

  const value: PerformanceContextType = {
    reducedMotion: systemReducedMotion || reducedMotionOverride,
    reducedMotionOverride,
    setReducedMotionOverride,
    performanceMode,
    setPerformanceMode,
  }

  return <PerformanceContext.Provider value={value}>{children}</PerformanceContext.Provider>
}

export function usePerformance() {
  const context = useContext(PerformanceContext)
  if (context === undefined) {
    throw new Error('usePerformance must be used within a PerformanceProvider')
  }
  return context
}
