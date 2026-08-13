'use client';
// app/coach/matches/page.tsx — 경기 화면: 리그 필터 + KSM 시그널 카드 목록 + 기록 추가 시트.
import { useEffect, useState } from 'react';
import { coachApi, MembershipError, AuthError, mainLoginUrl, type MatchSignal } from '@/lib/coachApi';
import { MatchCard, BetSheet } from '../ui';

const LEAGUES: { key: string; label: string }[] = [
  { key: 'ALL', label: '전체' },
  { key: 'PL', label: 'EPL' },
  { key: 'PD', label: '라리가' },
  { key: 'BL1', label: '분데스' },
  { key: 'SA', label: '세리에A' },
  { key: 'FL1', label: '리그1' },
];

export default function MatchesPage() {
  const [league, setLeague] = useState('ALL');
  const [data, setData] = useState<{ member: boolean; matches: MatchSignal[] } | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'guest' | 'auth' | 'error'>('loading');
  const [err, setErr] = useState('');
  const [sheet, setSheet] = useState<MatchSignal | null>(null);
  const [saved, setSaved] = useState(false);

  const load = (lg: string) => {
    setState('loading');
    coachApi.matches(lg)
      .then((r) => { setData(r); setState(r.member ? 'ok' : 'guest'); })
      .catch((e) => {
        if (e instanceof MembershipError) setState('guest');
        else if (e instanceof AuthError) setState('auth');
        else { setErr(e.message); setState('error'); }
      });
  };
  useEffect(() => { load(league); }, [league]);

  return (
    <>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#898781', margin: '18px 2px 10px', letterSpacing: .6 }}>경기 · KSM 시그널</div>

      <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4, marginBottom: 10, scrollbarWidth: 'none' }}>
        {LEAGUES.map((l) => (
          <button key={l.key} onClick={() => setLeague(l.key)} style={{ flex: '0 0 auto', border: `1px solid ${league === l.key ? '#383835' : 'rgba(255,255,255,.1)'}`, background: league === l.key ? '#232320' : '#1a1a19', color: league === l.key ? '#fff' : '#898781', fontWeight: 700, fontSize: 12.5, padding: '8px 14px', borderRadius: 11, cursor: 'pointer' }}>{l.label}</button>
        ))}
      </div>

      {state === 'guest' && (
        <div style={{ background: 'linear-gradient(135deg,#1c2a40,#171d28)', border: '1px solid rgba(57,135,229,.4)', borderRadius: 14, padding: '13px 14px', marginBottom: 12, fontSize: 12, color: '#c3c2b7', lineHeight: 1.55 }}>
          미구독은 <b style={{ color: '#9cc4f4' }}>오늘 1경기</b>만 열람할 수 있어요. 나머지 경기의 시그널은 멤버쉽 전용입니다.
          <a href="/coach/pricing" style={{ display: 'inline-block', marginTop: 9, background: '#3987e5', color: '#fff', fontWeight: 700, fontSize: 11.5, padding: '8px 14px', borderRadius: 10, textDecoration: 'none' }}>멤버쉽 시작하기</a>
        </div>
      )}

      {state === 'loading' && <p style={{ color: '#898781', marginTop: 40, textAlign: 'center' }}>불러오는 중…</p>}
      {state === 'auth' && <p style={{ color: '#898781', marginTop: 40, textAlign: 'center' }}>로그인이 필요해요. <a href={mainLoginUrl()} style={{ color: '#79b0f0' }}>로그인</a></p>}
      {state === 'error' && <p style={{ color: '#e66767', marginTop: 40, textAlign: 'center' }}>{err}</p>}
      {saved && <div style={{ background: 'rgba(12,163,12,.15)', color: '#4bd14b', fontSize: 12.5, fontWeight: 700, padding: 10, borderRadius: 10, margin: '10px 0', textAlign: 'center' }}>기록이 저장됐어요.</div>}

      {(state === 'ok' || state === 'guest') && data && (
        <>
          {data.matches.map((m) => <MatchCard key={m.matchId} m={m} member={data.member} onAdd={setSheet} />)}
          {!data.matches.length && <p style={{ color: '#898781', textAlign: 'center', marginTop: 30 }}>예정 경기가 없어요.</p>}
        </>
      )}
      {sheet && <BetSheet m={sheet} onClose={() => setSheet(null)} onSaved={() => { setSaved(true); load(league); }} />}
    </>
  );
}
