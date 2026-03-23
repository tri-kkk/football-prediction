// 🔥 리그 정보 (50개 - 아프리카 추가!)
export const LEAGUES = [
  // 전체
  { 
    code: 'ALL', 
    name: '전체',
    nameEn: 'All Leagues',
    flag: '🌍',
    logo: '🌍',
    isEmoji: true
  },
  
  // ===== 🏆 국제대회 (7개) =====
  { code: 'CL', name: '챔피언스리그', nameEn: 'Champions League', flag: 'https://flagcdn.com/w40/eu.png', logo: 'https://media.api-sports.io/football/leagues/2.png', isEmoji: false },
  { code: 'EL', name: '유로파리그', nameEn: 'Europa League', flag: 'https://flagcdn.com/w40/eu.png', logo: 'https://media.api-sports.io/football/leagues/3.png', isEmoji: false },
  { code: 'UECL', name: 'UEFA 컨퍼런스리그', nameEn: 'UEFA Conference League', flag: 'https://flagcdn.com/w40/eu.png', logo: 'https://media.api-sports.io/football/leagues/848.png', isEmoji: false },
  { code: 'UNL', name: 'UEFA 네이션스리그', nameEn: 'UEFA Nations League', flag: 'https://flagcdn.com/w40/eu.png', logo: 'https://media.api-sports.io/football/leagues/5.png', isEmoji: false },
  { code: 'COP', name: '코파 리베르타도레스', nameEn: 'Copa Libertadores', flag: 'https://flagcdn.com/w40/br.png', logo: 'https://media.api-sports.io/football/leagues/13.png', isEmoji: false },
  { code: 'COS', name: '코파 수다메리카나', nameEn: 'Copa Sudamericana', flag: 'https://flagcdn.com/w40/ar.png', logo: 'https://media.api-sports.io/football/leagues/11.png', isEmoji: false },
  { code: 'AFCON', name: '아프리카 네이션스컵', nameEn: 'Africa Cup of Nations', flag: 'https://img.icons8.com/color/48/africa.png', logo: 'https://media.api-sports.io/football/leagues/6.png', isEmoji: false },
  { code: 'ACL', name: 'AFC 챔피언스리그', nameEn: 'AFC Champions League Elite', flag: 'https://flagcdn.com/w40/kr.png', logo: 'https://media.api-sports.io/football/leagues/17.png', isEmoji: false },
  { code: 'ACL2', name: 'AFC 챔피언스리그2', nameEn: 'AFC Champions League Two', flag: 'https://flagcdn.com/w40/kr.png', logo: 'https://media.api-sports.io/football/leagues/18.png', isEmoji: false },
  { code: 'AMATCH', name: '국제 A매치', nameEn: 'International', flag: 'https://img.icons8.com/color/48/globe--v1.png', logo: 'https://media.api-sports.io/football/leagues/10.png', isEmoji: false },
  
  // ===== 🌍 아프리카 리그 (5개) =====
  { code: 'EGY', name: '이집트 프리미어리그', nameEn: 'Egyptian Premier League', flag: 'https://flagcdn.com/w40/eg.png', logo: 'https://media.api-sports.io/football/leagues/233.png', isEmoji: false },
  { code: 'RSA', name: '남아공 프리미어리그', nameEn: 'South African Premier League', flag: 'https://flagcdn.com/w40/za.png', logo: 'https://media.api-sports.io/football/leagues/288.png', isEmoji: false },
  { code: 'MAR', name: '모로코 보톨라', nameEn: 'Botola Pro', flag: 'https://flagcdn.com/w40/ma.png', logo: 'https://media.api-sports.io/football/leagues/200.png', isEmoji: false },
  { code: 'DZA', name: '알제리 리그1', nameEn: 'Ligue 1 Algeria', flag: 'https://flagcdn.com/w40/dz.png', logo: 'https://media.api-sports.io/football/leagues/187.png', isEmoji: false },
  { code: 'TUN', name: '튀니지 리그1', nameEn: 'Ligue 1 Tunisia', flag: 'https://flagcdn.com/w40/tn.png', logo: 'https://media.api-sports.io/football/leagues/202.png', isEmoji: false },
  
  // ===== 🏴󠁧󠁢󠁥󠁮󠁧󠁿 잉글랜드 (4개) =====
  { code: 'PL', name: '프리미어리그', nameEn: 'Premier League', flag: 'https://flagcdn.com/w40/gb-eng.png', logo: 'https://media.api-sports.io/football/leagues/39.png', isEmoji: false },
  { code: 'ELC', name: '챔피언십', nameEn: 'Championship', flag: 'https://flagcdn.com/w40/gb-eng.png', logo: 'https://media.api-sports.io/football/leagues/40.png', isEmoji: false },
  { code: 'FAC', name: 'FA컵', nameEn: 'FA Cup', flag: 'https://flagcdn.com/w40/gb-eng.png', logo: 'https://media.api-sports.io/football/leagues/45.png', isEmoji: false },
  { code: 'EFL', name: 'EFL컵', nameEn: 'EFL Cup', flag: 'https://flagcdn.com/w40/gb-eng.png', logo: 'https://media.api-sports.io/football/leagues/48.png', isEmoji: false },
  
  // ===== 🇪🇸 스페인 (3개) =====
  { code: 'PD', name: '라리가', nameEn: 'La Liga', flag: 'https://flagcdn.com/w40/es.png', logo: 'https://media.api-sports.io/football/leagues/140.png', isEmoji: false },
  { code: 'SD', name: '라리가2', nameEn: 'La Liga 2', flag: 'https://flagcdn.com/w40/es.png', logo: 'https://media.api-sports.io/football/leagues/141.png', isEmoji: false },
  { code: 'CDR', name: '코파델레이', nameEn: 'Copa del Rey', flag: 'https://flagcdn.com/w40/es.png', logo: 'https://media.api-sports.io/football/leagues/143.png', isEmoji: false },
  
  // ===== 🇩🇪 독일 (3개) =====
  { code: 'BL1', name: '분데스리가', nameEn: 'Bundesliga', flag: 'https://flagcdn.com/w40/de.png', logo: 'https://media.api-sports.io/football/leagues/78.png', isEmoji: false },
  { code: 'BL2', name: '분데스리가2', nameEn: 'Bundesliga 2', flag: 'https://flagcdn.com/w40/de.png', logo: 'https://media.api-sports.io/football/leagues/79.png', isEmoji: false },
  { code: 'DFB', name: 'DFB포칼', nameEn: 'DFB Pokal', flag: 'https://flagcdn.com/w40/de.png', logo: 'https://media.api-sports.io/football/leagues/81.png', isEmoji: false },
  
  // ===== 🇮🇹 이탈리아 (3개) =====
  { code: 'SA', name: '세리에A', nameEn: 'Serie A', flag: 'https://flagcdn.com/w40/it.png', logo: 'https://media.api-sports.io/football/leagues/135.png', isEmoji: false },
  { code: 'SB', name: '세리에B', nameEn: 'Serie B', flag: 'https://flagcdn.com/w40/it.png', logo: 'https://media.api-sports.io/football/leagues/136.png', isEmoji: false },
  { code: 'CIT', name: '코파이탈리아', nameEn: 'Coppa Italia', flag: 'https://flagcdn.com/w40/it.png', logo: 'https://media.api-sports.io/football/leagues/137.png', isEmoji: false },
  
  // ===== 🇫🇷 프랑스 (3개) =====
  { code: 'FL1', name: '리그1', nameEn: 'Ligue 1', flag: 'https://flagcdn.com/w40/fr.png', logo: 'https://media.api-sports.io/football/leagues/61.png', isEmoji: false },
  { code: 'FL2', name: '리그2', nameEn: 'Ligue 2', flag: 'https://flagcdn.com/w40/fr.png', logo: 'https://media.api-sports.io/football/leagues/62.png', isEmoji: false },
  { code: 'CDF', name: '쿠프드프랑스', nameEn: 'Coupe de France', flag: 'https://flagcdn.com/w40/fr.png', logo: 'https://media.api-sports.io/football/leagues/66.png', isEmoji: false },
  
  // ===== 🇵🇹 포르투갈 (2개) =====
  { code: 'PPL', name: '프리메이라리가', nameEn: 'Primeira Liga', flag: 'https://flagcdn.com/w40/pt.png', logo: 'https://media.api-sports.io/football/leagues/94.png', isEmoji: false },
  { code: 'TDP', name: '타사드포르투갈', nameEn: 'Taça de Portugal', flag: 'https://flagcdn.com/w40/pt.png', logo: 'https://media.api-sports.io/football/leagues/96.png', isEmoji: false },
  
  // ===== 🇳🇱 네덜란드 (2개) =====
  { code: 'DED', name: '에레디비시', nameEn: 'Eredivisie', flag: 'https://flagcdn.com/w40/nl.png', logo: 'https://media.api-sports.io/football/leagues/88.png', isEmoji: false },
  { code: 'KNV', name: 'KNVB컵', nameEn: 'KNVB Cup', flag: 'https://flagcdn.com/w40/nl.png', logo: 'https://media.api-sports.io/football/leagues/90.png', isEmoji: false },
  
  // ===== 🇹🇷 터키 (1개) =====
  { code: 'TSL', name: '쉬페르리그', nameEn: 'Süper Lig', flag: 'https://flagcdn.com/w40/tr.png', logo: 'https://media.api-sports.io/football/leagues/203.png', isEmoji: false },
  
  // ===== 🇧🇪 벨기에 (1개) =====
  { code: 'JPL', name: '주필러 프로리그', nameEn: 'Jupiler Pro League', flag: 'https://flagcdn.com/w40/be.png', logo: 'https://media.api-sports.io/football/leagues/144.png', isEmoji: false },
  
  // ===== 🏴󠁧󠁢󠁳󠁣󠁴󠁿 스코틀랜드 (1개) =====
  { code: 'SPL', name: '스코티시 프리미어십', nameEn: 'Scottish Premiership', flag: 'https://flagcdn.com/w40/gb-sct.png', logo: 'https://media.api-sports.io/football/leagues/179.png', isEmoji: false },
  
  // ===== 🇨🇭 스위스 (1개) =====
  { code: 'SSL', name: '스위스 슈퍼리그', nameEn: 'Swiss Super League', flag: 'https://flagcdn.com/w40/ch.png', logo: 'https://media.api-sports.io/football/leagues/207.png', isEmoji: false },
  
  // ===== 🇦🇹 오스트리아 (1개) =====
  { code: 'ABL', name: '오스트리아 분데스리가', nameEn: 'Austrian Bundesliga', flag: 'https://flagcdn.com/w40/at.png', logo: 'https://media.api-sports.io/football/leagues/218.png', isEmoji: false },
  
  // ===== 🇬🇷 그리스 (1개) =====
  { code: 'GSL', name: '그리스 슈퍼리그', nameEn: 'Super League Greece', flag: 'https://flagcdn.com/w40/gr.png', logo: 'https://media.api-sports.io/football/leagues/197.png', isEmoji: false },
  
  // ===== 🇩🇰 덴마크 (1개) =====
  { code: 'DSL', name: '덴마크 슈퍼리가', nameEn: 'Danish Superliga', flag: 'https://flagcdn.com/w40/dk.png', logo: 'https://media.api-sports.io/football/leagues/119.png', isEmoji: false },
  
  // ===== 🇰🇷 한국 (2개) =====
  { code: 'KL1', name: 'K리그1', nameEn: 'K League 1', flag: 'https://flagcdn.com/w40/kr.png', logo: 'https://media.api-sports.io/football/leagues/292.png', isEmoji: false },
  { code: 'KL2', name: 'K리그2', nameEn: 'K League 2', flag: 'https://flagcdn.com/w40/kr.png', logo: 'https://media.api-sports.io/football/leagues/293.png', isEmoji: false },
  
  // ===== 🇯🇵 일본 (2개) =====
  { code: 'J1', name: 'J1리그', nameEn: 'J1 League', flag: 'https://flagcdn.com/w40/jp.png', logo: 'https://media.api-sports.io/football/leagues/98.png', isEmoji: false },
  { code: 'J2', name: 'J2리그', nameEn: 'J2 League', flag: 'https://flagcdn.com/w40/jp.png', logo: 'https://media.api-sports.io/football/leagues/99.png', isEmoji: false },
  
  // ===== 🇸🇦 사우디아라비아 (1개) =====
  { code: 'SAL', name: '사우디 프로리그', nameEn: 'Saudi Pro League', flag: 'https://flagcdn.com/w40/sa.png', logo: 'https://media.api-sports.io/football/leagues/307.png', isEmoji: false },
  
  // ===== 🇦🇺 호주 (1개) =====
  { code: 'ALG', name: 'A리그', nameEn: 'A-League', flag: 'https://flagcdn.com/w40/au.png', logo: 'https://media.api-sports.io/football/leagues/188.png', isEmoji: false },
  
  // ===== 🇨🇳 중국 (1개) =====
  { code: 'CSL', name: '중국 슈퍼리그', nameEn: 'Chinese Super League', flag: 'https://flagcdn.com/w40/cn.png', logo: 'https://media.api-sports.io/football/leagues/169.png', isEmoji: false },
  
  // ===== 🇧🇷 브라질 (1개) =====
  { code: 'BSA', name: '브라질레이랑', nameEn: 'Brasileirão', flag: 'https://flagcdn.com/w40/br.png', logo: 'https://media.api-sports.io/football/leagues/71.png', isEmoji: false },
  
  // ===== 🇦🇷 아르헨티나 (1개) =====
  { code: 'ARG', name: '아르헨티나 프리메라', nameEn: 'Liga Profesional', flag: 'https://flagcdn.com/w40/ar.png', logo: 'https://media.api-sports.io/football/leagues/128.png', isEmoji: false },
  
  // ===== 🇺🇸 미국 (1개) =====
  { code: 'MLS', name: 'MLS', nameEn: 'MLS', flag: 'https://flagcdn.com/w40/us.png', logo: 'https://media.api-sports.io/football/leagues/253.png', isEmoji: false },
  
  // ===== 🇲🇽 멕시코 (1개) =====
  { code: 'LMX', name: '리가 MX', nameEn: 'Liga MX', flag: 'https://flagcdn.com/w40/mx.png', logo: 'https://media.api-sports.io/football/leagues/262.png', isEmoji: false },
]

