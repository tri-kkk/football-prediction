'use client'
import React, { useState, useEffect } from 'react'

interface MatchPollProps {
  matchId: string
  homeTeam: string
  awayTeam: string
  homeTeamKR?: string
  awayTeamKR?: string
  leagueCode?: string
  matchDate?: string
  darkMode?: boolean
  language?: 'ko' | 'en'
  // AI 예측 데이터 (기존 PICK 시스템)
  aiPrediction?: {
    homeWin: number
    draw: number
    awayWin: number
  }
}

interface PollData {
  homeVotes: number
  drawVotes: number
  awayVotes: number
  totalVotes: number
  homePercent: number
  drawPercent: number
  awayPercent: number
  myVote: string | null
}

export default function MatchPoll({
  matchId,
  homeTeam,
  awayTeam,
  homeTeamKR,
  awayTeamKR,
  leagueCode,
  matchDate,
  darkMode = true,
  language = 'ko',
  aiPrediction
}: MatchPollProps) {
  const [pollData, setPollData] = useState<PollData>({
    homeVotes: 0,
    drawVotes: 0,
    awayVotes: 0,
    totalVotes: 0,
    homePercent: 0,
    drawPercent: 0,
    awayPercent: 0,
    myVote: null
  })
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState(false)
  const [voterId, setVoterId] = useState<string>('')

  // 익명 사용자 ID 생성/가져오기
  useEffect(() => {
    let id = localStorage.getItem('trendsoccer_voter_id')
    if (!id) {
      id = 'voter_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
      localStorage.setItem('trendsoccer_voter_id', id)
    }
    setVoterId(id)
  }, [])

  // 투표 데이터 로드
  useEffect(() => {
    if (!matchId || !voterId) return

    const fetchPollData = async () => {
      try {
        const res = await fetch(`/api/poll?matchId=${matchId}&voterId=${voterId}`)
        if (res.ok) {
          const data = await res.json()
          setPollData(data)
        }
      } catch (error) {
        console.error('Poll fetch error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPollData()
  }, [matchId, voterId])

  // 투표 처리
  const handleVote = async (vote: 'home' | 'draw' | 'away') => {
    if (voting || !voterId) return
    
    setVoting(true)
    try {
      const res = await fetch('/api/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          voterId,
          vote,
          homeTeam,
          awayTeam,
          leagueCode,
          matchDate
        })
      })

      if (res.ok) {
        const data = await res.json()
        setPollData({
          homeVotes: data.homeVotes,
          drawVotes: data.drawVotes,
          awayVotes: data.awayVotes,
          totalVotes: data.totalVotes,
          homePercent: data.homePercent,
          drawPercent: data.drawPercent,
          awayPercent: data.awayPercent,
          myVote: vote
        })
      }
    } catch (error) {
      console.error('Vote submit error:', error)
    } finally {
      setVoting(false)
    }
  }

  const homeDisplayName = language === 'ko' ? (homeTeamKR || homeTeam) : homeTeam
  const awayDisplayName = language === 'ko' ? (awayTeamKR || awayTeam) : awayTeam
  const hasVoted = pollData.myVote !== null
  const showResults = hasVoted || pollData.totalVotes >= 5 // 5명 이상 또는 투표 후 결과 표시

  // 투표 수가 적을 때 표시할 텍스트
  const getParticipationText = () => {
    if (pollData.totalVotes === 0) {
      return language === 'ko' ? '첫 번째 예측자가 되어보세요!' : 'Be the first to predict!'
    }
    if (pollData.totalVotes < 5) {
      return language === 'ko' 
        ? `${pollData.totalVotes}명 참여 중` 
        : `${pollData.totalVotes} votes`
    }
    if (pollData.totalVotes >= 50) {
      return language === 'ko' 
        ? `🔥 ${pollData.totalVotes}명 참여` 
        : `🔥 ${pollData.totalVotes} votes`
    }
    return language === 'ko' 
      ? `${pollData.totalVotes}명 참여` 
      : `${pollData.totalVotes} votes`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-5 h-5 border-2 border-gray-600 border-t-[#A3FF4C] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className={`rounded-xl p-4 ${darkMode ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
      {/* 헤더: AI vs 커뮤니티 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🗳️</span>
          <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {language === 'ko' ? '승부 예측' : 'Match Prediction'}
          </span>
        </div>
        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {getParticipationText()}
        </span>
      </div>

      {/* AI 예측 + 커뮤니티 예측 비교 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* AI 예측 */}
        {aiPrediction && (
          <div className={`rounded-lg p-3 ${darkMode ? 'bg-[#0d1f0d] border border-[#A3FF4C]/20' : 'bg-green-50 border border-green-200'}`}>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-sm">🤖</span>
              <span className={`text-xs font-medium ${darkMode ? 'text-[#A3FF4C]' : 'text-green-700'}`}>
                {language === 'ko' ? 'AI 예측' : 'AI Prediction'}
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {homeDisplayName.length > 6 ? homeDisplayName.substring(0, 6) + '..' : homeDisplayName}
                </span>
                <span className={`text-xs font-bold ${aiPrediction.homeWin > aiPrediction.awayWin ? 'text-[#A3FF4C]' : darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {aiPrediction.homeWin}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {language === 'ko' ? '무승부' : 'Draw'}
                </span>
                <span className={`text-xs font-bold ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {aiPrediction.draw}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {awayDisplayName.length > 6 ? awayDisplayName.substring(0, 6) + '..' : awayDisplayName}
                </span>
                <span className={`text-xs font-bold ${aiPrediction.awayWin > aiPrediction.homeWin ? 'text-[#A3FF4C]' : darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {aiPrediction.awayWin}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 커뮤니티 예측 */}
        <div className={`rounded-lg p-3 ${darkMode ? 'bg-[#1f1a0d] border border-orange-500/20' : 'bg-orange-50 border border-orange-200'}`}>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-sm">👥</span>
            <span className={`text-xs font-medium ${darkMode ? 'text-orange-400' : 'text-orange-700'}`}>
              {language === 'ko' ? '팬 예측' : 'Fan Pick'}
            </span>
          </div>
          {showResults ? (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {homeDisplayName.length > 6 ? homeDisplayName.substring(0, 6) + '..' : homeDisplayName}
                </span>
                <span className={`text-xs font-bold ${pollData.homePercent >= pollData.awayPercent && pollData.homePercent >= pollData.drawPercent ? 'text-orange-400' : darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {pollData.homePercent}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {language === 'ko' ? '무승부' : 'Draw'}
                </span>
                <span className={`text-xs font-bold ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {pollData.drawPercent}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {awayDisplayName.length > 6 ? awayDisplayName.substring(0, 6) + '..' : awayDisplayName}
                </span>
                <span className={`text-xs font-bold ${pollData.awayPercent > pollData.homePercent && pollData.awayPercent > pollData.drawPercent ? 'text-orange-400' : darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {pollData.awayPercent}%
                </span>
              </div>
            </div>
          ) : (
            <div className={`text-center py-2 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {language === 'ko' ? '투표 후 결과 확인' : 'Vote to see results'}
            </div>
          )}
        </div>
      </div>

      {/* 투표 버튼 */}
      <div className="space-y-2">
        <div className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {hasVoted 
            ? (language === 'ko' ? '내 예측 (변경 가능)' : 'My prediction (changeable)')
            : (language === 'ko' ? '당신의 예측은?' : 'Your prediction?')
          }
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          {/* 홈 승 버튼 */}
          <button
            onClick={() => handleVote('home')}
            disabled={voting}
            className={`relative py-3 px-2 rounded-lg font-medium text-sm transition-all ${
              pollData.myVote === 'home'
                ? 'bg-[#A3FF4C] text-gray-900 ring-2 ring-[#A3FF4C]/50'
                : darkMode
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            } ${voting ? 'opacity-50' : ''}`}
          >
            {showResults && (
              <div 
                className="absolute inset-0 rounded-lg bg-[#A3FF4C]/10 transition-all"
                style={{ width: `${pollData.homePercent}%` }}
              />
            )}
            <span className="relative z-10">
              {homeDisplayName.length > 5 ? homeDisplayName.substring(0, 5) + '..' : homeDisplayName}
            </span>
            {pollData.myVote === 'home' && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#A3FF4C] rounded-full flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
          </button>

          {/* 무승부 버튼 */}
          <button
            onClick={() => handleVote('draw')}
            disabled={voting}
            className={`relative py-3 px-2 rounded-lg font-medium text-sm transition-all ${
              pollData.myVote === 'draw'
                ? 'bg-gray-400 text-gray-900 ring-2 ring-gray-400/50'
                : darkMode
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            } ${voting ? 'opacity-50' : ''}`}
          >
            {showResults && (
              <div 
                className="absolute inset-0 rounded-lg bg-gray-400/10 transition-all"
                style={{ width: `${pollData.drawPercent}%` }}
              />
            )}
            <span className="relative z-10">
              {language === 'ko' ? '무승부' : 'Draw'}
            </span>
            {pollData.myVote === 'draw' && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-gray-400 rounded-full flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
          </button>

          {/* 원정 승 버튼 */}
          <button
            onClick={() => handleVote('away')}
            disabled={voting}
            className={`relative py-3 px-2 rounded-lg font-medium text-sm transition-all ${
              pollData.myVote === 'away'
                ? 'bg-blue-500 text-white ring-2 ring-blue-500/50'
                : darkMode
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            } ${voting ? 'opacity-50' : ''}`}
          >
            {showResults && (
              <div 
                className="absolute inset-0 rounded-lg bg-blue-500/10 transition-all"
                style={{ width: `${pollData.awayPercent}%` }}
              />
            )}
            <span className="relative z-10">
              {awayDisplayName.length > 5 ? awayDisplayName.substring(0, 5) + '..' : awayDisplayName}
            </span>
            {pollData.myVote === 'away' && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
          </button>
        </div>
      </div>

      {/* AI vs 커뮤니티 일치 여부 */}
      {aiPrediction && showResults && pollData.totalVotes >= 5 && (
        <div className={`mt-3 pt-3 border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          {(() => {
            const aiWinner = aiPrediction.homeWin > aiPrediction.awayWin ? 'home' : aiPrediction.awayWin > aiPrediction.homeWin ? 'away' : 'draw'
            const communityWinner = pollData.homePercent > pollData.awayPercent ? 'home' : pollData.awayPercent > pollData.homePercent ? 'away' : 'draw'
            const isMatched = aiWinner === communityWinner

            return (
              <div className="flex items-center justify-center gap-2">
                {isMatched ? (
                  <>
                    <span className="text-green-400">✓</span>
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {language === 'ko' ? 'AI와 커뮤니티 예측 일치!' : 'AI & Community agree!'}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-orange-400">⚡</span>
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {language === 'ko' ? 'AI vs 커뮤니티 의견 분분' : 'AI & Community disagree'}
                    </span>
                  </>
                )}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}