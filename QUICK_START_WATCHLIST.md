# Quick Start - Watchlist Fix

## 🚀 Deploy in 3 Steps

### Step 1: Fix Database Schema (Required)
Run this SQL in your Supabase SQL Editor:

```sql
-- First, fix the column types (movie_id and series_id should be TEXT not UUID)
ALTER TABLE watchlists DROP CONSTRAINT IF EXISTS watchlists_series_id_fkey;
ALTER TABLE watchlists DROP CONSTRAINT IF EXISTS watchlists_movie_id_fkey;
ALTER TABLE watchlists DROP CONSTRAINT IF EXISTS watchlists_user_id_series_id_key;
ALTER TABLE watchlists DROP CONSTRAINT IF EXISTS watchlists_user_id_movie_id_key;

ALTER TABLE watchlists ALTER COLUMN movie_id TYPE TEXT;
ALTER TABLE watchlists ALTER COLUMN series_id TYPE TEXT;

ALTER TABLE watchlists ADD CONSTRAINT watchlists_user_id_movie_id_key UNIQUE (user_id, movie_id);
ALTER TABLE watchlists ADD CONSTRAINT watchlists_user_id_series_id_key UNIQUE (user_id, series_id);

-- Now enable RLS
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own watchlist
CREATE POLICY "Users can view own watchlist"
ON watchlists FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to add to their own watchlist
CREATE POLICY "Users can insert own watchlist"
ON watchlists FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to remove from their own watchlist
CREATE POLICY "Users can delete own watchlist"
ON watchlists FOR DELETE
USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON watchlists TO authenticated;
```

### Step 2: Deploy Code
The code changes are already complete. Just deploy your app:

```bash
# If using Vercel/Netlify
git add .
git commit -m "Fix watchlist - use proper database table"
git push

# Or build locally
npm run build
```

### Step 3: Clear User Cache (Recommended)
Ask users to clear their browser data OR add this to your app:

**Option A: Add a one-time migration notification**
```typescript
// In app/layout.tsx or a global component
useEffect(() => {
  const migrated = localStorage.getItem('watchlist_migrated_v3');
  if (!migrated) {
    // Clear old format
    localStorage.removeItem('streamit_watchlist');
    localStorage.setItem('watchlist_migrated_v3', 'true');
    console.log('Watchlist migrated to v3');
  }
}, []);
```

**Option B: Manual user instruction**
Tell users to:
1. Press F12 (open developer console)
2. Type: `localStorage.clear()` and press Enter
3. Refresh the page

## ✅ Verification

Test these scenarios:

1. **Add a movie to watchlist**
   - Click the "+" button on a movie
   - Check it appears in watchlist section on homepage
   - Visit `/watchlist` page - it should be there

2. **Add a series to watchlist**
   - Click the "+" button on a series
   - Check it appears in watchlist section on homepage
   - Visit `/watchlist` page - it should be there

3. **Refresh the page**
   - Items should persist

4. **Check console**
   - Should see logs like: "Loaded 2 items from watchlists table"
   - Should NOT see repeated "Error fetching movie/series" messages

5. **Check database**
   ```sql
   SELECT * FROM watchlists LIMIT 10;
   ```
   - Should see rows with `movie_id` or `series_id` filled

## 🐛 Common Issues

### Issue: RLS Error
**Error:** `new row violates row-level security policy`

**Fix:**
```sql
-- Check policies exist
SELECT * FROM pg_policies WHERE tablename = 'watchlists';

-- Re-apply policies from Step 1 above
```

### Issue: Items not showing
**Error:** Nothing in watchlist after adding

**Fix:**
1. Check browser console for errors
2. Clear localStorage: `localStorage.removeItem('streamit_watchlist')`
3. Refresh and try again
4. Check database: `SELECT * FROM watchlists WHERE user_id = 'your-user-id'`

### Issue: Duplicate errors in console
**Error:** Still seeing "Error fetching movie" and "Error fetching series"

**Fix:**
- Make sure you deployed the latest code
- Clear browser cache
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

## 📞 Need Help?

1. **Check documentation:**
   - `WATCHLIST_COMPLETE_SOLUTION.md` - Full technical details
   - `WATCHLIST_DATABASE_MIGRATION.md` - Database migration guide

2. **Debug tools:**
   Open browser console and type:
   ```javascript
   // See what's in localStorage
   debugWatchlist()
   
   // Clear corrupted data
   clearOldWatchlist()
   ```

3. **Database queries:**
   ```sql
   -- Check RLS is enabled
   SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'watchlists';
   
   -- Count watchlist items
   SELECT COUNT(*) FROM watchlists;
   
   -- View recent additions
   SELECT * FROM watchlists ORDER BY created_at DESC LIMIT 10;
   ```

---
**Status:** Ready to Deploy ✅  
**Estimated Time:** 10 minutes  
**Risk Level:** Low (backwards compatible with localStorage cache)
