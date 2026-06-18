-- =====================================================
-- WATCHLISTS TABLE RLS POLICIES
-- =====================================================
-- This file contains Row Level Security policies for the watchlists table
-- Run this after creating the watchlists table to ensure proper access control
-- =====================================================

-- Enable Row Level Security
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running this script)
DROP POLICY IF EXISTS "Users can view own watchlist" ON watchlists;
DROP POLICY IF EXISTS "Users can insert own watchlist" ON watchlists;
DROP POLICY IF EXISTS "Users can delete own watchlist" ON watchlists;

-- =====================================================
-- SELECT POLICY - Users can view their own watchlist
-- =====================================================
CREATE POLICY "Users can view own watchlist"
ON watchlists
FOR SELECT
USING (auth.uid() = user_id);

-- =====================================================
-- INSERT POLICY - Users can add to their own watchlist
-- =====================================================
CREATE POLICY "Users can insert own watchlist"
ON watchlists
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- DELETE POLICY - Users can remove from their own watchlist
-- =====================================================
CREATE POLICY "Users can delete own watchlist"
ON watchlists
FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
-- Ensure authenticated users can access the table
GRANT SELECT, INSERT, DELETE ON watchlists TO authenticated;

-- Optional: Allow public read access to watchlist counts (for stats)
-- Uncomment if you want to show "X users watchlisted this" features
-- GRANT SELECT ON watchlists TO anon;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify policies are working:

-- 1. Check RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'watchlists';

-- 2. List all policies
-- SELECT * FROM pg_policies WHERE tablename = 'watchlists';

-- 3. Test as a user (replace 'user-uuid' with actual user ID)
-- SET request.jwt.claims.sub TO 'user-uuid';
-- SELECT * FROM watchlists; -- Should only show that user's watchlist
