'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface LiveMatch {
  fixture: {
    id: number
    date: string
    status: {
      elapsed: number
      long: string
    }
  }
  league: {
    id: number
    name: string
    logo: string
  }
  teams: {
    home: {
      id: number
      name: string
      nameKR: string
      logo: string
    }
    away: {
      id: number
      name: string
      nameKR: string
      logo: string
    }
  }
  goals: {
    home: number | null
    away: number | null
  }
  events?: any[]
}

export default function LivePage() {
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [error, setError] = useState<string | null>(null)

  // 라이브 경기 조회
  async function fetchLiveMatches() {
    try {
      console.log('🔄 라이브 경기 갱신 중...')
      const response = await fetch('/api/live-matches')
      const data = await response.json()

      if (data.success) {
        setLiveMatches(data.matches)
        setLastUpdate(new Date())
        setError(null)
        console.log('✅ 라이브 경기 갱신 완료:', data.count, '개')
      } else {
        throw new Error(data.error || '데이터 조회 실패')
      }
    } catch (err: any) {
      console.error('❌ 라이브 경기 조회 실패:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 최초 로드 + 15초마다 자동 갱신
  useEffect(() => {
    fetchLiveMatches()

    const interval = setInterval(() => {
      fetchLiveMatches()
    }, 15000) // 15초

    return () => clearInterval(interval)
  }, [])

  // 마지막 업데이트 시간 표시
  function getLastUpdateText() {
    const seconds = Math.floor((Date.now() - lastUpdate.getTime()) / 1000)
    if (seconds < 60) return `${seconds}초 전`
    return `${Math.floor(seconds / 60)}분 전`
  }

  return (
    <div className="min-h-screen bg-black">
      {/* 헤더 */}
      <header className="bg-[#1a1a1a] border-b border-gray-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* 타이틀 */}
            <div className="flex items-center gap-4">
              <Link 
                href="/"
                className="text-gray-400 hover:text-white transition-colors"
              >
                ← 메인으로
              </Link>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <h1 className="text-2xl font-bold text-white">
                    라이브 중계
                  </h1>
                </div>
                <span className="px-3 py-1 bg-gray-800 text-white text-sm rounded-full border border-gray-700">
                  {liveMatches.length}경기 진행 중
                </span>
              </div>
            </div>

            {/* 컨트롤 */}
            <div className="flex items-center gap-4">
              <button
                onClick={fetchLiveMatches}
                disabled={loading}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 text-white rounded-lg transition-colors flex items-center gap-2 border border-gray-700"
              >
                <span className={loading ? 'animate-spin' : ''}>🔄</span>
                새로고침
              </button>
              
              <div className="text-sm text-gray-400">
                {getLastUpdateText()} 업데이트
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <div className="container mx-auto px-4 py-8">
        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
            ⚠️ {error}
          </div>
        )}

        {/* 로딩 상태 */}
        {loading && liveMatches.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 animate-bounce">⚽</div>
            <p className="text-xl text-gray-400">라이브 경기를 불러오는 중...</p>
          </div>
        ) : liveMatches.length === 0 ? (
          // 진행 중인 경기 없음
          <div className="text-center py-20">
            <div className="text-6xl mb-4">⚽</div>
            <h2 className="text-2xl text-white mb-2">
              현재 진행 중인 경기가 없습니다
            </h2>
            <p className="text-gray-400 mb-6">
              경기가 시작되면 자동으로 표시됩니다 (15초마다 갱신)
            </p>
            
            <div className="inline-flex flex-col gap-4">
              <Link
                href="/"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
              >
                메인으로 돌아가기
              </Link>
              
              <button
                onClick={fetchLiveMatches}
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-700"
              >
                다시 확인하기
              </button>
            </div>
          </div>
        ) : (
          // 라이브 경기 목록
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl text-white font-bold">
                진행 중인 경기 ({liveMatches.length})
              </h2>
              <div className="text-sm text-gray-400">
                15초마다 자동 갱신 중...
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {liveMatches.map((match) => (
                <LiveMatchCard key={match.fixture.id} match={match} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// 라이브 경기 카드 컴포넌트
function LiveMatchCard({ match }: { match: LiveMatch }) {
  return (
    <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer">
      {/* 헤더 */}
      <div className="bg-black px-4 py-3 flex items-center justify-between border-b border-gray-800">
        <div className="flex items-center gap-2">
          <img 
            src={match.league.logo} 
            alt={match.league.name}
            className="w-5 h-5"
          />
          <span className="text-sm text-gray-400">
            {match.league.name}
          </span>
        </div>
        
        {/* 라이브 시간 */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm font-bold text-red-400">
            {match.fixture.status.elapsed}'
          </span>
        </div>
      </div>

      {/* 점수판 */}
      <div className="p-6">
        {/* 홈팀 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 flex-1">
            <img 
              src={match.teams.home.logo}
              alt={match.teams.home.name}
              className="w-10 h-10"
            />
            <div>
              <div className="text-white font-medium">
                {match.teams.home.nameKR}
              </div>
              <div className="text-xs text-gray-500">
                {match.teams.home.name}
              </div>
            </div>
          </div>
          
          <div className="text-3xl font-bold text-white px-4">
            {match.goals.home ?? '-'}
          </div>
        </div>

        {/* 원정팀 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <img 
              src={match.teams.away.logo}
              alt={match.teams.away.name}
              className="w-10 h-10"
            />
            <div>
              <div className="text-white font-medium">
                {match.teams.away.nameKR}
              </div>
              <div className="text-xs text-gray-500">
                {match.teams.away.name}
              </div>
            </div>
          </div>
          
          <div className="text-3xl font-bold text-white px-4">
            {match.goals.away ?? '-'}
          </div>
        </div>
      </div>

      {/* 푸터 */}
      <div className="bg-black px-4 py-3 flex items-center justify-between text-sm border-t border-gray-800">
        <span className="text-gray-500">
          {match.fixture.status.long}
        </span>
        <button className="text-blue-400 hover:text-blue-300 transition-colors">
          상세 보기 →
        </button>
      </div>
    </div>
  )
}