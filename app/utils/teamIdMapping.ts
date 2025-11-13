// ============================================
// teamIdMapping.ts
// ============================================
// Football-Data.org 팀 이름 → API-Football 팀 ID 매핑

export const TEAM_ID_MAPPING: { [key: string]: number } = {
  // ===== Premier League =====
  'Arsenal': 42,
  'Aston Villa': 66,
  'Bournemouth': 35,
  'Brentford': 55,
  'Brighton & Hove Albion': 51,
  'Brighton': 51,
  'Chelsea': 49,
  'Crystal Palace': 52,
  'Everton': 45,
  'Fulham': 36,
  'Ipswich Town': 57,
  'Leicester City': 46,
  'Liverpool': 40,
  'Manchester City': 50,
  'Manchester United': 33,
  'Newcastle United': 34,
  'Nottingham Forest': 65,
  'Southampton': 41,
  'Tottenham Hotspur': 47,
  'Tottenham': 47,
  'West Ham United': 48,
  'Wolverhampton Wanderers': 39,
  'Wolves': 39,

  // ===== La Liga =====
  'Athletic Bilbao': 531,
  'Athletic Club': 531,
  'Atletico Madrid': 530,
  'Barcelona': 529,
  'Real Madrid': 541,
  'Valencia': 532,
  'Sevilla': 536,
  'Real Betis': 543,
  'Real Sociedad': 548,
  'Villarreal': 533,
  'Getafe': 546,
  'Osasuna': 727,
  'Celta Vigo': 538,
  'Girona': 547,
  'Rayo Vallecano': 728,
  'Mallorca': 798,
  'Las Palmas': 815,
  'Alaves': 542,
  'Espanyol': 540,
  'Leganes': 729,
  'Valladolid': 720,

  // ===== Bundesliga =====
  'Bayern Munich': 157,
  'Bayern München': 157,
  'Borussia Dortmund': 165,
  'RB Leipzig': 173,
  'Bayer Leverkusen': 168,
  'Eintracht Frankfurt': 169,
  'VfL Wolfsburg': 178,
  'SC Freiburg': 160,
  'Borussia Mönchengladbach': 163,
  'Hoffenheim': 164,
  '1899 Hoffenheim': 164,
  'VfB Stuttgart': 174,
  'Stuttgart': 174,
  'Mainz 05': 175,
  'FSV Mainz 05': 175,
  'Werder Bremen': 162,
  'FC Augsburg': 170,
  'Union Berlin': 182,
  'FC Heidenheim': 183,
  'VfL Bochum': 161,
  'FC St. Pauli': 184,
  'Holstein Kiel': 185,

  // ===== Serie A =====
  'Inter': 505,
  'AC Milan': 489,
  'Juventus': 496,
  'Napoli': 492,
  'Lazio': 487,
  'Roma': 497,
  'Atalanta': 499,
  'Fiorentina': 502,
  'Torino': 503,
  'Bologna': 500,
  'Udinese': 494,
  'Cagliari': 490,
  'Empoli': 511,
  'Verona': 504,
  'Hellas Verona': 504,
  'Lecce': 867,
  'Parma': 488,
  'Como': 510,
  'Venezia': 517,
  'Genoa': 495,
  'Monza': 1579,

  // ===== Ligue 1 =====
  'Paris Saint Germain': 85,
  'PSG': 85,
  'Marseille': 81,
  'Monaco': 91,
  'Lille': 79,
  'Lyon': 80,
  'Nice': 82,
  'Lens': 116,
  'Rennes': 94,
  'Reims': 547,
  'Strasbourg': 576,
  'Montpellier': 87,
  'Nantes': 83,
  'Brest': 576,
  'Toulouse': 96,
  'Auxerre': 106,
  'Angers': 71,
  'Le Havre': 74,
  'Saint-Etienne': 1063,

  // ===== Champions League 추가 팀들 =====
  'Benfica': 211,
  'Club Brugge': 217,
  'Shakhtar Donetsk': 234,
  'Feyenoord': 73,
  'Sporting CP': 228,
  'PSV': 142,
  'Dinamo Zagreb': 467,
  'Celtic': 247,
  'Red Star Belgrade': 236,
  'Crvena Zvezda': 236,
  'Salzburg': 196,
  'Sturm Graz': 264,
  'Young Boys': 192,
  'Slovan Bratislava': 263,
  'Sparta Prague': 262,
}

// 팀 이름 정규화 함수
export function normalizeTeamName(teamName: string): string {
  return teamName
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/FC\s*/gi, '')
    .replace(/\d{4}\s*/g, '') // 1899 같은 숫자 제거
}

// 팀 ID 가져오기 (폴백 포함)
export function getTeamId(teamName: string): number | undefined {
  // 1. 정확한 매칭
  if (TEAM_ID_MAPPING[teamName]) {
    return TEAM_ID_MAPPING[teamName]
  }

  // 2. 정규화 후 매칭
  const normalized = normalizeTeamName(teamName)
  for (const [key, id] of Object.entries(TEAM_ID_MAPPING)) {
    if (normalizeTeamName(key) === normalized) {
      return id
    }
  }

  // 3. 부분 매칭 (마지막 수단)
  for (const [key, id] of Object.entries(TEAM_ID_MAPPING)) {
    if (key.toLowerCase().includes(teamName.toLowerCase()) ||
        teamName.toLowerCase().includes(key.toLowerCase())) {
      return id
    }
  }

  // 없으면 undefined 반환
  console.warn(`⚠️ Team ID not found for: ${teamName}`)
  return undefined
}

// 사용 예시:
// const homeTeamId = getTeamId(match.home_team)
// const awayTeamId = getTeamId(match.away_team)