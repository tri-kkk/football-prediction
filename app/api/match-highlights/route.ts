import { NextRequest, NextResponse } from 'next/server'

// ScoreBat API 토큰
const SCOREBAT_TOKEN = process.env.SCOREBAT_API_TOKEN || 'MjU4NjkzXzE3NjQ3MzQ4MTRfN2FhODNjNmIxM2MxZDhiOWU3MDYzZTI3MzdjZThlZDJlZDEwYmNhMw=='

// 리그 코드 → ScoreBat Competition ID 매핑
const LEAGUE_TO_COMPETITION: Record<string, string> = {
  'PL': 'england-premier-league',
  'ELC': 'england-championship',
  'PD': 'spain-la-liga',
  'BL1': 'germany-bundesliga',
  'SA': 'italy-serie-a',
  'FL1': 'france-ligue-1',
  'PPL': 'portugal-primeira-liga',
  'DED': 'netherlands-eredivisie',
  'CL': 'uefa-champions-league',
  'EL': 'uefa-europa-league',
  'UECL': 'uefa-europa-conference-league',
}

// ============================================
// 🔥 통합 팀명 매핑 (한글 + 영문 변형 모두 포함)
// ============================================
// 키: 정규화된 팀명, 값: 가능한 모든 변형들
const TEAM_ALIASES: Record<string, string[]> = {
  // Premier League
  'arsenal': ['아스날', '아스널', 'arsenal fc', 'the gunners'],
  'aston villa': ['아스톤 빌라', 'aston villa fc', 'villa'],
  'bournemouth': ['본머스', 'afc bournemouth', 'cherries'],
  'brentford': ['브렌트퍼드', 'brentford fc'],
  'brighton': ['브라이튼', 'brighton & hove albion', 'brighton hove albion', 'brighton and hove'],
  'burnley': ['번리', 'burnley fc'],
  'chelsea': ['첼시', 'chelsea fc', 'the blues'],
  'crystal palace': ['크리스탈 팰리스', 'palace'],
  'everton': ['에버튼', 'everton fc', 'the toffees'],
  'fulham': ['풀럼', 'fulham fc', 'the cottagers'],
  'ipswich': ['입스위치', 'ipswich town', '입스위치 타운'],
  'leeds': ['리즈', 'leeds united', '리즈 유나이티드'],
  'leicester': ['레스터', 'leicester city', '레스터 시티', 'the foxes'],
  'liverpool': ['리버풀', 'liverpool fc', 'the reds'],
  'manchester city': ['맨체스터 시티', '맨시티', 'man city', 'city', 'the citizens'],
  'manchester united': ['맨체스터 유나이티드', '맨유', 'man united', 'man utd', 'united', 'the red devils'],
  'newcastle': ['뉴캐슬', 'newcastle united', 'the magpies', 'newcastle utd'],
  'nottingham forest': ['노팅엄', '노팅엄 포레스트', 'forest', "nott'm forest", 'notts forest'],
  'southampton': ['사우샘프턴', 'southampton fc', 'the saints'],
  'tottenham': ['토트넘', 'tottenham hotspur', 'spurs', 'tottenham hotspurs'],
  'west ham': ['웨스트햄', 'west ham united', 'the hammers', 'west ham utd'],
  'wolverhampton': ['울버햄튼', '울버햄프턴', 'wolves', 'wolverhampton wanderers'],
  
  // La Liga
  'real madrid': ['레알 마드리드', 'real madrid cf', 'los blancos'],
  'barcelona': ['바르셀로나', 'fc barcelona', 'barca', 'blaugrana'],
  'atletico madrid': ['아틀레티코 마드리드', '아틀레티코', 'atletico', 'atleti', 'atlético madrid', 'atlético'],
  'sevilla': ['세비야', 'sevilla fc'],
  'villarreal': ['비야레알', 'villarreal cf', 'yellow submarine'],
  'real sociedad': ['레알 소시에다드', 'la real'],
  'real betis': ['베티스', '레알 베티스', 'betis'],
  'valencia': ['발렌시아', 'valencia cf', 'los che'],
  'celta vigo': ['셀타 비고', '셀타', 'celta', 'rc celta'],
  'osasuna': ['오사수나', 'ca osasuna'],
  'girona': ['지로나', 'girona fc'],
  'rayo vallecano': ['라요 바예카노', 'rayo'],
  'alaves': ['알라베스', 'deportivo alaves', 'alavés'],
  'getafe': ['헤타페', 'getafe cf'],
  'las palmas': ['라스 팔마스', 'ud las palmas'],
  'leganes': ['레간에스', 'cd leganes', 'leganés'],
  'real valladolid': ['레알 바야돌리드', 'valladolid'],
  'espanyol': ['에스파뇰', 'rcd espanyol'],
  'mallorca': ['마요르카', 'rcd mallorca'],
  
  // Bundesliga
  'bayern munich': ['바이에른 뮌헨', '바이에른', 'bayern', 'fc bayern', 'bayern munchen', 'bayern münchen'],
  'borussia dortmund': ['도르트문트', '보루시아 도르트문트', 'dortmund', 'bvb'],
  'rb leipzig': ['라이프치히', 'RB 라이프치히', 'leipzig', 'rasenballsport leipzig'],
  'bayer leverkusen': ['레버쿠젠', '바이어 레버쿠젠', 'leverkusen'],
  'eintracht frankfurt': ['프랑크푸르트', '아인트라흐트 프랑크푸르트', 'frankfurt', 'sge'],
  'wolfsburg': ['볼프스부르크', 'vfl wolfsburg'],
  'borussia monchengladbach': ['묀헨글라드바흐', 'gladbach', 'bmg', "m'gladbach", 'monchengladbach', 'mönchengladbach'],
  'freiburg': ['프라이부르크', 'sc freiburg'],
  'hoffenheim': ['호펜하임', 'tsg hoffenheim', '1899 hoffenheim'],
  'mainz': ['마인츠', 'mainz 05', '1. fsv mainz 05'],
  'fc koln': ['쾰른', 'koln', 'cologne', '1. fc koln', '1. fc köln'],
  'augsburg': ['아우크스부르크', 'fc augsburg'],
  'stuttgart': ['슈투트가르트', 'vfb stuttgart'],
  'werder bremen': ['베르더 브레멘', '브레멘', 'bremen'],
  'bochum': ['보훔', 'vfl bochum'],
  'heidenheim': ['하이덴하임', '1. fc heidenheim'],
  'st pauli': ['장크트 파울리', 'fc st. pauli', 'st. pauli', 'sankt pauli'],
  'holstein kiel': ['홀슈타인 킬', 'kiel'],
  'union berlin': ['우니온 베를린', '1. fc union berlin', 'union'],
  
  // Serie A
  'napoli': ['나폴리', 'ssc napoli'],
  'inter milan': ['인터 밀란', '인터', 'inter', 'internazionale', 'fc internazionale'],
  'ac milan': ['AC 밀란', '밀란', 'milan'],
  'juventus': ['유벤투스', 'juventus fc', 'juve', 'the old lady'],
  'roma': ['로마', 'AS 로마', 'as roma'],
  'lazio': ['라치오', 'ss lazio'],
  'atalanta': ['아탈란타', 'atalanta bc'],
  'fiorentina': ['피오렌티나', 'acf fiorentina', 'viola'],
  'torino': ['토리노', 'torino fc'],
  'bologna': ['볼로냐', 'bologna fc'],
  'sassuolo': ['사수올로', 'us sassuolo'],
  'udinese': ['우디네세', 'udinese calcio'],
  'verona': ['베로나', '엘라스 베로나', 'hellas verona'],
  'empoli': ['엠폴리', 'empoli fc'],
  'lecce': ['레체', 'us lecce'],
  'monza': ['몬차', 'ac monza'],
  'cagliari': ['칼리아리', 'cagliari calcio'],
  'genoa': ['제노아', 'genoa cfc'],
  'como': ['코모', 'como 1907'],
  'parma': ['파르마', 'parma calcio'],
  'venezia': ['베네치아', 'venezia fc'],
  
  // Ligue 1
  'paris saint-germain': ['PSG', '파리 생제르맹', 'paris', 'paris sg', 'paris saint germain'],
  'marseille': ['마르세유', '올림피크 마르세유', 'om', 'olympique marseille'],
  'monaco': ['모나코', 'as monaco'],
  'lille': ['릴', 'losc lille', 'losc'],
  'lyon': ['리옹', '올림피크 리옹', 'olympique lyonnais', 'ol'],
  'rennes': ['렌', 'stade rennais'],
  'nice': ['니스', 'ogc nice'],
  'nantes': ['낭트', 'fc nantes'],
  'lens': ['랑스', 'rc lens'],
  'montpellier': ['몽펠리에', 'montpellier hsc'],
  'strasbourg': ['스트라스부르', 'rc strasbourg'],
  'toulouse': ['툴루즈', 'toulouse fc'],
  'brest': ['브레스트', 'stade brestois'],
  'le havre': ['르아브르', 'le havre ac'],
  'reims': ['랭스', 'stade reims'],
  'saint-etienne': ['생테티엔', 'as saint-etienne', 'asse'],
  'angers': ['앙제', 'angers sco'],
  'auxerre': ['오세르', 'aj auxerre'],
  
  // Portuguese League
  'porto': ['포르투', 'fc porto'],
  'benfica': ['벤피카', 'sl benfica'],
  'sporting cp': ['스포르팅', '스포르팅 리스본', 'sporting', 'sporting lisbon'],
  'braga': ['브라가', 'sc braga'],
  
  // Eredivisie
  'ajax': ['아약스', 'afc ajax'],
  'psv eindhoven': ['PSV', 'PSV 에인트호번', 'psv'],
  'feyenoord': ['페예노르트', 'feyenoord rotterdam'],
  'az alkmaar': ['AZ', 'az', 'alkmaar'],
  
  // Champions League 팀들
  'galatasaray': ['갈라타사라이', 'galatasaray sk'],
  'fenerbahce': ['페네르바체', 'fenerbahçe'],
  'besiktas': ['베식타스', 'beşiktaş'],
  'celtic': ['셀틱', 'celtic fc'],
  'rangers': ['레인저스', 'rangers fc'],
  'young boys': ['영 보이스', 'bsc young boys'],
  'red bull salzburg': ['잘츠부르크', 'salzburg', 'rb salzburg'],
  'shakhtar donetsk': ['샤흐타르', 'shakhtar', 'shaktar donetsk'],
  'dynamo kyiv': ['디나모 키예프', 'dynamo kiev'],
  'sparta prague': ['스파르타 프라하', 'sparta praha'],
  'slavia prague': ['슬라비아 프라하', 'slavia praha'],
  'club brugge': ['클럽 브뤼헤', 'brugge', 'bruges'],
  'anderlecht': ['안더레흐트', 'rsc anderlecht'],
  'qarabag': ['카라바그', '카라바흐', 'qarabağ', 'qarabag fk'],
  'malmo': ['말뫼', 'malmo ff', 'malmö', 'malmö ff'],
  'copenhagen': ['코펜하겐', 'fc copenhagen', 'fc kobenhavn', 'fc københavn'],
  'sturm graz': ['슈투름 그라츠', 'sk sturm graz'],
  'dinamo zagreb': ['디나모 자그레브', 'gnk dinamo zagreb'],
  'crvena zvezda': ['츠르베나 즈베즈다', 'red star belgrade', 'red star'],
  'ferencvaros': ['페렌츠바로시', 'ferencvarosi tc', 'ferencváros'],
}

