import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const type = requestUrl.searchParams.get("type");

  if (error) {
    console.error("Auth callback error:", error, errorDescription);
    return NextResponse.redirect(
      `${requestUrl.origin}/signin?error=${encodeURIComponent(error)}`
    );
  }

  if (code) {
    const cookieStore = await cookies();

    // Use @supabase/ssr so it can access the PKCE code_verifier stored in cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    try {
      const { error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error("Code exchange error:", exchangeError);
        return NextResponse.redirect(
          `${requestUrl.origin}/signin?error=${encodeURIComponent(
            exchangeError.message
          )}`
        );
      }

      // Password recovery — redirect to reset-password page
      if (type === "recovery") {
        return NextResponse.redirect(
          `${requestUrl.origin}/reset-password`
        );
      }

      // OAuth sign-in/sign-up — redirect via callback-client to handle cookie
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/callback-client`
      );
    } catch (err) {
      console.error("Callback processing error:", err);
      return NextResponse.redirect(
        `${requestUrl.origin}/signin?error=callback_failed`
      );
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}/signin`);
}
