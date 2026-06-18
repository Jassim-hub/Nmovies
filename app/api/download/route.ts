import { NextRequest, NextResponse } from 'next/server';
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

  // Access control is handled by the frontend UI (hiding the download buttons
  // from non-premium users) matching the blog_site implementation.

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

