'use client'

import { useState, useEffect } from 'react'

interface Match {
  id: number
  league: string
  leagueLogo?: string
  date: string
  time: string
  homeTeam: string
  awayTeam: string
  homeCrest: string
  awayCrest: string
  homeScore: number | null
  awayScore: number | null
  status: string
}


interface NewsItem {
  title: string
  url: string
  source: string
  img?: string
  time?: string
}

// íŒ€ ì´ë¦„ ë²ˆì—­ (í•œ/ì˜)
const getTeamName = (teamName: string, lang: 'ko' | 'en'): string => {
  if (lang === 'en') return teamName
  
  const teamTranslations: { [key: string]: string } = {
    'Manchester United FC': 'ë§¨ì²´ìŠ¤í„° ìœ ë‚˜ì´í‹°ë“œ',
    'Manchester City FC': 'ë§¨ì²´ìŠ¤í„° ì‹œí‹°',
    'Liverpool FC': 'ë¦¬ë²„í’€',
    'Chelsea FC': 'ì²¼ì‹œ',
    'Arsenal FC': 'ì•„ìŠ¤ë‚ ',
    'Tottenham Hotspur FC': 'í† íŠ¸ë„˜',
    'FC Barcelona': 'ë°”ë¥´ì…€ë¡œë‚˜',
    'Real Madrid CF': 'ë ˆì•Œ ë§ˆë“œë¦¬ë“œ',
    'AtlÃ©tico de Madrid': 'ì•„í‹€ë ˆí‹°ì½” ë§ˆë“œë¦¬ë“œ',
    'FC Bayern MÃ¼nchen': 'ë°”ì´ì—ë¥¸ ë®Œí—¨',
    'Borussia Dortmund': 'ë„ë¥´íŠ¸ë¬¸íŠ¸',
    'Juventus FC': 'ìœ ë²¤íˆ¬ìŠ¤',
    'Inter Milan': 'ì¸í…Œë¥´',
    'AC Milan': 'ë°€ëž€',
    'Paris Saint-Germain FC': 'íŒŒë¦¬ ìƒì œë¥´ë§¹',
    'SSC Napoli': 'ë‚˜í´ë¦¬',
    'US Lecce': 'ë ˆì²´',
    'Atalanta BC': 'ì•„íƒˆëž€íƒ€',
    'Como 1907': 'ì½”ëª¨',
    'Hellas Verona': 'ë² ë¡œë‚˜',
    'AS Roma': 'ë¡œë§ˆ',
    'Parma Calcio 1913': 'íŒŒë¥´ë§ˆ',
  }
  
  return teamTranslations[teamName] || teamName
}

// íŒ€ ì´ë¦„ í•œê¸€ ë²ˆì—­ (í•˜ìœ„ í˜¸í™˜)
const translateTeamName = (teamName: string): string => {
  return getTeamName(teamName, 'ko')
}

// ë¦¬ê·¸ ì´ë¦„ í•œê¸€ ë²ˆì—­
const translateLeagueName = (leagueName: string): string => {
  const leagueTranslations: { [key: string]: string } = {
    'Premier League': 'í”„ë¦¬ë¯¸ì–´ë¦¬ê·¸',
    'Primera Division': 'ë¼ë¦¬ê°€',
    'Serie A': 'ì„¸ë¦¬ì— A',
    'Bundesliga': 'ë¶„ë°ìŠ¤ë¦¬ê°€',
    'Ligue 1': 'ë¦¬ê·¸ 1',
    'UEFA Champions League': 'ì±”í”¼ì–¸ìŠ¤ë¦¬ê·¸',
    'Championship': 'ì±”í”¼ì–¸ì‹­',
    '2. Bundesliga': 'ë¶„ë°ìŠ¤2',
    'Serie B': 'ì„¸ë¦¬ì— B',
    'Eredivisie': 'ì—ë ˆë””ë¹„ì‹œ',
    'Primeira Liga': 'í”„ë¦¬ë©”ì´ë¼ë¦¬ê°€',
    'Scottish Premiership': 'ìŠ¤ì½”í‹€ëžœë“œ í”„ë¦¬ë¯¸ì–´ì‹­',
  }
  
  return leagueTranslations[leagueName] || leagueName
}

// êµ­ê¸° ì´ë¯¸ì§€ URL ë§¤í•‘ (flagcdn.com ë¬´ë£Œ ì„œë¹„ìŠ¤)
const countryFlags: { [key: string]: string } = {
  'England': 'https://flagcdn.com/w40/gb-eng.png',
  'ìž‰ê¸€ëžœë“œ': 'https://flagcdn.com/w40/gb-eng.png',
  'Spain': 'https://flagcdn.com/w40/es.png',
  'ìŠ¤íŽ˜ì¸': 'https://flagcdn.com/w40/es.png',
  'Italy': 'https://flagcdn.com/w40/it.png',
  'ì´íƒˆë¦¬ì•„': 'https://flagcdn.com/w40/it.png',
  'Germany': 'https://flagcdn.com/w40/de.png',
  'ë…ì¼': 'https://flagcdn.com/w40/de.png',
  'France': 'https://flagcdn.com/w40/fr.png',
  'í”„ëž‘ìŠ¤': 'https://flagcdn.com/w40/fr.png',
  'Netherlands': 'https://flagcdn.com/w40/nl.png',
  'ë„¤ëœëž€ë“œ': 'https://flagcdn.com/w40/nl.png',
  'Portugal': 'https://flagcdn.com/w40/pt.png',
  'í¬ë¥´íˆ¬ê°ˆ': 'https://flagcdn.com/w40/pt.png',
  'Europe': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Flag_of_Europe.svg/40px-Flag_of_Europe.svg.png',
  'ìœ ëŸ½': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Flag_of_Europe.svg/40px-Flag_of_Europe.svg.png',
}

