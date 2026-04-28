import { NextRequest, NextResponse } from 'next/server';
import { MakyPayService } from '@/lib/makypay';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, transactionId, subscriptionPlan, subscriptionDuration, accessToken } = body;

    // Validate required fields
    if (!userId || !transactionId || !subscriptionPlan || !subscriptionDuration) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

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
        const { data: profile, error: profileError } = await supabase
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
        const { data: txRecord, error: txError } = await supabase
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

    // Complete subscription payment
    await MakyPayService.completeSubscriptionPayment({
      userId,
      transactionId,
      subscriptionPlan,
      subscriptionDuration: parseInt(subscriptionDuration),
    });

    console.log('✅ Subscription completed and refreshed - access granted immediately');

    return NextResponse.json({
      success: true,
      message: 'Subscription activated successfully and access granted immediately',
    });

  } catch (error) {
    console.error('MakyPay completion error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Subscription completion failed',
        success: false
      },
      { status: 500 }
    );
  }
}
