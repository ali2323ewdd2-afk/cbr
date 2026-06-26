'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { type Locale, translations, defaultLocale, isRTL } from '@/lib/i18n'

interface I18nContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string) => string
  isRtl: boolean
}

const I18nContext = createContext<I18nContextValue>({
  locale: defaultLocale,
  setLocale: () => {},
  t: (k) => k,
  isRtl: false,
})

export function I18nProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage on first render (no effect needed)
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === 'undefined') return defaultLocale
    const saved = localStorage.getItem('luma-locale') as Locale | null
    return saved && ['nl', 'en', 'ar'].includes(saved) ? saved : defaultLocale
  })

  // Apply RTL class to document
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = isRTL(locale) ? 'rtl' : 'ltr'
      document.documentElement.lang = locale
    }
  }, [locale])

  const setLocale = (l: Locale) => {
    setLocaleState(l)
    if (typeof window !== 'undefined') localStorage.setItem('luma-locale', l)
  }

  const t = (key: string) => translations[locale]?.[key] ?? translations[defaultLocale]?.[key] ?? key

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, isRtl: isRTL(locale) }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
