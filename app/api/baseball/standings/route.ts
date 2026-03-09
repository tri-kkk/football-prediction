import { NextRequest, NextResponse } from 'next/server'

// API-Football Baseball 리그 ID (실제 ID)
const LEAGUE_IDS: Record<string, number> = {
  KBO: 5,
  NPB: 2,
  MLB: 1,
  CPBL: 29,
}

// 팀명 한글 매핑
const TEAM_NAME_KO: Record<number, string> = {
  // KBO
  93: 'LG 트윈스',
  91: 'KT 위즈',
  647: 'SSG 랜더스',
  95: 'NC 다이노스',
  88: '두산 베어스',
  90: 'KIA 타이거즈',
  94: '롯데 자이언츠',
  97: '삼성 라이온즈',
  89: '한화 이글스',
  92: '키움 히어로즈',
  
  // NPB - Central
  66: '요미우리',
  58: '한신',
  59: '히로시마',
  55: '주니치',
  65: '야쿠르트',
  67: '요코하마',
  
  // NPB - Pacific
  57: '소프트뱅크',
  61: '오릭스',
  62: '라쿠텐',
  63: '세이부',
  60: '니혼햄',
  56: '지바롯데',
  
  // MLB - American League
  4: '볼티모어 오리올스',
  5: '보스턴 레드삭스',
  7: '시카고 화이트삭스',
  9: '클리블랜드 가디언스',
  12: '디트로이트 타이거스',
  15: '휴스턴 애스트로스',
  16: '캔자스시티 로열스',
  17: 'LA 에인절스',
  22: '미네소타 트윈스',
  25: '뉴욕 양키스',
  26: '오클랜드 애슬레틱스',
  32: '시애틀 매리너스',
  34: '탬파베이 레이스',
  35: '텍사스 레인저스',
  36: '토론토 블루제이스',
  
  // MLB - National League
  2: '애리조나 다이아몬드백스',
  3: '애틀랜타 브레이브스',
  6: '시카고 컵스',
  8: '신시내티 레즈',
  10: '콜로라도 로키스',
  18: 'LA 다저스',
  19: '마이애미 말린스',
  20: '밀워키 브루어스',
  24: '뉴욕 메츠',
  27: '필라델피아 필리스',
  28: '피츠버그 파이리츠',
  30: '샌디에이고 파드리스',
  31: 'SF 자이언츠',
  33: '세인트루이스 카디널스',
  37: '워싱턴 내셔널스',
  
  // CPBL
  482: '라쿠텐 몽키스',
  569: '웨이취안 드래곤즈',
  349: '푸방 가디언스',
  351: '유니 라이온즈',
  348: '중신 브라더스',
}

// 현재 시즌
const CURRENT_SEASON = 2023

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const league = searchParams.get('league') || 'KBO'
  const subLeague = searchParams.get('sub') || 'ALL' // CENTRAL, PACIFIC, AL, NL
  
  try {
    const leagueId = LEAGUE_IDS[league] || 5
    
    console.log(`Fetching standings: league=${league}, leagueId=${leagueId}, season=${CURRENT_SEASON}`)
    
    // API-Football 호출
    const response = await fetch(
      `https://v1.baseball.api-sports.io/standings?league=${leagueId}&season=${CURRENT_SEASON}`,
      {
        headers: {
          'x-apisports-key': process.env.API_FOOTBALL_KEY || '',
        },
        next: { revalidate: 3600 } // 1시간 캐시
      }
    )
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    console.log('API Response structure:', JSON.stringify(data.response?.[0], null, 2)?.slice(0, 500))
    
    // 응답 데이터 변환 - 이중 배열 구조!
    let rawStandings = data.response?.[0] || []
    
    console.log(`Raw standings count: ${rawStandings.length}`)
    
    // NPB/MLB는 그룹별로 필터링
    if (league === 'NPB' && subLeague !== 'ALL') {
      rawStandings = rawStandings.filter((item: any) => {
        const group = item.group?.name?.toLowerCase() || ''
        if (subLeague === 'CENTRAL') return group.includes('central')
        if (subLeague === 'PACIFIC') return group.includes('pacific')
        return true
      })
    }
    
    if (league === 'MLB' && subLeague !== 'ALL') {
      // American League / National League 전체 순위만 필터
      rawStandings = rawStandings.filter((item: any) => {
        const group = item.group?.name || ''
        if (subLeague === 'AL') return group === 'American League'
        if (subLeague === 'NL') return group === 'National League'
        return true
      })
    }
    
    const standings = rawStandings.map((item: any, index: number) => {
      const teamId = item.team?.id || 0
      const teamNameKo = TEAM_NAME_KO[teamId] || item.team?.name || ''
      
      return {
        rank: item.position || index + 1,
        team: teamNameKo,
        teamEn: item.team?.name || '',
        logo: item.team?.logo || '',
        teamId: teamId,
        wins: item.games?.win?.total ?? 0,
        losses: item.games?.lose?.total ?? 0,
        pct: item.games?.win?.percentage || '.000',
        gb: item.games?.behind || '-',
        group: item.group?.name || '',
      }
    })
    
    console.log(`Processed ${standings.length} teams for ${league} ${subLeague}`)
    
    return NextResponse.json({
      success: true,
      league,
      subLeague,
      season: CURRENT_SEASON,
      standings,
    })
    
  } catch (error) {
    console.error('Standings API error:', error)
    
    return NextResponse.json({
      success: false,
      error: String(error),
      league,
      standings: [],
    })
  }
}