'use client'

// ============================================================
// 해외축구 개막 CTA 히어로 — 가입→48h 체험 깔때기
//  · 타이머: 빅클럽이 낀 다음 예정 경기로 카운트다운 (양팀 빅클럽이면 우선)
//  · 단계: API 예정 경기 + 현재 월로 자동 판정 (개막 전 / 개막 주간 / 시즌 중 / 오프시즌)
//  · 타깃 시각이 지나면 다음 경기로 자동 재계산 → 절대 만료되지 않음
// ============================================================

import { useEffect, useMemo, useState } from 'react'
import { Link } from '@/i18n/navigation'

// 빅클럽 (api-sports 팀 ID)
const BIG_CLUB_IDS = new Set<number>([
  40, 50, 42, 49, 33, 47,        // EPL: 리버풀·맨시티·아스날·첼시·맨유·토트넘
  541, 529, 530,                 // 라리가: 레알·바르사·AT마드리드
  157, 165, 168,                 // 분데스: 바이에른·도르트문트·레버쿠젠
  505, 496, 489, 492,            // 세리에A: 인터·유벤투스·AC밀란·나폴리
  85, 81, 91,                    // 리그1: PSG·마르세유·모나코
])
const BIG_LEAGUES = new Set(['PL', 'PD', 'BL1', 'SA', 'FL1'])
const LEAGUE_LOGOS = [39, 140, 78, 135, 61] // EPL·라리가·분데스·세리에A·리그1

type Phase = 'pre' | 'open' | 'mid' | 'off'

const pad = (n: number) => String(n).padStart(2, '0')

