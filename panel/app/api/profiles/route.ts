import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// GET /api/profiles - Fetch all profiles (bypasses RLS)
export async function GET() {
  try {
    const { data, error, count } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, subscription, subscription_start_date, subscription_expiry_date', { count: 'exact' })
      .order('name')

    if (error) {
      console.error('Error fetching profiles:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [], count: count || 0 })
  } catch (err) {
    console.error('Unexpected error fetching profiles:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/profiles - Update a profile's subscription (bypasses RLS)
export async function PUT(request: NextRequest) {
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
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Unexpected error updating profile:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/profiles - Delete a profile (bypasses RLS)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting profile:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Unexpected error deleting profile:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
