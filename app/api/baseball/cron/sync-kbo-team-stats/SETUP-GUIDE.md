# KBO 팀 시즌 스탯 자동 동기화 설정 가이드

## 개요

KBO 10개 팀의 시즌 타격/투구 통계를 koreabaseball.com에서 스크래핑해
`baseball_team_season_stats` 테이블에 upsert 하는 cron.

**수집 지표:**
- 타격: AVG, OBP, SLG, OPS, HR, RBI, SB, H, AB, R, BB, SO
- 투구: ERA, WHIP, oppAvg(피안타율), K9, BB9, HR9, IP, W, L, SV, HLD, K, BB, H, ER

**데이터 소스:**
- `https://www.koreabaseball.com/Record/Team/Hitter/Basic1.aspx`
- `https://www.koreabaseball.com/Record/Team/Hitter/Basic2.aspx` (OBP/SLG/OPS)
- `https://www.koreabaseball.com/Record/Team/Pitcher/Basic1.aspx`
- `https://www.koreabaseball.com/Record/Team/Pitcher/Basic2.aspx` (피안타율)

**API 엔드포인트:**
```
GET /api/baseball/cron/sync-kbo-team-stats            → 현재 시즌
GET /api/baseball/cron/sync-kbo-team-stats?season=2026
GET /api/baseball/cron/sync-kbo-team-stats?dry=true   → DB 쓰기 안 함
```

---

## 1단계: DB 마이그레이션 (완료됨)

`baseball_team_season_stats` 테이블은 Stage 2 마이그레이션으로 이미 생성됨.

---

## 2단계: 환경 변수

`.env` (또는 Vercel Project Settings → Environment Variables):

```
CRON_SECRET=<랜덤 시크릿>
```

route.ts는 `CRON_SECRET`가 설정되어 있으면 `Authorization: Bearer <secret>`
헤더를 반드시 요구함. 미설정 시 공개 엔드포인트가 됨.

시크릿 생성 예:
```bash
openssl rand -hex 32
```

---

## 3단계: Supabase pg_cron 등록

### Dashboard → Database → Extensions
- `pg_cron` 활성화
- `pg_net` 활성화

### SQL Editor에서 실행

```sql
-- KBO 팀 시즌 스탯 자동 동기화 (매일 08:00 KST = 23:00 UTC 전날)
-- 전날 경기 종료 후 KBO 공식 통계 반영 시점
SELECT cron.schedule(
  'sync-kbo-team-stats',
  '0 23 * * *',  -- UTC 23:00 = 다음날 08:00 KST
  $$
  SELECT
    net.http_get(
      url := 'https://www.trendsoccer.com/api/baseball/cron/sync-kbo-team-stats',
      headers := '{"Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb,
      timeout_milliseconds := 60000
    );
  $$
);

-- 스케줄 확인
SELECT jobid, schedule, command, active
FROM cron.job
WHERE jobname = 'sync-kbo-team-stats';

-- 최근 실행 로그
SELECT jobid, status, return_message, start_time, end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'sync-kbo-team-stats')
ORDER BY start_time DESC
LIMIT 10;
```

### 스케줄 변경 / 삭제
```sql
-- 삭제 후 재등록
SELECT cron.unschedule('sync-kbo-team-stats');

-- 비활성화만
UPDATE cron.job SET active = false WHERE jobname = 'sync-kbo-team-stats';
```

---

## 4단계: 수동 테스트

### Dry Run (DB 쓰기 없음)
```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://www.trendsoccer.com/api/baseball/cron/sync-kbo-team-stats?dry=true"
```

### 실제 실행
```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://www.trendsoccer.com/api/baseball/cron/sync-kbo-team-stats"
```

### 특정 시즌
```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://www.trendsoccer.com/api/baseball/cron/sync-kbo-team-stats?season=2026"
```

---

## 응답 예시

```json
{
  "success": true,
  "season": "2026",
  "dryRun": false,
  "hittingCount": 10,
  "pitchingCount": 10,
  "updated": 10,
  "errors": 0,
  "elapsed": "6.5s"
}
```

---

## 트러블슈팅

### KBO가 에러 페이지를 반환
koreabaseball.com의 IP 차단 가능성.
- User-Agent/Referer 헤더는 이미 포함되어 있음
- `?dry=true`로 rawHtml 확인 → 페이지 구조 변경 체크
- 일시적 차단이면 재시도로 복구됨

### 합계 행이 팀으로 들어감
`isTotalsRow()` + `normalizeTeamName()` null 반환 로직이 걸러냄.
파싱 결과에 `합계`/`TOTAL` 이 보이면 버그.

### OPS/WHIP 이 null
- OPS: Basic2 페이지에서 OBP+SLG 폴백 계산
- WHIP: Pitcher2 없으면 (BB+H)/IP 자동 계산

---

## 운영 팁

- **하루 1회로 충분**: 팀 시즌 스탯은 매일 1번만 갱신돼도 무방
- **백업 스케줄 불필요**: 이 엔드포인트는 누적 집계라 누락돼도 다음 날 복구됨
- **메인 도메인 고정**: `www.trendsoccer.com` 하나로만 호출 (apex는 리다이렉트)
