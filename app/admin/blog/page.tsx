'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AdminProtect from '../../components/AdminProtect'

interface BlogPost {
  id: number
  slug: string
  title_kr: string
  category: string
  published: boolean
  published_at: string
  views: number
  created_at: string
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/admin/blog/posts')
      const result = await res.json()
      if (result.success) {
        setPosts(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/admin/blog/posts/${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        alert('삭제되었습니다')
        fetchPosts()
      }
    } catch (error) {
      alert('삭제 실패')
    }
  }

  const togglePublish = async (id: number, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/blog/posts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !currentStatus })
      })
      if (res.ok) {
        fetchPosts()
      }
    } catch (error) {
      alert('상태 변경 실패')
    }
  }

  return (
    <AdminProtect>
      <div className="min-h-screen bg-[#0f0f0f] text-white">
      {/* 헤더 */}
      <header className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">📝 블로그 관리</h1>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/blog/new"
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition font-medium"
              >
                ✏️ 새 글 작성
              </Link>
              <Link
                href="/blog"
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition text-sm"
              >
                블로그 보기
              </Link>
              <Link
                href="/"
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition text-sm"
              >
                메인으로
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-blue-500"></div>
            <p className="mt-4 text-gray-400">로딩 중...</p>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">제목</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">카테고리</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">상태</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">조회수</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">날짜</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">관리</th>
                </tr>
              </thead>
              <tbody>
                {posts.map(post => (
                  <tr key={post.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{post.title_kr}</div>
                      <div className="text-xs text-gray-500 mt-1">/{post.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                        {post.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => togglePublish(post.id, post.published)}
                        className={`px-3 py-1 rounded text-xs font-medium ${
                          post.published
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-700 text-gray-400'
                        }`}
                      >
                        {post.published ? '✓ 공개' : '비공개'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {post.views.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-400">
                      {new Date(post.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/admin/blog/edit/${post.id}`}
                          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                        >
                          수정
                        </Link>
                        <button
                          onClick={() => handleDelete(post.id)}
                          className="px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-xs"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {posts.length === 0 && (
              <div className="text-center py-20 text-gray-500">
                <div className="text-6xl mb-4">📝</div>
                <p>아직 작성된 글이 없습니다</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
    </AdminProtect>
  )
}