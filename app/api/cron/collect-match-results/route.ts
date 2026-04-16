import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY!
const API_FOOTBALL_HOST = 'v3.football.api-sports.io'

// ============================================================
// 🔥 리그 설정 (52개 - ACL 추가!)
// ============================================================
const LEAGUES = [
  // ===== 🏆 국제 대회 =====
  { code: 'WC', apiId: 1, name: 'World Cup' },
  { code: 'CL', apiId: 2, name: 'Champions League' },
  { code: 'EL', apiId: 3, name: 'Europa League' },
  { code: 'UECL', apiId: 848, name: 'Conference League' },
  { code: 'UNL', apiId: 5, name: 'Nations League' },
  { code: 'AFCON', apiId: 6, name: 'Africa Cup of Nations' },
  { code: 'ACL', apiId: 17, name: 'AFC Champions League Elite' },
  { code: 'ACL2', apiId: 18, name: 'AFC Champions League Two' },
  
  // ===== 🌍 아프리카 리그 (5개) - NEW! =====
  { code: 'EGY', apiId: 233, name: 'Egyptian Premier League' },
  { code: 'RSA', apiId: 288, name: 'South African Premier League' },
  { code: 'MAR', apiId: 200, name: 'Botola Pro' },
  { code: 'DZA', apiId: 187, name: 'Ligue 1 Algeria' },
  { code: 'TUN', apiId: 202, name: 'Ligue 1 Tunisia' },
  
  // ===== 🏴󠁧󠁢󠁥󠁮󠁧󠁿 잉글랜드 (4개) =====
  { code: 'PL', apiId: 39, name: 'Premier League' },
  { code: 'ELC', apiId: 40, name: 'Championship' },
  { code: 'FAC', apiId: 45, name: 'FA Cup' },
  { code: 'EFL', apiId: 48, name: 'EFL Cup' },
  
  // ===== 🇪🇸 스페인 (3개) =====
  { code: 'PD', apiId: 140, name: 'La Liga' },
  { code: 'SD', apiId: 141, name: 'La Liga 2' },
  { code: 'CDR', apiId: 143, name: 'Copa del Rey' },
  
  // ===== 🇩🇪 독일 (3개) =====
  { code: 'BL1', apiId: 78, name: 'Bundesliga' },
  { code: 'BL2', apiId: 79, name: 'Bundesliga 2' },
  { code: 'DFB', apiId: 81, name: 'DFB Pokal' },
  
  // ===== 🇮🇹 이탈리아 (3개) =====
  { code: 'SA', apiId: 135, name: 'Serie A' },
  { code: 'SB', apiId: 136, name: 'Serie B' },
  { code: 'CIT', apiId: 137, name: 'Coppa Italia' },
  
  // ===== 🇫🇷 프랑스 (3개) =====
  { code: 'FL1', apiId: 61, name: 'Ligue 1' },
  { code: 'FL2', apiId: 62, name: 'Ligue 2' },
  { code: 'CDF', apiId: 66, name: 'Coupe de France' },
  
  // ===== 🇵🇹 포르투갈 (2개) =====
  { code: 'PPL', apiId: 94, name: 'Primeira Liga' },
  { code: 'TDP', apiId: 96, name: 'Taca de Portugal' },
  
  // ===== 🇳🇱 네덜란드 (2개) =====
  { code: 'DED', apiId: 88, name: 'Eredivisie' },
  { code: 'KNV', apiId: 90, name: 'KNVB Beker' },
  
  // ===== 🇰🇷 한국 (2개) =====
  { code: 'KL1', apiId: 292, name: 'K League 1' },
  { code: 'KL2', apiId: 293, name: 'K League 2' },
  
  // ===== 🇯🇵 일본 (2개) =====
  { code: 'J1', apiId: 98, name: 'J1 League' },
  { code: 'J2', apiId: 99, name: 'J2 League' },
  
  // ===== 🇸🇦 사우디아라비아 (1개) =====
  { code: 'SAL', apiId: 307, name: 'Saudi Pro League' },
  
  // ===== 🇦🇺 호주 (1개) =====
  { code: 'ALG', apiId: 188, name: 'A-League' },
  
  // ===== 🇨🇳 중국 (1개) =====
  { code: 'CSL', apiId: 169, name: 'Chinese Super League' },
  
  // ===== 🇹🇷 터키 (1개) =====
  { code: 'TSL', apiId: 203, name: 'Süper Lig' },
  
  // ===== 🇧🇪 벨기에 (1개) =====
  { code: 'JPL', apiId: 144, name: 'Jupiler Pro League' },
  
  // ===== 🏴󠁧󠁢󠁳󠁣󠁴󠁿 스코틀랜드 (1개) =====
  { code: 'SPL', apiId: 179, name: 'Scottish Premiership' },
  
  // ===== 🇨🇭 스위스 (1개) =====
  { code: 'SSL', apiId: 207, name: 'Swiss Super League' },
  
  // ===== 🇦🇹 오스트리아 (1개) =====
  { code: 'ABL', apiId: 218, name: 'Austrian Bundesliga' },
  
  // ===== 🇬🇷 그리스 (1개) =====
  { code: 'GSL', apiId: 197, name: 'Super League Greece' },
  
  // ===== 🇩🇰 덴마크 (1개) =====
  { code: 'DSL', apiId: 119, name: 'Danish Superliga' },
  
  // ===== 🇧🇷 브라질 (1개) =====
  { code: 'BSA', apiId: 71, name: 'Brasileirão Série A' },
  
  // ===== 🇦🇷 아르헨티나 (1개) =====
  { code: 'ARG', apiId: 128, name: 'Liga Profesional Argentina' },
  
  // ===== 🌎 남미 국제대회 (2개) =====
  { code: 'COP', apiId: 13, name: 'Copa Libertadores' },
  { code: 'COS', apiId: 11, name: 'Copa Sudamericana' },
  
  // ===== 🇺🇸 미국/멕시코 (2개) =====
  { code: 'MLS', apiId: 253, name: 'MLS' },
  { code: 'LMX', apiId: 262, name: 'Liga MX' },
]

