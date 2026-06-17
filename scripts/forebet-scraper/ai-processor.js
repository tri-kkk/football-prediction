/**
 * AI Processor v7 - Claude Edition
 * - 🆕 에레디비시/챔피언십/분데스리가 팀 한글 번역 추가
 * - Anthropic Claude API 사용
 * - 한글 + 영문 동시 생성
 * - 1500-2000자 분량 (각 언어별)
 * - 구조화된 섹션
 * - 자연스러운 문체
 */

const fs = require('fs');

// Claude API 설정
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const CLAUDE_URL = 'https://api.anthropic.com/v1/messages';

const TEAM_KR = {
  // 🏴󠁧󠁢󠁥󠁮󠁧󠁿 프리미어리그
  'Manchester United': '맨유', 'Manchester City': '맨시티',
  'Liverpool': '리버풀', 'Chelsea': '첼시', 'Arsenal': '아스날', 'Tottenham': '토트넘',
  'Newcastle': '뉴캐슬', 'Newcastle United': '뉴캐슬',
  'Aston Villa': '아스톤빌라', 'Brighton': '브라이튼',
  'West Ham': '웨스트햄', 'Everton': '에버턴', 'Fulham': '풀럼',
  'Bournemouth': '본머스', 'Wolves': '울버햄튼', 'Crystal Palace': '크리스탈 팰리스',
  'Brentford': '브렌트포드', 'Nottingham Forest': '노팅엄', 'Ipswich': '입스위치',
  'Ipswich Town': '입스위치', 'Leicester': '레스터', 'Leicester City': '레스터',
  'Southampton': '사우샘프턴',
  
  // 🇪🇸 라리가
  'Real Madrid': '레알 마드리드', 'Barcelona': '바르셀로나',
  'Atletico Madrid': '아틀레티코', 'Sevilla': '세비야', 'Real Betis': '레알 베티스',
  'Real Sociedad': '레알 소시에다드', 'Villarreal': '비야레알', 'Athletic Bilbao': '빌바오',
  'Valencia': '발렌시아', 'Girona': '지로나', 'Celta Vigo': '셀타',
  'Osasuna': '오사수나', 'Mallorca': '마요르카', 'Getafe': '헤타페',
  'Rayo Vallecano': '라요 바예카노', 'Alaves': '알라베스', 'Las Palmas': '라스팔마스',
  'Espanyol': '에스파뇰', 'Leganes': '레가네스', 'Valladolid': '바야돌리드',
  
  // 🇩🇪 분데스리가
  'Bayern Munich': '바이에른', 'Borussia Dortmund': '도르트문트',
  'RB Leipzig': '라이프치히', 'Bayer Leverkusen': '레버쿠젠',
  'Eintracht Frankfurt': '프랑크푸르트', 'VfB Stuttgart': '슈투트가르트', 'Stuttgart': '슈투트가르트',
  'SC Freiburg': '프라이부르크', 'Freiburg': '프라이부르크',
  'VfL Wolfsburg': '볼프스부르크', 'Wolfsburg': '볼프스부르크',
  'Borussia Monchengladbach': '묀헨글라트바흐',
  'Werder Bremen': '베르더 브레멘',
  'TSG Hoffenheim': '호펜하임', 'Hoffenheim': '호펜하임',
  'Union Berlin': '우니온 베를린',
  'Mainz 05': '마인츠', 'Mainz': '마인츠',
  'FC Augsburg': '아우크스부르크', 'Augsburg': '아우크스부르크',
  'VfL Bochum': '보훔', 'Bochum': '보훔',
  'FC Koln': '쾰른', 'Koln': '쾰른',
  '1. FC Heidenheim': '하이덴하임', 'Heidenheim': '하이덴하임',
  'FC St. Pauli': '장크트 파울리', 'St Pauli': '장크트 파울리', 'St. Pauli': '장크트 파울리',
  'Holstein Kiel': '홀슈타인 킬',
  'Hamburger SV': '함부르크', 'Hamburg': '함부르크',
  'Hertha BSC': '헤르타 베를린',
  'Schalke 04': '샬케',
  'Fortuna Dusseldorf': '뒤셀도르프',
  'Hannover 96': '하노버',
  
  // 🇮🇹 세리에A
  'Juventus': '유벤투스', 'Inter Milan': '인테르', 'Inter': '인테르',
  'AC Milan': 'AC밀란', 'Milan': 'AC밀란',
  'Napoli': '나폴리', 'Roma': '로마', 'Lazio': '라치오',
  'Atalanta': '아탈란타', 'Fiorentina': '피오렌티나', 'Bologna': '볼로냐',
  'Torino': '토리노', 'Monza': '몬차', 'Genoa': '제노아',
  'Cagliari': '칼리아리', 'Empoli': '엠폴리', 'Udinese': '우디네세',
  'Sassuolo': '사수올로', 'Lecce': '레체', 'Verona': '베로나',
  'Parma': '파르마', 'Venezia': '베네치아', 'Como': '코모',
  
  // 🇫🇷 리그1
  'PSG': 'PSG', 'Paris Saint-Germain': 'PSG', 'Marseille': '마르세유',
  'Lyon': '리옹', 'Monaco': '모나코', 'Lille': '릴',
  'Nice': '니스', 'Lens': '랑스', 'Rennes': '렌',
  'Nantes': '낭트', 'Strasbourg': '스트라스부르',
  'Montpellier': '몽펠리에', 'Reims': '랭스', 'Toulouse': '툴루즈',
  'Brest': '브레스트', 'Le Havre': '르아브르', 'Auxerre': '오세르',
  'Angers': '앙제', 'Saint-Etienne': '생테티엔',
  
  // 🇳🇱 에레디비시
  'Ajax': '아약스', 'Feyenoord': '페예노르트', 'PSV': 'PSV', 'PSV Eindhoven': 'PSV',
  'AZ Alkmaar': 'AZ 알크마르', 'AZ': 'AZ 알크마르',
  'FC Twente': 'FC 트벤테', 'Twente': 'FC 트벤테',
  'FC Utrecht': 'FC 위트레흐트', 'Utrecht': 'FC 위트레흐트',
  'SC Heerenveen': '헤이렌베인', 'Heerenveen': '헤이렌베인',
  'FC Groningen': '흐로닝언', 'Groningen': '흐로닝언',
  'NEC Nijmegen': 'NEC 네이메헌', 'NEC': 'NEC 네이메헌', 'Nijmegen': 'NEC 네이메헌',
  'Vitesse': '피테세',
  'Go Ahead Eagles': '고 어헤드 이글스',
  'Sparta Rotterdam': '스파르타 로테르담',
  'Fortuna Sittard': '포르투나 시타르트',
  'RKC Waalwijk': 'RKC 발베이크', 'Waalwijk': 'RKC 발베이크',
  'Heracles Almelo': '헤라클레스', 'Heracles': '헤라클레스',
  'PEC Zwolle': 'PEC 즈볼레', 'Zwolle': 'PEC 즈볼레',
  'NAC Breda': 'NAC 브레다', 'Breda': 'NAC 브레다',
  'FC Volendam': '폴렌담', 'Volendam': '폴렌담',
  'SC Telstar': '텔스타르', 'Telstar': '텔스타르',
  'Excelsior': '엑셀시오르',
  'Willem II': '빌럼 II',
  'Almere City': '알메르 시티',
  
  // 🏴󠁧󠁢󠁥󠁮󠁧󠁿 챔피언십
  'Leeds United': '리즈', 'Leeds': '리즈',
  'Burnley': '번리',
  'Sunderland': '선덜랜드',
  'Sheffield United': '셰필드 유나이티드', 'Sheffield Utd': '셰필드 유나이티드',
  'West Brom': '웨스트 브롬', 'West Bromwich': '웨스트 브롬', 'West Bromwich Albion': '웨스트 브롬',
  'Middlesbrough': '미들즈브러',
  'Norwich City': '노리치', 'Norwich': '노리치',
  'Coventry City': '코번트리', 'Coventry': '코번트리',
  'Watford': '왓포드',
  'Bristol City': '브리스톨 시티',
  'Swansea City': '스완지', 'Swansea': '스완지',
  'Cardiff City': '카디프', 'Cardiff': '카디프',
  'Hull City': '헐 시티', 'Hull': '헐 시티',
  'Stoke City': '스토크', 'Stoke': '스토크',
  'Blackburn Rovers': '블랙번', 'Blackburn': '블랙번',
  'Millwall': '밀월',
  'Plymouth Argyle': '플리머스', 'Plymouth': '플리머스',
  'Preston North End': '프레스턴', 'Preston': '프레스턴',
  'QPR': 'QPR', 'Queens Park Rangers': 'QPR',
  'Luton Town': '루턴', 'Luton': '루턴',
  'Sheffield Wednesday': '셰필드 웬즈데이',
  'Derby County': '더비', 'Derby': '더비',
  'Oxford United': '옥스퍼드', 'Oxford': '옥스퍼드',
  'Portsmouth': '포츠머스',
  
  // ⭐ 챔피언스리그 / 유로파
  'Sporting': '스포르팅', 'Sporting CP': '스포르팅',
  'Benfica': '벤피카', 'Porto': '포르투', 'FC Porto': '포르투',
  'Celtic': '셀틱', 'Rangers': '레인저스',
  'København': '코펜하겐', 'FC Copenhagen': '코펜하겐',
  'Club Brugge': '클럽 브뤼헤',
  'RB Salzburg': '잘츠부르크', 'Salzburg': '잘츠부르크',
  'Shakhtar Donetsk': '샤흐타르', 'Shakhtar': '샤흐타르',
  'Dinamo Zagreb': '디나모 자그레브',
  'Olympiacos': '올림피아코스',
  'Fenerbahce': '페네르바체',
  'Galatasaray': '갈라타사라이',
  'Besiktas': '베식타시',
};

