-- TrendCoach: user_bets에 팀명 스냅샷 추가 (기록 화면 가독성)
alter table public.user_bets
  add column if not exists home_team text,
  add column if not exists away_team text;