// ============================================================
// 🌍 팀명 한글 매핑 (대폭 확장!)
// ============================================================
const TEAM_KR_MAP: { [key: string]: string } = {
  // ===== 프리미어리그 =====
  'Manchester City': '맨체스터 시티',
  'Liverpool': '리버풀',
  'Arsenal': '아스널',
  'Chelsea': '첼시',
  'Manchester United': '맨체스터 유나이티드',
  'Tottenham': '토트넘',
  'Tottenham Hotspur': '토트넘',
  'Newcastle': '뉴캐슬',
  'Newcastle United': '뉴캐슬',
  'Brighton': '브라이튼',
  'Brighton & Hove Albion': '브라이튼',
  'Aston Villa': '애스턴 빌라',
  'West Ham': '웨스트햄',
  'West Ham United': '웨스트햄',
  'Bournemouth': '본머스',
  'AFC Bournemouth': '본머스',
  'Fulham': '풀럼',
  'Wolves': '울버햄튼',
  'Wolverhampton Wanderers': '울버햄튼',
  'Crystal Palace': '크리스탈 팰리스',
  'Everton': '에버턴',
  'Brentford': '브렌트퍼드',
  'Nottingham Forest': '노팅엄 포레스트',
  'Burnley': '번리',
  'Sheffield Utd': '셰필드 유나이티드',
  'Sheffield United': '셰필드 유나이티드',
  'Luton': '루턴',
  'Luton Town': '루턴',
  'Ipswich': '입스위치',
  'Ipswich Town': '입스위치',
  'Leicester': '레스터',
  'Leicester City': '레스터',
  'Southampton': '사우샘프턴',
  
  // ===== 라리가 =====
  'Barcelona': '바르셀로나',
  'Real Madrid': '레알 마드리드',
  'Atletico Madrid': '아틀레티코 마드리드',
  'Real Sociedad': '레알 소시에다드',
  'Athletic Club': '아틀레틱 빌바오',
  'Athletic Bilbao': '아틀레틱 빌바오',
  'Real Betis': '레알 베티스',
  'Valencia': '발렌시아',
  'Villarreal': '비야레알',
  'Sevilla': '세비야',
  'Getafe': '헤타페',
  'Osasuna': '오사수나',
  'Celta Vigo': '셀타 비고',
  'Mallorca': '마요르카',
  'Las Palmas': '라스 팔마스',
  'Rayo Vallecano': '라요 바예카노',
  'Alaves': '알라베스',
  'Girona': '지로나',
  'Espanyol': '에스파뇰',
  'Leganes': '레가네스',
  'Valladolid': '바야돌리드',
  
  // ===== 분데스리가 =====
  'Bayern Munich': '바이에른 뮌헨',
  'Bayern München': '바이에른 뮌헨',
  'Borussia Dortmund': '도르트문트',
  'RB Leipzig': 'RB 라이프치히',
  'Bayer Leverkusen': '바이어 레버쿠젠',
  'Union Berlin': '우니온 베를린',
  'Freiburg': '프라이부르크',
  'SC Freiburg': '프라이부르크',
  'Eintracht Frankfurt': '프랑크푸르트',
  'VfL Wolfsburg': '볼프스부르크',
  'Wolfsburg': '볼프스부르크',
  'Borussia Monchengladbach': '묀헨글라트바흐',
  "Borussia M'gladbach": '묀헨글라트바흐',
  'FSV Mainz 05': '마인츠',
  'Mainz 05': '마인츠',
  '1899 Hoffenheim': '호펜하임',
  'Hoffenheim': '호펜하임',
  'Werder Bremen': '베르더 브레멘',
  'VfB Stuttgart': '슈투트가르트',
  'Stuttgart': '슈투트가르트',
  'FC Augsburg': '아우크스부르크',
  'Augsburg': '아우크스부르크',
  'FC Köln': '쾰른',
  'Köln': '쾰른',
  'Heidenheim': '하이덴하임',
  'Holstein Kiel': '홀슈타인 킬',
  'St. Pauli': '장크트 파울리',
  
  // ===== 세리에A =====
  'Inter': '인테르',
  'Inter Milan': '인테르',
  'AC Milan': 'AC 밀란',
  'Milan': 'AC 밀란',
  'Juventus': '유벤투스',
  'Napoli': '나폴리',
  'Lazio': '라치오',
  'Roma': '로마',
  'AS Roma': '로마',
  'Atalanta': '아탈란타',
  'Fiorentina': '피오렌티나',
  'Bologna': '볼로냐',
  'Torino': '토리노',
  'Monza': '몬차',
  'Udinese': '우디네세',
  'Sassuolo': '사수올로',
  'Empoli': '엠폴리',
  'Cagliari': '칼리아리',
  'Lecce': '레체',
  'Verona': '베로나',
  'Hellas Verona': '베로나',
  'Genoa': '제노아',
  'Frosinone': '프로시노네',
  'Salernitana': '살레르니타나',
  'Como': '코모',
  'Parma': '파르마',
  'Venezia': '베네치아',
  
  // ===== 리그1 =====
  'Paris Saint Germain': '파리 생제르맹',
  'Paris Saint-Germain': '파리 생제르맹',
  'PSG': '파리 생제르맹',
  'Marseille': '마르세유',
  'Olympique Marseille': '마르세유',
  'Monaco': '모나코',
  'AS Monaco': '모나코',
  'Lens': '랑스',
  'RC Lens': '랑스',
  'Lille': '릴',
  'LOSC Lille': '릴',
  'Nice': '니스',
  'OGC Nice': '니스',
  'Lyon': '리옹',
  'Olympique Lyon': '리옹',
  'Rennes': '렌',
  'Stade Rennais': '렌',
  'Strasbourg': '스트라스부르',
  'Nantes': '낭트',
  'Toulouse': '툴루즈',
  'Montpellier': '몽펠리에',
  'Brest': '브레스트',
  'Reims': '랭스',
  'Le Havre': '르아브르',
  'Metz': '메스',
  'Lorient': '로리앙',
  'Clermont': '클레르몽',
  
  // ===== 포르투갈 =====
  'Benfica': '벤피카',
  'Porto': '포르투',
  'FC Porto': '포르투',
  'Sporting CP': '스포르팅',
  'Sporting Lisbon': '스포르팅',
  'Braga': '브라가',
  'SC Braga': '브라가',
  
  // ===== 네덜란드 =====
  'Ajax': '아약스',
  'PSV Eindhoven': 'PSV',
  'PSV': 'PSV 에인트호번',
  'Feyenoord': '페예노르트',
  'AZ Alkmaar': 'AZ',
  'Twente': '트벤테',
  'FC Twente': '트벤테',
  
  // ===== 🇰🇷 K리그 =====
  'Ulsan Hyundai': '울산 HD',
  'Ulsan HD': '울산 HD',
  'Jeonbuk Motors': '전북 현대',
  'Jeonbuk Hyundai Motors': '전북 현대',
  'Pohang Steelers': '포항 스틸러스',
  'FC Seoul': 'FC 서울',
  'Suwon Bluewings': '수원 삼성',
  'Suwon Samsung Bluewings': '수원 삼성',
  'Daegu FC': '대구 FC',
  'Incheon United': '인천 유나이티드',
  'Gangwon FC': '강원 FC',
  'Jeju United': '제주 유나이티드',
  'Gwangju FC': '광주 FC',
  'Suwon FC': '수원 FC',
  'Daejeon Citizen': '대전 시티즌',
  'Daejeon Hana Citizen': '대전 하나 시티즌',
  'Gimcheon Sangmu': '김천 상무',
  'Seoul E-Land': '서울 이랜드',
  'Busan IPark': '부산 아이파크',
  'Anyang FC': '안양 FC',
  'Chungnam Asan': '충남 아산',
  'Ansan Greeners': '안산 그리너스',
  'Jeonnam Dragons': '전남 드래곤즈',
  'Gyeongnam FC': '경남 FC',
  'Bucheon FC 1995': '부천 FC',
  'Cheongju FC': '청주 FC',
  'Cheonan City FC': '천안 시티',
  
  // ===== 🇯🇵 J리그 =====
  'Vissel Kobe': '비셀 고베',
  'Yokohama F. Marinos': '요코하마 F 마리노스',
  'Yokohama F Marinos': '요코하마 F 마리노스',
  'Kawasaki Frontale': '가와사키 프론탈레',
  'Urawa Reds': '우라와 레즈',
  'Urawa Red Diamonds': '우라와 레즈',
  'Kashima Antlers': '가시마 앤틀러스',
  'Gamba Osaka': '감바 오사카',
  'Cerezo Osaka': '세레소 오사카',
  'FC Tokyo': 'FC 도쿄',
  'Nagoya Grampus': '나고야 그램퍼스',
  'Sanfrecce Hiroshima': '산프레체 히로시마',
  'Kashiwa Reysol': '가시와 레이솔',
  'Consadole Sapporo': '콘사돌레 삿포로',
  'Jubilo Iwata': '주빌로 이와타',
  'Sagan Tosu': '사간 도스',
  'Shonan Bellmare': '쇼난 벨마레',
  'Avispa Fukuoka': '아비스파 후쿠오카',
  'Albirex Niigata': '알비렉스 니가타',
  'Kyoto Sanga': '교토 상가',
  'Tokyo Verdy': '도쿄 베르디',
  
  // ===== 🇸🇦 사우디 =====
  'Al Hilal': '알 힐랄',
  'Al-Hilal': '알 힐랄',
  'Al Nassr': '알 나스르',
  'Al-Nassr': '알 나스르',
  'Al Ittihad': '알 이티하드',
  'Al-Ittihad': '알 이티하드',
  'Al Ahli': '알 아흘리',
  'Al-Ahli': '알 아흘리',
  'Al Shabab': '알 샤밥',
  'Al-Shabab': '알 샤밥',
  'Al Fateh': '알 파테',
  'Al-Fateh': '알 파테',
  'Al Taawoun': '알 타아운',
  'Al-Taawoun': '알 타아운',
  'Al Ettifaq': '알 에티파크',
  'Al-Ettifaq': '알 에티파크',
  
  // ===== 🇹🇷 터키 =====
  'Galatasaray': '갈라타사라이',
  'Fenerbahce': '페네르바체',
  'Fenerbahçe': '페네르바체',
  'Besiktas': '베식타스',
  'Beşiktaş': '베식타스',
  'Trabzonspor': '트라브존스포르',
  
  // ===== 🇧🇪 벨기에 =====
  'Club Brugge': '클럽 브뤼헤',
  'Anderlecht': '안데를레흐트',
  'Racing Genk': '겐크',
  'KRC Genk': '겐크',
  'Union St. Gilloise': '유니온 생질루아즈',
  'Standard Liege': '스탕다르 리에주',
  
  // ===== 🏴󠁧󠁢󠁳󠁣󠁴󠁿 스코틀랜드 =====
  'Celtic': '셀틱',
  'Rangers': '레인저스',
  'Hearts': '하츠',
  'Aberdeen': '애버딘',
  'Hibernian': '히버니안',
  
  // ===== 🇧🇷 브라질 =====
  'Flamengo': '플라멩구',
  'Palmeiras': '팔메이라스',
  'Sao Paulo': '상파울루',
  'São Paulo': '상파울루',
  'Santos': '산토스',
  'Corinthians': '코린치안스',
  'Fluminense': '플루미넨세',
  'Atletico Mineiro': '아틀레치쿠 미네이루',
  'Atlético Mineiro': '아틀레치쿠 미네이루',
  'Internacional': '인테르나시오날',
  'Gremio': '그레미우',
  'Grêmio': '그레미우',
  'Botafogo': '보타포구',
  'Cruzeiro': '크루제이루',
  
  // ===== 🇦🇷 아르헨티나 =====
  'Boca Juniors': '보카 주니어스',
  'River Plate': '리버 플레이트',
  'Racing Club': '라싱 클루브',
  'Independiente': '인데펜디엔테',
  'San Lorenzo': '산 로렌소',
  'Estudiantes': '에스투디안테스',
  
  // ===== 🇺🇸 MLS =====
  'Inter Miami': '인터 마이애미',
  'LA Galaxy': 'LA 갤럭시',
  'LAFC': 'LAFC',
  'Los Angeles FC': 'LAFC',
  'Seattle Sounders': '시애틀 사운더스',
  'Atlanta United': '애틀랜타 유나이티드',
  'New York Red Bulls': '뉴욕 레드불스',
  'New York City FC': '뉴욕 시티 FC',
  'FC Cincinnati': 'FC 신시내티',
  'Columbus Crew': '콜럼버스 크루',
  
  // ===== 🇲🇽 멕시코 =====
  'Club America': '클럽 아메리카',
  'Club América': '클럽 아메리카',
  'Guadalajara': '과달라하라',
  'Guadalajara Chivas': '과달라하라 치바스',
  'Monterrey': '몬테레이',
  'Tigres UANL': '티그레스',
  'Cruz Azul': '크루스 아술',
  'Pumas UNAM': '푸마스',
  'U.N.A.M. - Pumas': '푸마스',
  'Atlas': '아틀라스',
  'Mazatlán': '마사틀란',
  'Mazatlan': '마사틀란',
  'FC Juarez': 'FC 후아레스',
  'Puebla': '푸에블라',
  'Leon': '레온',
  'Santos Laguna': '산토스 라구나',
  'Necaxa': '네칵사',
  'Pachuca': '파추카',
  'Atletico San Luis': '아틀레티코 산루이스',
  'Toluca': '톨루카',
  'Club Queretaro': '케레타로',
  
  // ===== 🇪🇬 이집트 =====
  'Al Ahly': '알 아흘리',
  'Al Ahly SC': '알 아흘리',
  'Zamalek': '자말렉',
  'Zamalek SC': '자말렉',
  'Pyramids FC': '피라미드 FC',
  'Pyramids': '피라미드 FC',
  'Al Masry': '알 마스리',
  'Future FC': '퓨처 FC',
  'Ceramica Cleopatra': '세라미카 클레오파트라',
  'Ismaily SC': '이스마일리',
  'Ismaily': '이스마일리',
  'ENPPI': 'ENPPI',
  'Pharco FC': '파르코 FC',
  'El Gouna': '엘 고우나',
  
  // ===== 🇿🇦 남아공 =====
  'Mamelodi Sundowns': '마멜로디 선다운스',
  'Sundowns': '마멜로디 선다운스',
  'Orlando Pirates': '올란도 파이레이츠',
  'Kaizer Chiefs': '카이저 치프스',
  'Cape Town City': '케이프타운 시티',
  'SuperSport United': '슈퍼스포트 유나이티드',
  'Stellenbosch FC': '스텔렌보쉬',
  'AmaZulu FC': '아마줄루',
  'AmaZulu': '아마줄루',
  'Sekhukhune United': '세쿠쿠네 유나이티드',
  'Golden Arrows': '골든 애로우스',
  'Richards Bay': '리차드스 베이',
  
  // ===== 🇲🇦 모로코 =====
  'Wydad Casablanca': '위다드 카사블랑카',
  'Wydad AC': '위다드 카사블랑카',
  'Raja Casablanca': '라자 카사블랑카',
  'Raja CA': '라자 카사블랑카',
  'AS FAR': 'AS FAR',
  'FAR Rabat': 'AS FAR',
  'RS Berkane': 'RS 베르칸',
  'FUS Rabat': 'FUS 라바트',
  'Maghreb Fes': '마그레브 페스',
  'Hassania Agadir': '하사니아 아가디르',
  
  // ===== 🇩🇿 알제리 =====
  'MC Alger': 'MC 알제',
  'CR Belouizdad': 'CR 벨루이즈다드',
  'USM Alger': 'USM 알제',
  'JS Kabylie': 'JS 카빌리',
  'ES Setif': 'ES 세티프',
  'CS Constantine': 'CS 콩스탄틴',
  'MC Oran': 'MC 오랑',
  'ASO Chlef': 'ASO 셸레프',
  
  // ===== 🇹🇳 튀니지 =====
  'Esperance Tunis': '에스페랑스 튀니스',
  'Esperance de Tunis': '에스페랑스 튀니스',
  'CA Bizertin': 'CA 비제르탱',
  'Club Africain': '클럽 아프리캥',
  'CS Sfaxien': 'CS 스팍시앙',
  'Etoile Sahel': '에투알 사헬',
  'US Monastir': 'US 모나스티르',
  'Stade Tunisien': '스타드 튀니지앵',

  // ===== 🏆 ACL (아시아 챔피언스리그) =====
  'Ulsan Hyundai FC': '울산 HD',
  'Melbourne City': '멜버른 시티',
  'SHANGHAI SIPG': '상하이 하이강',
  'Shanghai SIPG': '상하이 하이강',
  'Shanghai Port': '상하이 포트',
  'Johor Darul Tazim': '조호르 다룰 타크짐',
  'Buriram United': '부리람 유나이티드',
  'Yokohama F.Marinos': '요코하마 F 마리노스',
  'Guangzhou FC': '광저우 FC',
  'Jeonbuk Motors FC': '전북 현대',
  'Al Ain': '알 아인',
  'Persepolis': '페르세폴리스',
  'Al Sadd': '알 사드',
  'Esteghlal': '에스테글랄',
}

