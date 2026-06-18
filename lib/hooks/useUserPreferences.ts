import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

export interface WatchProgress {
  id: string; // Movie or Series ID
  type: 'movie' | 'series';
  progress: number; // Current time in seconds
  duration: number; // Total duration in seconds
  timestamp: number; // Last watched time (Unix timestamp)
  title: string;
  poster_url?: string;
  season?: number;
  episode?: number;
}

export interface WatchlistItem {
  id: string;
  type: 'movie' | 'series';
}

// Helper to validate watchlist format
function isValidWatchlistItem(item: any): item is WatchlistItem {
  return item && typeof item === 'object' && typeof item.id === 'string' && (item.type === 'movie' || item.type === 'series');
}

export function useUserPreferences() {
  const { user } = useAuth();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [watchHistory, setWatchHistory] = useState<Record<string, WatchProgress>>({});
  const [loading, setLoading] = useState(true);

  // Load watchlist from database (watchlists table) and watch history from profiles
  useEffect(() => {
    async function loadPreferences() {
      // 1. Load from local storage first (fast initial load)
      try {
        const localWatchlist = localStorage.getItem('streamit_watchlist');
        const localHistory = localStorage.getItem('streamit_history');
        
        if (localWatchlist) {
          const parsed = JSON.parse(localWatchlist);
          if (Array.isArray(parsed)) {
            const validItems = parsed.filter(isValidWatchlistItem);
            setWatchlist(validItems);
          }
        }
        
        if (localHistory) {
          try {
            setWatchHistory(JSON.parse(localHistory));
          } catch {
            localStorage.removeItem('streamit_history');
          }
        }
      } catch (e) {
        console.error("Failed to parse local storage preferences", e);
      }

      // 2. Load from database if user is logged in
      if (user?.id) {
        try {
          // Fetch watchlist from watchlists table
          const { data: watchlistData, error: watchlistError } = await supabase
            .from('watchlists')
            .select('movie_id, series_id')
            .eq('user_id', user.id);

          if (!watchlistError && watchlistData) {
            // Convert database rows to WatchlistItem format
            const items: WatchlistItem[] = watchlistData.map(row => {
              if (row.movie_id) {
                return { id: row.movie_id, type: 'movie' as const };
              } else if (row.series_id) {
                return { id: row.series_id, type: 'series' as const };
              }
              return null;
            }).filter((item): item is WatchlistItem => item !== null);

            console.log(`Loaded ${items.length} items from watchlists table`);
            setWatchlist(items);
            localStorage.setItem('streamit_watchlist', JSON.stringify(items));
          }

          // Fetch watch history from profiles table
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('watch_history')
            .eq('id', user.id)
            .single();

          if (!profileError && profileData?.watch_history) {
            setWatchHistory(profileData.watch_history);
            localStorage.setItem('streamit_history', JSON.stringify(profileData.watch_history));
          }
        } catch (e) {
          console.error("Error loading preferences from database:", e);
        }
      }
      
      setLoading(false);
    }

    loadPreferences();
  }, [user]);

  const syncWatchHistoryToDb = useCallback(async (newHistory: Record<string, WatchProgress>) => {
    if (!user?.id) return;
    try {
      await supabase
        .from('profiles')
        .update({ watch_history: newHistory })
        .eq('id', user.id);
    } catch (e) {
      console.warn("Failed to sync watch history to DB:", e);
    }
  }, [user]);

  const addToWatchlist = useCallback(async (id: string, type: 'movie' | 'series') => {
    // Check if already in watchlist
    if (watchlist.some(item => item.id === id)) {
      console.log(`Item ${id} already in watchlist`);
      return;
    }

    const newItem: WatchlistItem = { id, type };
    
    // Update local state immediately for better UX
    const newList = [...watchlist, newItem];
    setWatchlist(newList);
    localStorage.setItem('streamit_watchlist', JSON.stringify(newList));

    // Sync to database
    if (user?.id) {
      try {
        const insertData = {
          user_id: user.id,
          movie_id: type === 'movie' ? id : null,
          series_id: type === 'series' ? id : null,
        };

        const { error } = await supabase
          .from('watchlists')
          .insert(insertData);

        if (error) {
          console.error('Error adding to watchlist:', error);
          // Revert on error
          setWatchlist(watchlist);
          localStorage.setItem('streamit_watchlist', JSON.stringify(watchlist));
        } else {
          console.log(`Added ${type} ${id} to watchlist`);
        }
      } catch (e) {
        console.error('Failed to add to watchlist:', e);
        // Revert on error
        setWatchlist(watchlist);
        localStorage.setItem('streamit_watchlist', JSON.stringify(watchlist));
      }
    }
  }, [user, watchlist]);

  const removeFromWatchlist = useCallback(async (id: string) => {
    const itemToRemove = watchlist.find(item => item.id === id);
    if (!itemToRemove) {
      console.log(`Item ${id} not in watchlist`);
      return;
    }

    // Update local state immediately
    const newList = watchlist.filter(item => item.id !== id);
    setWatchlist(newList);
    localStorage.setItem('streamit_watchlist', JSON.stringify(newList));

    // Sync to database
    if (user?.id) {
      try {
        const deleteQuery = supabase
          .from('watchlists')
          .delete()
          .eq('user_id', user.id);

        // Add the appropriate condition based on type
        if (itemToRemove.type === 'movie') {
          deleteQuery.eq('movie_id', id);
        } else {
          deleteQuery.eq('series_id', id);
        }

        const { error } = await deleteQuery;

        if (error) {
          console.error('Error removing from watchlist:', error);
          // Revert on error
          setWatchlist(watchlist);
          localStorage.setItem('streamit_watchlist', JSON.stringify(watchlist));
        } else {
          console.log(`Removed ${itemToRemove.type} ${id} from watchlist`);
        }
      } catch (e) {
        console.error('Failed to remove from watchlist:', e);
        // Revert on error
        setWatchlist(watchlist);
        localStorage.setItem('streamit_watchlist', JSON.stringify(watchlist));
      }
    }
  }, [user, watchlist]);

  const isInWatchlist = useCallback((id: string) => {
    return watchlist.some(item => item.id === id);
  }, [watchlist]);

  const updateWatchProgress = useCallback(async (progress: WatchProgress) => {
    const newHistory = { ...watchHistory, [progress.id]: progress };
    setWatchHistory(newHistory);
    localStorage.setItem('streamit_history', JSON.stringify(newHistory));
    syncWatchHistoryToDb(newHistory);
  }, [watchHistory, syncWatchHistoryToDb]);

  const getContinueWatching = useCallback((id: string) => {
    return watchHistory[id] || null;
  }, [watchHistory]);

  const getAllContinueWatching = useCallback(() => {
    return Object.values(watchHistory)
      .filter(item => {
        // Only return if watched more than 1 minute and less than 95% complete
        const isSignificant = item.progress > 60;
        const isNotFinished = (item.progress / item.duration) < 0.95;
        return isSignificant && isNotFinished;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [watchHistory]);

  return {
    watchlist,
    watchHistory,
    loading,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    updateWatchProgress,
    getContinueWatching,
    getAllContinueWatching
  };
}
