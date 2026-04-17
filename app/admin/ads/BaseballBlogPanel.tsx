'use client'

import { useState, useEffect, useRef } from 'react'

interface MatchItem {
  id: number
  api_match_id: number
  match_id: string
  home_team: string
  away_team: string
  home_team_ko: string
  away_team_ko: string
  league: string
  match_date: string
  match_time: string
  display_name: string
  pitcher_display: string
  home_pitcher_era: number | null
  away_pitcher_era: number | null
}

interface GeneratedBlog {
  matchId: string
  title: string
  htmlContent: string
  plainSections: any
  tags: string[]
  excerpt: string
}

const LEAGUE_NAMES: Record<string, string> = {
  KBO: 'KBO 리그',
  MLB: 'MLB 메이저리그',
  NPB: 'NPB 일본프로야구',
}

const LEAGUE_COLORS: Record<string, string> = {
  KBO: 'bg-red-500/20 text-red-400',
  MLB: 'bg-blue-500/20 text-blue-400',
  NPB: 'bg-green-500/20 text-green-400',
}

export default function BaseballBlogPanel() {
  const [targetDate, setTargetDate] = useState('')
  const [grouped, setGrouped] = useState<Record<string, MatchItem[]>>({})
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [blogs, setBlogs] = useState<Map<string, GeneratedBlog>>(new Map())
  const [generating, setGenerating] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState<string | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = tomorrow.toISOString().split('T')[0]
    setTargetDate(dateStr)
    fetchMatches(dateStr)
  }, [])

  const fetchMatches = async (date: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/blog/baseball-generate?date=${date}`)
      const result = await res.json()
      if (result.success) {
        setGrouped(result.data.grouped)
        setTotal(result.data.total)
        if (result.data.savedBlogs) {
          const restored = new Map<string, GeneratedBlog>()
          Object.entries(result.data.savedBlogs).forEach(([matchId, blog]: [string, any]) => {
            restored.set(matchId, blog)
          })
          setBlogs(restored)
        } else {
          setBlogs(new Map())
        }
      }
    } catch (err) {
      console.error('경기 목록 조회 실패:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleSelect = (matchId: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(matchId) ? next.delete(matchId) : next.add(matchId)
      return next
    })
  }

  const autoSelect = () => {
    const next = new Set<string>()
    Object.entries(grouped).forEach(([, matches]) => {
      matches.slice(0, 2).forEach(m => next.add(m.match_id))
    })
    setSelected(next)
  }

  const generateSelected = async () => {
    const ids = Array.from(selected)
    for (const matchId of ids) {
      if (blogs.has(matchId) && !confirm(`"${blogs.get(matchId)?.title}" 이미 생성됨. 재생성?`)) continue
      setGenerating(prev => new Set(prev).add(matchId))
      try {
        const res = await fetch('/api/admin/blog/baseball-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ match_id: matchId }),
        })
        const result = await res.json()
        if (result.success) {
          setBlogs(prev => new Map(prev).set(matchId, { matchId, ...result.data }))
        } else {
          alert(`생성 실패 (${matchId}): ${result.error}`)
        }
      } catch (err: any) {
        alert(`에러: ${err.message}`)
      } finally {
        setGenerating(prev => { const next = new Set(prev); next.delete(matchId); return next })
      }
    }
  }

  const generateOne = async (matchId: string) => {
    setGenerating(prev => new Set(prev).add(matchId))
    try {
      const res = await fetch('/api/admin/blog/baseball-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: matchId }),
      })
      const result = await res.json()
      if (result.success) {
        setBlogs(prev => new Map(prev).set(matchId, { matchId, ...result.data }))
      } else {
        alert(`생성 실패: ${result.error}`)
      }
    } catch (err: any) {
      alert(`에러: ${err.message}`)
    } finally {
      setGenerating(prev => { const next = new Set(prev); next.delete(matchId); return next })
    }
  }

  const copyHTML = async (matchId: string) => {
    const blog = blogs.get(matchId)
    if (!blog) return
    try {
      const blob = new Blob([blog.htmlContent], { type: 'text/html' })
      const item = new ClipboardItem({ 'text/html': blob, 'text/plain': new Blob([blog.htmlContent], { type: 'text/plain' }) })
      await navigator.clipboard.write([item])
      setCopied(matchId)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      await navigator.clipboard.writeText(blog.htmlContent)
      setCopied(matchId)
      setTimeout(() => setCopied(null), 2000)
    }
  }

  const copyTitle = async (matchId: string) => {
    const blog = blogs.get(matchId)
    if (!blog) return
    await navigator.clipboard.writeText(blog.title)
    setCopied(`title-${matchId}`)
    setTimeout(() => setCopied(null), 2000)
  }

  const copyTags = async (matchId: string) => {
    const blog = blogs.get(matchId)
    if (!blog) return
    await navigator.clipboard.writeText(blog.tags.map((t: string) => `#${t}`).join(''))
    setCopied(`tags-${matchId}`)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-6">
      {/* 날짜 선택 + 액션 바 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400">날짜:</label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => { setTargetDate(e.target.value); fetchMatches(e.target.value) }}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
          />
        </div>
        <button
          onClick={autoSelect}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition text-sm font-medium"
        >
          🎯 리그별 2개씩 자동선택
        </button>
        {selected.size > 0 && (
          <button
            onClick={generateSelected}
            disabled={generating.size > 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 rounded-lg transition text-sm font-medium"
          >
            {generating.size > 0
              ? `🤖 생성 중... (${generating.size}개)`
              : `🤖 선택한 ${selected.size}개 생성`}
          </button>
        )}
        <div className="ml-auto text-sm text-gray-500">
          총 {total}경기 | 선택 {selected.size}개 | 생성 {blogs.size}개
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-gray-700 border-t-emerald-500" />
          <p className="mt-4 text-gray-400">경기 목록 로딩 중...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* 왼쪽: 경기 목록 */}
          <div className="space-y-4">
            {Object.entries(grouped).map(([league, matches]) => (
              <div key={league} className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-900/50 flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${LEAGUE_COLORS[league] || 'bg-gray-600 text-gray-300'}`}>
                    {LEAGUE_NAMES[league] || league}
                  </span>
                  <span className="text-xs text-gray-500">{matches.length}경기</span>
                </div>
                <div className="divide-y divide-gray-700/50">
                  {matches.map((match) => {
                    const isSelected = selected.has(match.match_id)
                    const isGenerating = generating.has(match.match_id)
                    const isGenerated = blogs.has(match.match_id)

                    return (
                      <div
                        key={match.match_id}
                        className={`px-4 py-2.5 flex items-center gap-3 transition cursor-pointer hover:bg-gray-700/30 ${
                          isSelected ? 'bg-emerald-900/15 border-l-2 border-l-emerald-500' : ''
                        }`}
                        onClick={() => toggleSelect(match.match_id)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 accent-emerald-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{match.display_name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {match.match_time?.slice(0, 5)} | {match.pitcher_display}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isGenerated && (
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs">생성됨</span>
                          )}
                          {isGenerating && (
                            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs animate-pulse">생성중...</span>
                          )}
                          {!isGenerated && !isGenerating && (
                            <button
                              onClick={(e) => { e.stopPropagation(); generateOne(match.match_id) }}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-xs"
                            >
                              생성
                            </button>
                          )}
                          {isGenerated && !isGenerating && (
                            <button
                              onClick={(e) => { e.stopPropagation(); generateOne(match.match_id) }}
                              className="px-2 py-1 bg-orange-600/80 hover:bg-orange-500 rounded text-xs"
                            >
                              재생성
                            </button>
                          )}
                          {isGenerated && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setPreviewId(match.match_id) }}
                              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                            >
                              미리보기
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {Object.keys(grouped).length === 0 && (
              <div className="text-center py-12 text-gray-500">
                해당 날짜에 예정된 야구 경기가 없습니다.
              </div>
            )}
          </div>

          {/* 오른쪽: 미리보기 + 복사 */}
          <div className="space-y-4">
            {previewId && blogs.has(previewId) ? (
              <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
                {/* 복사 툴바 */}
                <div className="px-4 py-2.5 bg-gray-900/50 flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold flex-1">📋 네이버 블로그 복사</span>
                  <button
                    onClick={() => copyTitle(previewId)}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                      copied === `title-${previewId}` ? 'bg-emerald-600' : 'bg-orange-600 hover:bg-orange-500'
                    }`}
                  >
                    {copied === `title-${previewId}` ? '✓ 복사됨' : '📌 제목 복사'}
                  </button>
                  <button
                    onClick={() => copyHTML(previewId)}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                      copied === previewId ? 'bg-emerald-600' : 'bg-blue-600 hover:bg-blue-500'
                    }`}
                  >
                    {copied === previewId ? '✓ 복사됨' : '📝 본문 HTML 복사'}
                  </button>
                  <button
                    onClick={() => copyTags(previewId)}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                      copied === `tags-${previewId}` ? 'bg-emerald-600' : 'bg-purple-600 hover:bg-purple-500'
                    }`}
                  >
                    {copied === `tags-${previewId}` ? '✓ 복사됨' : '🏷️ 태그 복사'}
                  </button>
                </div>

                {/* 제목 */}
                <div className="px-4 py-2.5 border-b border-gray-700/50">
                  <div className="text-xs text-gray-500 mb-1">제목</div>
                  <div className="font-bold text-sm">{blogs.get(previewId)?.title}</div>
                </div>

                {/* 태그 */}
                <div className="px-4 py-2 border-b border-gray-700/50 flex flex-wrap gap-1">
                  <span className="text-xs text-gray-500 mr-2">태그:</span>
                  {blogs.get(previewId)?.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-400">
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* HTML 미리보기 */}
                <div className="p-4 bg-white rounded-b-xl" ref={previewRef}>
                  <div
                    dangerouslySetInnerHTML={{ __html: blogs.get(previewId)?.htmlContent || '' }}
                    style={{ color: '#333', fontSize: '14px' }}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-10 text-center text-gray-500">
                <div className="text-4xl mb-3">⚾</div>
                <p className="text-sm">경기를 선택하고 블로그를 생성하면</p>
                <p className="text-sm">여기에 미리보기가 표시됩니다.</p>
                <div className="mt-5 text-xs text-gray-600 space-y-1">
                  <p>1. 🎯 &quot;리그별 2개씩 자동선택&quot; 클릭</p>
                  <p>2. 🤖 &quot;선택한 N개 생성&quot; 클릭</p>
                  <p>3. 📋 생성된 글의 &quot;미리보기&quot; 클릭</p>
                  <p>4. 📝 제목/본문/태그를 각각 복사하여 네이버에 붙여넣기</p>
                </div>
              </div>
            )}

            {/* 생성된 블로그 리스트 */}
            {blogs.size > 0 && (
              <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-900/50">
                  <span className="text-sm font-bold">✅ 생성 완료 ({blogs.size}개)</span>
                </div>
                <div className="divide-y divide-gray-700/50">
                  {Array.from(blogs.values()).map(blog => (
                    <div
                      key={blog.matchId}
                      className={`px-4 py-2.5 flex items-center gap-3 cursor-pointer transition hover:bg-gray-700/30 ${
                        previewId === blog.matchId ? 'bg-emerald-900/15' : ''
                      }`}
                      onClick={() => setPreviewId(blog.matchId)}
                    >
                      <div className="flex-1 text-sm truncate">{blog.title}</div>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); copyTitle(blog.matchId) }}
                          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                          title="제목 복사"
                        >📌</button>
                        <button
                          onClick={(e) => { e.stopPropagation(); copyHTML(blog.matchId) }}
                          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                          title="HTML 복사"
                        >📝</button>
                        <button
                          onClick={(e) => { e.stopPropagation(); copyTags(blog.matchId) }}
                          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                          title="태그 복사"
                        >🏷️</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
