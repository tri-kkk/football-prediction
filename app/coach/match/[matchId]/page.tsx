'use client';
// app/coach/match/[matchId]/page.tsx — 경기 세부 데이터(회원 전용).
import { useEffect, useState, Fragment } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Ring, Emblem, pct, kickoffStr, roundLabel } from '../../ui';
import { mainLoginUrl } from '@/lib/coachApi';

interface FormItem { opponent: string; score: string; result: 'W' | 'D' | 'L'; isHome: boolean; date: string }
interface H2HRow { date: string; home: string; away: string; homeScore: number | null; awayScore: number | null }
interface Detail {
  match: { matchId: string; league: string; round?: string; kickoff: string; home: string; away: string; homeId: number; awayId: number };
  model: { home: number; draw: number; away: number };
  market: { home: number; draw: number; away: number } | null;
  odds: { home: number | null; draw: number | null; away: number | null };
  signal: any;
  homeForm: FormItem[]; awayForm: FormItem[];
  h2h: H2HRow[]; h2hSummary: { home: number; draw: number; away: number };
  trend: { t: string; h: number; d: number; a: number }[];
  toto: { home: number; draw: number; away: number; total: number } | null;
  ksmStats: { home: KsmStat | null; away: KsmStat | null };
  standings: { home: Stand | null; away: Stand | null };
}
interface KsmStat { gpg: number; gapg: number; fgWinRate: number | null }
interface Stand { rank: number; points: number; gf: number; ga: number; gd: number }

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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#1a1a19', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: 14, marginBottom: 11 }}>
      <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 3, height: 13, borderRadius: 2, background: '#3987e5' }} />{title}
      </div>
      {children}
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

function TrendChart({ trend }: { trend: Detail['trend'] }) {
  if (trend.length < 2) return <div style={{ fontSize: 11.5, color: '#898781', textAlign: 'center', padding: '10px 0' }}>배당 변동 데이터가 아직 충분하지 않아요.</div>;
  const W = 300, H = 84;
  const vals = trend.flatMap((p) => [p.h, p.d, p.a]);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = (hi - lo) * 0.18 || 0.04; lo -= pad; hi += pad;
  const rng = hi - lo || 1;
  const xs = (i: number) => (i / (trend.length - 1)) * W;
  const ys = (v: number) => H - ((v - lo) / rng) * H;
  const line = (key: 'h' | 'd' | 'a') => trend.map((p, i) => `${xs(i).toFixed(1)},${ys(p[key]).toFixed(1)}`).join(' ');
  const last = trend[trend.length - 1];
  return (
    <>
      <div style={{ display: 'flex', gap: 14, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
        <span style={{ color: '#79b0f0' }}>● 홈 {pct(last.h)}</span>
        <span style={{ color: '#b8b7b0' }}>● 무 {pct(last.d)}</span>
        <span style={{ color: '#eb8a5f' }}>● 원정 {pct(last.a)}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
        <polyline fill="none" stroke="#3987e5" strokeWidth={2} points={line('h')} />
        <polyline fill="none" stroke="#6b6a64" strokeWidth={2} points={line('d')} />
        <polyline fill="none" stroke="#d95926" strokeWidth={2} points={line('a')} />
      </svg>
    </>
  );
}

export default function MatchDetail() {
  const { matchId } = useParams<{ matchId: string }>();
  const router = useRouter();
  const [d, setD] = useState<Detail | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'guest' | 'auth' | 'error'>('loading');
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch(`/api/coach/match/${matchId}`)
      .then(async (r) => {
        if (r.status === 401) { setState('auth'); return; }
        if (r.status === 402) { setState('guest'); return; }
        const body = await r.json();
        if (!r.ok) { setErr(body.error || '불러오기 실패'); setState('error'); return; }
        setD(body); setState('ok');
      })
      .catch((e) => { setErr(e.message); setState('error'); });
  }, [matchId]);

  const s = d?.signal;

  return (
    <div style={{ paddingTop: 6 }}>
      <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 0, color: '#c3c2b7', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '4px 0', marginBottom: 8 }}>← 뒤로</button>

      {state === 'loading' && <p style={{ color: '#898781', marginTop: 40, textAlign: 'center' }}>불러오는 중…</p>}
      {state === 'auth' && <p style={{ color: '#898781', marginTop: 40, textAlign: 'center' }}>로그인이 필요해요. <a href={mainLoginUrl()} style={{ color: '#79b0f0' }}>로그인</a></p>}
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
          {/* 헤더 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
              <Emblem id={d.match.homeId} name={d.match.home} size={28} />
              <span style={{ fontWeight: 800, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.match.home}</span>
            </div>
            <span style={{ fontSize: 11, color: '#898781', fontWeight: 700 }}>VS</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, justifyContent: 'flex-end' }}>
              <span style={{ fontWeight: 800, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>{d.match.away}</span>
              <Emblem id={d.match.awayId} name={d.match.away} size={28} />
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#898781', marginBottom: 14 }}>{d.match.league}{roundLabel(d.match.round) ? ` · ${roundLabel(d.match.round)}` : ''} · {kickoffStr(d.match.kickoff)}</div>

          {/* KSM 시그널 요약 */}
          {s && (
            <Card title="KSM 시그널 요약">
              <div style={{ display: 'flex', gap: 13, alignItems: 'center' }}>
                <Ring score={s.score} grade={s.grade} />
                <div style={{ flex: 1, minWidth: 0, fontSize: 11.5, color: '#898781', lineHeight: 1.7 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: s.recommendation === 'WATCH' ? '#898781' : '#79b0f0', marginBottom: 4 }}>형세 · {s.formType} · 추천 {s.recommendation === 'WATCH' ? '관망' : s.recommendationText}</div>
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
