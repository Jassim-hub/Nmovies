import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Fast-path: If no Supabase auth cookies are present, skip remote auth session refresh
  const allCookies = request.cookies.getAll()
  const hasAuthCookie = allCookies.some((cookie) =>
    cookie.name.startsWith('sb-') || cookie.name.includes('auth-token')
  )

  if (!hasAuthCookie) {
    return supabaseResponse
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookieOptions: {
        maxAge: 315360000, // 10 years in seconds
      },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Update request cookies so that the response reflects the refreshed token
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))

          supabaseResponse = NextResponse.next({
            request,
          })

          // Update response cookies so the browser saves the refreshed token
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Industry Standard Safety: Wrap network auth check in a timeout (2500ms) and try/catch.
  // This prevents Supabase 503/latency spikes from triggering Vercel 504 MIDDLEWARE_INVOCATION_TIMEOUT.
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Supabase Auth timeout in middleware')), 2500)
    )

    await Promise.race([
      supabase.auth.getUser(),
      timeoutPromise,
    ])
  } catch (error) {
    // Log error in production monitoring without throwing 504 Gateway Timeout to the end user
    console.warn('Middleware auth refresh skipped or timed out:', error instanceof Error ? error.message : error)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Exclude static files, assets, images, media, fonts, and favicon from middleware invocation.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot|mp4|webm|mp3|m3u8|ts|json)$).*)',
  ],
}

