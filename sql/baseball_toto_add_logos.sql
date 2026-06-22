-- 야구토토 매치에 팀 로고 컬럼 추가 (baseball_matches.home_team_logo 재사용)
ALTER TABLE baseball_toto_matches ADD COLUMN IF NOT EXISTS home_logo TEXT;
ALTER TABLE baseball_toto_matches ADD COLUMN IF NOT EXISTS away_logo TEXT;
