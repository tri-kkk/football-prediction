'use client';
// app/coach/matches/page.tsx — 경기 화면: 리그 필터 + KSM 시그널 카드 목록 + 기록 추가 시트.
import { useEffect, useState } from 'react';
import { coachApi, MembershipError, AuthError, mainLoginUrl, type MatchSignal } from '@/lib/coachApi';
import { MatchCard, BetSheet, StatStrip, Skeleton } from '../ui';

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
      {(() => {
        const ms = data?.matches || [];
        const withGap = ms.filter((m) => m.signal?.gap);
        const avgGap = withGap.length ? withGap.reduce((s, m) => s + Math.abs(m.signal!.gap!.pp), 0) / withGap.length : null;
        const saCount = ms.filter((m) => m.signal && (m.signal.grade === 'S' || m.signal.grade === 'A')).length;
        return <StatStrip title="오늘의 경기" stats={[
          { k: '예정 경기', v: `${ms.length}` },
          { k: 'S·A 등급', v: `${saCount}`, tone: 'blue' },
          { k: '평균 이견', v: avgGap != null ? `${avgGap.toFixed(1)}%` : '—', tone: 'grn' },
        ]} />;
      })()}

      <div className="tc-snap tc-hidebar" style={{ display: 'flex', gap: 7, overflowX: 'auto', padding: '12px 0 4px', marginBottom: 10 }}>
        {LEAGUES.map((l) => (
          <button key={l.key} onClick={() => setLeague(l.key)} style={{ flex: '0 0 auto', border: `1px solid ${league === l.key ? '#383835' : 'rgba(255,255,255,.1)'}`, background: league === l.key ? '#232320' : '#1a1a19', color: league === l.key ? '#fff' : '#898781', fontWeight: 700, fontSize: 12.5, padding: '8px 14px', borderRadius: 11, cursor: 'pointer' }}>{l.label}</button>
        ))}
      </div>

      {state === 'loading' && <><Skeleton /><Skeleton /><Skeleton /></>}
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