// ============================================================
// 🔥 시즌 계산 함수 (리그별로 다르게) - LMX 수정!
// ============================================================
function getCurrentSeason(leagueCode: string): number {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  // 아시아/남미/북미 리그는 단일 연도 시즌
  // 🔥 LMX 제거! - 멕시코는 Apertura/Clausura 시스템 (유럽식 시즌)
  const singleYearLeagues = ['WC', 'KL1', 'KL2', 'J1', 'J2', 'MLS', 'BSA', 'ARG', 'CSL']
  if (singleYearLeagues.includes(leagueCode)) {
    return year
  }

  // 유럽 축구 시즌 + 멕시코 (LMX): 8월 ~ 이듬해 5월
  // 1월~6월: 전년도 시즌 (예: 2026년 1월 → 2025 시즌)
  // 7월~12월: 당해년도 시즌 (예: 2025년 9월 → 2025 시즌)
  if (month <= 6) {
    return year - 1
  }
  return year
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 경기 결과 수집 시작...')
    console.log(`📊 총 ${LEAGUES.length}개 리그 처리`)

    // 지난 3일 범위
    const today = new Date()
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(today.getDate() - 3)

    const fromDate = threeDaysAgo.toISOString().split('T')[0]
    const toDate = today.toISOString().split('T')[0]

    console.log(`📅 수집 기간: ${fromDate} ~ ${toDate}`)

    let allFinishedMatches: any[] = []

    // 각 리그별 종료된 경기 가져오기
    for (const league of LEAGUES) {
      const season = getCurrentSeason(league.code)
      console.log(`\n🏆 ${league.name} (${league.code}) 처리 중... (시즌: ${season})`)
      
      try {
        const matches = await fetchFinishedMatches(league.apiId, fromDate, toDate, season)
        console.log(`  ✅ ${matches.length}개 종료 경기 발견`)
        
        allFinishedMatches = [
          ...allFinishedMatches,
          ...matches.map((m: any) => ({ ...m, league: league.code }))
        ]
        
        // API Rate Limit 방지 (0.5초로 단축)
        await sleep(500)
      } catch (leagueError) {
        console.error(`  ❌ ${league.name} 처리 실패:`, leagueError)
      }
    }

    console.log(`\n✅ 총 ${allFinishedMatches.length}개 종료 경기 발견`)

    // 중복 제거
    const uniqueMatches = Array.from(
      new Map(allFinishedMatches.map(m => [m.fixture.id, m])).values()
    )
    
    console.log(`🔍 중복 제거 후: ${uniqueMatches.length}개`)

    // 예측 데이터 가져오기
    const { data: predictions, error: predError } = await supabase
      .from('match_odds_latest')
      .select('*')
      .in('match_id', uniqueMatches.map(m => String(m.fixture.id)))

    if (predError) {
      console.error('❌ 예측 데이터 조회 실패:', predError)
    }

    console.log(`📊 예측 데이터: ${predictions?.length || 0}개`)

    let savedCount = 0
    let skippedCount = 0

    // 각 경기별 처리
    for (const match of uniqueMatches) {
      try {
        const matchId = String(match.fixture.id)
        const prediction = predictions?.find(p => String(p.match_id) === matchId)

        // 예측 데이터 없으면 결과 저장은 스킵하되, status는 업데이트!
        if (!prediction) {
          // 🔥 예측 없어도 match_odds_latest status 업데이트
          const { error: statusUpdateError } = await supabase
            .from('match_odds_latest')
            .update({ 
              status: match.fixture.status.short,
              updated_at: new Date().toISOString()
            })
            .eq('match_id', matchId)
          
          if (!statusUpdateError) {
            console.log(`  🔄 Status 업데이트 (예측 없음): ${match.teams.home.name} vs ${match.teams.away.name} → ${match.fixture.status.short}`)
          }
          
          skippedCount++
          continue
        }

        // 실제 스코어
        const finalScoreHome = match.goals.home
        const finalScoreAway = match.goals.away

        // 예측 계산
        const { predictedWinner, predictedScoreHome, predictedScoreAway, probabilities } = 
          calculatePrediction(prediction)

        // 적중 여부 체크
        const { isCorrect, predictionType } = checkPrediction(
          { home: finalScoreHome, away: finalScoreAway },
          { home: predictedScoreHome, away: predictedScoreAway, winner: predictedWinner }
        )

        // DB 저장 데이터
        const resultData = {
          match_id: parseInt(matchId),
          league: match.league,
          
          home_team: match.teams.home.name,
          away_team: match.teams.away.name,
          home_team_kr: TEAM_KR_MAP[match.teams.home.name] || match.teams.home.name,
          away_team_kr: TEAM_KR_MAP[match.teams.away.name] || match.teams.away.name,
          home_team_id: match.teams.home.id,
          away_team_id: match.teams.away.id,
          home_crest: match.teams.home.logo,
          away_crest: match.teams.away.logo,
          
          final_score_home: finalScoreHome,
          final_score_away: finalScoreAway,
          match_status: match.fixture.status.short,
          
          predicted_winner: predictedWinner,
          predicted_score_home: predictedScoreHome,
          predicted_score_away: predictedScoreAway,
          predicted_home_probability: probabilities.home,
          predicted_draw_probability: probabilities.draw,
          predicted_away_probability: probabilities.away,
          
          is_correct: isCorrect,
          prediction_type: predictionType,
          
          match_date: new Date(match.fixture.date),
          updated_at: new Date()
        }

        // Supabase에 저장 (UPSERT)
        const { error: saveError } = await supabase
          .from('match_results')
          .upsert(resultData, { onConflict: 'match_id' })

        if (saveError) {
          console.error(`❌ 저장 실패 (${matchId}):`, saveError.message)
        } else {
          savedCount++
          const correctIcon = isCorrect ? '✅' : '❌'
          console.log(`${correctIcon} ${match.teams.home.name} ${finalScoreHome}-${finalScoreAway} ${match.teams.away.name}`)
          
          // 🔥 핵심: match_odds_latest의 status도 업데이트!
          const { error: updateError } = await supabase
            .from('match_odds_latest')
            .update({ 
              status: match.fixture.status.short,  // FT, AET, PEN 등
              updated_at: new Date().toISOString()
            })
            .eq('match_id', matchId)
          
          if (updateError) {
            console.error(`  ⚠️ match_odds_latest 업데이트 실패 (${matchId}):`, updateError.message)
          }
        }
      } catch (matchError) {
        console.error(`❌ 경기 처리 실패:`, matchError)
      }
    }

    console.log(`\n🎉 완료: ${savedCount}개 저장, ${skippedCount}개 스킵`)

    return NextResponse.json({
      success: true,
      leaguesProcessed: LEAGUES.length,
      dateRange: `${fromDate} ~ ${toDate}`,
      finishedMatches: allFinishedMatches.length,
      uniqueMatches: uniqueMatches.length,
      withPredictions: predictions?.length || 0,
      saved: savedCount,
      skipped: skippedCount,
      message: `${savedCount}개 경기 결과 저장 완료`
    })

  } catch (error: any) {
    console.error('❌ Cron 실행 실패:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to collect match results' 
      },
      { status: 500 }
    )
  }
}

