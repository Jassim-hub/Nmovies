'use client';

import { useState, useEffect, useCallback } from 'react';

interface OneSignalInstance {
  init: (options: Record<string, unknown>) => Promise<void>;
  isPushNotificationsEnabled?: () => Promise<boolean>;
  showNativePrompt?: () => Promise<void>;
  setExternalUserId?: (id: string) => Promise<void>;
  login?: (id: string) => Promise<void>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  User?: {
    PushSubscription?: {
      optedIn?: boolean;
      id?: string;
      addEventListener?: (event: string, handler: (event: any) => void) => void;
    };
  };
  Notifications?: {
    permission?: boolean;
    requestPermission?: () => Promise<void>;
    addEventListener?: (event: string, handler: (event: any) => void) => void;
  };
  Slidedown?: {
    promptPush?: () => Promise<void>;
  };
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

  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || '30e1c461-bc97-4079-aa3d-874150082a38';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Notifications not supported on this browser
    if (!('Notification' in window)) {
      setPermission('unsupported');
      return;
    }

    // Initialise via the deferred queue pattern OneSignal recommends
    window.OneSignalDeferred = window.OneSignalDeferred || [];

    // Load the OneSignal SDK v16 script
    if (!document.getElementById('onesignal-sdk')) {
      const script = document.createElement('script');
      script.id = 'onesignal-sdk';
      script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
      script.defer = true;
      document.head.appendChild(script);
    }

    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        await OneSignal.init({
          appId,
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerPath: 'OneSignalSDKWorker.js',
          serviceWorkerParam: { scope: '/' },
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

        // Check current permission & subscription state (v16 vs v15 safe check)
        let enabled = false;
        if (OneSignal.User?.PushSubscription?.optedIn !== undefined) {
          enabled = Boolean(OneSignal.User.PushSubscription.optedIn);
        } else if (typeof OneSignal.isPushNotificationsEnabled === 'function') {
          try {
            enabled = await OneSignal.isPushNotificationsEnabled();
          } catch {
            enabled = Notification.permission === 'granted';
          }
        } else {
          enabled = Notification.permission === 'granted';
        }

        setIsSubscribed(enabled);

        const nativePerm = Notification.permission;
        if (nativePerm === 'granted') {
          setPermission('granted');
        } else if (nativePerm === 'denied') {
          setPermission('denied');
        } else {
          setPermission('default');
        }

        // Listen for change events safely
        if (OneSignal.User?.PushSubscription?.addEventListener) {
          OneSignal.User.PushSubscription.addEventListener('change', (event: any) => {
            const subbed = Boolean(event?.current?.optedIn);
            setIsSubscribed(subbed);
            setPermission(subbed ? 'granted' : Notification.permission === 'denied' ? 'denied' : 'default');
          });
        } else if (typeof OneSignal.on === 'function') {
          OneSignal.on('subscriptionChange', (isSubscribedNow: unknown) => {
            const subbed = Boolean(isSubscribedNow);
            setIsSubscribed(subbed);
            setPermission(subbed ? 'granted' : Notification.permission === 'denied' ? 'denied' : 'default');
          });
        }
      } catch (err) {
        console.error('[OneSignal] Init error:', err);
        setPermission('default');
      }
    });
  }, [appId]);

  const promptForNotifications = useCallback(async () => {
    if (typeof window === 'undefined') return;
    try {
      if (window.OneSignal?.Notifications?.requestPermission) {
        await window.OneSignal.Notifications.requestPermission();
      } else if (window.OneSignal?.Slidedown?.promptPush) {
        await window.OneSignal.Slidedown.promptPush();
      } else if (window.OneSignal?.showNativePrompt) {
        await window.OneSignal.showNativePrompt();
      } else if ('Notification' in window) {
        await Notification.requestPermission();
      }
    } catch (err) {
      console.error('[OneSignal] Prompt error:', err);
    }
  }, []);

  const linkUserId = useCallback(async (userId: string) => {
    if (typeof window === 'undefined' || !window.OneSignal) return;
    try {
      if (typeof window.OneSignal.login === 'function') {
        await window.OneSignal.login(userId);
      } else if (typeof window.OneSignal.setExternalUserId === 'function') {
        await window.OneSignal.setExternalUserId(userId);
      }
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
