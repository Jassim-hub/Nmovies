# Watchlist Database Migration Guide

## Overview
The watchlist feature now uses the proper `watchlists` database table instead of storing data in a JSON column. This provides better data integrity, indexing, and query performance.

## Database Schema

### Important: ID Type Compatibility

⚠️ **Critical:** Your `movies` and `series` tables use **TEXT/VARCHAR IDs** (like "4008", "1133"), not UUIDs. The `watchlists` table must use the same type for `movie_id` and `series_id` columns.

If you originally created the watchlists table with UUID types, you MUST run the migration script first:
```sql
-- See: supabase/migrations/fix_watchlists_id_types.sql
ALTER TABLE watchlists ALTER COLUMN movie_id TYPE TEXT;
ALTER TABLE watchlists ALTER COLUMN series_id TYPE TEXT;
```

### Watchlists Table Structure
```sql
CREATE TABLE public.watchlists (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL,
  movie_id TEXT NULL,        -- Changed from UUID to TEXT to match movies.id
  series_id TEXT NULL,       -- Changed from UUID to TEXT to match series.id
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT timezone('utc'::text, now()),
  
  -- Primary Key
  CONSTRAINT watchlists_pkey PRIMARY KEY (id),
  
  -- Unique Constraints (prevent duplicates)
  CONSTRAINT watchlists_user_id_series_id_key UNIQUE (user_id, series_id),
  CONSTRAINT watchlists_user_id_movie_id_key UNIQUE (user_id, movie_id),
  
  -- Foreign Keys (commented out if movies/series use TEXT IDs)
  -- CONSTRAINT watchlists_series_id_fkey FOREIGN KEY (series_id) REFERENCES series (id) ON DELETE CASCADE,
  -- CONSTRAINT watchlists_movie_id_fkey FOREIGN KEY (movie_id) REFERENCES movies (id) ON DELETE CASCADE,
  CONSTRAINT watchlists_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  
  -- Check Constraint (either movie_id OR series_id, not both)
  CONSTRAINT watchlists_check CHECK (
    ((movie_id IS NOT NULL) AND (series_id IS NULL)) OR 
    ((movie_id IS NULL) AND (series_id IS NOT NULL))
  )
) TABLESPACE pg_default;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON public.watchlists USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_movie_id ON public.watchlists USING btree (movie_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_series_id ON public.watchlists USING btree (series_id);
```

## Key Features

### 1. **Relational Integrity**
- Foreign keys ensure referenced movies/series exist
- CASCADE DELETE automatically removes watchlist entries when content is deleted
- Unique constraints prevent duplicate entries

### 2. **Type Safety**
- Check constraint ensures exactly one of `movie_id` or `series_id` is set
- Cannot have both or neither

### 3. **Performance**
- Indexes on `user_id`, `movie_id`, and `series_id` for fast queries
- Much faster than JSON column queries

## How It Works Now

### Adding to Watchlist
```typescript
// User adds a movie (id: "123")
addToWatchlist("123", "movie")

// Database INSERT:
{
  user_id: "user-uuid",
  movie_id: "123",
  series_id: null
}
```

### Removing from Watchlist
```typescript
// User removes a series (id: "456")
removeFromWatchlist("456")

// Database DELETE WHERE:
user_id = "user-uuid" AND series_id = "456"
```

### Loading Watchlist
```typescript
// On page load, fetch all user's watchlist entries
SELECT movie_id, series_id FROM watchlists WHERE user_id = "user-uuid"

// Convert to app format:
[
  { id: "123", type: "movie" },
  { id: "456", type: "series" }
]
```

## Migration from Old Format

### If Users Have Old Data in `profiles.watchlist` JSON Column

You can migrate existing data with this SQL:

