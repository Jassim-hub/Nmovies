import { NextRequest, NextResponse } from 'next/server';
import {
  getReelplexiMovieDownloadUrl,
  getReelplexiEpisodeDownloadUrl,
} from '@/lib/reelplexi';

/**
 * Download route that fetches a presigned download URL from the backend
 * and redirects the user to it.
 *
 * Two modes:
 *
 * 1. Direct redirect (url already known):
 *    ?url=<signed-url>
 *    Redirects to the provided URL.
 *
 * 2. Reelplexi lookup:
 *    ?id=<id>&type=movie|episode&season=<n>&episode=<n>
 *    Resolves the dedicated download URL from Reelplexi server-side, then redirects.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');

  // Mode 1: Direct redirect — url is already known
  if (url) {
    return NextResponse.redirect(url);
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

    // Redirect the browser directly to the Wasabi presigned URL.
    // The backend's download URL generator already adds response-content-disposition=attachment
    // to force the browser to download the file instead of playing it.
    return NextResponse.redirect(resolvedUrl);
  } catch (error) {
    console.error('[Download API] Reelplexi lookup error:', error);
    return NextResponse.json({ error: 'Failed to resolve download URL' }, { status: 500 });
  }
}
