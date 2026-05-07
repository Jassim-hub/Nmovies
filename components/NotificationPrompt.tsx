'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { useOneSignal } from '@/lib/hooks/useOneSignal';

const DISMISSED_KEY = 'nicholmoviesug-notif-dismissed';
const PROMPT_DELAY_MS = 8000; // Show after 8 seconds

export default function NotificationPrompt() {
  const { permission, isInitialized, promptForNotifications } = useOneSignal();
  const [visible, setVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Don't show if already granted or denied
    if (permission === 'granted' || permission === 'denied' || permission === 'unsupported') return;

    // Don't show if loading yet
    if (permission === 'loading' || !isInitialized) return;

    // Don't show if user already dismissed within 14 days
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (raw) {
      const dismissedAt = parseInt(raw, 10);
      const fourteenDays = 14 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedAt < fourteenDays) return;
    }

    const timer = setTimeout(() => setVisible(true), PROMPT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [permission, isInitialized]);

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
  };

  const handleEnable = async () => {
    setRequesting(true);
    try {
      await promptForNotifications();
    } finally {
      setRequesting(false);
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      id="notification-prompt"
      className="fixed top-4 right-4 left-4 lg:left-auto lg:max-w-sm z-50 animate-drop-in"
      role="dialog"
      aria-label="Enable notifications"
    >
      <div
        className="rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(20,20,20,0.98) 0%, rgba(20,5,5,0.98) 100%)',
          border: '1px solid rgba(229,9,20,0.35)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Top accent bar */}
        <div className="h-0.5 bg-gradient-to-r from-[#E50914] via-[#ff6b6b] to-[#E50914]" />

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            {/* Bell icon */}
            <div
              className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #E50914 0%, #b80710 100%)',
                boxShadow: '0 4px 15px rgba(229,9,20,0.35)',
              }}
            >
              <Bell className="w-5 h-5 text-white" />
            </div>

            <div className="flex-1 min-w-0 pr-6">
              <p className="text-white font-bold text-sm leading-tight">Stay in the loop! 🎬</p>
              <p className="text-gray-400 text-xs mt-0.5 leading-snug">
                Get notified when new movies &amp; series drop — be the first to watch!
              </p>
            </div>

            {/* Close */}
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 text-gray-600 hover:text-gray-300 transition-colors p-1 rounded-full hover:bg-white/10"
              aria-label="Dismiss notification prompt"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDismiss}
              className="flex-1 py-2 text-sm text-gray-400 font-medium rounded-xl border border-gray-700 hover:border-gray-500 hover:text-white transition-all flex items-center justify-center gap-1.5"
            >
              <BellOff className="w-3.5 h-3.5" />
              No thanks
            </button>
            <button
              id="enable-notifications-btn"
              onClick={handleEnable}
              disabled={requesting}
              className="flex-1 py-2 text-sm text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: requesting
                  ? 'rgba(229,9,20,0.5)'
                  : 'linear-gradient(135deg, #E50914 0%, #b80710 100%)',
                boxShadow: requesting ? 'none' : '0 4px 15px rgba(229,9,20,0.3)',
              }}
            >
              <Bell className="w-3.5 h-3.5" />
              {requesting ? 'Enabling...' : 'Enable'}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes drop-in {
          from { transform: translateY(-16px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-drop-in {
          animation: drop-in 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards;
        }
      `}</style>
    </div>
  );
}
