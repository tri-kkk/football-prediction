'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import * as XLSX from 'xlsx'

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
  premium_expires_at: string | null
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
  plan: 'monthly' | 'quarterly' | 'yearly'
  status: 'active' | 'cancelled' | 'expired'
  started_at: string
  expires_at: string
  cancelled_at: string | null
  payment_id: string | null
  price: number
}

interface Payment {
  id: string
  order_id: string
  user_email: string
  amount: number
  status: 'success' | 'failed' | 'pending'
  method: string
  tid: string | null
  card_name: string | null
  approval_number: string | null
  plan: string | null
  created_at: string
}

interface PaymentStats {
  totalPayments: number
  successCount: number
  failedCount: number
  totalRevenue: number
  todayRevenue: number
  todayCount: number
  monthlyRevenue: Record<string, number>
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

// 📣 공지 타입
interface Notice {
  id: number
  message: string
  message_en: string | null
  is_active: boolean
  display_order: number
  start_at: string | null
  end_at: string | null
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
  { id: 'traffic', label: '트래픽 분석', icon: '📈' },
  { id: 'users', label: '회원 관리', icon: '👥' },
  { id: 'subscriptions', label: '구독 관리', icon: '💳' },
  { id: 'ads', label: '광고 관리', icon: '📢' },
  { id: 'report', label: '광고 리포트', icon: '📉' },
  { id: 'blog', label: '블로그 관리', icon: '📝' },
  { id: 'proto', label: '프로토 관리', icon: '🎫' },
  { id: 'export', label: '예측 Export', icon: '📤' },
  { id: 'notices', label: '공지 관리', icon: '📣' },
  { id: 'revenue', label: '매출 관리', icon: '💵' },
  { id: 'pitcher', label: '선발 관리', icon: '⚾' },
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

// KST(UTC+9) 기준 오늘 날짜 반환
const getKSTDateString = (date: Date = new Date()): string => {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().split('T')[0]
}

const getDaysAgo = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return getKSTDateString(date)
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

// ==================== 숫자 포맷 헬퍼 함수 ====================

// 퍼센트 포맷 (0-1 비율이면 *100, 이미 0-100이면 그대로)
function formatPercent(value: number | undefined | null, decimals: number = 0): string {
  if (value === undefined || value === null || isNaN(value)) return '-'
  // 값이 0-1 사이면 *100 (비율 → 퍼센트)
  const percent = value <= 1 && value > 0 ? value * 100 : value
  return percent.toFixed(decimals)
}

// 소수점 포맷
function formatNumber(value: number | undefined | null, decimals: number = 2): string {
  if (value === undefined || value === null || isNaN(value)) return '-'
  return value.toFixed(decimals)
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

  // ===== 선발 관리 상태 =====
  const [pitcherLeague, setPitcherLeague] = useState<'KBO' | 'NPB' | 'CPBL'>('KBO')
  const [pitcherMatches, setPitcherMatches] = useState<any[]>([])
  const [pitcherMatchesLoading, setPitcherMatchesLoading] = useState(false)
  const [pitcherDate, setPitcherDate] = useState(() => getKSTDateString())
  const [kboPitchers, setKboPitchers] = useState<{ name: string; team: string; pitch_hand?: string }[]>([])
  const [pitcherEdits, setPitcherEdits] = useState<Record<number, { home: string; away: string }>>({})
  const [pitcherSaving, setPitcherSaving] = useState<Record<number, boolean>>({})
  const [pitcherSaved, setPitcherSaved] = useState<Record<number, boolean>>({})

  const KBO_TEAM_MAP: Record<string, string> = {
    'Hanwha Eagles': '한화', 'LG Twins': 'LG', 'Kiwoom Heroes': '키움',
    'Lotte Giants': '롯데', 'Samsung Lions': '삼성', 'Doosan Bears': '두산',
    'KT Wiz Suwon': 'KT', 'KT Wiz': 'KT', 'KIA Tigers': 'KIA',
    'NC Dinos': 'NC', 'SSG Landers': 'SSG',
  }
  const NPB_TEAM_MAP: Record<string, string> = {
    'Hanshin Tigers': '한신', 'Yomiuri Giants': '요미우리', 'Hiroshima Toyo Carp': '히로시마',
    'Yakult Swallows': '야쿠르트', 'Yokohama DeNA BayStars': '요코하마', 'Chunichi Dragons': '주니치',
    'SoftBank Hawks': '소프트뱅크', 'Orix Buffaloes': '오릭스', 'Lotte Marines': '지바롯데',
    'Rakuten Eagles': '라쿠텐', 'Seibu Lions': '세이부', 'Nippon Ham Fighters': '니혼햄',
  }
  const TEAM_MAP = pitcherLeague === 'NPB' ? NPB_TEAM_MAP : KBO_TEAM_MAP
  
  // ===== 데이터 상태 =====
  const [users, setUsers] = useState<User[]>([])
  const [totalUserCount, setTotalUserCount] = useState(0)  // ✅ API의 정확한 total count
  const [countryStats, setCountryStats] = useState<CountryStat[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null)
  const [revenueFilter, setRevenueFilter] = useState<'all' | '7' | '30' | '90'>('all')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [revenueLoading, setRevenueLoading] = useState(false)
  const [ads, setAds] = useState<Advertisement[]>([])
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [todayAdStats, setTodayAdStats] = useState<Record<string, AdStats>>({})
  
  // ===== 로딩/에러 상태 =====
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // ===== 유효기간 편집 상태 =====
  const [editingExpiry, setEditingExpiry] = useState<{ userId: string; value: string } | null>(null)

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
  const [reportStartDate, setReportStartDate] = useState('')
  const [reportEndDate, setReportEndDate] = useState('')
  const [reportDateMode, setReportDateMode] = useState<'preset' | 'custom'>('preset')
  
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
  
  // ===== 🎫 프로토 관리 상태 =====
  const [protoText, setProtoText] = useState('')
  const [protoParseResult, setProtoParseResult] = useState('')
  const [protoMatches, setProtoMatches] = useState<any[]>([])
  const [protoSavedCount, setProtoSavedCount] = useState(0)
  const [protoRound, setProtoRound] = useState('')  // 회차 입력
  const [protoSavedRounds, setProtoSavedRounds] = useState<string[]>([])  // 저장된 회차 목록
  
  // ===== 📤 Export 관리 상태 =====
  const [exportDate, setExportDate] = useState<string>(() => getKSTDateString())
  const [exportLeague, setExportLeague] = useState<string>('all')
  const [exportGrade, setExportGrade] = useState<string>('all')
  const [exportMatches, setExportMatches] = useState<any[]>([])
  const [exportLoading, setExportLoading] = useState(false)
  const [exportSelectedMatch, setExportSelectedMatch] = useState<any | null>(null)
  const [exportCopyStatus, setExportCopyStatus] = useState<string>('')
  
  // ===== 📣 공지 관리 상태 =====
  const [notices, setNotices] = useState<Notice[]>([])
  const [noticesLoading, setNoticesLoading] = useState(false)
  const [noticeForm, setNoticeForm] = useState({ message: '', message_en: '', is_active: true, display_order: 0, start_at: '', end_at: '' })
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null)
  const [noticeSaving, setNoticeSaving] = useState(false)
  
  // ===== Refs =====
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  // ===== 📣 공지 불러오기 =====
  useEffect(() => {
    if (activeTab === 'notices' && isAuthenticated) {
      loadNotices()
    }
  }, [activeTab, isAuthenticated])

  // ===== ⚾ 선발 관리 =====
  useEffect(() => {
    if (activeTab === 'pitcher' && isAuthenticated) {
      fetchPitcherMatches()
      if (pitcherLeague === 'KBO' || pitcherLeague === 'NPB') fetchKboPitchers()
    }
  }, [activeTab, isAuthenticated, pitcherLeague, pitcherDate])

  const fetchPitcherMatches = async () => {
    setPitcherMatchesLoading(true)
    setPitcherEdits({})
    setPitcherSaved({})
    try {
      const res = await fetch(`/api/admin/pitcher?league=${pitcherLeague}&date=${pitcherDate}`)
      const data = await res.json()
      setPitcherMatches(data.matches || [])
      const edits: Record<number, { home: string; away: string }> = {}
      ;(data.matches || []).forEach((m: any) => {
        edits[m.id] = { home: m.home_pitcher_ko || '', away: m.away_pitcher_ko || '' }
      })
      setPitcherEdits(edits)
    } catch (e) {
      console.error(e)
    } finally {
      setPitcherMatchesLoading(false)
    }
  }

  const fetchKboPitchers = async () => {
    try {
      const table = pitcherLeague === 'NPB' ? 'npb' : 'kbo'
      const res = await fetch(`/api/admin/pitcher?type=list&league=${table}&season=2025`)
      const data = await res.json()
      setKboPitchers(data.pitchers || [])
    } catch (e) {
      console.error(e)
    }
  }

  const savePitcher = async (matchId: number) => {
    const edit = pitcherEdits[matchId]
    if (!edit) return
    setPitcherSaving(prev => ({ ...prev, [matchId]: true }))
    try {
      const res = await fetch('/api/admin/pitcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, homePitcher: edit.home || null, awayPitcher: edit.away || null }),
      })
      if (!res.ok) throw new Error('저장 실패')
      setPitcherSaved(prev => ({ ...prev, [matchId]: true }))
      setTimeout(() => setPitcherSaved(prev => ({ ...prev, [matchId]: false })), 2000)
    } catch (e) {
      alert('저장 실패')
    } finally {
      setPitcherSaving(prev => ({ ...prev, [matchId]: false }))
    }
  }

  const loadNotices = async () => {
    setNoticesLoading(true)
    try {
      const res = await fetch('/api/admin/notices?admin=true')
      const data = await res.json()
      if (Array.isArray(data)) setNotices(data)
    } catch (e) {
      console.error(e)
    } finally {
      setNoticesLoading(false)
    }
  }

