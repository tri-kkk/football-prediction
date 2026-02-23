import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

interface LeagueTheme {
  primary: string
  accent: string
  gradientLeft: string
  gradientRight: string
  topBarBg: string
  topBarText: string
  bgBase: string
  labelBg: string
  labelBorder: string
}

const LEAGUE_THEMES: Record<string, LeagueTheme> = {
  'Premier League': {
    primary: '#3d195b', accent: '#e90052',
    gradientLeft: 'rgba(61,25,91,0.5)', gradientRight: 'rgba(233,0,82,0.3)',
    topBarBg: 'linear-gradient(90deg, #3d195b, #1a0a2e)',
    topBarText: '#00ff85', bgBase: '#0c0518',
    labelBg: 'rgba(0,255,133,0.08)', labelBorder: 'rgba(0,255,133,0.2)',
  },
  'La Liga': {
    primary: '#1a3c6e', accent: '#ff4b44',
    gradientLeft: 'rgba(26,60,110,0.5)', gradientRight: 'rgba(238,135,7,0.35)',
    topBarBg: 'linear-gradient(90deg, #1a3c6e, #0e1f3a)',
    topBarText: '#ee8707', bgBase: '#080d18',
    labelBg: 'rgba(238,135,7,0.08)', labelBorder: 'rgba(238,135,7,0.2)',
  },
  'Bundesliga': {
    primary: '#d20515', accent: '#d20515',
    gradientLeft: 'rgba(210,5,21,0.35)', gradientRight: 'rgba(210,5,21,0.15)',
    topBarBg: 'linear-gradient(90deg, #1a0508, #0d0d0d)',
    topBarText: '#d20515', bgBase: '#0a0506',
    labelBg: 'rgba(210,5,21,0.08)', labelBorder: 'rgba(210,5,21,0.2)',
  },
  'Serie A': {
    primary: '#024494', accent: '#008fd7',
    gradientLeft: 'rgba(2,68,148,0.4)', gradientRight: 'rgba(0,155,58,0.2)',
    topBarBg: 'linear-gradient(90deg, #024494, #011d3f)',
    topBarText: '#4fc3f7', bgBase: '#060d18',
    labelBg: 'rgba(79,195,247,0.08)', labelBorder: 'rgba(79,195,247,0.2)',
  },
  'Ligue 1': {
    primary: '#091c3e', accent: '#c8ff00',
    gradientLeft: 'rgba(9,28,62,0.6)', gradientRight: 'rgba(200,255,0,0.15)',
    topBarBg: 'linear-gradient(90deg, #091c3e, #050e1f)',
    topBarText: '#c8ff00', bgBase: '#050a14',
    labelBg: 'rgba(200,255,0,0.06)', labelBorder: 'rgba(200,255,0,0.15)',
  },
  'Champions League': {
    primary: '#00003e', accent: '#0053a0',
    gradientLeft: 'rgba(0,0,62,0.6)', gradientRight: 'rgba(244,195,0,0.25)',
    topBarBg: 'linear-gradient(90deg, #00003e, #000020)',
    topBarText: '#f4c300', bgBase: '#000014',
    labelBg: 'rgba(244,195,0,0.08)', labelBorder: 'rgba(244,195,0,0.2)',
  },
  'Europa League': {
    primary: '#f26522', accent: '#ff8c00',
    gradientLeft: 'rgba(242,101,34,0.35)', gradientRight: 'rgba(255,140,0,0.2)',
    topBarBg: 'linear-gradient(90deg, #1a0a04, #0d0d0d)',
    topBarText: '#f26522', bgBase: '#0d0805',
    labelBg: 'rgba(242,101,34,0.08)', labelBorder: 'rgba(242,101,34,0.2)',
  },
  'Eredivisie': {
    primary: '#e4002b', accent: '#ff6b35',
    gradientLeft: 'rgba(228,0,43,0.3)', gradientRight: 'rgba(255,107,53,0.2)',
    topBarBg: 'linear-gradient(90deg, #1a0408, #0d0d0d)',
    topBarText: '#ff6b35', bgBase: '#0a0507',
    labelBg: 'rgba(255,107,53,0.08)', labelBorder: 'rgba(255,107,53,0.2)',
  },
  'K League 1': {
    primary: '#003da5', accent: '#c8102e',
    gradientLeft: 'rgba(0,61,165,0.4)', gradientRight: 'rgba(200,16,46,0.25)',
    topBarBg: 'linear-gradient(90deg, #001840, #0d0408)',
    topBarText: '#5b9cf5', bgBase: '#060a14',
    labelBg: 'rgba(91,156,245,0.08)', labelBorder: 'rgba(91,156,245,0.2)',
  },
  'K League 2': {
    primary: '#003da5', accent: '#c8102e',
    gradientLeft: 'rgba(0,61,165,0.4)', gradientRight: 'rgba(200,16,46,0.25)',
    topBarBg: 'linear-gradient(90deg, #001840, #0d0408)',
    topBarText: '#5b9cf5', bgBase: '#060a14',
    labelBg: 'rgba(91,156,245,0.08)', labelBorder: 'rgba(91,156,245,0.2)',
  },
  'J1 League': {
    primary: '#c41230', accent: '#e63946',
    gradientLeft: 'rgba(196,18,48,0.35)', gradientRight: 'rgba(196,18,48,0.15)',
    topBarBg: 'linear-gradient(90deg, #1a0508, #0d0d0d)',
    topBarText: '#e63946', bgBase: '#0a0406',
    labelBg: 'rgba(230,57,70,0.08)', labelBorder: 'rgba(230,57,70,0.2)',
  },
  'J2 League': {
    primary: '#c41230', accent: '#e63946',
    gradientLeft: 'rgba(196,18,48,0.35)', gradientRight: 'rgba(196,18,48,0.15)',
    topBarBg: 'linear-gradient(90deg, #1a0508, #0d0d0d)',
    topBarText: '#e63946', bgBase: '#0a0406',
    labelBg: 'rgba(230,57,70,0.08)', labelBorder: 'rgba(230,57,70,0.2)',
  },
}

