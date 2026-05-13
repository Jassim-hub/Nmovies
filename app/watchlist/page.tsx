"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { supabase, MovieWithVJ, SeriesWithVJ } from "@/lib/supabase";
import { FullPageSpinner } from "@/components/LoadingSpinner";
import { NetflixCard } from "@/components/NetflixCard";
import { StreamitHoverCard } from "@/components/StreamitHoverCard";
import { Button } from "@/components/ui/button";
import { Trash2, Film, Tv } from "lucide-react";

interface WatchlistItem {
  id: string;
  movie_id: string | null;
  series_id: string | null;
  created_at: string;
  movies?: MovieWithVJ | null;
  series?: SeriesWithVJ | null;
}

export default function WatchlistPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'movies' | 'series'>('all');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/signin');
      return;
    }

    if (user) {
      fetchWatchlist();
    }
  }, [user, authLoading, router]);

  const fetchWatchlist = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('watchlists')
        .select(`
          id,
          movie_id,
          series_id,
          created_at,
          movies:movie_id (*, vjs:vj_id(name)),
          series:series_id (*, vjs:vj_id(name))
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Type assertion to handle Supabase's return type
      setWatchlist((data as any) || []);
    } catch (error) {
      console.error('Error fetching watchlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWatchlist = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('watchlists')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      
      // Update local state
      setWatchlist(prev => prev.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Error removing from watchlist:', error);
    }
  };

  if (authLoading || loading) {
    return <FullPageSpinner text="Loading your watchlist..." />;
  }

  const filteredWatchlist = watchlist.filter(item => {
    if (filter === 'movies') return item.movie_id !== null;
    if (filter === 'series') return item.series_id !== null;
    return true;
  });

  const movieCount = watchlist.filter(item => item.movie_id !== null).length;
  const seriesCount = watchlist.filter(item => item.series_id !== null).length;

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      {/* Header */}
      <div className="w-full px-4 md:px-8 lg:px-12 xl:px-16 pt-24 pb-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-black mb-4 text-white">My Watchlist</h1>
          <p className="text-gray-400 text-lg mb-8">
            {watchlist.length === 0 
              ? "Your watchlist is empty. Start adding movies and series you want to watch!"
              : `You have ${watchlist.length} item${watchlist.length !== 1 ? 's' : ''} in your watchlist`
            }
          </p>

          {/* Filter Tabs */}
          {watchlist.length > 0 && (
            <div className="flex gap-4 mb-8 border-b border-gray-800 pb-4">
              <button
                onClick={() => setFilter('all')}
                className={`px-6 py-2 rounded-t-lg font-bold text-sm transition-all ${
                  filter === 'all'
                    ? 'bg-[#E50914] text-white'
                    : 'bg-transparent text-gray-400 hover:text-white'
                }`}
              >
                All ({watchlist.length})
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
                const content = item.movies || item.series;
                const type = item.movie_id ? 'movie' : 'series';
                
                if (!content) return null;

                return (
                  <div key={item.id} className="relative group">
                    <StreamitHoverCard content={{ ...content, type }}>
                      <NetflixCard content={content} type={type} />
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
