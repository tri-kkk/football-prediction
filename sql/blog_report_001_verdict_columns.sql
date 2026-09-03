-- =============================================================================
-- blog_report_001_verdict_columns.sql
-- BLOG_REPORT_LAYOUT_SPEC_v1 · Phase 1
--
-- 블로그 프리뷰 리포트의 "버딕트 히어로"(모듈 01) / "최종 예측 카드"(모듈 12)를
-- 마크다운 본문이 아니라 구조화된 컬럼에서 렌더하기 위한 스키마 확장.
--
-- 전부 nullable → 기존 포스트는 그대로 동작하고,
-- 컴포넌트는 확률 3종이 모두 비어 있으면 아무것도 렌더하지 않는다.
-- =============================================================================

ALTER TABLE blog_posts
  -- Phase 2에서 라이브 데이터 조인에 쓸 키. 지금은 넣어두기만 한다.
  ADD COLUMN IF NOT EXISTS match_id     TEXT,

  -- 히어로 표시용
  ADD COLUMN IF NOT EXISTS home_team    TEXT,
  ADD COLUMN IF NOT EXISTS away_team    TEXT,
  ADD COLUMN IF NOT EXISTS league_name  TEXT,
  ADD COLUMN IF NOT EXISTS kickoff_at   TIMESTAMPTZ,

  -- 1X2 확률 (0-100 정수, 합이 100이 아니어도 컴포넌트가 정규화함)
  ADD COLUMN IF NOT EXISTS home_prob    SMALLINT,
  ADD COLUMN IF NOT EXISTS draw_prob    SMALLINT,
  ADD COLUMN IF NOT EXISTS away_prob    SMALLINT,

  -- 예측 결과
  ADD COLUMN IF NOT EXISTS pred_score   TEXT,     -- 예: '1-2'
  ADD COLUMN IF NOT EXISTS pick         TEXT,     -- 예: '감바 오사카 승'
  ADD COLUMN IF NOT EXISTS pick_sub     TEXT,     -- 예: 'Under 2.5'
  ADD COLUMN IF NOT EXISTS confidence   SMALLINT; -- 0-100

-- 값 범위 가드 (이미 있으면 건너뜀)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'blog_posts_prob_range'
  ) THEN
    ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_prob_range CHECK (
      (home_prob  IS NULL OR home_prob  BETWEEN 0 AND 100) AND
      (draw_prob  IS NULL OR draw_prob  BETWEEN 0 AND 100) AND
      (away_prob  IS NULL OR away_prob  BETWEEN 0 AND 100) AND
      (confidence IS NULL OR confidence BETWEEN 0 AND 100)
    );
  END IF;
END $$;

-- Phase 2 조인 대비 인덱스
CREATE INDEX IF NOT EXISTS idx_blog_posts_match_id
  ON blog_posts (match_id)
  WHERE match_id IS NOT NULL;

COMMENT ON COLUMN blog_posts.match_id   IS 'Phase 2: 라이브 데이터(폼/순위/H2H/오즈) 조인 키';
COMMENT ON COLUMN blog_posts.home_prob  IS '1X2 홈 승 확률 0-100';
COMMENT ON COLUMN blog_posts.draw_prob  IS '1X2 무승부 확률 0-100';
COMMENT ON COLUMN blog_posts.away_prob  IS '1X2 원정 승 확률 0-100';
COMMENT ON COLUMN blog_posts.pred_score IS '예상 스코어 문자열, 예: 1-2';
COMMENT ON COLUMN blog_posts.pick       IS '메인 픽, 예: 감바 오사카 승';
COMMENT ON COLUMN blog_posts.pick_sub   IS '보조 픽, 예: Under 2.5';
COMMENT ON COLUMN blog_posts.confidence IS '신뢰도 0-100';

-- =============================================================================
-- 확인
-- =============================================================================
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'blog_posts'
--   AND column_name IN ('match_id','home_team','away_team','league_name',
--                       'kickoff_at','home_prob','draw_prob','away_prob',
--                       'pred_score','pick','pick_sub','confidence')
-- ORDER BY column_name;

-- =============================================================================
-- 기존 포스트 백필 예시 (나가사키 vs 감바)
-- =============================================================================
-- UPDATE blog_posts SET
--   home_team   = 'V-바렌 나가사키',
--   away_team   = '감바 오사카',
--   league_name = 'J1 League',
--   kickoff_at  = '2026-09-02T19:00:00+09:00',
--   home_prob   = 33,
--   draw_prob   = 22,
--   away_prob   = 45,
--   pred_score  = '1-2',
--   pick        = '감바 오사카 승',
--   pick_sub    = 'Under 2.5',
--   confidence  = 72
-- WHERE slug = 'v-varen-nagasaki-vs-gamba-osaka-j1-league-preview-20260902';
