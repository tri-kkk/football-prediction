'use client'

import React, { useState, useEffect } from 'react'
import { Link } from '@/i18n/navigation'
// 슬롯 타입 정보
const SLOT_TYPES = [
  { value: 'all', label: '전체' },
  { value: 'desktop_banner', label: '데스크톱 배너', size: '728×90' },
  { value: 'sidebar', label: '사이드바', size: '300×600' },
  { value: 'mobile_bottom', label: '모바일 하단', size: '320×50' },
  { value: 'baseball_odds_bottom', label: '야구 배당률 하단', size: '320×50' },
]

interface DailyStat {
  date: string
  impressions: number
  clicks: number
  advertisements?: {
    id: string
    name: string
    slot_type: string
  }
}

interface AdSummary {
  id: string
  name: string
  slot_type: string
  totalImpressions: number
  totalClicks: number
  ctr: number
}

export default function AdReportPage() {
  // 인증 상태
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  
  // 데이터
  const [stats, setStats] = useState<DailyStat[]>([])
  const [summary, setSummary] = useState<{ date: string; impressions: number; clicks: number }[]>([])
  const [adSummary, setAdSummary] = useState<AdSummary[]>([])
  const [loading, setLoading] = useState(true)
  
  // 필터
  const [filterSlot, setFilterSlot] = useState('all')
  const [dateRange, setDateRange] = useState('7') // 7, 14, 30일
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'trendsoccer2024!'

  // 인증 처리
  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      setAuthError('')
      sessionStorage.setItem('ads_admin_auth', 'true')
    } else {
      setAuthError('비밀번호가 올바르지 않습니다')
    }
  }

  // 세션 체크
  useEffect(() => {
    const auth = sessionStorage.getItem('ads_admin_auth')
    if (auth === 'true') {
      setIsAuthenticated(true)
    }
  }, [])

  // 통계 불러오기
  const fetchStats = async () => {
    try {
      setLoading(true)
      
      let url = `/api/ads/track?days=${dateRange}`
      if (filterSlot !== 'all') {
        url += `&slot=${filterSlot}`
      }
      if (startDate) url += `&start=${startDate}`
      if (endDate) url += `&end=${endDate}`
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('통계 로드 실패')
      
      const data = await response.json()
      setStats(data.stats || [])
      setSummary(data.summary || [])
      
      // 광고별 요약 계산
      const adMap: Record<string, AdSummary> = {}
      for (const stat of data.stats || []) {
        const ad = stat.advertisements
        if (!ad) continue
        
        if (!adMap[ad.id]) {
          adMap[ad.id] = {
            id: ad.id,
            name: ad.name,
            slot_type: ad.slot_type,
            totalImpressions: 0,
            totalClicks: 0,
            ctr: 0
          }
        }
        adMap[ad.id].totalImpressions += stat.impressions || 0
        adMap[ad.id].totalClicks += stat.clicks || 0
      }
      
      // CTR 계산
      const adList = Object.values(adMap).map(ad => ({
        ...ad,
        ctr: ad.totalImpressions > 0 
          ? (ad.totalClicks / ad.totalImpressions) * 100 
          : 0
      }))
      
      setAdSummary(adList.sort((a, b) => b.totalImpressions - a.totalImpressions))
      
    } catch (err) {
      console.error('통계 로드 에러:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats()
    }
  }, [isAuthenticated, filterSlot, dateRange])

  // 최대값 (차트 스케일용)
  const maxImpressions = Math.max(...summary.map(s => s.impressions), 1)
  const maxClicks = Math.max(...summary.map(s => s.clicks), 1)

  // 총계
  const totalImpressions = summary.reduce((acc, s) => acc + s.impressions, 0)
  const totalClicks = summary.reduce((acc, s) => acc + s.clicks, 0)
  const totalCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0

  // 슬롯 타입 라벨
  const getSlotLabel = (type: string) => {
    return SLOT_TYPES.find(s => s.value === type)?.label || type
  }

  // 로그인 화면
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">📊 트래픽 리포트</h1>
            <p className="text-gray-400">TrendSoccer 광고 통계</p>
          </div>
          
          <form onSubmit={handleAuth}>
            <div className="mb-4">
              <label className="block text-gray-300 text-sm mb-2">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                placeholder="관리자 비밀번호 입력"
              />
            </div>
            
            {authError && (
              <p className="text-red-400 text-sm mb-4">{authError}</p>
            )}
            
            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors"
            >
              로그인
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* 헤더 */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">📊 트래픽 리포트</h1>
            <span className="text-gray-400 text-sm">TrendSoccer</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/admin/ads"
              className="text-emerald-400 hover:text-emerald-300 text-sm"
            >
              ← 광고 관리
            </Link>
            <a
              href="/"
              className="text-gray-400 hover:text-white text-sm"
            >
              메인으로
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {/* 필터 바 */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {/* 슬롯 필터 */}
          <select
            value={filterSlot}
            onChange={(e) => setFilterSlot(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
          >
            {SLOT_TYPES.map(slot => (
              <option key={slot.value} value={slot.value}>
                {slot.label} {slot.size ? `(${slot.size})` : ''}
              </option>
            ))}
          </select>
          
          {/* 기간 필터 */}
          <div className="flex gap-2">
            {['7', '14', '30'].map(days => (
              <button
                key={days}
                onClick={() => setDateRange(days)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateRange === days
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {days}일
              </button>
            ))}
          </div>

          {/* 새로고침 */}
          <button
            onClick={fetchStats}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            🔄 새로고침
          </button>
        </div>

        {/* 총계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-1">총 노출</div>
            <div className="text-3xl font-bold text-white">
              {totalImpressions.toLocaleString()}
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-1">총 클릭</div>
            <div className="text-3xl font-bold text-emerald-400">
              {totalClicks.toLocaleString()}
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-1">평균 CTR</div>
            <div className="text-3xl font-bold text-blue-400">
              {totalCTR.toFixed(2)}%
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4 animate-bounce">📊</div>
            <p className="text-gray-400">데이터 불러오는 중...</p>
          </div>
        ) : (
          <>
            {/* 일별 차트 */}
            <div className="bg-gray-800 rounded-xl p-6 mb-8">
              <h2 className="text-lg font-bold mb-6">일별 추이</h2>
              
              {summary.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  데이터가 없습니다
                </div>
              ) : (
                <div className="space-y-3">
                  {summary.slice(0, 14).reverse().map((day) => (
                    <div key={day.date} className="flex items-center gap-4">
                      {/* 날짜 */}
                      <div className="w-24 text-sm text-gray-400">
                        {new Date(day.date).toLocaleDateString('ko-KR', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                      
                      {/* 바 차트 */}
                      <div className="flex-1 flex gap-2">
                        {/* 노출 바 */}
                        <div className="flex-1 h-6 bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${(day.impressions / maxImpressions) * 100}%` }}
                          />
                        </div>
                        {/* 클릭 바 */}
                        <div className="flex-1 h-6 bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${(day.clicks / maxClicks) * 100}%` }}
                          />
                        </div>
                      </div>
                      
                      {/* 수치 */}
                      <div className="w-32 flex gap-4 text-sm">
                        <span className="text-blue-400">{day.impressions}</span>
                        <span className="text-emerald-400">{day.clicks}</span>
                        <span className="text-gray-500">
                          {day.impressions > 0 
                            ? ((day.clicks / day.impressions) * 100).toFixed(1) 
                            : 0}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* 범례 */}
              <div className="flex items-center gap-6 mt-6 pt-4 border-t border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  <span className="text-sm text-gray-400">노출</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                  <span className="text-sm text-gray-400">클릭</span>
                </div>
              </div>
            </div>

            {/* 광고별 성과 */}
            <div className="bg-gray-800 rounded-xl overflow-hidden">
              <div className="p-6 border-b border-gray-700">
                <h2 className="text-lg font-bold">광고별 성과</h2>
              </div>
              
              {adSummary.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  데이터가 없습니다
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                        <th className="px-6 py-4">광고명</th>
                        <th className="px-6 py-4">슬롯</th>
                        <th className="px-6 py-4 text-right">노출</th>
                        <th className="px-6 py-4 text-right">클릭</th>
                        <th className="px-6 py-4 text-right">CTR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adSummary.map((ad) => (
                        <tr 
                          key={ad.id}
                          className="border-b border-gray-700/50 hover:bg-gray-700/30"
                        >
                          <td className="px-6 py-4 font-medium">{ad.name}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs ${
                              ad.slot_type === 'desktop_banner' ? 'bg-blue-500/20 text-blue-400' :
                              ad.slot_type === 'sidebar' ? 'bg-purple-500/20 text-purple-400' :
                              ad.slot_type === 'baseball_odds_bottom' ? 'bg-emerald-500/20 text-emerald-400' :
                              'bg-orange-500/20 text-orange-400'
                            }`}>
                              {getSlotLabel(ad.slot_type)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-blue-400">
                            {ad.totalImpressions.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right text-emerald-400">
                            {ad.totalClicks.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`font-bold ${
                              ad.ctr >= 1 ? 'text-emerald-400' : 
                              ad.ctr >= 0.5 ? 'text-yellow-400' : 
                              'text-gray-400'
                            }`}>
                              {ad.ctr.toFixed(2)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 일별 상세 테이블 */}
            <div className="bg-gray-800 rounded-xl overflow-hidden mt-8">
              <div className="p-6 border-b border-gray-700">
                <h2 className="text-lg font-bold">일별 상세</h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                      <th className="px-6 py-4">날짜</th>
                      <th className="px-6 py-4 text-right">노출</th>
                      <th className="px-6 py-4 text-right">클릭</th>
                      <th className="px-6 py-4 text-right">CTR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map((day) => {
                      const ctr = day.impressions > 0 
                        ? (day.clicks / day.impressions) * 100 
                        : 0
                      return (
                        <tr 
                          key={day.date}
                          className="border-b border-gray-700/50 hover:bg-gray-700/30"
                        >
                          <td className="px-6 py-4">
                            {new Date(day.date).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="px-6 py-4 text-right text-blue-400">
                            {day.impressions.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right text-emerald-400">
                            {day.clicks.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`font-bold ${
                              ctr >= 1 ? 'text-emerald-400' : 
                              ctr >= 0.5 ? 'text-yellow-400' : 
                              'text-gray-400'
                            }`}>
                              {ctr.toFixed(2)}%
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
