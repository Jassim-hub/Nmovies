-- Migration: Add Views, View Logs, and Watchlists

-- 1. Add views to movies and series
ALTER TABLE movies ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;
ALTER TABLE series ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;

-- 2. Create view_logs table
CREATE TABLE IF NOT EXISTS view_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Allow anonymous views or track user
    movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,
    series_id UUID REFERENCES series(id) ON DELETE CASCADE,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    CHECK (
        (movie_id IS NOT NULL AND series_id IS NULL) OR
        (movie_id IS NULL AND series_id IS NOT NULL)
    )
);

-- Indexes for efficient querying of view_logs
CREATE INDEX IF NOT EXISTS idx_view_logs_movie_id ON view_logs(movie_id);
CREATE INDEX IF NOT EXISTS idx_view_logs_series_id ON view_logs(series_id);
CREATE INDEX IF NOT EXISTS idx_view_logs_created_at ON view_logs(created_at DESC);

-- Enable RLS for view_logs
ALTER TABLE view_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert view logs" ON view_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role full access to view logs" ON view_logs FOR ALL USING (true) WITH CHECK (true);


-- 3. Create watchlists table
CREATE TABLE IF NOT EXISTS watchlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,
    series_id UUID REFERENCES series(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    CHECK (
        (movie_id IS NOT NULL AND series_id IS NULL) OR
        (movie_id IS NULL AND series_id IS NOT NULL)
    ),
    UNIQUE (user_id, movie_id), -- Prevent duplicate movie in watchlist
    UNIQUE (user_id, series_id) -- Prevent duplicate series in watchlist
);

-- Indexes for watchlists
CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_movie_id ON watchlists(movie_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_series_id ON watchlists(series_id);

-- Enable RLS for watchlists
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own watchlists" ON watchlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own watchlists" ON watchlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own watchlists" ON watchlists FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access to watchlists" ON watchlists FOR ALL USING (true) WITH CHECK (true);

-- 4. RPCs for Daily Top Watched
CREATE OR REPLACE FUNCTION get_daily_top_movies(target_date DATE DEFAULT CURRENT_DATE, max_limit INTEGER DEFAULT 10)
RETURNS TABLE (movie_id UUID, title TEXT, daily_views BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT v.movie_id, m.title, COUNT(*) as daily_views
  FROM view_logs v
  JOIN movies m ON m.id = v.movie_id
  WHERE DATE(v.created_at) = target_date AND v.movie_id IS NOT NULL
  GROUP BY v.movie_id, m.title
  ORDER BY daily_views DESC
  LIMIT max_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_daily_top_series(target_date DATE DEFAULT CURRENT_DATE, max_limit INTEGER DEFAULT 10)
RETURNS TABLE (series_id UUID, title TEXT, daily_views BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT v.series_id, s.title, COUNT(*) as daily_views
  FROM view_logs v
  JOIN series s ON s.id = v.series_id
  WHERE DATE(v.created_at) = target_date AND v.series_id IS NOT NULL
  GROUP BY v.series_id, s.title
  ORDER BY daily_views DESC
  LIMIT max_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