const LEAGUE_EN = {
  '프리미어리그': 'Premier League',
  '라리가': 'La Liga',
  '분데스리가': 'Bundesliga',
  '세리에A': 'Serie A',
  '리그1': 'Ligue 1',
  '챔피언스리그': 'Champions League',
  '유로파리그': 'Europa League',
  'UEFA 컨퍼런스리그': 'Conference League',
  'UEFA 네이션스리그': 'Nations League',
  '에레디비시': 'Eredivisie',
  '챔피언십': 'Championship',
};

function getTeamKr(name) {
  if (!name) return '';
  if (TEAM_KR[name]) return TEAM_KR[name];
  for (const [eng, kr] of Object.entries(TEAM_KR)) {
    if (name.toLowerCase().includes(eng.toLowerCase())) return kr;
    if (eng.toLowerCase().includes(name.toLowerCase())) return kr;
  }
  return name;
}

function getLeagueEn(leagueKr) {
  return LEAGUE_EN[leagueKr] || leagueKr;
}

// 🎲 다양성 알고리즘 - 매번 다른 스타일로 작성
function getRandomStyle() {
  // 인트로 스타일 (5가지)
  const introStyles = [
    '질문형: "과연 누가 웃을까요?" 같은 질문으로 시작',
    '통계형: 핵심 수치나 기록으로 시작 (예: "최근 10경기 7승...")',
    '스토리형: 양팀의 상황이나 배경 설명으로 시작',
    '긴장감형: 경기의 중요성과 긴장감을 강조하며 시작',
    '비유형: 비유나 은유를 활용해 시작 (예: "프리미어리그의 엘클라시코...")'
  ];
  
  // 문체 스타일 (4가지)
  const toneStyles = [
    '분석적: 데이터와 전술 중심의 객관적 톤',
    '열정적: 팬의 시선에서 감정을 담아 서술',
    '해설자형: 중계하듯 생동감 있게 서술',
    '칼럼니스트형: 깊이 있는 통찰과 견해 제시'
  ];
  
  // 구조 변형 (4가지)
  const structureStyles = [
    '기본형: 폼비교 → 전술분석 → 승부처 → 예측',
    '전술우선형: 전술분석 → 폼비교 → 키플레이어 → 예측',
    '스토리형: 배경설명 → 양팀현황 → 맞대결포인트 → 전망',
    '데이터형: 핵심통계 → 트렌드분석 → 변수 → 예측'
  ];
  
  // 승부처 표현 (4가지)
  const keyPointStyles = [
    '3가지 승부처를 ### 소제목으로 나눠서',
    '4가지 핵심 포인트를 간결하게',
    '2가지 핵심 + 1가지 변수 형태로',
    '선수 vs 선수 매치업 중심으로 3개'
  ];
  
  // 마무리 스타일 (4가지)  
  const endingStyles = [
    '확신형: 예측에 대한 근거를 명확히 제시',
    '조심스러운형: 변수를 언급하며 열린 결말',
    '팬심자극형: 응원 포인트나 관전 포인트 제시',
    '기대감형: 경기에 대한 기대감으로 마무리'
  ];

  return {
    intro: introStyles[Math.floor(Math.random() * introStyles.length)],
    tone: toneStyles[Math.floor(Math.random() * toneStyles.length)],
    structure: structureStyles[Math.floor(Math.random() * structureStyles.length)],
    keyPoints: keyPointStyles[Math.floor(Math.random() * keyPointStyles.length)],
    ending: endingStyles[Math.floor(Math.random() * endingStyles.length)]
  };
}

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function processWithClaude(match) {
  const homeKr = getTeamKr(match.homeTeam);
  const awayKr = getTeamKr(match.awayTeam);
  const homeEn = match.homeTeam;
  const awayEn = match.awayTeam;
  const leagueEn = getLeagueEn(match.leagueKr);
  
  const previewText = match.previewParagraphs?.join('\n\n') || match.previewText || '';
  const h2hText = match.h2h?.slice(0,5).join('\n') || '';
  const injuriesText = match.injuries?.slice(0,5).join('\n') || '';
  
  // 🎲 이번 포스트에 적용할 랜덤 스타일 선택
  const style = getRandomStyle();
  console.log(`    🎨 Style: ${style.tone.split(':')[0]} / ${style.intro.split(':')[0]}`);

  const prompt = `당신은 TrendSoccer의 전문 축구 분석 블로그 작성자입니다. 한글과 영문 버전을 동시에 작성합니다.

## 🎲 이번 포스트 스타일 (반드시 적용!)
- **인트로**: ${style.intro}
- **전체 문체**: ${style.tone}
- **글 구조**: ${style.structure}
- **승부처 표현**: ${style.keyPoints}
- **마무리**: ${style.ending}

⚠️ 위 스타일을 반드시 반영해서 작성하세요. 매번 같은 패턴은 안 됩니다!

## 📋 경기 정보
- 리그: ${match.leagueKr} (${leagueEn})
- 홈팀: ${homeKr} (${homeEn})
- 원정팀: ${awayKr} (${awayEn})
- 날짜: ${match.matchDate || '미정'}

## 📊 예측 데이터
- 예측: ${match.prediction || '미정'}
- 확률: 홈 ${match.probHome || '?'}% / 무 ${match.probDraw || '?'}% / 원정 ${match.probAway || '?'}%
- 예상 스코어: ${match.predictedScore || '미정'}

## 📈 팀 폼
- ${homeEn}: ${match.homeForm || '정보없음'}
- ${awayEn}: ${match.awayForm || '정보없음'}

## 🔄 상대전적
${h2hText || '정보 없음'}

## 🤕 부상자
${injuriesText || '주요 부상자 없음'}

## 📝 참고 자료
${previewText.substring(0, 2000) || '없음'}

---

## ✍️ 작성 지침

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요.

{
  "title_kr": "SEO 친화적 한글 제목 (25-40자)",
  "title": "SEO-friendly English title (50-80 chars)",
  "slug": "english-url-slug-format",
  "excerpt": "한글 요약 (80-120자)",
  "excerpt_en": "English excerpt (100-150 chars)",
  "content": "한글 마크다운 본문 (반드시 1800-2200자, 짧으면 안됨)",
  "content_en": "English markdown content (must be 1800-2200 chars)",
  "tags": ["Tag1", "Tag2", "Tag3", "Tag4", "Tag5"]
}

---

## ⚠️ 분량 필수 (최우선!)
- 한글 content: **반드시 1800자 이상** (각 섹션 충분히 작성)
- 영문 content_en: **반드시 1800자 이상**
- 짧게 쓰면 실패로 간주됨
- 각 섹션별로 2-3문단씩 충분히 작성할 것

---

## 🚫 AI 문체 회피 (매우 중요!)

### ❌ 절대 하지 말 것
- "첫째, 둘째, 셋째" 나열식 금지
- "또한", "더불어", "아울러" 과도한 사용 금지
- "~할 것으로 예상됩니다" 반복 금지
- "~에 대해 살펴보겠습니다" 금지
- "In conclusion", "To summarize" 금지
- 인사말 금지: "안녕하세요", "TrendSoccer입니다"
- 마무리 인사 금지: "감사합니다", "다음에 또 만나요"
- 면책조항 금지
- 마크다운 표(테이블) 사용 금지

### ✅ 반드시 할 것
- 자연스러운 구어체: "~네요", "~죠", "~거든요", "~할 것 같아요"
- 독자에게 말 걸기: "어떻게 보시나요?", "주목해야 합니다"
- 다양한 문장 길이 (짧은 문장 → 중간 → 긴 문장 리듬감)
- 비유와 예시 활용
- 통계는 리스트로 표현 (표 대신)
- **굵게**로 핵심 수치 강조

---

## 📝 한글 본문 구조 (content) - 1800-2200자
⚠️ 아래는 기본 구조이며, 위에서 지정된 "글 구조" 스타일에 맞게 변형하세요!

# ${homeKr} vs ${awayKr}: [임팩트 있는 부제]

[인트로 - 위에서 지정된 인트로 스타일 적용!]

## 📊 양팀 최근 폼 비교

**${homeKr}**
- 최근 5경기: **X승 X무 X패**
- 평균 득점: **X.X골**
- 강점/약점 자연스럽게 설명

**${awayKr}**
- 최근 5경기: **X승 X무 X패**
- 평균 득점: **X.X골**
- 강점/약점 자연스럽게 설명

[폼 비교 코멘트 1-2문장]

## 🎯 전술 분석

### ${homeKr}의 전략
[2-3문단, 포메이션, 핵심 선수, 공격/수비 패턴]

### ${awayKr}의 대응
[2-3문단, 어떻게 맞설지 분석]

## 💡 승부처

### 1. [핵심 매치업 제목]
[설명 2-3문장]

### 2. [두 번째 포인트]
[설명 2-3문장]

### 3. [세 번째 포인트]
[설명 2-3문장]

## 📈 예측

**예상 스코어**: ${match.predictedScore || 'X-X'}

[예측 근거 2-3문장, 자연스러운 마무리]

---

## 📝 영문 본문 구조 (content_en) - 1800-2200 chars

# ${homeEn} vs ${awayEn}: [Engaging Subtitle]

[Intro 2-3 sentences]

## 📊 Form Guide

**${homeEn}**
- Last 5 matches: **X wins, X draws, X losses**
- Goals per game: **X.X**
- Key strengths/weaknesses

**${awayEn}**
- Last 5 matches: **X wins, X draws, X losses**
- Goals per game: **X.X**
- Key strengths/weaknesses

## 🎯 Tactical Preview

### ${homeEn}'s Approach
[2-3 paragraphs]

### ${awayEn}'s Game Plan
[2-3 paragraphs]

## 💡 Key Battles

### 1. [First key matchup]
[2-3 sentences]

### 2. [Second point]
[2-3 sentences]

### 3. [Third point]
[2-3 sentences]

## 📈 Prediction

**Expected Score**: ${match.predictedScore || 'X-X'}

[Reasoning 2-3 sentences]

---

## 🏷️ 태그 규칙
- 반드시 5개 태그
- 영문으로 작성
- 리그명, 양팀명, 분석 유형 포함
- 예: ["Premier League", "Liverpool", "Manchester City", "Match Preview", "Big Match"]`;

  try {
    const response = await fetch(CLAUDE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 12000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const responseText = data.content?.[0]?.text || '';
    
    // JSON 추출
    let jsonStr = responseText;
    const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1];
    } else {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) jsonStr = jsonMatch[0];
    }
    
    // JSON 파싱
    let result;
    try {
      result = JSON.parse(jsonStr);
    } catch (parseError) {
      console.log(`  ⚠️ JSON parse error, trying to fix...`);
      // 줄바꿈 이스케이프 처리
      const fixedJson = jsonStr
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '')
        .replace(/\t/g, '\\t');
      
      try {
        result = JSON.parse(fixedJson);
      } catch (secondError) {
        // 필드별 추출 시도
        const titleKrMatch = jsonStr.match(/"title_kr"\s*:\s*"([^"]+)"/);
        const titleMatch = jsonStr.match(/"title"\s*:\s*"([^"]+)"/);
        const slugMatch = jsonStr.match(/"slug"\s*:\s*"([^"]+)"/);
        
        if (titleKrMatch || titleMatch) {
          console.log(`  ⚠️ Partial extraction used`);
          result = {
            title_kr: titleKrMatch?.[1] || '',
            title: titleMatch?.[1] || '',
            slug: slugMatch?.[1] || generateSlug(homeEn, awayEn),
            excerpt: '',
            excerpt_en: '',
            content: '',
            content_en: '',
            tags: []
          };
        } else {
          throw secondError;
        }
      }
    }
    
    // 태그 정리
    let tags = result.tags || [leagueEn, homeEn, awayEn, 'Preview', 'Analysis'];
    if (typeof tags === 'string') tags = tags.split(',').map(t => t.trim());
    
    return {
      ...match,
      // 한글
      title_kr: result.title_kr || result.title,
      excerpt: result.excerpt,
      content: result.content,
      summary: result.excerpt,
      // 영문
      title: result.title || result.title_kr,
      excerpt_en: result.excerpt_en || result.excerpt,
      content_en: result.content_en || result.content,
      // 공통
      slug: result.slug || generateSlug(homeEn, awayEn),
      tags: tags,
      homeTeamKr: homeKr,
      awayTeamKr: awayKr,
      homeTeam: homeEn,
      awayTeam: awayEn,
      // 발행 설정
      published: true,
      published_en: true,
      // 메타
      ai_model: 'claude-sonnet-4',
      processed_at: new Date().toISOString()
    };
  } catch (e) {
    console.log(`  ⚠️ AI error: ${e.message}`);
    return createFallback(match, homeKr, awayKr, homeEn, awayEn, leagueEn);
  }
}

