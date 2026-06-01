/**
 * Google Play Developer API 헬퍼
 *
 * - 서비스 계정 JWT(RS256) 직접 서명 → OAuth2 token 교환 → 토큰 캐싱
 * - purchases.subscriptions.get 호출로 구매 토큰 검증
 * - RTDN(Real-time Developer Notifications) payload 파싱
 *
 * 의존성 0 (Node crypto만 사용).
 *
 * 환경변수:
 *   GOOGLE_PLAY_PACKAGE_NAME            com.trendsoccer.app
 *   GOOGLE_PLAY_SERVICE_ACCOUNT_JSON    base64(service-account.json) 또는 raw JSON
 *   GOOGLE_PLAY_PUBSUB_TOPIC            projects/<프로젝트ID>/topics/<토픽이름>
 *   GOOGLE_PLAY_PUBSUB_VERIFY_TOKEN     RTDN Push 구독 endpoint에 박은 ?token=... 값
 */

import crypto from 'crypto'

// ──────────────────────────────────────────────────────────────────
// 상품 매핑
// ──────────────────────────────────────────────────────────────────

export interface ProductInfo {
  plan: 'monthly' | 'quarterly'
  months: number
  price: number       // KRW
  label: string
  labelEn: string
}

export const PRODUCT_MAP: Record<string, ProductInfo> = {
  premium_monthly: {
    plan: 'monthly',
    months: 1,
    price: 4900,
    label: 'TrendSoccer 프리미엄 1개월',
    labelEn: 'TrendSoccer Premium 1 month',
  },
  premium_quarterly: {
    plan: 'quarterly',
    months: 3,
    price: 9900,
    label: 'TrendSoccer 프리미엄 3개월',
    labelEn: 'TrendSoccer Premium 3 months',
  },
}

export function getProductInfo(productId: string): ProductInfo | null {
  return PRODUCT_MAP[productId] || null
}

// ──────────────────────────────────────────────────────────────────
// 서비스 계정 인증
// ──────────────────────────────────────────────────────────────────

interface ServiceAccount {
  type: string
  project_id: string
  private_key_id: string
  private_key: string
  client_email: string
  client_id: string
  token_uri: string
}

let _serviceAccount: ServiceAccount | null = null

function getServiceAccount(): ServiceAccount {
  if (_serviceAccount) return _serviceAccount

  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
  if (!raw) {
    throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON env var is missing')
  }

  // base64 또는 raw JSON 자동 감지
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
    throw new Error(`Failed to parse GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: ${(e as Error).message}`)
  }
}

// ──────────────────────────────────────────────────────────────────
// OAuth access token 발급 + 캐싱 (50분 유효, 55분에 재발급)
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
    scope: 'https://www.googleapis.com/auth/androidpublisher',
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
    throw new Error(`Google OAuth token exchange failed: ${res.status} ${text}`)
  }

  const data = (await res.json()) as { access_token: string; expires_in: number }
  _cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
  return data.access_token
}

// ──────────────────────────────────────────────────────────────────
// 구독 토큰 검증 — purchases.subscriptions.get
// ──────────────────────────────────────────────────────────────────

export interface SubscriptionPurchase {
  kind: string                     // 'androidpublisher#subscriptionPurchase'
  startTimeMillis: string          // string number
  expiryTimeMillis: string         // string number
  autoRenewing: boolean
  priceCurrencyCode: string        // 'KRW'
  priceAmountMicros: string        // string number (price * 1_000_000)
  countryCode: string
  developerPayload?: string
  paymentState?: number            // 0=Pending, 1=Received, 2=Free trial, 3=Pending deferred
  cancelReason?: number            // 0=user, 1=system (billing), 2=replacement, 3=developer
  userCancellationTimeMillis?: string
  orderId?: string
  linkedPurchaseToken?: string     // 갱신 시 이전 토큰
  purchaseType?: number            // 0=test, 1=promo, ...
  acknowledgementState?: number    // 0=Yet to be acknowledged, 1=Acknowledged
  obfuscatedExternalAccountId?: string
  obfuscatedExternalProfileId?: string
}

