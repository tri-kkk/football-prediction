// lib/checkCoachMembership.ts
// TrendCoach 멤버쉽 확인. 기존 checkPremium 패턴을 그대로 따르되 product='coach'로 필터.
import { createClient } from '@supabase/supabase-js';

function clientSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/** TrendCoach 멤버쉽(활성) 여부 */
export async function checkCoachMembership(userId: string): Promise<boolean> {
  const supabase = clientSupabase();
  const { data } = await supabase
    .from('subscriptions')
    .select('expires_at')
    .eq('user_id', userId)
    .eq('product', 'coach')
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: false })
    .limit(1)
    .single();
  return !!data;
}

/** 코치 멤버쉽 만료일 */
export async function getCoachExpiry(userId: string): Promise<Date | null> {
  const supabase = clientSupabase();
  const { data } = await supabase
    .from('subscriptions')
    .select('expires_at')
    .eq('user_id', userId)
    .eq('product', 'coach')
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: false })
    .limit(1)
    .single();
  return data ? new Date(data.expires_at) : null;
}
