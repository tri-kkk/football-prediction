// app/api/cron/send-scheduled-push/route.ts
// 5분마다 pg_cron이 호출. 도래한 예약 푸시(once/daily/weekly)를 찾아 FCM 토픽 발송.
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendToTopic, toFCMData, type FCMSendOptions } from '@/lib/fcm'
import { applyPromoPolicy, isNightKST } from '@/lib/promoPolicy'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// 발송 결과 or 스킵 사유
type SendOutcome = { skipped: 'marketing_blocked' | 'night_blocked' | null; results: any[] }

async function sendOne(row: any): Promise<SendOutcome> {
  // B29: marketing 토픽은 발송 중단 (기존 예약분 포함)
  if (row.topic === 'marketing') return { skipped: 'marketing_blocked', results: [] }

  // B30: 광고성 정책 적용(멱등) — promo 고정 + (광고) 표기 + 수신거부 첨부
  const koIn = { title: row.ko_title, body: row.ko_body }
  const enIn = row.en_title && row.en_body ? { title: row.en_title, body: row.en_body } : undefined
  const pol = applyPromoPolicy({ topic: row.topic, ko: koIn, en: enIn })
  // B30: 광고성은 야간(21:00~08:00 KST) 발송 차단 (백스톱 — 이 실행분만 스킵, 상태 유지)
  if (pol.isPromo && isNightKST()) return { skipped: 'night_blocked', results: [] }

  const finalTopic = pol.topic
  const data = toFCMData({ type: 'topic', topic: finalTopic, ...(row.deeplink ? { deeplink: row.deeplink } : {}) })
  const base = {
    data,
    android: { priority: 'high' as const, notification: { sound: 'default', channel_id: finalTopic } },
    apns: { payload: { aps: { sound: 'default' } } },
  }
  const results: any[] = []
  const ko: FCMSendOptions = { notification: { title: pol.ko!.title, body: pol.ko!.body }, ...base }
  const rk = await sendToTopic(`${finalTopic}_ko`, ko)
  results.push({ locale: 'ko', topic: `${finalTopic}_ko`, ok: rk.ok, messageId: rk.messageId, error: rk.error })
  if (pol.en?.title && pol.en?.body) {
    const en: FCMSendOptions = { notification: { title: pol.en.title, body: pol.en.body }, ...base }
    const re = await sendToTopic(`${finalTopic}_en`, en)
    results.push({ locale: 'en', topic: `${finalTopic}_en`, ok: re.ok, messageId: re.messageId, error: re.error })
  }
  return { skipped: null, results }
}

export async function GET() {
  const now = new Date()
  // KST 기준 시/분/요일
  const kst = new Date(now.getTime() + 9 * 3600 * 1000)
  const kMins = kst.getUTCHours() * 60 + kst.getUTCMinutes()
  const kDow = kst.getUTCDay() // 0=일
  const DAY_MS = 23 * 3600 * 1000 // 반복 중복 방지(23h)

  const processed: any[] = []

  // 1) 일회성: pending & scheduled_at <= now
  const { data: onces } = await supabase
    .from('scheduled_pushes')
    .select('*')
    .eq('status', 'pending')
    .eq('schedule_type', 'once')
    .lte('scheduled_at', now.toISOString())
    .limit(50)

  for (const row of onces || []) {
    try {
      const { skipped, results } = await sendOne(row)
      if (skipped === 'marketing_blocked') {
        // B29: 중단된 marketing 예약 → 취소 처리(재선택 방지, 기록 보존)
        await supabase.from('scheduled_pushes')
          .update({ status: 'canceled', last_run_at: now.toISOString(), last_result: { skipped } })
          .eq('id', row.id)
        processed.push({ id: row.id, type: 'once', skipped })
        continue
      }
      if (skipped === 'night_blocked') {
        // B30: 야간 차단 → pending 유지, 08시 이후 다음 실행에서 발송
        processed.push({ id: row.id, type: 'once', skipped })
        continue
      }
      const ok = results.every((r) => r.ok)
      await supabase.from('scheduled_pushes')
        .update({ status: ok ? 'sent' : 'failed', last_run_at: now.toISOString(), last_result: results })
        .eq('id', row.id)
      processed.push({ id: row.id, type: 'once', ok })
    } catch (e: any) {
      await supabase.from('scheduled_pushes')
        .update({ status: 'failed', last_run_at: now.toISOString(), last_result: { error: e.message } })
        .eq('id', row.id)
      processed.push({ id: row.id, type: 'once', ok: false, error: e.message })
    }
  }

  // 2) 반복: active. KST 도래 시각 지났고, 오늘(23h 내) 아직 안 나갔으면 발송
  const { data: recurs } = await supabase
    .from('scheduled_pushes')
    .select('*')
    .eq('status', 'active')
    .in('schedule_type', ['daily', 'weekly'])
    .limit(100)

  for (const row of recurs || []) {
    const target = (row.run_hour ?? 0) * 60 + (row.run_minute ?? 0)
    if (kMins < target) continue
    if (row.schedule_type === 'weekly' && row.weekday !== kDow) continue
    if (row.last_run_at && now.getTime() - new Date(row.last_run_at).getTime() < DAY_MS) continue
    try {
      const { skipped, results } = await sendOne(row)
      if (skipped) {
        // marketing_blocked / night_blocked → 이번 tick 스킵(last_run 갱신 안 함)
        processed.push({ id: row.id, type: row.schedule_type, skipped })
        continue
      }
      await supabase.from('scheduled_pushes')
        .update({ last_run_at: now.toISOString(), last_result: results })
        .eq('id', row.id)
      processed.push({ id: row.id, type: row.schedule_type, ok: results.every((r) => r.ok) })
    } catch (e: any) {
      await supabase.from('scheduled_pushes')
        .update({ last_run_at: now.toISOString(), last_result: { error: e.message } })
        .eq('id', row.id)
      processed.push({ id: row.id, type: row.schedule_type, ok: false, error: e.message })
    }
  }

  return NextResponse.json({ ok: true, at: now.toISOString(), processed })
}
