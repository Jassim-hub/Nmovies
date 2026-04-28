import { NextRequest, NextResponse } from 'next/server';
import { MakyPayService } from '@/lib/makypay';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionId } = body;

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Missing transactionId' },
        { status: 400 }
      );
    }

    // Check transaction status with polling
    const result = await MakyPayService.waitForTransactionCompletion({
      transactionId,
    });

    return NextResponse.json({
      success: true,
      transaction: result,
    });

  } catch (error) {
    console.error('MakyPay status check error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Status check failed',
        success: false
      },
      { status: 500 }
    );
  }
}
