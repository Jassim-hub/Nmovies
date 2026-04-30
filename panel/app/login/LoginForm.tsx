"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    if (searchParams && searchParams.get("unauthorized") === "1") {
      setUnauthorized(true);
    } else {
      setUnauthorized(false);
    }
  }, [searchParams]);

  const checkAdminStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error("Error checking admin status:", error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error("Error checking admin status:", error);
      return false;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        console.error("Login error:", error);
      } else if (data.user) {
        // Check if user is admin before allowing access
        const isAdmin = await checkAdminStatus(data.user.id);
        if (!isAdmin) {
          // Sign out the user and show error
          await supabase.auth.signOut();
          setError("Access Denied: You are not authorized to access this admin panel. Only authorized administrators can access this panel.");
        } else {
          // Success - redirect to dashboard or home
          router.push("/");
        }
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#141414] flex items-center justify-center p-4">
      <div className="bg-[#1a1c21] p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-800">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-[#E50914] mb-2 uppercase tracking-wider">Admin Panel</h1>
          <p className="text-gray-400">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wide">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#E50914] focus:border-transparent transition-colors"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wide">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#E50914] focus:border-transparent transition-colors"
              required
              disabled={loading}
            />
          </div>

          {unauthorized && (
            <div className="bg-red-900/20 border border-red-900 text-red-500 px-4 py-3 rounded-lg text-sm">
              You are not authorized to access this panel.
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-900 text-red-500 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-[#E50914] hover:bg-[#b80710] text-white font-bold py-4 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#E50914] focus:ring-offset-2 focus:ring-offset-[#1a1c21] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider mt-4 shadow-[0_0_15px_rgba(229,9,20,0.3)]"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                Signing in...
              </div>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-xs uppercase tracking-wide">
            Only authorized administrators can access this panel
          </p>
        </div>
      </div>
    </div>
  );
}