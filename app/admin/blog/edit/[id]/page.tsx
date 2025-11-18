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

  const [formData, setFormData] = useState({
    slug: '',
    title: '',
    title_kr: '',
    excerpt: '',
    content: '',
    cover_image: '',
    category: 'weekly',
    tags: '',
    published: true
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isEdit) {
      fetchPost()
    }
  }, [])

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
          content: post.content || '',
          cover_image: post.cover_image || '',
          category: post.category || 'weekly',
          tags: post.tags?.join(', ') || '',
          published: post.published || false
        })
      }
    } catch (error) {
      alert('글을 불러오는데 실패했습니다')
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
              {/* 제목 */}
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

              {/* Slug */}
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

              {/* 요약 */}
              <div>
                <label className="block text-sm font-medium mb-2">요약 *</label>
                <input
                  type="text"
                  required
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="이번 주 빅매치 프리뷰 (1-2줄 요약)"
                />
              </div>

              {/* 본문 */}
              <div>
                <label className="block text-sm font-medium mb-2">본문 (마크다운) *</label>
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
                <label className="block text-sm font-medium mb-2">태그</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="프리미어리그, 맨시티, 분석"
                />
                <p className="text-xs text-gray-500 mt-1">쉼표(,)로 구분</p>
              </div>

              {/* 공개 설정 */}
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.published}
                    onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">즉시 공개</span>
                </label>
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