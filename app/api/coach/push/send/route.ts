// app/api/coach/push/send/route.ts — 웹 푸시 발송 (정산 크론/관리자용)
// POST { secret, title, body, url?, userId? }  — userId 없으면 전체 발송
import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { supabaseAdmin } from '@/lib/supabase';

const PUB = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const PRIV = process.env.VAPID_PRIVATE_KEY || '';
if (PUB && PRIV) {
  webpush.setVapidDetails('mailto:admin@trendsoccer.com', PUB, PRIV);
}

export async function POST(req: NextRequest) {
  if (!PUB || !PRIV) return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 });
  const { secret, title, body, url, userId } = await req.json().catch(() => ({} as any));
  if (process.env.PUSH_SEND_SECRET && secret !== process.env.PUSH_SEND_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  let q = supabaseAdmin.from('push_subscriptions').select('*');
  if (userId) q = q.eq('user_id', userId);
  const { data } = await q;
  const payload = JSON.stringify({ title: title || 'TrendCoach', body: body || '', url: url || '/' });
  let sent = 0, gone = 0;
  await Promise.all((data || []).map(async (s: any) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
      sent++;
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
        gone++;
      }
    }
  }));
  return NextResponse.json({ ok: true, sent, gone });
}
