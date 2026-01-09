/**
 * Forebet Match Preview Scraper v31
 * - 🆕 검색용 팀명 vs 표시용 팀명 분리
 * - 🆕 검색 시 접두사(FC, RB, TSG 등) 제거
 * - 리그별 팀 목록으로 표시용 팀명 정규화
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const fs = require('fs');

const SPORTSDB_API_KEY = '3';

/**
 * 🆕 리그별 팀 목록
 * - name: TheSportsDB 공식 이름 (표시용)
 * - searchName: 검색용 단순 이름
 * - aliases: URL에서 추출 시 매칭용
 */
const LEAGUE_TEAMS = {
  'bundesliga': [
    { name: 'Bayern Munich', searchName: 'Bayern Munich', aliases: ['bayern', 'fc bayern', 'bayern munchen'] },
    { name: 'Borussia Dortmund', searchName: 'Dortmund', aliases: ['dortmund', 'bvb'] },
    { name: 'RB Leipzig', searchName: 'Leipzig', aliases: ['leipzig', 'rb leipzig', 'rasenballsport'] },
    { name: 'Bayer Leverkusen', searchName: 'Leverkusen', aliases: ['leverkusen', 'bayer 04', 'bayer'] },
    { name: 'Eintracht Frankfurt', searchName: 'Frankfurt', aliases: ['frankfurt', 'eintracht'] },
    { name: 'VfB Stuttgart', searchName: 'Stuttgart', aliases: ['stuttgart', 'vfb'] },
    { name: 'Werder Bremen', searchName: 'Werder Bremen', aliases: ['werder', 'bremen', 'sv werder'] },
    { name: 'SC Freiburg', searchName: 'Freiburg', aliases: ['freiburg', 'sc freiburg'] },
    { name: 'TSG Hoffenheim', searchName: 'Hoffenheim', aliases: ['hoffenheim', 'tsg', '1899 hoffenheim'] },
    { name: 'Borussia Monchengladbach', searchName: 'Monchengladbach', aliases: ['gladbach', 'monchengladbach', 'mgladbach'] },
    { name: 'VfL Wolfsburg', searchName: 'Wolfsburg', aliases: ['wolfsburg', 'vfl'] },
    { name: 'Union Berlin', searchName: 'Union Berlin', aliases: ['union', 'union berlin', '1. fc union'] },
    { name: 'Mainz 05', searchName: 'Mainz', aliases: ['mainz', 'fsv mainz'] },
    { name: 'FC Augsburg', searchName: 'Augsburg', aliases: ['augsburg'] },
    { name: 'VfL Bochum', searchName: 'Bochum', aliases: ['bochum'] },
    { name: 'FC Koln', searchName: 'Koln', aliases: ['koln', 'cologne', '1. fc koln', 'fc cologne'] },
    { name: '1. FC Heidenheim', searchName: 'Heidenheim', aliases: ['heidenheim'] },
    { name: 'FC St. Pauli', searchName: 'St Pauli', aliases: ['st pauli', 'st. pauli', 'fc st pauli', 'pauli'] },
    { name: 'Holstein Kiel', searchName: 'Holstein Kiel', aliases: ['kiel', 'holstein'] },
    { name: 'Hamburger SV', searchName: 'Hamburg', aliases: ['hamburg', 'hamburger', 'hsv', 'hamburger sv'] },
    { name: 'Hertha BSC', searchName: 'Hertha Berlin', aliases: ['hertha', 'hertha berlin'] },
    { name: 'Schalke 04', searchName: 'Schalke', aliases: ['schalke'] },
    { name: 'Fortuna Dusseldorf', searchName: 'Dusseldorf', aliases: ['dusseldorf', 'fortuna'] },
    { name: 'Hannover 96', searchName: 'Hannover', aliases: ['hannover'] },
    { name: 'Karlsruher SC', searchName: 'Karlsruhe', aliases: ['karlsruhe', 'karlsruher'] },
  ],
  
  'eredivisie': [
    { name: 'Ajax', searchName: 'Ajax', aliases: ['ajax', 'afc ajax'] },
    { name: 'PSV Eindhoven', searchName: 'PSV', aliases: ['psv', 'psv eindhoven'] },
    { name: 'Feyenoord', searchName: 'Feyenoord', aliases: ['feyenoord', 'feyenoord rotterdam'] },
    { name: 'AZ Alkmaar', searchName: 'AZ Alkmaar', aliases: ['az', 'alkmaar', 'az alkmaar'] },
    { name: 'FC Twente', searchName: 'Twente', aliases: ['twente', 'fc twente'] },
    { name: 'FC Utrecht', searchName: 'Utrecht', aliases: ['utrecht', 'fc utrecht'] },
    { name: 'SC Heerenveen', searchName: 'Heerenveen', aliases: ['heerenveen', 'sc heerenveen'] },
    { name: 'FC Groningen', searchName: 'Groningen', aliases: ['groningen', 'fc groningen'] },
    { name: 'NEC Nijmegen', searchName: 'NEC Nijmegen', aliases: ['nijmegen', 'nec', 'nec nijmegen'] },
    { name: 'Vitesse', searchName: 'Vitesse', aliases: ['vitesse', 'vitesse arnhem'] },
    { name: 'Go Ahead Eagles', searchName: 'Go Ahead Eagles', aliases: ['go ahead', 'eagles'] },
    { name: 'Sparta Rotterdam', searchName: 'Sparta Rotterdam', aliases: ['sparta', 'sparta rotterdam'] },
    { name: 'Fortuna Sittard', searchName: 'Fortuna Sittard', aliases: ['sittard', 'fortuna sittard'] },
    { name: 'RKC Waalwijk', searchName: 'Waalwijk', aliases: ['waalwijk', 'rkc'] },
    { name: 'Heracles Almelo', searchName: 'Heracles', aliases: ['heracles', 'almelo'] },
    { name: 'PEC Zwolle', searchName: 'PEC Zwolle', aliases: ['zwolle', 'pec', 'pec zwolle'] },
    { name: 'NAC Breda', searchName: 'NAC Breda', aliases: ['breda', 'nac', 'nac breda'] },
    { name: 'FC Volendam', searchName: 'Volendam', aliases: ['volendam'] },
    { name: 'SC Telstar', searchName: 'Telstar', aliases: ['telstar'] },
    { name: 'Excelsior', searchName: 'Excelsior', aliases: ['excelsior', 'excelsior rotterdam'] },
    { name: 'Willem II', searchName: 'Willem II', aliases: ['willem', 'willem ii'] },
    { name: 'Almere City', searchName: 'Almere City', aliases: ['almere'] },
  ],
  
  'championship': [
    { name: 'Leicester City', searchName: 'Leicester', aliases: ['leicester'] },
    { name: 'Leeds United', searchName: 'Leeds', aliases: ['leeds'] },
    { name: 'Burnley', searchName: 'Burnley', aliases: ['burnley'] },
    { name: 'Sunderland', searchName: 'Sunderland', aliases: ['sunderland'] },
    { name: 'Sheffield United', searchName: 'Sheffield Utd', aliases: ['sheffield', 'sheffield united', 'sheffield utd'] },
    { name: 'West Brom', searchName: 'West Brom', aliases: ['west bromwich', 'west brom', 'wba', 'west bromwich albion'] },
    { name: 'Middlesbrough', searchName: 'Middlesbrough', aliases: ['middlesbrough', 'boro'] },
    { name: 'Norwich City', searchName: 'Norwich', aliases: ['norwich'] },
    { name: 'Coventry City', searchName: 'Coventry', aliases: ['coventry'] },
    { name: 'Watford', searchName: 'Watford', aliases: ['watford'] },
    { name: 'Bristol City', searchName: 'Bristol City', aliases: ['bristol'] },
    { name: 'Swansea City', searchName: 'Swansea', aliases: ['swansea'] },
    { name: 'Cardiff City', searchName: 'Cardiff', aliases: ['cardiff'] },
    { name: 'Hull City', searchName: 'Hull', aliases: ['hull'] },
    { name: 'Stoke City', searchName: 'Stoke', aliases: ['stoke'] },
    { name: 'Blackburn Rovers', searchName: 'Blackburn', aliases: ['blackburn'] },
    { name: 'Millwall', searchName: 'Millwall', aliases: ['millwall'] },
    { name: 'Plymouth Argyle', searchName: 'Plymouth', aliases: ['plymouth'] },
    { name: 'Preston North End', searchName: 'Preston', aliases: ['preston'] },
    { name: 'QPR', searchName: 'QPR', aliases: ['qpr', 'queens park rangers'] },
    { name: 'Luton Town', searchName: 'Luton', aliases: ['luton'] },
    { name: 'Sheffield Wednesday', searchName: 'Sheffield Wed', aliases: ['sheffield wednesday', 'wednesday'] },
    { name: 'Derby County', searchName: 'Derby', aliases: ['derby'] },
    { name: 'Oxford United', searchName: 'Oxford', aliases: ['oxford'] },
    { name: 'Portsmouth', searchName: 'Portsmouth', aliases: ['portsmouth'] },
  ],
  
  'premier league': [
    { name: 'Arsenal', searchName: 'Arsenal', aliases: ['arsenal'] },
    { name: 'Manchester City', searchName: 'Man City', aliases: ['man city', 'manchester city', 'man. city'] },
    { name: 'Manchester United', searchName: 'Man Utd', aliases: ['man united', 'man utd', 'manchester united'] },
    { name: 'Liverpool', searchName: 'Liverpool', aliases: ['liverpool'] },
    { name: 'Chelsea', searchName: 'Chelsea', aliases: ['chelsea'] },
    { name: 'Tottenham', searchName: 'Tottenham', aliases: ['tottenham', 'spurs'] },
    { name: 'Newcastle United', searchName: 'Newcastle', aliases: ['newcastle'] },
    { name: 'Aston Villa', searchName: 'Aston Villa', aliases: ['aston villa', 'villa'] },
    { name: 'Brighton', searchName: 'Brighton', aliases: ['brighton', 'brighton hove'] },
    { name: 'Fulham', searchName: 'Fulham', aliases: ['fulham'] },
    { name: 'Brentford', searchName: 'Brentford', aliases: ['brentford'] },
    { name: 'Bournemouth', searchName: 'Bournemouth', aliases: ['bournemouth'] },
    { name: 'Crystal Palace', searchName: 'Crystal Palace', aliases: ['crystal palace', 'palace'] },
    { name: 'Everton', searchName: 'Everton', aliases: ['everton'] },
    { name: 'Nottingham Forest', searchName: 'Nottm Forest', aliases: ['nottingham', 'forest'] },
    { name: 'West Ham', searchName: 'West Ham', aliases: ['west ham', 'west ham united'] },
    { name: 'Wolves', searchName: 'Wolves', aliases: ['wolves', 'wolverhampton'] },
    { name: 'Ipswich Town', searchName: 'Ipswich', aliases: ['ipswich'] },
    { name: 'Southampton', searchName: 'Southampton', aliases: ['southampton'] },
    { name: 'Leicester City', searchName: 'Leicester', aliases: ['leicester'] },
  ],
  
  'la liga': [
    { name: 'Real Madrid', searchName: 'Real Madrid', aliases: ['real madrid', 'madrid'] },
    { name: 'Barcelona', searchName: 'Barcelona', aliases: ['barcelona', 'barca'] },
    { name: 'Atletico Madrid', searchName: 'Atletico Madrid', aliases: ['atletico', 'atletico madrid', 'atleti'] },
    { name: 'Sevilla', searchName: 'Sevilla', aliases: ['sevilla'] },
    { name: 'Real Sociedad', searchName: 'Real Sociedad', aliases: ['sociedad', 'real sociedad'] },
    { name: 'Real Betis', searchName: 'Real Betis', aliases: ['betis', 'real betis'] },
    { name: 'Villarreal', searchName: 'Villarreal', aliases: ['villarreal'] },
    { name: 'Athletic Bilbao', searchName: 'Athletic Bilbao', aliases: ['bilbao', 'athletic', 'athletic bilbao'] },
    { name: 'Valencia', searchName: 'Valencia', aliases: ['valencia'] },
    { name: 'Osasuna', searchName: 'Osasuna', aliases: ['osasuna'] },
    { name: 'Celta Vigo', searchName: 'Celta Vigo', aliases: ['celta', 'celta vigo'] },
    { name: 'Mallorca', searchName: 'Mallorca', aliases: ['mallorca'] },
    { name: 'Getafe', searchName: 'Getafe', aliases: ['getafe'] },
    { name: 'Rayo Vallecano', searchName: 'Rayo Vallecano', aliases: ['rayo', 'vallecano'] },
    { name: 'Alaves', searchName: 'Alaves', aliases: ['alaves'] },
    { name: 'Las Palmas', searchName: 'Las Palmas', aliases: ['las palmas'] },
    { name: 'Girona', searchName: 'Girona', aliases: ['girona'] },
    { name: 'Espanyol', searchName: 'Espanyol', aliases: ['espanyol'] },
    { name: 'Leganes', searchName: 'Leganes', aliases: ['leganes'] },
    { name: 'Valladolid', searchName: 'Valladolid', aliases: ['valladolid'] },
  ],
  
  'serie a': [
    { name: 'Inter Milan', searchName: 'Inter', aliases: ['inter', 'inter milan', 'internazionale'] },
    { name: 'AC Milan', searchName: 'AC Milan', aliases: ['milan', 'ac milan'] },
    { name: 'Juventus', searchName: 'Juventus', aliases: ['juventus', 'juve'] },
    { name: 'Napoli', searchName: 'Napoli', aliases: ['napoli'] },
    { name: 'Roma', searchName: 'Roma', aliases: ['roma', 'as roma'] },
    { name: 'Lazio', searchName: 'Lazio', aliases: ['lazio'] },
    { name: 'Atalanta', searchName: 'Atalanta', aliases: ['atalanta'] },
    { name: 'Fiorentina', searchName: 'Fiorentina', aliases: ['fiorentina'] },
    { name: 'Bologna', searchName: 'Bologna', aliases: ['bologna'] },
    { name: 'Torino', searchName: 'Torino', aliases: ['torino'] },
    { name: 'Monza', searchName: 'Monza', aliases: ['monza'] },
    { name: 'Genoa', searchName: 'Genoa', aliases: ['genoa'] },
    { name: 'Cagliari', searchName: 'Cagliari', aliases: ['cagliari'] },
    { name: 'Empoli', searchName: 'Empoli', aliases: ['empoli'] },
    { name: 'Udinese', searchName: 'Udinese', aliases: ['udinese'] },
    { name: 'Sassuolo', searchName: 'Sassuolo', aliases: ['sassuolo'] },
    { name: 'Lecce', searchName: 'Lecce', aliases: ['lecce'] },
    { name: 'Verona', searchName: 'Verona', aliases: ['verona', 'hellas verona'] },
    { name: 'Parma', searchName: 'Parma', aliases: ['parma'] },
    { name: 'Venezia', searchName: 'Venezia', aliases: ['venezia'] },
    { name: 'Como', searchName: 'Como', aliases: ['como'] },
  ],
  
  'ligue 1': [
    { name: 'Paris Saint-Germain', searchName: 'PSG', aliases: ['psg', 'paris', 'paris saint germain'] },
    { name: 'Marseille', searchName: 'Marseille', aliases: ['marseille', 'om'] },
    { name: 'Lyon', searchName: 'Lyon', aliases: ['lyon', 'olympique lyon'] },
    { name: 'Monaco', searchName: 'Monaco', aliases: ['monaco'] },
    { name: 'Lille', searchName: 'Lille', aliases: ['lille'] },
    { name: 'Rennes', searchName: 'Rennes', aliases: ['rennes'] },
    { name: 'Nice', searchName: 'Nice', aliases: ['nice'] },
    { name: 'Lens', searchName: 'Lens', aliases: ['lens'] },
    { name: 'Montpellier', searchName: 'Montpellier', aliases: ['montpellier'] },
    { name: 'Reims', searchName: 'Reims', aliases: ['reims'] },
    { name: 'Toulouse', searchName: 'Toulouse', aliases: ['toulouse'] },
    { name: 'Strasbourg', searchName: 'Strasbourg', aliases: ['strasbourg'] },
    { name: 'Nantes', searchName: 'Nantes', aliases: ['nantes'] },
    { name: 'Brest', searchName: 'Brest', aliases: ['brest'] },
    { name: 'Lorient', searchName: 'Lorient', aliases: ['lorient'] },
    { name: 'Clermont', searchName: 'Clermont', aliases: ['clermont'] },
    { name: 'Metz', searchName: 'Metz', aliases: ['metz'] },
    { name: 'Le Havre', searchName: 'Le Havre', aliases: ['le havre', 'havre'] },
    { name: 'Auxerre', searchName: 'Auxerre', aliases: ['auxerre'] },
    { name: 'Angers', searchName: 'Angers', aliases: ['angers'] },
    { name: 'Saint-Etienne', searchName: 'St Etienne', aliases: ['saint etienne', 'st etienne'] },
  ],
  
  'champions league': [
    { name: 'Real Madrid', searchName: 'Real Madrid', aliases: ['real madrid', 'madrid'] },
    { name: 'Barcelona', searchName: 'Barcelona', aliases: ['barcelona', 'barca'] },
    { name: 'Bayern Munich', searchName: 'Bayern Munich', aliases: ['bayern', 'fc bayern'] },
    { name: 'Manchester City', searchName: 'Man City', aliases: ['man city', 'manchester city'] },
    { name: 'Liverpool', searchName: 'Liverpool', aliases: ['liverpool'] },
    { name: 'Paris Saint-Germain', searchName: 'PSG', aliases: ['psg', 'paris'] },
    { name: 'Inter Milan', searchName: 'Inter', aliases: ['inter', 'inter milan'] },
    { name: 'AC Milan', searchName: 'AC Milan', aliases: ['milan', 'ac milan'] },
    { name: 'Juventus', searchName: 'Juventus', aliases: ['juventus', 'juve'] },
    { name: 'Borussia Dortmund', searchName: 'Dortmund', aliases: ['dortmund', 'bvb'] },
    { name: 'Atletico Madrid', searchName: 'Atletico Madrid', aliases: ['atletico', 'atletico madrid'] },
    { name: 'Arsenal', searchName: 'Arsenal', aliases: ['arsenal'] },
    { name: 'Chelsea', searchName: 'Chelsea', aliases: ['chelsea'] },
    { name: 'Benfica', searchName: 'Benfica', aliases: ['benfica'] },
    { name: 'Porto', searchName: 'Porto', aliases: ['porto', 'fc porto'] },
    { name: 'Sporting CP', searchName: 'Sporting', aliases: ['sporting', 'sporting lisbon'] },
    { name: 'Celtic', searchName: 'Celtic', aliases: ['celtic'] },
    { name: 'Club Brugge', searchName: 'Club Brugge', aliases: ['brugge', 'club brugge'] },
    { name: 'RB Salzburg', searchName: 'Salzburg', aliases: ['salzburg', 'rb salzburg'] },
    { name: 'Shakhtar Donetsk', searchName: 'Shakhtar', aliases: ['shakhtar', 'donetsk'] },
    { name: 'Dinamo Zagreb', searchName: 'Dinamo Zagreb', aliases: ['dinamo', 'zagreb'] },
    { name: 'Feyenoord', searchName: 'Feyenoord', aliases: ['feyenoord'] },
    { name: 'PSV Eindhoven', searchName: 'PSV', aliases: ['psv'] },
  ],
  
  'europa league': [
    { name: 'Roma', searchName: 'Roma', aliases: ['roma', 'as roma'] },
    { name: 'Lazio', searchName: 'Lazio', aliases: ['lazio'] },
    { name: 'Ajax', searchName: 'Ajax', aliases: ['ajax'] },
    { name: 'Tottenham', searchName: 'Tottenham', aliases: ['tottenham', 'spurs'] },
    { name: 'Manchester United', searchName: 'Man Utd', aliases: ['man united', 'manchester united'] },
    { name: 'Real Sociedad', searchName: 'Real Sociedad', aliases: ['sociedad'] },
    { name: 'Villarreal', searchName: 'Villarreal', aliases: ['villarreal'] },
    { name: 'Athletic Bilbao', searchName: 'Athletic Bilbao', aliases: ['bilbao', 'athletic'] },
    { name: 'Eintracht Frankfurt', searchName: 'Frankfurt', aliases: ['frankfurt', 'eintracht'] },
    { name: 'Olympiacos', searchName: 'Olympiacos', aliases: ['olympiacos'] },
    { name: 'Fenerbahce', searchName: 'Fenerbahce', aliases: ['fenerbahce'] },
    { name: 'Galatasaray', searchName: 'Galatasaray', aliases: ['galatasaray'] },
    { name: 'Besiktas', searchName: 'Besiktas', aliases: ['besiktas'] },
    { name: 'Lyon', searchName: 'Lyon', aliases: ['lyon'] },
    { name: 'Rangers', searchName: 'Rangers', aliases: ['rangers'] },
  ],
};

