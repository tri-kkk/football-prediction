import { NextRequest, NextResponse } from 'next/server'

// ScoreBat API 토큰
const SCOREBAT_TOKEN = process.env.SCOREBAT_API_TOKEN || 'MjU4NjkzXzE3NjQ3MzQ4MTRfN2FhODNjNmIxM2MxZDhiOWU3MDYzZTI3MzdjZThlZDJlZDEwYmNhMw=='

// ============================================
// 🔥 팀명 매핑 (ScoreBat slug 기준)
// https://www.scorebat.com/team/ 에서 확인 가능
// ============================================
const TEAM_DATA: Record<string, { aliases: string[]; slug: string }> = {
  // Premier League
  'arsenal': { aliases: ['아스날', '아스널', 'arsenal fc'], slug: 'arsenal' },
  'aston villa': { aliases: ['아스톤 빌라', 'aston villa fc', 'villa'], slug: 'aston-villa' },
  'bournemouth': { aliases: ['본머스', 'afc bournemouth'], slug: 'afc-bournemouth' },
  'brentford': { aliases: ['브렌트퍼드', 'brentford fc'], slug: 'brentford' },
  'brighton': { aliases: ['브라이튼', 'brighton hove albion', 'brighton and hove albion'], slug: 'brighton-and-hove-albion' },
  'chelsea': { aliases: ['첼시', 'chelsea fc'], slug: 'chelsea' },
  'crystal palace': { aliases: ['크리스탈 팰리스', 'palace'], slug: 'crystal-palace' },
  'everton': { aliases: ['에버튼', 'everton fc'], slug: 'everton' },
  'fulham': { aliases: ['풀럼', 'fulham fc'], slug: 'fulham' },
  'ipswich': { aliases: ['입스위치', 'ipswich town'], slug: 'ipswich-town' },
  'leicester': { aliases: ['레스터', 'leicester city'], slug: 'leicester-city' },
  'liverpool': { aliases: ['리버풀', 'liverpool fc'], slug: 'liverpool' },
  'manchester city': { aliases: ['맨체스터 시티', '맨시티', 'man city'], slug: 'manchester-city' },
  'manchester united': { aliases: ['맨체스터 유나이티드', '맨유', 'man united', 'man utd'], slug: 'manchester-united' },
  'newcastle': { aliases: ['뉴캐슬', 'newcastle united'], slug: 'newcastle-united' },
  'nottingham forest': { aliases: ['노팅엄', '노팅엄 포레스트', 'forest', "nott'm forest"], slug: 'nottingham-forest' },
  'southampton': { aliases: ['사우샘프턴', 'southampton fc'], slug: 'southampton' },
  'tottenham': { aliases: ['토트넘', 'tottenham hotspur', 'spurs'], slug: 'tottenham-hotspur' },
  'west ham': { aliases: ['웨스트햄', 'west ham united'], slug: 'west-ham-united' },
  'wolverhampton': { aliases: ['울버햄튼', 'wolves', 'wolverhampton wanderers'], slug: 'wolverhampton-wanderers' },
  
  // La Liga
  'real madrid': { aliases: ['레알 마드리드', 'real madrid cf'], slug: 'real-madrid' },
  'barcelona': { aliases: ['바르셀로나', 'fc barcelona', 'barca'], slug: 'barcelona' },
  'atletico madrid': { aliases: ['아틀레티코 마드리드', '아틀레티코', 'atletico'], slug: 'atletico-madrid' },
  'sevilla': { aliases: ['세비야', 'sevilla fc'], slug: 'sevilla' },
  'villarreal': { aliases: ['비야레알', 'villarreal cf'], slug: 'villarreal' },
  'real sociedad': { aliases: ['레알 소시에다드'], slug: 'real-sociedad' },
  'real betis': { aliases: ['베티스', '레알 베티스', 'betis'], slug: 'real-betis' },
  'valencia': { aliases: ['발렌시아', 'valencia cf'], slug: 'valencia' },
  'athletic bilbao': { aliases: ['아틀레틱 빌바오', 'athletic club'], slug: 'athletic-bilbao' },
  'girona': { aliases: ['지로나', 'girona fc'], slug: 'girona' },
  'mallorca': { aliases: ['마요르카', 'rcd mallorca'], slug: 'mallorca' },
  'getafe': { aliases: ['헤타페', 'getafe cf'], slug: 'getafe' },
  'osasuna': { aliases: ['오사수나', 'ca osasuna'], slug: 'osasuna' },
  'celta vigo': { aliases: ['셀타 비고', 'celta'], slug: 'celta-vigo' },
  'las palmas': { aliases: ['라스 팔마스'], slug: 'las-palmas' },
  'alaves': { aliases: ['알라베스'], slug: 'alaves' },
  'leganes': { aliases: ['레간에스'], slug: 'leganes' },
  'espanyol': { aliases: ['에스파뇰'], slug: 'espanyol' },
  'rayo vallecano': { aliases: ['라요 바예카노', 'rayo'], slug: 'rayo-vallecano' },
  'real valladolid': { aliases: ['바야돌리드', 'valladolid'], slug: 'real-valladolid' },
  
  // Bundesliga
  'bayern munich': { aliases: ['바이에른 뮌헨', '바이에른', 'bayern', 'fc bayern'], slug: 'bayern-munich' },
  'borussia dortmund': { aliases: ['도르트문트', 'dortmund', 'bvb'], slug: 'borussia-dortmund' },
  'rb leipzig': { aliases: ['라이프치히', 'leipzig'], slug: 'rb-leipzig' },
  'bayer leverkusen': { aliases: ['레버쿠젠', 'leverkusen'], slug: 'bayer-leverkusen' },
  'eintracht frankfurt': { aliases: ['프랑크푸르트', 'frankfurt'], slug: 'eintracht-frankfurt' },
  'wolfsburg': { aliases: ['볼프스부르크', 'vfl wolfsburg'], slug: 'vfl-wolfsburg' },
  'borussia monchengladbach': { aliases: ['묀헨글라드바흐', 'gladbach'], slug: 'borussia-monchengladbach' },
  'freiburg': { aliases: ['프라이부르크', 'sc freiburg'], slug: 'sc-freiburg' },
  'hoffenheim': { aliases: ['호펜하임', 'tsg hoffenheim'], slug: 'tsg-hoffenheim' },
  'mainz': { aliases: ['마인츠', 'mainz 05'], slug: 'mainz-05' },
  'augsburg': { aliases: ['아우크스부르크', 'fc augsburg'], slug: 'fc-augsburg' },
  'stuttgart': { aliases: ['슈투트가르트', 'vfb stuttgart'], slug: 'vfb-stuttgart' },
  'werder bremen': { aliases: ['브레멘', 'bremen'], slug: 'werder-bremen' },
  'bochum': { aliases: ['보훔', 'vfl bochum'], slug: 'vfl-bochum' },
  'heidenheim': { aliases: ['하이덴하임'], slug: '1-fc-heidenheim' },
  'st pauli': { aliases: ['장크트 파울리'], slug: 'fc-st-pauli' },
  'holstein kiel': { aliases: ['킬', 'kiel'], slug: 'holstein-kiel' },
  'union berlin': { aliases: ['우니온 베를린', 'union'], slug: 'union-berlin' },
  
  // Serie A
  'napoli': { aliases: ['나폴리', 'ssc napoli'], slug: 'napoli' },
  'inter milan': { aliases: ['인터 밀란', '인터', 'inter', 'internazionale'], slug: 'inter' },
  'ac milan': { aliases: ['AC 밀란', '밀란', 'milan'], slug: 'ac-milan' },
  'juventus': { aliases: ['유벤투스', 'juventus fc', 'juve'], slug: 'juventus' },
  'roma': { aliases: ['로마', 'as roma'], slug: 'as-roma' },
  'lazio': { aliases: ['라치오', 'ss lazio'], slug: 'lazio' },
  'atalanta': { aliases: ['아탈란타', 'atalanta bc'], slug: 'atalanta' },
  'fiorentina': { aliases: ['피오렌티나'], slug: 'fiorentina' },
  'torino': { aliases: ['토리노', 'torino fc'], slug: 'torino' },
  'bologna': { aliases: ['볼로냐', 'bologna fc'], slug: 'bologna' },
  'udinese': { aliases: ['우디네세'], slug: 'udinese' },
  'verona': { aliases: ['베로나', 'hellas verona'], slug: 'hellas-verona' },
  'empoli': { aliases: ['엠폴리'], slug: 'empoli' },
  'lecce': { aliases: ['레체'], slug: 'lecce' },
  'monza': { aliases: ['몬차', 'ac monza'], slug: 'monza' },
  'cagliari': { aliases: ['칼리아리'], slug: 'cagliari' },
  'genoa': { aliases: ['제노아'], slug: 'genoa' },
  'como': { aliases: ['코모'], slug: 'como' },
  'parma': { aliases: ['파르마'], slug: 'parma' },
  'venezia': { aliases: ['베네치아'], slug: 'venezia' },
  
  // Ligue 1
  'paris saint-germain': { aliases: ['PSG', '파리 생제르맹', 'paris sg'], slug: 'paris-saint-germain' },
  'marseille': { aliases: ['마르세유', 'om'], slug: 'marseille' },
  'monaco': { aliases: ['모나코', 'as monaco'], slug: 'monaco' },
  'lille': { aliases: ['릴', 'losc lille', 'losc'], slug: 'lille' },
  'lyon': { aliases: ['리옹', 'olympique lyonnais'], slug: 'lyon' },
  'rennes': { aliases: ['렌', 'stade rennais'], slug: 'rennes' },
  'nice': { aliases: ['니스', 'ogc nice'], slug: 'nice' },
  'lens': { aliases: ['랑스', 'rc lens'], slug: 'lens' },
  'brest': { aliases: ['브레스트'], slug: 'brest' },
  'toulouse': { aliases: ['툴루즈'], slug: 'toulouse' },
  'strasbourg': { aliases: ['스트라스부르'], slug: 'strasbourg' },
  'nantes': { aliases: ['낭트'], slug: 'nantes' },
  'reims': { aliases: ['랭스'], slug: 'reims' },
  'montpellier': { aliases: ['몽펠리에'], slug: 'montpellier' },
  'le havre': { aliases: ['르아브르'], slug: 'le-havre' },
  'auxerre': { aliases: ['오세르'], slug: 'auxerre' },
  'angers': { aliases: ['앙제'], slug: 'angers' },
  'saint-etienne': { aliases: ['생테티엔'], slug: 'saint-etienne' },
  
  // Portuguese / Dutch
  'porto': { aliases: ['포르투', 'fc porto'], slug: 'fc-porto' },
  'benfica': { aliases: ['벤피카', 'sl benfica'], slug: 'benfica' },
  'sporting cp': { aliases: ['스포르팅', 'sporting'], slug: 'sporting-cp' },
  'braga': { aliases: ['브라가', 'sc braga'], slug: 'sc-braga' },
  'ajax': { aliases: ['아약스'], slug: 'ajax' },
  'psv eindhoven': { aliases: ['PSV', 'psv'], slug: 'psv-eindhoven' },
  'feyenoord': { aliases: ['페예노르트'], slug: 'feyenoord' },
  
  // Champions League / Europa League / Conference League
  'galatasaray': { aliases: ['갈라타사라이'], slug: 'galatasaray' },
  'fenerbahce': { aliases: ['페네르바체'], slug: 'fenerbahce' },
  'besiktas': { aliases: ['베식타스'], slug: 'besiktas' },
  'celtic': { aliases: ['셀틱'], slug: 'celtic' },
  'rangers': { aliases: ['레인저스'], slug: 'rangers' },
  'club brugge': { aliases: ['클럽 브뤼헤', 'brugge'], slug: 'club-brugge' },
  'red bull salzburg': { aliases: ['잘츠부르크', 'salzburg'], slug: 'red-bull-salzburg' },
  'shakhtar donetsk': { aliases: ['샤흐타르', 'shakhtar'], slug: 'shakhtar-donetsk' },
  'dinamo zagreb': { aliases: ['디나모 자그레브'], slug: 'dinamo-zagreb' },
  'crvena zvezda': { aliases: ['츠르베나 즈베즈다', 'red star'], slug: 'crvena-zvezda' },
  'young boys': { aliases: ['영 보이스'], slug: 'bsc-young-boys' },
  'sparta prague': { aliases: ['스파르타 프라하'], slug: 'sparta-prague' },
  'slavia prague': { aliases: ['슬라비아 프라하'], slug: 'slavia-prague' },
  'sturm graz': { aliases: ['슈투름 그라츠'], slug: 'sturm-graz' },
  'ferencvaros': { aliases: ['페렌츠바로시'], slug: 'ferencvaros' },
  'malmo': { aliases: ['말뫼', 'malmo ff'], slug: 'malmo-ff' },
  'copenhagen': { aliases: ['코펜하겐', 'fc copenhagen'], slug: 'fc-copenhagen' },
  'midtjylland': { aliases: ['미트윌란', 'fc midtjylland'], slug: 'fc-midtjylland' },
  'olympiacos': { aliases: ['올림피아코스'], slug: 'olympiacos' },
  'panathinaikos': { aliases: ['파나티나이코스'], slug: 'panathinaikos' },
  'aek athens': { aliases: ['AEK 아테네', 'aek'], slug: 'aek-athens' },
  'paok': { aliases: ['PAOK', '파오크'], slug: 'paok' },
  'lask': { aliases: ['라스크'], slug: 'lask' },
  'rapid vienna': { aliases: ['라피드 빈'], slug: 'rapid-vienna' },
  'bodo glimt': { aliases: ['보되/글림트', 'bodo/glimt'], slug: 'bodo-glimt' },
  'molde': { aliases: ['몰데'], slug: 'molde' },
  'anderlecht': { aliases: ['안더레흐트'], slug: 'anderlecht' },
  'standard liege': { aliases: ['스탕다르 리에주'], slug: 'standard-liege' },
  
  // Cyprus - Conference League
  'pafos': { aliases: ['파포스', 'pafos fc'], slug: 'pafos-fc' },
  'omonia nicosia': { aliases: ['오모니아'], slug: 'omonia-nicosia' },
  'apoel': { aliases: ['아포엘'], slug: 'apoel' },
  
  // 기타 유럽
  'fcsb': { aliases: ['FCSB'], slug: 'fcsb' },
  'qarabag': { aliases: ['카라바그'], slug: 'qarabag' },
  'legia warsaw': { aliases: ['레기아 바르샤바'], slug: 'legia-warsaw' },
  'viktoria plzen': { aliases: ['빅토리아 플젠'], slug: 'viktoria-plzen' },
  
  // Championship (ELC)
  'leeds united': { aliases: ['리즈', 'leeds'], slug: 'leeds-united' },
  'burnley': { aliases: ['번리'], slug: 'burnley' },
  'sheffield united': { aliases: ['셰필드 유나이티드'], slug: 'sheffield-united' },
  'norwich': { aliases: ['노리치', 'norwich city'], slug: 'norwich-city' },
  'middlesbrough': { aliases: ['미들즈브러'], slug: 'middlesbrough' },
  'west brom': { aliases: ['웨스트 브롬', 'west bromwich'], slug: 'west-bromwich-albion' },
  'sunderland': { aliases: ['선덜랜드'], slug: 'sunderland' },
  'watford': { aliases: ['왓포드'], slug: 'watford' },
  'stoke': { aliases: ['스토크', 'stoke city'], slug: 'stoke-city' },
  'swansea': { aliases: ['스완지', 'swansea city'], slug: 'swansea-city' },
  'luton': { aliases: ['루턴', 'luton town'], slug: 'luton-town' },
}

