/**
 * Firebase Cloud Messaging (FCM) v1 API 헬퍼
 *
 * - 서비스 계정 RS256 JWT → OAuth access token → FCM v1 send
 * - 의존성 0 (Node crypto만)
 * - 단일 토큰 / 다중 토큰 / 토픽 발송 지원
 *
 * 환경변수:
 *   FIREBASE_PROJECT_ID              'trendsoccer'
 *   FIREBASE_SERVICE_ACCOUNT_JSON    base64(service-account.json) 또는 raw JSON
 *
 * 참고: FCM v1 multicast endpoint(sendAll)는 deprecated.
 *       다중 토큰은 Promise.all로 병렬 호출.
 */

import crypto from 'crypto'

// ──────────────────────────────────────────────────────────────────
// 서비스 계정 로드 (lazy + cache)
// ──────────────────────────────────────────────────────────────────

interface ServiceAccount {
  type: string
  project_id: string
  private_key_id: string
  private_key: string
  client_email: string
  token_uri: string
}

let _serviceAccount: ServiceAccount | null = null

function getServiceAccount(): ServiceAccount {
  if (_serviceAccount) return _serviceAccount

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON env var is missing')
  }

  let jsonStr: string
  if (raw.trimStart().startsWith('{')) {
    jsonStr = raw
  } else {
    jsonStr = Buffer.from(raw, 'base64').toString('utf-8')
  }

  try {
    const parsed = JSON.parse(jsonStr) as ServiceAccount
    if (!parsed.client_email || !parsed.private_key) {
      throw new Error('Invalid service account: missing client_email or private_key')
    }
    _serviceAccount = parsed
    return parsed
  } catch (e) {
    throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON: ${(e as Error).message}`)
  }
}

function getProjectId(): string {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    getServiceAccount().project_id
  )
}

// ──────────────────────────────────────────────────────────────────
// OAuth access token (50분 캐시)
// ──────────────────────────────────────────────────────────────────

interface CachedToken {
  token: string
  expiresAt: number
}

let _cachedToken: CachedToken | null = null

function base64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function createSignedJWT(sa: ServiceAccount): string {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT', kid: sa.private_key_id }
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  const headerB64 = base64url(JSON.stringify(header))
  const claimB64 = base64url(JSON.stringify(claim))
  const unsigned = `${headerB64}.${claimB64}`

  const signature = crypto
    .createSign('RSA-SHA256')
    .update(unsigned)
    .sign(sa.private_key)

  return `${unsigned}.${base64url(signature)}`
}

async function getAccessToken(): Promise<string> {
  if (_cachedToken && _cachedToken.expiresAt > Date.now() + 60_000) {
    return _cachedToken.token
  }

  const sa = getServiceAccount()
  const jwt = createSignedJWT(sa)

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
    signal: AbortSignal.timeout(8000),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`FCM OAuth token exchange failed: ${res.status} ${text}`)
  }

  const data = (await res.json()) as { access_token: string; expires_in: number }
  _cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
  return data.access_token
}

// ──────────────────────────────────────────────────────────────────
// FCM v1 메시지 타입
// ──────────────────────────────────────────────────────────────────

export interface FCMNotification {
  title: string
  body: string
}

export interface FCMData {
  [key: string]: string  // FCM data payload는 모두 string
}

export interface FCMSendOptions {
  notification: FCMNotification
  data?: FCMData
  android?: {
    priority?: 'normal' | 'high'
    ttl?: string                  // '86400s' 형식
    notification?: {
      sound?: string              // 'default'
      channel_id?: string         // Android 8+ notification channel
      icon?: string
      color?: string              // '#RRGGBB'
    }
  }
  apns?: {
    payload?: {
      aps?: {
        sound?: string
        badge?: number
      }
    }
  }
}

export interface FCMSendResult {
  ok: boolean
  messageId?: string
  error?: {
    code: string                  // 'UNREGISTERED' | 'INVALID_ARGUMENT' | 'QUOTA_EXCEEDED' | ...
    message: string
    status?: number
  }
  token?: string                  // sendToToken/sendToTokens 결과에서 추적용
}

// ──────────────────────────────────────────────────────────────────
// 발송 — 단일 토큰
// ──────────────────────────────────────────────────────────────────

export async function sendToToken(
  token: string,
  options: FCMSendOptions
): Promise<FCMSendResult> {
  try {
    const accessToken = await getAccessToken()
    const projectId = getProjectId()

    const message: any = {
      token,
      notification: options.notification,
    }
    if (options.data) message.data = options.data
    if (options.android) message.android = options.android
    if (options.apns) message.apns = options.apns

    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
        signal: AbortSignal.timeout(10000),
      }
    )

    if (!res.ok) {
      const errBody = await res.text()
      let parsed: any = {}
      try { parsed = JSON.parse(errBody) } catch { /* not json */ }

      const code = parsed?.error?.details?.[0]?.errorCode
        ?? parsed?.error?.status
        ?? 'UNKNOWN'
      const message = parsed?.error?.message ?? errBody.slice(0, 200)

      return {
        ok: false,
        error: { code, message, status: res.status },
        token,
      }
    }

    const data = (await res.json()) as { name: string }
    return {
      ok: true,
      messageId: data.name,           // e.g. "projects/trendsoccer/messages/0:1604..."
      token,
    }
  } catch (e: any) {
    return {
      ok: false,
      error: { code: 'FETCH_ERROR', message: e?.message ?? String(e) },
      token,
    }
  }
}

// ──────────────────────────────────────────────────────────────────
// 발송 — 다중 토큰 (병렬, 동시성 제한)
// ──────────────────────────────────────────────────────────────────

export interface SendToTokensResult {
  total: number
  success: number
  failed: number
  invalidTokens: string[]           // 'UNREGISTERED' / 'INVALID_ARGUMENT' 토큰 — 정리 권장
  results: FCMSendResult[]
}

export async function sendToTokens(
  tokens: string[],
  options: FCMSendOptions,
  concurrency: number = 20
): Promise<SendToTokensResult> {
  if (tokens.length === 0) {
    return { total: 0, success: 0, failed: 0, invalidTokens: [], results: [] }
  }

  // 동시성 제한 (FCM rate limit 보호)
  const results: FCMSendResult[] = []
  for (let i = 0; i < tokens.length; i += concurrency) {
    const batch = tokens.slice(i, i + concurrency)
    const batchResults = await Promise.all(
      batch.map(t => sendToToken(t, options))
    )
    results.push(...batchResults)
  }

  const invalidCodes = new Set(['UNREGISTERED', 'INVALID_ARGUMENT', 'NOT_FOUND'])
  const invalidTokens = results
    .filter(r => !r.ok && r.error && invalidCodes.has(r.error.code))
    .map(r => r.token!)
    .filter(Boolean)

  return {
    total: tokens.length,
    success: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
    invalidTokens,
    results,
  }
}

// ──────────────────────────────────────────────────────────────────
// 발송 — 토픽
// ──────────────────────────────────────────────────────────────────

export async function sendToTopic(
  topic: string,
  options: FCMSendOptions
): Promise<FCMSendResult> {
  try {
    const accessToken = await getAccessToken()
    const projectId = getProjectId()

    const message: any = {
      topic,                            // 'app_general', 'match_events', ...
      notification: options.notification,
    }
    if (options.data) message.data = options.data
    if (options.android) message.android = options.android
    if (options.apns) message.apns = options.apns

    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
        signal: AbortSignal.timeout(10000),
      }
    )

    if (!res.ok) {
      const text = await res.text()
      let parsed: any = {}
      try { parsed = JSON.parse(text) } catch { /* not json */ }
      return {
        ok: false,
        error: {
          code: parsed?.error?.status ?? 'UNKNOWN',
          message: parsed?.error?.message ?? text.slice(0, 200),
          status: res.status,
        },
      }
    }

    const data = (await res.json()) as { name: string }
    return { ok: true, messageId: data.name }
  } catch (e: any) {
    return {
      ok: false,
      error: { code: 'FETCH_ERROR', message: e?.message ?? String(e) },
    }
  }
}

// ──────────────────────────────────────────────────────────────────
// 헬퍼: data payload 값은 모두 string이어야 함
// ──────────────────────────────────────────────────────────────────

export function toFCMData(obj: Record<string, any>): FCMData {
  const out: FCMData = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue
    out[k] = String(v)
  }
  return out
}
