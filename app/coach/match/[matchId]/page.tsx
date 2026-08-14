'use client';
// app/coach/match/[matchId]/page.tsx — 경기 세부 데이터(회원 전용).
import { useEffect, useState, Fragment } from 'react';
import { useParams } from 'next/navigation';
import { Ring, Emblem, pct, kickoffStr, roundLabel, leagueLabel, LoginRequired, Skeleton } from '../../ui';
import { mainLoginUrl } from '@/lib/coachApi';

interface FormItem { opponent: string; score: string; result: 'W' | 'D' | 'L'; isHome: boolean; date: string }
interface H2HRow { date: string; home: string; away: string; homeScore: number | null; awayScore: number | null }
interface Detail {
  match: { matchId: string; league: string; round?: string; kickoff: string; home: string; away: string; homeId: number; awayId: number; homeKo?: string | null; awayKo?: string | null };
  model: { home: number; draw: number; away: number };
  market: { home: number; draw: number; away: number } | null;
  odds: { home: number | null; draw: number | null; away: number | null };
  signal: any;
  homeForm: FormItem[]; awayForm: FormItem[];
  h2h: H2HRow[]; h2hSummary: { home: number; draw: number; away: number };
  trend: { t: string; h: number; d: number; a: number }[];
  toto: { home: number; draw: number; away: number; total: number } | null;
  ksmStats: { home: KsmStat | null; away: KsmStat | null };
  standings: { home: Stand | null; away: Stand | null; season: number; isPrevious: boolean };
  teamDeep: { home: TeamDeep | null; away: TeamDeep | null };
  injuries: { home: string[]; away: string[] };
  topScorer: { home: Scorer | null; away: Scorer | null };
}
interface KsmStat { gpg: number; gapg: number; fgWinRate: number | null }
interface WDL { w: number; d: number; l: number }
interface Stand { rank: number; points: number; gf: number; ga: number; gd: number; form?: string | null; homeRec?: WDL | null; awayRec?: WDL | null }
interface TeamDeep { played: number | null; cleanSheet: number | null; failedToScore: number | null; avgFor: number | null; avgAgainst: number | null; streakWin: number | null; streakLose: number | null; formation: string | null; goalPeak: string | null }
interface Scorer { name: string | null; goals: number | null }

function StatCmp({ label, home, away, fmt, lowerBetter }: { label: string; home: number; away: number; fmt: (n: number) => string; lowerBetter?: boolean }) {
  const tot = home + away || 1;
  const homeShare = (lowerBetter ? away / tot : home / tot) * 100;
  const homeBetter = lowerBetter ? home < away : home > away;
  return (
    <div style={{ margin: '11px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 5 }}>
        <span style={{ color: '#898781' }}>{label}</span>
        <span style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ color: homeBetter ? '#79b0f0' : '#c3c2b7' }}>{fmt(home)}</span>
          <span style={{ color: '#6b6a64' }}> vs </span>
          <span style={{ color: !homeBetter ? '#eb8a5f' : '#c3c2b7' }}>{fmt(away)}</span>
        </span>
      </div>
      <div style={{ display: 'flex', height: 8, borderRadius: 5, overflow: 'hidden', background: '#232320', gap: 2 }}>
        <span style={{ width: `${homeShare}%`, background: '#3987e5' }} />
        <span style={{ flex: 1, background: '#d95926' }} />
      </div>
    </div>
  );
}

const RES_BG: Record<string, string> = { W: '#0ca30c', D: '#6b6a64', L: '#d03b3b' };
const RES_KO: Record<string, string> = { W: '승', D: '무', L: '패' };

