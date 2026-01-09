/**
 * Forebet Match Preview Scraper v34
 * 
 * 🆕 v34 변경사항:
 * - DB 사전 중복 체크 (Supabase에서 기존 source_url 조회)
 * - 중복 링크 자동 스킵 후 추가 링크 시도
 * - 다중 페이지 지원 (새 경기 부족 시 page 2, 3...)
 * - 썸네일 없어도 팀 배지로 대체 이미지 생성 옵션
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const fs = require('fs');

// =============================================================================
// 🆕 Supabase 설정 (DB 사전 체크용)
// =============================================================================
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

/**
 * 🆕 DB에서 이미 존재하는 source_url 목록 가져오기
 */
async function getExistingSourceUrls() {
  try {
    console.log('🔍 DB에서 기존 포스트 URL 조회...');
    
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/blog_posts?select=source_url&source_url=not.is.null`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        }
      }
    );
    
    if (!response.ok) {
      console.log('    ⚠️ DB 조회 실패, 중복 체크 스킵');
      return new Set();
    }
    
    const posts = await response.json();
    const urls = new Set(posts.map(p => p.source_url).filter(Boolean));
    console.log(`    ✅ 기존 포스트: ${urls.size}개`);
    
    return urls;
  } catch (e) {
    console.log(`    ⚠️ DB 연결 실패: ${e.message}`);
    return new Set();
  }
}

// =============================================================================
// 기존 설정 (v33에서 복사)
// =============================================================================
const SPORTSDB_API_KEY = '3';

const LEAGUE_TEAMS = {
  'bundesliga': [
    { name: 'Bayern Munich', searchName: 'Bayern Munich', aliases: ['bayern', 'fc bayern', 'bayern munchen'] },
    { name: 'Borussia Dortmund', searchName: 'Dortmund', aliases: ['dortmund', 'bvb'] },
    { name: 'RB Leipzig', searchName: 'Leipzig', aliases: ['leipzig', 'rb leipzig', 'rasenballsport'] },
    { name: 'Bayer Leverkusen', searchName: 'Leverkusen', aliases: ['leverkusen', 'bayer 04', 'bayer'] },
    { name: 'Eintracht Frankfurt', searchName: 'Frankfurt', aliases: ['frankfurt', 'eintracht'] },
    { name: 'VfB Stuttgart', searchName: 'Stuttgart', aliases: ['stuttgart', 'vfb'] },
    { name: 'Werder Bremen', searchName: 'Werder Bremen', aliases: ['werder', 'bremen', 'sv werder'] },
    { name: 'SC Freiburg', searchName: 'Freiburg', aliases: ['freiburg', 'sc freiburg'] },
    { name: 'TSG Hoffenheim', searchName: 'Hoffenheim', aliases: ['hoffenheim', 'tsg', '1899 hoffenheim'] },
    { name: 'Borussia Monchengladbach', searchName: 'Monchengladbach', aliases: ['gladbach', 'monchengladbach', 'mgladbach'] },
    { name: 'VfL Wolfsburg', searchName: 'Wolfsburg', aliases: ['wolfsburg', 'vfl'] },
    { name: 'Union Berlin', searchName: 'Union Berlin', aliases: ['union', 'union berlin', '1. fc union'] },
    { name: 'Mainz 05', searchName: 'Mainz', aliases: ['mainz', 'fsv mainz'] },
    { name: 'FC Augsburg', searchName: 'Augsburg', aliases: ['augsburg'] },
    { name: 'VfL Bochum', searchName: 'Bochum', aliases: ['bochum'] },
    { name: 'FC Koln', searchName: 'Koln', aliases: ['koln', 'cologne', '1. fc koln', 'fc cologne'] },
    { name: '1. FC Heidenheim', searchName: 'Heidenheim', aliases: ['heidenheim'] },
    { name: 'FC St. Pauli', searchName: 'St Pauli', aliases: ['st pauli', 'st. pauli', 'fc st pauli', 'pauli'] },
    { name: 'Holstein Kiel', searchName: 'Holstein Kiel', aliases: ['kiel', 'holstein'] },
    { name: 'Hamburger SV', searchName: 'Hamburg', aliases: ['hamburg', 'hamburger', 'hsv', 'hamburger sv'] },
  ],
  
  'eredivisie': [
    { name: 'Ajax', searchName: 'Ajax', aliases: ['ajax', 'afc ajax'] },
    { name: 'PSV Eindhoven', searchName: 'PSV', aliases: ['psv', 'psv eindhoven'] },
    { name: 'Feyenoord', searchName: 'Feyenoord', aliases: ['feyenoord', 'feyenoord rotterdam'] },
    { name: 'AZ Alkmaar', searchName: 'AZ Alkmaar', aliases: ['az', 'alkmaar', 'az alkmaar'] },
    { name: 'FC Twente', searchName: 'Twente', aliases: ['twente', 'fc twente'] },
    { name: 'FC Utrecht', searchName: 'Utrecht', aliases: ['utrecht', 'fc utrecht'] },
    { name: 'SC Heerenveen', searchName: 'Heerenveen', aliases: ['heerenveen', 'sc heerenveen'] },
    { name: 'FC Groningen', searchName: 'Groningen', aliases: ['groningen', 'fc groningen'] },
    { name: 'NEC Nijmegen', searchName: 'NEC Nijmegen', aliases: ['nijmegen', 'nec', 'nec nijmegen'] },
    { name: 'Vitesse', searchName: 'Vitesse', aliases: ['vitesse', 'vitesse arnhem'] },
    { name: 'Go Ahead Eagles', searchName: 'Go Ahead Eagles', aliases: ['go ahead', 'eagles'] },
    { name: 'Sparta Rotterdam', searchName: 'Sparta Rotterdam', aliases: ['sparta', 'sparta rotterdam'] },
    { name: 'Fortuna Sittard', searchName: 'Fortuna Sittard', aliases: ['sittard', 'fortuna sittard'] },
    { name: 'RKC Waalwijk', searchName: 'Waalwijk', aliases: ['waalwijk', 'rkc'] },
    { name: 'Heracles Almelo', searchName: 'Heracles', aliases: ['heracles', 'almelo'] },
    { name: 'PEC Zwolle', searchName: 'PEC Zwolle', aliases: ['zwolle', 'pec', 'pec zwolle'] },
    { name: 'NAC Breda', searchName: 'NAC Breda', aliases: ['breda', 'nac', 'nac breda'] },
    { name: 'FC Volendam', searchName: 'Volendam', aliases: ['volendam'] },
    { name: 'Willem II', searchName: 'Willem II', aliases: ['willem', 'willem ii'] },
    { name: 'Almere City', searchName: 'Almere City', aliases: ['almere'] },
  ],
  
  'championship': [
    { name: 'Leicester City', searchName: 'Leicester', aliases: ['leicester'] },
    { name: 'Leeds United', searchName: 'Leeds', aliases: ['leeds'] },
    { name: 'Burnley', searchName: 'Burnley', aliases: ['burnley'] },
    { name: 'Sunderland', searchName: 'Sunderland', aliases: ['sunderland'] },
    { name: 'Sheffield United', searchName: 'Sheffield Utd', aliases: ['sheffield', 'sheffield united', 'sheffield utd'] },
    { name: 'West Brom', searchName: 'West Brom', aliases: ['west bromwich', 'west brom', 'wba'] },
    { name: 'Middlesbrough', searchName: 'Middlesbrough', aliases: ['middlesbrough', 'boro'] },
    { name: 'Norwich City', searchName: 'Norwich', aliases: ['norwich'] },
    { name: 'Coventry City', searchName: 'Coventry', aliases: ['coventry'] },
    { name: 'Watford', searchName: 'Watford', aliases: ['watford'] },
  ],
  
  'premier league': [
    { name: 'Arsenal', searchName: 'Arsenal', aliases: ['arsenal'] },
    { name: 'Manchester City', searchName: 'Man City', aliases: ['man city', 'manchester city'] },
    { name: 'Manchester United', searchName: 'Man Utd', aliases: ['man united', 'man utd', 'manchester united'] },
    { name: 'Liverpool', searchName: 'Liverpool', aliases: ['liverpool'] },
    { name: 'Chelsea', searchName: 'Chelsea', aliases: ['chelsea'] },
    { name: 'Tottenham', searchName: 'Tottenham', aliases: ['tottenham', 'spurs'] },
    { name: 'Newcastle United', searchName: 'Newcastle', aliases: ['newcastle'] },
    { name: 'Aston Villa', searchName: 'Aston Villa', aliases: ['aston villa', 'villa'] },
    { name: 'Brighton', searchName: 'Brighton', aliases: ['brighton'] },
    { name: 'Fulham', searchName: 'Fulham', aliases: ['fulham'] },
    { name: 'Brentford', searchName: 'Brentford', aliases: ['brentford'] },
    { name: 'Bournemouth', searchName: 'Bournemouth', aliases: ['bournemouth'] },
    { name: 'Crystal Palace', searchName: 'Crystal Palace', aliases: ['crystal palace', 'palace'] },
    { name: 'Everton', searchName: 'Everton', aliases: ['everton'] },
    { name: 'Nottingham Forest', searchName: 'Nottm Forest', aliases: ['nottingham', 'forest'] },
    { name: 'West Ham', searchName: 'West Ham', aliases: ['west ham'] },
    { name: 'Wolves', searchName: 'Wolves', aliases: ['wolves', 'wolverhampton'] },
    { name: 'Ipswich Town', searchName: 'Ipswich', aliases: ['ipswich'] },
    { name: 'Southampton', searchName: 'Southampton', aliases: ['southampton'] },
  ],
  
  'la liga': [
    { name: 'Real Madrid', searchName: 'Real Madrid', aliases: ['real madrid', 'madrid'] },
    { name: 'Barcelona', searchName: 'Barcelona', aliases: ['barcelona', 'barca'] },
    { name: 'Atletico Madrid', searchName: 'Atletico Madrid', aliases: ['atletico', 'atletico madrid'] },
    { name: 'Sevilla', searchName: 'Sevilla', aliases: ['sevilla'] },
    { name: 'Real Sociedad', searchName: 'Real Sociedad', aliases: ['sociedad', 'real sociedad'] },
    { name: 'Real Betis', searchName: 'Real Betis', aliases: ['betis', 'real betis'] },
    { name: 'Villarreal', searchName: 'Villarreal', aliases: ['villarreal'] },
    { name: 'Athletic Bilbao', searchName: 'Athletic Bilbao', aliases: ['bilbao', 'athletic'] },
    { name: 'Valencia', searchName: 'Valencia', aliases: ['valencia'] },
    { name: 'Osasuna', searchName: 'Osasuna', aliases: ['osasuna'] },
    { name: 'Celta Vigo', searchName: 'Celta Vigo', aliases: ['celta'] },
    { name: 'Mallorca', searchName: 'Mallorca', aliases: ['mallorca'] },
    { name: 'Getafe', searchName: 'Getafe', aliases: ['getafe'] },
    { name: 'Rayo Vallecano', searchName: 'Rayo Vallecano', aliases: ['rayo', 'vallecano'] },
    { name: 'Girona', searchName: 'Girona', aliases: ['girona'] },
    { name: 'Espanyol', searchName: 'Espanyol', aliases: ['espanyol'] },
    { name: 'Leganes', searchName: 'Leganes', aliases: ['leganes'] },
    { name: 'Valladolid', searchName: 'Valladolid', aliases: ['valladolid'] },
  ],
  
  'serie a': [
    { name: 'Inter Milan', searchName: 'Inter', aliases: ['inter', 'inter milan'] },
    { name: 'AC Milan', searchName: 'AC Milan', aliases: ['milan', 'ac milan'] },
    { name: 'Juventus', searchName: 'Juventus', aliases: ['juventus', 'juve'] },
    { name: 'Napoli', searchName: 'Napoli', aliases: ['napoli'] },
    { name: 'Roma', searchName: 'Roma', aliases: ['roma', 'as roma'] },
    { name: 'Lazio', searchName: 'Lazio', aliases: ['lazio'] },
    { name: 'Atalanta', searchName: 'Atalanta', aliases: ['atalanta'] },
    { name: 'Fiorentina', searchName: 'Fiorentina', aliases: ['fiorentina'] },
    { name: 'Bologna', searchName: 'Bologna', aliases: ['bologna'] },
    { name: 'Torino', searchName: 'Torino', aliases: ['torino'] },
    { name: 'Monza', searchName: 'Monza', aliases: ['monza'] },
    { name: 'Genoa', searchName: 'Genoa', aliases: ['genoa'] },
    { name: 'Cagliari', searchName: 'Cagliari', aliases: ['cagliari'] },
    { name: 'Empoli', searchName: 'Empoli', aliases: ['empoli'] },
    { name: 'Udinese', searchName: 'Udinese', aliases: ['udinese'] },
    { name: 'Lecce', searchName: 'Lecce', aliases: ['lecce'] },
    { name: 'Verona', searchName: 'Verona', aliases: ['verona', 'hellas verona'] },
    { name: 'Parma', searchName: 'Parma', aliases: ['parma'] },
    { name: 'Venezia', searchName: 'Venezia', aliases: ['venezia'] },
    { name: 'Como', searchName: 'Como', aliases: ['como'] },
  ],
  
  'ligue 1': [
    { name: 'Paris Saint-Germain', searchName: 'PSG', aliases: ['psg', 'paris'] },
    { name: 'Marseille', searchName: 'Marseille', aliases: ['marseille', 'om'] },
    { name: 'Lyon', searchName: 'Lyon', aliases: ['lyon'] },
    { name: 'Monaco', searchName: 'Monaco', aliases: ['monaco'] },
    { name: 'Lille', searchName: 'Lille', aliases: ['lille'] },
    { name: 'Rennes', searchName: 'Rennes', aliases: ['rennes'] },
    { name: 'Nice', searchName: 'Nice', aliases: ['nice'] },
    { name: 'Lens', searchName: 'Lens', aliases: ['lens'] },
    { name: 'Montpellier', searchName: 'Montpellier', aliases: ['montpellier'] },
    { name: 'Toulouse', searchName: 'Toulouse', aliases: ['toulouse'] },
    { name: 'Strasbourg', searchName: 'Strasbourg', aliases: ['strasbourg'] },
    { name: 'Nantes', searchName: 'Nantes', aliases: ['nantes'] },
    { name: 'Brest', searchName: 'Brest', aliases: ['brest'] },
    { name: 'Le Havre', searchName: 'Le Havre', aliases: ['le havre', 'havre'] },
    { name: 'Auxerre', searchName: 'Auxerre', aliases: ['auxerre'] },
    { name: 'Angers', searchName: 'Angers', aliases: ['angers'] },
    { name: 'Saint-Etienne', searchName: 'St Etienne', aliases: ['saint etienne', 'st etienne'] },
  ],
  
  'champions league': [
    { name: 'Real Madrid', searchName: 'Real Madrid', aliases: ['real madrid'] },
    { name: 'Barcelona', searchName: 'Barcelona', aliases: ['barcelona'] },
    { name: 'Bayern Munich', searchName: 'Bayern Munich', aliases: ['bayern'] },
    { name: 'Manchester City', searchName: 'Man City', aliases: ['man city'] },
    { name: 'Liverpool', searchName: 'Liverpool', aliases: ['liverpool'] },
    { name: 'Paris Saint-Germain', searchName: 'PSG', aliases: ['psg'] },
    { name: 'Inter Milan', searchName: 'Inter', aliases: ['inter'] },
    { name: 'Juventus', searchName: 'Juventus', aliases: ['juventus'] },
    { name: 'Borussia Dortmund', searchName: 'Dortmund', aliases: ['dortmund'] },
    { name: 'Atletico Madrid', searchName: 'Atletico Madrid', aliases: ['atletico'] },
    { name: 'Arsenal', searchName: 'Arsenal', aliases: ['arsenal'] },
    { name: 'Chelsea', searchName: 'Chelsea', aliases: ['chelsea'] },
  ],
  
  'europa league': [
    { name: 'Roma', searchName: 'Roma', aliases: ['roma'] },
    { name: 'Lazio', searchName: 'Lazio', aliases: ['lazio'] },
    { name: 'Ajax', searchName: 'Ajax', aliases: ['ajax'] },
    { name: 'Manchester United', searchName: 'Man Utd', aliases: ['man united'] },
    { name: 'Tottenham', searchName: 'Tottenham', aliases: ['tottenham'] },
    { name: 'Real Sociedad', searchName: 'Real Sociedad', aliases: ['sociedad'] },
    { name: 'Villarreal', searchName: 'Villarreal', aliases: ['villarreal'] },
    { name: 'Eintracht Frankfurt', searchName: 'Frankfurt', aliases: ['frankfurt'] },
    { name: 'Lyon', searchName: 'Lyon', aliases: ['lyon'] },
    { name: 'Rangers', searchName: 'Rangers', aliases: ['rangers'] },
  ],
};

const SUPPORTED_LEAGUES = [
  'champions league', 'europa league', 'conference league',
  'premier league', 'la liga', 'bundesliga', 'serie a', 'ligue 1',
  'eredivisie', 'championship',
];

const EXCLUDED_LEAGUES = [
  'j1 league', 'j2 league', 'j.league', 'japan',
  'eliteserien', 'norwegian', 'norway',
  'swiss super league', 'switzerland',
  'süper lig', 'super lig', 'turkish', 'turkey',
  'scottish', 'scotland', 'spfl',
  'liga portugal', 'primeira liga', 'portugal',
  'k league', 'korean', 'korea',
  'mls', 'major league soccer',
  'a-league', 'australia',
  'liga mx', 'mexico',
  'saudi', 'pro league',
  'chinese super', 'china',
  'brasileirao', 'brazil',
  'liga profesional', 'argentina',
  'belgian', 'belgium', 'jupiler',
  'greek', 'greece',
  'russian', 'russia',
  'ukrainian', 'ukraine',
  'danish', 'denmark', 'superliga',
  'austrian', 'austria',
  'women', 'u19', 'u21', 'u23', 'youth', 'reserve',
];

const LEAGUE_CODE_MAP = {
  'champions league': { code: 'CL', nameKr: '챔피언스리그', sportsDbId: 4480 },
  'europa league': { code: 'EL', nameKr: '유로파리그', sportsDbId: 4481 },
  'conference league': { code: 'ECL', nameKr: 'UEFA 컨퍼런스리그', sportsDbId: 5071 },
  'premier league': { code: 'PL', nameKr: '프리미어리그', sportsDbId: 4328 },
  'la liga': { code: 'PD', nameKr: '라리가', sportsDbId: 4335 },
  'bundesliga': { code: 'BL1', nameKr: '분데스리가', sportsDbId: 4331 },
  'serie a': { code: 'SA', nameKr: '세리에A', sportsDbId: 4332 },
  'ligue 1': { code: 'FL1', nameKr: '리그1', sportsDbId: 4334 },
  'eredivisie': { code: 'DED', nameKr: '에레디비시', sportsDbId: 4337 },
  'championship': { code: 'ELC', nameKr: '챔피언십', sportsDbId: 4329 },
};

// =============================================================================
// 🆕 v34 설정
// =============================================================================
const MAX_POSTS_PER_DAY = 8;       // 목표 포스트 수
const MAX_LINKS_TO_TRY = 30;       // 최대 시도 링크 수
const MAX_PAGES = 3;               // 최대 페이지 수 (새 경기 부족 시)
const MAX_DAYS_AHEAD = 7;
const REQUIRE_THUMBNAIL = true;
const USE_FALLBACK_THUMBNAIL = true;  // 🆕 썸네일 없을 때 팀 배지 사용

let sportsDbEventsCache = {};
let searchEventsCache = {};
let teamBadgeCache = {};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isValidMatchDate(dateStr) {
  if (!dateStr) return true;
  try {
    const matchDate = new Date(dateStr);
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstNow = new Date(now.getTime() + kstOffset);
    const kstToday = new Date(kstNow);
    kstToday.setUTCHours(0, 0, 0, 0);
    const todayStart = new Date(kstToday.getTime() - kstOffset);
    const maxDate = new Date(todayStart);
    maxDate.setDate(maxDate.getDate() + MAX_DAYS_AHEAD);
    if (matchDate < todayStart) return false;
    if (matchDate > maxDate) return false;
    return true;
  } catch {
    return true;
  }
}

function removeAccents(str) {
  const accents = {
    'á': 'a', 'à': 'a', 'ä': 'a', 'â': 'a', 'ã': 'a', 'å': 'a', 'ą': 'a',
    'é': 'e', 'è': 'e', 'ë': 'e', 'ê': 'e', 'ę': 'e', 'ě': 'e',
    'í': 'i', 'ì': 'i', 'ï': 'i', 'î': 'i', 'ı': 'i',
    'ó': 'o', 'ò': 'o', 'ö': 'o', 'ô': 'o', 'õ': 'o', 'ø': 'o', 'ő': 'o',
    'ú': 'u', 'ù': 'u', 'ü': 'u', 'û': 'u', 'ű': 'u',
    'ý': 'y', 'ÿ': 'y', 'ñ': 'n', 'ń': 'n', 'ň': 'n',
    'ç': 'c', 'ć': 'c', 'č': 'c', 'ß': 'ss',
    'ş': 's', 'š': 's', 'ś': 's', 'ž': 'z', 'ź': 'z', 'ż': 'z',
    'ł': 'l', 'ľ': 'l', 'đ': 'd', 'ď': 'd', 'ř': 'r', 'ť': 't',
    'æ': 'ae', 'œ': 'oe', 'þ': 'th',
  };
  return str.split('').map(char => accents[char.toLowerCase()] || char).join('');
}

function findTeamInLeague(rawName, leagueKey) {
  if (!rawName || !leagueKey) return null;
  
  const teams = LEAGUE_TEAMS[leagueKey];
  if (!teams) return null;
  
  const normalized = removeAccents(rawName.toLowerCase().trim());
  
  for (const team of teams) {
    const teamNameNorm = removeAccents(team.name.toLowerCase());
    if (normalized === teamNameNorm) {
      return { displayName: team.name, searchName: team.searchName };
    }
    for (const alias of team.aliases) {
      if (normalized === removeAccents(alias.toLowerCase())) {
        return { displayName: team.name, searchName: team.searchName };
      }
    }
  }
  
  for (const team of teams) {
    for (const alias of team.aliases) {
      const aliasNorm = removeAccents(alias.toLowerCase());
      if (normalized.includes(aliasNorm) || aliasNorm.includes(normalized)) {
        return { displayName: team.name, searchName: team.searchName };
      }
    }
  }
  
  const rawWords = normalized.split(' ').filter(w => w.length >= 3);
  for (const rawWord of rawWords) {
    for (const team of teams) {
      const teamNameNorm = removeAccents(team.name.toLowerCase());
      if (teamNameNorm.includes(rawWord)) {
        return { displayName: team.name, searchName: team.searchName };
      }
      for (const alias of team.aliases) {
        if (removeAccents(alias.toLowerCase()).includes(rawWord)) {
          return { displayName: team.name, searchName: team.searchName };
        }
      }
    }
  }
  
  return null;
}

function normalizeTeamNames(homeRaw, awayRaw, leagueKey) {
  const homeResult = findTeamInLeague(homeRaw, leagueKey);
  const awayResult = findTeamInLeague(awayRaw, leagueKey);
  
  return {
    homeDisplay: homeResult?.displayName || homeRaw,
    homeSearch: homeResult?.searchName || homeRaw,
    awayDisplay: awayResult?.displayName || awayRaw,
    awaySearch: awayResult?.searchName || awayRaw,
  };
}

// =============================================================================
// 🆕 팀 배지 가져오기 (썸네일 대체용)
// =============================================================================
async function fetchTeamBadge(teamName) {
  if (teamBadgeCache[teamName]) {
    return teamBadgeCache[teamName];
  }
  
  try {
    const url = `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_API_KEY}/searchteams.php?t=${encodeURIComponent(teamName)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    
    const data = await res.json();
    if (data.teams?.[0]?.strBadge) {
      const badge = data.teams[0].strBadge;
      teamBadgeCache[teamName] = badge;
      return badge;
    }
    return null;
  } catch {
    return null;
  }
}

