-- AI 결과 캐시 테이블
-- team-news, pitcher-analysis 등 비용 큰 외부/AI 호출 결과를 매치별로 저장
-- TTL 기반 만료, 언어별 분리

CREATE TABLE IF NOT EXISTS baseball_ai_cache (
  kind          TEXT        NOT NULL,                -- 'team_news' | 'pitcher_analysis'
  match_key     TEXT        NOT NULL,                -- api_match_id 또는 합성 키
  language      TEXT        NOT NULL DEFAULT 'ko',
  payload       JSONB       NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (kind, match_key, language)
);

CREATE INDEX IF NOT EXISTS idx_baseball_ai_cache_expires
  ON baseball_ai_cache (expires_at);

-- 만료된 캐시 청소 (선택: cron으로 매일 실행)
-- DELETE FROM baseball_ai_cache WHERE expires_at < NOW();

COMMENT ON TABLE baseball_ai_cache IS 'AI/외부 호출 결과 캐시 (team-news, pitcher-analysis 등)';
COMMENT ON COLUMN baseball_ai_cache.kind IS 'team_news | pitcher_analysis';
COMMENT ON COLUMN baseball_ai_cache.match_key IS 'api_match_id 또는 합성 키';
COMMENT ON COLUMN baseball_ai_cache.language IS 'ko | en | ja';