// 캐시
const highlightCache: Record<string, { data: any[]; timestamp: number }> = {}
const CACHE_DURATION = 30 * 60 * 1000

// ============================================
// 🔥 핵심: 정규화 함수 (공백, 특수문자 모두 제거)
// ============================================
function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // 악센트 제거
    .replace(/[^a-z0-9가-힣]/g, '')  // 특수문자, 공백 모두 제거
    .trim()
}

// ============================================
// 🔥 핵심: 팀 데이터 찾기
// ============================================
function findTeamData(searchName: string): { key: string; slug: string } | null {
  const normalized = normalizeTeamName(searchName)
  if (!normalized) return null
  
  // 1. 키 직접 매칭
  for (const [key, data] of Object.entries(TEAM_DATA)) {
    const normalizedKey = normalizeTeamName(key)
    if (normalized === normalizedKey) {
      return { key, slug: data.slug }
    }
  }
  
  // 2. 별칭 정확히 매칭
  for (const [key, data] of Object.entries(TEAM_DATA)) {
    for (const alias of data.aliases) {
      const normalizedAlias = normalizeTeamName(alias)
      if (normalized === normalizedAlias) {
        return { key, slug: data.slug }
      }
    }
  }
  
  // 3. 포함 관계 (엄격하게 - 길이 비율 70% 이상)
  for (const [key, data] of Object.entries(TEAM_DATA)) {
    const normalizedKey = normalizeTeamName(key)
    
    if (normalized.length >= 5 && normalizedKey.length >= 5) {
      if (normalized.includes(normalizedKey) || normalizedKey.includes(normalized)) {
        const shorter = normalized.length < normalizedKey.length ? normalized : normalizedKey
        const longer = normalized.length < normalizedKey.length ? normalizedKey : normalized
        if (shorter.length / longer.length >= 0.7) {
          return { key, slug: data.slug }
        }
      }
    }
    
    for (const alias of data.aliases) {
      const normalizedAlias = normalizeTeamName(alias)
      if (normalized.length >= 4 && normalizedAlias.length >= 4) {
        if (normalized === normalizedAlias) {
          return { key, slug: data.slug }
        }
        if (normalized.includes(normalizedAlias) || normalizedAlias.includes(normalized)) {
          const shorter = normalized.length < normalizedAlias.length ? normalized : normalizedAlias
          const longer = normalized.length < normalizedAlias.length ? normalizedAlias : normalized
          if (shorter.length / longer.length >= 0.7) {
            return { key, slug: data.slug }
          }
        }
      }
    }
  }
  
  return null
}

