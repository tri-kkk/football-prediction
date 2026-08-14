'use client';
// app/coach/bets/page.tsx — 내 기록(토계부). 단식 + 조합(슬립). 진행중/완료 + CLV.
import { useEffect, useState } from 'react';
import { coachApi, MembershipError, AuthError } from '@/lib/coachApi';
import { StatStrip, Skeleton } from '../ui';
import { PullToRefresh } from '../PullToRefresh';

const fmtPct = (v: number | null) => (v == null ? '-' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`);
const PICK_KO: Record<string, string> = { HOME: '홈', DRAW: '무', AWAY: '원정' };
const ST = {
  won: { t: '적중', c: '#4bd14b', bg: 'rgba(12,163,12,.16)' },
  lost: { t: '미적중', c: '#e66767', bg: 'rgba(208,59,59,.16)' },
  void: { t: '취소', c: '#c3c2b7', bg: 'rgba(137,135,129,.16)' },
  open: { t: '진행중', c: '#9cc4f4', bg: 'rgba(57,135,229,.16)' },
} as const;
const LEG_C: Record<string, string> = { won: '#4bd14b', lost: '#e66767', void: '#898781' };

const RANGES = [
  { key: 'today', label: '오늘' },
  { key: '7d', label: '7일' },
  { key: '30d', label: '30일' },
  { key: 'all', label: '전체' },
] as const;
type RangeKey = typeof RANGES[number]['key'];

export default function BetsPage() {
  const [items, setItems] = useState<any[] | null>(null);
  const [tab, setTab] = useState<'open' | 'settled'>('open');
  const [range, setRange] = useState<RangeKey>('7d');
  const [state, setState] = useState<'loading' | 'ok' | 'guest' | 'auth' | 'error'>('loading');

  const load = (silent = false) => {
    if (!silent) setState('loading');
    return Promise.all([coachApi.bets(), coachApi.slips()])
      .then(([b, s]: any) => {
        const singles = (b.bets || []).map((x: any) => ({ ...x, _type: 'single' }));
        const combos = (s.slips || []).map((x: any) => ({ ...x, _type: 'combo' }));
        const merged = [...singles, ...combos].sort((x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime());
        setItems(merged); setState('ok');
      })
      .catch((e) => setState(e instanceof MembershipError ? 'guest' : e instanceof AuthError ? 'auth' : 'error'));
  };
  useEffect(() => { load(); }, []);

  if (state === 'loading') return <div style={{ paddingTop: 16 }}><Skeleton h={58} r={12} /><Skeleton h={44} r={11} mb={12} /><Skeleton h={110} /><Skeleton h={110} /></div>;
  if (state === 'auth') return <p style={{ color: '#898781', marginTop: 40, textAlign: 'center' }}>로그인이 필요해요.</p>;
  if (state === 'guest') return <Paywall />;
  if (state === 'error') return <p style={{ color: '#e66767', marginTop: 40, textAlign: 'center' }}>불러오기 실패</p>;

  const allRaw = items || [];
  // 날짜 범위 필터 (created_at 기준) — 기본 최근 7일
  const now = Date.now();
  let cutoff = 0;
  if (range === 'today') { const s = new Date(); s.setHours(0, 0, 0, 0); cutoff = s.getTime(); }
  else if (range === '7d') cutoff = now - 7 * 86400_000;
  else if (range === '30d') cutoff = now - 30 * 86400_000;
  const all = range === 'all' ? allRaw : allRaw.filter((b) => new Date(b.created_at).getTime() >= cutoff);

  const list = all.filter((b) => (tab === 'open' ? b.status === 'open' : b.status !== 'open'));
  const openCnt = all.filter((b) => b.status === 'open').length;
  const doneCnt = all.length - openCnt;
  const settled = all.filter((b) => b.status === 'won' || b.status === 'lost');
  const hit = settled.length ? settled.filter((b) => b.status === 'won').length / settled.length : null;
  const profit = settled.reduce((s, b) => s + ((b.payout ?? 0) - b.stake), 0);

  return (
    <PullToRefresh onRefresh={() => load(true)}>
      <StatStrip title="내 기록 · 토계부" stats={[
        { k: '진행중', v: `${openCnt}건` },
        { k: '적중률', v: hit != null ? `${(hit * 100).toFixed(0)}%` : '—', tone: 'blue' },
        { k: '누적 손익', v: `${profit >= 0 ? '+' : ''}${profit.toLocaleString()}`, tone: profit > 0 ? 'grn' : profit < 0 ? 'crit' : undefined },
      ]} />
      <div style={{ height: 12 }} />
      <div className="tc-hidebar" style={{ display: 'flex', gap: 7, marginBottom: 11, overflowX: 'auto' }}>
        {RANGES.map((r) => {
          const on = range === r.key;
          return (
            <button key={r.key} onClick={() => setRange(r.key)} className="tc-press" style={{ flex: '0 0 auto', border: `1px solid ${on ? 'rgba(90,160,240,.4)' : 'rgba(255,255,255,.1)'}`, background: on ? 'rgba(57,135,229,.16)' : '#1a1a19', color: on ? '#9cc4f4' : '#898781', fontWeight: 700, fontSize: 12, padding: '6px 13px', borderRadius: 999, cursor: 'pointer' }}>{r.label}</button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(['open', 'settled'] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)} style={{ flex: 1, border: `1px solid ${tab === k ? '#383835' : 'rgba(255,255,255,.1)'}`, background: tab === k ? '#232320' : '#1a1a19', color: tab === k ? '#fff' : '#898781', fontWeight: 700, fontSize: 12.5, padding: 9, borderRadius: 11, cursor: 'pointer' }}>
            {k === 'open' ? `진행중 ${openCnt}` : `완료 ${doneCnt}`}
          </button>
        ))}
      </div>
      {!list.length && <p style={{ color: '#898781', textAlign: 'center', marginTop: 30 }}>{tab === 'open' ? '진행중인 기록이 없어요.' : '완료된 기록이 없어요.'}</p>}
      {list.map((b) => (b._type === 'combo' ? <ComboCard key={`c${b.id}`} s={b} /> : <SingleCard key={`s${b.id}`} b={b} />))}
    </PullToRefresh>
  );
}

function statusTag(status: string, delta: React.ReactNode) {
  const st = ST[status as keyof typeof ST] || ST.open;
  return <span style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 8px', borderRadius: 6, color: st.c, background: st.bg }}>{st.t}{delta}</span>;
}

function SingleCard({ b }: { b: any }) {
  return (
    <div style={{ background: '#1a1a19', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, padding: 13, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{b.home_team || b.match_id} {b.away_team ? `vs ${b.away_team}` : ''}</span>
        {statusTag(b.status, b.status === 'won' ? ` +${(b.payout - b.stake).toLocaleString()}` : b.status === 'lost' ? ` −${b.stake.toLocaleString()}` : '')}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 11.5, color: '#898781' }}>
        <span>픽 <b style={{ color: '#c3c2b7' }}>{PICK_KO[b.pick] || b.pick}</b></span>
        <span>배당 <b style={{ color: '#c3c2b7' }}>{b.bet_odds}</b></span>
        <span>스테이크 <b style={{ color: '#c3c2b7' }}>{Number(b.stake).toLocaleString()}</b></span>
      </div>
      <ClvPill b={b} />
    </div>
  );
}

function ComboCard({ s }: { s: any }) {
  const legs = s.legs || [];
  return (
    <div style={{ background: '#1a1a19', border: '1px solid rgba(57,135,229,.25)', borderRadius: 14, padding: 13, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 800 }}><span style={{ fontSize: 10, fontWeight: 800, color: '#9cc4f4', background: 'rgba(57,135,229,.16)', padding: '2px 7px', borderRadius: 5, marginRight: 7 }}>조합</span>{s.legs_count}경기</span>
        {statusTag(s.status, s.status === 'won' ? ` +${(s.payout - s.stake).toLocaleString()}` : s.status === 'lost' ? ` −${s.stake.toLocaleString()}` : '')}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 11.5, color: '#898781' }}>
        <span>합산배당 <b style={{ color: '#79b0f0' }}>{Number(s.combined_odds).toFixed(2)}</b></span>
        <span>스테이크 <b style={{ color: '#c3c2b7' }}>{Number(s.stake).toLocaleString()}</b></span>
      </div>
      <div style={{ marginTop: 11, borderTop: '1px solid #2c2c2a', paddingTop: 9 }}>
        {legs.map((l: any) => (
          <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', fontSize: 11.5 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
              <i style={{ width: 6, height: 6, borderRadius: '50%', flex: '0 0 auto', background: l.leg_status ? LEG_C[l.leg_status] : '#6b6a64' }} />
              <span style={{ color: '#c3c2b7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.home_team} vs {l.away_team}</span>
            </span>
            <span style={{ color: '#898781', flex: '0 0 auto', paddingLeft: 8 }}>{PICK_KO[l.pick] || l.pick} <b style={{ color: '#c3c2b7' }}>{Number(l.bet_odds).toFixed(2)}</b></span>
          </div>
        ))}
      </div>
      <ClvPill b={s} />
    </div>
  );
}

function ClvPill({ b }: { b: any }) {
  return (
    <div style={{ marginTop: 11, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#232320', borderRadius: 10, padding: '9px 11px' }}>
      {b.status === 'open' ? (
        <><span style={{ fontSize: 11, color: '#898781' }}>정산 대기</span><span style={{ fontSize: 12, color: '#898781' }}>경기 후 자동 채점</span></>
      ) : (
        <><span style={{ fontSize: 11, color: '#898781' }}>CLV</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: b.clv == null ? '#898781' : b.clv >= 0 ? '#3ecb3e' : '#e66767' }}>{fmtPct(b.clv)}</span></>
      )}
    </div>
  );
}

function Paywall() {
  return (
    <div style={{ marginTop: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>멤버쉽 전용</div>
      <p style={{ fontSize: 12.5, color: '#c3c2b7', marginBottom: 16 }}>기록·CLV 채점은 멤버쉽에서 이용할 수 있어요.</p>
      <a href="/coach/pricing" style={{ background: '#3987e5', color: '#fff', fontWeight: 800, fontSize: 13, padding: '11px 18px', borderRadius: 12, textDecoration: 'none' }}>멤버쉽 시작하기</a>
    </div>
  );
}
