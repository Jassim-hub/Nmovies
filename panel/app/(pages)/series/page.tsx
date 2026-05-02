'use client'
import AdminPanelLayout from "@/app/components/layout";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import PushNotificationDialog from "@/components/PushNotificationDialog";
interface Series {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  published: boolean;
  recommend: boolean;
  popular: boolean;
  latest: boolean;
  remakes: boolean;
  exclusive_from_kilax: boolean;
  created_at: string;
}

export default function SeriesPage() {
  const [series, setSeries] = useState<Series[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<'all' | 'published' | 'unpublished'>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPushDialog, setShowPushDialog] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);

  useEffect(() => {
    async function fetchSeries() {
      const { data } = await supabase
        .from("series")
        .select("id, title, description, thumbnail_url, published, recommend, popular, latest, remakes, exclusive_from_kilax, created_at", { count: "exact" })
        .order('created_at', { ascending: false });
      setSeries(data || []);
    }
    fetchSeries();
  }, []);

  const filteredSeries = useMemo(() => {
    return series.filter(s => {
      const matchesSearch = s.title.toLowerCase().includes(search.toLowerCase());
      const matchesFilter =
        filter === 'all' ? true : filter === 'published' ? s.published : !s.published;
      return matchesSearch && matchesFilter;
    });
  }, [series, search, filter]);

  const handleDelete = (id: string) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  const handleSendPushNotification = (series: Series) => {
    setSelectedSeries(series);
    setShowPushDialog(true);
  };

  return (
    <AdminPanelLayout>
      <div className="flex flex-col gap-4 mb-6">
        {/* Header and Search */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1 className="text-2xl font-bold text-white uppercase tracking-wider">TV Series</h1>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <input
                type="text"
                placeholder="Search series..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-black border border-gray-800 text-white rounded-lg px-4 py-2 w-full sm:w-64 focus:outline-none focus:ring-1 focus:ring-[#E50914] placeholder-gray-600"
              />
              <Button asChild className="bg-[#E50914] hover:bg-[#b80710] text-white px-4 py-2 rounded-lg font-bold uppercase tracking-wider transition whitespace-nowrap shadow-[0_0_10px_rgba(229,9,20,0.2)] border-none">
                <Link href="/series/add">+ Add Series</Link>
              </Button>
            </div>
          </div>
          
          {/* Filter Buttons */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Button
              className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider whitespace-nowrap border ${filter === 'all' ? 'bg-[#E50914] text-white border-transparent shadow-[0_0_10px_rgba(229,9,20,0.3)]' : 'bg-transparent text-gray-400 border-gray-800 hover:border-[#E50914]'}`}
              onClick={() => setFilter('all')}
            >
              All ({series.length})
            </Button>
            <Button
              className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider whitespace-nowrap border ${filter === 'published' ? 'bg-[#E50914] text-white border-transparent shadow-[0_0_10px_rgba(229,9,20,0.3)]' : 'bg-transparent text-gray-400 border-gray-800 hover:border-[#E50914]'}`}
              onClick={() => setFilter('published')}
            >
              Published ({series.filter(s => s.published).length})
            </Button>
            <Button
              className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider whitespace-nowrap border ${filter === 'unpublished' ? 'bg-[#E50914] text-white border-transparent shadow-[0_0_10px_rgba(229,9,20,0.3)]' : 'bg-transparent text-gray-400 border-gray-800 hover:border-[#E50914]'}`}
              onClick={() => setFilter('unpublished')}
            >
              Unpublished ({series.filter(s => !s.published).length})
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Card View (visible on small screens) */}
      <div className="block lg:hidden">
        <div className="space-y-4">
          {filteredSeries.length === 0 ? (
            <div className="bg-[#1a1c21] rounded-2xl p-8 border border-gray-800 shadow-xl text-center">
              <p className="text-gray-500 italic">No series found.</p>
            </div>
          ) : (
            filteredSeries.map((s, idx) => (
              <div key={s.id} className="bg-[#1a1c21] rounded-2xl border border-gray-800 shadow-xl p-5">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <Image 
                      src={s.thumbnail_url || "/assets/images/placeholder.png"} 
                      alt={s.title} 
                      width={300} 
                      height={300} 
                      className="w-24 h-36 object-cover rounded-lg border border-gray-800"
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-white text-lg truncate pr-2">{s.title}</h3>
                        <span className="text-xs text-[#E50914] font-bold uppercase">#{idx + 1}</span>
                      </div>
                      <p className="text-gray-400 text-xs line-clamp-3 mb-3">{s.description}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                          s.published 
                            ? 'bg-green-900/20 text-green-500 border-green-900' 
                            : 'bg-gray-800 text-gray-400 border-gray-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.published ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                          {s.published ? 'Published' : 'Unpublished'}
                        </span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button className="bg-[#E50914] hover:bg-[#b80710] text-white px-3 py-1 text-xs font-bold uppercase tracking-wider border-none shadow-[0_0_10px_rgba(229,9,20,0.2)]">Actions</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#1a1c21] border-gray-800 text-white">
                          <DropdownMenuItem asChild className="hover:bg-[#141414] focus:bg-[#141414] focus:text-white cursor-pointer">
                            <Link href={`/series/manage_seasons/${s.id}`}>Manage Episodes</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="hover:bg-[#141414] focus:bg-[#141414] focus:text-white cursor-pointer">
                            <Link href={`/series/edit/${s.id}`}>Edit Details</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="hover:bg-[#141414] focus:bg-[#141414] focus:text-white cursor-pointer" onClick={() => handleSendPushNotification(s)}>
                            Send Push Notification
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(s.id)} className="text-[#E50914] focus:bg-red-900/20 focus:text-[#E50914] cursor-pointer font-bold">
                            Delete Series
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Desktop Table View (hidden on small screens) */}
      <div className="hidden lg:block bg-[#1a1c21] rounded-2xl p-0 border border-gray-800 shadow-xl overflow-x-auto">
        <table className="min-w-full text-left">
          <thead>
            <tr className="border-b border-gray-800 bg-[#141414]/50">
              <th className="px-6 py-4 text-[#E50914] font-bold uppercase tracking-wider text-xs">#</th>
              <th className="px-6 py-4 text-[#E50914] font-bold uppercase tracking-wider text-xs">Thumbnail</th>
              <th className="px-6 py-4 text-[#E50914] font-bold uppercase tracking-wider text-xs">Title</th>
              <th className="px-6 py-4 text-[#E50914] font-bold uppercase tracking-wider text-xs">Description</th>
              <th className="px-6 py-4 text-[#E50914] font-bold uppercase tracking-wider text-xs">Status</th>
              <th className="px-6 py-4 text-[#E50914] font-bold uppercase tracking-wider text-xs">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSeries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500 italic">No series found.</td>
              </tr>
            ) : (
              filteredSeries.map((s, idx) => (
                <tr key={s.id} className="border-b border-gray-800 hover:bg-[#141414] transition-colors">
                  <td className="px-6 py-4 text-gray-400 font-medium">{idx + 1}</td>
                  <td className="px-6 py-4">
                    <Image 
                      src={s.thumbnail_url || "/assets/images/placeholder.png"} 
                      alt={s.title} 
                      width={160} 
                      height={90} 
                      className="w-24 h-auto object-cover rounded-lg border border-gray-800"
                    />
                  </td>
                  <td className="px-6 py-4 text-white font-bold">{s.title}</td>
                  <td className="px-6 py-4 text-gray-400 max-w-xs"><p className="line-clamp-2 text-xs leading-relaxed">{s.description}</p></td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                      s.published 
                        ? 'bg-green-900/20 text-green-500 border-green-900' 
                        : 'bg-gray-800 text-gray-400 border-gray-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.published ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                      {s.published ? 'Published' : 'Unpublished'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="bg-[#E50914] hover:bg-[#b80710] text-white px-4 py-2 text-xs font-bold uppercase tracking-wider border-none shadow-[0_0_10px_rgba(229,9,20,0.2)]">Actions</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#1a1c21] border-gray-800 text-white min-w-[180px]">
                        <DropdownMenuItem asChild className="hover:bg-[#141414] focus:bg-[#141414] focus:text-white cursor-pointer py-2">
                          <Link href={`/series/manage_seasons/${s.id}`}>Manage Episodes</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="hover:bg-[#141414] focus:bg-[#141414] focus:text-white cursor-pointer py-2">
                          <Link href={`/series/edit/${s.id}`}>Edit Details</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="hover:bg-[#141414] focus:bg-[#141414] focus:text-white cursor-pointer py-2" onClick={() => handleSendPushNotification(s)}>
                          Send Push Notification
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(s.id)} className="text-[#E50914] focus:bg-red-900/20 focus:text-[#E50914] cursor-pointer font-bold py-2">
                          Delete Series
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="mx-4 max-w-md sm:max-w-lg bg-[#1a1c21] border-gray-800 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#E50914] font-bold uppercase tracking-wider text-xl">Delete Series</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-300">Are you absolutely sure you want to delete this series? This action cannot be undone and will remove all seasons and episodes.</p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} className="w-full sm:w-auto bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white uppercase tracking-wider font-bold">
              Cancel
            </Button>
            <Button onClick={async () => {
              if (deleteId) {
                await supabase.from("series").delete().eq("id", deleteId);
                setSeries(series => series.filter(s => s.id !== deleteId));
                setShowDeleteModal(false);
                setDeleteId(null);
              }
            }} className="bg-[#E50914] text-white hover:bg-[#b80710] w-full sm:w-auto uppercase tracking-wider font-bold border-none">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Push Notification Dialog */}
      <PushNotificationDialog
        open={showPushDialog}
        onOpenChange={setShowPushDialog}
        contentTitle={selectedSeries?.title}
        contentImage={selectedSeries?.thumbnail_url}
        contentType="series"
        contentId={selectedSeries?.id}
      />
    </AdminPanelLayout>
  );
}