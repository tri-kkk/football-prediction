-- 단식 기록에 경기 날짜·라운드 저장용 컬럼 추가.
-- ⚠️ 이 SQL을 먼저 실행한 뒤 코드(bets route의 kickoff/round 스냅샷)를 배포하세요.
--    컬럼이 없는 상태로 배포하면 기록 추가가 실패합니다.
alter table user_bets add column if not exists kickoff timestamptz;
alter table user_bets add column if not exists round text;
