-- 동점 버그가 적중률을 실제로 얼마나 움직이는가
--
-- 무승부는 모델이 애초에 예측하지 않는 결과다.
-- 축구에서 무승부를 분모에서 빼는 것과 같은 기준으로,
-- 야구 동점 경기도 분모에서 빼고 다시 계산한다.

WITH flat AS (
  SELECT
    c.league,
    (p->>'homeScore')::int AS hs,
    (p->>'awayScore')::int AS as_,
    p->>'pick'             AS pick,
    (p->>'isCorrect')::boolean AS was_correct
  FROM baseball_combo_picks c,
       LATERAL jsonb_array_elements(c.picks) AS p
  WHERE c.result <> 'pending'
    AND p->>'homeScore' IS NOT NULL
    AND p->>'awayScore' IS NOT NULL
),
calc AS (
  SELECT
    league,
    COUNT(*)                                   AS 전체,
    COUNT(*) FILTER (WHERE hs = as_)           AS 동점,
    COUNT(*) FILTER (WHERE hs <> as_)          AS 승부갈림,
    -- 지금 DB 에 기록된 적중 수 (버그 포함)
    COUNT(*) FILTER (WHERE was_correct)        AS 적중_현재,
    -- 동점을 뺀 뒤, 실제 스코어로 다시 판정한 적중 수
    COUNT(*) FILTER (
      WHERE hs <> as_
        AND ((pick = 'home' AND hs > as_) OR (pick = 'away' AND as_ > hs))
    )                                          AS 적중_수정후
  FROM flat
  GROUP BY league
)
SELECT
  league,
  전체,
  동점,
  승부갈림,
  적중_현재,
  ROUND(100.0 * 적중_현재 / NULLIF(전체, 0), 1)        AS "적중률_현재(%)",
  적중_수정후,
  ROUND(100.0 * 적중_수정후 / NULLIF(승부갈림, 0), 1)  AS "적중률_수정후(%)",
  ROUND(
    100.0 * 적중_수정후 / NULLIF(승부갈림, 0)
    - 100.0 * 적중_현재 / NULLIF(전체, 0)
  , 1)                                                 AS "변화(%p)"
FROM calc
ORDER BY league;


-- ────────────────────────────────────────────────────────
-- 참고: MLB 동점 = 100% 데이터 오류
--   MLB 는 무승부로 끝나지 않는다. 아래에 나오는 경기는 전부
--   연장 스코어가 반영되지 않은 것이므로, update-results 수정본 배포 후
--   자동 복구되는지 확인용으로 쓰면 된다.
-- ────────────────────────────────────────────────────────
SELECT
  m.match_date, m.home_team, m.home_score, m.away_score, m.away_team,
  m.status,
  m.inning -> 'home' ? 'extra' AS 연장기록,
  m.updated_at
FROM baseball_matches m
WHERE m.league = 'MLB'
  AND m.status = 'FT'
  AND m.home_score IS NOT NULL
  AND m.home_score = m.away_score
ORDER BY m.match_date DESC;
