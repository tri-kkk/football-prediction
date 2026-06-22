-- 배포 전 잘못 저장된 미발매(투표 0) 회차 정리
-- 투표가 0인 회차 = 아직 발매 전 미래 회차 → 삭제 (matches는 CASCADE 삭제)
DELETE FROM baseball_toto_rounds WHERE total_votes = 0;

-- 확인
-- SELECT year, round_number, total_matches, total_votes, status FROM baseball_toto_rounds ORDER BY year DESC, round_number DESC;
