// Yahoo Japan 스포츠 네비 NPB 일정 페이지 스크래핑 (백업 소스)
// https://baseball.yahoo.co.jp/npb/schedule/
//
// npb.jp가 접근 불가할 때 대안으로 사용

export interface YahooScrapedGame {
  homeTeamJp: string
  awayTeamJp: string
  homePitcherJp: string
  awayPitcherJp: string
  gameTime?: string
  venue?: string
}

/**
 * Yahoo Japan 스포츠네비에서 NPB 오늘 경기 + 선발투수 스크래핑
 *
 * Yahoo 스포츠네비 일정 페이지 구조:
 * https://baseball.yahoo.co.jp/npb/schedule/
 * 또는 날짜별:
 * https://baseball.yahoo.co.jp/npb/schedule/?date=2026-04-07
 *
 * 각 경기 상세:
 * https://baseball.yahoo.co.jp/npb/game/XXXXXXXXXXXXX/top
 */
export async function scrapeYahooNpbStarters(date?: string): Promise<{
  games: YahooScrapedGame[]
  error?: string
}> {
  // Yahoo 일정 페이지 URL
  const baseUrl = 'https://baseball.yahoo.co.jp/npb/schedule/'
  const url = date ? `${baseUrl}?date=${date}` : baseUrl

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en;q=0.5',
        'Referer': 'https://baseball.yahoo.co.jp/npb/',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      return { games: [], error: `Yahoo HTTP ${res.status}` }
    }

    const html = await res.text()
    return { games: parseYahooScheduleHtml(html) }

  } catch (e: any) {
    return { games: [], error: `Yahoo fetch error: ${e.message}` }
  }
}

/**
 * Yahoo Japan 경기 상세 페이지에서 선발투수 정보 추출
 * 각 경기 페이지에 더 상세한 선발투수 정보가 있음
 */
export async function scrapeYahooGameDetail(gameUrl: string): Promise<{
  homePitcherJp: string
  awayPitcherJp: string
  error?: string
}> {
  try {
    const res = await fetch(gameUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'ja',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      return { homePitcherJp: '', awayPitcherJp: '', error: `HTTP ${res.status}` }
    }

    const html = await res.text()

    // 선발투수 섹션 파싱
    // Yahoo 경기 상세 페이지에서 "予告先発" 또는 "先発" 관련 섹션
    const pitcherSection = html.match(/予告先発[\s\S]*?<\/(?:section|div|table)>/i)
    if (!pitcherSection) {
      // 대안: 투수명이 포함된 섹션 탐색
      const starterMatch = html.match(/先発[\s\S]{0,500}/i)
      if (starterMatch) {
        const names = extractPitcherNames(starterMatch[0])
        return {
          homePitcherJp: names[1] || '',
          awayPitcherJp: names[0] || '',
        }
      }
      return { homePitcherJp: '', awayPitcherJp: '' }
    }

    const names = extractPitcherNames(pitcherSection[0])
    return {
      awayPitcherJp: names[0] || '',
      homePitcherJp: names[1] || '',
    }
  } catch (e: any) {
    return { homePitcherJp: '', awayPitcherJp: '', error: e.message }
  }
}

