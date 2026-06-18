"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { FullPageSpinner } from "@/components/LoadingSpinner";
import { NetflixCard } from "@/components/NetflixCard";
import { StreamitHoverCard } from "@/components/StreamitHoverCard";
import { Button } from "@/components/ui/button";
import { Trash2, Film, Tv } from "lucide-react";
import { useUserPreferences } from "@/lib/hooks/useUserPreferences";

export default function WatchlistPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const { watchlist, removeFromWatchlist, loading: prefLoading } = useUserPreferences();
  
  const [watchlistItems, setWatchlistItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [filter, setFilter] = useState<'all' | 'movies' | 'series'>('all');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/signin');
      return;
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function fetchWatchlistDetails() {
      if (prefLoading) return;
      
      if (!watchlist || watchlist.length === 0) {
        setWatchlistItems([]);
        setLoadingItems(false);
        return;
      }
      
      try {
        setLoadingItems(true);
        // Fetch items based on their stored type
        const itemPromises = watchlist.map(async (item) => {
          try {
            if (item.type === 'movie') {
              const movie = await (await import('@/lib/api')).getMovieById(item.id);
              return movie ? { ...movie, type: 'movie' as const } : null;
            } else {
              const series = await (await import('@/lib/api')).getSeriesById(item.id);
              return series ? { ...series, type: 'series' as const } : null;
            }
          } catch (err) {
            console.error(`Error fetching watchlist item ${item.id} (${item.type}):`, err);
            return null;
          }
        });
        
        const results = await Promise.all(itemPromises);
        const validItems = results.filter(Boolean);
        
        // Reverse so the newest additions are at the top
        setWatchlistItems(validItems.reverse());
      } catch (error) {
        console.error('Error fetching watchlist:', error);
      } finally {
        setLoadingItems(false);
      }
    }

    if (user) {
      fetchWatchlistDetails();
    }
  }, [watchlist, prefLoading, user]);

  if (authLoading || prefLoading || (loadingItems && watchlistItems.length === 0 && watchlist.length > 0)) {
    return <FullPageSpinner text="Loading your watchlist..." />;
  }

  const filteredWatchlist = watchlistItems.filter(item => {
    if (filter === 'movies') return item.type === 'movie';
    if (filter === 'series') return item.type === 'series';
    return true;
  });

  const movieCount = watchlistItems.filter(item => item.type === 'movie').length;
  const seriesCount = watchlistItems.filter(item => item.type === 'series').length;

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      {/* Header */}
      <div className="w-full px-4 md:px-8 lg:px-12 xl:px-16 pt-24 pb-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-black mb-4 text-white">My Watchlist</h1>
          <p className="text-gray-400 text-lg mb-8">
            {watchlistItems.length === 0 
              ? "Your watchlist is empty. Start adding movies and series you want to watch!"
              : `You have ${watchlistItems.length} item${watchlistItems.length !== 1 ? 's' : ''} in your watchlist`
            }
          </p>

          {/* Filter Tabs */}
          {watchlistItems.length > 0 && (
            <div className="flex gap-4 mb-8 border-b border-gray-800 pb-4">
              <button
                onClick={() => setFilter('all')}
                className={`px-6 py-2 rounded-t-lg font-bold text-sm transition-all ${
                  filter === 'all'
                    ? 'bg-[#E50914] text-white'
                    : 'bg-transparent text-gray-400 hover:text-white'
                }`}
              >
                All ({watchlistItems.length})
              </button>
              <button
                onClick={() => setFilter('movies')}
                className={`px-6 py-2 rounded-t-lg font-bold text-sm transition-all flex items-center gap-2 ${
                  filter === 'movies'
                    ? 'bg-[#E50914] text-white'
                    : 'bg-transparent text-gray-400 hover:text-white'
                }`}
              >
                <Film className="w-4 h-4" />
                Movies ({movieCount})
              </button>
              <button
                onClick={() => setFilter('series')}
                className={`px-6 py-2 rounded-t-lg font-bold text-sm transition-all flex items-center gap-2 ${
                  filter === 'series'
                    ? 'bg-[#E50914] text-white'
                    : 'bg-transparent text-gray-400 hover:text-white'
                }`}
              >
                <Tv className="w-4 h-4" />
                Series ({seriesCount})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Watchlist Grid */}
      <div className="w-full px-4 md:px-8 lg:px-12 xl:px-16 pb-24">
        <div className="max-w-7xl mx-auto">
          {filteredWatchlist.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                {filter === 'movies' ? (
                  <Film className="w-12 h-12 text-gray-600" />
                ) : filter === 'series' ? (
                  <Tv className="w-12 h-12 text-gray-600" />
                ) : (
                  <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                )}
              </div>
              <h2 className="text-2xl font-bold mb-2 text-gray-300">
                {filter === 'all' && "No items in your watchlist"}
                {filter === 'movies' && "No movies in your watchlist"}
                {filter === 'series' && "No series in your watchlist"}
              </h2>
              <p className="text-gray-500 mb-8">
                Browse our collection and add content to watch later
              </p>
              <Button 
                onClick={() => router.push('/')}
                className="bg-[#E50914] hover:bg-[#b80710] text-white font-bold px-8 py-6"
              >
                Browse Content
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
              {filteredWatchlist.map((item) => {
                if (!item) return null;

                return (
                  <div key={item.id} className="relative group">
                    <StreamitHoverCard content={item}>
                      <NetflixCard content={item} type={item.type} />
                    </StreamitHoverCard>
                    
                    {/* Remove Button */}
                    <button
                      onClick={() => removeFromWatchlist(item.id)}
                      className="absolute top-2 right-2 z-10 w-8 h-8 bg-black/80 hover:bg-[#E50914] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
                      aria-label="Remove from watchlist"
                      title="Remove from watchlist"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
