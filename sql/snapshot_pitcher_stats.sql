-- =====================================================================
-- 야구 투수 시즌스탯 일일 스냅샷 (시점별 history 적립)
-- 목적: 투수 폼 변화(예: 4월 ERA vs 6월 ERA)를 시점별로 보존 → 학습 시 그 시점 폼 사용
--       (현재 kbo_pitcher_stats / npb_pitcher_stats 는 (이름,팀,시즌) upsert 라 최신값만 남음)
-- 사용: Supabase SQL Editor 에 전체 붙여넣고 Run. 수집 크론 수정 불필요.
-- 대상: KBO, NPB (MLB 투수 시즌스탯 별도 테이블 없음 → baseball_matches 경기별로 보존됨)
-- =====================================================================

-- 1) 스냅샷 테이블 (KBO/NPB 공통 핵심 컬럼)
CREATE TABLE IF NOT EXISTS baseball_pitcher_stats_daily (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  snapshot_date  date    NOT NULL DEFAULT CURRENT_DATE,
  league         text    NOT NULL,
  season         text    NOT NULL,
  name           text    NOT NULL,
  team           text    NOT NULL,
  era            numeric,
  whip           numeric,
  games          int,
  wins           int,
  losses         int,
  saves          int,
  holds          int,
  strikeouts     int,
  walks          int,
  hits           int,
  home_runs      int,
  earned_runs    int,
  runs           int,
  created_at     timestamptz DEFAULT now(),
  CONSTRAINT baseball_pitcher_stats_daily_uq UNIQUE (league, season, name, team, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_bps_daily_lookup
  ON baseball_pitcher_stats_daily (league, season, name, team, snapshot_date);

-- 2) 적립 함수 (KBO + NPB 두 테이블에서 오늘자 복사)
CREATE OR REPLACE FUNCTION snapshot_baseball_pitcher_stats()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  n integer;
BEGIN
  -- KBO
  INSERT INTO baseball_pitcher_stats_daily
    (snapshot_date, league, season, name, team, era, whip, games, wins, losses,
     saves, holds, strikeouts, walks, hits, home_runs, earned_runs, runs)
  SELECT CURRENT_DATE, 'KBO', season, name, team, era, whip, games, wins, losses,
     saves, holds, strikeouts, walks, hits, home_runs, earned_runs, runs
  FROM kbo_pitcher_stats
  ON CONFLICT (league, season, name, team, snapshot_date) DO NOTHING;

  -- NPB (whip 컬럼은 대부분 null 이라 그대로)
  INSERT INTO baseball_pitcher_stats_daily
    (snapshot_date, league, season, name, team, era, whip, games, wins, losses,
     saves, holds, strikeouts, walks, hits, home_runs, earned_runs, runs)
  SELECT CURRENT_DATE, 'NPB', season, name, team, era, whip, games, wins, losses,
     saves, holds, strikeouts, walks, hits, home_runs, earned_runs, runs
  FROM npb_pitcher_stats
  ON CONFLICT (league, season, name, team, snapshot_date) DO NOTHING;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;  -- 마지막(NPB) insert 행수
END;
$$;

-- 3) 지금 즉시 오늘치 적립
SELECT snapshot_baseball_pitcher_stats() AS npb_rows_inserted_today;
SELECT snapshot_date, league, count(*)
FROM baseball_pitcher_stats_daily GROUP BY 1,2 ORDER BY 1 DESC, 2;

-- 4) 매일 자동 적립 (pg_cron) — 23:55 KST = 14:55 UTC (팀스탯 스냅샷 직후)
SELECT cron.schedule(
  'snapshot-baseball-pitcher-stats',
  '55 14 * * *',
  $$ SELECT snapshot_baseball_pitcher_stats(); $$
);

-- 확인용:
-- SELECT * FROM cron.job WHERE jobname = 'snapshot-baseball-pitcher-stats';
