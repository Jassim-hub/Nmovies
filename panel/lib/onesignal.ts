// OneSignal configuration
const DEFAULT_APP_ID = '30e1c461-bc97-4079-aa3d-874150082a38';

const getOneSignalAppId = () => 
  process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || 
  process.env.ONESIGNAL_APP_ID || 
  DEFAULT_APP_ID;

const getOneSignalApiKey = () => 
  process.env.ONESIGNAL_REST_API_KEY || 
  process.env.NEXT_PUBLIC_ONESIGNAL_REST_API_KEY || 
  '';

const ONESIGNAL_API_URL = 'https://api.onesignal.com/notifications';

export interface PushNotificationData {
  title: string;
  message: string;
  imageUrl?: string;
  iconUrl?: string;
  url?: string;
  data?: Record<string, unknown>;
  targetSegments?: string[];
  targetUserIds?: string[];
}

interface OneSignalNotificationPayload {
  app_id: string;
  target_channel: 'push';
  included_segments?: string[];
  include_external_user_ids?: string[];
  headings: { en: string };
  contents: { en: string };
  web_url?: string;
  big_picture?: string;
  large_icon?: string;
  chrome_web_icon?: string;
  firefox_icon?: string;
  chrome_web_image?: string;
  chrome_web_badge?: string;
  data?: Record<string, unknown>;
  ttl?: number;
  priority?: number;
}

interface OneSignalResponse {
  id: string;
  recipients: number;
  errors?: string[];
}

export class OneSignalService {
  /**
   * Helper to normalize segment names for OneSignal REST API.
   * Standard segment name is "Subscribers".
   */
  private static normalizeSegments(segments?: string[]): string[] {
    if (!segments || segments.length === 0) {
      return ['All'];
    }
    return segments.map(seg => {
      const lower = seg.toLowerCase();
      // Map any subscriber-like segment to 'All' to avoid v1/v16 subscription
      // model mismatch where v16 subscriptions show as unsubscribed in v1 API
      if (lower === 'subscribed users' || lower === 'subscribers' || lower === 'total subscriptions') {
        return 'All';
      }
      return seg;
    });
  }

  private static formatPayload(
    appId: string,
    notificationData: PushNotificationData,
    targetOptions: { included_segments?: string[]; include_external_user_ids?: string[] }
  ): OneSignalNotificationPayload {
    const targetUrl = notificationData.url || (
      notificationData.data?.type && notificationData.data?.id
        ? `https://www.nicholmoviesug.com/${notificationData.data.type === 'movie' ? 'movies' : 'series'}/${notificationData.data.id}`
        : 'https://www.nicholmoviesug.com/notifications'
    );

    const payload: OneSignalNotificationPayload = {
      app_id: appId,
      target_channel: 'push',
      ...targetOptions,
      headings: { en: notificationData.title },
      contents: { en: notificationData.message },
      web_url: targetUrl, // web_url only — cannot combine with url field
      ttl: 259200, // 3 days Time-To-Live
      priority: 10, // High priority for OS popups
    };
    
    if (notificationData.iconUrl) {
      payload.chrome_web_icon = notificationData.iconUrl;
      payload.firefox_icon = notificationData.iconUrl;
      payload.chrome_web_badge = notificationData.iconUrl;
    } else {
      // Default to the NicholMoviesUg logo for all push notifications
      const defaultIcon = 'https://www.nicholmoviesug.com/logo.png';
      payload.chrome_web_icon = defaultIcon;
      payload.firefox_icon = defaultIcon;
      payload.chrome_web_badge = defaultIcon;
    }

    if (notificationData.imageUrl) {
      payload.big_picture = notificationData.imageUrl;
      payload.large_icon = notificationData.imageUrl;
      payload.chrome_web_image = notificationData.imageUrl;
    } else if (notificationData.iconUrl) {
      payload.large_icon = notificationData.iconUrl;
    }
    
    if (notificationData.data) {
      payload.data = notificationData.data;
    }

    return payload;
  }

  /**
   * Send HTTP request to OneSignal API
   */
  private static async sendNotification(payload: OneSignalNotificationPayload): Promise<OneSignalResponse> {
    const apiKey = getOneSignalApiKey();
    if (!apiKey) throw new Error('OneSignal REST API key is not set');

    // Use 'Key <api_key>' format for v2 API keys (e.g. os_v2_app_...)
    const authHeader = apiKey.startsWith('os_v2_') ? `Key ${apiKey}` : `Basic ${apiKey}`;

    const response = await fetch(ONESIGNAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': authHeader,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let parsedError = errorText;
      try {
        const jsonErr = JSON.parse(errorText);
        if (jsonErr.errors && Array.isArray(jsonErr.errors)) {
          parsedError = jsonErr.errors.join(', ');
        }
      } catch {
        // Keep raw text
      }

      // If segment "Subscribers" was not found in legacy dashboard, fallback to ["All"]
      if (payload.included_segments && payload.included_segments.includes('Subscribers') && parsedError.toLowerCase().includes('segment')) {
        console.warn('OneSignal segment "Subscribers" not found, retrying with segment "All"...');
        return await this.sendNotification({
          ...payload,
          included_segments: ['All'],
        });
      }

      throw new Error(`OneSignal API error (${response.status}): ${parsedError}`);
    }

    return await response.json();
  }

  /**
   * Send push notification to all users
   */
  static async sendToAll(notificationData: PushNotificationData) {
    try {
      const appId = getOneSignalAppId();
      if (!appId) throw new Error('OneSignal App ID is not set.');

      const segments = this.normalizeSegments(notificationData.targetSegments);
      const payload = this.formatPayload(appId, notificationData, { included_segments: segments });

      return await this.sendNotification(payload);
    } catch (error) {
      console.error('Error sending OneSignal notification:', error);
      throw error;
    }
  }

  /**
   * Send push notification to specific users
   */
  static async sendToUsers(userIds: string[], notificationData: PushNotificationData) {
    try {
      const appId = getOneSignalAppId();
      if (!appId) throw new Error('OneSignal App ID is not set.');

      const payload = this.formatPayload(appId, notificationData, { include_external_user_ids: userIds });

      return await this.sendNotification(payload);
    } catch (error) {
      console.error('Error sending OneSignal notification to users:', error);
      throw error;
    }
  }

  /**
   * Send push notification with custom segments
   */
  static async sendToSegments(segments: string[], notificationData: PushNotificationData) {
    try {
      const appId = getOneSignalAppId();
      if (!appId) throw new Error('OneSignal App ID is not set.');

      const normalizedSegments = this.normalizeSegments(segments);
      const payload = this.formatPayload(appId, notificationData, { included_segments: normalizedSegments });

      return await this.sendNotification(payload);
    } catch (error) {
      console.error('Error sending OneSignal notification to segments:', error);
      throw error;
    }
  }
}
