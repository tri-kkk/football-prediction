-- =====================================================
-- match_odds_latest.finished_at 추가 + 자동 기록 트리거
-- -----------------------------------------------------
-- 목적: /live 페이지가 "최근 종료(30분 내) 경기"만 보여주도록,
--       경기가 실제로 종료된 시각을 정확히 기록한다.
--
-- 배경: 기존엔 updated_at(마지막 DB 쓰기 시각)을 종료 시각 대용으로 썼는데,
--       배당 수집 크론이 종료 후에도 행을 계속 갱신해 updated_at이 새로 찍혀
--       과거 종료 경기가 라이브 목록에 무한 누적되는 버그가 있었다.
--
-- 동작: status가 FT/AET/PEN(종료)으로 바뀌는 첫 시점에만 finished_at = now() 기록.
--       이후 배당 동기화 등으로 행이 갱신돼도 finished_at은 유지된다.
--       (status가 종료가 아니게 되면 finished_at은 NULL로 초기화 — 보정 케이스 대응)
-- =====================================================

-- 1) 컬럼 추가 (이미 있으면 무시)
ALTER TABLE match_odds_latest
  ADD COLUMN IF NOT EXISTS finished_at timestamptz;

-- 2) 트리거 함수
CREATE OR REPLACE FUNCTION set_match_finished_at()
RETURNS trigger AS $$
BEGIN
  IF NEW.status IN ('FT', 'AET', 'PEN') THEN
    -- 종료 상태로의 첫 전환에서만 기록 (NEW.finished_at은 UPDATE 시 OLD값을 유지)
    IF NEW.finished_at IS NULL THEN
      NEW.finished_at := now();
    END IF;
  ELSE
    -- 종료가 아니면 초기화 (혹시 모를 상태 되돌림 보정)
    NEW.finished_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3) 트리거 연결 (재실행 안전하게 DROP 후 생성)
DROP TRIGGER IF EXISTS trg_set_match_finished_at ON match_odds_latest;
CREATE TRIGGER trg_set_match_finished_at
  BEFORE INSERT OR UPDATE ON match_odds_latest
  FOR EACH ROW
  EXECUTE FUNCTION set_match_finished_at();

-- 4) (선택) 조회 성능용 인덱스
CREATE INDEX IF NOT EXISTS idx_match_odds_latest_finished_at
  ON match_odds_latest (finished_at)
  WHERE finished_at IS NOT NULL;

-- 참고: 기존에 이미 FT 상태인 과거 행들은 finished_at이 NULL로 남는다.
--       (실제 종료 시각을 알 수 없으므로 백필하지 않음 → 라이브 목록에 안 뜨는 게 정상)
