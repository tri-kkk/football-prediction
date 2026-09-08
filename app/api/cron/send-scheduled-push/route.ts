// app/api/cron/send-scheduled-push/route.ts
// 5분마다 pg_cron이 호출. 도래한 예약 푸시(once/daily/weekly)를 찾아 FCM 토픽 발송.
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendToTopic, toFCMData, type FCMSendOptions } from '@/lib/fcm'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function sendOne(row: any) {
  const data = toFCMData({ type: 'topic', topic: row.topic, ...(row.deeplink ? { deeplink: row.deeplink } : {}) })
  const base = {
    data,
    android: { priority: 'high' as const, notification: { sound: 'default', channel_id: row.topic } },
    apns: { payload: { aps: { sound: 'default' } } },
  }
  const results: any[] = []
  const ko: FCMSendOptions = { notification: { title: row.ko_title, body: row.ko_body }, ...base }
  const rk = await sendToTopic(`${row.topic}_ko`, ko)
  results.push({ locale: 'ko', topic: `${row.topic}_ko`, ok: rk.ok, messageId: rk.messageId, error: rk.error })
  if (row.en_title && row.en_body) {
    const en: FCMSendOptions = { notification: { title: row.en_title, body: row.en_body }, ...base }
    const re = await sendToTopic(`${row.topic}_en`, en)
    results.push({ locale: 'en', topic: `${row.topic}_en`, ok: re.ok, messageId: re.messageId, error: re.error })
  }
  return results
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
      const results = await sendOne(row)
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
      const results = await sendOne(row)
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
