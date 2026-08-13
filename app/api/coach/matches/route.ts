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
      // 리그별 최고 등급 1경기씩 맛보기 공개 (ALL이면 리그마다 하나, 단일 리그면 그 리그 하나)
      const bestId: Record<string, string> = {};
      const bestScore: Record<string, number> = {};
      for (const m of matches) {
        if (!m.signal) continue;
        const sc = m.signal.score;
        if (bestScore[m.league] === undefined || sc > bestScore[m.league]) {
          bestScore[m.league] = sc;
          bestId[m.league] = m.matchId;
        }
      }
      const teaserIds = new Set(Object.values(bestId));
      matches = matches.map((m) =>
        teaserIds.has(m.matchId)
          ? { ...m, teaser: true }
          : { ...m, signal: null, market: null, model: { home: 0, draw: 0, away: 0 }, locked: true }
      );
      // 맛보기(공개) 카드들을 맨 위로 올려 비회원에게 바로 보이게 함
      matches.sort((a, b) => (b.teaser ? 1 : 0) - (a.teaser ? 1 : 0));
    }
    return NextResponse.json({ league, member, count: matches.length, matches });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'failed' }, { status: 500 });
  }
}
