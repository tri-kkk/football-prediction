'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import AdminProtect from '../../../../components/AdminProtect'

const categories = [
  { value: 'announcement', label: '공지사항' },
  { value: 'weekly', label: '주간 분석' },
  { value: 'preview', label: '경기 프리뷰' },
  { value: 'analysis', label: '심층 분석' },
  { value: 'guide', label: '가이드' },
  { value: 'stats', label: '통계 리포트' }
]

export default function AdminBlogEditor() {
  const router = useRouter()
  const params = useParams()
  const isEdit = !!params?.id

  // 언어 탭 상태
  const [activeTab, setActiveTab] = useState<'ko' | 'en'>('ko')
  
  // 번역 상태
  const [translating, setTranslating] = useState(false)
  const [translateError, setTranslateError] = useState('')

  const [formData, setFormData] = useState({
    slug: '',
    // 영문
    title: '',
    content_en: '',
    excerpt_en: '',
    // 한글
    title_kr: '',
    excerpt: '',
    content: '',
    // 공통
    cover_image: '',
    category: 'weekly',
    tags: '',
    published: true,
    published_en: false
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isEdit && params?.id) {
      fetchPost()
    }
  }, [isEdit, params?.id])

  const fetchPost = async () => {
    try {
      const res = await fetch(`/api/admin/blog/posts/${params.id}`)
      const result = await res.json()
      if (result.success) {
        const post = result.data
        setFormData({
          slug: post.slug || '',
          title: post.title || '',
          title_kr: post.title_kr || '',
          excerpt: post.excerpt || '',
          excerpt_en: post.excerpt_en || '',
          content: post.content || '',
          content_en: post.content_en || '',
          cover_image: post.cover_image || '',
          category: post.category || 'weekly',
          tags: post.tags?.join(', ') || '',
          published: post.published || false,
          published_en: post.published_en || false
        })
      }
    } catch (error) {
      alert('글을 불러오는데 실패했습니다')
    }
  }

  // AI 번역 함수
  const handleTranslate = async () => {
    // 한글 콘텐츠가 없으면 번역 불가
    if (!formData.title_kr && !formData.excerpt && !formData.content) {
      setTranslateError('번역할 한글 콘텐츠가 없습니다')
      return
    }

    setTranslating(true)
    setTranslateError('')

    try {
      const res = await fetch('/api/admin/blog/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title_kr,
          excerpt: formData.excerpt,
          content: formData.content
        })
      })

      const result = await res.json()

      if (result.success && result.data) {
        setFormData(prev => ({
          ...prev,
          title: result.data.title || prev.title,
          excerpt_en: result.data.excerpt || prev.excerpt_en,
          content_en: result.data.content || prev.content_en
        }))
        // 번역 성공 시 영문 탭으로 전환
        setActiveTab('en')
      } else {
        setTranslateError(result.error || '번역에 실패했습니다')
      }
    } catch (error) {
      console.error('Translation error:', error)
      setTranslateError('번역 중 오류가 발생했습니다')
    } finally {
      setTranslating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const tags = formData.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t)

      const url = isEdit 
        ? `/api/admin/blog/posts/${params.id}`
        : '/api/admin/blog/posts'
      
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tags,
          published_at: new Date().toISOString()
        })
      })

      if (res.ok) {
        alert(isEdit ? '수정되었습니다' : '작성되었습니다')
        router.push('/admin/blog')
      } else {
        alert('저장 실패')
      }
    } catch (error) {
      alert('오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminProtect>
      <div className="min-h-screen bg-[#0f0f0f] text-white">
        {/* 헤더 */}
        <header className="border-b border-gray-800 bg-gray-900/50">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">
                {isEdit ? '✏️ 글 수정' : '✏️ 새 글 작성'}
              </h1>
              <Link
                href="/admin/blog"
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition text-sm"
              >
                ← 목록으로
              </Link>
            </div>
          </div>
        </header>

        {/* 에디터 */}
        <main className="max-w-7xl mx-auto px-4 py-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 왼쪽: 메인 입력 */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* 언어 탭 + 번역 버튼 */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-2 p-1 bg-gray-900 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setActiveTab('ko')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                        activeTab === 'ko'
                          ? 'bg-blue-500 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      🇰🇷 한글
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('en')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                        activeTab === 'en'
                          ? 'bg-blue-500 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      🇺🇸 English
                    </button>
                  </div>

                  {/* AI 번역 버튼 */}
                  <button
                    type="button"
                    onClick={handleTranslate}
                    disabled={translating || (!formData.title_kr && !formData.content)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg text-sm font-medium transition"
                  >
                    {translating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-white"></div>
                        <span>번역 중...</span>
                      </>
                    ) : (
                      <>
                        <span>🤖</span>
                        <span>AI 번역</span>
                      </>
                    )}
                  </button>
                </div>

                {/* 번역 에러 메시지 */}
                {translateError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm">❌ {translateError}</p>
                  </div>
                )}

                {/* 한글 탭 콘텐츠 */}
                {activeTab === 'ko' && (
                  <div className="space-y-6">
                    {/* 제목 (한글) */}
                    <div>
                      <label className="block text-sm font-medium mb-2">제목 (한글) *</label>
                      <input
                        type="text"
                        required
                        value={formData.title_kr}
                        onChange={(e) => setFormData({ ...formData, title_kr: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg focus:border-blue-500 focus:outline-none text-lg"
                        placeholder="프리미어리그 주간 분석"
                      />
                    </div>

                    {/* 요약 (한글) */}
                    <div>
                      <label className="block text-sm font-medium mb-2">요약 (한글) *</label>
                      <input
                        type="text"
                        required
                        value={formData.excerpt}
                        onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg focus:border-blue-500 focus:outline-none"
                        placeholder="이번 주 빅매치 프리뷰 (1-2줄 요약)"
                      />
                    </div>

                    {/* 본문 (한글) */}
                    <div>
                      <label className="block text-sm font-medium mb-2">본문 (한글, 마크다운) *</label>
                      <textarea
                        required
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        rows={20}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg focus:border-blue-500 focus:outline-none font-mono text-sm"
                        placeholder="# 제목&#10;&#10;## 소제목&#10;&#10;내용을 작성하세요..."
                      />
                      <div className="mt-2 text-xs text-gray-500 space-y-1">
                        <p>📝 마크다운 사용 가능:</p>
                        <p>• # 제목, ## 소제목, ### 작은제목</p>
                        <p>• **굵게**, *기울임*, `코드`</p>
                        <p>• - 리스트, 1. 번호리스트</p>
                        <p>• [링크](URL), ![이미지](URL)</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 영문 탭 콘텐츠 */}
                {activeTab === 'en' && (
                  <div className="space-y-6">
                    {/* 번역 안내 */}
                    {!formData.content_en && formData.content && (
                      <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                        <p className="text-purple-400 text-sm flex items-center gap-2">
                          <span>💡</span>
                          <span>한글 콘텐츠가 있습니다. 상단의 "🤖 AI 번역" 버튼을 클릭하면 자동 번역됩니다.</span>
                        </p>
                      </div>
                    )}

                    {/* 제목 (영문) */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Title (English)</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg focus:border-blue-500 focus:outline-none text-lg"
                        placeholder="Premier League Weekly Analysis"
                      />
                    </div>

                    {/* 요약 (영문) */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Excerpt (English)</label>
                      <input
                        type="text"
                        value={formData.excerpt_en}
                        onChange={(e) => setFormData({ ...formData, excerpt_en: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg focus:border-blue-500 focus:outline-none"
                        placeholder="This week's big match preview (1-2 lines)"
                      />
                    </div>

                    {/* 본문 (영문) */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Content (English, Markdown)</label>
                      <textarea
                        value={formData.content_en}
                        onChange={(e) => setFormData({ ...formData, content_en: e.target.value })}
                        rows={20}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg focus:border-blue-500 focus:outline-none font-mono text-sm"
                        placeholder="# Title&#10;&#10;## Subtitle&#10;&#10;Write your content here..."
                      />
                      <div className="mt-2 text-xs text-gray-500 space-y-1">
                        <p>📝 Markdown supported:</p>
                        <p>• # Heading, ## Subheading</p>
                        <p>• **bold**, *italic*, `code`</p>
                        <p>• - list, 1. numbered list</p>
                        <p>• [link](URL), ![image](URL)</p>
                      </div>
                    </div>

                    {/* 영문 콘텐츠 없음 안내 */}
                    {!formData.content_en && !formData.content && (
                      <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <p className="text-yellow-400 text-sm">
                          💡 영문 콘텐츠가 없으면 영문 사용자에게 한글 버전이 표시됩니다.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Slug (공통) */}
                <div>
                  <label className="block text-sm font-medium mb-2">URL (영문) *</label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">/blog/</span>
                    <input
                      type="text"
                      required
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value.replace(/[^a-z0-9-]/g, '') })}
                      className="flex-1 px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg focus:border-blue-500 focus:outline-none"
                      placeholder="premier-league-weekly"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">영문 소문자, 숫자, 하이픈(-)만 사용</p>
                </div>
              </div>

              {/* 오른쪽: 설정 */}
              <div className="space-y-6">
                {/* 커버 이미지 */}
                <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                  <label className="block text-sm font-medium mb-2">커버 이미지 URL</label>
                  <input
                    type="url"
                    value={formData.cover_image}
                    onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="https://images.unsplash.com/..."
                  />
                  {formData.cover_image && (
                    <img
                      src={formData.cover_image}
                      alt="Preview"
                      className="mt-3 w-full h-32 object-cover rounded"
                    />
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    추천: <a href="https://unsplash.com/s/photos/football" target="_blank" className="text-blue-400 hover:underline">Unsplash</a>
                  </p>
                </div>

                {/* 카테고리 */}
                <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                  <label className="block text-sm font-medium mb-2">카테고리 *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:border-blue-500 focus:outline-none"
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 태그 */}
                <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                  <label className="block text-sm font-medium mb-2">태그 (영문)</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="PremierLeague, ManCity, Analysis"
                  />
                  <p className="text-xs text-gray-500 mt-1">쉼표(,)로 구분, 영문 권장</p>
                </div>

                {/* 공개 설정 */}
                <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 space-y-3">
                  <p className="text-sm font-medium mb-2">발행 설정</p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.published}
                      onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">🇰🇷 한글 버전 발행</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.published_en}
                      onChange={(e) => setFormData({ ...formData, published_en: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">🇺🇸 영문 버전 발행</span>
                  </label>
                </div>

                {/* 작성 상태 요약 */}
                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                  <p className="text-sm font-medium mb-3">📊 작성 현황</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">한글 제목</span>
                      <span>{formData.title_kr ? '✅' : '❌'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">한글 본문</span>
                      <span>{formData.content ? '✅' : '❌'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">영문 제목</span>
                      <span>{formData.title ? '✅' : '⚪'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">영문 본문</span>
                      <span>{formData.content_en ? '✅' : '⚪'}</span>
                    </div>
                  </div>
                </div>

                {/* 저장 버튼 */}
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 rounded-lg font-medium transition"
                >
                  {saving ? '저장 중...' : (isEdit ? '💾 수정하기' : '✅ 발행하기')}
                </button>
              </div>
            </div>
          </form>
        </main>
      </div>
    </AdminProtect>
  )
}