// lib/checkCoachMembership.ts
// TrendCoach 멤버쉽 확인 (서버 전용). subscriptions.product='coach' 필터.
// ⚠️ 서비스 롤 키 사용: subscriptions에 RLS가 걸려 있어도 서버에서 정확히 조회되도록.
import { createClient } from '@supabase/supabase-js';

function serverSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
  );
}

/** TrendCoach 멤버쉽(활성) 여부 */
export async function checkCoachMembership(userId: string): Promise<boolean> {
  const supabase = serverSupabase();
  const { data } = await supabase
    .from('subscriptions')
    .select('expires_at')
    .eq('user_id', userId)
    .eq('product', 'coach')
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return !!data;
}

/** 코치 멤버쉽 만료일 */
export async function getCoachExpiry(userId: string): Promise<Date | null> {
  const supabase = serverSupabase();
  const { data } = await supabase
    .from('subscriptions')
    .select('expires_at')
    .eq('user_id', userId)
    .eq('product', 'coach')
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? new Date(data.expires_at) : null;
}
