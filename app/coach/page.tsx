'use client';
// app/coach/page.tsx — 홈: (미구독) 히어로 · (회원) 성과 요약 KPI + 오늘의 시그널 + 최근 뉴스.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { coachApi, MembershipError, AuthError, mainLoginUrl, type MatchSignal } from '@/lib/coachApi';
import { MatchCard, BetSheet } from './ui';

interface DashboardData {
  hitRate: number | null; profit: number; roi: number | null;
  avgClv: number | null; clvSampleEnough: boolean; settledCount: number;
  open: { count: number; stake: number };
}
interface NewsItem { id: string; title: string; description: string; source: string; publishedAt: string; url: string; league?: string }

const won = (n: number) => `${n >= 0 ? '+' : ''}${n.toLocaleString()}`;
const timeAgo = (iso: string) => {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return '방금';
    if (h < 24) return `${h}시간 전`;
    return `${Math.floor(h / 24)}일 전`;
  } catch { return ''; }
};

function Hero() {
  return (
    <div style={{ background: 'linear-gradient(160deg,#233450,#16202e 58%,#141a24)', border: '1px solid rgba(57,135,229,.35)', borderRadius: 20, padding: 20, margin: '10px 0 14px' }}>
      <span style={{ display: 'inline-block', fontSize: 10.5, fontWeight: 800, background: 'rgba(57,135,229,.2)', color: '#9cc4f4', padding: '5px 11px', borderRadius: 999 }}>멤버쉽 전용 · 오늘 1경기 무료</span>
      <div style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.34, margin: '13px 0 8px' }}>감이 아니라 <b style={{ color: '#5aa0f0' }}>데이터로</b><br />경기를 읽으세요</div>
      <div style={{ fontSize: 12.5, color: '#c3c2b7', lineHeight: 1.6, marginBottom: 16 }}>KSM 시그널로 승부를 예측하고, 내 픽을 CLV로 채점받는 축구 분석 코치.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 18 }}>
        {[['KSM 시그널 · 승부 예측', false], ['CLV 자동 채점', true], ['코치 리포트 · 성과 진단', false]].map(([t, uniq], i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600 }}>
            <span style={{ width: 26, height: 26, flex: '0 0 auto', borderRadius: 8, background: 'rgba(57,135,229,.16)', display: 'grid', placeItems: 'center', color: '#5aa0f0', fontWeight: 800 }}>✓</span>
            {t as string}{uniq && <span style={{ fontSize: 9.5, fontWeight: 800, background: 'rgba(12,163,12,.18)', color: '#4bd14b', padding: '2px 7px', borderRadius: 6 }}>국내 유일</span>}
          </div>
        ))}
      </div>
      <a href="/coach/pricing" style={{ display: 'block', textAlign: 'center', background: '#3987e5', color: '#fff', fontWeight: 800, fontSize: 14, padding: 13, borderRadius: 12, textDecoration: 'none' }}>멤버쉽 시작하기 · 월 ₩9,900</a>
      <div style={{ textAlign: 'center', fontSize: 11, color: '#898781', marginTop: 10 }}>TrendSoccer 프리미엄이면 번들가 ₩6,900</div>
    </div>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'crit' }) {
  const color = tone === 'good' ? '#3ecb3e' : tone === 'crit' ? '#e66767' : '#fff';
  return (
    <div style={{ background: '#1a1a19', border: '1px solid rgba(255,255,255,.1)', borderRadius: 16, padding: 14 }}>
      <div style={{ fontSize: 11.5, color: '#898781', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 25, fontWeight: 800, marginTop: 8, letterSpacing: -.5, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#898781', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

const sect = (t: string, color = '#898781') => <div style={{ fontSize: 12, fontWeight: 700, color, margin: '18px 2px 10px', letterSpacing: .6 }}>{t}</div>;

export default function CoachHome() {
  const [data, setData] = useState<{ member: boolean; matches: MatchSignal[] } | null>(null);
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [state, setState] = useState<'loading' | 'ok' | 'guest' | 'auth' | 'error'>('loading');
  const [err, setErr] = useState('');
  const [sheet, setSheet] = useState<MatchSignal | null>(null);
  const [saved, setSaved] = useState(false);

  const load = () => {
    coachApi.matches('ALL')
      .then((r) => {
        setData(r); setState(r.member ? 'ok' : 'guest');
        if (r.member) coachApi.dashboard().then(setDash).catch(() => {});
      })
      .catch((e) => {
        if (e instanceof MembershipError) setState('guest');
        else if (e instanceof AuthError) setState('auth');
        else { setErr(e.message); setState('error'); }
      });
  };
  useEffect(load, []);
  useEffect(() => {
    fetch('/api/news?scope=bigleague')
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.articles)) setNews(d.articles.slice(0, 4)); })
      .catch(() => {});
  }, []);

  const featured = data?.matches?.find((m) => !m.locked && m.signal) || data?.matches?.[0] || null;

  return (
    <>
      {state === 'loading' && <p style={{ color: '#898781', marginTop: 40, textAlign: 'center' }}>불러오는 중…</p>}
      {state === 'auth' && <p style={{ color: '#898781', marginTop: 40, textAlign: 'center' }}>로그인이 필요해요. <a href={mainLoginUrl()} style={{ color: '#79b0f0' }}>로그인</a></p>}
      {state === 'error' && <p style={{ color: '#e66767', marginTop: 40, textAlign: 'center' }}>{err}</p>}
      {saved && <div style={{ background: 'rgba(12,163,12,.15)', color: '#4bd14b', fontSize: 12.5, fontWeight: 700, padding: 10, borderRadius: 10, margin: '10px 0', textAlign: 'center' }}>기록이 저장됐어요.</div>}

      {state === 'guest' && <Hero />}

      {state === 'ok' && (
        <>
          {sect('내 성과 요약')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Kpi label="적중률" value={dash?.hitRate != null ? `${(dash.hitRate * 100).toFixed(1)}%` : '—'} sub={dash ? `${dash.settledCount}건 정산` : ''} />
            <Kpi label="누적 손익" value={dash ? won(dash.profit) : '—'} sub={dash?.roi != null ? `ROI ${(dash.roi * 100).toFixed(1)}%` : '원'} tone={dash && dash.profit >= 0 ? 'good' : 'crit'} />
            <Kpi label="평균 CLV" value={dash?.avgClv != null ? `${dash.avgClv >= 0 ? '+' : ''}${(dash.avgClv * 100).toFixed(1)}%` : '—'} sub={dash?.clvSampleEnough ? '시장 대비 우위' : '표본 쌓는 중'} tone={dash && dash.avgClv != null ? (dash.avgClv >= 0 ? 'good' : 'crit') : undefined} />
            <Kpi label="진행중" value={dash ? `${dash.open.count}건` : '—'} sub={dash ? `스테이크 ${dash.open.stake.toLocaleString()}원` : ''} />
          </div>
          <div style={{ fontSize: 11, color: '#898781', lineHeight: 1.6, background: '#1a1a19', border: '1px solid rgba(255,255,255,.1)', borderLeft: '3px solid #fab219', borderRadius: 10, padding: '11px 12px', marginTop: 14 }}>
            <b style={{ color: '#c3c2b7' }}>CLV(클로징 라인 밸류)</b>가 핵심 지표예요. 단기 승률·수익은 운이 섞이지만, 내 배당이 마감 배당보다 좋았는지(=CLV)는 <b style={{ color: '#c3c2b7' }}>진짜 실력</b>을 가장 잘 보여줍니다. 표본 200건 이상부터 신뢰하세요.
          </div>
        </>
      )}

      {(state === 'ok' || state === 'guest') && featured && (
        <>
          {state === 'guest'
            ? sect('오늘의 무료 시그널 · 맛보기', '#4bd14b')
            : sect('오늘의 경기 · KSM 시그널')}
          <MatchCard m={featured} member={!!data?.member} onAdd={setSheet} />
          <Link href="/coach/matches" style={{ display: 'block', textAlign: 'center', border: '1px solid rgba(255,255,255,.1)', background: '#1a1a19', color: '#c3c2b7', fontWeight: 700, fontSize: 12.5, padding: 11, borderRadius: 12, textDecoration: 'none', marginBottom: 4 }}>전체 경기 보기 →</Link>
        </>
      )}

      {news.length > 0 && (state === 'ok' || state === 'guest') && (
        <>
          {sect('최근 뉴스')}
          {news.map((n) => (
            <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', gap: 11, background: '#1a1a19', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, padding: 12, marginBottom: 9, textDecoration: 'none' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                  {n.league && <span style={{ flex: '0 0 auto', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: '#232320', color: '#9cc4f4' }}>{n.league}</span>}
                  <span style={{ fontSize: 10.5, color: '#898781' }}>{n.source}{n.source && ' · '}{timeAgo(n.publishedAt)}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.4, marginBottom: 5, color: '#fff', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.title}</div>
                {n.description && <div style={{ fontSize: 11.5, color: '#c3c2b7', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.description}</div>}
              </div>
            </a>
          ))}
        </>
      )}

      {sheet && <BetSheet m={sheet} onClose={() => setSheet(null)} onSaved={() => { setSaved(true); load(); }} />}
    </>
  );
}
