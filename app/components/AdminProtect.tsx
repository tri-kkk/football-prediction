'use client'

import { useState, useEffect } from 'react'

interface AdminProtectProps {
  children: React.ReactNode
}

export default function AdminProtect({ children }: AdminProtectProps) {
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [error, setError] = useState('')

  // 세션 체크
  useEffect(() => {
    const auth = sessionStorage.getItem('admin_auth')
    if (auth === 'true') {
      setIsAuthenticated(true)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // 비밀번호 확인 (.env.local에서 가져오기)
    const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'trendsoccer2024'
    
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      sessionStorage.setItem('admin_auth', 'true')
      setError('')
    } else {
      setError('비밀번호가 틀렸습니다')
      setPassword('')
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    sessionStorage.removeItem('admin_auth')
  }

  // 인증되지 않았으면 로그인 화면
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-gray-900 rounded-lg p-8 border border-gray-800">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🔒</div>
              <h1 className="text-2xl font-bold text-white mb-2">관리자 로그인</h1>
              <p className="text-gray-400 text-sm">블로그 관리 페이지에 접근하려면 비밀번호를 입력하세요</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  비밀번호
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-white"
                  placeholder="비밀번호 입력"
                  autoFocus
                />
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition"
              >
                로그인
              </button>
            </form>

            <div className="mt-6 text-center">
              <a href="/" className="text-sm text-gray-500 hover:text-gray-400">
                ← 메인으로 돌아가기
              </a>
            </div>
          </div>

          
        </div>
      </div>
    )
  }

  // 인증되었으면 실제 컨텐츠 표시
  return (
    <>
      {children}
      {/* 로그아웃 버튼 (우측 하단) */}
      <button
        onClick={handleLogout}
        className="fixed bottom-6 right-6 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition border border-red-500/50"
      >
        🔓 로그아웃
      </button>
    </>
  )
}
