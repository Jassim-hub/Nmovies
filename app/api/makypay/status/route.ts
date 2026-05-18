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

    // Single status check — frontend drives the polling loop
    const result = await MakyPayService.checkTransactionStatus(transactionId);

    return NextResponse.json({
      success: true,
      transaction: result,
    });

  } catch (error) {
    console.error('MakyPay status check error:', error);

    const isUserFacing = error instanceof Error && error.name === 'MakyPayException';
    return NextResponse.json(
      {
        error: isUserFacing ? error.message : 'Status check failed',
        success: false
      },
      { status: 500 }
    );
  }
}
