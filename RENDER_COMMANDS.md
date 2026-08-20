# 숏폼 렌더 명령어 모음

PowerShell 에서 `football-prediction` 폴더 안에서 실행합니다.

---

## 0. 최초 1회만

```powershell
npx remotion browser ensure
```

---

## 1. 데이터 서버 켜기 (다른 창)

렌더는 로컬 API 에서 데이터를 가져오므로 이게 떠 있어야 합니다.

```powershell
npm run dev
```

> 배포 서버 데이터를 쓸 거면 이 단계는 건너뛰고 아래 "배포 서버 데이터" 참고.

---

## 2. 매일 뽑는 것 — 포맷 A (데일리 픽)

```powershell
# 유럽 축구
npm run shorts:render -- --format=daily --sport=football --group=euro

# K리그
npm run shorts:render -- --format=daily --sport=football --group=kleague

# J리그
npm run shorts:render -- --format=daily --sport=football --group=jleague

# 야구
npm run shorts:render -- --format=daily --sport=baseball --league=KBO
npm run shorts:render -- --format=daily --sport=baseball --league=NPB
npm run shorts:render -- --format=daily --sport=baseball --league=MLB
```

결과: `out\daily_euro_2026-08-20.mp4`

---

## 3. 빅매치용 — 포맷 D (원 매치 딥다이브)

```powershell
# KBO 상위 1경기
npm run shorts:render -- --format=match --league=KBO --limit=1

# 3경기 한 번에
npm run shorts:render -- --format=match --league=KBO --limit=3

# 팀 로고 사용
npm run shorts:render -- --format=match --league=MLB --limit=1 --logos=true
```

결과: `out\KBO_한화_이글스_vs_KIA_타이거즈.mp4`

---

## 4. 자주 쓰는 옵션

```powershell
# 픽 개수 고정 (기본은 경기 수에 따라 자동 2~5개)
npm run shorts:render -- --format=daily --group=euro --count=3

# BGM 넣기 (public\sounds\ 안의 파일명)
npm run shorts:render -- --format=daily --group=euro --bgm=sport-energetic.mp3

# 출력 폴더 바꾸기
npm run shorts:render -- --format=daily --group=euro --out=./영상
```

| 옵션 | 기본값 | 설명 |
|---|---|---|
| `--format` | `match` | `daily` \| `match` |
| `--sport` | `football` | daily 전용. `football` \| `baseball` |
| `--group` | `euro` | daily + football 전용. `euro` \| `kleague` \| `jleague` |
| `--league` | `KBO` | 야구 리그, 또는 match 포맷의 리그 |
| `--count` | `auto` | daily 픽 개수. 숫자 또는 `auto` |
| `--limit` | `1` | match 포맷에서 뽑을 경기 수 |
| `--bgm` | 없음 | `public\sounds\` 기준 파일명 |
| `--logos` | `false` | match 포맷에서 팀 로고 사용 |
| `--out` | `./out` | 출력 폴더 |

---

## 5. 배포 서버 데이터로 뽑기

`npm run dev` 없이 실서버 데이터를 씁니다.

```powershell
$env:SHORTS_BASE_URL = "https://www.trendsoccer.com"
npm run shorts:render -- --format=daily --sport=football --group=euro
```

원래대로 되돌리려면:

```powershell
Remove-Item Env:\SHORTS_BASE_URL
```

---

## 6. 미리보기 (렌더 없이 화면으로)

```powershell
npm run shorts:studio
```

브라우저에서 컴포지션을 고릅니다.

- `DailyPicks` — 포맷 A
- `Shorts` — 포맷 D

오른쪽 props 패널에서 데이터를 직접 바꿔가며 확인할 수 있습니다.

---

## 7. 하루치 한 번에 (배치)

`render-daily.ps1` 로 저장해두고 실행하면 편합니다.

```powershell
# render-daily.ps1
npm run shorts:render -- --format=daily --sport=football --group=euro
npm run shorts:render -- --format=daily --sport=football --group=kleague
npm run shorts:render -- --format=daily --sport=baseball --league=KBO
Write-Host "완료 — out 폴더 확인"
```

실행:

```powershell
.\render-daily.ps1
```

> 처음 실행 시 스크립트 실행 정책 오류가 나면:
> `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`

---

## 렌더 로그 읽는 법

```
▶ 유럽 축구 · 18경기 중 3개 픽
▶ 팀 로고 인라인: 3/3 경기
▶ 리그 엠블럼 인라인: 3/3 경기
▶ 번들링...
▶ daily_euro_2026-08-20.mp4
  100%
  ✓ ...\out\daily_euro_2026-08-20.mp4
```

| 로그 | 의미 |
|---|---|
| `⚠ 로고 미확인 N개` | 팀 로고 URL 을 못 찾음 → 팀명 이니셜로 대체됨 |
| `⚠ 순위 미확인 N개` | standings 팀명 매칭 실패 → 순위·폼 줄만 빠짐 |
| `리그 엠블럼 인라인: 0/3` | standings 호출 실패 → 리그 로고만 빠짐 |
| `오늘 조건을 통과한 픽이 없습니다` | 정상. 그날은 영상을 만들지 않음 |

---

## 자주 막히는 것

**`Failed to launch the browser`**
→ `npx remotion browser ensure` 실행

**`shorts-daily 500`**
→ `npm run dev` 가 안 떠 있거나, API 파일 수정 후 재시작을 안 한 경우

**렌더가 비정상적으로 느림 (1분에 몇 프레임)**
→ 로고가 data URI 로 인라인되지 않은 것. 렌더 로그의 "인라인" 줄 확인

**한글이 네모로 나옴**
→ `remotion\assets\Pretendard-subset.woff2` 가 있는지 확인
