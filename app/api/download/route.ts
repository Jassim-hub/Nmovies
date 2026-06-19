import { NextRequest, NextResponse } from 'next/server';
import {
  getReelplexiMovieDownloadUrl,
  getReelplexiEpisodeDownloadUrl,
} from '@/lib/reelplexi';

/**
 * Download route that fetches a presigned download URL from the backend.
 *
 * Returns JSON { download_url } so the client can trigger a true file download
 * using an <a href download> element. A plain 302 redirect to a video URL
 * causes Chrome to open its built-in media player instead of saving the file,
 * so we must let the browser initiate the download itself via an anchor tag.
 *
 * Modes:
 * 1. ?url=<signed-url>        — wraps an already-known URL in the JSON envelope
 * 2. ?id=<id>&type=movie|episode&season=<n>&episode=<n>
 *    — resolves the download URL from Reelplexi server-side
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');

  // Mode 1: URL already known — return it in the JSON envelope
  if (url) {
    return NextResponse.json({ download_url: url });
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
      try {
        resolvedUrl = await getReelplexiMovieDownloadUrl(id);
      } catch (e: any) {
        return NextResponse.json({ error: 'Failed to get movie download url', details: e.message }, { status: 500 });
      }
    } else if (type === 'episode' && season && episode) {
      try {
        resolvedUrl = await getReelplexiEpisodeDownloadUrl(
          id,
          parseInt(season, 10),
          parseInt(episode, 10)
        );
      } catch (e: any) {
        return NextResponse.json({ error: 'Failed to get episode download url', details: e.message }, { status: 500 });
      }
    }

    if (!resolvedUrl) {
      return NextResponse.json({ error: 'Download URL not available, resolvedUrl was null' }, { status: 404 });
    }

    // Return the URL as JSON — the client will create an <a href download> to
    // trigger a true file download instead of opening the media player.
    return NextResponse.json({ download_url: resolvedUrl });
  } catch (error: any) {
    console.error('[Download API] Reelplexi lookup error:', error);
    return NextResponse.json({ error: 'Failed to resolve download URL', details: error.message }, { status: 500 });
  }
}
