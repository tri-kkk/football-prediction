/**
 * AI Processor v5 - Bilingual Edition
 * - Google Gemini API 사용 (무료 1,500회/일)
 * - 한글 + 영문 동시 생성
 * - 1500-2000자 분량 (각 언어별)
 * - 구조화된 섹션
 * - 자연스러운 문체 (AI 티 제거)
 */

const fs = require('fs');

// Gemini API 설정
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const TEAM_KR = {
  'Manchester United': '맨유', 'Manchester City': '맨시티',
  'Liverpool': '리버풀', 'Chelsea': '첼시', 'Arsenal': '아스날', 'Tottenham': '토트넘',
  'Newcastle': '뉴캐슬', 'Aston Villa': '아스톤빌라', 'Brighton': '브라이튼',
  'West Ham': '웨스트햄', 'Everton': '에버턴', 'Fulham': '풀럼',
  'Bournemouth': '본머스', 'Wolves': '울버햄튼', 'Crystal Palace': '크리스탈 팰리스',
  'Brentford': '브렌트포드', 'Nottingham Forest': '노팅엄', 'Ipswich': '입스위치',
  'Leicester': '레스터', 'Southampton': '사우샘프턴',
  'Real Madrid': '레알 마드리드', 'Barcelona': '바르셀로나',
  'Atletico Madrid': '아틀레티코', 'Sevilla': '세비야', 'Real Betis': '레알 베티스',
  'Real Sociedad': '레알 소시에다드', 'Villarreal': '비야레알', 'Athletic Bilbao': '빌바오',
  'Valencia': '발렌시아', 'Girona': '지로나', 'Celta Vigo': '셀타',
  'Bayern Munich': '바이에른', 'Borussia Dortmund': '도르트문트',
  'RB Leipzig': '라이프치히', 'Bayer Leverkusen': '레버쿠젠',
  'Eintracht Frankfurt': '프랑크푸르트', 'Stuttgart': '슈투트가르트',
  'Freiburg': '프라이부르크', 'Wolfsburg': '볼프스부르크',
  'Juventus': '유벤투스', 'Inter Milan': '인테르', 'Inter': '인테르',
  'AC Milan': 'AC밀란', 'Milan': 'AC밀란',
  'Napoli': '나폴리', 'Roma': '로마', 'Lazio': '라치오',
  'Atalanta': '아탈란타', 'Fiorentina': '피오렌티나', 'Bologna': '볼로냐',
  'Torino': '토리노', 'Monza': '몬차', 'Genoa': '제노아',
  'PSG': 'PSG', 'Paris Saint-Germain': 'PSG', 'Marseille': '마르세유',
  'Lyon': '리옹', 'Monaco': '모나코', 'Lille': '릴',
  'Nice': '니스', 'Lens': '랑스', 'Rennes': '렌',
  'Nantes': '낭트', 'Strasbourg': '스트라스부르',
  'Sporting': '스포르팅', 'Benfica': '벤피카', 'Porto': '포르투',
  'Ajax': '아약스', 'Feyenoord': '페예노르트', 'PSV': 'PSV',
  'Celtic': '셀틱', 'Rangers': '레인저스',
  'København': '코펜하겐', 'Club Brugge': '클럽 브뤼헤',
};

// 리그명 영문 매핑
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
  }
  return name;
}

