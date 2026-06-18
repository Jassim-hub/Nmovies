-- =====================================================
-- FIX WATCHLISTS TABLE - Change UUID to TEXT/VARCHAR
-- =====================================================
-- This fixes the type mismatch where movie_id/series_id should be TEXT
-- (matching the actual ID format in movies and series tables)
-- instead of UUID
-- =====================================================

-- Step 1: Drop foreign key constraints (they reference UUID types)
ALTER TABLE watchlists DROP CONSTRAINT IF EXISTS watchlists_series_id_fkey;
ALTER TABLE watchlists DROP CONSTRAINT IF EXISTS watchlists_movie_id_fkey;

-- Step 2: Drop unique constraints (will recreate them)
ALTER TABLE watchlists DROP CONSTRAINT IF EXISTS watchlists_user_id_series_id_key;
ALTER TABLE watchlists DROP CONSTRAINT IF EXISTS watchlists_user_id_movie_id_key;

-- Step 3: Change column types from UUID to TEXT
ALTER TABLE watchlists ALTER COLUMN movie_id TYPE TEXT;
ALTER TABLE watchlists ALTER COLUMN series_id TYPE TEXT;

-- Step 4: Recreate unique constraints
ALTER TABLE watchlists ADD CONSTRAINT watchlists_user_id_movie_id_key 
  UNIQUE (user_id, movie_id);
  
ALTER TABLE watchlists ADD CONSTRAINT watchlists_user_id_series_id_key 
  UNIQUE (user_id, series_id);

-- Step 5: Recreate foreign keys (only if your movies/series tables use compatible types)
-- Comment out these lines if your movies/series IDs are TEXT and can't have FK constraints
-- ALTER TABLE watchlists ADD CONSTRAINT watchlists_movie_id_fkey 
--   FOREIGN KEY (movie_id) REFERENCES movies (id) ON DELETE CASCADE;
  
-- ALTER TABLE watchlists ADD CONSTRAINT watchlists_series_id_fkey 
--   FOREIGN KEY (series_id) REFERENCES series (id) ON DELETE CASCADE;

-- Note: Foreign keys may not work if movies/series tables use TEXT IDs
-- In that case, you'll need to handle orphaned records in application code

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Check the new structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'watchlists'
ORDER BY ordinal_position;

-- Test insert with TEXT IDs (should work now)
-- INSERT INTO watchlists (user_id, movie_id) 
-- VALUES (auth.uid(), '4008')
-- ON CONFLICT DO NOTHING;
