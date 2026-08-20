# Dreamina 배경 영상 제작 가이드

씬은 9개지만 **배경 파일은 4개만 만들면 됩니다.**
성격이 비슷한 씬끼리 같은 소재를 돌려 쓰는 게 톤도 일관되고 크레딧도 아낍니다.

| 파일명 | 쓰이는 씬 | 성격 |
|---|---|---|
| `bg-stadium.mp4` | 오프너 · 훅 · 매치업 | 경기장 분위기 |
| `bg-data.mp4` | 픽 카드 · 요약 · 투수비교 · AI분석 | 데이터·전술 톤 |
| `bg-impact.mp4` | 승률 공개 | 임팩트 |
| `bg-cta.mp4` | 마무리 | 차분한 상승감 |

넣는 곳: `public\videos\`
파일이 없으면 자동으로 기존 그라디언트 배경으로 폴백하므로, **하나씩 채워 넣어도 됩니다.**

---

## Dreamina 설정

| 항목 | 값 |
|---|---|
| 모델 | Seedance (2.0 이상) |
| 비율 | **9:16 세로** |
| 길이 | 5초 |
| 해상도 | 가능하면 1080p |

---

## 프롬프트

### 1. `bg-stadium.mp4` — 경기장

```
Slow push-in through a dark empty football stadium at night, floodlights
flaring against heavy atmospheric haze, volumetric light beams cutting
through fog, deep navy and black palette, subtle cyan rim light.
Cinematic, moody, very dark. No text, no logos, no people, no crowd faces.
Slow continuous motion, loopable, vertical 9:16
```

### 2. `bg-data.mp4` — 데이터·전술 ⭐ 가장 많이 쓰임

```
Dark tactical data surface, faint holographic grid lines drifting slowly,
soft cyan and lime scan lines sweeping across, shallow depth of field,
deep black background, heavy vignette. Extremely subtle motion so overlaid
text stays readable. Minimal, technical, very dark.
No text, no numbers, no charts, no UI elements. Loopable, vertical 9:16
```

> 이 배경 위에 픽 카드가 올라갑니다. **움직임이 크면 글씨가 안 읽힙니다.**
> 프롬프트에 `extremely subtle motion` 을 꼭 넣으세요.

### 3. `bg-impact.mp4` — 승률 공개

```
Slow orbiting camera around a dark reflective floor with a faint circular
glow ring pulsing at the center, lime green and cyan light bloom,
volumetric haze, deep black. Abstract, cinematic, dramatic but dark.
No text, no numbers, no logos. Loopable, vertical 9:16
```

### 4. `bg-cta.mp4` — 마무리

```
Rising light particles drifting slowly upward through dark atmospheric haze,
lime green and cyan bokeh, gentle bloom, deep navy to black gradient.
Calm, cinematic, very dark. No text, no logos. Loopable, vertical 9:16
```

---

## ⚠ 반드시 지킬 것

**생성형 AI에게 글자·숫자·차트를 그리게 하지 마세요.**
승률·순위·팀명·엠블럼은 전부 Remotion 이 벡터로 그립니다.
AI 배경에 글자가 섞여 들어오면 오히려 싸구려로 보이고, 지울 수도 없습니다.
그래서 모든 프롬프트에 `no text` 를 넣었습니다.

**어둡게 뽑으세요.**
배경 위에 자동으로 스크림(어두운 오버레이)이 깔리지만,
원본이 밝으면 스크림을 통과해 지저분해집니다.
`very dark`, `deep black`, `heavy vignette` 를 유지하세요.

**움직임은 최소로.**
특히 `bg-data.mp4` 는 픽 카드 뒤에 깔리므로 배경이 요란하면 글씨가 안 읽힙니다.
Remotion 이 자체적으로 아주 느린 켄번즈 줌을 넣어주므로,
원본은 거의 정지에 가까워도 됩니다.

---

## 뽑은 다음

### 1) 파일명 바꾸기

다운로드한 파일을 위 표의 이름으로 바꿔서 `public\videos\` 에 넣습니다.

### 2) 규격 맞추기 (필요할 때만)

Dreamina 출력이 1080×1920 이 아니거나 너무 밝으면 한 번 정리합니다.

```powershell
# 1080x1920 로 맞추고 살짝 어둡게 + 무음
ffmpeg -i 원본.mp4 -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=brightness=-0.08:saturation=0.9" -an -c:v libx264 -crf 20 -pix_fmt yuv420p public\videos\bg-data.mp4
```

> `ffmpeg` 는 프로젝트에 `ffmpeg-static` 이 이미 깔려 있습니다.
> 명령어를 못 찾으면 `node_modules\ffmpeg-static\ffmpeg.exe` 를 직접 지정하세요.

### 3) 확인

```powershell
npm run shorts:render -- --format=daily --sport=football --group=euro
```

배경이 너무 튀면 스크림 농도를 올립니다.
`remotion\components\Background.tsx` 의 `scrim` 기본값 `0.62`
→ 숫자를 키울수록 배경이 어두워집니다. (0.75 정도까지)

포맷 A 는 `remotion\daily\DailyPicks.tsx` 의 `scrim={0.66}` 에서 조절합니다.

---

## 순서 제안

크레딧을 아끼려면 **`bg-data.mp4` 부터** 만드세요.
픽 카드·요약·투수비교·AI분석 네 군데에 쓰여서 화면 점유 시간이 가장 깁니다.
이거 하나만 넣어도 체감 차이가 가장 큽니다.

1. `bg-data.mp4` ← 여기부터
2. `bg-stadium.mp4`
3. `bg-cta.mp4`
4. `bg-impact.mp4`

---

## 상업적 이용 확인

수익화하는 채널이라 **Dreamina 구독 플랜에 상업적 이용권이 포함돼 있는지** 한 번 확인하고 가세요.
무료 플랜은 보통 개인 사용만 허용합니다.