```sql
-- Migration script to move watchlist from profiles.watchlist JSON to watchlists table
INSERT INTO watchlists (user_id, movie_id, series_id)
SELECT 
  p.id as user_id,
  CASE 
    WHEN (item->>'type')::text = 'movie' THEN (item->>'id')::uuid
    ELSE NULL
  END as movie_id,
  CASE 
    WHEN (item->>'type')::text = 'series' THEN (item->>'id')::uuid
    ELSE NULL
  END as series_id
FROM 
  profiles p,
  jsonb_array_elements(p.watchlist) as item
WHERE 
  p.watchlist IS NOT NULL 
  AND jsonb_typeof(p.watchlist) = 'array'
  AND item->>'id' IS NOT NULL
  AND item->>'type' IN ('movie', 'series')
ON CONFLICT (user_id, movie_id) DO NOTHING
ON CONFLICT (user_id, series_id) DO NOTHING;

-- Optional: Clear the old JSON column after migration
-- UPDATE profiles SET watchlist = '[]'::jsonb WHERE watchlist IS NOT NULL;
```

## Row Level Security (RLS)

Make sure to enable RLS policies on the watchlists table:

```sql
-- Enable RLS
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own watchlist
CREATE POLICY "Users can view own watchlist"
ON watchlists FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can add to their own watchlist
CREATE POLICY "Users can insert own watchlist"
ON watchlists FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can remove from their own watchlist
CREATE POLICY "Users can delete own watchlist"
ON watchlists FOR DELETE
USING (auth.uid() = user_id);
```

## Benefits of This Approach

### ✅ **Better Data Integrity**
- Foreign key constraints prevent orphaned watchlist entries
- Unique constraints prevent duplicates
- Check constraints ensure data validity

### ✅ **Improved Performance**
- Indexes make queries much faster
- No need to parse JSON for every query
- Database can optimize join operations

### ✅ **Easier Queries**
```sql
-- Get all movies in user's watchlist
SELECT m.* FROM movies m
JOIN watchlists w ON m.id = w.movie_id
WHERE w.user_id = 'user-uuid';

-- Get all users who watchlisted a specific movie
SELECT u.* FROM auth.users u
JOIN watchlists w ON u.id = w.user_id
WHERE w.movie_id = 'movie-uuid';

-- Count watchlist items by type
SELECT 
  COUNT(CASE WHEN movie_id IS NOT NULL THEN 1 END) as movies,
  COUNT(CASE WHEN series_id IS NOT NULL THEN 1 END) as series
FROM watchlists
WHERE user_id = 'user-uuid';
```

### ✅ **Automatic Cleanup**
- When a movie/series is deleted, watchlist entries are automatically removed
- When a user is deleted, their watchlist is automatically removed

## Testing the New Implementation

### 1. Clear Old Data (if needed)
```javascript
// In browser console
localStorage.removeItem('streamit_watchlist');
```

### 2. Test Adding Items
- Add a movie → Check database for row with `movie_id`
- Add a series → Check database for row with `series_id`

### 3. Verify Database
```sql
-- Check your watchlist entries
SELECT * FROM watchlists WHERE user_id = 'your-user-uuid';
```

### 4. Test Persistence
- Add items to watchlist
- Refresh the page
- Items should still be there

### 5. Test Removal
- Remove an item
- Check it's gone from both UI and database

## Troubleshooting

### Issue: "foreign key constraint" error
**Cause:** Trying to add a movie/series ID that doesn't exist  
**Solution:** Ensure the movie/series exists in the database first

### Issue: "duplicate key value violates unique constraint"
**Cause:** Trying to add the same item twice  
**Solution:** The app checks `isInWatchlist()` first, but handle this gracefully

### Issue: Items not persisting
**Cause:** RLS policies not set correctly  
**Solution:** Check RLS policies allow INSERT/SELECT for authenticated users

### Issue: Old items showing duplicates
**Cause:** Data exists in both old JSON column and new table  
**Solution:** Run migration script, then clear old JSON column

## Performance Monitoring

Monitor query performance:
```sql
-- Check slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time
FROM pg_stat_statements
WHERE query LIKE '%watchlists%'
ORDER BY mean_time DESC
LIMIT 10;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'watchlists';
```

## Future Enhancements

### Possible Additions:
1. **Order/Priority** - Add `order` column to allow custom sorting
2. **Notes** - Add `notes` TEXT column for user comments
3. **Tags** - Create `watchlist_tags` table for categorization
4. **Shared Watchlists** - Add `is_public` and sharing features
5. **Timestamps** - Track `last_viewed_at` for "Recently Viewed"
6. **Notifications** - Notify when watchlisted content has new episodes

---
**Last Updated:** June 18, 2026  
**Version:** 3.0 - Database Table Implementation
