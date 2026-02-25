import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

interface LeagueTheme {
  primary: string
  accent: string
  bg: string
  glow1: string
  glow2: string
  textColor: string
  labelBg: string
  labelBorder: string
}

const LEAGUE_THEMES: Record<string, LeagueTheme> = {
  'Premier League': {
    primary: '#3d195b', accent: '#e90052',
    bg: 'linear-gradient(135deg, #380e5c 0%, #2a0845 30%, #1a0530 50%, #4a0028 70%, #6b0035 100%)',
    glow1: 'rgba(61,25,91,0.7)', glow2: 'rgba(233,0,82,0.5)',
    textColor: '#00ff85',
    labelBg: 'rgba(0,255,133,0.12)', labelBorder: 'rgba(0,255,133,0.3)',
  },
  'La Liga': {
    primary: '#1a3c6e', accent: '#ee8707',
    bg: 'linear-gradient(135deg, #0d2240 0%, #132d52 30%, #1a3a68 50%, #2a4a7a 70%, #1a3058 100%)',
    glow1: 'rgba(26,60,110,0.7)', glow2: 'rgba(238,135,7,0.4)',
    textColor: '#ee8707',
    labelBg: 'rgba(238,135,7,0.12)', labelBorder: 'rgba(238,135,7,0.3)',
  },
  'Bundesliga': {
    primary: '#d20515', accent: '#ffffff',
    bg: 'linear-gradient(135deg, #3a0508 0%, #5a0a10 30%, #7a1018 50%, #5a0a10 70%, #2a0305 100%)',
    glow1: 'rgba(210,5,21,0.6)', glow2: 'rgba(210,5,21,0.3)',
    textColor: '#ffffff',
    labelBg: 'rgba(255,255,255,0.1)', labelBorder: 'rgba(255,255,255,0.2)',
  },
  'Serie A': {
    primary: '#024494', accent: '#009b3a',
    bg: 'linear-gradient(135deg, #051530 0%, #082040 30%, #0a2a50 50%, #052838 70%, #041828 100%)',
    glow1: 'rgba(2,68,148,0.6)', glow2: 'rgba(0,155,58,0.3)',
    textColor: '#4fc3f7',
    labelBg: 'rgba(79,195,247,0.12)', labelBorder: 'rgba(79,195,247,0.25)',
  },
  'Ligue 1': {
    primary: '#091c3e', accent: '#c8ff00',
    bg: 'linear-gradient(135deg, #060e1e 0%, #0a1830 30%, #0e2040 50%, #0a1830 70%, #060e1e 100%)',
    glow1: 'rgba(9,28,62,0.8)', glow2: 'rgba(200,255,0,0.2)',
    textColor: '#c8ff00',
    labelBg: 'rgba(200,255,0,0.08)', labelBorder: 'rgba(200,255,0,0.2)',
  },
  'Champions League': {
    primary: '#00003e', accent: '#f4c300',
    bg: 'linear-gradient(135deg, #000020 0%, #000838 30%, #001050 50%, #000838 70%, #000020 100%)',
    glow1: 'rgba(0,0,80,0.7)', glow2: 'rgba(244,195,0,0.25)',
    textColor: '#f4c300',
    labelBg: 'rgba(244,195,0,0.1)', labelBorder: 'rgba(244,195,0,0.25)',
  },
  'Europa League': {
    primary: '#f26522', accent: '#000000',
    bg: 'linear-gradient(135deg, #1a0800 0%, #2a1005 30%, #3a180a 50%, #2a1005 70%, #1a0800 100%)',
    glow1: 'rgba(242,101,34,0.5)', glow2: 'rgba(255,140,0,0.3)',
    textColor: '#ffffff',
    labelBg: 'rgba(255,255,255,0.08)', labelBorder: 'rgba(255,255,255,0.18)',
  },
  'Eredivisie': {
    primary: '#e4002b', accent: '#ff6b35',
    bg: 'linear-gradient(135deg, #2a0508 0%, #3a0a10 30%, #4a1018 50%, #3a0a10 70%, #2a0508 100%)',
    glow1: 'rgba(228,0,43,0.5)', glow2: 'rgba(255,107,53,0.3)',
    textColor: '#ffffff',
    labelBg: 'rgba(255,255,255,0.08)', labelBorder: 'rgba(255,255,255,0.18)',
  },
  'K League 1': {
    primary: '#003da5', accent: '#c8102e',
    bg: 'linear-gradient(135deg, #041028 0%, #081a3a 30%, #0c2450 50%, #0a1a38 70%, #061028 100%)',
    glow1: 'rgba(0,61,165,0.5)', glow2: 'rgba(200,16,46,0.3)',
    textColor: '#ffffff',
    labelBg: 'rgba(255,255,255,0.08)', labelBorder: 'rgba(255,255,255,0.18)',
  },
  'K League 2': {
    primary: '#005a32', accent: '#003da5',
    bg: 'linear-gradient(135deg, #041a10 0%, #062a18 30%, #083a22 50%, #062a18 70%, #041a10 100%)',
    glow1: 'rgba(0,90,50,0.5)', glow2: 'rgba(0,61,165,0.3)',
    textColor: '#ffffff',
    labelBg: 'rgba(255,255,255,0.08)', labelBorder: 'rgba(255,255,255,0.18)',
  },
  'J1 League': {
    primary: '#c41230', accent: '#1a1a6c',
    bg: 'linear-gradient(135deg, #1a0810 0%, #2a1018 30%, #3a1822 50%, #2a1018 70%, #1a0810 100%)',
    glow1: 'rgba(196,18,48,0.5)', glow2: 'rgba(26,26,108,0.3)',
    textColor: '#ffffff',
    labelBg: 'rgba(255,255,255,0.08)', labelBorder: 'rgba(255,255,255,0.18)',
  },
  'J2 League': {
    primary: '#1a1a6c', accent: '#c41230',
    bg: 'linear-gradient(135deg, #0c0c28 0%, #141440 30%, #1c1c58 50%, #141440 70%, #0c0c28 100%)',
    glow1: 'rgba(26,26,108,0.5)', glow2: 'rgba(196,18,48,0.3)',
    textColor: '#ffffff',
    labelBg: 'rgba(255,255,255,0.08)', labelBorder: 'rgba(255,255,255,0.18)',
  },
  'Major League Soccer': {
    primary: '#0b2137', accent: '#c3032a',
    bg: 'linear-gradient(135deg, #060f1a 0%, #0c1a2e 30%, #122540 50%, #0c1a2e 70%, #060f1a 100%)',
    glow1: 'rgba(11,33,55,0.6)', glow2: 'rgba(195,3,42,0.3)',
    textColor: '#ffffff',
    labelBg: 'rgba(195,3,42,0.12)', labelBorder: 'rgba(195,3,42,0.25)',
  },
}

