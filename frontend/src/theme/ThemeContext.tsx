/* eslint-disable react-refresh/only-export-components */

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

type Theme = 'light' | 'dark'

type ThemeContextValue = {
  theme: Theme
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = window.localStorage.getItem(STORAGE_KEY)
    return (savedTheme === 'light' || savedTheme === 'dark') ? savedTheme : 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
      root.style.colorScheme = 'dark'
    } else {
      root.classList.remove('dark')
      root.style.colorScheme = 'light'
    }
  }, [theme])

  const toggle = () => {
    setTheme(prev => {
      const newTheme = prev === 'light' ? 'dark' : 'light'
      window.localStorage.setItem(STORAGE_KEY, newTheme)
      return newTheme
    })
  }

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      toggle
    }),
    [theme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
