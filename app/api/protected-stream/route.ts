import { NextRequest, NextResponse } from 'next/server';
import { protectVideoEndpoint } from '@/lib/video-protection';

// Reusable SSRF protection — blocks private/internal addresses
function isAllowedVideoUrl(urlString: string): boolean {
  const envHosts = process.env.ALLOWED_VIDEO_HOSTS || '';
  const allowedHosts = envHosts.split(',').map(h => h.trim().toLowerCase()).filter(Boolean);

  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    const blockedPatterns = [
      /^localhost$/i, /^127\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./, /^169\.254\./, /^0\./, /^\[::1\]$/, /^metadata\./i, /^internal\./i,
    ];
    if (blockedPatterns.some(p => p.test(hostname))) return false;
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    if (allowedHosts.length > 0) {
      return allowedHosts.some(host => hostname === host || hostname.endsWith(`.${host}`));
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Protected Video Streaming Endpoint
 * 
 * This endpoint serves video content with security measures:
 * - Referrer checking
 * - Token-based authentication
 * - Rate limiting
 * - SSRF protection via URL allowlist
 * 
 * Usage: /api/protected-stream?url=<video_url>&token=<access_token>
 */
export async function GET(request: NextRequest) {
  try {
    // Apply protection middleware
    const protection = await protectVideoEndpoint(request);
    
    if (!protection.allowed) {
      return NextResponse.json(
        { error: protection.error || 'Access denied' },
        { status: 403 }
      );
    }

    // Get video URL from query params
    const url = request.nextUrl.searchParams.get('url');
    
    if (!url) {
      return NextResponse.json(
        { error: 'Missing video URL' },
        { status: 400 }
      );
    }

    // SECURITY: Validate the URL against the allowlist to prevent SSRF
    if (!isAllowedVideoUrl(url)) {
      return NextResponse.json(
        { error: 'Invalid video source' },
        { status: 403 }
      );
    }

    // Fetch the video from the source
    const videoResponse = await fetch(url, {
      headers: {
        'Range': request.headers.get('range') || 'bytes=0-',
      },
    });

    if (!videoResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch video' },
        { status: videoResponse.status }
      );
    }

    // Get video data
    const videoBlob = await videoResponse.blob();
    const contentType = videoResponse.headers.get('content-type') || 'video/mp4';
    const contentLength = videoResponse.headers.get('content-length');
    const contentRange = videoResponse.headers.get('content-range');
    const acceptRanges = videoResponse.headers.get('accept-ranges');

    // Create response with appropriate headers
    const headers = new Headers({
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    });

    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    if (contentRange) {
      headers.set('Content-Range', contentRange);
    }

    if (acceptRanges) {
      headers.set('Accept-Ranges', acceptRanges);
    }

    // Return video stream
    return new NextResponse(videoBlob, {
      status: contentRange ? 206 : 200,
      headers,
    });

  } catch (error) {
    console.error('Error streaming protected video:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