// 리그 폼 스트릭 (최근 5경기, WWDLW)
function FormPills({ form }: { form: string }) {
  const arr = form.replace(/[^WDL]/g, '').slice(-5).split('');
  if (!arr.length) return null;
  return (
    <span style={{ display: 'inline-flex', gap: 3 }}>
      {arr.map((r, i) => (
        <span key={i} style={{ width: 16, height: 16, borderRadius: 4, fontSize: 9.5, fontWeight: 800, color: '#fff', display: 'grid', placeItems: 'center', background: RES_BG[r] || '#6b6a64' }}>{RES_KO[r] || r}</span>
      ))}
    </span>
  );
}
// 심층 스탯 한 줄 (지표 · 홈 · 원정)
function DeepRow({ label, home, away }: { label: string; home: React.ReactNode; away: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0 16px', alignItems: 'center', margin: '9px 0', fontSize: 11.5 }}>
      <span style={{ color: '#898781' }}>{label}</span>
      <span style={{ color: '#79b0f0', fontWeight: 800, textAlign: 'right', fontVariantNumeric: 'tabular-nums', minWidth: 40 }}>{home ?? '-'}</span>
      <span style={{ color: '#eb8a5f', fontWeight: 800, textAlign: 'right', fontVariantNumeric: 'tabular-nums', minWidth: 40 }}>{away ?? '-'}</span>
    </div>
  );
}

function Card({ title, children, mesh }: { title: string; children: React.ReactNode; mesh?: boolean }) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: '#1a1a19', border: `1px solid ${mesh ? 'rgba(57,135,229,.28)' : 'rgba(255,255,255,.08)'}`, borderRadius: 14, padding: 14, marginBottom: 11 }}>
      {mesh && <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/card-mesh.webp)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: .4 }} />}
      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 3, height: 13, borderRadius: 2, background: '#3987e5' }} />{title}
        </div>
        {children}
      </div>
    </div>
  );
}

function FormRow({ label, sub, form }: { label: string; sub: string; form: FormItem[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '8px 0' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#c3c2b7' }}>{label}</div>
        <div style={{ fontSize: 10.5, color: '#898781' }}>{sub}</div>
      </div>
      <div style={{ display: 'flex', gap: 5 }}>
        {form.length === 0 ? <span style={{ fontSize: 11, color: '#6b6a64' }}>기록 없음</span> :
          form.map((f, i) => (
            <span key={i} title={`${f.isHome ? '홈' : '원정'} vs ${f.opponent} ${f.score}`} style={{ width: 22, height: 22, borderRadius: 6, display: 'grid', placeItems: 'center', fontSize: 10.5, fontWeight: 800, color: '#fff', background: RES_BG[f.result] }}>{RES_KO[f.result]}</span>
          ))}
      </div>
    </div>
  );
}

// 라인 무브먼트 요약: 시가 → 현재 + 변동(%p) + 미니 스파크라인. 평평한 선보다 "얼마나 움직였나"가 바로 읽힘.
function TrendChart({ trend }: { trend: Detail['trend'] }) {
  if (trend.length < 2) return <div style={{ fontSize: 11.5, color: '#898781', textAlign: 'center', padding: '10px 0' }}>배당 변동 데이터가 아직 충분하지 않아요.</div>;
  const open = trend[0], now = trend[trend.length - 1];
  const rows = [
    { key: 'h' as const, label: '홈', color: '#3987e5' },
    { key: 'd' as const, label: '무', color: '#8b8a84' },
    { key: 'a' as const, label: '원정', color: '#d95926' },
  ];
  const spark = (key: 'h' | 'd' | 'a', color: string) => {
    const w = 50, h = 20;
    const vals = trend.map((p) => p[key]);
    const lo = Math.min(...vals), hi = Math.max(...vals), rng = (hi - lo) || 1;
    const pts = trend.map((p, i) => `${((i / (trend.length - 1)) * w).toFixed(1)},${(h - ((p[key] - lo) / rng) * h).toFixed(1)}`).join(' ');
    return <svg width={w} height={h} style={{ flex: '0 0 auto' }}><polyline fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" points={pts} /></svg>;
  };
  const deltas = rows.map((r) => ({ label: r.label, d: (now[r.key] - open[r.key]) * 100 }));
  const top = deltas.reduce((a, b) => (b.d > a.d ? b : a));
  const hint = top.d >= 0.3 ? `시가 대비 ${top.label} 쪽으로 배당이 모이는 중` : '시가 대비 큰 변동 없음';
  return (
    <div>
      {rows.map((r, i) => {
        const o = open[r.key], n = now[r.key], dpp = (n - o) * 100;
        const up = dpp >= 0.05, dn = dpp <= -0.05;
        const bg = up ? 'rgba(62,203,62,.14)' : dn ? 'rgba(230,103,103,.14)' : 'rgba(255,255,255,.06)';
        const c = up ? '#4bd14b' : dn ? '#eb7a7a' : '#8b8a84';
        const ar = up ? '▲' : dn ? '▼' : '―';
        return (
          <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 0', borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,.06)' : 'none' }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: r.color, flex: '0 0 auto' }} />
            <span style={{ fontSize: 12.5, fontWeight: 700, width: 30, flex: '0 0 auto' }}>{r.label}</span>
            <span style={{ fontSize: 11, color: '#77756f', flex: '0 0 auto' }}>시가 {pct(o)}</span>
            <span style={{ color: '#5c5a55', fontSize: 11, flex: '0 0 auto' }}>→</span>
            <span style={{ fontSize: 15, fontWeight: 800, flex: '0 0 auto', fontVariantNumeric: 'tabular-nums' }}>{pct(n)}</span>
            {spark(r.key, r.color)}
            <span style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: bg, color: c, flex: '0 0 auto', whiteSpace: 'nowrap' }}>{ar} {Math.abs(dpp).toFixed(1)}%p</span>
          </div>
        );
      })}
      <div style={{ fontSize: 11, color: '#77756f', textAlign: 'center', marginTop: 10 }}>{hint}</div>
    </div>
  );
}

