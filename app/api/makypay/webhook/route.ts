import { NextRequest, NextResponse } from 'next/server';
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
    if (!supabaseAdmin) {
      console.error('Webhook: SUPABASE_SERVICE_ROLE_KEY not set — cannot update transaction status');
    } else {
      const { error } = await supabaseAdmin
        .from('makypay_transactions')
        .update(updateData)
        .or(`uuid.eq.${transaction.uuid},reference.eq.${transaction.reference}`);

      if (error) {
        console.error('Failed to update transaction from webhook:', error);
        // Don't return error to MakyPay - we received the webhook
      }
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
  // Require service-role client: webhook runs without user session, so
  // auth.uid() is NULL and RLS on profiles (auth.uid() = id) would block writes
  if (!supabaseAdmin) {
    console.error('Webhook: SUPABASE_SERVICE_ROLE_KEY is not set — cannot activate subscription from webhook');
    return;
  }

  try {
    // Look up the transaction to find the user and plan details
    const { data: txRecord, error: txError } = await supabaseAdmin
      .from('makypay_transactions')
      .select('user_id, description, amount')
      .or(`uuid.eq.${transactionUuid},reference.eq.${transactionReference}`)
      .single();

    if (txError || !txRecord || !txRecord.user_id) {
      console.error('Could not find transaction for subscription activation:', txError);
      return;
    }

    // Check if user already has an active subscription (avoid duplicate activation)
    const { data: profile } = await supabaseAdmin
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
    const planName = txRecord.description?.replace(/^Subscription:\s*/i, '').toLowerCase().trim() || 'basic';

    // Look up the plan to get the duration — use exact case-insensitive match
    // (fuzzy %like% can match multiple plans and cause PGRST116 errors)
    const { data: plan } = await supabaseAdmin
      .from('plans')
      .select('name, duration_in_days')
      .ilike('name', planName)
      .maybeSingle();

    const durationDays = plan?.duration_in_days || 30;
    // Use the canonical plan name from DB if found, otherwise use parsed name
    const canonicalPlanName = plan?.name?.toLowerCase() || planName;
    const now = new Date();
    const expiryDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // Update user profile FIRST — this is the critical write for access control
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription: canonicalPlanName,
        subscription_start_date: now.toISOString(),
        subscription_expiry_date: expiryDate.toISOString(),
      })
      .eq('id', txRecord.user_id);

    if (profileError) {
      console.error('Webhook: CRITICAL — Failed to update profile subscription:', profileError);
      return; // Don't insert subscription record if profile update failed
    }

    // Insert subscription record (payment ledger — non-critical)
    const { error: subError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: txRecord.user_id,
        plan: canonicalPlanName,
        payment_method: 'makypay_mobile_money',
        subscribed_at: now.toISOString(),
      });

    if (subError) {
      console.error('Webhook: Non-critical — Failed to insert subscription record:', subError);
    }

    console.log(`✅ Webhook: Subscription activated for user ${txRecord.user_id} (${canonicalPlanName}, ${durationDays} days)`);
  } catch (e) {
    console.error('Webhook: Error activating subscription:', e);
  }
}
