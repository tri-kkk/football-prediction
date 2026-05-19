'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'

// 번역 파일 import
import ko from '../locales/ko.json'
import en from '../locales/en.json'
import fr from '../locales/fr.json'
import { LEAGUES } from '../data/leagues'

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
  /**
   * v3.6 변경: next-intl URL 라우팅과 동기화
   *
   * - language 상태는 URL의 locale (next-intl의 useLocale)을 따라간다
   * - setLanguage 호출 시 next-intl router로 URL prefix 변경 (페이지 이동)
   * - 'fr'는 더 이상 next-intl 라우팅에선 지원 안 함 → 'en'으로 매핑
   * - localStorage는 보조 캐시로만 유지 (선택)
   */
  const nextIntlLocale = useLocale() // 'ko' | 'en'
  const router = useRouter()
  const pathname = usePathname()

  // next-intl locale을 Language 타입으로 매핑
  const language: Language = (nextIntlLocale === 'en' ? 'en' : 'ko') as Language

  // 사용자가 명시적으로 'fr' 선택했던 흔적이 있으면 localStorage 정리 (선택)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem('trendsoccer-language')
    if (saved === 'fr') {
      localStorage.setItem('trendsoccer-language', 'en')
    }
  }, [])

  // 언어 변경 함수 — URL 자체를 바꿔서 next-intl이 메시지/메타데이터 재계산하게 함
  const setLanguage = (lang: Language) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('trendsoccer-language', lang)
    }
    // 'fr'는 next-intl 라우팅에 없으므로 'en'으로 처리
    const target: 'ko' | 'en' = lang === 'ko' ? 'ko' : 'en'
    // pathname은 locale prefix가 제거된 경로 (예: '/blog/foo')
    router.replace(pathname, { locale: target })
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
    
    // 그래도 못 찾으면 fallback 또는 키 반환 (fallback이 빈 문자열이면 빈 문자열 반환)
    return fallback !== undefined ? fallback : key
  }
  
  // 리그명 가져오기 (편의 함수)
  // locales에 없으면 leagues.ts의 name(한글) 또는 nameEn(영어) 사용
  const getLeagueName = (code: string): string => {
    const fromLocale = t(`leagues.${code}`, '')
    if (fromLocale) return fromLocale

    const leagueData = LEAGUES.find(l => l.code === code)
    if (leagueData) {
      return language === 'en' || language === 'fr'
        ? (leagueData.nameEn || leagueData.name)
        : leagueData.name
    }

    return code
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
