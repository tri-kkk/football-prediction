-- baseball_news 테이블 생성
CREATE TABLE IF NOT EXISTS baseball_news (
  id BIGSERIAL PRIMARY KEY,
  article_id TEXT NOT NULL UNIQUE,
  league TEXT NOT NULL,           -- MLB, KBO, NPB, CPBL
  language TEXT NOT NULL DEFAULT 'ko',  -- ko, en
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  url TEXT NOT NULL,
  source TEXT DEFAULT '',
  published_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_baseball_news_league_lang ON baseball_news (league, language);
CREATE INDEX IF NOT EXISTS idx_baseball_news_published ON baseball_news (published_at DESC);

-- RLS 비활성화 (service key로만 접근)
ALTER TABLE baseball_news ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Supabase Cron Job 등록 (12시간마다)
-- Supabase Dashboard > SQL Editor에서 실행
-- ============================================

-- 기존 뉴스 수집 cron이 있다면 삭제
SELECT cron.unschedule('baseball-collect-news') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'baseball-collect-news'
);

-- 12시간마다 뉴스 수집 (KST 07:00, 19:00 = UTC 22:00, 10:00)
SELECT cron.schedule(
  'baseball-collect-news',
  '0 22,10 * * *',
  $$
  SELECT net.http_get(
    url := 'https://www.trendsoccer.com/api/baseball/cron/collect-news',
    timeout_milliseconds := 30000
  );
  $$
);
