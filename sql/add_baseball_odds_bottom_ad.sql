-- =====================================================
-- 야구 배당률 하단 광고 슬롯 신규 등록
-- 슬롯 ID: baseball_odds_bottom
-- 사이즈: 320×50 (모바일 인피드)
-- 위치: 야구 디테일 페이지 배당률 섹션 바로 아래
-- 생성일: 2026-05-27
-- =====================================================

-- 📌 옵션 1: 스폴라이브 직광고 배너 신규 등록
-- (이미지/링크 URL은 기존 ts002와 동일하게 재활용 가능)
INSERT INTO advertisements (
  name,
  slot_type,
  image_url,
  link_url,
  alt_text,
  width,
  height,
  priority,
  is_active,
  start_date,
  end_date,
  click_count,
  impression_count,
  created_at
)
VALUES (
  'ts004 / 야구배당률_하단_320x50',
  'baseball_odds_bottom',
  '/ads/ad-banner-320x50.png',                                 -- 기존 320x50 배너 재활용
  'https://www.spolive.com/?ref=trendsoccer',                  -- 스폴라이브 제휴 링크
  'TrendSoccer 제휴 기념 - 스폴라이브 신규가입 시 1만원 상당 혜택 지급',
  320,
  50,
  10,                                                          -- 우선순위
  true,                                                        -- 즉시 활성화
  NULL,                                                        -- 시작일 (NULL = 즉시)
  NULL,                                                        -- 종료일 (NULL = 무기한)
  0,
  0,
  NOW()
);


-- =====================================================
-- 📌 옵션 2: 기존 ts002 광고를 baseball_odds_bottom 슬롯으로 복제
-- (이미 검증된 자산을 그대로 새 슬롯에 한벌 더 노출)
-- =====================================================
-- INSERT INTO advertisements (
--   name, slot_type, image_url, link_url, alt_text, width, height,
--   priority, is_active, start_date, end_date, click_count, impression_count, created_at
-- )
-- SELECT
--   name || ' (야구배당률)',
--   'baseball_odds_bottom',
--   image_url, link_url, alt_text, width, height,
--   priority, true, start_date, end_date, 0, 0, NOW()
-- FROM advertisements
-- WHERE name LIKE 'ts002%'
-- LIMIT 1;


-- =====================================================
-- 등록 확인 쿼리
-- =====================================================
SELECT
  id,
  name,
  slot_type,
  width || 'x' || height AS size,
  is_active,
  priority,
  created_at
FROM advertisements
WHERE slot_type = 'baseball_odds_bottom'
ORDER BY priority DESC, created_at DESC;
