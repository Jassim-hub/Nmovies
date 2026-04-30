'use client';
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import AdminPanelLayout from "@/app/components/layout";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";

interface Genre {
  id: string;
  name: string;
  tmdb_id: number;
}

interface MovieForm {
  title: string;
  description: string;
  release_date: string;
  cover_image_url: string;
  thumbnail_url: string;
  trailer_url: string;
  duration: string;
  genres: string[];
  vj_id: string;
  published: boolean;
  premium: boolean;
  recommend: boolean;
  popular: boolean;
  latest: boolean;
  remakes: boolean;
  exclusive_from_kilax_movies: boolean;
  video_url: string;
}

export default function EditMoviePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [allGenres, setAllGenres] = useState<Genre[]>([]);
  const [allVjs, setAllVjs] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState<MovieForm>({
    title: "",
    description: "",
    release_date: "",
    cover_image_url: "",
    thumbnail_url: "",
    trailer_url: "",
    duration: "",
    genres: [],
    vj_id: "",
    published: true,
    premium: false,
    recommend: false,
    popular: false,
    latest: false,
    remakes: false,
    exclusive_from_kilax_movies: false,
    video_url: "",
  });

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // Fetch genres and VJs
      const { data: genres } = await supabase.from("genres").select("id, name, tmdb_id").order("name");
      setAllGenres(genres || []);

      const { data: vjs } = await supabase.from("vjs").select("id, name").order("name");
      setAllVjs(vjs || []);

      // Fetch movie data
      const { data: movie, error } = await supabase.from("movies").select("*").eq("id", id).single();
      if (error || !movie) {
        setError("Movie not found");
        setLoading(false);
        return;
      }

      setForm({
        title: movie.title || "",
        description: movie.description || "",
        release_date: movie.release_date || "",
        cover_image_url: movie.cover_image_url || "",
        thumbnail_url: movie.thumbnail_url || "",
        trailer_url: movie.trailer_url || "",
        duration: movie.duration || "",
        genres: movie.genre_ids || [],
        vj_id: movie.vj_id || "",
        published: movie.published ?? true,
        premium: movie.premium ?? false,
        recommend: movie.recommend ?? false,
        popular: movie.popular ?? false,
        latest: movie.latest ?? false,
        remakes: movie.remakes ?? false,
        exclusive_from_kilax_movies: movie.exclusive_from_kilax_movies ?? false,
        video_url: movie.video_url || "",
      });
      setLoading(false);
    }
    fetchData();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setForm(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const updateData = {
      title: form.title,
      description: form.description,
      release_date: form.release_date,
      cover_image_url: form.cover_image_url,
      thumbnail_url: form.thumbnail_url,
      trailer_url: form.trailer_url,
      duration: form.duration,
      genre_ids: form.genres.filter(id => id && id.trim() !== ''),
      vj_id: form.vj_id || null,
      published: form.published,
      premium: form.premium,
      recommend: form.recommend,
      popular: form.popular,
      latest: form.latest,
      remakes: form.remakes,
      exclusive_from_kilax_movies: form.exclusive_from_kilax_movies,
      video_url: form.video_url,
    };
    const { error } = await supabase.from("movies").update(updateData).eq("id", id);
    setLoading(false);
    if (!error) {
      router.push("/movies");
    } else {
      setError(error.message);
    }
  };

  if (loading) return <AdminPanelLayout><div className="p-8 text-gray-400 font-bold uppercase tracking-wider">Loading...</div></AdminPanelLayout>;
  if (error) return <AdminPanelLayout><div className="p-8 text-[#E50914] font-bold uppercase tracking-wider">{error}</div></AdminPanelLayout>;

  return (
    <AdminPanelLayout>
      <div className="max-w-7xl mx-auto p-8 bg-[#1a1c21] rounded-2xl shadow-xl mt-8 border border-gray-800">
        <h1 className="text-2xl font-bold text-white uppercase tracking-wider mb-6">Edit Movie</h1>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-8" onSubmit={handleSubmit}>
          <div className="space-y-5">
            <div>
              <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Title</label>
              <input name="title" value={form.title} onChange={handleChange} className="w-full p-3 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914]" placeholder="Enter title" />
            </div>
            <div>
              <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">VJ</label>
              <select
                name="vj_id"
                value={form.vj_id}
                onChange={handleChange}
                className="w-full p-3 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914]"
              >
                <option value="">Select VJ</option>
                {allVjs.map(vj => (
                  <option key={vj.id} value={vj.id}>{vj.name}</option>
                ))}
              </select>
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
              </div>
            </div>
            <div>
              <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} className="w-full p-3 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914]" placeholder="Enter description" rows={5} />
            </div>
            <div>
              <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Release Date</label>
              <input type="date" name="release_date" value={form.release_date} onChange={handleChange} className="w-full p-3 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914]" />
            </div>
            <div>
              <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Duration</label>
              <input name="duration" value={form.duration} onChange={handleChange} className="w-full p-3 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914]" placeholder="Enter duration" />
            </div>
            <div>
              <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Trailer URL</label>
              <input name="trailer_url" value={form.trailer_url} onChange={handleChange} className="w-full p-3 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914]" placeholder="Enter trailer URL" />
            </div>
            <div>
              <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Video URL</label>
              <input name="video_url" value={form.video_url} onChange={handleChange} className="w-full p-3 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914]" placeholder="Enter video URL" required />
            </div>
          </div>
          <div className="space-y-5">
            <div>
              <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Thumbnail</label>
              <input name="thumbnail_url" value={form.thumbnail_url} onChange={handleChange} className="w-full p-3 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914]" placeholder="Enter thumbnail URL" />
              <div className="mt-3 bg-black border border-gray-800 rounded-lg flex items-center justify-center h-48 overflow-hidden">
                {form.thumbnail_url ? <img src={form.thumbnail_url} alt="thumbnail" className="h-full w-auto object-cover" /> : <span className="text-gray-600 text-sm">Preview</span>}
              </div>
            </div>
            <div>
              <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Cover Image</label>
              <input name="cover_image_url" value={form.cover_image_url} onChange={handleChange} className="w-full p-3 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914]" placeholder="Enter cover URL" />
              <div className="mt-3 bg-black border border-gray-800 rounded-lg flex items-center justify-center h-48 overflow-hidden">
                {form.cover_image_url ? <img src={form.cover_image_url} alt="cover" className="h-full w-full object-cover" /> : <span className="text-gray-600 text-sm">Preview</span>}
              </div>
            </div>
            {/* Status Toggles at bottom of right column */}
            <div className="mt-8">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-gray-800 pb-2">Status Options</h3>
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-3 text-gray-300 font-medium cursor-pointer">
                  <input type="checkbox" name="published" checked={form.published} onChange={handleChange} className="w-4 h-4 accent-[#E50914]" /> Published
                </label>
                <label className="flex items-center gap-3 text-gray-300 font-medium cursor-pointer">
                  <input type="checkbox" name="premium" checked={form.premium} onChange={handleChange} className="w-4 h-4 accent-[#E50914]" /> Premium
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
                  <input type="checkbox" name="exclusive_from_kilax_movies" checked={form.exclusive_from_kilax_movies} onChange={handleChange} className="w-4 h-4 accent-[#E50914]" /> Exclusive from NicholMovies
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <Button type="button" variant="outline" onClick={() => router.push("/movies")} className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white uppercase tracking-wider font-bold">Cancel</Button>
              <Button type="submit" className="bg-[#E50914] hover:bg-[#b80710] text-white uppercase tracking-wider font-bold border-none shadow-[0_0_10px_rgba(229,9,20,0.2)]" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </AdminPanelLayout>
  );
}