// =============================================================================
// 썸네일 검색 (기존 + 대체 로직)
// =============================================================================
async function searchEventByTeams(homeSearch, awaySearch) {
  const cacheKey = `${homeSearch}_vs_${awaySearch}`.toLowerCase();
  if (searchEventsCache[cacheKey]) {
    return searchEventsCache[cacheKey];
  }
  
  const cleanHome = homeSearch.replace(/\./g, '').replace(/\s+/g, '_');
  const cleanAway = awaySearch.replace(/\./g, '').replace(/\s+/g, '_');
  const searchQuery = `${cleanHome}_vs_${cleanAway}`;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  try {
    const url = `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_API_KEY}/searchevents.php?e=${encodeURIComponent(searchQuery)}`;
    console.log(`    🔍 검색: ${searchQuery}`);
    
    const res = await fetch(url);
    if (!res.ok) return null;
    
    const data = await res.json();
    
    if (data.event?.length > 0) {
      const futureEvents = data.event.filter(event => {
        const eventDate = new Date(event.dateEvent);
        return eventDate >= today;
      });
      
      if (futureEvents.length > 0) {
        const bestMatch = futureEvents.reduce((closest, event) => {
          const eventDate = new Date(event.dateEvent);
          const closestDate = new Date(closest.dateEvent);
          return eventDate < closestDate ? event : closest;
        });
        
        console.log(`    📦 결과: ${bestMatch.strEvent} (${bestMatch.dateEvent})`);
        if (bestMatch.strThumb) console.log(`    🖼️ 썸네일 있음!`);
        
        searchEventsCache[cacheKey] = bestMatch;
        return bestMatch;
      }
      
      console.log(`    ⚠️ 미래 경기 없음 (과거 ${data.event.length}개)`);
    }
    
    // 역순 시도
    const reverseQuery = `${cleanAway}_vs_${cleanHome}`;
    console.log(`    🔄 역순: ${reverseQuery}`);
    
    const reverseUrl = `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_API_KEY}/searchevents.php?e=${encodeURIComponent(reverseQuery)}`;
    const reverseRes = await fetch(reverseUrl);
    const reverseData = await reverseRes.json();
    
    if (reverseData.event?.length > 0) {
      const futureEvents = reverseData.event.filter(event => {
        const eventDate = new Date(event.dateEvent);
        return eventDate >= today;
      });
      
      if (futureEvents.length > 0) {
        const bestMatch = futureEvents.reduce((closest, event) => {
          const eventDate = new Date(event.dateEvent);
          const closestDate = new Date(closest.dateEvent);
          return eventDate < closestDate ? event : closest;
        });
        
        console.log(`    📦 역순 결과: ${bestMatch.strEvent} (${bestMatch.dateEvent})`);
        searchEventsCache[cacheKey] = bestMatch;
        return bestMatch;
      }
    }
    
    console.log(`    ⚠️ 결과 없음`);
    return null;
  } catch (e) {
    console.log(`    ⚠️ 검색 실패: ${e.message}`);
    return null;
  }
}