function getLeagueEn(leagueKr) {
  return LEAGUE_EN[leagueKr] || leagueKr;
}

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function processWithGemini(match) {
  const homeKr = getTeamKr(match.homeTeam);
  const awayKr = getTeamKr(match.awayTeam);
  const homeEn = match.homeTeam;
  const awayEn = match.awayTeam;
  const leagueEn = getLeagueEn(match.leagueKr);
  
  const previewText = match.previewParagraphs?.join('\n\n') || '';
  const h2hText = match.h2h?.slice(0,5).join('\n') || '';
  const injuriesText = match.injuries?.slice(0,5).join('\n') || '';

  const prompt = `당신은 TrendSoccer의 전문 축구 분석 블로그 작성자입니다. 한글과 영문 버전을 동시에 작성합니다.

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

## 📝 참고 자료 (원본 분석 - 영어)
${previewText.substring(0, 1500) || '없음'}

---

## ✍️ 작성 지침

### 필수 출력 (JSON만 출력하세요)
{
  "title_kr": "SEO 친화적 한글 제목 (25-40자)",
  "title": "SEO-friendly English title (50-80 chars)",
  "slug": "english-url-slug-format",
  "excerpt": "한글 요약 (80-120자)",
  "excerpt_en": "English excerpt (100-150 chars)",
  "content": "한글 마크다운 본문 (1500-2000자)",
  "content_en": "English markdown content (1500-2000 chars)",
  "tags": ["Tag1", "Tag2", "Tag3", "Tag4", "Tag5"]
}

### 한글 본문 구조 (content)

# ${homeKr} vs ${awayKr}: [부제]

[인트로 2-3문장]

## 📊 양팀 현황

**${homeKr}**
- 최근 폼: X승 X무 X패
- 강점/약점 분석

**${awayKr}**
- 최근 폼: X승 X무 X패
- 강점/약점 분석

## 🎯 전술 분석

### ${homeKr}의 전략
[분석]

### ${awayKr}의 대응
[분석]

## 💡 승부처

1. [핵심 포인트 1]
2. [핵심 포인트 2]
3. [핵심 포인트 3]

## 📈 예측

**예상 스코어**: [X-X]
[근거 설명]

### 영문 본문 구조 (content_en)

# ${homeEn} vs ${awayEn}: [Subtitle]

[Intro 2-3 sentences]

## 📊 Team Analysis

**${homeEn}**
- Recent form: X wins, X draws, X losses
- Strengths/weaknesses

**${awayEn}**
- Recent form: X wins, X draws, X losses
- Strengths/weaknesses

## 🎯 Tactical Preview

### ${homeEn}'s Approach
[Analysis]

### ${awayEn}'s Counter
[Analysis]

## 💡 Key Battles

1. [Key point 1]
2. [Key point 2]
3. [Key point 3]

## 📈 Prediction

**Expected Score**: [X-X]
[Reasoning]

### 문체 규칙

✅ 한글:
- 자연스러운 구어체: "~네요", "~죠", "~거든요"
- 독자에게 말 걸기: "주목해야 합니다"
- 다양한 문장 길이

✅ English:
- Professional but engaging tone
- Active voice preferred
- Varied sentence structure

❌ 피해야 할 것:
- "첫째, 둘째, 셋째" 나열식
- "In conclusion", "To summarize" 등 AI스러운 표현
- 인사말/마무리 인사
- 면책조항

반드시 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요.`;

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8000,  // 더 긴 출력을 위해 증가
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // JSON 추출 (코드블록 안에 있을 수 있음)
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
      // 문자열 값 내부의 줄바꿈 처리
      const fixedJson = jsonStr
        .replace(/"([^"]*?)"/g, (match, content) => {
          const fixed = content
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
          return `"${fixed}"`;
        });
      
      try {
        result = JSON.parse(fixedJson);
      } catch (secondError) {
        // 필드별 추출 시도
        const titleKrMatch = jsonStr.match(/"title_kr"\s*:\s*"([^"]+)"/);
        const titleMatch = jsonStr.match(/"title"\s*:\s*"([^"]+)"/);
        const slugMatch = jsonStr.match(/"slug"\s*:\s*"([^"]+)"/);
        const excerptMatch = jsonStr.match(/"excerpt"\s*:\s*"([^"]+)"/);
        const excerptEnMatch = jsonStr.match(/"excerpt_en"\s*:\s*"([^"]+)"/);
        
        if (titleKrMatch || titleMatch) {
          result = {
            title_kr: titleKrMatch?.[1] || '',
            title: titleMatch?.[1] || '',
            slug: slugMatch?.[1] || '',
            excerpt: excerptMatch?.[1] || '',
            excerpt_en: excerptEnMatch?.[1] || '',
            content: '',
            content_en: '',
            tags: []
          };
        } else {
          throw secondError;
        }
      }
    }
    
    // 태그 정리 (영문으로)
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
      ai_model: 'gemini-2.0-flash',
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
  return `${h}-vs-${a}-preview`;
}

function createFallback(match, homeKr, awayKr, homeEn, awayEn, leagueEn) {
  // 한글 본문
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

  // 영문 본문
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
    // 한글
    title_kr: `${homeKr} vs ${awayKr} 프리뷰`,
    excerpt: `${match.leagueKr} ${homeKr} vs ${awayKr} 경기 분석`,
    content: contentKr,
    summary: `${match.leagueKr} ${homeKr} vs ${awayKr} 경기 분석`,
    // 영문
    title: `${homeEn} vs ${awayEn} Preview`,
    excerpt_en: `${leagueEn} ${homeEn} vs ${awayEn} match analysis`,
    content_en: contentEn,
    // 공통
    slug: generateSlug(homeEn, awayEn),
    tags: [leagueEn, homeEn, awayEn, 'Preview'],
    homeTeamKr: homeKr,
    awayTeamKr: awayKr,
    homeTeam: homeEn,
    awayTeam: awayEn,
    // 발행 설정
    published: true,
    published_en: true,
    // 메타
    ai_model: 'fallback',
    processed_at: new Date().toISOString()
  };
}

async function processAll() {
  console.log('🤖 AI Processing v5 (Bilingual Edition)\n');
  console.log('📦 Model: gemini-2.0-flash');
  console.log('🌐 Output: 한글 + English\n');
  
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
    console.log(`[${i+1}/${matches.length}] ${matches[i].homeTeam} vs ${matches[i].awayTeam}`);
    const result = await processWithGemini(matches[i]);
    processed.push(result);
    
    const contentKrLen = (result.content || '').length;
    const contentEnLen = (result.content_en || '').length;
    const model = result.ai_model === 'fallback' ? '⚠️ fallback' : '✅ gemini';
    console.log(`  ${model}`);
    console.log(`    🇰🇷 "${result.title_kr}" (${contentKrLen}자)`);
    console.log(`    🇺🇸 "${result.title}" (${contentEnLen} chars)`);
    
    // Rate limit 대비 2초 대기 (더 긴 응답이므로)
    if (i < matches.length - 1) await delay(2000);
  }
  
  fs.writeFileSync('processed-previews.json', JSON.stringify(processed, null, 2));
  console.log(`\n💾 Saved ${processed.length} posts to processed-previews.json`);
  
  const successCount = processed.filter(p => p.ai_model !== 'fallback').length;
  console.log(`✅ AI 처리 성공: ${successCount}/${processed.length}`);
  console.log(`🌐 각 포스트: 한글 + 영문 버전 포함`);
}

if (!GEMINI_API_KEY) { 
  console.error('❌ GEMINI_API_KEY required');
  console.error('   Set: $env:GEMINI_API_KEY="your-api-key"');
  process.exit(1); 
}

processAll().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
