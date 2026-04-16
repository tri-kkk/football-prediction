#!/usr/bin/env node
// ─── 야구 블로그 자동화 메인 스크립트 ───
// 전체 파이프라인: DB 경기 조회 → Claude API 블로그 생성 → 네이버 블로그 발행
//
// 사용법:
//   node index.js                       # 내일 경기 전체 자동화
//   node index.js --date 2026-04-17     # 특정 날짜
//   node index.js --league KBO          # 특정 리그만
//   node index.js --list-only           # 경기 목록만 확인
//   node index.js --preview             # 발행 없이 콘텐츠 미리보기
//   node index.js --test                # 1경기만 테스트
//   node index.js --match-id 12345      # 특정 경기만
//   node index.js --auth-url            # 네이버 OAuth URL 출력
//   node index.js --get-token CODE      # 인증 코드로 토큰 발급

import { CONFIG, validateConfig } from './config.js'
import { getBaseballMatches, collectMatchData, getTomorrowKST } from './data-collector.js'
import { generateBlogPost } from './blog-generator.js'
import { publishToNaverBlog, getAuthURL, getAccessToken } from './naver-publisher.js'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── CLI 인자 파싱 ───
function parseArgs() {
  const args = process.argv.slice(2)
  const opts = {
    date: null,
    league: null,
    listOnly: false,
    preview: false,
    test: false,
    matchId: null,
    authUrl: false,
    getToken: null,
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--date': opts.date = args[++i]; break
      case '--league': opts.league = args[++i]; break
      case '--list-only': opts.listOnly = true; break
      case '--preview': opts.preview = true; break
      case '--test': opts.test = true; break
      case '--match-id': opts.matchId = args[++i]; break
      case '--auth-url': opts.authUrl = true; break
      case '--get-token': opts.getToken = args[++i]; break
    }
  }

  return opts
}

// ─── 메인 실행 ───
async function main() {
  const opts = parseArgs()

  // 네이버 OAuth 관련 명령
  if (opts.authUrl) {
    console.log('🔑 네이버 OAuth 인증 URL:')
    console.log(getAuthURL())
    console.log('\n위 URL을 브라우저에서 열고 로그인 후 리다이렉트된 URL의 code 파라미터를 복사하세요.')
    console.log('그 다음: node index.js --get-token [복사한코드]')
    return
  }

  if (opts.getToken) {
    await getAccessToken(opts.getToken)
    return
  }

  // 설정 검증
  validateConfig()

  const targetDate = opts.date || getTomorrowKST()
  const leagues = opts.league ? [opts.league.toUpperCase()] : CONFIG.TARGET_LEAGUES

  console.log('═══════════════════════════════════════')
  console.log('⚾ 야구 블로그 자동화 시작')
  console.log(`📅 대상 날짜: ${targetDate}`)
  console.log(`🏟️  대상 리그: ${leagues.join(', ')}`)
  console.log('═══════════════════════════════════════\n')

  // Step 1: 경기 목록 조회
  const matches = await getBaseballMatches(targetDate, leagues)

  if (matches.length === 0) {
    console.log('📭 해당 날짜에 예정된 경기가 없습니다.')
    return
  }

  // 경기 목록 출력
  console.log(`\n📋 경기 목록 (${matches.length}개):`)
  matches.forEach((m, i) => {
    const homeKo = m.home_team_ko || m.home_team
    const awayKo = m.away_team_ko || m.away_team
    const pitcher = `${m.home_pitcher_ko || m.home_pitcher || '미정'} vs ${m.away_pitcher_ko || m.away_pitcher || '미정'}`
    console.log(`  ${i + 1}. [${m.league}] ${homeKo} vs ${awayKo} (${m.match_time || ''}) - ${pitcher}`)
  })
  console.log('')

  if (opts.listOnly) return

  // 처리할 경기 필터
  let targetMatches = matches
  if (opts.matchId) {
    targetMatches = matches.filter(m => String(m.api_match_id) === opts.matchId || String(m.id) === opts.matchId)
    if (targetMatches.length === 0) {
      console.error(`❌ match_id ${opts.matchId}에 해당하는 경기를 찾을 수 없습니다.`)
      return
    }
  }
  if (opts.test) {
    targetMatches = [targetMatches[0]]
    console.log('🧪 테스트 모드: 첫 번째 경기만 처리')
  }

  // 최대 포스팅 수 제한
  targetMatches = targetMatches.slice(0, CONFIG.MAX_POSTS_PER_RUN)

  // 결과 저장 디렉토리
  const outputDir = resolve(__dirname, 'output', targetDate)
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  // Step 2 & 3: 각 경기별 블로그 생성 + 발행
  const results = []
  for (let i = 0; i < targetMatches.length; i++) {
    const match = targetMatches[i]
    const homeKo = match.home_team_ko || match.home_team
    const awayKo = match.away_team_ko || match.away_team

    console.log(`\n─── [${i + 1}/${targetMatches.length}] ${homeKo} vs ${awayKo} ───`)

    try {
      // 데이터 수집
      console.log('📊 데이터 수집 중...')
      const matchData = await collectMatchData(match)

      // Claude API로 블로그 생성
      const blogPost = await generateBlogPost(matchData)

      // HTML 파일 저장 (미리보기/백업용)
      const filename = `${match.league}_${match.home_team}_vs_${match.away_team}.html`
      const filepath = resolve(outputDir, filename)
      writeFileSync(filepath, blogPost.htmlContent, 'utf-8')
      console.log(`💾 HTML 저장: ${filepath}`)

      // 네이버 발행 (preview 모드가 아닐 때만)
      let publishResult = { success: false, skipped: true, reason: 'preview mode' }
      if (!opts.preview) {
        publishResult = await publishToNaverBlog(blogPost)
      } else {
        console.log('👀 미리보기 모드 - 발행 스킵')
      }

      results.push({
        match: `${homeKo} vs ${awayKo}`,
        league: match.league,
        generated: true,
        published: publishResult.success,
        skipped: publishResult.skipped || false,
        title: blogPost.title,
      })
    } catch (err) {
      console.error(`❌ 처리 실패: ${err.message}`)
      results.push({
        match: `${homeKo} vs ${awayKo}`,
        league: match.league,
        generated: false,
        published: false,
        error: err.message,
      })
    }

    // API 레이트 리밋 방지 (1초 대기)
    if (i < targetMatches.length - 1) {
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  // 최종 결과 요약
  console.log('\n═══════════════════════════════════════')
  console.log('📊 실행 결과 요약')
  console.log('═══════════════════════════════════════')

  const generated = results.filter(r => r.generated).length
  const published = results.filter(r => r.published).length
  const failed = results.filter(r => !r.generated).length

  console.log(`  총 경기: ${results.length}`)
  console.log(`  생성 완료: ${generated}`)
  console.log(`  발행 완료: ${published}`)
  if (failed > 0) console.log(`  실패: ${failed}`)

  results.forEach(r => {
    const status = r.generated
      ? (r.published ? '✅ 발행' : r.skipped ? '💾 저장' : '⚠️ 발행실패')
      : '❌ 실패'
    console.log(`  ${status} [${r.league}] ${r.match}${r.title ? ` → ${r.title}` : ''}`)
  })

  console.log(`\n💾 HTML 파일 위치: ${outputDir}`)
  console.log('⚾ 완료!\n')
}

main().catch(err => {
  console.error('💥 치명적 오류:', err)
  process.exit(1)
})
