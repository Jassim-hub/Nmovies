'use client'
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AdminPanelLayout from "@/app/components/layout";
import Link from "next/link";
import { useRef } from "react";

interface Season {
  id: string;
  series_id: string;
  name: string;
  order: number;
  published: boolean;
  premium?: boolean;
  episode_count?: number;
  overview?: string;
}

interface FetchedSeason {
  name: string;
  order: number;
  published: boolean;
  episode_count?: number;
  overview?: string;
}

export default function ManageSeasonsPage() {
  const params = useParams() as { seriesId: string };
  const seriesId = params.seriesId;
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSeason, setNewSeason] = useState({
    name: "",
    order: "",
    published: false,
  });
  const [addLoading, setAddLoading] = useState(false);

  // For fetch/review modal
  const [fetchedSeasons, setFetchedSeasons] = useState<FetchedSeason[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Edit handlers
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [seasonToEdit, setSeasonToEdit] = useState<Season | null>(null);
  const [editForm, setEditForm] = useState<Partial<Season>>({});
  const [editLoading, setEditLoading] = useState(false);
  const editFormRef = useRef<HTMLFormElement>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [seasonToDelete, setSeasonToDelete] = useState<Season | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tmdbId, setTmdbId] = useState<string | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);

  useEffect(() => {
    async function fetchSeasons() {
      setLoading(true);
      const { data } = await supabase
        .from("seasons")
        .select("*")
        .eq("series_id", seriesId)
        .order("order");
      setSeasons(data || []);
      
      const { data: seriesData } = await supabase.from("series").select("tmdb_id").eq("id", seriesId).single();
      if (seriesData) setTmdbId(seriesData.tmdb_id);

      setLoading(false);
    }
    fetchSeasons();
  }, [seriesId]);

  async function handleFetchSingleSeason() {
    if (!tmdbId || !editForm.order) return;
    setFetchLoading(true);
    try {
      const res = await fetch(`/panel/api/series/fetch-season?seriesId=${tmdbId}&seasonNumber=${editForm.order}`);
      const data = await res.json();
      if (data && !data.error) {
        setEditForm(f => ({ ...f, name: data.name || f.name, overview: data.overview || f.overview }));
      } else if (data.error) {
        alert(data.error);
      }
    } catch(e) {
      alert("Failed to fetch season from TMDB");
    }
    setFetchLoading(false);
  }

  async function fetchFromTMDB() {
    const res = await fetch(`/panel/api/series/${seriesId}/fetch-seasons`, { method: "GET" });
    const data = await res.json();
    setFetchedSeasons(data.seasons || []);
    setShowReviewModal(true);
  }

  async function createSeasons() {
    const payload = fetchedSeasons.map(s => ({
      series_id: seriesId,
      name: s.name,
      order: Number(s.order),
      published: !!s.published,
      episode_count: s.episode_count ? Number(s.episode_count) : undefined,
      overview: s.overview || undefined,
    }));
    const { error } = await supabase.from("seasons").insert(payload);
    if (error) {
      alert(error.message);
      return;
    }
    setShowReviewModal(false);
    // Refresh seasons list
    const { data } = await supabase
      .from("seasons")
      .select("*")
      .eq("series_id", seriesId)
      .order("order");
    setSeasons(data || []);
  }

  // Edit handlers
  function openEditModal(season: Season) {
    setSeasonToEdit(season);
    setEditForm(season);
    setEditModalOpen(true);
  }
  function closeEditModal() {
    setEditModalOpen(false);
    setSeasonToEdit(null);
    setEditForm({});
  }
  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!seasonToEdit?.id) return;
    setEditLoading(true);
    const { error } = await supabase
      .from("seasons")
      .update(editForm)
      .eq("id", seasonToEdit.id);
    setEditLoading(false);
    if (error) { alert(error.message); return; }
    closeEditModal();
    // Refresh seasons
    const { data } = await supabase
      .from("seasons")
      .select("*")
      .eq("series_id", seriesId)
      .order("order");
    setSeasons(data || []);
  }
  function handleEditChange(field: keyof Season, value: string | boolean | number) {
    setEditForm(f => ({ ...f, [field]: value }));
  }
  // Delete handlers
  function openDeleteModal(season: Season) {
    setSeasonToDelete(season);
    setDeleteModalOpen(true);
  }
  function closeDeleteModal() {
    setSeasonToDelete(null);
    setDeleteModalOpen(false);
  }
  async function confirmDelete() {
    if (!seasonToDelete?.id) return;
    setDeletingId(seasonToDelete.id);
    const { error } = await supabase.from("seasons").delete().eq("id", seasonToDelete.id);
    setDeletingId(null);
    if (error) { alert(error.message); return; }
    setSeasons(seasons => seasons.filter(s => s.id !== seasonToDelete.id));
    closeDeleteModal();
  }

  return (
    <AdminPanelLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white uppercase tracking-wider">Manage Seasons</h1>
          <div className="flex gap-2">
            <Button onClick={() => setShowAddModal(true)} className="bg-[#E50914] hover:bg-[#b80710] text-white font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(229,9,20,0.2)]">Add Season</Button>
            <Button onClick={fetchFromTMDB} className="bg-[#E50914] hover:bg-[#b80710] text-white font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(229,9,20,0.2)]">Fetch All Seasons</Button>
          </div>
        </div>

        {/* Add Season Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="bg-[#1a1c21] border border-gray-800 text-white max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white uppercase tracking-wider font-bold">Add Season</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setAddLoading(true);
                await supabase.from("seasons").insert({
                  series_id: seriesId,
                  name: newSeason.name,
                  order: parseInt(newSeason.order, 10),
                  published: newSeason.published,
                });
                setAddLoading(false);
                setShowAddModal(false);
                setNewSeason({ name: "", order: "", published: false });
                const { data } = await supabase.from("seasons").select("*").eq("series_id", seriesId).order("order");
                setSeasons(data || []);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Season Name</label>
                <input
                  className="w-full p-2.5 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914]"
                  value={newSeason.name}
                  onChange={e => setNewSeason(s => ({ ...s, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Order</label>
                <input
                  type="number"
                  className="w-full p-2.5 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914]"
                  value={newSeason.order}
                  onChange={e => setNewSeason(s => ({ ...s, order: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-gray-300 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newSeason.published}
                    onChange={e => setNewSeason(s => ({ ...s, published: e.target.checked }))}
                    className="w-4 h-4 accent-[#E50914]"
                  />
                  Published
                </label>
              </div>
              <Button type="submit" className="w-full bg-[#E50914] hover:bg-[#b80710] text-white uppercase tracking-wider font-bold" disabled={addLoading}>
                {addLoading ? "Adding..." : "Add Season"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Review Fetched Seasons Modal */}
        <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
          <DialogContent className="bg-[#1a1c21] border border-gray-800 text-white max-h-[80vh] overflow-y-auto max-w-4xl">
            <DialogHeader>
              <DialogTitle className="text-white uppercase tracking-wider font-bold">Fetch Seasons</DialogTitle>
            </DialogHeader>
            <form onSubmit={e => { e.preventDefault(); createSeasons(); }}>
              <div className="overflow-x-auto">
                <table className="min-w-full mb-4">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="px-2 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Order</th>
                      <th className="px-2 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Season Name</th>
                      <th className="px-2 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Episodes</th>
                      <th className="px-2 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Overview</th>
                      <th className="px-2 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Publish</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {fetchedSeasons.map((season, idx) => (
                      <tr key={idx}>
                        <td className="px-2 py-2 text-white">{season.order}</td>
                        <td className="px-2 py-2">
                          <input
                            value={season.name}
                            onChange={e => {
                              const updated = [...fetchedSeasons];
                              updated[idx].name = e.target.value;
                              setFetchedSeasons(updated);
                            }}
                            className="w-full p-2 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914] text-sm"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={season.episode_count || ''}
                            onChange={e => {
                              const updated = [...fetchedSeasons];
                              updated[idx].episode_count = e.target.value ? Number(e.target.value) : undefined;
                              setFetchedSeasons(updated);
                            }}
                            className="w-20 p-2 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914] text-sm"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <textarea
                            value={season.overview || ''}
                            onChange={e => {
                              const updated = [...fetchedSeasons];
                              updated[idx].overview = e.target.value;
                              setFetchedSeasons(updated);
                            }}
                            className="w-full p-2 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914] text-sm h-10 resize-y"
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={season.published}
                            onChange={e => {
                              const updated = [...fetchedSeasons];
                              updated[idx].published = e.target.checked;
                              setFetchedSeasons(updated);
                            }}
                            className="w-4 h-4 accent-[#E50914]"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button type="button" variant="outline" onClick={() => setShowReviewModal(false)} className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white uppercase tracking-wider font-bold">
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#E50914] hover:bg-[#b80710] text-white uppercase tracking-wider font-bold shadow-[0_0_10px_rgba(229,9,20,0.2)]">Create</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Season Modal */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="bg-[#1a1c21] border border-gray-800 text-white">
            <DialogHeader>
              <DialogTitle className="text-white uppercase tracking-wider font-bold">Edit Season</DialogTitle>
            </DialogHeader>
            {seasonToEdit && (
              <form ref={editFormRef} onSubmit={handleEditSave} className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Season Name</label>
                  <input
                    className="w-full p-2.5 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914]"
                    value={editForm.name || ""}
                    onChange={e => handleEditChange("name", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Order</label>
                  <input
                    type="number"
                    className="w-full p-2.5 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914]"
                    value={editForm.order || ""}
                    onChange={e => handleEditChange("order", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-gray-300 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editForm.published}
                      onChange={e => handleEditChange("published", e.target.checked)}
                      className="w-4 h-4 accent-[#E50914]"
                    />
                    Published
                  </label>
                </div>
                <div>
                  <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Episode Count</label>
                  <input
                    type="number"
                    className="w-full p-2.5 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914]"
                    value={editForm.episode_count || ""}
                    onChange={e => handleEditChange("episode_count", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Overview</label>
                  <textarea
                    className="w-full p-2.5 rounded-lg bg-black border border-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914]"
                    value={editForm.overview || ""}
                    onChange={e => handleEditChange("overview", e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-gray-800 mt-2">
                  <Button 
                    type="button" 
                    onClick={handleFetchSingleSeason} 
                    className="bg-[#141414] border border-gray-700 hover:bg-gray-800 text-white uppercase tracking-wider font-bold text-xs" 
                    disabled={fetchLoading || !tmdbId || !editForm.order}
                  >
                    {fetchLoading ? "Fetching..." : "Fetch from TMDB"}
                  </Button>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={closeEditModal} className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white uppercase tracking-wider font-bold">Cancel</Button>
                    <Button type="submit" className="bg-[#E50914] hover:bg-[#b80710] text-white uppercase tracking-wider font-bold shadow-[0_0_10px_rgba(229,9,20,0.2)]" disabled={editLoading}>{editLoading ? "Saving..." : "Save"}</Button>
                  </div>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Season Modal */}
        <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <DialogContent className="bg-[#1a1c21] border border-gray-800 text-white">
            <DialogHeader>
              <DialogTitle className="text-[#E50914] uppercase tracking-wider font-bold">Delete Season</DialogTitle>
            </DialogHeader>
            {seasonToDelete && (
              <div className="space-y-4">
                <p className="text-gray-300">Are you sure you want to delete <span className="font-semibold text-white">{seasonToDelete.name}</span>?</p>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={closeDeleteModal} className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white uppercase tracking-wider font-bold">Cancel</Button>
                  <Button onClick={confirmDelete} className="bg-[#E50914] hover:bg-[#b80710] text-white uppercase tracking-wider font-bold" disabled={deletingId === seasonToDelete.id}>{deletingId === seasonToDelete.id ? "Deleting..." : "Delete"}</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <div className="bg-[#1a1c21] rounded-2xl shadow-xl border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-[#141414] border-b border-gray-800">
                <tr>
                  <th className="px-4 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">#</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Season Name</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Order</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Episodes</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Overview</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {seasons.map((season, idx) => (
                  <tr key={season.id} className="hover:bg-[#141414] transition-colors">
                    <td className="px-4 py-4 text-white text-sm">{idx + 1}</td>
                    <td className="px-4 py-4 text-white font-medium text-sm">{season.name}</td>
                    <td className="px-4 py-4 text-gray-400 text-sm">{season.order}</td>
                    <td className="px-4 py-4 text-gray-400 text-sm">{season.episode_count ?? ''}</td>
                    <td className="px-4 py-4 text-gray-400 text-sm max-w-xs truncate">{season.overview ?? ''}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        season.published 
                          ? 'bg-green-900/20 text-green-500 border border-green-900/50' 
                          : 'bg-gray-800 text-gray-400 border border-gray-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${season.published ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                        {season.published ? 'Published' : 'Unpublished'}
                      </span>
                      {season.premium ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-900/20 text-[#E50914] border border-red-900/50 ml-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#E50914]"></span>
                          Premium
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 flex gap-2">
                      <Button asChild className="bg-[#141414] border border-gray-700 hover:border-gray-500 hover:bg-[#E50914] text-white text-xs uppercase tracking-wider font-bold transition-all">
                        <Link href={`/series/manage_episodes/${season.id}`}>Manage Episodes</Link>
                      </Button>
                      <Button variant="outline" size="sm" className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white uppercase tracking-wider font-bold text-xs" onClick={() => openEditModal(season)}>Edit</Button>
                      <Button variant="destructive" size="sm" className="bg-[#141414] border border-red-900/50 text-[#E50914] hover:bg-[#E50914] hover:text-white uppercase tracking-wider font-bold text-xs transition-all" onClick={() => openDeleteModal(season)} disabled={deletingId === season.id}>{deletingId === season.id ? "Deleting..." : "Delete"}</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && seasons.length === 0 && (
              <div className="p-8 text-center text-gray-500 font-bold uppercase tracking-wider">No seasons found.</div>
            )}
          </div>
        </div>
        {loading && <div className="mt-4 text-gray-400 font-bold uppercase tracking-wider">Loading...</div>}
      </div>
    </AdminPanelLayout>
  );
}