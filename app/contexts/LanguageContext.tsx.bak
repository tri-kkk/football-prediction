'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import ko from '../locales/ko.json'
import en from '../locales/en.json'

type Language = 'ko' | 'en'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: typeof ko
}

const translations = { ko, en }

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ko')

  // 초기 언어 설정 (브라우저 언어 감지)
  useEffect(() => {
    const savedLang = localStorage.getItem('language') as Language
    if (savedLang && (savedLang === 'ko' || savedLang === 'en')) {
      setLanguageState(savedLang)
    } else {
      // 브라우저 언어 감지
      const browserLang = navigator.language.toLowerCase()
      if (browserLang.startsWith('ko')) {
        setLanguageState('ko')
      } else {
        setLanguageState('en')
      }
    }
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('language', lang)
  }

  const t = translations[language]

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}
