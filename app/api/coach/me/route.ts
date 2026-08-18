// app/api/coach/me/route.ts
// GET /api/coach/me — 두 등급 표기용 상태. subscriptions 단일 소스로 판정(앱 전체 checkPremium과 일관).
//  · 메인 프리미엄(TrendSoccer): product != 'coach' 활성  (product 기본값 'trendsoccer', 코치만 'coach')
//  · 코치 플랜(TrendCoach): product = 'coach' 활성
// 로그인 안 됐으면 authed:false만 반환(402/401 아님 — 배지는 비회원도 렌더).
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/mobile-auth';
import { getCoachUser } from '@/lib/coachAuth';

export const dynamic = 'force-dynamic';

const GUEST = { authed: false, ts: { active: false, expiresAt: null as string | null }, coach: { active: false, expiresAt: null as string | null, plan: null as string | null }, bundleEligible: false };

export async function GET(req: NextRequest) {
  const user = await getCoachUser(req);
  if (!user) return NextResponse.json(GUEST);

  const supabase = getServerSupabase();
  const nowIso = new Date().toISOString();
  const [tsRes, coachRes] = await Promise.all([
    // 메인 프리미엄: 코치가 아닌 활성 구독(product 기본값 'trendsoccer')
    supabase.from('subscriptions').select('expires_at')
      .eq('user_id', user.userId).neq('product', 'coach').eq('status', 'active')
      .gt('expires_at', nowIso).order('expires_at', { ascending: false }).limit(1).maybeSingle(),
    // 코치 플랜
    supabase.from('subscriptions').select('expires_at, plan')
      .eq('user_id', user.userId).eq('product', 'coach').eq('status', 'active')
      .gt('expires_at', nowIso).order('expires_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  const tsActive = !!tsRes.data;
  const coachActive = !!coachRes.data;

  return NextResponse.json({
    authed: true,
    ts: { active: tsActive, expiresAt: tsRes.data?.expires_at ?? null },
    coach: { active: coachActive, expiresAt: coachRes.data?.expires_at ?? null, plan: coachRes.data?.plan ?? null },
    // 메인 프리미엄인데 코치 미보유 → 번들가(₩6,900) 대상
    bundleEligible: tsActive && !coachActive,
  });
}