// POST 메서드 (수동 트리거)
export async function POST(request: NextRequest) {
  return GET(request)
}

// 🔍 종료된 경기 가져오기
async function fetchFinishedMatches(leagueId: number, fromDate: string, toDate: string, season: number) {
  const url = `https://${API_FOOTBALL_HOST}/fixtures?league=${leagueId}&season=${season}&from=${fromDate}&to=${toDate}`
  
  const response = await fetch(url, {
    headers: {
      'x-rapidapi-key': API_FOOTBALL_KEY,
      'x-rapidapi-host': API_FOOTBALL_HOST
    }
  })

  if (!response.ok) {
    console.error(`  ❌ API 에러: ${response.status}`)
    return []
  }

  const data = await response.json()
  const allMatches = data.response || []
  
  // 종료된 경기만 필터링
  const now = new Date()
  const finishedMatches = allMatches.filter((m: any) => {
    const status = m.fixture.status.short
    
    // 명확하게 종료된 경기
    if (status === 'FT' || status === 'AET' || status === 'PEN') {
      return true
    }
    
    // 킥오프 후 3시간 경과 (안전장치)
    const kickoff = new Date(m.fixture.date)
    const hoursElapsed = (now.getTime() - kickoff.getTime()) / (1000 * 60 * 60)
    
    if (hoursElapsed > 3 && m.goals.home !== null && m.goals.away !== null) {
      return true
    }
    
    return false
  })
  
  return finishedMatches
}

