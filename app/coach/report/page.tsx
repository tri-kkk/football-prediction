'use client';
// app/coach/report/page.tsx — 코치 리포트: 리그/배당대/등급별 CLV 분해 + 코멘트.
import { useEffect, useState } from 'react';
import { coachApi, MembershipError, AuthError } from '@/lib/coachApi';
import { leagueNameKo, StatStrip } from '../ui';

const fmtPct = (v: number | null) => (v == null ? '-' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`);

function DivergingBar({ v }: { v: number | null }) {
  const w = v == null ? 0 : Math.min(Math.abs(v) * 100 * 4, 48);
  const pos = v != null && v >= 0;
  return (
    <span style={{ flex: 1, height: 20, background: '#232320', borderRadius: 6, position: 'relative', overflow: 'hidden' }}>
      <span style={{ position: 'absolute', top: 0, bottom: 0, [pos ? 'left' : 'right']: '50%', width: `${w}%`, background: pos ? '#0ca30c' : '#d03b3b', borderRadius: 6 } as any} />
      <span style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: '#383835' }} />
    </span>
  );
}

function Section({ title, rows, fmtKey }: { title: string; rows: any[]; fmtKey?: (k: string) => string }) {
  return (
    <div style={{ background: '#1a1a19', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, padding: 13, marginBottom: 11 }}>
      <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 12 }}>{title}</div>
      {!rows.length && <div style={{ fontSize: 12, color: '#898781' }}>표본이 아직 없어요.</div>}
      {rows.map((g) => (
        <div key={g.key} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '9px 0' }}>
          <span style={{ width: 82, fontSize: 12, color: '#c3c2b7', fontWeight: 600, flex: '0 0 auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fmtKey ? fmtKey(g.key) : g.key} <span style={{ color: '#6b6a64', fontSize: 10 }}>({g.count})</span></span>
          <DivergingBar v={g.avgClv} />
          <span style={{ width: 54, textAlign: 'right', fontSize: 12, fontWeight: 800, color: g.avgClv == null ? '#898781' : g.avgClv >= 0 ? '#3ecb3e' : '#e66767' }}>{fmtPct(g.avgClv)}</span>
        </div>
      ))}
    </div>
  );
}

export default function ReportPage() {
  const [rep, setRep] = useState<any>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'guest' | 'auth' | 'error'>('loading');
  useEffect(() => {
    coachApi.report().then((r) => { setRep(r); setState('ok'); })
      .catch((e) => setState(e instanceof MembershipError ? 'guest' : e instanceof AuthError ? 'auth' : 'error'));
  }, []);

  if (state === 'loading') return <p style={{ color: '#898781', marginTop: 40, textAlign: 'center' }}>불러오는 중…</p>;
  if (state === 'auth') return <p style={{ color: '#898781', marginTop: 40, textAlign: 'center' }}>로그인이 필요해요.</p>;
  if (state === 'guest') return (
    <div style={{ marginTop: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>코치 리포트는 멤버쉽 전용</div>
      <p style={{ fontSize: 12.5, color: '#c3c2b7', marginBottom: 16 }}>리그·배당대·등급별 CLV 진단을 열어보세요.</p>
      <a href="/coach/pricing" style={{ background: '#3987e5', color: '#fff', fontWeight: 800, fontSize: 13, padding: '11px 18px', borderRadius: 12, textDecoration: 'none' }}>멤버쉽 시작하기</a>
    </div>
  );
  if (state === 'error') return <p style={{ color: '#e66767', marginTop: 40, textAlign: 'center' }}>불러오기 실패</p>;

  return (
    <>
      {(() => {
        const grades = rep.byGrade || [];
        const total = grades.reduce((s: number, g: any) => s + g.count, 0);
        const clvRows = grades.filter((g: any) => g.avgClv != null);
        const wCnt = clvRows.reduce((s: number, g: any) => s + g.count, 0);
        const avgClv = wCnt ? clvRows.reduce((s: number, g: any) => s + g.avgClv * g.count, 0) / wCnt : null;
        return <StatStrip title="코치 리포트" stats={[
          { k: '표본', v: `${total}건` },
          { k: '평균 CLV', v: avgClv != null ? `${avgClv >= 0 ? '+' : ''}${(avgClv * 100).toFixed(1)}%` : '—', tone: avgClv != null ? (avgClv >= 0 ? 'grn' : 'crit') : undefined },
          { k: '분석 리그', v: `${(rep.byLeague || []).length}`, tone: 'blue' },
        ]} />;
      })()}
      <div style={{ height: 12 }} />
      <Section title="리그별 평균 CLV" rows={rep.byLeague} fmtKey={leagueNameKo} />
      <div style={{ fontSize: 11, color: '#898781', textAlign: 'center', margin: '-4px 0 12px' }}>← 마이너스 · 0 · 플러스 →</div>
      <Section title="배당대별 평균 CLV" rows={rep.byOddsBand} />
      <Section title="시그널 등급별 평균 CLV" rows={rep.byGrade} />
      <div style={{ background: '#1a1a19', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, padding: 13 }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 6 }}>코치 코멘트</div>
        <div style={{ fontSize: 12, color: '#c3c2b7', lineHeight: 1.7 }}>{rep.comment}</div>
      </div>
    </>
  );
}
