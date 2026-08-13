// lib/coachSubscription.ts
// 코치 멤버쉽 부여 + 가격(번들/단독) 정책. subscriptions.product='coach'로 저장.
import type { SupabaseClient } from '@supabase/supabase-js';

export interface CoachPlan { key: string; amount: number; months: number; name: string; bundle: boolean }

/** TrendSoccer 프리미엄 회원이면 번들 할인가, 아니면 단독가. (월 구독) */
export function coachPlan(hasTsPremium: boolean): CoachPlan {
  return hasTsPremium
    ? { key: 'coach_monthly_bundle', amount: 6900, months: 1, name: 'TrendCoach 멤버쉽 1개월 (번들)', bundle: true }
    : { key: 'coach_monthly', amount: 9900, months: 1, name: 'TrendCoach 멤버쉽 1개월', bundle: false };
}

/** 코치 구독 활성화(insert). checkCoachMembership은 최신 active(expires_at desc)를 봄. */
export async function grantCoachMembership(
  supabase: SupabaseClient,
  userId: string,
  months: number,
  price: number,
  planKey: string,
  paymentId: string
) {
  const start = new Date();
  const expires = new Date(start);
  expires.setMonth(expires.getMonth() + months);
  return supabase.from('subscriptions').insert({
    user_id: userId,
    product: 'coach',
    plan: planKey,
    status: 'active',
    started_at: start.toISOString(),
    expires_at: expires.toISOString(),
    payment_id: paymentId,
    price,
    payment_method: 'CARD',
  });
}
