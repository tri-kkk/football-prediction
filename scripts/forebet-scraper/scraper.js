/**
 * Forebet Match Preview Scraper v11
 * - 팀명 아포스트로피 완전 제거
 * - 본문 추출 디버깅 강화
 * - Forebet 전체 리그 지원
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

// ⚽ Forebet 제공 전체 리그
const SUPPORTED_LEAGUES = [
  'champions league', 'europa league', 'conference league', 'nations league',
  'premier league', 'championship',
  'la liga', 'bundesliga', 'serie a', 'ligue 1',
  'primeira liga', 'eredivisie',
];

const LEAGUE_CODE_MAP = {
  'champions league': { code: 'CL', nameKr: '챔피언스리그' },
  'europa league': { code: 'EL', nameKr: '유로파리그' },
  'conference league': { code: 'ECL', nameKr: 'UEFA 컨퍼런스리그' },
  'nations league': { code: 'NL', nameKr: 'UEFA 네이션스리그' },
  'premier league': { code: 'PL', nameKr: '프리미어리그' },
  'championship': { code: 'ELC', nameKr: '챔피언십' },
  'la liga': { code: 'PD', nameKr: '라리가' },
  'bundesliga': { code: 'BL1', nameKr: '분데스리가' },
  'serie a': { code: 'SA', nameKr: '세리에A' },
  'ligue 1': { code: 'FL1', nameKr: '리그1' },
  'primeira liga': { code: 'PPL', nameKr: '프리메이라리가' },
  'eredivisie': { code: 'DED', nameKr: '에레디비시' },
};

const PREVIEWS_URL = 'https://www.forebet.com/en/football-match-previews';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 팀명 정리 - 모든 아포스트로피 변형 처리
 */
