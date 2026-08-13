'use client';
// app/coach/page.tsx — 경기 화면(실 API). 회원/미구독 분기 + 시그널 카드 + 기록 추가 시트.
import { useEffect, useState } from 'react';
import { coachApi, MembershipError, AuthError, type MatchSignal } from '@/lib/coachApi';

const GRADE_COLOR: Record<string, string> = { S: '#3987e5', A: '#0ca30c', B: '#eda100', C: '#898781' };
const pct = (v: number) => `${Math.round(v * 100)}%`;
const kickoffStr = (iso: string) => {
  try { return new Date(iso).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
};
const PICK_KO: Record<string, string> = { HOME: '홈', DRAW: '무', AWAY: '원정' };

function Ring({ score, grade }: { score: number; grade: string }) {
  const c = 2 * Math.PI * 27;
  const dash = Math.max(0, Math.min(1, score / 100)) * c;
  const color = GRADE_COLOR[grade] || '#898781';
  return (
    <div style={{ position: 'relative', width: 66, textAlign: 'center', flex: '0 0 auto' }}>
      <svg width={66} height={66} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={33} cy={33} r={27} fill="none" stroke="#232320" strokeWidth={6} />
        <circle cx={33} cy={33} r={27} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" strokeDasharray={`${dash} ${c}`} />
      </svg>
      <div style={{ position: 'absolute', top: 16, left: 0, right: 0, fontSize: 22, fontWeight: 800, color }}>
        {grade}<div style={{ fontSize: 8.5, fontWeight: 700, color: '#898781', marginTop: 1 }}>시그널</div>
      </div>
      <div style={{ fontSize: 10, color: '#898781', fontWeight: 700, marginTop: 5 }}>신뢰도 <b style={{ color: '#c3c2b7' }}>{Math.round(score)}%</b></div>
    </div>
  );
}
const Dots = ({ n }: { n: number }) => (
  <span style={{ display: 'inline-flex', gap: 3, verticalAlign: 'middle' }}>
    {[1, 2, 3, 4, 5].map((i) => <i key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i <= n ? '#fab219' : '#2c2c2a', display: 'inline-block' }} />)}
  </span>
);

function Card({ m, member, onAdd }: { m: MatchSignal; member: boolean; onAdd: (m: MatchSignal) => void }) {
  const s = m.signal;
  return (
    <div style={{ position: 'relative', background: '#1a1a19', border: '1px solid rgba(255,255,255,.1)', borderRadius: 16, padding: 14, marginBottom: 11 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#898781' }}>
        <span style={{ background: '#232320', padding: '3px 8px', borderRadius: 6, fontWeight: 700, color: '#c3c2b7' }}>{m.league}</span>
        <span>{kickoffStr(m.kickoff)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0 4px', fontWeight: 700, fontSize: 14.5 }}>
        <span>{m.home}</span><span style={{ fontSize: 11, color: '#898781' }}>VS</span><span>{m.away}</span>
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
            <button onClick={() => onAdd(m)} style={{ marginTop: 13, width: '100%', border: 0, background: '#3987e5', color: '#fff', fontWeight: 800, fontSize: 12.5, padding: 11, borderRadius: 11, cursor: 'pointer' }}>＋ 기록 추가</button>
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

function Hero() {
  return (
    <div style={{ background: 'linear-gradient(160deg,#233450,#16202e 58%,#141a24)', border: '1px solid rgba(57,135,229,.35)', borderRadius: 20, padding: 20, margin: '10px 0 14px' }}>
      <span style={{ display: 'inline-block', fontSize: 10.5, fontWeight: 800, background: 'rgba(57,135,229,.2)', color: '#9cc4f4', padding: '5px 11px', borderRadius: 999 }}>멤버쉽 전용 · 오늘 1경기 무료</span>
      <div style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.34, margin: '13px 0 8px' }}>감이 아니라 <b style={{ color: '#5aa0f0' }}>데이터로</b><br />경기를 읽으세요</div>
      <div style={{ fontSize: 12.5, color: '#c3c2b7', lineHeight: 1.6, marginBottom: 17 }}>KSM 시그널로 승부를 예측하고, 내 픽을 CLV로 채점받는 축구 분석 코치.</div>
      <a href="/coach/pricing" style={{ display: 'block', textAlign: 'center', background: '#3987e5', color: '#fff', fontWeight: 800, fontSize: 14, padding: 13, borderRadius: 12, textDecoration: 'none' }}>멤버쉽 시작하기</a>
    </div>
  );
}

function BetSheet({ m, onClose, onSaved }: { m: MatchSignal; onClose: () => void; onSaved: () => void }) {
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
          <div style={{ fontSize: 13.5, fontWeight: 800 }}>{m.home} vs {m.away}</div>
          <div style={{ fontSize: 11, color: '#898781', marginTop: 3 }}>{m.league} · {kickoffStr(m.kickoff)}{m.signal ? ` · KSM ${m.signal.grade}등급` : ''}</div>
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

export default function CoachPage() {
  const [data, setData] = useState<{ member: boolean; matches: MatchSignal[] } | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'guest' | 'auth' | 'error'>('loading');
  const [err, setErr] = useState('');
  const [sheet, setSheet] = useState<MatchSignal | null>(null);
  const [saved, setSaved] = useState(false);

  const load = () => {
    coachApi.matches('ALL')
      .then((r) => { setData(r); setState(r.member ? 'ok' : 'guest'); })
      .catch((e) => {
        if (e instanceof MembershipError) setState('guest');
        else if (e instanceof AuthError) setState('auth');
        else { setErr(e.message); setState('error'); }
      });
  };
  useEffect(load, []);

  return (
    <>
      {state === 'loading' && <p style={{ color: '#898781', marginTop: 40, textAlign: 'center' }}>불러오는 중…</p>}
      {state === 'auth' && <p style={{ color: '#898781', marginTop: 40, textAlign: 'center' }}>로그인이 필요해요. <a href="/coach/login" style={{ color: '#79b0f0' }}>로그인</a></p>}
      {state === 'error' && <p style={{ color: '#e66767', marginTop: 40, textAlign: 'center' }}>{err}</p>}
      {saved && <div style={{ background: 'rgba(12,163,12,.15)', color: '#4bd14b', fontSize: 12.5, fontWeight: 700, padding: 10, borderRadius: 10, margin: '10px 0', textAlign: 'center' }}>기록이 저장됐어요.</div>}

      {state === 'guest' && <Hero />}
      {(state === 'ok' || state === 'guest') && data && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: state === 'guest' ? '#4bd14b' : '#898781', margin: '18px 2px 10px', letterSpacing: .6 }}>
            {state === 'guest' ? '오늘의 무료 시그널 · 맛보기' : '경기 · KSM 시그널'}
          </div>
          {data.matches.map((m) => <Card key={m.matchId} m={m} member={data.member} onAdd={setSheet} />)}
          {!data.matches.length && <p style={{ color: '#898781', textAlign: 'center' }}>예정 경기가 없어요.</p>}
        </>
      )}
      {sheet && <BetSheet m={sheet} onClose={() => setSheet(null)} onSaved={() => { setSaved(true); load(); }} />}
    </>
  );
}
