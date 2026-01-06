/**
 * Forebet Match Preview Scraper v21
 * - 하루 최대 6개 제한 (AI 비용 절감)
 * - 1페이지만 스크래핑
 * - ⛔ TheSportsDB 경기 썸네일(event)만 허용 (badge 제외)
 * - 페이지에서 리그 정보 직접 추출
 * - TheSportsDB v2 Premium API
 * - 경기 날짜 필터링 (오늘~7일 이내)
 * - 팀명 수식어 제거
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const fs = require('fs');

// TheSportsDB API 키 (환경변수 또는 기본값)
const SPORTSDB_API_KEY = process.env.THESPORTSDB_API_KEY || '166885';

// ⚽ 지원 리그 (11개) - 일본, 노르웨이, 스위스, 터키 등 제외
const SUPPORTED_LEAGUES = [
  // 유럽 대회
  'champions league', 'europa league', 'conference league',
  // A매치
  'nations league',
  // 5대 리그
  'premier league', 'la liga', 'bundesliga', 'serie a', 'ligue 1',
  // 추가 리그
  'eredivisie', 'championship',
];

// ❌ 제외할 리그 키워드 (더 포괄적으로)
const EXCLUDED_LEAGUES = [
  // 일본
  'j1 league', 'j2 league', 'j.league', 'j-league', 'japan', 'j1', 'j2',
  // 노르웨이
  'eliteserien', 'norwegian', 'norway',
  // 스위스
  'swiss super league', 'switzerland', 'swiss',
  // 터키
  'süper lig', 'super lig', 'turkish', 'turkey', 'türkiye',
  // 스코틀랜드
  'scottish', 'scotland', 'spfl',
  // 포르투갈
  'liga portugal', 'primeira liga', 'portugal',
  // 한국
  'k league', 'korean', 'korea', 'k1', 'k2',
  // 미국
  'mls', 'major league soccer',
  // 호주
  'a-league', 'australia',
  // 멕시코
  'liga mx', 'mexico',
  // 사우디
  'saudi', 'pro league', 'roshn', 'saudi pro', 'spl',
  // 중국
  'chinese super', 'china', 'csl',
  // 브라질
  'brasileirao', 'brazil', 'serie a brazil',
  // 아르헨티나
  'liga profesional', 'argentina',
  // 벨기에
  'belgian', 'belgium', 'jupiler',
  // 그리스
  'greek', 'greece', 'super league greece',
  // 러시아
  'russian', 'russia',
  // 우크라이나
  'ukrainian', 'ukraine',
  // 덴마크
  'danish', 'denmark', 'superliga',
  // 오스트리아
  'austrian', 'austria', 'bundesliga austria',
  // 체코
  'czech', 'fortuna liga',
  // 폴란드
  'polish', 'poland', 'ekstraklasa',
  // 루마니아
  'romanian', 'romania',
  // 크로아티아
  'croatian', 'croatia',
  // 세르비아
  'serbian', 'serbia',
  // 이스라엘
  'israeli', 'israel',
  // 카타르
  'qatar', 'qsl',
  // UAE
  'uae', 'emirates',
  // 이집트
  'egyptian', 'egypt',
  // 남아공
  'south african', 'psl',
  // 인도
  'indian', 'india', 'isl',
];

// 리그 코드 + 한글명 + TheSportsDB ID + 기본 썸네일
const LEAGUE_CODE_MAP = {
  // 유럽 대회
  'champions league': { code: 'CL', nameKr: '챔피언스리그', sportsDbId: 4480, defaultThumb: '/images/leagues/cl.jpg' },
  'europa league': { code: 'EL', nameKr: '유로파리그', sportsDbId: 4481, defaultThumb: '/images/leagues/el.jpg' },
  'conference league': { code: 'ECL', nameKr: 'UEFA 컨퍼런스리그', sportsDbId: 5071, defaultThumb: '/images/leagues/ecl.jpg' },
  // A매치
  'nations league': { code: 'NL', nameKr: 'UEFA 네이션스리그', sportsDbId: 4490, defaultThumb: '/images/leagues/nl.jpg' },
  // 5대 리그
  'premier league': { code: 'PL', nameKr: '프리미어리그', sportsDbId: 4328, defaultThumb: '/images/leagues/pl.jpg' },
  'la liga': { code: 'PD', nameKr: '라리가', sportsDbId: 4335, defaultThumb: '/images/leagues/laliga.jpg' },
  'bundesliga': { code: 'BL1', nameKr: '분데스리가', sportsDbId: 4331, defaultThumb: '/images/leagues/bundesliga.jpg' },
  'serie a': { code: 'SA', nameKr: '세리에A', sportsDbId: 4332, defaultThumb: '/images/leagues/seriea.jpg' },
  'ligue 1': { code: 'FL1', nameKr: '리그1', sportsDbId: 4334, defaultThumb: '/images/leagues/ligue1.jpg' },
  // 추가 리그
  'eredivisie': { code: 'DED', nameKr: '에레디비시', sportsDbId: 4337, defaultThumb: '/images/leagues/eredivisie.jpg' },
  'championship': { code: 'ELC', nameKr: '챔피언십', sportsDbId: 4329, defaultThumb: '/images/leagues/championship.jpg' },
};

const PREVIEWS_URLS = [
  'https://www.forebet.com/en/football-match-previews',
  'https://www.forebet.com/en/football-match-previews?start=20',
];

// 하루 최대 처리 개수 (AI 비용 절감)
const MAX_POSTS_PER_DAY = 8;

// 경기 날짜 범위 (오늘 기준 +7일까지)
const MAX_DAYS_AHEAD = 7;

// TheSportsDB 경기 캐시 (리그별)
let sportsDbEventsCache = {};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * ⭐ NEW: 경기 날짜가 유효한지 체크 (한국 시간 기준, 오늘~7일 이내)
 */
