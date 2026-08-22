-- 동점 버그로 오염된 과거 기록 확인 · 복구
--
-- 배경:
--   update-combo-results 가 승부 판정을 이렇게 하고 있었다.
--       pickCorrect = (pick='home' AND homeWon) OR (pick='away' AND NOT homeWon)
--   NOT homeWon 은 "홈이 안 이겼다" 라서 **동점도 포함**한다.
--   → 동점으로 끝난(또는 연장 중 정규이닝 스코어로 얼어붙은) 경기에서
--     원정 픽이 전부 '적중' 으로 기록됐고, 누적 적중률이 그만큼 부풀려졌다.
--
-- Supabase SQL Editor 에 붙여 넣고 1번부터 순서대로 실행하세요.

-- ────────────────────────────────────────────────────────
-- 1) 얼마나 오염됐나 — 리그별 집계
--    먼저 이것만 돌려 보고 규모를 확인하세요.
-- ────────────────────────────────────────────────────────
SELECT
  c.league,
  COUNT(*) FILTER (WHERE (p->>'homeScore')::int = (p->>'awayScore')::int)              AS 동점경기,
  COUNT(*) FILTER (WHERE (p->>'homeScore')::int = (p->>'awayScore')::int
                     AND (p->>'isCorrect')::boolean IS TRUE)                           AS 잘못_적중처리,
  COUNT(*)                                                                             AS 전체_정산건
FROM baseball_combo_picks c,
     LATERAL jsonb_array_elements(c.picks) AS p
WHERE c.result <> 'pending'
  AND p ? 'homeScore'
  AND p->>'homeScore' IS NOT NULL
  AND p->>'awayScore' IS NOT NULL
GROUP BY c.league
ORDER BY c.league;


-- ────────────────────────────────────────────────────────
-- 2) 실제로 어떤 경기였나 — 눈으로 확인
-- ────────────────────────────────────────────────────────
SELECT
  c.pick_date,
  c.league,
  p->>'homeTeamKo'  AS 홈,
  p->>'homeScore'   AS 홈점수,
  p->>'awayScore'   AS 원정점수,
  p->>'awayTeamKo'  AS 원정,
  p->>'pick'        AS 픽,
  p->>'pickTeamKo'  AS 픽팀,
  p->>'isCorrect'   AS 적중기록
FROM baseball_combo_picks c,
     LATERAL jsonb_array_elements(c.picks) AS p
WHERE c.result <> 'pending'
  AND (p->>'homeScore')::int = (p->>'awayScore')::int
ORDER BY c.pick_date DESC
LIMIT 50;


-- ────────────────────────────────────────────────────────
-- 3) 연장인데 정규이닝 스코어로 얼어붙은 경기 찾기
--    inning 데이터에 'extra' 가 있는데 총점이 동점이면 이상하다.
--    (진짜 무승부라면 연장을 다 치르고도 동점이라 정상일 수 있으니
--     아래 목록은 '확인 대상' 이지 전부 오류는 아니다)
-- ────────────────────────────────────────────────────────
SELECT
  m.match_date,
  m.league,
  m.home_team, m.home_score,
  m.away_score, m.away_team,
  m.status,
  m.inning -> 'home' ? 'extra' AS 홈_연장기록있음,
  m.inning -> 'away' ? 'extra' AS 원정_연장기록있음,
  m.updated_at
FROM baseball_matches m
WHERE m.status = 'FT'
  AND m.home_score IS NOT NULL
  AND m.home_score = m.away_score
  AND m.match_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY m.match_date DESC;


-- ────────────────────────────────────────────────────────
-- 4) 복구 — 동점 경기의 isCorrect 를 false 로 되돌린다
--
--    ⚠ 1~3번을 먼저 확인한 뒤에 실행하세요. 되돌릴 수 없습니다.
--    ⚠ 스코어 자체가 틀린 경기(연장 결과 누락)는 이걸로 안 고쳐집니다.
--       update-results 수정본이 배포되면 동점 FT 를 다시 조회해
--       스코어를 스스로 복구하고, 그 다음 이 쿼리를 한 번 더 돌리면 됩니다.
-- ────────────────────────────────────────────────────────
-- UPDATE baseball_combo_picks c
-- SET picks = (
--   SELECT jsonb_agg(
--     CASE
--       WHEN (p->>'homeScore') IS NOT NULL
--        AND (p->>'homeScore')::int = (p->>'awayScore')::int
--       THEN p || '{"isCorrect": false, "isTie": true}'::jsonb
--       ELSE p
--     END
--   )
--   FROM jsonb_array_elements(c.picks) AS p
-- ),
-- updated_at = NOW()
-- WHERE c.result <> 'pending'
--   AND EXISTS (
--     SELECT 1 FROM jsonb_array_elements(c.picks) AS p
--     WHERE (p->>'homeScore') IS NOT NULL
--       AND (p->>'homeScore')::int = (p->>'awayScore')::int
--       AND (p->>'isCorrect')::boolean IS TRUE
--   );


-- ────────────────────────────────────────────────────────
-- 5) 복구 후 correct_count 재계산
--    (4번을 실행했다면 이것도 같이 돌려야 조합 결과가 맞습니다)
-- ────────────────────────────────────────────────────────
-- UPDATE baseball_combo_picks c
-- SET correct_count = (
--       SELECT COUNT(*) FROM jsonb_array_elements(c.picks) AS p
--       WHERE (p->>'isCorrect')::boolean IS TRUE
--     ),
--     result = CASE
--       WHEN (SELECT COUNT(*) FROM jsonb_array_elements(c.picks) AS p
--             WHERE (p->>'isCorrect')::boolean IS TRUE) = jsonb_array_length(c.picks) THEN 'win'
--       WHEN (SELECT COUNT(*) FROM jsonb_array_elements(c.picks) AS p
--             WHERE (p->>'isCorrect')::boolean IS TRUE) = 0 THEN 'lose'
--       ELSE 'partial'
--     END
-- WHERE c.result <> 'pending';
