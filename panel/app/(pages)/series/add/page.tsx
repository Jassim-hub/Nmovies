'use client';
import { useState, useEffect, useRef } from "react";
import AdminPanelLayout from "@/app/components/layout";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

interface TMDBSeries {
  id: number;
  name: string;
  overview: string;
  first_air_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
}

interface TMDBGenre {
  id: number;
  name: string;
}

interface TMDBSeriesDetails extends TMDBSeries {
  genres: TMDBGenre[];
  episode_run_time: number[];
}

interface TMDBResults {
  results: TMDBSeries[];
}

interface TMDBVideo {
  key: string;
  type: string;
  site: string;
}

interface TMDBVideosResponse {
  results: TMDBVideo[];
}

export default function AddSeriesPage() {
  const [form, setForm] = useState({
    title: "",
    vj: "",
    overview: "",
    genres: [] as string[],
    releaseDate: "",
    trailer: "",
    thumbnail: "",
    cover: "",
    published: true,
    recommend: false,
    popular: false,
    latest: false,
    remakes: false,
    exclusive_from_kilax: false,
    tmdb_id: undefined as number | undefined,
  });

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<TMDBSeries[]>([]);
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
  const formRef = useRef<HTMLFormElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      // Fetch genres
      const { data: genres, error: genresError } = await supabase.from("genres").select("id, name, tmdb_id").order("name");
      console.log("Genres fetch result:", { genres, genresError });
      if (genres) {
        setAllGenres(genres);
        // Clean up any invalid genre IDs from form state
        const validGenreIds = genres.map(g => g.id);
        setForm(prev => ({
          ...prev,
          genres: prev.genres.filter(id => id && validGenreIds.includes(id))
        }));
      }
      setGenresLoading(false);

      // Fetch VJs
      const { data: vjs, error: vjsError } = await supabase.from("vjs").select("id, name").order("name");
      console.log("VJs fetch result:", { vjs, vjsError });
      if (vjs) setAllVjs(vjs);
      setVjsLoading(false);
    }
    fetchData();
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
      const response = await fetch(`/api/series/search?query=${encodeURIComponent(search)}`);
      const data: TMDBResults = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error("Search error:", error);
      setSearchError("Failed to fetch from TMDB");
    } finally {
      setLoading(false);
    }
  };

  // Import TMDB series into form
  const handleImport = async (series: TMDBSeries) => {
    // Fetch trailer
    let trailerUrl = "";
    try {
      const videosResponse = await fetch(`/api/series/trailer?seriesId=${series.id}`);
      const videos: TMDBVideosResponse = await videosResponse.json();
      const trailer = videos.results?.find((v: TMDBVideo) => v.type === "Trailer" && v.site === "YouTube");
      if (trailer) trailerUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
    } catch (error) {
      console.error("Error fetching trailer:", error);
    }
    // Fetch full series details for genres
    let genres: string[] = [];
    try {
      const detailsResponse = await fetch(`/api/series/details?seriesId=${series.id}`);
      const details: TMDBSeriesDetails = await detailsResponse.json();
      if (details.genres) {
        genres = details.genres
          .map((g) => allGenres.find(local => local.tmdb_id === g.id)?.id)
          .filter((id): id is string => !!id);
      }
    } catch (error) {
      console.error("Error fetching series details:", error);
    }
    setForm((prev) => ({
      ...prev,
      title: series.name || "",
      overview: series.overview || "",
      releaseDate: series.first_air_date || "",
      thumbnail: series.poster_path ? `https://image.tmdb.org/t/p/original${series.poster_path}` : "",
      cover: series.backdrop_path ? `https://image.tmdb.org/t/p/original${series.backdrop_path}` : "",
      trailer: trailerUrl,
      genres,
      tmdb_id: series.id,
    }));
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
    // Prepare the data for Supabase
    const seriesData = {
      title: form.title,
      description: form.overview,
      release_date: form.releaseDate,
      cover_image_url: form.cover,
      trailer_url: form.trailer,
      genre_ids: form.genres.filter(id => id && id.trim() !== ''), // Filter out empty strings
      vj_id: form.vj || null, // Convert empty string to null
      published: form.published,
      recommend: form.recommend,
      popular: form.popular,
      latest: form.latest,
      remakes: form.remakes,
      exclusive_from_kilax: form.exclusive_from_kilax,
      thumbnail_url: form.thumbnail,
      tmdb_id: form.tmdb_id,
    };
    const { error } = await supabase.from("series").insert([seriesData]);
    setSubmitLoading(false);
    if (error) {
      setSubmitError(error.message);
    } else {
      setSubmitSuccess(true);
      setTimeout(() => {
        router.push("/series");
      }, 1500);
    }
  };

  return (
    <AdminPanelLayout>
      <div className="max-w-7xl mx-auto p-8 bg-[#1a1c21] rounded-2xl shadow-xl mt-8 border border-gray-800">
        <h1 className="text-2xl font-bold text-white uppercase tracking-wider mb-6">Add Series</h1>
        {/* TMDB Search */}
        {!showForm && (
          <form onSubmit={handleSearch} className="flex gap-3 mb-6">
            <input
              type="text"
              placeholder="Search TMDB for a series..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full p-3 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914] placeholder-gray-600"
            />
            <button type="submit" className="bg-[#E50914] hover:bg-[#b80710] text-white font-bold uppercase tracking-wider text-sm py-3 px-6 rounded-lg whitespace-nowrap shadow-[0_0_10px_rgba(229,9,20,0.2)]">
              {loading ? "Searching..." : "Search"}
            </button>
          </form>
        )}
        {!showForm && searchError && <div className="text-[#E50914] mb-4 font-medium">{searchError}</div>}
        {!showForm && results.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider mb-4">TMDB Results</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {results.map((series) => (
                <div key={series.id} className="border border-gray-800 rounded-xl p-4 flex flex-col items-center bg-black hover:border-gray-600 transition-colors">
                  <Image
                    src={series.poster_path ? `https://image.tmdb.org/t/p/original${series.poster_path}` : "/assets/images/placeholder.png"}
                    alt={series.name}
                    width={160}
                    height={240}
                    className="rounded-lg mb-4 w-full object-cover"
                  />
                  <div className="font-bold text-white text-center mb-2">{series.name}</div>
                  <div className="text-xs text-gray-500 mb-4 text-center line-clamp-3">{series.overview}</div>
                  <button
                    type="button"
                    className="mt-auto w-full bg-[#E50914] hover:bg-[#b80710] text-white px-4 py-2 rounded-lg font-bold uppercase tracking-wider text-xs transition-colors"
                    onClick={() => handleImport(series)}
                  >
                    Import
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
                    form.genres
                      .map((genreId) => {
                        const genre = allGenres.find(g => g.id === genreId);
                        return { genreId, genre };
                      })
                      .filter(({ genre }) => genre) // Only render chips for valid genres
                      .map(({ genreId, genre }) => (
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
                      ))
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
                        e.target.value = "";
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
                <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Trailer URL</label>
                <input name="trailer" value={form.trailer} onChange={handleChange} className="w-full p-3 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914]" placeholder="Enter trailer URL" />
              </div>

              {/* Status Toggles moved to left column */}
              <div className="mt-8">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-gray-800 pb-2">Status Options</h3>
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-3 text-gray-300 font-medium cursor-pointer">
                    <input type="checkbox" name="published" checked={form.published} onChange={handleChange} className="w-4 h-4 accent-[#E50914]" /> Published
                  </label>
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
                    <input type="checkbox" name="exclusive_from_kilax" checked={form.exclusive_from_kilax} onChange={handleChange} className="w-4 h-4 accent-[#E50914]" /> Exclusive from NicholMovies
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

              <button
                type="submit"
                className="mt-8 w-full bg-[#E50914] hover:bg-[#b80710] text-white font-bold uppercase tracking-wider py-4 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-[0_0_15px_rgba(229,9,20,0.3)]"
                disabled={submitLoading}
              >
                {submitLoading ? "Saving..." : "+ Create Series"}
              </button>
            </div>
          </form>
        )}
        {submitError && <div className="text-[#E50914] mt-4 font-bold p-3 bg-red-900/20 border border-red-900 rounded-lg">{submitError}</div>}
        {submitSuccess && <div className="text-green-500 mt-4 font-bold p-3 bg-green-900/20 border border-green-900 rounded-lg">Series imported successfully! Redirecting...</div>}
      </div>
    </AdminPanelLayout>
  );
}