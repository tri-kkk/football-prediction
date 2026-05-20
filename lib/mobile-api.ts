/**
 * 모바일 API 공통 헬퍼 — 응답 envelope, 에러 코드, 요청 유틸
 *
 * 통합 가이드 v3.1 §6 기준
 */

import { NextResponse } from 'next/server'
import crypto from 'crypto'

// ──────────────────────────────────────────────────────────────────
// 응답 envelope
// ──────────────────────────────────────────────────────────────────

export function successResponse(
  data: any,
  meta?: Record<string, any>,
  status: number = 200
) {
  const body: Record<string, any> = {
    success: true,
    data,
    meta: {
      ...meta,
      serverTime: new Date().toISOString(),
    },
  }
  return NextResponse.json(body, { status })
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  extra: Record<string, any> = {}
) {
  return NextResponse.json(
    { success: false, error: { code, message, ...extra } },
    { status }
  )
}

// ──────────────────────────────────────────────────────────────────
// 표준 에러 코드 (v3.1 §6-3)
// ──────────────────────────────────────────────────────────────────

export const ErrorCode = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  SUBSCRIPTION_REQUIRED: 'SUBSCRIPTION_REQUIRED',
  CONSENT_REQUIRED: 'CONSENT_REQUIRED',
  COOLDOWN_ACTIVE: 'COOLDOWN_ACTIVE',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  APP_VERSION_OUTDATED: 'APP_VERSION_OUTDATED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',

  // OAuth 전용
  NAVER_TOKEN_INVALID: 'NAVER_TOKEN_INVALID',
  GOOGLE_TOKEN_INVALID: 'GOOGLE_TOKEN_INVALID',
  EMAIL_REQUIRED: 'EMAIL_REQUIRED',
  ACCOUNT_DELETED: 'ACCOUNT_DELETED',
} as const

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode]

// ──────────────────────────────────────────────────────────────────
// 요청 유틸
// ──────────────────────────────────────────────────────────────────

export function getRequestIP(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  )
}

export function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex')
}

// ──────────────────────────────────────────────────────────────────
// IP 지리정보 (ip-api.com 무료)
// ──────────────────────────────────────────────────────────────────

export async function getCountryFromIP(
  ip: string
): Promise<{ country: string; countryCode: string }> {
  if (
    ip === 'unknown' ||
    ip === '127.0.0.1' ||
    ip.startsWith('192.168.') ||
    ip === '::1'
  ) {
    return { country: 'Local', countryCode: 'LO' }
  }
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=country,countryCode`, {
      signal: AbortSignal.timeout(3000),
    })
    const data = await res.json()
    if (data.country) {
      return { country: data.country, countryCode: data.countryCode }
    }
  } catch (e) {
    console.warn('[mobile-api] IP geo failed:', (e as Error)?.message)
  }
  return { country: 'Unknown', countryCode: 'XX' }
}

// ──────────────────────────────────────────────────────────────────
// PostHog 서버 캡처
// ──────────────────────────────────────────────────────────────────

export async function capturePostHogEvent(
  event: 'signup_completed' | 'login_completed' | 'subscription_completed' | string,
  distinctId: string,
  properties: Record<string, any> = {}
): Promise<void> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return
  const host = (process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com').replace(
    /\/$/,
    ''
  )
  try {
    await fetch(`${host}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: key,
        event,
        distinct_id: distinctId,
        properties,
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(3000),
    })
  } catch (e) {
    console.warn('[mobile-api] PostHog capture failed:', (e as Error)?.message)
  }
}
