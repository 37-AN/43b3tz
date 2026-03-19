import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'demo-user';

    // In a real app, fetch from database
    const wallet = {
      id: 'wallet-demo',
      userId,
      balance: 1000,
      virtualBalance: 5000,
      totalProfit: 0,
      totalBets: 0,
      winRate: 0,
      roi: 0
    };

    return NextResponse.json({
      success: true,
      data: wallet
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch wallet'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, amount, type, paymentMethod } = body;

    // Validate
    if (!amount || amount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid amount'
      }, { status: 400 });
    }

    // In a real app:
    // 1. Process payment with PayFast/Ozow/Crypto
    // 2. Update wallet balance
    // 3. Create transaction record

    const transaction = {
      id: `txn-${Date.now()}`,
      userId: userId || 'demo-user',
      type: type || 'deposit',
      amount,
      status: 'completed',
      paymentMethod: paymentMethod || 'internal',
      createdAt: new Date()
    };

    return NextResponse.json({
      success: true,
      data: transaction,
      message: 'Transaction processed successfully'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to process transaction'
    }, { status: 500 });
  }
}
