import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * MakyPay Webhook Handler
 * Receives real-time notifications for payment status changes
 * 
 * Supported events:
 * - collection.completed: Payment received successfully
 * - collection.failed: Payment failed or rejected
 * - collection.cancelled: Payment cancelled by user
 * - disbursement.completed: Transfer successful
 * - disbursement.failed: Transfer failed
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Verify webhook authenticity via shared secret
    // Set MAKYPAY_WEBHOOK_SECRET in .env and append ?secret=<value> to the webhook URL
    // registered with MakyPay.
    const webhookSecret = process.env.MAKYPAY_WEBHOOK_SECRET;
    if (webhookSecret) {
      const { searchParams } = new URL(request.url);
      const providedSecret = searchParams.get('secret');
      if (providedSecret !== webhookSecret) {
        console.error('MakyPay Webhook: Invalid or missing secret');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    const body = await request.json();
    
    console.log('MakyPay Webhook received:', JSON.stringify(body, null, 2));

    const { event_type, transaction, collection } = body;

    if (!event_type || !transaction) {
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      );
    }

    // Update transaction status in database
    const updateData: Record<string, any> = {
      status: transaction.status,
      updated_at: new Date().toISOString(),
    };

    // Add provider reference if available
    if (collection?.provider_reference) {
      updateData.provider_reference = collection.provider_reference;
    }

    // Update by UUID or reference
    // Use service-role client for server-side webhook writes
    const db = supabaseAdmin || supabase;
    const { error } = await db
      .from('makypay_transactions')
      .update(updateData)
      .or(`uuid.eq.${transaction.uuid},reference.eq.${transaction.reference}`);

    if (error) {
      console.error('Failed to update transaction from webhook:', error);
      // Don't return error to MakyPay - we received the webhook
    }

    // Handle specific event types
    switch (event_type) {
      case 'collection.completed':
        console.log('✅ Payment completed:', transaction.uuid);
        // Activate subscription as a fallback in case client-side polling missed it
        await activateSubscriptionFromTransaction(transaction.uuid, transaction.reference);
        break;

      case 'collection.failed':
        console.log('❌ Payment failed:', transaction.uuid);
        break;

      case 'collection.cancelled':
        console.log('🚫 Payment cancelled:', transaction.uuid);
        break;

      case 'disbursement.completed':
        console.log('✅ Disbursement completed:', transaction.uuid);
        break;

      case 'disbursement.failed':
        console.log('❌ Disbursement failed:', transaction.uuid);
        break;

      default:
        console.log('Unknown event type:', event_type);
    }

    // Return success to MakyPay
    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
    });

  } catch (error) {
    console.error('MakyPay webhook error:', error);

    // Return success even on error to prevent retries
    return NextResponse.json({
      success: true,
      message: 'Webhook received',
    });
  }
}

/**
 * Activate subscription from a completed transaction.
 * This serves as a fallback when the user closes the browser
 * before client-side polling detects the completion.
 */
async function activateSubscriptionFromTransaction(
  transactionUuid: string,
  transactionReference: string
): Promise<void> {
  // Use service-role client: webhook runs without user session, so
  // auth.uid() is NULL and RLS on profiles (auth.uid() = id) would block writes
  const db = supabaseAdmin || supabase;
  try {
    // Look up the transaction to find the user and plan details
    const { data: txRecord, error: txError } = await db
      .from('makypay_transactions')
      .select('user_id, description, amount')
      .or(`uuid.eq.${transactionUuid},reference.eq.${transactionReference}`)
      .single();

    if (txError || !txRecord || !txRecord.user_id) {
      console.error('Could not find transaction for subscription activation:', txError);
      return;
    }

    // Check if user already has an active subscription (avoid duplicate activation)
    const { data: profile } = await db
      .from('profiles')
      .select('subscription, subscription_expiry_date')
      .eq('id', txRecord.user_id)
      .single();

    if (profile?.subscription_expiry_date) {
      const expiry = new Date(profile.subscription_expiry_date);
      if (expiry > new Date()) {
        console.log('User already has active subscription, skipping webhook activation');
        return;
      }
    }

    // Parse plan name from the description (format: "Subscription: Plan Name")
    const planName = txRecord.description?.replace(/^Subscription:\s*/i, '').toLowerCase() || 'basic';

    // Look up the plan to get the duration
    const { data: plan } = await db
      .from('plans')
      .select('name, duration_in_days')
      .ilike('name', `%${planName}%`)
      .single();

    const durationDays = plan?.duration_in_days || 30;
    const now = new Date();
    const expiryDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // Insert subscription record
    await db
      .from('subscriptions')
      .insert({
        user_id: txRecord.user_id,
        plan: planName,
        payment_method: 'makypay_mobile_money',
        subscribed_at: now.toISOString(),
      });

    // Update user profile — MUST use service-role to bypass profiles RLS
    const { error: profileError } = await db
      .from('profiles')
      .update({
        subscription: planName,
        subscription_start_date: now.toISOString(),
        subscription_expiry_date: expiryDate.toISOString(),
      })
      .eq('id', txRecord.user_id);

    if (profileError) {
      console.error('Webhook: Failed to update profile subscription:', profileError);
    } else {
      console.log(`✅ Webhook: Subscription activated for user ${txRecord.user_id} (${planName}, ${durationDays} days)`);
    }
  } catch (e) {
    console.error('Webhook: Error activating subscription:', e);
  }
}
