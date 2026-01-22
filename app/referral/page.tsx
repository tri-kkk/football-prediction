'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '../contexts/LanguageContext'

interface ReferralStats {
  referralCode: string | null
  tier: string
  premiumExpiresAt: string | null
  stats: {
    totalReferrals: number
    rewardPerReferral: number
    effectiveRewardDays: number
    maxRewardDays: number
    remainingCapDays: number
    isCapReached: boolean
    referralsToMax: number
  }
  recentReferrals: {
    id: string
    name: string
    email: string
    rewardDays: number
    createdAt: string
  }[]
}

// 다국어 텍스트
const texts = {
  ko: {
    back: '돌아가기',
    title: '초대할 때마다 +2일!',
    subtitle: '친구가 가입하면 나도, 친구도 프리미엄!',
    myReward: '내 보상',
    friendReward: '친구 보상',
    perPerson: '/명',
    maxInfo: '최대 90일까지 적립 가능!',
    myCode: '내 초대 코드',
    copyLink: '링크 복사',
    copied: '복사됨',
    generateCode: '초대 코드 만들기',
    generating: '생성 중...',
    stats: '초대 현황',
    invitedFriends: '초대한 친구',
    receivedReward: '받은 보상',
    remainingCap: '남은 한도',
    progress: '적립 현황',
    maxReached: '🎉 최대 보상 달성! 축하합니다!',
    moreToMax: '명 더 초대하면 최대 보상!',
    recentHistory: '최근 초대 기록',
    notice: '유의사항',
    notice1: '친구가 가입 후 24시간 내 재방문해야 보상이 지급됩니다.',
    notice2: '최대 90일까지 보상을 받을 수 있습니다.',
    notice3: 'Google, Naver 계정으로 가입한 친구만 인정됩니다.',
    notice4: '부정한 방법으로 보상을 받을 경우 혜택이 회수될 수 있습니다.',
    day: '일',
    days: '일',
    // 공유 메시지
    kakaoMsg: (link: string) => `⚽ TrendSoccer에서 축구 경기 예측 받아봐!\nAI가 분석한 경기 예측과 오즈 트렌드 확인 가능해.\n내 링크로 가입하면 프리미엄 3일 무료!\n👉 ${link}`,
    instaMsg: (link: string) => `⚽ 축구 예측은 TrendSoccer!\n\nAI 분석 + 오즈 트렌드 무료 확인\n프리미엄 3일 체험권 받기 👇\n\n${link}\n\n#축구 #프리미어리그 #라리가 #축구예측`,
    tiktokMsg: (link: string) => `⚽ 축구 예측 꿀팁!\n\nTrendSoccer에서 AI 분석 받아봐\n가입하면 프리미엄 3일 무료 🎁\n\n${link}\n\n#축구 #해외축구 #프리미어리그 #라리가 #축구예측 #스포츠`,
    telegramMsg: `⚽ TrendSoccer - AI 축구 예측\n\n내 링크로 가입하면 프리미엄 3일 무료!`,
    copyAlert: '공유 메시지가 복사되었습니다!\n카카오톡에 붙여넣기 해주세요.',
    instaAlert: '공유 메시지가 복사되었습니다!\n인스타그램 스토리나 DM에 붙여넣기 해주세요.',
    tiktokAlert: '공유 메시지가 복사되었습니다!\n틱톡 프로필이나 DM에 붙여넣기 해주세요.',
  },
  en: {
    back: 'Go Back',
    title: '+2 Days per Invite!',
    subtitle: 'You and your friend both get Premium!',
    myReward: 'My Reward',
    friendReward: 'Friend Reward',
    perPerson: '/person',
    maxInfo: 'Earn up to 90 days max!',
    myCode: 'My Invite Code',
    copyLink: 'Copy Link',
    copied: 'Copied',
    generateCode: 'Generate Invite Code',
    generating: 'Generating...',
    stats: 'Invite Stats',
    invitedFriends: 'Friends Invited',
    receivedReward: 'Rewards Earned',
    remainingCap: 'Remaining Cap',
    progress: 'Progress',
    maxReached: '🎉 Max reward reached! Congrats!',
    moreToMax: ' more to reach max reward!',
    recentHistory: 'Recent Invites',
    notice: 'Notice',
    notice1: 'Friend must revisit within 24 hours after signup for reward.',
    notice2: 'Maximum reward is 90 days.',
    notice3: 'Only Google and Naver accounts are eligible.',
    notice4: 'Rewards may be revoked for fraudulent activity.',
    day: ' day',
    days: ' days',
    // Share messages
    kakaoMsg: (link: string) => `⚽ Get football predictions on TrendSoccer!\nAI-powered match predictions and odds trends.\nSign up with my link for 3 days free Premium!\n👉 ${link}`,
    instaMsg: (link: string) => `⚽ Football predictions with TrendSoccer!\n\nFree AI analysis + odds trends\nGet 3 days Premium trial 👇\n\n${link}\n\n#football #premierleague #laliga #predictions`,
    tiktokMsg: (link: string) => `⚽ Football prediction tips!\n\nGet AI analysis on TrendSoccer\n3 days free Premium when you sign up 🎁\n\n${link}\n\n#football #soccer #premierleague #laliga #betting #sports`,
    telegramMsg: `⚽ TrendSoccer - AI Football Predictions\n\nSign up with my link for 3 days free Premium!`,
    copyAlert: 'Message copied!\nPaste it in KakaoTalk.',
    instaAlert: 'Message copied!\nPaste it in Instagram Stories or DM.',
    tiktokAlert: 'Message copied!\nPaste it in TikTok profile or DM.',
  }
}

