# TrendSoccer 숏폼 렌더링 (Remotion)

기존 `ShortsGenerator.tsx` 의 **화면 녹화 방식을 대체**하는 렌더링 파이프라인입니다.

---

## 왜 바꿨나 — 기존 파이프라인의 화질 문제

기존 흐름:

```
360×640 DOM 캔버스에 그림
  → 브라우저에서 확대 표시
  → getDisplayMedia 로 화면 녹화 (실시간)
  → ffmpeg crop=ih*9/16 → scale=1080:1920
  → H.264 재인코딩 (crf 22, preset veryfast)
```

화질을 죽이던 지점 네 곳:

| # | 문제 | 영향 |
|---|---|---|
| 1 | **캔버스가 360×640** (`ShortsGenerator.tsx:1031`) | 모든 텍스트·로고가 3배 업스케일됨 |
| 2 | **`getDisplayMedia` 실시간 캡처** | 프레임 드랍, 모니터 해상도·DPI에 종속 |
| 3 | **`crop` 후 `scale` 업스케일** (`shorts-crop/route.ts:67`) | 1080p 모니터 기준 실소스 608×1080 → 1080×1920 확대 |
| 4 | **2중 인코딩 + `preset veryfast`** | 같은 용량에서 화질이 가장 낮은 프리셋 |

새 흐름:

```
1080×1920 네이티브로 그림
  → Remotion 이 프레임 단위로 오프스크린 렌더 (드랍 없음)
  → H.264 1회 인코딩 (crf 18, preset slow)
```

크롭 없음, 업스케일 없음, 화면 녹화 없음, 사람 개입 없음.

---

## 설치

```bash
npm i remotion @remotion/cli @remotion/bundler @remotion/renderer
npm i -D pretendard    # 폰트 소스 (최초 1회만 필요)
```

`package.json` 에 스크립트 추가:

```json
{
  "scripts": {
    "shorts:studio": "remotion studio",
    "shorts:render": "node scripts/render-shorts.mjs",
    "shorts:font": "node scripts/prepare-font.mjs"
  }
}
```

---

## 사용법

### 미리보기 (실시간 편집)

```bash
npm run shorts:studio
```

브라우저에 Remotion Studio 가 열립니다. 씬 타이밍·색상·문구를 바꾸면 즉시 반영되고,
props 패널에서 경기 데이터를 직접 넣어볼 수 있습니다.

### 렌더 (자동화 가능)

```bash
# 로컬 개발 서버가 떠 있는 상태에서
npm run shorts:render -- --league=KBO --limit=3

# 배포 서버 데이터로
SHORTS_BASE_URL=https://www.trendsoccer.com npm run shorts:render -- --league=MLB --limit=5

# BGM 넣기 (public/sounds/ 기준)
npm run shorts:render -- --league=KBO --bgm=sport-energetic.mp3

# 팀 로고 사용
npm run shorts:render -- --league=KBO --logos=true
```

`out/KBO_LG_트윈스_vs_한화_이글스.mp4` 형태로 떨어집니다.

### 매일 자동 생성 (cron / GitHub Actions)

화면 녹화가 없으므로 사람이 붙어 있을 필요가 없습니다.

```yaml
# .github/workflows/daily-shorts.yml
on:
  schedule:
    - cron: '0 22 * * *'   # 매일 07:00 KST
jobs:
  render:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npx remotion browser ensure
      - run: node scripts/render-shorts.mjs --league=KBO --limit=3
        env:
          SHORTS_BASE_URL: https://www.trendsoccer.com
      - uses: actions/upload-artifact@v4
        with: { name: shorts, path: out/*.mp4 }
```

---

## 배경 영상 (Dreamina 소재) 넣기

`public/videos/` 에 아래 파일명으로 넣기만 하면 자동으로 배경 레이어가 켜집니다.
**파일이 없으면 기존 그라디언트 룩으로 폴백**하므로, 하나씩 채워 넣어도 됩니다.

