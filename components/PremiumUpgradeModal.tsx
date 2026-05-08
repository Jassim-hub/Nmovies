"use client";

import { Button } from '@/components/ui/button';
import { X, Star, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getSubscriptionPlans } from '@/lib/subscriptions';
import { SubscriptionPlan } from '@/lib/supabase';

interface PremiumUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PremiumUpgradeModal({ isOpen, onClose }: PremiumUpgradeModalProps) {
  const router = useRouter();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch plans from DB whenever modal opens
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    getSubscriptionPlans().then((fetchedPlans) => {
      setPlans(fetchedPlans);
      // Auto-select recommended plan, then first plan as fallback
      const recommended = fetchedPlans.find((p) => p.recommended);
      setSelectedPlanId((recommended ?? fetchedPlans[0])?.id ?? null);
      setLoading(false);
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  const handleUpgrade = () => {
    router.push('/payment');
    onClose();
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl max-w-md w-full text-center border border-gray-700 relative">

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-gray-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="px-8 pt-12 pb-6">
          <h1 className="text-[#E50914] text-lg font-semibold mb-2">Premium Plans</h1>
          <h2 className="text-white text-2xl font-bold mb-2">Choose Your Premium Plan</h2>
          <p className="text-gray-400 text-sm">Select the plan that works best for you</p>
        </div>

        {/* Plans list */}
        <div className="px-6 pb-6 space-y-4">
          {loading ? (
            // Skeleton placeholders while loading
            Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg p-4 border border-gray-700 bg-gray-800 animate-pulse h-16"
              />
            ))
          ) : plans.length === 0 ? (
            <p className="text-gray-400 text-sm py-4">
              No plans available at the moment. Please contact support.
            </p>
          ) : (
            plans.map((plan) => {
              const isSelected = selectedPlanId === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`rounded-lg p-4 border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#E50914]/20 to-orange-600/20 border-2 border-[#E50914]'
                      : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                  }`}
                  onClick={() => setSelectedPlanId(plan.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                          isSelected ? 'bg-[#E50914]' : 'bg-gray-700'
                        }`}
                      >
                        <Star
                          className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-[#E50914]'}`}
                        />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3
                            className={`font-semibold capitalize ${
                              isSelected ? 'text-[#E50914]' : 'text-white'
                            }`}
                          >
                            {plan.name}
                          </h3>
                          {plan.recommended && (
                            <span className="bg-[#E50914] text-white text-xs font-bold px-2 py-0.5 rounded">
                              RECOMMENDED
                            </span>
                          )}
                        </div>
                        {plan.description && (
                          <p
                            className={`text-sm ${
                              isSelected ? 'text-gray-300' : 'text-gray-400'
                            }`}
                          >
                            {plan.description}
                          </p>
                        )}
                        <p
                          className={`text-xs font-bold mt-0.5 ${
                            isSelected ? 'text-[#E50914]' : 'text-gray-500'
                          }`}
                        >
                          UGX {plan.amount?.toLocaleString()} ·{' '}
                          {plan.duration_in_days === 1
                            ? '1 day'
                            : `${plan.duration_in_days} days`}
                        </p>
                      </div>
                    </div>
                    <div className={isSelected ? 'text-[#E50914]' : 'text-gray-400'}>
                      {isSelected ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Upgrade CTA */}
        <div className="px-6 pb-8">
          <Button
            onClick={handleUpgrade}
            disabled={!selectedPlan || loading}
            className="w-full bg-[#E50914] hover:bg-[#b80710] disabled:opacity-50 text-white h-12 font-semibold rounded-lg"
          >
            {loading
              ? 'Loading plans…'
              : selectedPlan
              ? `Upgrade to ${selectedPlan.name}`
              : 'Choose a Plan'}
          </Button>
        </div>
      </div>
    </div>
  );
}