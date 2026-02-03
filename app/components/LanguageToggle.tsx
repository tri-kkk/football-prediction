'use client'

import React from 'react'
import { useLanguage } from '../contexts/LanguageContext'

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-0.5">
      <button
        onClick={() => setLanguage('ko')}
        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
          language === 'ko'
            ? 'bg-blue-600 text-white shadow-md'
            : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
        }`}
      >
        KO
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
          language === 'en'
            ? 'bg-blue-600 text-white shadow-md'
            : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
        }`}
      >
        EN
      </button>
    </div>
  )
}