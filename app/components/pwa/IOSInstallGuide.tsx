'use client'

import { usePWAInstall } from './PWAInstallContext'

// iOS 사용자를 위한 설치 안내 모달
export function IOSInstallGuide() {
  const { showIOSGuide, setShowIOSGuide, isIOS } = usePWAInstall()

  if (!showIOSGuide || !isIOS) return null

  const steps = [
    {
      number: 1,
      title: '공유 버튼 탭하기',
      desc: 'Safari 하단 메뉴에서',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      )
    },
    {
      number: 2,
      title: '"홈 화면에 추가" 선택',
      desc: '아래로 스크롤해서 찾기',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
        </svg>
      )
    },
    {
      number: 3,
      title: '"추가" 버튼 탭하기',
      desc: '우측 상단에서 완료',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
        </svg>
      )
    }
  ]

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-end justify-center"
      onClick={() => setShowIOSGuide(false)}
    >
      {/* 배경 블러 오버레이 */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        style={{ animation: 'fadeIn 0.3s ease-out' }}
      />
      
      {/* 모달 본체 */}
      <div 
        className="relative w-full max-w-[420px] mx-4 mb-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <style jsx>{`
          @keyframes slideUp {
            from {
              transform: translateY(100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        `}</style>

        {/* 메인 카드 */}
        <div className="relative bg-gradient-to-b from-[#1e293b] to-[#0f172a] rounded-3xl border border-white/10 shadow-2xl">
          
          {/* 상단 글로우 효과 */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
          
          {/* 드래그 핸들 */}
          <div className="flex justify-center pt-4 pb-2">
            <div className="w-10 h-1 bg-white/20 rounded-full" />
          </div>

          {/* 헤더 */}
          <div className="px-6 pt-2 pb-6 text-center">
            {/* 앱 아이콘 */}
            <div className="relative inline-flex mb-5">
              <div className="absolute inset-0 bg-emerald-500/30 rounded-2xl blur-xl" />
              <div className="relative w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            
            <h2 className="text-xl font-bold text-white mb-2">
              TrendSoccer 설치하기
            </h2>
            <p className="text-sm text-slate-400">
              홈 화면에 추가하면 앱처럼 사용할 수 있어요
            </p>
          </div>

          {/* 단계별 안내 */}
          <div className="px-5 pb-5 space-y-3">
            {steps.map((step, index) => (
              <div 
                key={step.number}
                className="group relative flex items-center gap-4 p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] rounded-2xl transition-all duration-300"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* 번호 */}
                <div className={`
                  flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold
                  ${step.number === 3 
                    ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/25' 
                    : 'bg-slate-700/80 text-slate-300 border border-slate-600/50'
                  }
                `}>
                  {step.number}
                </div>
                
                {/* 텍스트 */}
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-white leading-tight">
                    {step.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {step.desc}
                  </p>
                </div>
                
                {/* 아이콘 */}
                <div className={`
                  flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
                  ${step.number === 3 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : 'bg-slate-700/50 text-slate-400'
                  }
                `}>
                  {step.icon}
                </div>
              </div>
            ))}
          </div>

          {/* 하단 버튼 */}
          <div className="px-5 pb-5">
            <button
              onClick={() => setShowIOSGuide(false)}
              className="relative w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold rounded-2xl transition-all duration-300 active:scale-[0.98] shadow-lg shadow-emerald-500/25 overflow-hidden group"
            >
              {/* 버튼 글로우 효과 */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <span className="relative">확인했어요</span>
            </button>
          </div>

          {/* 하단 안내 문구 */}
          <div className="px-5 pb-6">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              <svg className="w-4 h-4 text-amber-500/80" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>Safari 브라우저에서만 가능해요</span>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  )
}