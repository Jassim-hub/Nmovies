import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  getReelplexiMovieDownloadUrl,
  getReelplexiEpisodeDownloadUrl,
} from '@/lib/reelplexi';

/**
 * Proxy download route that streams the file through our server.
 * Enforces server-side subscription check before streaming.
 *
 * Two modes:
 *
 * 1. Direct proxy (url already known):
 *    ?url=<signed-url>&filename=<name.mp4>
 *    Streams the upstream file through with Content-Disposition: attachment.
 *
 * 2. Reelplexi lookup (server resolves the URL):
 *    ?id=<id>&type=movie|episode&season=<n>&episode=<n>&filename=<name.mp4>
 *    Resolves the download URL from Reelplexi server-side, then proxies it.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  const filename = req.nextUrl.searchParams.get('filename') || 'download.mp4';

  // ── Server-side subscription gate ────────────────────────────────────────
  try {
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

    const db = supabaseAdmin;
    if (!db) {
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

  // Mode 1: Direct proxy — url is already known
  if (url) {
    return proxyDownload(url, filename);
  }

  // Mode 2: Resolve URL from Reelplexi server-side
  const id = req.nextUrl.searchParams.get('id');
  const type = req.nextUrl.searchParams.get('type') || 'movie';
  const season = req.nextUrl.searchParams.get('season');
  const episode = req.nextUrl.searchParams.get('episode');

  if (!id) {
    return NextResponse.json({ error: 'Either url or id is required' }, { status: 400 });
  }

  try {
    let resolvedUrl: string | null = null;

    if (type === 'movie') {
      resolvedUrl = await getReelplexiMovieDownloadUrl(id);
    } else if (type === 'episode' && season && episode) {
      resolvedUrl = await getReelplexiEpisodeDownloadUrl(
        id,
        parseInt(season, 10),
        parseInt(episode, 10)
      );
    }

    if (!resolvedUrl) {
      return NextResponse.json({ error: 'Download URL not available' }, { status: 404 });
    }

    return proxyDownload(resolvedUrl, filename);
  } catch (error: any) {
    console.error('[Download] Reelplexi lookup error:', error.message);
    return NextResponse.json({ error: 'Failed to resolve download URL' }, { status: 500 });
  }
}

/**
 * Proxy the upstream URL through our server as a forced download.
 * Content-Type is set to application/octet-stream so the browser
 * treats it as a binary file rather than trying to play it inline.
 */
async function proxyDownload(url: string, filename: string) {
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

    // Stream the body through — avoids loading the entire file into memory
    return new NextResponse(upstream.body, { status: 200, headers });
  } catch (error: any) {
    console.error('[Download Proxy] Error:', error.message);
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}

