import { NextRequest, NextResponse } from 'next/server';
import { MakyPayService } from '@/lib/makypay';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, transactionId, subscriptionPlan, subscriptionDuration, accessToken } = body;

    // Validate required fields
    if (!userId || !transactionId || !subscriptionPlan) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Use service-role client for all server-side operations (bypasses RLS)
    if (!supabaseAdmin) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not set — cannot complete subscription');
      return NextResponse.json(
        { error: 'Server configuration error. Please contact support.' },
        { status: 500 }
      );
    }
    const db = supabaseAdmin;

    // Try resolving user from provided session access token
    let resolvedUserId: string | null = userId ?? null;
    if (!resolvedUserId && accessToken) {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
          }
        });
        if (res.ok) {
          const userJson = await res.json();
          if (userJson && userJson.id) resolvedUserId = userJson.id;
        }
      } catch (e) {
        console.error('Session-based user resolution failed:', e);
      }
    }

    // Verify user exists
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    let userExists = false;

    const userIdToValidate = resolvedUserId || userId;

    if (serviceRoleKey) {
      try {
        const adminClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || '',
          serviceRoleKey,
          { auth: { persistSession: false } }
        );

        const { data: adminUser, error: adminError } = await adminClient.auth.admin.getUserById(
          userIdToValidate as string
        );
        if (!adminError && adminUser && adminUser.user) {
          userExists = true;
        }
      } catch (e) {
        console.error('Service-role user lookup failed:', e);
      }
    }

    if (!userExists) {
      try {
        const { data: profile, error: profileError } = await db
          .from('profiles')
          .select('id')
          .eq('id', userIdToValidate)
          .single();

        if (profile && !profileError) {
          userExists = true;
        }
      } catch (e) {
        console.error('Profiles lookup failed:', e);
      }
    }

    if (!userExists) {
      // Try to resolve user from the stored transaction record as a last resort
      try {
        const { data: txRecord, error: txError } = await db
          .from('makypay_transactions')
          .select('user_id')
          .eq('uuid', transactionId)
          .single();

        if (txRecord && !txError && txRecord.user_id) {
          console.log('Resolved user from transaction record:', txRecord.user_id);
          (body as any).userId = txRecord.user_id;
          userExists = true;
        }
      } catch (e) {
        console.error('Error resolving user from transaction:', e);
      }
    }

    if (!userExists) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const finalUserId = (body as any).userId || userIdToValidate;

    // ── Look up the REAL plan from admin dashboard ──────────────────────
    // Don't blindly trust the client-sent subscriptionDuration.
    // Fetch the plan from the `plans` table to get the authoritative duration.
    const planNameNormalized = subscriptionPlan.toLowerCase().trim();
    let planDurationDays = subscriptionDuration ? parseInt(subscriptionDuration) : 30;

    try {
      const { data: planRecord, error: planError } = await db
        .from('plans')
        .select('name, duration_in_days, amount, active')
        .ilike('name', planNameNormalized)
        .maybeSingle();

      if (planError) {
        console.warn('Could not look up plan from DB:', planError.message);
        // Fall through — use client-sent duration as fallback
      } else if (planRecord) {
        if (!planRecord.active) {
          console.warn(`Plan "${planRecord.name}" is inactive in admin dashboard`);
        }
        // Use the admin dashboard's authoritative duration
        planDurationDays = planRecord.duration_in_days || planDurationDays;
        console.log(`Plan lookup: "${planRecord.name}" → ${planDurationDays} days (from admin dashboard)`);
      }
    } catch (e) {
      console.warn('Plan lookup threw, using client-sent duration as fallback:', e);
    }

    // Complete subscription payment
    await MakyPayService.completeSubscriptionPayment({
      userId: finalUserId as string,
      transactionId,
      subscriptionPlan: planNameNormalized,
      subscriptionDuration: planDurationDays,
    });

    console.log('✅ Subscription completed and refreshed - access granted immediately');

    return NextResponse.json({
      success: true,
      message: 'Subscription activated successfully and access granted immediately',
    });

  } catch (error) {
    console.error('MakyPay completion error:', error);

    const isUserFacing = error instanceof Error && error.name === 'MakyPayException';
    return NextResponse.json(
      {
        error: isUserFacing ? error.message : 'Subscription completion failed',
        success: false
      },
      { status: 500 }
    );
  }
}