async function fetchLeagueEventsV1(leagueId) {
  if (sportsDbEventsCache[leagueId]) {
    return sportsDbEventsCache[leagueId];
  }
  try {
    const url = `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_API_KEY}/eventsnextleague.php?id=${leagueId}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (data.events?.length > 0) {
      sportsDbEventsCache[leagueId] = data.events;
      console.log(`    📦 리그 경기: ${data.events.length}개`);
      return data.events;
    }
    return [];
  } catch { return []; }
}

function normalizeTeamName(name) {
  if (!name) return '';
  let normalized = removeAccents(name.toLowerCase());
  return normalized
    .replace(/\b(fc|cf|sc|ac|as|ss|us|rc|cd|ud|sd|rcd|afc|ssc|1\.|tsg|vfl|vfb|rb|sv)\b/gi, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function teamsMatch(name1, name2) {
  const n1 = normalizeTeamName(name1);
  const n2 = normalizeTeamName(name2);
  if (!n1 || !n2) return false;
  if (n1 === n2) return true;
  if (n1.length >= 3 && n2.length >= 3) {
    if (n1.includes(n2) || n2.includes(n1)) return true;
  }
  return false;
}

function findMatchingEvent(events, homeTeam, awayTeam) {
  if (!events?.length) return null;
  for (const event of events) {
    const eventHome = event.strHomeTeam || '';
    const eventAway = event.strAwayTeam || '';
    if (teamsMatch(homeTeam, eventHome) && teamsMatch(awayTeam, eventAway)) {
      return event;
    }
    if (teamsMatch(homeTeam, eventAway) && teamsMatch(awayTeam, eventHome)) {
      return event;
    }
  }
  return null;
}

async function fetchThumbnail(homeSearch, awaySearch, homeDisplay, awayDisplay, leagueKey) {
  // 1단계: searchevents.php
  const searchResult = await searchEventByTeams(homeSearch, awaySearch);
  if (searchResult) {
    if (!isValidMatchDate(searchResult.dateEvent)) {
      return { skip: true, reason: 'date_out_of_range' };
    }
    if (searchResult.strThumb) {
      return { 
        thumbnail: searchResult.strThumb + '/medium', 
        type: 'event', 
        source: 'searchevents', 
        matchDate: searchResult.dateEvent 
      };
    }
    if (searchResult.strPoster) {
      return { 
        thumbnail: searchResult.strPoster + '/medium', 
        type: 'poster', 
        source: 'searchevents', 
        matchDate: searchResult.dateEvent 
      };
    }
  }
  
  await delay(300);
  
  // 2단계: eventsnextleague.php
  const leagueInfo = LEAGUE_CODE_MAP[leagueKey];
  if (leagueInfo?.sportsDbId) {
    const events = await fetchLeagueEventsV1(leagueInfo.sportsDbId);
    const matchedEvent = findMatchingEvent(events, homeDisplay, awayDisplay);
    if (matchedEvent) {
      console.log(`    🎯 리그 매칭: ${matchedEvent.strHomeTeam} vs ${matchedEvent.strAwayTeam}`);
      if (!isValidMatchDate(matchedEvent.dateEvent)) {
        return { skip: true, reason: 'date_out_of_range' };
      }
      if (matchedEvent.strThumb) {
        return { 
          thumbnail: matchedEvent.strThumb + '/medium', 
          type: 'event', 
          source: 'eventsnextleague', 
          matchDate: matchedEvent.dateEvent 
        };
      }
      if (matchedEvent.strPoster) {
        return { 
          thumbnail: matchedEvent.strPoster + '/medium', 
          type: 'poster', 
          source: 'eventsnextleague', 
          matchDate: matchedEvent.dateEvent 
        };
      }
    }
  }
  
  // 🆕 3단계: 팀 배지로 대체 (옵션)
  if (USE_FALLBACK_THUMBNAIL) {
    console.log(`    🔄 팀 배지 검색...`);
    const homeBadge = await fetchTeamBadge(homeDisplay);
    if (homeBadge) {
      console.log(`    🏷️ 홈팀 배지 사용: ${homeDisplay}`);
      return {
        thumbnail: homeBadge,
        type: 'badge',
        source: 'team_badge',
        matchDate: null
      };
    }
    
    const awayBadge = await fetchTeamBadge(awayDisplay);
    if (awayBadge) {
      console.log(`    🏷️ 원정팀 배지 사용: ${awayDisplay}`);
      return {
        thumbnail: awayBadge,
        type: 'badge',
        source: 'team_badge',
        matchDate: null
      };
    }
  }
  
  return null;
}

// =============================================================================
// 팀명 추출 함수들
// =============================================================================
function extractTeamsFromUrl(url) {
  if (!url) return null;
  
  const urlMatch = url.match(/\/football-match-previews\/(\d+)-(.+)/);
  if (!urlMatch) return null;
  
  let slug = urlMatch[2];
  
  slug = slug
    .replace(/-in-\w+-clash$/i, '')
    .replace(/-at-[\w-]+$/i, '')
    .replace(/-in-[\w-]+$/i, '')
    .replace(/-at-the-[\w-]+$/i, '')
    .replace(/-after-[\w-]+$/i, '');
  
  const patterns = [
    /^(.+?)-vs-(.+)$/i,
    /^(.+?)-face-(.+)$/i,
    /^(.+?)-meets?-(.+)$/i,
    /^(.+?)-host-(.+)$/i,
    /^(.+?)-against-(.+)$/i,
    /^(.+?)-and-(.+?)-(?:meet|clash|battle|face)/i,
  ];
  
  for (const pattern of patterns) {
    const match = slug.match(pattern);
    if (match) {
      return {
        homeTeam: capitalizeWords(match[1].replace(/-/g, ' ')),
        awayTeam: capitalizeWords(match[2].replace(/-/g, ' ')),
        source: 'url'
      };
    }
  }
  
  return null;
}

function capitalizeWords(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

function extractTeamsFromTitle(title, url) {
  // URL에서 먼저 시도
  const urlResult = extractTeamsFromUrl(url);
  if (urlResult) {
    console.log(`    🔗 URL 추출: ${urlResult.homeTeam} vs ${urlResult.awayTeam}`);
    return urlResult;
  }
  
  if (!title) return null;
  
  const patterns = [
    /^(.+?)\s+vs\.?\s+(.+)$/i,
    /^(.+?)\s+v\s+(.+)$/i,
    /^(.+?)\s+against\s+(.+)$/i,
    /^(.+?)\s+face\s+(.+)$/i,
    /^(.+?)\s+host\s+(.+)$/i,
    /^(.+?)\s+and\s+(.+?)\s+(?:clash|meet|battle)/i,
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      return {
        homeTeam: match[1].trim(),
        awayTeam: match[2].trim(),
        source: 'title'
      };
    }
  }
  
  return null;
}

// =============================================================================
// 리그 감지 및 필터링
// =============================================================================
function detectLeague(title, url) {
  const combined = ((title || '') + ' ' + (url || '')).toLowerCase();
  
  for (const league of SUPPORTED_LEAGUES) {
    if (combined.includes(league.replace(/\s+/g, '-')) || combined.includes(league)) {
      return league;
    }
  }
  
  if (combined.match(/\b(frankfurt|dortmund|bayern|leipzig|werder|union-berlin|pauli|freiburg|hoffenheim|leverkusen|mainz|koln|heidenheim|augsburg|bochum|wolfsburg|gladbach|stuttgart|hamburger)\b/)) {
    return 'bundesliga';
  }
  if (combined.match(/\b(ajax|psv|feyenoord|twente|utrecht|nijmegen|groningen|heerenveen|alkmaar|volendam|breda|zwolle)\b/)) {
    return 'eredivisie';
  }
  if (combined.match(/\b(leicester|west-brom|leeds|sunderland|burnley|sheffield|middlesbrough|norwich|coventry|watford)\b/)) {
    return 'championship';
  }
  if (combined.match(/\b(arsenal|chelsea|liverpool|manchester|tottenham|newcastle|aston-villa|brighton|fulham|brentford|bournemouth|crystal-palace|everton|nottingham|west-ham|wolves|ipswich|southampton)\b/)) {
    return 'premier league';
  }
  if (combined.match(/\b(juventus|milan|inter|napoli|roma|lazio|fiorentina|atalanta|bologna|torino|monza|genoa|cagliari|empoli|udinese)\b/)) {
    return 'serie a';
  }
  if (combined.match(/\b(barcelona|real-madrid|atletico|sevilla|villarreal|sociedad|betis|valencia|athletic-bilbao|osasuna|celta|mallorca|getafe)\b/)) {
    return 'la liga';
  }
  if (combined.match(/\b(psg|paris|marseille|lyon|monaco|lille|rennes|nice|lens|montpellier|toulouse|strasbourg|nantes|brest)\b/)) {
    return 'ligue 1';
  }
  
  return null;
}

function filterSupportedLeagues(links) {
  const supported = [];
  let excludedCount = 0;
  
  for (const link of links) {
    const urlLower = (link.link || '').toLowerCase();
    const titleLower = (link.title || '').toLowerCase();
    
    let isExcluded = false;
    for (const excluded of EXCLUDED_LEAGUES) {
      if (urlLower.includes(excluded.replace(/\s+/g, '-')) || titleLower.includes(excluded)) {
        isExcluded = true;
        excludedCount++;
        break;
      }
    }
    if (isExcluded) continue;
    
    const detectedLeague = detectLeague(link.title, link.link);
    
    if (detectedLeague) {
      link.leagueKey = detectedLeague;
      supported.push(link);
    }
  }
  
  console.log(`  🎯 지원: ${supported.length}개, 제외: ${excludedCount}개`);
  return supported;
}

// =============================================================================
// 🆕 다중 페이지 링크 수집
// =============================================================================
async function getPreviewLinks(browser, existingUrls, pageNum = 1) {
  const allLinks = [];
  const seenUrls = new Set();
  
  const page = await browser.newPage();
  page.on('pageerror', () => {});
  page.on('error', () => {});
  
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  
  // 🆕 페이지 번호 지원
  const previewUrl = pageNum === 1 
    ? 'https://www.forebet.com/en/football-match-previews'
    : `https://www.forebet.com/en/football-match-previews?page=${pageNum}`;
  
  console.log(`  📖 ${previewUrl} (페이지 ${pageNum})`);
  
  try {
    await page.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log(`    ✅ 페이지 로드 완료`);
  } catch (e) {
    console.log(`    ⚠️ 로드 경고`);
  }
  
  await delay(5000);
  
  const pageData = await page.evaluate(() => {
    const links = [];
    const allAnchors = document.querySelectorAll('a');
    
    allAnchors.forEach(a => {
      const href = a.href || '';
      if (!href.match(/\/football-match-previews\/\d+-/)) return;
      
      let title = a.textContent?.trim() || '';
      const parent = a.closest('.rcnt, .preview-item, article, div');
      if (parent) {
        const titleEl = parent.querySelector('h2, h3, h4, .title, .steep_t_title');
        if (titleEl) {
          const parentTitle = titleEl.textContent?.trim() || '';
          if (parentTitle.length > title.length) {
            title = parentTitle;
          }
        }
      }
      
      links.push({ title: title || href, link: href });
    });
    
    return { links, totalAnchors: allAnchors.length };
  }).catch(() => ({ links: [], totalAnchors: 0 }));
  
  console.log(`    🔍 전체: ${pageData.totalAnchors}, 미리보기: ${pageData.links.length}`);
  
  let newCount = 0;
  let duplicateCount = 0;
  
  for (const link of pageData.links) {
    if (!seenUrls.has(link.link)) {
      seenUrls.add(link.link);
      
      // 🆕 DB 중복 체크
      if (existingUrls.has(link.link)) {
        duplicateCount++;
        continue;
      }
      
      allLinks.push(link);
      newCount++;
    }
  }
  
  console.log(`    ✅ 새 링크: ${newCount}개, DB 중복: ${duplicateCount}개`);
  
  await page.close();
  return allLinks;
}

// =============================================================================
// 프리뷰 상세 스크래핑
// =============================================================================
function extractPreviewText(fullText) {
  const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const paragraphs = [];
  let started = false;
  
  for (const line of lines) {
    if (!started && line.length >= 100) started = true;
    if (!started) continue;
    if (line.includes('Probable Lineups')) break;
    if (line.includes('Prediction')) break;
    if (line.includes('©')) break;
    if (line.includes('Related Articles')) break;
    if (line === 'Recent Form') continue;
    if (line === 'Recent History') continue;
    if (line.length >= 80) paragraphs.push(line);
  }
  
  return paragraphs;
}

async function scrapePreviewDetail(browser, previewInfo, teams) {
  const page = await browser.newPage();
  page.on('pageerror', () => {});
  page.on('error', () => {});
  
  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await page.goto(previewInfo.link, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    await delay(4000);
    
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
      
      return {
        fullText: articleText || fullText,
        fullTextLength: (articleText || fullText).length,
      };
    }).catch(() => ({ fullText: '', fullTextLength: 0 }));
    
    await page.close();
    
    const paragraphs = extractPreviewText(pageData.fullText);
    const previewText = paragraphs.join('\n\n');
    const leagueInfo = LEAGUE_CODE_MAP[previewInfo.leagueKey] || { code: 'OTHER', nameKr: '기타' };
    
    return {
      homeTeam: teams.homeDisplay,
      awayTeam: teams.awayDisplay,
      previewParagraphs: paragraphs,
      previewText,
      leagueCode: leagueInfo.code,
      leagueKr: leagueInfo.nameKr,
      leagueKey: previewInfo.leagueKey,
      sourceUrl: previewInfo.link,
      originalTitle: previewInfo.title,
      fullTextLength: pageData.fullTextLength,
      scrapedAt: new Date().toISOString()
    };
    
  } catch (e) {
    console.log(`    ❌ Error: ${e.message.substring(0, 50)}`);
    await page.close();
    return null;
  }
}

