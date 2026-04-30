'use client'
import AdminPanelLayout from "@/app/components/layout";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabaseClient";

// Define the Genre interface
interface Genre {
  id: number;
  name: string;
}

export default function GenresPage() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [open, setOpen] = useState(false);
  const [newGenre, setNewGenre] = useState("");
  const [loading, setLoading] = useState(false);

  // Edit modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingGenre, setEditingGenre] = useState<Genre | null>(null);
  const [editGenreName, setEditGenreName] = useState("");
  const [updating, setUpdating] = useState(false);

  // Delete modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [genreToDelete, setGenreToDelete] = useState<Genre | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Message state
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchGenres = async () => {
    try {
      const { data, error } = await supabase.from("genres").select("id, name").order("name");
      if (error) throw error;
      setGenres(data || []);
    } catch (error) {
      console.error('Error fetching genres:', error);
      setMessage({ type: 'error', text: 'Failed to load genres' });
    }
  };

  useEffect(() => {
    fetchGenres();
  }, []);

  // Auto-hide message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleAddGenre = async () => {
    if (!newGenre.trim()) {
      setMessage({ type: 'error', text: 'Genre name is required' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("genres").insert([{ name: newGenre.trim() }]);
      if (error) throw error;

      setNewGenre("");
      setOpen(false);
      await fetchGenres();
      setMessage({ type: 'success', text: 'Genre added successfully!' });
    } catch (error) {
      console.error('Error adding genre:', error);
      setMessage({ type: 'error', text: 'Failed to add genre' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (genre: Genre) => {
    setEditingGenre(genre);
    setEditGenreName(genre.name);
    setIsEditModalOpen(true);
  };

  const handleUpdateGenre = async () => {
    if (!editingGenre) return;

    if (!editGenreName.trim()) {
      setMessage({ type: 'error', text: 'Genre name is required' });
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('genres')
        .update({ name: editGenreName.trim() })
        .eq('id', editingGenre.id);

      if (error) throw error;

      // Update local state
      setGenres(genres.map(g => 
        g.id === editingGenre.id 
          ? { ...g, name: editGenreName.trim() }
          : g
      ));

      setMessage({ type: 'success', text: 'Genre updated successfully!' });
      setIsEditModalOpen(false);
      setEditingGenre(null);
      setEditGenreName("");
    } catch (error) {
      console.error('Error updating genre:', error);
      setMessage({ type: 'error', text: 'Failed to update genre' });
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteClick = (genre: Genre) => {
    setGenreToDelete(genre);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!genreToDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("genres")
        .delete()
        .eq("id", genreToDelete.id);

      if (error) throw error;

      setGenres(genres => genres.filter(g => g.id !== genreToDelete.id));
      setMessage({ type: 'success', text: 'Genre deleted successfully!' });
      setIsDeleteModalOpen(false);
      setGenreToDelete(null);
    } catch (error) {
      console.error('Error deleting genre:', error);
      setMessage({ type: 'error', text: 'Failed to delete genre' });
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setIsDeleteModalOpen(false);
    setGenreToDelete(null);
  };

  return (
    <AdminPanelLayout>
      {/* Message Display */}
      {message && (
        <div className={`mb-4 p-4 rounded-lg ${message.type === 'success'
            ? 'bg-green-900/20 border border-green-900 text-green-500'
            : 'bg-red-900/20 border border-red-900 text-red-500'
          }`}>
          {message.text}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white uppercase tracking-wider">Genres</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#E50914] hover:bg-[#b80710] text-white px-4 py-2 rounded font-bold uppercase tracking-wider transition border-none shadow-[0_0_10px_rgba(229,9,20,0.2)]">
              + Add Genre
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1a1c21] border-gray-800 text-white shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold uppercase tracking-wider">Add Genre</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <input
                type="text"
                placeholder="Genre name"
                value={newGenre}
                onChange={e => setNewGenre(e.target.value)}
                className="border border-gray-800 bg-black text-white rounded-lg px-4 py-3 w-full focus:outline-none focus:ring-1 focus:ring-[#E50914] placeholder-gray-600"
                autoFocus
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button className="bg-[#E50914] hover:bg-[#b80710] text-white uppercase font-bold tracking-wider border-none w-full sm:w-auto" onClick={handleAddGenre} disabled={!newGenre.trim() || loading}>
                {loading ? "Adding..." : "Add"}
              </Button>
              <DialogClose asChild>
                <Button variant="outline" className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white uppercase tracking-wider font-bold w-full sm:w-auto">Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="bg-[#1a1c21] rounded-2xl p-0 border border-gray-800 shadow-xl overflow-x-auto">
        <table className="min-w-full text-left">
          <thead>
            <tr className="border-b border-gray-800 bg-[#141414]/50">
              <th className="px-6 py-4 text-[#E50914] font-bold uppercase tracking-wider text-xs">#</th>
              <th className="px-6 py-4 text-[#E50914] font-bold uppercase tracking-wider text-xs">Name</th>
              <th className="px-6 py-4 text-[#E50914] font-bold uppercase tracking-wider text-xs">Actions</th>
            </tr>
          </thead>
          <tbody>
            {genres.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500 italic">No genres found.</td>
              </tr>
            ) : (
              genres.map((genre, idx) => (
                <tr key={genre.id} className="border-b border-gray-800 hover:bg-[#141414] transition-colors">
                  <td className="px-6 py-4 text-gray-400 font-medium">{idx + 1}</td>
                  <td className="px-6 py-4 text-gray-200 font-medium">{genre.name}</td>
                  <td className="px-6 py-4 flex gap-3">
                    <Button 
                      className="bg-transparent border border-gray-700 hover:bg-gray-800 text-white px-4 py-2 text-xs uppercase tracking-wider font-bold"
                      onClick={() => handleEditClick(genre)}
                    >
                      Edit
                    </Button>
                    <Button 
                      className="bg-transparent border border-red-900 text-red-500 hover:bg-red-900 hover:text-white px-4 py-2 text-xs uppercase tracking-wider font-bold" 
                      onClick={() => handleDeleteClick(genre)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Genre Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-[#1a1c21] border-gray-800 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase tracking-wider">Edit Genre</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <input
              type="text"
              placeholder="Genre name"
              value={editGenreName}
              onChange={e => setEditGenreName(e.target.value)}
              className="border border-gray-800 bg-black text-white rounded-lg px-4 py-3 w-full focus:outline-none focus:ring-1 focus:ring-[#E50914] placeholder-gray-600"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              className="bg-[#E50914] hover:bg-[#b80710] text-white uppercase font-bold tracking-wider border-none w-full sm:w-auto" 
              onClick={handleUpdateGenre}
              disabled={!editGenreName.trim() || updating}
            >
              {updating ? "Updating..." : "Update"}
            </Button>
            <DialogClose asChild>
              <Button variant="outline" disabled={updating} className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white uppercase tracking-wider font-bold w-full sm:w-auto">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="mx-4 sm:mx-0 max-w-md sm:max-w-lg bg-[#1a1c21] border-gray-800 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#E50914] font-bold uppercase tracking-wider text-xl">Delete Genre</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 mt-1">
                <div className="w-12 h-12 bg-red-900/20 rounded-full flex items-center justify-center border border-red-900">
                  <svg className="w-6 h-6 text-[#E50914]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-2">
                  Are you absolutely sure?
                </h3>
                <div className="text-sm text-gray-400 space-y-2">
                  <p>
                    You are about to delete &ldquo;<span className="font-bold text-white bg-gray-800 px-2 py-0.5 rounded">{genreToDelete?.name}</span>&rdquo;.
                  </p>
                  <p className="text-[#E50914] font-bold">
                    This action cannot be undone and may affect movies using this genre.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={cancelDelete}
              disabled={deleting}
              className="w-full sm:w-auto bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white uppercase tracking-wider font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-[#E50914] text-white hover:bg-[#b80710] w-full sm:w-auto uppercase tracking-wider font-bold border-none"
            >
              {deleting ? 'Deleting...' : 'Delete Genre'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPanelLayout>
  );
}