// 캐시 (더 긴 시간)
const highlightCache: Record<string, { data: any[]; timestamp: number }> = {}
const CACHE_DURATION = 30 * 60 * 1000 // 30분으로 증가

// ============================================
// 🔥 개선된 팀 매칭 함수
// ============================================
function normalizeForSearch(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // 악센트 제거
    .replace(/[^a-z0-9\s가-힣]/g, '') // 특수문자 제거
    .replace(/\s+/g, ' ')
    .trim()
}

function findTeamKey(searchName: string): string | null {
  const normalized = normalizeForSearch(searchName)
  
  // 1. 직접 키 매칭
  if (TEAM_ALIASES[normalized]) {
    return normalized
  }
  
  // 2. 별칭에서 검색
  for (const [key, aliases] of Object.entries(TEAM_ALIASES)) {
    // 키 자체가 포함되어 있는지
    if (normalized.includes(key) || key.includes(normalized)) {
      return key
    }
    
    // 별칭들 검색
    for (const alias of aliases) {
      const normalizedAlias = normalizeForSearch(alias)
      if (normalized === normalizedAlias || 
          normalized.includes(normalizedAlias) || 
          normalizedAlias.includes(normalized)) {
        return key
      }
    }
  }
  
  return null
}

function teamsMatch(team1: string, team2: string): boolean {
  const key1 = findTeamKey(team1)
  const key2 = findTeamKey(team2)
  
  // 둘 다 키를 찾았고 같으면 매칭
  if (key1 && key2 && key1 === key2) {
    return true
  }
  
  // 키를 못 찾으면 직접 비교
  const n1 = normalizeForSearch(team1)
  const n2 = normalizeForSearch(team2)
  
  // 정확히 같거나 포함관계
  if (n1 === n2) return true
  if (n1.length > 3 && n2.length > 3) {
    if (n1.includes(n2) || n2.includes(n1)) return true
  }
  
  // 단어 단위 매칭 (최소 2글자 이상 단어)
  const words1 = n1.split(' ').filter(w => w.length > 2)
  const words2 = n2.split(' ').filter(w => w.length > 2)
  
  for (const w1 of words1) {
    for (const w2 of words2) {
      if (w1 === w2 || (w1.length > 4 && w2.length > 4 && (w1.includes(w2) || w2.includes(w1)))) {
        return true
      }
    }
  }
  
  return false
}

