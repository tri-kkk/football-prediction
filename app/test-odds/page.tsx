'use client'

import { useState } from 'react'

interface OddsData {
  matchId: string
  homeTeam: string
  awayTeam: string
  homeOdds: number
  drawOdds: number
  awayOdds: number
  homeProbability: number
  drawProbability: number
  awayProbability: number
  timestamp: string
  commenceTime: string
}

interface ApiResponse {
  success: boolean
  data: OddsData[]
  source: string
  remainingRequests?: string
  usedRequests?: string
  error?: string
  message?: string
}

export default function OddsTestPage() {
  const [odds, setOdds] = useState<OddsData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiInfo, setApiInfo] = useState<any>(null)
  const [selectedSport, setSelectedSport] = useState('soccer_epl')

  const leagues = [
    { key: 'soccer_epl', name: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League' },
    { key: 'soccer_spain_la_liga', name: '🇪🇸 La Liga' },
    { key: 'soccer_germany_bundesliga', name: '🇩🇪 Bundesliga' },
    { key: 'soccer_italy_serie_a', name: '🇮🇹 Serie A' },
    { key: 'soccer_france_ligue_one', name: '🇫🇷 Ligue 1' },
    { key: 'soccer_uefa_champs_league', name: '⭐ Champions League' }
  ]

  const fetchOdds = async (sport: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/odds?sport=${sport}`)
      const data: ApiResponse = await response.json()
      
      if (data.success) {
        setOdds(data.data)
        setApiInfo({
          source: data.source,
          remaining: data.remainingRequests,
          used: data.usedRequests
        })
      } else {
        setError(data.error || 'Unknown error')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            ⚽ Odds API Test
          </h1>
          <p className="text-gray-400">
            Testing The Odds API integration
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
                key={league.key}
                onClick={() => {
                  setSelectedSport(league.key)
                  fetchOdds(league.key)
                }}
                className={`
                  px-4 py-3 rounded-lg font-medium transition-all
                  ${selectedSport === league.key
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

        {/* API Info */}
        {apiInfo && (
          <div className="bg-blue-900/30 border border-blue-500 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-300">
                Source: <strong>{apiInfo.source}</strong>
              </span>
              {apiInfo.remaining && (
                <span className="text-blue-300">
                  Remaining Requests: <strong>{apiInfo.remaining}</strong>
                </span>
              )}
              {apiInfo.used && (
                <span className="text-blue-300">
                  Used: <strong>{apiInfo.used}</strong>
                </span>
              )}
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
            <p className="text-gray-400">Loading odds...</p>
          </div>
        )}

        {/* Odds Display */}
        {!loading && odds.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white mb-4">
              📊 {odds.length} Matches Found
            </h2>
            
            {odds.map((match) => (
              <div
                key={match.matchId}
                className="bg-slate-800 rounded-xl p-6 hover:bg-slate-750 transition-all"
              >
                {/* Match Info */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">
                      {match.homeTeam} vs {match.awayTeam}
                    </h3>
                    <p className="text-sm text-gray-400">
                      Kick-off: {new Date(match.commenceTime).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Odds & Probabilities */}
                <div className="grid grid-cols-3 gap-4">
                  {/* Home */}
                  <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-500/30">
                    <div className="text-center">
                      <p className="text-xs text-gray-400 mb-1">HOME</p>
                      <p className="text-2xl font-bold text-blue-400 mb-2">
                        {match.homeOdds}
                      </p>
                      <div className="text-sm">
                        <span className="text-gray-300">
                          {match.homeProbability.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Draw */}
                  <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-500/30">
                    <div className="text-center">
                      <p className="text-xs text-gray-400 mb-1">DRAW</p>
                      <p className="text-2xl font-bold text-gray-300 mb-2">
                        {match.drawOdds}
                      </p>
                      <div className="text-sm">
                        <span className="text-gray-300">
                          {match.drawProbability.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Away */}
                  <div className="bg-red-900/30 rounded-lg p-4 border border-red-500/30">
                    <div className="text-center">
                      <p className="text-xs text-gray-400 mb-1">AWAY</p>
                      <p className="text-2xl font-bold text-red-400 mb-2">
                        {match.awayOdds}
                      </p>
                      <div className="text-sm">
                        <span className="text-gray-300">
                          {match.awayProbability.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timestamp */}
                <p className="text-xs text-gray-500 mt-4 text-right">
                  Updated: {new Date(match.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {!loading && odds.length === 0 && !error && (
          <div className="text-center py-12 bg-slate-800 rounded-2xl">
            <p className="text-gray-400 text-lg">
              👆 Select a league to fetch odds
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
