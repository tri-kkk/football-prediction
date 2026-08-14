'use client';
// app/coach/ui.tsx — 코치 앱 공통 UI (시그널 링·경기 카드·기록 추가 시트). 홈/경기 화면 공유.
import { useState } from 'react';
import Link from 'next/link';
import { coachApi, type MatchSignal } from '@/lib/coachApi';
import { useSlipCart } from './slipCart';

export const GRADE_COLOR: Record<string, string> = { S: '#3987e5', A: '#0ca30c', B: '#eda100', C: '#898781' };

// 리그 코드 → 국기 + 한글 리그명
const LEAGUE_META: Record<string, { flag: string; name: string }> = {
  PL: { flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', name: '프리미어리그' },
  PD: { flag: '🇪🇸', name: '라리가' },
  BL1: { flag: '🇩🇪', name: '분데스리가' },
  SA: { flag: '🇮🇹', name: '세리에A' },
  FL1: { flag: '🇫🇷', name: '리그1' },
  PPL: { flag: '🇵🇹', name: '프리메이라리가' },
  DED: { flag: '🇳🇱', name: '에레디비시' },
  CL: { flag: '🇪🇺', name: '챔피언스리그' },
  EL: { flag: '🇪🇺', name: '유로파리그' },
  ELC: { flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', name: '챔피언십' },
};
export const leagueLabel = (code?: string) => {
  const m = code ? LEAGUE_META[code] : null;
  return m ? `${m.flag} ${m.name}` : (code || '');
};
export const pct = (v: number) => `${Math.round(v * 100)}%`;
export const PICK_KO: Record<string, string> = { HOME: '홈', DRAW: '무', AWAY: '원정' };
export const kickoffStr = (iso: string) => {
  try { return new Date(iso).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
};
// "Regular Season - 12" → "12R", 그 외(그룹/토너먼트)는 원문 유지
export const roundLabel = (round?: string) => {
  if (!round) return '';
  const m = round.match(/(\d+)\s*$/);
  return m ? `${m[1]}R` : round;
};

export function Ring({ score, grade }: { score: number; grade: string }) {
  const c = 2 * Math.PI * 27;
  const dash = Math.max(0, Math.min(1, score / 100)) * c;
  const color = GRADE_COLOR[grade] || '#898781';
  return (
    <div style={{ position: 'relative', width: 66, textAlign: 'center', flex: '0 0 auto' }}>
      <svg width={66} height={66} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={33} cy={33} r={27} fill="none" stroke="#232320" strokeWidth={6} />
        <circle cx={33} cy={33} r={27} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" strokeDasharray={`${dash} ${c}`} />
      </svg>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 66, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 25, fontWeight: 800, color }}>{grade}</div>
      <div style={{ fontSize: 10, color: '#898781', fontWeight: 700, marginTop: 6 }}>신뢰도 <b style={{ color: '#c3c2b7' }}>{Math.round(score)}%</b></div>
    </div>
  );
}

export const Dots = ({ n }: { n: number }) => (
  <span style={{ display: 'inline-flex', gap: 3, verticalAlign: 'middle' }}>
    {[1, 2, 3, 4, 5].map((i) => <i key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i <= n ? '#fab219' : '#2c2c2a', display: 'inline-block' }} />)}
  </span>
);

