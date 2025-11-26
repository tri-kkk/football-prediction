/**
 * AI Processor v3 - TrendSoccer 블로그 지침서 기반
 * - 1500-2000자 분량
 * - 구조화된 섹션
 * - 자연스러운 한국어 (AI 티 제거)
 */

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TEAM_KR = {
  'Manchester United': '맨유', 'Manchester City': '맨시티',
  'Liverpool': '리버풀', 'Chelsea': '첼시', 'Arsenal': '아스날', 'Tottenham': '토트넘',
  'Newcastle': '뉴캐슬', 'Aston Villa': '아스톤빌라', 'Brighton': '브라이튼',
  'West Ham': '웨스트햄', 'Everton': '에버턴', 'Fulham': '풀럼',
  'Real Madrid': '레알 마드리드', 'Barcelona': '바르셀로나',
  'Atletico Madrid': '아틀레티코', 'Sevilla': '세비야',
  'Bayern Munich': '바이에른', 'Borussia Dortmund': '도르트문트',
  'RB Leipzig': '라이프치히', 'Bayer Leverkusen': '레버쿠젠',
  'Juventus': '유벤투스', 'Inter Milan': '인테르', 'AC Milan': 'AC밀란',
  'Napoli': '나폴리', 'Roma': '로마', 'Lazio': '라치오',
  'PSG': 'PSG', 'Paris Saint-Germain': 'PSG', 'Marseille': '마르세유',
  'Lyon': '리옹', 'Monaco': '모나코', 'Lille': '릴',
  'København': '코펜하겐', 'Kairat Almaty': '카이라트',
  'Atalanta': '아탈란타', 'Frankfurt': '프랑크푸르트',
  'Sporting': '스포르팅', 'Benfica': '벤피카', 'Porto': '포르투',
  'Ajax': '아약스', 'Feyenoord': '페예노르트', 'PSV': 'PSV',
  'Celtic': '셀틱', 'Rangers': '레인저스',
  'Olympiacos': '올림피아코스', 'PAOK': 'PAOK',
};

