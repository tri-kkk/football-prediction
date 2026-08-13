-- TrendCoach: user_bets (개인 토계부) 마이그레이션
-- 실행: Supabase SQL Editor 또는 supabase db push
-- 전제: users(id uuid) 존재, pgcrypto(gen_random_uuid) 사용 가능

create extension if not exists pgcrypto;

create table if not exists public.user_bets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  match_id      text not null,
  pick          text not null check (pick in ('HOME','DRAW','AWAY')),
  stake         numeric not null check (stake > 0),
  bet_odds      numeric not null check (bet_odds >= 1),

  -- 기록 시점 KSM 스냅샷 (서버가 자동 첨부)
  model_prob        numeric,      -- 선택 픽의 모델 확률 (0~1)
  model_market_gap  numeric,      -- 모델 - 시장 (percentage points)
  signal_grade      text check (signal_grade in ('S','A','B','C')),
  form_type         text,         -- '홈 우세형' 등
  pattern_code      text,         -- 'H1-D2-A3'

  -- 정산 (경기 종료 시 자동)
  status        text not null default 'open'
                check (status in ('open','won','lost','void')),
  payout        numeric,          -- 적중 시 stake*bet_odds, 아니면 0
  close_odds    numeric,          -- 선택 픽의 마감배당 스냅샷
  clv           numeric,          -- bet_odds/close_odds - 1

  created_at    timestamptz not null default now(),
  settled_at    timestamptz
);

create index if not exists idx_user_bets_user_status on public.user_bets(user_id, status);
create index if not exists idx_user_bets_match on public.user_bets(match_id);

-- RLS: 본인 기록만 접근
alter table public.user_bets enable row level security;

drop policy if exists "own_bets_select" on public.user_bets;
drop policy if exists "own_bets_insert" on public.user_bets;
drop policy if exists "own_bets_update" on public.user_bets;

create policy "own_bets_select" on public.user_bets
  for select using (auth.uid() = user_id);
create policy "own_bets_insert" on public.user_bets
  for insert with check (auth.uid() = user_id);
create policy "own_bets_update" on public.user_bets
  for update using (auth.uid() = user_id);

-- 정산 Cron은 service_role 키로 실행(RLS 우회) 권장.
