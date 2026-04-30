"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AdminPanelLayout from "@/app/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

interface VJ {
  id: string;
  name: string;
}

export default function VjsPage() {
  const [vjs, setVjs] = useState<VJ[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");


  useEffect(() => {
    fetchVjs();
  }, []);

  async function fetchVjs() {
    setIsLoading(true);
    const { data } = await supabase.from("vjs").select("*").order("name");
    setVjs(data || []);
    setIsLoading(false);
  }

  async function handleAddVj(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from("vjs").insert([{ name: form.name }]);
    setForm({ name: "" });
    setShowForm(false);
    await fetchVjs();
  }

  async function handleDelete(id: string) {
    await supabase.from("vjs").delete().eq("id", id);
    await fetchVjs();
  }

  async function handleEditSave(id: string) {
    await supabase.from("vjs").update({ name: editName }).eq("id", id);
    setEditingId(null);
    setEditName("");
    await fetchVjs();
  }

  return (
    <AdminPanelLayout>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white uppercase tracking-wider">VJs</h1>
          <div className="text-gray-400 text-sm font-medium">All Video Jockeys</div>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button className="bg-[#E50914] hover:bg-[#b80710] text-white font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(229,9,20,0.2)]">Add VJ</Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1a1c21] border-gray-800 text-white shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold uppercase tracking-wider">Add VJ</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="Enter VJ name"
                value={form.name}
                onChange={e => setForm({ name: e.target.value })}
                className="bg-black border-gray-800 text-white focus-visible:ring-[#E50914]"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button className="bg-[#E50914] hover:bg-[#b80710] text-white font-bold uppercase tracking-wider border-none" onClick={e => handleAddVj(e)}>
                Add
              </Button>
              <DialogClose asChild>
                <Button variant="outline" className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white uppercase tracking-wider font-bold">Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="bg-[#1a1c21] rounded-2xl p-0 border border-gray-800 shadow-xl overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 italic">Loading VJs...</div>
        ) : (
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-gray-800 bg-[#141414]/50">
                <th className="px-6 py-4 text-[#E50914] font-bold uppercase tracking-wider text-xs">#</th>
                <th className="px-6 py-4 text-[#E50914] font-bold uppercase tracking-wider text-xs">Name</th>
                <th className="px-6 py-4 text-[#E50914] font-bold uppercase tracking-wider text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vjs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500 italic">No VJs found.</td>
                </tr>
              ) : (
                vjs.map((vj, idx) => (
                  <tr key={vj.id} className="border-b border-gray-800 hover:bg-[#141414] transition-colors">
                    <td className="px-6 py-4 text-gray-400 font-medium">{idx + 1}</td>
                    <td className="px-6 py-4 text-gray-200 font-medium">
                      {editingId === vj.id ? (
                        <Input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="w-full bg-black border-gray-700 text-white focus-visible:ring-[#E50914]"
                          autoFocus
                        />
                      ) : (
                        vj.name
                      )}
                    </td>
                    <td className="px-6 py-4 flex gap-3">
                      {editingId === vj.id ? (
                        <>
                          <Button className="bg-green-600 hover:bg-green-700 text-white font-bold uppercase tracking-wider text-xs" onClick={() => handleEditSave(vj.id)}>
                            Save
                          </Button>
                          <Button variant="outline" className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white uppercase tracking-wider font-bold text-xs" onClick={() => { setEditingId(null); setEditName(""); }}>
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            className="bg-transparent border border-gray-700 text-white hover:bg-gray-800 px-4 py-2 text-xs font-bold uppercase tracking-wider"
                            onClick={() => { setEditingId(vj.id); setEditName(vj.name); }}
                          >
                            Edit
                          </Button>
                          <Button
                            className="bg-transparent border border-red-900 text-red-500 hover:bg-red-900 hover:text-white px-4 py-2 text-xs font-bold uppercase tracking-wider"
                            onClick={() => handleDelete(vj.id)}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </AdminPanelLayout>
  );
}