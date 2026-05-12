import { NextRequest, NextResponse } from 'next/server';
import { protectVideoEndpoint } from '@/lib/video-protection';

/**
 * Protected Video Streaming Endpoint
 * 
 * This endpoint serves video content with security measures:
 * - Referrer checking
 * - Token-based authentication
 * - Rate limiting
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

// Disable body parsing for streaming
export const config = {
  api: {
    bodyParser: false,
  },
};
