import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as Reelplexi from '@/lib/reelplexi';

/**
 * Secure Video URL Endpoint using Reelplexi
 * 
 * Returns the video URL for a given content ID, but ONLY after verifying:
 * 1. User is authenticated (valid Supabase session)
 * 2. User has access (premium check for premium content)
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

    let isPremiumContent = false;
    let trailerUrl: string | null = null;
    let streamUrl: string | null = null;

    if (contentType === 'movie') {
      const movie = await Reelplexi.getReelplexiMovieById(contentId);

      if (!movie) {
        return NextResponse.json(
          { error: 'Content not found' },
          { status: 404 }
        );
      }

      isPremiumContent = movie.premium;
      trailerUrl = movie.trailer_url || null;

      // Reelplexi provides a secure proxy or stream URL
      const streamData = await Reelplexi.getReelplexiMovieStream(contentId);
      if (streamData && streamData.stream_url) {
        streamUrl = streamData.stream_url;
      } else if (movie.video_url) {
        streamUrl = movie.video_url; // fallback to the one in metadata
      }
    } else {
      // Episode (id format: seriesId:season:X:episode:Y)
      const parts = contentId.split(':');
      if (parts.length < 5) {
        return NextResponse.json({ error: 'Invalid episode ID format' }, { status: 400 });
      }
      const seriesId = parts[0];
      const seasonNum = parseInt(parts[2], 10);
      const episodeNum = parseInt(parts[4], 10);

      const episodes = await Reelplexi.getReelplexiEpisodes(seriesId, seasonNum);
      const episode = episodes.find((ep: any) => ep.episode_number === episodeNum);

      if (!episode) {
        return NextResponse.json(
          { error: 'Episode not found' },
          { status: 404 }
        );
      }

      isPremiumContent = episode.premium;

      const streamData = await Reelplexi.getReelplexiEpisodeStream(seriesId, seasonNum, episodeNum);
      if (streamData && streamData.stream_url) {
        streamUrl = streamData.stream_url;
      } else if (episode.video_url) {
        streamUrl = episode.video_url;
      }
    }

    // --- Premium access check ---
    if (isPremiumContent) {
      // Create admin client to check subscription securely
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!serviceRoleKey) {
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
      }
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('subscription, subscription_expiry_date')
        .eq('id', user.id)
        .single();

      const hasSubscription = profile?.subscription && profile.subscription !== 'free';
      const isNotExpired = profile?.subscription_expiry_date &&
                          new Date(profile.subscription_expiry_date) > new Date();

      if (!hasSubscription || !isNotExpired) {
        return NextResponse.json(
          { error: 'Premium subscription required', requirePremium: true },
          { status: 403 }
        );
      }
    }

    if (!streamUrl) {
      return NextResponse.json(
        { error: 'No video available for this content' },
        { status: 404 }
      );
    }

    // Return the stream URL provided by Reelplexi directly (it's already proxied and secure)
    return NextResponse.json({
      streamUrl: streamUrl,
      trailerUrl: trailerUrl,
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
