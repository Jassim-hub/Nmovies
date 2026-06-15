import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAdminRequest } from '@/lib/apiAuth'

// GET /api/profiles - Fetch all profiles (bypasses RLS)
export async function GET(request: NextRequest) {
  // SECURITY: Verify the caller is an authenticated admin
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const { data, error, count } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, subscription, subscription_start_date, subscription_expiry_date', { count: 'exact' })
      .order('name')

    if (error) {
      console.error('Error fetching profiles:', error)
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 })
    }

    return NextResponse.json({ data: data || [], count: count || 0 })
  } catch (err) {
    console.error('Unexpected error fetching profiles:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/profiles - Update a profile's subscription (bypasses RLS)
export async function PUT(request: NextRequest) {
  // SECURITY: Verify the caller is an authenticated admin
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json()
    const { id, subscription, subscription_start_date, subscription_expiry_date } = body

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription,
        subscription_start_date,
        subscription_expiry_date,
      })
      .eq('id', id)

    if (error) {
      console.error('Error updating profile:', error)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Unexpected error updating profile:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/profiles - Delete a user and all their details (bypasses RLS)
// NOTE: Payment history is intentionally preserved.
export async function DELETE(request: NextRequest) {
  // SECURITY: Verify the caller is an authenticated admin
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Step 1: Delete watchlist entries for this user
    const { error: watchlistError } = await supabaseAdmin
      .from('watchlists')
      .delete()
      .eq('user_id', id)

    if (watchlistError) {
      console.error('Error deleting user watchlist:', watchlistError)
      // Non-fatal — continue with deletion
    }

    // Step 2: Delete subscriptions for this user (not payment history)
    const { error: subscriptionsError } = await supabaseAdmin
      .from('subscriptions')
      .delete()
      .eq('user_id', id)

    if (subscriptionsError) {
      console.error('Error deleting user subscriptions:', subscriptionsError)
      // Non-fatal — continue with deletion
    }

    // Step 3: Delete the profile row
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', id)

    if (profileError) {
      console.error('Error deleting profile:', profileError)
      return NextResponse.json({ error: 'Failed to delete user profile' }, { status: 500 })
    }

    // Step 4: Delete the auth user (this fully removes login access)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id)

    if (authError) {
      console.error('Error deleting auth user:', authError)
      // Profile is already deleted; warn but still return success so the UI
      // reflects the removal — the orphaned auth record won't be able to log in.
      return NextResponse.json({
        success: true,
        warning: 'Profile data deleted but auth account removal failed. User cannot log in but auth record may persist.',
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Unexpected error deleting profile:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
