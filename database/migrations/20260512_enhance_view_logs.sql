-- Migration: Enhance view_logs table with comprehensive tracking

-- Drop existing view_logs table if you want to recreate with new structure
-- WARNING: This will delete existing view log data
-- DROP TABLE IF EXISTS view_logs CASCADE;

-- Create enhanced view_logs table with more detailed tracking
CREATE TABLE IF NOT EXISTS view_logs_enhanced (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User and Content tracking
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,
    series_id UUID REFERENCES series(id) ON DELETE CASCADE,
    episode_id UUID REFERENCES episodes(id) ON DELETE CASCADE,
    
    -- Session tracking
    session_id TEXT, -- Browser session identifier
    ip_address TEXT,
    user_agent TEXT, -- Browser/device information
    
    -- Geographic tracking
    country TEXT,
    city TEXT,
    
    -- Viewing behavior
    watch_duration INTEGER DEFAULT 0, -- Seconds watched
    completion_percentage DECIMAL(5,2) DEFAULT 0, -- Percentage of content watched
    is_completed BOOLEAN DEFAULT false, -- Did user finish watching?
    
    -- Device and platform
    device_type TEXT, -- mobile, tablet, desktop, tv
    platform TEXT, -- web, ios, android
    
    -- Referrer tracking
    referrer_url TEXT, -- Where did the user come from?
    
    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CHECK (
        (movie_id IS NOT NULL AND series_id IS NULL AND episode_id IS NULL) OR
        (movie_id IS NULL AND series_id IS NOT NULL) OR
        (movie_id IS NULL AND episode_id IS NOT NULL)
    )
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_view_logs_enhanced_user_id ON view_logs_enhanced(user_id);
CREATE INDEX IF NOT EXISTS idx_view_logs_enhanced_movie_id ON view_logs_enhanced(movie_id);
CREATE INDEX IF NOT EXISTS idx_view_logs_enhanced_series_id ON view_logs_enhanced(series_id);
CREATE INDEX IF NOT EXISTS idx_view_logs_enhanced_episode_id ON view_logs_enhanced(episode_id);
CREATE INDEX IF NOT EXISTS idx_view_logs_enhanced_session_id ON view_logs_enhanced(session_id);
CREATE INDEX IF NOT EXISTS idx_view_logs_enhanced_started_at ON view_logs_enhanced(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_view_logs_enhanced_device_type ON view_logs_enhanced(device_type);
CREATE INDEX IF NOT EXISTS idx_view_logs_enhanced_country ON view_logs_enhanced(country);
CREATE INDEX IF NOT EXISTS idx_view_logs_enhanced_is_completed ON view_logs_enhanced(is_completed);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_view_logs_enhanced_user_content ON view_logs_enhanced(user_id, movie_id, series_id);
CREATE INDEX IF NOT EXISTS idx_view_logs_enhanced_started_movie ON view_logs_enhanced(started_at, movie_id);
CREATE INDEX IF NOT EXISTS idx_view_logs_enhanced_started_series ON view_logs_enhanced(started_at, series_id);

-- Enable RLS
ALTER TABLE view_logs_enhanced ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can insert view logs" 
    ON view_logs_enhanced FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Users can view own logs" 
    ON view_logs_enhanced FOR SELECT 
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Service role full access to view logs" 
    ON view_logs_enhanced FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- Auto-update trigger for last_updated_at
CREATE OR REPLACE FUNCTION update_view_log_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_view_logs_enhanced_timestamp
    BEFORE UPDATE ON view_logs_enhanced
    FOR EACH ROW
    EXECUTE FUNCTION update_view_log_timestamp();

-- Enhanced analytics functions

-- Get top viewed content by date range
CREATE OR REPLACE FUNCTION get_top_content_by_date_range(
    start_date DATE,
    end_date DATE,
    filter_content_type TEXT DEFAULT 'all', -- 'movie', 'series', or 'all'
    max_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    content_id UUID,
    content_type TEXT,
    title TEXT,
    total_views BIGINT,
    unique_viewers BIGINT,
    total_watch_time INTEGER,
    avg_completion_percentage DECIMAL
) AS $$
BEGIN
  IF filter_content_type = 'movie' OR filter_content_type = 'all' THEN
    RETURN QUERY
    SELECT 
        v.movie_id as content_id,
        'movie'::TEXT as content_type,
        m.title,
        COUNT(*) as total_views,
        COUNT(DISTINCT v.user_id) as unique_viewers,
        SUM(v.watch_duration)::INTEGER as total_watch_time,
        AVG(v.completion_percentage) as avg_completion_percentage
    FROM view_logs_enhanced v
    JOIN movies m ON m.id = v.movie_id
    WHERE DATE(v.started_at) BETWEEN start_date AND end_date 
        AND v.movie_id IS NOT NULL
    GROUP BY v.movie_id, m.title
    ORDER BY total_views DESC
    LIMIT max_limit;
  END IF;
  
  IF filter_content_type = 'series' OR filter_content_type = 'all' THEN
    RETURN QUERY
    SELECT 
        v.series_id as content_id,
        'series'::TEXT as content_type,
        s.title,
        COUNT(*) as total_views,
        COUNT(DISTINCT v.user_id) as unique_viewers,
        SUM(v.watch_duration)::INTEGER as total_watch_time,
        AVG(v.completion_percentage) as avg_completion_percentage
    FROM view_logs_enhanced v
    JOIN series s ON s.id = v.series_id
    WHERE DATE(v.started_at) BETWEEN start_date AND end_date 
        AND v.series_id IS NOT NULL
    GROUP BY v.series_id, s.title
    ORDER BY total_views DESC
    LIMIT max_limit;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get viewing statistics by device type
CREATE OR REPLACE FUNCTION get_device_statistics(
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    device_type TEXT,
    total_views BIGINT,
    unique_users BIGINT,
    avg_watch_duration DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
      v.device_type,
      COUNT(*) as total_views,
      COUNT(DISTINCT v.user_id) as unique_users,
      AVG(v.watch_duration) as avg_watch_duration
  FROM view_logs_enhanced v
  WHERE DATE(v.started_at) BETWEEN start_date AND end_date
  GROUP BY v.device_type
  ORDER BY total_views DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get geographic viewing statistics
CREATE OR REPLACE FUNCTION get_geographic_statistics(
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    end_date DATE DEFAULT CURRENT_DATE,
    max_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    country TEXT,
    total_views BIGINT,
    unique_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
      v.country,
      COUNT(*) as total_views,
      COUNT(DISTINCT v.user_id) as unique_users
  FROM view_logs_enhanced v
  WHERE DATE(v.started_at) BETWEEN start_date AND end_date
      AND v.country IS NOT NULL
  GROUP BY v.country
  ORDER BY total_views DESC
  LIMIT max_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user engagement metrics
CREATE OR REPLACE FUNCTION get_user_engagement_metrics(
    target_user_id UUID
)
RETURNS TABLE (
    total_views BIGINT,
    total_watch_time INTEGER,
    avg_completion_percentage DECIMAL,
    movies_watched BIGINT,
    series_watched BIGINT,
    completed_content BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
      COUNT(*) as total_views,
      SUM(v.watch_duration)::INTEGER as total_watch_time,
      AVG(v.completion_percentage) as avg_completion_percentage,
      COUNT(DISTINCT v.movie_id) as movies_watched,
      COUNT(DISTINCT v.series_id) as series_watched,
      COUNT(*) FILTER (WHERE v.is_completed = true) as completed_content
  FROM view_logs_enhanced v
  WHERE v.user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE view_logs_enhanced IS 'Enhanced view tracking with detailed analytics for movies, series, and episodes';
COMMENT ON COLUMN view_logs_enhanced.session_id IS 'Browser session identifier for tracking viewing sessions';
COMMENT ON COLUMN view_logs_enhanced.watch_duration IS 'Total seconds watched in this viewing session';
COMMENT ON COLUMN view_logs_enhanced.completion_percentage IS 'Percentage of content watched (0-100)';
COMMENT ON COLUMN view_logs_enhanced.device_type IS 'Device type: mobile, tablet, desktop, tv';
COMMENT ON COLUMN view_logs_enhanced.platform IS 'Platform: web, ios, android';
