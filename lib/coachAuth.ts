// lib/coachAuth.ts
// 코치 API 사용자 식별 — 웹/TWA(NextAuth 쿠키 세션)와 네이티브 앱(모바일 JWT) 둘 다 지원.
// 우선순위: Bearer JWT > NextAuth 쿠키 세션(SSO, .trendsoccer.com).
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getMobileSession, getServerSupabase } from './mobile-auth';

export interface CoachUser { userId: string; email?: string }

export async function getCoachUser(req: NextRequest): Promise<CoachUser | null> {
  // 1) 네이티브 앱: Authorization Bearer JWT
  const m = await getMobileSession(req);
  if (m) return { userId: m.userId, email: m.email };

  // 2) 웹/TWA: NextAuth 쿠키 세션 → 이메일 → users.id
  //    (기존 seedpay/init 과 동일하게 bare getServerSession 사용)
  const s = await getServerSession();
  if (s?.user?.email) {
    const supabase = getServerSupabase();
    const { data } = await supabase.from('users').select('id').ilike('email', s.user.email).single();
    if (data?.id) return { userId: data.id, email: s.user.email };
  }
  return null;
}
