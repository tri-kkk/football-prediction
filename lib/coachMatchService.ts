// lib/coachMatchService.ts
// 경기 + KSM 시그널 조립 (실배선). ksmModel(모델·devig·패턴) + fg_patterns + match_odds_latest.
// matches / bets 라우트가 공유.

import { supabaseAdmin } from './supabase';
import {
  LEAGUES, FINISHED, currentSeason, af, buildTeamStats, predict, devig, patternCode, recommend,
} from './ksmModel';
import {
  signalGrade, formType, ksmCodeToPattern, modelMarketGap, gapStrength, argmaxPick, pickKey,
  type Pick, type Grade, type Probs,
} from './coachSignal';

export interface MatchSignal {
  matchId: string; league: string; kickoff: string; home: string; away: string;
  homeId: number; awayId: number; round?: string;
  model: Probs; market: (Probs & { overround?: number }) | null;
  odds: { home: number | null; draw: number | null; away: number | null };
  signal: {
    grade: Grade; score: number;
    formType: string; strengths: { home: string; draw: string; away: string };
    recommendation: Pick | 'WATCH'; recommendationText: string;
    histRate: number | null; totalMatches: number | null; confidence: string | null;
    patternCode: string; ksmCode: string;
    gap: { outcome: Pick; pp: number; strength: number } | null;
  } | null;
  teaser?: boolean; locked?: boolean;
}

async function patternMap(leagueId: number): Promise<Record<string, any>> {
  const { data } = await supabaseAdmin.from('fg_patterns').select('*').eq('league_id', leagueId);
  const map: Record<string, any> = {};
  for (const p of data || []) map[p.pattern] = p;
  return map;
}
async function oddsMap(fixtureIds: string[]): Promise<Record<string, any>> {
  if (!fixtureIds.length) return {};
  const { data } = await supabaseAdmin
    .from('match_odds_latest').select('match_id,home_odds,draw_odds,away_odds').in('match_id', fixtureIds);
  const map: Record<string, any> = {};
  for (const o of data || []) map[String(o.match_id)] = o;
  return map;
}

function buildFromFixture(f: any, stats: Record<number, any>, patMap: Record<string, any>, o: any, leagueCode: string): MatchSignal {
  const hId = f.teams.home.id, aId = f.teams.away.id;
  const base: MatchSignal = {
    matchId: String(f.fixture.id), league: leagueCode, kickoff: f.fixture.date,
    home: f.teams.home.name, away: f.teams.away.name, homeId: hId, awayId: aId,
    round: f.league?.round ?? undefined,
    model: { home: 0, draw: 0, away: 0 }, market: null,
    odds: { home: o?.home_odds ?? null, draw: o?.draw_odds ?? null, away: o?.away_odds ?? null },
    signal: null,
  };
  const h = stats[hId], a = stats[aId];
  if (!h || !a) return base;

  const p = predict(h, a);
  base.model = p;
  const ksmCode = patternCode(p.home, p.draw, p.away);
  const patternCodeH = ksmCodeToPattern(ksmCode);
  const patHist = patMap[ksmCode] || null;
  const rec = argmaxPick(p);
  const pMax = Math.max(p.home, p.draw, p.away);
  const recKey = pickKey(rec);
  const histRate =
    patHist ? (rec === 'HOME' ? patHist.home_win_rate : rec === 'DRAW' ? patHist.draw_rate : patHist.away_win_rate) : null;
  const total = patHist?.total_matches ?? null;

  // 등급: 패턴 실적 없으면 모델 확률만으로 보수적으로(표본 0 → C)
  const { score, grade } = signalGrade(histRate ?? 0, pMax, total ?? 0);
  const { type, strengths } = formType(patternCodeH);

  let market: (Probs & { overround?: number }) | null = null;
  let gap: { outcome: Pick; pp: number; strength: number } | null = null;
  if (o?.home_odds && o?.draw_odds && o?.away_odds) {
    const m = devig(o.home_odds, o.draw_odds, o.away_odds);
    market = m;
    const pp = modelMarketGap(p, m, recKey);
    gap = { outcome: rec, pp, strength: gapStrength(pp) };
  }

  base.market = market;
  base.signal = {
    grade, score, formType: type, strengths,
    recommendation: grade === 'C' ? 'WATCH' : rec, recommendationText: recommend(p),
    histRate, totalMatches: total, confidence: patHist?.confidence ?? null,
    patternCode: patternCodeH, ksmCode, gap,
  };
  return base;
}

async function forLeague(leagueCode: string): Promise<MatchSignal[]> {
  const cfg = LEAGUES[leagueCode];
  if (!cfg) return [];
  const season = currentSeason();
  const [fixData, stats, patMap] = await Promise.all([
    af(`/fixtures?league=${cfg.id}&season=${season}`),
    buildTeamStats(cfg.id),
    patternMap(cfg.id),
  ]);
  const now = Date.now();
  const upcoming = (fixData.response || [])
    .filter((f: any) => {
      const short = f.fixture.status?.short;
      return !FINISHED.has(short) && new Date(f.fixture.date).getTime() >= now - 3 * 3600_000; // 예정+진행 임박
    })
    .sort((a: any, b: any) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime());

  // 라운드 단위 진행: 가장 이른 미종료 경기의 라운드만 공개.
  // 그 라운드가 전부 끝나면 다음 미종료 경기가 다음 라운드가 되어 자동으로 넘어감.
  const currentRound = upcoming[0]?.league?.round ?? null;
  const fixtures = currentRound ? upcoming.filter((f: any) => f.league?.round === currentRound) : upcoming;

  const oMap = await oddsMap(fixtures.map((f: any) => String(f.fixture.id)));
  return fixtures.map((f: any) => buildFromFixture(f, stats, patMap, oMap[String(f.fixture.id)], leagueCode))
    // 배당(1X2)이 모두 있는 경기만 노출 — 배당 없으면 CLV 채점·기록이 무의미하므로 숨김(수집되면 노출)
    .filter((m: MatchSignal) => m.odds.home != null && m.odds.draw != null && m.odds.away != null)
    .sort((x: MatchSignal, y: MatchSignal) => new Date(x.kickoff).getTime() - new Date(y.kickoff).getTime());
}

/** 경기 목록 + 시그널. leagueCode='ALL'이면 지원 리그 전체. */
export async function getMatchesWithSignals(leagueCode: string): Promise<MatchSignal[]> {
  const codes = leagueCode === 'ALL' ? Object.keys(LEAGUES) : [leagueCode];
  const lists = await Promise.all(codes.map((c) => forLeague(c)));
  return lists.flat().sort((x, y) => new Date(x.kickoff).getTime() - new Date(y.kickoff).getTime());
}

/** 단건(기록 생성 시). matchId = API-Football fixture id */
export async function getMatchSignal(matchId: string): Promise<MatchSignal | null> {
  const fixData = await af(`/fixtures?id=${matchId}`);
  const f = fixData.response?.[0];
  if (!f) return null;
  const leagueId: number = f.league.id;
  const leagueCode = Object.keys(LEAGUES).find((c) => LEAGUES[c].id === leagueId) || String(leagueId);
  const [stats, patMap, oMap] = await Promise.all([
    buildTeamStats(leagueId), patternMap(leagueId), oddsMap([String(matchId)]),
  ]);
  return buildFromFixture(f, stats, patMap, oMap[String(matchId)], leagueCode);
}
