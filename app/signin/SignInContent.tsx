'use client'

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter, useSearchParams } from 'next/navigation';
import { getRedirectCookie, setRedirectCookie, clearRedirectCookie } from '@/lib/utils';

export default function SignInContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [redirecting, setRedirecting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn, signInWithGoogle, resetPassword, user } = useAuth()
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)

  useEffect(() => {
    const errorParam = searchParams.get('error')
    const messageParam = searchParams.get('message')
    const redirectParam = searchParams.get('redirect')

    if (errorParam === 'auth_failed') {
      setError('Authentication failed. Please try again.')
    } else if (errorParam === 'unexpected') {
      setError('An unexpected error occurred. Please try again.')
    }

    if (messageParam === 'check_email') {
      setMessage('Please check your email and click the confirmation link to complete your registration.')
    }

    // Set redirect cookie if redirect parameter exists and no cookie is already set
    if (redirectParam && !getRedirectCookie()) {
      setRedirectCookie(redirectParam)
    }
  }, [searchParams])

  // Handle redirect when user becomes authenticated
  useEffect(() => {
    if (user && !redirecting) {
      setRedirecting(true)

      // Check for redirect cookie or URL parameter
      let redirectPath = getRedirectCookie()
      if (!redirectPath) {
        redirectPath = searchParams.get('redirect')
      }

      // Small delay to ensure auth state is fully propagated
      setTimeout(() => {
        if (redirectPath) {
          clearRedirectCookie()
          console.log('Auto-redirect: Redirecting to:', redirectPath)
          router.push(redirectPath)
        } else {
          console.log('Auto-redirect: No redirect path, going to home')
          router.push('/')
        }
      }, 100)
    }
  }, [user, redirecting, router, searchParams])

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError('')

    // Ensure redirect cookie is set for OAuth flow
    const redirectParam = searchParams.get('redirect')
    if (redirectParam && !getRedirectCookie()) {
      setRedirectCookie(redirectParam)
    }

    const { error } = await signInWithGoogle()

    if (error) {
      setError(error.message || 'Failed to sign in with Google')
      setLoading(false)
    }
    // If successful, the redirect will be handled by the OAuth flow
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await signIn(email, password)

    if (error) {
      setError(error.message || 'Failed to sign in')
      setLoading(false)
    } else {
      // Sign-in successful, reset loading so redirect effect can trigger
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotLoading(true)
    setError('')
    setMessage('')

    if (!forgotEmail.trim()) {
      setError('Please enter your email address')
      setForgotLoading(false)
      return
    }

    const { error } = await resetPassword(forgotEmail)

    if (error) {
      setError(error.message || 'Failed to send reset email')
    } else {
      setMessage('Password reset link sent! Check your email inbox.')
      setShowForgotPassword(false)
    }
    setForgotLoading(false)
  }

  // Show loading state when redirecting
  if (redirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="w-full max-w-md bg-[#23272f] rounded-2xl shadow-xl px-6 py-6 flex flex-col items-center border border-gray-800">
          <div className="flex flex-col items-center mb-6">
            <div className="flex items-center justify-center mb-2">
              <img
                src="/logo.png"
                alt="NicholMoviesUg Logo"
                width={48}
                height={48}
                className="w-12 h-12 object-contain rounded"
                style={{ margin: '0 auto' }}
              />
            </div>
            <p className="text-gray-400 text-sm">Watch your favorites</p>
          </div>
          <div className="w-8 h-8 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white mt-4">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="w-full max-w-md bg-[#23272f] rounded-2xl shadow-xl px-6 py-6 flex flex-col items-center border border-gray-800">
        {/* Logo and Title */}
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center justify-center mb-2">
            <img
              src="/logo.png"
              alt="NicholMoviesUg Logo"
              width={48}
              height={48}
              className="w-12 h-12 object-contain rounded"
              style={{ margin: '0 auto' }}
            />
          </div>
          <p className="text-gray-400 text-sm">Watch your favorites</p>
        </div>

        {/* Sign In Box */}
        <div className="w-full flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-white text-center mb-2">Sign In</h2>

          {error && (
            <div className="w-full p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-2">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          {message && (
            <div className="w-full p-3 rounded-lg bg-green-500/10 border border-green-500/20 mb-2">
              <p className="text-green-400 text-sm text-center">{message}</p>
            </div>
          )}

          {/* Google Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-white text-black text-base font-medium hover:bg-orange-100 transition mb-2 border border-[#E50914] focus:outline-none focus:ring-2 focus:ring-[#E50914] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 48 48"><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.23l6.85-6.85C35.46 2.14 30.12 0 24 0 14.88 0 6.74 5.06 2.69 12.44l7.97 6.19C12.13 13.43 17.62 9.5 24 9.5z" /><path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.22-.44-4.74H24v9.04h12.44c-.54 2.92-2.17 5.39-4.63 7.07l7.19 5.6C43.97 37.14 46.1 31.33 46.1 24.55z" /><path fill="#FBBC05" d="M10.66 28.63A14.48 14.48 0 0 1 9.5 24c0-1.62.28-3.19.77-4.63l-7.97-6.19A23.91 23.91 0 0 0 0 24c0 3.85.92 7.48 2.54 10.69l8.12-6.06z" /><path fill="#EA4335" d="M24 48c6.12 0 11.26-2.03 15.01-5.53l-7.19-5.6c-2.01 1.35-4.59 2.16-7.82 2.16-6.38 0-11.87-3.93-13.34-9.44l-8.12 6.06C6.74 42.94 14.88 48 24 48z" /></g></svg>
            {loading ? 'Signing in...' : 'Continue with Google'}
          </button>

          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-px bg-gray-700" />
            <span className="text-xs text-gray-500">OR CONTINUE WITH EMAIL</span>
            <div className="flex-1 h-px bg-gray-700" />
          </div>

          <form onSubmit={handleEmailSignIn} className="w-full flex flex-col gap-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="w-full rounded bg-[#22283a] border border-gray-700 px-4 py-3 text-base text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E50914] disabled:opacity-50"
            />
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full rounded bg-[#22283a] border border-gray-700 px-4 py-3 pr-12 text-base text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E50914] disabled:opacity-50"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-white transition"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full bg-[#E50914] hover:bg-[#b80710] text-white font-semibold text-base py-3 rounded-lg mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </div>

        {/* Links */}
        <div className="w-full flex flex-col items-center mt-5">
          <button
            type="button"
            onClick={() => {
              setShowForgotPassword(!showForgotPassword)
              setError('')
              setMessage('')
            }}
            className="text-sm text-[#E50914] hover:underline mb-2"
          >
            {showForgotPassword ? 'Back to Sign In' : 'Forgot your password?'}
          </button>

          {showForgotPassword && (
            <form onSubmit={handleForgotPassword} className="w-full flex flex-col gap-3 mt-2 mb-3 p-4 rounded-lg bg-[#22283a] border border-gray-700">
              <p className="text-gray-400 text-xs text-center">Enter your email to receive a password reset link</p>
              <input
                type="email"
                placeholder="Email address"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                disabled={forgotLoading}
                className="w-full rounded bg-[#1a1c21] border border-gray-700 px-4 py-3 text-base text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E50914] disabled:opacity-50"
              />
              <Button
                type="submit"
                disabled={forgotLoading}
                className="w-full bg-[#E50914] hover:bg-[#b80710] text-white font-semibold text-sm py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {forgotLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>
          )}

          <span className="text-gray-400 text-sm">Don&apos;t have an account? <Link href="/signup" className="text-[#E50914] hover:underline">Sign up</Link></span>
        </div>
      </div>
    </div>
  );
}
