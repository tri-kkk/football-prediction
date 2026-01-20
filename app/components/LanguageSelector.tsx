'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useLanguage, Language, LANGUAGE_META } from '../contexts/LanguageContext'

interface LanguageSelectorProps {
  darkMode?: boolean
  variant?: 'dropdown' | 'buttons' | 'compact'
}

export default function LanguageSelector({ 
  darkMode = true, 
  variant = 'dropdown' 
}: LanguageSelectorProps) {
  const { language, setLanguage } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  const languages: Language[] = ['ko', 'en', 'fr']
  const currentLang = LANGUAGE_META[language]
  
  // 드롭다운 스타일
  if (variant === 'dropdown') {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm
            transition-all duration-200
            ${darkMode 
              ? 'bg-slate-700 hover:bg-slate-600 text-white' 
              : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
            }
          `}
        >
          <span className="text-lg">{currentLang.flag}</span>
          <span className="hidden sm:inline">{language.toUpperCase()}</span>
          <svg 
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isOpen && (
          <div className={`
            absolute right-0 mt-2 w-40 rounded-lg shadow-xl z-50
            ${darkMode ? 'bg-slate-700' : 'bg-white border border-gray-200'}
          `}>
            {languages.map((lang) => (
              <button
                key={lang}
                onClick={() => {
                  setLanguage(lang)
                  setIsOpen(false)
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 text-left text-sm
                  transition-colors first:rounded-t-lg last:rounded-b-lg
                  ${language === lang 
                    ? darkMode 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-blue-50 text-blue-700'
                    : darkMode
                      ? 'hover:bg-slate-600 text-gray-200'
                      : 'hover:bg-gray-50 text-gray-700'
                  }
                `}
              >
                <span className="text-lg">{LANGUAGE_META[lang].flag}</span>
                <div>
                  <div className="font-medium">{LANGUAGE_META[lang].nativeName}</div>
                  <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {LANGUAGE_META[lang].name}
                  </div>
                </div>
                {language === lang && (
                  <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }
  
  // 버튼 스타일
  if (variant === 'buttons') {
    return (
      <div className="flex items-center gap-1">
        {languages.map((lang) => (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            className={`
              px-3 py-1.5 rounded-lg text-sm font-medium transition-all
              ${language === lang
                ? darkMode
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-500 text-white'
                : darkMode
                  ? 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
            `}
          >
            {LANGUAGE_META[lang].flag} {lang.toUpperCase()}
          </button>
        ))}
      </div>
    )
  }
  
  // 컴팩트 스타일 (플래그만)
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-0.5">
        {languages.map((lang) => (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            className={`
              w-8 h-8 rounded-full flex items-center justify-center text-lg
              transition-all
              ${language === lang
                ? 'bg-blue-500 scale-110'
                : darkMode
                  ? 'opacity-50 hover:opacity-100'
                  : 'opacity-40 hover:opacity-100'
              }
            `}
            title={LANGUAGE_META[lang].nativeName}
          >
            {LANGUAGE_META[lang].flag}
          </button>
        ))}
      </div>
    )
  }
  
  return null
}
