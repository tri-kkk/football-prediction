'use client';
// app/coach/ui.tsx — 코치 앱 공통 UI (시그널 링·경기 카드·기록 추가 시트). 홈/경기 화면 공유.
import { useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { coachApi, type MatchSignal } from '@/lib/coachApi';
import { useSlipCart } from './slipCart';
import { haptic } from './haptic';
import { useDragToClose } from './useDragToClose';
import { showToast } from './toast';

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
export const leagueNameKo = (code?: string) => {
  const m = code ? LEAGUE_META[code] : null;
  return m ? m.name : (code || '');
};

// 섹션 헤더: 제목 + 미니 스탯바 (기능형)
type Tone = 'blue' | 'grn' | 'crit';
const toneColor = (t?: Tone) => (t === 'blue' ? '#79b0f0' : t === 'grn' ? '#3ecb3e' : t === 'crit' ? '#e66767' : '#fff');
// 탭 상단 요약용 헤더 밴드 (배경 에셋 + 글로우 + 글래스 콘텐츠). 밋밋한 상단을 브랜드 배경과 통일.
export function HeaderBand({ title, children, style, action }: { title: string; children: React.ReactNode; style?: React.CSSProperties; action?: React.ReactNode }) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', border: '1px solid rgba(57,135,229,.22)', borderRadius: 18, padding: 16, margin: '16px 0 2px', ...style }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/coach-header.webp)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(16,21,29,.28),rgba(16,21,29,.52))' }} />
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 7, letterSpacing: -.2 }}>
            <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: '#5aa0f0', boxShadow: '0 0 7px #5aa0f0', flex: '0 0 auto' }} />{title}
          </div>
          {action}
        </div>
        {children}
      </div>
    </div>
  );
}
export function StatStrip({ title, stats, help }: { title: string; stats: { k: string; v: string; tone?: Tone }[]; help?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <HeaderBand title={title} action={help ? (
      <button onClick={() => setOpen((v) => !v)} className="tc-press" aria-label="도움말" style={{ WebkitAppearance: 'none', appearance: 'none', WebkitTapHighlightColor: 'transparent', boxSizing: 'border-box', width: 12, height: 12, flex: '0 0 auto', borderRadius: '50%', border: `1px solid ${open ? 'rgba(250,178,25,.7)' : 'rgba(250,178,25,.45)'}`, background: open ? 'rgba(250,178,25,.2)' : 'transparent', color: '#fab219', fontSize: 8, fontWeight: 800, lineHeight: 1, cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 0 }}>{open ? '✕' : '?'}</button>
    ) : undefined}>
      <div style={{ display: 'flex', gap: 8 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ flex: 1, minWidth: 0, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: '10px 12px', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
            <div style={{ fontSize: 10.5, color: '#a7b6c8', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.k}</div>
            <div style={{ fontSize: 17, fontWeight: 800, marginTop: 4, letterSpacing: -.4, color: toneColor(s.tone), fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
          </div>
        ))}
      </div>
      {help && open && (
        <div className="tc-fade" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.1)' }}>{help}</div>
      )}
    </HeaderBand>
  );
}
export function PageTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ margin: '16px 2px 4px' }}>
      <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -.5 }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: '#77756f', fontWeight: 600, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
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

// 링 채움은 등급 단계 기준(S>A>B>C) — 신뢰도 점수만으로는 B/C가 비슷하게 차서 등급 구분이 안 됨.
// 단계별 고정값에 점수로 미세 변주(±)를 줘 같은 등급끼리도 완전히 동일하진 않게.
const GRADE_FILL: Record<string, number> = { S: 0.95, A: 0.72, B: 0.5, C: 0.28 };
export function Ring({ score, grade }: { score: number; grade: string }) {
  const c = 2 * Math.PI * 27;
  const base = GRADE_FILL[grade] ?? 0.15;
  const nudge = (Math.max(0, Math.min(100, score)) / 100 - 0.5) * 0.08; // 점수 기반 미세 변주
  const frac = Math.max(0.1, Math.min(1, base + nudge));
  const dash = frac * c;
  const color = GRADE_COLOR[grade] || '#898781';
  const hot = grade === 'S' || grade === 'A'; // 상위 등급만 글로우
  return (
    <div style={{ position: 'relative', width: 66, textAlign: 'center', flex: '0 0 auto' }}>
      <svg width={66} height={66} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={33} cy={33} r={27} fill="none" stroke="#232320" strokeWidth={6} />
        <circle cx={33} cy={33} r={27} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" strokeDasharray={`${dash} ${c}`} className={hot ? 'tc-grade-hot' : undefined} style={hot ? { color } : undefined} />
      </svg>
      <div className={hot ? 'tc-grade-pop' : undefined} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 66, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 25, fontWeight: 800, color, textShadow: hot ? `0 0 12px ${color}66` : undefined }}>{grade}</div>
      <div style={{ fontSize: 10, color: '#898781', fontWeight: 700, marginTop: 6 }}>신뢰도 <b style={{ color: '#c3c2b7' }}>{Math.round(score)}%</b></div>
    </div>
  );
}

