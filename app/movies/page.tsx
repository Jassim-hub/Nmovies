"use client";
import { Search, Filter, ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState, useCallback } from "react";
import { Movie } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { StreamitHoverCard } from "@/components/StreamitHoverCard";
import { NetflixCard } from "@/components/NetflixCard";

type MovieWithVJ = Movie & {
  vjs: { id: string; name: string } | null;
};

type VJ = {
  id: string;
  name: string;
};

export default function MoviesPage() {
  const [movies, setMovies] = useState<MovieWithVJ[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVJ, setSelectedVJ] = useState<string>("");
  const [availableVJs, setAvailableVJs] = useState<VJ[]>([]);
  const [showVJDropdown, setShowVJDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalMovies, setTotalMovies] = useState(0);

  const moviesPerPage = 48; // More items per page for compact design

  // Fetch functions with useCallback to prevent recreation
  const fetchAvailableVJs = useCallback(async () => {
    try {
      // In streamit we fetch VJs directly from Supabase historically,
      // but since we want to move to Reelplexi entirely, we can extract
      // unique VJs from a large fetch, or use the existing vjs table just for the dropdown names.
      // For now, let's keep the existing VJ list from supabase as it only contains names/ids.
      const { data: vjData, error } = await supabase
        .from('vjs')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setAvailableVJs(vjData || []);
    } catch (error) {
      console.error('Error fetching VJs:', error);
    }
  }, []);

  const fetchMovies = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const api = await import('@/lib/api');
      const moviesData = await api.getMovies(moviesPerPage, page);
      setMovies(moviesData as any);
      
      // We don't get exact total count from the lightweight Reelplexi API wrapper currently,
      // so we assume if we got a full page, there's more.
      setTotalMovies(moviesData.length === moviesPerPage ? page * moviesPerPage + 1 : (page - 1) * moviesPerPage + moviesData.length);
    } catch (error) {
      console.error('Error fetching movies:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleVJFilter = useCallback(async (vjId: string) => {
    setCurrentPage(1);
    setLoading(true);
    try {
      // API currently handles VJ filtering by fetching and local filtering, 
      // or we can just fetch movies and filter by vj_id
      const api = await import('@/lib/api');
      const allMovies = await api.getMovies(100, 1);
      const filteredMovies = allMovies.filter(m => m.vj_id === vjId);
      
      setMovies(filteredMovies as any);
      setTotalMovies(filteredMovies.length);
    } catch (error) {
      console.error('Error filtering movies by VJ:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const performSearch = useCallback(async (query: string) => {
    if (query.trim()) {
      setLoading(true);
      try {
        const api = await import('@/lib/api');
        const searchResults = await api.searchMovies(query, 50);
        
        setMovies(searchResults as any);
        setTotalMovies(searchResults.length);
      } catch (error) {
        console.error('Error searching movies:', error);
      } finally {
        setLoading(false);
      }
    } else {
      // Reset to paginated view
      fetchMovies(1);
    }
  }, [fetchMovies]);

  // Initial load
  useEffect(() => {
    fetchMovies(1);
    fetchAvailableVJs();
  }, [fetchMovies, fetchAvailableVJs]);

  // Handle pagination changes (only when not filtering)
  useEffect(() => {
    if (!searchQuery && !selectedVJ && currentPage > 1) {
      fetchMovies(currentPage);
    }
  }, [currentPage, searchQuery, selectedVJ, fetchMovies]);

  // Handle search with debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQuery.trim()) {
        setCurrentPage(1);
        setSelectedVJ(""); // Reset VJ filter when searching
        performSearch(searchQuery);
      } else if (!selectedVJ) {
        setCurrentPage(1);
        fetchMovies(1);
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery, selectedVJ, performSearch, fetchMovies]);

  // Handle VJ filter
  useEffect(() => {
    if (selectedVJ) {
      handleVJFilter(selectedVJ);
    } else if (!searchQuery) {
      setCurrentPage(1);
      fetchMovies(1);
    }
  }, [selectedVJ, searchQuery, handleVJFilter, fetchMovies]);

  const clearFilters = () => {
    setSelectedVJ("");
    setSearchQuery("");
    setCurrentPage(1);
    fetchMovies(1);
  };

  const totalPages = Math.ceil(totalMovies / moviesPerPage);
  const isFiltering = searchQuery.trim().length > 0 || selectedVJ;

  return (
    <div className="min-h-screen bg-black text-white py-8">
      <div className="container mx-auto px-4 sm:px-6">
        <h1 className="text-3xl md:text-4xl font-bold mb-8 flex items-center">
          Movies
          <span className="text-sm text-gray-400 ml-2">({totalMovies} total)</span>
        </h1>

        {/* Search and Filter */}
        <div className="mb-8 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search movies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#E50914]"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* VJ Filter Dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                className={`border-gray-600 text-gray-300 hover:bg-gray-800 ${selectedVJ ? 'bg-[#E50914] border-[#E50914] text-white hover:bg-[#b80710]' : ''}`}
                onClick={() => setShowVJDropdown(!showVJDropdown)}
              >
                <Filter className="w-4 h-4 mr-2" />
                {selectedVJ ? availableVJs.find(vj => vj.id === selectedVJ)?.name : 'VJ Filter'}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>

              {showVJDropdown && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50 max-h-[50vh] overflow-y-auto overscroll-contain scrollbar-hide">
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setSelectedVJ("");
                        setShowVJDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded"
                    >
                      All VJs
                    </button>
                    {availableVJs.map((vj) => (
                      <button
                        key={vj.id}
                        onClick={() => {
                          setSelectedVJ(vj.id);
                          setShowVJDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded"
                      >
                        {vj.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {(selectedVJ || searchQuery) && (
              <Button
                variant="outline"
                className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                onClick={clearFilters}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Search Results Info */}
        <div className="mb-6">
          {(searchQuery || selectedVJ) && (
            <p className="text-gray-400 mb-4">
              {loading ? 'Searching...' : `${movies.length} results`}
              {searchQuery && ` for "${searchQuery}"`}
              {selectedVJ && ` by ${availableVJs.find(vj => vj.id === selectedVJ)?.name}`}
            </p>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* Movies Grid - Compact Mobile Design */}
        {!loading && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-x-2 gap-y-4">
            {movies.map((movie) => (
              <StreamitHoverCard key={movie.id} content={{...movie, type: 'movie'}}>
                <NetflixCard content={movie} type="movie" />
              </StreamitHoverCard>
            ))}
          </div>
        )}

        {/* No Results */}
        {!loading && (searchQuery || selectedVJ) && movies.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No movies found</h3>
            <p className="text-gray-500">
              Try adjusting your search terms or filters
            </p>
          </div>
        )}

        {/* Pagination */}
        {!isFiltering && totalPages > 1 && (
          <div className="flex justify-center items-center mt-12 gap-2">
            <Button
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>

            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    className={currentPage === pageNum
                      ? "bg-[#E50914] hover:bg-[#b80710]"
                      : "border-gray-600 text-gray-300 hover:bg-gray-800"
                    }
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}

        {/* Filter results info */}
        {isFiltering && (
          <div className="text-center mt-8 text-gray-400">
            Found {movies.length} movie{movies.length !== 1 ? 's' : ''}
            {searchQuery && ` matching "${searchQuery}"`}
            {selectedVJ && ` by ${availableVJs.find(vj => vj.id === selectedVJ)?.name}`}
          </div>
        )}
      </div>
    </div>
  );
}