const DEFAULT_THEME: LeagueTheme = {
  primary: '#2563eb', accent: '#3b82f6',
  bg: 'linear-gradient(135deg, #0a0e1a 0%, #101828 50%, #0a0e1a 100%)',
  glow1: 'rgba(37,99,235,0.3)', glow2: 'rgba(239,68,68,0.2)',
  textColor: '#60a5fa',
  labelBg: 'rgba(96,165,250,0.08)', labelBorder: 'rgba(96,165,250,0.2)',
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const origin = new URL(request.url).origin

  const homeLogo = searchParams.get('homelogo') || ''
  const awayLogo = searchParams.get('awaylogo') || ''
  const league = searchParams.get('league') || ''
  const leagueLogo = searchParams.get('leaguelogo') || ''

  const theme = LEAGUE_THEMES[league] || DEFAULT_THEME
  const siteLogoUrl = `${origin}/logo.svg`

  return new ImageResponse(
    (
      <div style={{
        width: '1200px', height: '630px',
        display: 'flex', flexDirection: 'column',
        background: theme.bg,
        fontFamily: 'sans-serif',
        position: 'relative', overflow: 'hidden',
      }}>

        {/* ===== 배경 글로우 ===== */}
        <div style={{
          position: 'absolute', top: '0', left: '0', width: '55%', height: '100%',
          background: `radial-gradient(ellipse at 25% 50%, ${theme.glow1}, transparent 70%)`,
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', top: '0', right: '0', width: '55%', height: '100%',
          background: `radial-gradient(ellipse at 75% 50%, ${theme.glow2}, transparent 70%)`,
          display: 'flex',
        }} />

        {/* ===== 상단 MATCH PREVIEW ===== */}
        <div style={{
          position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
          display: 'flex',
          background: theme.labelBg, border: `1px solid ${theme.labelBorder}`,
          borderRadius: '6px', padding: '5px 18px',
          zIndex: 10,
        }}>
          <span style={{
            color: theme.textColor, fontSize: '13px', fontWeight: 700,
            letterSpacing: '3px',
          }}>
            MATCH PREVIEW
          </span>
        </div>

        {/* ===== 메인: 홈로고 | 리그 | 원정로고 ===== */}
        <div style={{
          display: 'flex', flex: 1,
          alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>

          {/* 홈팀 로고 — 거대 */}
          <div style={{
            position: 'absolute',
            left: '-30px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '520px', height: '480px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {homeLogo ? (
              <img
                src={homeLogo}
                width={420}
                height={420}
                style={{
                  objectFit: 'contain' as const,
                  filter: 'drop-shadow(0 0 50px rgba(0,0,0,0.5))',
                  opacity: 0.92,
                }}
              />
            ) : (
              <span style={{ fontSize: '200px' }}>⚽</span>
            )}
          </div>

          {/* 가운데: 리그 엠블럼 */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '14px',
            zIndex: 10,
          }}>
            <span style={{
              color: theme.textColor, fontSize: '16px', fontWeight: 800,
              letterSpacing: '3px', textTransform: 'uppercase' as const,
              textShadow: '0 2px 10px rgba(0,0,0,0.7)',
              textAlign: 'center',
            }}>
              {league}
            </span>

            {leagueLogo && (
              <div style={{
                width: '120px', height: '120px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.95)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 4px 40px rgba(0,0,0,0.5), 0 0 0 4px rgba(255,255,255,0.15), 0 0 60px ${theme.primary}30`,
              }}>
                <img src={leagueLogo} width={78} height={78} style={{ objectFit: 'contain' as const }} />
              </div>
            )}
          </div>

          {/* 원정팀 로고 — 거대 */}
          <div style={{
            position: 'absolute',
            right: '-30px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '520px', height: '480px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {awayLogo ? (
              <img
                src={awayLogo}
                width={420}
                height={420}
                style={{
                  objectFit: 'contain' as const,
                  filter: 'drop-shadow(0 0 50px rgba(0,0,0,0.5))',
                  opacity: 0.92,
                }}
              />
            ) : (
              <span style={{ fontSize: '200px' }}>⚽</span>
            )}
          </div>
        </div>

        {/* ===== 하단: TrendSoccer 로고 ===== */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 0 16px 0',
          position: 'relative', zIndex: 10,
        }}>
          <img
            src={siteLogoUrl}
            width={130}
            height={32}
            style={{ opacity: 0.35 }}
          />
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
        'CDN-Cache-Control': 'public, max-age=604800',
      },
    },
  )
}