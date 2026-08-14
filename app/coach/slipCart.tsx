'use client';
// app/coach/slipCart.tsx — 조합(슬립) 장바구니: 컨텍스트 + 하단 슬립바 + 저장 시트.
import { createContext, useContext, useEffect, useState } from 'react';
import { coachApi } from '@/lib/coachApi';
import { combinedOdds } from '@/lib/coachSlip';

type Pick = 'HOME' | 'DRAW' | 'AWAY';
export interface CartLeg {
  matchId: string; home: string; away: string; league: string; kickoff: string; grade?: string;
  odds: { home: number | null; draw: number | null; away: number | null };
  pick: Pick;
}
const PICK_KO: Record<Pick, string> = { HOME: '홈', DRAW: '무', AWAY: '원정' };
const oddsOf = (l: CartLeg): number => (l.pick === 'HOME' ? l.odds.home : l.pick === 'DRAW' ? l.odds.draw : l.odds.away) ?? 0;

interface Ctx {
  legs: CartLeg[];
  has: (matchId: string) => boolean;
  add: (leg: CartLeg) => void;
  remove: (matchId: string) => void;
  setPick: (matchId: string, pick: Pick) => void;
  clear: () => void;
  open: () => void;
}
const SlipCtx = createContext<Ctx | null>(null);
export const useSlipCart = () => {
  const c = useContext(SlipCtx);
  if (!c) throw new Error('useSlipCart must be used within SlipCartProvider');
  return c;
};

export function SlipCartProvider({ children }: { children: React.ReactNode }) {
  const [legs, setLegs] = useState<CartLeg[]>([]);
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    try { const s = localStorage.getItem('coach_slip'); if (s) setLegs(JSON.parse(s)); } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem('coach_slip', JSON.stringify(legs)); } catch {}
  }, [legs]);

  const ctx: Ctx = {
    legs,
    has: (id) => legs.some((l) => l.matchId === id),
    add: (leg) => setLegs((p) => (p.some((l) => l.matchId === leg.matchId) ? p : p.length >= 12 ? p : [...p, leg])),
    remove: (id) => setLegs((p) => p.filter((l) => l.matchId !== id)),
    setPick: (id, pick) => setLegs((p) => p.map((l) => (l.matchId === id ? { ...l, pick } : l))),
    clear: () => setLegs([]),
    open: () => setSheet(true),
  };

  return (
    <SlipCtx.Provider value={ctx}>
      {children}
      <SlipBar onOpen={() => setSheet(true)} />
      {sheet && <SlipSheet onClose={() => setSheet(false)} />}
    </SlipCtx.Provider>
  );
}

function SlipBar({ onOpen }: { onOpen: () => void }) {
  const { legs } = useSlipCart();
  if (!legs.length) return null;
  const combined = combinedOdds(legs.map((l) => ({ betOdds: oddsOf(l) })));
  return (
    <div style={{ position: 'fixed', left: 0, right: 0, bottom: 'calc(env(safe-area-inset-bottom) + 70px)', maxWidth: 480, margin: '0 auto', zIndex: 40, padding: '0 12px' }}>
      <button onClick={onOpen} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: 0, borderRadius: 13, padding: '12px 16px', background: 'linear-gradient(135deg,#3987e5,#2b6fc4)', color: '#fff', cursor: 'pointer', boxShadow: '0 8px 24px rgba(57,135,229,.35)' }}>
        <span style={{ fontSize: 13, fontWeight: 800 }}>조합 {legs.length}경기</span>
        <span style={{ fontSize: 13.5, fontWeight: 800 }}>합산배당 {combined.toFixed(2)} ›</span>
      </button>
    </div>
  );
}

