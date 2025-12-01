/**
 * SoccerWay Match Preview Scraper v1
 * - 5대 리그 + 챔스/유로파 커버
 * - 상세 프리뷰 텍스트 (Show full analysis)
 * - 팀 폼, H2H, 부상자, 배당률
 * - 하루 최대 12개
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const fs = require('fs');

// ⚽ 지원 리그 fixtures URL
const LEAGUE_FIXTURES = {
  'premier-league': {
    url: 'https://us.soccerway.com/england/premier-league/fixtures/',
    code: 'PL',
    nameKr: '프리미어리그',
  },
  'laliga': {
    url: 'https://us.soccerway.com/spain/laliga/fixtures/',
    code: 'PD',
    nameKr: '라리가',
  },
  'bundesliga': {
    url: 'https://us.soccerway.com/germany/bundesliga/fixtures/',
    code: 'BL1',
    nameKr: '분데스리가',
  },
  'serie-a': {
    url: 'https://us.soccerway.com/italy/serie-a/fixtures/',
    code: 'SA',
    nameKr: '세리에A',
  },
  'ligue-1': {
    url: 'https://us.soccerway.com/france/ligue-1/fixtures/',
    code: 'FL1',
    nameKr: '리그1',
  },
  'eredivisie': {
    url: 'https://us.soccerway.com/netherlands/eredivisie/fixtures/',
    code: 'DED',
    nameKr: '에레디비시',
  },
  'champions-league': {
    url: 'https://us.soccerway.com/international/europe/uefa-champions-league/fixtures/',
    code: 'CL',
    nameKr: '챔피언스리그',
  },
  'europa-league': {
    url: 'https://us.soccerway.com/international/europe/uefa-europa-league/fixtures/',
    code: 'EL',
    nameKr: '유로파리그',
  },
};

// 하루 최대 처리 개수
const MAX_POSTS_PER_DAY = 12;

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 한국 시간 기준 날짜 체크 (오늘 ~ +7일)
 */
