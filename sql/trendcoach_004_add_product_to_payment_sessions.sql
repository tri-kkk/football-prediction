-- TrendCoach: payment_sessions에 상품 구분/개월 추가 (코치 결제 콜백이 사용)
-- 기존 TrendSoccer 세션은 product NULL로 남음(콜백이 기존 로직 그대로 처리).
alter table public.payment_sessions
  add column if not exists product text,        -- 'coach' 이면 코치 콜백에서 처리
  add column if not exists plan_months integer; -- 구독 개월(코치)