const SUPPORTED_LEAGUES = [
  'champions league', 'europa league', 'conference league',
  'nations league',
  'premier league', 'la liga', 'bundesliga', 'serie a', 'ligue 1',
  'eredivisie', 'championship',
];

const EXCLUDED_LEAGUES = [
  'j1 league', 'j2 league', 'j.league', 'j-league', 'japan',
  'eliteserien', 'norwegian', 'norway',
  'swiss super league', 'switzerland', 'swiss',
  'süper lig', 'super lig', 'turkish', 'turkey', 'türkiye',
  'scottish', 'scotland', 'spfl',
  'liga portugal', 'primeira liga', 'portugal',
  'k league', 'korean', 'korea',
  'mls', 'major league soccer',
  'a-league', 'australia',
  'liga mx', 'mexico',
  'saudi', 'pro league', 'roshn',
  'chinese super', 'china',
  'brasileirao', 'brazil',
  'liga profesional', 'argentina',
  'belgian', 'belgium', 'jupiler',
  'greek', 'greece',
  'russian', 'russia',
  'ukrainian', 'ukraine',
  'danish', 'denmark', 'superliga',
  'austrian', 'austria',
  'czech', 'fortuna liga',
  'polish', 'poland', 'ekstraklasa',
  'women', 'u19', 'u21', 'u23', 'youth', 'junioren', 'reserve',
  'usl', 'premier league 2', 'premier league cup',
  'egypt', 'ecuador',
];

