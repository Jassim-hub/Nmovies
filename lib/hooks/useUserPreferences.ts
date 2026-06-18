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

export function useUserPreferences() {
  const { user } = useAuth();
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [watchHistory, setWatchHistory] = useState<Record<string, WatchProgress>>({});
  const [loading, setLoading] = useState(true);

  // Load from local storage and DB
  useEffect(() => {
    async function loadPreferences() {
      // 1. Load from local storage (fast initial load)
      try {
        const localWatchlist = localStorage.getItem('streamit_watchlist');
        const localHistory = localStorage.getItem('streamit_history');
        
        if (localWatchlist) setWatchlist(JSON.parse(localWatchlist));
        if (localHistory) setWatchHistory(JSON.parse(localHistory));
      } catch (e) {
        console.error("Failed to parse local storage preferences", e);
      }

      // 2. Load from DB if user is logged in
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('watchlist, watch_history')
            .eq('id', user.id)
            .single();

          if (!error && data) {
            // Merge DB state with local state, giving priority to DB
            if (data.watchlist && Array.isArray(data.watchlist)) {
              setWatchlist(data.watchlist);
              localStorage.setItem('streamit_watchlist', JSON.stringify(data.watchlist));
            }
            if (data.watch_history) {
              setWatchHistory(data.watch_history);
              localStorage.setItem('streamit_history', JSON.stringify(data.watch_history));
            }
          }
        } catch (e) {
          console.warn("DB preferences columns might not exist yet.", e);
        }
      }
      setLoading(false);
    }

    loadPreferences();
  }, [user]);

  const syncToDb = async (newWatchlist: string[], newHistory: Record<string, WatchProgress>) => {
    if (!user?.id) return;
    try {
      await supabase
        .from('profiles')
        .update({
          watchlist: newWatchlist,
          watch_history: newHistory
        })
        .eq('id', user.id);
    } catch (e) {
      console.warn("Failed to sync preferences to DB (columns might be missing).", e);
    }
  };

  const addToWatchlist = useCallback(async (id: string) => {
    setWatchlist(prev => {
      if (prev.includes(id)) return prev;
      const newList = [...prev, id];
      localStorage.setItem('streamit_watchlist', JSON.stringify(newList));
      syncToDb(newList, watchHistory);
      return newList;
    });
  }, [user, watchHistory]);

  const removeFromWatchlist = useCallback(async (id: string) => {
    setWatchlist(prev => {
      const newList = prev.filter(itemId => itemId !== id);
      localStorage.setItem('streamit_watchlist', JSON.stringify(newList));
      syncToDb(newList, watchHistory);
      return newList;
    });
  }, [user, watchHistory]);

  const isInWatchlist = useCallback((id: string) => {
    return watchlist.includes(id);
  }, [watchlist]);

  const updateWatchProgress = useCallback(async (progress: WatchProgress) => {
    setWatchHistory(prev => {
      const newHistory = { ...prev, [progress.id]: progress };
      localStorage.setItem('streamit_history', JSON.stringify(newHistory));
      syncToDb(watchlist, newHistory);
      return newHistory;
    });
  }, [user, watchlist]);

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
