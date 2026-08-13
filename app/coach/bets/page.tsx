'use client';
// app/coach/bets/page.tsx — 내 기록(토계부). 진행중/완료 탭 + CLV.
import { useEffect, useState } from 'react';
import { coachApi, MembershipError, AuthError } from '@/lib/coachApi';

const fmtPct = (v: number | null) => (v == null ? '-' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`);
const PICK_KO: Record<string, string> = { HOME: '홈', DRAW: '무', AWAY: '원정' };
const ST = {
  won: { t: '적중', c: '#4bd14b', bg: 'rgba(12,163,12,.16)' },
  lost: { t: '미적중', c: '#e66767', bg: 'rgba(208,59,59,.16)' },
  void: { t: '취소', c: '#c3c2b7', bg: 'rgba(137,135,129,.16)' },
  open: { t: '진행중', c: '#9cc4f4', bg: 'rgba(57,135,229,.16)' },
} as const;

export default function BetsPage() {
  const [bets, setBets] = useState<any[] | null>(null);
  const [tab, setTab] = useState<'open' | 'settled'>('open');
  const [state, setState] = useState<'loading' | 'ok' | 'guest' | 'auth' | 'error'>('loading');

  useEffect(() => {
    coachApi.bets().then((r: any) => { setBets(r.bets); setState('ok'); })
      .catch((e) => setState(e instanceof MembershipError ? 'guest' : e instanceof AuthError ? 'auth' : 'error'));
  }, []);

  if (state === 'loading') return <p style={{ color: '#898781', marginTop: 40, textAlign: 'center' }}>불러오는 중…</p>;
  if (state === 'auth') return <p style={{ color: '#898781', marginTop: 40, textAlign: 'center' }}>로그인이 필요해요.</p>;
  if (state === 'guest') return <Paywall />;
  if (state === 'error') return <p style={{ color: '#e66767', marginTop: 40, textAlign: 'center' }}>불러오기 실패</p>;

  const list = (bets || []).filter((b) => (tab === 'open' ? b.status === 'open' : b.status !== 'open'));
  const openCnt = (bets || []).filter((b) => b.status === 'open').length;
  const doneCnt = (bets || []).length - openCnt;

  return (
    <>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#898781', margin: '18px 2px 10px', letterSpacing: .6 }}>내 기록 (토계부)</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(['open', 'settled'] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)} style={{ flex: 1, border: `1px solid ${tab === k ? '#383835' : 'rgba(255,255,255,.1)'}`, background: tab === k ? '#232320' : '#1a1a19', color: tab === k ? '#fff' : '#898781', fontWeight: 700, fontSize: 12.5, padding: 9, borderRadius: 11, cursor: 'pointer' }}>
            {k === 'open' ? `진행중 ${openCnt}` : `완료 ${doneCnt}`}
          </button>
        ))}
      </div>
      {!list.length && <p style={{ color: '#898781', textAlign: 'center', marginTop: 30 }}>{tab === 'open' ? '진행중인 기록이 없어요.' : '완료된 기록이 없어요.'}</p>}
      {list.map((b) => {
        const st = ST[b.status as keyof typeof ST] || ST.open;
        return (
          <div key={b.id} style={{ background: '#1a1a19', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, padding: 13, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{b.home_team || b.match_id} {b.away_team ? `vs ${b.away_team}` : ''}</span>
              <span style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 8px', borderRadius: 6, color: st.c, background: st.bg }}>
                {st.t}{b.status === 'won' ? ` +${(b.payout - b.stake).toLocaleString()}` : b.status === 'lost' ? ` −${b.stake.toLocaleString()}` : ''}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 11.5, color: '#898781' }}>
              <span>픽 <b style={{ color: '#c3c2b7' }}>{PICK_KO[b.pick] || b.pick}</b></span>
              <span>배당 <b style={{ color: '#c3c2b7' }}>{b.bet_odds}</b></span>
              <span>스테이크 <b style={{ color: '#c3c2b7' }}>{Number(b.stake).toLocaleString()}</b></span>
            </div>
            <div style={{ marginTop: 11, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#232320', borderRadius: 10, padding: '9px 11px' }}>
              {b.status === 'open' ? (
                <><span style={{ fontSize: 11, color: '#898781' }}>정산 대기</span><span style={{ fontSize: 12, color: '#898781' }}>경기 후 자동 채점</span></>
              ) : (
                <><span style={{ fontSize: 11, color: '#898781' }}>CLV{b.close_odds ? ` (내 ${b.bet_odds} vs 마감 ${b.close_odds})` : ''}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: b.clv == null ? '#898781' : b.clv >= 0 ? '#3ecb3e' : '#e66767' }}>{fmtPct(b.clv)}</span></>
              )}
            </div>
          </div>
        );
      })}
    </>
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
