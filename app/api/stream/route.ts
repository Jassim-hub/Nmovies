import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoUrl = searchParams.get('url');
    const filename = searchParams.get('filename');

    if (!videoUrl) {
      console.error('Stream API: No video URL provided');
      return NextResponse.json({ error: 'Video URL is required' }, { status: 400 });
    }

    // Don't log full URLs in production
    console.log('Stream API: Processing video request');

    // Server-side only — credentials come from environment when available
    const username = process.env.CADDY_USERNAME || process.env.VIDEO_AUTH_USERNAME;
    const password = process.env.CADDY_PASSWORD || process.env.VIDEO_AUTH_PASSWORD;

    const range = request.headers.get('range');
    const upstreamHeaders: Record<string, string> = {};

    // Add Basic Auth if credentials are configured
    if (username && password) {
      const encodedCredentials = btoa(`${username}:${password}`);
      upstreamHeaders['Authorization'] = `Basic ${encodedCredentials}`;
    }

    if (range) {
      upstreamHeaders['Range'] = range;
    }

    console.log('Stream API: Fetching from upstream', username ? 'with auth' : 'without auth');
    const videoResponse = await fetch(videoUrl, {
      headers: upstreamHeaders
    });

    if (!videoResponse.ok) {
      console.error('Stream API: Upstream fetch failed:', videoResponse.status);
      return NextResponse.json({
        error: 'Video fetch failed',
        status: videoResponse.status,
      }, { status: videoResponse.status });
    }

    const contentType = videoResponse.headers.get('content-type') || 'video/mp4';
    const contentLength = videoResponse.headers.get('content-length');
    const contentRange = videoResponse.headers.get('content-range');
    const acceptRanges = videoResponse.headers.get('accept-ranges');

    const responseHeaders = new Headers({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Range, Content-Length, Content-Type'
    });

    // Set proper filename for downloads
    if (filename) {
      // Sanitize filename and ensure it has proper extension
      let cleanFilename = filename.replace(/[^a-zA-Z0-9\s\-_.]/g, '').trim();

      // If no extension, add .mp4 as default
      if (!cleanFilename.includes('.')) {
        cleanFilename += '.mp4';
      }

      responseHeaders.set('Content-Disposition', `attachment; filename="${cleanFilename}"`);
    }

    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength);
    }

    if (contentRange) {
      responseHeaders.set('Content-Range', contentRange);
    }

    if (acceptRanges) {
      responseHeaders.set('Accept-Ranges', acceptRanges);
    } else {
      responseHeaders.set('Accept-Ranges', 'bytes');
    }

    console.log('Stream API: Successfully proxying video stream');
    return new NextResponse(videoResponse.body, {
      status: videoResponse.status,
      headers: responseHeaders
    });

  } catch (error) {
    console.error('Stream API: Internal error:', error);
    return NextResponse.json({ 
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function HEAD(request: NextRequest) {
  return GET(request);
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Range, Content-Length, Content-Type',
    },
  });
}