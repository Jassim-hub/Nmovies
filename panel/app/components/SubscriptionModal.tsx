"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";

interface Plan {
  id: string;
  name: string;
  amount: number;
  description: string;
  duration: string;
  duration_in_months: number;
  duration_in_days: number;
}

interface Profile {
  id: string;
  name: string;
  email: string;
  subscription: string;
  subscription_start_date: string;
  subscription_expiry_date: string;
}

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  onUpdate: () => void;
}

export default function SubscriptionModal({ isOpen, onClose, profile, onUpdate }: SubscriptionModalProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [form, setForm] = useState({
    email: "",
    subscription_plan: "",
    start_date: "",
    end_date: "",
  });

  useEffect(() => {
    if (isOpen) {
      fetchPlans();
      if (profile) {
        setForm({
          email: profile.email || "",
          subscription_plan: profile.subscription || "",
          start_date: profile.subscription_start_date ? new Date(profile.subscription_start_date).toISOString().split('T')[0] : "",
          end_date: profile.subscription_expiry_date ? new Date(profile.subscription_expiry_date).toISOString().split('T')[0] : "",
        });
      }
    }
  }, [isOpen, profile]);

  const fetchPlans = async () => {
    const { data, error } = await supabase.from("plans").select("*").order("name");
    if (error) {
      console.error("Error fetching plans:", error);
    } else {
      setPlans(data || []);
    }
  };

  const handlePlanChange = (planId: string) => {
    const selectedPlan = plans.find(p => p.id === planId);
    if (selectedPlan) {
      const startDate = form.start_date || new Date().toISOString().split('T')[0];
      const endDate = calculateEndDate(startDate, selectedPlan.duration_in_days || 0);
      
      setForm(prev => ({
        ...prev,
        subscription_plan: planId,
        start_date: startDate,
        end_date: endDate,
      }));
    }
  };

  const calculateEndDate = (startDate: string, durationInDays: number) => {
    const start = new Date(startDate);
    const end = new Date(start.getTime() + (durationInDays * 24 * 60 * 60 * 1000));
    return end.toISOString().split('T')[0];
  };

  const handleStartDateChange = (startDate: string) => {
    const selectedPlan = plans.find(p => p.id === form.subscription_plan);
    const endDate = selectedPlan ? calculateEndDate(startDate, selectedPlan.duration_in_days || 0) : "";
    
    setForm(prev => ({
      ...prev,
      start_date: startDate,
      end_date: endDate,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setLoading(true);
    setError("");

    const updateData = {
      email: form.email,
      subscription: form.subscription_plan,
      subscription_start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
      subscription_expiry_date: form.end_date ? new Date(form.end_date).toISOString() : null,
    };

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", profile.id);

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      onUpdate();
      onClose();
    }
  };

  if (!isOpen) return null;

  const selectedPlan = plans.find(p => p.id === form.subscription_plan);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-[#1a1c21] rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl border border-gray-800">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold text-white uppercase tracking-wide">Edit Subscription</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-[#E50914] transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-gray-400 font-bold mb-2 uppercase tracking-wider text-xs">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
              className="w-full p-3 rounded-lg bg-black border border-gray-800 text-white placeholder-gray-600 focus:border-[#E50914] focus:outline-none focus:ring-1 focus:ring-[#E50914]"
              placeholder="Enter email"
              required
            />
          </div>

          <div>
            <label className="block text-gray-400 font-bold mb-2 uppercase tracking-wider text-xs">Subscription Plan</label>
            <select
              value={form.subscription_plan}
              onChange={(e) => handlePlanChange(e.target.value)}
              className="w-full p-3 rounded-lg bg-black border border-gray-800 text-white focus:border-[#E50914] focus:outline-none focus:ring-1 focus:ring-[#E50914]"
              required
            >
              <option value="">Select a plan</option>
              {plans.map(plan => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} - {plan.duration} - (${plan.amount})
                </option>
              ))}
            </select>
            
            {selectedPlan && (
              <div className="mt-3 text-sm text-gray-300 bg-black p-3 rounded-lg border border-gray-800 font-medium">
                Duration: <span className="text-[#E50914]">{selectedPlan.duration_in_days} days</span> • Amount: <span className="text-[#E50914]">${selectedPlan.amount}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-gray-400 font-bold mb-2 uppercase tracking-wider text-xs">Start Date</label>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="w-full p-3 rounded-lg bg-black border border-gray-800 text-white focus:border-[#E50914] focus:outline-none focus:ring-1 focus:ring-[#E50914]"
              required
            />
          </div>

          <div>
            <label className="block text-gray-400 font-bold mb-2 uppercase tracking-wider text-xs">End Date</label>
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => setForm(prev => ({ ...prev, end_date: e.target.value }))}
              className="w-full p-3 rounded-lg bg-black border border-gray-800 text-white focus:border-[#E50914] focus:outline-none focus:ring-1 focus:ring-[#E50914]"
              required
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-900/20 p-3 rounded-lg border border-red-900">{error}</div>
          )}

          <div className="flex gap-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white uppercase tracking-wider font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#E50914] hover:bg-[#b80710] text-white uppercase tracking-wider font-bold border-none"
            >
              {loading ? "Updating..." : "Update"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}