function getTeamKr(name) {
  if (!name) return '';
  if (TEAM_KR[name]) return TEAM_KR[name];
  for (const [eng, kr] of Object.entries(TEAM_KR)) {
    if (name.toLowerCase().includes(eng.toLowerCase())) return kr;
  }
  return name;
}

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function processWithClaude(match) {
  const homeKr = getTeamKr(match.homeTeam);
  const awayKr = getTeamKr(match.awayTeam);
  
  const previewText = match.previewParagraphs?.join('\n\n') || '';
  const h2hText = match.h2h?.slice(0,5).join('\n') || '';
  const injuriesText = match.injuries?.slice(0,5).join('\n') || '';

  const prompt = `당신은 TrendSoccer의 전문 축구 분석 블로그 작성자입니다.

## 📋 경기 정보
- 리그: ${match.leagueKr} (${match.league})
- 홈팀: ${homeKr} (${match.homeTeam})
- 원정팀: ${awayKr} (${match.awayTeam})
- 날짜: ${match.matchDate || '미정'}

## 📊 예측 데이터
- 예측: ${match.prediction || '미정'}
- 확률: 홈 ${match.probHome || '?'}% / 무 ${match.probDraw || '?'}% / 원정 ${match.probAway || '?'}%
- 예상 스코어: ${match.predictedScore || '미정'}

## 📈 팀 폼
- ${match.homeTeam}: ${match.homeForm || '정보없음'}
- ${match.awayTeam}: ${match.awayForm || '정보없음'}

## 🔄 상대전적
${h2hText || '정보 없음'}

## 🤕 부상자
${injuriesText || '주요 부상자 없음'}

## 📝 참고 자료 (원본 분석)
${previewText.substring(0, 1500) || '없음'}

---

## ✍️ 작성 지침

### 필수 출력 (JSON)
{
  "title": "SEO 친화적 한글 제목 (25-40자)",
  "slug": "english-url-slug-format",
  "excerpt": "목록용 요약 (80-120자)",
  "content": "마크다운 본문 (1500-2000자)",
  "tags": ["태그1", "태그2", "태그3", "태그4", "태그5"]
}

### 본문 구조 (content)
\`\`\`markdown
# ${homeKr} vs ${awayKr}: [부제]

[인트로 2-3문장: 경기 중요성, 독자 관심 유도]

## 📊 양팀 현황

**${homeKr}**
- 최근 폼: X승 X무 X패
- 강점: ...
- 약점: ...

**${awayKr}**
- 최근 폼: X승 X무 X패
- 강점: ...
- 약점: ...

## 🎯 전술 분석

### ${homeKr}의 전략
[2-3문단]

### ${awayKr}의 대응
[2-3문단]

## 💡 승부처

### 1. [핵심 대결 1]
[설명]

### 2. [핵심 대결 2]
[설명]

### 3. [핵심 대결 3]
[설명]

## 📈 예상 시나리오

**가장 가능성 높은 전개**: [예상 스코어]
[구체적 근거와 전개 설명]

**변수**: [반전 가능성]
[설명]

## 🏷️ 해시태그

#${match.leagueKr} #${homeKr.replace(/\s/g,'')} #${awayKr.replace(/\s/g,'')} #경기프리뷰 #축구분석
\`\`\`

### 문체 규칙 (매우 중요!)

✅ 해야 할 것:
- 자연스러운 구어체 혼용: "~네요", "~죠", "~거든요"
- 독자에게 말 걸기: "어떻게 보시나요?", "주목해야 합니다"
- 다양한 문장 길이 (짧은 문장 → 긴 문장 리듬감)
- 비유와 예시 활용
- **굵게** 강조로 핵심 부각

❌ 피해야 할 것 (AI 티 제거):
- "첫째, 둘째, 셋째" 나열식 금지
- "~측면에서", "~관점에서" 형식적 표현 금지
- "또한", "더불어", "아울러" 과도한 사용 금지
- 똑같은 문장 패턴 반복 금지
- 인사말/마무리 인사 금지
- 면책조항 금지

### 예시 문체:
❌ "맨시티는 강력한 공격력을 가지고 있습니다. 또한 리버풀은 견고한 수비를 가지고 있습니다."
✅ "맨시티의 공격력이 심상치 않네요. 하지만 리버풀 수비도 만만치 않죠. 결국 중원 싸움이 관건이 될 것 같습니다."

반드시 JSON 형식으로만 응답하세요.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    });
    
    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSON not found');
    
    const result = JSON.parse(jsonMatch[0]);
    
    // 태그 정리
    let tags = result.tags || [match.leagueKr, homeKr, awayKr];
    if (typeof tags === 'string') tags = tags.split(',').map(t => t.trim());
    
    return {
      ...match,
      title_kr: result.title,
      slug: result.slug || generateSlug(homeKr, awayKr),
      excerpt: result.excerpt,
      content: result.content,
      summary: result.excerpt,
      tags: tags,
      homeTeamKr: homeKr,
      awayTeamKr: awayKr,
      ai_model: 'claude-sonnet',
      processed_at: new Date().toISOString()
    };
  } catch (e) {
    console.log(`  ⚠️ AI error: ${e.message}`);
    return createFallback(match, homeKr, awayKr);
  }
}

function generateSlug(home, away) {
  const h = home.toLowerCase().replace(/[^a-z0-9가-힣]/g, '-').replace(/--+/g, '-');
  const a = away.toLowerCase().replace(/[^a-z0-9가-힣]/g, '-').replace(/--+/g, '-');
  return `${h}-vs-${a}-preview`;
}

function createFallback(match, homeKr, awayKr) {
  const content = `# ${homeKr} vs ${awayKr}: ${match.leagueKr} 프리뷰

${match.leagueKr}에서 ${homeKr}와 ${awayKr}의 경기가 예정되어 있습니다.

## 📊 경기 정보

**${homeKr}** (홈)
- 최근 폼을 확인해주세요

**${awayKr}** (원정)
- 최근 폼을 확인해주세요

## 🎯 예측

예상 결과: ${match.prediction || '미정'}
예상 스코어: ${match.predictedScore || '미정'}

## 🏷️ 해시태그

#${match.leagueKr} #${homeKr.replace(/\s/g,'')} #${awayKr.replace(/\s/g,'')} #경기프리뷰`;

  return {
    ...match,
    title_kr: `${homeKr} vs ${awayKr} 프리뷰`,
    slug: generateSlug(homeKr, awayKr),
    excerpt: `${match.leagueKr} ${homeKr} vs ${awayKr} 경기 분석`,
    content: content,
    summary: `${match.leagueKr} ${homeKr} vs ${awayKr} 경기 분석`,
    tags: [match.leagueKr, homeKr, awayKr, '경기프리뷰'],
    homeTeamKr: homeKr,
    awayTeamKr: awayKr,
    ai_model: 'fallback',
    processed_at: new Date().toISOString()
  };
}

async function processAll() {
  console.log('🤖 AI Processing v3 (TrendSoccer Style)\n');
  
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
    const result = await processWithClaude(matches[i]);
    processed.push(result);
    
    const contentLen = (result.content || '').length;
    console.log(`  ✅ "${result.title_kr}" (${contentLen}자)`);
    
    if (i < matches.length - 1) await delay(1500);
  }
  
  fs.writeFileSync('processed-previews.json', JSON.stringify(processed, null, 2));
  console.log(`\n💾 Saved ${processed.length} posts to processed-previews.json`);
}

if (!process.env.ANTHROPIC_API_KEY) { 
  console.error('❌ ANTHROPIC_API_KEY required'); 
  process.exit(1); 
}

processAll().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
