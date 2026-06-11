"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { NetflixCard } from "@/components/NetflixCard"
import { Search, X, ChevronDown } from "lucide-react"

interface ContentItem {
  id: string
  title: string
  thumbnail_url?: string
  cover_image_url?: string
  description?: string
  release_date?: string
  genre_ids?: string[]
  vj_id?: string
  premium?: boolean
  vjs?: { id: string; name: string } | null
}

interface VJ {
  id: string
  name: string
}

interface Genre {
  id: string
  name: string
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [movies, setMovies] = useState<ContentItem[]>([])
  const [series, setSeries] = useState<ContentItem[]>([])

  const [loading, setLoading] = useState(true)
  const [vjs, setVjs] = useState<VJ[]>([])
  const [genres, setGenres] = useState<Genre[]>([])
  
  const [selectedVJ, setSelectedVJ] = useState<string>("")
  const [selectedGenre, setSelectedGenre] = useState<string>("")
  const [vjDropdownOpen, setVjDropdownOpen] = useState(false)
  const [genreDropdownOpen, setGenreDropdownOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"all" | "movies" | "series">("all")
  // Load VJs and Genres on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [vjRes, genreRes] = await Promise.all([
          supabase.from("vjs").select("id, name").order("name"),
          supabase.from("genres").select("id, name").order("name")
        ])
        setVjs(vjRes.data || [])
        setGenres(genreRes.data || [])
      } catch (error) {
        console.error("Error loading initial data:", error)
      }
    }
    loadInitialData()
  }, [])

  // Fetch content whenever query, VJ, or genre changes using the backend Search API
  const fetchResults = useCallback(async () => {
    setLoading(true)
    try {
      const api = await import("@/lib/api")
      const limit = 50

      const selectedVJName = vjs.find((v) => v.id === selectedVJ)?.name
      const selectedGenreName = genres.find((g) => g.id === selectedGenre)?.name

      // We can use the new searchAllContent if there is a query, or fetch movies/series if no query
      if (searchQuery.trim() || selectedVJName) {
        const items = await api.searchAllContent(searchQuery.trim(), limit, 1, selectedVJName, selectedGenreName)
        setMovies(items.filter((item: any) => item.type === 'movie'))
        setSeries(items.filter((item: any) => item.type === 'series'))
      } else {
        const [mRes, sRes] = await Promise.all([
          api.searchMovies("", limit, 1, undefined, selectedGenreName),
          api.searchSeries("", limit, 1, undefined, selectedGenreName)
        ])
        setMovies(mRes as any[])
        setSeries(sRes as any[])
      }
    } catch (error) {
      console.error("Error fetching search results:", error)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedVJ, selectedGenre, vjs, genres])

  useEffect(() => {
    const timer = setTimeout(fetchResults, 400) // 400ms debounce
    return () => clearTimeout(timer)
  }, [fetchResults])



  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClick = () => {
      setVjDropdownOpen(false)
      setGenreDropdownOpen(false)
    }
    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [])

  const totalResults = movies.length + series.length
  const selectedVJName = vjs.find((v) => v.id === selectedVJ)?.name
  const selectedGenreName = genres.find((g) => g.id === selectedGenre)?.name
  const hasActiveFilters = !!searchQuery || !!selectedVJ || !!selectedGenre

  const clearAllFilters = () => {
    setSearchQuery("")
    setSelectedVJ("")
    setSelectedGenre("")
  }

  const displayMovies = activeTab === "series" ? [] : movies
  const displaySeries = activeTab === "movies" ? [] : series

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="container mx-auto px-2 sm:px-4 py-8 flex-1">
        {/* Header */}
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6">Search & Browse</h1>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search movies, series, VJs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#E50914] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* VJ Filter Dropdown */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setVjDropdownOpen(!vjDropdownOpen)
                setGenreDropdownOpen(false)
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all border ${selectedVJ
                  ? "bg-[#E50914]/20 border-[#E50914]/50 text-[#E50914]"
                  : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500"
                }`}
            >
              <span>{selectedVJName || "All VJs"}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${vjDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {vjDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto">
                <button
                  onClick={() => { setSelectedVJ(""); setVjDropdownOpen(false) }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-800 transition-colors ${!selectedVJ ? "text-[#E50914] font-semibold" : "text-gray-300"
                    }`}
                >
                  All VJs
                </button>
                {vjs.map((vj) => (
                  <button
                    key={vj.id}
                    onClick={() => { setSelectedVJ(vj.id); setVjDropdownOpen(false) }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-800 transition-colors ${selectedVJ === vj.id ? "text-[#E50914] font-semibold" : "text-gray-300"
                      }`}
                  >
                    {vj.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Genre Filter Dropdown */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setGenreDropdownOpen(!genreDropdownOpen)
                setVjDropdownOpen(false)
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all border ${selectedGenre
                  ? "bg-[#E50914]/20 border-[#E50914]/50 text-[#E50914]"
                  : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500"
                }`}
            >
              <span>{selectedGenreName || "All Genres"}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${genreDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {genreDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto">
                <button
                  onClick={() => { setSelectedGenre(""); setGenreDropdownOpen(false) }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-800 transition-colors ${!selectedGenre ? "text-[#E50914] font-semibold" : "text-gray-300"
                    }`}
                >
                  All Genres
                </button>
                {genres.map((genre) => (
                  <button
                    key={genre.id}
                    onClick={() => { setSelectedGenre(genre.id); setGenreDropdownOpen(false) }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-800 transition-colors ${selectedGenre === genre.id ? "text-[#E50914] font-semibold" : "text-gray-300"
                      }`}
                  >
                    {genre.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white bg-gray-800/50 border border-gray-700 hover:border-gray-500 transition-all"
            >
              ✕ Clear Filters
            </button>
          )}
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          {(["all", "movies", "series"] as const).map((tab) => {
            const label = tab === "all" ? "All" : tab === "movies" ? "Movies" : "Series"
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === tab
                    ? "bg-[#E50914] text-white shadow-lg shadow-[#E50914]/25"
                    : "bg-gray-800 text-gray-300 hover:bg-[#E50914]/20 hover:text-[#E50914] border border-gray-700"
                  }`}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading content...</p>
            </div>
          </div>
        )}

        {/* No Results */}
        {!loading && totalResults === 0 && (
          <div className="text-center py-16">
            <Search className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">
              {hasActiveFilters
                ? "No results match your filters"
                : "No content available yet"}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="mt-4 px-6 py-2 bg-[#E50914] text-white rounded-lg font-medium hover:bg-[#b80710] transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}

        {/* Results */}
        {!loading && totalResults > 0 && (
          <div className="space-y-8">
            {/* Movies */}
            {displayMovies.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-blue-400 mb-4">Movies</h2>
                <div className="flex overflow-x-auto gap-3 pb-4 scrollbar-hide snap-x scroll-smooth">
                  {displayMovies.map((movie) => (
                    <div key={movie.id} className="flex-none w-[140px] sm:w-[160px] md:w-[180px] lg:w-[200px] snap-start">
                      <NetflixCard
                        content={movie as any}
                        type="movie"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Series */}
            {displaySeries.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-green-400 mb-4">Series</h2>
                <div className="flex overflow-x-auto gap-3 pb-4 scrollbar-hide snap-x scroll-smooth">
                  {displaySeries.map((s) => (
                    <div key={s.id} className="flex-none w-[140px] sm:w-[160px] md:w-[180px] lg:w-[200px] snap-start">
                      <NetflixCard
                        content={s as any}
                        type="series"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}