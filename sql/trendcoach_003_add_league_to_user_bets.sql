-- TrendCoach: user_bets에 league 스냅샷 추가 (리포트 리그별 분해용)
-- 기록 시점의 리그 코드를 저장 → 배당행이 purge돼도 리그별 CLV 분해 가능.
alter table public.user_bets
  add column if not exists league text;

create index if not exists idx_user_bets_user_league
  on public.user_bets (user_id, league);