const LEAGUE_CODE_MAP = {
  'champions league': { code: 'CL', nameKr: '챔피언스리그', sportsDbId: 4480 },
  'europa league': { code: 'EL', nameKr: '유로파리그', sportsDbId: 4481 },
  'conference league': { code: 'ECL', nameKr: 'UEFA 컨퍼런스리그', sportsDbId: 5071 },
  'nations league': { code: 'NL', nameKr: 'UEFA 네이션스리그', sportsDbId: 4490 },
  'premier league': { code: 'PL', nameKr: '프리미어리그', sportsDbId: 4328 },
  'la liga': { code: 'PD', nameKr: '라리가', sportsDbId: 4335 },
  'bundesliga': { code: 'BL1', nameKr: '분데스리가', sportsDbId: 4331 },
  'serie a': { code: 'SA', nameKr: '세리에A', sportsDbId: 4332 },
  'ligue 1': { code: 'FL1', nameKr: '리그1', sportsDbId: 4334 },
  'eredivisie': { code: 'DED', nameKr: '에레디비시', sportsDbId: 4337 },
  'championship': { code: 'ELC', nameKr: '챔피언십', sportsDbId: 4329 },
};

const MAX_POSTS_PER_DAY = 15;  // 시도 개수
const MAX_DAYS_AHEAD = 7;
const REQUIRE_THUMBNAIL = true;  // 썸네일 필수

