-- ============================================
-- P0 — DB 콘텐츠 정비 SQL
-- 목적: blog_posts 등 사용자 노출 텍스트에서
--       도박 연상 어휘를 데이터 분석 톤으로 일괄 치환
--
-- 실행 방법:
--   1. Supabase 대시보드 → SQL Editor
--   2. 본 파일 내용 붙여넣기
--   3. 한 블록씩 실행 (전체 한 번에도 OK, 다만 에러 시 추적이 어려움)
--   4. 실행 전 백업 권장:
--        CREATE TABLE blog_posts_backup_p0 AS SELECT * FROM blog_posts;
-- ============================================

-- ─────────────────────────────────────
-- 0. 안전 백업 (선택, 권장)
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS blog_posts_backup_p0 AS SELECT * FROM blog_posts;

-- ─────────────────────────────────────
-- 1. blog_posts.title_kr / title (한글 + 영문)
-- ─────────────────────────────────────
UPDATE blog_posts
SET title_kr = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                  title_kr,
                  '승부 예측', '경기 분석'),
                  '승부예측', '경기 분석'),
                  '승률 예측', '데이터 분석'),
                  '경기 예측', '경기 분석'),
                  'AI 예측', 'AI 분석'),
                  '프리미엄 픽', '프리미엄 리포트'),
                  '오늘의 픽', '오늘의 리포트'),
                  '조합 픽', '다경기 분석'),
                  '조합픽', '다경기 분석'),
                  '예측', '분석')
WHERE title_kr ~ '예측|픽|승부'
  AND title_kr NOT LIKE '%분석%' OR title_kr ~ '예측|픽|승부';

UPDATE blog_posts
SET title = REGEXP_REPLACE(
              REGEXP_REPLACE(
                REGEXP_REPLACE(
                  REGEXP_REPLACE(
                    REGEXP_REPLACE(
                      REGEXP_REPLACE(title,
                        'Match Prediction(s)?', 'Match Analysis', 'gi'),
                      'Football Prediction(s)?', 'Football Analysis', 'gi'),
                    'Soccer Prediction(s)?', 'Soccer Analysis', 'gi'),
                  'Combo Pick(s)?', 'Multi-Match Analysis', 'gi'),
                'Prediction(s)?', 'Analysis', 'g'),
              'Pick(s)?', 'Report', 'g')
WHERE title ~* 'prediction|pick|combo';

-- ─────────────────────────────────────
-- 2. blog_posts.excerpt / excerpt_en (요약)
-- ─────────────────────────────────────
UPDATE blog_posts
SET excerpt = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                excerpt,
                '승부 예측', '경기 분석'),
                '승부예측', '경기 분석'),
                '승률 예측', '데이터 분석'),
                '경기 예측', '경기 분석'),
                'AI 예측', 'AI 분석'),
                '프리미엄 픽', '프리미엄 리포트'),
                '오늘의 픽', '오늘의 리포트'),
                '조합 픽', '다경기 분석'),
                '조합픽', '다경기 분석'),
                '예측', '분석')
WHERE excerpt ~ '예측|픽|승부';

UPDATE blog_posts
SET excerpt_en = REGEXP_REPLACE(
                   REGEXP_REPLACE(
                     REGEXP_REPLACE(
                       REGEXP_REPLACE(excerpt_en,
                         'Match Prediction(s)?', 'Match Analysis', 'gi'),
                       'Football Prediction(s)?', 'Football Analysis', 'gi'),
                     'Combo Pick(s)?', 'Multi-Match Analysis', 'gi'),
                   'prediction(s)?', 'analysis', 'gi')
WHERE excerpt_en ~* 'prediction|pick|combo';

-- ─────────────────────────────────────
-- 3. blog_posts.content / content_en (본문)
-- ─────────────────────────────────────
UPDATE blog_posts
SET content = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                content,
                '책임감 있는 이용을 권장합니다', '본 분석은 통계 데이터에 기반한 참고 자료입니다'),
                '책임감 있는 이용', '통계 기반 참고 자료'),
                '승부 예측', '경기 분석'),
                '승부예측', '경기 분석'),
                '승률 예측', '데이터 분석'),
                '경기 예측', '경기 분석'),
                'AI 예측', 'AI 분석'),
                '프리미엄 픽', '프리미엄 리포트'),
                '오늘의 픽', '오늘의 리포트'),
                '조합 픽', '다경기 분석'),
                '조합픽', '다경기 분석'),
                '정합도', '분석 일치도'),
                '안정형', '전력 우위형'),
                '변동형', '접전형')
WHERE content ~ '예측|픽|승부|책임감|정합도|안정형|변동형';

