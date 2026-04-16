// ─── Claude API 블로그 생성 모듈 ───
// 야구 경기 데이터 → Claude API → 네이버 블로그 최적화 HTML 콘텐츠 생성

import Anthropic from '@anthropic-ai/sdk'
import { CONFIG } from './config.js'
import { calcRecentRecord } from './data-collector.js'

const anthropic = new Anthropic({ apiKey: CONFIG.ANTHROPIC_API_KEY })

/**
 * Claude API로 야구 블로그 콘텐츠 생성
 * @param {object} matchData - collectMatchData()의 반환값
 * @returns {object} { title, htmlContent, tags, excerpt }
 */
export async function generateBlogPost(matchData) {
  const prompt = buildPrompt(matchData)

  console.log(`🤖 Claude API 호출 중: ${matchData.homeTeam} vs ${matchData.awayTeam}`)

  const response = await anthropic.messages.create({
    model: CONFIG.CLAUDE_MODEL,
    max_tokens: 4096,
    temperature: 0.7,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const rawText = response.content[0]?.text || ''
  const parsed = parseResponse(rawText, matchData)

  console.log(`✅ 블로그 생성 완료: ${parsed.title} (${parsed.htmlContent.length}자)`)
  return parsed
}

/**
 * 프롬프트 빌드
 */
function buildPrompt(data) {
  const { homeTeam, awayTeam, league, pitcher, odds, homeSeason, awaySeason, homeRecent, awayRecent, h2h, matchDate, matchTime } = data

  // 최근 전적 계산
  const homeRecentRecord = calcRecentRecord(homeRecent, data.homeTeamEn)
  const awayRecentRecord = calcRecentRecord(awayRecent, data.awayTeamEn)

  // 최근 경기 상세
  const recentGamesStr = (games, teamEn) => {
    if (!games || games.length === 0) return '데이터 없음'
    return games.slice(0, 5).map(g => {
      const isHome = g.home_team === teamEn
      const result = isHome
        ? (g.home_score > g.away_score ? '승' : '패')
        : (g.away_score > g.home_score ? '승' : '패')
      const homeKo = g.home_team_ko || g.home_team
      const awayKo = g.away_team_ko || g.away_team
      return `  ${g.match_date} ${homeKo} ${g.home_score}-${g.away_score} ${awayKo} (${result})`
    }).join('\n')
  }

  // 상대 전적
  const h2hStr = h2h.length > 0
    ? h2h.slice(0, 5).map(g => {
        const homeKo = g.home_team_ko || g.home_team
        const awayKo = g.away_team_ko || g.away_team
        return `  ${g.match_date} ${homeKo} ${g.home_score}-${g.away_score} ${awayKo}`
      }).join('\n')
    : '상대 전적 데이터 없음'

  // 선발 투수
  const pitcherStr = `
[선발 투수 매치업]
- ${homeTeam}: ${pitcher.home.name} (ERA ${pitcher.home.era ?? 'N/A'}, WHIP ${pitcher.home.whip ?? 'N/A'}, K ${pitcher.home.k ?? 'N/A'})
- ${awayTeam}: ${pitcher.away.name} (ERA ${pitcher.away.era ?? 'N/A'}, WHIP ${pitcher.away.whip ?? 'N/A'}, K ${pitcher.away.k ?? 'N/A'})`

  // 시즌 스탯
  const seasonStr = (stats, name) => {
    if (!stats) return `[${name} 시즌 스탯: 데이터 없음]`
    return `[${name} 시즌 스탯]
- 팀 타율: ${stats.team_avg || 'N/A'} / OBP: ${stats.team_obp || 'N/A'} / SLG: ${stats.team_slg || 'N/A'} / OPS: ${stats.team_ops || 'N/A'}
- 팀 홈런: ${stats.team_hr || 'N/A'}
- 팀 ERA: ${stats.team_era_real || 'N/A'} / WHIP: ${stats.team_whip || 'N/A'}
- 상대 타율: ${stats.team_opp_avg || 'N/A'} / K: ${stats.team_k || 'N/A'} / BB: ${stats.team_bb || 'N/A'}`
  }

  // 배당
  const oddsStr = odds
    ? `[배당] ${homeTeam} ${odds.home_win_odds?.toFixed(2) || 'N/A'} / ${awayTeam} ${odds.away_win_odds?.toFixed(2) || 'N/A'}
[AI 승률] ${homeTeam} ${odds.home_win_prob}% / ${awayTeam} ${odds.away_win_prob}%
[오버언더] ${odds.over_under_line || 'N/A'} (Over ${odds.over_odds?.toFixed(2) || 'N/A'} / Under ${odds.under_odds?.toFixed(2) || 'N/A'})`
    : '[배당: 데이터 없음]'

  const leagueNameMap = {
    KBO: 'KBO 리그',
    MLB: 'MLB 메이저리그',
    NPB: 'NPB 일본프로야구',
  }

  return `당신은 프로야구 전문 블로그 라이터입니다. 아래 데이터를 기반으로 네이버 블로그에 최적화된 포스팅을 작성해주세요.

=== 경기 정보 ===
리그: ${leagueNameMap[league] || league}
대진: ${homeTeam} (홈) vs ${awayTeam} (원정)
날짜: ${matchDate}
시간: ${matchTime}
${pitcherStr}

[최근 10경기 성적]
- ${homeTeam}: ${homeRecentRecord.text}
- ${awayTeam}: ${awayRecentRecord.text}

[${homeTeam} 최근 5경기 상세]
${recentGamesStr(homeRecent, data.homeTeamEn)}

[${awayTeam} 최근 5경기 상세]
${recentGamesStr(awayRecent, data.awayTeamEn)}

${seasonStr(homeSeason, homeTeam)}

${seasonStr(awaySeason, awayTeam)}

[상대 전적 (최근)]
${h2hStr}

${oddsStr}

=== 작성 규칙 ===
1. 반드시 "~입니다", "~합니다" 존댓말 사용
2. 각 섹션 300~500자 내외로 충실하게 작성
3. 자연스러운 문체 (AI 티 제거, 구어체 적절히 혼용)
4. 데이터가 없는 항목은 억지로 만들지 말고 자연스럽게 생략
5. 네이버 블로그 SEO에 최적화된 키워드 자연 배치

=== 반드시 아래 JSON 형식으로만 응답하세요 ===
{
  "title": "${matchDate} [${league}] ${homeTeam} vs ${awayTeam} AI 분석 프리뷰",
  "section1_title": "매치 프리뷰",
  "section1": "양 팀 최근 폼, 승률 흐름, 팀 분위기 기반 매치 프리뷰 (300~500자)",
  "section2_title": "선발 투수 매치업",
  "section2": "선발 투수 ERA, WHIP, 탈삼진 등 핵심 지표 비교 및 강약점 분석 (300~500자)",
  "section3_title": "팀 전력 분석",
  "section3": "시즌 타율, OPS, 팀 ERA 등 주요 팀 스탯 비교 및 타선 분석 (300~500자)",
  "section4_title": "AI 승부예측",
  "section4": "AI 승률, 배당률, 오버언더 분석 기반 최종 예측 및 픽 추천 (300~500자)",
  "tags": ["${league}", "${homeTeam}", "${awayTeam}", "야구분석", "승부예측", "AI분석"],
  "excerpt": "한줄 요약 (50자 이내)"
}

JSON만 응답하세요. 다른 텍스트 없이 JSON 객체만 반환하세요.`
}

/**
 * Claude 응답 파싱 → 네이버 블로그용 HTML 변환
 */
function parseResponse(raw, matchData) {
  let jsonStr = raw.trim()

  // ```json ... ``` 블록 추출
  const jsonMatch = jsonStr.match(/```json\s*([\s\S]*?)```/)
  if (jsonMatch) jsonStr = jsonMatch[1].trim()

  try {
    const parsed = JSON.parse(jsonStr)
    const title = parsed.title || `[${matchData.league}] ${matchData.homeTeam} vs ${matchData.awayTeam} AI 분석`

    // 네이버 블로그 최적화 HTML 생성
    const htmlContent = buildNaverHTML(parsed, matchData)

    return {
      title,
      htmlContent,
      tags: parsed.tags || [matchData.league, matchData.homeTeam, matchData.awayTeam, '야구분석'],
      excerpt: parsed.excerpt || `${matchData.homeTeam} vs ${matchData.awayTeam} AI 분석 프리뷰`,
      raw: parsed,
    }
  } catch (e) {
    console.error('❌ JSON 파싱 실패, raw 텍스트 사용:', e.message)
    return {
      title: `[${matchData.league}] ${matchData.homeTeam} vs ${matchData.awayTeam} AI 분석`,
      htmlContent: `<div style="font-size:16px;line-height:1.8;">${raw.replace(/\n/g, '<br>')}</div>`,
      tags: [matchData.league, matchData.homeTeam, matchData.awayTeam, '야구분석'],
      excerpt: `${matchData.homeTeam} vs ${matchData.awayTeam} AI 분석`,
      raw,
    }
  }
}

/**
 * 네이버 블로그 최적화 HTML 빌드
 */
function buildNaverHTML(parsed, matchData) {
  const { homeTeam, awayTeam, league, matchDate, matchTime, pitcher, odds } = matchData

  const leagueNameMap = {
    KBO: 'KBO 리그',
    MLB: 'MLB',
    NPB: 'NPB',
  }
  const leagueName = leagueNameMap[league] || league

  // 승률 바 HTML
  const probBar = odds ? `
    <div style="margin:20px 0;padding:20px;background:#f8f9fa;border-radius:12px;">
      <div style="text-align:center;font-weight:bold;font-size:15px;margin-bottom:12px;color:#333;">AI 승률 분석</div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <span style="width:80px;text-align:right;font-weight:bold;color:#d63031;">${homeTeam}</span>
        <div style="flex:1;height:28px;background:#eee;border-radius:14px;overflow:hidden;display:flex;">
          <div style="width:${odds.home_win_prob || 50}%;background:linear-gradient(90deg,#d63031,#e17055);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:13px;">${odds.home_win_prob || '-'}%</div>
          <div style="width:${odds.away_win_prob || 50}%;background:linear-gradient(90deg,#0984e3,#74b9ff);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:13px;">${odds.away_win_prob || '-'}%</div>
        </div>
        <span style="width:80px;font-weight:bold;color:#0984e3;">${awayTeam}</span>
      </div>
      ${odds.over_under_line ? `<div style="text-align:center;font-size:13px;color:#666;margin-top:8px;">오버/언더 라인: ${odds.over_under_line}</div>` : ''}
    </div>` : ''

  // 선발 투수 비교 카드
  const pitcherCard = `
    <div style="margin:20px 0;padding:20px;background:#fff;border:1px solid #e0e0e0;border-radius:12px;">
      <div style="text-align:center;font-weight:bold;font-size:16px;margin-bottom:16px;color:#2d3436;">&#9918; 선발 투수 매치업</div>
      <div style="display:flex;justify-content:space-between;gap:16px;">
        <div style="flex:1;text-align:center;padding:12px;background:#fff5f5;border-radius:8px;">
          <div style="font-weight:bold;color:#d63031;font-size:15px;margin-bottom:8px;">${homeTeam}</div>
          <div style="font-size:17px;font-weight:bold;margin-bottom:8px;">${pitcher.home.name}</div>
          <div style="font-size:13px;color:#666;">ERA ${pitcher.home.era ?? '-'} | WHIP ${pitcher.home.whip ?? '-'} | K ${pitcher.home.k ?? '-'}</div>
        </div>
        <div style="display:flex;align-items:center;font-size:20px;font-weight:bold;color:#999;">VS</div>
        <div style="flex:1;text-align:center;padding:12px;background:#f0f8ff;border-radius:8px;">
          <div style="font-weight:bold;color:#0984e3;font-size:15px;margin-bottom:8px;">${awayTeam}</div>
          <div style="font-size:17px;font-weight:bold;margin-bottom:8px;">${pitcher.away.name}</div>
          <div style="font-size:13px;color:#666;">ERA ${pitcher.away.era ?? '-'} | WHIP ${pitcher.away.whip ?? '-'} | K ${pitcher.away.k ?? '-'}</div>
        </div>
      </div>
    </div>`

  // 배당 정보 카드
  const oddsCard = odds ? `
    <div style="margin:20px 0;padding:16px;background:#f0f0f0;border-radius:10px;text-align:center;">
      <div style="font-size:14px;color:#666;margin-bottom:8px;">배당률</div>
      <div style="display:flex;justify-content:center;gap:24px;">
        <div><span style="font-weight:bold;color:#d63031;">${homeTeam}</span> <span style="font-size:18px;font-weight:bold;">${odds.home_win_odds?.toFixed(2) || '-'}</span></div>
        <div><span style="font-weight:bold;color:#0984e3;">${awayTeam}</span> <span style="font-size:18px;font-weight:bold;">${odds.away_win_odds?.toFixed(2) || '-'}</span></div>
      </div>
    </div>` : ''

  // 섹션 빌더
  const buildSection = (title, content, icon) => {
    if (!content) return ''
    // 줄바꿈을 <br>로 변환
    const htmlBody = content.replace(/\n/g, '<br>')
    return `
    <div style="margin:28px 0;">
      <div style="font-size:18px;font-weight:bold;color:#2d3436;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #dfe6e9;">${icon} ${title}</div>
      <div style="font-size:15px;line-height:1.9;color:#2d3436;">${htmlBody}</div>
    </div>`
  }

  return `
<div style="max-width:680px;margin:0 auto;font-family:'Noto Sans KR','맑은 고딕',sans-serif;">

  <!-- 헤더 -->
  <div style="text-align:center;padding:24px 0;margin-bottom:20px;">
    <div style="font-size:13px;color:#0984e3;font-weight:bold;margin-bottom:8px;">${leagueName} | ${matchDate} ${matchTime}</div>
    <div style="font-size:24px;font-weight:bold;color:#2d3436;margin-bottom:4px;">${homeTeam} vs ${awayTeam}</div>
    <div style="font-size:14px;color:#999;">AI 데이터 기반 경기 분석 프리뷰</div>
  </div>

  <!-- 승률 바 -->
  ${probBar}

  <!-- 선발 투수 카드 -->
  ${pitcherCard}

  <!-- 섹션 1: 매치 프리뷰 -->
  ${buildSection(parsed.section1_title || '매치 프리뷰', parsed.section1, '&#9917;')}

  <!-- 섹션 2: 선발 투수 분석 -->
  ${buildSection(parsed.section2_title || '선발 투수 매치업', parsed.section2, '&#127936;')}

  <!-- 배당 카드 -->
  ${oddsCard}

  <!-- 섹션 3: 팀 전력 분석 -->
  ${buildSection(parsed.section3_title || '팀 전력 분석', parsed.section3, '&#128202;')}

  <!-- 섹션 4: AI 승부예측 -->
  ${buildSection(parsed.section4_title || 'AI 승부예측', parsed.section4, '&#127919;')}

  <!-- 푸터 -->
  <div style="margin-top:40px;padding:20px;background:#f8f9fa;border-radius:10px;text-align:center;">
    <div style="font-size:13px;color:#999;">
      이 분석은 AI 데이터 기반 예측이며, 실제 결과와 다를 수 있습니다.<br>
      <strong style="color:#0984e3;">TrendSoccer</strong> | AI 스포츠 분석 플랫폼
    </div>
  </div>

</div>`.trim()
}
