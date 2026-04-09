-- baseball_team_season_stats 테이블에 KBO 팀 시즌 타격/투구 실측 지표 컬럼 추가
-- koreabaseball.com Record/Team/Hitter.aspx + Pitcher.aspx 에서 파싱한 실제 값

-- 타격 (Hitter)
ALTER TABLE baseball_team_season_stats
  ADD COLUMN IF NOT EXISTS team_avg NUMERIC(5,3),       -- 팀 타율 (AVG)
  ADD COLUMN IF NOT EXISTS team_obp NUMERIC(5,3),       -- 출루율 (OBP)
  ADD COLUMN IF NOT EXISTS team_slg NUMERIC(5,3),       -- 장타율 (SLG)
  ADD COLUMN IF NOT EXISTS team_ops NUMERIC(5,3),       -- OPS
  ADD COLUMN IF NOT EXISTS team_hr INTEGER,             -- 팀 홈런
  ADD COLUMN IF NOT EXISTS team_at_bats INTEGER,        -- 총 타수
  ADD COLUMN IF NOT EXISTS team_hits_total INTEGER,     -- 총 안타
  ADD COLUMN IF NOT EXISTS team_runs_total INTEGER,     -- 총 득점
  ADD COLUMN IF NOT EXISTS team_rbi INTEGER,            -- 타점

-- 투구 (Pitcher)
  ADD COLUMN IF NOT EXISTS team_era_real NUMERIC(5,2),  -- 실제 팀 방어율 (기존 team_era는 경기당 실점 근사)
  ADD COLUMN IF NOT EXISTS team_whip NUMERIC(5,2),      -- 팀 WHIP
  ADD COLUMN IF NOT EXISTS team_opp_avg NUMERIC(5,3),   -- 피안타율 (있을 때만)
  ADD COLUMN IF NOT EXISTS team_k INTEGER,              -- 팀 탈삼진
  ADD COLUMN IF NOT EXISTS team_bb INTEGER,             -- 팀 볼넷
  ADD COLUMN IF NOT EXISTS team_innings_pitched TEXT,   -- 팀 총 이닝 (예: "145.1")

  ADD COLUMN IF NOT EXISTS team_stats_updated_at TIMESTAMPTZ;

-- 조회용 인덱스 (이미 있으면 skip)
CREATE INDEX IF NOT EXISTS idx_bsts_league_season_team
  ON baseball_team_season_stats (league, season, team_name);
