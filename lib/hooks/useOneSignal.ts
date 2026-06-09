'use client';

import { useState, useEffect, useCallback } from 'react';

interface OneSignalInstance {
  init: (options: Record<string, unknown>) => Promise<void>;
  isPushNotificationsEnabled: () => Promise<boolean>;
  showNativePrompt: () => Promise<void>;
  setExternalUserId: (id: string) => Promise<void>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    OneSignalDeferred?: Array<(instance: OneSignalInstance) => void>;
    OneSignal?: OneSignalInstance;
  }
}

export type NotificationPermission = 'default' | 'granted' | 'denied' | 'loading' | 'unsupported';

interface UseOneSignalReturn {
  permission: NotificationPermission;
  isSubscribed: boolean;
  isInitialized: boolean;
  promptForNotifications: () => Promise<void>;
  linkUserId: (userId: string) => Promise<void>;
}

export function useOneSignal(): UseOneSignalReturn {
  const [permission, setPermission] = useState<NotificationPermission>('loading');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Notifications not supported on this browser
    if (!('Notification' in window)) {
      setPermission('unsupported');
      return;
    }

    // No app ID configured — don't init
    if (!appId) {
      setPermission('unsupported');
      return;
    }

    // Initialise via the deferred queue pattern OneSignal recommends
    window.OneSignalDeferred = window.OneSignalDeferred || [];

    // Load the OneSignal SDK script
    if (!document.getElementById('onesignal-sdk')) {
      const script = document.createElement('script');
      script.id = 'onesignal-sdk';
      script.src = 'https://cdn.onesignal.com/sdks/OneSignalSDK.js';
      script.async = true;
      document.head.appendChild(script);
    }

    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        await OneSignal.init({
          appId,
          allowLocalhostAsSecureOrigin: true,
          notifyButton: {
            enable: false, // We use our own UI
          },
          welcomeNotification: {
            disable: false,
            title: 'NicholMoviesUg',
            message: 'Welcome! You\'ll now get notified about new movies and series.',
          },
        });

        setIsInitialized(true);

        // Check current permission & subscription state
        const enabled = await OneSignal.isPushNotificationsEnabled();
        setIsSubscribed(enabled);

        const nativePerm = Notification.permission;
        if (nativePerm === 'granted') {
          setPermission(enabled ? 'granted' : 'default');
        } else if (nativePerm === 'denied') {
          setPermission('denied');
        } else {
          setPermission('default');
        }

        // React to subscription changes
        OneSignal.on('subscriptionChange', (isSubscribedNow: unknown) => {
          const subbed = Boolean(isSubscribedNow);
          setIsSubscribed(subbed);
          setPermission(subbed ? 'granted' : 'default');
        });
      } catch (err) {
        console.error('[OneSignal] Init error:', err);
        setPermission('default');
      }
    });
  }, [appId]);

  const promptForNotifications = useCallback(async () => {
    if (typeof window === 'undefined' || !window.OneSignal) return;
    try {
      await window.OneSignal.showNativePrompt();
    } catch (err) {
      console.error('[OneSignal] Prompt error:', err);
    }
  }, []);

  const linkUserId = useCallback(async (userId: string) => {
    if (typeof window === 'undefined' || !window.OneSignal) return;
    try {
      await window.OneSignal.setExternalUserId(userId);
    } catch (err) {
      console.error('[OneSignal] Link user error:', err);
    }
  }, []);

  return {
    permission,
    isSubscribed,
    isInitialized,
    promptForNotifications,
    linkUserId,
  };
}
