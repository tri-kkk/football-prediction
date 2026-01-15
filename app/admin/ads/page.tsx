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

// ==================== 상수 ====================

const SLOT_TYPES = [
  { value: 'desktop_banner', label: '데스크톱 배너', size: '728×90' },
  { value: 'sidebar', label: '사이드바', size: '300×600' },
  { value: 'mobile_bottom', label: '모바일 하단', size: '320×50' },
]

const TABS = [
  { id: 'dashboard', label: '대시보드', icon: '📊' },
  { id: 'users', label: '회원 관리', icon: '👥' },
  { id: 'subscriptions', label: '구독 관리', icon: '💳' },
  { id: 'ads', label: '광고 관리', icon: '📢' },
  { id: 'report', label: '광고 리포트', icon: '📈' },
  { id: 'blog', label: '블로그 관리', icon: '📝' },
]

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
          <div key={i} className="flex-1 flex flex-col items-center group relative">
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
  const [authLoading, setAuthLoading] = useState(true) // 초기 세션 확인 중
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null)
  const [lockoutCountdown, setLockoutCountdown] = useState<number | null>(null)
  
  // ===== 탭 상태 =====
  const [activeTab, setActiveTab] = useState('dashboard')
  
  // ===== 데이터 상태 =====
  const [users, setUsers] = useState<User[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [ads, setAds] = useState<Advertisement[]>([])
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [todayAdStats, setTodayAdStats] = useState<Record<string, AdStats>>({})
  
  // ===== 로딩/에러 상태 =====
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // ===== 필터 상태 =====
  const [userFilter, setUserFilter] = useState<'all' | 'free' | 'premium'>('all')
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
  
  // ===== Refs =====
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  // ==================== 인증 (보안 강화) ====================

  // 잠금 카운트다운
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

  // 초기 세션 확인
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

  // 로그인 처리 (서버 API 호출)
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
        
        // 잠금된 경우 카운트다운 시작
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

  // 로그아웃 처리 (서버 API 호출)
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
      setReportSummary(data.summary || [])
      
      // 광고별 성과 계산
      const adMap: Record<string, AdPerformance> = {}
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
      
      setAdPerformance(adList.sort((a, b) => b.totalImpressions - a.totalImpressions))
    } catch (err) {
      console.error('Report stats fetch error:', err)
    }
  }

  const loadAllData = async () => {
    setLoading(true)
    setError('')
    try {
      await Promise.all([
        fetchUsers(),
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

  // 리포트 탭 활성화 시 데이터 로드
  useEffect(() => {
    if (isAuthenticated && activeTab === 'report') {
      fetchReportStats()
    }
  }, [isAuthenticated, activeTab, reportDateRange, reportSlotFilter])

  // 블로그 탭 활성화 시 데이터 로드
  useEffect(() => {
    if (isAuthenticated && activeTab === 'blog') {
      fetchBlogPosts()
    }
  }, [isAuthenticated, activeTab])

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

  // 블로그 필터링
  const filteredBlogPosts = useMemo(() => {
    if (blogCategoryFilter === 'all') return blogPosts
    return blogPosts.filter(post => post.category === blogCategoryFilter)
  }, [blogPosts, blogCategoryFilter])

  // 블로그 카테고리 목록
  const blogCategories = useMemo(() => {
    const cats = new Set(blogPosts.map(p => p.category))
    return Array.from(cats)
  }, [blogPosts])

  // 블로그 통계
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
  }, [users, userFilter, userSearch])

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

  // 초기 로딩 중
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

  // 로그인 화면
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
            
            {/* 에러 메시지 */}
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
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    확인 중...
                  </>
                ) : lockoutCountdown !== null ? (
                  `잠김 (${Math.floor(lockoutCountdown / 60)}:${String(lockoutCountdown % 60).padStart(2, '0')})`
                ) : (
                  '로그인'
                )}
              </button>
            </form>
            
            {/* 보안 안내 */}
            <div className="mt-6 pt-6 border-t border-gray-700">
              <p className="text-gray-500 text-xs text-center">
                🔒 5회 실패 시 5분간 잠금됩니다
              </p>
            </div>
          </div>
          
          {/* 돌아가기 링크 */}
          <div className="text-center mt-4">
            <a href="/" className="text-gray-400 hover:text-white text-sm transition-colors">
              ← 메인 페이지로 돌아가기
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-2xl">⚽</span>
              <div>
                <h1 className="text-xl font-bold text-white">TrendSoccer Admin</h1>
                <p className="text-xs text-gray-500">관리자 대시보드</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as '7' | '14' | '30')}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="7">최근 7일</option>
                <option value="14">최근 14일</option>
                <option value="30">최근 30일</option>
              </select>
              
              <button
                onClick={loadAllData}
                disabled={loading}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {loading ? '⏳' : '🔄'} 새로고침
              </button>
              
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm transition-colors"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 탭 네비게이션 */}
      <nav className="bg-gray-800/50 border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
                  activeTab === tab.id
                    ? 'text-emerald-400 border-emerald-400 bg-emerald-500/5'
                    : 'text-gray-400 border-transparent hover:text-gray-300 hover:bg-gray-700/30'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
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
                            <div className="text-white font-medium">{user.name || '이름 없음'}</div>
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

            {/* 회원 관리 탭 */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                {/* 필터 & 검색 */}
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <div className="flex items-center gap-2">
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
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-900/50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">회원</th>
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
                          <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
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

                {/* 페이지네이션 (간단 버전) */}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>총 {filteredUsers.length}명</span>
                </div>
              </div>
            )}

            {/* 구독 관리 탭 */}
            {activeTab === 'subscriptions' && (
              <div className="space-y-6">
                {/* 구독 요약 */}
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

                {/* 필터 */}
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

                {/* 구독 목록 */}
                <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
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
                            <td className="px-4 py-4 text-sm text-white">
                              {formatCurrency(sub.price || (sub.plan === 'yearly' ? 79000 : 9900))}
                            </td>
                            <td className="px-4 py-4 text-right">
                              {sub.status === 'active' && (
                                <button
                                  onClick={() => handleCancelSubscription(sub.id)}
                                  className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-sm transition-colors"
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
            )}

            {/* 광고 관리 탭 */}
            {activeTab === 'ads' && (
              <div className="space-y-6">
                {/* 광고 추가 버튼 & 필터 */}
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                    <button
                      onClick={() => setAdFilter('all')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                        adFilter === 'all'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      전체 ({ads.length})
                    </button>
                    {SLOT_TYPES.map((slot) => (
                      <button
                        key={slot.value}
                        onClick={() => setAdFilter(slot.value)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                          adFilter === slot.value
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        {slot.label} ({ads.filter(a => a.slot_type === slot.value).length})
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => {
                      resetAdForm()
                      setEditingAd(null)
                      setIsAdModalOpen(true)
                    }}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <span>➕</span> 광고 추가
                  </button>
                </div>

                {/* 광고 목록 */}
                <div className="grid gap-4">
                  {filteredAds.length === 0 ? (
                    <div className="text-center py-20 bg-gray-800/50 rounded-xl border border-gray-700/50">
                      <div className="text-4xl mb-4">📭</div>
                      <p className="text-gray-400">등록된 광고가 없습니다</p>
                    </div>
                  ) : (
                    filteredAds.map((ad) => (
                      <div
                        key={ad.id}
                        className={`bg-gray-800/50 rounded-xl overflow-hidden border ${
                          ad.is_active ? 'border-emerald-500/30' : 'border-gray-700/50'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row">
                          {/* 이미지 미리보기 */}
                          <div className="lg:w-80 p-4 bg-gray-900/50 flex items-center justify-center">
                            <div 
                              className="relative bg-gray-700 rounded-lg overflow-hidden"
                              style={{ 
                                maxWidth: ad.slot_type === 'sidebar' ? '150px' : '100%',
                                maxHeight: ad.slot_type === 'sidebar' ? '300px' : '90px'
                              }}
                            >
                              <img
                                src={ad.image_url}
                                alt={ad.alt_text || ad.name}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  e.currentTarget.src = 'https://via.placeholder.com/300x100?text=Image+Not+Found'
                                }}
                              />
                              {!ad.is_active && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                  <span className="text-gray-300 font-bold">비활성</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 정보 */}
                          <div className="flex-1 p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className="text-lg font-bold text-white mb-1">{ad.name}</h3>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    ad.slot_type === 'desktop_banner' ? 'bg-blue-500/20 text-blue-400' :
                                    ad.slot_type === 'sidebar' ? 'bg-purple-500/20 text-purple-400' :
                                    'bg-orange-500/20 text-orange-400'
                                  }`}>
                                    {SLOT_TYPES.find(s => s.value === ad.slot_type)?.label}
                                  </span>
                                  <span className="text-gray-500 text-xs">{ad.width}×{ad.height}</span>
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    ad.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'
                                  }`}>
                                    {ad.is_active ? '활성' : '비활성'}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-gray-500 text-xs">우선순위</span>
                                <div className="text-lg font-bold text-white">{ad.priority}</div>
                              </div>
                            </div>

                            {/* URL */}
                            <div className="mb-3 text-sm">
                              <div className="flex items-center gap-2 text-gray-400">
                                <span>🔗</span>
                                <a 
                                  href={ad.link_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="hover:text-emerald-400 truncate"
                                >
                                  {ad.link_url}
                                </a>
                              </div>
                            </div>

                            {/* 통계 */}
                            <div className="flex items-center gap-6 mb-4">
                              <div className="text-xs text-gray-500 mr-2">오늘</div>
                              <div>
                                <span className="text-gray-500 text-xs">노출</span>
                                <div className="text-white font-bold">{(todayAdStats[ad.id]?.impressions || 0).toLocaleString()}</div>
                              </div>
                              <div>
                                <span className="text-gray-500 text-xs">클릭</span>
                                <div className="text-white font-bold">{(todayAdStats[ad.id]?.clicks || 0).toLocaleString()}</div>
                              </div>
                              <div>
                                <span className="text-gray-500 text-xs">CTR</span>
                                <div className="text-emerald-400 font-bold">
                                  {calculateCTR(todayAdStats[ad.id]?.clicks || 0, todayAdStats[ad.id]?.impressions || 0)}%
                                </div>
                              </div>
                            </div>

                            {/* 액션 버튼 */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleToggleAdActive(ad)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  ad.is_active 
                                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                }`}
                              >
                                {ad.is_active ? '비활성화' : '활성화'}
                              </button>
                              <button
                                onClick={() => handleEditAd(ad)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                              >
                                수정
                              </button>
                              <button
                                onClick={() => handleAdDelete(ad.id)}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                              >
                                삭제
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 광고 리포트 탭 */}
            {activeTab === 'report' && (
              <div className="space-y-6">
                {/* 필터 바 */}
                <div className="flex flex-wrap items-center gap-4">
                  {/* 슬롯 필터 */}
                  <select
                    value={reportSlotFilter}
                    onChange={(e) => {
                      setReportSlotFilter(e.target.value)
                      setTimeout(fetchReportStats, 100)
                    }}
                    className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="all">전체</option>
                    {SLOT_TYPES.map(slot => (
                      <option key={slot.value} value={slot.value}>
                        {slot.label} ({slot.size})
                      </option>
                    ))}
                  </select>
                  
                  {/* 기간 필터 */}
                  <div className="flex gap-2">
                    {['7', '14', '30'].map(days => (
                      <button
                        key={days}
                        onClick={() => {
                          setReportDateRange(days)
                          setTimeout(fetchReportStats, 100)
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          reportDateRange === days
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                      >
                        {days}일
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={fetchReportStats}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    🔄 새로고침
                  </button>
                </div>

                {/* 총계 카드 */}
                {(() => {
                  const totalImpressions = reportSummary.reduce((acc, s) => acc + s.impressions, 0)
                  const totalClicks = reportSummary.reduce((acc, s) => acc + s.clicks, 0)
                  const totalCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
                  
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                        <div className="text-gray-400 text-sm mb-1">총 노출</div>
                        <div className="text-3xl font-bold text-white">
                          {totalImpressions.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                        <div className="text-gray-400 text-sm mb-1">총 클릭</div>
                        <div className="text-3xl font-bold text-emerald-400">
                          {totalClicks.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                        <div className="text-gray-400 text-sm mb-1">평균 CTR</div>
                        <div className="text-3xl font-bold text-blue-400">
                          {totalCTR.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* 일별 추이 차트 */}
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                  <h2 className="text-lg font-bold text-white mb-6">일별 추이</h2>
                  
                  {reportSummary.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      데이터가 없습니다
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(() => {
                        const maxImpressions = Math.max(...reportSummary.map(s => s.impressions), 1)
                        const maxClicks = Math.max(...reportSummary.map(s => s.clicks), 1)
                        
                        return reportSummary.slice(0, 14).reverse().map((day) => (
                          <div key={day.date} className="flex items-center gap-4">
                            <div className="w-24 text-sm text-gray-400">
                              {new Date(day.date).toLocaleDateString('ko-KR', { 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </div>
                            
                            <div className="flex-1 flex gap-2">
                              <div className="flex-1 h-6 bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                  style={{ width: `${(day.impressions / maxImpressions) * 100}%` }}
                                />
                              </div>
                              <div className="flex-1 h-6 bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                  style={{ width: `${(day.clicks / maxClicks) * 100}%` }}
                                />
                              </div>
                            </div>
                            
                            <div className="w-36 flex gap-4 text-sm">
                              <span className="text-blue-400 w-12 text-right">{day.impressions}</span>
                              <span className="text-emerald-400 w-8 text-right">{day.clicks}</span>
                              <span className="text-gray-500 w-12 text-right">
                                {day.impressions > 0 
                                  ? ((day.clicks / day.impressions) * 100).toFixed(1) 
                                  : 0}%
                              </span>
                            </div>
                          </div>
                        ))
                      })()}
                    </div>
                  )}
                  
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

                {/* 광고별 성과 테이블 */}
                <div className="bg-gray-800/50 rounded-xl overflow-hidden border border-gray-700/50">
                  <div className="p-6 border-b border-gray-700">
                    <h2 className="text-lg font-bold text-white">광고별 성과</h2>
                  </div>
                  
                  {adPerformance.length === 0 ? (
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
                          {adPerformance.map((ad) => (
                            <tr 
                              key={ad.id}
                              className="border-b border-gray-700/50 hover:bg-gray-700/30"
                            >
                              <td className="px-6 py-4 font-medium text-white">{ad.name}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  ad.slot_type === 'desktop_banner' ? 'bg-blue-500/20 text-blue-400' :
                                  ad.slot_type === 'sidebar' ? 'bg-purple-500/20 text-purple-400' :
                                  'bg-orange-500/20 text-orange-400'
                                }`}>
                                  {SLOT_TYPES.find(s => s.value === ad.slot_type)?.label || ad.slot_type}
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
                <div className="bg-gray-800/50 rounded-xl overflow-hidden border border-gray-700/50">
                  <div className="p-6 border-b border-gray-700">
                    <h2 className="text-lg font-bold text-white">일별 상세</h2>
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
                        {reportSummary.map((day) => {
                          const ctr = day.impressions > 0 
                            ? (day.clicks / day.impressions) * 100 
                            : 0
                          return (
                            <tr 
                              key={day.date}
                              className="border-b border-gray-700/50 hover:bg-gray-700/30"
                            >
                              <td className="px-6 py-4 text-white">
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
              </div>
            )}

            {/* 블로그 관리 탭 */}
            {activeTab === 'blog' && (
              <div className="space-y-6">
                {/* 블로그 통계 카드 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📝</span>
                      <div>
                        <div className="text-xl font-bold text-white">{blogStats.totalPosts}</div>
                        <div className="text-xs text-gray-400">전체 글</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">✅</span>
                      <div>
                        <div className="text-xl font-bold text-emerald-400">{blogStats.publishedPosts}</div>
                        <div className="text-xs text-gray-400">공개 글</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📋</span>
                      <div>
                        <div className="text-xl font-bold text-gray-400">{blogStats.totalPosts - blogStats.publishedPosts}</div>
                        <div className="text-xs text-gray-400">비공개 글</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">👁️</span>
                      <div>
                        <div className="text-xl font-bold text-blue-400">{blogStats.totalViews.toLocaleString()}</div>
                        <div className="text-xs text-gray-400">총 조회수</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 필터 & 버튼 */}
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setBlogCategoryFilter('all')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        blogCategoryFilter === 'all'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      전체 ({blogPosts.length})
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
                        {cat} ({blogPosts.filter(p => p.category === cat).length})
                      </button>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={fetchBlogPosts}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
                    >
                      🔄 새로고침
                    </button>
                    <a
                      href="/admin/blog/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      ✏️ 새 글 작성
                    </a>
                  </div>
                </div>

                {/* 블로그 목록 */}
                {blogLoading ? (
                  <div className="text-center py-20">
                    <div className="text-4xl mb-4 animate-bounce">📝</div>
                    <p className="text-gray-400">블로그 목록 불러오는 중...</p>
                  </div>
                ) : (
                  <div className="bg-gray-800/50 rounded-xl overflow-hidden border border-gray-700/50">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-900/50">
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">제목</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">카테고리</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">상태</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">조회수</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">작성일</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">관리</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/50">
                        {filteredBlogPosts.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                              <div className="text-4xl mb-2">📄</div>
                              아직 작성된 글이 없습니다
                            </td>
                          </tr>
                        ) : (
                          filteredBlogPosts.map((post) => (
                            <tr key={post.id} className="hover:bg-gray-700/20 transition-colors">
                              <td className="px-4 py-4">
                                <div className="font-medium text-white">{post.title_kr}</div>
                                <div className="text-xs text-gray-500 mt-1">/{post.slug}</div>
                              </td>
                              <td className="px-4 py-4">
                                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                                  {post.category}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <button
                                  onClick={() => handleTogglePublish(post.id, post.published)}
                                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                    post.published
                                      ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                  }`}
                                >
                                  {post.published ? '✓ 공개' : '비공개'}
                                </button>
                              </td>
                              <td className="px-4 py-4 text-center text-sm text-white">
                                {(post.views || 0).toLocaleString()}
                              </td>
                              <td className="px-4 py-4 text-center text-sm text-gray-400">
                                {formatDate(post.created_at)}
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex items-center justify-center gap-2">
                                  <a
                                    href={`/blog/${post.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs transition-colors"
                                  >
                                    보기
                                  </a>
                                  <a
                                    href={`/admin/blog/edit/${post.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors"
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

                {/* 블로그 링크 */}
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
              {/* 광고명 */}
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

              {/* 슬롯 타입 */}
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

              {/* 이미지 URL */}
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

              {/* 링크 URL */}
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

              {/* 대체 텍스트 */}
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

              {/* 우선순위 */}
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

              {/* 기간 설정 */}
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

              {/* 버튼 */}
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