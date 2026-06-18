'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  Download,
  Smartphone,
  Monitor,
  Apple,
  Bell,
  Wifi,
  Zap,
  Shield,
  Check,
  Share,
} from 'lucide-react';
import { useInstallPrompt } from '@/lib/hooks/useInstallPrompt';
import { useOneSignal } from '@/lib/hooks/useOneSignal';

// ----- Types & helpers -----
type Platform = 'android' | 'ios' | 'desktop' | 'unknown';

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/win|mac|linux/.test(ua)) return 'desktop';
  return 'unknown';
}

// ----- Feature list -----
const features = [
  { icon: Zap, title: 'Lightning Fast', desc: 'Loads instantly on every device' },
  { icon: Wifi, title: 'Offline Capable', desc: 'Watch without an internet connection' },
  { icon: Bell, title: 'Push Notifications', desc: 'Get alerts for new movies & series' },
  { icon: Shield, title: 'Secure & Private', desc: 'Your data stays on your device' },
];

// ----- iOS step-by-step guide -----
const iosSteps = [
  { step: 1, emoji: '🌐', title: 'Open in Safari', desc: 'Make sure you\'re using Safari browser — not Chrome or Firefox' },
  { step: 2, emoji: '⬆️', title: 'Tap the Share button', desc: 'Tap the share icon at the bottom of your screen (box with arrow)' },
  { step: 3, emoji: '➕', title: 'Add to Home Screen', desc: 'Scroll down in the menu and tap "Add to Home Screen"' },
  { step: 4, emoji: '✅', title: 'Confirm', desc: 'Tap "Add" in the top-right corner and the app appears on your home screen' },
];

// ----- Desktop guide -----
const desktopSteps = [
  { step: 1, emoji: '🌐', title: 'Open in Chrome or Edge', desc: 'Navigate to nicholmoviesug.com in Chrome, Edge, or Brave' },
  { step: 2, emoji: '📥', title: 'Click the install icon', desc: 'Look for the install icon (⊕) in the address bar on the right' },
  { step: 3, emoji: '✅', title: 'Confirm installation', desc: 'Click "Install" in the popup and the app opens in its own window' },
];


