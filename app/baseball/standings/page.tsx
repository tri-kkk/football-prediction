'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'

// =====================================================
// 타입 정의
// =====================================================
interface StandingTeam {
  rank: number
  team: string
  teamKo: string
  logo: string
  wins: number
  losses: number
  draws?: number
  winRate: number
  gamesBehind: string
  streak: string
  last10: string
  division?: string
}

// =====================================================
// 상수
// =====================================================
const LEAGUES = [
  { id: 'KBO', name: 'KBO', nameEn: 'KBO' },
  { id: 'MLB', name: 'MLB', nameEn: 'MLB' },
  { id: 'NPB', name: 'NPB', nameEn: 'NPB' },
  { id: 'CPBL', name: 'CPBL', nameEn: 'CPBL' },
]

const LEAGUE_COLORS: Record<string, string> = {
  KBO: 'from-red-500 to-red-600',
  MLB: 'from-blue-600 to-blue-700',
  NPB: 'from-orange-500 to-orange-600',
  CPBL: 'from-violet-600 to-purple-700',
}

const LEAGUE_DIVISIONS: Record<string, string[]> = {
  KBO: ['ALL'],
  MLB: ['AL East', 'AL Central', 'AL West', 'NL East', 'NL Central', 'NL West'],
  NPB: ['Central', 'Pacific'],
  CPBL: ['ALL'],
}