-- 본문 내 단독 '예측' → '분석' (위에서 못 잡은 것)
UPDATE blog_posts
SET content = REPLACE(content, '예측', '분석')
WHERE content LIKE '%예측%';

-- 영문 본문
UPDATE blog_posts
SET content_en = REGEXP_REPLACE(
                   REGEXP_REPLACE(
                     REGEXP_REPLACE(
                       REGEXP_REPLACE(
                         REGEXP_REPLACE(content_en,
                           'Combo Pick(s)?', 'Multi-Match Analysis', 'gi'),
                         'Match Prediction(s)?', 'Match Analysis', 'gi'),
                       'Football Prediction(s)?', 'Football Analysis', 'gi'),
                     'Soccer Prediction(s)?', 'Soccer Analysis', 'gi'),
                   'prediction(s)?', 'analysis', 'gi')
WHERE content_en ~* 'prediction|pick|combo';

-- ─────────────────────────────────────
-- 4. blog_posts.tags (해시태그 배열) — 가장 중요
--    배열 안의 각 원소를 치환
-- ─────────────────────────────────────
UPDATE blog_posts
SET tags = ARRAY(
  SELECT
    CASE
      WHEN tag = '경기예측' THEN '경기분석'
      WHEN tag = '승부예측' THEN '경기분석'
      WHEN tag = '축구예측' THEN '축구분석'
      WHEN tag = '야구예측' THEN '야구분석'
      WHEN tag = 'PICK' THEN 'TOP'
      WHEN tag = 'GOOD' THEN 'WATCH'
      WHEN tag = 'MatchPrediction' THEN 'MatchAnalysis'
      WHEN tag = 'FootballPrediction' THEN 'FootballAnalysis'
      WHEN tag = 'SoccerPrediction' THEN 'SoccerAnalysis'
      WHEN tag = 'BaseballPrediction' THEN 'BaseballAnalysis'
      WHEN tag = 'Predictions' THEN 'Analysis'
      WHEN tag = 'ComboPicks' THEN 'MultiMatchAnalysis'
      WHEN tag = 'ComboPick' THEN 'MultiMatchAnalysis'
      WHEN tag = 'BettingTips' THEN 'DataAnalysis'
      WHEN tag = '베팅' THEN '데이터분석'
      ELSE tag
    END
  FROM unnest(tags) AS tag
)
WHERE tags && ARRAY[
  '경기예측','승부예측','축구예측','야구예측',
  'PICK','GOOD',
  'MatchPrediction','FootballPrediction','SoccerPrediction','BaseballPrediction','Predictions',
  'ComboPicks','ComboPick','BettingTips','베팅'
];

-- ─────────────────────────────────────
-- 5. notices.message / notices.title (공지) — 있을 경우
-- ─────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notices') THEN
    EXECUTE $sql$
      UPDATE notices
      SET title = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                    title,
                    '승부 예측', '경기 분석'),
                    '승부예측', '경기 분석'),
                    '경기 예측', '경기 분석'),
                    '프리미엄 픽', '프리미엄 리포트'),
                    '조합 픽', '다경기 분석'),
                    '예측', '분석')
      WHERE title ~ '예측|픽'
    $sql$;

    EXECUTE $sql$
      UPDATE notices
      SET message = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                      message,
                      '승부 예측', '경기 분석'),
                      '승부예측', '경기 분석'),
                      '경기 예측', '경기 분석'),
                      '프리미엄 픽', '프리미엄 리포트'),
                      '조합 픽', '다경기 분석'),
                      '예측', '분석')
      WHERE message ~ '예측|픽'
    $sql$;
  END IF;
END $$;

-- ─────────────────────────────────────
-- 6. 검증 쿼리 — 남은 어휘 확인
-- ─────────────────────────────────────
SELECT 'blog_posts.title_kr 잔류' AS check_name, COUNT(*) AS cnt
  FROM blog_posts WHERE title_kr ~ '예측|픽|조합픽|승부예측'
UNION ALL
SELECT 'blog_posts.excerpt 잔류', COUNT(*)
  FROM blog_posts WHERE excerpt ~ '예측|픽|조합픽|승부예측'
UNION ALL
SELECT 'blog_posts.content 잔류', COUNT(*)
  FROM blog_posts WHERE content ~ '예측|픽|책임감 있는 이용|정합도|안정형|변동형'
UNION ALL
SELECT 'blog_posts.tags 잔류', COUNT(*)
  FROM blog_posts WHERE tags && ARRAY['PICK','GOOD','경기예측','승부예측','MatchPrediction'];

-- ─────────────────────────────────────
-- 롤백 시 (필요 시)
--   DROP TABLE blog_posts;
--   ALTER TABLE blog_posts_backup_p0 RENAME TO blog_posts;
-- ─────────────────────────────────────
