import { supabase } from './supabaseClient';

/**
 * Authenticated fetch wrapper for panel API routes.
 *
 * Automatically retrieves the current Supabase session token and
 * attaches it as an `Authorization: Bearer <token>` header.
 *
 * Usage:
 *   const res = await authFetch('/api/profiles');
 *   const res = await authFetch('/api/profiles', { method: 'PUT', body: JSON.stringify(data) });
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;

  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Ensure Content-Type is set for JSON requests
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Automatically prepend basePath for absolute API paths
  const fetchUrl = url.startsWith('/api/') ? `/panel${url}` : url;

  return fetch(fetchUrl, {
    ...options,
    headers,
  });
}
