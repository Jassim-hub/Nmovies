import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
    const body = await request.json();
    
    console.log('MakyPay Webhook received:', JSON.stringify(body, null, 2));

    const { event_type, transaction, collection, metadata } = body;

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
    const { error } = await supabase
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
        // You can add additional logic here, like sending notifications
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