let sportsDbEventsCache = {};
let searchEventsCache = {};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isValidMatchDate(dateStr) {
  if (!dateStr) return true;
  try {
    const matchDate = new Date(dateStr);
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstNow = new Date(now.getTime() + kstOffset);
    const kstToday = new Date(kstNow);
    kstToday.setUTCHours(0, 0, 0, 0);
    const todayStart = new Date(kstToday.getTime() - kstOffset);
    const maxDate = new Date(todayStart);
    maxDate.setDate(maxDate.getDate() + MAX_DAYS_AHEAD);
    if (matchDate < todayStart) return false;
    if (matchDate > maxDate) return false;
    return true;
  } catch {
    return true;
  }
}

function removeAccents(str) {
  const accents = {
    'á': 'a', 'à': 'a', 'ä': 'a', 'â': 'a', 'ã': 'a', 'å': 'a', 'ą': 'a',
    'é': 'e', 'è': 'e', 'ë': 'e', 'ê': 'e', 'ę': 'e', 'ě': 'e',
    'í': 'i', 'ì': 'i', 'ï': 'i', 'î': 'i', 'ı': 'i',
    'ó': 'o', 'ò': 'o', 'ö': 'o', 'ô': 'o', 'õ': 'o', 'ø': 'o', 'ő': 'o',
    'ú': 'u', 'ù': 'u', 'ü': 'u', 'û': 'u', 'ű': 'u',
    'ý': 'y', 'ÿ': 'y', 'ñ': 'n', 'ń': 'n', 'ň': 'n',
    'ç': 'c', 'ć': 'c', 'č': 'c', 'ß': 'ss',
    'ş': 's', 'š': 's', 'ś': 's', 'ž': 'z', 'ź': 'z', 'ż': 'z',
    'ł': 'l', 'ľ': 'l', 'đ': 'd', 'ď': 'd', 'ř': 'r', 'ť': 't',
    'æ': 'ae', 'œ': 'oe', 'þ': 'th',
  };
  return str.split('').map(char => accents[char.toLowerCase()] || char).join('');
}

