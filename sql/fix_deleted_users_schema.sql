-- ============================================
-- deleted_users 테이블 보안 강화 마이그레이션
-- 날짜: 2026-04-14
-- 목적: 탈퇴 후 재가입 시 프리미엄 혜택 재지급 방지
-- ============================================

-- 1. subscription_tier 컬럼 추가 (탈퇴 시점의 tier 기록)
ALTER TABLE deleted_users
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT NULL;

-- 2. last_premium_expiry 컬럼 추가 (마지막 프리미엄 만료일)
ALTER TABLE deleted_users
ADD COLUMN IF NOT EXISTS last_premium_expiry TIMESTAMPTZ DEFAULT NULL;

-- 3. total_payments 컬럼 추가 (총 결제 횟수)
ALTER TABLE deleted_users
ADD COLUMN IF NOT EXISTS total_payments INTEGER DEFAULT 0;

-- 4. last_payment_date 컬럼 추가 (마지막 결제일)
ALTER TABLE deleted_users
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ DEFAULT NULL;

-- 5. 재가입 쿨다운을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_deleted_users_deleted_at
ON deleted_users(deleted_at);

-- ============================================
-- 기존 deleted_users 데이터 보정 (1회성)
-- 프로모 코드가 있는 탈퇴 유저는 premium으로 기록
-- ============================================
UPDATE deleted_users
SET subscription_tier = 'premium'
WHERE promo_code IS NOT NULL
  AND subscription_tier IS NULL;

-- had_trial=true인 유저도 premium으로 기록
UPDATE deleted_users
SET subscription_tier = 'premium'
WHERE (had_trial = true OR trial_used = true)
  AND subscription_tier IS NULL;

-- ============================================
-- 확인 쿼리 (실행 후 결과 확인용)
-- ============================================
-- SELECT email_hash, promo_code, trial_used, had_trial, subscription_tier, total_payments
-- FROM deleted_users
-- ORDER BY deleted_at DESC;