// =====================================================
// 샘플 데이터
// =====================================================
const SAMPLE_STANDINGS: Record<string, StandingTeam[]> = {
  KBO: [
    { rank: 1, team: 'LG Twins', teamKo: 'LG 트윈스', logo: 'https://media.api-sports.io/baseball/teams/3916.png', wins: 87, losses: 55, draws: 2, winRate: 0.613, gamesBehind: '-', streak: 'W3', last10: '7-3' },
    { rank: 2, team: 'KT Wiz', teamKo: 'KT 위즈', logo: 'https://media.api-sports.io/baseball/teams/3917.png', wins: 81, losses: 61, draws: 2, winRate: 0.570, gamesBehind: '6.0', streak: 'W1', last10: '5-5' },
    { rank: 3, team: 'SSG Landers', teamKo: 'SSG 랜더스', logo: 'https://media.api-sports.io/baseball/teams/3921.png', wins: 78, losses: 64, draws: 2, winRate: 0.549, gamesBehind: '9.0', streak: 'L2', last10: '4-6' },
    { rank: 4, team: 'NC Dinos', teamKo: 'NC 다이노스', logo: 'https://media.api-sports.io/baseball/teams/3919.png', wins: 76, losses: 66, draws: 2, winRate: 0.535, gamesBehind: '11.0', streak: 'W2', last10: '6-4' },
    { rank: 5, team: 'Doosan Bears', teamKo: '두산 베어스', logo: 'https://media.api-sports.io/baseball/teams/3912.png', wins: 74, losses: 68, draws: 2, winRate: 0.521, gamesBehind: '13.0', streak: 'L1', last10: '5-5' },
    { rank: 6, team: 'KIA Tigers', teamKo: 'KIA 타이거즈', logo: 'https://media.api-sports.io/baseball/teams/3915.png', wins: 72, losses: 70, draws: 2, winRate: 0.507, gamesBehind: '15.0', streak: 'W1', last10: '6-4' },
    { rank: 7, team: 'Lotte Giants', teamKo: '롯데 자이언츠', logo: 'https://media.api-sports.io/baseball/teams/3918.png', wins: 68, losses: 74, draws: 2, winRate: 0.479, gamesBehind: '19.0', streak: 'L3', last10: '3-7' },
    { rank: 8, team: 'Samsung Lions', teamKo: '삼성 라이온즈', logo: 'https://media.api-sports.io/baseball/teams/3920.png', wins: 65, losses: 77, draws: 2, winRate: 0.458, gamesBehind: '22.0', streak: 'L1', last10: '4-6' },
    { rank: 9, team: 'Hanwha Eagles', teamKo: '한화 이글스', logo: 'https://media.api-sports.io/baseball/teams/3914.png', wins: 58, losses: 84, draws: 2, winRate: 0.408, gamesBehind: '29.0', streak: 'W2', last10: '5-5' },
    { rank: 10, team: 'Kiwoom Heroes', teamKo: '키움 히어로즈', logo: 'https://media.api-sports.io/baseball/teams/3913.png', wins: 52, losses: 90, draws: 2, winRate: 0.366, gamesBehind: '35.0', streak: 'L4', last10: '2-8' },
  ],
  MLB: [
    // AL East
    { rank: 1, team: 'New York Yankees', teamKo: '뉴욕 양키스', logo: 'https://media.api-sports.io/baseball/teams/1.png', wins: 94, losses: 68, winRate: 0.580, gamesBehind: '-', streak: 'W2', last10: '7-3', division: 'AL East' },
    { rank: 2, team: 'Baltimore Orioles', teamKo: '볼티모어 오리올스', logo: 'https://media.api-sports.io/baseball/teams/3.png', wins: 91, losses: 71, winRate: 0.562, gamesBehind: '3.0', streak: 'L1', last10: '6-4', division: 'AL East' },
    { rank: 3, team: 'Boston Red Sox', teamKo: '보스턴 레드삭스', logo: 'https://media.api-sports.io/baseball/teams/2.png', wins: 81, losses: 81, winRate: 0.500, gamesBehind: '13.0', streak: 'W1', last10: '5-5', division: 'AL East' },
    { rank: 4, team: 'Toronto Blue Jays', teamKo: '토론토 블루제이스', logo: 'https://media.api-sports.io/baseball/teams/4.png', wins: 74, losses: 88, winRate: 0.457, gamesBehind: '20.0', streak: 'L2', last10: '4-6', division: 'AL East' },
    { rank: 5, team: 'Tampa Bay Rays', teamKo: '탬파베이 레이스', logo: 'https://media.api-sports.io/baseball/teams/5.png', wins: 80, losses: 82, winRate: 0.494, gamesBehind: '14.0', streak: 'W3', last10: '6-4', division: 'AL East' },
    // NL West
    { rank: 1, team: 'Los Angeles Dodgers', teamKo: 'LA 다저스', logo: 'https://media.api-sports.io/baseball/teams/20.png', wins: 98, losses: 64, winRate: 0.605, gamesBehind: '-', streak: 'W5', last10: '8-2', division: 'NL West' },
    { rank: 2, team: 'San Diego Padres', teamKo: '샌디에이고 파드리스', logo: 'https://media.api-sports.io/baseball/teams/25.png', wins: 93, losses: 69, winRate: 0.574, gamesBehind: '5.0', streak: 'W1', last10: '6-4', division: 'NL West' },
    { rank: 3, team: 'Arizona Diamondbacks', teamKo: '애리조나 다이아몬드백스', logo: 'https://media.api-sports.io/baseball/teams/22.png', wins: 89, losses: 73, winRate: 0.549, gamesBehind: '9.0', streak: 'L1', last10: '5-5', division: 'NL West' },
  ],
  NPB: [
    // Central
    { rank: 1, team: 'Yomiuri Giants', teamKo: '요미우리 자이언츠', logo: 'https://media.api-sports.io/baseball/teams/287.png', wins: 77, losses: 59, draws: 7, winRate: 0.566, gamesBehind: '-', streak: 'W2', last10: '6-4', division: 'Central' },
    { rank: 2, team: 'Hanshin Tigers', teamKo: '한신 타이거스', logo: 'https://media.api-sports.io/baseball/teams/282.png', wins: 75, losses: 62, draws: 6, winRate: 0.547, gamesBehind: '2.5', streak: 'W3', last10: '7-3', division: 'Central' },
    { rank: 3, team: 'Hiroshima Carp', teamKo: '히로시마 카프', logo: 'https://media.api-sports.io/baseball/teams/281.png', wins: 71, losses: 66, draws: 6, winRate: 0.518, gamesBehind: '6.5', streak: 'L1', last10: '5-5', division: 'Central' },
    { rank: 4, team: 'Chunichi Dragons', teamKo: '주니치 드래곤즈', logo: 'https://media.api-sports.io/baseball/teams/279.png', wins: 65, losses: 72, draws: 6, winRate: 0.474, gamesBehind: '12.5', streak: 'L2', last10: '4-6', division: 'Central' },
    { rank: 5, team: 'Yokohama BayStars', teamKo: '요코하마 베이스타즈', logo: 'https://media.api-sports.io/baseball/teams/288.png', wins: 62, losses: 75, draws: 6, winRate: 0.453, gamesBehind: '15.5', streak: 'W1', last10: '5-5', division: 'Central' },
    { rank: 6, team: 'Yakult Swallows', teamKo: '야쿠르트 스왈로즈', logo: 'https://media.api-sports.io/baseball/teams/289.png', wins: 58, losses: 79, draws: 6, winRate: 0.423, gamesBehind: '19.5', streak: 'L3', last10: '3-7', division: 'Central' },
    // Pacific
    { rank: 1, team: 'SoftBank Hawks', teamKo: '소프트뱅크 호크스', logo: 'https://media.api-sports.io/baseball/teams/286.png', wins: 82, losses: 54, draws: 7, winRate: 0.603, gamesBehind: '-', streak: 'W4', last10: '8-2', division: 'Pacific' },
    { rank: 2, team: 'Orix Buffaloes', teamKo: '오릭스 버팔로스', logo: 'https://media.api-sports.io/baseball/teams/284.png', wins: 76, losses: 60, draws: 7, winRate: 0.559, gamesBehind: '6.0', streak: 'L1', last10: '5-5', division: 'Pacific' },
    { rank: 3, team: 'Nippon Ham Fighters', teamKo: '니폰햄 파이터즈', logo: 'https://media.api-sports.io/baseball/teams/283.png', wins: 70, losses: 66, draws: 7, winRate: 0.515, gamesBehind: '12.0', streak: 'W1', last10: '6-4', division: 'Pacific' },
    { rank: 4, team: 'Lotte Marines', teamKo: '치바롯데 마린스', logo: 'https://media.api-sports.io/baseball/teams/280.png', wins: 65, losses: 71, draws: 7, winRate: 0.478, gamesBehind: '17.0', streak: 'L2', last10: '4-6', division: 'Pacific' },
    { rank: 5, team: 'Rakuten Eagles', teamKo: '라쿠텐 이글스', logo: 'https://media.api-sports.io/baseball/teams/285.png', wins: 61, losses: 75, draws: 7, winRate: 0.449, gamesBehind: '21.0', streak: 'W2', last10: '5-5', division: 'Pacific' },
    { rank: 6, team: 'Seibu Lions', teamKo: '세이부 라이온즈', logo: 'https://media.api-sports.io/baseball/teams/290.png', wins: 55, losses: 81, draws: 7, winRate: 0.404, gamesBehind: '27.0', streak: 'L4', last10: '2-8', division: 'Pacific' },
  ],
  CPBL: [
    { rank: 1, team: 'Uni-Lions', teamKo: '유니 라이온즈', logo: 'https://media.api-sports.io/baseball/teams/4818.png', wins: 68, losses: 52, winRate: 0.567, gamesBehind: '-', streak: 'W2', last10: '7-3' },
    { rank: 2, team: 'Rakuten Monkeys', teamKo: '라쿠텐 몽키스', logo: 'https://media.api-sports.io/baseball/teams/4817.png', wins: 65, losses: 55, winRate: 0.542, gamesBehind: '3.0', streak: 'W1', last10: '6-4' },
    { rank: 3, team: 'CTBC Brothers', teamKo: 'CTBC 브라더스', logo: 'https://media.api-sports.io/baseball/teams/4815.png', wins: 60, losses: 60, winRate: 0.500, gamesBehind: '8.0', streak: 'L1', last10: '5-5' },
    { rank: 4, team: 'Fubon Guardians', teamKo: '푸본 가디언스', logo: 'https://media.api-sports.io/baseball/teams/4816.png', wins: 58, losses: 62, winRate: 0.483, gamesBehind: '10.0', streak: 'L2', last10: '4-6' },
    { rank: 5, team: 'Wei Chuan Dragons', teamKo: '웨이취안 드래곤즈', logo: 'https://media.api-sports.io/baseball/teams/4819.png', wins: 49, losses: 71, winRate: 0.408, gamesBehind: '19.0', streak: 'W1', last10: '3-7' },
  ],
}