/**
 * 🆕 리그 팀 목록에서 팀 찾기 (표시용 + 검색용 이름 반환)
 */
function findTeamInLeague(rawName, leagueKey) {
  if (!rawName || !leagueKey) return null;
  
  const teams = LEAGUE_TEAMS[leagueKey];
  if (!teams) return null;
  
  const normalized = removeAccents(rawName.toLowerCase().trim());
  
  // 1차: 정확한 매칭
  for (const team of teams) {
    const teamNameNorm = removeAccents(team.name.toLowerCase());
    if (normalized === teamNameNorm) {
      return { displayName: team.name, searchName: team.searchName };
    }
    for (const alias of team.aliases) {
      if (normalized === removeAccents(alias.toLowerCase())) {
        return { displayName: team.name, searchName: team.searchName };
      }
    }
  }
  
  // 2차: 부분 매칭
  for (const team of teams) {
    for (const alias of team.aliases) {
      const aliasNorm = removeAccents(alias.toLowerCase());
      if (normalized.includes(aliasNorm) || aliasNorm.includes(normalized)) {
        console.log(`      🎯 "${rawName}" → "${team.name}" (검색: ${team.searchName})`);
        return { displayName: team.name, searchName: team.searchName };
      }
    }
  }
  
  // 3차: 단어별 매칭
  const rawWords = normalized.split(' ').filter(w => w.length >= 3);
  for (const rawWord of rawWords) {
    for (const team of teams) {
      const teamNameNorm = removeAccents(team.name.toLowerCase());
      if (teamNameNorm.includes(rawWord)) {
        console.log(`      🎯 "${rawName}" → "${team.name}" (검색: ${team.searchName})`);
        return { displayName: team.name, searchName: team.searchName };
      }
      for (const alias of team.aliases) {
        if (removeAccents(alias.toLowerCase()).includes(rawWord)) {
          console.log(`      🎯 "${rawName}" → "${team.name}" (검색: ${team.searchName})`);
          return { displayName: team.name, searchName: team.searchName };
        }
      }
    }
  }
  
  return null;
}

/**
 * 🆕 팀명 정규화 (표시용 + 검색용)
 */
function normalizeTeamNames(homeRaw, awayRaw, leagueKey) {
  console.log(`    📋 정규화: "${homeRaw}" vs "${awayRaw}"`);
  
  const homeResult = findTeamInLeague(homeRaw, leagueKey);
  const awayResult = findTeamInLeague(awayRaw, leagueKey);
  
  return {
    homeDisplay: homeResult?.displayName || homeRaw,
    homeSearch: homeResult?.searchName || homeRaw,
    awayDisplay: awayResult?.displayName || awayRaw,
    awaySearch: awayResult?.searchName || awayRaw,
  };
}

/**
 * 🆕 검색용 팀명으로 경기 검색
 */
async function searchEventByTeams(homeSearch, awaySearch) {
  const cacheKey = `${homeSearch}_vs_${awaySearch}`.toLowerCase();
  if (searchEventsCache[cacheKey]) {
    return searchEventsCache[cacheKey];
  }
  
  // 🆕 검색 쿼리 생성 (공백 → 언더스코어, 점 제거)
  const cleanHome = homeSearch.replace(/\./g, '').replace(/\s+/g, '_');
  const cleanAway = awaySearch.replace(/\./g, '').replace(/\s+/g, '_');
  const searchQuery = `${cleanHome}_vs_${cleanAway}`;
  
  // 🆕 오늘 날짜 (미래 경기 필터용)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  try {
    const url = `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_API_KEY}/searchevents.php?e=${encodeURIComponent(searchQuery)}`;
    console.log(`    🔍 검색: ${searchQuery}`);
    
    const res = await fetch(url);
    if (!res.ok) return null;
    
    const data = await res.json();
    
    if (data.event && data.event.length > 0) {
      // 🆕 미래 경기만 필터링
      const futureEvents = data.event.filter(event => {
        const eventDate = new Date(event.dateEvent);
        return eventDate >= today;
      });
      
      if (futureEvents.length > 0) {
        // 가장 가까운 미래 경기 선택
        const bestMatch = futureEvents.reduce((closest, event) => {
          const eventDate = new Date(event.dateEvent);
          const closestDate = new Date(closest.dateEvent);
          return eventDate < closestDate ? event : closest;
        });
        
        console.log(`    📦 결과: ${bestMatch.strEvent} (${bestMatch.dateEvent})`);
        if (bestMatch.strThumb) console.log(`    🖼️ 썸네일 있음!`);
        
        searchEventsCache[cacheKey] = bestMatch;
        return bestMatch;
      }
      
      console.log(`    ⚠️ 미래 경기 없음 (과거 ${data.event.length}개 있음)`);
    }
    
    // 역순 시도
    const reverseQuery = `${cleanAway}_vs_${cleanHome}`;
    console.log(`    🔄 역순: ${reverseQuery}`);
    
    const reverseUrl = `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_API_KEY}/searchevents.php?e=${encodeURIComponent(reverseQuery)}`;
    const reverseRes = await fetch(reverseUrl);
    const reverseData = await reverseRes.json();
    
    if (reverseData.event && reverseData.event.length > 0) {
      // 🆕 미래 경기만 필터링
      const futureEvents = reverseData.event.filter(event => {
        const eventDate = new Date(event.dateEvent);
        return eventDate >= today;
      });
      
      if (futureEvents.length > 0) {
        const bestMatch = futureEvents.reduce((closest, event) => {
          const eventDate = new Date(event.dateEvent);
          const closestDate = new Date(closest.dateEvent);
          return eventDate < closestDate ? event : closest;
        });
        
        console.log(`    📦 역순 결과: ${bestMatch.strEvent} (${bestMatch.dateEvent})`);
        if (bestMatch.strThumb) console.log(`    🖼️ 썸네일 있음!`);
        
        searchEventsCache[cacheKey] = bestMatch;
        return bestMatch;
      }
      
      console.log(`    ⚠️ 역순도 미래 경기 없음`);
    }
    
    console.log(`    ⚠️ 결과 없음`);
    return null;
  } catch (e) {
    console.log(`    ⚠️ 검색 실패: ${e.message}`);
    return null;
  }
}

