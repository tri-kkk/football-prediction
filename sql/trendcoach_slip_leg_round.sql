-- 조합(슬립) 레그에 라운드 정보 저장용 컬럼 추가.
-- ⚠️ 이 SQL을 먼저 실행한 뒤 코드(slips route의 round 스냅샷)를 배포하세요.
--    컬럼이 없는 상태로 배포하면 조합 생성이 실패합니다.
alter table user_slip_legs add column if not exists round text;
