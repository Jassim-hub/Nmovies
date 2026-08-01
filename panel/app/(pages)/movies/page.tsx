'use client';

import AdminPanelLayout from "@/app/components/layout";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import PushNotificationDialog from "@/components/PushNotificationDialog";
import { getReelplexiMovies, searchReelplexiMovies, getReelplexiGenres } from "@/lib/reelplexi";

interface Movie {
  id: string;
  title: string;
  description: string;
  cover_image_url: string;
  thumbnail_url: string;
  published: boolean;
  premium: boolean;
  release_date?: string;
  vjs?: { name: string } | null;
  genre_ids?: string[];
}

interface Genre {
  id: string;
  name: string;
}

export default function MoviesPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showPushDialog, setShowPushDialog] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const pageSize = 20;

  // Load available genres
  useEffect(() => {
    async function loadGenres() {
      const g = await getReelplexiGenres();
      setGenres(g);
    }
    loadGenres();
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch movies from Reelplexi API
  const fetchMovies = useCallback(async () => {
    setLoading(true);
    try {
      const genreFilter = selectedGenre !== 'all' ? selectedGenre : undefined;
      const res = debouncedSearch.trim()
        ? await searchReelplexiMovies(debouncedSearch.trim(), page, pageSize, undefined, genreFilter)
        : await getReelplexiMovies(page, pageSize, genreFilter);

      setMovies(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Error fetching movies from Reelplexi:', err);
      setMovies([]);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, selectedGenre]);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  const handleSendPushNotification = (movie: Movie) => {
    setSelectedMovie(movie);
    setShowPushDialog(true);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AdminPanelLayout>
      <div className="flex flex-col gap-4 mb-6 px-4 sm:px-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white uppercase tracking-wider">Movies (Reelplaxi Catalog)</h1>
            <p className="text-xs text-gray-400 mt-1">Live catalog synced with Reelplaxi API</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <input
              type="text"
              placeholder="Search movies by title..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-black border border-gray-800 text-white rounded-lg px-4 py-2 w-full sm:w-72 focus:outline-none focus:ring-1 focus:ring-[#E50914] placeholder-gray-600"
            />
          </div>
        </div>

        {/* Genre Filter Pills */}
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <Button
            className={`px-4 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider border ${
              selectedGenre === 'all'
                ? 'bg-[#E50914] text-white border-transparent shadow-[0_0_10px_rgba(229,9,20,0.3)]'
                : 'bg-transparent text-gray-400 border-gray-800 hover:border-[#E50914]'
            }`}
            onClick={() => { setSelectedGenre('all'); setPage(1); }}
          >
            All Genres
          </Button>
          {genres.map((g) => (
            <Button
              key={g.id}
              className={`px-4 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider border ${
                selectedGenre === g.id
                  ? 'bg-[#E50914] text-white border-transparent shadow-[0_0_10px_rgba(229,9,20,0.3)]'
                  : 'bg-transparent text-gray-400 border-gray-800 hover:border-[#E50914]'
              }`}
              onClick={() => { setSelectedGenre(g.id); setPage(1); }}
            >
              {g.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-[#1a1c21] rounded-2xl p-0 border border-gray-800 shadow-xl overflow-x-auto">
        <table className="min-w-full text-left">
          <thead>
            <tr className="border-b border-gray-800 bg-[#141414]/50">
              <th className="px-6 py-4 text-[#E50914] font-bold uppercase tracking-wider text-xs">#</th>
              <th className="px-6 py-4 text-[#E50914] font-bold uppercase tracking-wider text-xs">Poster</th>
              <th className="px-6 py-4 text-[#E50914] font-bold uppercase tracking-wider text-xs">Title</th>
              <th className="px-6 py-4 text-[#E50914] font-bold uppercase tracking-wider text-xs">Overview</th>
              <th className="px-6 py-4 text-[#E50914] font-bold uppercase tracking-wider text-xs">VJ / Status</th>
              <th className="px-6 py-4 text-[#E50914] font-bold uppercase tracking-wider text-xs">Push Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-bold uppercase tracking-wider">
                  Loading movies from Reelplaxi...
                </td>
              </tr>
            ) : movies.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500 italic">
                  No movies found.
                </td>
              </tr>
            ) : (
              movies.map((movie, idx) => (
                <tr key={movie.id || idx} className="border-b border-gray-800 hover:bg-[#141414] transition-colors">
                  <td className="px-6 py-4 text-gray-400 font-medium">{(page - 1) * pageSize + idx + 1}</td>
                  <td className="px-6 py-4">
                    <Image 
                      src={movie.thumbnail_url || movie.cover_image_url || "/assets/images/placeholder.png"} 
                      alt={movie.title} 
                      width={96} 
                      height={144} 
                      className="w-16 h-24 object-cover rounded-lg border border-gray-800"
                    />
                  </td>
                  <td className="px-6 py-4 text-white font-bold max-w-[200px]">
                    <p className="truncate text-sm">{movie.title}</p>
                    {movie.release_date && (
                      <span className="text-[10px] text-gray-500 block font-normal mt-0.5">
                        Released: {movie.release_date.split('T')[0]}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-400 max-w-xs">
                    <p className="line-clamp-2 text-xs leading-relaxed">{movie.description || 'No description available.'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      {movie.vjs?.name && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-orange-950/40 text-orange-400 border border-orange-800/40 w-fit">
                          VJ {movie.vjs.name}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-green-950/40 text-green-400 border border-green-800/40 w-fit">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        Published
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Button 
                      onClick={() => handleSendPushNotification(movie)}
                      className="bg-[#E50914] hover:bg-[#b80710] text-white px-4 py-2 text-xs font-bold uppercase tracking-wider border-none shadow-[0_0_10px_rgba(229,9,20,0.3)] transition-all flex items-center gap-1.5"
                    >
                      <span>🔔</span> Send Push
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden px-4 sm:px-0">
        {loading ? (
          <div className="bg-[#1a1c21] rounded-2xl border border-gray-800 shadow-xl p-8 text-center text-gray-400 font-bold uppercase tracking-wider">
            Loading movies...
          </div>
        ) : movies.length === 0 ? (
          <div className="bg-[#1a1c21] rounded-2xl border border-gray-800 shadow-xl p-8 text-center text-gray-500 italic">
            No movies found.
          </div>
        ) : (
          <div className="space-y-4">
            {movies.map((movie, idx) => (
              <div key={movie.id || idx} className="bg-[#1a1c21] rounded-2xl border border-gray-800 shadow-xl p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <Image 
                      src={movie.thumbnail_url || movie.cover_image_url || "/assets/images/placeholder.png"} 
                      alt={movie.title} 
                      width={120} 
                      height={180} 
                      className="w-20 h-28 object-cover rounded-lg border border-gray-800"
                    />
                  </div>
                  <div className="flex-grow min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[#E50914] font-bold uppercase">#{(page - 1) * pageSize + idx + 1}</span>
                        {movie.vjs?.name && (
                          <span className="text-[10px] uppercase font-bold text-orange-400 bg-orange-950/40 px-2 py-0.5 rounded border border-orange-800/40">
                            VJ {movie.vjs.name}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-white mb-1 line-clamp-1">{movie.title}</h3>
                      <p className="text-xs text-gray-400 mb-3 line-clamp-2">{movie.description || 'No overview available.'}</p>
                    </div>

                    <Button
                      onClick={() => handleSendPushNotification(movie)}
                      className="w-full bg-[#E50914] hover:bg-[#b80710] text-white py-2 text-xs font-bold uppercase tracking-wider border-none shadow-[0_0_10px_rgba(229,9,20,0.3)]"
                    >
                      🔔 Send Push Notification
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 my-8 px-4 sm:px-0">
        <div className="flex items-center gap-2">
          <Button 
            disabled={page === 1 || loading} 
            onClick={() => setPage(p => Math.max(1, p - 1))} 
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-transparent border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white disabled:opacity-50"
          >
            Previous
          </Button>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2">
            Page {page} of {totalPages}
          </span>
          <Button 
            disabled={page >= totalPages || loading} 
            onClick={() => setPage(p => p + 1)} 
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-transparent border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white disabled:opacity-50"
          >
            Next
          </Button>
        </div>
      </div>

      {/* Push Notification Dialog */}
      <PushNotificationDialog
        open={showPushDialog}
        onOpenChange={setShowPushDialog}
        contentTitle={selectedMovie?.title}
        contentImage={selectedMovie?.cover_image_url || selectedMovie?.thumbnail_url}
        contentType="movie"
        contentId={selectedMovie?.id}
      />
    </AdminPanelLayout>
  );
}