function SlipSheet({ onClose }: { onClose: () => void }) {
  const { legs, remove, setPick, clear } = useSlipCart();
  const [stake, setStake] = useState('15000');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState(false);

  const combined = combinedOdds(legs.map((l) => ({ betOdds: oddsOf(l) })));
  const st = parseInt(stake.replace(/[^0-9]/g, '')) || 0;
  const payout = Math.round(st * combined);

  const save = async () => {
    if (legs.length < 2) { setErr('2경기 이상 담아야 조합이에요.'); return; }
    setSaving(true); setErr('');
    try {
      await coachApi.createSlip({ stake: st, legs: legs.map((l) => ({ matchId: l.matchId, pick: l.pick, betOdds: oddsOf(l) })) });
      setSaved(true); clear();
      setTimeout(onClose, 900);
    } catch (e: any) { setErr(e.message || '저장 실패'); setSaving(false); }
  };

  const pickBtn = (l: CartLeg, p: Pick) => {
    const o = p === 'HOME' ? l.odds.home : p === 'DRAW' ? l.odds.draw : l.odds.away;
    const on = l.pick === p;
    return (
      <button key={p} disabled={o == null} onClick={() => setPick(l.matchId, p)} style={{ flex: 1, border: `1px solid ${on ? '#3987e5' : 'rgba(255,255,255,.09)'}`, background: on ? '#3987e5' : '#2f2f2b', color: o == null ? '#5a5a55' : on ? '#fff' : '#d4d3cc', borderRadius: 10, padding: '10px 4px', cursor: o == null ? 'default' : 'pointer', display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 800 }}>{PICK_KO[p]}</span>
        <span style={{ fontSize: 11.5, fontWeight: 700, opacity: on ? 1 : .85 }}>{o != null ? o.toFixed(2) : '-'}</span>
      </button>
    );
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 50 }} />
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, maxWidth: 480, margin: '0 auto', zIndex: 51, background: '#1a1a19', color: '#fff', fontFamily: 'system-ui, "Malgun Gothic", sans-serif', borderRadius: '22px 22px 0 0', borderTop: '1px solid rgba(255,255,255,.1)', padding: '14px 16px 24px', maxHeight: '88%', overflowY: 'auto' }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: '#383835', margin: '2px auto 14px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>조합 슬립 · {legs.length}경기</div>
          <button onClick={clear} style={{ border: '1px solid rgba(255,255,255,.1)', background: '#232320', color: '#e66767', fontWeight: 700, fontSize: 11.5, padding: '6px 11px', borderRadius: 9, cursor: 'pointer' }}>전체 비우기</button>
        </div>

        {saved && <div style={{ background: 'rgba(12,163,12,.15)', color: '#4bd14b', fontSize: 12.5, fontWeight: 700, padding: 10, borderRadius: 10, marginBottom: 12, textAlign: 'center' }}>조합이 저장됐어요.</div>}

        {legs.map((l) => (
          <div key={l.matchId} style={{ background: '#232320', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, padding: 12, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.home} <span style={{ color: '#6b6a64', fontWeight: 700 }}>vs</span> {l.away}</div>
              <button onClick={() => remove(l.matchId)} style={{ border: 0, background: 'transparent', color: '#898781', fontSize: 16, cursor: 'pointer', flex: '0 0 auto', paddingLeft: 8, lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ display: 'flex', gap: 7 }}>{(['HOME', 'DRAW', 'AWAY'] as Pick[]).map((p) => pickBtn(l, p))}</div>
          </div>
        ))}

        {legs.length < 2 && <div style={{ fontSize: 11.5, color: '#fab219', textAlign: 'center', margin: '6px 0 12px' }}>2경기 이상 담으면 조합으로 저장할 수 있어요.</div>}

        <div style={{ fontSize: 12, fontWeight: 700, color: '#c3c2b7', margin: '6px 0 8px' }}>스테이크 (원)</div>
        <input value={st.toLocaleString()} onChange={(e) => setStake(e.target.value)} inputMode="numeric" style={{ width: '100%', background: '#232320', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: '12px 14px', color: '#fff', fontSize: 16, fontWeight: 700 }} />
        <div style={{ display: 'flex', gap: 7, marginTop: 9 }}>
          {[15000, 30000, 50000].map((v) => (
            <span key={v} onClick={() => setStake(String(v))} style={{ border: `1px solid ${st === v ? '#3987e5' : 'rgba(255,255,255,.1)'}`, color: st === v ? '#79b0f0' : '#c3c2b7', background: st === v ? 'rgba(57,135,229,.12)' : '#232320', fontSize: 11.5, fontWeight: 700, padding: '7px 11px', borderRadius: 9, cursor: 'pointer' }}>{v.toLocaleString()}</span>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', background: '#232320', borderRadius: 12, padding: '13px 14px', margin: '14px 0' }}>
          <div><div style={{ fontSize: 11, color: '#898781' }}>합산배당</div><div style={{ fontSize: 18, fontWeight: 800, color: '#79b0f0', marginTop: 4 }}>{combined.toFixed(2)}</div></div>
          <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11, color: '#898781' }}>적중 시 예상 회수</div><div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{payout.toLocaleString()}</div></div>
        </div>

        <div style={{ fontSize: 11, color: '#c3c2b7', lineHeight: 1.55, background: 'rgba(57,135,229,.08)', border: '1px solid rgba(57,135,229,.25)', borderRadius: 10, padding: 11, marginBottom: 14 }}>
          <b style={{ color: '#9cc4f4' }}>전 경기 적중</b>해야 성공해요. 경기 후 <b style={{ color: '#9cc4f4' }}>조합 CLV</b>로 자동 채점됩니다.
        </div>
        {err && <div style={{ color: '#e66767', fontSize: 12, marginBottom: 10, textAlign: 'center' }}>{err}</div>}
        <button onClick={save} disabled={saving || legs.length < 2} style={{ width: '100%', border: 0, background: '#3987e5', color: '#fff', fontWeight: 800, fontSize: 14, padding: 14, borderRadius: 13, cursor: 'pointer', opacity: saving || legs.length < 2 ? .6 : 1 }}>{saving ? '저장 중…' : '조합 기록 저장'}</button>
      </div>
    </>
  );
}
