'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'

// ==================== 타입 정의 ====================


interface User {
  id: string
  email: string
  name: string | null
  provider: string
  tier: string
  created_at: string
  updated_at: string
  last_login_at: string | null
  // 🌍 국가 정보 추가
  signup_ip: string | null
  signup_country: string | null
  signup_country_code: string | null
}

interface CountryStat {
  country: string
  code: string
  count: number
}

interface Subscription {
  id: string
  user_id: string
  user_email?: string
  user_name?: string
  plan: 'monthly' | 'yearly'
  status: 'active' | 'cancelled' | 'expired'
  started_at: string
  expires_at: string
  cancelled_at: string | null
  payment_id: string | null
  price: number
}

interface Advertisement {
  id: string
  name: string
  slot_type: 'desktop_banner' | 'sidebar' | 'mobile_bottom'
  image_url: string
  link_url: string
  alt_text: string
  width: number
  height: number
  is_active: boolean
  priority: number
  start_date: string | null
  end_date: string | null
  click_count: number
  impression_count: number
  created_at: string
  updated_at: string
}

interface DailyStats {
  date: string
  total_users: number
  new_users: number
  free_users: number
  premium_users: number
  new_subscriptions: number
  cancelled_subscriptions: number
  revenue: number
}

interface AdStats {
  ad_id: string
  impressions: number
  clicks: number
}

interface DailyAdStat {
  date: string
  impressions: number
  clicks: number
  advertisements?: {
    id: string
    name: string
    slot_type: string
  }
}

interface AdPerformance {
  id: string
  name: string
  slot_type: string
  totalImpressions: number
  totalClicks: number
  ctr: number
}

interface BlogPost {
  id: number
  slug: string
  title_kr: string
  title_en?: string
  category: string
  published: boolean
  published_at: string | null
  views: number
  created_at: string
  updated_at: string
}

// 📊 트래픽 분석 타입 추가
interface TrafficOverview {
  activeUsers: string
  sessions: string
  pageViews: string
  avgSessionDuration: string
  bounceRate: string
  newUsers: string
}

interface DailyTraffic {
  date: string
  users: number
  sessions: number
  pageViews: number
}

interface PageStats {
  path: string
  views: number
  avgDuration: string
}

interface SourceStats {
  source: string
  sessions: number
  users: number
}

interface CountryTraffic {
  country: string
  users: number
  sessions: number
}

interface DeviceStats {
  device: string
  users: number
  sessions: number
}

// 🆕 시간대별 트래픽
interface HourlyTraffic {
  hour: number
  users: number
  sessions: number
}

// 🆕 신규 vs 재방문자
interface UserTypeStats {
  type: string
  users: number
  sessions: number
}

// 🆕 전주 대비 성장률
interface ComparisonData {
  current: {
    users: number
    sessions: number
    pageViews: number
    newUsers: number
  }
  previous: {
    users: number
    sessions: number
    pageViews: number
    newUsers: number
  }
  growth: {
    users: string
    sessions: string
    pageViews: string
    newUsers: string
  }
}

// ==================== 상수 ====================

const SLOT_TYPES = [
  { value: 'desktop_banner', label: '데스크톱 배너', size: '728×90' },
  { value: 'sidebar', label: '사이드바', size: '300×600' },
  { value: 'mobile_bottom', label: '모바일 하단', size: '320×50' },
]

const TABS = [
  { id: 'dashboard', label: '대시보드', icon: '📊' },
  { id: 'traffic', label: '트래픽 분석', icon: '📈' },  // 🆕 트래픽 탭 추가
  { id: 'users', label: '회원 관리', icon: '👥' },
  { id: 'subscriptions', label: '구독 관리', icon: '💳' },
  { id: 'ads', label: '광고 관리', icon: '📢' },
  { id: 'report', label: '광고 리포트', icon: '📉' },
  { id: 'blog', label: '블로그 관리', icon: '📝' },
]

/// 국기 이모지 매핑 - 확장
const COUNTRY_FLAGS: Record<string, string> = {
  KR: '🇰🇷', US: '🇺🇸', JP: '🇯🇵', CN: '🇨🇳', GB: '🇬🇧',
  DE: '🇩🇪', FR: '🇫🇷', NG: '🇳🇬', GH: '🇬🇭', BR: '🇧🇷',
  IN: '🇮🇳', VN: '🇻🇳', TH: '🇹🇭', PH: '🇵🇭', ID: '🇮🇩',
  MY: '🇲🇾', SG: '🇸🇬', AU: '🇦🇺', CA: '🇨🇦', MX: '🇲🇽',
  KE: '🇰🇪', TZ: '🇹🇿', UG: '🇺🇬', EG: '🇪🇬', ZA: '🇿🇦',
  NL: '🇳🇱', CM: '🇨🇲', CI: '🇨🇮', LR: '🇱🇷', ZM: '🇿🇲',
  BW: '🇧🇼', ES: '🇪🇸', IT: '🇮🇹', PT: '🇵🇹', RU: '🇷🇺',
  TR: '🇹🇷', SA: '🇸🇦', AE: '🇦🇪', PK: '🇵🇰', BD: '🇧🇩',
  AR: '🇦🇷', CO: '🇨🇴', PE: '🇵🇪', CL: '🇨🇱', PL: '🇵🇱',
  BE: '🇧🇪', SE: '🇸🇪', NO: '🇳🇴', DK: '🇩🇰', FI: '🇫🇮',
  IE: '🇮🇪', CH: '🇨🇭', AT: '🇦🇹', GR: '🇬🇷', CZ: '🇨🇿',
  RO: '🇷🇴', HU: '🇭🇺', UA: '🇺🇦', MA: '🇲🇦', DZ: '🇩🇿',
  TN: '🇹🇳', SN: '🇸🇳', ET: '🇪🇹', RW: '🇷🇼', ZW: '🇿🇼',
  NZ: '🇳🇿', TW: '🇹🇼', HK: '🇭🇰',
}

// 국가명 → 코드 매핑 (GA4용) - 확장
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  'South Korea': 'KR',
  'Korea': 'KR',
  'United States': 'US',
  'Japan': 'JP',
  'China': 'CN',
  'United Kingdom': 'GB',
  'Germany': 'DE',
  'France': 'FR',
  'Nigeria': 'NG',
  'Ghana': 'GH',
  'Brazil': 'BR',
  'India': 'IN',
  'Vietnam': 'VN',
  'Thailand': 'TH',
  'Philippines': 'PH',
  'Indonesia': 'ID',
  'Malaysia': 'MY',
  'Singapore': 'SG',
  'Australia': 'AU',
  'Canada': 'CA',
  'Mexico': 'MX',
  'Kenya': 'KE',
  'Tanzania': 'TZ',
  'Uganda': 'UG',
  'Egypt': 'EG',
  'South Africa': 'ZA',
  'Netherlands': 'NL',
  'Cameroon': 'CM',
  "Côte d'Ivoire": 'CI',
  'Ivory Coast': 'CI',
  'Liberia': 'LR',
  'Zambia': 'ZM',
  'Botswana': 'BW',
  'Spain': 'ES',
  'Italy': 'IT',
  'Portugal': 'PT',
  'Russia': 'RU',
  'Turkey': 'TR',
  'Saudi Arabia': 'SA',
  'United Arab Emirates': 'AE',
  'Pakistan': 'PK',
  'Bangladesh': 'BD',
  'Argentina': 'AR',
  'Colombia': 'CO',
  'Peru': 'PE',
  'Chile': 'CL',
  'Poland': 'PL',
  'Belgium': 'BE',
  'Sweden': 'SE',
  'Norway': 'NO',
  'Denmark': 'DK',
  'Finland': 'FI',
  'Ireland': 'IE',
  'Switzerland': 'CH',
  'Austria': 'AT',
  'Greece': 'GR',
  'Czech Republic': 'CZ',
  'Czechia': 'CZ',
  'Romania': 'RO',
  'Hungary': 'HU',
  'Ukraine': 'UA',
  'Morocco': 'MA',
  'Algeria': 'DZ',
  'Tunisia': 'TN',
  'Senegal': 'SN',
  'Ethiopia': 'ET',
  'Rwanda': 'RW',
  'Zimbabwe': 'ZW',
  'New Zealand': 'NZ',
  'Taiwan': 'TW',
  'Hong Kong': 'HK',
}

const getCountryFlag = (code: string | null) => {
  if (!code) return '🌐'
  return COUNTRY_FLAGS[code] || '🌐'
}

