'use client';
// app/coach/page.tsx — 홈: (미구독) 히어로 · (회원) 성과 요약 KPI + 오늘의 시그널 + 최근 뉴스.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { coachApi, MembershipError, AuthError, mainLoginUrl, type MatchSignal } from '@/lib/coachApi';
import { MatchCard, BetSheet, Skeleton, HeaderBand } from './ui';
import { PullToRefresh } from './PullToRefresh';

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
    <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(160deg,#233450,#16202e 58%,#141a24)', border: '1px solid rgba(57,135,229,.35)', borderRadius: 20, padding: 22, margin: '10px 0 14px' }}>
      {/* 배경 에셋: 와이어프레임 구체 (우하단) */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/coach-hero-bg.webp)', backgroundSize: 'cover', backgroundPosition: 'right bottom', opacity: .92 }} />
      {/* 텍스트 가독성용 좌측 어둡게 오버레이 */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(100deg,#141a24 22%,rgba(20,26,36,.66) 50%,rgba(20,26,36,.12) 100%)' }} />
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg,rgba(16,21,29,.55),transparent 42%)' }} />
      <div style={{ position: 'relative' }}>
      <div style={{ fontSize: 23, fontWeight: 800, lineHeight: 1.28, letterSpacing: -.5, margin: '2px 0 10px', maxWidth: 270 }}>감이 아니라 <b style={{ color: '#5aa0f0' }}>데이터로</b><br />경기를 읽으세요</div>
      <div style={{ fontSize: 12.5, color: '#aebccd', lineHeight: 1.62, marginBottom: 20, maxWidth: 236 }}>KSM 시그널로 승부를 예측하고, 내 픽을 CLV로 채점받는 축구 분석 코치</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 22 }}>
        {[['KSM 시그널 · 승부 예측', false], ['CLV 자동 채점', true], ['코치 리포트 · 성과 진단', false]].map(([t, uniq], i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600, maxWidth: 290 }}>
            <span style={{ width: 24, height: 24, flex: '0 0 auto', borderRadius: 7, background: 'rgba(57,135,229,.16)', display: 'grid', placeItems: 'center', color: '#5aa0f0', fontWeight: 800, fontSize: 12 }}>✓</span>
            {t as string}{uniq && <span style={{ fontSize: 9, fontWeight: 800, background: 'rgba(12,163,12,.2)', color: '#54d854', padding: '2px 6px', borderRadius: 5, letterSpacing: .2 }}>국내 유일</span>}
          </div>
        ))}
      </div>
      <a href="/coach/pricing" style={{ display: 'block', textAlign: 'center', background: 'linear-gradient(180deg,#4491ea,#3282e2)', color: '#fff', fontWeight: 800, fontSize: 14, padding: 14, borderRadius: 12, textDecoration: 'none', boxShadow: '0 6px 18px rgba(41,120,220,.32)' }}>멤버쉽 시작하기 · 월 ₩9,900</a>
      <div style={{ textAlign: 'center', fontSize: 11, color: '#93a2b3', marginTop: 11 }}>TrendSoccer 프리미엄이면 번들가 <b style={{ color: '#c8d6e6', fontWeight: 700 }}>₩6,900</b></div>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, tone, empty, hero }: { label: string; value: string; sub?: string; tone?: 'good' | 'crit'; empty?: boolean; hero?: boolean }) {
  const color = empty ? '#6b7789' : tone === 'good' ? '#3ecb3e' : tone === 'crit' ? '#e66767' : '#fff';
  return (
    <div style={{
      background: hero ? 'linear-gradient(150deg,rgba(57,135,229,.18),rgba(57,135,229,.04))' : 'rgba(255,255,255,.05)',
      border: `1px solid ${hero ? 'rgba(57,135,229,.34)' : 'rgba(255,255,255,.1)'}`,
      borderRadius: 14, padding: '14px 15px 13px', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
    }}>
      <div style={{ fontSize: 11.5, color: '#a7b6c8', fontWeight: 700, letterSpacing: .2 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, marginTop: 9, letterSpacing: -.6, lineHeight: 1, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#8f9dae', marginTop: 7 }}>{sub}</div>}
    </div>
  );
}

const sect = (t: string, color = '#898781') => <div style={{ fontSize: 12, fontWeight: 700, color, margin: '18px 2px 10px', letterSpacing: .6 }}>{t}</div>;

// 뉴스 리그별 색 (스캔 편의 + 브랜드 색 구분)
const newsColor = (lg?: string) => {
  if (!lg) return '#5aa0f0';
  if (lg.includes('라리가') || /la\s?liga/i.test(lg)) return '#e8613c';
  if (/EPL|프리미어/i.test(lg)) return '#a855f7';
  if (lg.includes('분데스')) return '#e2323a';
  if (lg.includes('세리에')) return '#2e8be6';
  if (lg.includes('리그1') || lg.includes('리그 1') || lg.includes('리그 1')) return '#1e6fd9';
  if (lg.includes('챔스') || lg.includes('챔피언')) return '#3987e5';
  if (lg.includes('유로파')) return '#f0932b';
  return '#5aa0f0';
};

export default function CoachHome() {
  const [data, setData] = useState<{ member: boolean; matches: MatchSignal[] } | null>(null);
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [state, setState] = useState<'loading' | 'ok' | 'guest' | 'auth' | 'error'>('loading');
  const [showClv, setShowClv] = useState(false);
  const [err, setErr] = useState('');
  const [sheet, setSheet] = useState<MatchSignal | null>(null);

  const load = (silent = false) => {
    if (!silent) setState('loading');
    return coachApi.matches('ALL')
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
  useEffect(() => { load(); }, []);
  useEffect(() => {
    fetch('/api/news?scope=bigleague')
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.articles)) setNews(d.articles.slice(0, 4)); })
      .catch(() => {});
  }, []);

  const featured = data?.matches?.find((m) => !m.locked && m.signal) || data?.matches?.[0] || null;

  return (
    <PullToRefresh onRefresh={() => load(true)}>
      {state === 'loading' && <div style={{ paddingTop: 16 }}><Skeleton h={92} /><Skeleton h={150} /><Skeleton h={120} /></div>}
      {state === 'auth' && <p style={{ color: '#898781', marginTop: 40, textAlign: 'center' }}>로그인이 필요해요. <a href={mainLoginUrl()} style={{ color: '#79b0f0' }}>로그인</a></p>}
      {state === 'error' && <p style={{ color: '#e66767', marginTop: 40, textAlign: 'center' }}>{err}</p>}

      {state === 'guest' && <Hero />}

      {state === 'ok' && (
        <>
          <HeaderBand title="내 성과 요약" action={
            <button onClick={() => setShowClv((v) => !v)} className="tc-press" style={{ display: 'flex', alignItems: 'center', gap: 4, background: showClv ? 'rgba(57,135,229,.2)' : 'rgba(255,255,255,.07)', border: `1px solid ${showClv ? 'rgba(90,160,240,.4)' : 'rgba(255,255,255,.12)'}`, color: showClv ? '#9cc4f4' : '#c3c2b7', fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 999, cursor: 'pointer', letterSpacing: .2 }}>CLV<span style={{ opacity: .7 }}>{showClv ? '✕' : '?'}</span></button>
          }>
          {dash && dash.settledCount === 0 && dash.open.count === 0 ? (
            <div style={{ textAlign: 'center', padding: '6px 2px 4px' }}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 7 }}>아직 기록이 없어요</div>
              <p style={{ fontSize: 12, color: '#c3c2b7', lineHeight: 1.65, margin: '0 0 15px' }}>경기에서 첫 픽을 기록하면 적중률·누적 손익·CLV가 여기에 쌓여요.</p>
              <Link href="/coach/matches" style={{ display: 'inline-block', background: '#3987e5', color: '#fff', fontWeight: 800, fontSize: 13, padding: '11px 20px', borderRadius: 11, textDecoration: 'none' }}>첫 기록하러 가기 →</Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Kpi label="적중률" empty={dash?.hitRate == null} value={dash?.hitRate != null ? `${(dash.hitRate * 100).toFixed(1)}%` : '—'} sub={dash ? `${dash.settledCount}건 정산` : ''} />
              <Kpi label="누적 손익" hero value={dash ? `${won(dash.profit)}원` : '—'} sub={dash?.roi != null ? `ROI ${dash.roi >= 0 ? '+' : ''}${(dash.roi * 100).toFixed(1)}%` : '정산 후 집계'} tone={dash ? (dash.profit > 0 ? 'good' : dash.profit < 0 ? 'crit' : undefined) : undefined} />
              <Kpi label="평균 CLV" empty={dash?.avgClv == null} value={dash?.avgClv != null ? `${dash.avgClv >= 0 ? '+' : ''}${(dash.avgClv * 100).toFixed(1)}%` : '—'} sub={dash?.avgClv == null ? '표본 쌓는 중' : dash.clvSampleEnough ? '시장 대비 우위' : '표본 더 필요'} tone={dash?.avgClv != null ? (dash.avgClv > 0 ? 'good' : dash.avgClv < 0 ? 'crit' : undefined) : undefined} />
              <Kpi label="진행중" empty={!dash || dash.open.count === 0} value={dash ? `${dash.open.count}건` : '—'} sub={dash && dash.open.count > 0 ? `스테이크 ${dash.open.stake.toLocaleString()}원` : '정산 대기 없음'} />
            </div>
          )}
          </HeaderBand>
          {showClv && (
          <div className="tc-fade" style={{ background: '#161615', border: '1px solid rgba(255,255,255,.07)', borderRadius: 11, padding: '11px 12px', marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
              <span style={{ fontSize: 9.5, fontWeight: 800, color: '#12100c', background: '#fab219', padding: '2px 6px', borderRadius: 4, letterSpacing: .3, flex: '0 0 auto' }}>CLV</span>
              <span style={{ fontSize: 11.5, color: '#8f8d85' }}>클로징 라인 밸류 — 내 배당 vs 경기 직전 <b style={{ color: '#c3c2b7', fontWeight: 700 }}>마감 배당</b> 차이</span>
            </div>
            <div style={{ display: 'flex', gap: 7 }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 9px', borderRadius: 8, fontSize: 11, background: 'rgba(62,203,62,.09)', border: '1px solid rgba(62,203,62,.22)' }}>
                <span style={{ fontWeight: 800, color: '#3ecb3e' }}>+CLV</span>
                <span style={{ color: '#9a988f' }}>내 배당 높음 · <b style={{ color: '#c3c2b7' }}>시장 유리</b></span>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 9px', borderRadius: 8, fontSize: 11, background: 'rgba(230,103,103,.09)', border: '1px solid rgba(230,103,103,.22)' }}>
                <span style={{ fontWeight: 800, color: '#e66767' }}>−CLV</span>
                <span style={{ color: '#9a988f' }}>내 배당 낮음 · <b style={{ color: '#c3c2b7' }}>시장 불리</b></span>
              </div>
            </div>
          </div>
          )}
        </>
      )}

      {(state === 'ok' || state === 'guest') && featured && (
        <>
          {state === 'guest'
            ? sect('오늘의 무료 시그널 · 맛보기', '#4bd14b')
            : sect('오늘의 경기 · KSM 시그널')}
          <MatchCard m={featured} member={!!data?.member} onAdd={setSheet} featured />
          <Link href="/coach/matches" style={{ display: 'block', textAlign: 'center', border: '1px solid rgba(255,255,255,.1)', background: '#1a1a19', color: '#c3c2b7', fontWeight: 700, fontSize: 12.5, padding: 11, borderRadius: 12, textDecoration: 'none', marginBottom: 4 }}>전체 경기 보기 →</Link>
        </>
      )}

      {news.length > 0 && (state === 'ok' || state === 'guest') && (
        <>
          {sect('최근 뉴스 · 헤드라인')}
          {news.map((n) => {
            const c = newsColor(n.league);
            return (
              <div key={n.id} style={{ position: 'relative', overflow: 'hidden', background: '#161615', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '12px 13px 12px 15px', marginBottom: 8 }}>
                <span aria-hidden style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: c }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                  {n.league && <span style={{ flex: '0 0 auto', fontSize: 9.5, fontWeight: 800, padding: '2px 7px', borderRadius: 5, letterSpacing: .2, background: `${c}22`, color: c }}>{n.league}</span>}
                  <span style={{ fontSize: 10.5, color: '#77756f' }}>{timeAgo(n.publishedAt)}</span>
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.45, color: '#efeee9' }}>{n.title}</div>
              </div>
            );
          })}
        </>
      )}

      {sheet && <BetSheet m={sheet} onClose={() => setSheet(null)} onSaved={() => load(true)} />}
    </PullToRefresh>
  );
}
