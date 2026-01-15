'use client'

import { useState } from 'react'

export default function FooterBusinessInfo() {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div>
      <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        사업자 정보
      </h3>
      
      <div className="space-y-2">
        {/* 기본 정보 (항상 표시) */}
        <p className="text-gray-500 text-xs">
          <span className="text-gray-400">상호명:</span> 주식회사 트리기
        </p>
        
        {/* 더보기 버튼 */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-400 transition-colors text-xs group"
        >
          <span>{isExpanded ? '접기' : '상세정보 보기'}</span>
          <svg 
            className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {/* 상세 정보 (토글) */}
        <div 
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded ? 'max-h-40 opacity-100 mt-2' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="space-y-1.5 text-gray-500 text-xs leading-relaxed pt-2 border-t border-gray-800/50">
            <p><span className="text-gray-400">사업자등록번호:</span> 406-88-03260</p>
            <p><span className="text-gray-400">통신판매업신고:</span> 제 2025-서울영등포-0011 호</p>
            <p><span className="text-gray-400">주소:</span> 서울특별시 영등포구 국제금융로6길 33, 919호 (여의도동, 맨하탄빌딩)</p>
          </div>
        </div>
      </div>
    </div>
  )
}
