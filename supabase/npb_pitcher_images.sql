-- ============================================================
-- NPB 선발 투수 초상 이미지 (Yahoo Japan)
-- Supabase SQL Editor 1회 실행
-- ============================================================

alter table baseball_matches add column if not exists home_pitcher_image text;
alter table baseball_matches add column if not exists away_pitcher_image text;
