'use client'

import { useState } from 'react'
import MatchRowWithTrend from './MatchRowWithTrend'

// 더미 경기 데이터
const dummyMatches = [
  {
    id: 1,
    homeTeam: '맨체스터 유나이티드',
    awayTeam: '리버풀',
    homeCrest: 'https://crests.football-data.org/66.png',
    awayCrest: 'https://crests.football-data.org/64.png',
    homeWinRate: 35,
    drawRate: 25,
    awayWinRate: 40,
    status: 'SCHEDULED' as const,
    time: '04:30',
    date: '2025-10-31',
    league: 'Premier League',
    leagueLogo: 'https://crests.football-data.org/PL.png',
  },
  {
    id: 2,
    homeTeam: '첼시',
    awayTeam: '아스널',
    homeCrest: 'https://crests.football-data.org/61.png',
    awayCrest: 'https://crests.football-data.org/57.png',
    homeWinRate: 42,
    drawRate: 28,
    awayWinRate: 30,
    status: 'SCHEDULED' as const,
    time: '07:00',
    date: '2025-10-31',
    league: 'Premier League',
    leagueLogo: 'https://crests.football-data.org/PL.png',
  },
  {
    id: 3,
    homeTeam: '맨체스터 시티',
    awayTeam: '토트넘',
    homeCrest: 'https://crests.football-data.org/65.png',
    awayCrest: 'https://crests.football-data.org/73.png',
    homeWinRate: 55,
    drawRate: 23,
    awayWinRate: 22,
    status: 'LIVE' as const,
    score: '2-1',
    homeScore: 2,
    awayScore: 1,
    time: '진행중',
    date: '2025-10-30',
    league: 'Premier League',
    leagueLogo: 'https://crests.football-data.org/PL.png',
  },
  {
    id: 4,
    homeTeam: '레알 마드리드',
    awayTeam: 'FC 바르셀로나',
    homeCrest: 'https://crests.football-data.org/86.png',
    awayCrest: 'https://crests.football-data.org/81.png',
    homeWinRate: 38,
    drawRate: 27,
    awayWinRate: 35,
    status: 'SCHEDULED' as const,
    time: '05:00',
    date: '2025-10-31',
    league: 'La Liga',
    leagueLogo: 'https://crests.football-data.org/PD.png',
  },
]

export default function TrendTestPage() {
  const [darkMode, setDarkMode] = useState(false)
  const [language, setLanguage] = useState<'ko' | 'en'>('ko')

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
      {/* 헤더 */}
      <div className={`border-b ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                ⚽ {language === 'ko' ? '매치 트렌드 테스트' : 'Match Trend Test'}
              </h1>
              <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {language === 'ko' 
                  ? '경기를 클릭하면 24시간 트렌드 차트를 볼 수 있습니다' 
                  : 'Click on a match to see the 24-hour trend chart'}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* 언어 전환 */}
              <button
                onClick={() => setLanguage(language === 'ko' ? 'en' : 'ko')}
                className={`
                  px-4 py-2 rounded-lg font-medium transition-colors
                  ${darkMode 
                    ? 'bg-slate-700 text-white hover:bg-slate-600' 
                    : 'bg-gray-100 text-slate-900 hover:bg-gray-200'}
                `}
              >
                {language === 'ko' ? '🇬🇧 EN' : '🇰🇷 KO'}
              </button>

              {/* 다크모드 토글 */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`
                  px-4 py-2 rounded-lg font-medium transition-colors
                  ${darkMode 
                    ? 'bg-slate-700 text-white hover:bg-slate-600' 
                    : 'bg-gray-100 text-slate-900 hover:bg-gray-200'}
                `}
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 안내 메시지 */}
        <div className={`
          mb-6 p-4 rounded-xl border-2 border-dashed
          ${darkMode ? 'border-slate-600 bg-slate-800/30' : 'border-slate-300 bg-blue-50/50'}
        `}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <h3 className={`font-semibold mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {language === 'ko' ? '사용 방법' : 'How to Use'}
              </h3>
              <ul className={`text-sm space-y-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                <li>• {language === 'ko' 
                  ? '경기 카드를 클릭하면 24시간 트렌드 차트가 표시됩니다' 
                  : 'Click on a match card to display the 24-hour trend chart'}</li>
                <li>• {language === 'ko' 
                  ? '파란선은 홈팀, 빨간선은 원정팀 승률입니다' 
                  : 'Blue line shows home team probability, red line shows away team probability'}</li>
                <li>• {language === 'ko' 
                  ? '회색 영역은 무승부 영역을 나타냅니다' 
                  : 'Gray area represents draw probability'}</li>
                <li>• {language === 'ko' 
                  ? '차트에 마우스를 올리면 정확한 시간과 승률을 확인할 수 있습니다' 
                  : 'Hover over the chart to see exact time and probabilities'}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 경기 목록 */}
        <div className="space-y-4">
          {dummyMatches.map(match => (
            <MatchRowWithTrend 
              key={match.id}
              match={match}
              darkMode={darkMode}
              language={language}
            />
          ))}
        </div>

        {/* 통계 요약 */}
        <div className={`
          mt-8 p-6 rounded-xl
          ${darkMode ? 'bg-slate-800' : 'bg-white'}
        `}>
          <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            📊 {language === 'ko' ? '테스트 통계' : 'Test Statistics'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
              <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {language === 'ko' ? '총 경기 수' : 'Total Matches'}
              </div>
              <div className={`text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {dummyMatches.length}
              </div>
            </div>
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
              <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {language === 'ko' ? '라이브 경기' : 'Live Matches'}
              </div>
              <div className={`text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {dummyMatches.filter(m => m.status === 'LIVE').length}
              </div>
            </div>
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
              <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {language === 'ko' ? '예정 경기' : 'Scheduled Matches'}
              </div>
              <div className={`text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {dummyMatches.filter(m => m.status === 'SCHEDULED').length}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