| 파일명 | 쓰이는 씬 | 필요 길이 |
|---|---|---|
| `bg-hook.mp4` | 훅 | 3초 이상 |
| `bg-matchup.mp4` | 매치업 | 4초 이상 |
| `bg-pitcher.mp4` | 투수 비교 | 6초 이상 |
| `bg-analysis.mp4` | AI 분석 | 4초 이상 |
| `bg-reveal.mp4` | 승률 공개 | 5초 이상 |
| `bg-cta.mp4` | CTA | 5초 이상 |

규격: **1080×1920 (9:16)**, 무음, 24fps 이상. 루프되므로 짧아도 무방합니다.

배경 위에는 자동으로 스크림(어두운 오버레이)이 깔려 흰 글씨 가독성이 유지되고,
느린 켄번즈 줌이 들어가 정지 화면처럼 보이지 않습니다.
스크림 농도는 `remotion/components/Background.tsx` 의 `scrim` 값으로 조절합니다.

---

## Dreamina 프롬프트 세트

Dreamina(Seedance)에서 **9:16 / 5초** 로 뽑으세요. 한 번 만들면 계속 재사용하므로
크레딧 소모가 크지 않습니다. 프롬프트 끝에 공통으로 붙이면 좋은 문구:

> `dark moody cinematic, deep navy and black palette, no text, no logos, no people's faces, subtle motion, loopable, vertical 9:16`

### `bg-hook.mp4` — 훅
```
Slow push-in through a dark empty stadium at night, floodlights flaring
against heavy atmospheric haze, volumetric light beams cutting through fog,
deep navy and black, cyan rim light. Cinematic, moody, no text, no people,
subtle continuous motion, vertical 9:16
```

### `bg-matchup.mp4` — 매치업
```
Abstract split-screen energy field, two opposing streams of glowing particles
colliding at the center, crimson on the left and amber on the right, dark
navy background, sparks drifting slowly. Cinematic, no text, seamless loop,
vertical 9:16
```

### `bg-pitcher.mp4` — 투수 비교
```
Dark tactical data surface, faint holographic grid lines drifting slowly,
soft cyan and lime scan lines sweeping across, shallow depth of field,
deep black background. Minimal, technical, no text, no charts, loopable,
vertical 9:16
```

### `bg-analysis.mp4` — AI 분석
```
Very dark minimal surface with slow drifting depth-of-field bokeh, faint
lime and cyan light specks, heavy vignette, almost black. Extremely subtle
motion so overlaid text stays readable. No text, loopable, vertical 9:16
```

### `bg-reveal.mp4` — 승률 공개
```
Slow orbiting camera around a dark reflective floor with a faint circular
glow ring pulsing in the center, lime green and cyan light bloom, volumetric
haze, deep black. Abstract, cinematic, no text, no numbers, loopable,
vertical 9:16
```

### `bg-cta.mp4` — CTA
```
Rising light particles drifting upward through dark atmospheric haze,
lime green and cyan bokeh, gentle bloom, deep navy to black gradient,
slow upward drift. Cinematic, calm, no text, loopable, vertical 9:16
```

> **주의**: 생성형 AI에게 **숫자·글자·차트를 그리게 하지 마세요.** 승률·ERA·팀명은
> 전부 Remotion 이 벡터로 그립니다. AI 배경에 글자가 섞여 들어오면 오히려 싸구려로 보입니다.
> 그래서 모든 프롬프트에 `no text` 를 넣었습니다.

---

## 구조

```
remotion/
  index.ts              엔트리
  Root.tsx              Composition 등록 (샘플 데이터 포함)
  ShortsVideo.tsx       씬 조립 + BGM
  theme.ts              색상·씬 길이·안전영역 토큰
  anim.ts               fadeUp / pop / slideIn / glow / fill (프레임 기반)
  font.ts               Pretendard data URI 로딩
  types.ts              shorts-data API 응답과 1:1 호환
  timeline.ts           경기별 씬 구성·길이 계산 (빈 씬 자동 생략)
  assets/
    Pretendard-subset.woff2
  components/
    Background.tsx      Dreamina 영상 + 그라디언트 + 그리드 + 비네트
    Chrome.tsx          워드마크 / AI PICK / 진행바 / 하단 바
    Bits.tsx            Stars / Crest / Donut
  scenes/
    Scenes.tsx          Hook / Matchup / Pitcher / Analysis / Reveal / CTA
scripts/
  render-shorts.mjs     데이터 fetch → 렌더 (자동화 진입점)
  prepare-font.mjs      폰트 복사
remotion.config.ts      crf 18 / preset slow / woff2 인라인
```