async function fetchLeagueEventsV1(leagueId) {
  if (sportsDbEventsCache[leagueId]) {
    return sportsDbEventsCache[leagueId];
  }
  try {
    const url = `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_API_KEY}/eventsnextleague.php?id=${leagueId}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (data.events?.length > 0) {
      sportsDbEventsCache[leagueId] = data.events;
      console.log(`    📦 리그 경기: ${data.events.length}개`);
      return data.events;
    }
    return [];
  } catch { return []; }
}

function normalizeTeamName(name) {
  if (!name) return '';
  let normalized = removeAccents(name.toLowerCase());
  return normalized
    .replace(/\b(fc|cf|sc|ac|as|ss|us|rc|cd|ud|sd|rcd|afc|ssc|1\.|tsg|vfl|vfb|rb|sv)\b/gi, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function teamsMatch(name1, name2) {
  const n1 = normalizeTeamName(name1);
  const n2 = normalizeTeamName(name2);
  if (!n1 || !n2) return false;
  if (n1 === n2) return true;
  if (n1.length >= 3 && n2.length >= 3) {
    if (n1.includes(n2) || n2.includes(n1)) return true;
  }
  const words1 = n1.split(' ').filter(w => w.length >= 3);
  const words2 = n2.split(' ').filter(w => w.length >= 3);
  for (const w1 of words1) {
    for (const w2 of words2) {
      if (w1 === w2 || w1.includes(w2) || w2.includes(w1)) return true;
    }
  }
  return false;
}

function findMatchingEvent(events, homeTeam, awayTeam) {
  if (!events?.length) return null;
  for (const event of events) {
    const eventHome = event.strHomeTeam || '';
    const eventAway = event.strAwayTeam || '';
    if (teamsMatch(homeTeam, eventHome) && teamsMatch(awayTeam, eventAway)) {
      return event;
    }
    if (teamsMatch(homeTeam, eventAway) && teamsMatch(awayTeam, eventHome)) {
      return event;
    }
  }
  return null;
}

async function fetchThumbnail(homeSearch, awaySearch, homeDisplay, awayDisplay, leagueKey) {
  // 1단계: searchevents.php (검색용 이름 사용)
  const searchResult = await searchEventByTeams(homeSearch, awaySearch);
  if (searchResult) {
    if (!isValidMatchDate(searchResult.dateEvent)) {
      return { skip: true, reason: 'date_out_of_range' };
    }
    if (searchResult.strThumb) {
      return { 
        thumbnail: searchResult.strThumb + '/medium', 
        type: 'event', 
        source: 'searchevents', 
        matchDate: searchResult.dateEvent 
      };
    }
    if (searchResult.strPoster) {
      return { 
        thumbnail: searchResult.strPoster + '/medium', 
        type: 'poster', 
        source: 'searchevents', 
        matchDate: searchResult.dateEvent 
      };
    }
  }
  
  await delay(300);
  
  // 2단계: eventsnextleague.php (표시용 이름으로 매칭)
  const leagueInfo = LEAGUE_CODE_MAP[leagueKey];
  if (leagueInfo?.sportsDbId) {
    const events = await fetchLeagueEventsV1(leagueInfo.sportsDbId);
    const matchedEvent = findMatchingEvent(events, homeDisplay, awayDisplay);
    if (matchedEvent) {
      console.log(`    🎯 리그 매칭: ${matchedEvent.strHomeTeam} vs ${matchedEvent.strAwayTeam}`);
      if (!isValidMatchDate(matchedEvent.dateEvent)) {
        return { skip: true, reason: 'date_out_of_range' };
      }
      if (matchedEvent.strThumb) {
        return { 
          thumbnail: matchedEvent.strThumb + '/medium', 
          type: 'event', 
          source: 'eventsnextleague', 
          matchDate: matchedEvent.dateEvent 
        };
      }
      if (matchedEvent.strPoster) {
        return { 
          thumbnail: matchedEvent.strPoster + '/medium', 
          type: 'poster', 
          source: 'eventsnextleague', 
          matchDate: matchedEvent.dateEvent 
        };
      }
    }
  }
  
  return null;
}

function capitalizeWords(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

function extractTeamsFromUrl(url) {
  if (!url) return null;
  
  const urlMatch = url.match(/\/football-match-previews\/(\d+)-(.+)/);
  if (!urlMatch) return null;
  
  let slug = urlMatch[2];
  
  slug = slug
    .replace(/-in-\w+-clash$/i, '')
    .replace(/-at-[\w-]+$/i, '')
    .replace(/-in-[\w-]+$/i, '')
    .replace(/-at-the-[\w-]+$/i, '')
    .replace(/-in-de-[\w-]+$/i, '')
    .replace(/-after-[\w-]+$/i, '');
  
  const patterns = [
    /^(.+?)-(?:hold|holds|have|has)-.*?-over-(.+)/i,
    /^(.+?)-(?:aiming|looking|seeking|hoping|set)-.*?-(?:against|versus|vs)-(.+)/i,
    /^(.+?)-aim-to-.*?-(.+?)s?-(?:rise|run|streak|form|momentum)/i,
    /^(.+?)-(?:eye|eyes|seek|seeks)-.*?-(?:against|versus|vs)-(.+)/i,
    /^(.+?)-(?:face|faces)-.*?-(?:against|versus|vs)-(.+)/i,
    /^(.+?)-(?:look|looks)-to-.*?-(?:against|versus|vs)-(.+)/i,
    /^(.+?)-(?:poised|set)-.*?-(?:against|versus|vs)-(.+)/i,
    /^(.+?)s?-(?:defensive|offensive|home|away)-.*?-(?:faces|meets)-(.+?)s?-/i,
    /^(.+?)-and-(.+?)-(?:seek|look|aim|face|battle|clash|meet)/i,
    /^(.+?)-set-to-.*?-on-(.+?)s?-(?:winless|losing|poor|bad)/i,
    /^(.+?)-aim-to-halt-(.+?)s?-(?:run|rise|streak|momentum|form)/i,
    /^(.+?)-vs-(.+)/i,
    /^(.+?)-versus-(.+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = slug.match(pattern);
    if (match) {
      let home = match[1].replace(/-/g, ' ').trim();
      let away = match[2].replace(/-/g, ' ').trim();
      if (home.length >= 3 && away.length >= 3) {
        return { homeTeam: capitalizeWords(home), awayTeam: capitalizeWords(away) };
      }
    }
  }
  
  return null;
}

function extractTeamsFromTitle(title, url) {
  const urlTeams = extractTeamsFromUrl(url);
  if (urlTeams) {
    console.log(`    🔗 URL 추출: ${urlTeams.homeTeam} vs ${urlTeams.awayTeam}`);
    return urlTeams;
  }
  return null;
}

async function getPreviewLinks(browser) {
  const allLinks = [];
  const seenUrls = new Set();
  
  const page = await browser.newPage();
  page.on('pageerror', () => {});
  page.on('error', () => {});
  
  await page.evaluateOnNewDocument(() => {
    Math.easeInOutQuad = function(t, b, c, d) {
      t /= d / 2;
      if (t < 1) return c / 2 * t * t + b;
      t--;
      return -c / 2 * (t * (t - 2) - 1) + b;
    };
  });
  
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  
  const previewUrl = 'https://www.forebet.com/en/football-match-previews';
  console.log(`  📖 ${previewUrl}`);
  
  try {
    await page.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log(`    ✅ 페이지 로드 완료`);
  } catch (e) {
    console.log(`    ⚠️ 로드 경고`);
  }
  
  await delay(5000);
  
  const pageData = await page.evaluate(() => {
    const links = [];
    const allAnchors = document.querySelectorAll('a');
    
    allAnchors.forEach(a => {
      const href = a.href || '';
      if (!href.match(/\/football-match-previews\/\d+-/)) return;
      
      let title = a.textContent?.trim() || '';
      const parent = a.closest('.rcnt, .preview-item, article, div');
      if (parent) {
        const titleEl = parent.querySelector('h2, h3, h4, .title, .steep_t_title');
        if (titleEl) {
          const parentTitle = titleEl.textContent?.trim() || '';
          if (parentTitle.length > title.length) {
            title = parentTitle;
          }
        }
      }
      
      links.push({ title: title || href, link: href });
    });
    
    return { links, totalAnchors: allAnchors.length };
  }).catch(() => ({ links: [], totalAnchors: 0 }));
  
  console.log(`    🔍 전체: ${pageData.totalAnchors}, 미리보기: ${pageData.links.length}`);
  
  for (const link of pageData.links) {
    if (!seenUrls.has(link.link)) {
      seenUrls.add(link.link);
      allLinks.push(link);
    }
  }
  
  console.log(`    ✅ ${allLinks.length}개 수집`);
  
  await page.close();
  return allLinks;
}

function detectLeague(title, url) {
  const combined = ((title || '') + ' ' + (url || '')).toLowerCase();
  
  for (const league of SUPPORTED_LEAGUES) {
    if (combined.includes(league.replace(/\s+/g, '-')) || combined.includes(league)) {
      return league;
    }
  }
  
  if (combined.match(/\b(frankfurt|dortmund|bayern|leipzig|werder|union-berlin|pauli|freiburg|hoffenheim|leverkusen|mainz|koln|heidenheim|augsburg|bochum|wolfsburg|gladbach|stuttgart|hamburger)\b/)) {
    return 'bundesliga';
  }
  if (combined.match(/\b(ajax|psv|feyenoord|twente|utrecht|nijmegen|groningen|heerenveen|alkmaar|volendam|breda|zwolle|telstar|excelsior)\b/)) {
    return 'eredivisie';
  }
  if (combined.match(/\b(leicester|west-brom|west-bromwich|leeds|sunderland|burnley|sheffield|middlesbrough|norwich|coventry|watford|bristol|swansea|cardiff|hull|stoke|blackburn|millwall|plymouth|preston|qpr)\b/)) {
    return 'championship';
  }
  if (combined.match(/\b(arsenal|chelsea|liverpool|manchester|tottenham|newcastle|aston-villa|brighton|fulham|brentford|bournemouth|crystal-palace|everton|nottingham|west-ham|wolves|ipswich|southampton)\b/)) {
    return 'premier league';
  }
  if (combined.match(/\b(juventus|milan|inter|napoli|roma|lazio|fiorentina|atalanta|bologna|torino|monza|genoa|cagliari|empoli|udinese)\b/)) {
    return 'serie a';
  }
  if (combined.match(/\b(barcelona|real-madrid|atletico|sevilla|villarreal|sociedad|betis|valencia|athletic-bilbao|osasuna|celta|mallorca|getafe)\b/)) {
    return 'la liga';
  }
  if (combined.match(/\b(psg|paris|marseille|lyon|monaco|lille|rennes|nice|lens|montpellier|reims|toulouse|strasbourg|nantes|brest)\b/)) {
    return 'ligue 1';
  }
  
  return null;
}

function filterSupportedLeagues(links) {
  const supported = [];
  let excludedCount = 0;
  
  for (const link of links) {
    const urlLower = (link.link || '').toLowerCase();
    const titleLower = (link.title || '').toLowerCase();
    
    let isExcluded = false;
    for (const excluded of EXCLUDED_LEAGUES) {
      if (urlLower.includes(excluded.replace(/\s+/g, '-')) || titleLower.includes(excluded)) {
        isExcluded = true;
        excludedCount++;
        break;
      }
    }
    if (isExcluded) continue;
    
    const detectedLeague = detectLeague(link.title, link.link);
    
    if (detectedLeague) {
      link.leagueKey = detectedLeague;
      supported.push(link);
    }
  }
  
  console.log(`  🎯 지원: ${supported.length}개, 제외: ${excludedCount}개`);
  return supported;
}

function extractPreviewText(fullText) {
  const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const paragraphs = [];
  let started = false;
  
  for (const line of lines) {
    if (!started && line.length >= 100) started = true;
    if (!started) continue;
    if (line.includes('Probable Lineups')) break;
    if (line.includes('Prediction')) break;
    if (line.includes('©')) break;
    if (line.includes('Related Articles')) break;
    if (line === 'Recent Form') continue;
    if (line === 'Recent History') continue;
    if (line.length >= 80) paragraphs.push(line);
  }
  
  return paragraphs;
}

async function scrapePreviewDetail(browser, previewInfo, teams) {
  const page = await browser.newPage();
  page.on('pageerror', () => {});
  page.on('error', () => {});
  
  await page.evaluateOnNewDocument(() => {
    Math.easeInOutQuad = function(t, b, c, d) {
      t /= d / 2;
      if (t < 1) return c / 2 * t * t + b;
      t--;
      return -c / 2 * (t * (t - 2) - 1) + b;
    };
  });
  
  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await page.goto(previewInfo.link, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    await delay(4000);
    
    const pageData = await page.evaluate(() => {
      const fullText = document.body.innerText || '';
      let articleText = '';
      const containers = [
        document.querySelector('article'),
        document.querySelector('.preview-content'),
        document.querySelector('main'),
      ];
      for (const container of containers) {
        if (container?.innerText?.length > 500) {
          articleText = container.innerText;
          break;
        }
      }
      
      return {
        fullText: articleText || fullText,
        fullTextLength: (articleText || fullText).length,
      };
    }).catch(() => ({ fullText: '', fullTextLength: 0 }));
    
    await page.close();
    
    const paragraphs = extractPreviewText(pageData.fullText);
    const previewText = paragraphs.join('\n\n');
    const leagueInfo = LEAGUE_CODE_MAP[previewInfo.leagueKey] || { code: 'OTHER', nameKr: '기타' };
    
    return {
      homeTeam: teams.homeDisplay,
      awayTeam: teams.awayDisplay,
      previewParagraphs: paragraphs,
      previewText,
      leagueCode: leagueInfo.code,
      leagueKr: leagueInfo.nameKr,
      leagueKey: previewInfo.leagueKey,
      sourceUrl: previewInfo.link,
      originalTitle: previewInfo.title,
      fullTextLength: pageData.fullTextLength,
      scrapedAt: new Date().toISOString()
    };
    
  } catch (e) {
    console.log(`    ❌ Error: ${e.message.substring(0, 50)}`);
    await page.close();
    return null;
  }
}

async function scrapeForebetPreviews() {
  console.log('🚀 Forebet Scraper v33 (미래 경기만 필터)');
  console.log(`🔑 API Key: ${SPORTSDB_API_KEY} (무료)`);
  console.log('📅 ' + new Date().toISOString());
  console.log(`🎯 지원 리그: ${SUPPORTED_LEAGUES.length}개\n`);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
      '--disable-blink-features=AutomationControlled',
    ]
  });
  
  try {
    const allLinks = await getPreviewLinks(browser);
    if (!allLinks.length) { 
      console.log('❌ 미리보기 링크를 찾지 못했습니다.');
      await browser.close(); 
      return []; 
    }
    
    const supportedLinks = filterSupportedLeagues(allLinks);
    if (!supportedLinks.length) { 
      console.log('❌ 지원 리그 링크가 없습니다.');
      await browser.close(); 
      return []; 
    }
    
    const linksToProcess = supportedLinks.slice(0, MAX_POSTS_PER_DAY);
    console.log(`\n📖 Scraping ${linksToProcess.length}개...\n`);
    
    const allPreviews = [];
    let skippedByDate = 0;
    let skippedNoThumb = 0;
    let skippedNoTeams = 0;
    let withThumb = 0;
    let withoutThumb = 0;
    
    for (let i = 0; i < linksToProcess.length; i++) {
      const preview = linksToProcess[i];
      console.log(`[${i+1}/${linksToProcess.length}] ${preview.leagueKey}`);
      console.log(`    🔗 ${preview.link.substring(0, 80)}...`);
      
      const rawTeams = extractTeamsFromTitle(preview.title, preview.link);
      if (!rawTeams) {
        console.log(`    ⚠️ 팀명 추출 실패`);
        skippedNoTeams++;
        continue;
      }
      
      // 🆕 팀명 정규화 (표시용 + 검색용)
      const normalized = normalizeTeamNames(rawTeams.homeTeam, rawTeams.awayTeam, preview.leagueKey);
      
      console.log(`    📍 ${normalized.homeDisplay} vs ${normalized.awayDisplay}`);
      
      const data = await scrapePreviewDetail(browser, preview, {
        homeDisplay: normalized.homeDisplay,
        awayDisplay: normalized.awayDisplay,
      });
      
      if (data) {
        // 🆕 검색용 이름으로 썸네일 검색
        const thumbResult = await fetchThumbnail(
          normalized.homeSearch,
          normalized.awaySearch,
          normalized.homeDisplay,
          normalized.awayDisplay,
          data.leagueKey
        );
        
        if (thumbResult?.skip) {
          skippedByDate++;
          continue;
        }
        
        if (thumbResult) {
          data.thumbnail = thumbResult.thumbnail;
          data.thumbnailType = thumbResult.type;
          data.thumbnailSource = thumbResult.source;
          if (thumbResult.matchDate) data.matchDate = thumbResult.matchDate;
          
          console.log(`    📸 ${thumbResult.type} (${thumbResult.source})`);
          allPreviews.push(data);
          withThumb++;
          console.log(`    ✅ ${data.leagueKr} | 📝 ${data.previewText.length}자`);
        } else if (!REQUIRE_THUMBNAIL) {
          // 🆕 썸네일 없어도 포함
          console.log(`    📝 썸네일 없이 포함`);
          allPreviews.push(data);
          withoutThumb++;
          console.log(`    ✅ ${data.leagueKr} | 📝 ${data.previewText.length}자`);
        } else {
          console.log(`    ⏭️ 썸네일 없음`);
          skippedNoThumb++;
        }
      }
      
      await delay(2500);
    }
    
    await browser.close();
    
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📊 결과: ${allPreviews.length}개 (썸네일 있음: ${withThumb}, 없음: ${withoutThumb})`);
    console.log(`⏭️ 팀명 추출 실패: ${skippedNoTeams}개`);
    console.log(`⏭️ 날짜 범위 외: ${skippedByDate}개`);
    if (REQUIRE_THUMBNAIL) {
      console.log(`⏭️ 썸네일 없음: ${skippedNoThumb}개`);
    }
    
    fs.writeFileSync('scraped-previews.json', JSON.stringify(allPreviews, null, 2));
    console.log(`💾 Saved to scraped-previews.json`);
    
    return allPreviews;
    
  } catch (error) {
    console.error('❌ Error:', error);
    await browser.close();
    throw error;
  }
}

scrapeForebetPreviews()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });