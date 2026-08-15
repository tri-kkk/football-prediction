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

// 팀명 한글화 (team_translations). 없으면 원문(영문) 유지.
async function applyKoreanNames(matches: MatchSignal[]): Promise<MatchSignal[]> {
  const ids = Array.from(new Set(matches.flatMap((m) => [m.homeId, m.awayId]).filter(Boolean)));
  if (!ids.length) return matches;
  const { data } = await supabaseAdmin.from('team_translations').select('team_id, korean_name').in('team_id', ids);
  const ko: Record<number, string> = {};
  for (const t of data || []) if (t.korean_name) ko[t.team_id] = t.korean_name;
  for (const m of matches) {
    if (ko[m.homeId]) m.home = ko[m.homeId];
    if (ko[m.awayId]) m.away = ko[m.awayId];
  }
  return matches;
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
  try {
    return await forLeagueInner(leagueCode);
  } catch (e) {
    // 한 리그의 외부 API(API-Football 쿼터/리밋 등) 실패가 전체 목록을 무너뜨리지 않도록 격리.
    console.error(`[coach] forLeague(${leagueCode}) failed:`, (e as any)?.message ?? e);
    return [];
  }
}

// 배당 DB(match_odds_latest)에서 리그의 예정 경기 로드 → API-Football fixtures 형태로 변환.
// API가 일정을 못 줄 때(쿼터/리밋/새시즌 미개시)의 폴백 소스.
async function oddsFixturesForLeague(leagueCode: string): Promise<{ fixtures: any[]; oMap: Record<string, any> }> {
  const cutoff = new Date(Date.now()).toISOString(); // 시작 전(예정)만 — 킥오프 지난 경기 제외
  const { data } = await supabaseAdmin
    .from('match_odds_latest')
    .select('match_id,home_team,away_team,home_team_id,away_team_id,commence_time,home_odds,draw_odds,away_odds,status,league_code')
    .eq('league_code', leagueCode)
    .gt('commence_time', cutoff)
    .order('commence_time', { ascending: true });
  const rows = data || [];
  const fixtures = rows.map((r: any) => ({
    fixture: { id: r.match_id, date: r.commence_time, status: { short: r.status || 'NS' } },
    teams: { home: { id: r.home_team_id, name: r.home_team }, away: { id: r.away_team_id, name: r.away_team } },
    league: { round: null },
  }));
  const oMap: Record<string, any> = {};
  for (const r of rows) oMap[String(r.match_id)] = { home_odds: r.home_odds, draw_odds: r.draw_odds, away_odds: r.away_odds };
  return { fixtures, oMap };
}

async function forLeagueInner(leagueCode: string): Promise<MatchSignal[]> {
  const cfg = LEAGUES[leagueCode];
  if (!cfg) return [];
  const season = currentSeason();
  const [fixData, stats, patMap] = await Promise.all([
    // API 실패는 폴백으로 넘김 (throw 대신 빈 응답).
    af(`/fixtures?league=${cfg.id}&season=${season}`).catch(() => ({ response: [] })),
    buildTeamStats(cfg.id),
    patternMap(cfg.id),
  ]);
  const now = Date.now();
  const upcoming = (fixData.response || [])
    .filter((f: any) => {
      const short = f.fixture.status?.short;
      return !FINISHED.has(short) && new Date(f.fixture.date).getTime() >= now; // 시작 전(예정)만 — 킥오프 지나면 제외
    })
    .sort((a: any, b: any) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime());

  // 라운드 단위 진행: 현재 라운드 노출. 단, 8일 이내 임박 경기는 라운드 라벨과 무관하게 노출
  // (개막/편성 시 라운드 라벨이 갈려 임박 경기가 숨는 문제 방지).
  const currentRound = upcoming[0]?.league?.round ?? null;
  const soon = now + 8 * 86400_000;
  let fixtures = currentRound
    ? upcoming.filter((f: any) => f.league?.round === currentRound || new Date(f.fixture.date).getTime() <= soon)
    : upcoming;

  let oMap = await oddsMap(fixtures.map((f: any) => String(f.fixture.id)));

  // 폴백: API-Football이 일정을 못 주면 배당 DB로 일정 구성 (일정이 통째로 사라지는 것 방지).
  if (fixtures.length === 0) {
    const fb = await oddsFixturesForLeague(leagueCode);
    fixtures = fb.fixtures;
    oMap = fb.oMap;
  }

  // 배당(1X2)이 모두 있는 경기만 노출 — 배당 없이 승부 추천만 뜨는 괴리 방지(친선·프리시즌 제외).
  return fixtures.map((f: any) => buildFromFixture(f, stats, patMap, oMap[String(f.fixture.id)], leagueCode))
    .filter((m: MatchSignal) => m.odds.home != null && m.odds.draw != null && m.odds.away != null)
    .sort((x: MatchSignal, y: MatchSignal) => new Date(x.kickoff).getTime() - new Date(y.kickoff).getTime());
}

async function computeMatchesWithSignals(leagueCode: string): Promise<MatchSignal[]> {
  const codes = leagueCode === 'ALL' ? Object.keys(LEAGUES) : [leagueCode];
  // allSettled: 리그 하나가 실패해도 나머지 리그는 정상 노출 (전체 500 방지).
  const settled = await Promise.allSettled(codes.map((c) => forLeague(c)));
  const lists = settled.map((r) => (r.status === 'fulfilled' ? r.value : []));
  const merged = lists.flat().sort((x, y) => new Date(x.kickoff).getTime() - new Date(y.kickoff).getTime());
  return applyKoreanNames(merged);
}

// 경기 계산은 유저 무관(회원 게이팅은 라우트에서 후처리) → 리그별 인메모리 캐시.
// 배당은 30분 크론으로 갱신되므로 120초 캐시면 신선도/속도 균형이 맞음.
// 캐시 히트 시 리그당 30~40개 Supabase 쿼리 + 모델 계산을 통째로 건너뜀.
// 인플라이트 dedup: 동시에 들어온 같은 리그 요청은 한 번만 계산(몰림 방지).
const _cache = new Map<string, { t: number; data: MatchSignal[] }>();
const _inflight = new Map<string, Promise<MatchSignal[]>>();
const CACHE_TTL = 120_000;

/** 경기 목록 + 시그널. leagueCode='ALL'이면 지원 리그 전체. (120초 인메모리 캐시 + dedup) */
export async function getMatchesWithSignals(leagueCode: string): Promise<MatchSignal[]> {
  const now = Date.now();
  const hit = _cache.get(leagueCode);
  if (hit && now - hit.t < CACHE_TTL) return hit.data;
  const inflight = _inflight.get(leagueCode);
  if (inflight) return inflight;
  const p = computeMatchesWithSignals(leagueCode)
    .then((d) => { _cache.set(leagueCode, { t: Date.now(), data: d }); _inflight.delete(leagueCode); return d; })
    .catch((e) => { _inflight.delete(leagueCode); throw e; });
  _inflight.set(leagueCode, p);
  return p;
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
  const built = buildFromFixture(f, stats, patMap, oMap[String(matchId)], leagueCode);
  return (await applyKoreanNames([built]))[0];
}
