import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabase } from '@/lib/supabase';
import { checkRateLimit, getClientIp } from '@/lib/video-protection';

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Rate limit view tracking to prevent artificial inflation
    const clientIp = getClientIp(request.headers);
    const rateCheck = checkRateLimit(clientIp, 30, 60000); // 30 views per minute per IP
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const { contentId, contentType, userId } = body;

    if (!contentId || !contentType) {
      return NextResponse.json({ error: 'Missing contentId or contentType' }, { status: 400 });
    }

    if (!['movie', 'series'].includes(contentType)) {
      return NextResponse.json({ error: 'Invalid contentType' }, { status: 400 });
    }

    const db = supabaseAdmin || supabase;

    // 1. Insert a view log entry
    const logEntry: Record<string, any> = {
      created_at: new Date().toISOString(),
    };

    if (userId) logEntry.user_id = userId;

    if (contentType === 'movie') {
      logEntry.movie_id = contentId;
    } else {
      logEntry.series_id = contentId;
    }

    // Get IP from request headers for analytics
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               request.headers.get('x-real-ip') || 
               'unknown';
    logEntry.ip_address = ip;

    const { error: logError } = await db.from('view_logs').insert(logEntry);

    if (logError) {
      console.error('Error inserting view log:', logError);
      // Don't fail the request — still try to increment the counter
    }

    // 2. Increment the views counter on the content table
    const table = contentType === 'movie' ? 'movies' : 'series';

    // Use RPC or raw update to increment
    const { data: current, error: fetchError } = await db
      .from(table)
      .select('views')
      .eq('id', contentId)
      .single();

    if (!fetchError && current) {
      const newViews = (current.views || 0) + 1;
      await db.from(table).update({ views: newViews }).eq('id', contentId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('View tracking error:', error);
    return NextResponse.json({ error: 'View tracking failed' }, { status: 500 });
  }
}
