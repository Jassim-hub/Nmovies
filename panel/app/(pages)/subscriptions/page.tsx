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
import { Loader2 } from "lucide-react";

interface SubscriptionData {
  id: string;
  name: string;
  email: string;
  plan: string;
  days: number;
  planDuration: string;
  status: 'active' | 'expired' | 'free';
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

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<'all' | 'basic' | 'standard'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SubscriptionData | null>(null);
  const [modalPlan, setModalPlan] = useState("");
  const [modalStartDate, setModalStartDate] = useState("");
  const [modalEndDate, setModalEndDate] = useState("");
  const [updating, setUpdating] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);

  // Toast-like state for better feedback
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    fetchSubscriptions();
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setIsLoadingPlans(true);
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .order("name");

      if (error) {
        console.error("Error fetching plans:", error);
        return [];
      }

      setPlans(data || []);
      return data || [];
    } catch (error) {
      console.error("Error fetching plans:", error);
      return [];
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, name, email, subscription, subscription_start_date, subscription_expiry_date')
        .not('subscription', 'is', null);

      if (error) throw error;

      // Also fetch plans to get duration info
      const { data: plansData } = await supabase
        .from('plans')
        .select('name, duration, duration_in_days');

      const subscriptionData: SubscriptionData[] = profiles.map(profile => {
        const daysRemaining = profile.subscription_expiry_date
          ? Math.max(0, Math.ceil((new Date(profile.subscription_expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
          : 0;

        let planDuration = 'Unknown';
        let status: 'active' | 'expired' | 'free' = 'free';

        // For free users
        if (profile.subscription === 'free' || !profile.subscription) {
          planDuration = 'Free';
          status = 'free';
        } else if (profile.subscription_expiry_date) {
          const expiryDate = new Date(profile.subscription_expiry_date);
          const now = new Date();

          if (expiryDate > now) {
            status = 'active';
          } else {
            status = 'expired';
          }

          if (profile.subscription_start_date) {
            // Calculate the total subscription duration to match with plans
            const startDate = new Date(profile.subscription_start_date);
            const endDate = new Date(profile.subscription_expiry_date);
            const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

            // Find matching plan based on name and duration
            const matchingPlans = plansData?.filter(p => p.name === profile.subscription) || [];
            const exactMatch = matchingPlans.find(p => p.duration_in_days === totalDays);

            if (exactMatch) {
              planDuration = exactMatch.duration;
            } else if (matchingPlans.length > 0) {
              // If no exact match, find the closest one
              const closest = matchingPlans.reduce((prev, curr) =>
                Math.abs(curr.duration_in_days - totalDays) < Math.abs(prev.duration_in_days - totalDays) ? curr : prev
              );
              planDuration = closest.duration;
            }
          } else {
            // Fallback: just use the first plan with matching name
            const planInfo = plansData?.find(p => p.name === profile.subscription);
            planDuration = planInfo?.duration || 'Unknown';
          }
        }

        return {
          id: profile.id,
          name: profile.name || 'N/A',
          email: profile.email || 'No email',
          plan: profile.subscription || 'Unknown',
          days: daysRemaining,
          planDuration: planDuration,
          status: status,
          subscription_start_date: profile.subscription_start_date || '',
          subscription_expiry_date: profile.subscription_expiry_date || ''
        };
      });

      setSubscriptions(subscriptionData);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubscriptions = subscriptions.filter(s => {
    const matchesSearch = s.email.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === 'all'
        ? true
        : filter === 'basic'
          ? s.plan.toLowerCase().includes('basic') && s.status === 'active'
          : s.plan.toLowerCase().includes('standard') && s.status === 'active';
    return matchesSearch && matchesFilter;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredSubscriptions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSubscriptions = filteredSubscriptions.slice(startIndex, endIndex);

  // Reset to first page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filter]);

  const total = subscriptions.length;
  const standard = subscriptions.filter(s => s.plan.toLowerCase().includes('standard') && s.status === 'active').length;
  const basic = subscriptions.filter(s => s.plan.toLowerCase().includes('basic') && s.status === 'active').length;

  const handleSubscribe = async (user: SubscriptionData) => {
    setEditingUser(user);
    setIsModalOpen(true);

    // Fetch plans and set current plan if user has an active subscription
    const plansData = await fetchPlans();

    // Check if user has active subscription
    const hasActiveSubscription = user.plan &&
      user.plan !== 'free' &&
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
        const matchingPlans = plansData.filter(p => p.name === user.plan);
        existingPlan = matchingPlans.find(p => p.duration_in_days === totalDays);

        // If no exact match, find the closest one
        if (!existingPlan && matchingPlans.length > 0) {
          existingPlan = matchingPlans.reduce((prev, curr) =>
            Math.abs(curr.duration_in_days - totalDays) < Math.abs(prev.duration_in_days - totalDays) ? curr : prev
          );
        }
      } else {
        // Fallback: use first plan with matching name
        existingPlan = plansData.find(p => p.name === user.plan);
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
    setMessage(null);
  };

  const updateSubscription = async () => {
    if (!editingUser) return;

    // Validate required fields
    if (!modalPlan || !modalEndDate) {
      setMessage({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }

    try {
      setUpdating(true);

      // Find the selected plan to get the name
      const selectedPlanData = plans.find(p => p.id === modalPlan);
      const planName = selectedPlanData ? selectedPlanData.name : modalPlan;

      const { error } = await supabase
        .from('profiles')
        .update({
          subscription: planName,
          subscription_start_date: modalStartDate,
          subscription_expiry_date: modalEndDate
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Subscription updated successfully!' });

      // Refresh the data
      await fetchSubscriptions();
      closeModal();
    } catch (error) {
      console.error('Error updating subscription:', error);
      setMessage({ type: 'error', text: 'Failed to update subscription. Please try again.' });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <AdminPanelLayout>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#1a1c21] rounded-2xl shadow-xl p-6 border border-gray-800 flex flex-col items-center hover:border-[#E50914]/50 transition-colors">
          <div className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Subscriptions</div>
          <div className="text-4xl font-black text-[#E50914] mt-2 tracking-tighter">{total}</div>
        </div>
        <div className="bg-[#1a1c21] rounded-2xl shadow-xl p-6 border border-gray-800 flex flex-col items-center hover:border-[#E50914]/50 transition-colors">
          <div className="text-gray-400 text-xs font-bold uppercase tracking-wider">Standard Premium</div>
          <div className="text-4xl font-black text-[#E50914] mt-2 tracking-tighter">{standard}</div>
        </div>
        <div className="bg-[#1a1c21] rounded-2xl shadow-xl p-6 border border-gray-800 flex flex-col items-center hover:border-[#E50914]/50 transition-colors">
          <div className="text-gray-400 text-xs font-bold uppercase tracking-wider">Basic Premium</div>
          <div className="text-4xl font-black text-[#E50914] mt-2 tracking-tighter">{basic}</div>
        </div>
      </div>
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h1 className="text-2xl font-bold text-white uppercase tracking-wider">Subscriptions</h1>
          <input
            type="text"
            placeholder="Search by email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-black border border-gray-800 text-white rounded-lg px-4 py-2 w-full sm:w-64 focus:outline-none focus:ring-1 focus:ring-[#E50914] focus:border-transparent placeholder-gray-600"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            className={`px-4 py-2 rounded-lg font-bold uppercase tracking-wider text-xs border ${filter === 'all' ? 'bg-[#E50914] text-white border-transparent shadow-[0_0_10px_rgba(229,9,20,0.3)]' : 'bg-transparent text-gray-400 border-gray-800 hover:border-[#E50914]'}`}
            onClick={() => setFilter('all')}
          >
            All Plans
          </Button>
          <Button
            className={`px-4 py-2 rounded-lg font-bold uppercase tracking-wider text-xs border ${filter === 'basic' ? 'bg-[#E50914] text-white border-transparent shadow-[0_0_10px_rgba(229,9,20,0.3)]' : 'bg-transparent text-gray-400 border-gray-800 hover:border-[#E50914]'}`}
            onClick={() => setFilter('basic')}
          >
            Basic Premium
          </Button>
          <Button
            className={`px-4 py-2 rounded-lg font-bold uppercase tracking-wider text-xs border ${filter === 'standard' ? 'bg-[#E50914] text-white border-transparent shadow-[0_0_10px_rgba(229,9,20,0.3)]' : 'bg-transparent text-gray-400 border-gray-800 hover:border-[#E50914]'}`}
            onClick={() => setFilter('standard')}
          >
            Standard Premium
          </Button>
        </div>
      </div>
      {/* Desktop Table View */}
      <div className="hidden lg:block bg-[#1a1c21] rounded-2xl p-0 border border-gray-800 shadow-xl overflow-x-auto">
        <table className="min-w-full text-left">
          <thead>
            <tr className="border-b border-gray-800 bg-[#141414]/50">
              <th className="px-6 py-4 text-[#E50914] font-bold uppercase tracking-wider text-xs">#</th>
              <th className="px-6 py-4 text-[#E50914] font-bold uppercase tracking-wider text-xs">Email</th>
              <th className="px-6 py-4 text-[#E50914] font-bold uppercase tracking-wider text-xs">Plan</th>
              <th className="px-6 py-4 text-[#E50914] font-bold uppercase tracking-wider text-xs">Subscription (days)</th>
              <th className="px-6 py-4 text-[#E50914] font-bold uppercase tracking-wider text-xs">Status</th>
              <th className="px-6 py-4 text-[#E50914] font-bold uppercase tracking-wider text-xs">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500 italic">Loading subscriptions...</td>
              </tr>
            ) : filteredSubscriptions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500 italic">No subscriptions found.</td>
              </tr>
            ) : (
              paginatedSubscriptions.map((s, idx) => (
                <tr key={s.id} className="border-b border-gray-800 hover:bg-[#141414] transition-colors">
                  <td className="px-6 py-4 text-gray-400 font-medium">{startIndex + idx + 1}</td>
                  <td className="px-6 py-4 text-gray-200">{s.email}</td>
                  <td className="px-6 py-4 text-white font-bold">{s.plan}</td>
                  <td className="px-6 py-4 text-gray-300">
                    <div className="flex flex-col">
                      <span className="font-bold">{s.days} days</span>
                      <span className="text-xs text-gray-500">({s.planDuration})</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-3 py-1 text-[10px] uppercase tracking-wider font-bold rounded-lg border ${s.status === 'active'
                      ? 'bg-green-900/20 text-green-500 border-green-900'
                      : s.status === 'expired'
                        ? 'bg-red-900/20 text-red-500 border-red-900'
                        : 'bg-gray-800 text-gray-400 border-gray-700'
                      }`}>
                      {s.status === 'active' ? 'Active' : s.status === 'expired' ? 'Expired' : 'Free'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Button
                      onClick={() => handleSubscribe(s)}
                      className="bg-transparent border border-gray-700 hover:border-[#E50914] text-white px-4 py-2 text-xs font-bold uppercase tracking-wider"
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {loading ? (
          <div className="bg-[#1a1c21] rounded-2xl p-6 border border-gray-800 shadow-xl text-center text-gray-500 italic">
            Loading subscriptions...
          </div>
        ) : filteredSubscriptions.length === 0 ? (
          <div className="bg-[#1a1c21] rounded-2xl p-6 border border-gray-800 shadow-xl text-center text-gray-500 italic">
            No subscriptions found.
          </div>
        ) : (
          paginatedSubscriptions.map((s, idx) => (
            <div key={s.id} className="bg-[#1a1c21] rounded-2xl p-5 border border-gray-800 shadow-xl">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="text-xs text-[#E50914] font-bold uppercase tracking-wider mb-2">#{startIndex + idx + 1}</div>
                  <div className="text-lg text-white font-bold break-all mb-3">{s.email}</div>
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span className="font-bold text-gray-300">{s.plan}</span>
                    <span className={`inline-block px-3 py-1 text-[10px] uppercase tracking-wider font-bold rounded-lg border ${s.status === 'active'
                      ? 'bg-green-900/20 text-green-500 border-green-900'
                      : s.status === 'expired'
                        ? 'bg-red-900/20 text-red-500 border-red-900'
                        : 'bg-gray-800 text-gray-400 border-gray-700'
                      }`}>
                      {s.status === 'active' ? 'Active' : s.status === 'expired' ? 'Expired' : 'Free'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">
                    <span className="font-bold text-gray-200">{s.days} days remaining</span>
                    <span className="text-gray-500 ml-2">({s.planDuration})</span>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-800 mt-2">
                <Button
                  onClick={() => handleSubscribe(s)}
                  className="bg-transparent border border-gray-700 hover:border-[#E50914] text-white px-4 py-3 text-xs font-bold uppercase tracking-wider w-full"
                >
                  Edit Subscription
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
              Showing <span className="text-white">{startIndex + 1}</span> to <span className="text-white">{Math.min(endIndex, filteredSubscriptions.length)}</span> of <span className="text-white">{filteredSubscriptions.length}</span> results
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
              disabled={updating || !modalPlan || !modalEndDate}
              className="bg-[#E50914] text-white hover:bg-[#b80710] w-full sm:w-auto uppercase tracking-wider font-bold border-none"
            >
              {updating ? 'Updating...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPanelLayout>
  );
}