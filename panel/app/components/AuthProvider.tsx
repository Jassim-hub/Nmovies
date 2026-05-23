"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Session, User } from '@supabase/supabase-js';

const AuthContext = createContext<any>({ session: null, user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    // 30-minute inactivity timeout
    const resetTimeout = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        await supabase.auth.signOut();
        router.push("/login?reason=timeout");
      }, 1800000);
    };

    const setupInactivityTimer = () => {
      window.addEventListener("mousemove", resetTimeout);
      window.addEventListener("keydown", resetTimeout);
      window.addEventListener("click", resetTimeout);
      window.addEventListener("scroll", resetTimeout);
      resetTimeout();
    };

    const cleanupInactivityTimer = () => {
      window.removeEventListener("mousemove", resetTimeout);
      window.removeEventListener("keydown", resetTimeout);
      window.removeEventListener("click", resetTimeout);
      window.removeEventListener("scroll", resetTimeout);
      clearTimeout(timeoutId);
    };

    async function checkAuth() {
      if (mounted) setLoading(true);

      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (!currentSession?.user) {
          if (mounted) {
            setSession(null);
            setLoading(false);
            cleanupInactivityTimer();
            if (pathname !== "/login") router.push("/login");
          }
          return;
        }

        // Check if user is an admin - using maybeSingle() so it won't throw an error if no rows match!
        const { data: adminData } = await supabase
          .from('admins')
          .select('user_id')
          .eq('user_id', currentSession.user.id)
          .maybeSingle();

        if (!adminData) {
          // Force logout for non-admins
          await supabase.auth.signOut();
          
          // Clear all cookies forcefully to destroy the main app's session token too
          document.cookie.split(";").forEach((c) => {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
          });

          // Hard redirect to clear React state completely and prevent routing loops
          if (mounted) window.location.href = "/panel/login?unauthorized=1";
          return;
        }

        // User is a valid admin
        if (mounted) {
          setSession(currentSession);
          setLoading(false);
          setupInactivityTimer();
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        if (mounted) setLoading(false);
      }
    }

    // Run the initial check
    checkAuth();

    // Re-check auth state when it changes (e.g., login, logout)
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        checkAuth();
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
      cleanupInactivityTimer();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#141414]">
        <div className="text-[#E50914] text-lg font-bold uppercase tracking-wider">Loading...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user || null, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}