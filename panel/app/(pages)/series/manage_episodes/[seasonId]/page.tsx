'use client'
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AdminPanelLayout from "@/app/components/layout";
import { useRef } from "react";

interface Episode {
  id?: string;
  season_id: string;
  episode_number: number;
  title: string;
  description: string;
  release_date: string;
  thumbnail_url?: string | null;
  video_url?: string | null;
  published: boolean;
  premium: boolean;
}

interface FetchedEpisode {
  episode_number: number;
  title: string;
  description: string;
  release_date: string;
  thumbnail_url?: string | null;
  video_url?: string | null;
  published: boolean;
  premium: boolean;
}

export default function ManageEpisodesPage() {
  const params = useParams() as { seasonId: string };
  const seasonId = params.seasonId;
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchedEpisodes, setFetchedEpisodes] = useState<FetchedEpisode[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [episodeToEdit, setEpisodeToEdit] = useState<Episode | null>(null);
  const [editForm, setEditForm] = useState<Partial<Episode>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const editFormRef = useRef<HTMLFormElement>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [episodeToDelete, setEpisodeToDelete] = useState<Episode | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<Partial<Episode>>({
    title: '',
    description: '',
    video_url: '',
    published: false,
    premium: false,
    release_date: new Date().toISOString().split('T')[0]
  });
  const [tmdbId, setTmdbId] = useState<string | null>(null);
  const [seasonOrder, setSeasonOrder] = useState<number | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);

  useEffect(() => {
    async function fetchEpisodes() {
      setLoading(true);
      const { data } = await supabase
        .from("episodes")
        .select("*")
        .eq("season_id", seasonId)
        .order("episode_number");
      setEpisodes(data || []);
      
      const { data: seasonData } = await supabase.from("seasons").select("order, series_id").eq("id", seasonId).single();
      if (seasonData) {
        setSeasonOrder(seasonData.order);
        const { data: seriesData } = await supabase.from("series").select("tmdb_id").eq("id", seasonData.series_id).single();
        if (seriesData) setTmdbId(seriesData.tmdb_id);
      }

      setLoading(false);
    }
    fetchEpisodes();
  }, [seasonId]);

  async function handleFetchSingleEpisode() {
    if (!tmdbId || seasonOrder === null || !editForm.episode_number) return;
    setFetchLoading(true);
    try {
      const res = await fetch(`/panel/api/series/fetch-episode?seriesId=${tmdbId}&seasonNumber=${seasonOrder}&episodeNumber=${editForm.episode_number}`);
      const data = await res.json();
      if (data && !data.error) {
        setEditForm(f => ({ 
          ...f, 
          title: data.name || f.title, 
          description: data.overview || f.description,
          thumbnail_url: data.still_path ? `https://image.tmdb.org/t/p/original${data.still_path}` : f.thumbnail_url,
          release_date: data.air_date || f.release_date
        }));
      } else if (data.error) {
        alert(data.error);
      }
    } catch(e) {
      alert("Failed to fetch episode from TMDB");
    }
    setFetchLoading(false);
  }

  async function fetchFromTMDB() {
    const url = `/panel/api/seasons/${seasonId}/fetch-episodes`;
    const res = await fetch(url, { method: "GET" });
    let data;
    try {
      data = await res.json();
    } catch (e) {
      data = {};
    }
    setFetchedEpisodes(data.episodes || []);
    setShowReviewModal(true);
  }

  async function createEpisodes() {
    const payload = fetchedEpisodes.map(ep => ({
      ...ep,
      season_id: seasonId,
      thumbnail_url: ep.thumbnail_url || null,
      video_url: ep.video_url || null,
    }));
    const { error } = await supabase.from("episodes").insert(payload);
    if (error) { alert(error.message); return; }
    setShowReviewModal(false);
    const { data } = await supabase.from("episodes").select("*").eq("season_id", seasonId).order("episode_number");
    setEpisodes(data || []);
  }

  function handleEpisodeEdit(idx: number, field: keyof FetchedEpisode, value: string | boolean) {
    setFetchedEpisodes(episodes => {
      const copy = [...episodes];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  }

  function openEditModal(ep: Episode) {
    setEpisodeToEdit(ep);
    setEditForm(ep);
    setEditModalOpen(true);
  }
  function closeEditModal() {
    setEditModalOpen(false);
    setEpisodeToEdit(null);
    setEditForm({});
  }
  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!episodeToEdit?.id) return;
    const { error } = await supabase
      .from("episodes")
      .update(editForm)
      .eq("id", episodeToEdit.id);
    if (error) { alert(error.message); return; }
    closeEditModal();
    const { data } = await supabase.from("episodes").select("*").eq("season_id", seasonId).order("episode_number");
    setEpisodes(data || []);
  }
  function handleEditChange(field: keyof Episode, value: string | boolean) {
    setEditForm(f => ({ ...f, [field]: value }));
  }
  function openDeleteModal(ep: Episode) {
    setEpisodeToDelete(ep);
    setDeleteModalOpen(true);
  }
  function closeDeleteModal() {
    setEpisodeToDelete(null);
    setDeleteModalOpen(false);
  }
  async function confirmDelete() {
    if (!episodeToDelete?.id) return;
    setDeletingId(episodeToDelete.id);
    const { error } = await supabase.from("episodes").delete().eq("id", episodeToDelete.id);
    setDeletingId(null);
    if (error) { alert(error.message); return; }
    setEpisodes(eps => eps.filter(ep => ep.id !== episodeToDelete.id));
    closeDeleteModal();
  }

  function openCreateModal() {
    const maxEpisodeNumber = episodes.length > 0 ? Math.max(...episodes.map(ep => ep.episode_number)) : 0;
    const nextEpisodeNumber = maxEpisodeNumber + 1;
    setCreateForm({
      title: `Episode ${nextEpisodeNumber}`,
      description: '',
      video_url: '',
      published: false,
      premium: false,
      release_date: new Date().toISOString().split('T')[0]
    });
    setCreateModalOpen(true);
  }
  
  function closeCreateModal() {
    setCreateModalOpen(false);
    setCreateForm({
      title: '',
      description: '',
      video_url: '',
      published: false,
      premium: false,
      release_date: new Date().toISOString().split('T')[0]
    });
  }
  
  async function handleCreateSave(e: React.FormEvent) {
    e.preventDefault();
    const maxEpisodeNumber = episodes.length > 0 ? Math.max(...episodes.map(ep => ep.episode_number)) : 0;
    const nextEpisodeNumber = maxEpisodeNumber + 1;
    const newEpisode = {
      season_id: seasonId,
      episode_number: nextEpisodeNumber,
      title: createForm.title || `Episode ${nextEpisodeNumber}`,
      description: createForm.description || '',
      video_url: createForm.video_url || null,
      published: createForm.published || false,
      premium: createForm.premium || false,
      release_date: createForm.release_date || new Date().toISOString().split('T')[0],
      thumbnail_url: null
    };
    const { error } = await supabase.from("episodes").insert([newEpisode]);
    if (error) { alert(error.message); return; }
    closeCreateModal();
    const { data } = await supabase.from("episodes").select("*").eq("season_id", seasonId).order("episode_number");
    setEpisodes(data || []);
  }
  
  function handleCreateChange(field: keyof Episode, value: string | boolean) {
    setCreateForm(f => ({ ...f, [field]: value }));
  }

  return (
    <AdminPanelLayout>
      <div className="p-4 md:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <h1 className="text-2xl font-bold text-white uppercase tracking-wider">Manage Episodes</h1>
          <div className="flex gap-2">
            <Button onClick={fetchFromTMDB} className="bg-[#141414] border border-gray-700 hover:bg-gray-800 text-white font-bold uppercase tracking-wider">
              Fetch Episodes
            </Button>
            <Button onClick={openCreateModal} className="bg-[#E50914] hover:bg-[#b80710] text-white font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(229,9,20,0.2)]">
              + Create Episode
            </Button>
          </div>
        </div>

        {/* Review Fetched Episodes Modal */}
        <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
          <DialogContent className="bg-[#1a1c21] border border-gray-800 text-white w-[98vw] sm:w-[95vw] md:w-[90vw] lg:w-[85vw] xl:w-[80vw] max-w-none h-[90vh] flex flex-col p-0">
            <DialogHeader className="px-6 py-4 border-b border-gray-800">
              <DialogTitle className="text-xl text-white uppercase tracking-wider font-bold">Review Fetched Episodes</DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-auto px-6 py-4">
              <form onSubmit={e => { e.preventDefault(); createEpisodes(); }} className="h-full flex flex-col">
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto flex-1">
                  <table className="min-w-full w-full">
                    <thead className="sticky top-0 bg-[#141414] border-b border-gray-800 z-10">
                      <tr>
                        <th className="text-left p-3 text-xs font-bold text-gray-400 uppercase tracking-wider min-w-[100px]">Thumbnail</th>
                        <th className="text-left p-3 text-xs font-bold text-gray-400 uppercase tracking-wider min-w-[200px]">Title</th>
                        <th className="text-left p-3 text-xs font-bold text-gray-400 uppercase tracking-wider min-w-[300px]">Description</th>
                        <th className="text-left p-3 text-xs font-bold text-gray-400 uppercase tracking-wider min-w-[120px]">Release Date</th>
                        <th className="text-left p-3 text-xs font-bold text-gray-400 uppercase tracking-wider min-w-[180px]">Video URL</th>
                        <th className="text-center p-3 text-xs font-bold text-gray-400 uppercase tracking-wider min-w-[100px]">Published</th>
                        <th className="text-center p-3 text-xs font-bold text-gray-400 uppercase tracking-wider min-w-[100px]">Premium</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {fetchedEpisodes.map((ep, idx) => (
                        <tr key={idx} className="hover:bg-[#141414]">
                          <td className="p-3">
                            {ep.thumbnail_url ? (
                              <Image 
                                src={ep.thumbnail_url} 
                                alt={`${ep.title} thumbnail`}
                                width={64}
                                height={64}
                                className="w-16 h-16 object-cover rounded-lg border border-gray-700"
                              />
                            ) : (
                              <div className="w-16 h-16 bg-black rounded-lg border border-gray-800 flex items-center justify-center text-xs text-gray-600">
                                No img
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <Input 
                              value={ep.title} 
                              onChange={e => handleEpisodeEdit(idx, 'title', e.target.value)}
                              className="bg-black border-gray-800 text-white focus-visible:ring-[#E50914] min-w-[180px]"
                            />
                          </td>
                          <td className="p-3">
                            <Textarea 
                              value={ep.description} 
                              onChange={e => handleEpisodeEdit(idx, 'description', e.target.value)}
                              className="bg-black border-gray-800 text-white focus-visible:ring-[#E50914] min-w-[280px] min-h-[60px] resize-y"
                              rows={2}
                            />
                          </td>
                          <td className="p-3">
                            <Input 
                              type="date"
                              value={ep.release_date} 
                              onChange={e => handleEpisodeEdit(idx, 'release_date', e.target.value)}
                              className="bg-black border-gray-800 text-white focus-visible:ring-[#E50914] min-w-[130px] block w-full [color-scheme:dark]"
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              value={ep.video_url || ''}
                              onChange={e => handleEpisodeEdit(idx, 'video_url', e.target.value)}
                              className="bg-black border-gray-800 text-white focus-visible:ring-[#E50914] min-w-[160px]"
                              placeholder="Video URL"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input type="checkbox" checked={!!ep.published} onChange={e => handleEpisodeEdit(idx, 'published', e.target.checked)} className="w-4 h-4 accent-[#E50914]" />
                          </td>
                          <td className="p-3 text-center">
                            <input type="checkbox" checked={!!ep.premium} onChange={e => handleEpisodeEdit(idx, 'premium', e.target.checked)} className="w-4 h-4 accent-[#E50914]" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile/Tablet Card View */}
                <div className="lg:hidden space-y-4 flex-1 overflow-auto">
                  {fetchedEpisodes.map((ep, idx) => (
                    <div key={idx} className="bg-black rounded-lg p-4 space-y-3 border border-gray-800">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 space-y-3">
                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Title</label>
                            <Input 
                              value={ep.title} 
                              onChange={e => handleEpisodeEdit(idx, 'title', e.target.value)}
                              className="bg-[#1a1c21] border-gray-700 text-white focus-visible:ring-[#E50914]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Release Date</label>
                            <Input 
                              type="date"
                              value={ep.release_date} 
                              onChange={e => handleEpisodeEdit(idx, 'release_date', e.target.value)}
                              className="bg-[#1a1c21] border-gray-700 text-white focus-visible:ring-[#E50914] block w-full [color-scheme:dark]"
                            />
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {ep.thumbnail_url ? (
                            <Image 
                              src={ep.thumbnail_url} 
                              alt={`${ep.title} thumbnail`}
                              width={80}
                              height={80}
                              className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-gray-700"
                            />
                          ) : (
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#1a1c21] rounded-lg border border-gray-700 flex items-center justify-center text-xs text-gray-600">
                              No image
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Description</label>
                        <Textarea 
                          value={ep.description} 
                          onChange={e => handleEpisodeEdit(idx, 'description', e.target.value)}
                          className="bg-[#1a1c21] border-gray-700 text-white focus-visible:ring-[#E50914] min-h-[80px] resize-y"
                          rows={3}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Video URL</label>
                        <Input
                          value={ep.video_url || ''}
                          onChange={e => handleEpisodeEdit(idx, 'video_url', e.target.value)}
                          placeholder="Video URL"
                          className="bg-[#1a1c21] border-gray-700 text-white focus-visible:ring-[#E50914]"
                        />
                      </div>
                      <div className="flex gap-4 mt-2">
                        <label className="flex items-center gap-2 text-sm text-gray-300">
                          <input type="checkbox" checked={!!ep.published} onChange={e => handleEpisodeEdit(idx, 'published', e.target.checked)} className="accent-[#E50914]" /> Published
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-300">
                          <input type="checkbox" checked={!!ep.premium} onChange={e => handleEpisodeEdit(idx, 'premium', e.target.checked)} className="accent-[#E50914]" /> Premium
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-gray-800 mt-4">
                  <Button type="button" variant="outline" onClick={() => setShowReviewModal(false)} className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white uppercase tracking-wider font-bold flex-1 sm:flex-none order-2 sm:order-1">
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-[#E50914] hover:bg-[#b80710] text-white uppercase tracking-wider font-bold shadow-[0_0_10px_rgba(229,9,20,0.2)] flex-1 sm:flex-none order-1 sm:order-2">
                    Create Episodes ({fetchedEpisodes.length})
                  </Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>

        {/* Episodes Table - Also made responsive */}
        <div className="bg-[#1a1c21] rounded-2xl shadow-xl border border-gray-800 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-[#141414] border-b border-gray-800">
                <tr>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">#</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Thumbnail</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Title</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Release Date</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {episodes.map((ep) => (
                  <tr key={ep.id} className="hover:bg-[#141414] transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {ep.episode_number}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {ep.thumbnail_url ? (
                        <Image 
                          src={ep.thumbnail_url} 
                          alt={`${ep.title} thumbnail`}
                          width={64}
                          height={64}
                          className="w-16 h-16 object-cover rounded-lg border border-gray-700"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-black rounded-lg border border-gray-800 flex items-center justify-center text-xs text-gray-600">No image</div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-white max-w-xs font-medium">
                      {ep.title}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-400 max-w-xs">
                      <div className="truncate" title={ep.description}>
                        {ep.description}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-400">
                      {ep.release_date}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        ep.published 
                          ? 'bg-green-900/20 text-green-500 border border-green-900/50' 
                          : 'bg-gray-800 text-gray-400 border border-gray-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${ep.published ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                        {ep.published ? 'Published' : 'Unpublished'}
                      </span>
                      {ep.premium ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-900/20 text-[#E50914] border border-red-900/50 ml-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#E50914]"></span>
                          Premium
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <Button variant="outline" size="sm" className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white uppercase tracking-wider font-bold text-xs" onClick={() => openEditModal(ep)}>Edit</Button>
                      <Button variant="destructive" size="sm" className="bg-[#141414] border border-red-900/50 text-[#E50914] hover:bg-[#E50914] hover:text-white uppercase tracking-wider font-bold text-xs transition-all" onClick={() => openDeleteModal(ep)} disabled={deletingId === ep.id}>{deletingId === ep.id ? "Deleting..." : "Delete"}</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-800">
            {episodes.map((ep) => (
              <div key={ep.id} className="p-4 hover:bg-[#141414] transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-sm font-bold text-gray-400 bg-black px-2 py-1 rounded border border-gray-800">#{ep.episode_number}</span>
                      {ep.thumbnail_url ? (
                        <Image 
                          src={ep.thumbnail_url} 
                          alt={`${ep.title} thumbnail`}
                          width={48}
                          height={48}
                          className="w-12 h-12 object-cover rounded border border-gray-700"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-black rounded border border-gray-800 flex items-center justify-center text-xs text-gray-600">No img</div>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white mt-1">{ep.title}</h3>
                    <p className="text-sm text-gray-400 mt-1 line-clamp-2">{ep.description}</p>
                    <p className="text-xs text-gray-500 mt-2 font-medium">Release: {ep.release_date}</p>
                  </div>
                </div>
                <div className="flex space-x-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1 bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white uppercase tracking-wider font-bold text-xs" onClick={() => openEditModal(ep)}>Edit</Button>
                  <Button variant="destructive" size="sm" className="flex-1 bg-[#141414] border border-red-900/50 text-[#E50914] hover:bg-[#E50914] hover:text-white uppercase tracking-wider font-bold text-xs transition-all" onClick={() => openDeleteModal(ep)} disabled={deletingId === ep.id}>{deletingId === ep.id ? "Deleting..." : "Delete"}</Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center mt-8 p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E50914]"></div>
            <span className="ml-3 text-gray-400 font-bold uppercase tracking-wider text-sm">Loading episodes...</span>
          </div>
        )}

        {!loading && episodes.length === 0 && (
          <div className="text-center py-12 bg-[#1a1c21] rounded-2xl border border-gray-800 mt-6">
            <div className="text-gray-500 mb-2 font-bold uppercase tracking-wider">No episodes found</div>
            <p className="text-sm text-gray-600">Try fetching episodes from TMDB or create one manually.</p>
          </div>
        )}
      </div>

      {/* Edit Episode Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="bg-[#1a1c21] border border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white uppercase tracking-wider font-bold">Edit Episode</DialogTitle>
          </DialogHeader>
          {episodeToEdit && (
            <form ref={editFormRef} onSubmit={handleEditSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Title</label>
                <Input
                  value={editForm.title || ""}
                  onChange={e => handleEditChange("title", e.target.value)}
                  className="bg-black border-gray-800 text-white focus-visible:ring-[#E50914]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Description</label>
                <Textarea
                  value={editForm.description || ""}
                  onChange={e => handleEditChange("description", e.target.value)}
                  className="bg-black border-gray-800 text-white focus-visible:ring-[#E50914]"
                  rows={4}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Release Date</label>
                <Input
                  type="date"
                  value={editForm.release_date || ""}
                  onChange={e => handleEditChange("release_date", e.target.value)}
                  className="bg-black border-gray-800 text-white focus-visible:ring-[#E50914] block w-full [color-scheme:dark]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Thumbnail URL</label>
                <Input
                  value={editForm.thumbnail_url || ""}
                  onChange={e => handleEditChange("thumbnail_url", e.target.value)}
                  className="bg-black border-gray-800 text-white focus-visible:ring-[#E50914]"
                  placeholder="Thumbnail URL"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Video URL</label>
                <Input
                  value={editForm.video_url || ""}
                  onChange={e => handleEditChange("video_url", e.target.value)}
                  className="bg-black border-gray-800 text-white focus-visible:ring-[#E50914]"
                  placeholder="Video URL"
                />
              </div>
              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-2 text-sm text-gray-300 font-medium cursor-pointer">
                  <input type="checkbox" checked={!!editForm.published} onChange={e => handleEditChange("published", e.target.checked)} className="w-4 h-4 accent-[#E50914]" /> Published
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300 font-medium cursor-pointer">
                  <input type="checkbox" checked={!!editForm.premium} onChange={e => handleEditChange("premium", e.target.checked)} className="w-4 h-4 accent-[#E50914]" /> Premium
                </label>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-gray-800 mt-2">
                <Button 
                  type="button" 
                  onClick={handleFetchSingleEpisode} 
                  className="bg-[#141414] border border-gray-700 hover:bg-gray-800 text-white uppercase tracking-wider font-bold text-xs" 
                  disabled={fetchLoading || !tmdbId || seasonOrder === null || !editForm.episode_number}
                >
                  {fetchLoading ? "Fetching..." : "Fetch from TMDB"}
                </Button>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={closeEditModal} className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white uppercase tracking-wider font-bold">Cancel</Button>
                  <Button type="submit" className="bg-[#E50914] hover:bg-[#b80710] text-white uppercase tracking-wider font-bold shadow-[0_0_10px_rgba(229,9,20,0.2)]">Save</Button>
                </div>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Episode Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="bg-[#1a1c21] border border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-[#E50914] uppercase tracking-wider font-bold">Delete Episode</DialogTitle>
          </DialogHeader>
          {episodeToDelete && (
            <div className="space-y-4">
              <p className="text-gray-300">Are you sure you want to delete <span className="font-bold text-white">{episodeToDelete.title}</span>?</p>
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-800">
                <Button variant="outline" onClick={closeDeleteModal} className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white uppercase tracking-wider font-bold">Cancel</Button>
                <Button onClick={confirmDelete} className="bg-[#E50914] hover:bg-[#b80710] text-white uppercase tracking-wider font-bold shadow-[0_0_10px_rgba(229,9,20,0.2)]" disabled={deletingId === episodeToDelete.id}>{deletingId === episodeToDelete.id ? "Deleting..." : "Delete"}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Create Episode Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="bg-[#1a1c21] border border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white uppercase tracking-wider font-bold">Create New Episode</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSave} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Episode Number</label>
              <Input
                value={episodes.length > 0 ? Math.max(...episodes.map(ep => ep.episode_number)) + 1 : 1}
                disabled
                className="bg-black border-gray-800 text-gray-500 font-bold"
              />
              <p className="text-xs text-gray-500 mt-1 italic">Auto-incremented based on existing episodes</p>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Title</label>
              <Input
                value={createForm.title || ""}
                onChange={e => handleCreateChange("title", e.target.value)}
                placeholder="Episode title"
                className="bg-black border-gray-800 text-white focus-visible:ring-[#E50914]"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Description</label>
              <Textarea
                value={createForm.description || ""}
                onChange={e => handleCreateChange("description", e.target.value)}
                placeholder="Episode description"
                className="bg-black border-gray-800 text-white focus-visible:ring-[#E50914]"
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Thumbnail URL</label>
              <Input
                value={createForm.thumbnail_url || ""}
                onChange={e => handleCreateChange("thumbnail_url", e.target.value)}
                placeholder="Thumbnail URL"
                className="bg-black border-gray-800 text-white focus-visible:ring-[#E50914]"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Video URL</label>
              <Input
                value={createForm.video_url || ""}
                onChange={e => handleCreateChange("video_url", e.target.value)}
                placeholder="https://example.com/video.mp4"
                type="url"
                className="bg-black border-gray-800 text-white focus-visible:ring-[#E50914]"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Release Date</label>
              <Input
                type="date"
                value={createForm.release_date || ""}
                onChange={e => handleCreateChange("release_date", e.target.value)}
                className="bg-black border-gray-800 text-white focus-visible:ring-[#E50914] block w-full [color-scheme:dark]"
                required
              />
            </div>
            
            <div className="flex gap-4 pt-2">
              <label className="flex items-center gap-2 text-sm text-gray-300 font-medium cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={!!createForm.published} 
                  onChange={e => handleCreateChange("published", e.target.checked)} 
                  className="w-4 h-4 accent-[#E50914]"
                /> 
                Published
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300 font-medium cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={!!createForm.premium} 
                  onChange={e => handleCreateChange("premium", e.target.checked)} 
                  className="w-4 h-4 accent-[#E50914]"
                /> 
                Premium
              </label>
            </div>
            
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-800 mt-2">
              <Button type="button" variant="outline" onClick={closeCreateModal} className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white uppercase tracking-wider font-bold">
                Cancel
              </Button>
              <Button type="submit" className="bg-[#E50914] hover:bg-[#b80710] text-white uppercase tracking-wider font-bold shadow-[0_0_10px_rgba(229,9,20,0.2)]">
                Create Episode
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminPanelLayout>
  );
}