// =============================================================================
// 🆕 메인 스크래핑 함수 (개선된 로직)
// =============================================================================
async function scrapeForebetPreviews() {
  console.log('🚀 Forebet Scraper v34 (DB 사전 체크 + 다중 페이지)');
  console.log(`🔑 API Key: ${SPORTSDB_API_KEY} (무료)`);
  console.log('📅 ' + new Date().toISOString());
  console.log(`🎯 지원 리그: ${SUPPORTED_LEAGUES.length}개`);
  console.log(`📊 목표 포스트: ${MAX_POSTS_PER_DAY}개\n`);
  
  // 🆕 1단계: DB에서 기존 URL 가져오기
  const existingUrls = await getExistingSourceUrls();
  
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
    const allPreviews = [];
    let totalTried = 0;
    let skippedByDate = 0;
    let skippedNoThumb = 0;
    let skippedNoTeams = 0;
    let skippedDbDuplicate = 0;
    
    // 🆕 2단계: 페이지별로 링크 수집 및 처리
    for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
      // 목표 달성 시 종료
      if (allPreviews.length >= MAX_POSTS_PER_DAY) {
        console.log(`\n🎯 목표 달성! ${allPreviews.length}개 수집 완료`);
        break;
      }
      
      // 최대 시도 횟수 초과 시 종료
      if (totalTried >= MAX_LINKS_TO_TRY) {
        console.log(`\n⏹️ 최대 시도 횟수 도달: ${totalTried}개`);
        break;
      }
      
      console.log(`\n${'='.repeat(50)}`);
      console.log(`📄 페이지 ${pageNum} 처리 중...`);
      
      const allLinks = await getPreviewLinks(browser, existingUrls, pageNum);
      if (!allLinks.length) {
        console.log(`  ⚠️ 페이지 ${pageNum}에서 새 링크 없음`);
        continue;
      }
      
      const supportedLinks = filterSupportedLeagues(allLinks);
      if (!supportedLinks.length) {
        console.log(`  ⚠️ 지원 리그 링크 없음`);
        continue;
      }
      
      // 남은 필요 개수만큼만 처리
      const remaining = MAX_POSTS_PER_DAY - allPreviews.length;
      const linksToProcess = supportedLinks.slice(0, Math.min(remaining * 2, MAX_LINKS_TO_TRY - totalTried));
      
      console.log(`\n📖 ${linksToProcess.length}개 스크래핑 시작...\n`);
      
      for (let i = 0; i < linksToProcess.length; i++) {
        const preview = linksToProcess[i];
        totalTried++;
        
        console.log(`[${totalTried}] ${preview.leagueKey}`);
        console.log(`    🔗 ${preview.link.substring(0, 70)}...`);
        
        const rawTeams = extractTeamsFromTitle(preview.title, preview.link);
        if (!rawTeams) {
          console.log(`    ⚠️ 팀명 추출 실패`);
          skippedNoTeams++;
          continue;
        }
        
        const normalized = normalizeTeamNames(rawTeams.homeTeam, rawTeams.awayTeam, preview.leagueKey);
        console.log(`    📍 ${normalized.homeDisplay} vs ${normalized.awayDisplay}`);
        
        const data = await scrapePreviewDetail(browser, preview, {
          homeDisplay: normalized.homeDisplay,
          awayDisplay: normalized.awayDisplay,
        });
        
        if (data) {
          const thumbResult = await fetchThumbnail(
            normalized.homeSearch,
            normalized.awaySearch,
            normalized.homeDisplay,
            normalized.awayDisplay,
            data.leagueKey
          );
          
          if (thumbResult?.skip) {
            skippedByDate++;
            continue;
          }
          
          if (thumbResult) {
            data.thumbnail = thumbResult.thumbnail;
            data.thumbnailType = thumbResult.type;
            data.thumbnailSource = thumbResult.source;
            if (thumbResult.matchDate) data.matchDate = thumbResult.matchDate;
            
            console.log(`    📸 ${thumbResult.type} (${thumbResult.source})`);
            allPreviews.push(data);
            console.log(`    ✅ ${data.leagueKr} | 📝 ${data.previewText.length}자 | 총 ${allPreviews.length}개`);
            
            // 목표 달성 체크
            if (allPreviews.length >= MAX_POSTS_PER_DAY) {
              break;
            }
          } else if (!REQUIRE_THUMBNAIL) {
            allPreviews.push(data);
            console.log(`    ✅ 썸네일 없이 포함 | 총 ${allPreviews.length}개`);
          } else {
            console.log(`    ⏭️ 썸네일 없음`);
            skippedNoThumb++;
          }
        }
        
        await delay(2500);
      }
    }
    
    await browser.close();
    
    // 결과 출력
    console.log(`\n${'='.repeat(50)}`);
    console.log('📊 최종 결과:');
    console.log(`   ✅ 수집 성공: ${allPreviews.length}개`);
    console.log(`   🔄 총 시도: ${totalTried}개`);
    console.log(`   ⏭️ 팀명 추출 실패: ${skippedNoTeams}개`);
    console.log(`   ⏭️ 날짜 범위 외: ${skippedByDate}개`);
    console.log(`   ⏭️ 썸네일 없음: ${skippedNoThumb}개`);
    console.log(`   🗂️ DB 중복 (사전 필터): existingUrls.size개`);
    
    fs.writeFileSync('scraped-previews.json', JSON.stringify(allPreviews, null, 2));
    console.log(`\n💾 Saved to scraped-previews.json`);
    
    return allPreviews;
    
  } catch (error) {
    console.error('❌ Error:', error);
    await browser.close();
    throw error;
  }
}

// =============================================================================
// 실행
// =============================================================================
scrapeForebetPreviews()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });