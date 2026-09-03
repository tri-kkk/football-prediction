-- ============================================================
-- 예측 생성 Cron 분할 등록 (Supabase pg_cron)
--
-- 배경 (실측 2026-09-03):
--   /api/cron/generate-predictions 는 54개 리그를 순차 처리한다.
--   리그 하나당 약 10초 → 전체는 500초 이상이 걸려 한 번에 끝나지 않는다.
--   그 결과 리스트 뒤쪽 리그(J1은 37번째, MLS 53번째)는 만성적으로 예측이 생성되지 않았다.
--   실제로 J1 최신 예측이 2026-05-30 에 멈춰 있었다.
--
--   → ?group=N&of=4 로 4등분해 4개 잡으로 나눠 돌린다.
--     인덱스 나머지로 나누므로 무거운 리그(PL/PD/BL1/SA/FL1)가 묶음마다 분산되고,
--     리그가 추가돼도 이 SQL을 고칠 필요가 없다.
--
-- 사전 조건: pg_cron, pg_net 익스텐션 활성화 (Database > Extensions)
-- ============================================================

-- ------------------------------------------------------------
-- 0) 기존 잡 확인 — 단일 잡이 이미 있으면 먼저 해제할 것
-- ------------------------------------------------------------
-- SELECT jobid, jobname, schedule, active
-- FROM cron.job
-- WHERE command ILIKE '%generate-predictions%';
--
-- SELECT cron.unschedule('<위에서 찾은 jobname>');

-- ------------------------------------------------------------
-- 1) 4개 묶음 등록 (6시간 주기, 10분씩 시차)
--    한 묶음 ≈ 13~14개 리그 ≈ 150초 → 600초 제한에 여유
-- ------------------------------------------------------------
SELECT cron.schedule(
  'generate-predictions-1of4',
  '0 */6 * * *',
  $$
  SELECT net.http_get(
    url := 'https://www.trendsoccer.com/api/cron/generate-predictions?group=1&of=4'
  );
  $$
);

SELECT cron.schedule(
  'generate-predictions-2of4',
  '10 */6 * * *',
  $$
  SELECT net.http_get(
    url := 'https://www.trendsoccer.com/api/cron/generate-predictions?group=2&of=4'
  );
  $$
);

SELECT cron.schedule(
  'generate-predictions-3of4',
  '20 */6 * * *',
  $$
  SELECT net.http_get(
    url := 'https://www.trendsoccer.com/api/cron/generate-predictions?group=3&of=4'
  );
  $$
);

SELECT cron.schedule(
  'generate-predictions-4of4',
  '30 */6 * * *',
  $$
  SELECT net.http_get(
    url := 'https://www.trendsoccer.com/api/cron/generate-predictions?group=4&of=4'
  );
  $$
);

-- ------------------------------------------------------------
-- 2) 확인
-- ------------------------------------------------------------
-- SELECT jobid, jobname, schedule, active
-- FROM cron.job
-- WHERE jobname LIKE 'generate-predictions-%'
-- ORDER BY jobname;

-- 실행 로그
-- SELECT j.jobname, d.status, d.start_time, d.end_time
-- FROM cron.job_run_details d
-- JOIN cron.job j USING (jobid)
-- WHERE j.jobname LIKE 'generate-predictions-%'
-- ORDER BY d.start_time DESC
-- LIMIT 20;

-- 리그별 예측 생성 현황 (24시간)
-- SELECT league, COUNT(*) AS cnt, MAX(created_at) AS latest
-- FROM match_predictions
-- WHERE created_at >= now() - interval '24 hours'
-- GROUP BY league
-- ORDER BY cnt DESC;

-- ------------------------------------------------------------
-- 3) 해제 (필요 시)
-- ------------------------------------------------------------
-- SELECT cron.unschedule('generate-predictions-1of4');
-- SELECT cron.unschedule('generate-predictions-2of4');
-- SELECT cron.unschedule('generate-predictions-3of4');
-- SELECT cron.unschedule('generate-predictions-4of4');

-- ------------------------------------------------------------
-- 참고: 수동 실행
--   전체 묶음 하나:  /api/cron/generate-predictions?group=1&of=4
--   특정 리그만:     /api/cron/generate-predictions?league=J1
--   응답의 timedOut 이 true 면 그 묶음이 여전히 크다는 뜻 → of 를 6~8로 늘릴 것
-- ------------------------------------------------------------
