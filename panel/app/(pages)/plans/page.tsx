'use client'
import AdminPanelLayout from "@/app/components/layout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Plus, Pencil, Trash2, Star, Eye, EyeOff, GripVertical, X } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  amount: number;
  description: string;
  duration: string;
  duration_in_months: number;
  duration_in_days: number;
  recommended: boolean;
  sort_order: number;
  features: string[];
  active: boolean;
  created_at: string;
}

const emptyPlan = {
  name: '',
  amount: 0,
  description: '',
  duration: '',
  duration_in_months: 0,
  duration_in_days: 0,
  recommended: false,
  sort_order: 0,
  features: [] as string[],
  active: true,
};

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState(emptyPlan);
  const [saving, setSaving] = useState(false);
  const [newFeature, setNewFeature] = useState('');

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("amount", { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error("Error fetching plans:", error);
      setMessage({ type: 'error', text: 'Failed to load plans.' });
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingPlan(null);
    setFormData({ ...emptyPlan, sort_order: plans.length });
    setNewFeature('');
    setIsModalOpen(true);
  };

  const openEditModal = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      amount: plan.amount,
      description: plan.description || '',
      duration: plan.duration || '',
      duration_in_months: plan.duration_in_months || 0,
      duration_in_days: plan.duration_in_days || 0,
      recommended: plan.recommended || false,
      sort_order: plan.sort_order || 0,
      features: plan.features || [],
      active: plan.active !== false,
    });
    setNewFeature('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPlan(null);
    setFormData(emptyPlan);
    setNewFeature('');
  };

  const addFeature = () => {
    const trimmed = newFeature.trim();
    if (trimmed && !formData.features.includes(trimmed)) {
      setFormData({ ...formData, features: [...formData.features, trimmed] });
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index),
    });
  };

  const handleSave = async () => {
    if (!formData.name || !formData.amount || !formData.duration_in_days) {
      setMessage({ type: 'error', text: 'Name, amount, and duration in days are required.' });
      return;
    }

    try {
      setSaving(true);

      // If marking as recommended, un-recommend all others first
      if (formData.recommended) {
        await supabase
          .from('plans')
          .update({ recommended: false })
          .neq('id', editingPlan?.id || '00000000-0000-0000-0000-000000000000');
      }

      const planData = {
        name: formData.name,
        amount: formData.amount,
        description: formData.description || null,
        duration: formData.duration || `${formData.duration_in_days} Days`,
        duration_in_months: formData.duration_in_months || null,
        duration_in_days: formData.duration_in_days,
        recommended: formData.recommended,
        sort_order: formData.sort_order,
        features: formData.features,
        active: formData.active,
      };

      if (editingPlan) {
        // Update existing
        const { error } = await supabase
          .from('plans')
          .update(planData)
          .eq('id', editingPlan.id);
        if (error) throw error;
        setMessage({ type: 'success', text: `Plan "${formData.name}" updated successfully!` });
      } else {
        // Create new
        const { error } = await supabase
          .from('plans')
          .insert(planData);
        if (error) throw error;
        setMessage({ type: 'success', text: `Plan "${formData.name}" created successfully!` });
      }

      await fetchPlans();
      closeModal();
    } catch (error) {
      console.error('Error saving plan:', error);
      setMessage({ type: 'error', text: 'Failed to save plan. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (planId: string) => {
    try {
      setDeleting(true);
      const { error } = await supabase
        .from('plans')
        .delete()
        .eq('id', planId);
      if (error) throw error;
      setMessage({ type: 'success', text: 'Plan deleted successfully!' });
      setDeleteConfirm(null);
      await fetchPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      setMessage({ type: 'error', text: 'Failed to delete plan.' });
    } finally {
      setDeleting(false);
    }
  };

  const toggleActive = async (plan: Plan) => {
    try {
      const { error } = await supabase
        .from('plans')
        .update({ active: !plan.active })
        .eq('id', plan.id);
      if (error) throw error;
      setMessage({ type: 'success', text: `Plan "${plan.name}" ${plan.active ? 'hidden' : 'activated'}!` });
      await fetchPlans();
    } catch (error) {
      console.error('Error toggling plan:', error);
      setMessage({ type: 'error', text: 'Failed to update plan visibility.' });
    }
  };

  const toggleRecommended = async (plan: Plan) => {
    try {
      // Un-recommend all first
      await supabase.from('plans').update({ recommended: false }).neq('id', plan.id);
      // Toggle this one
      const { error } = await supabase
        .from('plans')
        .update({ recommended: !plan.recommended })
        .eq('id', plan.id);
      if (error) throw error;
      setMessage({ type: 'success', text: plan.recommended ? 'Recommendation removed.' : `"${plan.name}" is now the recommended plan!` });
      await fetchPlans();
    } catch (error) {
      console.error('Error toggling recommended:', error);
    }
  };

  const activePlans = plans.filter(p => p.active);
  const inactivePlans = plans.filter(p => !p.active);
  const recommendedPlan = plans.find(p => p.recommended);

  return (
    <AdminPanelLayout>
      {/* Toast Message */}
      {message && (
        <div className={`fixed top-20 right-6 z-50 px-5 py-3 rounded-xl font-medium text-sm shadow-2xl border transition-all ${
          message.type === 'success'
            ? 'bg-green-900/90 text-green-400 border-green-800'
            : 'bg-red-900/90 text-red-400 border-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#1a1c21] rounded-2xl shadow-xl p-6 border border-gray-800 flex flex-col items-center hover:border-[#E50914]/50 transition-colors">
          <div className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Plans</div>
          <div className="text-4xl font-black text-[#E50914] mt-2 tracking-tighter">{plans.length}</div>
        </div>
        <div className="bg-[#1a1c21] rounded-2xl shadow-xl p-6 border border-gray-800 flex flex-col items-center hover:border-[#E50914]/50 transition-colors">
          <div className="text-gray-400 text-xs font-bold uppercase tracking-wider">Active Plans</div>
          <div className="text-4xl font-black text-green-500 mt-2 tracking-tighter">{activePlans.length}</div>
        </div>
        <div className="bg-[#1a1c21] rounded-2xl shadow-xl p-6 border border-gray-800 flex flex-col items-center hover:border-[#E50914]/50 transition-colors">
          <div className="text-gray-400 text-xs font-bold uppercase tracking-wider">Recommended</div>
          <div className="text-lg font-bold text-yellow-500 mt-2">{recommendedPlan?.name || 'None set'}</div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-white uppercase tracking-wider">Subscription Plans</h1>
        <Button
          onClick={openCreateModal}
          className="bg-[#E50914] hover:bg-[#b80710] text-white font-bold uppercase tracking-wider text-xs px-6 py-3 shadow-lg shadow-[#E50914]/20"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Plan
        </Button>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#E50914]" />
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-[#1a1c21] rounded-2xl p-12 border border-gray-800 text-center">
          <p className="text-gray-500 text-lg mb-4">No plans created yet.</p>
          <Button onClick={openCreateModal} className="bg-[#E50914] hover:bg-[#b80710] text-white font-bold">
            <Plus className="w-4 h-4 mr-2" /> Create Your First Plan
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-[#1a1c21] rounded-2xl border shadow-xl transition-all hover:shadow-2xl ${
                !plan.active
                  ? 'border-gray-800 opacity-60'
                  : plan.recommended
                    ? 'border-yellow-600/50 ring-1 ring-yellow-600/20'
                    : 'border-gray-800 hover:border-[#E50914]/50'
              }`}
            >
              {/* Card Header */}
              <div className="p-6 border-b border-gray-800/50">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    {plan.recommended && (
                      <span className="bg-yellow-600/20 text-yellow-500 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-yellow-600/30">
                        Recommended
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {plan.active ? (
                      <span className="bg-green-900/20 text-green-500 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border border-green-900/50">Active</span>
                    ) : (
                      <span className="bg-gray-800 text-gray-500 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border border-gray-700">Hidden</span>
                    )}
                  </div>
                </div>
                <div className="text-3xl font-black text-[#E50914]">
                  UGX {plan.amount.toLocaleString()}
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  {plan.duration || `${plan.duration_in_days} Days`}
                </div>
                {plan.description && (
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2">{plan.description}</p>
                )}
              </div>

              {/* Features */}
              {plan.features && plan.features.length > 0 && (
                <div className="px-6 py-4 border-b border-gray-800/50">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Features</div>
                  <ul className="space-y-1.5">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                        <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Card Footer - Actions */}
              <div className="p-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleRecommended(plan)}
                    title={plan.recommended ? 'Remove recommendation' : 'Set as recommended'}
                    className={`p-2 rounded-lg transition-colors ${
                      plan.recommended
                        ? 'bg-yellow-600/20 text-yellow-500 hover:bg-yellow-600/30'
                        : 'bg-gray-800 text-gray-500 hover:text-yellow-500 hover:bg-gray-700'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${plan.recommended ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={() => toggleActive(plan)}
                    title={plan.active ? 'Hide from payment page' : 'Show on payment page'}
                    className={`p-2 rounded-lg transition-colors ${
                      plan.active
                        ? 'bg-green-900/20 text-green-500 hover:bg-green-900/30'
                        : 'bg-gray-800 text-gray-500 hover:text-green-500 hover:bg-gray-700'
                    }`}
                  >
                    {plan.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => openEditModal(plan)}
                    className="bg-transparent border border-gray-700 hover:border-[#E50914] text-white px-3 py-2 text-xs font-bold uppercase tracking-wider"
                    variant="outline"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
                  </Button>
                  {deleteConfirm === plan.id ? (
                    <div className="flex items-center gap-1">
                      <Button
                        onClick={() => handleDelete(plan.id)}
                        disabled={deleting}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 text-xs font-bold"
                      >
                        {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
                      </Button>
                      <Button
                        onClick={() => setDeleteConfirm(null)}
                        className="bg-gray-800 text-gray-400 px-3 py-2 text-xs"
                        variant="outline"
                      >
                        No
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setDeleteConfirm(plan.id)}
                      className="bg-transparent border border-gray-700 hover:border-red-600 text-gray-400 hover:text-red-500 px-3 py-2 text-xs font-bold uppercase tracking-wider"
                      variant="outline"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Sort order indicator */}
              <div className="px-6 pb-3">
                <div className="flex items-center gap-1 text-[10px] text-gray-600">
                  <GripVertical className="w-3 h-3" />
                  Sort order: {plan.sort_order}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Plan Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="mx-4 sm:mx-0 max-w-md sm:max-w-lg bg-[#1a1c21] border-gray-800 text-white shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase tracking-wider">
              {editingPlan ? 'Edit Plan' : 'Create New Plan'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Plan Name */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Plan Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Basic, Standard, Premium"
                className="w-full px-4 py-3 border border-gray-800 rounded-lg bg-black text-white focus:outline-none focus:ring-1 focus:ring-[#E50914] placeholder-gray-600"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Amount (UGX) *</label>
              <input
                type="number"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) || 0 })}
                placeholder="e.g., 5000"
                className="w-full px-4 py-3 border border-gray-800 rounded-lg bg-black text-white focus:outline-none focus:ring-1 focus:ring-[#E50914] placeholder-gray-600"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this plan"
                rows={2}
                className="w-full px-4 py-3 border border-gray-800 rounded-lg bg-black text-white focus:outline-none focus:ring-1 focus:ring-[#E50914] placeholder-gray-600 resize-none"
              />
            </div>

            {/* Duration Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Duration Label</label>
                <input
                  type="text"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="e.g., 7 Days, 1 Month"
                  className="w-full px-4 py-3 border border-gray-800 rounded-lg bg-black text-white focus:outline-none focus:ring-1 focus:ring-[#E50914] placeholder-gray-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Duration (Days) *</label>
                <input
                  type="number"
                  value={formData.duration_in_days || ''}
                  onChange={(e) => setFormData({ ...formData, duration_in_days: parseInt(e.target.value) || 0 })}
                  placeholder="e.g., 7"
                  className="w-full px-4 py-3 border border-gray-800 rounded-lg bg-black text-white focus:outline-none focus:ring-1 focus:ring-[#E50914] placeholder-gray-600"
                />
              </div>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Sort Order</label>
              <input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                placeholder="0"
                className="w-full px-4 py-3 border border-gray-800 rounded-lg bg-black text-white focus:outline-none focus:ring-1 focus:ring-[#E50914] placeholder-gray-600"
              />
              <p className="text-[10px] text-gray-600 mt-1">Lower numbers appear first on the payment page.</p>
            </div>

            {/* Features */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Features</label>
              {formData.features.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.features.map((feature, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 bg-gray-800 text-gray-300 text-xs px-3 py-1.5 rounded-full border border-gray-700"
                    >
                      {feature}
                      <button
                        onClick={() => removeFeature(idx)}
                        className="text-gray-500 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } }}
                  placeholder="e.g., HD Streaming, Downloads"
                  className="flex-1 px-4 py-3 border border-gray-800 rounded-lg bg-black text-white focus:outline-none focus:ring-1 focus:ring-[#E50914] placeholder-gray-600"
                />
                <Button
                  onClick={addFeature}
                  disabled={!newFeature.trim()}
                  className="bg-gray-800 hover:bg-gray-700 text-white px-4 border border-gray-700"
                  variant="outline"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Toggles Row */}
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-3 p-4 rounded-lg border border-gray-800 bg-black cursor-pointer hover:border-yellow-600/50 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.recommended}
                  onChange={(e) => setFormData({ ...formData, recommended: e.target.checked })}
                  className="w-4 h-4 accent-yellow-500"
                />
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-yellow-500" /> Recommended
                  </div>
                  <div className="text-[10px] text-gray-500">Show badge on payment page</div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-4 rounded-lg border border-gray-800 bg-black cursor-pointer hover:border-green-600/50 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 accent-green-500"
                />
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-green-500" /> Active
                  </div>
                  <div className="text-[10px] text-gray-500">Visible on payment page</div>
                </div>
              </label>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-3 mt-4">
            <Button
              variant="outline"
              onClick={closeModal}
              disabled={saving}
              className="w-full sm:w-auto bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white uppercase tracking-wider font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.name || !formData.amount || !formData.duration_in_days}
              className="bg-[#E50914] text-white hover:bg-[#b80710] w-full sm:w-auto uppercase tracking-wider font-bold border-none"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</>
              ) : (
                editingPlan ? 'Update Plan' : 'Create Plan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPanelLayout>
  );
}
