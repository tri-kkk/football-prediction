'use client';
// app/coach/settings/page.tsx — 설정: 멤버쉽 상태 · (회원)뱅크롤·알림 · 계정(NextAuth 세션 기반). 네이티브 그룹 리스트.
import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { coachApi, MembershipError, mainLoginUrl } from '@/lib/coachApi';
import { PageTitle, Skeleton } from '../ui';
import { showToast } from '../toast';
import { enablePush, disablePush, pushSupported } from '../pushClient';

const Section = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 11.5, fontWeight: 800, color: '#8b8a84', letterSpacing: .5, margin: '22px 4px 9px' }}>{children}</div>
);
const Group = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: '#161615', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, overflow: 'hidden' }}>{children}</div>
);
const div = 'rgba(255,255,255,.06)';

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-pressed={on} role="switch" aria-checked={on} className="tc-press" style={{ WebkitAppearance: 'none', appearance: 'none', WebkitTapHighlightColor: 'transparent', width: 46, height: 28, borderRadius: 999, border: on ? '1px solid rgba(57,135,229,.9)' : '1px solid rgba(255,255,255,.12)', background: on ? '#3987e5' : '#2e2e2b', padding: 0, position: 'relative', cursor: 'pointer', flex: '0 0 auto', transition: 'background .18s, border-color .18s' }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 22 : 3, width: 21, height: 21, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,.4)', transition: 'left .18s' }} />
    </button>
  );
}
// 모듈 레벨 정의 — 부모 리렌더마다 재정의되면 input이 remount돼 포커스가 날아감(입력 끊김) 방지.
function InputRow({ label, value, onChange, last }: { label: string; value: string; onChange: (v: string) => void; last?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '13px 14px', borderBottom: last ? 'none' : `1px solid ${div}` }}>
      <span style={{ fontSize: 13.5, fontWeight: 600, flex: '0 0 auto' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#232320', border: '1px solid rgba(255,255,255,.1)', borderRadius: 9, padding: '7px 11px', width: 150 }}>
        <span style={{ color: '#8f8d85', fontSize: 13, flex: '0 0 auto' }}>₩</span>
        <input value={Number((value || '').replace(/[^0-9]/g, '') || 0).toLocaleString()} onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" style={{ flex: 1, minWidth: 0, background: 'transparent', border: 0, color: '#fff', fontSize: 15, fontWeight: 700, textAlign: 'right', outline: 'none', fontVariantNumeric: 'tabular-nums' }} />
      </div>
    </div>
  );
}
function ToggleRow({ label, sub, on, onClick, last }: { label: string; sub: string; on: boolean; onClick: () => void; last?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '14px', borderBottom: last ? 'none' : `1px solid ${div}` }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: '#898781', marginTop: 3, lineHeight: 1.45 }}>{sub}</div>}
      </div>
      <Switch on={on} onClick={onClick} />
    </div>
  );
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [member, setMember] = useState<boolean | null>(null);
  const [bankroll, setBankroll] = useState('500000'); // 편집 중 초안
  const [unit, setUnit] = useState('15000');
  const [savedBank, setSavedBank] = useState('500000'); // 마지막 저장값
  const [savedUnit, setSavedUnit] = useState('15000');
  const [notifySettle, setNotifySettle] = useState(true);
  const [warnStake, setWarnStake] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const b = localStorage.getItem('coach_bankroll') || '500000';
      const u = localStorage.getItem('coach_unit') || '15000';
      setBankroll(b); setUnit(u); setSavedBank(b); setSavedUnit(u);
      setNotifySettle(localStorage.getItem('coach_notify_settle') !== '0');
      setWarnStake(localStorage.getItem('coach_warn_stake') !== '0');
    }
  }, []);
  useEffect(() => {
    if (status === 'loading') return;
    if (status !== 'authenticated') { setMember(false); return; }
    coachApi.dashboard().then(() => setMember(true)).catch((e) => setMember(e instanceof MembershipError ? false : null));
  }, [status]);

  const norm = (v: string) => (v || '').replace(/[^0-9]/g, '');
  const dirty = norm(bankroll) !== norm(savedBank) || norm(unit) !== norm(savedUnit);
  const saveBankroll = () => {
    const b = norm(bankroll) || '0', u = norm(unit) || '0';
    localStorage.setItem('coach_bankroll', b); localStorage.setItem('coach_unit', u);
    setBankroll(b); setUnit(u); setSavedBank(b); setSavedUnit(u);
    showToast('뱅크롤이 저장됐어요');
  };
  const toggleSettle = async () => {
    const v = !notifySettle;
    if (v) {
      if (!pushSupported()) { showToast('이 기기/브라우저는 푸시를 지원하지 않아요', 'err'); return; }
      const ok = await enablePush();
      if (!ok) { showToast('알림 권한이 필요해요', 'err'); return; }
      setNotifySettle(true); localStorage.setItem('coach_notify_settle', '1'); showToast('알림을 켰어요');
    } else {
      await disablePush();
      setNotifySettle(false); localStorage.setItem('coach_notify_settle', '0');
    }
  };
  const toggleWarn = () => { const v = !warnStake; setWarnStake(v); localStorage.setItem('coach_warn_stake', v ? '1' : '0'); };

  const authed = status === 'authenticated';
  const isMember = authed && member === true;
  const loading = status === 'loading' || (status === 'authenticated' && member === null);

  return (
    <>
      <PageTitle title="설정" sub="멤버쉽 · 뱅크롤 · 알림 · 계정" />

      {loading ? (
        <div className="tc-fade">
          <Section>멤버쉽</Section>
          <Skeleton h={62} />
          <Section>뱅크롤</Section>
          <Skeleton h={116} />
          <Section>알림</Section>
          <Skeleton h={116} />
          <Section>계정</Section>
          <Skeleton h={62} />
        </div>
      ) : (
      <>
      <Section>멤버쉽</Section>
      {isMember ? (
        <Group>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px' }}>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>상태</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 800, color: '#4bd14b' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4bd14b', boxShadow: '0 0 6px #4bd14b' }} />멤버쉽 이용 중
            </span>
          </div>
        </Group>
      ) : (
        <div style={{ background: 'linear-gradient(135deg,#1c2a40,#171d28)', border: '1px solid rgba(57,135,229,.35)', borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>TrendCoach 멤버쉽</div>
          <p style={{ fontSize: 12, color: '#c3c2b7', lineHeight: 1.6, margin: '0 0 12px' }}>CLV 자동 채점 · 코치 리포트 · 무제한 기록 · 광고 제거</p>
          <a href="/coach/pricing" style={{ display: 'block', textAlign: 'center', background: '#3987e5', color: '#fff', fontWeight: 800, fontSize: 13.5, padding: 12, borderRadius: 11, textDecoration: 'none' }}>멤버쉽 시작하기</a>
        </div>
      )}

      {isMember && (
        <>
          <Section>뱅크롤</Section>
          <Group>
            <InputRow label="총 뱅크롤" value={bankroll} onChange={setBankroll} />
            <InputRow label="단위 베팅" value={unit} onChange={setUnit} last />
          </Group>
          <button onClick={saveBankroll} disabled={!dirty} className="tc-press" style={{ width: '100%', marginTop: 10, border: 0, background: dirty ? '#3987e5' : '#1c1c1b', color: dirty ? '#fff' : '#6b6a64', fontWeight: 800, fontSize: 13, padding: 13, borderRadius: 12, cursor: dirty ? 'pointer' : 'default' }}>{dirty ? '저장' : '저장됨 ✓'}</button>
          <div style={{ fontSize: 11, color: '#6b6a64', margin: '9px 4px 0', lineHeight: 1.5 }}>단위 베팅 = 1 유닛. 스테이크 초과 경고의 기준이 돼요.</div>

          <Section>알림</Section>
          <Group>
            <ToggleRow label="마감배당·정산 알림" sub="경기 후 정산 결과와 CLV를 알려드려요" on={notifySettle} onClick={toggleSettle} />
            <ToggleRow label="스테이크 초과 경고" sub="단위 베팅의 3배를 초과하면 기록 시 경고" on={warnStake} onClick={toggleWarn} last />
          </Group>
        </>
      )}

      <Section>계정</Section>
      {authed ? (
        <>
          <Group>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '14px' }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, flex: '0 0 auto' }}>로그인</span>
              <span style={{ fontSize: 12.5, color: '#8f8d85', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session?.user?.email || 'TrendSoccer 계정'}</span>
            </div>
          </Group>
          <div style={{ height: 9 }} />
          <Group>
            <button onClick={() => signOut({ callbackUrl: '/coach' })} className="tc-press" style={{ width: '100%', border: 0, background: 'transparent', color: '#e66767', fontWeight: 800, fontSize: 13.5, padding: 15, cursor: 'pointer' }}>로그아웃</button>
          </Group>
        </>
      ) : (
        <a href={mainLoginUrl()} style={{ display: 'block', textAlign: 'center', background: '#3987e5', color: '#fff', fontWeight: 800, fontSize: 13.5, padding: 13, borderRadius: 13, textDecoration: 'none' }}>TrendSoccer 계정으로 로그인</a>
      )}
      <p style={{ fontSize: 11, color: '#6b6a64', textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>계정은 TrendSoccer와 공유돼요 (.trendsoccer.com).</p>
      </>
      )}
    </>
  );
}
