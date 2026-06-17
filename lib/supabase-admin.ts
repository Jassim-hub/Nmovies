import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client for server-side operations.
 * 
 * This client bypasses Row Level Security (RLS) and should ONLY
 * be used in server-side code (API routes, webhooks, etc.) — 
 * never in client-side code.
 * 
 * Use cases:
 * - Updating profiles after payment completion
 * - Inserting subscription records from webhooks
 * - Any server-side write that doesn't have a user session
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

/**
 * Creates a service-role client if the key is available.
 * Falls back to null if the key is not configured.
 */
function createServiceClient() {
  if (!serviceRoleKey) {
    console.error(
      '⚠️ CRITICAL: SUPABASE_SERVICE_ROLE_KEY is not set. ' +
      'Payment activations, webhook processing, and profile updates WILL FAIL silently due to RLS restrictions. ' +
      'Set this environment variable in production immediately.'
    );
    return null;
  }

  return createClient(supabaseUrl!, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export const supabaseAdmin = createServiceClient();
