/**
 * 경기 썸네일 생성 API
 * /api/match-thumbnail?home={homeTeam}&away={awayTeam}&league={leagueCode}
 * 
 * 팀 로고 + 리그 로고 조합으로 깔끔한 썸네일 생성
 */

import { NextResponse } from 'next/server';

// 리그별 색상 및 로고
const LEAGUE_CONFIG = {
  PL: {
    name: 'Premier League',
    nameKr: '프리미어리그',
    logo: 'https://media.api-sports.io/football/leagues/39.png',
    gradient: ['#3D195B', '#00FF87'],
    bgColor: '#3D195B',
  },
  PD: {
    name: 'La Liga',
    nameKr: '라리가',
    logo: 'https://media.api-sports.io/football/leagues/140.png',
    gradient: ['#EE8707', '#FFFFFF'],
    bgColor: '#EE8707',
  },
  BL1: {
    name: 'Bundesliga',
    nameKr: '분데스리가',
    logo: 'https://media.api-sports.io/football/leagues/78.png',
    gradient: ['#D20515', '#000000'],
    bgColor: '#D20515',
  },
  SA: {
    name: 'Serie A',
    nameKr: '세리에A',
    logo: 'https://media.api-sports.io/football/leagues/135.png',
    gradient: ['#024494', '#008FD7'],
    bgColor: '#024494',
  },
  FL1: {
    name: 'Ligue 1',
    nameKr: '리그1',
    logo: 'https://media.api-sports.io/football/leagues/61.png',
    gradient: ['#091C3E', '#DAFF00'],
    bgColor: '#091C3E',
  },
  CL: {
    name: 'Champions League',
    nameKr: '챔피언스리그',
    logo: 'https://media.api-sports.io/football/leagues/2.png',
    gradient: ['#0D1541', '#1A237E'],
    bgColor: '#0D1541',
  },
  EL: {
    name: 'Europa League',
    nameKr: '유로파리그',
    logo: 'https://media.api-sports.io/football/leagues/3.png',
    gradient: ['#F26522', '#FDB913'],
    bgColor: '#F26522',
  },
  ECL: {
    name: 'Conference League',
    nameKr: 'UEFA 컨퍼런스리그',
    logo: 'https://media.api-sports.io/football/leagues/848.png',
    gradient: ['#18A55B', '#2ECC71'],
    bgColor: '#18A55B',
  },
  DED: {
    name: 'Eredivisie',
    nameKr: '에레디비시',
    logo: 'https://media.api-sports.io/football/leagues/88.png',
    gradient: ['#E4003B', '#FF6B6B'],
    bgColor: '#E4003B',
  },
  ELC: {
    name: 'Championship',
    nameKr: '챔피언십',
    logo: 'https://media.api-sports.io/football/leagues/40.png',
    gradient: ['#1B365D', '#D4A11E'],
    bgColor: '#1B365D',
  },
};