// =====================================================
// 컴포넌트
// =====================================================

function TeamLogo({ src, team }: { src?: string; team: string }) {
  if (src) {
    return (
      <img 
        src={src} 
        alt={team} 
        className="w-8 h-8 object-contain"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none'
        }}
      />
    )
  }
  
  return (
    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500 text-xs">
      {team.substring(0, 2)}
    </div>
  )
}

function StandingsTable({ 
  standings, 
  language, 
  showDivision = false 
}: { 
  standings: StandingTeam[]
  language: 'ko' | 'en'
  showDivision?: boolean
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-100 text-gray-600">
            <th className="px-2 py-2 text-center w-10">#</th>
            <th className="px-2 py-2 text-center w-16">{language === 'ko' ? '팀' : 'Team'}</th>
            <th className="px-2 py-2 text-center w-12">{language === 'ko' ? '승' : 'W'}</th>
            <th className="px-2 py-2 text-center w-12">{language === 'ko' ? '패' : 'L'}</th>
            <th className="px-2 py-2 text-center w-14">{language === 'ko' ? '승률' : 'PCT'}</th>
            <th className="px-2 py-2 text-center w-12">{language === 'ko' ? '차' : 'GB'}</th>
            <th className="px-2 py-2 text-center w-14 hidden sm:table-cell">{language === 'ko' ? '연속' : 'STRK'}</th>
            <th className="px-2 py-2 text-center w-14 hidden sm:table-cell">L10</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((team, index) => {
            // 승률 계산 (NaN 방지)
            const calculatedWinRate = team.wins + team.losses > 0 
              ? team.wins / (team.wins + team.losses) 
              : 0
            const displayWinRate = team.winRate || calculatedWinRate
            const winRateStr = displayWinRate > 0 
              ? `.${Math.round(displayWinRate * 1000).toString().padStart(3, '0')}` 
              : '.000'
            
            const displayRank = index + 1
            
            return (
              <tr 
                key={`${team.team}-${index}`}
                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  displayRank <= 3 ? 'bg-emerald-50/50' : 
                  displayRank >= standings.length - 1 ? 'bg-red-50/50' : ''
                }`}
              >
                <td className="px-2 py-2.5 text-center">
                  <span className={`${displayRank <= 3 ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                    {displayRank}
                  </span>
                </td>
                <td className="px-2 py-2.5">
                  <div className="flex justify-center">
                    <TeamLogo src={team.logo} team={team.team} />
                  </div>
                </td>
                <td className="px-2 py-2.5 text-center font-medium text-gray-700">{team.wins}</td>
                <td className="px-2 py-2.5 text-center font-medium text-gray-700">{team.losses}</td>
                <td className="px-2 py-2.5 text-center font-bold text-gray-800">{winRateStr}</td>
                <td className="px-2 py-2.5 text-center text-gray-500">{team.gamesBehind || '-'}</td>
                <td className="px-2 py-2.5 text-center hidden sm:table-cell">
                  <span className={`text-xs font-medium ${
                    team.streak?.startsWith('W') ? 'text-emerald-600' : 'text-red-500'
                  }`}>
                    {team.streak || '-'}
                  </span>
                </td>
                <td className="px-2 py-2.5 text-center text-gray-500 hidden sm:table-cell">{team.last10 || '-'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// =====================================================
// 메인 페이지 컴포넌트
// =====================================================
export default function BaseballStandingsPage() {
  const { language } = useLanguage()
  const [selectedLeague, setSelectedLeague] = useState('KBO')
  const [selectedDivision, setSelectedDivision] = useState('ALL')
  const [standings, setStandings] = useState<StandingTeam[]>([])
  const [loading, setLoading] = useState(true)
  const [usingSampleData, setUsingSampleData] = useState(false)
  
  // 데이터 로드
  useEffect(() => {
    const fetchStandings = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/baseball/standings?league=${selectedLeague}`)
        const data = await response.json()
        
        if (data.success && data.standings && data.standings.length > 0) {
          setStandings(data.standings)
          setUsingSampleData(false)
        } else {
          // 샘플 데이터 사용
          setStandings(SAMPLE_STANDINGS[selectedLeague] || [])
          setUsingSampleData(true)
        }
      } catch (error) {
        console.error('Failed to fetch standings:', error)
        setStandings(SAMPLE_STANDINGS[selectedLeague] || [])
        setUsingSampleData(true)
      } finally {
        setLoading(false)
      }
    }
    
    fetchStandings()
    setSelectedDivision('ALL')
  }, [selectedLeague])
  
  const divisions = LEAGUE_DIVISIONS[selectedLeague] || ['ALL']
  const hasDivisions = divisions.length > 1

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 히어로 섹션 - 컴팩트 */}
      <div className={`bg-gradient-to-r ${LEAGUE_COLORS[selectedLeague]} text-white`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* 타이틀 */}
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏆</span>
              <div>
                <h1 className="text-lg font-bold">
                  {language === 'ko' ? `${selectedLeague} 순위` : `${selectedLeague} Standings`}
                </h1>
                <p className="text-white/70 text-xs">
                  {language === 'ko' ? '2024 시즌' : '2024 Season'}
                </p>
              </div>
            </div>
            
            {/* 시즌 정보 */}
            <div className="flex items-center gap-2">
              <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-1.5 text-center">
                <p className="text-lg font-bold">{standings.length}</p>
                <p className="text-[10px] text-white/70">{language === 'ko' ? '팀' : 'Teams'}</p>
              </div>
              {usingSampleData && (
                <span className="px-2 py-1 bg-white/20 rounded text-xs font-medium">
                  SAMPLE
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* 비시즌 안내 배너 */}
      {usingSampleData && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
          <div className="max-w-7xl mx-auto px-4 py-2">
            <div className="flex items-center justify-center gap-2 text-xs">
              <span>🏟️</span>
              <p>
                {language === 'ko' 
                  ? '비시즌 기간입니다. 지난 시즌 최종 순위를 표시합니다.' 
                  : 'Off-season. Showing last season final standings.'}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* 리그 선택 탭 */}
      <div className="sticky top-0 z-40 bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2 py-2 overflow-x-auto scrollbar-hide">
            {LEAGUES.map(league => (
              <button
                key={league.id}
                onClick={() => setSelectedLeague(league.id)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all border-2
                  ${selectedLeague === league.id
                    ? league.id === 'KBO' ? 'bg-red-500 text-white border-red-500'
                    : league.id === 'MLB' ? 'bg-blue-600 text-white border-blue-600'
                    : league.id === 'NPB' ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  }
                `}
              >
                {league.name}
              </button>
            ))}
          </div>
          
          {/* 디비전 선택 (MLB, NPB) */}
          {hasDivisions && (
            <div className="flex gap-1 pb-2 overflow-x-auto scrollbar-hide border-t border-gray-100 pt-2">
              <button
                onClick={() => setSelectedDivision('ALL')}
                className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-all ${
                  selectedDivision === 'ALL'
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {language === 'ko' ? '전체' : 'All'}
              </button>
              {divisions.map(div => (
                <button
                  key={div}
                  onClick={() => setSelectedDivision(div)}
                  className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-all ${
                    selectedDivision === div
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {div}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* 순위표 */}
      <div className="max-w-7xl mx-auto px-4 py-4 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-500 mb-4"></div>
            <p className="text-gray-500">
              {language === 'ko' ? '순위를 불러오는 중...' : 'Loading standings...'}
            </p>
          </div>
        ) : standings.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-6xl mb-4 block">🏆</span>
            <p className="text-gray-500">
              {language === 'ko' ? '순위 데이터가 없습니다' : 'No standings data'}
            </p>
          </div>
        ) : (
          <>
            {/* 전체 선택 또는 디비전 없는 리그 */}
            {selectedDivision === 'ALL' ? (
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <StandingsTable 
                  standings={standings} 
                  language={language} 
                />
              </div>
            ) : (
              // 특정 디비전 선택 시
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="px-4 py-2 bg-gray-800 text-white">
                  <h3 className="font-bold text-sm">{selectedDivision}</h3>
                </div>
                <StandingsTable 
                  standings={standings.filter(t => t.division === selectedDivision)} 
                  language={language} 
                />
              </div>
            )}
            
            {/* 범례 */}
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500 justify-center">
              <div className="flex items-center gap-1">
                <span className="font-bold text-gray-900">1~3</span>
                <span>{language === 'ko' ? '상위권' : 'Top 3'}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-emerald-600 font-medium">W</span>
                <span>{language === 'ko' ? '연승' : 'Win'}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-red-500 font-medium">L</span>
                <span>{language === 'ko' ? '연패' : 'Loss'}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}