// 상세 클라 캐시: 목록→상세→뒤로→같은 경기 재진입 시 60초 내면 즉시 표시.
const _detailCache = new Map<string, { t: number; data: Detail }>();
const DETAIL_TTL = 60_000;

export default function MatchDetail() {
  const { matchId } = useParams<{ matchId: string }>();
  const [d, setD] = useState<Detail | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'guest' | 'auth' | 'error'>('loading');
  const [err, setErr] = useState('');

  useEffect(() => {
    const hit = _detailCache.get(matchId);
    if (hit && Date.now() - hit.t < DETAIL_TTL) { setD(hit.data); setState('ok'); return; }
    let alive = true;
    fetch(`/api/coach/match/${matchId}`)
      .then(async (r) => {
        if (!alive) return;
        if (r.status === 401) { setState('auth'); return; }
        if (r.status === 402) { setState('guest'); return; }
        const body = await r.json();
        if (!r.ok) { setErr(body.error || '불러오기 실패'); setState('error'); return; }
        _detailCache.set(matchId, { t: Date.now(), data: body });
        setD(body); setState('ok');
      })
      .catch((e) => { if (alive) { setErr(e.message); setState('error'); } });
    return () => { alive = false; };
  }, [matchId]);

  const s = d?.signal;

  return (
    <div className="tc-slidein" style={{ paddingTop: 12 }}>

      {state === 'loading' && (
        <div style={{ paddingTop: 6 }}>
          <Skeleton h={74} r={16} mb={12} />
          <Skeleton h={132} r={14} mb={11} />
          <Skeleton h={104} r={14} mb={11} />
          <Skeleton h={150} r={14} mb={11} />
        </div>
      )}
      {state === 'auth' && <LoginRequired href={mainLoginUrl()} />}
      {state === 'error' && <p style={{ color: '#e66767', marginTop: 40, textAlign: 'center' }}>{err}</p>}
      {state === 'guest' && (
        <div style={{ background: 'linear-gradient(135deg,#1c2a40,#171d28)', border: '1px solid rgba(57,135,229,.3)', borderRadius: 16, padding: 20, textAlign: 'center', marginTop: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 7 }}>멤버쉽 전용</div>
          <p style={{ fontSize: 12, color: '#c3c2b7', lineHeight: 1.6, margin: '0 0 14px' }}>경기 세부 데이터는 멤버쉽 회원만 볼 수 있어요.</p>
          <a href="/coach/pricing" style={{ display: 'inline-block', background: '#3987e5', color: '#fff', fontWeight: 800, fontSize: 13, padding: '11px 20px', borderRadius: 11, textDecoration: 'none' }}>멤버쉽 시작하기</a>
        </div>
      )}

      {state === 'ok' && d && (
        <>
          {/* 매치업 헤더 (필드 배경 밴드) */}
          <div style={{ position: 'relative', overflow: 'hidden', border: '1px solid rgba(57,135,229,.28)', borderRadius: 16, padding: 15, marginBottom: 12 }}>
            <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/card-pitch.webp)', backgroundSize: 'cover', backgroundPosition: 'right center' }} />
            <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(16,21,29,.35),rgba(16,21,29,.62))' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 }}>
                  <Emblem id={d.match.homeId} name={d.match.home} size={34} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 9.5, fontWeight: 800, color: '#79b0f0', letterSpacing: 1.2, marginBottom: 2 }}>홈</div>
                    <div style={{ fontWeight: 800, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.match.home}</div>
                  </div>
                </div>
                <span style={{ fontSize: 11, color: '#a5b4c6', fontWeight: 800, flex: '0 0 auto' }}>VS</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, minWidth: 0, justifyContent: 'flex-end' }}>
                  <div style={{ minWidth: 0, textAlign: 'right' }}>
                    <div style={{ fontSize: 9.5, fontWeight: 800, color: '#eb8a5f', letterSpacing: 1.2, marginBottom: 2 }}>원정</div>
                    <div style={{ fontWeight: 800, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.match.away}</div>
                  </div>
                  <Emblem id={d.match.awayId} name={d.match.away} size={34} />
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#9fb0c4', marginTop: 11 }}>{leagueLabel(d.match.league)}{roundLabel(d.match.round) ? ` · ${roundLabel(d.match.round)}` : ''} · {kickoffStr(d.match.kickoff)}</div>
            </div>
          </div>

          {/* KSM 시그널 요약 */}
          {s && (
            <Card title="KSM 시그널 요약" mesh>
              <div style={{ display: 'flex', gap: 13, alignItems: 'center' }}>
                <Ring score={s.score} grade={s.grade} />
                <div style={{ flex: 1, minWidth: 0, fontSize: 11.5, color: '#898781', lineHeight: 1.7 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: s.recommendation === 'WATCH' ? '#898781' : '#79b0f0', marginBottom: 4 }}>형세 · {s.formType} · {s.recommendation === 'WATCH' ? '관망' : s.recommendationText}</div>
                  <div>모델 확률 <b style={{ color: '#c3c2b7' }}>홈 {pct(d.model.home)} · 무 {pct(d.model.draw)} · 원정 {pct(d.model.away)}</b></div>
                  {d.market && <div>시장(마진제거) <b style={{ color: '#c3c2b7' }}>홈 {pct(d.market.home)} · 무 {pct(d.market.draw)} · 원정 {pct(d.market.away)}</b></div>}
                  {s.gap && <div>모델−시장 이견 <b style={{ color: '#79b0f0' }}>{s.gap.outcome === 'HOME' ? '홈' : s.gap.outcome === 'DRAW' ? '무' : '원정'} {s.gap.pp >= 0 ? '+' : ''}{s.gap.pp}%p</b></div>}
                  {s.totalMatches != null && s.histRate != null && <div>과거 이 형세 <b style={{ color: '#c3c2b7' }}>{s.totalMatches}경기 → {pct(s.histRate)}</b></div>}
                </div>
              </div>
            </Card>
          )}

          {/* 최근 5경기 폼 */}
          <Card title="최근 5경기 폼">
            <FormRow label={d.match.home} sub="홈팀" form={d.homeForm} />
            <div style={{ height: 1, background: '#2c2c2a', margin: '4px 0' }} />
            <FormRow label={d.match.away} sub="원정팀" form={d.awayForm} />
          </Card>

          {/* 상대 전적 */}
          <Card title="상대 전적 (H2H)">
            {d.h2h.length === 0 ? <div style={{ fontSize: 11.5, color: '#898781' }}>맞대결 기록이 없어요.</div> : (
              <>
                {d.h2h.map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '7px 0', borderBottom: i < d.h2h.length - 1 ? '1px solid #2c2c2a' : 0 }}>
                    <span style={{ color: '#898781', fontSize: 11, width: 62, flex: '0 0 auto' }}>{new Date(m.date).toLocaleDateString('ko-KR', { year: '2-digit', month: 'numeric' })}</span>
                    <span style={{ flex: 1, textAlign: 'right', color: '#c3c2b7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.home}</span>
                    <span style={{ fontWeight: 800, padding: '0 10px', fontVariantNumeric: 'tabular-nums' }}>{m.homeScore ?? '-'} : {m.awayScore ?? '-'}</span>
                    <span style={{ flex: 1, color: '#c3c2b7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.away}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 11, fontSize: 12, fontWeight: 700 }}>
                  <span style={{ color: '#3ecb3e' }}>{d.match.home} {d.h2hSummary.home}승</span>
                  <span style={{ color: '#c3c2b7' }}>{d.h2hSummary.draw}무</span>
                  <span style={{ color: '#e66767' }}>{d.h2hSummary.away}패</span>
                </div>
              </>
            )}
          </Card>

          {/* 리그 순위 · 득실 */}
          {(d.standings.home || d.standings.away) && (
            <Card title="리그 순위 · 득실">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '8px 12px', fontSize: 12, alignItems: 'center' }}>
                <span style={{ color: '#898781', fontSize: 10.5, fontWeight: 700 }}>팀</span>
                <span style={{ color: '#898781', fontSize: 10.5, fontWeight: 700, textAlign: 'right' }}>순위</span>
                <span style={{ color: '#898781', fontSize: 10.5, fontWeight: 700, textAlign: 'right' }}>득/실</span>
                <span style={{ color: '#898781', fontSize: 10.5, fontWeight: 700, textAlign: 'right' }}>골득실</span>
                {([['h', d.match.home, d.standings.home], ['a', d.match.away, d.standings.away]] as [string, string, Stand | null][]).map(([k, name, s]) => (
                  <Fragment key={k}>
                    <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                    <span style={{ textAlign: 'right', color: '#c3c2b7', fontVariantNumeric: 'tabular-nums' }}>{s ? `${s.rank}위` : '-'}</span>
                    <span style={{ textAlign: 'right', color: '#c3c2b7', fontVariantNumeric: 'tabular-nums' }}>{s ? `${s.gf}/${s.ga}` : '-'}</span>
                    <span style={{ textAlign: 'right', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: s ? (s.gd > 0 ? '#3ecb3e' : s.gd < 0 ? '#e66767' : '#c3c2b7') : '#6b6a64' }}>{s ? `${s.gd > 0 ? '+' : ''}${s.gd}` : '-'}</span>
                  </Fragment>
                ))}
              </div>
              {/* 홈/원정 성적 분리 + 리그 폼 (standings에 이미 포함 — 추가 호출 0) */}
              {(d.standings.home?.homeRec || d.standings.home?.form || d.standings.away?.awayRec || d.standings.away?.form) && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #2c2c2a', display: 'grid', gap: 9 }}>
                  {([['홈 성적', d.match.home, d.standings.home?.homeRec, d.standings.home?.form],
                     ['원정 성적', d.match.away, d.standings.away?.awayRec, d.standings.away?.form]] as [string, string, WDL | null | undefined, string | null | undefined][]).map(([lbl, name, rec, form], i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: '#a7b6c8', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name} <span style={{ color: '#6b6a64' }}>· {lbl}</span></span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 9, flex: '0 0 auto' }}>
                        {rec && <span style={{ fontSize: 11.5, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}><span style={{ color: '#3ecb3e' }}>{rec.w}</span><span style={{ color: '#6b6a64' }}>-{rec.d}-</span><span style={{ color: '#e66767' }}>{rec.l}</span></span>}
                        {form && <FormPills form={form} />}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {d.standings.isPrevious && <div style={{ fontSize: 10.5, color: '#6b6a64', marginTop: 10 }}>새 시즌 개막 전 — {d.standings.season} 시즌 최종 순위 기준</div>}
            </Card>
          )}

          {/* KSM 팀 스탯 비교 */}
          {d.ksmStats.home && d.ksmStats.away && (
            <Card title="팀 스탯 비교 (KSM)">
              <StatCmp label="경기당 득점" home={d.ksmStats.home.gpg} away={d.ksmStats.away.gpg} fmt={(n) => n.toFixed(2)} />
              <StatCmp label="경기당 실점 · 낮을수록 우위" home={d.ksmStats.home.gapg} away={d.ksmStats.away.gapg} fmt={(n) => n.toFixed(2)} lowerBetter />
              {d.ksmStats.home.fgWinRate != null && d.ksmStats.away.fgWinRate != null && (
                <StatCmp label="선제골 시 승률" home={d.ksmStats.home.fgWinRate} away={d.ksmStats.away.fgWinRate} fmt={(n) => `${Math.round(n * 100)}%`} />
              )}
              <div style={{ fontSize: 10.5, color: '#6b6a64', marginTop: 8 }}>KSM 모델이 쓰는 다시즌 합산 스탯 기준</div>
            </Card>
          )}

          {/* 팀 시즌 심층 스탯 (API-Football /teams/statistics) */}
          {(() => {
            const th = d.teamDeep.home, ta = d.teamDeep.away;
            if (!th && !ta) return null;
            return (
              <Card title="팀 시즌 심층 스탯">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0 16px', marginBottom: 4, fontSize: 10.5, fontWeight: 700, color: '#898781' }}>
                  <span>지표</span>
                  <span style={{ textAlign: 'right', color: '#79b0f0', minWidth: 40 }}>홈</span>
                  <span style={{ textAlign: 'right', color: '#eb8a5f', minWidth: 40 }}>원정</span>
                </div>
                {th?.cleanSheet != null && ta?.cleanSheet != null && (
                  <StatCmp label="클린시트 (무실점 경기)" home={th.cleanSheet} away={ta.cleanSheet} fmt={(n) => `${n}회`} />
                )}
                {th?.failedToScore != null && ta?.failedToScore != null && (
                  <StatCmp label="무득점 경기 · 낮을수록 우위" home={th.failedToScore} away={ta.failedToScore} fmt={(n) => `${n}회`} lowerBetter />
                )}
                <DeepRow label="최다 연승" home={th?.streakWin != null ? `${th.streakWin}연승` : null} away={ta?.streakWin != null ? `${ta.streakWin}연승` : null} />
                <DeepRow label="최다 연패" home={th?.streakLose != null ? `${th.streakLose}연패` : null} away={ta?.streakLose != null ? `${ta.streakLose}연패` : null} />
                <DeepRow label="득점 강세 시간대" home={th?.goalPeak ? `${th.goalPeak}분` : null} away={ta?.goalPeak ? `${ta.goalPeak}분` : null} />
                <DeepRow label="주 포메이션" home={th?.formation} away={ta?.formation} />
                <div style={{ fontSize: 10.5, color: '#6b6a64', marginTop: 8 }}>{d.standings.season} 시즌 기준 · API-Football</div>
              </Card>
            );
          })()}

          {/* 간판 득점원 (API-Football /players/topscorers) */}
          {(d.topScorer.home || d.topScorer.away) && (
            <Card title="간판 득점원">
              {([['홈', d.match.home, d.topScorer.home, '#79b0f0'], ['원정', d.match.away, d.topScorer.away, '#eb8a5f']] as [string, string, Scorer | null, string][]).map(([tag, team, sc, col]) => (
                <div key={tag} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, margin: '9px 0', fontSize: 12 }}>
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: col, marginRight: 7 }}>{tag}</span>
                    <span style={{ color: '#c3c2b7', fontWeight: 700 }}>{sc?.name || '리그 상위 기록 없음'}</span>
                  </span>
                  {sc?.goals != null && <span style={{ flex: '0 0 auto', fontWeight: 800, color: col, fontVariantNumeric: 'tabular-nums' }}>{sc.goals}골</span>}
                </div>
              ))}
              <div style={{ fontSize: 10.5, color: '#6b6a64', marginTop: 8 }}>리그 득점 순위 기준 · 상위권 밖이면 미표시</div>
            </Card>
          )}

          {/* 결장 · 부상 (API-Football /injuries) */}
          {(d.injuries.home.length > 0 || d.injuries.away.length > 0) && (
            <Card title="결장 · 부상">
              {([['홈', d.match.home, d.injuries.home, '#79b0f0'], ['원정', d.match.away, d.injuries.away, '#eb8a5f']] as [string, string, string[], string][]).map(([tag, team, list, col]) => (
                <div key={tag} style={{ margin: '9px 0' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: col, marginBottom: 5 }}>{tag} · {team}</div>
                  {list.length ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {list.map((nm, i) => (
                        <span key={i} style={{ fontSize: 11, color: '#c3c2b7', background: '#232320', border: '1px solid rgba(217,89,38,.25)', padding: '3px 8px', borderRadius: 6 }}>{nm}</span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: '#6b6a64' }}>보고된 결장 없음</div>
                  )}
                </div>
              ))}
              <div style={{ fontSize: 10.5, color: '#6b6a64', marginTop: 8 }}>API-Football 부상/결장 리포트 기준</div>
            </Card>
          )}

          {/* 국내 구매율 (와이즈토토) */}
          {d.toto && (
            <Card title="국내 구매율 (와이즈토토)">
              {[
                { k: '홈', v: d.toto.home, c: '#3987e5' },
                { k: '무', v: d.toto.draw, c: '#6b6a64' },
                { k: '원정', v: d.toto.away, c: '#d95926' },
              ].map((r) => (
                <div key={r.k} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '9px 0' }}>
                  <span style={{ width: 30, fontSize: 12, color: '#c3c2b7', fontWeight: 700, flex: '0 0 auto' }}>{r.k}</span>
                  <div style={{ flex: 1, height: 20, background: '#232320', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max(0, Math.min(100, r.v))}%`, height: '100%', background: r.c, borderRadius: 6 }} />
                  </div>
                  <span style={{ width: 46, textAlign: 'right', fontSize: 12.5, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: r.c === '#6b6a64' ? '#c3c2b7' : r.c === '#3987e5' ? '#79b0f0' : '#eb8a5f' }}>{r.v.toFixed(1)}%</span>
                </div>
              ))}
              <div style={{ fontSize: 10.5, color: '#6b6a64', marginTop: 8 }}>와이즈토토 승무패 구매 비율{d.toto.total ? ` · 총 ${d.toto.total.toLocaleString()}표` : ''}</div>
            </Card>
          )}

          {/* 배당 변동 추이 */}
          <Card title="배당(승부 확률) 변동 추이">
            <TrendChart trend={d.trend} />
          </Card>

          <p style={{ fontSize: 10.5, color: '#6b6a64', textAlign: 'center', lineHeight: 1.5, margin: '4px 0 10px' }}>실제 베팅이 아닌 분석·참고용 데이터입니다.</p>
        </>
      )}
    </div>
  );
}
