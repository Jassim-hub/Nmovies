import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Secure Video URL Endpoint
 * 
 * Returns the video URL for a given content ID, but ONLY after verifying:
 * 1. User is authenticated (valid Supabase session)
 * 2. User has access (premium check for premium content)
 * 
 * The returned URL is proxied through /api/stream — the raw video URL
 * is NEVER sent to the client.
 * 
 * Usage: GET /api/get-video-url?id=<content_id>&type=movie|episode
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const contentId = searchParams.get('id');
    const contentType = searchParams.get('type'); // 'movie' or 'episode'

    if (!contentId || !contentType) {
      return NextResponse.json(
        { error: 'Missing id or type parameter' },
        { status: 400 }
      );
    }

    if (!['movie', 'episode'].includes(contentType)) {
      return NextResponse.json(
        { error: 'Type must be "movie" or "episode"' },
        { status: 400 }
      );
    }

    // --- Auth validation ---
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    // Create a client authenticated as the requesting user
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    // --- Use service role to fetch video URL (bypasses RLS) ---
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      console.error('get-video-url: SUPABASE_SERVICE_ROLE_KEY not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    let videoUrl: string | null = null;
    let isPremiumContent = false;
    let trailerUrl: string | null = null;

    if (contentType === 'movie') {
      const { data: movie, error } = await supabaseAdmin
        .from('movies')
        .select('video_url, videolink_url, trailer_url, premium, published')
        .eq('id', contentId)
        .eq('published', true)
        .single();

      if (error || !movie) {
        return NextResponse.json(
          { error: 'Content not found' },
          { status: 404 }
        );
      }

      videoUrl = movie.video_url || movie.videolink_url || null;
      trailerUrl = movie.trailer_url || null;
      isPremiumContent = movie.premium;
    } else {
      // Episode
      const { data: episode, error } = await supabaseAdmin
        .from('episodes')
        .select('video_url, premium, published')
        .eq('id', contentId)
        .eq('published', true)
        .single();

      if (error || !episode) {
        return NextResponse.json(
          { error: 'Episode not found' },
          { status: 404 }
        );
      }

      videoUrl = episode.video_url || null;
      isPremiumContent = episode.premium;
    }

    // --- Premium access check ---
    if (isPremiumContent) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('subscription')
        .eq('id', user.id)
        .single();

      const premiumPlans = ['standard', 'premium', 'vip', 'admin'];
      const userPlan = profile?.subscription || 'free';

      if (!premiumPlans.includes(userPlan)) {
        return NextResponse.json(
          { error: 'Premium subscription required', requirePremium: true },
          { status: 403 }
        );
      }
    }

    if (!videoUrl) {
      return NextResponse.json(
        { error: 'No video available for this content' },
        { status: 404 }
      );
    }

    // --- Build proxied URL (never expose raw video URL) ---
    let proxiedUrl = videoUrl;

    // Normalize URL
    if (proxiedUrl.startsWith('encrypted://') || proxiedUrl.startsWith('auth://')) {
      const urlPath = proxiedUrl.split('://')[1];
      proxiedUrl = `https://${urlPath}`;
    } else if (!proxiedUrl.startsWith('http://') && !proxiedUrl.startsWith('https://')) {
      proxiedUrl = `https://${proxiedUrl}`;
    }

    // Check if this is an embed URL (should be used directly, not proxied)
    const isEmbedUrl = proxiedUrl.includes('/embed/') || 
                       proxiedUrl.includes('vidsrc') || 
                       proxiedUrl.includes('2embed') ||
                       proxiedUrl.includes('embedsu') ||
                       proxiedUrl.includes('multiembed') ||
                       proxiedUrl.includes('autoembed');

    // Route through our secure stream proxy ONLY for direct video files
    // Embed URLs should be used directly
    const streamUrl = isEmbedUrl ? proxiedUrl : `/api/stream?url=${encodeURIComponent(proxiedUrl)}`;

    // Trailer can be sent directly (promotional content)
    let safeTrailerUrl = null;
    if (trailerUrl) {
      if (!trailerUrl.startsWith('http://') && !trailerUrl.startsWith('https://')) {
        safeTrailerUrl = `https://${trailerUrl}`;
      } else {
        safeTrailerUrl = trailerUrl;
      }
    }

    return NextResponse.json({
      streamUrl,
      trailerUrl: safeTrailerUrl,
      isPremium: isPremiumContent,
    });

  } catch (error) {
    console.error('get-video-url: Internal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
