-- 웹 푸시 구독 저장 테이블
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now()
);
create index if not exists idx_push_sub_user on push_subscriptions(user_id);