// GA4 국가명으로도 플래그 찾기
const getCountryFlagByName = (countryName: string | null) => {
  if (!countryName) return '🌐'
  if (COUNTRY_FLAGS[countryName]) return COUNTRY_FLAGS[countryName]
  const code = COUNTRY_NAME_TO_CODE[countryName]
  if (code && COUNTRY_FLAGS[code]) return COUNTRY_FLAGS[code]
  return '🌐'
}

// ==================== 유틸리티 함수 ====================

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const formatDateTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount)
}

const calculateCTR = (clicks: number, impressions: number) => {
  if (impressions === 0) return '0.00'
  return ((clicks / impressions) * 100).toFixed(2)
}

const getDaysAgo = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().split('T')[0]
}

// ==================== 차트 컴포넌트 ====================

function MiniBarChart({ data, label, color }: { data: number[]; label: string; color: string }) {
  const max = Math.max(...data, 1)
  
  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="flex items-end gap-1 h-16">
        {data.map((value, i) => (
          <div
            key={i}
            className="flex-1 rounded-t transition-all duration-300 hover:opacity-80"
            style={{
              height: `${(value / max) * 100}%`,
              backgroundColor: color,
              minHeight: value > 0 ? '4px' : '0',
            }}
            title={`${value}`}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-gray-600">
        <span>7일 전</span>
        <span>오늘</span>
      </div>
    </div>
  )
}

function TrendChart({ 
  data, 
  title, 
  valueKey, 
  color = '#10b981' 
}: { 
  data: DailyStats[]
  title: string
  valueKey: keyof DailyStats
  color?: string 
}) {
  const values = data.map(d => Number(d[valueKey]) || 0)
  const max = Math.max(...values, 1)
  const total = values.reduce((a, b) => a + b, 0)
  
  return (
    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-gray-300">{title}</h4>
        <span className="text-lg font-bold text-white">{total.toLocaleString()}</span>
      </div>
       <div className="flex items-end gap-1 h-20">
        {data.map((d, i) => (
          <div key={i} className="flex-1 h-full flex flex-col items-center justify-end group relative">
            <div
              className="w-full rounded-t transition-all duration-300 cursor-pointer hover:opacity-80"
              style={{
                height: `${(values[i] / max) * 100}%`,
                backgroundColor: color,
                minHeight: values[i] > 0 ? '4px' : '0',
              }}
            />
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
              {formatDate(d.date)}: {values[i]}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-gray-500">
        <span>{data.length > 0 ? formatDate(data[0].date) : ''}</span>
        <span>{data.length > 0 ? formatDate(data[data.length - 1].date) : ''}</span>
      </div>
    </div>
  )
}

// ==================== 메인 컴포넌트 ====================

export default function AdminDashboard() {
  // ===== 인증 상태 =====
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(true)
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null)
  const [lockoutCountdown, setLockoutCountdown] = useState<number | null>(null)
  
  // ===== 탭 상태 =====
  const [activeTab, setActiveTab] = useState('dashboard')
  
  // ===== 데이터 상태 =====
  const [users, setUsers] = useState<User[]>([])
  const [countryStats, setCountryStats] = useState<CountryStat[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [ads, setAds] = useState<Advertisement[]>([])
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [todayAdStats, setTodayAdStats] = useState<Record<string, AdStats>>({})
  
  // ===== 로딩/에러 상태 =====
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // ===== 필터 상태 =====
  const [userFilter, setUserFilter] = useState<'all' | 'free' | 'premium'>('all')
  const [countryFilter, setCountryFilter] = useState<string>('all')
  const [subscriptionFilter, setSubscriptionFilter] = useState<'all' | 'active' | 'cancelled' | 'expired'>('all')
  const [adFilter, setAdFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<'7' | '14' | '30'>('7')
  
  // ===== 모달 상태 =====
  const [isAdModalOpen, setIsAdModalOpen] = useState(false)
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null)
  const [adFormData, setAdFormData] = useState({
    name: '',
    slot_type: 'desktop_banner',
    image_url: '',
    link_url: '',
    alt_text: '',
    width: 728,
    height: 90,
    priority: 0,
    start_date: '',
    end_date: '',
  })
  
  // ===== 검색 상태 =====
  const [userSearch, setUserSearch] = useState('')
  
  // ===== 리포트 상태 =====
  const [reportStats, setReportStats] = useState<DailyAdStat[]>([])
  const [reportSummary, setReportSummary] = useState<{ date: string; impressions: number; clicks: number }[]>([])
  const [adPerformance, setAdPerformance] = useState<AdPerformance[]>([])
  const [reportSlotFilter, setReportSlotFilter] = useState('all')
  const [reportDateRange, setReportDateRange] = useState('7')
  
  // ===== 블로그 상태 =====
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [blogLoading, setBlogLoading] = useState(false)
  const [blogCategoryFilter, setBlogCategoryFilter] = useState('all')
  
  // ===== 📊 트래픽 분석 상태 (신규) =====
  const [realtimeUsers, setRealtimeUsers] = useState<number>(0)
  const [trafficOverview, setTrafficOverview] = useState<TrafficOverview | null>(null)
  const [dailyTraffic, setDailyTraffic] = useState<DailyTraffic[]>([])
  const [topPages, setTopPages] = useState<PageStats[]>([])
  const [trafficSources, setTrafficSources] = useState<SourceStats[]>([])
  const [countryTraffic, setCountryTraffic] = useState<CountryTraffic[]>([])
  const [deviceStats, setDeviceStats] = useState<DeviceStats[]>([])
  const [trafficLoading, setTrafficLoading] = useState(false)
  const [trafficDateRange, setTrafficDateRange] = useState<'7' | '14' | '30'>('7')
  // 🆕 새로운 트래픽 분석 state
  const [hourlyTraffic, setHourlyTraffic] = useState<HourlyTraffic[]>([])
  const [userTypeStats, setUserTypeStats] = useState<UserTypeStats[]>([])
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null)
  
  // ===== Refs =====
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  // ==================== 인증 ====================

  useEffect(() => {
    if (lockoutCountdown && lockoutCountdown > 0) {
      const timer = setTimeout(() => setLockoutCountdown(lockoutCountdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (lockoutCountdown === 0) {
      setLockoutCountdown(null)
      setAuthError('')
      setRemainingAttempts(null)
    }
  }, [lockoutCountdown])

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/admin/verify')
        const data = await response.json()
        setIsAuthenticated(data.valid === true)
      } catch {
        setIsAuthenticated(false)
      } finally {
        setAuthLoading(false)
      }
    }
    checkSession()
  }, [])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!password.trim()) {
      setAuthError('비밀번호를 입력해주세요')
      return
    }

    setAuthLoading(true)
    setAuthError('')

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      const data = await response.json()

      if (response.ok) {
        setIsAuthenticated(true)
        setPassword('')
        setRemainingAttempts(null)
        setLockoutCountdown(null)
      } else {
        setAuthError(data.message || data.error)
        setRemainingAttempts(data.remainingAttempts ?? null)
        
        if (data.locked && data.remainingSeconds) {
          setLockoutCountdown(data.remainingSeconds)
        }
      }
    } catch (error) {
      setAuthError('서버 연결 오류')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/login', { method: 'DELETE' })
    } catch (error) {
      console.error('Logout error:', error)
    }
    setIsAuthenticated(false)
  }

  // ==================== 데이터 로드 ====================

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (!response.ok) throw new Error('회원 목록을 불러오는데 실패했습니다')
      const data = await response.json()
      setUsers(data.users || [])
    } catch (err: any) {
      console.error('Users fetch error:', err)
    }
  }

  const fetchCountryStats = async () => {
    try {
      const response = await fetch('/api/admin/users?stats=country')
      if (!response.ok) return
      const data = await response.json()
      setCountryStats(data.stats || [])
    } catch (err) {
      console.error('Country stats fetch error:', err)
    }
  }

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch('/api/admin/subscriptions')
      if (!response.ok) throw new Error('구독 목록을 불러오는데 실패했습니다')
      const data = await response.json()
      setSubscriptions(data.subscriptions || [])
    } catch (err: any) {
      console.error('Subscriptions fetch error:', err)
    }
  }

  const fetchAds = async () => {
    try {
      const response = await fetch('/api/ads')
      if (!response.ok) throw new Error('광고 목록을 불러오는데 실패했습니다')
      const data = await response.json()
      setAds(data.ads || [])
    } catch (err: any) {
      console.error('Ads fetch error:', err)
    }
  }

  const fetchDailyStats = async () => {
    try {
      const days = parseInt(dateRange)
      const startDate = getDaysAgo(days)
      const endDate = getDaysAgo(0)
      const response = await fetch(`/api/admin/stats?start=${startDate}&end=${endDate}`)
      if (!response.ok) throw new Error('통계를 불러오는데 실패했습니다')
      const data = await response.json()
      setDailyStats(data.stats || [])
    } catch (err: any) {
      console.error('Stats fetch error:', err)
    }
  }

  const fetchAdStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const response = await fetch(`/api/ads/track?start=${today}&end=${today}`)
      if (!response.ok) return
      const data = await response.json()
      const statsMap: Record<string, AdStats> = {}
      for (const stat of data.stats || []) {
        statsMap[stat.ad_id] = stat
      }
      setTodayAdStats(statsMap)
    } catch (err) {
      console.error('Ad stats fetch error:', err)
    }
  }

  const fetchReportStats = async () => {
    try {
      let url = `/api/ads/track?days=${reportDateRange}`
      if (reportSlotFilter !== 'all') {
        url += `&slot=${reportSlotFilter}`
      }
      const response = await fetch(url)
      if (!response.ok) return
      const data = await response.json()
      setReportStats(data.stats || [])
      
      const summaryMap: Record<string, { impressions: number; clicks: number }> = {}
      for (const stat of data.stats || []) {
        if (!summaryMap[stat.date]) {
          summaryMap[stat.date] = { impressions: 0, clicks: 0 }
        }
        summaryMap[stat.date].impressions += stat.impressions || 0
        summaryMap[stat.date].clicks += stat.clicks || 0
      }
      const summary = Object.entries(summaryMap)
        .map(([date, vals]) => ({ date, ...vals }))
        .sort((a, b) => a.date.localeCompare(b.date))
      setReportSummary(summary)
      
      const perfMap: Record<string, AdPerformance> = {}
      for (const stat of data.stats || []) {
        const ad = stat.advertisements
        if (!ad) continue
        if (!perfMap[ad.id]) {
          perfMap[ad.id] = {
            id: ad.id,
            name: ad.name,
            slot_type: ad.slot_type,
            totalImpressions: 0,
            totalClicks: 0,
            ctr: 0,
          }
        }
        perfMap[ad.id].totalImpressions += stat.impressions || 0
        perfMap[ad.id].totalClicks += stat.clicks || 0
      }
      const perf = Object.values(perfMap).map(p => ({
        ...p,
        ctr: p.totalImpressions > 0 ? (p.totalClicks / p.totalImpressions) * 100 : 0,
      }))
      setAdPerformance(perf.sort((a, b) => b.totalImpressions - a.totalImpressions))
    } catch (err) {
      console.error('Report stats fetch error:', err)
    }
  }

  // ==================== 📊 트래픽 분석 함수 (신규) ====================

  const fetchRealtimeUsers = async () => {
    try {
      const response = await fetch('/api/admin/analytics?type=realtime')
      if (!response.ok) return
      const data = await response.json()
      setRealtimeUsers(parseInt(data.activeUsers) || 0)
    } catch (err) {
      console.error('Realtime fetch error:', err)
    }
  }

  const fetchTrafficData = async () => {
    setTrafficLoading(true)
    try {
      const days = trafficDateRange

      const [overviewRes, dailyRes, pagesRes, sourcesRes, countriesRes, devicesRes, hourlyRes, userTypeRes, comparisonRes] = await Promise.all([
        fetch(`/api/admin/analytics?type=overview&days=${days}`),
        fetch(`/api/admin/analytics?type=daily&days=${days}`),
        fetch(`/api/admin/analytics?type=pages&days=${days}`),
        fetch(`/api/admin/analytics?type=sources&days=${days}`),
        fetch(`/api/admin/analytics?type=countries&days=${days}`),
        fetch(`/api/admin/analytics?type=devices&days=${days}`),
        fetch(`/api/admin/analytics?type=hourly&days=${days}`),
        fetch(`/api/admin/analytics?type=usertype&days=${days}`),
        fetch(`/api/admin/analytics?type=comparison&days=${days}`),
      ])

      if (overviewRes.ok) {
        const data = await overviewRes.json()
        setTrafficOverview(data)
      }
      if (dailyRes.ok) {
        const data = await dailyRes.json()
        setDailyTraffic(Array.isArray(data) ? data : [])
      }
      if (pagesRes.ok) {
        const data = await pagesRes.json()
        setTopPages(Array.isArray(data) ? data : [])
      }
      if (sourcesRes.ok) {
        const data = await sourcesRes.json()
        setTrafficSources(Array.isArray(data) ? data : [])
      }
      if (countriesRes.ok) {
        const data = await countriesRes.json()
        setCountryTraffic(Array.isArray(data) ? data : [])
      }
      if (devicesRes.ok) {
        const data = await devicesRes.json()
        setDeviceStats(Array.isArray(data) ? data : [])
      }
      // 🆕 새로운 데이터
      if (hourlyRes.ok) {
        const data = await hourlyRes.json()
        setHourlyTraffic(Array.isArray(data) ? data : [])
      }
      if (userTypeRes.ok) {
        const data = await userTypeRes.json()
        setUserTypeStats(Array.isArray(data) ? data : [])
      }
      if (comparisonRes.ok) {
        const data = await comparisonRes.json()
        setComparisonData(data)
      }
    } catch (err) {
      console.error('Traffic data fetch error:', err)
    } finally {
      setTrafficLoading(false)
    }
  }

  const loadAllData = async () => {
    setLoading(true)
    setError('')
    try {
      await Promise.all([
        fetchUsers(),
        fetchCountryStats(),
        fetchSubscriptions(),
        fetchAds(),
        fetchDailyStats(),
        fetchAdStats(),
      ])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadAllData()
    }
  }, [isAuthenticated, dateRange])

  useEffect(() => {
    if (isAuthenticated && activeTab === 'report') {
      fetchReportStats()
    }
  }, [isAuthenticated, activeTab, reportDateRange, reportSlotFilter])

  useEffect(() => {
    if (isAuthenticated && activeTab === 'blog') {
      fetchBlogPosts()
    }
  }, [isAuthenticated, activeTab])

  // 📊 트래픽 탭 useEffect (신규)
  useEffect(() => {
    if (isAuthenticated && activeTab === 'traffic') {
      fetchRealtimeUsers()
      fetchTrafficData()

      // 실시간 사용자 30초마다 갱신
      const interval = setInterval(fetchRealtimeUsers, 30000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated, activeTab, trafficDateRange])

  // ==================== 블로그 관리 함수 ====================

  const fetchBlogPosts = async () => {
    try {
      setBlogLoading(true)
      const response = await fetch('/api/admin/blog/posts')
      if (!response.ok) throw new Error('블로그 목록 조회 실패')
      const data = await response.json()
      setBlogPosts(data.data || data.posts || [])
    } catch (err) {
      console.error('Blog posts fetch error:', err)
    } finally {
      setBlogLoading(false)
    }
  }

  const handleTogglePublish = async (postId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/blog/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !currentStatus })
      })
      if (!response.ok) throw new Error('상태 변경 실패')
      fetchBlogPosts()
    } catch (err) {
      alert('상태 변경에 실패했습니다')
    }
  }

  const handleDeletePost = async (postId: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    
    try {
      const response = await fetch(`/api/admin/blog/posts/${postId}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('삭제 실패')
      alert('삭제되었습니다')
      fetchBlogPosts()
    } catch (err) {
      alert('삭제에 실패했습니다')
    }
  }

  const filteredBlogPosts = useMemo(() => {
    if (blogCategoryFilter === 'all') return blogPosts
    return blogPosts.filter(post => post.category === blogCategoryFilter)
  }, [blogPosts, blogCategoryFilter])

  const blogCategories = useMemo(() => {
    const cats = new Set(blogPosts.map(p => p.category))
    return Array.from(cats)
  }, [blogPosts])

  const blogStats = useMemo(() => {
    const totalPosts = blogPosts.length
    const publishedPosts = blogPosts.filter(p => p.published).length
    const totalViews = blogPosts.reduce((sum, p) => sum + (p.views || 0), 0)
    return { totalPosts, publishedPosts, totalViews }
  }, [blogPosts])

  // ==================== 계산된 통계 ====================

  const stats = useMemo(() => {
    const totalUsers = users.length
    const freeUsers = users.filter(u => u.tier === 'free').length
    const premiumUsers = users.filter(u => u.tier === 'premium').length
    
    const today = new Date().toISOString().split('T')[0]
    const todayUsers = users.filter(u => u.created_at.startsWith(today)).length
    
    const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length
    const monthlyRevenue = subscriptions
      .filter(s => s.status === 'active')
      .reduce((sum, s) => sum + (s.plan === 'monthly' ? (s.price || 9900) : Math.round((s.price || 79000) / 12)), 0)
    
    const activeAds = ads.filter(a => a.is_active).length
    const todayImpressions = Object.values(todayAdStats).reduce((sum, s) => sum + (s.impressions || 0), 0)
    const todayClicks = Object.values(todayAdStats).reduce((sum, s) => sum + (s.clicks || 0), 0)

    return {
      totalUsers,
      freeUsers,
      premiumUsers,
      todayUsers,
      activeSubscriptions,
      monthlyRevenue,
      activeAds,
      todayImpressions,
      todayClicks,
    }
  }, [users, subscriptions, ads, todayAdStats])

  // ==================== 필터된 데이터 ====================

  const filteredUsers = useMemo(() => {
    let result = users
    
    if (userFilter !== 'all') {
      result = result.filter(u => u.tier === userFilter)
    }
    
    if (countryFilter !== 'all') {
      result = result.filter(u => u.signup_country_code === countryFilter)
    }
    
    if (userSearch) {
      const search = userSearch.toLowerCase()
      result = result.filter(u => 
        u.email.toLowerCase().includes(search) ||
        (u.name && u.name.toLowerCase().includes(search))
      )
    }
    
    return result.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [users, userFilter, countryFilter, userSearch])

  const filteredSubscriptions = useMemo(() => {
    let result = subscriptions
    
    if (subscriptionFilter !== 'all') {
      result = result.filter(s => s.status === subscriptionFilter)
    }
    
    return result.sort((a, b) => 
      new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    )
  }, [subscriptions, subscriptionFilter])

  const filteredAds = useMemo(() => {
    if (adFilter === 'all') return ads
    return ads.filter(a => a.slot_type === adFilter)
  }, [ads, adFilter])

  // ==================== 광고 관리 함수 ====================

  const handleSlotTypeChange = (slotType: string) => {
    const sizes: Record<string, { width: number; height: number }> = {
      desktop_banner: { width: 728, height: 90 },
      sidebar: { width: 300, height: 600 },
      mobile_bottom: { width: 320, height: 50 },
    }
    setAdFormData({
      ...adFormData,
      slot_type: slotType,
      ...sizes[slotType],
    })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)
      formDataUpload.append('folder', 'ads')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
      })

      if (!response.ok) throw new Error('업로드 실패')
      const data = await response.json()
      setAdFormData({ ...adFormData, image_url: data.url })
    } catch (err) {
      alert('이미지 업로드에 실패했습니다. URL을 직접 입력해주세요.')
    } finally {
      setUploading(false)
    }
  }

  const handleAdSave = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!adFormData.name || !adFormData.image_url || !adFormData.link_url) {
      alert('필수 항목을 모두 입력해주세요')
      return
    }

    try {
      const method = editingAd ? 'PUT' : 'POST'
      const body = editingAd ? { ...adFormData, id: editingAd.id } : adFormData

      const response = await fetch('/api/ads', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) throw new Error('저장 실패')
      
      setIsAdModalOpen(false)
      setEditingAd(null)
      resetAdForm()
      fetchAds()
      fetchAdStats()
    } catch (err) {
      alert('저장에 실패했습니다')
    }
  }

  const handleAdDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/ads?id=${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('삭제 실패')
      fetchAds()
      fetchAdStats()
    } catch (err) {
      alert('삭제에 실패했습니다')
    }
  }

  const handleToggleAdActive = async (ad: Advertisement) => {
    try {
      const response = await fetch('/api/ads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ad.id, is_active: !ad.is_active }),
      })
      if (!response.ok) throw new Error('업데이트 실패')
      fetchAds()
    } catch (err) {
      alert('상태 변경에 실패했습니다')
    }
  }

  const handleEditAd = (ad: Advertisement) => {
    setEditingAd(ad)
    setAdFormData({
      name: ad.name,
      slot_type: ad.slot_type,
      image_url: ad.image_url,
      link_url: ad.link_url,
      alt_text: ad.alt_text || '',
      width: ad.width,
      height: ad.height,
      priority: ad.priority,
      start_date: ad.start_date || '',
      end_date: ad.end_date || '',
    })
    setIsAdModalOpen(true)
  }

  const resetAdForm = () => {
    setAdFormData({
      name: '',
      slot_type: 'desktop_banner',
      image_url: '',
      link_url: '',
      alt_text: '',
      width: 728,
      height: 90,
      priority: 0,
      start_date: '',
      end_date: '',
    })
  }

  // ==================== 회원 관리 함수 ====================

  const handleUpdateUserTier = async (userId: string, newTier: 'free' | 'premium') => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, tier: newTier }),
      })
      if (!response.ok) throw new Error('업데이트 실패')
      fetchUsers()
    } catch (err) {
      alert('등급 변경에 실패했습니다')
    }
  }

  // ==================== 구독 관리 함수 ====================

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!confirm('정말 구독을 취소하시겠습니까?')) return
    
    try {
      const response = await fetch('/api/admin/subscriptions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: subscriptionId, status: 'cancelled' }),
      })
      if (!response.ok) throw new Error('취소 실패')
      fetchSubscriptions()
      fetchUsers()
    } catch (err) {
      alert('구독 취소에 실패했습니다')
    }
  }

  // ==================== 렌더링 ====================

  if (authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white text-lg flex items-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          로딩 중...
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50 shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">TrendSoccer Admin</h1>
              <p className="text-gray-400 text-sm">관리자 페이지에 로그인하세요</p>
            </div>
            
            {authError && (
              <div className={`mb-6 p-4 rounded-lg ${lockoutCountdown ? 'bg-red-900/50 border border-red-500' : 'bg-red-900/30'}`}>
                <p className="text-red-400 text-sm text-center">{authError}</p>
                {remainingAttempts !== null && remainingAttempts > 0 && (
                  <p className="text-yellow-400 text-xs text-center mt-1">
                    남은 시도: {remainingAttempts}회
                  </p>
                )}
                {lockoutCountdown !== null && (
                  <p className="text-white text-lg font-mono text-center mt-2">
                    {Math.floor(lockoutCountdown / 60)}:{String(lockoutCountdown % 60).padStart(2, '0')}
                  </p>
                )}
              </div>
            )}
            
            <form onSubmit={handleAuth} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  관리자 비밀번호
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={lockoutCountdown !== null}
                  placeholder="비밀번호를 입력하세요"
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  autoFocus
                />
              </div>
              
              <button
                type="submit"
                disabled={authLoading || lockoutCountdown !== null}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center"
              >
                {authLoading ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  '로그인'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // 메인 대시보드
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* 헤더 */}
      <nav className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚽</span>
              <span className="text-xl font-bold text-white">TrendSoccer Admin</span>
            </div>
            
            <div className="flex items-center gap-4">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as '7' | '14' | '30')}
                className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="7">최근 7일</option>
                <option value="14">최근 14일</option>
                <option value="30">최근 30일</option>
              </select>
              
              <button
                onClick={loadAllData}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
              >
                🔄 새로고침
              </button>
              
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm transition-colors"
              >
                로그아웃
              </button>
            </div>
          </div>
          
          {/* 탭 네비게이션 */}
          <div className="flex items-center gap-1 -mb-px overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading && (
          <div className="text-center py-20">
            <div className="text-4xl mb-4 animate-bounce">⚽</div>
            <p className="text-gray-400">데이터 불러오는 중...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">❌</div>
            <p className="text-red-400">{error}</p>
            <button
              onClick={loadAllData}
              className="mt-4 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
            >
              다시 시도
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* 대시보드 탭 */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* 요약 카드 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-xl p-5 border border-blue-500/30">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">👥</span>
                      <span className="text-xs text-blue-400 bg-blue-500/20 px-2 py-1 rounded-full">
                        +{stats.todayUsers} 오늘
                      </span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{stats.totalUsers.toLocaleString()}</div>
                    <div className="text-sm text-gray-400">전체 회원</div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-800/20 rounded-xl p-5 border border-emerald-500/30">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">💎</span>
                      <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-full">
                        {stats.totalUsers > 0 ? ((stats.premiumUsers / stats.totalUsers) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{stats.premiumUsers.toLocaleString()}</div>
                    <div className="text-sm text-gray-400">프리미엄 회원</div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-xl p-5 border border-purple-500/30">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">💳</span>
                      <span className="text-xs text-purple-400 bg-purple-500/20 px-2 py-1 rounded-full">
                        활성
                      </span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{stats.activeSubscriptions.toLocaleString()}</div>
                    <div className="text-sm text-gray-400">활성 구독</div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-amber-600/20 to-amber-800/20 rounded-xl p-5 border border-amber-500/30">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">💰</span>
                      <span className="text-xs text-amber-400 bg-amber-500/20 px-2 py-1 rounded-full">
                        월간
                      </span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{formatCurrency(stats.monthlyRevenue)}</div>
                    <div className="text-sm text-gray-400">예상 수익</div>
                  </div>
                </div>

                {/* 국가별 회원 분포 */}
                {countryStats.length > 0 && (
                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                    <h3 className="text-lg font-semibold text-white mb-4">🌍 국가별 회원 분포</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {countryStats.slice(0, 12).map((c) => (
                        <div key={c.code} className="bg-gray-900/50 rounded-lg p-3 text-center">
                          <div className="text-2xl mb-1">{getCountryFlag(c.code)}</div>
                          <div className="text-sm text-white font-medium">{c.count}명</div>
                          <div className="text-xs text-gray-500">{c.country}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 광고 통계 카드 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">📢</span>
                      <div>
                        <div className="text-sm text-gray-400">활성 광고</div>
                        <div className="text-2xl font-bold text-white">{stats.activeAds}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">👁️</span>
                      <div>
                        <div className="text-sm text-gray-400">오늘 노출</div>
                        <div className="text-2xl font-bold text-white">{stats.todayImpressions.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">👆</span>
                      <div>
                        <div className="text-sm text-gray-400">오늘 클릭 (CTR)</div>
                        <div className="text-2xl font-bold text-white">
                          {stats.todayClicks.toLocaleString()}
                          <span className="text-sm text-emerald-400 ml-2">
                            ({calculateCTR(stats.todayClicks, stats.todayImpressions)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 트렌드 차트 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TrendChart 
                    data={dailyStats} 
                    title="신규 가입자" 
                    valueKey="new_users" 
                    color="#3b82f6" 
                  />
                  <TrendChart 
                    data={dailyStats} 
                    title="신규 구독" 
                    valueKey="new_subscriptions" 
                    color="#10b981" 
                  />
                </div>

                {/* 회원 티어 분포 */}
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                  <h3 className="text-lg font-semibold text-white mb-4">회원 티어 분포</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="h-4 bg-gray-700 rounded-full overflow-hidden flex">
                        <div 
                          className="bg-gray-500 h-full transition-all duration-500"
                          style={{ width: `${stats.totalUsers > 0 ? (stats.freeUsers / stats.totalUsers) * 100 : 0}%` }}
                        />
                        <div 
                          className="bg-emerald-500 h-full transition-all duration-500"
                          style={{ width: `${stats.totalUsers > 0 ? (stats.premiumUsers / stats.totalUsers) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-gray-500 rounded-full" />
                      <span className="text-sm text-gray-400">무료 회원: {stats.freeUsers}명</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                      <span className="text-sm text-gray-400">프리미엄: {stats.premiumUsers}명</span>
                    </div>
                  </div>
                </div>

                {/* 최근 가입자 */}
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                  <h3 className="text-lg font-semibold text-white mb-4">최근 가입자</h3>
                  <div className="space-y-3">
                    {users.slice(0, 5).map((user) => (
                      <div 
                        key={user.id}
                        className="flex items-center justify-between py-3 border-b border-gray-700/50 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-lg">
                            {user.provider === 'google' ? '🔵' : '🟢'}
                          </div>
                          <div>
                            <div className="text-white font-medium flex items-center gap-2">
                              {user.name || '이름 없음'}
                              <span className="text-sm">{getCountryFlag(user.signup_country_code)}</span>
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            user.tier === 'premium' 
                              ? 'bg-emerald-500/20 text-emerald-400' 
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {user.tier === 'premium' ? '💎 프리미엄' : '무료'}
                          </span>
                          <div className="text-xs text-gray-500 mt-1">{formatDate(user.created_at)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 📊 트래픽 분석 탭 (신규) */}
            {activeTab === 'traffic' && (
              <div className="space-y-6">
                {/* 헤더 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-white">트래픽 분석</h2>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-full">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-green-400 text-sm font-medium">
                        실시간 {realtimeUsers}명
                      </span>
                    </div>
                  </div>
                  
                  {/* 기간 선택 */}
                  <div className="flex gap-2">
                    {(['7', '14', '30'] as const).map((d) => (
                      <button
                        key={d}
                        onClick={() => setTrafficDateRange(d)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          trafficDateRange === d
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        {d}일
                      </button>
                    ))}
                  </div>
                </div>

                {trafficLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
                  </div>
                ) : (
                  <>
                    {/* 개요 카드 */}
                    {trafficOverview && (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                          <div className="text-gray-400 text-xs mb-1">활성 사용자</div>
                          <div className="text-2xl font-bold text-white">
                            {parseInt(trafficOverview.activeUsers).toLocaleString()}
                          </div>
                        </div>
                        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                          <div className="text-gray-400 text-xs mb-1">세션</div>
                          <div className="text-2xl font-bold text-white">
                            {parseInt(trafficOverview.sessions).toLocaleString()}
                          </div>
                        </div>
                        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                          <div className="text-gray-400 text-xs mb-1">페이지뷰</div>
                          <div className="text-2xl font-bold text-white">
                            {parseInt(trafficOverview.pageViews).toLocaleString()}
                          </div>
                        </div>
                        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                          <div className="text-gray-400 text-xs mb-1">신규 사용자</div>
                          <div className="text-2xl font-bold text-emerald-400">
                            {parseInt(trafficOverview.newUsers).toLocaleString()}
                          </div>
                        </div>
                        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                          <div className="text-gray-400 text-xs mb-1">평균 체류시간</div>
                          <div className="text-2xl font-bold text-white">
                            {Math.floor(parseInt(trafficOverview.avgSessionDuration) / 60)}분 {parseInt(trafficOverview.avgSessionDuration) % 60}초
                          </div>
                        </div>
                        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                          <div className="text-gray-400 text-xs mb-1">이탈률</div>
                          <div className="text-2xl font-bold text-orange-400">
                            {trafficOverview.bounceRate}%
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 🆕 전주 대비 성장률 */}
                    {comparisonData && (
                      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                        <h3 className="text-lg font-semibold text-white mb-4">📈 전주 대비 성장률</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {[
                            { label: '사용자', current: comparisonData.current.users, growth: comparisonData.growth.users },
                            { label: '세션', current: comparisonData.current.sessions, growth: comparisonData.growth.sessions },
                            { label: '페이지뷰', current: comparisonData.current.pageViews, growth: comparisonData.growth.pageViews },
                            { label: '신규 사용자', current: comparisonData.current.newUsers, growth: comparisonData.growth.newUsers },
                          ].map((item, i) => {
                            const growthNum = parseFloat(item.growth)
                            const isPositive = growthNum > 0
                            const isNegative = growthNum < 0
                            return (
                              <div key={i} className="bg-gray-900/50 rounded-lg p-4">
                                <div className="text-gray-400 text-xs mb-1">{item.label}</div>
                                <div className="text-xl font-bold text-white">{item.current.toLocaleString()}</div>
                                <div className={`text-sm font-medium flex items-center gap-1 mt-1 ${
                                  isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-gray-400'
                                }`}>
                                  {isPositive ? '↑' : isNegative ? '↓' : '→'}
                                  {Math.abs(growthNum)}%
                                  <span className="text-gray-500 text-xs ml-1">vs 전주</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* 🆕 신규 vs 재방문 + 시간대별 트래픽 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 신규 vs 재방문 */}
                      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                        <h3 className="text-lg font-semibold text-white mb-4">👥 신규 vs 재방문</h3>
                        {userTypeStats.length > 0 ? (
                          <div className="space-y-4">
                            {(() => {
                              const total = userTypeStats.reduce((acc, u) => acc + u.users, 0)
                              const newUser = userTypeStats.find(u => u.type === 'new')
                              const returning = userTypeStats.find(u => u.type === 'returning')
                              const newPercent = total > 0 ? ((newUser?.users || 0) / total * 100).toFixed(1) : '0'
                              const returnPercent = total > 0 ? ((returning?.users || 0) / total * 100).toFixed(1) : '0'
                              
                              return (
                                <>
                                  <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                      <div className="flex justify-between mb-2">
                                        <span className="text-gray-300 text-sm">🆕 신규 방문자</span>
                                        <span className="text-white font-medium">{newUser?.users.toLocaleString() || 0}명 ({newPercent}%)</span>
                                      </div>
                                      <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                                          style={{ width: `${newPercent}%` }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                      <div className="flex justify-between mb-2">
                                        <span className="text-gray-300 text-sm">🔄 재방문자</span>
                                        <span className="text-white font-medium">{returning?.users.toLocaleString() || 0}명 ({returnPercent}%)</span>
                                      </div>
                                      <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-all duration-500"
                                          style={{ width: `${returnPercent}%` }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="mt-4 pt-4 border-t border-gray-700">
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-400">재방문율</span>
                                      <span className="text-emerald-400 font-medium">{returnPercent}%</span>
                                    </div>
                                  </div>
                                </>
                              )
                            })()}
                          </div>
                        ) : (
                          <div className="text-gray-500 text-sm text-center py-4">데이터 없음</div>
                        )}
                      </div>

                      {/* 시간대별 트래픽 */}
                      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                        <h3 className="text-lg font-semibold text-white mb-4">🕐 시간대별 트래픽</h3>
                        {hourlyTraffic.length > 0 ? (
                          <div>
                            <div className="flex items-end gap-[2px] h-32">
                              {Array.from({ length: 24 }, (_, hour) => {
                                const data = hourlyTraffic.find(h => h.hour === hour)
                                const users = data?.users || 0
                                const maxUsers = Math.max(...hourlyTraffic.map(h => h.users), 1)
                                const height = (users / maxUsers) * 100
                                const isPeak = users === maxUsers && users > 0
                                return (
                                  <div 
                                    key={hour} 
                                    className="flex-1 h-full flex flex-col items-center justify-end group relative"
                                  >
                                    <div
                                      className={`w-full rounded-t transition-all duration-300 ${
                                        isPeak ? 'bg-amber-500' : 'bg-emerald-500 hover:bg-emerald-400'
                                      }`}
                                      style={{ height: `${height}%`, minHeight: users > 0 ? '2px' : '0' }}
                                    />
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 border border-gray-700">
                                      {hour}시: {users}명
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                            <div className="flex justify-between mt-2 text-[10px] text-gray-500">
                              <span>0시</span>
                              <span>6시</span>
                              <span>12시</span>
                              <span>18시</span>
                              <span>24시</span>
                            </div>
                            {/* 피크 시간 표시 */}
                            {(() => {
                              const peak = hourlyTraffic.reduce((max, h) => h.users > max.users ? h : max, hourlyTraffic[0])
                              return peak && (
                                <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between text-sm">
                                  <span className="text-gray-400">피크 시간</span>
                                  <span className="text-amber-400 font-medium">🔥 {peak.hour}시 ({peak.users}명)</span>
                                </div>
                              )
                            })()}
                          </div>
                        ) : (
                          <div className="text-gray-500 text-sm text-center py-4">데이터 없음</div>
                        )}
                      </div>
                    </div>

                    {/* 일별 트래픽 차트 */}
                    {dailyTraffic.length > 0 && (
                      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                        <h3 className="text-lg font-semibold text-white mb-4">📈 일별 트래픽</h3>
                        <div className="h-48">
                          <div className="flex items-end justify-between h-40 gap-1">
                            {dailyTraffic.map((day, i) => {
                              const maxUsers = Math.max(...dailyTraffic.map(d => d.users), 1)
                              const height = (day.users / maxUsers) * 100
                              return (
                              <div key={i} className="flex-1 h-full flex flex-col items-center justify-end group relative">
                                  <div
                                    className="w-full bg-emerald-500 rounded-t transition-all duration-300 hover:bg-emerald-400"
                                    style={{ height: `${height}%`, minHeight: day.users > 0 ? '4px' : '0' }}
                                  />
                                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 border border-gray-700">
                                    {day.date.slice(4, 6)}/{day.date.slice(6, 8)}: {day.users}명
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                          <div className="flex justify-between mt-2 text-xs text-gray-500">
                            <span>{dailyTraffic[0]?.date.slice(4, 6)}/{dailyTraffic[0]?.date.slice(6, 8)}</span>
                            <span>{dailyTraffic[dailyTraffic.length - 1]?.date.slice(4, 6)}/{dailyTraffic[dailyTraffic.length - 1]?.date.slice(6, 8)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 3열 그리드 */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* 인기 페이지 TOP 10 */}
                      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                        <h3 className="text-lg font-semibold text-white mb-4">🔥 인기 페이지 TOP 10</h3>
                        <div className="space-y-3">
                          {topPages.map((page, i) => (
                            <div key={i} className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-gray-500 text-sm w-5">{i + 1}</span>
                                <span className="text-gray-300 text-sm truncate" title={page.path}>
                                  {page.path === '/' ? '홈' : page.path}
                                </span>
                              </div>
                              <span className="text-emerald-400 font-medium text-sm">
                                {page.views.toLocaleString()}
                              </span>
                            </div>
                          ))}
                          {topPages.length === 0 && (
                            <div className="text-gray-500 text-sm text-center py-4">데이터 없음</div>
                          )}
                        </div>
                      </div>

                      {/* 유입 경로 */}
                      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                        <h3 className="text-lg font-semibold text-white mb-4">🔗 유입 경로</h3>
                        <div className="space-y-3">
                          {trafficSources.map((source, i) => {
                            const maxSessions = Math.max(...trafficSources.map(s => s.sessions), 1)
                            const percentage = (source.sessions / maxSessions) * 100
                            return (
                              <div key={i}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-gray-300 text-sm">{source.source}</span>
                                  <span className="text-gray-400 text-sm">{source.sessions.toLocaleString()}</span>
                                </div>
                                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            )
                          })}
                          {trafficSources.length === 0 && (
                            <div className="text-gray-500 text-sm text-center py-4">데이터 없음</div>
                          )}
                        </div>
                      </div>

                      {/* 디바이스별 */}
                      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                        <h3 className="text-lg font-semibold text-white mb-4">📱 디바이스</h3>
                        <div className="space-y-4">
                          {deviceStats.map((device, i) => {
                            const totalUsers = deviceStats.reduce((acc, d) => acc + d.users, 0)
                            const percentage = totalUsers > 0 ? ((device.users / totalUsers) * 100).toFixed(1) : '0'
                            const icon = device.device === 'mobile' ? '📱' : device.device === 'desktop' ? '🖥️' : '📟'
                            const color = device.device === 'mobile' ? 'bg-purple-500' : device.device === 'desktop' ? 'bg-cyan-500' : 'bg-orange-500'
                            return (
                              <div key={i} className="flex items-center gap-4">
                                <span className="text-2xl">{icon}</span>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-gray-300 text-sm capitalize">{device.device}</span>
                                    <span className="text-white font-medium">{percentage}%</span>
                                  </div>
                                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full ${color} rounded-full transition-all duration-500`}
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                          {deviceStats.length === 0 && (
                            <div className="text-gray-500 text-sm text-center py-4">데이터 없음</div>
                          )}
                        </div>
                      </div>
                    </div>
  {/* 국가별 트래픽 */}
   <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                      <h3 className="text-lg font-semibold text-white mb-4">🌍 국가별 트래픽</h3>
                      {countryTraffic.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* 상위 10개 국가 바 차트 */}
                          <div className="space-y-3">
                            {countryTraffic.slice(0, 10).map((country, i) => {
                              const maxUsers = countryTraffic[0]?.users || 1
                              const percentage = ((country.users / maxUsers) * 100).toFixed(0)
                              const flag = getCountryFlagByName(country.country)
                              return (
                                <div key={i} className="flex items-center gap-3">
                                  <span className="text-gray-500 text-sm w-5">{i + 1}</span>
                                  <span className="text-xl w-8 text-center">{flag}</span>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-gray-300 text-sm truncate max-w-[150px]">{country.country}</span>
                                      <span className="text-white font-medium text-sm">{country.users.toLocaleString()}명</span>
                                    </div>
                                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-500"
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                          
                          {/* 나머지 국가 목록 */}
                          {countryTraffic.length > 10 && (
                            <div className="bg-gray-900/30 rounded-lg p-4">
                              <div className="text-gray-400 text-sm mb-3">기타 국가</div>
                              <div className="grid grid-cols-2 gap-2">
                                {countryTraffic.slice(10, 20).map((country, i) => {
                                  const flag = getCountryFlagByName(country.country)
                                  return (
                                    <div key={i} className="flex items-center gap-2 text-sm">
                                      <span className="text-base">{flag}</span>
                                      <span className="text-gray-400 truncate flex-1">{country.country}</span>
                                      <span className="text-gray-500">{country.users}</span>
                                    </div>
                                  )
                                })}
                              </div>
                              {countryTraffic.length > 20 && (
                                <div className="text-gray-500 text-xs mt-3 text-center">
                                  +{countryTraffic.length - 20}개국 더
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-500 text-sm text-center py-4">데이터 없음</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 회원 관리 탭 */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                {/* 필터 & 검색 */}
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    {(['all', 'free', 'premium'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setUserFilter(filter)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          userFilter === filter
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        {filter === 'all' ? '전체' : filter === 'free' ? '무료' : '프리미엄'}
                        <span className="ml-2 text-xs opacity-70">
                          ({filter === 'all' 
                            ? users.length 
                            : users.filter(u => u.tier === filter).length})
                        </span>
                      </button>
                    ))}
                    
                    <select
                      value={countryFilter}
                      onChange={(e) => setCountryFilter(e.target.value)}
                      className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="all">🌍 전체 국가</option>
                      {countryStats.map((c) => (
                        <option key={c.code} value={c.code}>
                          {getCountryFlag(c.code)} {c.country} ({c.count})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="relative">
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="이메일 또는 이름 검색..."
                      className="w-64 px-4 py-2 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
                  </div>
                </div>

                {/* 회원 목록 */}
                <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-900/50">
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">회원</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">국가</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">가입일</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">가입 방식</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">등급</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">마지막 접속</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">액션</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/50">
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                              회원이 없습니다
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-700/20 transition-colors">
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                                    {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                                  </div>
                                  <div>
                                    <div className="text-white font-medium">{user.name || '이름 없음'}</div>
                                    <div className="text-sm text-gray-500">{user.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <span 
                                  className="px-2 py-1 bg-gray-700/50 rounded text-xs text-gray-300"
                                  title={user.signup_ip || ''}
                                >
                                  {getCountryFlag(user.signup_country_code)} {user.signup_country_code || '-'}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-400">
                                {formatDate(user.created_at)}
                              </td>
                              <td className="px-4 py-4">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  user.provider === 'google'
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'bg-green-500/20 text-green-400'
                                }`}>
                                  {user.provider === 'google' ? '🔵 Google' : '🟢 Naver'}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  user.tier === 'premium'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-gray-500/20 text-gray-400'
                                }`}>
                                  {user.tier === 'premium' ? '💎 프리미엄' : '무료'}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-400">
                                {user.last_login_at ? formatDateTime(user.last_login_at) : '-'}
                              </td>
                              <td className="px-4 py-4 text-right">
                                <select
                                  value={user.tier}
                                  onChange={(e) => handleUpdateUserTier(user.id, e.target.value as 'free' | 'premium')}
                                  className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-emerald-500"
                                >
                                  <option value="free">무료</option>
                                  <option value="premium">프리미엄</option>
                                </select>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>총 {filteredUsers.length}명</span>
                </div>
              </div>
            )}

            {/* 구독 관리 탭 */}
            {activeTab === 'subscriptions' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
                    <div className="text-2xl mb-2">💳</div>
                    <div className="text-2xl font-bold text-white">{subscriptions.filter(s => s.status === 'active').length}</div>
                    <div className="text-sm text-gray-400">활성 구독</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
                    <div className="text-2xl mb-2">📅</div>
                    <div className="text-2xl font-bold text-white">{subscriptions.filter(s => s.plan === 'monthly' && s.status === 'active').length}</div>
                    <div className="text-sm text-gray-400">월간 구독</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
                    <div className="text-2xl mb-2">🗓️</div>
                    <div className="text-2xl font-bold text-white">{subscriptions.filter(s => s.plan === 'yearly' && s.status === 'active').length}</div>
                    <div className="text-sm text-gray-400">연간 구독</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
                    <div className="text-2xl mb-2">❌</div>
                    <div className="text-2xl font-bold text-white">{subscriptions.filter(s => s.status === 'cancelled').length}</div>
                    <div className="text-sm text-gray-400">취소됨</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {(['all', 'active', 'cancelled', 'expired'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setSubscriptionFilter(filter)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        subscriptionFilter === filter
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {filter === 'all' ? '전체' : 
                       filter === 'active' ? '활성' : 
                       filter === 'cancelled' ? '취소' : '만료'}
                    </button>
                  ))}
                </div>

                <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-900/50">
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">회원</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">플랜</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">상태</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">시작일</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">만료일</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">금액</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">액션</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/50">
                        {filteredSubscriptions.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                              구독이 없습니다
                            </td>
                          </tr>
                        ) : (
                          filteredSubscriptions.map((sub) => (
                            <tr key={sub.id} className="hover:bg-gray-700/20 transition-colors">
                              <td className="px-4 py-4">
                                <div>
                                  <div className="text-white font-medium">{sub.user_name || '이름 없음'}</div>
                                  <div className="text-sm text-gray-500">{sub.user_email}</div>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  sub.plan === 'yearly' 
                                    ? 'bg-purple-500/20 text-purple-400'
                                    : 'bg-blue-500/20 text-blue-400'
                                }`}>
                                  {sub.plan === 'yearly' ? '🗓️ 연간' : '📅 월간'}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  sub.status === 'active' 
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : sub.status === 'cancelled'
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-gray-500/20 text-gray-400'
                                }`}>
                                  {sub.status === 'active' ? '✅ 활성' : 
                                   sub.status === 'cancelled' ? '❌ 취소' : '⏰ 만료'}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-400">
                                {formatDate(sub.started_at)}
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-400">
                                {formatDate(sub.expires_at)}
                              </td>
                              <td className="px-4 py-4 text-sm text-white font-medium">
                                {formatCurrency(sub.price || (sub.plan === 'monthly' ? 9900 : 79000))}
                              </td>
                              <td className="px-4 py-4 text-right">
                                {sub.status === 'active' && (
                                  <button
                                    onClick={() => handleCancelSubscription(sub.id)}
                                    className="px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-xs transition-colors"
                                  >
                                    취소
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 광고 관리 탭 */}
            {activeTab === 'ads' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <select
                      value={adFilter}
                      onChange={(e) => setAdFilter(e.target.value)}
                      className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="all">전체 슬롯</option>
                      {SLOT_TYPES.map((slot) => (
                        <option key={slot.value} value={slot.value}>{slot.label}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      setEditingAd(null)
                      resetAdForm()
                      setIsAdModalOpen(true)
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    + 새 광고
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAds.map((ad) => (
                    <div key={ad.id} className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
                      <div className="relative">
                        <img 
                          src={ad.image_url} 
                          alt={ad.alt_text || ad.name}
                          className="w-full h-32 object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/300x100?text=No+Image'
                          }}
                        />
                        <span className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${
                          ad.is_active 
                            ? 'bg-emerald-500/80 text-white'
                            : 'bg-gray-500/80 text-white'
                        }`}>
                          {ad.is_active ? '활성' : '비활성'}
                        </span>
                      </div>
                      <div className="p-4">
                        <h4 className="text-white font-medium mb-1">{ad.name}</h4>
                        <p className="text-gray-500 text-sm mb-3">
                          {SLOT_TYPES.find(s => s.value === ad.slot_type)?.label} ({ad.width}×{ad.height})
                        </p>
                        <div className="flex items-center gap-4 text-sm mb-3">
                          <span className="text-gray-400">👁️ {todayAdStats[ad.id]?.impressions || 0}</span>
                          <span className="text-gray-400">👆 {todayAdStats[ad.id]?.clicks || 0}</span>
                          <span className="text-emerald-400">
                            {calculateCTR(todayAdStats[ad.id]?.clicks || 0, todayAdStats[ad.id]?.impressions || 0)}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleAdActive(ad)}
                            className={`flex-1 py-2 rounded text-xs font-medium transition-colors ${
                              ad.is_active
                                ? 'bg-gray-600 hover:bg-gray-500 text-white'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            }`}
                          >
                            {ad.is_active ? '비활성화' : '활성화'}
                          </button>
                          <button
                            onClick={() => handleEditAd(ad)}
                            className="px-3 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded text-xs transition-colors"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleAdDelete(ad.id)}
                            className="px-3 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-xs transition-colors"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredAds.length === 0 && (
                  <div className="text-center py-20 text-gray-500">
                    등록된 광고가 없습니다
                  </div>
                )}
              </div>
            )}

            {/* 광고 리포트 탭 */}
            {activeTab === 'report' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <select
                      value={reportSlotFilter}
                      onChange={(e) => setReportSlotFilter(e.target.value)}
                      className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="all">전체 슬롯</option>
                      {SLOT_TYPES.map((slot) => (
                        <option key={slot.value} value={slot.value}>{slot.label}</option>
                      ))}
                    </select>
                    <select
                      value={reportDateRange}
                      onChange={(e) => setReportDateRange(e.target.value)}
                      className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="7">최근 7일</option>
                      <option value="14">최근 14일</option>
                      <option value="30">최근 30일</option>
                    </select>
                  </div>
                </div>

                {/* 요약 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
                    <div className="text-2xl mb-2">👁️</div>
                    <div className="text-2xl font-bold text-white">
                      {reportSummary.reduce((sum, s) => sum + s.impressions, 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-400">총 노출</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
                    <div className="text-2xl mb-2">👆</div>
                    <div className="text-2xl font-bold text-white">
                      {reportSummary.reduce((sum, s) => sum + s.clicks, 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-400">총 클릭</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
                    <div className="text-2xl mb-2">📊</div>
                    <div className="text-2xl font-bold text-emerald-400">
                      {calculateCTR(
                        reportSummary.reduce((sum, s) => sum + s.clicks, 0),
                        reportSummary.reduce((sum, s) => sum + s.impressions, 0)
                      )}%
                    </div>
                    <div className="text-sm text-gray-400">평균 CTR</div>
                  </div>
                </div>

                {/* 광고별 성과 */}
                {adPerformance.length > 0 && (
                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                    <h3 className="text-lg font-semibold text-white mb-4">광고별 성과</h3>
                    <div className="space-y-4">
                      {adPerformance.map((perf) => (
                        <div key={perf.id} className="flex items-center justify-between py-3 border-b border-gray-700/50 last:border-0">
                          <div>
                            <div className="text-white font-medium">{perf.name}</div>
                            <div className="text-sm text-gray-500">
                              {SLOT_TYPES.find(s => s.value === perf.slot_type)?.label}
                            </div>
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <span className="text-gray-400">👁️ {perf.totalImpressions.toLocaleString()}</span>
                            <span className="text-gray-400">👆 {perf.totalClicks.toLocaleString()}</span>
                            <span className="text-emerald-400 font-medium">{perf.ctr.toFixed(2)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 블로그 관리 탭 */}
            {activeTab === 'blog' && (
              <div className="space-y-6">
                {/* 블로그 통계 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
                    <div className="text-2xl mb-2">📝</div>
                    <div className="text-2xl font-bold text-white">{blogStats.totalPosts}</div>
                    <div className="text-sm text-gray-400">전체 포스트</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
                    <div className="text-2xl mb-2">✅</div>
                    <div className="text-2xl font-bold text-emerald-400">{blogStats.publishedPosts}</div>
                    <div className="text-sm text-gray-400">발행됨</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
                    <div className="text-2xl mb-2">👁️</div>
                    <div className="text-2xl font-bold text-white">{blogStats.totalViews.toLocaleString()}</div>
                    <div className="text-sm text-gray-400">총 조회수</div>
                  </div>
                </div>

                {/* 카테고리 필터 */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setBlogCategoryFilter('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      blogCategoryFilter === 'all'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    전체
                  </button>
                  {blogCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setBlogCategoryFilter(cat)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        blogCategoryFilter === cat
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* 블로그 목록 */}
                {blogLoading ? (
                  <div className="text-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto" />
                  </div>
                ) : (
                  <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-900/50">
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">제목</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">카테고리</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">상태</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">조회수</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">작성일</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">액션</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/50">
                        {filteredBlogPosts.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                              포스트가 없습니다
                            </td>
                          </tr>
                        ) : (
                          filteredBlogPosts.map((post) => (
                            <tr key={post.id} className="hover:bg-gray-700/20 transition-colors">
                              <td className="px-4 py-4">
                                <div className="text-white font-medium truncate max-w-xs" title={post.title_kr}>
                                  {post.title_kr}
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">
                                  {post.category}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                <button
                                  onClick={() => handleTogglePublish(post.id, post.published)}
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    post.published
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : 'bg-yellow-500/20 text-yellow-400'
                                  }`}
                                >
                                  {post.published ? '✅ 발행' : '📝 초안'}
                                </button>
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-400">
                                {(post.views || 0).toLocaleString()}
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-400">
                                {formatDate(post.created_at)}
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex items-center justify-end gap-2">
                                  <a
                                    href={`/blog/${post.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1 bg-gray-700 text-gray-300 hover:bg-gray-600 rounded text-xs transition-colors"
                                  >
                                    보기
                                  </a>
                                  <a
                                    href={`/admin/blog/edit/${post.id}`}
                                    className="px-3 py-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded text-xs transition-colors"
                                  >
                                    수정
                                  </a>
                                  <button
                                    onClick={() => handleDeletePost(post.id)}
                                    className="px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-xs transition-colors"
                                  >
                                    삭제
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex items-center justify-center gap-4 pt-4">
                  <a
                    href="/blog"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    📖 블로그 보기 →
                  </a>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* 광고 모달 */}
      {isAdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsAdModalOpen(false)}
          />
          
          <div className="relative w-full max-w-2xl bg-gray-800 rounded-2xl shadow-xl border border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 px-6 py-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {editingAd ? '광고 수정' : '새 광고 등록'}
              </h2>
              <button
                onClick={() => setIsAdModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdSave} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  광고명 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={adFormData.name}
                  onChange={(e) => setAdFormData({ ...adFormData, name: e.target.value })}
                  placeholder="예: 스포라이브 배너"
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  슬롯 타입 <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {SLOT_TYPES.map((slot) => (
                    <button
                      key={slot.value}
                      type="button"
                      onClick={() => handleSlotTypeChange(slot.value)}
                      className={`p-3 rounded-xl border text-center transition-colors ${
                        adFormData.slot_type === slot.value
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                          : 'border-gray-600 bg-gray-900/50 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      <div className="font-medium">{slot.label}</div>
                      <div className="text-xs opacity-70">{slot.size}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  이미지 URL <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={adFormData.image_url}
                    onChange={(e) => setAdFormData({ ...adFormData, image_url: e.target.value })}
                    placeholder="https://example.com/banner.png"
                    className="flex-1 px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                    required
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors disabled:opacity-50"
                  >
                    {uploading ? '⏳' : '📤'} 업로드
                  </button>
                </div>
                {adFormData.image_url && (
                  <div className="mt-3 p-3 bg-gray-900/50 rounded-lg">
                    <img 
                      src={adFormData.image_url} 
                      alt="미리보기" 
                      className="max-h-32 mx-auto rounded"
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/300x100?text=Invalid+URL'
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  링크 URL <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  value={adFormData.link_url}
                  onChange={(e) => setAdFormData({ ...adFormData, link_url: e.target.value })}
                  placeholder="https://example.com/landing"
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  대체 텍스트 (Alt)
                </label>
                <input
                  type="text"
                  value={adFormData.alt_text}
                  onChange={(e) => setAdFormData({ ...adFormData, alt_text: e.target.value })}
                  placeholder="이미지 설명 (접근성용)"
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  우선순위 (높을수록 먼저 노출)
                </label>
                <input
                  type="number"
                  value={adFormData.priority}
                  onChange={(e) => setAdFormData({ ...adFormData, priority: parseInt(e.target.value) || 0 })}
                  min={0}
                  max={100}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    시작일 (선택)
                  </label>
                  <input
                    type="date"
                    value={adFormData.start_date}
                    onChange={(e) => setAdFormData({ ...adFormData, start_date: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    종료일 (선택)
                  </label>
                  <input
                    type="date"
                    value={adFormData.end_date}
                    onChange={(e) => setAdFormData({ ...adFormData, end_date: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAdModalOpen(false)}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
                >
                  {editingAd ? '수정 완료' : '등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}