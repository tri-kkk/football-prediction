-- =============================================================================
-- blog_report_002_backfill_sample.sql
-- 로컬 확인용 1건 백필. blog_report_001 을 먼저 실행할 것.
--
-- 값 출처: match_odds_latest (match_id = '1556049', 2026-09-02 조회)
-- =============================================================================

UPDATE blog_posts SET
  match_id    = '1556049',
  home_team   = '브이파렌 나가사키',
  away_team   = '감바 오사카',
  league_name = 'J1 League',
  kickoff_at  = '2026-09-02T10:00:00+00:00',
  home_prob   = 27,
  draw_prob   = 27,
  away_prob   = 46,
  pred_score  = '0-1',
  pick        = '감바 오사카 승',
  pick_sub    = 'Under 2.5',
  confidence  = 19   -- 1위(46) - 2위(27) 격차 %p
WHERE slug = 'v-varen-nagasaki-vs-gamba-osaka-j1-league-preview-20260902';

-- 확인
SELECT slug, match_id, home_team, away_team, home_prob, draw_prob, away_prob, pred_score, pick, confidence
FROM blog_posts
WHERE slug = 'v-varen-nagasaki-vs-gamba-osaka-j1-league-preview-20260902';

-- =============================================================================
-- 나머지 포스트는 SQL 퍼지 매칭 대신 아래가 안전하다:
--   1) 환경변수 ENABLE_BLOG_REPORT_FIELDS=1
--   2) GET /api/blog/auto-generate?force=1
-- =============================================================================