function isValidMatchDate(dateStr) {
  if (!dateStr) return true; // 날짜 없으면 일단 통과
  
  try {
    // 경기 날짜 (UTC 기준으로 파싱)
    const matchDate = new Date(dateStr);
    
    // 한국 시간 기준 오늘 자정 계산 (UTC+9)
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000; // 9시간을 밀리초로
    const kstNow = new Date(now.getTime() + kstOffset);
    
    // 한국 시간 기준 오늘 00:00
    const kstToday = new Date(kstNow);
    kstToday.setUTCHours(0, 0, 0, 0);
    
    // UTC 기준으로 변환 (한국 자정 = UTC 전날 15:00)
    const todayStart = new Date(kstToday.getTime() - kstOffset);
    
    // 7일 후
    const maxDate = new Date(todayStart);
    maxDate.setDate(maxDate.getDate() + MAX_DAYS_AHEAD);
    
    // 디버깅용 로그 (필요시 주석 해제)
    // console.log(`    🕐 경기: ${matchDate.toISOString()}, KST 오늘: ${todayStart.toISOString()}, 마감: ${maxDate.toISOString()}`);
    
    // 이미 지난 경기 제외 (한국 시간 기준 오늘 이전)
    if (matchDate < todayStart) {
      console.log(`    ⏭️ 이미 지난 경기 (KST): ${dateStr}`);
      return false;
    }
    
    // 너무 먼 미래 경기 제외
    if (matchDate > maxDate) {
      return false;
    }
    
    return true;
  } catch {
    return true; // 파싱 실패하면 일단 통과
  }
}

/**
 * ⭐ NEW: 팀명에서 수식어 제거
 */