// 팀 엠블럼(API-Football). 로고 로드 실패 시 이니셜 배지로 폴백.
export function Emblem({ id, name, size = 26 }: { id?: number; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (!id || err) {
    return <div style={{ width: size, height: size, borderRadius: 8, background: '#232320', display: 'grid', placeItems: 'center', fontSize: size * 0.38, fontWeight: 800, color: '#c3c2b7', flex: '0 0 auto' }}>{name.slice(0, 3).toUpperCase()}</div>;
  }
  return <img src={`https://media.api-sports.io/football/teams/${id}.png`} alt="" width={size} height={size} loading="lazy" onError={() => setErr(true)} style={{ objectFit: 'contain', flex: '0 0 auto' }} />;
}

export function MatchCard({ m, member, onAdd }: { m: MatchSignal; member: boolean; onAdd: (m: MatchSignal) => void }) {
  const s = m.signal;
  const hasOdds = m.odds.home != null && m.odds.draw != null && m.odds.away != null;
  const cart = useSlipCart();
  const inCart = cart.has(m.matchId);
  const recPick = s && s.recommendation !== 'WATCH' ? s.recommendation : 'HOME';
  const addToSlip = () =>
    inCart ? cart.remove(m.matchId)
      : cart.add({ matchId: m.matchId, home: m.home, away: m.away, league: m.league, kickoff: m.kickoff, grade: s?.grade, odds: m.odds, pick: recPick as any });
  return (
    <div style={{ position: 'relative', background: '#1a1a19', border: '1px solid rgba(255,255,255,.1)', borderRadius: 16, padding: 14, marginBottom: 11 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10.5, color: '#898781' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ background: '#232320', padding: '3px 8px', borderRadius: 6, fontWeight: 700, color: '#c3c2b7' }}>{leagueLabel(m.league)}</span>
          {roundLabel(m.round) && <span style={{ background: 'rgba(57,135,229,.12)', padding: '3px 8px', borderRadius: 6, fontWeight: 700, color: '#9cc4f4' }}>{roundLabel(m.round)}</span>}
        </span>
        <span>{kickoffStr(m.kickoff)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 4px', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <Emblem id={m.homeId} name={m.home} />
          <span style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.home}</span>
        </div>
        <span style={{ fontSize: 10.5, color: '#898781', fontWeight: 700, flex: '0 0 auto' }}>VS</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, justifyContent: 'flex-end' }}>
          <span style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>{m.away}</span>
          <Emblem id={m.awayId} name={m.away} />
        </div>
      </div>
      {s && (
        <>
          <div style={{ display: 'flex', height: 9, borderRadius: 6, overflow: 'hidden', background: '#232320', gap: 2, marginTop: 12 }}>
            <span style={{ width: `${m.model.home * 100}%`, background: '#3987e5' }} />
            <span style={{ width: `${m.model.draw * 100}%`, background: '#6b6a64' }} />
            <span style={{ width: `${m.model.away * 100}%`, background: '#d95926' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, fontSize: 11, fontWeight: 700 }}>
            <span style={{ color: '#79b0f0' }}>홈 {pct(m.model.home)}</span>
            <span style={{ color: '#b8b7b0' }}>무 {pct(m.model.draw)}</span>
            <span style={{ color: '#eb8a5f' }}>원정 {pct(m.model.away)}</span>
          </div>
          <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 7, background: 'rgba(57,135,229,.14)', color: '#9cc4f4', marginTop: 12 }}>형세 · {s.formType}</span>
          <div style={{ display: 'flex', gap: 13, alignItems: 'center', marginTop: 11, paddingTop: 13, borderTop: '1px solid #2c2c2a' }}>
            <Ring score={s.score} grade={s.grade} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 7, color: s.recommendation === 'WATCH' ? '#898781' : '#79b0f0' }}>추천 {s.recommendation === 'WATCH' ? '관망' : s.recommendationText}</div>
              <div style={{ fontSize: 11, color: '#898781', marginBottom: 5 }}>강약 홈 {s.strengths.home}·무 {s.strengths.draw}·원정 {s.strengths.away}</div>
              {s.totalMatches != null && s.histRate != null && <div style={{ fontSize: 11, color: '#898781', marginBottom: 5 }}>과거 이 형세 <b style={{ color: '#c3c2b7' }}>{s.totalMatches}경기</b> → <b style={{ color: '#c3c2b7' }}>{pct(s.histRate)}</b></div>}
              {s.gap && <div style={{ fontSize: 11, color: '#898781' }}>이견 <Dots n={s.gap.strength} /> {Math.abs(s.gap.pp) >= 7 ? '강함' : Math.abs(s.gap.pp) >= 3 ? '보통' : '낮음'}</div>}
            </div>
          </div>
          {member ? (
            hasOdds ? (
              <>
                <div style={{ display: 'flex', gap: 8, marginTop: 13 }}>
                  <Link href={`/coach/match/${m.matchId}`} style={{ flex: 1, textAlign: 'center', border: '1px solid #383835', background: '#232320', color: '#fff', fontWeight: 800, fontSize: 12.5, padding: 11, borderRadius: 11, textDecoration: 'none' }}>세부 데이터</Link>
                  <button onClick={() => onAdd(m)} style={{ flex: 1, border: 0, background: '#3987e5', color: '#fff', fontWeight: 800, fontSize: 12.5, padding: 11, borderRadius: 11, cursor: 'pointer' }}>＋ 기록 추가</button>
                </div>
                <button onClick={addToSlip} style={{ width: '100%', marginTop: 8, border: `1px solid ${inCart ? 'rgba(12,163,12,.5)' : 'rgba(255,255,255,.12)'}`, background: inCart ? 'rgba(12,163,12,.14)' : 'transparent', color: inCart ? '#4bd14b' : '#c3c2b7', fontWeight: 700, fontSize: 12.5, padding: 10, borderRadius: 11, cursor: 'pointer' }}>
                  {inCart ? '조합에 담김 ✓ (빼기)' : '＋ 조합 담기'}
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', gap: 8, marginTop: 13, alignItems: 'stretch' }}>
                <Link href={`/coach/match/${m.matchId}`} style={{ flex: 1, textAlign: 'center', border: '1px solid #383835', background: '#232320', color: '#fff', fontWeight: 800, fontSize: 12.5, padding: 11, borderRadius: 11, textDecoration: 'none' }}>세부 데이터</Link>
                <div style={{ flex: 1, textAlign: 'center', border: '1px dashed rgba(255,255,255,.14)', color: '#898781', fontWeight: 700, fontSize: 12, padding: 11, borderRadius: 11 }}>배당 대기중</div>
              </div>
            )
          ) : (
            <a href="/coach/pricing" style={{ display: 'block', textAlign: 'center', marginTop: 13, background: '#3987e5', color: '#fff', fontWeight: 800, fontSize: 12.5, padding: 11, borderRadius: 11, textDecoration: 'none' }}>멤버쉽 시작하고 기록하기</a>
          )}
        </>
      )}
      {m.locked && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,20,19,.6)', backdropFilter: 'blur(3px)', borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <div style={{ fontSize: 12.5, fontWeight: 800 }}>멤버쉽 전용</div>
          <a href="/coach/pricing" style={{ background: '#3987e5', color: '#fff', fontWeight: 700, fontSize: 11.5, padding: '8px 15px', borderRadius: 10, textDecoration: 'none' }}>잠금 해제</a>
        </div>
      )}
    </div>
  );
}

