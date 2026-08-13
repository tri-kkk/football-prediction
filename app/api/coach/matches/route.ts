// app/api/coach/matches/route.ts
// GET /api/coach/matches?league=PL|ALL
// 회원: 전체. 미구독/비로그인: 오늘 최고등급 1경기만 공개(맛보기), 나머지 잠금.
import { NextRequest, NextResponse } from 'next/server';
import { getCoachUser } from '@/lib/coachAuth';
import { checkCoachMembership } from '@/lib/checkCoachMembership';
import { getMatchesWithSignals } from '@/lib/coachMatchService';

export const revalidate = 300;

export async function GET(req: NextRequest) {
  const league = req.nextUrl.searchParams.get('league') ?? 'ALL';
  const user = await getCoachUser(req);
  const member = user ? await checkCoachMembership(user.userId) : false;
  try {
    let matches = await getMatchesWithSignals(league);

    if (!member) {
      const withSig = matches.filter((m) => m.signal);
      const teaserId = withSig
        .slice()
        .sort((a, b) => (b.signal!.score) - (a.signal!.score))[0]?.matchId;
      matches = matches.map((m) =>
        m.matchId === teaserId
          ? { ...m, teaser: true }
          : { ...m, signal: null, market: null, model: { home: 0, draw: 0, away: 0 }, locked: true }
      );
      // 맛보기(공개) 카드를 맨 위로 올려 비회원에게 바로 보이게 함
      matches.sort((a, b) => (b.teaser ? 1 : 0) - (a.teaser ? 1 : 0));
    }
    return NextResponse.json({ league, member, count: matches.length, matches });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'failed' }, { status: 500 });
  }
}