// 🔥 대륙별 계층형 리그 그룹
export const LEAGUE_GROUPS = [
  // 전체
  {
    id: 'all',
    region: '전체',
    regionEn: 'All',
    flag: '',
    leagues: [
      { code: 'ALL', name: '전체 리그', nameEn: 'All Leagues', logo: 'https://cdn-icons-png.flaticon.com/512/44/44386.png' }
    ]
  },
  
  // 국제대회
  {
    id: 'international',
    region: '국제대회',
    regionEn: 'International',
    flag: '',
    leagues: [
      { code: 'CL', name: '챔피언스리그', nameEn: 'Champions League', logo: 'https://media.api-sports.io/football/leagues/2.png' },
      { code: 'EL', name: '유로파리그', nameEn: 'Europa League', logo: 'https://media.api-sports.io/football/leagues/3.png' },
      { code: 'UECL', name: '컨퍼런스리그', nameEn: 'Conference League', logo: 'https://media.api-sports.io/football/leagues/848.png' },
      { code: 'UNL', name: '네이션스리그', nameEn: 'Nations League', logo: 'https://media.api-sports.io/football/leagues/5.png' },
      { code: 'AMATCH', name: 'A매치', nameEn: 'International', logo: 'https://media.api-sports.io/football/leagues/10.png' },
      { code: 'COP', name: '코파 리베르타도레스', nameEn: 'Copa Libertadores', logo: 'https://media.api-sports.io/football/leagues/13.png' },
      { code: 'COS', name: '코파 수다메리카나', nameEn: 'Copa Sudamericana', logo: 'https://media.api-sports.io/football/leagues/11.png' },
      { code: 'ACL', name: 'AFC 챔피언스리그', nameEn: 'ACL Elite', logo: 'https://media.api-sports.io/football/leagues/17.png' },
      { code: 'ACL2', name: 'AFC 챔피언스리그2', nameEn: 'ACL Two', logo: 'https://media.api-sports.io/football/leagues/18.png' },
      { code: 'AFCON', name: '아프리카 네이션스컵', nameEn: 'AFCON', logo: 'https://media.api-sports.io/football/leagues/6.png' },
    ]
  },
  
  // 아시아
  {
    id: 'asia',
    region: '아시아',
    regionEn: 'Asia',
    flag: '',
    leagues: [
      { code: 'KL1', name: 'K리그1', nameEn: 'K League 1', logo: 'https://media.api-sports.io/football/leagues/292.png' },
      { code: 'KL2', name: 'K리그2', nameEn: 'K League 2', logo: 'https://media.api-sports.io/football/leagues/293.png' },
      { code: 'J1', name: 'J1리그', nameEn: 'J1 League', logo: 'https://media.api-sports.io/football/leagues/98.png' },
      { code: 'J2', name: 'J2리그', nameEn: 'J2 League', logo: 'https://media.api-sports.io/football/leagues/99.png' },
      { code: 'SAL', name: '사우디 프로리그', nameEn: 'Saudi Pro League', logo: 'https://media.api-sports.io/football/leagues/307.png' },
      { code: 'CSL', name: '중국 슈퍼리그', nameEn: 'Chinese Super League', logo: 'https://media.api-sports.io/football/leagues/169.png' },
      { code: 'ALG', name: 'A리그', nameEn: 'A-League', logo: 'https://media.api-sports.io/football/leagues/188.png' },
    ]
  },
  
  // 아프리카
  {
    id: 'africa',
    region: '아프리카',
    regionEn: 'Africa',
    flag: '',
    leagues: [
      { code: 'EGY', name: '이집트', nameEn: 'Egypt', logo: 'https://media.api-sports.io/football/leagues/233.png' },
      { code: 'RSA', name: '남아공', nameEn: 'South Africa', logo: 'https://media.api-sports.io/football/leagues/288.png' },
      { code: 'MAR', name: '모로코', nameEn: 'Morocco', logo: 'https://media.api-sports.io/football/leagues/200.png' },
      { code: 'DZA', name: '알제리', nameEn: 'Algeria', logo: 'https://media.api-sports.io/football/leagues/187.png' },
      { code: 'TUN', name: '튀니지', nameEn: 'Tunisia', logo: 'https://media.api-sports.io/football/leagues/202.png' },
    ]
  },
  
  // 잉글랜드
  {
    id: 'england',
    region: '잉글랜드',
    regionEn: 'England',
    flag: '',
    leagues: [
      { code: 'PL', name: '프리미어리그', nameEn: 'Premier League', logo: 'https://media.api-sports.io/football/leagues/39.png' },
      { code: 'ELC', name: '챔피언십', nameEn: 'Championship', logo: 'https://media.api-sports.io/football/leagues/40.png' },
      { code: 'FAC', name: 'FA컵', nameEn: 'FA Cup', logo: 'https://media.api-sports.io/football/leagues/45.png' },
      { code: 'EFL', name: 'EFL컵', nameEn: 'EFL Cup', logo: 'https://media.api-sports.io/football/leagues/48.png' },
    ]
  },
  
  // 스페인
  {
    id: 'spain',
    region: '스페인',
    regionEn: 'Spain',
    flag: '',
    leagues: [
      { code: 'PD', name: '라리가', nameEn: 'La Liga', logo: 'https://media.api-sports.io/football/leagues/140.png' },
      { code: 'SD', name: '라리가2', nameEn: 'La Liga 2', logo: 'https://media.api-sports.io/football/leagues/141.png' },
      { code: 'CDR', name: '코파델레이', nameEn: 'Copa del Rey', logo: 'https://media.api-sports.io/football/leagues/143.png' },
    ]
  },
  
  // 독일
  {
    id: 'germany',
    region: '독일',
    regionEn: 'Germany',
    flag: '',
    leagues: [
      { code: 'BL1', name: '분데스리가', nameEn: 'Bundesliga', logo: 'https://media.api-sports.io/football/leagues/78.png' },
      { code: 'BL2', name: '분데스리가2', nameEn: 'Bundesliga 2', logo: 'https://media.api-sports.io/football/leagues/79.png' },
      { code: 'DFB', name: 'DFB포칼', nameEn: 'DFB Pokal', logo: 'https://media.api-sports.io/football/leagues/81.png' },
    ]
  },
  
  // 이탈리아
  {
    id: 'italy',
    region: '이탈리아',
    regionEn: 'Italy',
    flag: '',
    leagues: [
      { code: 'SA', name: '세리에A', nameEn: 'Serie A', logo: 'https://media.api-sports.io/football/leagues/135.png' },
      { code: 'SB', name: '세리에B', nameEn: 'Serie B', logo: 'https://media.api-sports.io/football/leagues/136.png' },
      { code: 'CIT', name: '코파이탈리아', nameEn: 'Coppa Italia', logo: 'https://media.api-sports.io/football/leagues/137.png' },
    ]
  },
  
  // 프랑스
  {
    id: 'france',
    region: '프랑스',
    regionEn: 'France',
    flag: '',
    leagues: [
      { code: 'FL1', name: '리그1', nameEn: 'Ligue 1', logo: 'https://media.api-sports.io/football/leagues/61.png' },
      { code: 'FL2', name: '리그2', nameEn: 'Ligue 2', logo: 'https://media.api-sports.io/football/leagues/62.png' },
      { code: 'CDF', name: '쿠프드프랑스', nameEn: 'Coupe de France', logo: 'https://media.api-sports.io/football/leagues/66.png' },
    ]
  },
  
  // 기타 유럽
  {
    id: 'europe_other',
    region: '기타 유럽',
    regionEn: 'Other Europe',
    flag: '',
    leagues: [
      { code: 'PPL', name: '포르투갈', nameEn: 'Primeira Liga', logo: 'https://media.api-sports.io/football/leagues/94.png' },
      { code: 'DED', name: '에레디비시', nameEn: 'Eredivisie', logo: 'https://media.api-sports.io/football/leagues/88.png' },
      { code: 'TSL', name: '터키', nameEn: 'Süper Lig', logo: 'https://media.api-sports.io/football/leagues/203.png' },
      { code: 'JPL', name: '벨기에', nameEn: 'Jupiler Pro', logo: 'https://media.api-sports.io/football/leagues/144.png' },
      { code: 'SPL', name: '스코틀랜드', nameEn: 'Scottish Prem', logo: 'https://media.api-sports.io/football/leagues/179.png' },
      { code: 'SSL', name: '스위스', nameEn: 'Swiss Super', logo: 'https://media.api-sports.io/football/leagues/207.png' },
      { code: 'ABL', name: '오스트리아', nameEn: 'Austrian BL', logo: 'https://media.api-sports.io/football/leagues/218.png' },
      { code: 'GSL', name: '그리스', nameEn: 'Super League', logo: 'https://media.api-sports.io/football/leagues/197.png' },
      { code: 'DSL', name: '덴마크', nameEn: 'Superliga', logo: 'https://media.api-sports.io/football/leagues/119.png' },
    ]
  },
  
  // 아메리카
  {
    id: 'americas',
    region: '아메리카',
    regionEn: 'Americas',
    flag: '',
    leagues: [
      { code: 'BSA', name: '브라질', nameEn: 'Brasileirão', logo: 'https://media.api-sports.io/football/leagues/71.png' },
      { code: 'ARG', name: '아르헨티나', nameEn: 'Liga Profesional', logo: 'https://media.api-sports.io/football/leagues/128.png' },
      { code: 'MLS', name: 'MLS', nameEn: 'MLS', logo: 'https://media.api-sports.io/football/leagues/253.png' },
      { code: 'LMX', name: '멕시코', nameEn: 'Liga MX', logo: 'https://media.api-sports.io/football/leagues/262.png' },
    ]
  },
]