function cleanTeamName(name) {
  if (!name) return '';
  
  let cleaned = name.trim();
  
  // 모든 종류의 아포스트로피 제거 (끝에 's 또는 ' 만 있는 경우)
  // U+0027 ' 
  // U+2019 '
  // U+0060 `
  // U+00B4 ´
  // U+02BC ʼ
  // U+2032 ′
  cleaned = cleaned.replace(/['`'´ʼ′]s$/gi, '');  // 's 제거
  cleaned = cleaned.replace(/['`'´ʼ′]$/gi, '');   // 남은 ' 제거
  
  // In-Form 변형들 제거 (다양한 하이픈)
  cleaned = cleaned.replace(/^In[-‑–—]?Form\s*/gi, '');
  cleaned = cleaned.replace(/\s*In[-‑–—]?Form$/gi, '');
  
  // Familiar 제거
  cleaned = cleaned.replace(/^Familiar\s*/gi, '');
  
  // 불필요 단어
  const removePatterns = [
    /\s*Home Steel.*$/i,
    /\s*Firepower.*$/i,
    /\s*European Street.*$/i,
    /\s*Perfect.*$/i,
    /\s*Statement.*$/i,
    /\s*Response.*$/i,
    /^Form\s+/i,
    /\s+Form$/i,
  ];
  
  for (const pattern of removePatterns) {
    cleaned = cleaned.replace(pattern, '');
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
  const verbs = 'chase|set|seek|aim|look|meet|meets|face|host|battle|clash|eye|target|hunt|bid|hope|need|want|ready|prepare|travel|welcome|take|go|gear|brace|steel|firepower';
  
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
  
  return null;
}

/**
 * 제목에서 팀명 추출
 */
function extractTeamsFromTitle(title, url) {
  // URL에서 먼저 시도
  const urlResult = extractTeamsFromUrl(url);
  if (urlResult && urlResult.homeTeam && urlResult.awayTeam) {
    return urlResult;
  }
  
  // 제목 전처리 - 특수 아포스트로피를 일반 아포스트로피로
  const normalizedTitle = title.replace(/['´ʼ′]/g, "'");
  
  const patterns = [
    // "A and B Set For..."
    /^(.+?)\s+(?:and|vs\.?|v)\s+(.+?)\s+(?:Set|Chase|Seek|Aim|Look|Meet|Face|Host|Battle|Clash|Eye|Target|Ready|Go|Travel)/i,
    
    // "A's Home Steel Meets B's Firepower"
    /^(.+?)(?:'s)?\s+Home Steel Meets\s+(.+?)(?:'s)?\s+Firepower/i,
    
    // "A's ... Meets B's ..."
    /^(.+?)(?:'s)?\s+.*?(?:Meets?|Faces?|Hosts?|Welcomes?)\s+(.+?)(?:'s)?(?:\s|$)/i,
    
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
 * TheSportsDB 썸네일
 */
async function fetchThumbnail(homeTeam, awayTeam) {
  try {
    const homeNorm = homeTeam.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const awayNorm = awayTeam.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    
    const searchQuery = `${homeNorm}_vs_${awayNorm}`;
    const eventUrl = `https://www.thesportsdb.com/api/v1/json/3/searchevents.php?e=${encodeURIComponent(searchQuery)}`;
    
    const eventRes = await fetch(eventUrl);
    const eventData = await eventRes.json();
    
    if (eventData.event?.length > 0) {
      const event = eventData.event[0];
      if (event.strThumb) return { thumbnail: event.strThumb + '/medium', type: 'event' };
      if (event.strPoster) return { thumbnail: event.strPoster + '/medium', type: 'poster' };
    }
    
    await delay(300);
    
    const teamUrl = `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(homeTeam)}`;
    const teamRes = await fetch(teamUrl);
    const teamData = await teamRes.json();
    
    if (teamData.teams?.length > 0 && teamData.teams[0].strBadge) {
      return { thumbnail: teamData.teams[0].strBadge, type: 'badge' };
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * 프리뷰 목록 수집
 */
async function getPreviewLinks(browser) {
  console.log('📋 Fetching preview list...');
  const page = await browser.newPage();
  
  page.on('pageerror', () => {});
  page.on('error', () => {});
  
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  await page.setRequestInterception(true);
  page.on('request', req => {
    if (['image', 'stylesheet', 'font'].includes(req.resourceType())) req.abort();
    else req.continue();
  });
  
  await page.goto(PREVIEWS_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await delay(2000);
  
  const previews = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('a[href*="/football-match-previews/"]').forEach(el => {
      const link = el.href;
      if (link?.includes('/football-match-previews/') && !link.endsWith('/football-match-previews')) {
        results.push({ link, title: el.textContent?.trim() || '' });
      }
    });
    return [...new Map(results.map(r => [r.link, r])).values()];
  });
  
  console.log(`  📄 Found ${previews.length} total links`);
  await page.close();
  return previews;
}

/**
 * 지원 리그 필터
 */
function filterSupportedLeagues(previews) {
  const filtered = previews.filter(p => 
    SUPPORTED_LEAGUES.some(league => p.title.toLowerCase().includes(league))
  );
  console.log(`  🎯 Supported leagues: ${filtered.length}`);
  return filtered;
}

/**
 * 본문 추출 (개선된 버전)
 */
function extractPreviewText(fullText) {
  const paragraphs = [];
  const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  let started = false;
  
  for (const line of lines) {
    // 시작점: 100자 이상 문장
    if (!started && line.length >= 100) {
      started = true;
    }
    
    if (!started) continue;
    
    // 종료 조건
    if (line.includes('Probable Lineups')) break;
    if (line.includes('Prediction')) break;
    if (line.includes('©')) break;
    if (line.includes('Related Articles')) break;
    if (line.includes('More Previews')) break;
    if (line.includes('Share this')) break;
    if (line.includes('Goalkeeper:')) break;
    if (line.includes('Defenders:')) break;
    
    // 섹션 헤더 스킵
    if (line === 'Recent Form') continue;
    if (line === 'Recent History') continue;
    if (line === 'Overall Performance') continue;
    if (line === 'Main Trends') continue;
    
    // 80자 이상 문단만
    if (line.length >= 80) {
      paragraphs.push(line);
    }
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
    
    // 이미지/스타일 차단 해제 (콘텐츠 로딩에 영향줄 수 있음)
    await page.goto(previewInfo.link, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // 더 긴 대기
    await delay(4000);
    
    // 스크롤로 동적 콘텐츠 로드
    try {
      await page.evaluate(() => {
        window.scrollTo(0, 1000);
      });
    } catch {}
    await delay(2000);
    
    const pageData = await page.evaluate(() => {
      // 전체 텍스트
      const fullText = document.body.innerText || '';
      
      // 특정 컨테이너 시도
      let articleText = '';
      const containers = [
        document.querySelector('article'),
        document.querySelector('.preview-content'),
        document.querySelector('.article-content'),
        document.querySelector('.entry-content'),
        document.querySelector('.post-content'),
        document.querySelector('.content-area'),
        document.querySelector('main'),
      ];
      
      for (const container of containers) {
        if (container && container.innerText?.length > 500) {
          articleText = container.innerText;
          break;
        }
      }
      
      return {
        fullText: articleText || fullText,
        fullTextLength: (articleText || fullText).length,
        prediction: document.querySelector('.prediction, .tip')?.textContent?.trim() || '',
        league: document.querySelector('.league, .competition')?.textContent?.trim() || '',
        matchDate: document.querySelector('.date, time')?.textContent?.trim() || '',
      };
    });
    
    await page.close();
    
    // 본문 추출
    const paragraphs = extractPreviewText(pageData.fullText);
    const previewText = paragraphs.join('\n\n');
    
    // 리그 매칭
    const titleLower = previewInfo.title.toLowerCase();
    let leagueInfo = { code: 'OTHER', nameKr: '기타' };
    for (const [key, val] of Object.entries(LEAGUE_CODE_MAP)) {
      if (titleLower.includes(key)) { 
        leagueInfo = val; 
        break; 
      }
    }
    
    return {
      homeTeam: teams.homeTeam,
      awayTeam: teams.awayTeam,
      previewParagraphs: paragraphs,
      previewText,
      prediction: pageData.prediction,
      league: pageData.league,
      matchDate: pageData.matchDate,
      leagueCode: leagueInfo.code,
      leagueKr: leagueInfo.nameKr,
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
  console.log('🚀 Forebet Scraper v11');
  console.log('📅 ' + new Date().toISOString());
  console.log('🎯 지원 리그: 12개\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
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
        const thumbResult = await fetchThumbnail(data.homeTeam, data.awayTeam);
        if (thumbResult) {
          data.thumbnail = thumbResult.thumbnail;
          data.thumbnailType = thumbResult.type;
          console.log(`    📸 ${thumbResult.type}`);
        }
        
        allPreviews.push(data);
        console.log(`    ✅ ${data.leagueKr} | 📝 ${data.previewText.length}자 (raw: ${data.fullTextLength}자)`);
      }
      
      await delay(3000);
    }
    
    await browser.close();
    
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📊 결과: ${allPreviews.length}/${supportedLinks.length} 성공`);
    console.log(`📸 썸네일: ${allPreviews.filter(p => p.thumbnail).length}개`);
    
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