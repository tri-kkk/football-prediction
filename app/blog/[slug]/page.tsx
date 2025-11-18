'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'

interface BlogPost {
  id: number
  slug: string
  title: string
  title_kr: string
  excerpt: string
  content: string
  cover_image: string
  category: string
  published_at: string
  views: number
  tags: string[]
  author: string
}

export default function BlogPostPage() {
  const params = useParams()
  const slug = params?.slug as string
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (slug) {
      fetchPost()
    }
  }, [slug])

  const fetchPost = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/blog/post/${slug}`)
      const result = await res.json()
      
      if (result.success) {
        setPost(result.data)
      } else {
        setError('포스트를 찾을 수 없습니다')
      }
    } catch (err) {
      setError('포스트를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-blue-500"></div>
          <p className="mt-4 text-gray-400">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-white mb-2">포스트를 찾을 수 없습니다</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <Link 
            href="/blog"
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition"
          >
            블로그로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      {/* 커버 이미지 */}
      {post.cover_image && (
        <div className="relative h-[400px] bg-gray-900 overflow-hidden">
          <img 
            src={post.cover_image} 
            alt={post.title_kr}
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/50 to-transparent"></div>
        </div>
      )}

      {/* 포스트 내용 */}
      <article className="max-w-4xl mx-auto px-4 py-8">
        {/* 메타 정보 */}
        <div className="mb-6">
          <div className="flex items-center gap-3 text-sm text-gray-400 mb-4">
            <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full font-medium">
              {post.category}
            </span>
            <span>{formatDate(post.published_at)}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              👁️ {post.views.toLocaleString()}
            </span>
          </div>

          {/* 제목 */}
          <h1 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
            {post.title_kr}
          </h1>

          {/* 요약 */}
          {post.excerpt && (
            <p className="text-xl text-gray-400 leading-relaxed">
              {post.excerpt}
            </p>
          )}

          {/* 작성자 */}
          <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-800">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-2xl">
              ⚽
            </div>
            <div>
              <div className="font-bold">{post.author}</div>
              <div className="text-sm text-gray-400">축구 데이터 분석가</div>
            </div>
          </div>
        </div>

        {/* 본문 */}
        <div className="prose prose-invert prose-lg max-w-none">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-3xl font-bold mt-8 mb-4 text-white border-b border-gray-800 pb-3">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-2xl font-bold mt-8 mb-4 text-white">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-xl font-bold mt-6 mb-3 text-white">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="text-gray-300 leading-relaxed mb-4">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside text-gray-300 mb-4 space-y-2">
                  {children}
                </ol>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-gray-900/50 text-gray-400 italic">
                  {children}
                </blockquote>
              ),
              code: ({ children }) => (
                <code className="bg-gray-900 text-blue-400 px-2 py-1 rounded text-sm">
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto my-4 border border-gray-800">
                  {children}
                </pre>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-6">
                  <table className="w-full border-collapse">
                    {children}
                  </table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-gray-700 bg-gray-800 px-4 py-2 text-left font-bold">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-gray-700 px-4 py-2">
                  {children}
                </td>
              ),
              a: ({ children, href }) => (
                <a 
                  href={href} 
                  className="text-blue-400 hover:text-blue-300 underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
              hr: () => (
                <hr className="my-8 border-gray-800" />
              )
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>

        {/* 태그 */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-12 pt-8 border-t border-gray-800">
            <div className="flex flex-wrap gap-2">
              {post.tags.map(tag => (
                <span 
                  key={tag}
                  className="px-4 py-2 bg-gray-800 text-gray-300 rounded-full text-sm hover:bg-gray-700 transition"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 목록으로 돌아가기 */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <Link 
            href="/blog"
            className="inline-block px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition font-medium"
          >
            ← 목록으로
          </Link>
        </div>
      </article>
    </div>
  )
}