// 🔥 오즈 데이터가 있는 리그 (50개 전체)
export const LEAGUES_WITH_ODDS = [
  'ALL',
  // 국제대회
  'CL', 'EL', 'UECL', 'UNL', 'COP', 'COS', 'AFCON', 'ACL', 'ACL2', 'AMATCH',
  // 아프리카
  'EGY', 'RSA', 'MAR', 'DZA', 'TUN',
  // 잉글랜드
  'PL', 'ELC', 'FAC', 'EFL',
  // 스페인
  'PD', 'SD', 'CDR',
  // 독일
  'BL1', 'BL2', 'DFB',
  // 이탈리아
  'SA', 'SB', 'CIT',
  // 프랑스
  'FL1', 'FL2', 'CDF',
  // 포르투갈/네덜란드
  'PPL', 'TDP', 'DED', 'KNV',
  // 기타 유럽
  'TSL', 'JPL', 'SPL', 'SSL', 'ABL', 'GSL', 'DSL',
  // 아시아
  'KL1', 'KL2', 'J1', 'J2', 'SAL', 'ALG', 'CSL',
  // 아메리카
  'BSA', 'ARG', 'MLS', 'LMX',
]

// 🔧 헬퍼 함수: 리그 코드로 리그 정보 가져오기
export function getLeagueByCode(code: string) {
  return LEAGUES.find(league => league.code === code)
}

// 타입 정의
export interface League {
  code: string
  name: string
  nameEn: string
  flag?: string
  logo: string
  isEmoji?: boolean
}

export interface LeagueGroup {
  id: string
  region: string
  regionEn: string
  flag: string
  leagues: { code: string; name: string; nameEn: string; logo: string }[]
}