const DEFAULT_THEME: LeagueTheme = {
  primary: '#2563eb', accent: '#3b82f6',
  gradientLeft: 'rgba(37,99,235,0.3)', gradientRight: 'rgba(239,68,68,0.2)',
  topBarBg: 'linear-gradient(90deg, #0f172a, #0a0a1a)',
  topBarText: '#60a5fa', bgBase: '#0a0e1a',
  labelBg: 'rgba(96,165,250,0.08)', labelBorder: 'rgba(96,165,250,0.2)',
}

const GRADE_STYLES: Record<string, { bg: string; shadow: string; label: string }> = {
  'PICK': { bg: 'linear-gradient(135deg, #dc2626, #ef4444)', shadow: '0 4px 24px rgba(220,38,38,0.5)', label: '🔥 PICK' },
  'GOOD': { bg: 'linear-gradient(135deg, #059669, #10b981)', shadow: '0 4px 24px rgba(16,185,129,0.4)', label: '👍 GOOD' },
  'PASS': { bg: 'linear-gradient(135deg, #4b5563, #6b7280)', shadow: '0 4px 24px rgba(75,85,99,0.3)', label: '⛔ PASS' },
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const origin = new URL(request.url).origin

  const homeLogo = searchParams.get('homelogo') || ''
  const awayLogo = searchParams.get('awaylogo') || ''
  const league = searchParams.get('league') || ''
  const leagueLogo = searchParams.get('leaguelogo') || ''
  const pick = searchParams.get('pick') || 'HOME'
  const grade = searchParams.get('grade') || 'GOOD'
  const homeProb = parseInt(searchParams.get('homeprob') || '50')
  const drawProb = parseInt(searchParams.get('drawprob') || '25')
  const awayProb = parseInt(searchParams.get('awayprob') || '25')

  const theme = LEAGUE_THEMES[league] || DEFAULT_THEME
  const gs = GRADE_STYLES[grade] || GRADE_STYLES['GOOD']
  const isHomePick = pick === 'HOME'
  const isAwayPick = pick === 'AWAY'

  // 로고 URL (로컬/프로덕션 자동 대응)
  const siteLogoUrl = `${origin}/logo.svg`

  return new ImageResponse(
    (
      <div style={{
        width: '1200px', height: '630px',
        display: 'flex', flexDirection: 'column',
        background: theme.bgBase,
        fontFamily: 'sans-serif',
        position: 'relative', overflow: 'hidden',
      }}>

        {/* ===== 배경 ===== */}
        <div style={{ position: 'absolute', top: '0', left: '0', bottom: '0', width: '50%', background: `linear-gradient(180deg, ${theme.gradientLeft}, transparent 80%)`, display: 'flex' }} />
        <div style={{ position: 'absolute', top: '0', right: '0', bottom: '0', width: '50%', background: `linear-gradient(180deg, ${theme.gradientRight}, transparent 80%)`, display: 'flex' }} />
        <div style={{ position: 'absolute', top: '0', left: '50%', transform: 'translateX(-50%)', width: '1px', height: '100%', background: `linear-gradient(to bottom, ${theme.primary}44, transparent 30%, transparent 70%, ${theme.primary}22)`, display: 'flex' }} />
        <div style={{ position: 'absolute', top: '68px', left: '0', right: '0', height: '1px', background: `linear-gradient(90deg, transparent, ${theme.primary}33, transparent)`, display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: '76px', left: '0', right: '0', height: '1px', background: `linear-gradient(90deg, transparent, ${theme.primary}33, transparent)`, display: 'flex' }} />
        {/* 코너 장식 */}
        <div style={{ position: 'absolute', top: '12px', left: '12px', width: '36px', height: '36px', borderTop: `2px solid ${theme.primary}44`, borderLeft: `2px solid ${theme.primary}44`, display: 'flex' }} />
        <div style={{ position: 'absolute', top: '12px', right: '12px', width: '36px', height: '36px', borderTop: `2px solid ${theme.primary}44`, borderRight: `2px solid ${theme.primary}44`, display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: '12px', left: '12px', width: '36px', height: '36px', borderBottom: `2px solid ${theme.primary}44`, borderLeft: `2px solid ${theme.primary}44`, display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: '12px', right: '12px', width: '36px', height: '36px', borderBottom: `2px solid ${theme.primary}44`, borderRight: `2px solid ${theme.primary}44`, display: 'flex' }} />

        {/* ===== 워터마크 로고 (우측 하단) ===== */}
        <img
          src={siteLogoUrl}
          width={160}
          height={40}
          style={{
            position: 'absolute',
            bottom: '90px',
            right: '40px',
            opacity: 0.15,
          }}
        />

        {/* ===== 상단 바 ===== */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 48px',
          background: theme.topBarBg,
          borderBottom: `1px solid ${theme.primary}33`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {leagueLogo && (
              <div style={{
                width: '38px', height: '38px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.9)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '4px',
              }}>
                <img src={leagueLogo} width={28} height={28} style={{ borderRadius: '4px' }} />
              </div>
            )}
            <span style={{
              color: theme.topBarText, fontSize: '22px', fontWeight: 800,
              letterSpacing: '2px', textTransform: 'uppercase' as const,
            }}>
              {league}
            </span>
          </div>
          <div style={{
            display: 'flex',
            background: theme.labelBg, border: `1px solid ${theme.labelBorder}`,
            borderRadius: '6px', padding: '5px 18px',
          }}>
            <span style={{
              color: theme.topBarText, fontSize: '14px', fontWeight: 700,
              letterSpacing: '3px', opacity: 0.8,
            }}>
              MATCH PREVIEW
            </span>
          </div>
        </div>

        {/* ===== 중앙: 로고 + 확률 ===== */}
        <div style={{
          display: 'flex', flex: 1,
          alignItems: 'center', justifyContent: 'center',
          padding: '0 80px',
        }}>
          {/* 홈팀 */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', width: '340px', gap: '20px',
          }}>
            <div style={{
              width: '180px', height: '180px', borderRadius: '28px',
              background: isHomePick ? `linear-gradient(135deg, ${theme.primary}30, ${theme.primary}10)` : 'rgba(255,255,255,0.02)',
              border: isHomePick ? `2px solid ${theme.primary}66` : '1px solid rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: isHomePick ? `0 0 60px ${theme.primary}25` : 'none',
            }}>
              {homeLogo ? <img src={homeLogo} width={130} height={130} /> : <span style={{ fontSize: '72px' }}>⚽</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              <span style={{
                color: isHomePick ? theme.topBarText : '#4b5563',
                fontSize: '52px', fontWeight: 900,
                textShadow: isHomePick ? `0 0 40px ${theme.primary}40` : 'none',
              }}>
                {homeProb}%
              </span>
              {isHomePick && (
                <span style={{ color: theme.topBarText, fontSize: '12px', fontWeight: 700, letterSpacing: '4px', opacity: 0.6 }}>
                  PREDICTED
                </span>
              )}
            </div>
          </div>

          {/* VS */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', width: '120px', gap: '10px',
          }}>
            <div style={{
              width: '76px', height: '76px', borderRadius: '50%',
              background: `${theme.primary}15`, border: `1px solid ${theme.primary}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: theme.topBarText, fontSize: '26px', fontWeight: 900, letterSpacing: '2px', opacity: 0.5 }}>
                VS
              </span>
            </div>
            <span style={{ color: '#374151', fontSize: '15px', fontWeight: 600 }}>
              {drawProb}%
            </span>
          </div>

          {/* 원정팀 */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', width: '340px', gap: '20px',
          }}>
            <div style={{
              width: '180px', height: '180px', borderRadius: '28px',
              background: isAwayPick ? `linear-gradient(135deg, ${theme.accent}30, ${theme.accent}10)` : 'rgba(255,255,255,0.02)',
              border: isAwayPick ? `2px solid ${theme.accent}66` : '1px solid rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: isAwayPick ? `0 0 60px ${theme.accent}25` : 'none',
            }}>
              {awayLogo ? <img src={awayLogo} width={130} height={130} /> : <span style={{ fontSize: '72px' }}>⚽</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              <span style={{
                color: isAwayPick ? theme.topBarText : '#4b5563',
                fontSize: '52px', fontWeight: 900,
                textShadow: isAwayPick ? `0 0 40px ${theme.accent}40` : 'none',
              }}>
                {awayProb}%
              </span>
              {isAwayPick && (
                <span style={{ color: theme.topBarText, fontSize: '12px', fontWeight: 700, letterSpacing: '4px', opacity: 0.6 }}>
                  PREDICTED
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ===== 하단 바 ===== */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 48px',
          background: `linear-gradient(90deg, ${theme.bgBase}, ${theme.primary}08, ${theme.bgBase})`,
          borderTop: `1px solid ${theme.primary}22`,
        }}>
          {/* AI PREDICTION + 바 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ color: '#475569', fontSize: '13px', fontWeight: 700, letterSpacing: '2px' }}>
              AI PREDICTION
            </span>
            <div style={{
              display: 'flex', width: '180px', height: '6px',
              borderRadius: '3px', overflow: 'hidden',
            }}>
              <div style={{ width: `${homeProb}%`, background: theme.primary, display: 'flex' }} />
              <div style={{ width: `${drawProb}%`, background: '#374151', display: 'flex' }} />
              <div style={{ width: `${awayProb}%`, background: theme.accent, display: 'flex' }} />
            </div>
          </div>

          {/* 등급 뱃지 */}
          <div style={{
            display: 'flex', background: gs.bg,
            padding: '8px 24px', borderRadius: '8px', boxShadow: gs.shadow,
          }}>
            <span style={{ color: '#ffffff', fontSize: '18px', fontWeight: 800, letterSpacing: '2px' }}>
              {gs.label}
            </span>
          </div>

          {/* 로고 (하단 바에도 작게) */}
          <img
            src={siteLogoUrl}
            width={120}
            height={30}
            style={{ opacity: 0.4 }}
          />
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}