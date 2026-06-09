-- =====================================================================
-- MLB 완료경기 실제 선발투수 자동 채움 크론 등록 (pg_cron)
-- 전제: app/api/baseball/cron/sync-mlb-pitchers-actual 라우트가 먼저 배포되어 있어야 함
--       (git push → Vercel 배포 후 실행)
-- 동작: 매일 01:00 KST(16:00 UTC) 최근 5일 완료경기의 game_pk/선발/ERA 자동 채움
-- =====================================================================

-- pg_net 확장 (이미 설치돼 있으면 무시됨)
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'sync-mlb-pitchers-actual',
  '0 16 * * *',  -- 16:00 UTC = 01:00 KST
  $$
    SELECT net.http_get(
      url := 'https://trendsoccer.com/api/baseball/cron/sync-mlb-pitchers-actual?days=5',
      timeout_milliseconds := 280000
    );
  $$
);

-- 확인:
-- SELECT * FROM cron.job WHERE jobname = 'sync-mlb-pitchers-actual';
-- 수동 1회 실행(배포 후 즉시 테스트, dry-run):
--   curl "https://trendsoccer.com/api/baseball/cron/sync-mlb-pitchers-actual?days=5&dry=true"