export async function verifySubscription(
  productId: string,
  purchaseToken: string
): Promise<SubscriptionPurchase> {
  const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME
  if (!packageName) {
    throw new Error('GOOGLE_PLAY_PACKAGE_NAME env var is missing')
  }

  const token = await getAccessToken()
  const url =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/` +
    `${encodeURIComponent(packageName)}/purchases/subscriptions/` +
    `${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10000),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Google Play verify failed: ${res.status} ${text.slice(0, 500)}`)
  }

  return (await res.json()) as SubscriptionPurchase
}

// ──────────────────────────────────────────────────────────────────
// 구독 ack — Acknowledge a Subscription Purchase
// ──────────────────────────────────────────────────────────────────
// Google Play 정책: 검증 후 3일 이내 acknowledge 해야 함. 안 그러면 구독 자동 환불됨.

export async function acknowledgeSubscription(
  productId: string,
  purchaseToken: string
): Promise<void> {
  const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME!
  const token = await getAccessToken()
  const url =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/` +
    `${encodeURIComponent(packageName)}/purchases/subscriptions/` +
    `${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
    signal: AbortSignal.timeout(8000),
  })

  if (!res.ok && res.status !== 204) {
    const text = await res.text()
    console.warn('[google-play] acknowledge failed (계속 진행):', res.status, text.slice(0, 200))
    // 실패해도 throw 안 함 — Google이 자동 환불 처리하면 webhook으로 알게 됨
  }
}

// ──────────────────────────────────────────────────────────────────
// RTDN(Real-time Developer Notifications) 페이로드
// ──────────────────────────────────────────────────────────────────

export interface RTDNPayload {
  version: string
  packageName: string
  eventTimeMillis: string
  subscriptionNotification?: {
    version: string
    notificationType: number   // see SubscriptionNotificationType
    purchaseToken: string
    subscriptionId: string
  }
  oneTimeProductNotification?: {
    version: string
    notificationType: number
    purchaseToken: string
    sku: string
  }
  testNotification?: {
    version: string
  }
}

// https://developer.android.com/google/play/billing/rtdn-reference#sub
export const SubscriptionNotificationType = {
  RECOVERED: 1,             // 회복 (결제 실패 → 복구)
  RENEWED: 2,               // 자동 갱신 성공
  CANCELED: 3,              // 사용자 취소
  PURCHASED: 4,             // 첫 구매 또는 재가입
  ON_HOLD: 5,               // 결제 실패 후 보류
  IN_GRACE_PERIOD: 6,       // 유예 기간
  RESTARTED: 7,             // 재시작
  PRICE_CHANGE_CONFIRMED: 8,
  DEFERRED: 9,
  PAUSED: 10,
  PAUSE_SCHEDULE_CHANGED: 11,
  REVOKED: 12,              // 환불됨 (만료 전 즉시 차감)
  EXPIRED: 13,              // 자연 만료
  PENDING_PURCHASE_CANCELED: 20,
} as const

export function parseRTDNMessage(messageData: string): RTDNPayload {
  // Pub/Sub Push body: { message: { data: <base64>, attributes: {} }, subscription: '...' }
  // data를 base64 decode 하면 JSON
  const decoded = Buffer.from(messageData, 'base64').toString('utf-8')
  return JSON.parse(decoded) as RTDNPayload
}

// ──────────────────────────────────────────────────────────────────
// Webhook 토큰 검증 (Pub/Sub Push 요청에 박힌 ?token=... 쿼리)
// ──────────────────────────────────────────────────────────────────

export function verifyWebhookToken(requestUrl: string): boolean {
  const expected = process.env.GOOGLE_PLAY_PUBSUB_VERIFY_TOKEN
  if (!expected) return false

  try {
    const url = new URL(requestUrl)
    const got = url.searchParams.get('token')
    if (!got) return false
    // 상수 시간 비교
    if (got.length !== expected.length) return false
    return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected))
  } catch {
    return false
  }
}
