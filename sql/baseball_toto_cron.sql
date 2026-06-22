-- ============================================================
-- 야구토토 승1패 자동 스크래핑 Cron 등록 (Supabase pg_cron)
-- 30분마다 /api/cron/collect-baseball-toto 호출 → 최신 회차 갱신
-- ============================================================
-- 사전 조건: pg_cron, pg_net 익스텐션 활성화 (대시보드 Database > Extensions)

-- 등록
SELECT cron.schedule(
  'collect-baseball-toto',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://trendsoccer.com/api/cron/collect-baseball-toto',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);

-- 확인
-- SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'collect-baseball-toto';

-- 실행 로그 확인
-- SELECT * FROM cron.job_run_details
--   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'collect-baseball-toto')
--   ORDER BY start_time DESC LIMIT 10;

-- 해제(필요 시)
-- SELECT cron.unschedule('collect-baseball-toto');