function generateSlug(home, away) {
  const h = home.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/--+/g, '-');
  const a = away.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/--+/g, '-');
  const date = new Date().toISOString().slice(0, 10);
  return `${h}-vs-${a}-preview-${date}`;
}

function createFallback(match, homeKr, awayKr, homeEn, awayEn, leagueEn) {
  const contentKr = `# ${homeKr} vs ${awayKr}: ${match.leagueKr} 프리뷰

${match.leagueKr}에서 ${homeKr}와 ${awayKr}의 경기가 예정되어 있습니다.

## 📊 경기 정보

**${homeKr}** (홈)
- 최근 폼을 확인해주세요

**${awayKr}** (원정)
- 최근 폼을 확인해주세요

## 🎯 예측

예상 결과: ${match.prediction || '미정'}
예상 스코어: ${match.predictedScore || '미정'}`;

  const contentEn = `# ${homeEn} vs ${awayEn}: ${leagueEn} Preview

${homeEn} faces ${awayEn} in an upcoming ${leagueEn} match.

## 📊 Match Info

**${homeEn}** (Home)
- Check recent form

**${awayEn}** (Away)
- Check recent form

## 🎯 Prediction

Expected Result: ${match.prediction || 'TBD'}
Expected Score: ${match.predictedScore || 'TBD'}`;

  return {
    ...match,
    title_kr: `${homeKr} vs ${awayKr} 프리뷰`,
    excerpt: `${match.leagueKr} ${homeKr} vs ${awayKr} 경기 분석`,
    content: contentKr,
    summary: `${match.leagueKr} ${homeKr} vs ${awayKr} 경기 분석`,
    title: `${homeEn} vs ${awayEn} Preview`,
    excerpt_en: `${leagueEn} ${homeEn} vs ${awayEn} match analysis`,
    content_en: contentEn,
    slug: generateSlug(homeEn, awayEn),
    tags: [leagueEn, homeEn, awayEn, 'Preview'],
    homeTeamKr: homeKr,
    awayTeamKr: awayKr,
    homeTeam: homeEn,
    awayTeam: awayEn,
    published: true,
    published_en: true,
    ai_model: 'fallback',
    processed_at: new Date().toISOString()
  };
}

