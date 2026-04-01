-- 야구 조합 픽 테이블
CREATE TABLE IF NOT EXISTS baseball_combo_picks (
  id BIGSERIAL PRIMARY KEY,
  league TEXT NOT NULL CHECK (league IN ('MLB', 'KBO', 'NPB')),
  pick_date DATE NOT NULL,
  fold_count INT NOT NULL CHECK (fold_count IN (2, 3)),

  -- 조합 경기 정보 (JSON 배열)
  -- [{matchId, homeTeam, awayTeam, homeTeamKo, awayTeamKo, pick, pickTeam, pickTeamKo, winProb, odds, reason}]
  picks JSONB NOT NULL,

  -- 조합 전체 정보
  total_odds DECIMAL(6,2),           -- 조합 배당
  avg_confidence DECIMAL(5,2),       -- 평균 신뢰도
  ai_analysis TEXT,                   -- AI 분석 요약문

  -- 결과 추적
  result TEXT CHECK (result IN ('pending', 'win', 'lose', 'partial', 'cancelled')),
  correct_count INT DEFAULT 0,       -- 적중 경기 수

  -- 메타
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_combo_picks_league_date ON baseball_combo_picks(league, pick_date DESC);
CREATE INDEX idx_combo_picks_result ON baseball_combo_picks(result);

-- 적중 통계 뷰
CREATE OR REPLACE VIEW combo_picks_stats AS
SELECT
  league,
  fold_count,
  COUNT(*) FILTER (WHERE result IS NOT NULL AND result != 'pending' AND result != 'cancelled') as total_picks,
  COUNT(*) FILTER (WHERE result = 'win') as wins,
  COUNT(*) FILTER (WHERE result = 'win' OR result = 'lose') as decided,
  CASE
    WHEN COUNT(*) FILTER (WHERE result = 'win' OR result = 'lose') > 0
    THEN ROUND(COUNT(*) FILTER (WHERE result = 'win')::DECIMAL / COUNT(*) FILTER (WHERE result = 'win' OR result = 'lose') * 100, 1)
    ELSE 0
  END as win_rate
FROM baseball_combo_picks
WHERE pick_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY league, fold_count;
