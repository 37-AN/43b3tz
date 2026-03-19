// 43V3R BET AI - Payment Callback API
// Handles PayFast, Ozow, and Crypto payment callbacks

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

const PAYFAST_PASSPHRASE = process.env.PAYFAST_PASSPHRASE || 'jt7NOE43FZPn';

/**
 * POST /api/payments/callback/[method]
 * Handle payment callbacks from different providers
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ method: string }> }
) {
  const { method } = await params;
  
  console.log(`[PAYMENT CALLBACK] Received ${method} callback`);

  try {
    switch (method) {
      case 'payfast':
        return await handlePayFastCallback(request);
      case 'ozow':
        return await handleOzowCallback(request);
      case 'crypto':
        return await handleCryptoCallback(request);
      default:
        return NextResponse.json({ success: false, error: 'Unknown payment method' }, { status: 400 });
    }
  } catch (error) {
    console.error(`[PAYMENT CALLBACK] Error processing ${method} callback:`, error);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}

/**
 * Handle PayFast ITN (Instant Transaction Notification)
 */
async function handlePayFastCallback(request: NextRequest) {
  const formData = await request.formData();
  const data: Record<string, string> = {};
  
  formData.forEach((value, key) => {
    data[key] = value.toString();
  });

  console.log('[PAYFAST] Callback data:', data);

  // Verify signature
  const receivedSignature = data.signature;
  delete data.signature;
  
  // Calculate expected signature
  const signatureString = Object.keys(data)
    .sort()
    .map(key => `${key}=${encodeURIComponent(data[key])}`)
    .join('&') + `&pass_phrase=${PAYFAST_PASSPHRASE}`;
  
  const expectedSignature = crypto.createHash('md5').update(signatureString).digest('hex');

  if (receivedSignature !== expectedSignature) {
    console.error('[PAYFAST] Invalid signature');
    return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 400 });
  }

  const paymentId = data.m_payment_id;
  const paymentStatus = data.payment_status;
  const amount = parseFloat(data.amount_gross);
  const userId = data.custom_str1;
  const paymentType = data.custom_str2;

  // Find payment record
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    console.error('[PAYFAST] Payment not found:', paymentId);
    return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
  }

  // Update payment status
  if (paymentStatus === 'COMPLETE') {
    await db.payment.update({
      where: { id: paymentId },
      data: {
        status: 'completed',
        processedAt: new Date(),
        externalRef: data.pf_payment_id,
        metadata: JSON.stringify(data),
      },
    });

    // Update user wallet if deposit
    if (paymentType === 'deposit') {
      await db.wallet.upsert({
        where: { userId },
        create: {
          userId,
          balance: amount,
        },
        update: {
          balance: { increment: amount },
        },
      });

      // Create transaction record
      await db.transaction.create({
        data: {
          userId,
          type: 'deposit',
          amount,
          status: 'completed',
          paymentMethod: 'payfast',
          referenceId: paymentId,
        },
      });
    }

    // Create subscription if subscription payment
    if (paymentType === 'subscription') {
      const tier = payment.metadata ? JSON.parse(payment.metadata as string).tier : 'pro';
      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1);

      await db.subscription.create({
        data: {
          userId,
          type: 'monthly',
          tier,
          status: 'active',
          startDate: now,
          endDate,
          amount,
          currency: 'ZAR',
          paymentMethod: 'payfast',
          paymentId,
          externalRef: data.pf_payment_id,
          isActive: true,
        },
      });
    }

    console.log('[PAYFAST] Payment completed:', paymentId);
  } else {
    await db.payment.update({
      where: { id: paymentId },
      data: {
        status: paymentStatus.toLowerCase(),
        metadata: JSON.stringify(data),
      },
    });
    
    console.log('[PAYFAST] Payment status:', paymentId, paymentStatus);
  }

  return NextResponse.json({ success: true });
}

/**
 * Handle Ozow callback
 */
async function handleOzowCallback(request: NextRequest) {
  const body = await request.json();
  
  console.log('[OZOW] Callback data:', body);

  const { TransactionId, Status, Amount } = body;
  
  const payment = await db.payment.findUnique({
    where: { id: TransactionId },
  });

  if (!payment) {
    return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
  }

  if (Status === 'Complete') {
    await db.payment.update({
      where: { id: TransactionId },
      data: {
        status: 'completed',
        processedAt: new Date(),
        metadata: JSON.stringify(body),
      },
    });

    // Update wallet
    if (payment.type === 'deposit') {
      await db.wallet.upsert({
        where: { userId: payment.userId },
        create: { userId: payment.userId, balance: Amount },
        update: { balance: { increment: Amount } },
      });

      await db.transaction.create({
        data: {
          userId: payment.userId,
          type: 'deposit',
          amount: Amount,
          status: 'completed',
          paymentMethod: 'ozow',
          referenceId: TransactionId,
        },
      });
    }
  }

  return NextResponse.json({ success: true });
}

/**
 * Handle crypto payment callback (manual verification or webhook)
 */
async function handleCryptoCallback(request: NextRequest) {
  const body = await request.json();
  
  console.log('[CRYPTO] Callback data:', body);

  const { paymentId, txHash, confirmations, amount } = body;

  const payment = await db.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
  }

  // Require minimum confirmations
  const minConfirmations = 3;
  
  if (confirmations >= minConfirmations && payment.status === 'pending') {
    await db.payment.update({
      where: { id: paymentId },
      data: {
        status: 'completed',
        processedAt: new Date(),
        externalRef: txHash,
        metadata: JSON.stringify({ txHash, confirmations, amount }),
      },
    });

    // Update wallet
    if (payment.type === 'deposit') {
      // Convert crypto to ZAR (simplified - in production use real rates)
      const zarAmount = payment.currency === 'USDT' ? amount * 18 : amount * 500000; // Rough conversion

      await db.wallet.upsert({
        where: { userId: payment.userId },
        create: { userId: payment.userId, balance: zarAmount },
        update: { balance: { increment: zarAmount } },
      });

      await db.transaction.create({
        data: {
          userId: payment.userId,
          type: 'deposit',
          amount: zarAmount,
          status: 'completed',
          paymentMethod: payment.currency === 'USDT' ? 'crypto_usdt' : 'crypto_btc',
          referenceId: paymentId,
        },
      });
    }
  }

  return NextResponse.json({ success: true });
}
