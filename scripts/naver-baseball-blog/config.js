// ─── 설정 파일 ───
// 환경변수는 프로젝트 루트 .env.local에서 로드

import dotenv from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 프로젝트 루트의 .env.local 로드 (override: true로 기존 빈 값 덮어쓰기)
dotenv.config({ path: resolve(__dirname, '../../.env.local'), override: true })

export const CONFIG = {
  // Supabase
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,

  // Claude API
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  CLAUDE_MODEL: 'claude-sonnet-4-20250514',

  // 네이버 블로그 API
  NAVER_CLIENT_ID: process.env.NAVER_BLOG_CLIENT_ID || '',
  NAVER_CLIENT_SECRET: process.env.NAVER_BLOG_CLIENT_SECRET || '',
  NAVER_ACCESS_TOKEN: process.env.NAVER_BLOG_ACCESS_TOKEN || '',
  NAVER_BLOG_ID: process.env.NAVER_BLOG_ID || '',

  // 블로그 설정
  BLOG_CATEGORY: '야구분석',
  TARGET_LEAGUES: ['KBO', 'MLB', 'NPB'], // 대상 리그
  MAX_POSTS_PER_RUN: 10, // 1회 실행 시 최대 포스팅 수
}

// 설정 검증
export function validateConfig() {
  const required = {
    SUPABASE_URL: CONFIG.SUPABASE_URL,
    SUPABASE_KEY: CONFIG.SUPABASE_KEY,
    ANTHROPIC_API_KEY: CONFIG.ANTHROPIC_API_KEY,
  }

  const missing = Object.entries(required)
    .filter(([, v]) => !v)
    .map(([k]) => k)

  if (missing.length > 0) {
    throw new Error(`필수 환경변수 누락: ${missing.join(', ')}`)
  }

  // 네이버 API 키 확인 (경고만)
  if (!CONFIG.NAVER_ACCESS_TOKEN) {
    console.warn('⚠️  NAVER_BLOG_ACCESS_TOKEN 미설정 - 블로그 발행은 스킵됩니다.')
    console.warn('   네이버 개발자센터에서 OAuth 토큰을 발급받아 .env.local에 설정하세요.')
  }
}
