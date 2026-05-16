'use client';

import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Monitor } from 'lucide-react';
import { useInstallPrompt } from '@/lib/hooks/useInstallPrompt';

const DISMISS_KEY = 'nicholmoviesug-install-dismissed';

export default function InstallAppBanner() {
  const { installState, isIOS, canInstall, isStandalone, promptInstall, dismiss } =
    useInstallPrompt();
  const [visible, setVisible] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isStandalone) return; // Already installed — never show

    // Check if user dismissed within last 7 days
    const raw = localStorage.getItem(DISMISS_KEY);
    if (raw) {
      const dismissedAt = parseInt(raw, 10);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedAt < sevenDays) return;
    }

    // Show after 3 seconds if installable or on iOS
    const timer = setTimeout(() => {
      if (canInstall || isIOS) setVisible(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [canInstall, isIOS, isStandalone]);

  const handleDismiss = () => {
    setVisible(false);
    setShowIOSGuide(false);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    dismiss();
  };

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    await promptInstall();
    if (installState === 'installed') setVisible(false);
  };

  if (!visible || isStandalone) return null;

  return (
    <>
      {/* Main banner */}
      <div
        className="fixed bottom-20 lg:bottom-6 left-4 right-4 lg:left-auto lg:right-6 lg:max-w-sm z-50 animate-slide-up"
        role="dialog"
        aria-label="Install NicholMoviesUg App"
      >
        <div
          className="relative rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(20,20,20,0.97) 0%, rgba(35,10,10,0.97) 100%)',
            border: '1px solid rgba(229,9,20,0.4)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Red accent top line */}
          <div className="h-1 bg-gradient-to-r from-[#E50914] via-[#ff4444] to-[#E50914]" />

          <div className="p-4">
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors rounded-full p-1 hover:bg-white/10"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3 pr-6">
              {/* App icon */}
              <div
                className="flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden border border-[#E50914]/30 shadow-lg"
                style={{ background: '#1a0000' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.jpeg" alt="NicholMoviesUg" className="w-full h-full object-cover" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm leading-tight">NicholMoviesUg</p>
                <p className="text-gray-400 text-xs mt-0.5 leading-snug">
                  {isIOS
                    ? 'Add to your home screen for the best experience'
                    : 'Install for faster access & offline support'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleDismiss}
                className="flex-1 py-2 rounded-xl text-gray-400 text-sm font-medium border border-gray-700 hover:border-gray-500 hover:text-white transition-all"
              >
                Not now
              </button>
              <button
                id="pwa-install-btn"
                onClick={handleInstall}
                className="flex-1 py-2 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #E50914 0%, #b80710 100%)',
                  boxShadow: '0 4px 20px rgba(229,9,20,0.4)',
                }}
              >
                {isIOS ? (
                  <Smartphone className="w-4 h-4" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {isIOS ? 'How to install' : 'Install App'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* iOS step-by-step overlay */}
      {showIOSGuide && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl overflow-hidden mb-20 lg:mb-4"
            style={{ background: '#1a1a1a', border: '1px solid rgba(229,9,20,0.3)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1 bg-gradient-to-r from-[#E50914] to-[#ff4444]" />
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-base">Add to Home Screen</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {[
                  {
                    step: 1,
                    text: 'Tap the Share button at the bottom of your Safari browser',
                    emoji: '⬆️',
                  },
                  {
                    step: 2,
                    text: 'Scroll down in the share sheet and tap "Add to Home Screen"',
                    emoji: '➕',
                  },
                  {
                    step: 3,
                    text: 'Tap "Add" in the top-right corner to confirm',
                    emoji: '✅',
                  },
                ].map(({ step, text, emoji }) => (
                  <div key={step} className="flex items-start gap-3">
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ background: '#E50914' }}
                    >
                      {step}
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-300 text-sm leading-snug">
                        <span className="mr-1">{emoji}</span>
                        {text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-gray-500 text-xs text-center mt-4">
                Only works in Safari on iOS
              </p>

              <button
                onClick={() => { setShowIOSGuide(false); handleDismiss(); }}
                className="w-full mt-4 py-3 rounded-xl text-white font-bold text-sm transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #E50914, #b80710)' }}
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.4s ease-out forwards;
        }
      `}</style>
    </>
  );
}
