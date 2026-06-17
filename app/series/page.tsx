"use client";
import { Search, Filter, ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InlineSpinner } from "@/components/LoadingSpinner";
import { useEffect, useState, useCallback } from "react";
import { Series } from "@/lib/supabase";
import { StreamitHoverCard } from "@/components/StreamitHoverCard";
import { NetflixCard } from "@/components/NetflixCard";

type SeriesWithVJ = Series & {
  vjs: { id: string; name: string } | null;
  season_count?: number;
};

type VJ = {
  id: string;
  name: string;
};

export default function SeriesPage() {
  const [series, setSeries] = useState<SeriesWithVJ[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVJ, setSelectedVJ] = useState<string>("");
  const [availableVJs, setAvailableVJs] = useState<VJ[]>([]);
  const [showVJDropdown, setShowVJDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSeries, setTotalSeries] = useState(0);

  const seriesPerPage = 48;

  const fetchAvailableVJs = useCallback(async () => {
    try {
      const api = await import('@/lib/api');
      const vjData = await api.getVJs();
      setAvailableVJs(vjData || []);
    } catch (error) {
      console.error('Error fetching VJs:', error);
    }
  }, []);

  // selectedVJ is already the VJ name (getVJs maps id=name), pass it directly
  const fetchSeries = useCallback(async (page: number, query = "", vjName = "") => {
    setLoading(true);
    try {
      const api = await import('@/lib/api');
      const seriesData = await api.searchSeries(query, seriesPerPage, page, vjName || undefined);
      setSeries(seriesData as any[]);
      setTotalSeries(seriesData.length === seriesPerPage ? page * seriesPerPage + 1 : (page - 1) * seriesPerPage + seriesData.length);
    } catch (error) {
      console.error('Error fetching series:', error);
    } finally {
      setLoading(false);
    }
  }, [seriesPerPage]);

  // Initial load
  useEffect(() => {
    fetchSeries(1);
    fetchAvailableVJs();
  }, [fetchSeries, fetchAvailableVJs]);

  // Handle pagination changes
  useEffect(() => {
    if (currentPage > 1) {
      fetchSeries(currentPage, searchQuery, selectedVJ);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Handle search/VJ filter with debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        fetchSeries(1, searchQuery, selectedVJ);
      }
    }, 400);
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedVJ]);

  const clearFilters = () => {
    setSelectedVJ("");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalSeries / seriesPerPage);
  const isFiltering = searchQuery.trim().length > 0 || !!selectedVJ;
  const selectedVJLabel = availableVJs.find(vj => vj.id === selectedVJ)?.name;

  return (
    <div className="min-h-screen bg-black text-white py-8 flex flex-col items-center">
      <div className="container mx-auto px-4 sm:px-6">
        <h1 className="text-3xl md:text-4xl font-bold mb-8 flex items-center">
          Series
        </h1>

        {/* Search and Filter */}
        <div className="mb-8 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search series..."
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
                {selectedVJLabel || 'VJ Filter'}
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
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-700 rounded ${selectedVJ === vj.id ? 'text-[#E50914] font-semibold' : 'text-gray-300'}`}
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
              {loading ? 'Searching...' : `${series.length} results`}
              {searchQuery && ` for "${searchQuery}"`}
              {selectedVJ && ` by ${selectedVJLabel}`}
            </p>
          )}
        </div>

        {/* Loading State */}
        {loading && <InlineSpinner text="Loading series..." />}

        {/* Series Grid */}
        {!loading && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-x-2 gap-y-4">
            {series.map((show) => (
              <StreamitHoverCard key={show.id} content={{...show, type: 'series'}}>
                <NetflixCard content={show} type="series" />
              </StreamitHoverCard>
            ))}
          </div>
        )}

        {/* No Results */}
        {!loading && (searchQuery || selectedVJ) && series.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No series found</h3>
            <p className="text-gray-500">
              Try adjusting your search terms or filters
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
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
            Found {series.length} series
            {searchQuery && ` matching "${searchQuery}"`}
            {selectedVJ && ` by ${selectedVJLabel}`}
          </div>
        )}
      </div>
    </div>
  );
}