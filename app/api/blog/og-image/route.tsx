import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

// 리그 풀네임(nameEn) → 코드. 구 cover_image URL은 leaguecode 없이 league(nameEn)만 담고 있어
// 하위호환을 위해 매핑으로 배경을 결정한다.
const NAME_TO_CODE: Record<string, string> = {
  'Premier League': 'PL',
  'La Liga': 'PD',
  'Bundesliga': 'BL1',
  'Serie A': 'SA',
  'Ligue 1': 'FL1',
  'Champions League': 'CL',
  'Europa League': 'EL',
  'Eredivisie': 'DED',
  'K League 1': 'KL1',
  'K League 2': 'KL2',
  'J1 League': 'J1',
  'J2 League': 'J2',
  'Major League Soccer': 'MLS',
}

const BG_CODES = new Set([
  'PL','PD','BL1','SA','FL1','CL','EL','DED','KL1','KL2','J1','J2','MLS',
])

const NAVY = '#0d1728'
const GREEN = '#9bec4b'

// 가운데 은은한 정규분포(stats) 곡선 — data URI SVG로 img 처리 (Satori 안전)
const CURVE = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="170" viewBox="0 0 760 170"><path d="M0 158 C 190 158 300 24 380 24 C 460 24 570 158 760 158" fill="none" stroke="%23ccd4e0" stroke-width="3"/></svg>`
    .replace(/%23/g, '#')
)}`

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const origin = new URL(request.url).origin

  const homeLogo = searchParams.get('homelogo') || ''
  const awayLogo = searchParams.get('awaylogo') || ''
  const league = searchParams.get('league') || ''
  const leagueLogo = searchParams.get('leaguelogo') || ''
  const date = searchParams.get('date') || ''

  // 배경 코드: leaguecode 우선, 없으면 league 이름으로 역매핑, 그래도 없으면 default
  let code = (searchParams.get('leaguecode') || '').toUpperCase()
  if (!BG_CODES.has(code)) code = NAME_TO_CODE[league] || ''
  const bgCode = BG_CODES.has(code) ? code : 'default'
  const bgUrl = `${origin}/og-bg/og-bg-${bgCode}.jpg`
  const logoUrl = `${origin}/logo.svg`

  const hasMatch = Boolean(homeLogo || awayLogo || leagueLogo)

  return new ImageResponse(
    (
      <div style={{
        width: '1200px', height: '630px',
        display: 'flex', position: 'relative',
        fontFamily: 'sans-serif', backgroundColor: '#0a0e1a',
      }}>

        {/* ===== 배경 이미지 ===== */}
        <img
          src={bgUrl}
          width={1200}
          height={630}
          style={{ position: 'absolute', top: 0, left: 0, width: '1200px', height: '630px', objectFit: 'cover' as const }}
        />

        {/* ===== 스크림(가독성) ===== */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '1200px', height: '630px', display: 'flex',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.58) 0%, rgba(0,0,0,0.3) 18%, rgba(0,0,0,0.22) 50%, rgba(0,0,0,0.3) 82%, rgba(0,0,0,0.45) 100%)',
        }} />

        {/* ===== 상단 TrendSoccer 로고 ===== */}
        <div style={{
          position: 'absolute', top: '36px', left: 0, width: '1200px',
          display: 'flex', justifyContent: 'center', zIndex: 10,
        }}>
          <img src={logoUrl} width={250} height={62} style={{ width: '250px', height: '62px' }} />
        </div>

        {/* ===== 카드 ===== */}
        <div style={{
          position: 'absolute', top: '150px', left: '160px',
          width: '880px', height: '438px',
          display: 'flex', flexDirection: 'column',
          borderRadius: '24px',
          boxShadow: '0 22px 55px rgba(0,0,0,0.5)',
          backgroundColor: '#ffffff',
          zIndex: 10,
        }}>

          {/* 상단 띠: 리그 엠블럼 + 리그명 */}
          <div style={{
            height: '84px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: NAVY,
            borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
            borderBottom: `4px solid ${GREEN}`,
          }}>
            {leagueLogo ? (
              <img src={leagueLogo} width={48} height={48} style={{ width: '48px', height: '48px', objectFit: 'contain' as const, marginRight: '18px' }} />
            ) : null}
            <span style={{
              color: '#ffffff', fontSize: '34px', fontWeight: 800,
              letterSpacing: '4px', textTransform: 'uppercase' as const,
            }}>
              {league || 'FOOTBALL'}
            </span>
          </div>

          {/* 가운데: 홈 | 날짜 | 원정 */}
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 64px', position: 'relative',
          }}>
            {/* stats 곡선 */}
            <img src={CURVE} width={760} height={170} style={{ position: 'absolute', left: '60px', bottom: '14px', width: '760px', height: '170px', opacity: 0.6 }} />

            {/* 홈 로고 */}
            <div style={{ display: 'flex', width: '150px', height: '150px', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
              {homeLogo ? (
                <img src={homeLogo} width={150} height={150} style={{ objectFit: 'contain' as const }} />
              ) : (
                <span style={{ fontSize: '90px' }}>⚽</span>
              )}
            </div>

            {/* 가운데: 날짜 or VS */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
              <span style={{ color: NAVY, fontSize: '42px', fontWeight: 800, letterSpacing: '1px' }}>
                {date || 'VS'}
              </span>
              <div style={{ display: 'flex', width: '66px', height: '5px', marginTop: '10px', backgroundColor: '#6cc93a', borderRadius: '3px' }} />
            </div>

            {/* 원정 로고 */}
            <div style={{ display: 'flex', width: '150px', height: '150px', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
              {awayLogo ? (
                <img src={awayLogo} width={150} height={150} style={{ objectFit: 'contain' as const }} />
              ) : (
                <span style={{ fontSize: '90px' }}>⚽</span>
              )}
            </div>
          </div>

          {/* 하단 띠 */}
          <div style={{
            height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: NAVY,
            borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px',
            borderTop: `4px solid ${GREEN}`,
          }}>
            <span style={{ color: '#ffffff', fontSize: '28px', fontWeight: 700, letterSpacing: '3px' }}>
              PREDICTIONS · STATS · TRENDS
            </span>
          </div>
        </div>

        {/* 매치 정보가 전혀 없을 때(비매치 글)는 카드 가운데를 비워두되 로고/띠는 유지 */}
        {!hasMatch ? (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '1px', height: '1px', display: 'flex' }} />
        ) : null}
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