---

## 스토리라인 (v2 — 답 숨기기 구조)

총 **21.5초**, 6개 씬.

| 씬 | 길이 | 역할 |
|---|---|---|
| `hook` | 2.5s | 별점(확신도)만 공개, **승률은 `??%` 로 가림** |
| `matchup` | 3.0s | 누가 붙는지 + 경기 시각 + 등급 |
| `pitcher` | 5.0s | 근거 1 — ERA/WHIP/K 순차 공개 + 우위 요약 |
| `analysis` | 4.0s | 근거 2 — AI 분석 코멘트 타이핑 |
| `reveal` | 4.5s | **답 공개** — 승률 카운트업 (클라이맥스) |
| `cta` | 2.5s | 픽 + 사이트 유도 |

### v1 에서 뭐가 바뀌었나

v1 은 훅에서 `86%` 와 `한화 승` 을 2초 만에 다 말해버렸다.
답을 알고 나면 나머지 19초를 볼 이유가 없다. 게다가 같은 정보가
훅 → 승률씬 → CTA 로 **세 번** 반복돼서 중간에 새로 얻는 정보가 투수 스탯뿐이었다.

v2 는 승률을 `reveal` 씬 단 한 번, 마지막에만 공개한다.
훅에서는 별점으로 "얼마나 확신하는지"만 흘리고 숫자는 블러 뒤에 숨긴다.

추가로:

- `aiAnalysis` 를 쓰는 `analysis` 씬 신설 (v1 에서는 이 데이터가 완전히 미사용이었다)
- 투수 씬 지표 공개 간격을 넓혀 5초 내내 화면이 움직이게 함 (v1 은 2초 만에 애니메이션이 끝나고 3초가 정지 화면)
- 투수 씬 끝에 "3개 지표 전부 우위" 요약 배지 추가

### 씬이 자동으로 생략되는 경우

- `aiAnalysis` 가 없는 경기 → `analysis` 씬 생략
- 선발 투수가 미정인 경기 → `pitcher` 씬 생략

생략된 시간은 남은 씬에 자동 배분되어 전체 길이가 유지된다.
길이·순서를 바꾸려면 `remotion/theme.ts` 의 `SCENE_FRAMES` 와
`remotion/timeline.ts` 의 `order` 를 고치면 된다.

---

## 팀 컬러 관련 (v2 에서 수정됨)

`app/api/admin/shorts-data/route.ts` 의 `teamMeta()` 가
`TEAM_META['한화']` 를 `"한화 이글스"` 로 조회해서 **전 팀 매칭이 실패**하고 있었다.
그래서 팀 컬러가 전부 회색(`#1f2937`)으로 나오고 약칭도 `KI` 처럼 잘렸다.
부분 일치로 찾도록 수정했다. (`route.ts.bak` 에 원본 백업)

---

## 알려진 이슈

**폰트에 `delayRender()` 를 걸지 마세요.** `document.fonts.load()` 는 Chrome 렌더 탭에서
드물게 영영 resolve 하지 않고, 그러면 렌더 전체가 타임아웃으로 죽습니다.
폰트를 data URI 로 인라인하고 `font-display: block` 만 걸어두면
Remotion 이 `document.fonts.ready` 를 알아서 기다립니다. (`remotion/font.ts` 주석 참고)

**concurrency** 는 CPU 코어 수 이하로. 기본값(자동)이면 됩니다.

---

## 다음 단계

1. `public/videos/` 에 Dreamina 배경 5개 채우기 — 이것만으로 체감 퀄리티가 가장 크게 올라갑니다
2. 팀 로고 PNG 를 `showLogos=true` 로 켤 수 있게 정리 (현재는 약칭 텍스트 크레스트)
3. GitHub Actions 로 매일 자동 렌더 → 결과물만 확인하고 업로드
4. 기존 `ShortsGenerator.tsx` 의 녹화 버튼은 남겨두되, 새 파이프라인이 안정되면 제거
