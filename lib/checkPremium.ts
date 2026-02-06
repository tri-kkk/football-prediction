// lib/checkPremium.ts
import { createClient } from "@supabase/supabase-js";

// 서버 사이드용 (API routes에서 사용)
export function createServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// 클라이언트 사이드용
export function createClientSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * 사용자가 프리미엄 회원인지 확인
 */
export async function checkPremium(userId: string): Promise<boolean> {
  const supabase = createClientSupabase();
  
  const { data } = await supabase
    .from("subscriptions")
    .select("expires_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .single();

  return !!data;
}

/**
 * 프리미엄 만료일 조회
 */
export async function getPremiumExpiry(userId: string): Promise<Date | null> {
  const supabase = createClientSupabase();
  
  const { data } = await supabase
    .from("subscriptions")
    .select("expires_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .single();

  return data ? new Date(data.expires_at) : null;
}

/**
 * 구독 정보 전체 조회
 */
export async function getSubscriptionInfo(userId: string) {
  const supabase = createClientSupabase();
  
  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;

  return {
    plan: data.plan,
    price: data.price,
    startedAt: new Date(data.started_at),
    expiresAt: new Date(data.expires_at),
    daysLeft: Math.ceil(
      (new Date(data.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    ),
  };
}