export const Dots = ({ n }: { n: number }) => (
  <span style={{ display: 'inline-flex', gap: 3, verticalAlign: 'middle' }}>
    {[1, 2, 3, 4, 5].map((i) => <i key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i <= n ? '#fab219' : '#2c2c2a', display: 'inline-block' }} />)}
  </span>
);

// 스켈레톤 로더 (네이티브 느낌 로딩)
export function Skeleton({ h = 150, r = 16, mb = 11 }: { h?: number; r?: number; mb?: number }) {
  return <div className="tc-skel" style={{ height: h, borderRadius: r, marginBottom: mb }} />;
}

// 로그인 필요 화면 (헤더 글로우 배경 + 잠금 아이콘 + CTA). 텍스트만 있던 auth 상태를 고급지게.
export function LoginRequired({ href, sub }: { href: string; sub?: string }) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', marginTop: 26, borderRadius: 20, border: '1px solid rgba(57,135,229,.3)', padding: '42px 24px 28px', textAlign: 'center' }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/coach-header.webp)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(16,21,29,.42),rgba(13,13,13,.72))' }} />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: 78, height: 78, marginBottom: 18, display: 'grid', placeItems: 'center' }}>
          <div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle,rgba(57,135,229,.4),transparent 68%)' }} />
          <div style={{ position: 'relative', width: 64, height: 64, borderRadius: '50%', background: 'rgba(57,135,229,.16)', border: '1px solid rgba(90,160,240,.4)', display: 'grid', placeItems: 'center', color: '#7fb4f5' }}>
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
          </div>
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 9, letterSpacing: -.3 }}>로그인이 필요해요</div>
        <div style={{ fontSize: 12.5, color: '#aebccd', lineHeight: 1.6, maxWidth: 250, marginBottom: 20 }}>{sub || 'TrendSoccer 계정으로 로그인하면 나의 시그널·기록·CLV를 볼 수 있어요.'}</div>
        <a href={href} style={{ display: 'block', width: '100%', maxWidth: 280, textAlign: 'center', background: 'linear-gradient(180deg,#4491ea,#3282e2)', color: '#fff', fontWeight: 800, fontSize: 13.5, padding: 13, borderRadius: 12, textDecoration: 'none', boxShadow: '0 6px 18px rgba(41,120,220,.32)' }}>TrendSoccer 계정으로 로그인</a>
      </div>
    </div>
  );
}

// 빈 상태 (아이콘 + 안내 + 액션). 텍스트만 있던 empty를 브랜드 톤으로.
export function EmptyState({ title, sub, action, icon }: { title: string; sub?: string; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px 30px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: 78, height: 78, marginBottom: 18, display: 'grid', placeItems: 'center' }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle,rgba(57,135,229,.28),transparent 68%)' }} />
        <div style={{ position: 'relative', width: 66, height: 66, borderRadius: '50%', background: 'rgba(57,135,229,.1)', border: '1px solid rgba(57,135,229,.3)', display: 'grid', placeItems: 'center', color: '#5aa0f0' }}>
          {icon || (
            <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8.2l2.7 1.95-1.03 3.2h-3.34L9.3 10.15z" />
              <path d="M12 3.3V8.2M14.7 10.15l3.3-1.05M13.67 13.35l1.95 3.2M10.33 13.35l-1.95 3.2M9.3 10.15 6 9.1" />
            </svg>
          )}
        </div>
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>{title}</div>
      {sub && <div style={{ fontSize: 12.5, color: '#8f8d85', lineHeight: 1.6, maxWidth: 250, marginBottom: action ? 18 : 0 }}>{sub}</div>}
      {action}
    </div>
  );
}

