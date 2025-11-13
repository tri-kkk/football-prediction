'use client'
import { useState, useEffect } from 'react'

interface Player {
  id: number
  name: string
  number: number
  pos: string
  grid?: string
}

interface TeamLineup {
  team: {
    id: number
    name: string
    logo: string
  }
  formation: string
  startXI: Array<{
    player: Player
  }>
  substitutes: Array<{
    player: Player
  }>
  coach: {
    id: number
    name: string
    photo: string
  }
}

interface LineupData {
  fixture: {
    id: number
  }
  lineups: TeamLineup[]
}

interface LineupModalProps {
  isOpen: boolean
  onClose: () => void
  fixtureId: number
  homeTeam: string
  awayTeam: string
  darkMode: boolean
}

export default function LineupModal({
  isOpen,
  onClose,
  fixtureId,
  homeTeam,
  awayTeam,
  darkMode
}: LineupModalProps) {
  const [lineups, setLineups] = useState<TeamLineup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const fetchLineups = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/lineups?fixtureId=${fixtureId}`)
        
        if (!response.ok) {
          throw new Error('라인업 데이터를 불러올 수 없습니다')
        }

        const data: LineupData = await response.json()
        
        if (!data.lineups || data.lineups.length === 0) {
          throw new Error('라인업 정보가 없습니다')
        }

        setLineups(data.lineups)
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류')
      } finally {
        setLoading(false)
      }
    }

    fetchLineups()
  }, [isOpen, fixtureId])

  // 모달이 닫혀있으면 렌더링 안함
  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* 배경 오버레이 */}
      <div className={`absolute inset-0 ${
        darkMode ? 'bg-black/80' : 'bg-black/60'
      } backdrop-blur-sm`} />

      {/* 모달 컨텐츠 */}
      <div 
        className={`relative w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${
          darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className={`sticky top-0 z-10 px-6 py-4 border-b ${
          darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-2xl font-bold ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                ⚽ 선발 라인업
              </h2>
              <p className={`text-sm mt-1 ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {homeTeam} vs {awayTeam}
              </p>
            </div>
            
            {/* 닫기 버튼 */}
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                darkMode 
                  ? 'hover:bg-gray-800 text-gray-400 hover:text-white' 
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 컨텐츠 */}
        <div className="p-6">
          {/* 로딩 */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className={`animate-spin rounded-full h-16 w-16 border-4 ${
                darkMode 
                  ? 'border-gray-700 border-t-blue-500' 
                  : 'border-gray-200 border-t-blue-600'
              }`} />
              <p className={`mt-4 text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                라인업 불러오는 중...
              </p>
            </div>
          )}

          {/* 에러 */}
          {error && (
            <div className={`flex flex-col items-center justify-center py-20 ${
              darkMode ? 'text-red-400' : 'text-red-600'
            }`}>
              <span className="text-6xl mb-4">⚠️</span>
              <p className="text-lg font-medium">{error}</p>
            </div>
          )}

          {/* 라인업 데이터 */}
          {!loading && !error && lineups.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {lineups.map((lineup, teamIdx) => (
                <div 
                  key={teamIdx}
                  className={`rounded-xl p-6 ${
                    darkMode ? 'bg-gray-800/50' : 'bg-gray-50'
                  }`}
                >
                  {/* 팀 정보 */}
                  <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-700">
                    <img 
                      src={lineup.team.logo} 
                      alt={lineup.team.name}
                      className="w-12 h-12 object-contain"
                    />
                    <div>
                      <h3 className={`text-xl font-bold ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {lineup.team.name}
                      </h3>
                      <p className={`text-sm ${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        포메이션: {lineup.formation}
                      </p>
                    </div>
                  </div>

                  {/* 감독 */}
                  {lineup.coach && (
                    <div className={`flex items-center gap-3 mb-6 p-3 rounded-lg ${
                      darkMode ? 'bg-gray-700/50' : 'bg-white'
                    }`}>
                      <img 
                        src={lineup.coach.photo} 
                        alt={lineup.coach.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <p className={`text-xs font-bold uppercase ${
                          darkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          감독
                        </p>
                        <p className={`text-sm font-bold ${
                          darkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {lineup.coach.name}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 선발 명단 */}
                  {lineup.startXI && lineup.startXI.length > 0 && (
                    <div className="mb-6">
                      <h4 className={`text-sm font-bold mb-3 flex items-center gap-2 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        <span className="text-green-500">●</span>
                        선발 명단 (11명)
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {lineup.startXI.map(({ player }, playerIdx) => (
                          <div 
                            key={playerIdx}
                            className={`flex items-center gap-2 p-2 rounded-lg ${
                              darkMode ? 'bg-gray-700/50' : 'bg-white'
                            }`}
                          >
                            {/* 등번호 */}
                            <div className={`w-8 h-8 ${
                              darkMode ? 'bg-green-600' : 'bg-green-500'
                            } rounded-full flex items-center justify-center flex-shrink-0`}>
                              <span className="font-bold text-white text-sm">
                                {player.number}
                              </span>
                            </div>
                            
                            {/* 선수 정보 */}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${
                                darkMode ? 'text-white' : 'text-gray-900'
                              }`}>
                                {player.name}
                              </p>
                              <p className={`text-xs ${
                                darkMode ? 'text-gray-400' : 'text-gray-500'
                              }`}>
                                {player.pos}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 교체 명단 */}
                  {lineup.substitutes && lineup.substitutes.length > 0 && (
                    <div>
                      <h4 className={`text-sm font-bold mb-3 flex items-center gap-2 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        <span className="text-yellow-500">●</span>
                        교체 명단 ({lineup.substitutes.length}명)
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {lineup.substitutes.map(({ player }, playerIdx) => (
                          <div 
                            key={playerIdx}
                            className={`flex items-center gap-2 p-2 rounded-lg ${
                              darkMode ? 'bg-gray-800/20' : 'bg-gray-100'
                            }`}
                          >
                            {/* 등번호 */}
                            <div className={`w-7 h-7 ${
                              darkMode ? 'bg-gray-700' : 'bg-gray-300'
                            } rounded-full flex items-center justify-center flex-shrink-0`}>
                              <span className={`font-bold text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {player.number}
                              </span>
                            </div>
                            
                            {/* 선수명 */}
                            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} truncate`}>
                              {player.name}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 데이터 없음 */}
          {!loading && !error && lineups.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <span className="text-6xl mb-4">⚽</span>
              <p className={`text-lg font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                라인업 정보가 아직 발표되지 않았습니다
              </p>
              <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'} mt-2`}>
                경기 시작 전에 다시 확인해주세요
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
