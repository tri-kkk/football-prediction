-- ============================================================
-- 텔레그램 데일리 리포트 — Phase 2 스키마 추가
-- 종목별 발송이라 종목별 중복방지 컬럼 필요 (Supabase SQL Editor 1회 실행)
-- ============================================================

alter table telegram_links add column if not exists last_football_on date;
alter table telegram_links add column if not exists last_baseball_on date;

-- ============================================================
-- 발송 스케줄 (pg_cron + pg_net). <CRON_SECRET> 와 도메인 교체 후 실행.
-- 시각: KST = UTC+9  →  12:10 KST = 03:10 UTC / 18:10 KST = 09:10 UTC
-- ============================================================

-- 야구: 매일 12:10 KST
-- select cron.schedule(
--   'telegram-baseball-daily',
--   '10 3 * * *',
--   $$ select net.http_get(
--        url := 'https://www.trendsoccer.com/api/cron/telegram-daily?sport=baseball&secret=<CRON_SECRET>'
--      ) $$
-- );

-- 축구: 매일 18:10 KST
-- select cron.schedule(
--   'telegram-football-daily',
--   '10 9 * * *',
--   $$ select net.http_get(
--        url := 'https://www.trendsoccer.com/api/cron/telegram-daily?sport=football&secret=<CRON_SECRET>'
--      ) $$
-- );

-- 스케줄 확인:   select * from cron.job;
-- 스케줄 삭제:   select cron.unschedule('telegram-baseball-daily');