export default function DownloadPage() {
  const { installState, isIOS, isStandalone, canInstall, promptInstall } = useInstallPrompt();
  const { permission, promptForNotifications, isInitialized } = useOneSignal();

  const [platform, setPlatform] = useState<Platform>('unknown');
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'desktop'>('android');
  const [notifRequesting, setNotifRequesting] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const p = detectPlatform();
    setPlatform(p);
    if (p === 'ios') setActiveTab('ios');
    else if (p === 'desktop') setActiveTab('desktop');
    else setActiveTab('android');

    if (isStandalone) setInstalled(true);
  }, [isStandalone]);

  useEffect(() => {
    if (installState === 'installed') setInstalled(true);
  }, [installState]);

  const handleInstall = async () => {
    setInstalling(true);
    await promptInstall();
    setInstalling(false);
  };

  const handleEnableNotifications = async () => {
    setNotifRequesting(true);
    await promptForNotifications();
    setNotifRequesting(false);
    if (permission === 'granted') setNotifSuccess(true);
    setTimeout(() => setNotifSuccess(false), 4000);
  };

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-24 pb-16 px-4">
        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(229,9,20,0.18) 0%, transparent 70%)',
          }}
        />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* App icon */}
          <div className="inline-block mb-6 animate-float">
            <div
              className="w-24 h-24 rounded-[28px] overflow-hidden shadow-2xl mx-auto"
              style={{
                boxShadow: '0 20px 60px rgba(229,9,20,0.4), 0 0 0 1px rgba(229,9,20,0.2)',
              }}
            >
              <Image
                src="/logo.jpeg"
                alt="NicholMoviesUg App"
                width={96}
                height={96}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-4 leading-tight">
            <span className="text-white">Get the </span>
            <span
              style={{
                background: 'linear-gradient(135deg, #E50914 0%, #ff4d4d 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              NicholMovies
            </span>
            <span className="text-white"> App</span>
          </h1>

          <p className="text-gray-300 text-lg sm:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
            Install directly to your home screen — no app store needed. Works on Android, iOS &amp; desktop.
          </p>

          {/* Quick install button for Android */}
          {canInstall && !installed && (
            <button
              id="hero-install-btn"
              onClick={handleInstall}
              disabled={installing}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-bold text-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-60 shadow-2xl mb-4"
              style={{
                background: 'linear-gradient(135deg, #E50914 0%, #b80710 100%)',
                boxShadow: '0 8px 32px rgba(229,9,20,0.45)',
              }}
            >
              <Download className="w-6 h-6" />
              {installing ? 'Installing...' : 'Install App Now'}
            </button>
          )}

          {installed && (
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-green-500/20 border border-green-500/40 text-green-400 font-semibold text-base mb-4">
              <Check className="w-5 h-5" />
              App Installed! Open it from your home screen.
            </div>
          )}

          {/* Notification CTA */}
          {isInitialized && permission === 'default' && !notifSuccess && (
            <div className="mt-2">
              <button
                id="hero-notif-btn"
                onClick={handleEnableNotifications}
                disabled={notifRequesting}
                className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white underline underline-offset-2 transition-colors"
              >
                <Bell className="w-4 h-4 text-[#E50914]" />
                {notifRequesting ? 'Requesting...' : 'Also enable push notifications →'}
              </button>
            </div>
          )}
          {notifSuccess && (
            <p className="mt-2 text-green-400 text-sm font-medium">
              ✅ Notifications enabled!
            </p>
          )}
        </div>
      </section>

      {/* ── Feature grid ────────────────────────────────── */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl p-5 flex flex-col items-center text-center gap-3 transition-all hover:scale-[1.02]"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(229,9,20,0.15)' }}
              >
                <Icon className="w-5 h-5 text-[#E50914]" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{title}</p>
                <p className="text-gray-500 text-xs mt-0.5 leading-snug">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Install guide tabs ───────────────────────────── */}
      <section className="py-8 px-4 pb-20">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-6">How to Install</h2>

          {/* Tab switcher */}
          <div
            className="flex rounded-xl p-1 mb-8 gap-1"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {([
              { key: 'android', icon: Smartphone, label: 'Android' },
              { key: 'ios', icon: Apple, label: 'iPhone/iPad' },
              { key: 'desktop', icon: Monitor, label: 'Desktop' },
            ] as const).map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === key
                    ? 'text-white shadow-md'
                    : 'text-gray-500 hover:text-gray-300'
                  }`}
                style={
                  activeTab === key
                    ? { background: 'linear-gradient(135deg, #E50914, #b80710)' }
                    : {}
                }
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Android tab */}
          {activeTab === 'android' && (
            <div className="space-y-4">
              {/* Detected / install card */}
              <div
                className="rounded-2xl p-6 mb-2"
                style={{
                  background: 'linear-gradient(135deg, rgba(229,9,20,0.12) 0%, rgba(139,0,0,0.08) 100%)',
                  border: '1px solid rgba(229,9,20,0.25)',
                }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0"
                    style={{ boxShadow: '0 4px 20px rgba(229,9,20,0.3)' }}
                  >
                    <Image src="/logo.jpeg" alt="App" width={56} height={56} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-base">NicholMoviesUg</p>
                    <p className="text-gray-400 text-sm">Progressive Web App</p>
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="w-3 h-3 rounded-full" style={{ background: '#E50914', opacity: i < 5 ? 1 : 0.3 }} />
                      ))}
                      <span className="text-gray-400 text-xs ml-1">5.0 • Free</span>
                    </div>
                  </div>
                </div>

                {installed ? (
                  <div className="flex items-center gap-2 py-3 px-4 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 font-semibold text-sm">
                    <Check className="w-4 h-4" />
                    Installed! Open from your home screen.
                  </div>
                ) : canInstall ? (
                  <button
                    id="android-install-btn"
                    onClick={handleInstall}
                    disabled={installing}
                    className="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #E50914, #b80710)', boxShadow: '0 4px 20px rgba(229,9,20,0.35)' }}
                  >
                    <Download className="w-4 h-4" />
                    {installing ? 'Installing...' : 'Install on Android'}
                  </button>
                ) : (
                  <div
                    className="w-full py-3 rounded-xl text-center text-sm font-medium"
                    style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}
                  >
                    Open this page in Chrome on Android to install
                  </div>
                )}
              </div>

              {/* Manual steps fallback */}
              {!canInstall && !installed && (
                <div className="space-y-3">
                  <p className="text-gray-400 text-sm font-medium text-center">Or follow these steps in Chrome:</p>
                  {[
                    { step: 1, emoji: '🌐', text: 'Open nicholmoviesug.com in Chrome on your Android phone' },
                    { step: 2, emoji: '⋮', text: 'Tap the three-dot menu (⋮) in the top-right corner of Chrome' },
                    { step: 3, emoji: '📲', text: 'Tap "Add to Home screen" or "Install app"' },
                    { step: 4, emoji: '✅', text: 'Tap "Install" to confirm — the app icon appears on your home screen' },
                  ].map(({ step, emoji, text }) => (
                    <div
                      key={step}
                      className="flex items-start gap-3 p-4 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <div
                        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                        style={{ background: '#E50914' }}
                      >
                        {step}
                      </div>
                      <p className="text-gray-300 text-sm leading-snug pt-1">
                        <span className="mr-1">{emoji}</span>{text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* iOS tab */}
          {activeTab === 'ios' && (
            <div className="space-y-3">
              <div
                className="rounded-2xl p-4 mb-4 flex items-center gap-3"
                style={{ background: 'rgba(255,165,0,0.1)', border: '1px solid rgba(255,165,0,0.25)' }}
              >
                <span className="text-2xl flex-shrink-0">⚠️</span>
                <p className="text-amber-300 text-sm leading-snug">
                  <strong>Must use Safari.</strong> Chrome and other browsers on iOS don't support installing apps.
                </p>
              </div>

              {iosSteps.map(({ step, emoji, title, desc }) => (
                <div
                  key={step}
                  className="flex items-start gap-4 p-4 rounded-2xl transition-all hover:scale-[1.01]"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: 'linear-gradient(135deg, #E50914, #b80710)' }}
                  >
                    {step}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm flex items-center gap-2">
                      <span>{emoji}</span> {title}
                    </p>
                    <p className="text-gray-400 text-xs mt-1 leading-snug">{desc}</p>
                  </div>
                </div>
              ))}

              {/* iOS visual hint */}
              <div
                className="rounded-2xl p-4 flex items-center gap-3 mt-2"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <Share className="w-6 h-6 text-[#E50914] flex-shrink-0" />
                <p className="text-gray-400 text-sm">
                  The Share button looks like a box with an arrow pointing up: <strong className="text-white">⬆️</strong>
                </p>
              </div>
            </div>
          )}

          {/* Desktop tab */}
          {activeTab === 'desktop' && (
            <div className="space-y-3">
              {desktopSteps.map(({ step, emoji, title, desc }) => (
                <div
                  key={step}
                  className="flex items-start gap-4 p-4 rounded-2xl transition-all hover:scale-[1.01]"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: 'linear-gradient(135deg, #E50914, #b80710)' }}
                  >
                    {step}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm flex items-center gap-2">
                      <span>{emoji}</span> {title}
                    </p>
                    <p className="text-gray-400 text-xs mt-1 leading-snug">{desc}</p>
                  </div>
                </div>
              ))}

              {canInstall && !installed && (
                <button
                  id="desktop-install-btn"
                  onClick={handleInstall}
                  disabled={installing}
                  className="w-full mt-2 py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #E50914, #b80710)', boxShadow: '0 4px 20px rgba(229,9,20,0.35)' }}
                >
                  <Download className="w-4 h-4" />
                  {installing ? 'Installing...' : 'Install on Desktop'}
                </button>
              )}
              {installed && (
                <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 font-semibold text-sm mt-2">
                  <Check className="w-4 h-4" />
                  App already installed!
                </div>
              )}
            </div>
          )}

          {/* ── Notification section ── */}
          <div
            className="mt-10 rounded-2xl p-6"
            style={{
              background: 'linear-gradient(135deg, rgba(229,9,20,0.1) 0%, rgba(139,0,0,0.07) 100%)',
              border: '1px solid rgba(229,9,20,0.2)',
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(229,9,20,0.2)' }}
              >
                <Bell className="w-5 h-5 text-[#E50914]" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">Never miss a new release</p>
                <p className="text-gray-400 text-xs">Enable notifications to get alerted instantly</p>
              </div>
            </div>

            {permission === 'granted' ? (
              <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                <Check className="w-4 h-4" />
                Push notifications are enabled!
              </div>
            ) : permission === 'denied' ? (
              <p className="text-amber-400 text-sm">
                Notifications are blocked. Please allow them in your browser settings.
              </p>
            ) : (
              <button
                id="download-notif-btn"
                onClick={handleEnableNotifications}
                disabled={notifRequesting || !isInitialized}
                className="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-50"
                style={{ background: 'rgba(229,9,20,0.25)', border: '1px solid rgba(229,9,20,0.4)' }}
              >
                <Bell className="w-4 h-4" />
                {notifRequesting ? 'Requesting...' : !isInitialized ? 'Loading...' : 'Enable Notifications'}
              </button>
            )}
          </div>

          {/* ── Support links ── */}
          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm mb-3">Need help? Reach us on:</p>
            <div className="flex items-center justify-center gap-5">
              <div className="flex flex-col gap-2">
                <a
                  href="https://wa.me/256757588585"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/whatsapp-brands-solid-full.svg" alt="WhatsApp" className="w-5 h-5" />
                  WhatsApp 1
                </a>
                <a
                  href="https://wa.me/256768908155"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/whatsapp-brands-solid-full.svg" alt="WhatsApp" className="w-5 h-5" />
                  WhatsApp 2
                </a>
              </div>
              <a
                href="http://t.me/Nicholmovies256"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <svg viewBox="0 0 50 50" width="20" height="20" fill="#229ED9">
                  <path d="M25,2c12.703,0,23,10.297,23,23S37.703,48,25,48S2,37.703,2,25S12.297,2,25,2z M32.934,34.375c0.423-1.298,2.405-14.234,2.65-16.783c0.074-0.772-0.17-1.285-0.648-1.514c-0.578-0.278-1.434-0.139-2.427,0.219c-1.362,0.491-18.774,7.884-19.78,8.312c-0.954,0.405-1.856,0.847-1.856,1.487c0,0.45,0.267,0.703,1.003,0.966c0.766,0.273,2.695,0.858,3.834,1.172c1.097,0.303,2.346,0.04,3.046-0.395c0.742-0.461,9.305-6.191,9.92-6.693c0.614-0.502,1.104,0.141,0.602,0.644c-0.502,0.502-6.38,6.207-7.155,6.997c-0.941,0.959-0.273,1.953,0.358,2.351c0.721,0.454,5.906,3.932,6.687,4.49c0.781,0.558,1.573,0.811,2.298,0.811C32.191,36.439,32.573,35.484,32.934,34.375z" />
                </svg>
                Telegram
              </a>
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </main>
  );
}