// ë¦¬ê·¸ ì •ë³´ (ì— ë¸”ëŸ¼, êµ­ê°€ í¬í•¨)
const leagueInfo: { [key: string]: { ko: string; en: string; logo: string; country: string; countryKo: string } } = {
  'Premier League': { 
    ko: 'í”„ë¦¬ë¯¸ì–´ë¦¬ê·¸', 
    en: 'Premier League',
    logo: 'https://crests.football-data.org/PL.png',
    country: 'England',
    countryKo: 'ìž‰ê¸€ëžœë“œ'
  },
  'Championship': { 
    ko: 'ì±”í”¼ì–¸ì‹­', 
    en: 'Championship',
    logo: 'https://crests.football-data.org/ELC.png',
    country: 'England',
    countryKo: 'ìž‰ê¸€ëžœë“œ'
  },
  'Primera Division': { 
    ko: 'ë¼ë¦¬ê°€', 
    en: 'La Liga',
    logo: 'https://crests.football-data.org/PD.png',
    country: 'Spain',
    countryKo: 'ìŠ¤íŽ˜ì¸'
  },
  'Serie A': { 
    ko: 'ì„¸ë¦¬ì— A', 
    en: 'Serie A',
    logo: 'https://crests.football-data.org/SA.png',
    country: 'Italy',
    countryKo: 'ì´íƒˆë¦¬ì•„'
  },
  'Serie B': { 
    ko: 'ì„¸ë¦¬ì— B', 
    en: 'Serie B',
    logo: 'https://crests.football-data.org/SA.png',
    country: 'Italy',
    countryKo: 'ì´íƒˆë¦¬ì•„'
  },
  'Bundesliga': { 
    ko: 'ë¶„ë°ìŠ¤ë¦¬ê°€', 
    en: 'Bundesliga',
    logo: 'https://crests.football-data.org/BL1.png',
    country: 'Germany',
    countryKo: 'ë…ì¼'
  },
  '2. Bundesliga': { 
    ko: 'ë¶„ë°ìŠ¤ë¦¬ê°€2', 
    en: '2. Bundesliga',
    logo: 'https://crests.football-data.org/BL1.png',
    country: 'Germany',
    countryKo: 'ë…ì¼'
  },
  'Ligue 1': { 
    ko: 'ë¦¬ê·¸ 1', 
    en: 'Ligue 1',
    logo: 'https://crests.football-data.org/FL1.png',
    country: 'France',
    countryKo: 'í”„ëž‘ìŠ¤'
  },
  'Eredivisie': { 
    ko: 'ì—ë ˆë””ë¹„ì‹œ', 
    en: 'Eredivisie',
    logo: 'https://crests.football-data.org/DED.png',
    country: 'Netherlands',
    countryKo: 'ë„¤ëœëž€ë“œ'
  },
  'Primeira Liga': { 
    ko: 'í”„ë¦¬ë©”ì´ë¼ë¦¬ê°€', 
    en: 'Primeira Liga',
    logo: 'https://crests.football-data.org/PPL.png',
    country: 'Portugal',
    countryKo: 'í¬ë¥´íˆ¬ê°ˆ'
  },
  'UEFA Champions League': { 
    ko: 'ì±”í”¼ì–¸ìŠ¤ë¦¬ê·¸', 
    en: 'Champions League',
    logo: 'https://crests.football-data.org/CL.png',
    country: 'Europe',
    countryKo: 'ìœ ëŸ½'
  },
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'scheduled' | 'results'>('scheduled')
  const [selectedLeague, setSelectedLeague] = useState<string>('all')
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [analysis, setAnalysis] = useState<string>('')
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)
  const [h2h, setH2H] = useState<string>('')
  const [loadingH2H, setLoadingH2H] = useState(false)
  const [showH2HModal, setShowH2HModal] = useState(false)
  const [language, setLanguage] = useState<'ko' | 'en'>('ko')
  const [standings, setStandings] = useState<StandingsData | null>(null)
  const [loadingStandings, setLoadingStandings] = useState(false)
  const [selectedStandingsLeague, setSelectedStandingsLeague] = useState<string>('PL') // ê¸°ë³¸: í”„ë¦¬ë¯¸ì–´ë¦¬ê·¸
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date()) // ë§ˆì§€ë§‰ ì—…ë°ì´íŠ¸ ì‹œê°„
  const [autoRefresh, setAutoRefresh] = useState(true) // ìžë™ ìƒˆë¡œê³ ì¹¨ on/off

  // ì–¸ì–´ ë³€ê²½ ì‹œ ì„ íƒëœ êµ­ê°€ë„ ì—…ë°ì´íŠ¸
  useEffect(() => {
    const countryMap: { [key: string]: string } = {
      'ìž‰ê¸€ëžœë“œ': 'England', 'England': 'ìž‰ê¸€ëžœë“œ',
      'ìŠ¤íŽ˜ì¸': 'Spain', 'Spain': 'ìŠ¤íŽ˜ì¸',
      'ì´íƒˆë¦¬ì•„': 'Italy', 'Italy': 'ì´íƒˆë¦¬ì•„',
      'ë…ì¼': 'Germany', 'Germany': 'ë…ì¼',
      'í”„ëž‘ìŠ¤': 'France', 'France': 'í”„ëž‘ìŠ¤',
      'ë„¤ëœëž€ë“œ': 'Netherlands', 'Netherlands': 'ë„¤ëœëž€ë“œ',
      'í¬ë¥´íˆ¬ê°ˆ': 'Portugal', 'Portugal': 'í¬ë¥´íˆ¬ê°ˆ',
      'ìœ ëŸ½': 'Europe', 'Europe': 'ìœ ëŸ½',
    }
    setSelectedCountry(countryMap[selectedCountry] || (language === 'ko' ? 'ìž‰ê¸€ëžœë“œ' : 'England'))
  }, [language])

  // ë‹¤í¬ëª¨ë“œ í† ê¸€
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  // ê²½ê¸° ë°ì´í„° ë¡œë“œ (ìžë™ ìƒˆë¡œê³ ì¹¨ í¬í•¨)
  useEffect(() => {
    const fetchMatches = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/matches?type=${activeTab}`)
        const data = await response.json()
        setMatches(data)
        setLastUpdate(new Date()) // ì—…ë°ì´íŠ¸ ì‹œê°„ ê¸°ë¡
      } catch (error) {
        console.error('ê²½ê¸° ë¡œë“œ ì‹¤íŒ¨:', error)
      } finally {
        setLoading(false)
      }
    }

    // ìµœì´ˆ ë¡œë“œ
    fetchMatches()

    // ìžë™ ìƒˆë¡œê³ ì¹¨ ì„¤ì • (30ì´ˆë§ˆë‹¤) - autoRefreshê°€ trueì¼ ë•Œë§Œ
    if (autoRefresh) {
      const intervalId = setInterval(() => {
        fetchMatches()
      }, 30000) // 30ì´ˆ = 30,000ms

      // í´ë¦°ì—…: ì»´í¬ë„ŒíŠ¸ ì–¸ë§ˆìš´íŠ¸ ì‹œ interval ì •ë¦¬
      return () => clearInterval(intervalId)
    }
  }, [activeTab, autoRefresh])

  // ìˆœìœ„í‘œ ë°ì´í„° ë¡œë“œ (ìžë™ ìƒˆë¡œê³ ì¹¨ í¬í•¨)
  useEffect(() => {
    const fetchStandings = async () => {
      setLoadingStandings(true)
      try {
        const response = await fetch(`/api/standings?league=${selectedStandingsLeague}`)
      try {
        // ë¡œì»¬ API ë¼ìš°íŠ¸ë¥¼ í†µí•´ ë‰´ìŠ¤ ê°€ì ¸ì˜¤ê¸° (CORS íšŒí”¼)
        const response = await fetch('/api/news')
        
        if (!response.ok) {
          throw new Error('ë‰´ìŠ¤ ë¡œë“œ ì‹¤íŒ¨')
        }
        
        const data = await response.json()
        
        // ë°ì´í„° ì„¤ì •
        setNews(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('ë‰´ìŠ¤ ë¡œë“œ ì‹¤íŒ¨:', error)
        // ì‹¤íŒ¨ ì‹œ ë¹ˆ ë°°ì—´
        setNews([])
      } finally {
        setLoadingNews(false)
      }
    }

    fetchNews()
  }, [])

  // AI ë¶„ì„ í•¸ë“¤ëŸ¬
  const handleAnalysis = async (match: Match) => {
    setSelectedMatch(match)
    setShowAnalysisModal(true)
    setLoadingAnalysis(true)
    setAnalysis('')

    try {
      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match })
      })
      
      if (!response.ok) {
        throw new Error(`API ì˜¤ë¥˜: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.analysis) {
        setAnalysis(data.analysis)
      } else {
        throw new Error('ë¶„ì„ ë°ì´í„°ê°€ ì—†ìŠµë‹ˆë‹¤')
      }
    } catch (error) {
      console.error('ë¶„ì„ ì˜¤ë¥˜:', error)
      setAnalysis(`## âš ï¸ ë¶„ì„ì„ ë¶ˆëŸ¬ì˜¬ ìˆ˜ ì—†ìŠµë‹ˆë‹¤\n\nì£„ì†¡í•©ë‹ˆë‹¤. í˜„ìž¬ AI ë¶„ì„ ì„œë¹„ìŠ¤ì— ì¼ì‹œì ì¸ ë¬¸ì œê°€ ë°œìƒí–ˆìŠµë‹ˆë‹¤.\n\n**ê°€ëŠ¥í•œ ì›ì¸:**\n- API í˜¸ì¶œ ì œí•œ ë„ë‹¬\n- ë„¤íŠ¸ì›Œí¬ ì—°ê²° ë¬¸ì œ\n- ì„œë²„ ì¼ì‹œì  ì˜¤ë¥˜\n\n**í•´ê²° ë°©ë²•:**\n- ìž ì‹œ í›„ ë‹¤ì‹œ ì‹œë„í•´ì£¼ì„¸ìš”\n- íŽ˜ì´ì§€ë¥¼ ìƒˆë¡œê³ ì¹¨ í•´ë³´ì„¸ìš”\n- ë¬¸ì œê°€ ê³„ì†ë˜ë©´ ê´€ë¦¬ìžì—ê²Œ ë¬¸ì˜í•´ì£¼ì„¸ìš”\n\nì˜¤ë¥˜ ìƒì„¸: ${error instanceof Error ? error.message : 'ì•Œ ìˆ˜ ì—†ëŠ” ì˜¤ë¥˜'}`)
    } finally {
      setLoadingAnalysis(false)
    }
  }

  // H2H ë¶„ì„ í•¸ë“¤ëŸ¬
  const handleH2H = async (match: Match) => {
    setSelectedMatch(match)
    setShowH2HModal(true)
    setLoadingH2H(true)
    setH2H('')

    try {
      const response = await fetch('/api/h2h', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match })
      })
      
      if (!response.ok) {
        throw new Error(`API ì˜¤ë¥˜: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.h2h) {
        setH2H(data.h2h)
      } else {
        throw new Error('H2H ë°ì´í„°ê°€ ì—†ìŠµë‹ˆë‹¤')
      }
    } catch (error) {
      console.error('H2H ì˜¤ë¥˜:', error)
      setH2H(`## âš ï¸ ìƒëŒ€ì „ì ì„ ë¶ˆëŸ¬ì˜¬ ìˆ˜ ì—†ìŠµë‹ˆë‹¤\n\nì£„ì†¡í•©ë‹ˆë‹¤. í˜„ìž¬ H2H ë¶„ì„ ì„œë¹„ìŠ¤ì— ì¼ì‹œì ì¸ ë¬¸ì œê°€ ë°œìƒí–ˆìŠµë‹ˆë‹¤.\n\n**ê°€ëŠ¥í•œ ì›ì¸:**\n- API í˜¸ì¶œ ì œí•œ ë„ë‹¬\n- ë„¤íŠ¸ì›Œí¬ ì—°ê²° ë¬¸ì œ\n- ì„œë²„ ì¼ì‹œì  ì˜¤ë¥˜\n\n**í•´ê²° ë°©ë²•:**\n- ìž ì‹œ í›„ ë‹¤ì‹œ ì‹œë„í•´ì£¼ì„¸ìš”\n- íŽ˜ì´ì§€ë¥¼ ìƒˆë¡œê³ ì¹¨ í•´ë³´ì„¸ìš”\n- AI ë¶„ì„ì„ ë¨¼ì € ì‹œë„í•´ë³´ì„¸ìš”\n\nì˜¤ë¥˜ ìƒì„¸: ${error instanceof Error ? error.message : 'ì•Œ ìˆ˜ ì—†ëŠ” ì˜¤ë¥˜'}`)
    } finally {
      setLoadingH2H(false)
    }
  }

  // ë¦¬ê·¸ë³„ í™œì„± í´ëž˜ìŠ¤ ë°˜í™˜
  const getLeagueActiveClass = (leagueName: string): string => {
    const classes: { [key: string]: string } = {
      'Premier League': 'bg-purple-600 text-white shadow-lg',
      'Primera Division': 'bg-orange-600 text-white shadow-lg',
      'Serie A': 'bg-blue-700 text-white shadow-lg',
      'Bundesliga': 'bg-red-600 text-white shadow-lg',
      'Ligue 1': 'bg-blue-500 text-white shadow-lg',
      'UEFA Champions League': 'bg-indigo-700 text-white shadow-lg',
      'Championship': 'bg-purple-500 text-white shadow-lg',
      '2. Bundesliga': 'bg-red-500 text-white shadow-lg',
      'Serie B': 'bg-blue-600 text-white shadow-lg',
      'Eredivisie': 'bg-orange-500 text-white shadow-lg',
    }
    return classes[leagueName] || 'bg-slate-600 text-white shadow-lg'
  }

  return (
    <div className={darkMode ? 'bg-gray-900' : 'bg-white'}>
      <div className="min-h-screen">
        {/* ìµœìƒë‹¨ GNB í—¤ë” - ë¸”ëž™ ê³„ì—´ */}
        <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              {/* ì¢Œì¸¡: ë¡œê³  */}
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2 text-white font-bold text-xl cursor-pointer hover:text-blue-400 transition-colors">
                  <span className="text-2xl">âš½</span>
                  <span>FOOTBALL PREDICT</span>
                </div>

                {/* ë©”ë‰´ */}
                <nav className="hidden md:flex items-center gap-1">
                  {/* ë¦¬ê·¸ ì •ë³´ ë“œë¡­ë‹¤ìš´ */}
                  <div className="relative group">
                    <button className="px-4 py-2 text-white hover:bg-gray-800 rounded-lg transition-colors font-medium flex items-center gap-1">
                      <span>{language === 'ko' ? 'ë¦¬ê·¸ ì •ë³´' : 'League Info'}</span>
                      <span className="text-xs bg-blue-600 px-2 py-0.5 rounded-full">
                        {Object.keys(leagueInfo).length}
                      </span>
                      <span className="text-xs">â–¼</span>
                    </button>
                    
                    {/* ë“œë¡­ë‹¤ìš´ ë©”ë‰´ - 2ì—´ ê°€ë¡œ ë ˆì´ì•„ì›ƒ */}
                    <div className="absolute top-full left-0 mt-1 bg-gray-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 w-[500px] z-50">
                      {(() => {
                        // êµ­ê°€ë³„ë¡œ ë¦¬ê·¸ ê·¸ë£¹í™”
                        const groupedLeagues: { [country: string]: Array<[string, typeof leagueInfo[string]]> } = {}
                        
                        Object.entries(leagueInfo).forEach(([key, info]) => {
                          const country = language === 'ko' ? info.countryKo : info.country
                          if (!groupedLeagues[country]) {
                            groupedLeagues[country] = []
                          }
                          groupedLeagues[country].push([key, info])
                        })
                        
                        // êµ­ê°€ ìˆœì„œ ì •ì˜
                        const countryOrder = language === 'ko' 
                          ? ['ìž‰ê¸€ëžœë“œ', 'ìŠ¤íŽ˜ì¸', 'ì´íƒˆë¦¬ì•„', 'ë…ì¼', 'í”„ëž‘ìŠ¤', 'ë„¤ëœëž€ë“œ', 'í¬ë¥´íˆ¬ê°ˆ', 'ìœ ëŸ½']
                          : ['England', 'Spain', 'Italy', 'Germany', 'France', 'Netherlands', 'Portugal', 'Europe']
                        
                        // í˜„ìž¬ ì„ íƒëœ êµ­ê°€ì˜ ë¦¬ê·¸ ëª©ë¡
                        const currentLeagues = groupedLeagues[selectedCountry] || []
                        
                        return (
                          <div className="flex">
                            {/* ì¢Œì¸¡: êµ­ê°€ íƒ­ */}
                            <div className="w-40 border-r border-gray-700 py-2">
                              {countryOrder.map(country => {
                                const leagues = groupedLeagues[country]
                                if (!leagues) return null
                                
                                // í•´ë‹¹ êµ­ê°€ì˜ ì´ ê²½ê¸° ìˆ˜ ê³„ì‚°
                                const totalCount = leagues.reduce((sum, [key]) => {
                                  return sum + matches.filter(m => m.league.includes(key.split(' ')[0])).length
                                }, 0)
                                
                                return (
                                  <button
                                    key={country}
                                    onMouseEnter={() => setSelectedCountry(country)}
                                    className={`w-full px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                                      selectedCountry === country
                                        ? 'bg-gray-700 text-white border-l-4 border-blue-500'
                                        : 'text-gray-300 hover:bg-gray-750 hover:text-white'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <img 
                                          src={countryFlags[country]} 
                                          alt={country}
                                          className="w-5 h-4 object-cover rounded-sm"
                                          onError={(e) => {
                                            e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="16"><text y="12" font-size="12">ðŸŒ</text></svg>'
                                          }}
                                        />
                                        <span>{country}</span>
                                      </div>
                                      <span className="text-xs text-gray-400">({totalCount})</span>
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                            
                            {/* ìš°ì¸¡: ë¦¬ê·¸ ëª©ë¡ */}
                            <div className="flex-1 py-2 max-h-[400px] overflow-y-auto">
                              {currentLeagues.length > 0 ? (
                                currentLeagues.map(([key, info]) => {
                                  const count = matches.filter(m => m.league.includes(key.split(' ')[0])).length
                                  
                                  return (
                                    <button 
                                      key={key}
                                      onClick={() => {
                                        setSelectedLeague(key)
                                        // ë“œë¡­ë‹¤ìš´ ë‹«ê¸° (í¬ì»¤ìŠ¤ ì´ë™)
                                        document.activeElement?.blur()
                                      }}
                                      className={`w-full block px-4 py-2.5 text-left text-white hover:bg-gray-700 transition-colors ${
                                        count === 0 ? 'opacity-50' : ''
                                      } ${selectedLeague === key ? 'bg-blue-600' : ''}`}
                                    >
                                      <span className="flex items-center gap-3">
                                        <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center p-1 border border-gray-600">
                                          <img 
                                            src={info.logo} 
                                            alt={info[language]}
                                            className="w-full h-full object-contain"
                                            onError={(e) => {
                                              e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><text y="20" font-size="20">âš½</text></svg>'
                                            }}
                                          />
                                        </div>
                                        <span className="flex-1">{info[language]}</span>
                                        <span className="text-xs text-gray-400">({count})</span>
                                      </span>
                                    </button>
                                  )
                                })
                              ) : (
                                <div className="px-4 py-8 text-center text-gray-400 text-sm">
                                  {language === 'ko' ? 'ë¦¬ê·¸ê°€ ì—†ìŠµë‹ˆë‹¤' : 'No leagues'}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>

                  <button 
                    onClick={() => setActiveTab('scheduled')}
                    className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                      activeTab === 'scheduled'
                        ? 'text-white bg-blue-600'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    {language === 'ko' ? 'ì˜ˆì • ê²½ê¸°' : 'Scheduled'}
                  </button>
                  <button 
                    onClick={() => setActiveTab('results')}
                    className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                      activeTab === 'results'
                        ? 'text-white bg-blue-600'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    {language === 'ko' ? 'ê²½ê¸° ê²°ê³¼' : 'Results'}
                  </button>
                </nav>
              </div>

              {/* ìš°ì¸¡: ì–¸ì–´ ì„ íƒ + ë‹¤í¬ëª¨ë“œ + ìžë™ ìƒˆë¡œê³ ì¹¨ */}
              <div className="flex items-center gap-3">
                {/* ìžë™ ìƒˆë¡œê³ ì¹¨ í† ê¸€ + ì—…ë°ì´íŠ¸ ì‹œê°„ */}
                <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-1.5">
                  <button
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                      autoRefresh 
                        ? 'text-green-400 hover:text-green-300' 
                        : 'text-gray-500 hover:text-gray-400'
                    }`}
                    title={autoRefresh ? 'ìžë™ ìƒˆë¡œê³ ì¹¨ ì¼œì§' : 'ìžë™ ìƒˆë¡œê³ ì¹¨ êº¼ì§'}
                  >
                    <span className={`${autoRefresh ? 'animate-spin' : ''}`}>ðŸ”„</span>
                    <span>{autoRefresh ? (language === 'ko' ? 'ON' : 'ON') : (language === 'ko' ? 'OFF' : 'OFF')}</span>
                  </button>
                  <span className="text-gray-500 text-xs">|</span>
                  <span className="text-gray-400 text-xs" title="ë§ˆì§€ë§‰ ì—…ë°ì´íŠ¸">
                    {lastUpdate.toLocaleTimeString(language === 'ko' ? 'ko-KR' : 'en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </span>
                </div>

                {/* ì–¸ì–´ ì„ íƒ */}
                <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
                  <button 
                    onClick={() => setLanguage('ko')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                      language === 'ko' 
                        ? 'text-white bg-blue-600' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    <img 
                      src="https://flagcdn.com/w40/kr.png"
                      alt="í•œêµ­"
                      className="w-5 h-4 object-cover rounded-sm"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 30"><text y="20" font-size="20">ðŸ‡°ðŸ‡·</text></svg>'
                      }}
                    />
                    <span>KR</span>
                  </button>
                  <button 
                    onClick={() => setLanguage('en')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                      language === 'en' 
                        ? 'text-white bg-blue-600' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    <img 
                      src="https://flagcdn.com/w40/us.png"
                      alt="USA"
                      className="w-5 h-4 object-cover rounded-sm"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 30"><text y="20" font-size="20">ðŸ‡ºðŸ‡¸</text></svg>'
                      }}
                    />
                    <span>EN</span>
                  </button>
                </div>

                {/* ë‹¤í¬ëª¨ë“œ í† ê¸€ */}
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="px-3 py-1.5 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors"
                >
                  {darkMode ? 'ðŸŒ™' : 'â˜€ï¸'}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* ìŠ¹ë¥  ë°°ë„ˆ - í’€ì‚¬ì´ì¦ˆ ìŠ¤í¬ë¡¤ (ëª¨ë“  íƒ­) */}
        {matches.length > 0 && (
          <div className="w-full overflow-hidden shadow-lg mb-6">
            <div className={`${darkMode ? 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-y-2 border-slate-700' : 'bg-gradient-to-r from-blue-50 via-white to-blue-50 border-y-2 border-blue-200'} py-5`}>
              <div className="flex gap-4 animate-scroll-fast">
                  {matches.slice(0, 10).concat(matches.slice(0, 10)).map((match, index) => {
                    const originalIndex = index % matches.length
                    const originalMatch = matches[originalIndex]
                    
                    // ê²°ê³¼ íƒ­ì¸ì§€ í™•ì¸
                    const isResult = activeTab === 'results' && match.homeScore !== null
                    
                    // ëžœë¤ ìŠ¹ë¥  ìƒì„± (ì˜ˆì • íƒ­ìš©)
                    const homeWin = Math.floor(Math.random() * 30 + 35)
                    const draw = Math.floor(Math.random() * 15 + 20)
                    const awayWin = 100 - homeWin - draw
                    
                    return (
                      <div
                        key={`banner-${match.id}-${index}`}
                        className={`flex items-center gap-4 px-5 py-3 rounded-xl border-2 whitespace-nowrap flex-shrink-0 transition-all cursor-pointer transform hover:scale-105 hover:shadow-xl ${
                          darkMode
                            ? 'bg-slate-800 border-slate-600 hover:bg-slate-700 hover:border-blue-500'
                            : 'bg-white border-gray-300 hover:bg-blue-50 hover:border-blue-400'
                        }`}
                        onClick={() => activeTab === 'scheduled' && handleAnalysis(originalMatch)}
                      >
                        {/* í™ˆíŒ€ */}
                        <div className="flex items-center gap-2">
                          <img 
                            src={match.homeCrest} 
                            alt="" 
                            className="w-6 h-6 object-contain"
                          />
                          <span className={`text-base font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {translateTeamName(match.homeTeam).substring(0, 8)}
                          </span>
                        </div>
                        
                        <span className={`text-sm font-bold ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>VS</span>
                        
                        {/* ì›ì •íŒ€ */}
                        <div className="flex items-center gap-2">
                          <span className={`text-base font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {translateTeamName(match.awayTeam).substring(0, 8)}
                          </span>
                          <img 
                            src={match.awayCrest} 
                            alt="" 
                            className="w-6 h-6 object-contain"
                          />
                        </div>
                        
                        {/* ê²°ê³¼ ë˜ëŠ” ìŠ¹ë¥  í‘œì‹œ */}
                        {isResult ? (
                          // ê²½ê¸° ê²°ê³¼ í‘œì‹œ
                          <div className="flex items-center gap-2 ml-3 pl-3 border-l-2 border-gray-300 dark:border-slate-600">
                            <div className="text-center">
                              <div className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                {language === 'ko' ? 'ìµœì¢…' : 'Final'}
                              </div>
                              <div className={`text-lg font-extrabold ${
                                match.homeScore! > match.awayScore! ? 'text-emerald-500' : 
                                match.homeScore! < match.awayScore! ? 'text-red-500' : 
                                'text-slate-400'
                              }`}>
                                {match.homeScore} - {match.awayScore}
                              </div>
                            </div>
                          </div>
                        ) : (
                          // ìŠ¹ë¥  í‘œì‹œ
                          <div className="flex gap-3 ml-3 pl-3 border-l-2 border-gray-300 dark:border-slate-600">
                            <div className="text-center">
                              <div className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                {language === 'ko' ? 'í™ˆ' : 'Home'}
                              </div>
                              <div className={`text-lg font-extrabold ${homeWin > 50 ? 'text-emerald-500' : 'text-blue-500'}`}>
                                {homeWin}%
                              </div>
                            </div>
                            <div className="text-center">
                              <div className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                {language === 'ko' ? 'ë¬´' : 'Draw'}
                              </div>
                              <div className={`text-lg font-extrabold ${darkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                                {draw}%
                              </div>
                            </div>
                            <div className="text-center">
                              <div className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                {language === 'ko' ? 'ì›ì •' : 'Away'}
                              </div>
                              <div className={`text-lg font-extrabold ${awayWin > 50 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {awayWin}%
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

        {/* ë©”ì¸ ì»¨í…ì¸  ì˜ì—­ */}
        <div className="container mx-auto px-4 py-8">
          {/* ë¦¬ê·¸ í•„í„° */}
          <div className={`mb-6 overflow-x-auto ${darkMode ? 'bg-slate-900' : 'bg-gray-100'} rounded-xl`}>
            <div className="flex items-center gap-2 py-3 px-2 min-w-max">
              <button
                onClick={() => setSelectedLeague('all')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                  selectedLeague === 'all'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : darkMode
                      ? 'text-slate-300 hover:bg-slate-800'
                      : 'text-slate-600 hover:bg-gray-200'
                }`}
              >
                ðŸŒ {language === 'ko' ? 'ì „ì²´' : 'All'}
              </button>

              {Array.from(new Set(matches.map(m => m.league))).map(league => {
                const leagueLogo = matches.find(m => m.league === league)?.leagueLogo
                
                return (
                  <button
                    key={league}
                    onClick={() => setSelectedLeague(league)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                      selectedLeague === league
                        ? getLeagueActiveClass(league)
                        : darkMode
                          ? 'text-slate-300 hover:bg-slate-800'
                          : 'text-slate-600 hover:bg-gray-200'
                    }`}
                  >
                    {leagueLogo ? (
                      <img 
                        src={leagueLogo} 
                        alt={league}
                        className="w-5 h-5 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <span className="text-lg">âš½</span>
                    )}
                    <span>{translateLeagueName(league)}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ë©”ì¸ ì»¨í…ì¸ : ì¢Œì¸¡ ê²½ê¸° ëª©ë¡ + ìš°ì¸¡ ìˆœìœ„í‘œ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* ì¢Œì¸¡: ê²½ê¸° ëª©ë¡ (75%) */}
            <div className="lg:col-span-9">
              {loading ? (
                <div className="text-center py-20">
                  <div className="text-6xl mb-4">âš½</div>
                  <p className={`text-xl ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {language === 'ko' ? 'ë¡œë”© ì¤‘...' : 'Loading...'}
                  </p>
                </div>
              ) : (
                <>
                  {selectedLeague !== 'all' && (
                    <div className={`text-center py-4 ${darkMode ? 'text-slate-400' : 'text-gray-700'}`}>
                      <p className="text-sm font-medium">
                        {translateLeagueName(selectedLeague)} {language === 'ko' ? 'ê²½ê¸°' : 'Matches'}: {matches.filter(m => m.league === selectedLeague).length}{language === 'ko' ? 'ê°œ' : ''}
                      </p>
                    </div>
                  )}
                  
                  {matches.filter(match => selectedLeague === 'all' || match.league === selectedLeague).length === 0 ? (
                    <div className={`text-center py-20 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                      <p className="text-xl font-medium">
                        {language === 'ko' 
                          ? `${translateLeagueName(selectedLeague)}ì˜ ê²½ê¸°ê°€ ì—†ìŠµë‹ˆë‹¤` 
                          : `No matches in ${selectedLeague}`}
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-2">
                      {matches
                      .filter(match => selectedLeague === 'all' || match.league === selectedLeague)
                      .map((match, index) => (
                        <div
                          key={match.id}
                          className={`rounded-2xl p-6 border-2 transition-all duration-300 hover:shadow-2xl hover:scale-105 animate-fade-in ${
                            darkMode
                              ? 'bg-slate-800 border-slate-700 hover:border-blue-500'
                              : 'bg-white border-gray-200 hover:border-blue-400'
                          }`}
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          {/* ë¦¬ê·¸ & ë‚ ì§œ */}
                          <div className={`text-sm mb-4 ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                            <div className="font-bold text-blue-500">
                              {translateLeagueName(match.league)}
                            </div>
                            <div>{match.date} {match.time}</div>
                          </div>

                          {/* ê²½ê¸° ì •ë³´ */}
                          <div className="flex items-center justify-between">
                            {/* í™ˆ íŒ€ */}
                            <div className="flex-1 text-center">
                              <div className="mb-3 flex justify-center">
                                <span className={`px-4 py-1.5 rounded-full text-xs font-black shadow-lg ${
                                  darkMode 
                                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-2 border-blue-400' 
                                    : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-2 border-blue-300'
                                }`}>
                                  ðŸ  {language === 'ko' ? 'í™ˆ' : 'HOME'}
                                </span>
                              </div>
                              <img
                                src={match.homeCrest}
                                alt={match.homeTeam}
                                className="w-20 h-20 mx-auto mb-3 object-contain drop-shadow-lg"
                                onError={(e) => {
                                  e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><text y="40" font-size="40">âš½</text></svg>'
                                }}
                              />
                              <div className={`font-bold text-base leading-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {getTeamName(match.homeTeam, language)}
                              </div>
                            </div>

                            {/* VS ë˜ëŠ” ìŠ¤ì½”ì–´ */}
                            <div className="flex-1 text-center px-4">
                              {match.status === 'FINISHED' && match.homeScore !== null ? (
                                <div className={`text-4xl font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {match.homeScore} - {match.awayScore}
                                </div>
                              ) : (
                                <div className={`text-3xl font-black ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                                  VS
                                </div>
                              )}
                            </div>

                            {/* ì›ì • íŒ€ */}
                            <div className="flex-1 text-center">
                              <div className="mb-3 flex justify-center">
                                <span className={`px-4 py-1.5 rounded-full text-xs font-black shadow-lg ${
                                  darkMode 
                                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white border-2 border-red-400' 
                                    : 'bg-gradient-to-r from-red-500 to-red-600 text-white border-2 border-red-300'
                                }`}>
                                  âœˆï¸ {language === 'ko' ? 'ì›ì •' : 'AWAY'}
                                </span>
                              </div>
                              <img
                                src={match.awayCrest}
                                alt={match.awayTeam}
                                className="w-20 h-20 mx-auto mb-3 object-contain drop-shadow-lg"
                                onError={(e) => {
                                  e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><text y="40" font-size="40">âš½</text></svg>'
                                }}
                              />
                              <div className={`font-bold text-base leading-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {getTeamName(match.awayTeam, language)}
                              </div>
                            </div>
                          </div>

                          {/* AI ë¶„ì„ & H2H ë²„íŠ¼ (ì˜ˆì • ê²½ê¸°ë§Œ) */}
                          {activeTab === 'scheduled' && (
                            <div className="mt-4 pt-4 border-t-2 border-gray-200 dark:border-slate-700">
                              <div className="grid grid-cols-2 gap-3">
                                <button
                                  onClick={() => handleAnalysis(match)}
                                  className={`py-3 px-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 transform hover:scale-105 hover:shadow-lg active:scale-95 ${
                                    darkMode
                                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white'
                                      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white'
                                  }`}
                                >
                                  <span className="animate-pulse-slow">ðŸ¤–</span>
                                  <span>{language === 'ko' ? 'AI ë¶„ì„' : 'AI Analysis'}</span>
                                </button>
                                <button
                                  onClick={() => handleH2H(match)}
                                  className={`py-3 px-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 transform hover:scale-105 hover:shadow-lg active:scale-95 ${
                                    darkMode
                                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white'
                                      : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white'
                                  }`}
                                >
                                  <span>ðŸ“Š</span>
                                  <span>{language === 'ko' ? 'H2H ì „ì ' : 'H2H Stats'}</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}
            </div>

            {/* ìš°ì¸¡: ë‰´ìŠ¤ ì„¹ì…˜ (ìƒë‹¨) + ìˆœìœ„í‘œ (í•˜ë‹¨) */}
            <div className="lg:col-span-3">
              {/* ë§¤ì¹˜ í”„ë¦¬ë·° ì„¹ì…˜ - ìƒë‹¨ */}
              <div className={`sticky top-20 rounded-2xl p-4 border-2 mb-6 ${
                darkMode 
                  ? 'bg-slate-800 border-slate-700' 
                  : 'bg-white border-gray-200'
              }`}>
                {/* í”„ë¦¬ë·° í—¤ë” */}
                <div className={`mb-4 pb-3 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                  <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    ðŸŽ¯ {language === 'ko' ? 'ê²½ê¸° í”„ë¦¬ë·°' : 'Match Preview'}
                  </h3>
                </div>

                {/* í”„ë¦¬ë·° ì¹´ë“œë“¤ */}
                <div className="space-y-4">
                  {matches
                    .filter(match => match.status === 'SCHEDULED' || match.status === 'TIMED')
                    .slice(0, 3)
                    .map((match, index) => {
                      return (
                        <div 
                          key={match.id}
                          className="cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl group"
                          onClick={() => {
                            handleAnalysis(match)
                          }}
                        >
                          {/* í”„ë¦¬ë·° ì¹´ë“œ */}
                          <div 
                            className="relative w-full rounded-2xl overflow-hidden shadow-xl border-2 border-white/10"
                            style={{
                              aspectRatio: '16/9',
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            }}
                          >
                            {/* ì• ë‹ˆë©”ì´ì…˜ ë°°ê²½ */}
                            <div className="absolute inset-0 opacity-20">
                              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                              <div className="absolute inset-0" style={{
                                backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
                                backgroundSize: '200% 200%'
                              }}></div>
                            </div>

                            {/* ë¦¬ê·¸ ë°°ì§€ */}
                            <div className="absolute top-3 left-3 bg-gradient-to-r from-white/25 to-white/15 backdrop-blur-xl px-4 py-1.5 rounded-full text-xs font-bold text-white shadow-xl border border-white/20">
                              {match.league}
                            </div>

                            {/* ë‚ ì§œ */}
                            <div className="absolute top-3 right-3 bg-gradient-to-r from-white/25 to-white/15 backdrop-blur-xl px-4 py-1.5 rounded-full text-xs font-bold text-white shadow-xl border border-white/20">
                              {match.date}
                            </div>

                            {/* íŒ€ ì •ë³´ - ì¤‘ì•™ */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="flex items-center justify-between w-full px-8">
                                {/* í™ˆ íŒ€ */}
                                <div className="flex flex-col items-center space-y-3 group-hover:scale-110 transition-transform duration-300">
                                  <div className="relative">
                                    <div className="absolute inset-0 bg-white/30 rounded-full blur-md"></div>
                                    <div className="relative w-24 h-24 bg-white rounded-full p-3 shadow-2xl ring-4 ring-white/30 group-hover:ring-white/50 transition-all">
                                      <img 
                                        src={match.homeCrest} 
                                        alt={match.homeTeam}
                                        className="w-full h-full object-contain"
                                        onError={(e) => {
                                          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Ctext x="50%25" y="50%25" font-size="40" text-anchor="middle" dy=".3em"%3Eâš½%3C/text%3E%3C/svg%3E'
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <span className="text-white font-bold text-base text-center max-w-[100px] leading-tight drop-shadow-2xl line-clamp-2">
                                    {match.homeTeam}
                                  </span>
                                </div>

                                {/* VS */}
                                <div className="flex flex-col items-center">
                                  <div className="text-white font-black text-4xl drop-shadow-2xl mb-2">VS</div>
                                  <div className="w-16 h-1 bg-white/60 rounded-full"></div>
                                </div>

                                {/* ì›ì • íŒ€ */}
                                <div className="flex flex-col items-center space-y-3 group-hover:scale-110 transition-transform duration-300">
                                  <div className="relative">
                                    <div className="absolute inset-0 bg-white/30 rounded-full blur-md"></div>
                                    <div className="relative w-24 h-24 bg-white rounded-full p-3 shadow-2xl ring-4 ring-white/30 group-hover:ring-white/50 transition-all">
                                      <img 
                                        src={match.awayCrest} 
                                        alt={match.awayTeam}
                                        className="w-full h-full object-contain"
                                        onError={(e) => {
                                          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Ctext x="50%25" y="50%25" font-size="40" text-anchor="middle" dy=".3em"%3Eâš½%3C/text%3E%3C/svg%3E'
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <span className="text-white font-bold text-base text-center max-w-[100px] leading-tight drop-shadow-2xl line-clamp-2">
                                    {match.awayTeam}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Preview ë¼ë²¨ - ì™¼ìª½ í•˜ë‹¨ */}
                            <div className="absolute bottom-3 left-3 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-black px-4 py-2 rounded-lg shadow-xl">
                              âš¡ Preview
                            </div>

                            {/* í´ë¦­ ìœ ë„ ì•„ì´ì½˜ */}
                            <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </div>
                          </div>

                          {/* ê²½ê¸° ì‹œê°„ - ê°•í™”ëœ ë””ìžì¸ */}
                          <div className="mt-3 flex justify-center">
                            <div className={`relative flex items-center gap-3 px-5 py-3 rounded-2xl font-bold shadow-2xl ${
                              darkMode 
                                ? 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 border-2 border-slate-600' 
                                : 'bg-gradient-to-br from-white via-gray-50 to-white border-2 border-blue-200'
                            }`}>
                              {/* ì•„ì´ì½˜ */}
                              <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-xl ${
                                darkMode 
                                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/50' 
                                  : 'bg-gradient-to-br from-blue-400 to-blue-500 shadow-blue-400/50'
                              } shadow-lg`}>
                                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                </svg>
                              </div>
                              
                              {/* í…ìŠ¤íŠ¸ */}
                              <div className="relative z-10 flex flex-col">
                                <span className={`text-xs font-semibold uppercase tracking-wider ${
                                  darkMode ? 'text-blue-400' : 'text-blue-600'
                                }`}>
                                  {language === 'ko' ? 'í‚¥ì˜¤í”„ ì‹œê°„' : 'Kickoff'}
                                </span>
                                <span className={`text-xl font-black tracking-tight ${
                                  darkMode ? 'text-white' : 'text-gray-900'
                                }`}>
                                  {match.time}
                                </span>
                              </div>
                              
                              {/* ìš°ì¸¡ ìž¥ì‹ */}
                              <div className="relative z-10 flex items-center">
                                <div className={`w-2 h-2 rounded-full animate-pulse ${
                                  darkMode ? 'bg-green-400' : 'bg-green-500'
                                }`}></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>

                {matches.filter(m => m.status === 'SCHEDULED' || m.status === 'TIMED').length === 0 && (
                  <div className={`text-center py-10 ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                    <p className="text-sm">
                      {language === 'ko' ? 'ì˜ˆì •ëœ ê²½ê¸°ê°€ ì—†ìŠµë‹ˆë‹¤' : 'No upcoming matches'}
                    </p>
                  </div>
                )}
              </div>

              {/* ìˆœìœ„í‘œ ì„¹ì…˜ - í•˜ë‹¨ */}
              <div className={`rounded-2xl p-4 border-2 ${
                darkMode 
                  ? 'bg-slate-800 border-slate-700' 
                  : 'bg-white border-gray-200'
              }`}>
                {/* ìˆœìœ„í‘œ ë‚´ìš© */}
                {loadingStandings ? (
                  <div className="text-center py-10">
                    <div className="text-4xl mb-2">âš½</div>
                    <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                      {language === 'ko' ? 'ë¡œë”© ì¤‘...' : 'Loading...'}
                    </p>
                  </div>
                ) : standings ? (
                  <div>
                    {/* ë¦¬ê·¸ ì •ë³´ + í™”ì‚´í‘œ ë„¤ë¹„ê²Œì´ì…˜ */}
                    <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}">
                      {/* ì¢Œì¸¡ í™”ì‚´í‘œ */}
                      <button
                        onClick={() => {
                          const leagues = ['PL', 'PD', 'SA', 'BL1', 'FL1', 'CL']
                          const currentIndex = leagues.indexOf(selectedStandingsLeague)
                          const prevIndex = currentIndex === 0 ? leagues.length - 1 : currentIndex - 1
                          setSelectedStandingsLeague(leagues[prevIndex])
                        }}
                        className={`p-1.5 rounded-lg transition-all ${
                          darkMode
                            ? 'hover:bg-slate-700 text-slate-400 hover:text-white'
                            : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                        }`}
                    : 'text-gray-400 hover:text-white'
                }`}>
                  ê°œì¸ì •ë³´ì²˜ë¦¬ë°©ì¹¨
                </a>
                <a href="#" className={`transition-colors ${
                  darkMode 
                    ? 'text-slate-400 hover:text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}>
                  ë¬¸ì˜í•˜ê¸°
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* AI ë¶„ì„ ëª¨ë‹¬ */}
      {showAnalysisModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowAnalysisModal(false)}
        >
          <div
            className={`rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl ${
              darkMode ? 'bg-slate-800' : 'bg-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                ðŸ¤– {language === 'ko' ? 'AI ê²½ê¸° ë¶„ì„' : 'AI Match Analysis'}
              </h2>
              <button
                onClick={() => setShowAnalysisModal(false)}
                className={`text-3xl transition-transform hover:scale-110 ${
                  darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Ã—
              </button>
            </div>

            {selectedMatch && (
              <div className={`mb-4 pb-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="text-center">
                  <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {translateTeamName(selectedMatch.homeTeam)}
                  </span>
                  <span className={`mx-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>vs</span>
                  <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {translateTeamName(selectedMatch.awayTeam)}
                  </span>
                </div>
              </div>
            )}

            {loadingAnalysis ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin text-5xl mb-4">ðŸ¤–</div>
                <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>AIê°€ ê²½ê¸°ë¥¼ ë¶„ì„ ì¤‘ìž…ë‹ˆë‹¤...</p>
              </div>
            ) : analysis.includes('ë¶ˆëŸ¬ì˜¬ ìˆ˜ ì—†ìŠµë‹ˆë‹¤') ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">âš ï¸</div>
                <div className={`whitespace-pre-wrap leading-relaxed mb-6 ${
                  darkMode ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  {analysis}
                </div>
                <button
                  onClick={() => selectedMatch && handleAnalysis(selectedMatch)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all transform hover:scale-105"
                >
                  ðŸ”„ ë‹¤ì‹œ ì‹œë„
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {analysis.split('##').filter(section => section.trim()).map((section, index) => {
                  const lines = section.trim().split('\n')
                  const title = lines[0].replace(/^#+\s*/, '').trim()
                  const content = lines.slice(1).join('\n').trim()
                  
                  const icons = ['ðŸ“Š', 'âš½', 'ðŸŽ¯', 'ðŸ“ˆ', 'ðŸ’¡', 'ðŸ†']
                  const icon = icons[index] || 'ðŸ“‹'
                  
                  const isPrediction = title.includes('ì˜ˆìƒ ìŠ¹ë¥ ') || title.includes('ìŠ¹ë¶€ ì˜ˆì¸¡')
                  
                  return (
                    <div
                      key={index}
                      className={`p-5 rounded-xl border transition-all ${
                        darkMode 
                          ? 'bg-slate-700 border-slate-600 hover:border-slate-500' 
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">{icon}</span>
                        <h3 className={`text-lg font-bold ${
                          darkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {title}
                        </h3>
                      </div>
                      <div className={`leading-relaxed ${
                        darkMode ? 'text-slate-300' : 'text-gray-700'
                      } ${isPrediction ? 'space-y-2' : ''}`}>
                        {isPrediction ? (
                          content.split('\n').map((line, i) => {
                            if (line.includes('%')) {
                              const [label, percent] = line.split(':')
                              const value = parseInt(percent?.replace(/\D/g, '') || '0')
                              return (
                                <div key={i} className={`flex items-center justify-between py-3 px-4 rounded-lg ${
                                  darkMode ? 'bg-slate-600' : 'bg-white border border-gray-200'
                                }`}>
                                  <span className={`font-medium ${
                                    darkMode ? 'text-slate-200' : 'text-gray-700'
                                  }`}>
                                    {label?.trim()}
                                  </span>
                                  <span className={`text-xl font-bold ${
                                    value >= 50 ? 'text-emerald-400' : value >= 30 ? 'text-blue-400' : 'text-slate-400'
                                  }`}>
                                    {percent?.trim()}
                                  </span>
                                </div>
                              )
                            }
                            return <p key={i} className="whitespace-pre-wrap">{line}</p>
                          })
                        ) : (
                          <p className="whitespace-pre-wrap">{content}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* H2H ëª¨ë‹¬ */}
      {showH2HModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowH2HModal(false)}
        >
          <div
            className={`rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl ${
              darkMode ? 'bg-slate-800' : 'bg-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                ðŸ“Š {language === 'ko' ? 'ìƒëŒ€ ì „ì  (H2H)' : 'Head-to-Head (H2H)'}
              </h2>
              <button
                onClick={() => setShowH2HModal(false)}
                className={`text-3xl transition-transform hover:scale-110 ${
                  darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Ã—
              </button>
            </div>

            {selectedMatch && (
              <div className={`mb-4 pb-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="text-center">
                  <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {translateTeamName(selectedMatch.homeTeam)}
                  </span>
                  <span className={`mx-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>vs</span>
                  <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {translateTeamName(selectedMatch.awayTeam)}
                  </span>
                </div>
              </div>
            )}

            {loadingH2H ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin text-5xl mb-4">ðŸ“Š</div>
                <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>ì „ì ì„ ë¶„ì„ ì¤‘ìž…ë‹ˆë‹¤...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {h2h.split('##').filter(section => section.trim()).map((section, index) => {
                  const lines = section.trim().split('\n')
                  const title = lines[0].replace(/^#+\s*/, '').trim()
                  const content = lines.slice(1).join('\n').trim()
                  
                  const icons = ['ðŸ”„', 'ðŸ ', 'âœˆï¸', 'âš½', 'ðŸ“ˆ', 'ðŸŽ¯']
                  const icon = icons[index] || 'ðŸ“‹'
                  
                  return (
                    <div
                      key={index}
                      className={`p-5 rounded-xl border transition-all ${
                        darkMode 
                          ? 'bg-slate-700 border-slate-600 hover:border-slate-500' 
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">{icon}</span>
                        <h3 className={`text-lg font-bold ${
                          darkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {title}
                        </h3>
                      </div>
                      <div className={`whitespace-pre-wrap leading-relaxed ${
                        darkMode ? 'text-slate-300' : 'text-gray-700'
                      }`}>
                        {content}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* H2H ëª¨ë‹¬ */}
      {showH2HModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowH2HModal(false)}
        >
          <div
            className={`rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl ${
              darkMode ? 'bg-slate-800' : 'bg-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                ðŸ“Š {language === 'ko' ? 'ìƒëŒ€ ì „ì  (H2H)' : 'Head-to-Head (H2H)'}
              </h2>
              <button
                onClick={() => setShowH2HModal(false)}
                className={`text-3xl transition-transform hover:scale-110 ${
                  darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Ã—
              </button>
            </div>

            {selectedMatch && (
              <div className={`mb-4 pb-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="text-center">
                  <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {translateTeamName(selectedMatch.homeTeam)}
                  </span>
                  <span className={`mx-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>vs</span>
                  <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {translateTeamName(selectedMatch.awayTeam)}
                  </span>
                </div>
              </div>
            )}

            {loadingH2H ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin text-5xl mb-4">ðŸ“Š</div>
                <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>ì „ì ì„ ë¶„ì„ ì¤‘ìž…ë‹ˆë‹¤...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {h2h.split('##').filter(section => section.trim()).map((section, index) => {
                  const lines = section.trim().split('\n')
                  const title = lines[0].replace(/^#+\s*/, '').trim()
                  const content = lines.slice(1).join('\n').trim()
                  
                  const icons = ['ðŸ”„', 'ðŸ ', 'âœˆï¸', 'âš½', 'ðŸ“ˆ', 'ðŸŽ¯']
                  const icon = icons[index] || 'ðŸ“‹'
                  
                  return (
                    <div
                      key={index}
                      className={`p-5 rounded-xl border transition-all ${
                        darkMode 
                          ? 'bg-slate-700 border-slate-600 hover:border-slate-500' 
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">{icon}</span>
                        <h3 className={`text-lg font-bold ${
                          darkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {title}
                        </h3>
                      </div>
                      <div className={`whitespace-pre-wrap leading-relaxed ${
                        darkMode ? 'text-slate-300' : 'text-gray-700'
                      }`}>
                        {content}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .animate-scroll {
          animation: scroll 60s linear infinite;
        }

        .animate-scroll-fast {
          animation: scroll 54s linear infinite;
        }

        .animate-scroll:hover,
        .animate-scroll-fast:hover {
          animation-play-state: paused;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
          opacity: 0;
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.1);
          }
        }

        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }

        /* ìŠ¤í¬ë¡¤ë°” ìŠ¤íƒ€ì¼ë§ */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #1e293b;
        }

        ::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>
    </div>
  )
}
