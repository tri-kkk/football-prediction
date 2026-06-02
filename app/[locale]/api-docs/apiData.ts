// app/api-docs/apiData.ts
// TrendSoccer 모바일 앱용 API 명세
// 코드 기반 추출 — 변경 시 sync 필요

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

export type ApiParam = {
  name: string
  in: 'query' | 'path' | 'body'
  required: boolean
  type: string
  description: string
  default?: string
}

export type ApiEndpoint = {
  id: string
  category: string
  method: HttpMethod
  path: string
  description: string
  auth: 'none' | 'session' | 'secret'
  params?: ApiParam[]
  responseExample: string
  notes?: string
  tryItDefaults?: Record<string, string>
}

export type ApiCategory = {
  id: string
  label: string
  description: string
}

export const CATEGORIES: ApiCategory[] = [
  { id: 'soccer-match', label: '⚽ 축구 — 경기/일정', description: '경기 목록, 트렌드, 라이브 상세' },
  { id: 'soccer-analysis', label: '⚽ 축구 — 분석', description: '분석, H2H, 팀 통계, 라인업, 통계' },
  { id: 'soccer-pick', label: '⚽ 축구 — 프리미엄 리포트', description: '오늘의 리포트, 히스토리, 적중률' },
  { id: 'soccer-content', label: '⚽ 축구 — 컨텐츠', description: '뉴스, 하이라이트' },
  { id: 'baseball-match', label: '⚾ 야구 — 경기/일정', description: '경기 목록, 상세, 라이브, 순위' },
  { id: 'baseball-analysis', label: '⚾ 야구 — 분석', description: 'H2H, 팀/투수 통계, AI 분석, 코멘트' },
  { id: 'baseball-content', label: '⚾ 야구 — 컨텐츠', description: '뉴스, 라인업, 다경기 분석' },
  { id: 'report', label: '📰 리포트', description: '블로그/리포트' },
  { id: 'auth-sub', label: '🔐 인증 / 구독 / 결제', description: '약관, 구독 상태, 결제 초기화' },
  { id: 'mobile', label: '📱 모바일 앱 전용', description: 'Flutter 앱용 신규 엔드포인트 (v1/mobile/*)' },
  { id: 'misc', label: '📌 기타', description: '광고, 투표, 인사이트, 문의 등' },
]

