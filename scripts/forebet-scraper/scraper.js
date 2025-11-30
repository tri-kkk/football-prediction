/**
 * Forebet Match Preview Scraper v17
 * - 페이지에서 리그 정보 직접 추출 (정확도 향상)
 * - 썸네일 없으면 스킵
 * - 여러 페이지 스크래핑 (0, 20, 40, 60)
 * - puppeteer-extra + stealth plugin
 * - TheSportsDB v2 Premium API
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const fs = require('fs');

// TheSportsDB API 키 (환경변수 또는 기본값)
const SPORTSDB_API_KEY = process.env.THESPORTSDB_API_KEY || '166885';

// ⚽ Forebet 제공 전체 리그
const SUPPORTED_LEAGUES = [
  'champions league', 'europa league', 'conference league', 'nations league',
  'premier league', 'championship',
  'la liga', 'bundesliga', 'serie a', 'ligue 1',
  'primeira liga', 'eredivisie', 'allsvenskan',
];

// 리그 코드 + 한글명 + TheSportsDB ID
const LEAGUE_CODE_MAP = {
  'champions league': { code: 'CL', nameKr: '챔피언스리그', sportsDbId: 4480 },
  'europa league': { code: 'EL', nameKr: '유로파리그', sportsDbId: 4481 },
  'conference league': { code: 'ECL', nameKr: 'UEFA 컨퍼런스리그', sportsDbId: 5071 },
  'nations league': { code: 'NL', nameKr: 'UEFA 네이션스리그', sportsDbId: 4490 },
  'premier league': { code: 'PL', nameKr: '프리미어리그', sportsDbId: 4328 },
  'championship': { code: 'ELC', nameKr: '챔피언십', sportsDbId: 4329 },
  'la liga': { code: 'PD', nameKr: '라리가', sportsDbId: 4335 },
  'bundesliga': { code: 'BL1', nameKr: '분데스리가', sportsDbId: 4331 },
  'serie a': { code: 'SA', nameKr: '세리에A', sportsDbId: 4332 },
  'ligue 1': { code: 'FL1', nameKr: '리그1', sportsDbId: 4334 },
  'primeira liga': { code: 'PPL', nameKr: '프리메이라리가', sportsDbId: 4344 },
  'eredivisie': { code: 'DED', nameKr: '에레디비시', sportsDbId: 4337 },
  'allsvenskan': { code: 'ASN', nameKr: '알스벤스칸', sportsDbId: 4350 },
};

const PREVIEWS_URLS = [
  'https://www.forebet.com/en/football-match-previews',
  'https://www.forebet.com/en/football-match-previews?start=20',
  'https://www.forebet.com/en/football-match-previews?start=40',
  'https://www.forebet.com/en/football-match-previews?start=60',
  'https://www.forebet.com/en/football-match-previews?start=80',
  'https://www.forebet.com/en/football-match-previews?start=100',
];

// TheSportsDB 경기 캐시 (리그별)
let sportsDbEventsCache = {};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
  
  for (const event of events) {
    const eventHome = event.strHomeTeam || '';
    const eventAway = event.strAwayTeam || '';
    
    // 정방향 매칭
    if (teamsMatch(homeTeam, eventHome) && teamsMatch(awayTeam, eventAway)) {
      return event;
    }
    
    // 역방향 매칭 (홈/어웨이 뒤바뀐 경우)
    if (teamsMatch(homeTeam, eventAway) && teamsMatch(awayTeam, eventHome)) {
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
    
    // 우선순위: strThumb > strPoster > strBanner > strSquare
    if (matchedEvent.strThumb) {
      return { thumbnail: matchedEvent.strThumb + '/medium', type: 'event', source: 'v2-league' };
    }
    if (matchedEvent.strPoster) {
      return { thumbnail: matchedEvent.strPoster + '/medium', type: 'poster', source: 'v2-league' };
    }
    if (matchedEvent.strBanner) {
      return { thumbnail: matchedEvent.strBanner, type: 'banner', source: 'v2-league' };
    }
    if (matchedEvent.strSquare) {
      return { thumbnail: matchedEvent.strSquare, type: 'square', source: 'v2-league' };
    }
  }
  
  return null;
}

/**
 * TheSportsDB에서 썸네일 가져오기 (팀 검색 fallback)
 */
async function fetchThumbnailFromTeam(homeTeam) {
  try {
    const teamUrl = `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_API_KEY}/searchteams.php?t=${encodeURIComponent(homeTeam)}`;
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
  const invalidTeamNames = ['efficient', 'lifeline', 'against', 'again', 'perfect', 'statement', 'response'];
  if (invalidTeamNames.includes(cleaned.toLowerCase())) {
    return '';
  }
  
  return cleaned.trim();
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
  ];
  
  for (const pattern of patterns) {
    const match = normalizedTitle.match(pattern);
    if (match) {
      let home = cleanTeamName(match[1]);
      let away = cleanTeamName(match[2]);
      if (home && away && home.length > 1 && away.length > 1) {
        return { homeTeam: home, awayTeam: away };
      }
    }
  }
  
  return null;
}

