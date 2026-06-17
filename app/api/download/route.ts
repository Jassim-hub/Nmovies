import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Proxy download route that streams the file through our server.
 * Enforces server-side subscription check before streaming.
 *
 * Query params:
 *   url      – the signed Wasabi download URL
 *   filename – desired filename for the downloaded file
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  const filename = req.nextUrl.searchParams.get('filename') || 'download.mp4';

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // ── Server-side subscription gate ────────────────────────────────────────
  try {
    // Build a server-side Supabase client that reads cookies from the request
    const supabaseServer = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll() { /* read-only in GET */ },
        },
      }
    );

    const { data: { user } } = await supabaseServer.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Use admin client to bypass RLS and read profile
    const db = supabaseAdmin;
    if (!db) {
      // Fail open only if admin client isn't configured (dev mode)
      console.warn('[Download] supabaseAdmin not configured – skipping subscription check');
    } else {
      const { data: profile } = await db
        .from('profiles')
        .select('subscription, subscription_expiry_date')
        .eq('id', user.id)
        .single();

      const hasSubscription = profile?.subscription && profile.subscription !== 'free';
      const isNotExpired =
        profile?.subscription_expiry_date &&
        new Date(profile.subscription_expiry_date) > new Date();

      if (!hasSubscription || !isNotExpired) {
        return NextResponse.json(
          { error: 'An active subscription is required to download content.' },
          { status: 403 }
        );
      }

      // Check plan allows downloads
      const { data: plan } = await db
        .from('plans')
        .select('allow_downloads')
        .ilike('name', profile.subscription)
        .single();

      if (!plan?.allow_downloads) {
        return NextResponse.json(
          { error: 'Your current plan does not include downloads. Please upgrade.' },
          { status: 403 }
        );
      }
    }
  } catch (authErr: any) {
    console.error('[Download] Auth check error:', authErr.message);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }
  // ── End subscription gate ─────────────────────────────────────────────────

  try {
    const upstream = await fetch(url);

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${upstream.status}` },
        { status: upstream.status }
      );
    }

    const contentLength = upstream.headers.get('content-length');

    const headers = new Headers({
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Type': 'application/octet-stream',
    });

    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch (error: any) {
    console.error('[Download Proxy] Error:', error.message);
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}
