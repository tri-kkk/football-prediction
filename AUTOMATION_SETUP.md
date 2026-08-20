# 매일 자동 렌더 설정 (Windows 작업 스케줄러)

매일 정해진 시간에 숏폼 4~5개를 자동으로 뽑아 날짜별 폴더에 정리합니다.

---

## 무엇이 자동으로 돌아가나

| 순서 | 영상 | 명령 |
|---|---|---|
| 1 | 어제 성적표 · 유럽축구 | `--format=result --group=euro` |
| 2 | 오늘의 픽 · 유럽축구 | `--format=daily --group=euro` |
| 3 | 어제 성적표 · KBO | `--format=result --league=KBO` |
| 4 | 오늘의 픽 · KBO | `--format=daily --league=KBO` |
| 5 | **금요일만** 주말 TOP 5 | `--format=top5 --group=euro` |

결과: `out\2026-08-20\` 폴더에 mp4 + `render.log`

성적표를 픽보다 먼저 돌립니다. 업로드 순서도 그게 자연스럽습니다.

---

## ⚠ 먼저 배포하세요

스크립트는 기본적으로 **배포 서버**(`https://www.trendsoccer.com`)에서 데이터를 가져옵니다.
`npm run dev` 를 띄워둘 필요가 없어 스케줄러에 적합하지만,
**새로 만든 API 라우트가 배포돼 있어야 합니다.**

```powershell
git add .
git commit -m "Add shorts render pipeline"
git push
```

배포된 API 3개:

- `/api/admin/shorts-daily`
- `/api/admin/shorts-result`
- `/api/admin/shorts-data` (기존, 수정됨)

배포 전이라면 로컬로 테스트할 수 있습니다:

```powershell
# 다른 창에 npm run dev 를 띄운 뒤
.\scripts\render-all.ps1 -BaseUrl http://localhost:3000
```

---

## 1단계 — 손으로 한 번 돌려보기

스케줄러에 넣기 전에 반드시 직접 실행해서 끝까지 도는지 확인합니다.

```powershell
cd C:\Users\SPOFEED\Desktop\football-prediction
.\render-daily.bat
```

마지막에 이런 요약이 나오면 성공입니다.

```
완료: 4 개 · 건너뜀: 0 개 · 실패: 0 개
총 소요: 12.4 분
생성된 영상:
  result_euro_2026-08-19.mp4  (6.9 MB)
  daily_euro_2026-08-20.mp4   (5.1 MB)
  ...
```

> `건너뜀` 은 실패가 아닙니다. 그날 경기가 없거나 정산된 픽이 없으면
> 영상을 만들지 않고 넘어갑니다. 정상 동작입니다.

---

## 2단계 — 작업 스케줄러 등록

1. 시작 메뉴에서 **작업 스케줄러** 실행
2. 오른쪽 **작업 만들기** (기본 작업 말고 "작업 만들기")

### 일반 탭

- 이름: `TrendSoccer 숏폼 렌더`
- **사용자가 로그온했을 때만 실행** 선택
- ☑ **가장 높은 수준의 권한으로 실행**

### 트리거 탭 → 새로 만들기

- 작업 시작: **일정에 따라**
- **매일**, 시작 시간 **오전 7:00**
- ☑ 사용

> 오전 7시를 권하는 이유: 어제 경기 정산이 끝나 있고,
> 오늘 픽도 생성돼 있는 시간대입니다.

### 동작 탭 → 새로 만들기

- 동작: **프로그램 시작**
- 프로그램/스크립트:
  ```
  C:\Users\SPOFEED\Desktop\football-prediction\render-daily.bat
  ```
- 시작 위치 **(중요)**:
  ```
  C:\Users\SPOFEED\Desktop\football-prediction
  ```

> 시작 위치를 비워두면 `node` 가 프로젝트를 못 찾아 실패합니다.

### 조건 탭

- ☐ **컴퓨터의 AC 전원이 켜져 있는 경우에만 작업 시작** — 노트북이면 체크 해제
- ☑ 작업을 실행하기 위해 절전 모드 해제

### 설정 탭

- ☑ 예약 시간이 지난 후 가능한 한 빨리 작업 시작
  → PC가 꺼져 있었으면 켜진 직후에 돌립니다
- 작업이 다음 시간보다 오래 실행되면 중지: **2시간**

---

## 3단계 — 테스트

작업 스케줄러 목록에서 방금 만든 작업을 **오른쪽 클릭 → 실행**.

`out\오늘날짜\render.log` 가 생기고 mp4 가 쌓이면 정상입니다.

---

## 자주 막히는 것

**"실패 (exit 1)" 인데 이유를 모르겠다**
→ `out\날짜\render.log` 를 여세요. 각 작업의 전체 출력이 들어 있습니다.

**`node` 를 찾을 수 없다는 오류**
→ 작업 스케줄러의 **시작 위치**가 비어 있습니다. 위 경로를 넣으세요.

**Chrome 관련 오류**
→ 스케줄러 계정에서 처음 실행하는 경우입니다. 한 번 수동으로:
```powershell
npx remotion browser ensure
```

**영상이 하나도 안 나온다**
→ 배포 서버에 API 가 아직 없을 수 있습니다.
브라우저에서 열어보세요:
`https://www.trendsoccer.com/api/admin/shorts-daily?sport=football&group=euro`

**너무 오래 걸린다**
→ 배경 영상이 렌더 시간을 2배로 만듭니다.
급하면 `public\videos\` 의 mp4 를 잠시 다른 폴더로 옮기면
그라디언트 배경으로 훨씬 빠르게 나옵니다.

---

## 옵션

```powershell
# 특정 포맷만
.\scripts\render-all.ps1 -Only daily
.\scripts\render-all.ps1 -Only result

# 금요일이어도 TOP5 건너뛰기
.\scripts\render-all.ps1 -SkipTop5

# 로컬 개발 서버 데이터로
.\scripts\render-all.ps1 -BaseUrl http://localhost:3000
```

---

## 다음 단계 — 유튜브 업로드

지금은 영상까지만 자동입니다. 업로드는 직접 하셔야 합니다.

유튜브 API 로 업로드까지 자동화하려면 OAuth 인증과 채널 연동이 필요하고,
제목·설명·해시태그를 자동 생성하는 작업이 따라붙습니다.
영상 품질이 안정되고 며칠 돌려본 뒤에 붙이는 게 순서상 맞습니다.

그 전에 유용한 중간 단계는 **제목·설명 자동 생성**입니다.
렌더할 때 `out\날짜\` 에 `upload.txt` 를 같이 만들어두면
복사해서 붙여넣기만 하면 됩니다. 필요하시면 붙여드리겠습니다.
