// app/api/admin/push/schedule/route.ts
// 예약 푸시 CRUD (관리자). GET 목록 / POST 등록 / DELETE 취소.
// 발송은 크론(/api/cron/send-scheduled-push)이 처리.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const TOPICS = new Set(['app_general', 'match_events', 'marketing'])

export async function GET() {
  const { data, error } = await supabase
    .from('scheduled_pushes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json()
    const topic = b.topic
    const scheduleType = b.scheduleType || 'once'
    if (!TOPICS.has(topic)) return NextResponse.json({ error: 'invalid topic' }, { status: 400 })
    if (!b.ko?.title?.trim() || !b.ko?.body?.trim())
      return NextResponse.json({ error: 'ko title/body required' }, { status: 400 })

    const row: any = {
      topic,
      ko_title: b.ko.title.trim(),
      ko_body: b.ko.body.trim(),
      en_title: b.en?.title?.trim() || null,
      en_body: b.en?.body?.trim() || null,
      deeplink: b.deeplink?.trim() || null,
      schedule_type: scheduleType,
    }

    if (scheduleType === 'once') {
      if (!b.scheduledAt) return NextResponse.json({ error: 'scheduledAt required' }, { status: 400 })
      const at = new Date(b.scheduledAt)
      if (isNaN(at.getTime())) return NextResponse.json({ error: 'invalid scheduledAt' }, { status: 400 })
      if (at.getTime() < Date.now() - 60_000)
        return NextResponse.json({ error: '과거 시각은 예약할 수 없습니다' }, { status: 400 })
      row.scheduled_at = at.toISOString()
      row.status = 'pending'
    } else if (scheduleType === 'daily' || scheduleType === 'weekly') {
      const h = Number(b.runHour), m = Number(b.runMinute ?? 0)
      if (!Number.isInteger(h) || h < 0 || h > 23) return NextResponse.json({ error: 'invalid runHour' }, { status: 400 })
      row.run_hour = h
      row.run_minute = Number.isInteger(m) ? m : 0
      if (scheduleType === 'weekly') {
        const w = Number(b.weekday)
        if (!Number.isInteger(w) || w < 0 || w > 6) return NextResponse.json({ error: 'invalid weekday' }, { status: 400 })
        row.weekday = w
      }
      row.status = 'active'
    } else {
      return NextResponse.json({ error: 'invalid scheduleType' }, { status: 400 })
    }

    const { data, error } = await supabase.from('scheduled_pushes').insert(row).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  // 아직 안 나간 예약은 취소 상태로 (기록 보존)
  const { error } = await supabase.from('scheduled_pushes').update({ status: 'canceled' }).eq('id', Number(id))
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