export default function ReferralPage() {
  const { data: session, status } = useSession()
  const { language } = useLanguage()
  const router = useRouter()
  const [referralData, setReferralData] = useState<ReferralStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)

  const t = texts[language]
  const userId = (session?.user as any)?.id

  // 로그인 체크
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/referral')
    }
  }, [status, router])

  // 레퍼럴 데이터 로드
  useEffect(() => {
    if (!userId) return

    const fetchData = async () => {
      try {
        const response = await fetch(`/api/referral/status?userId=${userId}`)
        if (response.ok) {
          const data = await response.json()
          setReferralData(data)
        }
      } catch (error) {
        console.error('Failed to fetch referral data:', error)
      }
      setLoading(false)
    }

    fetchData()
  }, [userId])

  // 레퍼럴 코드 생성
  const generateCode = async () => {
    if (!userId || generating) return
    
    setGenerating(true)
    try {
      const response = await fetch(`/api/referral/code?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setReferralData(prev => prev ? { ...prev, referralCode: data.code } : null)
      }
    } catch (error) {
      console.error('Failed to generate code:', error)
    }
    setGenerating(false)
  }

  // 링크 복사
  const copyLink = () => {
    if (!referralData?.referralCode) return
    
    const link = `https://trendsoccer.com/?ref=${referralData.referralCode}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 카카오톡 공유
  const shareKakao = () => {
    if (!referralData?.referralCode) return
    
    const link = `https://trendsoccer.com/?ref=${referralData.referralCode}`
    const text = t.kakaoMsg(link)
    
    if (/Android|iPhone/i.test(navigator.userAgent)) {
      window.location.href = `kakaotalk://msg/text/${encodeURIComponent(text)}`
    } else {
      navigator.clipboard.writeText(text)
      alert(t.copyAlert)
    }
  }

  // 인스타그램 공유
  const shareInstagram = () => {
    if (!referralData?.referralCode) return
    
    const link = `https://trendsoccer.com/?ref=${referralData.referralCode}`
    const text = t.instaMsg(link)
    
    navigator.clipboard.writeText(text)
    alert(t.instaAlert)
  }

  // 틱톡 공유
  const shareTikTok = () => {
    if (!referralData?.referralCode) return
    
    const link = `https://trendsoccer.com/?ref=${referralData.referralCode}`
    const text = t.tiktokMsg(link)
    
    navigator.clipboard.writeText(text)
    alert(t.tiktokAlert)
  }

  // 텔레그램 공유
  const shareTelegram = () => {
    if (!referralData?.referralCode) return
    
    const link = `https://trendsoccer.com/?ref=${referralData.referralCode}`
    const text = t.telegramMsg
    
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`
    window.open(telegramUrl, '_blank')
  }

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 일수 포맷
  const formatDays = (days: number) => {
    if (language === 'ko') return `${days}일`
    return days === 1 ? `${days} day` : `${days} days`
  }

  // 로딩 중
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // 비로그인
  if (!session) {
    return null
  }

  const stats = referralData?.stats
  const progressPercent = stats ? Math.min((stats.effectiveRewardDays / stats.maxRewardDays) * 100, 100) : 0

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        
        {/* 뒤로가기 */}
        <Link href="/" className="text-gray-400 text-sm inline-flex items-center gap-1 hover:text-white">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t.back}
        </Link>

        {/* 보상 안내 카드 */}
        <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-5">
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">🎉</div>
            <h2 className="text-lg font-bold">{t.title}</h2>
            <p className="text-gray-400 text-sm mt-1">
              {t.subtitle}
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-black/30 rounded-xl p-3 text-center">
              <div className="text-2xl mb-1">👤</div>
              <div className="text-xs text-gray-400">{t.myReward}</div>
              <div className="text-green-400 font-bold">+2{language === 'ko' ? '일' : ' days'}{t.perPerson}</div>
            </div>
            <div className="bg-black/30 rounded-xl p-3 text-center">
              <div className="text-2xl mb-1">👥</div>
              <div className="text-xs text-gray-400">{t.friendReward}</div>
              <div className="text-green-400 font-bold">+3{language === 'ko' ? '일' : ' days'}</div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <div className="text-yellow-400 text-xs text-center">
              ⚡ {t.maxInfo}
            </div>
          </div>
        </div>

        {/* 내 초대 코드 */}
        <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-3">{t.myCode}</h3>
          
          {referralData?.referralCode ? (
            <>
              <div className="bg-black/50 rounded-xl p-4 flex items-center justify-between mb-4">
                <span className="text-xl font-mono font-bold tracking-wider text-green-400">
                  {referralData.referralCode}
                </span>
                <button
                  onClick={copyLink}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    copied 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  {copied ? `✓ ${t.copied}` : t.copyLink}
                </button>
              </div>
              
              {/* 공유 버튼 */}
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={shareKakao}
                  className="flex flex-col items-center justify-center gap-1 py-3 bg-[#FEE500] hover:bg-[#FDD800] text-[#3C1E1E] rounded-xl font-medium transition-colors"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.47 1.607 4.647 4.035 5.915l-.792 2.897c-.071.26.202.47.428.33l3.204-1.986c.703.103 1.426.157 2.125.157 5.523 0 10-3.477 10-7.813S17.523 3 12 3z"/>
                  </svg>
                  <span className="text-[10px]">{language === 'ko' ? '카카오톡' : 'Kakao'}</span>
                </button>
                <button
                  onClick={shareInstagram}
                  className="flex flex-col items-center justify-center gap-1 py-3 bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F77737] hover:opacity-90 text-white rounded-xl font-medium transition-opacity"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  <span className="text-[10px]">{language === 'ko' ? '인스타' : 'Insta'}</span>
                </button>
                <button
                  onClick={shareTikTok}
                  className="flex flex-col items-center justify-center gap-1 py-3 bg-black hover:bg-gray-900 text-white rounded-xl font-medium transition-colors border border-gray-700"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                  </svg>
                  <span className="text-[10px]">TikTok</span>
                </button>
                <button
                  onClick={shareTelegram}
                  className="flex flex-col items-center justify-center gap-1 py-3 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-xl font-medium transition-colors"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                  <span className="text-[10px]">Telegram</span>
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={generateCode}
              disabled={generating}
              className="w-full py-4 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 rounded-xl font-bold transition-colors"
            >
              {generating ? t.generating : t.generateCode}
            </button>
          )}
        </div>

        {/* 초대 현황 */}
        {stats && (
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-5">
            <h3 className="text-sm font-medium text-gray-400 mb-4">📊 {t.stats}</h3>
            
            {/* 통계 */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{stats.totalReferrals}</div>
                <div className="text-xs text-gray-500">{t.invitedFriends}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{formatDays(stats.effectiveRewardDays)}</div>
                <div className="text-xs text-gray-500">{t.receivedReward}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">{formatDays(stats.remainingCapDays)}</div>
                <div className="text-xs text-gray-500">{t.remainingCap}</div>
              </div>
            </div>
            
            {/* 프로그레스 바 */}
            <div className="mb-2">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{t.progress}</span>
                <span>{stats.effectiveRewardDays} / {stats.maxRewardDays}{language === 'ko' ? '일' : ' days'}</span>
              </div>
              <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            
            {stats.isCapReached ? (
              <div className="text-center text-yellow-400 text-sm mt-3">
                {t.maxReached}
              </div>
            ) : (
              <div className="text-center text-gray-400 text-sm mt-3">
                {stats.referralsToMax}{t.moreToMax}
              </div>
            )}
          </div>
        )}

        {/* 최근 초대 기록 */}
        {referralData?.recentReferrals && referralData.recentReferrals.length > 0 && (
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-5">
            <h3 className="text-sm font-medium text-gray-400 mb-4">👥 {t.recentHistory}</h3>
            
            <div className="space-y-3">
              {referralData.recentReferrals.map((referral) => (
                <div 
                  key={referral.id}
                  className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"
                >
                  <div>
                    <div className="text-sm text-white">{referral.name}</div>
                    <div className="text-xs text-gray-500">{referral.email}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 text-sm font-medium">+{formatDays(referral.rewardDays)}</div>
                    <div className="text-xs text-gray-500">{formatDate(referral.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 유의사항 */}
        <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-3">📌 {t.notice}</h3>
          <ul className="text-xs text-gray-500 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-green-500">•</span>
              {t.notice1}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">•</span>
              {t.notice2}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">•</span>
              {t.notice3}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">•</span>
              {t.notice4}
            </li>
          </ul>
        </div>

      </div>
    </div>
  )
}