// 타이틀에서 팀 추출
function extractTeamsFromTitle(title: string): { home: string; away: string } | null {
  // "Team A - Team B" 또는 "Team A vs Team B" 형식
  const match = title.match(/^(.+?)\s*[-–vs.]+\s*(.+?)(?:\s*\d|$)/i) ||
                title.match(/^(.+?)\s*[-–vs.]+\s*(.+)$/i)
  if (match) {
    return { 
      home: match[1].trim().replace(/\s*\d+$/, ''), 
      away: match[2].trim().replace(/\s*\d+$/, '') 
    }
  }
  return null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const homeTeam = searchParams.get('homeTeam') || ''
    const awayTeam = searchParams.get('awayTeam') || ''
    const league = searchParams.get('league')
    const debug = searchParams.get('debug') === 'true'

    console.log('🎬 ========== Highlight Search ==========')
    console.log('🎬 Input:', { date, homeTeam, awayTeam, league })
    
    // 팀 키 찾기
    const homeKey = findTeamKey(homeTeam)
    const awayKey = findTeamKey(awayTeam)
    console.log('🔑 Team Keys:', { homeKey, awayKey })

    if (!homeTeam || !awayTeam) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing team parameters',
        highlights: []
      }, { status: 400 })
    }

    const now = Date.now()
    let allHighlights: any[] = []

    // 1. 리그별 Competition 엔드포인트 먼저 시도
    const competitionId = league ? LEAGUE_TO_COMPETITION[league] : null
    
    if (competitionId) {
      const cacheKey = `competition-${competitionId}`
      
      if (highlightCache[cacheKey] && (now - highlightCache[cacheKey].timestamp) < CACHE_DURATION) {
        console.log(`📦 Cache hit: ${competitionId}`)
        allHighlights = highlightCache[cacheKey].data
      } else {
        const apiUrl = `https://www.scorebat.com/video-api/v3/competition/${competitionId}/?token=${SCOREBAT_TOKEN}`
        console.log(`🌐 Fetching: ${competitionId}`)

        try {
          const response = await fetch(apiUrl, {
            headers: { 'Accept': 'application/json' },
            next: { revalidate: 1800 }
          })

          if (response.ok) {
            const data = await response.json()
            allHighlights = data.response || []
            highlightCache[cacheKey] = { data: allHighlights, timestamp: now }
            console.log(`✅ Got ${allHighlights.length} highlights from ${competitionId}`)
          }
        } catch (e) {
          console.log(`❌ Competition fetch failed: ${e}`)
        }
      }
    }
    
    // 2. Competition에서 못 찾으면 Featured Feed
    if (allHighlights.length === 0) {
      const cacheKey = 'featured-feed'
      
      if (highlightCache[cacheKey] && (now - highlightCache[cacheKey].timestamp) < CACHE_DURATION) {
        console.log('📦 Cache hit: featured-feed')
        allHighlights = highlightCache[cacheKey].data
      } else {
        const apiUrl = `https://www.scorebat.com/video-api/v3/feed/?token=${SCOREBAT_TOKEN}`
        console.log('🌐 Fetching: featured feed')

        try {
          const response = await fetch(apiUrl, {
            headers: { 'Accept': 'application/json' },
            next: { revalidate: 1800 }
          })

          if (response.ok) {
            const data = await response.json()
            allHighlights = data.response || []
            highlightCache[cacheKey] = { data: allHighlights, timestamp: now }
            console.log(`✅ Got ${allHighlights.length} highlights from feed`)
          }
        } catch (e) {
          console.log(`❌ Feed fetch failed: ${e}`)
        }
      }
    }

    // 디버그 모드: 모든 타이틀 출력
    if (debug) {
      console.log('📋 Available highlights:')
      allHighlights.slice(0, 20).forEach((h, i) => {
        console.log(`  ${i + 1}. ${h.title}`)
      })
    }

    // 3. 매칭 찾기
    let bestMatch: any = null
    
    for (const highlight of allHighlights) {
      const title = highlight.title || ''
      const teams = extractTeamsFromTitle(title)
      
      if (!teams) continue
      
      const homeMatches = teamsMatch(teams.home, homeTeam)
      const awayMatches = teamsMatch(teams.away, awayTeam)
      
      if (debug || (homeMatches && awayMatches)) {
        console.log(`🔍 "${title}"`)
        console.log(`   Home: "${teams.home}" vs "${homeTeam}" = ${homeMatches}`)
        console.log(`   Away: "${teams.away}" vs "${awayTeam}" = ${awayMatches}`)
      }
      
      if (homeMatches && awayMatches) {
        // 날짜도 맞으면 바로 반환
        if (date && highlight.date) {
          const highlightDate = highlight.date.split('T')[0]
          if (highlightDate === date) {
            bestMatch = highlight
            console.log(`✅ Perfect match (with date): ${title}`)
            break
          }
        }
        
        // 날짜 상관없이 첫 번째 매칭
        if (!bestMatch) {
          bestMatch = highlight
          console.log(`✅ Match found: ${title}`)
        }
      }
    }

    if (!bestMatch) {
      console.log(`❌ No match found for: ${homeTeam} vs ${awayTeam}`)
      return NextResponse.json({
        success: true,
        highlights: [],
        message: 'No matching highlight found',
        debug: debug ? { 
          searchedTeams: { homeTeam, awayTeam, homeKey, awayKey },
          totalHighlights: allHighlights.length 
        } : undefined
      })
    }

    // 비디오 정보 추출
    const videos = bestMatch.videos || []
    const highlightVideo = videos.find((v: any) => 
      v.title?.toLowerCase().includes('highlight')
    ) || videos[0]

    const formattedHighlight = {
      title: bestMatch.title,
      thumbnail: bestMatch.thumbnail,
      competition: bestMatch.competition,
      date: bestMatch.date,
      matchviewUrl: bestMatch.matchviewUrl,
      embedCode: highlightVideo?.embed || null,
      videoClips: videos.map((v: any) => ({
        title: v.title,
        embedCode: v.embed
      }))
    }

    console.log('🎬 ========== Search Complete ==========')

    return NextResponse.json({
      success: true,
      highlights: [formattedHighlight],
      count: 1
    })

  } catch (error) {
    console.error('❌ Highlight API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch highlights',
      highlights: []
    }, { status: 500 })
  }
}