'use client'
import AdminPanelLayout from "@/app/components/layout";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

// Define types for TMDB API responses
interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
}

interface TMDBVideo {
  type: string;
  site: string;
  key: string;
}

interface TMDBGenre {
  id: number;
  name: string;
}

interface TMDBMovieDetails extends TMDBMovie {
  runtime: number | null;
  genres: TMDBGenre[];
}

interface TMDBResults {
  results: TMDBMovie[];
}

interface TMDBVideos {
  results: TMDBVideo[];
}

// Explicit type for form state
interface MovieFormState {
  title: string;
  vj: string;
  overview: string;
  genres: string[]; // store genre UUIDs
  releaseDate: string;
  duration: string;
  trailer: string;
  thumbnail: string;
  cover: string;
  published: boolean;
  premium: boolean;
  recommend: boolean;
  popular: boolean;
  latest: boolean;
  remakes: boolean;
  exclusive_from_kilax_movies: boolean;
  video_url: string;
}

interface Episode {
  title: string;
  video_url: string;
  thumbnail: string;
  overview: string;
  premium: boolean;
}

interface ManualAddState {
  episodes: Episode[];
}

export default function AddMoviePage() {
  const [form, setForm] = useState<MovieFormState>({
    title: "",
    vj: "",
    overview: "",
    genres: [],
    releaseDate: "",
    duration: "",
    trailer: "",
    thumbnail: "",
    cover: "",
    published: true,
    premium: false,
    recommend: false,
    popular: false,
    latest: false,
    remakes: false,
    exclusive_from_kilax_movies: false,
    video_url: "",
  });

  // TMDB search state
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<TMDBMovie[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [allGenres, setAllGenres] = useState<{ id: string; name: string; tmdb_id: number }[]>([]);
  const [genresLoading, setGenresLoading] = useState(true);
  const [allVjs, setAllVjs] = useState<{ id: string; name: string }[]>([]);
  const [vjsLoading, setVjsLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [isManualAdd, setIsManualAdd] = useState(false);
  const [manualAdd, setManualAdd] = useState<ManualAddState>({
    episodes: [{ title: "Part 1", video_url: "", thumbnail: "", overview: "", premium: false }]
  });
  const formRef = useRef<HTMLFormElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);


  const router = useRouter();

  useEffect(() => {
    async function fetchGenres() {
      setGenresLoading(true);
      const { data, error } = await supabase.from("genres").select("id, name, tmdb_id").order("name");
      if (error) console.error("Error fetching genres:", error);
      if (data) setAllGenres(data);
      setGenresLoading(false);
    }

    async function fetchVjs() {
      setVjsLoading(true);
      const { data, error } = await supabase.from("vjs").select("id, name").order("name");
      if (error) console.error("Error fetching VJs:", error);
      if (data) setAllVjs(data);
      setVjsLoading(false);
    }

    fetchGenres();
    fetchVjs();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setForm((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else if (name === "genres") {
      const options = Array.from((e.target as HTMLSelectElement).selectedOptions, option => option.value);
      setForm((prev) => ({ ...prev, genres: options }));
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // TMDB search handler
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSearchError("");
    setResults([]);
    try {
      const response = await fetch(`/panel/api/movies/search?query=${encodeURIComponent(search)}`);
      const data: TMDBResults = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error("Search error:", error);
      setSearchError("Failed to fetch from TMDB");
    } finally {
      setLoading(false);
    }
  };


  // Episode management functions
  const addEpisode = () => {
    const newEpisodeNumber = manualAdd.episodes.length + 1;
    setManualAdd(prev => ({
      ...prev,
      episodes: [...prev.episodes, {
        title: `Part ${newEpisodeNumber}`,
        video_url: "",
        thumbnail: form.thumbnail || "",
        overview: "",
        premium: true // New episodes are premium by default
      }]
    }));
  };

  const removeEpisode = (index: number) => {
    if (manualAdd.episodes.length <= 1) {
      alert('Must have at least one episode');
      return;
    }
    setManualAdd(prev => ({
      ...prev,
      episodes: prev.episodes.filter((_, i) => i !== index)
    }));
  };

  const updateEpisode = (index: number, field: keyof Episode, value: string | boolean) => {
    setManualAdd(prev => ({
      ...prev,
      episodes: prev.episodes.map((ep, i) =>
        i === index ? { ...ep, [field]: value } : ep
      )
    }));
  };

  // Import TMDB movie into form
  const handleImport = async (movie: TMDBMovie) => {
    // Fetch trailer
    let trailerUrl = "";
    try {
      const videosResponse = await fetch(`/panel/api/movies/trailer?movieId=${movie.id}`);
      const videos: TMDBVideos = await videosResponse.json();
      const trailer = videos.results.find((v) => v.type === "Trailer" && v.site === "YouTube");
      if (trailer) trailerUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
    } catch (error) {
      console.error("Error fetching trailer:", error);
    }

    // Fetch full movie details for duration and genres
    let duration = "";
    let genres: string[] = [];
    try {
      const detailsResponse = await fetch(`/panel/api/movies/details?movieId=${movie.id}`);
      const details: TMDBMovieDetails = await detailsResponse.json();
      if (details.runtime) duration = details.runtime.toString();
      if (details.genres) {
        genres = details.genres
          .map((g) => allGenres.find(local => local.tmdb_id === g.id)?.id)
          .filter((id): id is string => !!id);
      }
    } catch (error) {
      console.error("Error fetching movie details:", error);
    }

    const movieThumbnail = movie.poster_path ? `https://image.tmdb.org/t/p/original${movie.poster_path}` : "";

    setForm((prev) => ({
      ...prev,
      title: movie.title || "",
      overview: movie.overview || "",
      releaseDate: movie.release_date || "",
      thumbnail: movieThumbnail,
      cover: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : "",
      trailer: trailerUrl,
      duration,
      genres,
    }));

    // If in manual add mode, also update episode thumbnails with movie poster
    if (isManualAdd) {
      setManualAdd(prev => ({
        ...prev,
        episodes: prev.episodes.map(ep => ({
          ...ep,
          thumbnail: ep.thumbnail || movieThumbnail,
          overview: ep.overview || movie.overview || ""
        }))
      }));
    }

    setShowForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth" });
      titleInputRef.current?.focus();
    }, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setSubmitError("");
    setSubmitSuccess(false);

    try {
      if (isManualAdd) {
        // Handle manual add - create series with episodes like dashboard
        if (manualAdd.episodes.some(ep => !ep.title || !ep.video_url)) {
          setSubmitError('Please fill in all episode titles and video URLs');
          setSubmitLoading(false);
          return;
        }

        // Create series first
        const seriesData = {
          title: form.title,
          description: form.overview,
          release_date: form.releaseDate,
          thumbnail_url: form.thumbnail,
          cover_image_url: form.cover,
          trailer_url: form.trailer,
          vj_id: form.vj || null,
          published: form.published,
          recommend: form.recommend,
          popular: form.popular,
          latest: form.latest,
          remakes: form.remakes,
          exclusive_from_kilax: form.exclusive_from_kilax_movies,
          genre_ids: form.genres.filter(id => id && id.trim() !== ''),
          tmdb_id: null
        };

        const { data: series, error: seriesError } = await supabase
          .from('series')
          .insert([seriesData])
          .select()
          .single();

        if (seriesError) throw seriesError;

        // Create season
        const seasonData = {
          series_id: series.id,
          name: "Season 1",
          order: 1,
          published: form.published,
          episode_count: manualAdd.episodes.length,
          overview: `Episodes for ${form.title}`
        };

        const { data: season, error: seasonError } = await supabase
          .from('seasons')
          .insert([seasonData])
          .select()
          .single();

        if (seasonError) throw seasonError;

        // Create episodes
        const episodeData = manualAdd.episodes.map((episode, index) => ({
          season_id: season.id,
          episode_number: index + 1,
          title: episode.title,
          description: episode.overview || form.overview,
          release_date: form.releaseDate || new Date().toISOString().split('T')[0],
          thumbnail_url: episode.thumbnail || form.thumbnail,
          video_url: episode.video_url,
          published: form.published,
          premium: manualAdd.episodes.length > 1 ? (index === 0 ? false : episode.premium) : episode.premium
        }));

        const { error: episodesError } = await supabase
          .from('episodes')
          .insert(episodeData);

        if (episodesError) throw episodesError;

        setSubmitSuccess(true);
        setTimeout(() => {
          router.push("/series");
        }, 2000);
      } else {
        // Handle regular movie
        const movieData = {
          title: form.title,
          description: form.overview,
          release_date: form.releaseDate,
          cover_image_url: form.cover,
          thumbnail_url: form.thumbnail,
          trailer_url: form.trailer,
          duration: form.duration,
          genre_ids: form.genres.filter(id => id && id.trim() !== ''),
          vj_id: form.vj || null,
          published: form.published,
          premium: form.premium,
          recommend: form.recommend,
          popular: form.popular,
          latest: form.latest,
          remakes: form.remakes,
          exclusive_from_kilax_movies: form.exclusive_from_kilax_movies,
          video_url: form.video_url
        };

        const { error } = await supabase.from("movies").insert([movieData]);
        if (error) throw error;

        setSubmitSuccess(true);
        setTimeout(() => {
          router.push("/movies");
        }, 1500);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        setSubmitError(error.message);
      } else {
        setSubmitError("An unexpected error occurred.");
      }
    }

    setSubmitLoading(false);
  };

  return (
    <AdminPanelLayout>
      <div className="max-w-7xl mx-auto p-8 bg-[#1a1c21] rounded-2xl shadow-xl mt-8 border border-gray-800">
        <h1 className="text-2xl font-bold text-white uppercase tracking-wider mb-6">{isManualAdd ? "Add Movie as Series" : "Add Movie"}</h1>
        {isManualAdd && (
          <div className="bg-[#E50914]/10 border border-[#E50914]/30 rounded-lg p-4 mb-6">
            <p className="text-[#E50914] text-sm font-medium">
              <strong>Manual Add Mode:</strong> Search for a movie from TMDB, then create it as a series with multiple parts (e.g., Part 1, Part 2).
            </p>
          </div>
        )}
        {/* Mode Toggle */}
        {!showForm && (
          <div className="mb-6">
            {/* Toggle Buttons */}
            <div className="flex bg-black rounded-lg p-1 mb-4 w-fit border border-gray-800">
              <button
                type="button"
                onClick={() => {
                  setIsManualAdd(false);
                  setResults([]);
                  setSearch("");
                  // Reset to single episode for regular mode
                  setManualAdd({
                    episodes: [{ title: "Part 1", video_url: "", thumbnail: "", overview: "", premium: false }]
                  });
                }}
                className={`px-4 py-2 rounded-md font-bold uppercase tracking-wider text-xs transition-all ${!isManualAdd
                  ? 'bg-[#E50914] text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
                  }`}
              >
                Search TMDB
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsManualAdd(true);
                  setResults([]);
                  setSearch("");
                  // Initialize with 2 parts for manual add
                  if (manualAdd.episodes.length === 1) {
                    setManualAdd(prev => ({
                      ...prev,
                      episodes: [
                        { title: "Part 1", video_url: "", thumbnail: "", overview: "", premium: false },
                        { title: "Part 2", video_url: "", thumbnail: "", overview: "", premium: true }
                      ]
                    }));
                  }
                }}
                className={`px-4 py-2 rounded-md font-bold uppercase tracking-wider text-xs transition-all ${isManualAdd
                  ? 'bg-[#E50914] text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
                  }`}
              >
                Manual Add
              </button>
            </div>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="flex gap-3">
              <input
                type="text"
                placeholder={isManualAdd ? "Search TMDB for a movie to create as series..." : "Search TMDB for a movie..."}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full p-3 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914] placeholder-gray-600"
              />
              <button type="submit" className="bg-[#E50914] hover:bg-[#b80710] text-white font-bold uppercase tracking-wider text-sm py-3 px-6 rounded-lg whitespace-nowrap shadow-[0_0_10px_rgba(229,9,20,0.2)]">
                {loading ? "Searching..." : "Search"}
              </button>
            </form>
          </div>
        )}
        {!showForm && searchError && <div className="text-[#E50914] mb-4 font-medium">{searchError}</div>}
        {!showForm && results.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider mb-4">TMDB Results</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {results.map((movie) => (
                <div key={movie.id} className="border border-gray-800 rounded-xl p-4 flex flex-col items-center bg-black hover:border-gray-600 transition-colors">
                  <Image
                    src={movie.poster_path ? `https://image.tmdb.org/t/p/original${movie.poster_path}` : "/assets/images/placeholder.png"}
                    alt={movie.title}
                    width={160}
                    height={240}
                    className="rounded-lg mb-4 w-full object-cover"
                  />
                  <div className="font-bold text-white text-center mb-2">{movie.title}</div>
                  <div className="text-xs text-gray-500 mb-4 text-center line-clamp-3">{movie.overview}</div>
                  <button
                    type="button"
                    className="mt-auto w-full bg-[#E50914] hover:bg-[#b80710] text-white px-4 py-2 rounded-lg font-bold uppercase tracking-wider text-xs transition-colors"
                    onClick={() => handleImport(movie)}
                  >
                    {isManualAdd ? "Import" : "Import"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Manual/Imported Form */}
        {showForm && (
          <form ref={formRef} className="grid grid-cols-1 md:grid-cols-2 gap-8" onSubmit={handleSubmit}>
            <div className="space-y-5">
              <div>
                <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Title</label>
                <input ref={titleInputRef} name="title" value={form.title} onChange={handleChange} className="w-full p-3 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914]" placeholder="Enter title" />
              </div>
              <div>
                <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">VJ</label>
                {vjsLoading ? (
                  <div className="text-gray-500 text-sm">Loading VJs...</div>
                ) : (
                  <select
                    name="vj"
                    value={form.vj}
                    onChange={handleChange}
                    className="w-full p-3 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914]"
                    required
                  >
                    <option value="">Select VJ</option>
                    {allVjs.map(vj => (
                      <option key={vj.id} value={vj.id}>{vj.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Genres</label>
                {/* Selected Genres as Chips */}
                <div className="flex flex-wrap gap-2 mb-3 min-h-[50px] p-3 border border-gray-800 rounded-lg bg-black">
                  {form.genres.length === 0 ? (
                    <span className="text-gray-500 text-sm italic">No genres selected</span>
                  ) : (
                    form.genres.map((genreId) => {
                      const genre = allGenres.find(g => g.id === genreId);
                      return (
                        <span
                          key={genreId}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-red-900/20 text-[#E50914] text-xs font-bold uppercase tracking-wider rounded-full border border-red-900"
                        >
                          {genre?.name}
                          <button
                            type="button"
                            onClick={() => {
                              setForm(prev => ({
                                ...prev,
                                genres: prev.genres.filter(id => id !== genreId)
                              }));
                            }}
                            className="ml-1 hover:bg-red-900/40 rounded-full p-0.5 transition-colors"
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                              <path d="M3 3l6 6m0-6L3 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                          </button>
                        </span>
                      );
                    })
                  )}
                  {/* Add Genre Dropdown (inline with chips) */}
                  {genresLoading ? (
                    <div className="text-gray-500">Loading genres...</div>
                  ) : (
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value && !form.genres.includes(e.target.value)) {
                          setForm(prev => ({
                            ...prev,
                            genres: [...prev.genres, e.target.value]
                          }));
                        }
                        e.target.value = ""; // Reset dropdown
                      }}
                      className="w-48 p-2 rounded bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914] text-sm"
                    >
                      <option value="">+ Add genre</option>
                      {allGenres
                        .filter(genre => !form.genres.includes(genre.id))
                        .map(genre => (
                          <option key={genre.id} value={genre.id}>
                            {genre.name}
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Overview</label>
                <textarea name="overview" value={form.overview} onChange={handleChange} className="w-full p-3 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914]" placeholder="Enter description" rows={4} />
              </div>
              <div>
                <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Release Date</label>
                <input type="date" name="releaseDate" value={form.releaseDate} onChange={handleChange} className="w-full p-3 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914]" />
              </div>
              <div>
                <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Duration</label>
                <input name="duration" value={form.duration} onChange={handleChange} className="w-full p-3 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914]" placeholder="Enter duration (e.g. 120)" />
              </div>
              <div>
                <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Trailer URL</label>
                <input name="trailer" value={form.trailer} onChange={handleChange} className="w-full p-3 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914]" placeholder="Enter trailer URL" />
              </div>
              {!isManualAdd && (
                <div>
                  <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Video URL</label>
                  <input name="video_url" value={form.video_url} onChange={handleChange} className="w-full p-3 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914]" placeholder="Enter video URL" required />
                </div>
              )}

              {/* Status Toggles moved to left column */}
              <div className="mt-8">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-gray-800 pb-2">Status Options</h3>
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-3 text-gray-300 font-medium cursor-pointer">
                    <input type="checkbox" name="published" checked={form.published} onChange={handleChange} className="w-4 h-4 accent-[#E50914]" /> Published
                  </label>
                  {!isManualAdd && (
                    <label className="flex items-center gap-3 text-gray-300 font-medium cursor-pointer">
                      <input type="checkbox" name="premium" checked={form.premium} onChange={handleChange} className="w-4 h-4 accent-[#E50914]" /> Premium
                    </label>
                  )}
                  <label className="flex items-center gap-3 text-gray-300 font-medium cursor-pointer">
                    <input type="checkbox" name="recommend" checked={form.recommend} onChange={handleChange} className="w-4 h-4 accent-[#E50914]" /> Recommend
                  </label>
                  <label className="flex items-center gap-3 text-gray-300 font-medium cursor-pointer">
                    <input type="checkbox" name="popular" checked={form.popular} onChange={handleChange} className="w-4 h-4 accent-[#E50914]" /> Popular
                  </label>
                  <label className="flex items-center gap-3 text-gray-300 font-medium cursor-pointer">
                    <input type="checkbox" name="latest" checked={form.latest} onChange={handleChange} className="w-4 h-4 accent-[#E50914]" /> Latest
                  </label>
                  <label className="flex items-center gap-3 text-gray-300 font-medium cursor-pointer">
                    <input type="checkbox" name="remakes" checked={form.remakes} onChange={handleChange} className="w-4 h-4 accent-[#E50914]" /> Remakes
                  </label>
                  <label className="flex items-center gap-3 text-gray-300 font-medium cursor-pointer">
                    <input type="checkbox" name="exclusive_from_kilax_movies" checked={form.exclusive_from_kilax_movies} onChange={handleChange} className="w-4 h-4 accent-[#E50914]" /> Exclusive from NicholMovies
                  </label>
                </div>
              </div>

            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Thumbnail</label>
                <input name="thumbnail" value={form.thumbnail} onChange={handleChange} className="w-full p-3 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914]" placeholder="Enter thumbnail URL" />
                <div className="mt-3 bg-black border border-gray-800 rounded-lg flex items-center justify-center h-48 overflow-hidden">
                  {form.thumbnail ? <Image src={form.thumbnail} alt="thumbnail" width={160} height={240} className="h-full w-auto object-cover" /> : <span className="text-gray-600 text-sm">Preview</span>}
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Cover</label>
                <input name="cover" value={form.cover} onChange={handleChange} className="w-full p-3 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914]" placeholder="Enter cover URL" />
                <div className="mt-3 bg-black border border-gray-800 rounded-lg flex items-center justify-center h-48 overflow-hidden">
                  {form.cover ? <Image src={form.cover} alt="cover" width={320} height={180} className="h-full w-full object-cover" /> : <span className="text-gray-600 text-sm">Preview</span>}
                </div>
              </div>

              {/* Movie Parts Section for Manual Add */}
              {isManualAdd && (
                <div className="col-span-2 mt-8">
                  <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-2">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Movie Parts</h3>
                    <button
                      type="button"
                      onClick={addEpisode}
                      className="bg-transparent border border-[#E50914] text-[#E50914] hover:bg-[#E50914]/10 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors"
                    >
                      + Add Part
                    </button>
                  </div>

                  <div className="space-y-4">
                    {manualAdd.episodes.map((episode, index) => (
                      <div key={index} className="border border-gray-800 rounded-xl p-5 bg-[#141414]">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-white uppercase tracking-wider text-sm">Part {index + 1}</h4>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center text-gray-300 text-sm font-medium cursor-pointer">
                              <input
                                type="checkbox"
                                checked={episode.premium}
                                onChange={(e) => updateEpisode(index, 'premium', e.target.checked)}
                                className="mr-2 w-4 h-4 accent-[#E50914]"
                                disabled={manualAdd.episodes.length > 1 && index === 0} // First part forced free if multiple parts
                              />
                              Premium
                            </label>
                            {manualAdd.episodes.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeEpisode(index)}
                                className="text-red-500 hover:text-red-400 text-xs font-bold uppercase tracking-wider"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Title *</label>
                            <input
                              type="text"
                              value={episode.title}
                              onChange={(e) => updateEpisode(index, 'title', e.target.value)}
                              className="w-full p-2.5 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914] text-sm"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Video URL *</label>
                            <input
                              type="url"
                              value={episode.video_url}
                              onChange={(e) => updateEpisode(index, 'video_url', e.target.value)}
                              className="w-full p-2.5 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914] text-sm"
                              placeholder="https://..."
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Thumbnail URL</label>
                            <input
                              type="url"
                              value={episode.thumbnail}
                              onChange={(e) => updateEpisode(index, 'thumbnail', e.target.value)}
                              className="w-full p-2.5 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914] text-sm"
                              placeholder="Auto-filled from movie poster"
                            />
                          </div>

                          <div>
                            <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Overview</label>
                            <textarea
                              value={episode.overview}
                              onChange={(e) => updateEpisode(index, 'overview', e.target.value)}
                              className="w-full p-2.5 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914] text-sm"
                              rows={2}
                              placeholder="Auto-filled from movie overview"
                            />
                          </div>
                        </div>

                        {index === 0 && manualAdd.episodes.length > 1 && (
                          <div className="mt-3">
                            <span className="text-xs font-medium text-green-500 bg-green-900/20 px-2 py-1 rounded border border-green-900">✓ First part is free by default when multiple parts exist</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Button moved to right column */}
              <button
                type="submit"
                className="mt-8 w-full bg-[#E50914] hover:bg-[#b80710] text-white font-bold uppercase tracking-wider py-4 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-[0_0_15px_rgba(229,9,20,0.3)]"
                disabled={submitLoading}
              >
                {submitLoading ? "Saving..." : isManualAdd ? "+ Create Series" : "+ Create Movie"}
              </button>
            </div>
          </form>
        )}
        {submitError && <div className="text-[#E50914] mt-4 font-bold p-3 bg-red-900/20 border border-red-900 rounded-lg">{submitError}</div>}
        {submitSuccess && <div className="text-green-500 mt-4 font-bold p-3 bg-green-900/20 border border-green-900 rounded-lg">{isManualAdd ? `Series created with ${manualAdd.episodes.length} parts successfully! Redirecting...` : "Movie imported successfully! Redirecting..."}</div>}
      </div>
    </AdminPanelLayout>
  );
}