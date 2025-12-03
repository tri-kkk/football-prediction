'use client'

import React, { useState, useEffect, useRef } from 'react'

// 광고 타입 정의
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

// 슬롯 타입 정보
const SLOT_TYPES = [
  { value: 'desktop_banner', label: '데스크톱 배너', size: '728×90' },
  { value: 'sidebar', label: '사이드바', size: '300×600' },
  { value: 'mobile_bottom', label: '모바일 하단', size: '320×50' },
]

export default function AdminAdsPage() {
  // 인증 상태
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  
  // 광고 데이터
  const [ads, setAds] = useState<Advertisement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null)
  
  // 폼 데이터
  const [formData, setFormData] = useState({
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
  
  // 이미지 업로드
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  
  // 필터
  const [filterSlot, setFilterSlot] = useState<string>('all')
  
  // 오늘 통계
  const [todayStats, setTodayStats] = useState<Record<string, { impressions: number; clicks: number }>>({})

  // 관리자 비밀번호 확인 (환경변수 또는 하드코딩)
  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'trendsoccer2024!'

  // 인증 처리
  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      setAuthError('')
      // 세션 스토리지에 저장 (탭 닫으면 만료)
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

  // 광고 목록 불러오기
  const fetchAds = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/ads')
      if (!response.ok) throw new Error('광고 목록을 불러오는데 실패했습니다')
      const data = await response.json()
      setAds(data.ads || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 오늘 통계 불러오기
  const fetchTodayStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const response = await fetch(`/api/ads/track?start=${today}&end=${today}`)
      if (!response.ok) return
      
      const data = await response.json()
      const statsMap: Record<string, { impressions: number; clicks: number }> = {}
      
      for (const stat of data.stats || []) {
        statsMap[stat.ad_id] = {
          impressions: stat.impressions || 0,
          clicks: stat.clicks || 0
        }
      }
      
      setTodayStats(statsMap)
    } catch (err) {
      console.error('오늘 통계 로드 에러:', err)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchAds()
      fetchTodayStats()
    }
  }, [isAuthenticated])

  // 슬롯 타입 변경 시 크기 자동 설정
  const handleSlotTypeChange = (slotType: string) => {
    const sizes: Record<string, { width: number; height: number }> = {
      desktop_banner: { width: 728, height: 90 },
      sidebar: { width: 300, height: 600 },
      mobile_bottom: { width: 320, height: 50 },
    }
    setFormData({
      ...formData,
      slot_type: slotType,
      ...sizes[slotType],
    })
  }

  // 이미지 업로드 처리
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
      setFormData({ ...formData, image_url: data.url })
    } catch (err) {
      alert('이미지 업로드에 실패했습니다. URL을 직접 입력해주세요.')
    } finally {
      setUploading(false)
    }
  }

  // 광고 저장 (생성/수정)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.image_url || !formData.link_url) {
      alert('필수 항목을 모두 입력해주세요')
      return
    }

    try {
      const method = editingAd ? 'PUT' : 'POST'
      const body = editingAd 
        ? { ...formData, id: editingAd.id }
        : formData

      const response = await fetch('/api/ads', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) throw new Error('저장 실패')
      
      setIsModalOpen(false)
      setEditingAd(null)
      resetForm()
      fetchAds()
      fetchTodayStats()
    } catch (err) {
      alert('저장에 실패했습니다')
    }
  }

  // 광고 삭제
  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/ads?id=${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('삭제 실패')
      fetchAds()
      fetchTodayStats()
    } catch (err) {
      alert('삭제에 실패했습니다')
    }
  }

  // 활성화 토글
  const handleToggleActive = async (ad: Advertisement) => {
    try {
      const response = await fetch('/api/ads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ad.id, is_active: !ad.is_active }),
      })
      if (!response.ok) throw new Error('업데이트 실패')
      fetchAds()
      fetchTodayStats()
    } catch (err) {
      alert('상태 변경에 실패했습니다')
    }
  }

  // 폼 초기화
  const resetForm = () => {
    setFormData({
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

  // 수정 모드
  const handleEdit = (ad: Advertisement) => {
    setEditingAd(ad)
    setFormData({
      name: ad.name,
      slot_type: ad.slot_type,
      image_url: ad.image_url,
      link_url: ad.link_url,
      alt_text: ad.alt_text || '',
      width: ad.width,
      height: ad.height,
      priority: ad.priority,
      start_date: ad.start_date ? ad.start_date.split('T')[0] : '',
      end_date: ad.end_date ? ad.end_date.split('T')[0] : '',
    })
    setIsModalOpen(true)
  }

  // 필터링된 광고 목록
  const filteredAds = filterSlot === 'all' 
    ? ads 
    : ads.filter(ad => ad.slot_type === filterSlot)

  // CTR 계산
  const calculateCTR = (clicks: number, impressions: number) => {
    if (impressions === 0) return '0.00'
    return ((clicks / impressions) * 100).toFixed(2)
  }

  // 로그인 화면
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">🔐 광고 관리자</h1>
            <p className="text-gray-400">TrendSoccer 광고 관리 시스템</p>
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

  // 메인 관리 화면
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* 헤더 */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">📢 광고 관리</h1>
            <span className="text-gray-400 text-sm">TrendSoccer</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/admin/ads/report"
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              📊 리포트
            </a>
            <button
              onClick={() => {
                sessionStorage.removeItem('ads_admin_auth')
                setIsAuthenticated(false)
              }}
              className="text-gray-400 hover:text-white text-sm"
            >
              로그아웃
            </button>
            <a
              href="/"
              className="text-emerald-400 hover:text-emerald-300 text-sm"
            >
              ← 메인으로
            </a>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto p-6">
        {/* 상단 액션 바 */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            {/* 필터 */}
            <select
              value={filterSlot}
              onChange={(e) => setFilterSlot(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">전체 슬롯</option>
              {SLOT_TYPES.map(slot => (
                <option key={slot.value} value={slot.value}>
                  {slot.label} ({slot.size})
                </option>
              ))}
            </select>
            
            <span className="text-gray-400 text-sm">
              총 {filteredAds.length}개
            </span>
          </div>

          {/* 새 광고 버튼 */}
          <button
            onClick={() => {
              setEditingAd(null)
              resetForm()
              setIsModalOpen(true)
            }}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
          >
            <span>➕</span>
            <span>새 광고 등록</span>
          </button>
        </div>

        {/* 로딩 */}
        {loading && (
          <div className="text-center py-20">
            <div className="text-4xl mb-4 animate-bounce">📢</div>
            <p className="text-gray-400">광고 목록 불러오는 중...</p>
          </div>
        )}

        {/* 에러 */}
        {error && (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">❌</div>
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* 광고 목록 */}
        {!loading && !error && (
          <div className="grid gap-4">
            {filteredAds.length === 0 ? (
              <div className="text-center py-20 bg-gray-800 rounded-xl">
                <div className="text-4xl mb-4">📭</div>
                <p className="text-gray-400">등록된 광고가 없습니다</p>
              </div>
            ) : (
              filteredAds.map((ad) => (
                <div
                  key={ad.id}
                  className={`bg-gray-800 rounded-xl overflow-hidden border ${
                    ad.is_active ? 'border-emerald-500/30' : 'border-gray-700'
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
                            <span className="text-gray-500 text-xs">
                              {ad.width}×{ad.height}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              ad.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'
                            }`}>
                              {ad.is_active ? '활성' : '비활성'}
                            </span>
                          </div>
                        </div>
                        
                        {/* 우선순위 */}
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

                      {/* 통계 - 오늘 */}
                      <div className="flex items-center gap-6 mb-4">
                        <div className="text-xs text-gray-500 mr-2">오늘</div>
                        <div>
                          <span className="text-gray-500 text-xs">노출</span>
                          <div className="text-white font-bold">{(todayStats[ad.id]?.impressions || 0).toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">클릭</span>
                          <div className="text-white font-bold">{(todayStats[ad.id]?.clicks || 0).toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">CTR</span>
                          <div className="text-emerald-400 font-bold">
                            {calculateCTR(todayStats[ad.id]?.clicks || 0, todayStats[ad.id]?.impressions || 0)}%
                          </div>
                        </div>
                      </div>

                      {/* 액션 버튼 */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleActive(ad)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            ad.is_active 
                              ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {ad.is_active ? '비활성화' : '활성화'}
                        </button>
                        <button
                          onClick={() => handleEdit(ad)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(ad.id)}
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
        )}

        {/* 슬롯별 미리보기 섹션 */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {SLOT_TYPES.map(slot => {
            const slotAds = ads.filter(ad => ad.slot_type === slot.value && ad.is_active)
            const activeAd = slotAds.sort((a, b) => b.priority - a.priority)[0]
            
            return (
              <div key={slot.value} className="bg-gray-800 rounded-xl p-4">
                <h3 className="text-sm font-bold text-gray-300 mb-3">
                  {slot.label} ({slot.size})
                </h3>
                <div className="bg-gray-900 rounded-lg p-2 flex items-center justify-center min-h-[100px]">
                  {activeAd ? (
                    <img
                      src={activeAd.image_url}
                      alt={activeAd.name}
                      className="max-w-full max-h-[150px] object-contain"
                    />
                  ) : (
                    <span className="text-gray-600 text-sm">활성 광고 없음</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold">
                {editingAd ? '광고 수정' : '새 광고 등록'}
              </h2>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6">
              {/* 광고 이름 */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  광고 이름 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  placeholder="예: 스포라이브 배너"
                />
              </div>

              {/* 슬롯 타입 */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  슬롯 타입 <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {SLOT_TYPES.map(slot => (
                    <button
                      key={slot.value}
                      type="button"
                      onClick={() => handleSlotTypeChange(slot.value)}
                      className={`p-3 rounded-lg border text-center transition-colors ${
                        formData.slot_type === slot.value
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                          : 'border-gray-600 hover:border-gray-500 text-gray-300'
                      }`}
                    >
                      <div className="font-medium">{slot.label}</div>
                      <div className="text-xs text-gray-500">{slot.size}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 이미지 URL */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  이미지 URL <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    placeholder="/ads/banner.png 또는 https://..."
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {uploading ? '⏳' : '📤'}
                  </button>
                </div>
                {formData.image_url && (
                  <div className="mt-2 p-2 bg-gray-900 rounded-lg">
                    <img
                      src={formData.image_url}
                      alt="미리보기"
                      className="max-h-[100px] object-contain mx-auto"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                )}
              </div>

              {/* 링크 URL */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  링크 URL <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.link_url}
                  onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  placeholder="https://www.example.com/?ref=trendsoccer"
                />
              </div>

              {/* 대체 텍스트 */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  대체 텍스트 (SEO)
                </label>
                <input
                  type="text"
                  value={formData.alt_text}
                  onChange={(e) => setFormData({ ...formData, alt_text: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  placeholder="이미지 설명 (스크린리더용)"
                />
              </div>

              {/* 우선순위 */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  우선순위 (높을수록 먼저 노출)
                </label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  placeholder="0"
                />
              </div>

              {/* 기간 설정 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-2">
                    시작일 (선택)
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-2">
                    종료일 (선택)
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* 버튼 */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false)
                    setEditingAd(null)
                    resetForm()
                  }}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors"
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