// ============================================
// 🔥 핵심: 두 팀이 같은 팀인지 확인 (엄격!)
// ============================================
function isSameTeam(team1: string, team2: string): boolean {
  const data1 = findTeamData(team1)
  const data2 = findTeamData(team2)
  
  // 둘 다 찾았고 같은 키면 매칭
  if (data1 && data2 && data1.key === data2.key) {
    return true
  }
  
  // 둘 다 못 찾으면 정규화 후 직접 비교 (매우 엄격하게)
  if (!data1 && !data2) {
    const n1 = normalizeTeamName(team1)
    const n2 = normalizeTeamName(team2)
    
    // 정확히 같으면 매칭
    if (n1 === n2 && n1.length >= 3) return true
    
    // 한쪽이 다른 쪽에 포함되고 길이 비율 85% 이상 (매우 엄격!)
    if (n1.length >= 5 && n2.length >= 5) {
      if (n1.includes(n2) || n2.includes(n1)) {
        const shorter = n1.length < n2.length ? n1 : n2
        const longer = n1.length < n2.length ? n2 : n1
        if (shorter.length / longer.length >= 0.85) {
          return true
        }
      }
    }
  }
  
  return false
}

// 타이틀에서 팀 추출
function extractTeamsFromTitle(title: string): { home: string; away: string } | null {
  const patterns = [
    /^(.+?)\s*[-–]\s*(.+?)(?:\s+\d|$)/i,
    /^(.+?)\s+vs\.?\s+(.+?)(?:\s+\d|$)/i,
    /^(.+?)\s*[-–]\s*(.+)$/i,
  ]
  
  for (const pattern of patterns) {
    const match = title.match(pattern)
    if (match) {
      const home = match[1].trim().replace(/\s*\d+$/, '').trim()
      const away = match[2].trim().replace(/\s*\d+$/, '').trim()
      if (home && away && home !== away) {
        return { home, away }
      }
    }
  }
  return null
}

