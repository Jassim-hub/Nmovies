// OneSignal configuration
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
  throw new Error('OneSignal environment variables are not set');
}

const ONESIGNAL_API_URL = 'https://onesignal.com/api/v1/notifications';

export interface PushNotificationData {
  title: string;
  message: string;
  imageUrl?: string;
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
  big_picture?: string;
  large_icon?: string;
  data?: Record<string, unknown>;
}

interface OneSignalResponse {
  id: string;
  recipients: number;
  errors?: string[];
}

export class OneSignalService {
  /**
   * Send HTTP request to OneSignal API
   */
  private static async sendNotification(payload: OneSignalNotificationPayload): Promise<OneSignalResponse> {
    const response = await fetch(ONESIGNAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
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
      const payload: OneSignalNotificationPayload = {
        app_id: ONESIGNAL_APP_ID!,
        included_segments: notificationData.targetSegments || ['All'],
        headings: { en: notificationData.title },
        contents: { en: notificationData.message },
      };
      
      if (notificationData.imageUrl) {
        payload.big_picture = notificationData.imageUrl;
        payload.large_icon = notificationData.imageUrl;
      }
      
      if (notificationData.data) {
        payload.data = notificationData.data;
      }

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
      const payload: OneSignalNotificationPayload = {
        app_id: ONESIGNAL_APP_ID!,
        include_external_user_ids: userIds,
        headings: { en: notificationData.title },
        contents: { en: notificationData.message },
      };
      
      if (notificationData.imageUrl) {
        payload.big_picture = notificationData.imageUrl;
        payload.large_icon = notificationData.imageUrl;
      }
      
      if (notificationData.data) {
        payload.data = notificationData.data;
      }

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
      const payload: OneSignalNotificationPayload = {
        app_id: ONESIGNAL_APP_ID!,
        included_segments: segments,
        headings: { en: notificationData.title },
        contents: { en: notificationData.message },
      };
      
      if (notificationData.imageUrl) {
        payload.big_picture = notificationData.imageUrl;
        payload.large_icon = notificationData.imageUrl;
      }
      
      if (notificationData.data) {
        payload.data = notificationData.data;
      }

      return await this.sendNotification(payload);
    } catch (error) {
      console.error('Error sending OneSignal notification to segments:', error);
      throw error;
    }
  }
}
