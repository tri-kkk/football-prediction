'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// 번역 파일 import
import ko from '../locales/ko.json'
import en from '../locales/en.json'
import fr from '../locales/fr.json'

// 지원 언어 타입
export type Language = 'ko' | 'en' | 'fr'

// 번역 데이터 타입
type TranslationData = typeof ko

// 번역 데이터 맵
const translations: Record<Language, TranslationData> = {
  ko,
  en,
  fr,
}

// 언어 메타 정보
export const LANGUAGE_META: Record<Language, { name: string; flag: string; nativeName: string }> = {
  ko: { name: 'Korean', flag: '🇰🇷', nativeName: '한국어' },
  en: { name: 'English', flag: '🇺🇸', nativeName: 'English' },
  fr: { name: 'French', flag: '🇫🇷', nativeName: 'Français' },
}

// Context 타입
interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, fallback?: string) => string
  getLeagueName: (code: string) => string
  getRegionName: (id: string) => string
}

// Context 생성
const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

// Provider Props
interface LanguageProviderProps {
  children: ReactNode
  defaultLanguage?: Language
}

// 중첩 객체에서 키로 값 가져오기
function getNestedValue(obj: any, path: string): string | undefined {
  const keys = path.split('.')
  let result = obj
  
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key]
    } else {
      return undefined
    }
  }
  
  return typeof result === 'string' ? result : undefined
}

// Provider 컴포넌트
export function LanguageProvider({ children, defaultLanguage = 'ko' }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(defaultLanguage)
  
  // 로컬스토리지에서 언어 설정 불러오기
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('trendsoccer-language') as Language
      if (saved && ['ko', 'en', 'fr'].includes(saved)) {
        setLanguageState(saved)
      } else {
        // 브라우저 언어 감지
        const browserLang = navigator.language.split('-')[0]
        if (browserLang === 'ko') setLanguageState('ko')
        else if (browserLang === 'fr') setLanguageState('fr')
        else setLanguageState('en')
      }
    }
  }, [])
  
  // 언어 변경 함수
  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    if (typeof window !== 'undefined') {
      localStorage.setItem('trendsoccer-language', lang)
    }
  }
  
  // 번역 함수
  const t = (key: string, fallback?: string): string => {
    const value = getNestedValue(translations[language], key)
    
    if (value) return value
    
    // 현재 언어에서 못 찾으면 영어에서 찾기
    if (language !== 'en') {
      const enValue = getNestedValue(translations.en, key)
      if (enValue) return enValue
    }
    
    // 그래도 못 찾으면 fallback 또는 키 반환
    return fallback || key
  }
  
  // 리그명 가져오기 (편의 함수)
  const getLeagueName = (code: string): string => {
    return t(`leagues.${code}`, code)
  }
  
  // 지역명 가져오기 (편의 함수)
  const getRegionName = (id: string): string => {
    return t(`regions.${id}`, id)
  }
  
  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage, 
      t,
      getLeagueName,
      getRegionName
    }}>
      {children}
    </LanguageContext.Provider>
  )
}

// Hook
export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

// 기본 export
export default LanguageContext