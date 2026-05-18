import { NextRequest, NextResponse } from 'next/server';
import { MakyPayService } from '@/lib/makypay';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, phoneNumber, amount, description, paymentMethod, accessToken } = body;

    // Validate required fields
    if (!userId || !amount || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, amount, description' },
        { status: 400 }
      );
    }

    // For mobile money, phone number is required
    if (paymentMethod !== 'card' && !phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required for mobile money payments' },
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

    // Verify user exists using service-role client (bypasses RLS)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    let userExists = false;

    const userIdToValidate = resolvedUserId || userId;

    if (!serviceRoleKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not set — cannot validate user');
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 500 }
      );
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      serviceRoleKey,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Primary check: look up auth.users via admin API
    try {
      const { data: adminUser, error: adminError } = await adminClient.auth.admin.getUserById(
        userIdToValidate as string
      );
      if (adminError) {
        console.error('Admin getUserById error:', adminError.message);
      } else if (adminUser && adminUser.user) {
        userExists = true;
      }
    } catch (e) {
      console.error('Service-role user lookup threw:', e);
    }

    // Fallback: check profiles table — also use admin client to bypass RLS
    if (!userExists) {
      try {
        const { data: profile, error: profileError } = await adminClient
          .from('profiles')
          .select('id')
          .eq('id', userIdToValidate)
          .single();

        if (profileError) {
          console.error('Profiles fallback lookup error:', profileError.message);
        } else if (profile) {
          userExists = true;
        }
      } catch (e) {
        console.error('Profiles lookup threw:', e);
      }
    }

    if (!userExists) {
      console.error(`Payment blocked: no user found for ID ${userIdToValidate}`);
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // Initiate payment with MakyPay
    let result;
    
    if (paymentMethod === 'card') {
      // Card payment
      result = await MakyPayService.collectCardPayment({
        userId: userIdToValidate as string,
        amount: parseFloat(amount),
        description,
      });
    } else {
      // Mobile money payment
      result = await MakyPayService.collectMobileMoney({
        userId: userIdToValidate as string,
        phoneNumber,
        amount: parseFloat(amount),
        description,
      });
    }

    return NextResponse.json({
      success: true,
      transaction: result,
    });

  } catch (error) {
    const isUserFacing = error instanceof Error && error.name === 'MakyPayException';
    const errorMessage = isUserFacing ? error.message : 'Payment initiation failed';
    console.error('MakyPay API error:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: errorMessage,
        success: false
      },
      { status: 500 }
    );
  }
}
