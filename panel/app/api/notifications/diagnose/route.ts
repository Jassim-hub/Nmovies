import { NextRequest, NextResponse } from 'next/server';

const APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || '30e1c461-bc97-4079-aa3d-874150082a38';
const REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || '';
const AUTH_HEADER = REST_API_KEY.startsWith('os_v2_') ? `Key ${REST_API_KEY}` : `Basic ${REST_API_KEY}`;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const action = searchParams.get('action');

  try {
    if (action === 'app-info') {
      // Get app info including total subscriber count
      const res = await fetch(`https://api.onesignal.com/apps/${APP_ID}`, {
        headers: {
          'Authorization': AUTH_HEADER,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      const data = await res.json();
      return NextResponse.json({
        ok: res.ok,
        status: res.status,
        data,
      });
    }

    if (action === 'subscriptions') {
      // Get list of device subscriptions (first 10)
      const res = await fetch(
        `https://api.onesignal.com/apps/${APP_ID}/subscriptions?limit=10`,
        {
          headers: {
            'Authorization': AUTH_HEADER,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        }
      );
      const data = await res.json();
      return NextResponse.json({
        ok: res.ok,
        status: res.status,
        data,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscriptionId, sendToAll } = body;

    const payload: Record<string, unknown> = {
      app_id: APP_ID,
      target_channel: 'push',
      headings: { en: '🔔 NicholMoviesUg Test Notification' },
      contents: { en: 'This is a diagnostic test push. If you see this, push is working! ✅' },
      web_url: 'https://www.nicholmoviesug.com/notifications',
      priority: 10,
    };

    if (sendToAll) {
      payload.included_segments = ['All'];
    } else if (subscriptionId) {
      payload.include_subscription_ids = [subscriptionId];
    } else {
      payload.included_segments = ['All'];
    }

    const res = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Authorization': AUTH_HEADER,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      requestPayload: payload,
      responseData: data,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
