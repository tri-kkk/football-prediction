'use client'

import { useState } from 'react'
import Image from 'next/image'

interface IntegratedMatch {
  id: number
  league: string
  leagueCode: string
  leagueLogo: string
  date: string
  time: string
  homeTeam: string
  awayTeam: string
  homeCrest: string
  awayCrest: string
  homeScore: number | null
  awayScore: number | null
  status: string
  homeWinRate: number
  drawRate: number
  awayWinRate: number
  homeOdds: number
  drawOdds: number
  awayOdds: number
  oddsSource: 'live' | 'estimated' | 'none'
  oddsTimestamp?: string
}

interface ApiResponse {
  success: boolean
  matches: IntegratedMatch[]
  stats: {
    total: number
    liveOdds: number
    estimated: number
  }
  error?: string
}

export default function IntegratedTestPage() {
  const [matches, setMatches] = useState<IntegratedMatch[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [selectedLeague, setSelectedLeague] = useState('PL')

  const leagues = [
    { code: 'PL', name: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League' },
    { code: 'PD', name: '🇪🇸 La Liga' },
    { code: 'BL1', name: '🇩🇪 Bundesliga' },
    { code: 'SA', name: '🇮🇹 Serie A' },
    { code: 'FL1', name: '🇫🇷 Ligue 1' },
    { code: 'CL', name: '⭐ Champions League' }
  ]

  const fetchMatches = async (leagueCode: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/matches-with-odds?league=${leagueCode}`)
      const data: ApiResponse = await response.json()
      
      if (data.success) {
        setMatches(data.matches)
        setStats(data.stats)
      } else {
        setError(data.error || 'Unknown error')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }

  const getOddsSourceBadge = (source: string) => {
    switch (source) {
      case 'live':
        return <span className="px-2 py-1 text-xs font-bold bg-green-500 text-white rounded">LIVE ODDS</span>
      case 'estimated':
        return <span className="px-2 py-1 text-xs font-bold bg-yellow-500 text-black rounded">ESTIMATED</span>
      default:
        return <span className="px-2 py-1 text-xs font-bold bg-gray-500 text-white rounded">NO ODDS</span>
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🔗 Integrated API Test
          </h1>
          <p className="text-gray-400">
            Football-Data + The Odds API = Perfect Match Data
          </p>
        </div>

        {/* League Selector */}
        <div className="bg-slate-800 rounded-2xl p-6 mb-6">
          <label className="text-white font-semibold mb-3 block">
            Select League:
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {leagues.map((league) => (
              <button
                key={league.code}
                onClick={() => {
                  setSelectedLeague(league.code)
                  fetchMatches(league.code)
                }}
                className={`
                  px-4 py-3 rounded-lg font-medium transition-all
                  ${selectedLeague === league.code
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }
                `}
              >
                {league.name}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-800 rounded-xl p-4">
              <p className="text-gray-400 text-sm mb-1">Total Matches</p>
              <p className="text-3xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="bg-green-900/30 border border-green-500 rounded-xl p-4">
              <p className="text-green-300 text-sm mb-1">Live Odds</p>
              <p className="text-3xl font-bold text-green-400">{stats.liveOdds}</p>
            </div>
            <div className="bg-yellow-900/30 border border-yellow-500 rounded-xl p-4">
              <p className="text-yellow-300 text-sm mb-1">Estimated</p>
              <p className="text-3xl font-bold text-yellow-400">{stats.estimated}</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-500 rounded-xl p-4 mb-6">
            <p className="text-red-300">❌ Error: {error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-400">Loading integrated data...</p>
          </div>
        )}

        {/* Matches */}
        {!loading && matches.length > 0 && (
          <div className="space-y-4">
            {matches.map((match) => (
              <div
                key={match.id}
                className="bg-slate-800 rounded-xl p-6 hover:bg-slate-750 transition-all"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Image
                      src={match.leagueLogo}
                      alt={match.league}
                      width={32}
                      height={32}
                      className="rounded"
                    />
                    <div>
                      <h3 className="text-sm text-gray-400">{match.league}</h3>
                      <p className="text-xs text-gray-500">
                        {match.date} {match.time}
                      </p>
                    </div>
                  </div>
                  {getOddsSourceBadge(match.oddsSource)}
                </div>

                {/* Teams */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1">
                    <Image
                      src={match.homeCrest}
                      alt={match.homeTeam}
                      width={48}
                      height={48}
                      className="rounded"
                    />
                    <span className="text-lg font-bold text-white">
                      {match.homeTeam}
                    </span>
                  </div>
                  
                  <span className="text-2xl font-bold text-gray-500 mx-4">VS</span>
                  
                  <div className="flex items-center gap-3 flex-1 justify-end">
                    <span className="text-lg font-bold text-white text-right">
                      {match.awayTeam}
                    </span>
                    <Image
                      src={match.awayCrest}
                      alt={match.awayTeam}
                      width={48}
                      height={48}
                      className="rounded"
                    />
                  </div>
                </div>

                {/* Odds & Probabilities */}
                <div className="grid grid-cols-3 gap-4">
                  {/* Home */}
                  <div className={`rounded-lg p-4 border ${
                    match.oddsSource === 'live' 
                      ? 'bg-blue-900/30 border-blue-500/30' 
                      : 'bg-blue-900/20 border-blue-500/20'
                  }`}>
                    <div className="text-center">
                      <p className="text-xs text-gray-400 mb-1">HOME WIN</p>
                      <p className="text-2xl font-bold text-blue-400 mb-1">
                        {match.homeOdds.toFixed(2)}
                      </p>
                      <p className="text-sm font-bold text-gray-300">
                        {match.homeWinRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* Draw */}
                  <div className={`rounded-lg p-4 border ${
                    match.oddsSource === 'live'
                      ? 'bg-gray-700/30 border-gray-500/30'
                      : 'bg-gray-700/20 border-gray-500/20'
                  }`}>
                    <div className="text-center">
                      <p className="text-xs text-gray-400 mb-1">DRAW</p>
                      <p className="text-2xl font-bold text-gray-300 mb-1">
                        {match.drawOdds.toFixed(2)}
                      </p>
                      <p className="text-sm font-bold text-gray-300">
                        {match.drawRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* Away */}
                  <div className={`rounded-lg p-4 border ${
                    match.oddsSource === 'live'
                      ? 'bg-red-900/30 border-red-500/30'
                      : 'bg-red-900/20 border-red-500/20'
                  }`}>
                    <div className="text-center">
                      <p className="text-xs text-gray-400 mb-1">AWAY WIN</p>
                      <p className="text-2xl font-bold text-red-400 mb-1">
                        {match.awayOdds.toFixed(2)}
                      </p>
                      <p className="text-sm font-bold text-gray-300">
                        {match.awayWinRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Timestamp */}
                {match.oddsTimestamp && (
                  <p className="text-xs text-gray-500 mt-3 text-right">
                    Odds updated: {new Date(match.oddsTimestamp).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && matches.length === 0 && !error && (
          <div className="text-center py-12 bg-slate-800 rounded-2xl">
            <p className="text-gray-400 text-lg">
              👆 Select a league to fetch integrated data
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
