// lib/baseball_teams.ts
// 야구 팀 한글 매핑 (MLB, KBO, NPB, CPBL)

export const baseballTeamNames: Record<string, string> = {
  // ========== MLB (메이저리그) ==========
  
  // American League East
  'Baltimore Orioles': '볼티모어 오리올스',
  'Boston Red Sox': '보스턴 레드삭스',
  'New York Yankees': '뉴욕 양키스',
  'Tampa Bay Rays': '탬파베이 레이스',
  'Toronto Blue Jays': '토론토 블루제이스',

  // American League Central
  'Chicago White Sox': '시카고 화이트삭스',
  'Cleveland Guardians': '클리블랜드 가디언스',
  'Detroit Tigers': '디트로이트 타이거스',
  'Kansas City Royals': '캔자스시티 로열스',
  'Minnesota Twins': '미네소타 트윈스',

  // American League West
  'Houston Astros': '휴스턴 애스트로스',
  'Los Angeles Angels': 'LA 에인절스',
  'Oakland Athletics': '오클랜드 애슬레틱스',
  'Athletics': '오클랜드 애슬레틱스',
  'Seattle Mariners': '시애틀 매리너스',
  'Texas Rangers': '텍사스 레인저스',

  // National League East
  'Atlanta Braves': '애틀랜타 브레이브스',
  'Miami Marlins': '마이애미 말린스',
  'New York Mets': '뉴욕 메츠',
  'Philadelphia Phillies': '필라델피아 필리스',
  'Washington Nationals': '워싱턴 내셔널스',

  // National League Central
  'Chicago Cubs': '시카고 컵스',
  'Cincinnati Reds': '신시내티 레즈',
  'Milwaukee Brewers': '밀워키 브루어스',
  'Pittsburgh Pirates': '피츠버그 파이리츠',
  'St.Louis Cardinals': '세인트루이스 카디널스',
  'St. Louis Cardinals': '세인트루이스 카디널스',

  // National League West
  'Arizona Diamondbacks': '애리조나 다이아몬드백스',
  'Colorado Rockies': '콜로라도 로키스',
  'Los Angeles Dodgers': 'LA 다저스',
  'San Diego Padres': '샌디에이고 파드리스',
  'San Francisco Giants': '샌프란시스코 자이언츠',

  // ========== KBO (한국 프로야구) ==========
  
  'KIA Tigers': 'KIA 타이거즈',
  'Samsung Lions': '삼성 라이온즈',
  'LG Twins': 'LG 트윈스',
  'Doosan Bears': '두산 베어스',
  'KT Wiz': 'KT 위즈',
  'SSG Landers': 'SSG 랜더스',
  'Lotte Giants': '롯데 자이언츠',
  'Hanwha Eagles': '한화 이글스',
  'NC Dinos': 'NC 다이노스',
  'Kiwoom Heroes': '키움 히어로즈',

  // ========== NPB (일본 프로야구) ==========
  
  // Central League (센트럴 리그)
  'Yomiuri Giants': '요미우리 자이언츠',
  'Hanshin Tigers': '한신 타이거스',
  'Chunichi Dragons': '주니치 드래곤즈',
  'Hiroshima Toyo Carp': '히로시마 카프',
  'Yakult Swallows': '야쿠르트 스왈로스',
  'Yokohama DeNA BayStars': '요코하마 베이스타즈',
  
  // Pacific League (퍼시픽 리그)
  'Fukuoka SoftBank Hawks': '소프트뱅크 호크스',
  'Orix Buffaloes': '오릭스 버팔로즈',
  'Tohoku Rakuten Golden Eagles': '라쿠텐 이글스',
  'Chiba Lotte Marines': '롯데 마린스',
  'Hokkaido Nippon-Ham Fighters': '닛폰햄 파이터즈',
  'Saitama Seibu Lions': '세이부 라이온즈',

  // ========== CPBL (대만 프로야구) ==========
  
  'CTBC Brothers': '중신 브라더스',
  'Rakuten Monkeys': '라쿠텐 몽키스',
  'Uni-President 7-Eleven Lions': '통일 라이온스',
  'Fubon Guardians': '푸방 가디언스',
  'Wei Chuan Dragons': '웨이촨 드래곤즈',
  'TSG Hawks': 'TSG 호크스',
}