// API-Football 팀 ID 매핑 (주요 팀)
const TEAM_ID_MAP = {
  // Premier League
  'Manchester United': 33, 'Manchester City': 50, 'Liverpool': 40, 'Chelsea': 49,
  'Arsenal': 42, 'Tottenham': 47, 'Newcastle': 34, 'Aston Villa': 66,
  'Brighton': 51, 'West Ham': 48, 'Bournemouth': 35, 'Fulham': 36,
  'Wolves': 39, 'Crystal Palace': 52, 'Everton': 45, 'Brentford': 55,
  'Nottingham Forest': 65, 'Leicester': 46, 'Ipswich': 57, 'Southampton': 41,
  
  // La Liga
  'Real Madrid': 541, 'Barcelona': 529, 'Atletico Madrid': 530, 'Sevilla': 536,
  'Real Betis': 543, 'Real Sociedad': 548, 'Villarreal': 533, 'Athletic Bilbao': 531,
  'Valencia': 532, 'Girona': 547, 'Celta Vigo': 538, 'Rayo Vallecano': 728,
  'Osasuna': 727, 'Mallorca': 798, 'Las Palmas': 534, 'Getafe': 546,
  'Alaves': 542, 'Espanyol': 540, 'Valladolid': 720, 'Leganes': 539,
  
  // Bundesliga
  'Bayern Munich': 157, 'Borussia Dortmund': 165, 'RB Leipzig': 173, 'Bayer Leverkusen': 168,
  'Eintracht Frankfurt': 169, 'Stuttgart': 172, 'Freiburg': 160, 'Wolfsburg': 161,
  'Mainz': 164, 'Borussia Monchengladbach': 163, 'Union Berlin': 182, 'Werder Bremen': 162,
  'Augsburg': 170, 'Hoffenheim': 167, 'Heidenheim': 180, 'St. Pauli': 186,
  'Holstein Kiel': 191, 'Bochum': 176,
  
  // Serie A
  'Inter': 505, 'AC Milan': 489, 'Juventus': 496, 'Napoli': 492,
  'Roma': 497, 'Lazio': 487, 'Atalanta': 499, 'Fiorentina': 502,
  'Bologna': 500, 'Torino': 503, 'Monza': 1579, 'Udinese': 494,
  'Genoa': 495, 'Cagliari': 490, 'Empoli': 511, 'Parma': 523,
  'Verona': 504, 'Como': 519, 'Lecce': 867, 'Venezia': 517,
  
  // Ligue 1
  'PSG': 85, 'Monaco': 91, 'Marseille': 81, 'Lille': 79,
  'Lyon': 80, 'Nice': 84, 'Lens': 116, 'Rennes': 94,
  'Strasbourg': 95, 'Nantes': 83, 'Toulouse': 96, 'Montpellier': 82,
  'Reims': 93, 'Auxerre': 98, 'Angers': 77, 'Le Havre': 99,
  'Saint-Etienne': 1063, 'Brest': 106,
  
  // Eredivisie
  'PSV': 197, 'Ajax': 194, 'Feyenoord': 198, 'AZ Alkmaar': 201,
  'Twente': 202, 'Utrecht': 199, 'Go Ahead Eagles': 206,
  
  // Championship
  'Leeds': 63, 'Sheffield United': 62, 'Burnley': 44, 'Middlesbrough': 68,
  'West Brom': 60, 'Norwich': 71, 'Sunderland': 56, 'Watford': 38,
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const homeTeam = searchParams.get('home');
  const awayTeam = searchParams.get('away');
  const leagueCode = searchParams.get('league') || 'PL';
  
  if (!homeTeam || !awayTeam) {
    return NextResponse.json({ error: 'home and away required' }, { status: 400 });
  }
  
  const league = LEAGUE_CONFIG[leagueCode] || LEAGUE_CONFIG.PL;
  
  // 팀 로고 URL 생성
  const homeId = TEAM_ID_MAP[homeTeam];
  const awayId = TEAM_ID_MAP[awayTeam];
  
  const homeLogo = homeId 
    ? `https://media.api-sports.io/football/teams/${homeId}.png`
    : null;
  const awayLogo = awayId
    ? `https://media.api-sports.io/football/teams/${awayId}.png`
    : null;
  
  // SVG 썸네일 생성 (1200x630 - OG Image 표준)
  const svg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${league.gradient[0]};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${league.gradient[1]};stop-opacity:0.8" />
    </linearGradient>
    <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
      <circle cx="20" cy="20" r="2" fill="rgba(255,255,255,0.1)" />
    </pattern>
  </defs>
  
  <!-- 배경 -->
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#dots)"/>
  
  <!-- 왼쪽 팀 (홈) -->
  <g transform="translate(200, 200)">
    ${homeLogo ? `<image href="${homeLogo}" width="200" height="200" />` : 
    `<circle cx="100" cy="100" r="80" fill="rgba(255,255,255,0.2)" />
     <text x="100" y="115" font-size="48" fill="white" text-anchor="middle" font-family="Arial, sans-serif">${homeTeam.charAt(0)}</text>`}
  </g>
  <text x="300" y="450" font-size="32" fill="white" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold">${homeTeam}</text>
  
  <!-- 중앙 VS + 리그 로고 -->
  <g transform="translate(550, 180)">
    <image href="${league.logo}" width="100" height="100" />
  </g>
  <text x="600" y="350" font-size="64" fill="white" text-anchor="middle" font-family="Arial Black, sans-serif" font-weight="bold" opacity="0.9">VS</text>
  <text x="600" y="400" font-size="24" fill="rgba(255,255,255,0.7)" text-anchor="middle" font-family="Arial, sans-serif">${league.nameKr}</text>
  
  <!-- 오른쪽 팀 (원정) -->
  <g transform="translate(800, 200)">
    ${awayLogo ? `<image href="${awayLogo}" width="200" height="200" />` : 
    `<circle cx="100" cy="100" r="80" fill="rgba(255,255,255,0.2)" />
     <text x="100" y="115" font-size="48" fill="white" text-anchor="middle" font-family="Arial, sans-serif">${awayTeam.charAt(0)}</text>`}
  </g>
  <text x="900" y="450" font-size="32" fill="white" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold">${awayTeam}</text>
  
  <!-- 하단 브랜딩 -->
  <text x="600" y="580" font-size="28" fill="rgba(255,255,255,0.5)" text-anchor="middle" font-family="Arial, sans-serif">TrendSoccer</text>
  
  <!-- MATCH PREVIEW 뱃지 -->
  <rect x="480" y="50" width="240" height="40" rx="20" fill="rgba(255,255,255,0.2)"/>
  <text x="600" y="78" font-size="18" fill="white" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold">MATCH PREVIEW</text>
</svg>`;
  
  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
