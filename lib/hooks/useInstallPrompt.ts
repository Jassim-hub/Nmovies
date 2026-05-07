'use client';

import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export type InstallState = 'idle' | 'available' | 'installing' | 'installed' | 'ios' | 'unsupported';

interface UseInstallPromptReturn {
  installState: InstallState;
  isIOS: boolean;
  isStandalone: boolean;
  canInstall: boolean;
  promptInstall: () => Promise<void>;
  dismiss: () => void;
}

export function useInstallPrompt(): UseInstallPromptReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installState, setInstallState] = useState<InstallState>('idle');
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    // Detect if already running as installed PWA
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    if (standalone) {
      setInstallState('installed');
      return;
    }

    if (ios) {
      setInstallState('ios');
      return;
    }

    // Listen for Android/Chrome install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setInstallState('available');
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setInstallState('installed');
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    setInstallState('installing');
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallState('installed');
      } else {
        setInstallState('available');
      }
    } catch {
      setInstallState('available');
    } finally {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setInstallState('idle');
  }, []);

  return {
    installState,
    isIOS,
    isStandalone,
    canInstall: installState === 'available',
    promptInstall,
    dismiss,
  };
}
