'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { ENDPOINTS, CATEGORIES, type ApiEndpoint, type HttpMethod } from './apiData'

// ============================================================
// TrendSoccer API Reference (interactive)
// ============================================================

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'bg-emerald-600/20 text-emerald-300 border-emerald-600/40',
  POST: 'bg-blue-600/20 text-blue-300 border-blue-600/40',
  PUT: 'bg-amber-600/20 text-amber-300 border-amber-600/40',
  DELETE: 'bg-red-600/20 text-red-300 border-red-600/40',
}

export default function ApiDocsPage() {
  const [search, setSearch] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [authToken, setAuthToken] = useState('')

  // 클라이언트 마운트 시 origin으로 초기화
  useEffect(() => {
    if (typeof window !== 'undefined' && !baseUrl) {
      setBaseUrl(window.location.origin)
    }
  }, [baseUrl])

  const filtered = useMemo(() => {
    if (!search) return ENDPOINTS
    const q = search.toLowerCase()
    return ENDPOINTS.filter(
      (e) =>
        e.path.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q) ||
        e.method.toLowerCase().includes(q)
    )
  }, [search])

  const grouped = useMemo(() => {
    const map: Record<string, ApiEndpoint[]> = {}
    filtered.forEach((e) => {
      if (!map[e.category]) map[e.category] = []
      map[e.category].push(e)
    })
    return map
  }, [filtered])

  return (
    <div className="min-h-screen bg-[#0a0d14] text-gray-200">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-[#0a0d14]/95 backdrop-blur border-b border-gray-800">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-white font-black">T</div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">TrendSoccer API</h1>
              <p className="text-xs text-gray-500">모바일 앱 연동 레퍼런스 · {ENDPOINTS.length}개 엔드포인트</p>
            </div>
          </div>

          <div className="flex-1 min-w-[200px] flex items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="API 검색 (예: matches, h2h, baseball...)"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-md text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-600/60"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <label className="text-gray-500 whitespace-nowrap">Base URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://www.trendsoccer.com"
              className="w-56 px-2 py-1.5 bg-gray-900 border border-gray-800 rounded-md text-gray-300 focus:outline-none focus:border-emerald-600/60"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <label className="text-gray-500 whitespace-nowrap">Bearer</label>
            <input
              type="password"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder="(optional)"
              className="w-40 px-2 py-1.5 bg-gray-900 border border-gray-800 rounded-md text-gray-300 focus:outline-none focus:border-emerald-600/60"
            />
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-6 flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <aside className="lg:w-72 lg:flex-shrink-0">
          <nav className="lg:sticky lg:top-[100px] space-y-4">
            {CATEGORIES.map((cat) => {
              const items = grouped[cat.id] || []
              if (items.length === 0) return null
              return (
                <div key={cat.id}>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">
                    {cat.label} <span className="text-gray-600 font-normal">({items.length})</span>
                  </div>
                  <ul className="space-y-0.5">
                    {items.map((e) => (
                      <li key={e.id}>
                        <a
                          href={`#${e.id}`}
                          className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-gray-400 hover:text-emerald-300 hover:bg-emerald-600/5 transition-colors"
                        >
                          <span
                            className={`inline-block w-12 text-center font-bold border rounded-sm py-0.5 text-[10px] ${METHOD_COLORS[e.method]}`}
                          >
                            {e.method}
                          </span>
                          <span className="truncate">{e.path.replace('/api/', '')}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 space-y-6">
          {/* Intro */}
          <div className="rounded-xl bg-gradient-to-br from-emerald-600/10 to-blue-600/5 border border-emerald-600/20 p-6">
            <h2 className="text-xl font-bold text-white mb-2">시작하기</h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              TrendSoccer 웹 서비스의 공개 API 모음이야. <strong className="text-emerald-300">모바일 앱(Flutter)</strong> 연동에 필요한 엔드포인트만 추렸어. 모든 응답은 JSON이고 별도 인증 없이 호출 가능한 게 대부분이야 (구독 취소·결제 같은 일부만 NextAuth 세션 필요).
            </p>
            <ul className="mt-4 text-sm text-gray-400 space-y-1.5 list-disc pl-5">
              <li>좌측 메뉴에서 카테고리/엔드포인트 선택, 또는 상단 검색</li>
              <li><strong className="text-gray-300">Try it</strong> 버튼으로 실제 호출 테스트 (GET 위주, POST는 body 입력)</li>
              <li>Base URL은 우측 상단에서 변경 가능 (기본: 현재 도메인)</li>
              <li>API 응답 캐시 정책은 각 엔드포인트의 <em>비고</em> 참고</li>
            </ul>
          </div>

          {/* Mobile auth flow */}
          <div className="rounded-xl bg-amber-600/5 border border-amber-600/20 p-6">
            <h3 className="text-base font-bold text-amber-300 mb-2">📱 Flutter 인증 흐름 (NextAuth + Supabase)</h3>
            <ol className="text-sm text-gray-300 space-y-2 list-decimal pl-5">
              <li>
                <strong className="text-gray-100">소셜 로그인</strong> — InAppWebView로 <code className="text-emerald-300 bg-black/30 px-1 rounded text-xs">/api/auth/signin/google</code> 또는 <code className="text-emerald-300 bg-black/30 px-1 rounded text-xs">/api/auth/signin/naver</code> 열기. OAuth 콜백 후 <code className="text-emerald-300 bg-black/30 px-1 rounded text-xs">next-auth.session-token</code> 쿠키를 캡처해서 보관
              </li>
              <li>
                <strong className="text-gray-100">신규 가입자 약관 동의</strong> — <code className="text-emerald-300 bg-black/30 px-1 rounded text-xs">GET /api/auth/agree-terms?email=...</code>로 <code className="text-amber-300">pending: true</code>면 약관 화면 표시 → <code className="text-emerald-300 bg-black/30 px-1 rounded text-xs">POST /api/auth/agree-terms</code>로 가입 완료 (48시간 프리미엄 체험판 시작)
              </li>
              <li>
                <strong className="text-gray-100">세션 폴링</strong> — <code className="text-emerald-300 bg-black/30 px-1 rounded text-xs">GET /api/auth/session</code>으로 현재 사용자 정보(tier, premiumExpiresAt 등) 주기적 확인. 이후 모든 인증이 필요한 API 호출 시 캡처한 쿠키 함께 전송
              </li>
              <li>
                <strong className="text-gray-100">결제</strong> — <code className="text-emerald-300 bg-black/30 px-1 rounded text-xs">POST /api/payment/seedpay/init</code>로 SeedPay 폼 데이터 받아서 결제 WebView 띄우기 → 콜백으로 구독 활성화
              </li>
            </ol>
          </div>

          {filtered.length === 0 && (
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 text-center text-gray-500">
              검색 결과 없음
            </div>
          )}

          {CATEGORIES.map((cat) => {
            const items = grouped[cat.id] || []
            if (items.length === 0) return null
            return (
              <section key={cat.id} id={cat.id}>
                <div className="mb-4 pb-2 border-b border-gray-800">
                  <h2 className="text-2xl font-bold text-white">{cat.label}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{cat.description}</p>
                </div>
                <div className="space-y-4">
                  {items.map((e) => (
                    <EndpointCard key={e.id} endpoint={e} baseUrl={baseUrl} authToken={authToken} />
                  ))}
                </div>
              </section>
            )
          })}

          <footer className="text-center text-xs text-gray-600 py-8">
            TrendSoccer · Generated from source code · {new Date().getFullYear()}
          </footer>
        </main>
      </div>
    </div>
  )
}

// ============================================================
// Endpoint card with Try-It panel
// ============================================================
function EndpointCard({
  endpoint,
  baseUrl,
  authToken,
}: {
  endpoint: ApiEndpoint
  baseUrl: string
  authToken: string
}) {
  const [showTry, setShowTry] = useState(false)
  const [paramValues, setParamValues] = useState<Record<string, string>>(endpoint.tryItDefaults || {})
  const [bodyText, setBodyText] = useState<string>(() => {
    const bodyParams = (endpoint.params || []).filter((p) => p.in === 'body')
    if (bodyParams.length === 0) return ''
    const obj: Record<string, any> = {}
    bodyParams.forEach((p) => {
      obj[p.name] = p.type === 'object' ? {} : p.type === 'number' ? 0 : p.type === 'boolean' ? false : ''
    })
    return JSON.stringify(obj, null, 2)
  })
  const [response, setResponse] = useState<{ status: number; body: string; ms: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setParam = (name: string, value: string) => {
    setParamValues((prev) => ({ ...prev, [name]: value }))
  }

  const buildUrl = useCallback(() => {
    let path = endpoint.path
    const queryEntries: string[] = []

    ;(endpoint.params || []).forEach((p) => {
      const v = paramValues[p.name]
      if (!v) return
      if (p.in === 'path') {
        path = path.replace(`{${p.name}}`, encodeURIComponent(v))
      } else if (p.in === 'query') {
        queryEntries.push(`${encodeURIComponent(p.name)}=${encodeURIComponent(v)}`)
      }
    })

    const qs = queryEntries.length ? `?${queryEntries.join('&')}` : ''
    return `${baseUrl}${path}${qs}`
  }, [endpoint, paramValues, baseUrl])

  const onSend = async () => {
    setLoading(true)
    setError(null)
    setResponse(null)
    const url = buildUrl()
    const start = performance.now()
    try {
      const headers: Record<string, string> = { Accept: 'application/json' }
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`

      const init: RequestInit = { method: endpoint.method, headers }
      if (endpoint.method !== 'GET' && bodyText.trim()) {
        headers['Content-Type'] = 'application/json'
        init.body = bodyText
      }

      const res = await fetch(url, init)
      const ms = Math.round(performance.now() - start)
      const text = await res.text()
      let pretty = text
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2)
      } catch {
        // not JSON, keep raw
      }
      setResponse({ status: res.status, body: pretty, ms })
    } catch (err: any) {
      setError(err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const queryParams = (endpoint.params || []).filter((p) => p.in !== 'body')
  const bodyParams = (endpoint.params || []).filter((p) => p.in === 'body')

  return (
    <article id={endpoint.id} className="rounded-xl border border-gray-800 bg-[#0f1421] overflow-hidden scroll-mt-24">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`px-2 py-1 rounded text-xs font-black border ${METHOD_COLORS[endpoint.method]}`}>
            {endpoint.method}
          </span>
          <code className="font-mono text-sm text-gray-200 break-all">{endpoint.path}</code>
          {endpoint.auth !== 'none' && (
            <span className="ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-600/20 text-amber-300 border border-amber-600/40">
              🔐 {endpoint.auth === 'session' ? 'Session' : 'Secret'}
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-gray-400">{endpoint.description}</p>
      </div>

      <div className="p-5 space-y-4">
        {/* Params */}
        {(endpoint.params || []).length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">파라미터</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-800">
                    <th className="py-1.5 pr-3 font-medium">이름</th>
                    <th className="py-1.5 pr-3 font-medium">위치</th>
                    <th className="py-1.5 pr-3 font-medium">타입</th>
                    <th className="py-1.5 pr-3 font-medium">필수</th>
                    <th className="py-1.5 pr-3 font-medium">기본값</th>
                    <th className="py-1.5 font-medium">설명</th>
                  </tr>
                </thead>
                <tbody>
                  {endpoint.params!.map((p) => (
                    <tr key={p.name} className="border-b border-gray-900/60 last:border-0">
                      <td className="py-1.5 pr-3 font-mono text-emerald-300">{p.name}</td>
                      <td className="py-1.5 pr-3 text-gray-500">{p.in}</td>
                      <td className="py-1.5 pr-3 text-gray-400">{p.type}</td>
                      <td className="py-1.5 pr-3">
                        {p.required ? <span className="text-red-400">●</span> : <span className="text-gray-600">○</span>}
                      </td>
                      <td className="py-1.5 pr-3 font-mono text-gray-500">{p.default || '-'}</td>
                      <td className="py-1.5 text-gray-300">{p.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Response */}
        <div>
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">응답 예시</h4>
          <pre className="text-[11px] bg-black/40 border border-gray-900 rounded-md p-3 overflow-x-auto leading-relaxed text-gray-300">
            <code>{endpoint.responseExample}</code>
          </pre>
        </div>

        {endpoint.notes && (
          <div className="text-xs text-amber-300/90 bg-amber-600/5 border border-amber-600/20 rounded-md px-3 py-2">
            <span className="font-bold mr-1">비고:</span>
            {endpoint.notes}
          </div>
        )}

        {/* Try-It */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowTry((v) => !v)}
            className="text-xs font-bold px-3 py-1.5 rounded-md bg-emerald-600/20 text-emerald-300 border border-emerald-600/40 hover:bg-emerald-600/30 transition-colors"
          >
            {showTry ? '↑ 닫기' : '▶ Try it'}
          </button>

          {showTry && (
            <div className="mt-3 rounded-lg bg-black/30 border border-gray-800 p-4 space-y-3">
              {queryParams.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {queryParams.map((p) => (
                    <label key={p.name} className="flex flex-col gap-1">
                      <span className="text-[11px] text-gray-400">
                        <span className="font-mono text-emerald-300">{p.name}</span>
                        <span className="text-gray-600 ml-1">({p.in}{p.required ? ', required' : ''})</span>
                      </span>
                      <input
                        type="text"
                        value={paramValues[p.name] || ''}
                        onChange={(e) => setParam(p.name, e.target.value)}
                        placeholder={p.default || p.description}
                        className="px-2 py-1.5 bg-gray-900 border border-gray-800 rounded-md text-xs font-mono text-gray-200 focus:outline-none focus:border-emerald-600/60"
                      />
                    </label>
                  ))}
                </div>
              )}

              {bodyParams.length > 0 && (
                <div>
                  <div className="text-[11px] text-gray-400 mb-1">Body (JSON)</div>
                  <textarea
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    rows={Math.min(12, bodyText.split('\n').length + 1)}
                    className="w-full px-2 py-1.5 bg-gray-900 border border-gray-800 rounded-md text-xs font-mono text-gray-200 focus:outline-none focus:border-emerald-600/60"
                  />
                </div>
              )}

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={onSend}
                  disabled={loading}
                  className="text-xs font-bold px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '⏳ 호출 중…' : '🚀 Send'}
                </button>
                <code className="text-[11px] text-gray-500 break-all flex-1">{buildUrl()}</code>
              </div>

              {error && (
                <div className="text-xs text-red-400 bg-red-900/20 border border-red-900/40 rounded-md p-2">
                  ⚠️ {error}
                </div>
              )}

              {response && (
                <div>
                  <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-1">
                    <span className={`font-bold ${response.status >= 200 && response.status < 300 ? 'text-emerald-300' : 'text-red-300'}`}>
                      {response.status}
                    </span>
                    <span>·</span>
                    <span>{response.ms}ms</span>
                    <span>·</span>
                    <span>{(response.body.length / 1024).toFixed(1)} KB</span>
                  </div>
                  <pre className="text-[11px] bg-black/60 border border-gray-900 rounded-md p-3 overflow-x-auto max-h-[400px] leading-relaxed text-gray-300">
                    <code>{response.body.length > 20000 ? response.body.slice(0, 20000) + '\n... (truncated)' : response.body}</code>
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
