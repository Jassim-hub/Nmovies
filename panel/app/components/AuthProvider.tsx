"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ session: null, user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Keep a ref so handleSession can always read the latest pathname
  // without pathname being a useEffect dependency (which re-runs the whole
  // auth flow — including re-registering onAuthStateChange — on every navigation).
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const resetTimeout = () => {
      clearTimeout(timeoutId);
      // 30 minutes = 30 * 60 * 1000 = 1800000 ms
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
      resetTimeout(); // Start the timer initially
    };

    const cleanupInactivityTimer = () => {
      window.removeEventListener("mousemove", resetTimeout);
      window.removeEventListener("keydown", resetTimeout);
      window.removeEventListener("click", resetTimeout);
      window.removeEventListener("scroll", resetTimeout);
      clearTimeout(timeoutId);
    };

    const verifyAdmin = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('admins')
          .select('user_id')
          .eq('user_id', userId)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error("Error checking admin status:", error);
          return false;
        }

        return !!data;
      } catch (error) {
        console.error("Error checking admin status:", error);
        return false;
      }
    };

    const handleSession = async (currentSession: Session | null) => {
      if (currentSession?.user) {
        const isAdmin = await verifyAdmin(currentSession.user.id);
        if (!isAdmin) {
          // Clear loading BEFORE signing out so the screen doesn't stay stuck
          // while waiting for onAuthStateChange to fire from signOut().
          setLoading(false);
          await supabase.auth.signOut();
          router.push("/login?unauthorized=1");
          return;
        }
        setSession(currentSession);
        setUser(currentSession.user);
        setupInactivityTimer();
      } else {
        setSession(null);
        setUser(null);
        cleanupInactivityTimer();
        if (pathnameRef.current !== "/login") {
          router.push("/login");
        }
      }
      setLoading(false);
    };

    const getSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        await handleSession(data.session);
      } catch (error) {
        console.error("Error getting session:", error);
        if (pathnameRef.current !== "/login") {
          router.push("/login");
        }
        setLoading(false);
      }
    };

    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      setLoading(true);
      await handleSession(currentSession);
    });

    return () => {
      listener.subscription.unsubscribe();
      cleanupInactivityTimer();
    };
  // router is stable across renders in Next.js App Router.
  // pathname is intentionally excluded — we read it via pathnameRef instead
  // to avoid re-running the entire auth flow (and re-registering the
  // onAuthStateChange listener) on every in-app navigation.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#141414]">
        <div className="text-[#E50914] text-lg font-bold uppercase tracking-wider">Loading...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ session, user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}