function cleanTeamModifiers(name) {
  if (!name) return '';
  
  let cleaned = name.trim();
  
  // 수식어 패턴들 (Forebet에서 붙이는 것들)
  const modifierPatterns = [
    /^Struggling\s+/i,
    /^In-Form\s+/i,
    /^In\s+Form\s+/i,
    /^Out-of-Form\s+/i,
    /^Steady\s+/i,
    /^Tough\s+/i,
    /^Strong\s+/i,
    /^Weak\s+/i,
    /^Dominant\s+/i,
    /^Resurgent\s+/i,
    /^Familiar\s+/i,
    /^Foe\s+/i,
    /\s+Resurgence$/i,
    /\s+Draw Specialists$/i,
    /\s+after Away Defeat$/i,
    /\s+after Home Defeat$/i,
    /\s+after Draw$/i,
    /\s+after Win$/i,
  ];
  
  for (const pattern of modifierPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  return cleaned.trim();
}

/**
 * TheSportsDB v2 API - 리그별 다음 경기 목록
 */
async function fetchLeagueEventsV2(leagueId) {
  if (sportsDbEventsCache[leagueId]) {
    return sportsDbEventsCache[leagueId];
  }
  
  try {
    const url = `https://www.thesportsdb.com/api/v2/json/schedule/next/league/${leagueId}`;
    const res = await fetch(url, {
      headers: {
        'X-API-KEY': SPORTSDB_API_KEY
      }
    });
    
    if (!res.ok) {
      console.log(`    ⚠️ TheSportsDB v2 응답 에러: ${res.status}`);
      return [];
    }
    
    const data = await res.json();
    
    if (data.events?.length > 0) {
      sportsDbEventsCache[leagueId] = data.events;
      console.log(`    📦 TheSportsDB v2: ${data.events.length}개 경기 (리그 ${leagueId})`);
      return data.events;
    }
    
    // schedule 형식일 수도 있음
    if (data.schedule?.length > 0) {
      sportsDbEventsCache[leagueId] = data.schedule;
      console.log(`    📦 TheSportsDB v2: ${data.schedule.length}개 경기 (리그 ${leagueId})`);
      return data.schedule;
    }
    
    return [];
  } catch (e) {
    console.log(`    ⚠️ TheSportsDB v2 조회 실패: ${e.message}`);
    return [];
  }
}

/**
 * 특수문자 → 일반 알파벳 변환
 */
function removeAccents(str) {
  const accents = {
    'á': 'a', 'à': 'a', 'ä': 'a', 'â': 'a', 'ã': 'a', 'å': 'a', 'ą': 'a',
    'é': 'e', 'è': 'e', 'ë': 'e', 'ê': 'e', 'ę': 'e', 'ě': 'e',
    'í': 'i', 'ì': 'i', 'ï': 'i', 'î': 'i', 'ı': 'i',
    'ó': 'o', 'ò': 'o', 'ö': 'o', 'ô': 'o', 'õ': 'o', 'ø': 'o', 'ő': 'o',
    'ú': 'u', 'ù': 'u', 'ü': 'u', 'û': 'u', 'ű': 'u',
    'ý': 'y', 'ÿ': 'y',
    'ñ': 'n', 'ń': 'n', 'ň': 'n',
    'ç': 'c', 'ć': 'c', 'č': 'c',
    'ß': 'ss',
    'ş': 's', 'š': 's', 'ś': 's',
    'ž': 'z', 'ź': 'z', 'ż': 'z',
    'ł': 'l', 'ľ': 'l',
    'đ': 'd', 'ď': 'd',
    'ř': 'r',
    'ť': 't',
    'æ': 'ae', 'œ': 'oe',
    'þ': 'th',
  };
  
  return str.split('').map(char => accents[char.toLowerCase()] || char).join('');
}

/**
 * 팀 이름 정규화 (매칭용) - 더 유연하게
 */
function normalizeTeamName(name) {
  if (!name) return '';
  
  // 1. 특수문자 → 일반 알파벳
  let normalized = removeAccents(name.toLowerCase());
  
  return normalized
    // 일반적인 접두사/접미사 제거
    .replace(/\b(fc|cf|sc|ac|as|ss|us|rc|cd|ud|sd|rcd|afc|ssc|1\.|)\b/gi, '')
    // 국가/도시 관련 접두사
    .replace(/\b(real|sporting|atletico|dynamo|inter|united|city)\b/gi, '')
    // 특수문자 제거
    .replace(/[^a-z0-9\s]/g, '')
    // 공백 정리
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 알려진 팀 별명 매핑
 */
const TEAM_ALIASES = {
  'kobenhavn': ['copenhagen', 'fc kobenhavn', 'fc copenhagen'],
  'copenhagen': ['kobenhavn', 'fc kobenhavn', 'fc copenhagen'],
  'kairat': ['kairat almaty', 'fc kairat'],
  'inter': ['inter milan', 'internazionale', 'inter milano'],
  'atletico': ['atletico madrid', 'atletico de madrid', 'atleti'],
  'bayern': ['bayern munich', 'bayern munchen', 'fc bayern'],
  'dortmund': ['borussia dortmund', 'bvb'],
  'psv': ['psv eindhoven'],
  'brugge': ['club brugge', 'club bruges'],
  'sporting': ['sporting cp', 'sporting lisbon', 'sporting lisboa'],
};

/**
 * 두 팀 이름이 매칭되는지 확인
 */
function teamsMatch(name1, name2) {
  // 's 제거 먼저
  let clean1 = (name1 || '').replace(/['`'´ʼ′]s$/gi, '').replace(/['`'´ʼ′]$/gi, '');
  let clean2 = (name2 || '').replace(/['`'´ʼ′]s$/gi, '').replace(/['`'´ʼ′]$/gi, '');
  
  // 수식어 제거
  clean1 = cleanTeamModifiers(clean1);
  clean2 = cleanTeamModifiers(clean2);
  
  const n1 = normalizeTeamName(clean1);
  const n2 = normalizeTeamName(clean2);
  
  if (!n1 || !n2) return false;
  
  // 정확히 같음
  if (n1 === n2) return true;
  
  // 포함 관계 (3글자 이상)
  if (n1.length >= 3 && n2.length >= 3) {
    if (n1.includes(n2) || n2.includes(n1)) return true;
  }
  
  // 단어 기반 매칭
  const words1 = n1.split(' ').filter(w => w.length >= 3);
  const words2 = n2.split(' ').filter(w => w.length >= 3);
  
  for (const w1 of words1) {
    for (const w2 of words2) {
      if (w1 === w2 || w1.includes(w2) || w2.includes(w1)) {
        return true;
      }
    }
  }
  
  // 별명 매핑 체크
  for (const [key, aliases] of Object.entries(TEAM_ALIASES)) {
    const allNames = [key, ...aliases];
    const n1Match = allNames.some(alias => n1.includes(alias) || alias.includes(n1));
    const n2Match = allNames.some(alias => n2.includes(alias) || alias.includes(n2));
    if (n1Match && n2Match) return true;
  }
  
  return false;
}

/**
 * TheSportsDB 경기 목록에서 매칭되는 경기 찾기
 */
function findMatchingEvent(events, homeTeam, awayTeam) {
  if (!events?.length) return null;
  
  // 팀명에서 수식어 제거
  const cleanHome = cleanTeamModifiers(homeTeam);
  const cleanAway = cleanTeamModifiers(awayTeam);
  
  for (const event of events) {
    const eventHome = event.strHomeTeam || '';
    const eventAway = event.strAwayTeam || '';
    
    // 정방향 매칭
    if (teamsMatch(cleanHome, eventHome) && teamsMatch(cleanAway, eventAway)) {
      return event;
    }
    
    // 역방향 매칭 (홈/어웨이 뒤바뀐 경우)
    if (teamsMatch(cleanHome, eventAway) && teamsMatch(cleanAway, eventHome)) {
      return event;
    }
  }
  
  return null;
}

/**
 * TheSportsDB에서 썸네일 가져오기 (v2 API + 리그 기반)
 */
async function fetchThumbnailFromLeague(homeTeam, awayTeam, leagueKey) {
  const leagueInfo = LEAGUE_CODE_MAP[leagueKey];
  if (!leagueInfo?.sportsDbId) return null;
  
  // 리그 경기 목록 가져오기 (v2 API)
  const events = await fetchLeagueEventsV2(leagueInfo.sportsDbId);
  
  // 매칭되는 경기 찾기
  const matchedEvent = findMatchingEvent(events, homeTeam, awayTeam);
  
  if (matchedEvent) {
    console.log(`    🎯 매칭: ${matchedEvent.strHomeTeam} vs ${matchedEvent.strAwayTeam}`);
    
    // 경기 날짜 체크
    if (!isValidMatchDate(matchedEvent.dateEvent)) {
      console.log(`    ⏭️ 날짜 범위 외: ${matchedEvent.dateEvent}`);
      return { skip: true, reason: 'date_out_of_range' };
    }
    
    // 우선순위: strThumb > strPoster > strBanner > strSquare
    if (matchedEvent.strThumb) {
      return { thumbnail: matchedEvent.strThumb + '/medium', type: 'event', source: 'v2-league', matchDate: matchedEvent.dateEvent };
    }
    if (matchedEvent.strPoster) {
      return { thumbnail: matchedEvent.strPoster + '/medium', type: 'poster', source: 'v2-league', matchDate: matchedEvent.dateEvent };
    }
    if (matchedEvent.strBanner) {
      return { thumbnail: matchedEvent.strBanner, type: 'banner', source: 'v2-league', matchDate: matchedEvent.dateEvent };
    }
    if (matchedEvent.strSquare) {
      return { thumbnail: matchedEvent.strSquare, type: 'square', source: 'v2-league', matchDate: matchedEvent.dateEvent };
    }
  }
  
  return null;
}

/**
 * TheSportsDB에서 썸네일 가져오기 (팀 검색 fallback)
 */
async function fetchThumbnailFromTeam(homeTeam) {
  try {
    const cleanHome = cleanTeamModifiers(homeTeam);
    const teamUrl = `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_API_KEY}/searchteams.php?t=${encodeURIComponent(cleanHome)}`;
    const teamRes = await fetch(teamUrl);
    const teamData = await teamRes.json();
    
    if (teamData.teams?.length > 0 && teamData.teams[0].strBadge) {
      return { thumbnail: teamData.teams[0].strBadge, type: 'badge', source: 'team-search' };
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * 통합 썸네일 가져오기
 */
async function fetchThumbnail(homeTeam, awayTeam, leagueKey) {
  // 1. v2 API 리그 기반 (가장 정확)
  const leagueResult = await fetchThumbnailFromLeague(homeTeam, awayTeam, leagueKey);
  
  // 날짜 범위 외면 스킵
  if (leagueResult?.skip) {
    return leagueResult;
  }
  
  if (leagueResult) return leagueResult;
  
  await delay(300);
  
  // 2. 팀 검색 fallback
  const teamResult = await fetchThumbnailFromTeam(homeTeam);
  if (teamResult) return teamResult;
  
  return null;
}

/**
 * 팀명 정리
 */
function cleanTeamName(name) {
  if (!name) return '';
  
  let cleaned = name.trim();
  
  // 아포스트로피 's 제거
  cleaned = cleaned.replace(/['`'´ʼ′]s$/gi, '');
  cleaned = cleaned.replace(/['`'´ʼ′]$/gi, '');
  
  // 수식어 제거 (NEW!)
  cleaned = cleanTeamModifiers(cleaned);
  
  // In-Form 변형들 제거
  cleaned = cleaned.replace(/^In[-‑–—]?Form\s*/gi, '');
  cleaned = cleaned.replace(/\s*In[-‑–—]?Form$/gi, '');
  cleaned = cleaned.replace(/^Familiar\s*/gi, '');
  
  // 불필요 단어/패턴 제거
  const removePatterns = [
    /\s*Home Steel.*$/i,
    /\s*Firepower.*$/i,
    /\s*European Street.*$/i,
    /\s*Perfect.*$/i,
    /\s*Statement.*$/i,
    /\s*Response.*$/i,
    /\s*Lifeline.*$/i,
    /\s*Stalemate.*$/i,
    /\s*Efficient.*$/i,
    /^Form\s+/i,
    /\s+Form$/i,
    /^Efficient$/i,
    /^Lifeline$/i,
    /^Against$/i,
    /^Again$/i,
  ];
  
  for (const pattern of removePatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // 혹시 팀명이 비정상적인 단어만 남으면 null 반환할 수 있도록 체크
  const invalidTeamNames = ['efficient', 'lifeline', 'against', 'again', 'perfect', 'statement', 'response', 'struggling', 'tough', 'steady'];
  if (invalidTeamNames.includes(cleaned.toLowerCase())) {
    return '';
  }
  
  return cleaned.trim();
}

/**
 * 단어 첫 글자 대문자
 */
function capitalizeWords(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * URL에서 팀명 추출
 */
function extractTeamsFromUrl(url) {
  if (!url) return null;
  
  const urlMatch = url.match(/\/(\d+)-(.+)$/);
  if (!urlMatch) return null;
  
  const slug = urlMatch[2];
  const verbs = 'chase|set|seek|aim|look|meet|meets|face|host|battle|clash|eye|target|hunt|bid|hope|need|want|ready|prepare|travel|welcome|take|go|gear|brace|steel|firepower|lifeline|strength';
  
  // "team1-and-team2-verb" 또는 "team1-vs-team2-verb"
  let pattern = new RegExp(`^(.+?)-(?:and|vs)-(.+?)-(?:${verbs})`, 'i');
  let match = slug.match(pattern);
  
  if (match) {
    let home = match[1].replace(/-/g, ' ').trim();
    let away = match[2].replace(/-/g, ' ').trim();
    away = away.replace(/^in\s*form\s*/i, '');
    return { 
      homeTeam: cleanTeamName(capitalizeWords(home)), 
      awayTeam: cleanTeamName(capitalizeWords(away)) 
    };
  }
  
  // "team1-home-steel-meets-team2s-firepower" 패턴
  pattern = /^(.+?)-home-steel-meets-(.+?)s?-firepower/i;
  match = slug.match(pattern);
  if (match) {
    let home = match[1].replace(/-/g, ' ').trim();
    let away = match[2].replace(/-/g, ' ').trim();
    return { 
      homeTeam: cleanTeamName(capitalizeWords(home)), 
      awayTeam: cleanTeamName(capitalizeWords(away)) 
    };
  }
  
  // "team1-seek-...-lifeline-against-team2" 패턴 (새로 추가!)
  pattern = /^(.+?)-seek.*?-(?:lifeline|response|statement)-against-(.+?)(?:-|$)/i;
  match = slug.match(pattern);
  if (match) {
    let home = match[1].replace(/-/g, ' ').trim();
    let away = match[2].replace(/-/g, ' ').trim();
    // 불필요 단어 제거
    away = away.replace(/-familiar.*$/i, '').replace(/-foe.*$/i, '').replace(/-in$/i, '');
    return { 
      homeTeam: cleanTeamName(capitalizeWords(home)), 
      awayTeam: cleanTeamName(capitalizeWords(away)) 
    };
  }
  
  return null;
}

/**
 * 제목에서 팀명 추출
 */
function extractTeamsFromTitle(title, url) {
  const urlResult = extractTeamsFromUrl(url);
  if (urlResult && urlResult.homeTeam && urlResult.awayTeam) {
    return urlResult;
  }
  
  const normalizedTitle = title.replace(/['´ʼ′]/g, "'");
  
  // ⭐ NEW: 가장 간단한 패턴 먼저 - "A vs B: ..." 또는 "A vs B - ..."
  const simpleVsMatch = normalizedTitle.match(/^(.+?)\s+vs\.?\s+(.+?)(?:\s*[:\-–—]|$)/i);
  if (simpleVsMatch) {
    let home = simpleVsMatch[1].trim();
    let away = simpleVsMatch[2].trim();
    
    home = cleanTeamModifiers(home);
    away = cleanTeamModifiers(away);
    home = cleanTeamName(home);
    away = cleanTeamName(away);
    
    if (home && away && home.length >= 2 && away.length >= 2) {
      return { homeTeam: home, awayTeam: away };
    }
  }
  
  // ⭐ NEW: "A Host B at Stadium..." 패턴
  const hostMatch = normalizedTitle.match(/^(.+?)\s+Host\s+(.+?)\s+(?:at|in|At|In)/i);
  if (hostMatch) {
    let home = hostMatch[1].trim();
    let away = hostMatch[2].trim();
    home = cleanTeamName(cleanTeamModifiers(home));
    away = cleanTeamName(cleanTeamModifiers(away));
    if (home && away && home.length >= 2 && away.length >= 2) {
      return { homeTeam: home, awayTeam: away };
    }
  }
  
  // ⭐ NEW: "A Out to Extend ... at/against B" 패턴
  const outToMatch = normalizedTitle.match(/^(.+?)\s+Out\s+to\s+.+?\s+(?:at|against|vs)\s+(.+?)(?:\s|:|$)/i);
  if (outToMatch) {
    let home = outToMatch[1].trim();
    let away = outToMatch[2].trim();
    home = cleanTeamName(cleanTeamModifiers(home));
    away = cleanTeamName(cleanTeamModifiers(away));
    if (home && away && home.length >= 2 && away.length >= 2) {
      return { homeTeam: home, awayTeam: away };
    }
  }
  
  // ⭐ NEW: "A's Fortress Tested By B" 패턴
  const fortressMatch = normalizedTitle.match(/^(.+?)(?:'s)?\s+(?:Fortress|Home|Ground)\s+Tested\s+By\s+(.+?)\s+(?:In|At|As|$)/i);
  if (fortressMatch) {
    let home = fortressMatch[1].trim();
    let away = fortressMatch[2].trim();
    home = cleanTeamName(cleanTeamModifiers(home));
    away = cleanTeamName(cleanTeamModifiers(away));
    if (home && away && home.length >= 2 && away.length >= 2) {
      return { homeTeam: home, awayTeam: away };
    }
  }
  
  const patterns = [
    // "A and B Set For..."
    /^(.+?)\s+(?:and|vs\.?|v)\s+(.+?)\s+(?:Set|Chase|Seek|Aim|Look|Meet|Face|Host|Battle|Clash|Eye|Target|Ready|Go|Travel)/i,
    
    // "A's Home Steel Meets B's Firepower"
    /^(.+?)(?:'s)?\s+Home Steel Meets\s+(.+?)(?:'s)?\s+Firepower/i,
    
    // "A's Home Strength Meets B's Stalemate"
    /^(.+?)(?:'s)?\s+Home Strength Meets\s+(.+?)(?:'s)?\s+Stalemate/i,
    
    // "A's ... Meets B's ..."
    /^(.+?)(?:'s)?\s+.*?(?:Meets?|Faces?|Hosts?|Welcomes?)\s+(.+?)(?:'s)?(?:\s|$)/i,
    
    // "A Seek ... Against B" (새로 추가!)
    /^(.+?)\s+(?:Seek|Look|Aim|Hope|Need|Want).*?(?:Against|Versus|Vs)\s+(.+?)(?:\s+In|\s+At|\s+On|$)/i,
    
    // "A Seek ... As In-Form B ..."
    /^(.+?)\s+(?:Seek|Look|Aim|Hope).+?(?:As|While|Against)\s+(?:In[-‑]?Form\s+)?(.+?)\s+(?:Return|Visit|Travel|Come|Arrive|Face|Head)/i,
    
    // "A Aim To Halt B's ..."
    /^(.+?)\s+(?:Aim|Look|Hope|Seek)\s+To\s+(?:Halt|Stop|End|Beat|Defeat)\s+(.+?)(?:'s)?(?:\s|$)/i,
    
    // "A Seek ... Against Familiar Foe B"
    /^(.+?)\s+(?:Seek|Look).+?(?:Against)\s+(?:Familiar\s+(?:Foe|Foes)?\s*)?(.+?)(?:\s|$)/i,
    
    // ⭐ NEW: "A's ... vs B's ..."
    /^(.+?)(?:'s)?\s+.+?\s+vs\.?\s+(.+?)(?:'s)?\s+/i,
    
    // ⭐ NEW: "A Poised to ... at B" / "A Poised to ... Against B"
    /^(.+?)\s+(?:Poised|Set|Ready|Look)\s+to\s+.+?\s+(?:at|against|versus)\s+(.+?)(?:\s|$)/i,
    
    // ⭐ NEW: "Can A ... B's ..."
    /^Can\s+(.+?)\s+.+?\s+(.+?)(?:'s)?\s+/i,
  ];
  
  for (const pattern of patterns) {
    const match = normalizedTitle.match(pattern);
    if (match) {
      let home = match[1].trim();
      let away = match[2].trim();
      
      home = home.replace(/'s$/i, '');
      away = away.replace(/'s$/i, '');
      
      // 수식어 제거
      home = cleanTeamModifiers(home);
      away = cleanTeamModifiers(away);
      
      // In-Form 제거
      away = away.replace(/^In[-‑]?Form\s+/i, '');
      home = home.replace(/^In[-‑]?Form\s+/i, '');
      
      // 너무 긴 이름이면 불필요 부분 제거
      away = away.split(/\s+(In|At|On|For|To|As|Return|Visit|Travel|Come|Arrive)\s+/i)[0];
      
      home = cleanTeamName(home);
      away = cleanTeamName(away);
      
      if (home && away && home.length >= 2 && away.length >= 2) {
        return { homeTeam: home, awayTeam: away };
      }
    }
  }
  
  return null;
}

/**
 * 프리뷰 링크 수집
 */
async function getPreviewLinks(browser) {
  const allPreviews = [];
  const seenLinks = new Set();
  
  for (let i = 0; i < PREVIEWS_URLS.length; i++) {
    const url = PREVIEWS_URLS[i];
    console.log(`  📖 Page ${i+1}: ${url}`);
    
    const page = await browser.newPage();
    
    page.on('pageerror', () => {});
    page.on('error', () => {});
    
    // 리소스 차단
    await page.setRequestInterception(true);
    page.on('request', req => {
      const type = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(type)) req.abort();
      else req.continue();
    });
    
    try {
      // 더 긴 타임아웃 + domcontentloaded 사용
      await page.goto(url, { 
        waitUntil: 'domcontentloaded', 
        timeout: 90000 
      });
      
      // 추가 대기 (JavaScript 렌더링)
      await delay(5000);
      
      // 스크롤해서 콘텐츠 로드
      await page.evaluate(() => window.scrollTo(0, 500));
      await delay(2000);
      
    } catch (e) {
      console.log(`    ⚠️ 페이지 로드 에러: ${e.message}`);
      // 에러나도 계속 진행 (페이지는 로드됐을 수 있음)
    }
    
    const previews = await page.evaluate(() => {
      const results = [];
      
      // 프리뷰 카드들 찾기 (여러 선택자 시도)
      const cards = document.querySelectorAll('.preview_item, .previewItem, [class*="preview"], article');
      
      cards.forEach(card => {
        const linkEl = card.querySelector('a[href*="/football-match-previews/"]');
        if (!linkEl) return;
        
        const link = linkEl.href;
        if (!link?.includes('/football-match-previews/') || link.endsWith('/football-match-previews')) return;
        
        const title = linkEl.textContent?.trim() || '';
        
        // ⭐ 리그 정보 추출 (여러 소스에서)
        let league = '';
        
        // 1. 전용 리그 요소
        const leagueEl = card.querySelector('.league_link, .leagueName, [class*="league"], .competition');
        if (leagueEl) {
          league = leagueEl.textContent?.trim() || '';
        }
        
        // 2. 이미지 alt 텍스트에서 추출
        if (!league) {
          const img = card.querySelector('img');
          if (img) {
            const alt = img.alt || '';
            const src = img.src || '';
            // alt 텍스트에 리그명 있을 수 있음
            if (alt) league = alt;
            // 이미지 URL에서 리그 코드 추출 시도
            if (!league && src) {
              const urlLeagueMatch = src.match(/\/([a-z]{2,3})\d*\//i);
              if (urlLeagueMatch) league = urlLeagueMatch[1];
            }
          }
        }
        
        // 3. 링크 URL에서 리그 추출 시도
        if (!league) {
          const urlMatch = link.match(/football-match-previews\/([^\/]+)\//);
          if (urlMatch) league = urlMatch[1].replace(/-/g, ' ');
        }
        
        // 4. Preview 텍스트 근처에서 리그명 찾기 (| 구분자 패턴)
        if (!league) {
          const cardHtml = card.innerHTML || '';
          // "Süper Lig | Preview" 같은 패턴
          const pipeMatch = cardHtml.match(/([^<>|]+)\s*\|\s*Preview/i);
          if (pipeMatch) {
            league = pipeMatch[1].trim();
          }
        }
        
        // 5. 카드 전체 텍스트에서 리그 찾기 - 확장된 패턴
        if (!league) {
          const cardText = card.textContent || '';
          // 지원 리그
          const supportedPatterns = [
            'Premier League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1',
            'Champions League', 'Europa League', 'Conference League', 'Nations League',
            'Championship', 'Eredivisie'
          ];
          // 제외 리그 (감지용)
          const excludedPatterns = [
            'Süper Lig', 'Super Lig', 'J1 League', 'J2 League', 'J.League',
            'Saudi Pro', 'Pro League', 'Roshn', 'MLS', 'Liga MX',
            'A-League', 'K League', 'Primeira Liga', 'Liga Portugal',
            'Scottish', 'Eliteserien', 'Swiss Super', 'Jupiler',
            'Brasileirao', 'Liga Profesional', 'Serie A Brazil',
            'Brasileirão', 'Campeonato Brasileiro'
          ];
          
          // 지원 리그 먼저 체크
          for (const pattern of supportedPatterns) {
            if (cardText.includes(pattern)) {
              league = pattern;
              break;
            }
          }
          
          // 제외 리그도 감지 (나중에 필터링용)
          if (!league) {
            for (const pattern of excludedPatterns) {
              if (cardText.includes(pattern)) {
                league = pattern;
                break;
              }
            }
          }
        }
        
        results.push({ link, title, league });
      });
      
      // 카드 방식 실패 시 기존 방식 fallback
      if (results.length === 0) {
        document.querySelectorAll('a[href*="/football-match-previews/"]').forEach(el => {
          const link = el.href;
          if (link?.includes('/football-match-previews/') && !link.endsWith('/football-match-previews')) {
            // 부모 요소에서 리그 찾기
            let league = '';
            let parent = el.parentElement;
            for (let i = 0; i < 5 && parent; i++) {
              const text = parent.textContent || '';
              const allPatterns = [
                'Premier League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1',
                'Champions League', 'Europa League', 'Conference League', 'Nations League',
                'Championship', 'Eredivisie',
                'Süper Lig', 'Super Lig', 'J1 League', 'Saudi Pro', 'Pro League',
                'Brasileirao', 'Campeonato Brasileiro'
              ];
              for (const pattern of allPatterns) {
                if (text.includes(pattern)) {
                  league = pattern;
                  break;
                }
              }
              if (league) break;
              parent = parent.parentElement;
            }
            results.push({ link, title: el.textContent?.trim() || '', league });
          }
        });
      }
      
      return [...new Map(results.map(r => [r.link, r])).values()];
    });
    
    // 중복 제거하면서 추가
    let newCount = 0;
    for (const p of previews) {
      if (!seenLinks.has(p.link)) {
        seenLinks.add(p.link);
        allPreviews.push(p);
        newCount++;
      }
    }
    
    // 리그별 통계
    const leagueCounts = {};
    previews.forEach(p => {
      if (p.league) {
        leagueCounts[p.league] = (leagueCounts[p.league] || 0) + 1;
      }
    });
    
    console.log(`    Found ${previews.length} links (+${newCount} new)`);
    if (Object.keys(leagueCounts).length > 0) {
      console.log(`    📋 리그: ${Object.entries(leagueCounts).map(([k,v]) => `${k}(${v})`).join(', ')}`);
    }
    
    // 0개면 HTML 일부 출력 (디버깅용)
    if (previews.length === 0) {
      const html = await page.content();
      console.log(`    🔍 페이지 길이: ${html.length}자`);
      console.log(`    🔍 Preview 텍스트 포함: ${html.includes('Preview') ? 'Yes' : 'No'}`);
    }
    
    await page.close();
    await delay(2000); // 페이지 간 딜레이
  }
  
  console.log(`  📄 총 ${allPreviews.length} links found`);
  return allPreviews;
}

/**
 * ⭐ NEW: 제외 리그 체크 (리그명 + 제목)
 */
function isExcludedLeague(leagueName, title = '') {
  const textToCheck = `${leagueName || ''} ${title || ''}`.toLowerCase();
  
  for (const excluded of EXCLUDED_LEAGUES) {
    if (textToCheck.includes(excluded)) {
      return true;
    }
  }
  
  // 추가 체크: 아랍/중동 팀명 패턴
  const arabTeamPatterns = ['al ', 'al-', 'fc al', 'sc al', 'qadisiya', 'ettifaq', 'hilal', 'nassr', 'ahli', 'ittihad', 'shabab', 'fateh', 'neom', 'damak'];
  for (const pattern of arabTeamPatterns) {
    if (textToCheck.includes(pattern)) {
      return true;
    }
  }
  
  // 추가 체크: 브라질 팀명 패턴
  const brazilTeamPatterns = ['corinthians', 'botafogo', 'flamengo', 'palmeiras', 'sao paulo', 'santos', 'gremio', 'internacional', 'fluminense', 'athletico', 'cruzeiro', 'vasco', 'bahia', 'fortaleza'];
  for (const pattern of brazilTeamPatterns) {
    if (textToCheck.includes(pattern)) {
      return true;
    }
  }
  
  // 추가 체크: 포르투갈 팀명 패턴 (프리메이라리가)
  const portugalTeamPatterns = ['braga', 'arouca', 'estoril', 'vitoria', 'famalicao', 'boavista', 'gil vicente', 'moreirense', 'casa pia', 'rio ave', 'farense', 'estrela', 'nacional'];
  for (const pattern of portugalTeamPatterns) {
    if (textToCheck.includes(pattern)) {
      return true;
    }
  }
  
  return false;
}

/**
 * 지원 리그 필터 + 리그 키 추가
 * ⭐ 지원 리그에 명시적으로 매칭되는 것만 통과
 */
function filterSupportedLeagues(previews) {
  const filtered = [];
  let excludedCount = 0;
  let noLeagueCount = 0;
  
  for (const p of previews) {
    // ⭐ NEW: 제외 리그 체크 (리그명 + 제목 모두 확인)
    if (isExcludedLeague(p.league, p.title)) {
      excludedCount++;
      console.log(`    ❌ 제외: ${p.title.substring(0, 40)}... (${p.league || 'no league'})`);
      continue;
    }
    
    let foundLeague = null;
    
    // 1. 페이지에서 추출한 리그 정보 우선 사용
    if (p.league) {
      const leagueLower = p.league.toLowerCase();
      for (const league of SUPPORTED_LEAGUES) {
        if (leagueLower.includes(league)) {
          foundLeague = league;
          break;
        }
      }
    }
    
    // 2. 제목에서 리그 찾기 (fallback)
    if (!foundLeague) {
      const titleLower = p.title.toLowerCase();
      for (const league of SUPPORTED_LEAGUES) {
        if (titleLower.includes(league)) {
          foundLeague = league;
          break;
        }
      }
    }
    
    // ⭐ NEW: 지원 리그에 매칭 안 되면 스킵 (이전에는 통과됨)
    if (foundLeague) {
      filtered.push({ ...p, leagueKey: foundLeague });
    } else {
      noLeagueCount++;
      console.log(`    ⏭️ 미지원 리그: ${p.title.substring(0, 40)}... (${p.league || 'no league'})`);
    }
  }
  
  console.log(`  🎯 Supported leagues: ${filtered.length} (제외: ${excludedCount}, 미지원: ${noLeagueCount})`);
  return filtered;
}

/**
 * 본문 추출
 */
function extractPreviewText(fullText) {
  const paragraphs = [];
  const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  let started = false;
  
  for (const line of lines) {
    if (!started && line.length >= 100) started = true;
    if (!started) continue;
    
    if (line.includes('Probable Lineups')) break;
    if (line.includes('Prediction')) break;
    if (line.includes('©')) break;
    if (line.includes('Related Articles')) break;
    if (line.includes('More Previews')) break;
    if (line.includes('Share this')) break;
    if (line.includes('Goalkeeper:')) break;
    if (line.includes('Defenders:')) break;
    
    if (line === 'Recent Form') continue;
    if (line === 'Recent History') continue;
    if (line === 'Overall Performance') continue;
    if (line === 'Main Trends') continue;
    
    if (line.length >= 80) paragraphs.push(line);
  }
  
  return paragraphs;
}

/**
 * 상세 페이지 스크래핑
 */
async function scrapePreviewDetail(browser, previewInfo, teams) {
  const page = await browser.newPage();
  
  page.on('pageerror', () => {});
  page.on('error', () => {});
  
  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await page.goto(previewInfo.link, { waitUntil: 'networkidle2', timeout: 60000 });
    
    await delay(4000);
    try { await page.evaluate(() => window.scrollTo(0, 1000)); } catch {}
    await delay(2000);
    
    const pageData = await page.evaluate(() => {
      const fullText = document.body.innerText || '';
      let articleText = '';
      const containers = [
        document.querySelector('article'),
        document.querySelector('.preview-content'),
        document.querySelector('main'),
      ];
      for (const container of containers) {
        if (container?.innerText?.length > 500) {
          articleText = container.innerText;
          break;
        }
      }
      
      // ⭐ NEW: 리그 정보 추출 (상세 페이지에서)
      let detectedLeague = '';
      
      // 1. "Süper Lig | Preview" 패턴 찾기
      const pipeMatch = fullText.match(/([A-Za-zÀ-ÿ\s]+)\s*\|\s*Preview/i);
      if (pipeMatch) {
        detectedLeague = pipeMatch[1].trim();
      }
      
      // 2. 페이지 상단의 리그명 (breadcrumb 등)
      if (!detectedLeague) {
        const breadcrumb = document.querySelector('.breadcrumb, nav[aria-label="breadcrumb"]');
        if (breadcrumb) {
          detectedLeague = breadcrumb.textContent || '';
        }
      }
      
      // 3. 메타 정보에서 찾기
      if (!detectedLeague) {
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
          const content = metaDesc.getAttribute('content') || '';
          // 리그명 패턴 매칭
          const leaguePatterns = [
            'Premier League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1',
            'Champions League', 'Europa League', 'Süper Lig', 'Super Lig',
            'Eredivisie', 'Championship', 'Brasileirao', 'MLS', 'J1 League',
            'Saudi Pro League', 'Liga Portugal', 'Scottish Premiership'
          ];
          for (const pattern of leaguePatterns) {
            if (content.includes(pattern)) {
              detectedLeague = pattern;
              break;
            }
          }
        }
      }
      
      return {
        fullText: articleText || fullText,
        fullTextLength: (articleText || fullText).length,
        detectedLeague: detectedLeague,
      };
    });
    
    await page.close();
    
    // ⭐ NEW: 상세 페이지에서 감지된 리그가 제외 대상이면 null 반환
    if (pageData.detectedLeague) {
      const detectedLower = pageData.detectedLeague.toLowerCase();
      const excludedLeagues = ['süper lig', 'super lig', 'brasileirao', 'mls', 'j1 league', 'j2 league', 
        'saudi', 'pro league', 'liga portugal', 'scottish', 'k league', 'a-league'];
      for (const excluded of excludedLeagues) {
        if (detectedLower.includes(excluded)) {
          console.log(`    ❌ 상세페이지에서 제외 리그 감지: ${pageData.detectedLeague}`);
          return null;
        }
      }
    }
    
    const paragraphs = extractPreviewText(pageData.fullText);
    const previewText = paragraphs.join('\n\n');
    const leagueInfo = LEAGUE_CODE_MAP[previewInfo.leagueKey] || { code: 'OTHER', nameKr: '기타' };
    
    // 팀명에서 수식어 제거
    const cleanHome = cleanTeamModifiers(teams.homeTeam);
    const cleanAway = cleanTeamModifiers(teams.awayTeam);
    
    return {
      homeTeam: cleanHome,
      awayTeam: cleanAway,
      previewParagraphs: paragraphs,
      previewText,
      leagueCode: leagueInfo.code,
      leagueKr: leagueInfo.nameKr,
      leagueKey: previewInfo.leagueKey,
      sourceUrl: previewInfo.link,
      originalTitle: previewInfo.title,
      fullTextLength: pageData.fullTextLength,
      detectedLeague: pageData.detectedLeague, // 디버깅용
      scrapedAt: new Date().toISOString()
    };
    
  } catch (e) {
    console.log(`    ❌ Error: ${e.message}`);
    await page.close();
    return null;
  }
}

/**
 * 메인
 */
async function scrapeForebetPreviews() {
  console.log('🚀 Forebet Scraper v21 (경기 썸네일만)');
  console.log(`🔑 API Key: ${SPORTSDB_API_KEY.substring(0, 3)}***`);
  console.log('📅 ' + new Date().toISOString());
  console.log(`🎯 지원 리그: ${SUPPORTED_LEAGUES.length}개`);
  console.log(`📆 경기 범위: 오늘 ~ +${MAX_DAYS_AHEAD}일`);
  console.log(`📸 썸네일: event만 (badge 제외)`);
  console.log(`📄 페이지: 1페이지 | 최대: ${MAX_POSTS_PER_DAY}개\n`);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
      '--disable-blink-features=AutomationControlled',
    ]
  });
  
  try {
    const allLinks = await getPreviewLinks(browser);
    if (!allLinks.length) { await browser.close(); return []; }
    
    const supportedLinks = filterSupportedLeagues(allLinks);
    if (!supportedLinks.length) { await browser.close(); return []; }
    
    // 최대 개수 제한
    const linksToProcess = supportedLinks.slice(0, MAX_POSTS_PER_DAY);
    console.log(`\n📖 Scraping ${linksToProcess.length}/${supportedLinks.length} previews (max: ${MAX_POSTS_PER_DAY})...\n`);
    
    const allPreviews = [];
    let skippedByDate = 0;
    let skippedNoThumb = 0;
    
    for (let i = 0; i < linksToProcess.length; i++) {
      const preview = linksToProcess[i];
      console.log(`[${i+1}/${linksToProcess.length}] ${preview.title.substring(0, 55)}...`);
      
      const teams = extractTeamsFromTitle(preview.title, preview.link);
      if (!teams) {
        console.log(`    ⚠️ 팀명 추출 실패`);
        continue;
      }
      console.log(`    📍 ${teams.homeTeam} vs ${teams.awayTeam}`);
      
      const data = await scrapePreviewDetail(browser, preview, teams);
      
      if (data) {
        const thumbResult = await fetchThumbnail(data.homeTeam, data.awayTeam, data.leagueKey);
        
        // ⭐ NEW: 날짜 범위 외 스킵
        if (thumbResult?.skip) {
          console.log(`    ⏭️ 스킵: ${thumbResult.reason}`);
          skippedByDate++;
          continue;
        }
        
        if (thumbResult) {
          // ⛔ event 타입(경기 썸네일)만 허용, badge(팀 뱃지)는 스킵
          if (thumbResult.type !== 'event') {
            console.log(`    ⏭️ ${thumbResult.type} 타입 - 스킵 (event만 허용)`);
            skippedNoThumb++;
            continue;
          }
          
          data.thumbnail = thumbResult.thumbnail;
          data.thumbnailType = thumbResult.type;
          data.thumbnailSource = thumbResult.source;
          if (thumbResult.matchDate) {
            data.matchDate = thumbResult.matchDate;
          }
          console.log(`    📸 ${thumbResult.type} (${thumbResult.source})`);
          
          allPreviews.push(data);
          console.log(`    ✅ ${data.leagueKr} | 📝 ${data.previewText.length}자`);
        } else {
          // ⛔ 썸네일 없으면 스킵 (TheSportsDB에서 찾을 수 있는 경기만 처리)
          console.log(`    ⏭️ 썸네일 없음 - 스킵`);
          skippedNoThumb++;
          continue;
        }
      }
      
      await delay(2500);
    }
    
    await browser.close();
    
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📊 결과: ${allPreviews.length}개 (경기 썸네일 있는 것만)`);
    console.log(`⏭️ 날짜 범위 외 스킵: ${skippedByDate}개`);
    console.log(`⏭️ 썸네일 없음/badge 스킵: ${skippedNoThumb}개`);
    console.log(`📸 모든 썸네일: TheSportsDB 경기 이미지 (event)`);
    
    const avgTextLen = allPreviews.length > 0 
      ? Math.round(allPreviews.reduce((a, p) => a + p.previewText.length, 0) / allPreviews.length)
      : 0;
    console.log(`📝 평균 본문: ${avgTextLen}자`);
    
    fs.writeFileSync('scraped-previews.json', JSON.stringify(allPreviews, null, 2));
    console.log(`💾 Saved to scraped-previews.json`);
    
    return allPreviews;
    
  } catch (error) {
    console.error('❌ Error:', error);
    await browser.close();
    throw error;
  }
}

scrapeForebetPreviews()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
