-- 푸시 발송 내역 테이블 (어드민 /admin/ads '푸시발송' 탭 → '발송 내역' 섹션)
-- 즉시 발송(send-topic) + 예약 발송(send-scheduled-push)이 발송 시마다 best-effort로 1행 기록.
-- Supabase SQL Editor에서 1회 실행.

create table if not exists push_send_history (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  source        text        not null default 'now',   -- 'now'(즉시) | 'scheduled'(예약)
  topic         text        not null,                 -- base topic: app_general | match_events | promo
  ko_title      text,
  ko_body       text,
  en_title      text,
  en_body       text,
  deeplink      text,
  ok            boolean     not null default false,    -- 전체 성공 여부(ko·en 모두 ok)
  results       jsonb,                                 -- [{locale,topic,ok,messageId,error}]
  scheduled_id  bigint,                                -- 예약 발송이면 scheduled_pushes.id
  error         text
);

create index if not exists idx_push_send_history_created_at
  on push_send_history (created_at desc);

-- 서버는 service_role 키로 기록/조회하므로 RLS는 꺼둔 상태로 충분(공개 노출 없음).
-- 필요 시 RLS 활성화 후 service_role만 허용하는 정책을 추가할 것.
