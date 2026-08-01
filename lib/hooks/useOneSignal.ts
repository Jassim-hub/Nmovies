'use client';

import { useState, useEffect, useCallback } from 'react';

interface OneSignalPushSubscription {
  optedIn?: boolean;
  id?: string;
  addEventListener?: (event: string, handler: (event: any) => void) => void;
}

interface OneSignalInstance {
  init: (options: Record<string, unknown>) => Promise<void>;
  isPushNotificationsEnabled?: () => Promise<boolean>;
  showNativePrompt?: () => Promise<void>;
  setExternalUserId?: (id: string) => Promise<void>;
  login?: (id: string) => Promise<void>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  User?: {
    PushSubscription?: OneSignalPushSubscription;
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

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Notifications not supported on this browser
    if (!('Notification' in window)) {
      setPermission('unsupported');
      return;
    }

    // OneSignal SDK is initialized globally in layout.tsx.
    // This hook just reads state from the already-initialized SDK.
    // We poll via OneSignalDeferred so we run after the SDK is ready.
    window.OneSignalDeferred = window.OneSignalDeferred || [];

    window.OneSignalDeferred.push((OneSignal) => {
      try {
        setIsInitialized(true);

        const readState = () => {
          // Read subscription state (v16 API)
          let opted = false;
          if (OneSignal.User?.PushSubscription?.optedIn !== undefined) {
            opted = Boolean(OneSignal.User.PushSubscription.optedIn);
          } else {
            opted = Notification.permission === 'granted';
          }
          setIsSubscribed(opted);

          const nativePerm = Notification.permission;
          if (nativePerm === 'granted') {
            setPermission('granted');
          } else if (nativePerm === 'denied') {
            setPermission('denied');
          } else {
            setPermission('default');
          }
        };

        readState();

        // Listen for subscription changes (v16)
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
        console.error('[OneSignal] State read error:', err);
        setPermission('default');
      }
    });
  }, []);

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