// Yahoo 일정 페이지 HTML 파싱
function parseYahooScheduleHtml(html: string): YahooScrapedGame[] {
  const games: YahooScrapedGame[] = []

  // Yahoo 팀 약어 매핑
  const yahooTeamNames: Record<string, string> = {
    '巨人': '巨人', 'ヤクルト': 'ヤクルト', 'DeNA': 'DeNA',
    '中日': '中日', '阪神': '阪神', '広島': '広島',
    'オリックス': 'オリックス', 'ロッテ': 'ロッテ',
    'ソフトバンク': 'ソフトバンク', '楽天': '楽天',
    '西武': '西武', '日本ハム': '日本ハム',
    // 풀네임 대응
    '読売': '巨人', '横浜': 'DeNA', '千葉ロッテ': 'ロッテ',
    '福岡ソフトバンク': 'ソフトバンク', '東北楽天': '楽天',
    '埼玉西武': '西武', '北海道日本ハム': '日本ハム',
    '広島東洋': '広島',
  }

  const teamPattern = Object.keys(yahooTeamNames).sort((a, b) => b.length - a.length).join('|')

  // ===== 방법 1: 경기 카드 블록에서 추출 =====
  // Yahoo 스포츠네비 일정 페이지는 보통 경기별 카드 구조
  // <div class="bb-score__item"> 또는 유사한 구조

  const gameCardPattern = /<(?:div|li|article)[^>]*class="[^"]*(?:score|game|match|card)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|li|article)>/gi
  let cardMatch

  while ((cardMatch = gameCardPattern.exec(html)) !== null) {
    const card = cardMatch[1]
    const textContent = card.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

    const teamRegex = new RegExp(`(${teamPattern})`, 'g')
    const foundTeams: string[] = []
    let teamMatch

    while ((teamMatch = teamRegex.exec(textContent)) !== null) {
      const normalized = yahooTeamNames[teamMatch[1]] || teamMatch[1]
      if (!foundTeams.includes(normalized)) {
        foundTeams.push(normalized)
      }
    }

    if (foundTeams.length >= 2) {
      // 투수명 추출 시도 (팀명 사이 또는 "先発" 키워드 근처)
      const pitcherNames = extractPitcherNamesFromCard(textContent, foundTeams)

      games.push({
        awayTeamJp: foundTeams[0],
        homeTeamJp: foundTeams[1],
        awayPitcherJp: pitcherNames.away,
        homePitcherJp: pitcherNames.home,
      })
    }
  }

  // ===== 방법 2: 테이블에서 추출 =====
  if (games.length === 0) {
    const trPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
    let trMatch

    while ((trMatch = trPattern.exec(html)) !== null) {
      const row = trMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      const teamRegex = new RegExp(`(${teamPattern})`, 'g')
      const foundTeams: string[] = []
      let tm

      while ((tm = teamRegex.exec(row)) !== null) {
        const normalized = yahooTeamNames[tm[1]] || tm[1]
        if (!foundTeams.includes(normalized)) foundTeams.push(normalized)
      }

      if (foundTeams.length >= 2) {
        games.push({
          awayTeamJp: foundTeams[0],
          homeTeamJp: foundTeams[1],
          awayPitcherJp: '',
          homePitcherJp: '',
        })
      }
    }
  }

  return games
}

// 텍스트에서 일본인 이름 패턴으로 투수명 추출
function extractPitcherNames(text: string): string[] {
  const cleaned = text.replace(/<[^>]+>/g, ' ').trim()

  // 일본인 이름 패턴: 한자 2~4자 (성+이름)
  // 예: 山本由伸, 佐々木朗希, 今永昇太
  const namePattern = /[\u4e00-\u9faf\u3400-\u4dbf]{1,4}[\s　]?[\u4e00-\u9faf\u3400-\u4dbf]{1,4}/g
  const names = cleaned.match(namePattern) || []

  // 팀명에 해당하는 것 제외
  const teamKeywords = ['巨人', '阪神', '中日', '広島', '横浜', '西武', '楽天', '日本', '千葉', '福岡', '埼玉', '北海道', '東北', '読売', '予告', '先発', '投手']
  return names.filter(name => !teamKeywords.some(k => name.includes(k)))
}

// 카드 텍스트에서 투수명 추출
function extractPitcherNamesFromCard(
  text: string,
  teams: string[]
): { home: string; away: string } {
  // "先発" 키워드 근처에서 이름 찾기
  const starterSection = text.match(/先発[\s\S]{0,200}/i)
  if (starterSection) {
    const names = extractPitcherNames(starterSection[0])
    if (names.length >= 2) {
      return { away: names[0], home: names[1] }
    } else if (names.length === 1) {
      return { away: names[0], home: '' }
    }
  }

  // 팀명 사이에서 이름 찾기
  const teamPattern = teams.join('|')
  const betweenPattern = new RegExp(`(?:${teamPattern})([^]*?)(?:${teamPattern})`, 'i')
  const between = text.match(betweenPattern)

  if (between && between[1]) {
    const names = extractPitcherNames(between[1])
    if (names.length >= 2) {
      return { away: names[0], home: names[1] }
    }
  }

  return { home: '', away: '' }
}
