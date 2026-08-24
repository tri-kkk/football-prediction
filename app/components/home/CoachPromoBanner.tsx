'use client'
// app/components/home/CoachPromoBanner.tsx
// 메인 사이트에서 TrendCoach(베팅 관리 서브 브랜드) 인지/유입용 배너. 코치 블루 글래스 + 샤인.
import { useEffect, useState } from 'react'

const MARK_PATH = 'M32.5274 108L32 41.0191L88.4726 8L89 74.9809L32.5274 108ZM34.3606 104.723L33.8679 42.132L86.6394 11.2768L87.1321 73.868L34.3606 104.723ZM35.0985 84.7994L38.5048 78.7108L54.117 88.0129L50.7108 94.1015L85.6068 73.6979C80.2603 70.5123 74.8808 67.325 69.5492 64.1483C65.8129 70.2668 58.9216 72.805 53.8928 69.8088C48.8641 66.8126 47.5489 59.3848 50.8154 52.9863C45.4832 49.8093 40.1187 46.5951 34.7727 43.4099L35.0985 84.7994ZM49.1673 95.0037L52.7383 88.6207L38.6841 80.2469L35.1131 86.6299L35.2433 103.145L49.1673 95.0037ZM35.3927 42.3018C40.7381 45.4867 46.1259 48.6745 51.4527 51.8484C55.1894 45.7328 62.0795 43.1956 67.1066 46.1909C72.1338 49.1862 73.4501 56.6119 70.1859 63.01C75.5123 66.1836 80.8818 69.4052 86.2273 72.5901L85.9015 31.2006L82.4952 37.2892L66.883 27.9871L70.2892 21.8985L35.3927 42.3018ZM85.8864 29.3697L82.3154 35.7527L68.2612 27.379L71.8322 20.996L85.7567 12.8547L85.8864 29.3697ZM52.2148 52.3024C55.6544 46.7165 61.963 44.4056 66.5698 47.1504C71.1766 49.8953 72.3917 56.6889 69.4239 62.556L62.0022 58.134C62.155 57.4265 61.932 56.7271 61.3921 56.4054C60.8522 56.0837 60.1537 56.2341 59.6364 56.7244L52.2148 52.3024ZM68.7875 63.6935C65.3483 69.2825 59.0375 71.5947 54.4302 68.8495C49.8229 66.1044 48.6073 59.3079 51.5783 53.44L58.9989 57.8613C58.8445 58.5705 59.0669 59.2723 59.6079 59.5946C60.1489 59.9169 60.849 59.7648 61.3669 59.2722L68.7875 63.6935Z'

export default function CoachPromoBanner({ isEn = false }: { isEn?: boolean }) {
  const [href, setHref] = useState('/coach')
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname.endsWith('trendsoccer.com')) {
      setHref('https://coach.trendsoccer.com')
    }
  }, [])

  return (
    <a
      href={href}
      className="relative block overflow-hidden rounded-2xl group mx-4 my-3"
      style={{
        background: 'linear-gradient(100deg, rgba(57,135,229,.16), rgba(57,135,229,.05))',
        border: '1px solid rgba(57,135,229,.30)',
        boxShadow: '0 10px 34px -14px rgba(57,135,229,.5)',
      }}
    >
      <span className="ts-shine" style={{ background: 'linear-gradient(110deg, transparent, rgba(120,180,255,.28), transparent)' }} />
      <span className="pointer-events-none absolute inset-x-6 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(120,180,255,.6), transparent)' }} />
      <div className="relative flex items-center gap-3 pl-4 pr-3 py-3.5">
        <span className="flex-shrink-0 grid place-items-center" style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(57,135,229,.14)', border: '1px solid rgba(57,135,229,.3)' }}>
          <svg height={24} viewBox="30 6 62 104" fill="none" aria-hidden style={{ display: 'block' }}>
            <path fillRule="evenodd" clipRule="evenodd" d={MARK_PATH} fill="url(#coachPromoGrad)" />
            <defs>
              <linearGradient id="coachPromoGrad" x1="32" y1="8" x2="89" y2="108" gradientUnits="userSpaceOnUse">
                <stop stopColor="#8fc0ff" /><stop offset="1" stopColor="#3d82e6" />
              </linearGradient>
            </defs>
          </svg>
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: -0.4, color: '#fff' }}>
              Trend<span style={{ background: 'linear-gradient(100deg,#5aa0f0,#3987e5)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Coach</span>
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(57,135,229,.2)', color: '#7fb4f5', border: '1px solid rgba(57,135,229,.34)' }}>
              {isEn ? 'Betting mgmt' : '베팅 관리'}
            </span>
          </div>
          <div className="text-[12px] mt-0.5 truncate" style={{ color: '#a9c4e6' }}>
            {isEn ? 'Track bets · CLV scoring · KSM signals' : '베팅 기록 · CLV 채점 · KSM 시그널'}
          </div>
        </div>

        <span className="flex-shrink-0 inline-flex items-center gap-1 text-[12px] font-bold px-3 py-1.5 rounded-full transition-transform group-active:scale-95"
          style={{ background: 'linear-gradient(135deg,#5aa0f0,#3987e5)', color: '#fff', boxShadow: '0 4px 16px -4px rgba(57,135,229,.6)' }}>
          {isEn ? 'Start' : '시작하기'}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M9 7h8v8" /></svg>
        </span>
      </div>
    </a>
  )
}