export function BetSheet({ m, onClose, onSaved }: { m: MatchSignal; onClose: () => void; onSaved: () => void }) {
  const rec = m.signal && m.signal.recommendation !== 'WATCH' ? m.signal.recommendation : 'HOME';
  const oddsOf = (p: string) => (p === 'HOME' ? m.odds.home : p === 'DRAW' ? m.odds.draw : m.odds.away) ?? 2.0;
  const [pick, setPick] = useState<string>(rec);
  const [odds, setOdds] = useState<string>(String(oddsOf(rec)));
  const [stake, setStake] = useState<string>('15000');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const o = parseFloat(odds) || 0;
  const st = parseInt(stake.replace(/[^0-9]/g, '')) || 0;
  const total = Math.round(st * o), profit = total - st;

  const choose = (p: string) => { setPick(p); setOdds(String(oddsOf(p))); };
  const save = async () => {
    setSaving(true); setErr('');
    try {
      await coachApi.createBet({ matchId: m.matchId, pick, stake: st, betOdds: o });
      onSaved(); onClose();
    } catch (e: any) { setErr(e.message || '저장 실패'); setSaving(false); }
  };

  const pillBtn = (p: string) => (
    <div onClick={() => choose(p)} style={{ flex: 1, textAlign: 'center', border: `1.5px solid ${pick === p ? '#3987e5' : 'rgba(255,255,255,.1)'}`, background: pick === p ? 'rgba(57,135,229,.12)' : '#232320', borderRadius: 13, padding: '12px 8px', cursor: 'pointer' }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: pick === p ? '#79b0f0' : '#fff' }}>{PICK_KO[p]}</div>
      <div style={{ fontSize: 12, color: '#898781', marginTop: 5 }}>{oddsOf(p).toFixed(2)}</div>
    </div>
  );
  const chip = (v: number, label: string) => (
    <span onClick={() => setStake(String(v))} style={{ border: `1px solid ${st === v ? '#3987e5' : 'rgba(255,255,255,.1)'}`, color: st === v ? '#79b0f0' : '#c3c2b7', background: st === v ? 'rgba(57,135,229,.12)' : '#232320', fontSize: 11.5, fontWeight: 700, padding: '7px 11px', borderRadius: 9, cursor: 'pointer' }}>{label}</span>
  );

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 45 }} />
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, maxWidth: 480, margin: '0 auto', zIndex: 46, background: '#1a1a19', borderRadius: '22px 22px 0 0', borderTop: '1px solid rgba(255,255,255,.1)', padding: '14px 16px 24px', maxHeight: '90%', overflowY: 'auto' }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: '#383835', margin: '2px auto 14px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>기록 추가</div>
          <button onClick={onClose} style={{ width: 30, height: 30, border: '1px solid rgba(255,255,255,.1)', borderRadius: 9, background: '#232320', color: '#fff', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ background: '#232320', borderRadius: 12, padding: 12, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 800 }}>
            <Emblem id={m.homeId} name={m.home} size={22} />{m.home}
            <span style={{ color: '#898781', fontWeight: 700, fontSize: 11 }}>vs</span>
            <Emblem id={m.awayId} name={m.away} size={22} />{m.away}
          </div>
          <div style={{ fontSize: 11, color: '#898781', marginTop: 6 }}>{m.league} · {kickoffStr(m.kickoff)}{m.signal ? ` · KSM ${m.signal.grade}등급` : ''}</div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#c3c2b7', marginBottom: 9 }}>픽 선택</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>{pillBtn('HOME')}{pillBtn('DRAW')}{pillBtn('AWAY')}</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#c3c2b7', marginBottom: 9 }}>내 배당</div>
        <input value={odds} onChange={(e) => setOdds(e.target.value)} inputMode="decimal" style={{ width: '100%', background: '#232320', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: '13px 14px', color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 16 }} />
        <div style={{ fontSize: 12, fontWeight: 700, color: '#c3c2b7', marginBottom: 9 }}>스테이크 (원)</div>
        <input value={Number(st).toLocaleString()} onChange={(e) => setStake(e.target.value)} inputMode="numeric" style={{ width: '100%', background: '#232320', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: '13px 14px', color: '#fff', fontSize: 16, fontWeight: 700 }} />
        <div style={{ display: 'flex', gap: 7, marginTop: 9, marginBottom: 16 }}>{chip(15000, '1단위 15,000')}{chip(30000, '2단위 30,000')}{chip(45000, '3단위 45,000')}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', background: '#232320', borderRadius: 12, padding: '13px 14px', marginBottom: 16 }}>
          <div><div style={{ fontSize: 11, color: '#898781' }}>예상 순수익</div><div style={{ fontSize: 17, fontWeight: 800, color: '#3ecb3e', marginTop: 4 }}>{profit >= 0 ? '+' : ''}{profit.toLocaleString()}</div></div>
          <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11, color: '#898781' }}>적중 시 총 회수</div><div style={{ fontSize: 17, fontWeight: 800, marginTop: 4 }}>{total.toLocaleString()}</div></div>
        </div>
        <div style={{ fontSize: 11, color: '#c3c2b7', lineHeight: 1.55, background: 'rgba(57,135,229,.08)', border: '1px solid rgba(57,135,229,.25)', borderRadius: 10, padding: 11, marginBottom: 16 }}>
          이 기록에 지금의 <b style={{ color: '#9cc4f4' }}>KSM 시그널·마감배당</b>이 함께 저장돼, 경기 후 <b style={{ color: '#9cc4f4' }}>CLV로 자동 채점</b>됩니다.
        </div>
        {err && <div style={{ color: '#e66767', fontSize: 12, marginBottom: 10, textAlign: 'center' }}>{err}</div>}
        <button onClick={save} disabled={saving} style={{ width: '100%', border: 0, background: '#3987e5', color: '#fff', fontWeight: 800, fontSize: 14, padding: 14, borderRadius: 13, cursor: 'pointer', opacity: saving ? .6 : 1 }}>{saving ? '저장 중…' : '기록 저장'}</button>
      </div>
    </>
  );
}
