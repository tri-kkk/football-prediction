// ─── 네이버 블로그 자동 발행 모듈 ───
// 네이버 블로그 Open API를 사용하여 자동 포스팅
// 공식 문서: https://developers.naver.com/docs/blog/post/

import { CONFIG } from './config.js'

/**
 * 네이버 블로그에 글 발행
 * @param {object} post - { title, htmlContent, tags }
 * @returns {object} 발행 결과
 */
export async function publishToNaverBlog(post) {
  if (!CONFIG.NAVER_ACCESS_TOKEN) {
    console.warn('⚠️  네이버 토큰 미설정 - 발행 스킵')
    return { success: false, skipped: true, reason: 'NAVER_BLOG_ACCESS_TOKEN 미설정' }
  }

  const url = 'https://openapi.naver.com/blog/writePost.json'

  const formData = new URLSearchParams()
  formData.append('title', post.title)
  formData.append('contents', post.htmlContent)
  formData.append('categoryNo', '') // 빈 값이면 기본 카테고리
  if (post.tags && post.tags.length > 0) {
    formData.append('tag', post.tags.join(','))
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.NAVER_ACCESS_TOKEN}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error(`❌ 네이버 API 에러 ${res.status}: ${errText}`)

      // 토큰 만료 안내
      if (res.status === 401) {
        console.error('🔑 네이버 토큰이 만료되었습니다. 아래 URL에서 재발급받으세요:')
        console.error(`   ${getAuthURL()}`)
      }

      return { success: false, status: res.status, error: errText }
    }

    const result = await res.json()
    console.log(`✅ 네이버 블로그 발행 완료: ${post.title}`)
    console.log(`   URL: ${result.message?.result?.blogUrl || '(URL 확인 필요)'}`)

    return { success: true, data: result }
  } catch (err) {
    console.error(`❌ 네이버 발행 실패: ${err.message}`)
    return { success: false, error: err.message }
  }
}

/**
 * 네이버 OAuth 인증 URL 생성
 * 최초 1회 브라우저에서 접속하여 토큰 발급 필요
 */
export function getAuthURL() {
  const baseUrl = 'https://nid.naver.com/oauth2.0/authorize'
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CONFIG.NAVER_CLIENT_ID,
    redirect_uri: 'http://localhost:3000/callback',
    state: 'baseball_blog_auth',
  })
  return `${baseUrl}?${params.toString()}`
}

/**
 * 인증 코드로 Access Token 발급
 * @param {string} code - OAuth 인증 코드
 */
export async function getAccessToken(code) {
  const url = 'https://nid.naver.com/oauth2.0/token'
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: CONFIG.NAVER_CLIENT_ID,
    client_secret: CONFIG.NAVER_CLIENT_SECRET,
    code,
    state: 'baseball_blog_auth',
  })

  const res = await fetch(`${url}?${params.toString()}`)
  const data = await res.json()

  if (data.access_token) {
    console.log('✅ 네이버 Access Token 발급 완료!')
    console.log(`   Access Token: ${data.access_token}`)
    console.log(`   Refresh Token: ${data.refresh_token}`)
    console.log('')
    console.log('📌 .env.local에 아래 내용을 추가하세요:')
    console.log(`   NAVER_BLOG_ACCESS_TOKEN=${data.access_token}`)
    console.log(`   NAVER_BLOG_REFRESH_TOKEN=${data.refresh_token}`)
    return data
  } else {
    console.error('❌ 토큰 발급 실패:', data)
    return null
  }
}

/**
 * Refresh Token으로 Access Token 갱신
 */
export async function refreshAccessToken() {
  const refreshToken = process.env.NAVER_BLOG_REFRESH_TOKEN
  if (!refreshToken) {
    console.error('❌ NAVER_BLOG_REFRESH_TOKEN이 설정되어 있지 않습니다.')
    return null
  }

  const url = 'https://nid.naver.com/oauth2.0/token'
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: CONFIG.NAVER_CLIENT_ID,
    client_secret: CONFIG.NAVER_CLIENT_SECRET,
    refresh_token: refreshToken,
  })

  const res = await fetch(`${url}?${params.toString()}`)
  const data = await res.json()

  if (data.access_token) {
    console.log('✅ 네이버 Access Token 갱신 완료!')
    console.log(`   새 Access Token: ${data.access_token}`)
    return data
  } else {
    console.error('❌ 토큰 갱신 실패:', data)
    return null
  }
}
