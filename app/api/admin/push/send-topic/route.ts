/**
 * POST /api/admin/push/send-topic
 *
 * 관리자가 토픽 푸시 발송 (공지/마케팅).
 * 토픽: 'app_general' | 'match_events' | 'marketing'
 *
 * Body:
 *   {
 *     topic: 'app_general' | 'match_events' | 'marketing',
 *     ko: { title: string, body: string },
 *     en?: { title: string, body: string },   // 없으면 ko로 발송
 *     data?: Record<string, any>              // optional payload (deeplink 등)
 *   }
 *
 * 응답:
 *   {
 *     success: true,
 *     results: [
 *       { locale: 'ko', topic: 'app_general_ko', ok: true, messageId: '...' },
 *       { locale: 'en', topic: 'app_general_en', ok: true, messageId: '...' }
 *     ]
 *   }
 *
 * 토픽 네이밍 규칙: <topic>_<locale> (예: app_general_ko, app_general_en)
 * → 앱에서 구독 시: locale별로 별도 구독 (firebase_messaging.subscribeToTopic('app_general_ko'))
 *
 * 인증: 관리자 전용 — 환경변수 ADMIN_PUSH_SECRET을 Authorization: Bearer 헤더로 전달.
 *      미설정 시 X-Internal-Call=1 헤더로 우회 가능 (개발/내부 호출용).
 */

import { NextRequest, NextResponse } from 'next/server'

import { sendToTopic, toFCMData, type FCMSendOptions } from '@/lib/fcm'

const ALLOWED_TOPICS = new Set(['app_general', 'match_events', 'marketing'])

function authorize(request: NextRequest): { ok: true } | { ok: false; reason: string } {
  const secret = process.env.ADMIN_PUSH_SECRET
  if (!secret) {
    // 미설정 환경 — 내부 호출 헤더만 허용
    if (request.headers.get('x-internal-call') === '1') return { ok: true }
    return { ok: false, reason: 'ADMIN_PUSH_SECRET not configured' }
  }
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return { ok: false, reason: 'Bearer token required' }
  const provided = auth.slice(7).trim()
  if (provided !== secret) return { ok: false, reason: 'Invalid secret' }
  return { ok: true }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = authorize(request)
    if (!authResult.ok) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: authResult.reason } },
        { status: 401 }
      )
    }

    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON' } },
        { status: 400 }
      )
    }

    const { topic, ko, en, data: extraData } = body || {}

    if (!topic || !ALLOWED_TOPICS.has(topic)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'topic must be one of: ' + Array.from(ALLOWED_TOPICS).join(', '),
          },
        },
        { status: 400 }
      )
    }
    if (!ko?.title || !ko?.body) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'ko.title and ko.body are required',
          },
        },
        { status: 400 }
      )
    }

    const data = toFCMData({
      type: 'topic',
      topic,
      ...(extraData ?? {}),
    })

    const results: any[] = []

    // ko 발송
    const koOptions: FCMSendOptions = {
      notification: { title: ko.title, body: ko.body },
      data,
      android: {
        priority: 'high',
        notification: { sound: 'default', channel_id: topic },
      },
      apns: { payload: { aps: { sound: 'default' } } },
    }
    const koResult = await sendToTopic(`${topic}_ko`, koOptions)
    results.push({
      locale: 'ko',
      topic: `${topic}_ko`,
      ok: koResult.ok,
      messageId: koResult.messageId,
      error: koResult.error,
    })

    // en 발송 (옵셔널)
    if (en?.title && en?.body) {
      const enOptions: FCMSendOptions = {
        notification: { title: en.title, body: en.body },
        data,
        android: {
          priority: 'high',
          notification: { sound: 'default', channel_id: topic },
        },
        apns: { payload: { aps: { sound: 'default' } } },
      }
      const enResult = await sendToTopic(`${topic}_en`, enOptions)
      results.push({
        locale: 'en',
        topic: `${topic}_en`,
        ok: enResult.ok,
        messageId: enResult.messageId,
        error: enResult.error,
      })
    }

    return NextResponse.json({
      success: results.every((r) => r.ok),
      results,
    })
  } catch (error: any) {
    console.error('[push/send-topic] error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }
}
