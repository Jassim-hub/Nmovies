// OneSignal configuration
// Ensure we don't throw at build time, only when actually sending notifications
const getOneSignalAppId = () => process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || process.env.ONESIGNAL_APP_ID;
const getOneSignalApiKey = () => process.env.ONESIGNAL_REST_API_KEY;
const ONESIGNAL_API_URL = 'https://onesignal.com/api/v1/notifications';

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
  included_segments?: string[];
  include_external_user_ids?: string[];
  headings: { en: string };
  contents: { en: string };
  url?: string;
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
   * "Subscribers" is the standard segment name for all Web Push subscribers.
   */
  private static normalizeSegments(segments?: string[]): string[] {
    if (!segments || segments.length === 0) {
      return ['Subscribers', 'Total Subscriptions'];
    }
    
    const normalized: string[] = [];
    for (const seg of segments) {
      if (seg.toLowerCase() === 'all') {
        if (!normalized.includes('Subscribers')) normalized.push('Subscribers');
        if (!normalized.includes('Total Subscriptions')) normalized.push('Total Subscriptions');
      } else {
        if (!normalized.includes(seg)) normalized.push(seg);
      }
    }
    
    return normalized.length > 0 ? normalized : ['Subscribers'];
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
      ...targetOptions,
      headings: { en: notificationData.title },
      contents: { en: notificationData.message },
      url: targetUrl,
      web_url: targetUrl,
      ttl: 259200, // 3 days Time-To-Live
      priority: 10, // High priority for OS popups
    };
    
    if (notificationData.iconUrl) {
      payload.chrome_web_icon = notificationData.iconUrl;
      payload.firefox_icon = notificationData.iconUrl;
      payload.chrome_web_badge = notificationData.iconUrl;
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

    const response = await fetch(ONESIGNAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OneSignal API error: ${response.status} - ${error}`);
    }

    return await response.json();
  }

  /**
   * Send push notification to all users
   */
  static async sendToAll(notificationData: PushNotificationData) {
    try {
      const appId = getOneSignalAppId();
      if (!appId) throw new Error('OneSignal App ID is not set');

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
      if (!appId) throw new Error('OneSignal App ID is not set');

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
      if (!appId) throw new Error('OneSignal App ID is not set');

      const normalizedSegments = this.normalizeSegments(segments);
      const payload = this.formatPayload(appId, notificationData, { included_segments: normalizedSegments });

      return await this.sendNotification(payload);
    } catch (error) {
      console.error('Error sending OneSignal notification to segments:', error);
      throw error;
    }
  }
}
