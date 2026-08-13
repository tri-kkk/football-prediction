-- TrendCoach: subscriptions에 product 구분자 추가
-- 기존 checkPremium은 '활성 구독=프리미엄'(TrendSoccer). 코치는 별도 상품이므로 product로 구분.
-- 실행: Supabase SQL Editor

alter table public.subscriptions
  add column if not exists product text not null default 'trendsoccer';
  -- 값: 'trendsoccer' (기존 TrendSoccer 프리미엄) | 'coach' (TrendCoach 멤버쉽)

create index if not exists idx_subscriptions_user_product
  on public.subscriptions (user_id, product, status);

-- 참고: 기존 행은 자동으로 product='trendsoccer'. 코치 결제 시 product='coach'로 insert.
-- 번들가 할인은 결제 로직에서 처리(기존 trendsoccer active면 coach를 할인가로).
