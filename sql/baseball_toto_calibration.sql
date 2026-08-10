-- ============================================================
-- 야구 승1패 캘리브레이션 (회차 정산 후 누적)
-- 예측 vs 실제를 회차×리그로 기록 → 1점차 자기보정 + 적중률 track-record
-- ============================================================
CREATE TABLE IF NOT EXISTS baseball_toto_calibration (
  id              BIGSERIAL PRIMARY KEY,
  round_id        BIGINT NOT NULL REFERENCES baseball_toto_rounds(id) ON DELETE CASCADE,
  year            INT,
  round_number    INT,
  league          TEXT NOT NULL,           -- KBO | MLB | NPB
  decided         INT DEFAULT 0,           -- 결과 확정(무 제외) 경기 수
  pred_one_avg    NUMERIC(5,1),            -- 예측 1점차 평균 (%)
  actual_one_rate NUMERIC(5,1),            -- 실제 1점차 비율 (%)
  primary_hits    INT DEFAULT 0,           -- primary_pick 적중 수
  graded          INT DEFAULT 0,           -- 적중 계산 대상 수 (무 제외)
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (round_id, league)
);

CREATE INDEX IF NOT EXISTS idx_bb_toto_calib_recent
  ON baseball_toto_calibration (league, year DESC, round_number DESC);