function capitalizeWords(str) {
  return str.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * 프리뷰 목록 수집 (여러 페이지)
 */
async function getPreviewLinks(browser) {
  console.log('📋 Fetching preview list...');
  const allPreviews = [];
  const seenLinks = new Set();
  
  for (const url of PREVIEWS_URLS) {
    console.log(`  📄 페이지: ${url.includes('start=') ? url.split('start=')[1] : '0'}`);
    
    const page = await browser.newPage();
    
    page.on('pageerror', () => {});
    page.on('error', () => {});
    
    // User-Agent 강화 (봇 감지 우회)
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // 추가 헤더 설정
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    });
    
    await page.setRequestInterception(true);
    page.on('request', req => {
      if (['image', 'stylesheet', 'font'].includes(req.resourceType())) req.abort();
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
        
        // 리그 정보 찾기 (카드 내에서)
        let league = '';
        const leagueEl = card.querySelector('.league_link, .leagueName, [class*="league"]');
        if (leagueEl) {
          league = leagueEl.textContent?.trim() || '';
        }
        
        // 카드 전체 텍스트에서 리그 찾기
        if (!league) {
          const cardText = card.textContent || '';
          const leaguePatterns = [
            'Premier League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1',
            'Champions League', 'Europa League', 'Conference League', 'Nations League',
            'Championship', 'Primeira Liga', 'Eredivisie', 'Allsvenskan'
          ];
          for (const pattern of leaguePatterns) {
            if (cardText.includes(pattern)) {
              league = pattern;
              break;
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
              const leaguePatterns = [
                'Premier League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1',
                'Champions League', 'Europa League', 'Conference League', 'Nations League',
                'Championship', 'Primeira Liga', 'Eredivisie'
              ];
              for (const pattern of leaguePatterns) {
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
 * 지원 리그 필터 + 리그 키 추가
 */
function filterSupportedLeagues(previews) {
  const filtered = [];
  
  for (const p of previews) {
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
    
    if (foundLeague) {
      filtered.push({ ...p, leagueKey: foundLeague });
    }
  }
  
  console.log(`  🎯 Supported leagues: ${filtered.length}`);
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
      return {
        fullText: articleText || fullText,
        fullTextLength: (articleText || fullText).length,
      };
    });
    
    await page.close();
    
    const paragraphs = extractPreviewText(pageData.fullText);
    const previewText = paragraphs.join('\n\n');
    const leagueInfo = LEAGUE_CODE_MAP[previewInfo.leagueKey] || { code: 'OTHER', nameKr: '기타' };
    
    return {
      homeTeam: teams.homeTeam,
      awayTeam: teams.awayTeam,
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
    console.log(`    ❌ Error: ${e.message}`);
    await page.close();
    return null;
  }
}

/**
 * 메인
 */
async function scrapeForebetPreviews() {
  console.log('🚀 Forebet Scraper v17 (League Detection Improved)');
  console.log(`🔑 API Key: ${SPORTSDB_API_KEY.substring(0, 3)}***`);
  console.log('📅 ' + new Date().toISOString());
  console.log(`🎯 지원 리그: ${SUPPORTED_LEAGUES.length}개\n`);
  
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
    
    console.log(`\n📖 Scraping ${supportedLinks.length} previews...\n`);
    
    const allPreviews = [];
    
    for (let i = 0; i < supportedLinks.length; i++) {
      const preview = supportedLinks[i];
      console.log(`[${i+1}/${supportedLinks.length}] ${preview.title.substring(0, 55)}...`);
      
      const teams = extractTeamsFromTitle(preview.title, preview.link);
      if (!teams) {
        console.log(`    ⚠️ 팀명 추출 실패`);
        continue;
      }
      console.log(`    📍 ${teams.homeTeam} vs ${teams.awayTeam}`);
      
      const data = await scrapePreviewDetail(browser, preview, teams);
      
      if (data) {
        const thumbResult = await fetchThumbnail(data.homeTeam, data.awayTeam, data.leagueKey);
        if (thumbResult) {
          data.thumbnail = thumbResult.thumbnail;
          data.thumbnailType = thumbResult.type;
          data.thumbnailSource = thumbResult.source;
          console.log(`    📸 ${thumbResult.type} (${thumbResult.source})`);
          allPreviews.push(data);
          console.log(`    ✅ ${data.leagueKr} | 📝 ${data.previewText.length}자`);
        } else {
          console.log(`    ⏭️ 썸네일 없음 - 스킵`);
        }
      }
      
      await delay(2500);
    }
    
    await browser.close();
    
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📊 결과: ${allPreviews.length}개 (썸네일 있는 것만)`);
    
    const thumbStats = { 'v2-league': 0, 'team-search': 0 };
    allPreviews.forEach(p => {
      if (p.thumbnailSource === 'v2-league') thumbStats['v2-league']++;
      else if (p.thumbnailSource === 'team-search') thumbStats['team-search']++;
    });
    console.log(`📸 썸네일 소스:`);
    console.log(`   - v2 리그 기반: ${thumbStats['v2-league']}개`);
    console.log(`   - 팀 검색: ${thumbStats['team-search']}개`);
    
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
