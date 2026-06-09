-- =====================================================================
-- 야구 팀 전력 일일 스냅샷 (시점별 history 적립)
-- 목적: 라운드/일자별 팀 전력을 보존 → 다음 알고리즘 학습 시 "그 시점의 전력" 사용
--       (현재 baseball_team_season_stats 는 upsert 라 최신값만 남아 과거 전력 복원 불가 + 학습 누수)
-- 사용: Supabase SQL Editor 에 전체 붙여넣고 Run.
--       기존 수집 크론(collect-team-stats, sync-kbo/mlb-team-stats)은 수정 불필요.
-- =====================================================================

-- 1) 스냅샷 테이블 생성 (전력 관련 핵심 컬럼만)
CREATE TABLE IF NOT EXISTS baseball_team_stats_daily (
  id                          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  snapshot_date               date    NOT NULL DEFAULT CURRENT_DATE,
  league                      text    NOT NULL,
  season                      text    NOT NULL,
  team_id                     bigint,
  team_name                   text    NOT NULL,
  team_name_ko                text,
  games_played                int,
  wins                        int,
  losses                      int,
  win_pct                     numeric,
  home_wins                   int,
  home_losses                 int,
  away_wins                   int,
  away_losses                 int,
  last_10_record              text,
  current_streak              text,
  team_runs_per_game          numeric,
  team_runs_allowed_per_game  numeric,
  team_era                    numeric,
  team_era_real               numeric,
  team_whip                   numeric,
  team_ops                    numeric,
  team_obp                    numeric,
  team_slg                    numeric,
  team_avg                    numeric,
  team_hr                     int,
  team_k                      int,
  team_bb                     int,
  team_opp_avg                numeric,
  division_rank               int,
  league_rank                 int,
  created_at                  timestamptz DEFAULT now(),
  -- 같은 팀·시즌·날짜는 하루 1행만 (재실행 안전)
  CONSTRAINT baseball_team_stats_daily_uq UNIQUE (league, season, team_name, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_bts_daily_lookup
  ON baseball_team_stats_daily (league, season, team_name, snapshot_date);

-- 2) 스냅샷 적립 함수 (오늘자 최신 전력을 history 로 복사)
CREATE OR REPLACE FUNCTION snapshot_baseball_team_stats()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  n integer;
BEGIN
  INSERT INTO baseball_team_stats_daily (
    snapshot_date, league, season, team_id, team_name, team_name_ko,
    games_played, wins, losses, win_pct, home_wins, home_losses, away_wins, away_losses,
    last_10_record, current_streak,
    team_runs_per_game, team_runs_allowed_per_game,
    team_era, team_era_real, team_whip,
    team_ops, team_obp, team_slg, team_avg, team_hr, team_k, team_bb, team_opp_avg,
    division_rank, league_rank
  )
  SELECT
    CURRENT_DATE, league, season, team_id, team_name, team_name_ko,
    games_played, wins, losses, win_pct, home_wins, home_losses, away_wins, away_losses,
    last_10_record, current_streak,
    team_runs_per_game, team_runs_allowed_per_game,
    team_era, team_era_real, team_whip,
    team_ops, team_obp, team_slg, team_avg, team_hr, team_k, team_bb, team_opp_avg,
    division_rank, league_rank
  FROM baseball_team_season_stats
  ON CONFLICT (league, season, team_name, snapshot_date) DO NOTHING;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- 3) 지금 즉시 오늘치 스냅샷 1회 적립 (시드)
SELECT snapshot_baseball_team_stats() AS rows_inserted_today;

-- 4) 매일 자동 적립 스케줄 (pg_cron)
--    23:50 KST = 14:50 UTC — 그날 수집 크론들이 다 돈 뒤 마지막 상태를 박제
--    (pg_cron 은 UTC 기준)
SELECT cron.schedule(
  'snapshot-baseball-team-stats',
  '50 14 * * *',
  $$ SELECT snapshot_baseball_team_stats(); $$
);

-- 확인용:
-- SELECT * FROM cron.job WHERE jobname = 'snapshot-baseball-team-stats';
-- SELECT snapshot_date, count(*) FROM baseball_team_stats_daily GROUP BY 1 ORDER BY 1 DESC;