// 단축명 매핑 (UI 표시용 - 모바일/카드뷰)
export const baseballTeamShortNames: Record<string, string> = {
  // ========== MLB ==========
  'Baltimore Orioles': '볼티모어',
  'Boston Red Sox': '보스턴',
  'New York Yankees': '양키스',
  'Tampa Bay Rays': '템파베이',
  'Toronto Blue Jays': '토론토',
  
  'Chicago White Sox': '화이트삭스',
  'Cleveland Guardians': '클리블랜드',
  'Detroit Tigers': '디트로이트',
  'Kansas City Royals': '캔자스',
  'Minnesota Twins': '미네소타',
  
  'Houston Astros': '휴스턴',
  'Los Angeles Angels': 'LA에인절스',
  'Oakland Athletics': '오클랜드',
  'Athletics': '애슬레틱스',
  'Seattle Mariners': '시애틀',
  'Texas Rangers': '텍사스',
  
  'Atlanta Braves': '애틀랜타',
  'Miami Marlins': '마이애미',
  'New York Mets': '메츠',
  'Philadelphia Phillies': '필라델피아',
  'Washington Nationals': '워싱턴',
  
  'Chicago Cubs': '컵스',
  'Cincinnati Reds': '신시내티',
  'Milwaukee Brewers': '밀워키',
  'Pittsburgh Pirates': '피츠버그',
  'St.Louis Cardinals': '세인트루이스',
  'St. Louis Cardinals': '세인트루이스',
  
  'Arizona Diamondbacks': '애리조나',
  'Colorado Rockies': '콜로라도',
  'Los Angeles Dodgers': 'LA다저스',
  'San Diego Padres': '샌디에이고',
  'San Francisco Giants': 'SF자이언츠',
  
  // ========== KBO ==========
  'KIA Tigers': 'KIA',
  'Samsung Lions': '삼성',
  'LG Twins': 'LG',
  'Doosan Bears': '두산',
  'KT Wiz': 'KT',
  'SSG Landers': 'SSG',
  'Lotte Giants': '롯데',
  'Hanwha Eagles': '한화',
  'NC Dinos': 'NC',
  'Kiwoom Heroes': '키움',
  
  // ========== NPB ==========
  'Yomiuri Giants': '요미우리',
  'Hanshin Tigers': '한신',
  'Chunichi Dragons': '주니치',
  'Hiroshima Toyo Carp': '히로시마',
  'Yakult Swallows': '야쿠르트',
  'Yokohama DeNA BayStars': '요코하마',
  
  'Fukuoka SoftBank Hawks': '소프트뱅크',
  'Orix Buffaloes': '오릭스',
  'Tohoku Rakuten Golden Eagles': '라쿠텐',
  'Chiba Lotte Marines': '롯데',
  'Hokkaido Nippon-Ham Fighters': '닛폰햄',
  'Saitama Seibu Lions': '세이부',
  
  // ========== CPBL ==========
  'CTBC Brothers': '중신',
  'Rakuten Monkeys': '몽키스',
  'Uni-President 7-Eleven Lions': '통일',
  'Fubon Guardians': '푸방',
  'Wei Chuan Dragons': '웨이촨',
  'TSG Hawks': 'TSG',
}

// 팀명 한글 변환 함수
export function getKoreanTeamName(englishName: string, short: boolean = false): string {
  if (short) {
    return baseballTeamShortNames[englishName] || baseballTeamNames[englishName] || englishName
  }
  return baseballTeamNames[englishName] || englishName
}

// 단축명만 가져오기
export function getShortTeamName(englishName: string): string {
  return baseballTeamShortNames[englishName] || englishName
}

// 역방향 매핑 (한글 → 영어)
export const baseballTeamNamesReverse: Record<string, string> = Object.entries(baseballTeamNames).reduce(
  (acc, [eng, kor]) => {
    acc[kor] = eng
    return acc
  },
  {} as Record<string, string>
)

// 영어 팀명 가져오기
export function getEnglishTeamName(koreanName: string): string {
  return baseballTeamNamesReverse[koreanName] || koreanName
}

// 리그별 팀 목록
export const leagueTeams = {
  MLB: [
    'Baltimore Orioles', 'Boston Red Sox', 'New York Yankees', 'Tampa Bay Rays', 'Toronto Blue Jays',
    'Chicago White Sox', 'Cleveland Guardians', 'Detroit Tigers', 'Kansas City Royals', 'Minnesota Twins',
    'Houston Astros', 'Los Angeles Angels', 'Oakland Athletics', 'Seattle Mariners', 'Texas Rangers',
    'Atlanta Braves', 'Miami Marlins', 'New York Mets', 'Philadelphia Phillies', 'Washington Nationals',
    'Chicago Cubs', 'Cincinnati Reds', 'Milwaukee Brewers', 'Pittsburgh Pirates', 'St.Louis Cardinals',
    'Arizona Diamondbacks', 'Colorado Rockies', 'Los Angeles Dodgers', 'San Diego Padres', 'San Francisco Giants'
  ],
  KBO: [
    'KIA Tigers', 'Samsung Lions', 'LG Twins', 'Doosan Bears', 'KT Wiz',
    'SSG Landers', 'Lotte Giants', 'Hanwha Eagles', 'NC Dinos', 'Kiwoom Heroes'
  ],
  NPB: [
    'Yomiuri Giants', 'Hanshin Tigers', 'Chunichi Dragons', 'Hiroshima Toyo Carp', 'Yakult Swallows', 'Yokohama DeNA BayStars',
    'Fukuoka SoftBank Hawks', 'Orix Buffaloes', 'Tohoku Rakuten Golden Eagles', 'Chiba Lotte Marines', 'Hokkaido Nippon-Ham Fighters', 'Saitama Seibu Lions'
  ],
  CPBL: [
    'CTBC Brothers', 'Rakuten Monkeys', 'Uni-President 7-Eleven Lions', 'Fubon Guardians', 'Wei Chuan Dragons', 'TSG Hawks'
  ]
}