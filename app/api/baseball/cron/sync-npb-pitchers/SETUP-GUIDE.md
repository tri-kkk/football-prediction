# NPB 선발투수 자동 동기화 설정 가이드

## 개요

NPB 경기의 선발투수를 자동으로 가져와서 `baseball_matches` 테이블에 업데이트하는 시스템입니다.

**데이터 소스:**
1. NPB 공식 사이트 (`npb.jp/announcement/starter/`) — 1순위
2. Yahoo Japan 스포츠네비 (`baseball.yahoo.co.jp/npb/schedule/`) — 백업

**API 엔드포인트:**
```
GET /api/baseball/cron/sync-npb-pitchers              → 오늘 경기
GET /api/baseball/cron/sync-npb-pitchers?date=2026-04-07  → 특정 날짜
GET /api/baseball/cron/sync-npb-pitchers?dry=true     → 테스트 모드 (DB 수정 안 함)
GET /api/baseball/cron/sync-npb-pitchers?force=true   → 이미 설정된 투수도 덮어쓰기
```

---

## 1단계: 패키지 설치 (선택사항)

현재 구현은 순수 regex 기반 HTML 파싱을 사용합니다.
더 안정적인 파싱이 필요하면 cheerio를 추가할 수 있습니다:

```bash
npm install cheerio
```

---

## 2단계: DB 마이그레이션 (권장)

투수 이름 일본어↔한글 자동 매칭을 위해 `npb_pitcher_stats` 테이블에 `name_jp` 컬럼 추가를 권장합니다.

### Supabase SQL Editor에서 실행:

```sql
-- npb_pitcher_stats에 일본어 이름 컬럼 추가
ALTER TABLE npb_pitcher_stats
ADD COLUMN IF NOT EXISTS name_jp TEXT;

-- 인덱스 추가 (매칭 속도 향상)
CREATE INDEX IF NOT EXISTS idx_npb_pitcher_stats_name_jp
ON npb_pitcher_stats(name_jp);

-- 예시: 주요 투수 일본어 이름 매핑 (수동 입력 필요)
-- UPDATE npb_pitcher_stats SET name_jp = '山本由伸' WHERE name = '야마모토 요시노부' AND team = '오릭스';
-- UPDATE npb_pitcher_stats SET name_jp = '佐々木朗希' WHERE name = '사사키 로키' AND team = '지바롯데';
-- UPDATE npb_pitcher_stats SET name_jp = '今永昇太' WHERE name = '이마나가 쇼타' AND team = '요코하마';
```

### name_jp 없이도 동작합니다
- 한글 매칭 실패 시 일본어 한자 이름이 `home_pitcher_ko` / `away_pitcher_ko`에 그대로 저장됩니다
- 관리자 페이지에서 수동으로 교체할 수 있습니다
- 한자는 한국 사용자도 어느 정도 읽을 수 있습니다

---

## 3단계: Supabase Cron 설정

NPB 경기는 보통 18:00 KST에 시작하고, 예고선발은 경기 4시간 전(14:00 KST)에 공시됩니다.

### Supabase Dashboard → Database → Extensions
1. `pg_cron` extension이 활성화되어 있는지 확인

### Supabase Dashboard → SQL Editor에서 실행:

```sql
-- NPB 선발투수 자동 동기화 (매일 14:10 KST = 05:10 UTC)
-- 14:00에 공시되니 10분 여유를 두고 실행
SELECT cron.schedule(
  'sync-npb-pitchers',
  '10 5 * * *',  -- UTC 기준: 매일 05:10 = KST 14:10
  $$
  SELECT
    net.http_get(
      url := 'https://YOUR_DOMAIN.com/api/baseball/cron/sync-npb-pitchers',
      headers := '{"Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb
    );
  $$
);

-- 백업: 16:00 KST에 한번 더 실행 (누락 방지)
SELECT cron.schedule(
  'sync-npb-pitchers-backup',
  '0 7 * * *',  -- UTC 기준: 매일 07:00 = KST 16:00
  $$
  SELECT
    net.http_get(
      url := 'https://YOUR_DOMAIN.com/api/baseball/cron/sync-npb-pitchers',
      headers := '{"Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb
    );
  $$
);

-- 스케줄 확인
SELECT * FROM cron.job;

-- 실행 로그 확인
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
```

### pg_net 확장이 필요합니다
Supabase에서 HTTP 요청을 보내려면 `pg_net` extension도 활성화해야 합니다:
```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

---

## 4단계: 인증 보안 (권장)

cron API에 인증을 추가하려면:

```typescript
// route.ts 상단에 추가
const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: NextRequest) {
  // cron 인증 체크
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ... 나머지 로직
}
```

`.env`에 추가:
```
CRON_SECRET=your-random-secret-here
```

---

## 5단계: 테스트

### 1. Dry Run 테스트 (DB 변경 없음)
```bash
curl "http://localhost:3000/api/baseball/cron/sync-npb-pitchers?dry=true"
```

### 2. 특정 날짜 테스트
```bash
curl "http://localhost:3000/api/baseball/cron/sync-npb-pitchers?date=2026-04-07&dry=true"
```

### 3. 실제 업데이트
```bash
curl "http://localhost:3000/api/baseball/cron/sync-npb-pitchers"
```

### 4. 강제 덮어쓰기 (이미 설정된 투수도 업데이트)
```bash
curl "http://localhost:3000/api/baseball/cron/sync-npb-pitchers?force=true"
```

---

## 응답 예시

```json
{
  "success": true,
  "date": "2026-04-07",
  "dryRun": false,
  "scrapedGames": 6,
  "dbMatches": 6,
  "updated": 5,
  "results": [
    {
      "matchId": 12345,
      "homeTeam": "Yomiuri Giants",
      "awayTeam": "Hanshin Tigers",
      "homeTeamJp": "巨人",
      "awayTeamJp": "阪神",
      "homePitcherJp": "戸郷翔征",
      "awayPitcherJp": "才木浩人",
      "homePitcherKo": "戸郷翔征",
      "awayPitcherKo": "才木浩人",
      "status": "UPDATED"
    }
  ]
}
```

---

## 트러블슈팅

### 스크래핑 실패 시
1. `?dry=true`로 rawHtml 확인 → 페이지 구조 변경 여부 체크
2. npb.jp가 차단됐으면 Yahoo 백업이 자동 작동
3. 둘 다 안 되면 서버 IP 차단 가능성 → User-Agent 변경 시도

### 팀 매칭 실패 시
1. 응답의 `NOT_MATCHED` 항목 확인
2. `JP_TEAM_TO_DB` 매핑에 누락된 팀명 변형 추가
3. DB의 `home_team` 값과 매핑 값 비교

### 투수 이름이 일본어로 저장될 때
1. `npb_pitcher_stats`에 `name_jp` 컬럼 추가 후 매핑
2. 또는 관리자 페이지에서 수동 교체
3. 향후 자동 번역 API 연동 가능

---

## 향후 개선 사항

- [ ] `name_jp` 컬럼 활용한 자동 한글 매칭
- [ ] KBO 선발투수 자동화 (네이버 스포츠 스크래핑)
- [ ] 투수 스탯 DB 자동 업데이트 (시즌 중)
- [ ] Slack/Discord 알림 (동기화 결과 리포트)
- [ ] cheerio 도입으로 파싱 안정성 향상
