// app/api/admin/coach-membership/route.ts
// 어드민 회원관리 — TrendCoach 멤버쉽 수동 부여/연장/해지.
// 프리미엄(users.tier)과 분리: subscriptions.product='coach' 로만 관리.
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
);

// GET: 활성 코치 멤버쉽 목록 → { members: { [user_id]: expires_at } }
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('user_id, expires_at')
      .eq('product', 'coach')
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false });
    if (error) throw error;
    const members: Record<string, string> = {};
    for (const s of data || []) {
      if (!members[s.user_id]) members[s.user_id] = s.expires_at; // 가장 늦은 만료 우선
    }
    return NextResponse.json({ members });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '조회 실패' }, { status: 500 });
  }
}

// POST: 코치 멤버쉽 부여/연장 { user_id, months? = 1 }
export async function POST(request: NextRequest) {
  try {
    const { user_id, months = 1 } = await request.json();
    if (!user_id) return NextResponse.json({ error: 'user_id가 필요합니다' }, { status: 400 });

    // 활성 코치 구독 있으면 연장, 없으면 신규 부여
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id, expires_at')
      .eq('user_id', user_id)
      .eq('product', 'coach')
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = new Date();
    if (existing) {
      const base = new Date(existing.expires_at);
      base.setMonth(base.getMonth() + months);
      const { error } = await supabase
        .from('subscriptions')
        .update({ expires_at: base.toISOString(), updated_at: now.toISOString() })
        .eq('id', existing.id);
      if (error) throw error;
      return NextResponse.json({ success: true, expires_at: base.toISOString(), extended: true });
    }

    const expires = new Date(now);
    expires.setMonth(expires.getMonth() + months);
    const { error } = await supabase.from('subscriptions').insert({
      user_id,
      product: 'coach',
      plan: 'coach_monthly',
      status: 'active',
      started_at: now.toISOString(),
      expires_at: expires.toISOString(),
      price: 0,
      payment_id: `admin_grant_${now.getTime()}`,
    });
    if (error) throw error;
    return NextResponse.json({ success: true, expires_at: expires.toISOString(), extended: false });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '부여 실패' }, { status: 500 });
  }
}

// DELETE: 코치 멤버쉽 해지 ?user_id=
export async function DELETE(request: NextRequest) {
  try {
    const user_id = new URL(request.url).searchParams.get('user_id');
    if (!user_id) return NextResponse.json({ error: 'user_id가 필요합니다' }, { status: 400 });
    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('user_id', user_id)
      .eq('product', 'coach')
      .eq('status', 'active');
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '해지 실패' }, { status: 500 });
  }
}
