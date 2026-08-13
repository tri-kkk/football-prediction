-- trendcoach_006_slips.sql
-- 조합(팔레이) 슬립: 헤더(user_slips) + 레그(user_slip_legs)
-- 단식은 기존 user_bets 유지. 조합은 슬립으로 저장·정산.

create table if not exists user_slips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  stake integer not null,
  combined_odds numeric(12,4) not null,
  legs_count integer not null,
  status text not null default 'open',   -- open | won | lost | void
  payout integer,
  clv numeric(8,4),
  created_at timestamptz default now(),
  settled_at timestamptz
);
create index if not exists idx_user_slips_user on user_slips(user_id);
create index if not exists idx_user_slips_status on user_slips(status);

create table if not exists user_slip_legs (
  id uuid primary key default gen_random_uuid(),
  slip_id uuid not null references user_slips(id) on delete cascade,
  match_id text not null,
  pick text not null,                    -- HOME | DRAW | AWAY
  bet_odds numeric(8,3) not null,
  close_odds numeric(8,3),
  result text,                           -- HOME | AWAY | DRAW | VOID (정산 시)
  leg_status text,                       -- won | lost | void
  league text,
  home_team text,
  away_team text,
  kickoff timestamptz,
  signal_grade text
);
create index if not exists idx_slip_legs_slip on user_slip_legs(slip_id);
create index if not exists idx_slip_legs_match on user_slip_legs(match_id);

-- RLS: 앱은 service_role로 접근하지만, 직접 접근 대비 소유자 정책
alter table user_slips enable row level security;
alter table user_slip_legs enable row level security;

drop policy if exists user_slips_own on user_slips;
create policy user_slips_own on user_slips
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists user_slip_legs_own on user_slip_legs;
create policy user_slip_legs_own on user_slip_legs
  for all using (exists (select 1 from user_slips s where s.id = slip_id and s.user_id = auth.uid()));