export const ENDPOINTS: ApiEndpoint[] = [
  // ============ 축구 — 경기/일정 ============
  {
    id: 'matches',
    category: 'soccer-match',
    method: 'GET',
    path: '/api/matches',
    description: '⚠️ Deprecated — PL(프리미어리그) 데이터만 반환. 전체 리그용 아님. 신규 호출자는 /api/odds-from-db 사용.',
    auth: 'none',
    params: [
      { name: 'type', in: 'query', required: false, type: 'string', description: 'scheduled | results', default: 'scheduled' },
      { name: 'league', in: 'query', required: false, type: 'string', description: 'PL 만 의미 있음 (다른 코드 무시됨)', default: 'PL' },
    ],
    responseExample: `[
  {
    "id": 1234567,
    "league": "Premier League",
    "leagueCode": "PL",
    "leagueLogo": "https://...",
    "date": "2026-04-27",
    "time": "21:00",
    "homeTeam": "Manchester United",
    "awayTeam": "Arsenal",
    "homeCrest": "https://...",
    "awayCrest": "https://...",
    "homeScore": null,
    "awayScore": null,
    "status": "SCHEDULED",
    "homeWinRate": 45,
    "drawRate": 28,
    "awayWinRate": 27
  }
]`,
    notes: '⚠️ DEPRECATED — Premier League 한정. 전체 리그 일정은 반드시 /api/odds-from-db 사용. 데이터 출처: API-Football.',
    tryItDefaults: { type: 'scheduled', league: 'PL' },
  },
  {
    id: 'odds-from-db',
    category: 'soccer-match',
    method: 'GET',
    path: '/api/odds-from-db',
    description: '★ 정식 축구 일정 엔드포인트 — DB 저장된 경기 + 오즈 + 예측 (60초 캐시, 외부 API 호출 없음). 50+ 리그 지원.',
    auth: 'none',
    params: [
      { name: 'league', in: 'query', required: false, type: 'string', description: '리그 코드 (PL/PD/BL1/SA/FL1/CL/EL/KL1/J1 등) 또는 ALL', default: 'ALL' },
      { name: 'date', in: 'query', required: false, type: 'string', description: 'YYYY-MM-DD. 지정 시 해당 날짜 00:00~23:59 UTC' },
      { name: 'daysAhead', in: 'query', required: false, type: 'number', description: 'date 미지정 시 앞쪽 N일 (1~14)', default: '1' },
      { name: 'daysBack', in: 'query', required: false, type: 'number', description: 'date 미지정 시 뒤쪽 N일 (1~14)', default: '1' },
      { name: 'includeResults', in: 'query', required: false, type: 'boolean', description: 'match_results 병합 여부', default: 'true' },
      { name: 'limit', in: 'query', required: false, type: 'number', description: '최대 반환 개수 (50~1500)', default: '500' },
    ],
    responseExample: `{
  "success": true,
  "data": [
    {
      "match_id": 1545025,
      "league_code": "PL",
      "leagueName": "프리미어리그",
      "leagueNameEn": "Premier League",
      "leagueLogo": "https://media.api-sports.io/football/leagues/39.png",
      "leaguePriority": 10,
      "home_team": "Hull City",
      "away_team": "Southampton",
      "home_team_id": 49,
      "away_team_id": 41,
      "home_team_logo": "https://media.api-sports.io/football/teams/49.png",
      "away_team_logo": "https://media.api-sports.io/football/teams/41.png",
      "commence_time": "2026-05-23T15:30:00+00:00",
      "home_odds": 2.4, "draw_odds": 3.3, "away_odds": 2.8,
      "home_probability": 0.42, "draw_probability": 0.28, "away_probability": 0.30,
      "matchStatus": "SCHEDULED",   // SCHEDULED | FT (라이브 갱신 안 됨 — /api/live-matches 폴링 필요)
      "status": "NS",                 // DB raw status (참고용)
      "finalScoreHome": null,
      "finalScoreAway": null,
      "isCorrect": null
    }
  ],
  "count": 87,
  "source": "database",
  "meta": {
    "league": "ALL",
    "date": "all",
    "timezone": "KST (UTC+9)",
    "leagues": [{ "code": "PL", "name": "프리미어리그", "nameEn": "Premier League", "matchCount": 10, "priority": 10, "logo": "..." }]
  }
}`,
    notes: '⚠️ matchStatus는 SCHEDULED/FT 두 가지만 — 라이브 상태는 /api/live-matches 30초 폴링으로 오버레이. CDN 캐시 s-maxage=60, swr=300.',
    tryItDefaults: { league: 'ALL' },
  },
  {
    id: 'match-trend',
    category: 'soccer-match',
    method: 'GET',
    path: '/api/match-trend',
    description: '경기 확률 변동 추세 (누적 히스토리)',
    auth: 'none',
    params: [
      { name: 'matchId', in: 'query', required: true, type: 'number', description: '경기 ID' },
    ],
    responseExample: `{
  "success": true,
  "data": [
    { "timestamp": "2026-04-27T12:00:00Z", "homeWinProbability": 45.5, "drawProbability": 28.3, "awayWinProbability": 26.2 }
  ],
  "count": 24,
  "metadata": { "firstCollected": "...", "lastUpdated": "...", "timespanDays": "0.5", "totalDataPoints": 24 }
}`,
    tryItDefaults: { matchId: '' },
  },
  {
    id: 'live-matches',
    category: 'soccer-match',
    method: 'GET',
    path: '/api/live-matches',
    description: '★ 축구 라이브 경기 일괄 조회 (전체 라이브 경기 + 이벤트 + 통계). 30초 폴링용.',
    auth: 'none',
    params: [
      { name: 'test', in: 'query', required: false, type: 'boolean', description: 'true 시 테스트 데이터 반환', default: 'false' },
    ],
    responseExample: `{
  "success": true,
  "count": 8,
  "matches": [
    {
      "id": 1545025,                 // ← odds-from-db.match_id 와 동일 (오버레이 키)
      "fixtureId": 1545025,
      "leagueCode": "PL",
      "league": "Premier League",
      "leagueLogo": "https://...",
      "status": "2H",                // NS|1H|HT|2H|ET|BT|P|LIVE|FT|AET|PEN|PST|CANC|ABD|AWD|WO|SUSP|INT
      "statusLong": "Second Half",
      "elapsed": 67,
      "homeTeam": "Hull City",
      "awayTeam": "Southampton",
      "homeTeamKR": "헐 시티",
      "awayTeamKR": "사우샘프턴",
      "homeCrest": "https://media.api-sports.io/football/teams/49.png",
      "awayCrest": "https://media.api-sports.io/football/teams/41.png",
      "homeScore": 1,
      "awayScore": 0,
      "halftimeHomeScore": 0,
      "halftimeAwayScore": 0,
      "events": [{ "time": 23, "type": "goal", "team": "home", "player": "...", "detail": "Normal Goal" }],
      "stats": { "possession": { "home": 55, "away": 45 }, "shotsOnGoal": { "home": 5, "away": 3 } }
    }
  ],
  "timestamp": "2026-05-26T15:30:00Z"
}`,
    notes: '💸 API-Football 실시간 호출이라 quota 영향 큼. Fixture 탭 활성 시에만 30초 폴링, 백그라운드는 정지. 종료 판정: FT/AET/PEN.',
    tryItDefaults: {},
  },
  {
    id: 'match-results',
    category: 'soccer-match',
    method: 'GET',
    path: '/api/match-results',
    description: '경기 결과 조회 (자동 폴백)',
    auth: 'none',
    params: [
      { name: 'league', in: 'query', required: false, type: 'string', description: '리그명', default: 'ALL' },
      { name: 'date', in: 'query', required: false, type: 'string', description: 'YYYY-MM-DD' },
      { name: 'period', in: 'query', required: false, type: 'string', description: 'today | week | month', default: 'week' },
      { name: 'autoLatest', in: 'query', required: false, type: 'boolean', description: '데이터 없을 시 최신 날짜로 폴백', default: 'true' },
    ],
    responseExample: `{ "success": true, "matches": [...], "count": 50, "actualDate": "2026-04-27", "usedFallback": false }`,
    tryItDefaults: { period: 'week' },
  },

  // ============ 축구 — 분석 ============
  {
    id: 'analysis',
    category: 'soccer-analysis',
    method: 'GET',
    path: '/api/predictions',
    description: '경기 분석 (API-Football, 1시간 캐시)',
    auth: 'none',
    params: [
      { name: 'fixtureId', in: 'query', required: true, type: 'number', description: '경기 ID' },
    ],
    responseExample: `{
  "analysis": {
    "winner": { "id": 33, "name": "Manchester United", "comment": "Likely" },
    "advice": "Under 2.5",
    "percent": { "home": "45%", "draw": "28%", "away": "27%" }
  },
  "comparison": { "form": { "home": "50%", "away": "50%" }, "att": { "home": "60%", "away": "40%" } }
}`,
    tryItDefaults: { fixtureId: '' },
  },
  {
    id: 'predict-v2',
    category: 'soccer-analysis',
    method: 'POST',
    path: '/api/predict-v2',
    description: '★ 정식 축구 매치 분석 — 웹 Premium 페이지가 사용. 양팀+배당+리그 정보 전체를 body로 전달.',
    auth: 'none',
    params: [
      { name: 'matchId', in: 'body', required: true, type: 'number', description: 'API-Football fixture id' },
      { name: 'homeTeam', in: 'body', required: true, type: 'string', description: '홈팀 이름' },
      { name: 'awayTeam', in: 'body', required: true, type: 'string', description: '원정팀 이름' },
      { name: 'homeTeamId', in: 'body', required: true, type: 'number', description: 'API-Football home team id' },
      { name: 'awayTeamId', in: 'body', required: true, type: 'number', description: 'API-Football away team id' },
      { name: 'league', in: 'body', required: true, type: 'string', description: '리그 코드 (PL, PD, ...)' },
      { name: 'leagueId', in: 'body', required: true, type: 'number', description: 'API-Football league id' },
      { name: 'commenceTime', in: 'body', required: true, type: 'string', description: 'ISO 8601 UTC' },
      { name: 'odds', in: 'body', required: true, type: 'object', description: '{home, draw, away} 3종 배당' },
    ],
    responseExample: `{
  "prediction": {
    // ⭐ UI 표시용 (이걸 바인딩)
    "homeWinProb": 0.42, "drawProb": 0.28, "awayWinProb": 0.30,
    "predictedScore": { "home": 2, "away": 1 },
    "homePA": { "all": 1.51, "home": 1.8, "away": 1.2 },   // 득실비 (홈/원정 분리)
    "awayPA": { "all": 0.81, "home": 0.9, "away": 0.7 },
    "homeForm": ["W", "W", "D", "L", "W"],   // 최신 → 과거
    "awayForm": ["L", "D", "W", "W", "L"],
    "h2hSummary": { "wins": 3, "draws": 1, "losses": 1 },
    "confidence": 72,
    "aiComment": "...(한글 분석)",
    "recommendation": {
      "pick": "home",           // 'home' | 'draw' | 'away'
      "grade": "PICK",          // PICK | GOOD | PASS (DB 컬럼 아님 — 동적 산출)
      "reason": "..."
    }
  },
  "debug": {
    // 디버깅용 — 화면 표시에는 prediction.* 사용
    "homeStats": {...},
    "awayStats": {...},
    "modelWeights": {...},
    "dataSources": {...}
  }
}`,
    notes: '⭐ 화면 표시용 데이터는 prediction.* (predict-v2 응답 매핑: homePA.all = 득실비, predictedScore = 예상 스코어, recommendation.grade = 픽 등급). debug.* 는 보조용.',
  },
  {
    id: 'predict',
    category: 'soccer-analysis',
    method: 'POST',
    path: '/api/predict',
    description: '⚠️ Deprecated — 신규 호출자는 /api/predict-v2 사용 (웹 Premium 페이지가 사용하는 정식 엔드포인트). 응답 구조 다름.',
    auth: 'none',
    params: [
      { name: 'homeTeam', in: 'body', required: true, type: 'string', description: '홈팀명' },
      { name: 'awayTeam', in: 'body', required: true, type: 'string', description: '원정팀명' },
      { name: 'leagueId', in: 'body', required: true, type: 'number', description: '리그 ID' },
      { name: 'leagueCode', in: 'body', required: true, type: 'string', description: '리그 코드 (PL 등)' },
      { name: 'season', in: 'body', required: true, type: 'number', description: '시즌 연도 (2025 등)' },
      { name: 'oddsHome', in: 'body', required: true, type: 'number', description: '홈 배당' },
      { name: 'oddsDraw', in: 'body', required: true, type: 'number', description: '무 배당' },
      { name: 'oddsAway', in: 'body', required: true, type: 'number', description: '원정 배당' },
    ],
    responseExample: `{
  "success": true,
  "analysis": {
    "marketProb": { "home": 45, "draw": 28, "away": 27 },
    "finalProb": { "home": 48, "draw": 28, "away": 24 },
    "recommendation": { "pick": "HOME", "confidence": "HIGH", "value": "GOOD", "reason": [...] },
    "patternStats": { "totalMatches": 50, "homeWinRate": 48, "drawRate": 28, "awayWinRate": 24 }
  }
}`,
  },
  {
    id: 'h2h-enhanced',
    category: 'soccer-analysis',
    method: 'GET',
    path: '/api/h2h-enhanced',
    description: '두 팀 H2H 통계 (API-Football, 1시간 캐시)',
    auth: 'none',
    params: [
      { name: 'team1', in: 'query', required: true, type: 'number', description: '팀1 ID' },
      { name: 'team2', in: 'query', required: true, type: 'number', description: '팀2 ID' },
      { name: 'last', in: 'query', required: false, type: 'number', description: '최근 N경기', default: '10' },
    ],
    responseExample: `{
  "success": true,
  "h2h": {
    "matches": [{ "id": 123, "date": "...", "teams": { "home": {...}, "away": {...} }, "goals": { "home": 2, "away": 1 } }],
    "summary": { "total": 10, "team1Wins": 4, "team2Wins": 3, "draws": 3, "team1WinRate": "40.0", "avgGoalsPerMatch": "2.1" }
  }
}`,
    tryItDefaults: { team1: '33', team2: '42' },
  },
  {
    id: 'h2h-analysis',
    category: 'soccer-analysis',
    method: 'GET',
    path: '/api/h2h-analysis',
    description: 'H2H 트렌드 분석 (DB fallback 포함)',
    auth: 'none',
    params: [
      { name: 'homeTeam', in: 'query', required: true, type: 'string', description: '홈팀명' },
      { name: 'awayTeam', in: 'query', required: true, type: 'string', description: '원정팀명' },
      { name: 'homeTeamId', in: 'query', required: false, type: 'number', description: 'API 홈팀 ID' },
      { name: 'awayTeamId', in: 'query', required: false, type: 'number', description: 'API 원정팀 ID' },
    ],
    responseExample: `{
  "success": true,
  "data": {
    "overall": { "totalMatches": 20, "homeWins": 9, "draws": 5, "awayWins": 6, "homeWinRate": 45, "avgTotalGoals": 2.6 },
    "recent5": { "trend": "balanced", "trendDescription": "최근 5경기는 균형..." },
    "recentMatches": [
      { "date": "2026-04-15", "homeTeam": "...", "awayTeam": "...", "homeScore": 2, "awayScore": 1 }
      // ⭐ 통계 표시용으로 이 배열을 직접 계산해 사용 (scorePatterns는 별도 산식)
    ],
    "scorePatterns": { "mostCommon": [{ "score": "1-1", "count": 4 }], "over25Rate": 60, "bttsRate": 55 },
    "insights": ["..."]
  },
  "source": "api-football"
}`,
    notes: '⭐ UI 통계 표시 (평균 골, O2.5, BTTS)는 scorePatterns가 아니라 recentMatches에서 클라이언트 계산: avg=(총골)/length, over25=count(총골>2.5)/length, btts=count(home>0 && away>0)/length. Math.round, toFixed(1).',
  },
  {
    id: 'soccer-team-stats',
    category: 'soccer-analysis',
    method: 'GET',
    path: '/api/team-stats',
    description: '★ 축구 팀 상세 통계 — Premium 페이지 홈/원정 탭의 정식 데이터 소스. 매치당 홈/원정 각각 1회씩 호출.',
    auth: 'none',
    params: [
      { name: 'team', in: 'query', required: false, type: 'string', description: '팀 이름 (영문 or 한글). team 또는 teamId 중 하나 필수' },
      { name: 'teamId', in: 'query', required: false, type: 'number', description: 'API-Football team ID. ★ 권장 (정확한 매칭)' },
      { name: 'league', in: 'query', required: false, type: 'string', description: '리그 코드 (PL/PD/BL1/...). 컵대회(CL/EL/UECL/FAC/DFB/CDR/CDF/EFL)는 자국 리그로 fallback' },
    ],
    responseExample: `{
  "success": true,
  "team": "Hull City",
  "teamId": 49,
  "league": "PL",
  "season": "2025",
  "source": "supabase",  // 또는 'api-football' (DB 미존재 시)
  "data": {
    "teamId": 49, "teamName": "Hull City", "teamNameKo": "헐 시티",
    "leagueCode": "PL", "season": "2025",
    "seasonStats":  { "played": 30, "wins": 12, "draws": 8, "losses": 10, "winRate": 40, "goalsFor": 38, "goalsAgainst": 35 },
    "homeStats":    { "played": 15, "wins": 8, "draws": 4, "losses": 3, "winRate": 53, "goalsFor": 22, "goalsAgainst": 14 },
    "awayStats":    { "played": 15, "wins": 4, "draws": 4, "losses": 7, "winRate": 27, "goalsFor": 16, "goalsAgainst": 21 },
    "firstGoalStats":      { "home": { "games": 10, "wins": 8, "winRate": 80 }, "away": { "games": 6, "wins": 4, "winRate": 67 } },
    "concededFirstStats":  { "home": { "games": 5, "wins": 1, "comebackRate": 20 }, "away": { "games": 9, "wins": 1, "comebackRate": 11 } },
    "recentForm": {
      "last5":  { "wins": 3, "draws": 1, "losses": 1, "results": ["W","W","D","L","W"] },   // 최신 → 과거
      "last10": { "wins": 5, "draws": 2, "losses": 3, "goalsFor": 14, "goalsAgainst": 11 },
      "currentStreak":  { "type": "W", "count": 2 },   // 'W'|'D'|'L'|'none'
      "scoringStreak": 4, "cleanSheetStreak": 0
    },
    "markets": { "over25Rate": 60, "bttsRate": 50, "cleanSheetRate": 30, "scorelessRate": 20 },   // 최근 10경기 %
    "strengths":  ["현재 2연승 중", "선제골 시 승률 80%"],
    "weaknesses": ["원정 승률 저조 (27%)", "최근 10경기 중 3경기 무득점"],
    "recentMatches": [
      {
        "date": "2026-05-18",
        "opponent": "Toulouse", "opponentKo": "툴루즈",
        "opponentTeamId": 96,
        "opponentLogo": "https://media.api-sports.io/football/teams/96.png",   // ⭐ deterministic URL
        "isHome": true, "goalsFor": 2, "goalsAgainst": 0, "result": "W"
      }
      // ... 최대 10개
    ]
  }
}`,
    notes: '⚠️ O1.5/O3.5는 응답에 없음 — recentMatches에서 클라가 계산. 홈/원정 분리 표시는 매치당 2회 병렬 호출. opponentLogo는 매우 드물게 팀 합병 시 404 가능 → onError 이니셜 fallback 권장.',
    tryItDefaults: { teamId: '49', league: 'PL' },
  },
  {
    id: 'team-statistics',
    category: 'soccer-analysis',
    method: 'GET',
    path: '/api/team-statistics',
    description: '팀 시즌 통계 (API-Football, 1시간 캐시)',
    auth: 'none',
    params: [
      { name: 'team', in: 'query', required: true, type: 'number', description: '팀 ID' },
      { name: 'league', in: 'query', required: false, type: 'number', description: '리그 ID' },
      { name: 'season', in: 'query', required: false, type: 'number', description: '시즌', default: '2024' },
    ],
    responseExample: `{
  "success": true,
  "statistics": {
    "team": { "id": 33, "name": "Manchester United", "logo": "..." },
    "form": "WWDLW",
    "fixtures": { "played": { "total": 37 }, "wins": { "total": 22 }, "draws": { "total": 10 }, "loses": { "total": 5 } },
    "goals": { "for": { "total": 73, "average": "1.97" }, "against": { "total": 30 } },
    "cleanSheet": { "total": 20 }
  }
}`,
    tryItDefaults: { team: '33', league: '39', season: '2024' },
  },
  {
    id: 'match-statistics',
    category: 'soccer-analysis',
    method: 'GET',
    path: '/api/match-statistics',
    description: '경기 통계 (슈팅, 점유율 등)',
    auth: 'none',
    params: [
      { name: 'fixtureId', in: 'query', required: true, type: 'number', description: '경기 ID' },
    ],
    responseExample: `{
  "statistics": {
    "home": { "team": "Manchester United", "stats": { "possession": "55%", "totalShots": "18", "shotsOnTarget": "8", "passAccuracy": "88%" } },
    "away": { "team": "Arsenal", "stats": { "possession": "45%" } }
  },
  "fixtureId": 1234567
}`,
    tryItDefaults: { fixtureId: '' },
  },
  {
    id: 'lineup-details',
    category: 'soccer-analysis',
    method: 'GET',
    path: '/api/lineup-details',
    description: '경기 라인업 (선발 XI, 교체, 포메이션)',
    auth: 'none',
    params: [
      { name: 'fixtureId', in: 'query', required: true, type: 'number', description: '경기 ID' },
      { name: 'test', in: 'query', required: false, type: 'boolean', description: 'true시 테스트 데이터' },
    ],
    responseExample: `{
  "success": true, "available": true,
  "home": {
    "team": { "id": 33, "name": "Manchester United", "logo": "..." },
    "coach": { "name": "Erik ten Hag" },
    "formation": "4-2-3-1",
    "startXI": [{ "id": 18835, "name": "Andre Onana", "number": 24, "position": "G", "grid": "1:1" }],
    "substitutes": [...]
  },
  "away": { ... }
}`,
    tryItDefaults: { fixtureId: '' },
  },

  // ============ 축구 — 프리미엄 리포트 ============
  {
    id: 'premium-picks',
    category: 'soccer-pick',
    method: 'GET',
    path: '/api/premium-picks',
    description: '오늘/어제의 프리미엄 리포트 (KST 기준 자동 선택)',
    auth: 'none',
    responseExample: `{
  "success": true,
  "validDate": "2026-04-27",
  "picks": [
    {
      "id": 123,
      "home_team": "Manchester United", "away_team": "Arsenal",
      "commence_time": "2026-04-27T21:00:00Z",
      "analysis": { "recommendation": { "pick": "Over 2.5" } },
      "result": "PENDING"
    }
  ],
  "count": 3,
  "analyzed": 12
}`,
    notes: 'KST 18:00 이후는 오늘 배치, 이전은 어제 배치. 경기 시작 2시간 후는 제외',
  },
  {
    id: 'premium-picks-history',
    category: 'soccer-pick',
    method: 'GET',
    path: '/api/premium-picks/history',
    description: '전체 픽 히스토리 + 통계',
    auth: 'none',
    responseExample: `{
  "success": true,
  "picks": [{ "id": 123, "result": "WIN", "home_team": "...", "away_team": "..." }],
  "stats": { "total": 100, "wins": 65, "losses": 35, "accuracy": 65, "streak": 3, "pending": 2 }
}`,
  },
  {
    id: 'premium-picks-stats',
    category: 'soccer-pick',
    method: 'GET',
    path: '/api/premium-picks/stats',
    description: '기간별 픽 통계 + 최근 결과',
    auth: 'none',
    params: [
      { name: 'days', in: 'query', required: false, type: 'number', description: '조회 기간', default: '7' },
    ],
    responseExample: `{
  "success": true,
  "period": "7 days",
  "stats": { "wins": 45, "losses": 20, "total": 65, "winRate": 69, "streak": 5, "streakType": "winning" },
  "recentResults": [{ "date": "2026-04-27", "match": "Manchester United vs Arsenal", "predicted": "Over 2.5", "score": "2-1", "result": "WIN" }]
}`,
    tryItDefaults: { days: '7' },
  },
  {
    id: 'pick-recommendations',
    category: 'soccer-pick',
    method: 'GET',
    path: '/api/pick-recommendations',
    description: 'PICK 추천 + 리그별 적중률',
    auth: 'none',
    params: [
      { name: 'date', in: 'query', required: false, type: 'string', description: 'YYYY-MM-DD' },
      { name: 'league', in: 'query', required: false, type: 'string', description: '리그 코드', default: 'ALL' },
      { name: 'period', in: 'query', required: false, type: 'string', description: 'today | week | month | all' },
      { name: 'status', in: 'query', required: false, type: 'string', description: 'all | correct | incorrect | pending' },
    ],
    responseExample: `{
  "success": true,
  "picks": [{ "match_id": "...", "league_code": "PL", "pick_result": "HOME", "is_correct": true, "actual_result": "HOME" }],
  "stats": { "total": 100, "correct": 65, "incorrect": 30, "pending": 5, "accuracy": 68 },
  "leagueAccuracy": { "PL": { "total": 30, "correct": 21, "accuracy": 70 } }
}`,
  },
  {
    id: 'pick-accuracy',
    category: 'soccer-pick',
    method: 'GET',
    path: '/api/pick-accuracy',
    description: '리그별 PICK 적중률 (정산된 것만)',
    auth: 'none',
    responseExample: `{
  "success": true,
  "data": [{ "league": "PL", "total": 30, "correct": 21, "accuracy": 70 }],
  "summary": { "total": 100, "correct": 65, "accuracy": 65 }
}`,
  },
  {
    id: 'accuracy-stats',
    category: 'soccer-pick',
    method: 'GET',
    path: '/api/accuracy-stats',
    description: '백테스트 기반 PICK 등급 통계 (홈에 표시)',
    auth: 'none',
    responseExample: `{
  "success": true,
  "data": {
    "totalMatches": 300, "totalHits": 196, "overallAccuracy": 65, "season25Accuracy": 68,
    "byConfidence": { "HIGH": { "matches": 50, "hits": 35, "accuracy": 70 } },
    "byLeague": [{ "code": "PL", "name": "프리미어리그", "matches": 30, "hits": 20, "accuracy": 67 }]
  }
}`,
  },

  // ============ 축구 — 컨텐츠 ============
  {
    id: 'news',
    category: 'soccer-content',
    method: 'GET',
    path: '/api/news',
    description: '축구 뉴스 (TheNewsAPI, 30분 캐시)',
    auth: 'none',
    params: [
      { name: 'lang', in: 'query', required: false, type: 'string', description: 'en | ko (사이드바용 단순 목록)' },
      { name: 'ui', in: 'query', required: false, type: 'string', description: 'UI 언어 ko/en', default: 'ko' },
    ],
    responseExample: `{
  "success": true,
  "categories": [
    {
      "id": "premier-league",
      "displayName": "프리미어리그",
      "logo": "...",
      "articles": [{ "id": "...", "title": "...", "imageUrl": "...", "url": "...", "source": "bbc", "publishedAt": "..." }]
    }
  ],
  "totalArticles": 24,
  "updatedAt": "..."
}`,
    tryItDefaults: { ui: 'ko' },
  },
  {
    id: 'highlights',
    category: 'soccer-content',
    method: 'GET',
    path: '/api/highlights',
    description: '경기 하이라이트 (주요 리그 우선)',
    auth: 'none',
    params: [
      { name: 'limit', in: 'query', required: false, type: 'number', description: '반환 개수', default: '8' },
    ],
    responseExample: `{
  "success": true,
  "highlights": [
    {
      "id": 123, "matchId": 1234567,
      "homeTeam": "Manchester United", "awayTeam": "Arsenal", "league": "Premier League",
      "matchDate": "2026-04-27",
      "youtubeUrl": "https://youtube.com/watch?v=...", "youtubeId": "...",
      "thumbnailUrl": "...", "videoTitle": "Highlights"
    }
  ],
  "total": 5
}`,
    tryItDefaults: { limit: '8' },
  },
  {
    id: 'highlights-featured',
    category: 'soccer-content',
    method: 'GET',
    path: '/api/highlights/featured',
    description: '주요 하이라이트 (홈 표시용, 최대 6개)',
    auth: 'none',
    responseExample: `{
  "featured": [{ "id": 123, "homeTeam": "...", "awayTeam": "...", "league": "PL", "youtubeUrl": "...", "thumbnailUrl": "..." }],
  "count": 6,
  "lastUpdated": "..."
}`,
  },

  // ============ 야구 — 경기/일정 ============
  {
    id: 'baseball-matches',
    category: 'baseball-match',
    method: 'GET',
    path: '/api/baseball/matches',
    description: '★ 야구 경기 일정 + 분석 + 배당 통합. ⚠️ date 사용 시 status 명시 필수.',
    auth: 'none',
    params: [
      { name: 'league', in: 'query', required: false, type: 'string', description: 'ALL | MLB | KBO | NPB | CPBL', default: 'ALL' },
      { name: 'status', in: 'query', required: false, type: 'string', description: '⚠️ date 사용 시 명시 필수. scheduled | live | finished | today | all (all은 date와 충돌 가능)', default: 'all' },
      { name: 'limit', in: 'query', required: false, type: 'number', description: '조회 개수', default: '50' },
      { name: 'date', in: 'query', required: false, type: 'string', description: 'YYYY-MM-DD. status와 함께 사용 권장' },
      { name: 'skipML', in: 'query', required: false, type: 'boolean', description: 'true시 ML 분석 스킵 (속도↑)' },
      { name: 'id', in: 'query', required: false, type: 'number', description: '특정 경기 api_match_id (단일 매치 조회)' },
    ],
    responseExample: `{
  "success": true,
  "count": 10,
  "filters": { "league": "ALL", "status": "scheduled", "limit": 50, "date": "2026-05-27" },
  "matches": [
    {
      "id": 178830,              // ← api_match_id (정식 매치 ID — 라우팅/디테일 호출에 사용)
      "dbId": 82236,             // ← 내부 DB autoincrement (legacy fallback)
      "league": "MLB",
      "date": "2026-05-27", "time": "07:10:00",
      "timestamp": "2026-05-26T22:10:00+00:00",
      "homeTeam": "Cleveland Guardians", "homeTeamKo": "클리블랜드 가디언스", "homeTeamId": 9,
      "homeLogo": "https://media.api-sports.io/baseball/teams/9.png", "homeScore": null,
      "awayTeam": "Washington Nationals", "awayTeamKo": "워싱턴 내셔널스", "awayTeamId": 37,
      "awayLogo": "https://media.api-sports.io/baseball/teams/37.png", "awayScore": null,
      "status": "NS",
      "innings": { "home": {...}, "away": {...} },
      "odds": {
        "homeWinProb": 39.85, "awayWinProb": 60.15,
        "homeWinOdds": 1.74, "awayWinOdds": 2.15,
        "overUnderLine": 7.5, "overOdds": 1.87, "underOdds": 2.01,
        "ouLines": [             // ⭐ 다중 O/U 라인 (6.5/7.0/7.5/8.0 등)
          { "line": 7, "over": 1.64, "under": 2.32 },
          { "line": 7.5, "over": 1.87, "under": 2.01 },
          { "line": 8, "over": 2.02, "under": 1.84 }
        ]
      },
      "mlPrediction": { "homeWinProb": 40, "awayWinProb": 60 },
      "aiPick": "PASS", "aiPickConfidence": "LOW",
      "homePitcher": "Tanner Bibee", "homePitcherId": 12345, "homePitcherKo": null,
      "awayPitcher": "MacKenzie Gore", "hasPitcherData": true
    }
  ]
}`,
    notes: '⚠️ 야구 status 코드 ≠ 축구. IN1~IN15, 1H~15H, BT=LIVE / FT/AET/POST/CANC/ABD/AWD/WO=종료 / INTR=중단(별도 처리). 라이브 폴링: status=live 30초 주기.',
    tryItDefaults: { league: 'MLB', status: 'scheduled', skipML: 'true' },
  },
  {
    id: 'baseball-match-detail',
    category: 'baseball-match',
    method: 'GET',
    path: '/api/baseball/matches/{id}',
    description: '★ 야구 경기 상세 (이닝, 투수 스탯, 배당 트렌드, ouLines, 런라인, 관련 경기). 응답이 {match: {...}}로 한 번 더 래핑됨.',
    auth: 'none',
    params: [
      { name: 'id', in: 'path', required: true, type: 'string', description: '★ api_match_id 우선 (정식). 못 찾으면 내부 dbId로 fallback. 신규 호출자는 리스트 응답의 .id (= api_match_id) 사용' },
    ],
    responseExample: `{
  "success": true,
  "match": {
    "id": 178830,           // api_match_id
    "dbId": 82236,          // 내부 autoincrement
    "league": "MLB", "leagueName": "MLB", "season": "2026",
    "date": "2026-05-27", "time": "07:10:00", "timestamp": "2026-05-26T22:10:00+00:00",
    "venue": null,
    "home": { "id": 9, "team": "Cleveland Guardians", "teamKo": "클리블랜드 가디언스", "logo": "...", "score": null, "hits": null, "errors": null },
    "away": { "id": 37, "team": "Washington Nationals", "teamKo": "워싱턴 내셔널스", "logo": "...", "score": null, "hits": null, "errors": null },
    "status": "NS",
    "innings": { "home": {"1": null, ...}, "away": {"1": null, ...} },
    "homePitcher": "Tanner Bibee", "homePitcherId": 12345, "homePitcherKo": null,
    "homePitcherEra": null, "homePitcherWhip": null, "homePitcherK": null,
    "awayPitcher": "MacKenzie Gore", "awayPitcherId": 23456, "awayPitcherKo": null,
    "odds": {
      "homeWinProb": 39.85, "awayWinProb": 60.15,
      "homeWinOdds": 1.74, "awayWinOdds": 2.15,
      "overUnderLine": 7.5, "overOdds": 1.87, "underOdds": 2.01,
      "ouLines": [          // ⭐ 다중 O/U 라인
        { "line": 7, "over": 1.64, "under": 2.32 },
        { "line": 7.5, "over": 1.87, "under": 2.01 },
        { "line": 8, "over": 2.02, "under": 1.84 }
      ],
      "runlineSpread": -1.5,           // ⭐ 런라인 (null 가능)
      "homeRunlineOdds": 2.6,
      "awayRunlineOdds": 2.75,
      "bookmaker": "Bet365",
      "updatedAt": "2026-05-24T23:00:38Z"
    },
    "oddsTrend": [{ "time": "...", "homeProb": 52, "awayProb": 48 }],
    "relatedMatches": [...]   // 같은 리그 다른 경기 (예정 위주)
  }
}`,
    notes: 'H2H 전적은 별도 /api/baseball/h2h 호출. relatedMatches에는 H2H 안 들어감. 투수 스탯(전 시즌 포함)은 MLB는 statsapi.mlb.com 직접, KBO/NPB는 /api/baseball/kbo-pitcher-stats 사용.',
    tryItDefaults: { id: '178830' },
  },
  {
    id: 'baseball-live',
    category: 'baseball-match',
    method: 'GET',
    path: '/api/baseball/live',
    description: '실시간 경기 (라이브 + 오늘 종료, KST/UTC 자동 처리)',
    auth: 'none',
    responseExample: `{
  "success": true,
  "count": 3,
  "matches": [
    {
      "id": 12345, "league": "MLB",
      "homeTeam": "Yankees", "homeTeamKo": "양키스", "homeScore": 3, "homeHits": 7, "homeErrors": 0,
      "awayTeam": "Red Sox", "awayTeamKo": "레드삭스", "awayScore": 2, "awayHits": 5, "awayErrors": 1,
      "status": "IN4", "inningNum": "4",
      "innings": { "home": { "1": 0, "2": 1, "3": 2, "4": 0 }, "away": { "1": 1, "2": 0, "3": 1, "4": 0 } }
    }
  ]
}`,
    notes: '라이브 폴링용 (30초 간격 권장). 캐시 없음.',
  },
  {
    id: 'baseball-standings',
    category: 'baseball-match',
    method: 'GET',
    path: '/api/baseball/standings',
    description: '야구 순위표 (1시간 캐시)',
    auth: 'none',
    params: [
      { name: 'league', in: 'query', required: false, type: 'string', description: 'KBO | NPB | MLB | CPBL', default: 'KBO' },
      { name: 'sub', in: 'query', required: false, type: 'string', description: 'ALL | CENTRAL | PACIFIC | AL | NL', default: 'ALL' },
    ],
    responseExample: `{
  "success": true,
  "league": "MLB", "subLeague": "AL", "season": 2026,
  "standings": [
    {
      "rank": 1, "team": "뉴욕 양키스", "teamEn": "New York Yankees", "logo": "...",
      "teamId": 25, "wins": 95, "losses": 67, "pct": ".586", "gb": "-",
      "group": "American League"
    }
  ]
}`,
    tryItDefaults: { league: 'KBO', sub: 'ALL' },
  },

  // ============ 야구 — 분석 ============
  {
    id: 'baseball-h2h',
    category: 'baseball-analysis',
    method: 'GET',
    path: '/api/baseball/h2h',
    description: '★ 야구 두 팀 상대전적 (완료 경기만, 최근 10건, 양방향 자동 조회). 매치 상세의 relatedMatches와는 별개 — 그건 예정 경기.',
    auth: 'none',
    params: [
      { name: 'homeTeamId', in: 'query', required: false, type: 'number', description: '★ 권장 — 정확한 매칭' },
      { name: 'awayTeamId', in: 'query', required: false, type: 'number', description: '★ 권장' },
      { name: 'homeTeam', in: 'query', required: false, type: 'string', description: '팀명 (teamId 미사용 시 대체)' },
      { name: 'awayTeam', in: 'query', required: false, type: 'string', description: '팀명' },
    ],
    responseExample: `{
  "success": true,
  "count": 5,
  "matches": [
    {
      "id": 1234567,
      "date": "2026-05-10",
      "homeTeam": "Los Angeles Dodgers", "homeTeamKo": "로스앤젤레스 다저스",
      "homeTeamId": 119, "homeTeamLogo": "https://media.api-sports.io/baseball/teams/119.png",
      "awayTeam": "San Francisco Giants", "awayTeamKo": "샌프란시스코 자이언츠",
      "awayTeamId": 137, "awayTeamLogo": "...",
      "homeScore": 5, "awayScore": 3,
      "winner": "home",                  // 'home' | 'away' | 'draw'
      "league": "MLB", "season": "2026", "status": "FT"
    }
  ],
  "summary": {
    "total": 5,
    "homeWins": 3,                       // ⚠️ 요청한 homeTeamId 기준 통산 (홈/원정 위치 스왑 포함)
    "awayWins": 2,
    "draws": 0,
    "homeTeam": "...",
    "awayTeam": "..."
  }
}`,
    notes: 'team(Id) 둘 중 하나 (홈/원정 각각)는 필수. 데이터 없으면 count=0, matches=[] (에러 아님). 웹은 matches.slice(0, 5)로 표시.',
    tryItDefaults: { homeTeamId: '119', awayTeamId: '137' },
  },
  {
    id: 'baseball-team-stats',
    category: 'baseball-analysis',
    method: 'GET',
    path: '/api/baseball/team-stats',
    description: '야구 팀 시즌 통계 + 최근 5경기 폼',
    auth: 'none',
    params: [
      { name: 'team', in: 'query', required: false, type: 'string', description: '팀명' },
      { name: 'teamId', in: 'query', required: false, type: 'number', description: '팀 ID' },
      { name: 'season', in: 'query', required: false, type: 'string', description: '시즌', default: '2025' },
      { name: 'league', in: 'query', required: false, type: 'string', description: '리그 ID', default: '1' },
    ],
    responseExample: `{
  "success": true,
  "stats": { "pitching": {...}, "batting": {...} },
  "recentForm": ["W", "L", "W", "D", "W"],
  "team": { "id": "25", "name": "Yankees", "season": "2025" }
}`,
  },
  {
    id: 'baseball-pitcher-stats',
    category: 'baseball-analysis',
    method: 'GET',
    path: '/api/baseball/pitcher-stats',
    description: '⚠️ MLB 전용, 현재 시즌만 반환 — 이전 시즌(prev)이 필요하면 클라이언트가 statsapi.mlb.com 직접 호출 (아래 비고 참조). season 파라미터 미지원.',
    auth: 'none',
    params: [
      { name: 'matchId', in: 'query', required: false, type: 'number', description: '경기 ID (자동 lookup, MLB 투수 ID 추출)' },
      { name: 'homePitcherId', in: 'query', required: false, type: 'number', description: '홈 투수 MLB ID (people 엔드포인트의 pitcher id)' },
      { name: 'awayPitcherId', in: 'query', required: false, type: 'number', description: '원정 투수 MLB ID' },
    ],
    responseExample: `{
  "success": true, "season": 2026,
  "homePitcher": {
    "playerId": 543037, "fullName": "Gerrit Cole", "team": "New York Yankees",
    "throwingHand": "R", "era": 2.88, "wins": 12, "losses": 4, "whip": 1.05,
    "strikeoutsPer9Inn": 10.6, "strengths": ["에이스급 ERA", "탈삼진 머신"], "weakness": [],
    "summary": "우완 Gerrit Cole은 12승 4패 ERA 2.88로..."
  },
  "awayPitcher": { ... },
  "matchupNote": "ERA 격차가 뚜렷한 매치업..."
}`,
    notes: `⚠️ 이전 시즌(prev)은 이 엔드포인트로 받을 수 없음 — 라우트에 SEASON 상수가 박혀있어 season 파라미터 무시. 웹도 이 API는 현재 시즌만, 이전 시즌은 statsapi.mlb.com을 클라이언트에서 직접 호출:

  GET https://statsapi.mlb.com/api/v1/people/{pitcherId}?hydrate=stats(group=[pitching],type=[season],season=2025)

  응답 경로: data.people[0].stats[0].splits[0].stat → { era, whip, strikeOuts, wins, losses, inningsPitched, ... }

  웹 패턴 (baseball/[id]/page.tsx): current/prev 두 시즌을 Promise.all로 병렬 호출. timeout 5초. 인증 불필요, CORS 허용됨. KBO/NPB는 다름 → /api/baseball/kbo-pitcher-stats 사용 (prev 자동 포함).`,
  },
  {
    id: 'baseball-kbo-pitcher-stats',
    category: 'baseball-analysis',
    method: 'GET',
    path: '/api/baseball/kbo-pitcher-stats',
    description: '★ KBO/NPB 투수 스탯 (DB) — 현 시즌 + 전 시즌(prev)을 한 번에 반환. MLB는 별도 (외부 statsapi.mlb.com 직접 호출).',
    auth: 'none',
    params: [
      { name: 'homePitcher', in: 'query', required: false, type: 'string', description: '홈 투수명 (한글)' },
      { name: 'awayPitcher', in: 'query', required: false, type: 'string', description: '원정 투수명 (한글)' },
      { name: 'season', in: 'query', required: false, type: 'string', description: '현재 시즌 (전 시즌은 자동으로 -1년)', default: '2026' },
      { name: 'league', in: 'query', required: false, type: 'string', description: 'kbo | npb', default: 'kbo' },
      { name: 'homeTeam', in: 'query', required: false, type: 'string', description: '동명이인 제외용 (한글 팀명)' },
      { name: 'awayTeam', in: 'query', required: false, type: 'string', description: '동명이인 제외용' },
    ],
    responseExample: `{
  "success": true, "season": "2026",
  "homePitcher": {
    "name": "고영표", "team": "한화", "season": "2026",
    "era": 3.24, "whip": 1.12,
    "wins": 10, "losses": 4, "games": 22,
    "strikeouts": 156, "walks": 35, "home_runs": 12,
    "is_rookie": false, "pro_years": 12
  },
  "awayPitcher": { ... },
  "homePitcherPrev": {                  // ⭐ 전 시즌 자동 포함
    "season": 2025,
    "era": 3.45, "whip": 1.20, "strikeouts": 142, ...
  },
  "awayPitcherPrev": { ... }
}`,
    notes: '⭐ MLB는 이 엔드포인트 사용 안 함. MLB 투수 스탯은 클라이언트가 statsapi.mlb.com을 직접 호출 (current + prev 둘 다). CPBL은 prev 미지원.',
    tryItDefaults: { season: '2026', league: 'kbo' },
  },
  {
    id: 'baseball-pitcher-analysis',
    category: 'baseball-analysis',
    method: 'POST',
    path: '/api/baseball/pitcher-analysis',
    description: '★ Claude AI 투수 매치업 분석 (24h 캐시). ⚠️ POST 전용 — GET 호출 시 405. body에 풀 payload 필요.',
    auth: 'none',
    params: [
      { name: 'matchId', in: 'body', required: false, type: 'number', description: 'api_match_id (캐시 키로 사용)' },
      { name: 'homeTeam', in: 'body', required: true, type: 'string', description: '★ language=ko면 teamKo, en이면 team' },
      { name: 'awayTeam', in: 'body', required: true, type: 'string', description: '동일' },
      { name: 'homePitcher', in: 'body', required: false, type: 'string', description: '홈 투수명 (없으면 TBD 처리)' },
      { name: 'awayPitcher', in: 'body', required: false, type: 'string', description: '원정 투수명' },
      { name: 'homeStats', in: 'body', required: false, type: 'object', description: 'MLB: {current, prev, fullName} / KBO·NPB: flat {name, era, whip, ...}' },
      { name: 'awayStats', in: 'body', required: false, type: 'object', description: '동일 구조' },
      { name: 'league', in: 'body', required: false, type: 'string', description: 'MLB | KBO | NPB | CPBL', default: 'MLB' },
      { name: 'language', in: 'body', required: false, type: 'string', description: 'ko | en — 응답 언어. 캐시도 언어별 분리', default: 'ko' },
    ],
    responseExample: `{
  "success": true,
  "analysis": "선발 투수 매치업 분석...\\n홈팀 Gerrit Cole(ERA 2.88) vs 원정팀 Nathan Eovaldi(ERA 3.45)...",
  "cached": true                  // 캐시 hit 시만 필드 존재
}`,
    notes: '에러: 400(homeTeam/awayTeam 누락) | 405(GET 호출) | 500(Claude API 키 누락/실패). MLB는 stats에 {current, prev, fullName} 키, KBO/NPB는 flat 객체 — 라우트가 자동 분기. 호출 타이밍: 투수 스탯 fetch 완료 후 1회만.',
  },
  {
    id: 'baseball-predict',
    category: 'baseball-analysis',
    method: 'POST',
    path: '/api/baseball/predict',
    description: '⚠️ 무거운 분석 엔드포인트 (Railway ML + 롤링 통계 + 배당 블렌딩). 매치 상세 표시에는 보통 불필요 — mlPrediction/aiPrediction이 이미 /api/baseball/matches/{id} 응답에 포함됨.',
    auth: 'none',
    params: [
      { name: 'matchId', in: 'body', required: true, type: 'number', description: 'api_match_id' },
      { name: 'homeTeam', in: 'body', required: true, type: 'string', description: '⚠️ 영문 원본 (DB home_team 컬럼 = 영문). "Los Angeles Dodgers" / "Lotte Giants" 등. 한글("LA 다저스") 보내면 매칭 0건 → reliable:false' },
      { name: 'awayTeam', in: 'body', required: true, type: 'string', description: '⚠️ 영문 원본 (위와 동일)' },
      { name: 'season', in: 'body', required: false, type: 'string', description: '시즌 (예: "2026"). 명시 권장. 미지정 시 현재 연도 사용' },
      { name: 'quick', in: 'body', required: false, type: 'boolean', description: 'true시 Railway ML 스킵 + DB 기반 즉시 응답 (~300-500ms). false면 Railway ML까지 호출 (느림)', default: 'false' },
    ],
    responseExample: `{
  "success": true, "quick": false,
  "analysis": { "homeWinProb": 58, "awayWinProb": 42, "overProb": 55, "underProb": 45, "confidence": 72, "grade": "A" },
  "insights": {
    "keyFactors": [{ "name": "선발투수 ERA", "value": 2.88, "impact": 35, "description": "..." }],
    "homeAdvantage": {...}, "recentForm": {...}, "summary": "Dodgers 측 58% 확률로 우세..."
  },
  "dataQuality": {
    "homeGamesPlayed": 18, "awayGamesPlayed": 16,
    "reliable": true,            // ⚠️ false면 팀명 매칭 실패 또는 최근 경기 부족 — 한글 팀명 보냈는지 먼저 확인
    "hasPitcherData": true
  },
  "teamSeason": { ... }           // KBO/NPB는 자주, MLB는 케이스별 (DB 적재 빈도 차이)
}`,
    notes: `⭐ 매치 상세 페이지용으론 이 API를 호출할 필요가 거의 없음:
  • mlPrediction (Railway ML 결과) → 이미 /api/baseball/matches/{id} 응답의 mlPrediction에 포함
  • aiPrediction (DB 저장된 최종 분석) → /api/baseball/matches/{id} 응답의 odds.* + aiPrediction에 포함
  • 홈/원정 시즌 성적 → /api/baseball/team-stats?teamId=...
  • H2H → /api/baseball/h2h
  • 투수 → MLB는 statsapi.mlb.com 직접, KBO/NPB는 /api/baseball/kbo-pitcher-stats

  predict는 분석 페이지(다경기 비교, 새로 강제 재산정)나 cron 배치용. 한글 팀명·season 누락 시 reliable:false 정상 응답.`,
    tryItDefaults: { matchId: '178843', homeTeam: 'Los Angeles Dodgers', awayTeam: 'Colorado Rockies', season: '2026', quick: 'true' },
  },
  {
    id: 'baseball-ai-comment',
    category: 'baseball-analysis',
    method: 'POST',
    path: '/api/baseball/ai-comment',
    description: 'Claude AI 야구 경기 한 줄 코멘트',
    auth: 'none',
    params: [
      { name: 'match', in: 'body', required: true, type: 'object', description: '경기 객체 {id, league, homeTeam, homeScore, awayTeam, awayScore, innings, ...}' },
      { name: 'language', in: 'body', required: false, type: 'string', description: 'ko | en', default: 'ko' },
    ],
    responseExample: `{ "success": true, "comment": "양키스, 4회 빅이닝으로 레드삭스 제압 5-3 승리", "cached": false }`,
  },

  // ============ 야구 — 컨텐츠 ============
  {
    id: 'baseball-news',
    category: 'baseball-content',
    method: 'GET',
    path: '/api/baseball/news',
    description: '야구 뉴스 (DB 우선, TheNewsAPI fallback)',
    auth: 'none',
    params: [
      { name: 'league', in: 'query', required: false, type: 'string', description: 'WBC | MLB | KBO | NPB | CPBL' },
      { name: 'lang', in: 'query', required: false, type: 'string', description: 'en | ko (사이드바)' },
      { name: 'ui', in: 'query', required: false, type: 'string', description: 'UI 언어 ko/en', default: 'ko' },
    ],
    responseExample: `{
  "success": true,
  "categories": [
    {
      "id": "kbo", "displayName": "KBO 리그", "logo": "...",
      "articles": [{ "id": "...", "title": "...", "imageUrl": "...", "url": "...", "source": "...", "publishedAt": "..." }]
    }
  ],
  "totalArticles": 24
}`,
    tryItDefaults: { ui: 'ko' },
  },
  {
    id: 'baseball-team-news',
    category: 'baseball-content',
    method: 'GET',
    path: '/api/baseball/team-news',
    description: '경기 상세용 팀별 뉴스 요약 (1시간 캐시)',
    auth: 'none',
    params: [
      { name: 'homeTeam', in: 'query', required: true, type: 'string', description: '홈팀 영문명' },
      { name: 'awayTeam', in: 'query', required: true, type: 'string', description: '원정팀 영문명' },
      { name: 'homeTeamKo', in: 'query', required: false, type: 'string', description: '홈팀 한글명' },
      { name: 'awayTeamKo', in: 'query', required: false, type: 'string', description: '원정팀 한글명' },
      { name: 'league', in: 'query', required: false, type: 'string', description: 'MLB | KBO | NPB | CPBL', default: 'MLB' },
      { name: 'language', in: 'query', required: false, type: 'string', description: 'ko | en', default: 'ko' },
    ],
    responseExample: `{
  "success": true,
  "home": "양키스는 최근 4연승으로...",
  "away": "레드삭스는 선발투수 부상으로...",
  "homeArticleCount": 3, "awayArticleCount": 2, "cached": false
}`,
  },
  {
    id: 'baseball-lineups',
    category: 'baseball-content',
    method: 'GET',
    path: '/api/baseball/lineups',
    description: 'KBO/NPB/CPBL 라인업 + 선발투수 (30분 캐시)',
    auth: 'none',
    params: [
      { name: 'gameId', in: 'query', required: true, type: 'number', description: 'API-Sports game ID' },
    ],
    responseExample: `{
  "success": true,
  "homePitcher": "고영표",
  "awayPitcher": "원정 선발",
  "raw": [{ "team": {...}, "startXI": [{ "player": {...} }] }]
}`,
    tryItDefaults: { gameId: '' },
  },
  {
    id: 'baseball-combo-picks',
    category: 'baseball-content',
    method: 'GET',
    path: '/api/baseball/combo-picks',
    description: '야구 다경기 분석 + 적중률 통계 (프리미엄 전용)',
    auth: 'none',
    params: [
      { name: 'league', in: 'query', required: false, type: 'string', description: 'MLB | KBO | NPB' },
      { name: 'date', in: 'query', required: false, type: 'string', description: 'YYYY-MM-DD' },
      { name: 'start_date', in: 'query', required: false, type: 'string', description: '범위 시작' },
      { name: 'end_date', in: 'query', required: false, type: 'string', description: '범위 끝' },
      { name: 'days', in: 'query', required: false, type: 'number', description: '최근 N일', default: '7' },
    ],
    responseExample: `{
  "picks": [
    {
      "id": "...", "league": "MLB", "pick_date": "2026-04-27", "fold_count": 2,
      "picks": [{ "matchId": 123, "homeTeam": "Yankees", "awayTeam": "Red Sox", "pick": "home", "odd": 1.85 }],
      "result": "win", "totalOdd": 3.42
    }
  ],
  "stats": { "MLB_2": { "total": 45, "wins": 28, "rate": 62 } },
  "typeStats": { "safe": { "total": 100, "wins": 62, "rate": 62 }, "high": { "total": 60, "wins": 30, "rate": 50 } }
}`,
  },

  // ============ 리포트 ============
  {
    id: 'blog-posts',
    category: 'report',
    method: 'GET',
    path: '/api/blog/posts',
    description: '블로그/리포트 목록 (페이지네이션)',
    auth: 'none',
    params: [
      { name: 'published', in: 'query', required: false, type: 'boolean', description: 'true시 공개된 것만' },
      { name: 'category', in: 'query', required: false, type: 'string', description: 'preview | weekly | analysis | guide | stats' },
      { name: 'limit', in: 'query', required: false, type: 'number', description: '개수', default: '20' },
      { name: 'offset', in: 'query', required: false, type: 'number', description: '오프셋', default: '0' },
    ],
    responseExample: `{
  "success": true,
  "data": [
    { "slug": "man-city-vs-liverpool", "title": "...", "title_kr": "...", "excerpt": "...", "category": "preview", "tags": [...], "published_at": "..." }
  ],
  "count": 20
}`,
    tryItDefaults: { published: 'true', limit: '20' },
  },
  {
    id: 'blog-post',
    category: 'report',
    method: 'GET',
    path: '/api/blog/post/{slug}',
    description: '리포트 상세 (조회수 자동 증가)',
    auth: 'none',
    params: [
      { name: 'slug', in: 'path', required: true, type: 'string', description: 'URL 슬러그' },
    ],
    responseExample: `{
  "success": true,
  "data": { "slug": "...", "title": "...", "title_kr": "...", "content": "...", "content_en": "...", "category": "preview", "tags": [...], "published_at": "..." }
}`,
    tryItDefaults: { slug: '' },
  },

  // ============ 인증 / 구독 / 결제 ============
  {
    id: 'auth-providers',
    category: 'auth-sub',
    method: 'GET',
    path: '/api/auth/providers',
    description: '사용 가능한 OAuth 프로바이더 목록 (NextAuth)',
    auth: 'none',
    responseExample: `{
  "google": {
    "id": "google",
    "name": "Google",
    "type": "oauth",
    "signinUrl": "https://www.trendsoccer.com/api/auth/signin/google",
    "callbackUrl": "https://www.trendsoccer.com/api/auth/callback/google"
  },
  "naver": {
    "id": "naver",
    "name": "Naver",
    "type": "oauth",
    "signinUrl": "https://www.trendsoccer.com/api/auth/signin/naver",
    "callbackUrl": "https://www.trendsoccer.com/api/auth/callback/naver"
  }
}`,
    notes: 'Flutter 앱: WebView로 signinUrl 열어서 OAuth 진행 → 콜백 후 cookie 기반 세션 확보',
  },
  {
    id: 'auth-csrf',
    category: 'auth-sub',
    method: 'GET',
    path: '/api/auth/csrf',
    description: 'CSRF 토큰 발급 (NextAuth signin POST에 필요)',
    auth: 'none',
    responseExample: `{ "csrfToken": "abc123def456..." }`,
  },
  {
    id: 'auth-signin-redirect',
    category: 'auth-sub',
    method: 'GET',
    path: '/api/auth/signin/{provider}',
    description: 'OAuth 로그인 시작 (브라우저/WebView 리다이렉트)',
    auth: 'none',
    params: [
      { name: 'provider', in: 'path', required: true, type: 'string', description: 'google | naver' },
      { name: 'callbackUrl', in: 'query', required: false, type: 'string', description: '로그인 후 돌아올 URL' },
    ],
    responseExample: `(302 Redirect → OAuth provider authorize URL)`,
    notes: 'Flutter는 InAppWebView 또는 url_launcher로 호출 → 콜백에서 next-auth.session-token 쿠키를 캡처해서 이후 API 호출 시 함께 전송',
    tryItDefaults: { provider: 'google' },
  },
  {
    id: 'auth-session',
    category: 'auth-sub',
    method: 'GET',
    path: '/api/auth/session',
    description: '현재 로그인 세션 정보 (NextAuth)',
    auth: 'session',
    responseExample: `{
  "user": {
    "id": "uuid",
    "name": "홍길동",
    "email": "user@example.com",
    "image": "https://...",
    "termsAgreed": true,
    "tier": "premium",
    "premiumExpiresAt": "2026-05-01T00:00:00Z",
    "trialUsed": true,
    "trialStartedAt": "2026-04-25T10:00:00Z",
    "promo_code": null
  },
  "expires": "2026-05-27T10:00:00Z"
}`,
    notes: '로그인 안 됐으면 빈 객체 {} 반환. 모바일 앱은 이 엔드포인트로 현재 사용자 상태(tier/체험판 종료 시간 등) 폴링',
  },
  {
    id: 'auth-signout',
    category: 'auth-sub',
    method: 'POST',
    path: '/api/auth/signout',
    description: '로그아웃 (NextAuth, 세션 쿠키 제거)',
    auth: 'session',
    params: [
      { name: 'csrfToken', in: 'body', required: true, type: 'string', description: '/api/auth/csrf로 받은 토큰' },
    ],
    responseExample: `{ "url": "https://www.trendsoccer.com/login" }`,
  },
  {
    id: 'user-delete',
    category: 'auth-sub',
    method: 'POST',
    path: '/api/user/delete',
    description: '★ 회원 탈퇴 — 모든 사용자 데이터 삭제 + deleted_users에 이메일 해시 기록 (재가입 시 프로모/체험판 중복 방지용)',
    auth: 'none',
    params: [
      { name: 'email', in: 'body', required: true, type: 'string', description: '탈퇴할 사용자 이메일 (소문자 정규화됨)' },
    ],
    responseExample: `{
  "success": true,
  "message": "회원 탈퇴가 완료되었습니다."
}`,
    notes: `⚠️ 되돌릴 수 없음. 처리 순서:
  1. users 테이블에서 프로모/체험/tier/만료일/결제이력 스냅샷 수집
  2. deleted_users에 SHA-256(email) 해시로 기록 (재가입 시 7일 쿨다운 + 이전 프리미엄 이력 보존)
  3. proto_slips, subscriptions, referral_history, referral_codes, user_settings, user_preferences 삭제 (FK 순서)
  4. users 행 삭제

  에러: 400(email 누락) | 404(사용자 없음) | 500(FK 제약/DB 오류).

  ⚠️ 모바일 앱은 호출 전 반드시 확인 다이얼로그 + 비밀번호/생체인증 한 번 더 요구하는 게 안전.`,
  },
  {
    id: 'auth-check-terms',
    category: 'auth-sub',
    method: 'GET',
    path: '/api/auth/check-terms',
    description: '약관 동의 여부 간단 확인 (boolean)',
    auth: 'none',
    params: [
      { name: 'email', in: 'query', required: true, type: 'string', description: '확인할 이메일' },
    ],
    responseExample: `{ "termsAgreed": false }`,
    notes: '사용자 없거나 미동의면 false. 자세한 상태는 /api/auth/agree-terms (GET) 사용',
    tryItDefaults: { email: '' },
  },
  {
    id: 'auth-agree-terms-get',
    category: 'auth-sub',
    method: 'GET',
    path: '/api/auth/agree-terms',
    description: '약관 동의 + 가입 단계 확인 (정식 회원 / pending / 미가입)',
    auth: 'none',
    params: [
      { name: 'email', in: 'query', required: true, type: 'string', description: '확인할 이메일' },
    ],
    responseExample: `{ "termsAgreed": false, "pending": true }`,
    notes: '응답 패턴: { termsAgreed: true, agreed: true } 정식 회원 / { termsAgreed: false, pending: true } pending / { termsAgreed: false, pending: false } 미가입',
    tryItDefaults: { email: '' },
  },
  {
    id: 'auth-agree-terms-post',
    category: 'auth-sub',
    method: 'POST',
    path: '/api/auth/agree-terms',
    description: '약관 동의 처리 + 가입 완료 (48시간 프리미엄 체험판 시작)',
    auth: 'none',
    params: [
      { name: 'email', in: 'body', required: true, type: 'string', description: '이메일' },
      { name: 'termsAgreed', in: 'body', required: true, type: 'boolean', description: '이용약관 동의 (필수)' },
      { name: 'privacyAgreed', in: 'body', required: true, type: 'boolean', description: '개인정보처리방침 동의 (필수)' },
      { name: 'marketingAgreed', in: 'body', required: false, type: 'boolean', description: '마케팅 수신 동의 (선택)' },
    ],
    responseExample: `{
  "success": true,
  "isTrial": true,
  "message": "🎁 48시간 프리미엄 체험이 시작되었습니다!"
}`,
    notes: 'OAuth 로그인 직후 호출. 신규 가입자: 48시간 프리미엄 체험판 자동 시작. 재가입자(탈퇴 이력 + 이전 프리미엄 사용): free로 시작. 프로모션 코드 보유자: 프로모 만료일까지 프리미엄.',
  },
  {
    id: 'subscription-get',
    category: 'auth-sub',
    method: 'GET',
    path: '/api/subscription',
    description: '구독 상태 조회 (남은 일수 포함)',
    auth: 'none',
    params: [
      { name: 'email', in: 'query', required: true, type: 'string', description: '사용자 이메일' },
    ],
    responseExample: `{
  "plan": "Monthly",
  "status": "active",
  "startedAt": "2026-04-01T00:00:00Z",
  "expiresAt": "2026-05-01T00:00:00Z",
  "tier": "premium",
  "daysRemaining": 4,
  "planDetail": "1개월 구독",
  "price": 4900,
  "cancelledAt": null
}`,
    tryItDefaults: { email: '' },
  },
  {
    id: 'subscription-cancel',
    category: 'auth-sub',
    method: 'POST',
    path: '/api/subscription/cancel',
    description: '구독 취소 (NextAuth 세션 필수)',
    auth: 'session',
    responseExample: `{ "success": true, "message": "Subscription cancelled successfully" }`,
    notes: '세션 없으면 401, 사용자/구독 없으면 404',
  },
  {
    id: 'payment-init',
    category: 'auth-sub',
    method: 'POST',
    path: '/api/payment/seedpay/init',
    description: 'SeedPay 결제 초기화 (폼 데이터 + 해시)',
    auth: 'session',
    params: [
      { name: 'plan', in: 'body', required: true, type: 'string', description: 'monthly (4,900원) | quarterly (9,900원)' },
    ],
    responseExample: `{
  "success": true,
  "terms": [{ "termTitle": "...", "termContents": "..." }],
  "formData": {
    "method": "CARD", "mid": "...", "goodsNm": "...", "ordNo": "...",
    "goodsAmt": "4900", "ordNm": "...", "ordEmail": "...", "returnUrl": "...",
    "ediDate": "...", "hashString": "..."
  }
}`,
  },

  // ============ 기타 ============
  {
    id: 'ads-get',
    category: 'misc',
    method: 'GET',
    path: '/api/ads',
    description: '광고 목록 (슬롯/활성 필터)',
    auth: 'none',
    params: [
      { name: 'slot', in: 'query', required: false, type: 'string', description: '광고 슬롯 타입' },
      { name: 'active', in: 'query', required: false, type: 'boolean', description: 'true시 활성+기간내만' },
      { name: 'track', in: 'query', required: false, type: 'boolean', description: 'true시 노출수 증가' },
      { name: 'id', in: 'query', required: false, type: 'number', description: 'track=true시 광고 ID' },
    ],
    responseExample: `{
  "ads": [
    { "id": 1, "name": "...", "slot_type": "banner_top", "image_url": "...", "link_url": "...", "priority": 10, "is_active": true }
  ]
}`,
    tryItDefaults: { active: 'true' },
  },
  {
    id: 'ads-track',
    category: 'misc',
    method: 'POST',
    path: '/api/ads/track',
    description: '광고 클릭/노출 추적',
    auth: 'none',
    params: [
      { name: 'id', in: 'query', required: true, type: 'number', description: '광고 ID' },
      { name: 'type', in: 'query', required: true, type: 'string', description: 'click | impression' },
    ],
    responseExample: `{ "success": true }`,
  },
  {
    id: 'poll-get',
    category: 'misc',
    method: 'GET',
    path: '/api/poll',
    description: '경기 투표 현황 조회',
    auth: 'none',
    params: [
      { name: 'matchId', in: 'query', required: true, type: 'string', description: '경기 ID' },
      { name: 'voterId', in: 'query', required: false, type: 'string', description: '투표자 ID (내 투표)' },
    ],
    responseExample: `{
  "matchId": "...", "homeTeam": "...", "awayTeam": "...",
  "homeVotes": 50, "drawVotes": 30, "awayVotes": 20, "totalVotes": 100,
  "homePercent": 50, "drawPercent": 30, "awayPercent": 20,
  "myVote": "home"
}`,
  },
  {
    id: 'poll-post',
    category: 'misc',
    method: 'POST',
    path: '/api/poll',
    description: '투표 제출 (생성 또는 수정)',
    auth: 'none',
    params: [
      { name: 'matchId', in: 'body', required: true, type: 'string', description: '경기 ID' },
      { name: 'voterId', in: 'body', required: true, type: 'string', description: '투표자 ID' },
      { name: 'vote', in: 'body', required: true, type: 'string', description: 'home | draw | away' },
    ],
    responseExample: `{ "success": true, "matchId": "...", "vote": "home", "previousVote": null, "homeVotes": 51, "drawVotes": 30, "awayVotes": 20 }`,
  },
  {
    id: 'insights',
    category: 'misc',
    method: 'GET',
    path: '/api/insights',
    description: '오늘의 추천 콤보 4개 (안전/균형/하이리턴/트렌딩)',
    auth: 'none',
    responseExample: `{
  "success": true,
  "data": {
    "combos": [
      {
        "id": "...", "name": "안전형 콤보", "type": "SAFE",
        "matches": [{ "match_id": "...", "home_team": "...", "away_team": "...", "home_probability": 65 }],
        "totalOdds": 2.45, "expectedReturn": 145, "confidence": 72, "icon": "🛡️"
      }
    ],
    "matchCount": 8
  }
}`,
  },
  {
    id: 'ai-commentary',
    category: 'misc',
    method: 'POST',
    path: '/api/ai-commentary',
    description: 'Claude AI 축구 경기 한 줄 논평',
    auth: 'none',
    params: [
      { name: 'match', in: 'body', required: true, type: 'object', description: '{homeTeam, awayTeam, competition, utcDate, homeWinRate, drawRate, awayWinRate}' },
    ],
    responseExample: `{
  "success": true,
  "commentary": "맨유 홈, 아스널과의 빅매치... 50자 이내",
  "metadata": { "homeTeam": "...", "awayTeam": "...", "probabilities": { "home": 45, "draw": 28, "away": 27 } }
}`,
  },
  {
    id: 'contact',
    category: 'misc',
    method: 'POST',
    path: '/api/contact',
    description: '문의하기 (이메일 발송)',
    auth: 'none',
    params: [
      { name: 'name', in: 'body', required: true, type: 'string', description: '이름' },
      { name: 'email', in: 'body', required: true, type: 'string', description: '이메일' },
      { name: 'subject', in: 'body', required: true, type: 'string', description: '제목' },
      { name: 'message', in: 'body', required: true, type: 'string', description: '내용' },
    ],
    responseExample: `{ "success": true, "message": "문의가 성공적으로 전송되었습니다." }`,
  },

  // ============ 📱 모바일 앱 전용 (Flutter v1) ============
  {
    id: 'mobile-auth-google',
    category: 'mobile',
    method: 'POST',
    path: '/api/v1/mobile/auth/google',
    description: '모바일 Google OAuth 로그인 — accessToken 검증 + NextAuth 호환 JWT 발급.',
    auth: 'none',
    params: [
      { name: 'accessToken', in: 'body', required: true, type: 'string', description: 'Google OAuth access token (flutter google_sign_in)' },
      { name: 'deviceInfo', in: 'body', required: false, type: 'object', description: '{ platform: "android"|"ios", appVersion }' },
    ],
    responseExample: `{
  "success": true,
  "data": {
    "session": {
      "accessToken": "<nextauth-compatible-jwt>",   // 모든 보호 API에 Bearer 헤더로 전송
      "tokenType": "Bearer",
      "expiresAt": "2026-06-25T11:30:00Z"
    },
    "user": {
      "userId": "uuid",
      "email": "user@example.com",
      "name": "홍길동",
      "avatarUrl": "https://...",
      "tier": "free",                  // 'free' | 'premium'
      "premiumExpiresAt": null,
      "isNewUser": true,
      "requiresConsent": true,         // true면 약관 화면으로
      "pendingPromo": "LAUNCH_2026"
    }
  }
}`,
    notes: '에러: GOOGLE_TOKEN_INVALID(401) | EMAIL_REQUIRED(400) | COOLDOWN_ACTIVE(403, daysLeft 포함). isNewUser=true + requiresConsent=true면 /api/auth/agree-terms 호출 흐름으로.',
  },
  {
    id: 'mobile-auth-naver',
    category: 'mobile',
    method: 'POST',
    path: '/api/v1/mobile/auth/naver',
    description: '모바일 Naver OAuth 로그인 — accessToken 검증 + NextAuth 호환 JWT 발급.',
    auth: 'none',
    params: [
      { name: 'accessToken', in: 'body', required: true, type: 'string', description: 'Naver OAuth access token (flutter_naver_login)' },
      { name: 'deviceInfo', in: 'body', required: false, type: 'object', description: '{ platform, appVersion }' },
    ],
    responseExample: `{
  "success": true,
  "data": {
    "session": { "accessToken": "<jwt>", "tokenType": "Bearer", "expiresAt": "..." },
    "user": { "userId": "...", "email": "...", "name": "...", "tier": "free", "isNewUser": false, "requiresConsent": false }
  }
}`,
    notes: '에러: NAVER_TOKEN_INVALID(401) | EMAIL_REQUIRED(400) | COOLDOWN_ACTIVE(403).',
  },
  {
    id: 'mobile-me',
    category: 'mobile',
    method: 'GET',
    path: '/api/v1/mobile/me',
    description: '★ 모바일 사용자 프로필 — tier 실시간 재산정, 활성 구독/체험판 정보 통합.',
    auth: 'session',
    responseExample: `{
  "success": true,
  "data": {
    "user": {
      "userId": "uuid",
      "email": "user@example.com",
      "name": "홍길동",
      "avatarUrl": "https://...",
      "tier": "premium",                    // 서버에서 DB 재조회 후 산정
      "premiumExpiresAt": "2026-09-22T00:00:00Z",
      "trial": { "used": true, "startedAt": "...", "endsAt": "..." },
      "subscription": {                     // 활성 구독 (없으면 null)
        "id": "uuid",
        "plan": "monthly",                   // 'monthly' | 'quarterly'
        "status": "active",                  // 'active' | 'cancelled' | 'expired'
        "startedAt": "...",
        "expiresAt": "...",
        "daysLeft": 119
      },
      "consents": { "terms": true, "privacy": true, "marketing": false, "agreedAt": "..." },
      "promo": { "code": "LAUNCH_2026", "appliedAt": "..." }
    }
  }
}`,
    notes: 'UNAUTHORIZED(401) | CONSENT_REQUIRED(409 — pending_users 상태). 폴링은 결제 직후 3초 × 10회만 권장.',
  },
  {
    id: 'mobile-withdraw',
    category: 'mobile',
    method: 'POST',
    path: '/api/user/delete',
    description: '★ 회원 탈퇴 (모바일 동일 엔드포인트) — 전체 데이터 삭제 + deleted_users 기록. 호출 후 클라이언트는 JWT 폐기 + 로그인 화면으로.',
    auth: 'none',
    params: [
      { name: 'email', in: 'body', required: true, type: 'string', description: '/api/v1/mobile/me 응답의 user.email 그대로 전달' },
    ],
    responseExample: `{
  "success": true,
  "message": "회원 탈퇴가 완료되었습니다."
}`,
    notes: `⚠️ 호출 흐름 (모바일):
  1. 설정 → 탈퇴 메뉴에서 확인 다이얼로그 (생체인증/비밀번호 권장)
  2. POST /api/user/delete { email: user.email }
  3. 성공 시: SecureStorage의 JWT 삭제 → 로그인 화면으로 이동
  4. 재가입: 같은 이메일로 다시 OAuth 로그인 → 우리 백엔드가 deleted_users 확인:
     - 7일 쿨다운 중이면: COOLDOWN_ACTIVE(403, daysLeft 포함) — 모바일은 안내 후 차단
     - 7일 지났으면: 신규 가입처럼 진행 (단, 이전 트라이얼/프로모/프리미엄 사용 이력 보존되어 free로 시작)

  에러: 400(email 누락) | 404(사용자 없음) | 500.`,
  },
  {
    id: 'mobile-app-config',
    category: 'mobile',
    method: 'GET',
    path: '/api/v1/mobile/app-config',
    description: '앱 버전 관리 — 강제 업데이트, 유지보수, 스토어 URL. 앱 실행 시 최초 호출.',
    auth: 'none',
    params: [
      { name: 'platform', in: 'query', required: false, type: 'string', description: 'android | ios. 플랫폼별 다른 storeUrl 반환' },
      { name: 'version', in: 'query', required: false, type: 'string', description: '현재 앱 버전 (semver). 미달 시 forceUpdate=true' },
    ],
    responseExample: `{
  "success": true,
  "data": {
    "minSupportedVersion": "1.0.0",
    "latestVersion": "1.0.3",
    "forceUpdate": false,
    "updateMessage": "성능 개선 및 버그 수정",
    "maintenanceMode": false,
    "maintenanceMessage": null,
    "storeUrl": "https://play.google.com/store/apps/details?id=com.trendsoccer.app",
    "supportEmail": "support@trendsoccer.com",
    "privacyPolicyUrl": "https://trendsoccer.com/privacy",
    "termsUrl": "https://trendsoccer.com/terms"
  }
}`,
    notes: '에러: APP_VERSION_OUTDATED(426). version 파라미터 비교는 semver 기준.',
  },
  {
    id: 'mobile-purchase-verify',
    category: 'mobile',
    method: 'POST',
    path: '/api/v1/mobile/purchase/verify',
    description: '★ Google Play 인앱 결제 토큰 백엔드 검증 + 구독 활성화. 결제 직후 1회 호출. JWT 인증 필수.',
    auth: 'session',
    params: [
      { name: 'productId', in: 'body', required: true, type: 'string', description: '"premium" (단일 상품 + 요금제 구조). 레거시 premium_monthly/premium_quarterly도 허용' },
      { name: 'productName', in: 'body', required: false, type: 'string', description: '로깅용 (옵션)' },
      { name: 'purchaseToken', in: 'body', required: true, type: 'string', description: 'Google Play Billing이 발급한 구매 토큰' },
      { name: 'platform', in: 'body', required: false, type: 'string', description: 'android (현재 유일 지원)', default: 'android' },
      { name: 'email', in: 'body', required: false, type: 'string', description: '로깅용. ★ 실제 사용자 식별은 JWT(Authorization: Bearer)로만 처리됨' },
    ],
    responseExample: `{
  "success": true,
  "data": {
    "tier": "premium",
    "plan": "quarterly",                      // 'monthly' | 'quarterly' (basePlanId로 결정)
    "productId": "premium",                   // Play Console productId
    "basePlanId": "quarterly-plan",           // 'monthly-plan' | 'quarterly-plan' (신규 구조에서만 채워짐. 레거시는 null)
    "expiresAt": "2026-09-01T00:00:00.000Z",
    "startedAt": "2026-06-01T00:00:00.000Z",
    "autoRenewing": true,
    "alreadyProcessed": false                 // 같은 purchaseToken 재전송 시 true (멱등성)
  }
}`,
    notes: `★ 2026-06-01부터 Play Console 상품 구조 변경:
  단일 productId 'premium' + 2개 basePlan
    • monthly-plan:   ₩4,900 / 1개월 / "TrendSoccer 프리미엄 1개월"
    • quarterly-plan: ₩9,900 / 3개월 / "TrendSoccer 프리미엄 3개월"

  레거시 (deprecated, 호환만): premium_monthly / premium_quarterly — 이미 Play Console에서 비활성화. 신규 결제는 productId='premium'만 가능.

  처리 순서:
  1) Bearer JWT로 사용자 식별 → body.email은 로깅용만
  2) purchaseToken으로 멱등성 체크 (subscriptions.payment_id) — 같은 사용자 재전송: alreadyProcessed:true 반환 / 다른 사용자: TOKEN_ALREADY_USED(409)
  3) Google Play Developer API v2 (purchases.subscriptionsv2.get) 호출 검증
  4) 신규 case: 응답의 lineItems[0].offerDetails.basePlanId로 요금제 결정
     레거시 case: productId 자체로 결정
  5) subscriptionState 확인 (ACTIVE 또는 IN_GRACE_PERIOD만 통과)
  6) payments + subscriptions insert (payment_method='PLAY_IAP') + users.tier='premium' + premium_expires_at 갱신
  7) Google에 acknowledge v2 호출 (3일 내 안 하면 자동 환불됨)
  8) 텔레그램 매출 알림 + PostHog subscription_completed

  에러: UNAUTHORIZED(401) | VALIDATION_ERROR(400) | INVALID_PRODUCT(400, allowed/recommended/basePlans 포함) | GOOGLE_VERIFY_FAILED(400, basePlanId 누락 등) | PAYMENT_PENDING(402, subscriptionState 포함) | TOKEN_ALREADY_USED(409) | INTERNAL_ERROR(500)`,
  },
  {
    id: 'mobile-purchase-webhook',
    category: 'mobile',
    method: 'POST',
    path: '/api/v1/mobile/purchase/webhook',
    description: '★ Google Play RTDN(Real-time Developer Notifications) 수신 — Pub/Sub Push 구독이 호출. 자동 갱신/취소/환불 등을 자동 반영. 외주는 호출 불필요 (Google → 백엔드).',
    auth: 'secret',
    params: [
      { name: 'token', in: 'query', required: true, type: 'string', description: 'Pub/Sub Push URL의 검증 토큰 (GOOGLE_PLAY_PUBSUB_VERIFY_TOKEN과 일치해야 함)' },
      { name: 'message', in: 'body', required: true, type: 'object', description: 'Pub/Sub 메시지 봉투 {data: base64 JSON, attributes, messageId, publishTime}' },
      { name: 'subscription', in: 'body', required: false, type: 'string', description: 'Pub/Sub 구독 경로 (자동)' },
    ],
    responseExample: `{
  "success": true,
  "handled": true,
  "type": "renewed",             // 'renewed' | 'canceled' | 'revoked' | 'expired' | 'noop' | 'purchased'
  "newExpiresAt": "2026-12-01T..."    // RENEWED일 때만
}`,
    notes: `notificationType 처리 (subscriptionNotification):
  • 1 RECOVERED, 2 RENEWED, 7 RESTARTED → Google API 재검증 후 expires_at 갱신
  • 3 CANCELED → cancelled_at 기록 (만료까지는 유지)
  • 4 PURCHASED → verify가 처리 (무시)
  • 12 REVOKED → 환불됨. 즉시 expires_at = now + 텔레그램 알림 + tier='free' 다운그레이드
  • 13 EXPIRED → status='expired' + 활성 구독 없으면 tier='free'
  • 5/6/9/10/11/8/20 → 로그만 (noop)

  응답은 항상 HTTP 200 (Pub/Sub 재시도 방지) — 토큰 검증 실패 시만 401.
  외주는 이 엔드포인트 직접 호출 X. Google이 보내준 알림을 우리가 받기만 함.`,
  },
]