export default function SeasonKickoffHero({ locale = 'ko' }: { locale?: string }) {
  const isKo = locale !== 'en'
  const [matches, setMatches] = useState<any[]>([])
  const [now, setNow] = useState<number>(0)

  useEffect(() => {
    setNow(Date.now())
    let cancel = false
    // 개막 감지를 위해 넓은 예정 범위 필요 (기본 league=ALL은 ±1일뿐) → 14일 앞까지
    fetch('/api/odds-from-db?league=ALL&daysAhead=14&daysBack=1')
      .then((r) => r.json())
      .then((d) => {
        if (cancel) return
        const list = d?.matches || d?.data || (Array.isArray(d) ? d : [])
        setMatches(Array.isArray(list) ? list : [])
      })
      .catch(() => {})
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      cancel = true
      clearInterval(t)
    }
  }, [])

  const info = useMemo(() => {
    if (!now) return null
    const nowMs = now
    const ms = (m: any) => Date.parse(m?.commence_time)
    const up = matches
      .filter((m) => m?.commence_time && !Number.isNaN(ms(m)) && ms(m) > nowMs)
      .sort((a, b) => ms(a) - ms(b))

    const idIn = (v: any) => BIG_CLUB_IDS.has(Number(v))
    const isBig = (m: any) => idIn(m.home_team_id) || idIn(m.away_team_id)
    const isBoth = (m: any) => idIn(m.home_team_id) && idIn(m.away_team_id)

    // 빅클럽(리스트)이 낀 경기 — 타이머/티저는 여기서만. 마이너리그(덴마크 등)로 폴백 금지.
    const soonBoth = up.filter((m) => isBoth(m) && ms(m) - nowMs < 72 * 3600 * 1000)
    const bigClubUp = up.filter(isBig)
    const nextBigClub = soonBoth[0] || bigClubUp[0] || null
    // 빅리그(EPL·라리가·분데스·세리에A·리그1) 가장 이른 예정 경기 = 개막 기준 (마이너리그 제외)
    const opener = up.find((m) => BIG_LEAGUES.has(m.league_code)) || null
    const openerMs = opener ? ms(opener) : null
    // 표시 대상: 빅클럽 우선 → 빅리그. 둘 다 없으면 null (오프시즌 처리, 아무 경기로 폴백하지 않음)
    const bigTarget = nextBigClub || opener || null

    const month = new Date(nowMs).getMonth() + 1
    const openerFuture = !!openerMs && openerMs > nowMs
    const openerDays = openerFuture ? Math.ceil((openerMs! - nowMs) / 86400000) : 0

    let phase: Phase = 'mid'
    if (!bigTarget && month >= 5 && month <= 7) phase = 'off'
    else if ((month === 7 || month === 8) && openerFuture && openerDays >= 1) phase = 'pre'
    else if (month === 8 && bigTarget) phase = 'open'
    else if (!bigTarget) phase = 'off'
    else phase = 'mid'

    // 카운트다운/티저 타깃: 개막 전이면 빅리그 개막 경기, 그 외엔 다음 빅매치
    const cdTarget = phase === 'pre' ? opener : bigTarget
    const cdMs = cdTarget ? ms(cdTarget) : null
    let cd = { d: 0, h: 0, m: 0, s: 0 }
    if (cdMs && cdMs > nowMs) {
      const s = Math.floor((cdMs - nowMs) / 1000)
      cd = { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }
    }

    return { phase, cdTarget, cd, openerDays }
  }, [matches, now])

  if (!info) return null

  const { phase, cdTarget, cd, openerDays } = info

  // 단계별 카피
  const T = {
    pre: {
      season: false,
      badge: isKo ? `해외축구 개막${openerDays > 0 ? ` D-${openerDays}` : ''}` : `Season Kickoff${openerDays > 0 ? ` D-${openerDays}` : ''}`,
      title: isKo ? ['개막전, ', 'AI가 먼저 찍는다'] : ['New season, ', "AI picks first"],
      lead: isKo
        ? ['EPL·라리가·분데스·세리에A·리그1 개막 라운드 AI 분석 픽. 지금 가입하면 ', '48시간 프리미엄 무료', '로 전부 열람.']
        : ['AI picks for the opening rounds across the top 5 leagues. Sign up now for ', '48h Premium free', '.'],
      cdLabel: isKo ? '개막까지' : 'Kickoff in',
      teaserTitle: isKo ? '개막 라운드 AI 픽' : 'Opening round AI pick',
      step2: isKo ? '가입 즉시 개막 라운드 전체 픽 열람.' : 'Unlock all opening-round picks instantly.',
      step3t: isKo ? '개막 앞서가기' : 'Get ahead',
      step3: isKo ? 'AI 픽·24시간 선공개로 시즌 스타트.' : 'AI picks & 24h early access.',
    },
    open: {
      season: false,
      badge: isKo ? '개막 라운드 진행 중' : 'Opening round live',
      title: isKo ? ['개막 라운드, ', 'AI 픽으로 앞서가세요'] : ['Opening round — ', 'get ahead with AI picks'],
      lead: isKo
        ? ['5대 리그 개막 라운드 전 경기 AI 분석. 다음 빅매치까지 ', '48시간 무료', '로 픽을 미리 확인하세요.']
        : ['AI analysis for every opening-round match. ', '48h free', ' — see the picks before the next big match.'],
      cdLabel: isKo ? '다음 빅매치까지' : 'Next big match in',
      teaserTitle: isKo ? '이번 라운드 강추 픽' : "This round's top pick",
      step2: isKo ? '가입 즉시 이번 라운드 전체 픽 열람.' : "Unlock this round's picks instantly.",
      step3t: isKo ? '라운드 앞서가기' : 'Stay ahead',
      step3: isKo ? 'AI 픽·24시간 선공개로 매 라운드.' : 'AI picks & 24h early access every round.',
    },
    mid: {
      season: true,
      badge: isKo ? 'AI 경기 분석 픽' : 'AI Match Picks',
      title: isKo ? ['이번 주 경기, ', 'AI 픽 무료 체험'] : ['This week — ', 'try AI picks free'],
      lead: isKo
        ? ['매일 엄선된 AI 강추 픽과 24시간 선공개. 지금 가입하면 ', '48시간 프리미엄 무료', '.']
        : ['Daily curated AI picks with 24h early access. Sign up for ', '48h Premium free', '.'],
      cdLabel: isKo ? '다음 경기까지' : 'Next match in',
      teaserTitle: isKo ? '오늘의 강추 픽' : "Today's top pick",
      step2: isKo ? '가입 즉시 오늘의 전체 픽 열람.' : "Unlock today's picks instantly.",
      step3t: isKo ? '매일 앞서가기' : 'Stay ahead',
      step3: isKo ? 'AI 픽·24시간 선공개로 상시.' : 'AI picks & 24h early access, always.',
    },
    off: {
      season: true,
      badge: isKo ? '곧 개막' : 'Season soon',
      title: isKo ? ['개막 D-day, ', 'AI 픽 미리 준비'] : ['Kickoff soon — ', 'get AI picks ready'],
      lead: isKo
        ? ['새 시즌 개막을 앞두고 미리 가입하세요. ', '48시간 프리미엄 무료', ' 체험 제공.']
        : ['Get set for the new season. ', '48h Premium free', ' trial.'],
      cdLabel: '',
      teaserTitle: isKo ? '개막 라운드 AI 픽' : 'Opening round AI pick',
      step2: isKo ? '가입 후 개막과 동시에 전체 픽 열람.' : 'Unlock all picks when the season starts.',
      step3t: isKo ? '개막 준비' : 'Be ready',
      step3: isKo ? 'AI 픽·24시간 선공개로 시즌 스타트.' : 'AI picks & 24h early access.',
    },
  }[phase]

  const showCd = phase !== 'off' && cd && (cd.d + cd.h + cd.m + cd.s) > 0
  const tm = cdTarget
  const teamName = (raw?: string, ko?: string) => (isKo ? ko || raw || '' : raw || '')
  const logo = (id?: any, fallback?: string) =>
    id ? `https://media.api-sports.io/football/teams/${id}.png` : fallback || ''
  const kickoffStr = (() => {
    if (!tm?.commence_time) return ''
    const dt = new Date(tm.commence_time)
    if (Number.isNaN(dt.getTime())) return ''
    return dt.toLocaleString(isKo ? 'ko-KR' : 'en-US', {
      month: 'short',
      day: 'numeric',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  })()

  return (
    <div className="skh-root">
      <div className="skh-hero">
        <div className="skh-in">
          {/* LEFT */}
          <div>
            <span className={`skh-kick${T.season ? ' season' : ''}`}>
              <span className="skh-dot" />
              {T.badge}
            </span>
            <h1 className="skh-title">
              {T.title[0]}
              <em>{T.title[1]}</em>
            </h1>
            <p className="skh-lead">
              {T.lead[0]}
              <b>{T.lead[1]}</b>
              {T.lead[2] || ''}
            </p>

            <div className="skh-leagues">
              {LEAGUE_LOGOS.map((id) => (
                <span className="skh-l" key={id}>
                  <img src={`https://media.api-sports.io/football/leagues/${id}.png`} alt="" onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')} />
                </span>
              ))}
              <span className="skh-more">{isKo ? '+ 챔피언스리그 · K리그' : '+ UCL · K League'}</span>
            </div>

            {showCd && (
              <div className="skh-cd">
                <span className="skh-lab">{T.cdLabel}</span>
                <div className="skh-box">
                  {[
                    [cd.d, isKo ? '일' : 'd'],
                    [cd.h, isKo ? '시간' : 'h'],
                    [cd.m, isKo ? '분' : 'm'],
                    [cd.s, isKo ? '초' : 's'],
                  ].map(([v, u], i) => (
                    <div className="skh-u" key={i}>
                      <b className="skh-tnum">{pad(v as number)}</b>
                      <small>{u as string}</small>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="skh-cta-row">
              <Link href="/login" className="skh-cta p">
                {isKo ? '48시간 무료로 시작하기' : 'Start free for 48h'} <span>→</span>
              </Link>
              <Link href="/login" className="skh-cta g">
                {isKo ? '이미 회원? 로그인' : 'Log in'}
              </Link>
            </div>
            <div className="skh-note">
              <svg width="15" height="15" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.7-9.3a1 1 0 00-1.4-1.4L9 10.6 7.7 9.3a1 1 0 00-1.4 1.4l2 2a1 1 0 001.4 0z" />
              </svg>
              {isKo ? '30초 소셜 가입 · 결제정보 불필요 · 언제든 해지' : '30s sign-up · no card · cancel anytime'}
            </div>

            <div className="skh-trust">
              <div className="skh-chip"><b className="gd skh-tnum">68%</b><small>{isKo ? '최근 PICK 적중률' : 'Recent PICK win rate'}</small></div>
              <div className="skh-chip"><b className="e skh-tnum">10,000+</b><small>{isKo ? '분석 경기' : 'matches analyzed'}</small></div>
              <div className="skh-chip"><b className="skh-tnum">24h</b><small>{isKo ? '프리미엄 선공개' : 'early access'}</small></div>
            </div>
          </div>

          {/* RIGHT: 다음 빅매치 티저 (카드 전체가 로그인 링크 — 중복 CTA 제거) */}
          {tm && (
            <div className="skh-teaser">
              <Link href="/login" className="skh-tcard">
                <div className="skh-th">
                  <span className="skh-lc">{tm.league_code || ''}</span>
                  <span className="skh-pk">🔥 {isKo ? '강추' : 'PICK'}</span>
                </div>
                <div className="skh-teams">
                  <div className="skh-tm">
                    <span className="skh-lg">
                      <img src={logo(tm.home_team_id, tm.home_team_logo)} alt="" onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')} />
                    </span>
                    <span>{teamName(tm.home_team, tm.home_team_ko)}</span>
                  </div>
                  <span className="skh-vs">VS</span>
                  <div className="skh-tm">
                    <span className="skh-lg">
                      <img src={logo(tm.away_team_id, tm.away_team_logo)} alt="" onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')} />
                    </span>
                    <span>{teamName(tm.away_team, tm.away_team_ko)}</span>
                  </div>
                </div>

                {/* 킥오프 일시 — 실제 경기 정보 노출 */}
                {kickoffStr && (
                  <div className="skh-when">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </svg>
                    {kickoffStr}
                  </div>
                )}

                {/* 하단 안내 — 초록 버튼 아님(중복 방지), 로그인 유도 캡션 */}
                <span className="skh-tfoot">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <rect x="5" y="11" width="14" height="10" rx="2" />
                    <path d="M8 11V7a4 4 0 018 0v4" />
                  </svg>
                  {isKo ? '로그인하고 AI 픽 확인' : 'Log in to see the AI pick'}
                  <span className="skh-arw">→</span>
                </span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* 깔때기 3스텝 */}
      <div className="skh-funnel">
        <div className="skh-step"><div className="skh-n">1</div><b>{isKo ? '30초 무료 가입' : '30s sign-up'}</b><small>{isKo ? '구글·네이버로 바로. 결제정보 없음.' : 'Google/Naver. No card.'}</small></div>
        <div className="skh-step"><div className="skh-n">2</div><b>{isKo ? '48시간 프리미엄 무료' : '48h Premium free'}</b><small>{T.step2}</small></div>
        <div className="skh-step"><div className="skh-n">3</div><b>{T.step3t}</b><small>{T.step3}</small></div>
      </div>

      <style jsx global>{`
        .skh-root{--em:#10b981;--em-l:#34d399;--gold:#f5c451;--gold-d:#d9a327;--txt:#eef2f5;--txt-2:#aab4bd;--txt-3:#6c7681;--sf:rgba(255,255,255,.03);--sf2:rgba(255,255,255,.05);--bd:rgba(255,255,255,.09);position:relative;margin-bottom:20px;color:var(--txt)}
        .skh-tnum{font-variant-numeric:tabular-nums}
        @keyframes skhrise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .skh-hero{border-radius:24px;padding:1px;background:linear-gradient(120deg,rgba(245,196,81,.55),rgba(16,185,129,.4) 50%,rgba(255,255,255,.06));overflow:hidden;box-shadow:0 24px 60px -20px rgba(0,0,0,.6);animation:skhrise .55s cubic-bezier(.22,1,.36,1) both}
        .skh-in{border-radius:23px;background:linear-gradient(160deg,#12181d,#0a0e11);padding:24px;display:grid;grid-template-columns:1.15fr .85fr;gap:24px;position:relative;overflow:hidden}
        .skh-in::before{content:"";position:absolute;top:-120px;right:-80px;width:340px;height:340px;background:radial-gradient(circle,rgba(245,196,81,.13),transparent 60%);pointer-events:none}
        .skh-in::after{content:"";position:absolute;bottom:-140px;left:-100px;width:320px;height:320px;background:radial-gradient(circle,rgba(16,185,129,.1),transparent 60%);pointer-events:none}
        @media(max-width:820px){.skh-in{grid-template-columns:1fr;padding:20px}}
        .skh-kick{display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:800;letter-spacing:.1em;color:var(--gold);background:rgba(245,196,81,.08);border:1px solid rgba(245,196,81,.35);padding:7px 13px;border-radius:999px}
        .skh-kick.season{color:var(--em-l);background:rgba(16,185,129,.08);border-color:rgba(16,185,129,.3)}
        .skh-dot{width:6px;height:6px;border-radius:50%;background:currentColor;box-shadow:0 0 8px currentColor;animation:skhp 1.6s infinite}
        @keyframes skhp{50%{opacity:.4}}
        .skh-title{font-size:clamp(24px,4.2vw,36px);font-weight:800;letter-spacing:-.035em;line-height:1.14;margin:13px 0 9px}
        .skh-title em{font-style:normal;background:linear-gradient(120deg,var(--em-l),var(--gold));-webkit-background-clip:text;background-clip:text;color:transparent}
        .skh-lead{color:var(--txt-2);font-size:14.5px;max-width:470px}
        .skh-lead b{color:var(--gold)}
        .skh-leagues{display:flex;align-items:center;gap:8px;margin:16px 0 4px;flex-wrap:wrap}
        .skh-l{width:32px;height:32px;border-radius:8px;background:#fff;padding:5px;display:grid;place-items:center;transition:transform .18s ease,box-shadow .18s ease}
        .skh-l:hover{transform:translateY(-2px);box-shadow:0 6px 14px rgba(0,0,0,.35)}
        .skh-l img{width:100%;height:100%;object-fit:contain}
        .skh-more{font-size:12px;color:var(--txt-3);font-weight:600}
        .skh-cd{display:flex;align-items:center;gap:10px;margin:18px 0}
        .skh-lab{font-size:12px;color:var(--txt-3);font-weight:700;white-space:nowrap}
        .skh-box{display:flex;gap:6px}
        .skh-u{min-width:52px;text-align:center;background:linear-gradient(160deg,rgba(255,255,255,.07),rgba(255,255,255,.02));border:1px solid var(--bd);border-radius:11px;padding:9px 6px;box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}
        .skh-u b{display:block;font-size:22px;font-weight:800;line-height:1;color:var(--gold)}
        .skh-u small{font-size:10px;color:var(--txt-3);margin-top:3px;display:block}
        .skh-cta-row{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-top:6px}
        .skh-cta{display:inline-flex;align-items:center;justify-content:center;gap:9px;padding:14px 24px;border-radius:14px;font-size:15.5px;font-weight:800;cursor:pointer;border:none;transition:.2s;text-decoration:none}
        .skh-cta.p{color:#04140d;background:linear-gradient(135deg,var(--em-l),var(--em));box-shadow:0 12px 30px rgba(16,185,129,.32)}
        .skh-cta.p:hover{transform:translateY(-2px);box-shadow:0 16px 40px rgba(16,185,129,.48)}
        .skh-cta.p.sm{padding:11px 18px;font-size:13px}
        .skh-cta.g{color:var(--txt-2);background:var(--sf);border:1px solid var(--bd)}
        .skh-cta.g:hover{color:var(--txt);border-color:rgba(255,255,255,.2);background:var(--sf2)}
        .skh-note{font-size:12px;color:var(--txt-3);margin-top:12px;display:flex;align-items:center;gap:6px}
        .skh-note svg{fill:var(--em-l)}
        .skh-trust{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}
        .skh-chip{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:11px;background:var(--sf);border:1px solid var(--bd);transition:border-color .18s ease,background .18s ease}
        .skh-chip:hover{border-color:rgba(255,255,255,.18);background:var(--sf2)}
        .skh-chip b{font-size:15px;font-weight:800}
        .skh-chip b.e{color:var(--em-l)}.skh-chip b.gd{color:var(--gold)}
        .skh-chip small{font-size:11px;color:var(--txt-3)}
        .skh-teaser{align-self:center}
        .skh-tcard{display:block;text-decoration:none;color:inherit;border-radius:18px;background:var(--sf);border:1px solid rgba(245,196,81,.25);padding:16px;position:relative;overflow:hidden;transition:transform .22s cubic-bezier(.22,1,.36,1),border-color .22s ease,box-shadow .22s ease}
        .skh-tcard:hover{transform:translateY(-3px);border-color:rgba(245,196,81,.45);box-shadow:0 18px 40px -14px rgba(245,196,81,.28)}
        .skh-th{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
        .skh-lc{font-size:11px;font-weight:700;color:var(--txt-2);background:var(--sf2);padding:3px 9px;border-radius:6px}
        .skh-pk{font-size:11px;font-weight:800;color:#2a1c02;background:linear-gradient(135deg,var(--gold),var(--gold-d));padding:3px 10px;border-radius:7px}
        .skh-teams{display:flex;align-items:center;justify-content:space-between;padding:4px 2px 2px}
        .skh-tm{display:flex;flex-direction:column;align-items:center;gap:11px;flex:1;min-width:0}
        .skh-lg{width:74px;height:74px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 50% 32%,rgba(255,255,255,.1),rgba(255,255,255,.02) 70%);border:1px solid var(--bd);box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 8px 20px -10px rgba(0,0,0,.6);transition:transform .22s cubic-bezier(.22,1,.36,1)}
        .skh-tcard:hover .skh-lg{transform:translateY(-2px)}
        .skh-lg img{width:52px;height:52px;object-fit:contain}
        .skh-tm span{font-size:14px;font-weight:800;text-align:center;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:-.01em}
        .skh-vs{flex:none;width:36px;height:36px;border-radius:50%;background:var(--sf2);border:1px solid var(--bd);display:grid;place-items:center;color:var(--txt-3);font-weight:800;font-size:11px;margin-top:-22px}
        /* 킥오프 일시 */
        .skh-when{margin-top:18px;padding-top:14px;border-top:1px solid var(--bd);display:flex;align-items:center;justify-content:center;gap:7px;font-size:12.5px;font-weight:700;color:var(--txt-2)}
        .skh-when svg{stroke:var(--gold);opacity:.9}
        /* 하단 로그인 유도 캡션 (버튼 아님) */
        .skh-tfoot{display:flex;align-items:center;justify-content:center;gap:7px;margin-top:12px;padding:10px;border-radius:11px;background:rgba(245,196,81,.08);border:1px solid rgba(245,196,81,.22);font-size:12.5px;font-weight:700;color:var(--gold);transition:background .18s ease}
        .skh-arw{transition:transform .18s ease}
        .skh-tcard:hover .skh-tfoot{background:rgba(245,196,81,.15)}
        .skh-tcard:hover .skh-arw{transform:translateX(3px)}
        .skh-funnel{margin-top:14px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
        .skh-step{background:var(--sf);border:1px solid var(--bd);border-radius:14px;padding:13px;transition:border-color .18s ease,transform .18s ease}
        .skh-step:hover{border-color:rgba(16,185,129,.3);transform:translateY(-2px)}
        .skh-n{width:22px;height:22px;border-radius:50%;background:rgba(16,185,129,.15);color:var(--em-l);font-weight:800;font-size:12px;display:grid;place-items:center;margin-bottom:8px}
        .skh-step b{font-size:13px;font-weight:800;display:block;margin-bottom:2px}
        .skh-step small{font-size:11.5px;color:var(--txt-3)}
        @media(max-width:560px){.skh-funnel{grid-template-columns:1fr}}
      `}</style>
    </div>
  )
}