// ============================================
// ScoreBat API 호출
// ============================================
async function fetchTeamHighlights(slug: string): Promise<any[]> {
  const cacheKey = `team-${slug}`
  const now = Date.now()
  
  if (highlightCache[cacheKey] && (now - highlightCache[cacheKey].timestamp) < CACHE_DURATION) {
    console.log(`📦 Cache hit: team/${slug}`)
    return highlightCache[cacheKey].data
  }
  
  const apiUrl = `https://www.scorebat.com/video-api/v3/team/${slug}/?token=${SCOREBAT_TOKEN}`
  console.log(`🌐 Fetching: team/${slug}`)
  
  try {
    const response = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 1800 }
    })
    
    if (response.ok) {
      const data = await response.json()
      const highlights = data.response || []
      highlightCache[cacheKey] = { data: highlights, timestamp: now }
      console.log(`✅ Got ${highlights.length} highlights from team/${slug}`)
      return highlights
    } else {
      console.log(`❌ Team fetch failed: ${response.status}`)
    }
  } catch (e) {
    console.log(`❌ Team fetch error: ${e}`)
  }
  
  return []
}

async function fetchFeedHighlights(): Promise<any[]> {
  const cacheKey = 'featured-feed'
  const now = Date.now()
  
  if (highlightCache[cacheKey] && (now - highlightCache[cacheKey].timestamp) < CACHE_DURATION) {
    console.log('📦 Cache hit: featured-feed')
    return highlightCache[cacheKey].data
  }
  
  const apiUrl = `https://www.scorebat.com/video-api/v3/feed/?token=${SCOREBAT_TOKEN}`
  console.log('🌐 Fetching: featured feed')
  
  try {
    const response = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 1800 }
    })
    
    if (response.ok) {
      const data = await response.json()
      const highlights = data.response || []
      highlightCache[cacheKey] = { data: highlights, timestamp: now }
      console.log(`✅ Got ${highlights.length} highlights from feed`)
      return highlights
    }
  } catch (e) {
    console.log(`❌ Feed fetch error: ${e}`)
  }
  
  return []
}

