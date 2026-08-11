-- ============================================================
-- 프리미엄 텔레그램 데일리 리포트 — Phase 1 스키마
-- Supabase SQL Editor에서 1회 실행
-- ============================================================

-- 1) 유저 ↔ 텔레그램 chat_id 매핑
create table if not exists telegram_links (
  user_id         uuid primary key references users(id) on delete cascade,
  chat_id         bigint not null,
  active          boolean not null default true,   -- /stop 또는 해제 시 false
  last_sent_on    date,                             -- 데일리 중복 발송 방지 (Phase 2)
  linked_at       timestamptz not null default now(),
  unsubscribed_at timestamptz
);

-- 한 chat_id는 한 유저에게만
create unique index if not exists telegram_links_chat_id_idx
  on telegram_links(chat_id);

-- 발송 대상 조회용 (active + 미발송)
create index if not exists telegram_links_active_idx
  on telegram_links(active, last_sent_on);

-- 2) 일회성 연동 토큰 (딥링크 t.me/<bot>?start=<token>)
create table if not exists telegram_link_tokens (
  token      text primary key,
  user_id    uuid not null references users(id) on delete cascade,
  used       boolean not null default false,
  expires_at timestamptz not null,                 -- 발급 후 10분
  created_at timestamptz not null default now()
);

create index if not exists telegram_link_tokens_user_idx
  on telegram_link_tokens(user_id);

-- (선택) 만료 토큰 정리용 인덱스
create index if not exists telegram_link_tokens_expires_idx
  on telegram_link_tokens(expires_at);
