'use client'
import AdminPanelLayout from "@/app/components/layout";
import { Button } from "@/components/ui/button";
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
import Image from "next/image";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import PushNotificationDialog from "@/components/PushNotificationDialog";

interface Movie {
  id: string;
  title: string;
  description: string;
  cover_image_url: string;
  thumbnail_url: string;
  published: boolean;
  premium: boolean;
  created_at?: string;
}

interface EditForm {
  title: string;
  description: string;
  published: boolean;
  premium: boolean;
}

export default function MoviesPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "published" | "unpublished">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    title: "",
    description: "",
    published: false,
    premium: false
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPushDialog, setShowPushDialog] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 100;

  useEffect(() => {
    async function fetchMovies() {
      // Get total count
      const { count } = await supabase.from("movies").select("id", { count: "exact", head: true });
      setTotal(count || 0);
      // Fetch current page
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data } = await supabase
        .from("movies")
        .select("id, title, description, cover_image_url, thumbnail_url, published, premium")
        .order("created_at", { ascending: false })
        .range(from, to);
      setMovies(data || []);
    }
    fetchMovies();
  }, [page]);

  const filteredMovies = useMemo(() => {
    return movies.filter((m) => {
      const matchesSearch = m.title.toLowerCase().includes(search.toLowerCase());
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "published"
          ? m.published
          : !m.published;
      return matchesSearch && matchesFilter;
    });
  }, [movies, search, filter]);

  const handleEdit = (movie: Movie) => {
    setEditingId(movie.id);
    setEditForm({
      title: movie.title,
      description: movie.description,
      published: movie.published,
      premium: movie.premium,
    });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleEditSave = async (id: string) => {
    await supabase.from("movies").update(editForm).eq("id", id);
    setEditingId(null);
    // Refresh movies
    const { data } = await supabase
      .from("movies")
      .select("id, title, description, cover_image_url, thumbnail_url, published, premium")
      .order("created_at", { ascending: false });
    setMovies(data || []);
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  const handleSendPushNotification = (movie: Movie) => {
    setSelectedMovie(movie);
    setShowPushDialog(true);
  };

  return (
    <AdminPanelLayout>
      <div className="flex flex-col gap-4 mb-6 px-4 sm:px-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-white uppercase tracking-wider">Movies</h1>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <input
              type="text"
              placeholder="Search movies..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-black border border-gray-800 text-white rounded-lg px-4 py-2 w-full sm:w-64 focus:outline-none focus:ring-1 focus:ring-[#E50914] placeholder-gray-600"
            />
            <Button asChild className="bg-[#E50914] hover:bg-[#b80710] text-white px-4 py-2 rounded-lg font-bold uppercase tracking-wider transition w-full sm:w-auto shadow-[0_0_10px_rgba(229,9,20,0.2)] border-none">
              <a href="/movies/add">+ Add Movie</a>
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider border ${filter === 'all' ? 'bg-[#E50914] text-white border-transparent shadow-[0_0_10px_rgba(229,9,20,0.3)]' : 'bg-transparent text-gray-400 border-gray-800 hover:border-[#E50914]'}`}
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider border ${filter === 'published' ? 'bg-[#E50914] text-white border-transparent shadow-[0_0_10px_rgba(229,9,20,0.3)]' : 'bg-transparent text-gray-400 border-gray-800 hover:border-[#E50914]'}`}
            onClick={() => setFilter('published')}
          >
            Published
          </Button>
          <Button
            className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider border ${filter === 'unpublished' ? 'bg-[#E50914] text-white border-transparent shadow-[0_0_10px_rgba(229,9,20,0.3)]' : 'bg-transparent text-gray-400 border-gray-800 hover:border-[#E50914]'}`}
            onClick={() => setFilter('unpublished')}
          >
            Unpublished
          </Button>
        </div>
      </div>

      {/* Desktop Table View */}
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
            {filteredMovies.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500 italic">No movies found.</td>
              </tr>
            ) : (
              filteredMovies.map((movie, idx) => (
                <tr key={movie.id} className="border-b border-gray-800 hover:bg-[#141414] transition-colors">
                  <td className="px-6 py-4 text-gray-400 font-medium">{(page - 1) * pageSize + idx + 1}</td>
                  <td className="px-6 py-4">
                    <Image 
                      src={movie.thumbnail_url || "/assets/images/placeholder.png"} 
                      alt={movie.title} 
                      width={160} 
                      height={90} 
                      className="w-24 h-auto object-cover rounded-lg border border-gray-800"
                    />
                  </td>
                  <td className="px-6 py-4 text-white font-bold max-w-[200px]">
                    {editingId === movie.id ? (
                      <input
                        name="title"
                        value={editForm.title}
                        onChange={handleEditChange}
                        className="bg-black border border-gray-700 rounded px-3 py-2 w-full text-white focus:outline-none focus:ring-1 focus:ring-[#E50914]"
                      />
                    ) : (
                      movie.title
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-400 max-w-xs">
                    {editingId === movie.id ? (
                      <textarea
                        name="description"
                        value={editForm.description}
                        onChange={handleEditChange}
                        className="bg-black border border-gray-700 rounded px-3 py-2 w-full text-white focus:outline-none focus:ring-1 focus:ring-[#E50914]"
                        rows={3}
                      />
                    ) : (
                      <p className="line-clamp-2 text-xs leading-relaxed">{movie.description}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === movie.id ? (
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm text-gray-300">
                          <input
                            type="checkbox"
                            name="published"
                            checked={editForm.published}
                            onChange={handleEditChange}
                            className="accent-[#E50914]"
                          /> Published
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-300">
                          <input
                            type="checkbox"
                            name="premium"
                            checked={editForm.premium}
                            onChange={handleEditChange}
                            className="accent-[#E50914]"
                          /> Premium
                        </label>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] uppercase tracking-wider font-bold border w-fit ${
                          movie.published 
                            ? 'bg-green-900/20 text-green-500 border-green-900' 
                            : 'bg-gray-800 text-gray-400 border-gray-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${movie.published ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                          {movie.published ? 'Published' : 'Unpublished'}
                        </span>
                        {movie.premium ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] uppercase tracking-wider font-bold border bg-[#E50914]/10 text-[#E50914] border-[#E50914]/50 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#E50914]"></span>
                            Premium
                          </span>
                        ) : null}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="bg-[#E50914] hover:bg-[#b80710] text-white px-4 py-2 text-xs font-bold uppercase tracking-wider border-none shadow-[0_0_10px_rgba(229,9,20,0.2)]">Actions</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#1a1c21] border-gray-800 text-white min-w-[180px]">
                        {editingId === movie.id ? (
                          <DropdownMenuItem onClick={() => handleEditSave(movie.id)} className="hover:bg-[#141414] focus:bg-[#141414] focus:text-green-500 cursor-pointer py-2 text-green-500 font-bold">Save Changes</DropdownMenuItem>
                        ) : (
                          <>
                            <DropdownMenuItem onClick={() => handleEdit(movie)} className="hover:bg-[#141414] focus:bg-[#141414] focus:text-white cursor-pointer py-2">Quick Edit</DropdownMenuItem>
                            <DropdownMenuItem asChild className="hover:bg-[#141414] focus:bg-[#141414] focus:text-white cursor-pointer py-2">
                              <a href={`/movies/edit/${movie.id}`}>Edit in Full Page</a>
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem onClick={() => handleSendPushNotification(movie)} className="hover:bg-[#141414] focus:bg-[#141414] focus:text-white cursor-pointer py-2">Send Push Notification</DropdownMenuItem>
                        <DropdownMenuItem className="text-[#E50914] focus:bg-red-900/20 focus:text-[#E50914] cursor-pointer font-bold py-2" onClick={() => handleDelete(movie.id)}>Delete Movie</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden px-4 sm:px-0">
        {filteredMovies.length === 0 ? (
          <div className="bg-[#1a1c21] rounded-2xl border border-gray-800 shadow-xl p-8 text-center text-gray-500 italic">
            No movies found.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMovies.map((movie, idx) => (
              <div key={movie.id} className="bg-[#1a1c21] rounded-2xl border border-gray-800 shadow-xl p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <Image 
                      src={movie.thumbnail_url || "/assets/images/placeholder.png"} 
                      alt={movie.title} 
                      width={160} 
                      height={240} 
                      className="w-24 h-36 object-cover rounded-lg border border-gray-800"
                    />
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-grow pr-2">
                        <div className="text-xs text-[#E50914] font-bold uppercase mb-1">#{(page - 1) * pageSize + idx + 1}</div>
                        {editingId === movie.id ? (
                          <input
                            name="title"
                            value={editForm.title}
                            onChange={handleEditChange}
                            className="bg-black border border-gray-700 rounded px-3 py-2 w-full text-white text-sm font-bold mb-2 focus:outline-none focus:ring-1 focus:ring-[#E50914]"
                          />
                        ) : (
                          <h3 className="text-base font-bold text-white mb-2 line-clamp-2">{movie.title}</h3>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button className="bg-[#E50914] hover:bg-[#b80710] text-white px-2 py-1 text-xs border-none shadow-[0_0_10px_rgba(229,9,20,0.2)]">⋯</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#1a1c21] border-gray-800 text-white">
                          {editingId === movie.id ? (
                            <DropdownMenuItem onClick={() => handleEditSave(movie.id)} className="text-green-500 focus:bg-[#141414] focus:text-green-500 font-bold cursor-pointer">Save Changes</DropdownMenuItem>
                          ) : (
                            <>
                              <DropdownMenuItem onClick={() => handleEdit(movie)} className="focus:bg-[#141414] focus:text-white cursor-pointer">Quick Edit</DropdownMenuItem>
                              <DropdownMenuItem asChild className="focus:bg-[#141414] focus:text-white cursor-pointer">
                                <a href={`/movies/edit/${movie.id}`}>Edit in Full Page</a>
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem onClick={() => handleSendPushNotification(movie)} className="focus:bg-[#141414] focus:text-white cursor-pointer">Send Push Notification</DropdownMenuItem>
                          <DropdownMenuItem className="text-[#E50914] focus:bg-red-900/20 focus:text-[#E50914] font-bold cursor-pointer" onClick={() => handleDelete(movie.id)}>Delete Movie</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    {editingId === movie.id ? (
                      <textarea
                        name="description"
                        value={editForm.description}
                        onChange={handleEditChange}
                        className="bg-black border border-gray-700 rounded px-3 py-2 w-full text-xs text-white mb-3 focus:outline-none focus:ring-1 focus:ring-[#E50914]"
                        rows={3}
                      />
                    ) : (
                      <p className="text-xs text-gray-400 mb-3 line-clamp-3">{movie.description}</p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {editingId === movie.id ? (
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-xs text-gray-300">
                            <input
                              type="checkbox"
                              name="published"
                              checked={editForm.published}
                              onChange={handleEditChange}
                              className="accent-[#E50914] w-3 h-3"
                            /> Published
                          </label>
                          <label className="flex items-center gap-2 text-xs text-gray-300">
                            <input
                              type="checkbox"
                              name="premium"
                              checked={editForm.premium}
                              onChange={handleEditChange}
                              className="accent-[#E50914] w-3 h-3"
                            /> Premium
                          </label>
                        </div>
                      ) : (
                        <>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] uppercase font-bold tracking-wider border ${
                            movie.published 
                              ? 'bg-green-900/20 text-green-500 border-green-900' 
                              : 'bg-gray-800 text-gray-400 border-gray-700'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${movie.published ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                            {movie.published ? 'Published' : 'Unpublished'}
                          </span>
                          {movie.premium ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] uppercase font-bold tracking-wider border bg-[#E50914]/10 text-[#E50914] border-[#E50914]/50">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#E50914]"></span>
                              Premium
                            </span>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Responsive Pagination Controls */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-2 my-8 px-4 sm:px-0">
        <div className="flex items-center gap-2 order-2 sm:order-1">
          <Button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-4 py-2 text-sm font-bold uppercase tracking-wider bg-transparent border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white disabled:opacity-50">
            Previous
          </Button>
          <Button disabled={page === Math.ceil(total / pageSize) || total === 0} onClick={() => setPage(page + 1)} className="px-4 py-2 text-sm font-bold uppercase tracking-wider bg-transparent border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white disabled:opacity-50">
            Next
          </Button>
        </div>
        
        {/* Desktop pagination numbers */}
        <div className="hidden sm:flex gap-1 order-1 sm:order-2">
          {Array.from({ length: Math.min(Math.ceil(total / pageSize), 7) }, (_, i) => {
            const totalPages = Math.ceil(total / pageSize);
            let pageNum;
            
            if (totalPages <= 7) {
              pageNum = i + 1;
            } else if (page <= 4) {
              pageNum = i + 1;
            } else if (page >= totalPages - 3) {
              pageNum = totalPages - 6 + i;
            } else {
              pageNum = page - 3 + i;
            }
            
            return (
              <Button
                key={pageNum}
                variant={page === pageNum ? "default" : "outline"}
                onClick={() => setPage(pageNum)}
                className={`px-4 py-2 text-sm font-bold border ${page === pageNum ? "bg-[#E50914] text-white border-[#E50914] shadow-[0_0_10px_rgba(229,9,20,0.3)]" : "bg-transparent text-gray-400 border-gray-800 hover:border-[#E50914]"}`}
              >
                {pageNum}
              </Button>
            );
          })}
        </div>
        
        {/* Mobile page indicator */}
        <div className="sm:hidden text-sm font-medium text-gray-500 order-1 sm:order-2">
          Page <span className="text-white">{page}</span> of <span className="text-white">{Math.ceil(total / pageSize) || 1}</span>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="mx-4 sm:mx-0 max-w-md sm:max-w-lg bg-[#1a1c21] border-gray-800 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#E50914] font-bold uppercase tracking-wider text-xl">Delete Movie</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-gray-300">Are you absolutely sure you want to delete this movie? This action cannot be undone.</p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              className="w-full sm:w-auto bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white uppercase tracking-wider font-bold"
            >
              Cancel
            </Button>
            <Button
              className="bg-[#E50914] text-white hover:bg-[#b80710] w-full sm:w-auto uppercase tracking-wider font-bold border-none"
              onClick={async () => {
                if (deleteId) {
                  await supabase.from("movies").delete().eq("id", deleteId);
                  setMovies(movies => movies.filter(m => m.id !== deleteId));
                }
                setShowDeleteModal(false);
                setDeleteId(null);
              }}
            >
              Delete Movie
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Push Notification Dialog */}
      <PushNotificationDialog
        open={showPushDialog}
        onOpenChange={setShowPushDialog}
        contentTitle={selectedMovie?.title}
        contentImage={selectedMovie?.cover_image_url}
        contentType="movie"
        contentId={selectedMovie?.id}
      />
    </AdminPanelLayout>
  );
}