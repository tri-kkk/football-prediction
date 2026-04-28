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
  { id: 'soccer-analysis', label: '⚽ 축구 — 분석', description: '예측, H2H, 팀 통계, 라인업, 통계' },
  { id: 'soccer-pick', label: '⚽ 축구 — 프리미엄 픽', description: '오늘의 픽, 히스토리, 적중률' },
  { id: 'soccer-content', label: '⚽ 축구 — 컨텐츠', description: '뉴스, 하이라이트' },
  { id: 'baseball-match', label: '⚾ 야구 — 경기/일정', description: '경기 목록, 상세, 라이브, 순위' },
  { id: 'baseball-analysis', label: '⚾ 야구 — 분석', description: 'H2H, 팀/투수 통계, AI 예측, 코멘트' },
  { id: 'baseball-content', label: '⚾ 야구 — 컨텐츠', description: '뉴스, 라인업, 조합 픽' },
  { id: 'report', label: '📰 리포트', description: '블로그/리포트' },
  { id: 'auth-sub', label: '🔐 인증 / 구독 / 결제', description: '약관, 구독 상태, 결제 초기화' },
  { id: 'misc', label: '📌 기타', description: '광고, 투표, 인사이트, 문의 등' },
]

export const ENDPOINTS: ApiEndpoint[] = [
  // ============ 축구 — 경기/일정 ============
  {
    id: 'matches',
    category: 'soccer-match',
    method: 'GET',
    path: '/api/matches',
    description: '축구 경기 일정/결과 (Football-Data 기반, 5분 캐시)',
    auth: 'none',
    params: [
      { name: 'type', in: 'query', required: false, type: 'string', description: 'scheduled | results', default: 'scheduled' },
      { name: 'league', in: 'query', required: false, type: 'string', description: 'PL / PD / BL1 / SA / FL1 / CL / ALL', default: 'ALL' },
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
    notes: '최대 20경기. 데이터 출처: Football-Data.org',
    tryItDefaults: { type: 'scheduled', league: 'PL' },
  },
  {
    id: 'odds-from-db',
    category: 'soccer-match',
    method: 'GET',
    path: '/api/odds-from-db',
    description: 'DB에 저장된 경기/오즈 (60초 캐시, 외부 API 호출 없음)',
    auth: 'none',
    params: [
      { name: 'league', in: 'query', required: false, type: 'string', description: '리그 코드', default: 'ALL' },
      { name: 'date', in: 'query', required: false, type: 'string', description: 'YYYY-MM-DD' },
      { name: 'includeResults', in: 'query', required: false, type: 'boolean', description: '완료 경기 포함', default: 'true' },
    ],
    responseExample: `{
  "success": true,
  "data": [
    {
      "match_id": 1234567,
      "league_code": "PL",
      "leagueName": "프리미어리그",
      "leagueLogo": "https://...",
      "home_team": "Manchester United",
      "away_team": "Arsenal",
      "home_team_id": 33,
      "away_team_id": 42,
      "commence_time": "2026-04-27T21:00:00Z",
      "home_probability": 45,
      "draw_probability": 28,
      "away_probability": 27,
      "finalScoreHome": null,
      "finalScoreAway": null,
      "status": "SCHEDULED"
    }
  ],
  "count": 5,
  "meta": { "leagues": [{ "code": "PL", "name": "프리미어리그", "matchCount": 3, "priority": 10 }] }
}`,
    notes: '메인 경기 리스트는 이 엔드포인트 사용 권장 (API quota 절약)',
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
    id: 'live-match',
    category: 'soccer-match',
    method: 'GET',
    path: '/api/live-matches/{matchId}',
    description: '경기 상세 (이벤트, 통계, 라인업)',
    auth: 'none',
    params: [
      { name: 'matchId', in: 'path', required: true, type: 'number', description: '경기 ID' },
    ],
    responseExample: `{
  "success": true,
  "match": {
    "id": 1234567, "status": "FT", "elapsed": 90,
    "homeTeam": "Manchester United", "awayTeam": "Arsenal",
    "homeScore": 2, "awayScore": 1,
    "events": [{ "time": 34, "type": "goal", "team": "home", "player": "Bruno Fernandes" }],
    "stats": { "possession": { "home": 55, "away": 45 } },
    "lineups": { "home": { "formation": "4-2-3-1", "startXI": [...] } }
  }
}`,
    notes: '실시간 — 캐시 없음 (no-store)',
    tryItDefaults: { matchId: '' },
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
    id: 'predictions',
    category: 'soccer-analysis',
    method: 'GET',
    path: '/api/predictions',
    description: '경기 예측 (API-Football, 1시간 캐시)',
    auth: 'none',
    params: [
      { name: 'fixtureId', in: 'query', required: true, type: 'number', description: '경기 ID' },
    ],
    responseExample: `{
  "predictions": {
    "winner": { "id": 33, "name": "Manchester United", "comment": "Likely" },
    "advice": "Under 2.5",
    "percent": { "home": "45%", "draw": "28%", "away": "27%" }
  },
  "comparison": { "form": { "home": "50%", "away": "50%" }, "att": { "home": "60%", "away": "40%" } }
}`,
    tryItDefaults: { fixtureId: '' },
  },
  {
    id: 'predict',
    category: 'soccer-analysis',
    method: 'POST',
    path: '/api/predict',
    description: '자체 알고리즘 예측 (배당+선제골+패턴)',
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
  "prediction": {
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
    "scorePatterns": { "mostCommon": [{ "score": "1-1", "count": 4 }], "over25Rate": 60, "bttsRate": 55 },
    "insights": ["..."]
  },
  "source": "api-football"
}`,
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

  // ============ 축구 — 프리미엄 픽 ============
  {
    id: 'premium-picks',
    category: 'soccer-pick',
    method: 'GET',
    path: '/api/premium-picks',
    description: '오늘/어제의 프리미엄 픽 (KST 기준 자동 선택)',
    auth: 'none',
    responseExample: `{
  "success": true,
  "validDate": "2026-04-27",
  "picks": [
    {
      "id": 123,
      "home_team": "Manchester United", "away_team": "Arsenal",
      "commence_time": "2026-04-27T21:00:00Z",
      "prediction": { "recommendation": { "pick": "Over 2.5" } },
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
    description: '야구 경기 일정 + 예측 + 배당 통합',
    auth: 'none',
    params: [
      { name: 'league', in: 'query', required: false, type: 'string', description: 'ALL | MLB | KBO | NPB | CPBL', default: 'ALL' },
      { name: 'status', in: 'query', required: false, type: 'string', description: 'all | scheduled | finished | live | today', default: 'all' },
      { name: 'limit', in: 'query', required: false, type: 'number', description: '조회 개수', default: '50' },
      { name: 'date', in: 'query', required: false, type: 'string', description: 'YYYY-MM-DD' },
      { name: 'skipML', in: 'query', required: false, type: 'boolean', description: 'true시 ML 예측 스킵 (속도↑)' },
      { name: 'id', in: 'query', required: false, type: 'number', description: '특정 경기 ID' },
    ],
    responseExample: `{
  "success": true,
  "count": 10,
  "filters": { "league": "ALL", "status": "all", "limit": 50, "date": "" },
  "matches": [
    {
      "id": "api_match_id", "dbId": 123, "league": "MLB",
      "date": "2026-04-27", "time": "19:05",
      "homeTeam": "New York Yankees", "homeTeamKo": "뉴욕 양키스", "homeLogo": "...", "homeScore": null,
      "awayTeam": "Boston Red Sox", "awayTeamKo": "보스턴 레드삭스", "awayLogo": "...", "awayScore": null,
      "status": "NS", "innings": null,
      "odds": { "homeWinProb": 55, "awayWinProb": 45, "overUnderLine": 8.5 },
      "aiPick": "home", "aiPickConfidence": 65,
      "homePitcher": "Gerrit Cole", "awayPitcher": "Nathan Eovaldi", "hasPitcherData": true
    }
  ]
}`,
    tryItDefaults: { league: 'MLB', status: 'today', skipML: 'true' },
  },
  {
    id: 'baseball-match-detail',
    category: 'baseball-match',
    method: 'GET',
    path: '/api/baseball/matches/{id}',
    description: '야구 경기 상세 (이닝, 투수 스탯, 배당 트렌드, 관련 경기)',
    auth: 'none',
    params: [
      { name: 'id', in: 'path', required: true, type: 'string', description: '경기 ID (api_match_id 또는 db id)' },
    ],
    responseExample: `{
  "success": true,
  "match": {
    "id": "api_match_id", "league": "MLB", "date": "2026-04-27", "time": "19:05", "venue": "Yankee Stadium",
    "home": { "id": 25, "team": "Yankees", "teamKo": "양키스", "score": 5, "hits": 8, "errors": 0 },
    "away": { "id": 5, "team": "Red Sox", "teamKo": "레드삭스", "score": 3, "hits": 7, "errors": 1 },
    "status": "FT",
    "innings": { "home": { "1": 0, "2": 1, ...}, "away": { ... } },
    "homePitcher": "Gerrit Cole", "homePitcherEra": 2.88, "homePitcherWhip": 1.05,
    "odds": { "homeWinProb": 55, "awayWinProb": 45 },
    "oddsTrend": [{ "time": "...", "homeProb": 52, "awayProb": 48 }],
    "relatedMatches": [...]
  }
}`,
    tryItDefaults: { id: '' },
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
    description: '야구 두 팀 상대전적 (DB, 최근 10경기)',
    auth: 'none',
    params: [
      { name: 'homeTeam', in: 'query', required: false, type: 'string', description: '홈팀 영문명' },
      { name: 'homeTeamId', in: 'query', required: false, type: 'number', description: '홈팀 ID' },
      { name: 'awayTeam', in: 'query', required: false, type: 'string', description: '원정팀 영문명' },
      { name: 'awayTeamId', in: 'query', required: false, type: 'number', description: '원정팀 ID' },
    ],
    responseExample: `{
  "success": true,
  "count": 5,
  "matches": [
    {
      "id": "...", "date": "2025-10-15",
      "homeTeam": "New York Yankees", "homeTeamKo": "뉴욕 양키스", "homeScore": 4,
      "awayTeam": "Boston Red Sox", "awayTeamKo": "보스턴 레드삭스", "awayScore": 2,
      "winner": "home", "league": "MLB", "season": 2025, "status": "FT"
    }
  ],
  "summary": { "total": 5, "homeWins": 3, "awayWins": 2, "draws": 0 }
}`,
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
    description: 'MLB 투수 상세 스탯 + 매치업 노트',
    auth: 'none',
    params: [
      { name: 'matchId', in: 'query', required: false, type: 'number', description: '경기 ID (자동 lookup)' },
      { name: 'homePitcherId', in: 'query', required: false, type: 'number', description: '홈 투수 MLB ID' },
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
  },
  {
    id: 'baseball-kbo-pitcher-stats',
    category: 'baseball-analysis',
    method: 'GET',
    path: '/api/baseball/kbo-pitcher-stats',
    description: 'KBO/NPB 투수 스탯 (DB)',
    auth: 'none',
    params: [
      { name: 'homePitcher', in: 'query', required: false, type: 'string', description: '홈 투수명 (한글)' },
      { name: 'awayPitcher', in: 'query', required: false, type: 'string', description: '원정 투수명 (한글)' },
      { name: 'season', in: 'query', required: false, type: 'string', description: '시즌', default: '2025' },
      { name: 'league', in: 'query', required: false, type: 'string', description: 'kbo | npb', default: 'kbo' },
      { name: 'homeTeam', in: 'query', required: false, type: 'string', description: '동명이인 제외용' },
      { name: 'awayTeam', in: 'query', required: false, type: 'string', description: '동명이인 제외용' },
    ],
    responseExample: `{
  "success": true, "season": "2025",
  "homePitcher": {
    "name": "고영표", "team": "한화", "era": 3.24, "wins": 10, "losses": 4,
    "whip": 1.12, "strikeouts": 156, "strengths": [...], "weakness": [...], "summary": "..."
  },
  "awayPitcher": { ... },
  "homePitcherPrev": { ... },
  "awayPitcherPrev": { ... }
}`,
  },
  {
    id: 'baseball-pitcher-analysis',
    category: 'baseball-analysis',
    method: 'POST',
    path: '/api/baseball/pitcher-analysis',
    description: 'Claude AI 투수 매치업 분석 (24h 캐시)',
    auth: 'none',
    params: [
      { name: 'matchId', in: 'body', required: true, type: 'string', description: '경기 ID' },
      { name: 'homeTeam', in: 'body', required: true, type: 'string', description: '홈팀명' },
      { name: 'awayTeam', in: 'body', required: true, type: 'string', description: '원정팀명' },
      { name: 'homePitcher', in: 'body', required: true, type: 'string', description: '홈 투수명' },
      { name: 'awayPitcher', in: 'body', required: true, type: 'string', description: '원정 투수명' },
      { name: 'homeStats', in: 'body', required: true, type: 'object', description: '홈 투수 스탯 객체' },
      { name: 'awayStats', in: 'body', required: true, type: 'object', description: '원정 투수 스탯 객체' },
      { name: 'league', in: 'body', required: false, type: 'string', description: 'MLB | KBO | NPB', default: 'MLB' },
      { name: 'language', in: 'body', required: false, type: 'string', description: 'ko | en', default: 'ko' },
    ],
    responseExample: `{ "success": true, "analysis": "Gerrit Cole(ERA 2.88) vs Nathan Eovaldi(ERA 3.45)... 200자 분석", "cached": false }`,
  },
  {
    id: 'baseball-predict',
    category: 'baseball-analysis',
    method: 'POST',
    path: '/api/baseball/predict',
    description: 'AI 야구 경기 예측 (Railway ML, 배당 블렌딩)',
    auth: 'none',
    params: [
      { name: 'matchId', in: 'body', required: true, type: 'number', description: '경기 ID' },
      { name: 'homeTeam', in: 'body', required: true, type: 'string', description: '홈팀명' },
      { name: 'awayTeam', in: 'body', required: true, type: 'string', description: '원정팀명' },
      { name: 'quick', in: 'body', required: false, type: 'boolean', description: 'true시 빠른 예측 (인사이트 생략)' },
    ],
    responseExample: `{
  "success": true, "quick": false,
  "prediction": { "homeWinProb": 58, "awayWinProb": 42, "overProb": 55, "underProb": 45, "confidence": 72, "grade": "A" },
  "insights": {
    "keyFactors": [{ "name": "선발투수 ERA", "value": 2.88, "impact": 35, "description": "..." }],
    "homeAdvantage": {...}, "recentForm": {...}, "summary": "Yankees 측 58% 확률로 우세..."
  },
  "dataQuality": { "homeGamesPlayed": 18, "awayGamesPlayed": 16, "reliable": true, "hasPitcherData": true }
}`,
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
    description: '야구 조합 픽 + 적중률 통계 (프리미엄 전용)',
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
]
