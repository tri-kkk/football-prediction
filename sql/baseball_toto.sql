-- ============================================================
-- 야구토토 승1패 (Baseball Toto Win/1run/Loss) 전용 스키마
-- ------------------------------------------------------------
-- 와이즈토토 game_type=bs & game_category=bs1 스크래핑 결과 저장
-- 축구 승무패(toto_*)와 달리 가운데 결과가 "무"가 아니라 "1점차 경기"
--   승(win)  = 기준(홈)팀 2점차 이상 승리
--   one(1)   = 1점차 승부 (승/패 무관, 1run margin)
--   lose(패) = 기준(홈)팀 2점차 이상 패배
-- 리그: KBO / MLB / NPB 혼재
-- ============================================================

-- ── 회차 테이블 ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS baseball_toto_rounds (
  id            BIGSERIAL PRIMARY KEY,
  year          INT  NOT NULL,
  round_number  INT  NOT NULL,
  total_matches INT  DEFAULT 0,
  total_votes   BIGINT DEFAULT 0,
  estimated_prize BIGINT DEFAULT 0,
  status        TEXT DEFAULT 'upcoming',  -- upcoming | closed | finished
  scraped_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (year, round_number)
);

-- ── 경기 테이블 ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS baseball_toto_matches (
  id             BIGSERIAL PRIMARY KEY,
  round_id       BIGINT NOT NULL REFERENCES baseball_toto_rounds(id) ON DELETE CASCADE,
  match_number   INT NOT NULL,

  -- 팀명 (wisetoto 축약 / 풀네임 / 영문)
  home_team      TEXT NOT NULL,
  away_team      TEXT NOT NULL,
  home_team_full TEXT,
  away_team_full TEXT,
  home_team_en   TEXT,
  away_team_en   TEXT,

  league         TEXT,                 -- KBO | MLB | NPB | Other
  match_date     TIMESTAMPTZ,

  -- 와이즈토토 투표 현황 (승 / 1 / 패)
  vote_win       NUMERIC(5,1) DEFAULT 0,   -- %
  vote_one       NUMERIC(5,1) DEFAULT 0,   -- %
  vote_lose      NUMERIC(5,1) DEFAULT 0,   -- %
  vote_count_win  BIGINT,
  vote_count_one  BIGINT,
  vote_count_lose BIGINT,
  vote_total      BIGINT,

  -- TrendSoccer AI 예측 (승 / 1점차 / 패)
  ts_win         NUMERIC(5,1),
  ts_one         NUMERIC(5,1),
  ts_lose        NUMERIC(5,1),
  -- 1점차 추정 메타 (디버깅/보정용)
  model_home_win NUMERIC(5,1),         -- 모델 원본 홈승(전마진) 확률
  model_away_win NUMERIC(5,1),         -- 모델 원본 원정승(전마진) 확률
  pred_source    TEXT,                 -- 'model' | 'odds' | 'vote'

  -- 괴리율 (AI - 투표)
  divergence_win  NUMERIC(5,1),
  divergence_one  NUMERIC(5,1),
  divergence_lose NUMERIC(5,1),
  max_divergence  NUMERIC(5,1),

  -- 등급 / 추천
  grade          TEXT,                 -- PICK | GOOD | FAIR | PASS
  primary_pick   TEXT,                 -- W | O | L  (O = 1점차)
  secondary_pick TEXT,
  analysis       TEXT,

  -- 결과 (정산용, 추후 cron이 채움)
  result         TEXT,                 -- W | O | L
  is_correct     BOOLEAN,

  scraped_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (round_id, match_number)
);

CREATE INDEX IF NOT EXISTS idx_bb_toto_matches_round ON baseball_toto_matches(round_id);
CREATE INDEX IF NOT EXISTS idx_bb_toto_rounds_yr ON baseball_toto_rounds(year DESC, round_number DESC);

-- ── 적중률 통계 뷰 ──────────────────────────────────────────
CREATE OR REPLACE VIEW baseball_toto_accuracy_stats AS
SELECT
  r.id   AS round_id,
  r.year,
  r.round_number,
  COUNT(m.id) FILTER (WHERE m.result IS NOT NULL)        AS total_matches,
  COUNT(m.id) FILTER (WHERE m.is_correct = true)         AS correct_picks,
  ROUND(
    100.0 * COUNT(m.id) FILTER (WHERE m.is_correct = true)
    / NULLIF(COUNT(m.id) FILTER (WHERE m.result IS NOT NULL), 0)
  , 1) AS accuracy
FROM baseball_toto_rounds r
LEFT JOIN baseball_toto_matches m ON m.round_id = r.id
GROUP BY r.id, r.year, r.round_number
ORDER BY r.year DESC, r.round_number DESC;
