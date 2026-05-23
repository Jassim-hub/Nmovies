import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Server-side authentication guard for panel API routes.
 *
 * Verifies the caller has a valid Supabase session and is an admin.
 * Panel frontend must send `Authorization: Bearer <access_token>` with every request.
 *
 * Returns the authenticated user on success or a NextResponse error on failure.
 */
export async function verifyAdminRequest(request: NextRequest): Promise<
  | { authorized: true; userId: string }
  | { authorized: false; response: NextResponse }
> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const token = authHeader.replace('Bearer ', '');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Service unavailable' }, { status: 500 }),
    };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 }),
    };
  }

  // Verify user has admin-level access
  const { data: adminData } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!adminData) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { authorized: true, userId: user.id };
}