// 팀 엠블럼(API-Football). 로고 로드 실패 시 이니셜 배지로 폴백.
export function Emblem({ id, name, size = 26 }: { id?: number; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (!id || err) {
    return <div style={{ width: size, height: size, borderRadius: 8, background: '#232320', display: 'grid', placeItems: 'center', fontSize: size * 0.38, fontWeight: 800, color: '#c3c2b7', flex: '0 0 auto' }}>{name.slice(0, 3).toUpperCase()}</div>;
  }
  return <img src={`https://media.api-sports.io/football/teams/${id}.png`} alt="" width={size} height={size} loading="lazy" onError={() => setErr(true)} style={{ objectFit: 'contain', flex: '0 0 auto' }} />;
}

export function MatchCard({ m, member, onAdd, featured, index }: { m: MatchSignal; member: boolean; onAdd: (m: MatchSignal) => void; featured?: boolean; index?: number }) {
  const s = m.signal;
  const hasOdds = m.odds.home != null && m.odds.draw != null && m.odds.away != null;
  const cart = useSlipCart();
  const inCart = cart.has(m.matchId);
  const recPick = s && s.recommendation !== 'WATCH' ? s.recommendation : 'HOME';
  const addToSlip = () => {
    haptic();
    inCart ? cart.remove(m.matchId)
      : cart.add({ matchId: m.matchId, home: m.home, away: m.away, league: m.league, kickoff: m.kickoff, grade: s?.grade, odds: m.odds, pick: recPick as any });
  };
  // 카드 stagger 등장: 인덱스별 지연(최대 6장까지만 단계적, 이후 동일).
  const delay = index != null ? Math.min(index, 6) * 45 : 0;
  return (
    <div className="tc-press tc-card-in" style={{ animationDelay: `${delay}ms`, position: 'relative', overflow: 'hidden', background: '#1a1a19', border: `1px solid ${featured ? 'rgba(57,135,229,.35)' : 'rgba(255,255,255,.1)'}`, borderRadius: 16, padding: 14, marginBottom: 11 }}>
      {featured ? (<>
        <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/card-pitch.webp)', backgroundSize: 'cover', backgroundPosition: 'right center' }} />
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,#1a1a19 26%,rgba(26,26,25,.35) 62%,rgba(26,26,25,.62))' }} />
      </>) : (
        <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/card-mesh.webp)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: .46 }} />
      )}
      <div style={{ position: 'relative' }}>
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
              <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 7, color: s.recommendation === 'WATCH' ? '#898781' : '#79b0f0' }}>{s.recommendation === 'WATCH' ? '관망' : s.recommendationText}</div>
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
                  <button onClick={() => { haptic(); onAdd(m); }} style={{ flex: 1, border: 0, background: '#3987e5', color: '#fff', fontWeight: 800, fontSize: 12.5, padding: 11, borderRadius: 11, cursor: 'pointer' }}>＋ 기록 추가</button>
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
      </div>
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
  const { dragHandlers, sheetStyle } = useDragToClose(onClose);

  const o = parseFloat(odds) || 0;
  const st = parseInt(stake.replace(/[^0-9]/g, '')) || 0;
  const total = Math.round(st * o), profit = total - st;

  const choose = (p: string) => { setPick(p); setOdds(String(oddsOf(p))); };
  const save = async () => {
    setSaving(true); setErr('');
    try {
      await coachApi.createBet({ matchId: m.matchId, pick, stake: st, betOdds: o });
      showToast('기록이 저장됐어요');
      onSaved(); onClose();
    } catch (e: any) { setErr(e.message || '저장 실패'); showToast(e.message || '저장 실패', 'err'); setSaving(false); }
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

  const content = (
    <>
      <div onClick={onClose} className="tc-scrim" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 45 }} />
      <div className="tc-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, maxWidth: 480, margin: '0 auto', zIndex: 46, background: '#1a1a19', color: '#fff', fontFamily: 'system-ui, "Malgun Gothic", sans-serif', borderRadius: '22px 22px 0 0', borderTop: '1px solid rgba(255,255,255,.1)', padding: '14px 16px 24px', maxHeight: '90%', overflowY: 'auto', ...sheetStyle }}>
        <div {...dragHandlers} style={{ padding: '2px 0 12px', touchAction: 'none', cursor: 'grab' }}><div style={{ width: 40, height: 4, borderRadius: 2, background: '#383835', margin: '0 auto' }} /></div>
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
  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
}
