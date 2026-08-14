// app/api/coach/push/subscribe/route.ts — 웹 푸시 구독 저장/해제
import { NextRequest, NextResponse } from 'next/server';
import { getCoachUser } from '@/lib/coachAuth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const user = await getCoachUser(req);
  if (!user) return NextResponse.json({ error: 'auth' }, { status: 401 });
  const sub = await req.json().catch(() => null);
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return NextResponse.json({ error: 'invalid subscription' }, { status: 400 });
  }
  const { error } = await supabaseAdmin.from('push_subscriptions').upsert(
    {
      user_id: user.userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      user_agent: req.headers.get('user-agent') || null,
    },
    { onConflict: 'endpoint' }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { endpoint } = await req.json().catch(() => ({} as any));
  if (endpoint) await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', endpoint);
  return NextResponse.json({ ok: true });
}