  const handleNoticeSave = async () => {
    if (!noticeForm.message.trim()) return
    setNoticeSaving(true)
    try {
      if (editingNotice) {
        await fetch('/api/admin/notices', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...noticeForm, id: editingNotice.id })
        })
      } else {
        await fetch('/api/admin/notices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(noticeForm)
        })
      }
      setNoticeForm({ message: '', message_en: '', is_active: true, display_order: 0, start_at: '', end_at: '' })
      setEditingNotice(null)
      await loadNotices()
    } catch (e) {
      console.error(e)
    } finally {
      setNoticeSaving(false)
    }
  }

  const handleNoticeDelete = async (id: number) => {
    if (!confirm('삭제하시겠습니까?')) return
    await fetch(`/api/admin/notices?id=${id}`, { method: 'DELETE' })
    await loadNotices()
  }

  const handleNoticeEdit = (notice: Notice) => {
    setEditingNotice(notice)
    setNoticeForm({
      message: notice.message,
      message_en: notice.message_en || '',
      is_active: notice.is_active,
      display_order: notice.display_order,
      start_at: notice.start_at ? new Date(notice.start_at).toISOString().slice(0, 16) : '',
      end_at: notice.end_at ? new Date(notice.end_at).toISOString().slice(0, 16) : '',
    })
  }

  const handleNoticeToggle = async (notice: Notice) => {
    await fetch('/api/admin/notices', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...notice, is_active: !notice.is_active })
    })
    await loadNotices()
  }

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
      setTotalUserCount(data.total || data.users?.length || 0)  // ✅ API의 정확한 count 사용
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

  const fetchPayments = async () => {
    try {
      const response = await fetch('/api/admin/payments')
      if (!response.ok) return
      const data = await response.json()
      setPayments(data.payments || [])
      setPaymentStats(data.stats || null)
    } catch (err) {
      console.error('Payments fetch error:', err)
    }
  }

  const fetchRevenue = async () => {
    setRevenueLoading(true)
    try {
      const response = await fetch('/api/admin/payments?status=success')
      if (!response.ok) return
      const data = await response.json()
      setPayments(data.payments || [])
      setPaymentStats(data.stats || null)
    } catch (err) {
      console.error('Revenue fetch error:', err)
    } finally {
      setRevenueLoading(false)
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
      const today = getKSTDateString()
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
      let url = '/api/ads/track?'
      
      // 날짜 모드에 따라 다른 파라미터 사용
      if (reportDateMode === 'preset') {
        url += `days=${reportDateRange}`
      } else {
        // 커스텀 날짜 범위
        if (reportStartDate) url += `start=${reportStartDate}&`
        if (reportEndDate) url += `end=${reportEndDate}&`
      }
      
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

  // 엑셀 다운로드 함수
  const downloadReportExcel = () => {
    try {
      const wb = XLSX.utils.book_new()
      
      // 슬롯 타입 라벨 함수
      const getSlotLabel = (type: string) => {
        return SLOT_TYPES.find(s => s.value === type)?.label || type
      }

      // 시트 1: 일별 상세 (날짜 + 광고별)
      const detailData = reportStats.map(stat => ({
        '날짜': new Date(stat.date).toLocaleDateString('ko-KR'),
        '광고명': stat.advertisements?.name || '-',
        '슬롯': getSlotLabel(stat.advertisements?.slot_type || ''),
        '노출': stat.impressions,
        '클릭': stat.clicks,
        'CTR': stat.impressions > 0 
          ? `${((stat.clicks / stat.impressions) * 100).toFixed(2)}%` 
          : '0.00%'
      }))

      if (detailData.length > 0) {
        const ws1 = XLSX.utils.json_to_sheet(detailData)
        ws1['!cols'] = [
          { wch: 12 }, { wch: 20 }, { wch: 15 }, 
          { wch: 10 }, { wch: 10 }, { wch: 10 }
        ]
        XLSX.utils.book_append_sheet(wb, ws1, '일별 상세')
      }

      // 시트 2: 광고별 성과
      const adData = adPerformance.map(ad => ({
        '광고명': ad.name,
        '슬롯': getSlotLabel(ad.slot_type),
        '총 노출': ad.totalImpressions,
        '총 클릭': ad.totalClicks,
        'CTR': `${ad.ctr.toFixed(2)}%`
      }))

      if (adData.length > 0) {
        const ws2 = XLSX.utils.json_to_sheet(adData)
        ws2['!cols'] = [
          { wch: 20 }, { wch: 15 }, { wch: 12 }, 
          { wch: 12 }, { wch: 10 }
        ]
        XLSX.utils.book_append_sheet(wb, ws2, '광고별 성과')
      }

      // 시트 3: 일별 합계
      const summaryData = reportSummary.map(day => ({
        '날짜': new Date(day.date).toLocaleDateString('ko-KR'),
        '노출': day.impressions,
        '클릭': day.clicks,
        'CTR': day.impressions > 0 
          ? `${((day.clicks / day.impressions) * 100).toFixed(2)}%` 
          : '0.00%'
      }))

      if (summaryData.length > 0) {
        const ws3 = XLSX.utils.json_to_sheet(summaryData)
        ws3['!cols'] = [
          { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }
        ]
        XLSX.utils.book_append_sheet(wb, ws3, '일별 합계')
      }

      // 시트 4: 요약
      const totalImpressions = reportSummary.reduce((sum, s) => sum + s.impressions, 0)
      const totalClicks = reportSummary.reduce((sum, s) => sum + s.clicks, 0)
      const totalCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0

      const overviewData = [
        { '항목': '기간', '값': reportDateMode === 'preset' ? `${reportDateRange}일` : `${reportStartDate} ~ ${reportEndDate}` },
        { '항목': '슬롯 필터', '값': getSlotLabel(reportSlotFilter) },
        { '항목': '총 노출', '값': totalImpressions },
        { '항목': '총 클릭', '값': totalClicks },
        { '항목': '평균 CTR', '값': `${totalCTR.toFixed(2)}%` },
      ]

      const ws4 = XLSX.utils.json_to_sheet(overviewData)
      ws4['!cols'] = [{ wch: 15 }, { wch: 20 }]
      XLSX.utils.book_append_sheet(wb, ws4, '요약')

      // 파일명 생성
      const today = getKSTDateString()
      const fileName = `광고_리포트_${today}.xlsx`

      // 다운로드
      XLSX.writeFile(wb, fileName)
      console.log('✅ 엑셀 다운로드 완료:', fileName)
    } catch (error) {
      console.error('❌ 엑셀 다운로드 에러:', error)
      alert('엑셀 다운로드 중 오류가 발생했습니다.')
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
        fetchPayments(),
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
  }, [isAuthenticated, activeTab, reportDateRange, reportSlotFilter, reportStartDate, reportEndDate, reportDateMode])

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
  
  // 📤 Export 탭 useEffect
  useEffect(() => {
    if (isAuthenticated && activeTab === 'export') {
      fetchExportData()
    }
  }, [isAuthenticated, activeTab, exportDate, exportLeague, exportGrade])
  
  // ==================== Export 관리 함수 ====================
  
  const fetchExportData = async () => {
    try {
      setExportLoading(true)
      setExportSelectedMatch(null)
      
      const params = new URLSearchParams({
        secret: 'trendsoccer-internal-2026',
        date: exportDate,
        league: exportLeague,
        grade: exportGrade,
      })
      
      const response = await fetch(`/api/export?${params.toString()}`)
      if (!response.ok) throw new Error('데이터 조회 실패')
      
      const data = await response.json()
      setExportMatches(data.data || [])
    } catch (err) {
      console.error('Export fetch error:', err)
      setExportMatches([])
    } finally {
      setExportLoading(false)
    }
  }
  
  const copyExportText = async (format: 'text' | 'markdown' | 'json') => {
    try {
      let content: string
      
      if (exportSelectedMatch) {
        // 개별 경기 복사
        content = formatSingleMatch(exportSelectedMatch, format)
      } else {
        // 전체 복사
        if (format === 'json') {
          content = JSON.stringify(exportMatches, null, 2)
        } else {
          // 전체 경기 텍스트/마크다운 생성
          content = formatAllMatches(exportMatches, format, exportDate)
        }
      }
      
      await navigator.clipboard.writeText(content)
      setExportCopyStatus(`${format.toUpperCase()} 복사됨!`)
      setTimeout(() => setExportCopyStatus(''), 2000)
    } catch (err) {
      console.error('Copy error:', err)
      setExportCopyStatus('복사 실패')
    }
  }
  
  // 전체 경기 포맷
  const formatAllMatches = (matches: any[], format: string, date: string): string => {
    if (format === 'markdown') {
      let md = `# 📅 ${date} 경기 예측\n\n`
      md += `> 총 **${matches.length}경기** 분석\n\n`
      
      matches.forEach((match, idx) => {
        md += formatSingleMatch(match, 'markdown')
        md += '\n---\n\n'
      })
      
      md += '*TrendSoccer 프리미엄 분석*'
      return md
    }
    
    // text
    let text = `📅 ${date} Match Predictions / 경기 예측\n`
    text += `Total ${matches.length} matches / 총 ${matches.length}경기\n`
    text += '─'.repeat(50) + '\n\n'
    
    matches.forEach((match, idx) => {
      text += `[${idx + 1}] `
      text += formatSingleMatch(match, 'text')
      text += '\n' + '─'.repeat(50) + '\n\n'
    })
    
    text += '※ TrendSoccer Premium Analysis'
    return text
  }
  
  // 개별 경기 포맷 (새 API 구조에 맞게)
  const formatSingleMatch = (match: any, format: string): string => {
    const p = match.prediction || {}
    const prob = match.probability || {}
    const power = match.power || {}
    const ts = match.teamStats || {}
    const m3 = match.method3 || {}
    const pattern = match.pattern || {}
    const pa = match.pa || {}
    
    // 승률 가져오기
    const winProb = p.result === 'HOME' ? prob.home : p.result === 'AWAY' ? prob.away : prob.draw
    
    // 날짜 형식: YY.MM.DD
    const now = new Date()
    const dateStr = `${String(now.getFullYear()).slice(2)}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`
    
    if (format === 'json') {
      return JSON.stringify(match, null, 2)
    }
    
    if (format === 'markdown') {
      let md = `### ${match.homeTeamKo} vs ${match.awayTeamKo}\n\n`
      
      // 기본 정보
      md += `| 항목 | 내용 |\n|------|------|\n`
      md += `| ⏰ 시간 | ${match.time} |\n`
      md += `| 🏆 리그 | ${match.leagueName} |\n`
      md += `| 🎯 예측 | **${p.resultKo || '-'}** (${winProb || 0}%) |\n`
      md += `| ⚡ 파워차 | ${power.diff || 0}점 |\n`
      md += `| 💰 배당 | ${match.odds?.home?.toFixed(2) || '-'} / ${match.odds?.draw?.toFixed(2) || '-'} / ${match.odds?.away?.toFixed(2) || '-'} |\n`
      md += `| 등급 | ${p.grade || 'PASS'} |\n\n`
      
      // 분석 근거
      if (p.reasons?.length > 0) {
        md += `**📊 분석 근거**\n`
        p.reasons.forEach((r: string) => md += `- ${r}\n`)
        md += '\n'
      }
      
      // 파워 지수
      md += `**⚡ 파워 지수**: ${power.home || 0} vs ${power.away || 0}\n\n`
      
      // 최종 확률
      md += `**📈 최종 확률**: 홈 ${prob.home || 0}% | 무 ${prob.draw || 0}% | 원정 ${prob.away || 0}%\n\n`
      
      // 팀 상세 통계
      if (ts.home || ts.away) {
        md += `**📋 팀 상세 통계**\n`
        md += `| 항목 | ${match.homeTeamKo} | ${match.awayTeamKo} |\n`
        md += `|------|------|------|\n`
        md += `| 선제골 승률 | ${formatPercent(ts.home?.firstGoalWinRate)}% | ${formatPercent(ts.away?.firstGoalWinRate)}% |\n`
        md += `| 역전률 | ${formatPercent(ts.home?.comebackRate)}% | ${formatPercent(ts.away?.comebackRate)}% |\n`
        md += `| 최근 폼 | ${formatNumber(ts.home?.recentForm, 1)} | ${formatNumber(ts.away?.recentForm, 1)} |\n`
        md += `| 득실비 | ${formatNumber(ts.home?.goalRatio)} | ${formatNumber(ts.away?.goalRatio)} |\n\n`
      }
      
      // 3-Method
      if (m3.method1 || m3.method2 || m3.method3) {
        md += `**🔬 3-Method 분석**\n`
        if (m3.method1) md += `- P/A 비교: 홈 ${m3.method1.home}%\n`
        if (m3.method2) md += `- Min-Max: 홈 ${m3.method2.home}%\n`
        if (m3.method3) md += `- 선제골: 홈 ${m3.method3.home}%\n`
        md += '\n'
      }
      
      // 패턴
      if (pattern.totalMatches > 0) {
        md += `**🎯 패턴 ${pattern.code}** (${pattern.totalMatches}경기 기반)\n`
        md += `- 역대: 홈 ${formatPercent(pattern.homeWinRate)}% / 무 ${formatPercent(pattern.drawRate)}% / 원정 ${formatPercent(pattern.awayWinRate)}%\n\n`
      }
      
      // P/A 득실
      if (pa.home || pa.away) {
        md += `**📊 P/A 득실 지수**\n`
        md += `- ${match.homeTeamKo}: 전체 ${formatNumber(pa.home?.all)} / 최근5 ${formatNumber(pa.home?.five)} / 선제골 ${formatNumber(pa.home?.firstGoal)}\n`
        md += `- ${match.awayTeamKo}: 전체 ${formatNumber(pa.away?.all)} / 최근5 ${formatNumber(pa.away?.five)} / 선제골 ${formatNumber(pa.away?.firstGoal)}\n\n`
      }
      
      return md
    }
    
    // ========== 🆕 text format - 간결한 형식 ==========
    const gradeEmoji = p.grade === 'PICK' ? '🔥' : p.grade === 'GOOD' ? '✅' : '⚪'
    
    // 영문 예측 결과
    const resultEn = p.result === 'HOME' ? 'Home Win' : p.result === 'AWAY' ? 'Away Win' : p.result === 'DRAW' ? 'Draw' : '-'
    
    // 리그명 영문 매핑
    const leagueNameEnMap: Record<string, string> = {
      '프리미어리그': 'Premier League',
      'EPL': 'Premier League',
      '라리가': 'La Liga',
      '분데스리가': 'Bundesliga',
      '세리에A': 'Serie A',
      '세리에': 'Serie A',
      '리그1': 'Ligue 1',
      '리그앙': 'Ligue 1',
      '프리그1': 'Ligue 1',
      '챔피언스리그': 'Champions League',
      'UCL': 'Champions League',
      '유로파리그': 'Europa League',
      'UEL': 'Europa League',
      '컨퍼런스리그': 'Conference League',
      '에레디비시': 'Eredivisie',
      '에레디비': 'Eredivisie',
      '프리메이라리가': 'Primeira Liga',
      '챔피언십': 'Championship',
      'EFL': 'Championship',
      'FA컵': 'FA Cup',
      '코파델레이': 'Copa del Rey',
      'DFB포칼': 'DFB Pokal',
      '코파이탈리아': 'Coppa Italia',
      '쿠프드프랑스': 'Coupe de France',
    }
    const leagueEn = leagueNameEnMap[match.leagueName] || match.leagueName
    
    // 🇰🇷 한글 버전
    let text = `🇰🇷 한글\n`
    text += `${match.homeTeamKo} vs ${match.awayTeamKo}\n`
    text += `⏰ ${dateStr} | ${match.time} | ${match.leagueName}\n`
    text += `${gradeEmoji} ${p.grade || 'PASS'} | ${p.resultKo || '-'} ${winProb || 0}%\n`
    text += `📊 분석 근거\n`
    text += ` 선제골 승률: ${formatPercent(ts.home?.firstGoalWinRate)}% vs ${formatPercent(ts.away?.firstGoalWinRate)}%\n`
    text += ` 파워 차이: ${power.diff || 0}점\n`
    text += `⚡ 파워 지수\n`
    text += ` ${match.homeTeamKo} : ${power.home || 0}\n`
    text += ` ${match.awayTeamKo} : ${power.away || 0}\n`
    text += `📈 최종 예측 확률\n`
    text += ` ${match.homeTeamKo} ${prob.home || 0}% | 무 ${prob.draw || 0}% | ${match.awayTeamKo} ${prob.away || 0}%\n`
    if (pattern.totalMatches > 0) {
      text += `🎯 패턴 ${pattern.code}\n`
      text += ` 역대 : 홈 ${formatPercent(pattern.homeWinRate)}% / 무 ${formatPercent(pattern.drawRate)}% / 원정 ${formatPercent(pattern.awayWinRate)}%\n`
    }
    
    // 🇬🇧 영문 버전
    text += `\n🇬🇧 English\n`
    text += `${match.homeTeam || match.homeTeamKo} vs ${match.awayTeam || match.awayTeamKo}\n`
    text += `⏰ ${dateStr} | ${match.time} | ${leagueEn}\n`
    text += `${gradeEmoji} ${p.grade || 'PASS'} | ${resultEn} ${winProb || 0}%\n`
    text += `📊 Analysis\n`
    text += ` First Goal Win Rate: ${formatPercent(ts.home?.firstGoalWinRate)}% vs ${formatPercent(ts.away?.firstGoalWinRate)}%\n`
    text += ` Power Gap: ${power.diff || 0}pts\n`
    text += `⚡ Power Index\n`
    text += ` ${match.homeTeam || match.homeTeamKo} : ${power.home || 0}\n`
    text += ` ${match.awayTeam || match.awayTeamKo} : ${power.away || 0}\n`
    text += `📈 Final Prediction\n`
    text += ` ${match.homeTeam || match.homeTeamKo} ${prob.home || 0}% | Draw ${prob.draw || 0}% | ${match.awayTeam || match.awayTeamKo} ${prob.away || 0}%\n`
    if (pattern.totalMatches > 0) {
      text += `🎯 Pattern ${pattern.code}\n`
      text += ` Historical: Home ${formatPercent(pattern.homeWinRate)}% / Draw ${formatPercent(pattern.drawRate)}% / Away ${formatPercent(pattern.awayWinRate)}%\n`
    }
    
    return text
  }

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

  // ==================== 🎫 프로토 관리 함수 ====================

  // 저장된 프로토 데이터 개수 확인
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('proto_matches')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setProtoSavedCount(parsed.length)
        } catch {
          setProtoSavedCount(0)
        }
      }
    }
  }, [])

  // 와이즈토토 텍스트 파싱 (v4 - 모든 유형 지원)
  const parseWisetotoText = (text: string) => {
    const lines = text.split('\n')
    const matches: any[] = []
    const seenMatches = new Set<string>()
    const currentYear = new Date().getFullYear()
    
    // 알려진 리그 (긴 것부터 매칭)
    const knownLeagues = [
      'U23아컵', '남농EASL', 'KOVO남', 'KOVO여', '에레디비', 'EFL챔',
      '세리에A', '라리가', '분데스리', '리그1', '프리그1',
      'UCL', 'UEL', 'EPL', 'PL', 'EFL챔',
      'WKBL', 'KBL', 'NBA',
    ]
    
    // 결과 텍스트 → 결과 코드 매핑 (유형별)
    const resultMap: { [key: string]: string } = {
      // 승무패
      '홈승': 'home',
      '홈패': 'away', 
      '무승부': 'draw',
      // 핸디캡
      '핸디승': 'home',
      '핸디패': 'away',
      // 언더오버
      '오버': 'over',
      '언더': 'under',
      // 홀짝
      '홀': 'odd',
      '짝': 'even',
    }
    
    // 승/패만 있는 리그 (무승부 없음)
    const noDrawLeagues = ['WKBL', 'KBL', 'NBA', 'KOVO남', 'KOVO여', '남농EASL']

    for (const line of lines) {
      const trimmed = line.trim()
      if (!/^\d{3}/.test(trimmed)) continue

      // 기본 정보 추출: 번호, 날짜, 요일, 시간
      const baseMatch = trimmed.match(/^(\d{3})(\d{2}\.\d{2})\(([월화수목금토일])\)\s*(\d{2}:\d{2})(.+)/)
      if (!baseMatch) continue

      const [, seq, date, dayOfWeek, time, rest] = baseMatch
      
      // 리그 찾기
      let league = ''
      let afterLeague = rest
      for (const l of knownLeagues) {
        if (rest.startsWith(l)) {
          league = l
          afterLeague = rest.slice(l.length)
          break
        }
      }
      
      if (!league) continue
      
      // ===== 유형 감지 =====
      let matchType = '승무패'
      let handicapValue: number | null = null
      let totalValue: number | null = null
      
      // 전반전 유형은 스킵 (hH, hU, h )
      if (/^h[HU\s]/.test(afterLeague)) continue
      
      // 승5패 (승⑤패)
      if (afterLeague.startsWith('승⑤패')) {
        matchType = '승5패'
        afterLeague = afterLeague.slice(3)
      }
      // 핸디캡 (H +1.5, H -2.0 등)
      else if (/^H\s*[+-]?\d/.test(afterLeague)) {
        matchType = '핸디캡'
        const hMatch = afterLeague.match(/^H\s*([+-]?\d+\.?\d*)/)
        if (hMatch) {
          handicapValue = parseFloat(hMatch[1])
          afterLeague = afterLeague.slice(hMatch[0].length)
        }
      }
      // 언더오버 (U 2.5, U 134.5 등)
      else if (/^U\s*\d/.test(afterLeague)) {
        matchType = '언더오버'
        const uMatch = afterLeague.match(/^U\s*(\d+\.?\d*)/)
        if (uMatch) {
          totalValue = parseFloat(uMatch[1])
          afterLeague = afterLeague.slice(uMatch[0].length)
        }
      }
      // 홀짝 (SUM)
      else if (afterLeague.startsWith('SUM')) {
        matchType = '홀짝'
        afterLeague = afterLeague.slice(3)
      }
      
      // ===== 결과 추출 =====
      let resultCode: string | null = null
      for (const [resultText, code] of Object.entries(resultMap)) {
        if (afterLeague.includes(resultText)) {
          resultCode = code
          break
        }
      }
      // 경기전이면 null
      if (afterLeague.includes('경기전')) {
        resultCode = null
      }
      
      // 결과 텍스트 제거
      let cleanedStr = afterLeague
      for (const result of [...Object.keys(resultMap), '경기전']) {
        cleanedStr = cleanedStr.replace(result, '')
      }
      
      // 화살표 제거
      cleanedStr = cleanedStr.replace(/[↑↓]/g, '')
      
      // 스코어 제거 (팀 사이의 숫자:숫자 또는 숫자.5:숫자)
      cleanedStr = cleanedStr.replace(/\s+\d+\.?\d*[:]\d+\.?\d*\s+/g, ' ')
      
      // 배당률 추출 (X.XX 형태)
      const oddsRegex = /(\d{1,2}\.\d{2})/g
      const oddsMatches = cleanedStr.match(oddsRegex) || []
      
      // 배당률 제거 후 팀명만 남기기
      cleanedStr = cleanedStr.replace(oddsRegex, '')
      cleanedStr = cleanedStr.replace(/-/g, '')
      cleanedStr = cleanedStr.trim()
      
      // 팀 분리
      let homeTeam = ''
      let awayTeam = ''
      
      if (cleanedStr.includes(':')) {
        const parts = cleanedStr.split(':')
        homeTeam = parts[0].trim()
        awayTeam = parts[1]?.trim() || ''
      } else {
        const words = cleanedStr.trim().split(/\s+/).filter(w => w)
        if (words.length === 2) {
          homeTeam = words[0]
          awayTeam = words[1]
        } else if (words.length >= 2) {
          const mid = Math.floor(words.length / 2)
          homeTeam = words.slice(0, mid).join(' ')
          awayTeam = words.slice(mid).join(' ')
        }
      }
      
      homeTeam = homeTeam.trim()
      awayTeam = awayTeam.trim()
      
      if (!homeTeam || !awayTeam) continue
      
      // 중복 체크 (같은 경기 + 같은 유형)
      const matchKey = `${seq}-${matchType}`
      if (seenMatches.has(matchKey)) continue
      seenMatches.add(matchKey)
      
      // 축구 리그 (핸디캡이 3way)
      const soccerLeagues = ['UCL', 'UEL', 'EPL', 'EFL', '세리에', '라리가', '분데스리', '리그1', '프리그1', 'U23아컵', '에레디비', 'PL']
      const isSoccerLeague = soccerLeagues.some(l => league.includes(l))
      
      // 배당률 할당 (유형별로 다름)
      let homeOdds: number | null = null
      let drawOdds: number | null = null
      let awayOdds: number | null = null
      
      if (matchType === '승무패' || matchType === '승5패') {
        const isNoDraw = noDrawLeagues.some(l => league.includes(l))
        
        if (isNoDraw) {
          // 농구/배구 승무패 (2way)
          if (oddsMatches.length >= 2) {
            homeOdds = parseFloat(oddsMatches[0])
            awayOdds = parseFloat(oddsMatches[1])
          }
        } else if (matchType === '승5패') {
          // 승5패 (항상 3way)
          if (oddsMatches.length >= 3) {
            homeOdds = parseFloat(oddsMatches[0])
            drawOdds = parseFloat(oddsMatches[1])
            awayOdds = parseFloat(oddsMatches[2])
          }
        } else {
          // 축구 승무패 (3way)
          if (oddsMatches.length >= 3) {
            homeOdds = parseFloat(oddsMatches[0])
            drawOdds = parseFloat(oddsMatches[1])
            awayOdds = parseFloat(oddsMatches[2])
          }
        }
      } else if (matchType === '핸디캡') {
        // 🆕 축구 핸디캡 = 3way (핸디승/핸디무/핸디패)
        // 🆕 농구/배구 핸디캡 = 2way (핸디승/핸디패)
        if (isSoccerLeague) {
          // 축구 핸디캡 3way
          if (oddsMatches.length >= 3) {
            homeOdds = parseFloat(oddsMatches[0])  // 핸디승
            drawOdds = parseFloat(oddsMatches[1])  // 핸디무
            awayOdds = parseFloat(oddsMatches[2])  // 핸디패
          }
        } else {
          // 농구/배구 핸디캡 2way
          if (oddsMatches.length >= 2) {
            homeOdds = parseFloat(oddsMatches[0])  // 핸디승
            awayOdds = parseFloat(oddsMatches[1])  // 핸디패
          }
        }
      } else {
        // 언더오버, 홀짝 (항상 2way)
        if (oddsMatches.length >= 2) {
          homeOdds = parseFloat(oddsMatches[0])  // 오버/홀
          awayOdds = parseFloat(oddsMatches[1])  // 언더/짝
        }
      }

      matches.push({
        matchSeq: parseInt(seq),
        gameDate: `${currentYear}-${date.replace('.', '-')}T${time}:00`,
        koreanDate: `${date}(${dayOfWeek})`,
        koreanTime: time,
        homeTeam,
        awayTeam,
        leagueName: league,
        matchType,  // 🆕 유형 저장
        handicapValue,  // 🆕 핸디캡 값
        totalValue,  // 🆕 언오버 기준점
        homeOdds,
        drawOdds,
        awayOdds,
        resultCode,
      })
    }
    return matches
  }

  // 텍스트에서 회차 자동 추출
  const extractRoundFromText = (text: string): string => {
    // 패턴: "9회차" 또는 "10회차"
    const roundMatch = text.match(/(\d{1,2})회차/)
    if (roundMatch) return roundMatch[1]
    return ''
  }

  // 파싱 실행
  const handleProtoParse = () => {
    const parsed = parseWisetotoText(protoText)
    if (parsed.length === 0) {
      setProtoParseResult('❌ 파싱 실패 - 데이터 형식을 확인해주세요')
      setProtoMatches([])
      return
    }
    
    // 텍스트에서 회차 자동 추출
    const extractedRound = extractRoundFromText(protoText)
    if (extractedRound && !protoRound) {
      setProtoRound(extractedRound)
    }
    
    // 유형별 통계
    const typeStats = {
      '승무패': parsed.filter((m: any) => m.matchType === '승무패').length,
      '승5패': parsed.filter((m: any) => m.matchType === '승5패').length,
      '핸디캡': parsed.filter((m: any) => m.matchType === '핸디캡').length,
      '언더오버': parsed.filter((m: any) => m.matchType === '언더오버').length,
      '홀짝': parsed.filter((m: any) => m.matchType === '홀짝').length,
    }
    
    // 스포츠별 통계
    const soccerCount = parsed.filter((m: any) => 
      ['UCL', 'UEL', 'EPL', 'EFL', '에레디비', 'U23아컵', '세리에', '라리가', '분데스리', '프리그1', '리그1'].some(l => m.leagueName.includes(l))
    ).length
    const basketCount = parsed.filter((m: any) => 
      ['KBL', 'WKBL', 'NBA', 'EASL', '남농'].some(l => m.leagueName.includes(l))
    ).length
    const volleyCount = parsed.filter((m: any) => m.leagueName.includes('KOVO')).length
    
    // 결과가 나온 경기 수
    const finishedCount = parsed.filter((m: any) => m.resultCode !== null).length
    
    // 유형 통계 문자열 생성
    const typeStatsStr = Object.entries(typeStats)
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => `${type}:${count}`)
      .join(' ')

    setProtoParseResult(
      `✅ ${parsed.length}경기 (⚽${soccerCount} 🏀${basketCount} 🏐${volleyCount})\n` +
      `📊 ${typeStatsStr}` +
      (finishedCount > 0 ? ` | 🏁 결과: ${finishedCount}` : '')
    )
    setProtoMatches(parsed)
  }

  // 프로토 데이터 저장 (회차별) - DB API 사용
  const handleProtoSave = async () => {
    if (protoMatches.length === 0) {
      alert('저장할 경기가 없습니다')
      return
    }
    if (!protoRound) {
      alert('회차를 입력해주세요')
      return
    }
    
    try {
      const res = await fetch('/api/proto/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          round: protoRound,
          matches: protoMatches
        })
      })
      
      const json = await res.json()
      
      if (json.success) {
        alert(`✅ ${protoRound}회차 ${protoMatches.length}개 경기가 DB에 저장되었습니다!`)
        
        // 회차 목록 새로고침
        fetchProtoRounds()
        
        // 초기화
        setProtoText('')
        setProtoParseResult('')
        setProtoMatches([])
        setProtoRound('')
      } else {
        alert(`❌ 저장 실패: ${json.error}`)
      }
    } catch (error) {
      console.error('Proto save error:', error)
      alert('❌ 저장 중 오류 발생')
    }
  }

  // 프로토 데이터 전체 삭제 - DB API
  const handleProtoClear = async () => {
    if (!confirm('저장된 프로토 데이터를 모두 삭제하시겠습니까?')) return
    
    try {
      // 모든 회차 삭제
      for (const round of protoSavedRounds) {
        await fetch(`/api/proto/matches?round=${round}`, { method: 'DELETE' })
      }
      
      setProtoSavedCount(0)
      setProtoSavedRounds([])
      alert('삭제되었습니다')
    } catch (error) {
      console.error('Proto clear error:', error)
      alert('삭제 중 오류 발생')
    }
  }

  // 특정 회차만 삭제 - DB API
  const handleProtoRoundDelete = async (round: string) => {
    if (!confirm(`${round}회차 데이터를 삭제하시겠습니까?`)) return
    
    try {
      const res = await fetch(`/api/proto/matches?round=${round}`, { method: 'DELETE' })
      const json = await res.json()
      
      if (json.success) {
        fetchProtoRounds()
        alert(`${round}회차가 삭제되었습니다`)
      }
    } catch (error) {
      console.error('Proto round delete error:', error)
      alert('삭제 중 오류 발생')
    }
  }

  // DB에서 회차 목록 로드
  const fetchProtoRounds = async () => {
    try {
      const res = await fetch('/api/proto/matches')
      const json = await res.json()
      
      if (json.success) {
        // 숫자 내림차순 정렬 (11 → 10 → 9)
        const rounds = (json.rounds || [])
          .sort((a: string, b: string) => parseInt(b) - parseInt(a))
        setProtoSavedRounds(rounds)
        setProtoSavedCount(json.data?.length || 0)
      }
    } catch (error) {
      console.error('Fetch proto rounds error:', error)
    }
  }

  // 저장된 회차 목록 로드 (DB)
  useEffect(() => {
    fetchProtoRounds()
  }, [])

  // ==================== 계산된 통계 ====================

  const stats = useMemo(() => {
    // ✅ API의 정확한 total count 사용 (100명 제한 문제 해결)
    const totalUsers = totalUserCount || users.length
    const freeUsers = users.filter(u => u.tier === 'free').length
    const premiumUsers = users.filter(u => u.tier === 'premium').length
    
    const today = getKSTDateString()
    const todayUsers = users.filter(u => u.created_at.startsWith(today)).length
    
    const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length
    const monthlyRevenue = paymentStats?.totalRevenue || subscriptions
      .filter(s => s.status === 'active')
      .reduce((sum, s) => sum + (s.price || 0), 0)
    
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
  }, [users, totalUserCount, subscriptions, ads, todayAdStats, paymentStats])

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
      const body: Record<string, string | null> = { id: userId, tier: newTier }
      if (newTier === 'free') {
        body.premium_expires_at = null
        const response = await fetch('/api/admin/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!response.ok) throw new Error('업데이트 실패')
        fetchUsers()
      } else {
        // 프리미엄 전환 시 바로 날짜 입력 UI 열기 (기본 +30일)
        const defaultExpiry = new Date()
        defaultExpiry.setDate(defaultExpiry.getDate() + 30)
        // tier만 먼저 업데이트
        const response = await fetch('/api/admin/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!response.ok) throw new Error('업데이트 실패')
        await fetchUsers()
        // 날짜 입력 UI 열기
        setEditingExpiry({ userId, value: defaultExpiry.toISOString().split('T')[0] })
      }
    } catch (err) {
      alert('등급 변경에 실패했습니다')
    }
  }

  const handleUpdateExpiry = async (userId: string, expiresAt: string) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, tier: 'premium', premium_expires_at: expiresAt }),
      })
      if (!response.ok) throw new Error('업데이트 실패')
      setEditingExpiry(null)
      fetchUsers()
    } catch (err) {
      alert('유효기간 변경에 실패했습니다')
    }
  }

  const handleQuickExpiry = async (userId: string, days: number) => {
    const user = users.find(u => u.id === userId)
    const base = user?.premium_expires_at && new Date(user.premium_expires_at) > new Date()
      ? new Date(user.premium_expires_at)  // 기존 만료일 기준
      : new Date()                          // 만료됐거나 없으면 오늘 기준
    base.setDate(base.getDate() + days)
    await handleUpdateExpiry(userId, base.toISOString())
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex overflow-x-hidden">

      {/* 좌측 사이드바 */}
      <>
      {/* 모바일 오버레이 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 좌측 사이드바 */}
      <aside className={`fixed md:sticky top-0 left-0 h-full md:h-screen w-56 shrink-0 bg-gray-900/95 border-r border-gray-800 min-h-screen flex flex-col z-50 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        {/* 로고 */}
        <div className="px-5 py-5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚽</span>
            <div>
              <div className="text-sm font-bold text-white leading-tight">TrendSoccer</div>
              <div className="text-[10px] text-emerald-400 font-medium">Admin Panel</div>
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSidebarOpen(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                activeTab === tab.id
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* 하단 유틸리티 */}
        <div className="px-2 py-3 border-t border-gray-800 space-y-1.5">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as '7' | '14' | '30')}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="7">최근 7일</option>
            <option value="14">최근 14일</option>
            <option value="30">최근 30일</option>
          </select>
          <button
            onClick={loadAllData}
            className="w-full px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs transition-colors"
          >
            🔄 새로고침
          </button>
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-lg text-xs transition-colors"
          >
            로그아웃
          </button>
        </div>
      </aside>
      </>

      {/* 우측 메인 영역 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 상단 헤더바 */}
        <header className="bg-gray-900/60 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-30 px-4 md:px-6 h-14 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {/* 모바일 햄버거 */}
            <button
              className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-base">{TABS.find(t => t.id === activeTab)?.icon}</span>
            <span className="text-white font-semibold text-sm">{TABS.find(t => t.id === activeTab)?.label}</span>
          </div>
          <div className="text-xs text-gray-500 hidden md:block">TrendSoccer Admin</div>
        </header>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 px-3 md:px-6 py-4 md:py-6 overflow-y-auto pb-20 md:pb-6">
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
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
                    <div className="text-sm text-gray-400">총 매출</div>
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
                  <div className="bg-gray-800/50 rounded-xl p-4 md:p-5 border border-gray-700/50">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">📢</span>
                      <div>
                        <div className="text-sm text-gray-400">활성 광고</div>
                        <div className="text-2xl font-bold text-white">{stats.activeAds}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-800/50 rounded-xl p-4 md:p-5 border border-gray-700/50">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">👁️</span>
                      <div>
                        <div className="text-sm text-gray-400">오늘 노출</div>
                        <div className="text-2xl font-bold text-white">{stats.todayImpressions.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-800/50 rounded-xl p-4 md:p-5 border border-gray-700/50">
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
                              {user.name || user.email?.split('@')[0] || '이름 없음'}
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
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
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
                            ? (totalUserCount || users.length) 
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
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">프리미엄 유효기간</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">마지막 접속</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">액션</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/50">
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                              회원이 없습니다
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-700/20 transition-colors">
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                                    {(user.name || user.email?.split('@')[0] || '?').charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="text-white font-medium">{user.name || user.email?.split('@')[0] || '이름 없음'}</div>
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
                              {/* 프리미엄 유효기간 컬럼 */}
                              <td className="px-4 py-4">
                                {editingExpiry?.userId === user.id ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="date"
                                      value={editingExpiry.value}
                                      onChange={(e) => setEditingExpiry({ userId: user.id, value: e.target.value })}
                                      className="px-2 py-1 bg-gray-700 border border-emerald-500 rounded text-xs text-white focus:outline-none"
                                    />
                                    <button
                                      onClick={() => handleUpdateExpiry(user.id, new Date(editingExpiry.value).toISOString())}
                                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-xs text-white"
                                    >✓</button>
                                    <button
                                      onClick={() => setEditingExpiry(null)}
                                      className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs text-white"
                                    >✕</button>
                                  </div>
                                ) : user.tier === 'premium' ? (
                                  <div className="flex items-center gap-1.5">
                                    {user.premium_expires_at ? (
                                      <span className={`text-xs font-medium ${
                                        new Date(user.premium_expires_at) < new Date()
                                          ? 'text-red-400'
                                          : new Date(user.premium_expires_at) < new Date(Date.now() + 7 * 86400000)
                                          ? 'text-yellow-400'
                                          : 'text-emerald-400'
                                      }`}>
                                        {new Date(user.premium_expires_at).toLocaleDateString('ko-KR')}
                                        {new Date(user.premium_expires_at) < new Date() && ' (만료)'}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-gray-500">미설정</span>
                                    )}
                                    <button
                                      onClick={() => setEditingExpiry({
                                        userId: user.id,
                                        value: user.premium_expires_at
                                          ? new Date(user.premium_expires_at).toISOString().split('T')[0]
                                          : new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
                                      })}
                                      className="text-gray-500 hover:text-white text-xs"
                                      title="유효기간 변경"
                                    >✏️</button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-600">-</span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-400">
                                {user.last_login_at ? formatDateTime(user.last_login_at) : '-'}
                              </td>
                              <td className="px-4 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <select
                                    value={user.tier}
                                    onChange={(e) => handleUpdateUserTier(user.id, e.target.value as 'free' | 'premium')}
                                    className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-emerald-500"
                                  >
                                    <option value="free">무료</option>
                                    <option value="premium">프리미엄</option>
                                  </select>
                                  {user.tier === 'premium' && (
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => handleQuickExpiry(user.id, 30)}
                                        className="px-2 py-1 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/30 rounded text-xs text-blue-400"
                                        title="30일 연장"
                                      >+30일</button>
                                      <button
                                        onClick={() => handleQuickExpiry(user.id, 90)}
                                        className="px-2 py-1 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/30 rounded text-xs text-purple-400"
                                        title="90일 연장"
                                      >+90일</button>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>총 {filteredUsers.length}명 {userFilter === 'all' && countryFilter === 'all' && !userSearch && totalUserCount > filteredUsers.length ? `(전체 ${totalUserCount}명)` : ''}</span>
                </div>
              </div>
            )}

            {/* 구독 관리 탭 */}
            {activeTab === 'subscriptions' && (
              <div className="space-y-6">
                {/* 매출 요약 카드 */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
                  <div className="bg-gray-800/50 rounded-xl p-4 md:p-5 border border-gray-700/50">
                    <div className="text-2xl mb-2">💰</div>
                    <div className="text-2xl font-bold text-emerald-400">
                      {formatCurrency(paymentStats?.totalRevenue || 0)}
                    </div>
                    <div className="text-sm text-gray-400">총 매출</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4 md:p-5 border border-gray-700/50">
                    <div className="text-2xl mb-2">📅</div>
                    <div className="text-2xl font-bold text-white">
                      {formatCurrency(paymentStats?.todayRevenue || 0)}
                    </div>
                    <div className="text-sm text-gray-400">오늘 매출 ({paymentStats?.todayCount || 0}건)</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4 md:p-5 border border-gray-700/50">
                    <div className="text-2xl mb-2">💳</div>
                    <div className="text-2xl font-bold text-white">
                      {subscriptions.filter(s => s.status === 'active').length}
                    </div>
                    <div className="text-sm text-gray-400">활성 구독</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4 md:p-5 border border-gray-700/50">
                    <div className="text-2xl mb-2">✅</div>
                    <div className="text-2xl font-bold text-white">
                      {paymentStats?.successCount || 0}
                    </div>
                    <div className="text-sm text-gray-400">성공 결제</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4 md:p-5 border border-gray-700/50">
                    <div className="text-2xl mb-2">❌</div>
                    <div className="text-2xl font-bold text-white">
                      {paymentStats?.failedCount || 0}
                    </div>
                    <div className="text-sm text-gray-400">실패/취소</div>
                  </div>
                </div>

                {/* 월별 매출 차트 */}
                {paymentStats?.monthlyRevenue && Object.keys(paymentStats.monthlyRevenue).length > 0 && (
                  <div className="bg-gray-800/50 rounded-xl p-4 md:p-5 border border-gray-700/50">
                    <h3 className="text-white font-bold mb-4">📊 월별 매출</h3>
                    <div className="flex items-end gap-2 h-32">
                      {Object.entries(paymentStats.monthlyRevenue)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .slice(-6)
                        .map(([month, revenue]) => {
                          const maxRevenue = Math.max(...Object.values(paymentStats.monthlyRevenue), 1)
                          return (
                            <div key={month} className="flex-1 flex flex-col items-center gap-1">
                              <div className="text-xs text-emerald-400 font-medium">
                                {formatCurrency(revenue)}
                              </div>
                              <div
                                className="w-full bg-emerald-500/60 rounded-t hover:bg-emerald-500/80 transition-colors"
                                style={{
                                  height: `${(revenue / maxRevenue) * 100}%`,
                                  minHeight: revenue > 0 ? '8px' : '0',
                                }}
                              />
                              <div className="text-[10px] text-gray-500">{month.slice(5)}월</div>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}

                {/* 구독 필터 */}
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

                {/* 구독 테이블 */}
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
                                  <div className="text-white font-medium">{sub.user_name || sub.user_email?.split('@')[0] || '이름 없음'}</div>
                                  <div className="text-sm text-gray-500">{sub.user_email}</div>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  sub.plan === 'quarterly' 
                                    ? 'bg-purple-500/20 text-purple-400'
                                    : sub.plan === 'yearly'
                                    ? 'bg-orange-500/20 text-orange-400'
                                    : 'bg-blue-500/20 text-blue-400'
                                }`}>
                                  {sub.plan === 'quarterly' ? '📅 3개월' : 
                                   sub.plan === 'yearly' ? '🗓️ 연간' : '📅 월간'}
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
                                {formatCurrency(sub.price || 0)}
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

                {/* SeedPay 결제 내역 */}
                {payments.length > 0 && (
                  <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-700/50">
                      <h3 className="text-white font-bold">💳 SeedPay 결제 내역</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-900/50">
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">일시</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">이메일</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">플랜</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">금액</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">상태</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">카드</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">승인번호</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/50">
                          {payments.slice(0, 20).map((p) => (
                            <tr key={p.id} className="hover:bg-gray-700/20 transition-colors">
                              <td className="px-4 py-3 text-sm text-gray-400">
                                {formatDateTime(p.created_at)}
                              </td>
                              <td className="px-4 py-3 text-sm text-white">
                                {p.user_email}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  p.plan === 'quarterly' 
                                    ? 'bg-purple-500/20 text-purple-400'
                                    : 'bg-blue-500/20 text-blue-400'
                                }`}>
                                  {p.plan === 'quarterly' ? '3개월' : '월간'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-white font-medium">
                                {formatCurrency(p.amount)}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  p.status === 'success' 
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {p.status === 'success' ? '성공' : '실패'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-400">
                                {p.card_name || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                                {p.approval_number || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
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
                {/* 필터 바 */}
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* 슬롯 타입 */}
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">슬롯 타입</label>
                      <select
                        value={reportSlotFilter}
                        onChange={(e) => setReportSlotFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="all">전체</option>
                        {SLOT_TYPES.map((slot) => (
                          <option key={slot.value} value={slot.value}>{slot.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* 날짜 모드 */}
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">기간</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setReportDateMode('preset')}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            reportDateMode === 'preset'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                        >
                          기본
                        </button>
                        <button
                          onClick={() => setReportDateMode('custom')}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            reportDateMode === 'custom'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                        >
                          커스텀
                        </button>
                      </div>
                    </div>

                    {/* 날짜 선택 (조건부) */}
                    {reportDateMode === 'preset' ? (
                      <div className="md:col-span-2">
                        <label className="block text-gray-400 text-sm mb-2">기간 선택</label>
                        <div className="flex gap-2">
                          {['7', '14', '30'].map(days => (
                            <button
                              key={days}
                              onClick={() => setReportDateRange(days)}
                              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                reportDateRange === days
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                              }`}
                            >
                              {days}일
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block text-gray-400 text-sm mb-2">시작일</label>
                          <input
                            type="date"
                            value={reportStartDate}
                            onChange={(e) => setReportStartDate(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-400 text-sm mb-2">종료일</label>
                          <input
                            type="date"
                            value={reportEndDate}
                            onChange={(e) => setReportEndDate(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* 엑셀 다운로드 버튼 */}
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={downloadReportExcel}
                      disabled={reportStats.length === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      엑셀 다운로드
                    </button>
                  </div>
                </div>

                {/* 요약 카드 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-800/50 rounded-xl p-4 md:p-5 border border-gray-700/50">
                    <div className="text-2xl mb-2">👁️</div>
                    <div className="text-2xl font-bold text-white">
                      {reportSummary.reduce((sum, s) => sum + s.impressions, 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-400">총 노출</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4 md:p-5 border border-gray-700/50">
                    <div className="text-2xl mb-2">👆</div>
                    <div className="text-2xl font-bold text-white">
                      {reportSummary.reduce((sum, s) => sum + s.clicks, 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-400">총 클릭</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4 md:p-5 border border-gray-700/50">
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

                {/* 일별 추이 차트 */}
                {reportSummary.length > 0 && (
                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                    <h3 className="text-lg font-semibold text-white mb-6">일별 추이</h3>
                    <div className="space-y-3">
                      {reportSummary.slice(-14).reverse().map((day) => {
                        const maxImpressions = Math.max(...reportSummary.map(s => s.impressions), 1)
                        const maxClicks = Math.max(...reportSummary.map(s => s.clicks), 1)
                        const ctr = day.impressions > 0 ? (day.clicks / day.impressions) * 100 : 0
                        return (
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
                            <div className="w-40 flex gap-4 text-sm">
                              <span className="text-blue-400 w-16 text-right">{day.impressions}</span>
                              <span className="text-emerald-400 w-12 text-right">{day.clicks}</span>
                              <span className="text-gray-500 w-12 text-right">{ctr.toFixed(1)}%</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    
                    {/* 범례 */}
                    <div className="flex items-center gap-6 mt-6 pt-4 border-t border-gray-700/50">
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
                )}

                {/* 광고별 성과 */}
                {adPerformance.length > 0 && (
                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                    <h3 className="text-lg font-semibold text-white mb-4">광고별 성과</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left text-gray-400 text-sm border-b border-gray-700/50">
                            <th className="px-4 py-3">광고명</th>
                            <th className="px-4 py-3">슬롯</th>
                            <th className="px-4 py-3 text-right">노출</th>
                            <th className="px-4 py-3 text-right">클릭</th>
                            <th className="px-4 py-3 text-right">CTR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adPerformance.map((perf) => (
                            <tr key={perf.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                              <td className="px-4 py-3 text-white font-medium">{perf.name}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  perf.slot_type === 'desktop_banner' ? 'bg-blue-500/20 text-blue-400' :
                                  perf.slot_type === 'sidebar' ? 'bg-purple-500/20 text-purple-400' :
                                  'bg-orange-500/20 text-orange-400'
                                }`}>
                                  {SLOT_TYPES.find(s => s.value === perf.slot_type)?.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-blue-400">
                                {perf.totalImpressions.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-right text-emerald-400">
                                {perf.totalClicks.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className={`font-bold ${
                                  perf.ctr >= 1 ? 'text-emerald-400' : 
                                  perf.ctr >= 0.5 ? 'text-yellow-400' : 
                                  'text-gray-400'
                                }`}>
                                  {perf.ctr.toFixed(2)}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 일별 상세 테이블 */}
                {reportStats.length > 0 && (
                  <div className="bg-gray-800/50 rounded-xl overflow-hidden border border-gray-700/50">
                    <div className="p-6 border-b border-gray-700/50">
                      <h3 className="text-lg font-semibold text-white">일별 상세</h3>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left text-gray-400 text-sm border-b border-gray-700/50">
                            <th className="px-6 py-4">날짜</th>
                            <th className="px-6 py-4">광고명</th>
                            <th className="px-6 py-4">슬롯</th>
                            <th className="px-6 py-4 text-right">노출</th>
                            <th className="px-6 py-4 text-right">클릭</th>
                            <th className="px-6 py-4 text-right">CTR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportStats.map((stat, index) => {
                            const ctr = stat.impressions > 0 
                              ? (stat.clicks / stat.impressions) * 100 
                              : 0
                            return (
                              <tr 
                                key={`${stat.date}-${stat.advertisements?.id || index}`}
                                className="border-b border-gray-700/50 hover:bg-gray-700/30"
                              >
                                <td className="px-6 py-4 text-sm text-gray-300">
                                  {new Date(stat.date).toLocaleDateString('ko-KR')}
                                </td>
                                <td className="px-6 py-4 text-white font-medium">
                                  {stat.advertisements?.name || '-'}
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    stat.advertisements?.slot_type === 'desktop_banner' ? 'bg-blue-500/20 text-blue-400' :
                                    stat.advertisements?.slot_type === 'sidebar' ? 'bg-purple-500/20 text-purple-400' :
                                    'bg-orange-500/20 text-orange-400'
                                  }`}>
                                    {SLOT_TYPES.find(s => s.value === stat.advertisements?.slot_type)?.label || '-'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right text-blue-400">
                                  {stat.impressions.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-right text-emerald-400">
                                  {stat.clicks.toLocaleString()}
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
                )}

                {/* 데이터 없음 */}
                {reportStats.length === 0 && (
                  <div className="text-center py-20 text-gray-500">
                    데이터가 없습니다
                  </div>
                )}
              </div>
            )}

            {/* 블로그 관리 탭 */}
            {activeTab === 'blog' && (
              <div className="space-y-6">
                {/* 블로그 통계 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-800/50 rounded-xl p-4 md:p-5 border border-gray-700/50">
                    <div className="text-2xl mb-2">📝</div>
                    <div className="text-2xl font-bold text-white">{blogStats.totalPosts}</div>
                    <div className="text-sm text-gray-400">전체 포스트</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4 md:p-5 border border-gray-700/50">
                    <div className="text-2xl mb-2">✅</div>
                    <div className="text-2xl font-bold text-emerald-400">{blogStats.publishedPosts}</div>
                    <div className="text-sm text-gray-400">발행됨</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4 md:p-5 border border-gray-700/50">
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

            {/* 🎫 프로토 관리 탭 */}
            {activeTab === 'proto' && (
              <div className="bg-gray-800/30 rounded-2xl border border-gray-700/50 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">🎫 프로토 경기 관리</h2>
                  <a
                    href="/proto"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-emerald-400 hover:text-emerald-300"
                  >
                    📱 프로토 페이지 보기 →
                  </a>
                </div>

                {/* 현재 저장된 데이터 상태 - 회차별 */}
                <div className="mb-6 p-4 bg-gray-900/50 rounded-xl border border-gray-700/50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-300">💾 저장된 회차 목록</h3>
                    {protoSavedRounds.length > 0 && (
                      <button
                        onClick={handleProtoClear}
                        className="px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-xs transition-colors"
                      >
                        🗑️ 전체 삭제
                      </button>
                    )}
                  </div>
                  
                  {protoSavedRounds.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {protoSavedRounds.map(round => {
                        const savedData = localStorage.getItem('proto_data')
                        const matchCount = savedData ? JSON.parse(savedData)[round]?.length || 0 : 0
                        return (
                          <div 
                            key={round}
                            className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 rounded-lg"
                          >
                            <span className="text-sm text-white font-medium">
                              {round === '0' ? '미분류' : `${round}회차`}
                            </span>
                            <span className="text-xs text-gray-400">({matchCount}경기)</span>
                            <button
                              onClick={() => handleProtoRoundDelete(round)}
                              className="text-red-400 hover:text-red-300 text-xs ml-1"
                            >
                              ✕
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">저장된 데이터 없음</p>
                  )}
                </div>

                {/* 회차 입력 */}
                <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-bold text-emerald-400">📋 저장할 회차</label>
                    <input
                      type="number"
                      value={protoRound}
                      onChange={(e) => setProtoRound(e.target.value)}
                      placeholder="예: 10"
                      className="w-24 px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-xs text-gray-400">
                      * 텍스트에서 자동 추출됩니다
                    </span>
                  </div>
                </div>

                {/* 입력 안내 */}
                <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                  <h3 className="text-sm font-bold text-blue-400 mb-2">📋 사용 방법</h3>
                  <ol className="text-xs text-gray-400 space-y-1">
                    <li>1. <a href="https://wisetoto.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">wisetoto.com</a> 프로토 페이지 접속</li>
                    <li>2. Ctrl+A (전체 선택) → Ctrl+C (복사)</li>
                    <li>3. 아래 텍스트박스에 Ctrl+V (붙여넣기)</li>
                    <li>4. &quot;파싱&quot; 버튼 클릭 → &quot;저장&quot; 버튼 클릭</li>
                  </ol>
                </div>

                {/* 텍스트 입력 */}
                <textarea
                  value={protoText}
                  onChange={(e) => setProtoText(e.target.value)}
                  placeholder={`와이즈토토에서 복사한 텍스트를 붙여넣으세요...

예시:
00101.21(수) 19:00KBLKT소닉붐:안양정관---경기전
03601.22(목) 02:45UCL갈라타사:AT마드---경기전`}
                  className="w-full h-48 px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white text-sm font-mono placeholder-gray-500 focus:outline-none focus:border-emerald-500 resize-none"
                />

                {/* 버튼 & 결과 */}
                <div className="mt-4 flex items-center gap-3 flex-wrap">
                  <button
                    onClick={handleProtoParse}
                    disabled={!protoText.trim()}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
                  >
                    🔍 파싱
                  </button>
                  
                  {protoParseResult && (
                    <>
                      <span className={`text-sm ${protoParseResult.includes('✅') ? 'text-green-400' : 'text-red-400'}`}>
                        {protoParseResult}
                      </span>
                      
                      {protoMatches.length > 0 && (
                        <button
                          onClick={handleProtoSave}
                          disabled={!protoRound}
                          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
                        >
                          💾 {protoRound ? `${protoRound}회차 저장` : '회차 입력 필요'} ({protoMatches.length}경기)
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* 파싱 미리보기 */}
                {protoMatches.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-bold text-gray-300 mb-3">📋 파싱 결과 미리보기</h3>
                    <div className="max-h-80 overflow-y-auto bg-gray-900/50 rounded-xl border border-gray-700/50">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-gray-800">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs text-gray-400">#</th>
                            <th className="px-3 py-2 text-left text-xs text-gray-400">일시</th>
                            <th className="px-3 py-2 text-left text-xs text-gray-400">리그</th>
                            <th className="px-3 py-2 text-left text-xs text-gray-400">경기</th>
                            <th className="px-3 py-2 text-center text-xs text-gray-400">승</th>
                            <th className="px-3 py-2 text-center text-xs text-gray-400">무</th>
                            <th className="px-3 py-2 text-center text-xs text-gray-400">패</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/50">
                          {protoMatches.slice(0, 30).map((match: any, i: number) => (
                            <tr key={i} className="hover:bg-gray-700/20">
                              <td className="px-3 py-2 text-gray-500 font-mono">
                                {String(match.matchSeq).padStart(3, '0')}
                              </td>
                              <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                                {match.koreanDate} {match.koreanTime}
                              </td>
                              <td className="px-3 py-2">
                                <span className="px-2 py-0.5 bg-gray-700 rounded text-xs">
                                  {match.leagueName}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-white">
                                {match.homeTeam} vs {match.awayTeam}
                              </td>
                              <td className="px-3 py-2 text-center text-yellow-400">
                                {match.homeOdds?.toFixed(2) || '-'}
                              </td>
                              <td className="px-3 py-2 text-center text-yellow-400">
                                {match.drawOdds?.toFixed(2) || '-'}
                              </td>
                              <td className="px-3 py-2 text-center text-yellow-400">
                                {match.awayOdds?.toFixed(2) || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {protoMatches.length > 30 && (
                        <div className="px-3 py-2 text-center text-gray-500 text-xs border-t border-gray-700/50">
                          +{protoMatches.length - 30}개 더...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* 📤 예측 Export 탭 */}
            {activeTab === 'export' && (
              <div className="space-y-6">
                {/* 필터 영역 */}
                <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-4">
                  <div className="flex flex-wrap gap-4 items-end">
                    {/* 날짜 선택 */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">날짜</label>
                      <input
                        type="date"
                        value={exportDate}
                        onChange={(e) => setExportDate(e.target.value)}
                        className="px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    
                    {/* 리그 선택 */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">리그</label>
                      <select
                        value={exportLeague}
                        onChange={(e) => setExportLeague(e.target.value)}
                        className="px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                      >
                        <option value="all">전체</option>
                        <option value="PL">프리미어리그</option>
                        <option value="PD">라리가</option>
                        <option value="BL1">분데스리가</option>
                        <option value="SA">세리에A</option>
                        <option value="FL1">리그1</option>
                        <option value="CL">챔피언스리그</option>
                        <option value="EL">유로파리그</option>
                      </select>
                    </div>
                    
                    {/* 등급 선택 */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">등급</label>
                      <select
                        value={exportGrade}
                        onChange={(e) => setExportGrade(e.target.value)}
                        className="px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                      >
                        <option value="all">전체</option>
                        <option value="pick">PICK만</option>
                        <option value="good">PICK + GOOD</option>
                      </select>
                    </div>
                    
                    {/* 새로고침 */}
                    <button
                      onClick={fetchExportData}
                      disabled={exportLoading}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {exportLoading ? '로딩...' : '🔄 새로고침'}
                    </button>
                    
                    {/* 전체 복사 버튼들 */}
                    <div className="flex gap-2 ml-auto">
                      <button
                        onClick={() => copyExportText('text')}
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm transition-colors"
                      >
                        📋 텍스트
                      </button>
                      <button
                        onClick={() => copyExportText('markdown')}
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm transition-colors"
                      >
                        📝 마크다운
                      </button>
                      <button
                        onClick={() => copyExportText('json')}
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm transition-colors"
                      >
                        {'{ }'} JSON
                      </button>
                    </div>
                    
                    {exportCopyStatus && (
                      <span className="text-emerald-400 text-sm">{exportCopyStatus}</span>
                    )}
                  </div>
                </div>
                
                {/* 경기 목록 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 왼쪽: 경기 리스트 */}
                  <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-700/50 flex items-center justify-between">
                      <h3 className="font-semibold text-white">경기 목록</h3>
                      <span className="text-sm text-gray-400">{exportMatches.length}경기</span>
                    </div>
                    
                    {exportLoading ? (
                      <div className="p-8 text-center text-gray-500">로딩 중...</div>
                    ) : exportMatches.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">해당 조건의 경기가 없습니다</div>
                    ) : (
                      <div className="divide-y divide-gray-700/50 max-h-[600px] overflow-y-auto">
                        {exportMatches.map((match, idx) => {
                          const p = match.prediction
                          const isSelected = exportSelectedMatch?.id === match.id
                          
                          return (
                            <div
                              key={match.id || idx}
                              onClick={() => setExportSelectedMatch(isSelected ? null : match)}
                              className={`px-4 py-3 cursor-pointer transition-colors ${
                                isSelected 
                                  ? 'bg-emerald-600/20 border-l-2 border-emerald-500' 
                                  : 'hover:bg-gray-700/30'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    p.grade === 'PICK' ? 'bg-red-500/20 text-red-400' :
                                    p.grade === 'GOOD' ? 'bg-emerald-500/20 text-emerald-400' :
                                    'bg-gray-500/20 text-gray-400'
                                  }`}>
                                    {p.grade}
                                  </span>
                                  <span className="text-xs text-gray-500">{match.time}</span>
                                  <span className="text-xs text-gray-600">|</span>
                                  <span className="text-xs text-gray-500">{match.leagueName}</span>
                                </div>
                                <span className="text-xs text-amber-400">{p.confidence}%</span>
                              </div>
                              <div className="mt-1 text-white font-medium">
                                {match.homeTeamKo} vs {match.awayTeamKo}
                              </div>
                              <div className="mt-1 flex items-center gap-3 text-xs">
                                <span className="text-gray-400">
                                  예측: <span className={
                                    p.result === 'home' ? 'text-blue-400' :
                                    p.result === 'away' ? 'text-red-400' :
                                    'text-gray-300'
                                  }>{p.resultKo}</span>
                                </span>
                                <span className="text-gray-500">
                                  배당: {match.odds.home?.toFixed(2)} / {match.odds.draw?.toFixed(2)} / {match.odds.away?.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  
                  {/* 오른쪽: 상세 정보 */}
                  <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-700/50 flex items-center justify-between">
                      <h3 className="font-semibold text-white">상세 정보</h3>
                      {exportSelectedMatch && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyExportText('text')}
                            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white"
                          >
                            복사
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {!exportSelectedMatch ? (
                      <div className="p-8 text-center text-gray-500">
                        왼쪽에서 경기를 선택하세요
                      </div>
                    ) : (
                      <div className="p-4 space-y-4 max-h-[700px] overflow-y-auto">
                        {/* 기본 정보 */}
                        <div>
                          <div className="text-lg font-bold text-white mb-2">
                            {exportSelectedMatch.homeTeamKo} vs {exportSelectedMatch.awayTeamKo}
                          </div>
                          <div className="flex flex-wrap gap-2 text-sm">
                            <span className="px-2 py-1 bg-gray-700 rounded">{exportSelectedMatch.leagueName}</span>
                            <span className="px-2 py-1 bg-gray-700 rounded">{exportSelectedMatch.time}</span>
                            <span className={`px-2 py-1 rounded font-bold ${
                              exportSelectedMatch.prediction?.grade === 'PICK' ? 'bg-red-500/20 text-red-400' :
                              exportSelectedMatch.prediction?.grade === 'GOOD' ? 'bg-emerald-500/20 text-emerald-400' :
                              'bg-gray-600'
                            }`}>
                              {exportSelectedMatch.prediction?.grade || 'PASS'}
                            </span>
                          </div>
                        </div>
                        
                        {/* 예측 결과 */}
                        <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg p-4 border border-purple-500/20">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-purple-400 font-semibold">
                              {exportSelectedMatch.prediction?.resultKo || '-'}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-white font-bold text-xl">
                                {exportSelectedMatch.probability?.[exportSelectedMatch.prediction?.result?.toLowerCase()] || 0}%
                              </span>
                              <span className="text-gray-400">|</span>
                              <span className="text-yellow-400 font-semibold">
                                파워차 {exportSelectedMatch.power?.diff || 0}
                              </span>
                            </div>
                          </div>
                          
                          {/* 분석 근거 */}
                          {exportSelectedMatch.prediction?.reasons?.length > 0 && (
                            <div className="text-xs text-gray-300 space-y-1">
                              <div className="text-gray-500 mb-1">분석 근거</div>
                              {exportSelectedMatch.prediction.reasons.slice(0, 4).map((r: string, i: number) => (
                                <div key={i}>• {r}</div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* 배당 */}
                        <div className="bg-gray-900/50 rounded-lg p-3">
                          <div className="text-xs text-gray-500 mb-2">배당</div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-gray-800 rounded p-2">
                              <div className="text-yellow-400 font-bold">{exportSelectedMatch.odds?.home?.toFixed(2) || '-'}</div>
                              <div className="text-[10px] text-gray-500">홈승</div>
                            </div>
                            <div className="bg-gray-800 rounded p-2">
                              <div className="text-yellow-400 font-bold">{exportSelectedMatch.odds?.draw?.toFixed(2) || '-'}</div>
                              <div className="text-[10px] text-gray-500">무승부</div>
                            </div>
                            <div className="bg-gray-800 rounded p-2">
                              <div className="text-yellow-400 font-bold">{exportSelectedMatch.odds?.away?.toFixed(2) || '-'}</div>
                              <div className="text-[10px] text-gray-500">원정승</div>
                            </div>
                          </div>
                        </div>
                        
                        {/* 파워 지수 */}
                        <div className="bg-gray-900/50 rounded-lg p-3">
                          <div className="text-xs text-gray-500 mb-2">파워 지수</div>
                          <div className="flex items-center gap-3">
                            <div className="text-blue-400 font-bold text-xl w-12">{exportSelectedMatch.power?.home || 0}</div>
                            <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden flex">
                              <div 
                                className="bg-blue-500 h-full transition-all" 
                                style={{ width: `${exportSelectedMatch.power?.home && exportSelectedMatch.power?.away 
                                  ? (exportSelectedMatch.power.home / (exportSelectedMatch.power.home + exportSelectedMatch.power.away)) * 100 
                                  : 50}%` }} 
                              />
                              <div 
                                className="bg-red-500 h-full transition-all" 
                                style={{ width: `${exportSelectedMatch.power?.home && exportSelectedMatch.power?.away 
                                  ? (exportSelectedMatch.power.away / (exportSelectedMatch.power.home + exportSelectedMatch.power.away)) * 100 
                                  : 50}%` }} 
                              />
                            </div>
                            <div className="text-red-400 font-bold text-xl w-12 text-right">{exportSelectedMatch.power?.away || 0}</div>
                          </div>
                        </div>
                        
                        {/* 최종 예측 확률 */}
                        <div className="bg-gray-900/50 rounded-lg p-3">
                          <div className="text-xs text-gray-500 mb-2">최종 예측 확률</div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className={`p-2 rounded ${exportSelectedMatch.prediction?.result === 'HOME' ? 'bg-blue-500/20 border border-blue-500' : 'bg-gray-800'}`}>
                              <div className="text-lg font-bold text-white">{exportSelectedMatch.probability?.home || 0}%</div>
                              <div className="text-xs text-gray-400">홈승</div>
                            </div>
                            <div className={`p-2 rounded ${exportSelectedMatch.prediction?.result === 'DRAW' ? 'bg-gray-500/30 border border-gray-500' : 'bg-gray-800'}`}>
                              <div className="text-lg font-bold text-white">{exportSelectedMatch.probability?.draw || 0}%</div>
                              <div className="text-xs text-gray-400">무승부</div>
                            </div>
                            <div className={`p-2 rounded ${exportSelectedMatch.prediction?.result === 'AWAY' ? 'bg-red-500/20 border border-red-500' : 'bg-gray-800'}`}>
                              <div className="text-lg font-bold text-white">{exportSelectedMatch.probability?.away || 0}%</div>
                              <div className="text-xs text-gray-400">원정승</div>
                            </div>
                          </div>
                        </div>
                        
                        {/* 팀 상세 통계 */}
                        {exportSelectedMatch.teamStats && (
                          <div className="bg-gray-900/50 rounded-lg p-3">
                            <div className="text-xs text-gray-500 mb-2">팀 상세 통계</div>
                            <div className="space-y-2">
                              {/* 선제골 승률 */}
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-blue-400 w-16">{formatPercent(exportSelectedMatch.teamStats.home?.firstGoalWinRate)}%</span>
                                <span className="text-gray-500 text-xs">선제골 승률</span>
                                <span className="text-red-400 w-16 text-right">{formatPercent(exportSelectedMatch.teamStats.away?.firstGoalWinRate)}%</span>
                              </div>
                              {/* 역전률 */}
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-blue-400 w-16">{formatPercent(exportSelectedMatch.teamStats.home?.comebackRate)}%</span>
                                <span className="text-gray-500 text-xs">역전률</span>
                                <span className="text-red-400 w-16 text-right">{formatPercent(exportSelectedMatch.teamStats.away?.comebackRate)}%</span>
                              </div>
                              {/* 최근 폼 */}
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-blue-400 w-16">{formatNumber(exportSelectedMatch.teamStats.home?.recentForm, 1)}</span>
                                <span className="text-gray-500 text-xs">최근 폼</span>
                                <span className="text-red-400 w-16 text-right">{formatNumber(exportSelectedMatch.teamStats.away?.recentForm, 1)}</span>
                              </div>
                              {/* 득실비 */}
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-blue-400 w-16">{formatNumber(exportSelectedMatch.teamStats.home?.goalRatio)}</span>
                                <span className="text-gray-500 text-xs">득실비</span>
                                <span className="text-red-400 w-16 text-right">{formatNumber(exportSelectedMatch.teamStats.away?.goalRatio)}</span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* 3-Method 분석 */}
                        {exportSelectedMatch.method3 && (exportSelectedMatch.method3.method1 || exportSelectedMatch.method3.method2 || exportSelectedMatch.method3.method3) && (
                          <div className="bg-gray-900/50 rounded-lg p-3">
                            <div className="text-xs text-gray-500 mb-2">3-Method 분석</div>
                            <div className="space-y-1.5 text-sm">
                              {exportSelectedMatch.method3.method1 && (
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-400">P/A 비교</span>
                                  <span className="text-white">홈 {exportSelectedMatch.method3.method1.home}%</span>
                                </div>
                              )}
                              {exportSelectedMatch.method3.method2 && (
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-400">Min-Max</span>
                                  <span className="text-white">홈 {exportSelectedMatch.method3.method2.home}%</span>
                                </div>
                              )}
                              {exportSelectedMatch.method3.method3 && (
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-400">선제골</span>
                                  <span className="text-white">홈 {exportSelectedMatch.method3.method3.home}%</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* 패턴 분석 */}
                        {exportSelectedMatch.pattern && exportSelectedMatch.pattern.totalMatches > 0 && (
                          <div className="bg-gray-900/50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-gray-500">패턴</span>
                              <span className="text-amber-400 font-mono font-bold">{exportSelectedMatch.pattern.code}</span>
                            </div>
                            <div className="text-xs text-gray-500 mb-2">
                              ({exportSelectedMatch.pattern.totalMatches}경기 기반)
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-400">패턴 역대</span>
                              <span className="text-white">
                                홈 {formatPercent(exportSelectedMatch.pattern.homeWinRate)}% / 무 {formatPercent(exportSelectedMatch.pattern.drawRate)}% / 원정 {formatPercent(exportSelectedMatch.pattern.awayWinRate)}%
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {/* P/A 비교 */}
                        {exportSelectedMatch.pa && (
                          <div className="bg-gray-900/50 rounded-lg p-3">
                            <div className="text-xs text-gray-500 mb-2">P/A 득실 지수</div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="text-blue-400 font-semibold mb-1">{exportSelectedMatch.homeTeamKo}</div>
                                <div className="text-xs text-gray-400">전체: {formatNumber(exportSelectedMatch.pa.home?.all)}</div>
                                <div className="text-xs text-gray-400">최근5: {formatNumber(exportSelectedMatch.pa.home?.five)}</div>
                                <div className="text-xs text-gray-400">선제골: {formatNumber(exportSelectedMatch.pa.home?.firstGoal)}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-red-400 font-semibold mb-1">{exportSelectedMatch.awayTeamKo}</div>
                                <div className="text-xs text-gray-400">전체: {formatNumber(exportSelectedMatch.pa.away?.all)}</div>
                                <div className="text-xs text-gray-400">최근5: {formatNumber(exportSelectedMatch.pa.away?.five)}</div>
                                <div className="text-xs text-gray-400">선제골: {formatNumber(exportSelectedMatch.pa.away?.firstGoal)}</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

      {/* 💵 매출 관리 탭 */}
      {activeTab === 'revenue' && (
        <div className="w-full px-3 md:px-6 py-4 md:py-6 max-w-6xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">💵 매출 관리</h2>
            <button
              onClick={fetchRevenue}
              disabled={revenueLoading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
            >
              {revenueLoading ? '⏳ 로딩...' : '🔄 새로고침'}
            </button>
          </div>

          {/* 기간 필터 */}
          <div className="flex items-center gap-2">
            {([['all','전체'], ['7','최근 7일'], ['30','최근 30일'], ['90','최근 90일']] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setRevenueFilter(val)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  revenueFilter === val
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 실제 매출 데이터 - status=success만 */}
          {(() => {
            const now = new Date()
            const filtered = payments.filter(p => {
              if (p.status !== 'success') return false
              if (revenueFilter === 'all') return true
              const days = parseInt(revenueFilter)
              const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
              return new Date(p.created_at) >= cutoff
            })

            const totalRevenue = filtered.reduce((sum, p) => sum + (p.amount || 0), 0)
            const todayRevenue = filtered.filter(p => {
              const d = new Date(p.created_at)
              return d.toDateString() === now.toDateString()
            }).reduce((sum, p) => sum + (p.amount || 0), 0)

            // 월별 집계
            const monthly: Record<string, number> = {}
            filtered.forEach(p => {
              const month = p.created_at.slice(0, 7)
              monthly[month] = (monthly[month] || 0) + p.amount
            })
            const monthEntries = Object.entries(monthly).sort(([a],[b]) => a.localeCompare(b))
            const maxMonthly = Math.max(...Object.values(monthly), 1)

            return (
              <>
                {/* 요약 카드 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                  <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-800/20 rounded-xl p-5 border border-emerald-500/30">
                    <div className="text-xs text-emerald-400 mb-1">실제 총 매출</div>
                    <div className="text-2xl font-bold text-white">{formatCurrency(totalRevenue)}</div>
                    <div className="text-xs text-gray-500 mt-1">성공 결제만 집계</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4 md:p-5 border border-gray-700/50">
                    <div className="text-xs text-gray-400 mb-1">오늘 매출</div>
                    <div className="text-2xl font-bold text-white">{formatCurrency(todayRevenue)}</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4 md:p-5 border border-gray-700/50">
                    <div className="text-xs text-gray-400 mb-1">결제 건수</div>
                    <div className="text-2xl font-bold text-white">{filtered.length}건</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4 md:p-5 border border-gray-700/50">
                    <div className="text-xs text-gray-400 mb-1">건당 평균</div>
                    <div className="text-2xl font-bold text-white">
                      {filtered.length > 0 ? formatCurrency(Math.round(totalRevenue / filtered.length)) : '-'}
                    </div>
                  </div>
                </div>

                {/* 월별 매출 바 차트 */}
                {monthEntries.length > 0 && (
                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                    <h3 className="text-white font-bold mb-5">📊 월별 실매출</h3>
                    <div className="flex items-end gap-3 h-40">
                      {monthEntries.slice(-12).map(([month, rev]) => (
                        <div key={month} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                          <div className="text-[10px] text-emerald-400 font-medium truncate w-full text-center">
                            {formatCurrency(rev)}
                          </div>
                          <div
                            className="w-full bg-emerald-500/70 hover:bg-emerald-400/80 rounded-t transition-colors cursor-default"
                            style={{ height: `${(rev / maxMonthly) * 130}px`, minHeight: '4px' }}
                            title={`${month}: ${formatCurrency(rev)}`}
                          />
                          <div className="text-[10px] text-gray-500">{month.slice(5)}월</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 실매출 상세 테이블 */}
                <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-700/50 flex items-center justify-between">
                    <h3 className="text-white font-bold">✅ 성공 결제 내역 ({filtered.length}건)</h3>
                    <span className="text-xs text-gray-500">취소/실패 제외</span>
                  </div>
                  {filtered.length === 0 ? (
                    <div className="px-5 py-12 text-center text-gray-500">결제 내역이 없습니다</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-900/50">
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">일시</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">이메일</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">플랜</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">금액</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">카드</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">승인번호</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">주문번호</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/50">
                          {filtered.map((p) => (
                            <tr key={p.id} className="hover:bg-gray-700/20 transition-colors">
                              <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">
                                {formatDateTime(p.created_at)}
                              </td>
                              <td className="px-4 py-3 text-sm text-white">{p.user_email}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  p.plan === 'yearly' ? 'bg-orange-500/20 text-orange-400' :
                                  p.plan === 'quarterly' ? 'bg-purple-500/20 text-purple-400' :
                                  'bg-blue-500/20 text-blue-400'
                                }`}>
                                  {p.plan === 'yearly' ? '연간' : p.plan === 'quarterly' ? '3개월' : '월간'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-emerald-400 font-bold text-right">
                                {formatCurrency(p.amount)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-400">{p.card_name || '-'}</td>
                              <td className="px-4 py-3 text-sm text-gray-500 font-mono">{p.approval_number || '-'}</td>
                              <td className="px-4 py-3 text-xs text-gray-600 font-mono">{p.order_id || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )
          })()}
        </div>
      )}

      {/* ⚾ 선발 관리 탭 */}
      {activeTab === 'pitcher' && (
        <div className="w-full px-3 md:px-6 py-4 md:py-6 max-w-4xl space-y-6">
          <h2 className="text-xl font-bold text-white">⚾ 선발 투수 관리</h2>

          {/* 리그 + 날짜 선택 */}
          <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700 flex flex-wrap gap-3 items-end">
            {/* 리그 선택 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">리그</label>
              <div className="flex gap-2">
                {(['KBO', 'NPB', 'CPBL'] as const).map(lg => (
                  <button
                    key={lg}
                    onClick={() => setPitcherLeague(lg)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                      pitcherLeague === lg
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >{lg}</button>
                ))}
              </div>
            </div>

            {/* 날짜 선택 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">날짜</label>
              <input
                type="date"
                value={pitcherDate}
                onChange={e => setPitcherDate(e.target.value)}
                className="bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              onClick={fetchPitcherMatches}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >🔍 조회</button>
          </div>

          {/* 경기 목록 */}
          {pitcherMatchesLoading ? (
            <div className="text-center text-gray-400 py-12">⏳ 불러오는 중...</div>
          ) : pitcherMatches.length === 0 ? (
            <div className="text-center text-gray-500 py-12">해당 날짜에 경기가 없어요</div>
          ) : (
            <div className="space-y-3">
              {pitcherMatches.map(match => {
                const edit = pitcherEdits[match.id] || { home: '', away: '' }
                const saving = pitcherSaving[match.id]
                const saved = pitcherSaved[match.id]
                const awayName = match.away_team_ko || TEAM_MAP[match.away_team] || match.away_team
                const homeName = match.home_team_ko || TEAM_MAP[match.home_team] || match.home_team

                return (
                  <div key={match.id} className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
                    {/* 경기 헤더 */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-400">
                        {match.match_time ? match.match_time.slice(0, 5) : ''}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        match.status === 'NS' ? 'bg-blue-900/40 text-blue-400' :
                        match.status === 'FT' ? 'bg-gray-700 text-gray-400' :
                        'bg-yellow-900/40 text-yellow-400'
                      }`}>{match.status}</span>
                    </div>

                    {/* 팀 매치업 + 선발 입력 */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* 원정 */}
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-bold text-red-400">원정 — {awayName}</span>
                        {pitcherLeague !== 'CPBL' ? (
                          <select
                            value={edit.away}
                            onChange={e => setPitcherEdits(prev => ({
                              ...prev,
                              [match.id]: { ...prev[match.id], away: e.target.value }
                            }))}
                            className="bg-gray-700 text-white rounded-lg px-2 py-1.5 text-sm border border-gray-600 focus:outline-none focus:border-emerald-500"
                          >
                            <option value="">선발 미정</option>
                            {kboPitchers
                              .filter(p => p.team === awayName || p.team === TEAM_MAP[match.away_team])
                              .map(p => (
                                <option key={`${p.name}-${p.team}`} value={p.name}>{p.name}{p.pitch_hand === '좌' ? ' (좌)' : ''}</option>
                              ))
                            }
                            <optgroup label="전체">
                              {kboPitchers.map(p => (
                                <option key={`all-${p.name}-${p.team}`} value={p.name}>{p.name} ({p.team}){p.pitch_hand === '좌' ? ' 좌' : ''}</option>
                              ))}
                            </optgroup>
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={edit.away}
                            onChange={e => setPitcherEdits(prev => ({
                              ...prev,
                              [match.id]: { ...prev[match.id], away: e.target.value }
                            }))}
                            placeholder="선발 투수명"
                            className="bg-gray-700 text-white rounded-lg px-2 py-1.5 text-sm border border-gray-600 focus:outline-none focus:border-emerald-500"
                          />
                        )}
                      </div>

                      {/* 홈 */}
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-bold text-blue-400">홈 — {homeName}</span>
                        {pitcherLeague !== 'CPBL' ? (
                          <select
                            value={edit.home}
                            onChange={e => setPitcherEdits(prev => ({
                              ...prev,
                              [match.id]: { ...prev[match.id], home: e.target.value }
                            }))}
                            className="bg-gray-700 text-white rounded-lg px-2 py-1.5 text-sm border border-gray-600 focus:outline-none focus:border-emerald-500"
                          >
                            <option value="">선발 미정</option>
                            {kboPitchers
                              .filter(p => p.team === homeName || p.team === TEAM_MAP[match.home_team])
                              .map(p => (
                                <option key={`${p.name}-${p.team}`} value={p.name}>{p.name}{p.pitch_hand === '좌' ? ' (좌)' : ''}</option>
                              ))
                            }
                            <optgroup label="전체">
                              {kboPitchers.map(p => (
                                <option key={`all-${p.name}-${p.team}`} value={p.name}>{p.name} ({p.team}){p.pitch_hand === '좌' ? ' 좌' : ''}</option>
                              ))}
                            </optgroup>
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={edit.home}
                            onChange={e => setPitcherEdits(prev => ({
                              ...prev,
                              [match.id]: { ...prev[match.id], home: e.target.value }
                            }))}
                            placeholder="선발 투수명"
                            className="bg-gray-700 text-white rounded-lg px-2 py-1.5 text-sm border border-gray-600 focus:outline-none focus:border-emerald-500"
                          />
                        )}
                      </div>
                    </div>

                    {/* 저장 버튼 */}
                    <div className="flex justify-end mt-3">
                      <button
                        onClick={() => savePitcher(match.id)}
                        disabled={saving}
                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                          saved
                            ? 'bg-emerald-700 text-white'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50'
                        }`}
                      >
                        {saving ? '저장 중...' : saved ? '✅ 저장됨' : '저장'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 📣 공지 관리 탭 */}
      {activeTab === 'notices' && (
        <div className="w-full px-3 md:px-6 py-4 md:py-6 max-w-4xl space-y-6">
          <h2 className="text-xl font-bold text-white">📣 공지 롤링 배너 관리</h2>

          {/* 작성/수정 폼 */}
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <h3 className="text-base font-semibold text-white mb-4">
              {editingNotice ? '✏️ 공지 수정' : '➕ 새 공지 추가'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">한글 메시지 *</label>
                <input
                  type="text"
                  value={noticeForm.message}
                  onChange={e => setNoticeForm({ ...noticeForm, message: e.target.value })}
                  placeholder="예: 🔥 오늘의 PICK이 업데이트됐습니다!"
                  className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">영어 메시지 (선택)</label>
                <input
                  type="text"
                  value={noticeForm.message_en}
                  onChange={e => setNoticeForm({ ...noticeForm, message_en: e.target.value })}
                  placeholder="예: 🔥 Today's PICK is updated!"
                  className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-400">표시 순서</label>
                  <input
                    type="number"
                    value={noticeForm.display_order}
                    onChange={e => setNoticeForm({ ...noticeForm, display_order: parseInt(e.target.value) || 0 })}
                    className="w-20 px-3 py-2 bg-gray-900 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500"
                    min={0}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setNoticeForm({ ...noticeForm, is_active: !noticeForm.is_active })}
                    className={`relative w-10 h-6 rounded-full transition-colors ${noticeForm.is_active ? 'bg-orange-500' : 'bg-gray-600'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${noticeForm.is_active ? 'left-5' : 'left-1'}`} />
                  </button>
                  <span className="text-sm text-gray-400">{noticeForm.is_active ? '활성' : '비활성'}</span>
                </div>
              </div>

              {/* 노출 기간 예약 */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl" style={{ background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.2)' }}>
                <div>
                  <label className="block text-xs text-orange-400 mb-1.5 font-medium">📅 노출 시작 (선택)</label>
                  <input
                    type="datetime-local"
                    value={noticeForm.start_at}
                    onChange={e => setNoticeForm({ ...noticeForm, start_at: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:border-orange-500"
                  />
                  <p className="text-[10px] text-gray-600 mt-1">비워두면 즉시 노출</p>
                </div>
                <div>
                  <label className="block text-xs text-orange-400 mb-1.5 font-medium">⏰ 노출 종료 (선택)</label>
                  <input
                    type="datetime-local"
                    value={noticeForm.end_at}
                    onChange={e => setNoticeForm({ ...noticeForm, end_at: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:border-orange-500"
                  />
                  <p className="text-[10px] text-gray-600 mt-1">비워두면 무기한 노출</p>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                {editingNotice && (
                  <button
                    onClick={() => { setEditingNotice(null); setNoticeForm({ message: '', message_en: '', is_active: true, display_order: 0 }) }}
                    className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition-colors"
                  >
                    취소
                  </button>
                )}
                <button
                  onClick={handleNoticeSave}
                  disabled={noticeSaving || !noticeForm.message.trim()}
                  className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  {noticeSaving ? '저장 중...' : editingNotice ? '수정 완료' : '추가'}
                </button>
              </div>
            </div>
          </div>

          {/* 공지 목록 */}
          <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-300">전체 공지 ({notices.length}개)</span>
              <button onClick={loadNotices} className="text-xs text-gray-500 hover:text-gray-300">새로고침</button>
            </div>
            {noticesLoading ? (
              <div className="p-8 text-center text-gray-500 text-sm">불러오는 중...</div>
            ) : notices.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">등록된 공지가 없습니다</div>
            ) : (
              <div className="divide-y divide-gray-700">
                {notices.map(notice => {
                  const now = new Date()
                  const isScheduled = notice.start_at && new Date(notice.start_at) > now
                  const isExpired = notice.end_at && new Date(notice.end_at) < now
                  const formatDt = (dt: string) => new Date(dt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })

                  return (
                    <div key={notice.id} className="px-6 py-4 flex items-start gap-4">
                      <span className="shrink-0 text-xs text-gray-500 mt-1 w-5 text-center">{notice.display_order}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white leading-relaxed">{notice.message}</p>
                        {notice.message_en && (
                          <p className="text-xs text-gray-500 mt-0.5">{notice.message_en}</p>
                        )}
                        {/* 노출 기간 */}
                        {(notice.start_at || notice.end_at) && (
                          <div className="flex items-center gap-2 mt-1.5">
                            {notice.start_at && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>
                                시작 {formatDt(notice.start_at)}
                              </span>
                            )}
                            {notice.end_at && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: isExpired ? 'rgba(239,68,68,0.15)' : 'rgba(249,115,22,0.15)', color: isExpired ? '#f87171' : '#fb923c' }}>
                                {isExpired ? '만료 ' : '종료 '}{formatDt(notice.end_at)}
                              </span>
                            )}
                          </div>
                        )}
                        {isScheduled && (
                          <span className="inline-block mt-1 text-[10px] text-yellow-400">⏳ 예약됨</span>
                        )}
                        {isExpired && (
                          <span className="inline-block mt-1 text-[10px] text-red-400">⚠️ 기간 만료</span>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <button
                          onClick={() => handleNoticeToggle(notice)}
                          className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                            notice.is_active && !isExpired
                              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                              : 'bg-gray-600/50 text-gray-400 hover:bg-gray-600'
                          }`}
                        >
                          {notice.is_active && !isExpired ? '활성' : '비활성'}
                        </button>
                        <button
                          onClick={() => handleNoticeEdit(notice)}
                          className="text-xs px-2.5 py-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-full font-medium transition-colors"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleNoticeDelete(notice.id)}
                          className="text-xs px-2.5 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-full font-medium transition-colors"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 미리보기 */}
          <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
            <h3 className="text-sm font-medium text-gray-400 mb-3">미리보기 (메인 페이지 노출 모습)</h3>
            <div className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs text-gray-300" style={{ minHeight: '34px' }}>
              <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#f97316', color: '#fff' }}>공지</span>
              <span className="truncate flex-1">{notices.find(n => n.is_active)?.message || '활성 공지가 없습니다'}</span>
              {notices.filter(n => n.is_active).length > 1 && (
                <span className="text-gray-500 text-[10px]">+{notices.filter(n => n.is_active).length - 1}개</span>
              )}
              <span className="text-gray-600 ml-1">✕</span>
            </div>
          </div>
        </div>
      )}
      </div>


      {/* 모바일 하단 탭바 */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 border-t border-gray-800 z-40 md:hidden">
        <div className="flex items-center justify-around px-2 py-1 safe-area-pb">
          {[
            { id: 'dashboard', icon: '📊', label: '대시보드' },
            { id: 'users', icon: '👥', label: '회원' },
            { id: 'subscriptions', icon: '💳', label: '구독' },
            { id: 'revenue', icon: '💵', label: '매출' },
            { id: 'blog', icon: '✍️', label: '블로그' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSidebarOpen(false) }}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors min-w-0 flex-1 ${
                activeTab === tab.id
                  ? 'text-emerald-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              <span className="text-[9px] font-medium leading-none mt-0.5 truncate">{tab.label}</span>
            </button>
          ))}
          {/* 더보기 버튼 */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-gray-500 hover:text-gray-300 transition-colors flex-1"
          >
            <span className="text-lg leading-none">☰</span>
            <span className="text-[9px] font-medium leading-none mt-0.5">더보기</span>
          </button>
        </div>
      </div>

      {/* 모바일 하단바 여백 */}
      <div className="h-16 md:hidden" />

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
    </div>
  )
}