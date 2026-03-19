import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/lib/payments/payment-service';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { method, amount, userId, email } = body;

    if (!method || !amount || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
      }, { status: 400 });
    }

    // Validate amount
    const methods = paymentService.getAvailableMethods();
    const methodConfig = methods.find(m => m.id === method);
    
    if (!methodConfig) {
      return NextResponse.json({
        success: false,
        error: 'Invalid payment method',
      }, { status: 400 });
    }

    if (amount < methodConfig.minAmount || amount > methodConfig.maxAmount) {
      return NextResponse.json({
        success: false,
        error: `Amount must be between ${methodConfig.minAmount} and ${methodConfig.maxAmount}`,
      }, { status: 400 });
    }

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    const result = await paymentService.createDeposit(method, {
      amount,
      currency: methodConfig.currencies[0],
      userId,
      email: email || `${userId}@43v3r.bet`,
      description: `Wallet deposit - R${amount}`,
      returnUrl: `${baseUrl}/wallet?payment=success`,
      cancelUrl: `${baseUrl}/wallet?payment=cancelled`,
      notifyUrl: `${baseUrl}/api/payments/callback/${method}`,
    });

    // Store pending transaction
    if (result.success) {
      await db.transaction.create({
        data: {
          userId,
          type: 'deposit',
          amount,
          status: 'pending',
          referenceId: result.transactionId,
          paymentMethod: method,
          description: `Deposit via ${methodConfig.name}`,
        },
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Payment error:', error);
    return NextResponse.json({
      success: false,
      error: 'Payment processing failed',
    }, { status: 500 });
  }
}