function isValidMatchDate(dateStr) {
  if (!dateStr) return true;
  
  try {
    // "01.12.2025" 또는 "December 02, 2025" 형식 파싱
    let matchDate;
    
    if (dateStr.includes('.')) {
      // DD.MM.YYYY 형식
      const parts = dateStr.split('.');
      if (parts.length === 3) {
        matchDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    } else {
      matchDate = new Date(dateStr);
    }
    
    if (!matchDate || isNaN(matchDate.getTime())) return true;
    
    // 한국 시간 기준
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstNow = new Date(now.getTime() + kstOffset);
    
    const kstToday = new Date(kstNow);
    kstToday.setUTCHours(0, 0, 0, 0);
    const todayStart = new Date(kstToday.getTime() - kstOffset);
    
    const maxDate = new Date(todayStart);
    maxDate.setDate(maxDate.getDate() + 7);
    
    if (matchDate < todayStart) {
      console.log(`    ⏭️ 이미 지난 경기 (KST): ${dateStr}`);
      return false;
    }
    if (matchDate > maxDate) return false;
    
    return true;
  } catch {
    return true;
  }
}

/**
 * 리그별 fixtures 페이지에서 경기 수집
 */
async function getLeagueFixtures(browser, leagueKey, leagueInfo) {
  console.log(`📋 ${leagueInfo.nameKr} 경기 수집 중...`);
  
  const page = await browser.newPage();
  
  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await page.goto(leagueInfo.url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    await delay(3000);
    
    // 페이지 스크롤해서 더 많은 경기 로드
    await page.evaluate(() => window.scrollTo(0, 2000));
    await delay(1500);
    
    // 7일 후 날짜 계산 (KST)
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstNow = new Date(now.getTime() + kstOffset);
    const maxDate = new Date(kstNow);
    maxDate.setDate(maxDate.getDate() + 7);
    
    const matches = await page.evaluate((maxDateTs) => {
      const results = [];
      const maxDate = new Date(maxDateTs);
      
      // 모든 링크에서 /game/ 포함된 것 찾기
      const gameLinks = document.querySelectorAll('a[href*="/game/"]');
      
      gameLinks.forEach(link => {
        const href = link.href;
        if (!href || !href.includes('/game/')) return;
        
        // 부모 요소에서 팀명, 날짜 찾기
        let parent = link.closest('tr, [class*="match"], [class*="event"], div');
        if (!parent) parent = link.parentElement?.parentElement;
        if (!parent) return;
        
        const parentText = parent.textContent || '';
        
        // 이미 끝난 경기 제외 (스코어 패턴)
        if (parentText.match(/\d+\s*[-–:]\s*\d+/) && !parentText.toLowerCase().includes('vs')) {
          return;
        }
        
        // 팀명 추출 시도
        let homeTeam = '';
        let awayTeam = '';
        
        // 팀 링크에서 추출
        const teamLinks = parent.querySelectorAll('a[href*="/teams/"]');
        if (teamLinks.length >= 2) {
          homeTeam = teamLinks[0].textContent?.trim() || '';
          awayTeam = teamLinks[1].textContent?.trim() || '';
        }
        
        // 팀 링크 없으면 텍스트에서 "Team A vs Team B" 패턴 찾기
        if (!homeTeam || !awayTeam) {
          const vsMatch = parentText.match(/([A-Za-z\s\.]+?)\s*(?:vs\.?|v)\s*([A-Za-z\s\.]+)/i);
          if (vsMatch) {
            homeTeam = vsMatch[1].trim();
            awayTeam = vsMatch[2].trim();
          }
        }
        
        // 시간 추출
        const timeMatch = parentText.match(/(\d{1,2}:\d{2})/);
        const time = timeMatch ? timeMatch[1] : '';
        
        // 날짜 추출 시도
        let dateStr = '';
        const dateMatch = parentText.match(/(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
        if (dateMatch) {
          dateStr = dateMatch[0];
        }
        
        if (homeTeam && awayTeam && homeTeam.length > 1 && awayTeam.length > 1) {
          results.push({
            link: href,
            homeTeam: homeTeam.substring(0, 30),
            awayTeam: awayTeam.substring(0, 30),
            time,
            dateStr,
          });
        }
      });
      
      // 중복 제거
      return [...new Map(results.map(r => [r.link, r])).values()];
    }, maxDate.getTime());
    
    await page.close();
    
    console.log(`  📄 ${matches.length}개 경기`);
    
    return matches.map(m => ({
      ...m,
      leagueKey,
      leagueCode: leagueInfo.code,
      leagueKr: leagueInfo.nameKr,
    }));
    
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
    await page.close();
    return [];
  }
}

/**
 * 모든 리그에서 경기 수집
 */
async function getAllFixtures(browser) {
  console.log('📅 리그별 경기 수집 중...\n');
  
  const allMatches = [];
  
  for (const [leagueKey, leagueInfo] of Object.entries(LEAGUE_FIXTURES)) {
    const matches = await getLeagueFixtures(browser, leagueKey, leagueInfo);
    allMatches.push(...matches);
    await delay(2000);
  }
  
  // 중복 제거
  const uniqueMatches = [...new Map(allMatches.map(m => [m.link, m])).values()];
  
  console.log(`\n📊 총 ${uniqueMatches.length}개 경기`);
  
  return uniqueMatches;
}

/**
 * 경기 상세 페이지에서 프리뷰 추출
 */
async function scrapeMatchPreview(browser, matchInfo) {
  const page = await browser.newPage();
  
  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await page.goto(matchInfo.link, { waitUntil: 'networkidle2', timeout: 60000 });
    
    await delay(3000);
    
    // "Show full analysis" 버튼 클릭
    try {
      await page.click('[class*="show-full"], [class*="expand"], button:has-text("Show full analysis")');
      await delay(2000);
    } catch {
      // 버튼 없을 수 있음
    }
    
    // 데이터 추출
    const data = await page.evaluate(() => {
      const result = {
        title: '',
        homeTeam: '',
        awayTeam: '',
        dateTime: '',
        venue: '',
        league: '',
        round: '',
        homeForm: '',
        awayForm: '',
        homeRank: '',
        awayRank: '',
        homePoints: '',
        awayPoints: '',
        h2h: '',
        homeKeyPlayer: '',
        awayKeyPlayer: '',
        injuries: [],
        odds: { home: '', draw: '', away: '' },
        prediction: '',
        previewText: '',
        hotStats: [],
        streaks: [],
      };
      
      // 제목 (Match Preview: Team A vs Team B)
      const titleEl = document.querySelector('h2, h3, [class*="preview-title"]');
      result.title = titleEl?.textContent?.trim() || '';
      
      // 팀명
      const homeTeamEl = document.querySelector('[class*="team-a"], [class*="home-team"]');
      const awayTeamEl = document.querySelector('[class*="team-b"], [class*="away-team"]');
      result.homeTeam = homeTeamEl?.textContent?.trim() || '';
      result.awayTeam = awayTeamEl?.textContent?.trim() || '';
      
      // 날짜/시간
      const dateEl = document.querySelector('[class*="date"], time');
      result.dateTime = dateEl?.textContent?.trim() || '';
      
      // 리그/라운드 (breadcrumb에서)
      const breadcrumb = document.querySelector('[class*="breadcrumb"], nav');
      if (breadcrumb) {
        const text = breadcrumb.textContent || '';
        const roundMatch = text.match(/Round\s*(\d+)/i);
        if (roundMatch) result.round = roundMatch[1];
      }
      
      // 프리뷰 전체 텍스트
      const analysisEl = document.querySelector('[class*="analysis"], [class*="preview-content"], article');
      if (analysisEl) {
        result.previewText = analysisEl.innerText?.trim() || '';
      }
      
      // 부상자 (WILL NOT PLAY)
      const injuryRows = document.querySelectorAll('[class*="injury"], [class*="will-not-play"] tr, [class*="absence"]');
      injuryRows.forEach(row => {
        const name = row.querySelector('[class*="player"], td:first-child')?.textContent?.trim();
        const reason = row.querySelector('[class*="reason"], td:last-child')?.textContent?.trim();
        if (name) {
          result.injuries.push({ name, reason: reason || '' });
        }
      });
      
      // 배당률
      const oddsEls = document.querySelectorAll('[class*="odds"] [class*="value"], [class*="odd-value"]');
      if (oddsEls.length >= 3) {
        result.odds.home = oddsEls[0]?.textContent?.trim() || '';
        result.odds.draw = oddsEls[1]?.textContent?.trim() || '';
        result.odds.away = oddsEls[2]?.textContent?.trim() || '';
      }
      
      return result;
    });
    
    await page.close();
    
    // 프리뷰 텍스트에서 섹션 파싱
    if (data.previewText) {
      const text = data.previewText;
      
      // Current Team Form 추출
      const formMatch = text.match(/Current Team Form\s*([\s\S]*?)(?=Key Players|Head-to-Head|$)/i);
      if (formMatch) {
        const formText = formMatch[1];
        
        // 홈팀 폼
        const homeFormMatch = formText.match(/last 5 matches.*?((?:[WDLO]-){4}[WDLO])/i);
        if (homeFormMatch) data.homeForm = homeFormMatch[1];
        
        // 원정팀 폼
        const awayFormMatch = formText.match(/Their last 5 matches show\s*((?:[WDLO]-){4}[WDLO])/i);
        if (awayFormMatch) data.awayForm = awayFormMatch[1];
        
        // 순위
        const homeRankMatch = formText.match(/are (\d+)(?:st|nd|rd|th) in the league with (\d+) points/i);
        if (homeRankMatch) {
          data.homeRank = homeRankMatch[1];
          data.homePoints = homeRankMatch[2];
        }
        
        const awayRankMatch = formText.match(/are (\d+)(?:st|nd|rd|th) with (\d+) points/i);
        if (awayRankMatch) {
          data.awayRank = awayRankMatch[1];
          data.awayPoints = awayRankMatch[2];
        }
      }
      
      // Key Players
      const keyPlayerMatch = text.match(/Key Players to Watch\s*([\s\S]*?)(?=Head-to-Head|Hot Stats|$)/i);
      if (keyPlayerMatch) {
        const keyText = keyPlayerMatch[1];
        const homePlayerMatch = keyText.match(/top scorer is\s*__(.+?)__\s*with\s*(\d+)/i);
        const awayPlayerMatch = keyText.match(/leading scorer is\s*__(.+?)__.*?with\s*(\d+)/i);
        
        if (homePlayerMatch) data.homeKeyPlayer = `${homePlayerMatch[1]} (${homePlayerMatch[2]}골)`;
        if (awayPlayerMatch) data.awayKeyPlayer = `${awayPlayerMatch[1]} (${awayPlayerMatch[2]}골)`;
      }
      
      // H2H
      const h2hMatch = text.match(/Head-to-Head Record\s*([\s\S]*?)(?=Historical stats|Hot Stats|$)/i);
      if (h2hMatch) {
        data.h2h = h2hMatch[1].trim().substring(0, 300);
      }
      
      // Hot Stats
      const hotStatsMatch = text.match(/Hot Stats\s*([\s\S]*?)(?=Streaks|Betting|$)/i);
      if (hotStatsMatch) {
        const lines = hotStatsMatch[1].split('\n').filter(l => l.trim().startsWith('-'));
        data.hotStats = lines.map(l => l.replace(/^-\s*/, '').trim()).filter(l => l);
      }
      
      // Streaks
      const streaksMatch = text.match(/Streaks\s*([\s\S]*?)(?=Betting|$)/i);
      if (streaksMatch) {
        const lines = streaksMatch[1].split('\n').filter(l => l.trim().startsWith('-'));
        data.streaks = lines.map(l => l.replace(/^-\s*/, '').trim()).filter(l => l);
      }
      
      // Prediction
      const predMatch = text.match(/Score prediction:\s*__(.+?)__/i);
      if (predMatch) data.prediction = predMatch[1];
    }
    
    return {
      ...matchInfo,
      ...data,
      scrapedAt: new Date().toISOString(),
    };
    
  } catch (e) {
    console.log(`    ❌ Error: ${e.message}`);
    await page.close();
    return null;
  }
}

/**
 * 동적 썸네일 URL 생성
 */
function generateThumbnailUrl(homeTeam, awayTeam, leagueCode) {
  const homeEncoded = encodeURIComponent(homeTeam);
  const awayEncoded = encodeURIComponent(awayTeam);
  return `/api/match-thumbnail?home=${homeEncoded}&away=${awayEncoded}&league=${leagueCode}`;
}

/**
 * 메인
 */
async function scrapeSoccerway() {
  console.log('🚀 SoccerWay Scraper v1.2');
  console.log('📅 ' + new Date().toISOString());
  console.log(`🎯 지원 리그: ${Object.keys(LEAGUE_FIXTURES).length}개\n`);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
    ]
  });
  
  try {
    // 1. 모든 리그에서 경기 수집
    const allMatches = await getAllFixtures(browser);
    
    if (allMatches.length === 0) {
      console.log('⚠️ 수집된 경기 없음');
      await browser.close();
      return [];
    }
    
    // 리그별 통계
    const leagueCounts = {};
    allMatches.forEach(m => {
      leagueCounts[m.leagueKr] = (leagueCounts[m.leagueKr] || 0) + 1;
    });
    console.log(`📋 리그별: ${Object.entries(leagueCounts).map(([k,v]) => `${k}(${v})`).join(', ')}`);
    
    // 최대 개수 제한
    const matchesToProcess = allMatches.slice(0, MAX_POSTS_PER_DAY);
    console.log(`\n📖 Scraping ${matchesToProcess.length} matches (max: ${MAX_POSTS_PER_DAY})...\n`);
    
    // 2. 각 경기 상세 페이지 스크래핑
    const results = [];
    
    for (let i = 0; i < matchesToProcess.length; i++) {
      const match = matchesToProcess[i];
      console.log(`[${i+1}/${matchesToProcess.length}] ${match.homeTeam || '?'} vs ${match.awayTeam || '?'} (${match.leagueKr})`);
      
      const data = await scrapeMatchPreview(browser, match);
      
      if (data && data.previewText) {
        // 썸네일 URL 생성
        data.thumbnail = generateThumbnailUrl(
          data.homeTeam || match.homeTeam,
          data.awayTeam || match.awayTeam,
          data.leagueCode
        );
        data.thumbnailType = 'dynamic';
        data.thumbnailSource = 'api-generated';
        
        results.push(data);
        console.log(`    ✅ ${data.leagueKr} | 📝 ${data.previewText.length}자`);
      } else {
        console.log(`    ⏭️ 프리뷰 없음`);
      }
      
      await delay(2500);
    }
    
    await browser.close();
    
    // 3. 결과 저장
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📊 결과: ${results.length}개`);
    
    // 리그별 통계 (결과용)
    const resultLeagueCounts = {};
    results.forEach(r => {
      resultLeagueCounts[r.leagueKr] = (resultLeagueCounts[r.leagueKr] || 0) + 1;
    });
    console.log(`📋 리그별: ${Object.entries(resultLeagueCounts).map(([k,v]) => `${k}(${v})`).join(', ')}`);
    
    fs.writeFileSync('scraped-previews.json', JSON.stringify(results, null, 2));
    console.log(`💾 Saved to scraped-previews.json`);
    
    return results;
    
  } catch (error) {
    console.error('❌ Error:', error);
    await browser.close();
    throw error;
  }
}

scrapeSoccerway()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
