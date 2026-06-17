'use client'
import AdminPanelLayout from "@/app/components/layout";
import { authFetch } from "@/lib/authFetch";
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
import { Loader2 } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  subscription: string;
  subscription_start_date: string;
  subscription_expiry_date: string;
}

interface Plan {
  id: string;
  name: string;
  amount: number;
  description: string;
  duration: string;
  duration_in_months: number;
  duration_in_days: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const itemsPerPage = 100;

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [modalPlan, setModalPlan] = useState("");
  const [modalStartDate, setModalStartDate] = useState("");
  const [modalEndDate, setModalEndDate] = useState("");
  const [updating, setUpdating] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);

  // Delete confirmation modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Deactivate confirmation modal state
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  // Toast-like state for better feedback
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchPlans();
  }, []);

  const checkIsPremium = (user: User) => {
    return user.subscription &&
      user.subscription !== 'free' &&
      user.subscription_expiry_date &&
      new Date(user.subscription_expiry_date) > new Date();
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/profiles');
      const json = await res.json();
      if (!res.ok) {
        console.error('Error fetching users:', json.error);
        setMessage({ type: 'error', text: 'Failed to load users' });
        setUsers([]);
      } else {
        setUsers(json.data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setMessage({ type: 'error', text: 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      setIsLoadingPlans(true);
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .order("name");

      if (error) {
        console.error("Error fetching plans:", error);
        setMessage({ type: 'error', text: 'Failed to load subscription plans' });
        return [];
      }

      setPlans(data || []);
      return data || [];
    } catch (error) {
      console.error("Error fetching plans:", error);
      setMessage({ type: 'error', text: 'Failed to load subscription plans' });
      return [];
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const handleSubscribe = async (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);

    // Fetch plans and set current plan if user has an active subscription
    const plansData = await fetchPlans();

    // Check if user has active subscription
    const hasActiveSubscription = user.subscription &&
      user.subscription !== 'free' &&
      user.subscription_expiry_date &&
      new Date(user.subscription_expiry_date) > new Date();

    if (hasActiveSubscription && plansData.length > 0) {
      // User has active subscription - find the exact plan by name and duration
      let existingPlan = null;

      if (user.subscription_start_date && user.subscription_expiry_date) {
        // Calculate the actual subscription duration
        const startDate = new Date(user.subscription_start_date);
        const endDate = new Date(user.subscription_expiry_date);
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

        // Find exact matching plan based on name and duration
        const matchingPlans = plansData.filter(p => p.name === user.subscription);
        existingPlan = matchingPlans.find(p => p.duration_in_days === totalDays);

        // If no exact match, find the closest one
        if (!existingPlan && matchingPlans.length > 0) {
          existingPlan = matchingPlans.reduce((prev, curr) =>
            Math.abs(curr.duration_in_days - totalDays) < Math.abs(prev.duration_in_days - totalDays) ? curr : prev
          );
        }
      } else {
        // Fallback: use first plan with matching name
        existingPlan = plansData.find(p => p.name === user.subscription);
      }

      if (existingPlan) {
        setSelectedPlan(existingPlan);
        setModalPlan(existingPlan.id);
      }
      setModalStartDate(user.subscription_start_date ? new Date(user.subscription_start_date).toISOString().split('T')[0] : "");
      setModalEndDate(user.subscription_expiry_date ? new Date(user.subscription_expiry_date).toISOString().split('T')[0] : "");
    } else {
      // User is free or expired - set defaults for new subscription
      setSelectedPlan(null);
      setModalPlan("");
      setModalStartDate(new Date().toISOString().split('T')[0]);
      setModalEndDate("");
    }
  };

  const handlePlanChange = (planId: string) => {
    setModalPlan(planId);

    if (!planId) {
      setSelectedPlan(null);
      return;
    }

    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    setSelectedPlan(plan);

    // Calculate end date based on plan duration
    const startDate = modalStartDate || new Date().toISOString().split('T')[0];
    const start = new Date(startDate);

    if (plan.duration_in_days && plan.duration_in_days > 0) {
      const end = new Date(start.getTime() + (plan.duration_in_days * 24 * 60 * 60 * 1000));
      setModalEndDate(end.toISOString().split('T')[0]);
    } else {
      // For lifetime plans
      setModalEndDate('2099-12-31');
    }

    // Update start date if it wasn't set
    if (!modalStartDate) {
      setModalStartDate(startDate);
    }
  };

  const handleStartDateChange = (startDate: string) => {
    setModalStartDate(startDate);

    // Recalculate end date if a plan is selected
    if (selectedPlan && startDate) {
      const start = new Date(startDate);

      if (selectedPlan.duration_in_days && selectedPlan.duration_in_days > 0) {
        const end = new Date(start.getTime() + (selectedPlan.duration_in_days * 24 * 60 * 60 * 1000));
        setModalEndDate(end.toISOString().split('T')[0]);
      } else {
        // For lifetime plans
        setModalEndDate('2099-12-31');
      }
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setSelectedPlan(null);
    setModalPlan("");
    setModalStartDate("");
    setModalEndDate("");
  };

  const updateSubscription = async () => {
    if (!editingUser) return;

    // Handle cancellation to free plan
    if (modalPlan === 'free') {
      setUpdating(true);
      try {
        const res = await authFetch('/api/profiles', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingUser.id,
            subscription: 'free',
            subscription_start_date: null,
            subscription_expiry_date: null,
          }),
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || 'Failed to cancel subscription');
        }
        setUsers(prev =>
          prev.map(u =>
            u.id === editingUser.id
              ? { ...u, subscription: 'free', subscription_start_date: '', subscription_expiry_date: '' }
              : u
          )
        );
        setMessage({ type: 'success', text: 'Subscription cancelled (set to Free).' });
        closeModal();
        setTimeout(() => fetchUsers(), 1000);
      } catch (error: unknown) {
        setMessage({ type: 'error', text: `Failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
      } finally {
        setUpdating(false);
      }
      return;
    }

    // Validate required fields for paid plans
    if (!modalPlan || !modalStartDate || !modalEndDate) {
      setMessage({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }

    if (!selectedPlan) {
      setMessage({ type: 'error', text: 'Selected plan not found' });
      return;
    }

    setUpdating(true);
    try {
      const updateData = {
        subscription: selectedPlan.name,
        subscription_start_date: modalStartDate,
        subscription_expiry_date: modalEndDate
      };

      console.log('Updating subscription with data:', updateData);

      const res = await authFetch('/api/profiles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingUser.id, ...updateData }),
      });

      if (!res.ok) {
        const json = await res.json();
        console.error('API error:', json.error);
        throw new Error(json.error || 'Failed to update subscription');
      }

      console.log('Subscription updated successfully');

      // Update local state immediately
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === editingUser.id
            ? {
              ...user,
              subscription: selectedPlan.name,
              subscription_start_date: modalStartDate,
              subscription_expiry_date: modalEndDate
            }
            : user
        )
      );

      setMessage({ type: 'success', text: 'Subscription updated successfully!' });
      closeModal();

      // Refresh the data to ensure consistency
      setTimeout(() => fetchUsers(), 1000);
    } catch (error: unknown) {
      console.error('Error updating subscription:', error);
      setMessage({
        type: 'error',
        text: `Failed to update subscription: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    setDeleting(true);
    try {
      const res = await authFetch(`/api/profiles?id=${userToDelete.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const json = await res.json();
        console.error('Error deleting user:', json.error);
        setMessage({
          type: 'error',
          text: `Failed to delete user: ${json.error || 'Unknown error'}`
        });
        return;
      }

      // Remove user from local state
      setUsers(users => users.filter(user => user.id !== userToDelete.id));
      setMessage({
        type: 'success',
        text: `User "${userToDelete.name || userToDelete.email || 'Unknown User'}" has been deleted successfully.`
      });

      // Close modal
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      setMessage({
        type: 'error',
        text: 'An unexpected error occurred while deleting the user.'
      });
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setIsDeleteModalOpen(false);
    setUserToDelete(null);
  };

  const handleDeactivateClick = (user: User) => {
    setUserToDeactivate(user);
    setIsDeactivateModalOpen(true);
  };

  const confirmDeactivate = async () => {
    if (!userToDeactivate) return;

    setDeactivating(true);
    try {
      const updateData = {
        subscription: 'free',
        subscription_start_date: null,
        subscription_expiry_date: null
      };

      const res = await authFetch('/api/profiles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userToDeactivate.id, ...updateData }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to deactivate subscription');
      }

      // Update local state
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userToDeactivate.id
            ? {
              ...user,
              subscription: 'free',
              subscription_start_date: '',
              subscription_expiry_date: ''
            }
            : user
        )
      );

      setMessage({ type: 'success', text: `Subscription for ${userToDeactivate.name || userToDeactivate.email} has been deactivated.` });
      setIsDeactivateModalOpen(false);
      setUserToDeactivate(null);
    } catch (error: unknown) {
      console.error('Error deactivating subscription:', error);
      setMessage({
        type: 'error',
        text: `Failed to deactivate subscription: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setDeactivating(false);
    }
  };

  const cancelDeactivate = () => {
    setIsDeactivateModalOpen(false);
    setUserToDeactivate(null);
  };

  // Auto-hide message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Filter and pagination logic
  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(search.toLowerCase()) ||
    user.email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

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

      <div className="flex flex-col gap-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h1 className="text-2xl font-bold text-white uppercase tracking-wider">Users</h1>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-black border border-gray-800 text-white rounded-lg px-4 py-2 w-full sm:w-64 focus:outline-none focus:ring-1 focus:ring-[#E50914] focus:border-transparent placeholder-gray-600"
          />
        </div>
      </div>
      {/* Desktop Table View */}
      <div className="hidden md:block bg-[#1a1c21] rounded-2xl p-0 border border-gray-800 shadow-xl overflow-x-auto">
        <table className="min-w-full text-left">
          <thead>
            <tr className="border-b border-gray-800 bg-[#141414]/50">
              <th className="px-6 py-4 text-[#E50914] font-bold uppercase tracking-wider text-xs">#</th>
              <th className="px-6 py-4 text-[#E50914] font-bold uppercase tracking-wider text-xs">Name</th>
              <th className="px-6 py-4 text-[#E50914] font-bold uppercase tracking-wider text-xs">Email</th>
              <th className="px-6 py-4 text-[#E50914] font-bold uppercase tracking-wider text-xs">Status</th>
              <th className="px-6 py-4 text-[#E50914] font-bold uppercase tracking-wider text-xs">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500 italic">Loading users...</td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500 italic">No users found.</td>
              </tr>
            ) : (
              paginatedUsers.map((user, idx) => (
                <tr key={user.id} className="border-b border-gray-800 hover:bg-[#141414] transition-colors">
                  <td className="px-6 py-4 text-gray-400 font-medium">{startIndex + idx + 1}</td>
                  <td className="px-6 py-4 text-gray-200 font-medium">{user.name || 'N/A'}</td>
                  <td className="px-6 py-4 text-gray-400">{user.email || 'N/A'}</td>
                  <td className="px-6 py-4">
                    {checkIsPremium(user) ? (
                      <span className="bg-green-900/40 text-green-500 px-2 py-1 rounded text-xs font-bold border border-green-900 uppercase tracking-wider">Premium</span>
                    ) : (
                      <span className="bg-gray-800 text-gray-400 px-2 py-1 rounded text-xs font-bold border border-gray-700 uppercase tracking-wider">Free</span>
                    )}
                  </td>
                  <td className="px-6 py-4 flex flex-wrap gap-2">
                    <Button
                      className="bg-[#E50914] hover:bg-[#b80710] text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider border-none shadow-[0_0_10px_rgba(229,9,20,0.2)]"
                      onClick={() => handleSubscribe(user)}
                    >
                      Subscribe
                    </Button>
                    {checkIsPremium(user) && (
                      <Button
                        className="bg-transparent border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider"
                        onClick={() => handleDeactivateClick(user)}
                      >
                        Deactivate
                      </Button>
                    )}
                    <Button
                      className="bg-transparent border border-red-900 text-red-500 hover:bg-red-900 hover:text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider"
                      onClick={() => handleDeleteClick(user)}
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

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <div className="bg-[#1a1c21] rounded-2xl p-6 border border-gray-800 shadow-xl text-center text-gray-500 italic">
            Loading users...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-[#1a1c21] rounded-2xl p-6 border border-gray-800 shadow-xl text-center text-gray-500 italic">
            No users found.
          </div>
        ) : (
          paginatedUsers.map((user, idx) => (
            <div key={user.id} className="bg-[#1a1c21] rounded-2xl p-5 border border-gray-800 shadow-xl">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-xs text-[#E50914] font-bold uppercase">#{startIndex + idx + 1}</div>
                    {checkIsPremium(user) ? (
                      <span className="bg-green-900/40 text-green-500 px-2 py-0.5 rounded text-[10px] font-bold border border-green-900 uppercase tracking-wider">Premium</span>
                    ) : (
                      <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded text-[10px] font-bold border border-gray-700 uppercase tracking-wider">Free</span>
                    )}
                  </div>
                  <div className="font-bold text-white mb-1 text-lg">{user.name || 'N/A'}</div>
                  <div className="text-sm text-gray-400 break-all">{user.email || 'N/A'}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-800">
                <Button
                  className="bg-[#E50914] hover:bg-[#b80710] text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider flex-1 shadow-[0_0_10px_rgba(229,9,20,0.2)] min-w-[100px]"
                  onClick={() => handleSubscribe(user)}
                >
                  Subscribe
                </Button>
                {checkIsPremium(user) && (
                  <Button
                    className="bg-transparent border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider flex-1 min-w-[100px]"
                    onClick={() => handleDeactivateClick(user)}
                  >
                    Deactivate
                  </Button>
                )}
                <Button
                  className="bg-transparent border border-red-900 text-red-500 hover:bg-red-900 hover:text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider flex-1 min-w-[100px]"
                  onClick={() => handleDeleteClick(user)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-8 bg-[#1a1c21] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
          {/* Desktop Pagination */}
          <div className="hidden sm:flex items-center justify-between px-6 py-4">
            <div className="text-sm text-gray-400 font-medium">
              Showing <span className="text-white">{startIndex + 1}</span> to <span className="text-white">{Math.min(endIndex, filteredUsers.length)}</span> of <span className="text-white">{filteredUsers.length}</span> results
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-4 py-2 text-sm font-bold uppercase tracking-wider ${currentPage === 1 ? 'bg-black text-gray-600 border-gray-800 cursor-not-allowed' : 'bg-black text-white border-gray-700 hover:border-[#E50914]'}`}
                variant="outline"
              >
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {/* Show first page */}
                {currentPage > 3 && (
                  <>
                    <Button
                      onClick={() => setCurrentPage(1)}
                      className="px-4 py-2 text-sm font-bold bg-black text-white border-gray-700 hover:border-[#E50914]"
                      variant="outline"
                    >
                      1
                    </Button>
                    {currentPage > 4 && <span className="px-3 text-gray-600">...</span>}
                  </>
                )}

                {/* Show pages around current page */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  if (pageNum > totalPages) return null;

                  return (
                    <Button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-4 py-2 text-sm font-bold ${currentPage === pageNum
                        ? 'bg-[#E50914] text-white border-[#E50914] shadow-[0_0_10px_rgba(229,9,20,0.3)]'
                        : 'bg-black text-white border-gray-700 hover:border-[#E50914]'
                        }`}
                      variant={currentPage === pageNum ? "default" : "outline"}
                    >
                      {pageNum}
                    </Button>
                  );
                })}

                {/* Show last page */}
                {currentPage < totalPages - 2 && (
                  <>
                    {currentPage < totalPages - 3 && <span className="px-3 text-gray-600">...</span>}
                    <Button
                      onClick={() => setCurrentPage(totalPages)}
                      className="px-4 py-2 text-sm font-bold bg-black text-white border-gray-700 hover:border-[#E50914]"
                      variant="outline"
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
              </div>

              <Button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 text-sm font-bold uppercase tracking-wider ${currentPage === totalPages ? 'bg-black text-gray-600 border-gray-800 cursor-not-allowed' : 'bg-black text-white border-gray-700 hover:border-[#E50914]'}`}
                variant="outline"
              >
                Next
              </Button>
            </div>
          </div>

          {/* Mobile Pagination */}
          <div className="sm:hidden px-5 py-4 space-y-4">
            <div className="text-sm text-gray-400 text-center font-medium">
              Page <span className="text-white">{currentPage}</span> of <span className="text-white">{totalPages}</span>
            </div>
            <div className="flex justify-between items-center gap-3">
              <Button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-4 py-3 text-xs font-bold uppercase tracking-wider flex-1 ${currentPage === 1 ? 'bg-black text-gray-600 border-gray-800 cursor-not-allowed' : 'bg-black text-white border-gray-700 hover:border-[#E50914]'}`}
                variant="outline"
              >
                Prev
              </Button>
              <Button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`px-4 py-3 text-xs font-bold uppercase tracking-wider flex-1 ${currentPage === totalPages ? 'bg-black text-gray-600 border-gray-800 cursor-not-allowed' : 'bg-black text-white border-gray-700 hover:border-[#E50914]'}`}
                variant="outline"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Subscription Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="mx-4 sm:mx-0 max-w-md sm:max-w-lg bg-[#1a1c21] border-gray-800 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase tracking-wider">Edit Subscription</DialogTitle>
          </DialogHeader>

          {/* Message Display */}
          {message && (
            <div className={`p-3 rounded-lg font-medium text-sm ${message.type === 'success'
              ? 'bg-green-900/20 text-green-500 border border-green-900'
              : 'bg-red-900/20 text-red-500 border border-red-900'
              }`}>
              {message.text}
            </div>
          )}

          <div className="space-y-5 py-2">
            {/* Email (read-only) */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Email</label>
              <input
                type="email"
                value={editingUser?.email || ''}
                disabled
                className="w-full px-4 py-3 border border-gray-800 rounded-lg bg-black text-gray-500 cursor-not-allowed"
              />
            </div>

            {/* Plan Dropdown */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Plan</label>
              {isLoadingPlans ? (
                <div className="w-full px-4 py-3 border border-gray-800 rounded-lg bg-black text-gray-500 flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2 text-[#E50914]" />
                  Loading plans...
                </div>
              ) : (
                <select
                  value={modalPlan}
                  onChange={(e) => handlePlanChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-800 rounded-lg bg-black text-white focus:outline-none focus:ring-1 focus:ring-[#E50914]"
                  disabled={isLoadingPlans}
                >
                  <option value="" className="bg-[#1a1c21]">Select a plan</option>
                  <option value="free" className="bg-[#1a1c21]">Free</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id} className="bg-[#1a1c21]">
                      {plan.name} - UGX {plan.amount.toLocaleString()} ({plan.duration})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Plan Details */}
            {selectedPlan && (
              <div className="bg-black p-4 rounded-lg border border-gray-800">
                <h4 className="font-bold text-[#E50914] mb-3 uppercase tracking-wider text-xs">Plan Details</h4>
                <div className="space-y-2 text-sm text-gray-300">
                  <p><span className="text-gray-500">Name:</span> {selectedPlan.name}</p>
                  <p><span className="text-gray-500">Price:</span> UGX {selectedPlan.amount.toLocaleString()}</p>
                  <p><span className="text-gray-500">Duration:</span> {selectedPlan.duration}</p>
                  <p><span className="text-gray-500">Desc:</span> {selectedPlan.description}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Start Date */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Start Date</label>
                <input
                  type="date"
                  value={modalStartDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-800 rounded-lg bg-black text-white focus:outline-none focus:ring-1 focus:ring-[#E50914]"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">End Date</label>
                <input
                  type="date"
                  value={modalEndDate}
                  onChange={(e) => setModalEndDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-800 rounded-lg bg-black text-white focus:outline-none focus:ring-1 focus:ring-[#E50914]"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-3 mt-6">
            <Button
              variant="outline"
              onClick={closeModal}
              disabled={updating}
              className="w-full sm:w-auto bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white uppercase tracking-wider font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={updateSubscription}
              disabled={updating || !modalPlan || (modalPlan !== 'free' && !modalEndDate)}
              className="bg-[#E50914] text-white hover:bg-[#b80710] w-full sm:w-auto uppercase tracking-wider font-bold border-none"
            >
              {updating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="mx-4 sm:mx-0 max-w-md sm:max-w-lg bg-[#1a1c21] border-gray-800 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#E50914] font-bold uppercase tracking-wider text-xl">Delete User</DialogTitle>
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
                    You are about to permanently delete <span className="font-bold text-white bg-gray-800 px-2 py-0.5 rounded">{userToDelete?.name || userToDelete?.email || 'Unknown User'}</span>.
                  </p>
                  <p className="text-[#E50914] font-bold">
                    This action cannot be undone and will permanently erase all associated data.
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
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Yes, Delete User'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Modal */}
      <Dialog open={isDeactivateModalOpen} onOpenChange={setIsDeactivateModalOpen}>
        <DialogContent className="mx-4 sm:mx-0 max-w-md sm:max-w-lg bg-[#1a1c21] border-gray-800 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-orange-500 font-bold uppercase tracking-wider text-xl">Deactivate Subscription</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 mt-1">
                <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center border border-orange-500">
                  <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-2">
                  Deactivate Subscription?
                </h3>
                <div className="text-sm text-gray-400 space-y-2">
                  <p>
                    You are about to deactivate the premium subscription for <span className="font-bold text-white bg-gray-800 px-2 py-0.5 rounded">{userToDeactivate?.name || userToDeactivate?.email || 'Unknown User'}</span>.
                  </p>
                  <p className="text-orange-500 font-bold">
                    They will immediately lose access to premium features.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={cancelDeactivate}
              disabled={deactivating}
              className="w-full sm:w-auto bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white uppercase tracking-wider font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDeactivate}
              disabled={deactivating}
              className="bg-orange-500 text-white hover:bg-orange-600 w-full sm:w-auto uppercase tracking-wider font-bold border-none"
            >
              {deactivating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deactivating...
                </>
              ) : (
                'Yes, Deactivate'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPanelLayout>
  );
}