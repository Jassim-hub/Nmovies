'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getUserSubscription } from '@/lib/subscriptions'

// Import debug utilities for development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  import('@/lib/utils/clearOldWatchlist');
}

interface AuthContextType {
  user: User | null
  loading: boolean
  isPremium: boolean
  refreshPremiumStatus: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signInWithGoogle: () => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
  updatePassword: (password: string) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPremium, setIsPremium] = useState(false)
  const router = useRouter()

  // Check premium status when user changes
  const checkPremiumStatus = async (currentUser: User | null) => {
    if (!currentUser) {
      setIsPremium(false)
      return
    }

    try {
      // Increase timeout to 15s to prevent hanging on slow networks, but give enough time
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Subscription check timeout')), 15000)
      )
      
      // Get user profile with subscription details including expiry date
      const profilePromise = supabase
        .from('profiles')
        .select('subscription, subscription_expiry_date')
        .eq('id', currentUser.id)
        .maybeSingle()
      
      const { data: profile, error } = await Promise.race([profilePromise, timeoutPromise]) as any
      
      if (error) {
        console.error('Error fetching profile for premium check:', error)
        // Keep previous state on network/timeout errors to avoid dropping premium
        return
      }

      if (!profile) {
        console.log('No profile found')
        setIsPremium(false)
        return
      }

      // Check if subscription exists and is not expired
      const hasSubscription = profile.subscription && profile.subscription !== 'free'
      const isNotExpired = profile.subscription_expiry_date && 
                          new Date(profile.subscription_expiry_date) > new Date()
      
      const isPremiumUser = hasSubscription && isNotExpired
      
      console.log('Premium status check:', {
        hasSubscription,
        subscription: profile.subscription,
        expiryDate: profile.subscription_expiry_date,
        isNotExpired,
        isPremiumUser
      })
      
      setIsPremium(isPremiumUser)
    } catch (error) {
      console.error('Error checking premium status:', error)
      // Do NOT let subscription errors or timeouts block the auth flow or drop state
    }
  }

  useEffect(() => {
    console.log('AuthProvider: Initializing auth state')
    
    // Add a fallback timeout to ensure loading never gets stuck
    const loadingTimeout = setTimeout(() => {
      console.warn('Auth loading timeout reached, forcing loading to false')
      setLoading(false)
    }, 10000) // 10 second timeout

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.error('AuthProvider: Error getting session (network/timeout):', error)
        // Do NOT clear the user state on a transient network error!
      } else {
        console.log('AuthProvider: Got session', session?.user?.email || 'no user')
        setUser(session?.user ?? null)
        
        // Check premium status but don't block loading state
        if (session?.user) {
          console.log('AuthProvider: Checking premium status for user')
          checkPremiumStatus(session.user).catch(console.error)
        } else {
          setIsPremium(false)
        }
      }
      
      console.log('AuthProvider: Setting loading to false')
      setLoading(false)
      clearTimeout(loadingTimeout)
    }).catch((error) => {
      console.error('AuthProvider: Uncaught error getting session:', error)
      // Do NOT wipe state on unhandled errors either
      setLoading(false)
      clearTimeout(loadingTimeout)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthProvider: Auth state changed', event, session?.user?.email || 'no user')

        // Intercept password recovery — do NOT sign the user in.
        // Redirect them to the reset-password page to set a new password.
        if (event === 'PASSWORD_RECOVERY') {
          setLoading(false)
          clearTimeout(loadingTimeout)
          router.push('/reset-password')
          return
        }

        if (event === 'INITIAL_SESSION') {
          setUser(session?.user ?? null)
          if (session?.user) {
            checkPremiumStatus(session.user).catch(console.error)
          } else {
            setIsPremium(false)
          }
        } else if (event === 'SIGNED_OUT') {
          // Explicitly clear state on verifiable logouts
          setUser(null)
          setIsPremium(false)
        } else if (session?.user) {
          // For events like SIGNED_IN or TOKEN_REFRESHED where we have a user
          setUser(session.user)
          // Don't await this to prevent blocking the auth state change
          checkPremiumStatus(session.user).catch(console.error)
        }

        setLoading(false)
        clearTimeout(loadingTimeout)
      }
    )

    return () => {
      subscription.unsubscribe()
      clearTimeout(loadingTimeout)
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { error }
  }

  const signInWithGoogle = async () => {
    // Use the canonical redirect URL - must match Supabase OAuth settings exactly
    let redirectUrl = `${window.location.origin}/auth/callback`
    
    // For production environments with custom domains, ensure the URL is correct
    // Remove trailing slashes and normalize
    redirectUrl = redirectUrl.replace(/\/$/, '')

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      })
      return { error }
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Unknown error') }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error }
  }

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({
      password: password,
    })
    return { error }
  }

  // Expose a function to force-refresh premium status (e.g. after payment)
  const refreshPremiumStatus = async () => {
    if (user) {
      await checkPremiumStatus(user)
    }
  }

  const value = {
    user,
    loading,
    isPremium,
    refreshPremiumStatus,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}