// ============================================
// 🔥 메인 API
// ============================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const homeTeam = searchParams.get('homeTeam') || ''
    const awayTeam = searchParams.get('awayTeam') || ''
    const debug = searchParams.get('debug') === 'true'

    console.log('🎬 ========== Highlight Search ==========')
    console.log('🎬 Input:', { date, homeTeam, awayTeam })
    
    if (!homeTeam || !awayTeam) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing team parameters',
        highlights: []
      }, { status: 400 })
    }

    // 팀 데이터 찾기
    const homeData = findTeamData(homeTeam)
    const awayData = findTeamData(awayTeam)
    
    console.log('🔑 Team Data:', { 
      home: homeData ? `${homeData.key} → ${homeData.slug}` : `NOT FOUND (${homeTeam})`,
      away: awayData ? `${awayData.key} → ${awayData.slug}` : `NOT FOUND (${awayTeam})`
    })

    // ============================================
    // 🔥 개선: 양방향 검색 (홈팀 + 어웨이팀 모두 검색!)
    // ============================================
    let allHighlights: any[] = []
    const fetchedSlugs: string[] = []
    
    // 1차: 홈팀으로 검색
    if (homeData?.slug) {
      const homeHighlights = await fetchTeamHighlights(homeData.slug)
      allHighlights.push(...homeHighlights)
      fetchedSlugs.push(homeData.slug)
      console.log(`📊 Home team (${homeData.slug}): ${homeHighlights.length} highlights`)
    }
    
    // 2차: 어웨이팀으로 검색 (홈팀과 다른 경우에만)
    if (awayData?.slug && awayData.slug !== homeData?.slug) {
      const awayHighlights = await fetchTeamHighlights(awayData.slug)
      allHighlights.push(...awayHighlights)
      fetchedSlugs.push(awayData.slug)
      console.log(`📊 Away team (${awayData.slug}): ${awayHighlights.length} highlights`)
    }
    
    // 3차: Featured Feed (슬러그 모를 때만)
    if (allHighlights.length === 0) {
      allHighlights = await fetchFeedHighlights()
      console.log(`📊 Featured feed: ${allHighlights.length} highlights`)
    }

    // 중복 제거 (같은 경기가 양쪽에 있을 수 있음)
    const uniqueHighlights = allHighlights.filter((highlight, index, self) => 
      index === self.findIndex(h => h.title === highlight.title)
    )
    
    console.log(`📊 Total unique highlights: ${uniqueHighlights.length}`)

    // 디버그
    if (debug) {
      console.log('📋 Available highlights:')
      uniqueHighlights.slice(0, 20).forEach((h, i) => {
        console.log(`  ${i + 1}. ${h.title}`)
      })
    }

    // ============================================
    // 🔥 핵심: 엄격한 매칭 - 두 팀 모두 매칭되어야만!
    // ============================================
    let bestMatch: any = null
    
    for (const highlight of uniqueHighlights) {
      const title = highlight.title || ''
      const teams = extractTeamsFromTitle(title)
      
      if (!teams) continue
      
      // 🔥 두 팀 모두 정확히 매칭되어야 함
      const homeMatches = isSameTeam(teams.home, homeTeam)
      const awayMatches = isSameTeam(teams.away, awayTeam)
      
      // 🔥 추가: 순서가 바뀌어도 매칭 (ScoreBat 순서 ≠ API 순서일 수 있음)
      const homeMatchesReverse = isSameTeam(teams.home, awayTeam)
      const awayMatchesReverse = isSameTeam(teams.away, homeTeam)
      
      const isMatch = (homeMatches && awayMatches) || (homeMatchesReverse && awayMatchesReverse)
      
      if (debug) {
        console.log(`🔍 "${title}"`)
        console.log(`   Extracted: "${teams.home}" vs "${teams.away}"`)
        console.log(`   Searching: "${homeTeam}" vs "${awayTeam}"`)
        console.log(`   Match: ${isMatch} (normal: ${homeMatches && awayMatches}, reverse: ${homeMatchesReverse && awayMatchesReverse})`)
      }
      
      // 🔥 핵심: 두 팀 모두 매칭되어야만 선택!
      if (isMatch) {
        // 날짜도 맞으면 완벽
        if (date && highlight.date) {
          const highlightDate = highlight.date.split('T')[0]
          if (highlightDate === date) {
            bestMatch = highlight
            console.log(`✅ Perfect match (date + teams): ${title}`)
            break
          }
        }
        
        // 날짜 없어도 팀 매칭되면 선택 (첫 번째만)
        if (!bestMatch) {
          bestMatch = highlight
          console.log(`✅ Team match found: ${title}`)
        }
      }
    }

    // ============================================
    // 🔥 매칭 실패 = 빈 배열 반환 (잘못된 경기 절대 표시 X)
    // ============================================
    if (!bestMatch) {
      console.log(`❌ No exact match found for: ${homeTeam} vs ${awayTeam}`)
      return NextResponse.json({
        success: true,
        highlights: [],
        message: 'No matching highlight found',
        debug: debug ? { 
          searchedTeams: { homeTeam, awayTeam },
          foundSlugs: { home: homeData?.slug, away: awayData?.slug },
          fetchedSlugs,
          totalHighlights: uniqueHighlights.length 
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
