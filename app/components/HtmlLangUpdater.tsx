'use client'

import { useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

/**
 * HtmlLangUpdater
 * 
 * 언어 토글 시 <html lang="..."> 속성을 동적으로 변경하는 컴포넌트
 * layout.tsx의 body 내부에 포함하여 사용
 * 
 * 사용법:
 * 1. layout.tsx에서 import
 * 2. <LanguageProvider> 내부에 <HtmlLangUpdater /> 추가
 */
export default function HtmlLangUpdater() {
  const { language } = useLanguage()

  useEffect(() => {
    // <html lang="..."> 속성 동적 변경
    document.documentElement.lang = language === 'en' ? 'en' : 'ko'
    
    // 선택적: dir 속성도 설정 (RTL 언어 지원 시 필요)
    // document.documentElement.dir = 'ltr'
  }, [language])

  // 렌더링할 UI 없음 (로직만 수행)
  return null
}