// 📊 예측 계산
function calculatePrediction(prediction: any) {
  const homeOdds = prediction.home_odds || 2.0
  const drawOdds = prediction.draw_odds || 3.5
  const awayOdds = prediction.away_odds || 3.0

  // 배당 → 확률 변환
  const homeProb = 1 / homeOdds
  const drawProb = 1 / drawOdds
  const awayProb = 1 / awayOdds
  const total = homeProb + drawProb + awayProb

  // 정규화
  const probabilities = {
    home: Number(((homeProb / total) * 100).toFixed(2)),
    draw: Number(((drawProb / total) * 100).toFixed(2)),
    away: Number(((awayProb / total) * 100).toFixed(2))
  }

  // 승자 예측 (확률이 가장 높은 쪽)
  let predictedWinner: 'home' | 'away' | 'draw' = 'home'
  if (probabilities.away > probabilities.home && probabilities.away > probabilities.draw) {
    predictedWinner = 'away'
  } else if (probabilities.draw > probabilities.home && probabilities.draw > probabilities.away) {
    predictedWinner = 'draw'
  }

  // 스코어 예측 (단순 로직)
  let predictedScoreHome = 1
  let predictedScoreAway = 1

  if (predictedWinner === 'home') {
    predictedScoreHome = probabilities.home > 60 ? 2 : 1
    predictedScoreAway = probabilities.home > 60 ? 0 : 1
  } else if (predictedWinner === 'away') {
    predictedScoreHome = probabilities.away > 60 ? 0 : 1
    predictedScoreAway = probabilities.away > 60 ? 2 : 1
  } else {
    predictedScoreHome = 1
    predictedScoreAway = 1
  }

  return {
    predictedWinner,
    predictedScoreHome,
    predictedScoreAway,
    probabilities
  }
}

// ✅ 적중 여부 체크
function checkPrediction(
  actual: { home: number; away: number },
  predicted: { home: number; away: number; winner: 'home' | 'away' | 'draw' }
) {
  // 1. 정확한 스코어 맞춤
  if (actual.home === predicted.home && actual.away === predicted.away) {
    return { isCorrect: true, predictionType: 'exact' as const }
  }

  // 2. 승자만 맞춤
  const actualWinner = 
    actual.home > actual.away ? 'home' :
    actual.away > actual.home ? 'away' : 'draw'

  if (actualWinner === predicted.winner) {
    return { isCorrect: true, predictionType: 'winner_only' as const }
  }

  // 3. 틀림
  return { isCorrect: false, predictionType: 'wrong' as const }
}

// ⏱️ Sleep 함수
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}