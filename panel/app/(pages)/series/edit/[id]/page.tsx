"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import AdminPanelLayout from "@/app/components/layout";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

export default function EditSeriesPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string; 
  
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: "",
    vj: "",
    overview: "",
    genres: [] as string[],
    releaseDate: "",
    trailer: "",
    thumbnail: "",
    cover: "",
    published: false,
  });
  const [allGenres, setAllGenres] = useState<{ id: string; name: string; tmdb_id: number }[]>([]);
  const [genresLoading, setGenresLoading] = useState(true);
  const [allVjs, setAllVjs] = useState<{ id: string; name: string }[]>([]);
  const [vjsLoading, setVjsLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    // Add guard clause to ensure id exists
    if (!id) {
      router.push('/series');
      return;
    }

    async function fetchData() {
      setLoading(true);
      // Fetch series
      const { data } = await supabase.from("series").select("*", { count: "exact" }).eq("id", id).single();
      if (data) {
        setForm({
          title: data.title || "",
          vj: data.vj_id || "",
          overview: data.description || "",
          genres: data.genre_ids || [],
          releaseDate: data.release_date || "",
          trailer: data.trailer_url || "",
          thumbnail: data.thumbnail_url || "",
          cover: data.cover_image_url || "",
          published: data.published || false,
        });
      }
      // Fetch genres
      const { data: genres } = await supabase.from("genres").select("id, name, tmdb_id").order("name");
      if (genres) setAllGenres(genres);
      setGenresLoading(false);
      // Fetch VJs
      const { data: vjs } = await supabase.from("vjs").select("id, name").order("name");
      if (vjs) setAllVjs(vjs);
      setVjsLoading(false);
      setLoading(false);
    }
    fetchData();
  }, [id, router]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return; // Guard clause
    
    setSubmitLoading(true);
    setSubmitError("");
    setSubmitSuccess(false);
    const updateData = {
      title: form.title,
      description: form.overview,
      release_date: form.releaseDate,
      cover_image_url: form.cover,
      trailer_url: form.trailer,
      genre_ids: form.genres.filter(id => id && id.trim() !== ''),
      vj_id: form.vj || null,
      published: form.published,
      thumbnail_url: form.thumbnail,
    };
    const { error } = await supabase.from("series").update(updateData).eq("id", id);
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

  if (loading) return <AdminPanelLayout><div className="p-8 text-gray-400 font-bold uppercase tracking-wider">Loading...</div></AdminPanelLayout>;

  return (
    <AdminPanelLayout>
      <div className="max-w-7xl mx-auto p-8 bg-[#1a1c21] rounded-2xl shadow-xl mt-8 border border-gray-800">
        <h1 className="text-2xl font-bold text-white uppercase tracking-wider mb-6">Edit Series</h1>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-8" onSubmit={handleSubmit}>
          <div className="space-y-5">
            <div>
              <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Title</label>
              <input name="title" value={form.title} onChange={handleChange} className="w-full p-3 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914]" placeholder="Enter title" />
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
                            <path d="M3 3l6 6m0-6L3 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </span>
                    );
                  })
                )}
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
              <textarea name="overview" value={form.overview} onChange={handleChange} className="w-full p-3 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914]" placeholder="Enter description" rows={5} />
            </div>
            <div>
              <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Release Date</label>
              <input type="date" name="releaseDate" value={form.releaseDate} onChange={handleChange} className="w-full p-3 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914]" />
            </div>
            <div>
              <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Trailer URL</label>
              <input name="trailer" value={form.trailer} onChange={handleChange} className="w-full p-3 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914]" placeholder="Enter trailer" />
            </div>
            <div className="mt-8">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-gray-800 pb-2">Status Options</h3>
              <label className="flex items-center gap-3 text-gray-300 font-medium cursor-pointer">
                <input type="checkbox" name="published" checked={form.published} onChange={handleChange} className="w-4 h-4 accent-[#E50914]" /> Published
              </label>
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
              {submitLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
        {submitError && <div className="text-[#E50914] mt-4 font-bold p-3 bg-red-900/20 border border-red-900 rounded-lg">{submitError}</div>}
        {submitSuccess && <div className="text-green-500 mt-4 font-bold p-3 bg-green-900/20 border border-green-900 rounded-lg">Series updated successfully! Redirecting...</div>}
      </div>
    </AdminPanelLayout>
  );
}