async function processAll() {
  console.log('🤖 AI Processing v7 (Claude Edition)\n');
  console.log('📦 Model: claude-sonnet-4');
  console.log('🌐 Output: 한글 + English');
  console.log('🆕 팀 번역: 에레디비시/챔피언십/분데스리가 추가\n');
  
  if (!fs.existsSync('scraped-previews.json')) {
    console.error('❌ scraped-previews.json not found');
    process.exit(1);
  }
  
  const matches = JSON.parse(fs.readFileSync('scraped-previews.json'));
  if (!matches.length) { 
    fs.writeFileSync('processed-previews.json', '[]'); 
    console.log('⚠️ No matches to process');
    return; 
  }
  
  console.log(`📊 Processing ${matches.length} matches...\n`);
  
  const processed = [];
  for (let i = 0; i < matches.length; i++) {
    const homeKr = getTeamKr(matches[i].homeTeam);
    const awayKr = getTeamKr(matches[i].awayTeam);
    console.log(`[${i+1}/${matches.length}] ${homeKr} vs ${awayKr}`);
    console.log(`    📍 ${matches[i].homeTeam} vs ${matches[i].awayTeam}`);
    
    const result = await processWithClaude(matches[i]);
    processed.push(result);
    
    const contentKrLen = (result.content || '').length;
    const contentEnLen = (result.content_en || '').length;
    const model = result.ai_model === 'fallback' ? '⚠️ fallback' : '✅ claude';
    console.log(`    ${model}`);
    console.log(`    🇰🇷 "${result.title_kr}" (${contentKrLen}자)`);
    console.log(`    🇺🇸 "${result.title}" (${contentEnLen} chars)\n`);
    
    // Rate limit 대비 1초 대기
    if (i < matches.length - 1) await delay(1000);
  }
  
  fs.writeFileSync('processed-previews.json', JSON.stringify(processed, null, 2));
  console.log(`\n💾 Saved ${processed.length} posts to processed-previews.json`);
  
  const successCount = processed.filter(p => p.ai_model !== 'fallback').length;
  console.log(`✅ AI 처리 성공: ${successCount}/${processed.length}`);
  console.log(`🌐 각 포스트: 한글 + 영문 버전 포함`);
}

if (!ANTHROPIC_API_KEY) { 
  console.error('❌ ANTHROPIC_API_KEY required');
  console.error('   Set: $env:ANTHROPIC_API_KEY="your-api-key"');
  process.exit(1); 
}

processAll().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });