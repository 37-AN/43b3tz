// 43V3R BET AI - Payment API
// Handles PayFast, Ozow, and Crypto payments

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorNextResponse, ErrorCode } from '@/lib/api-response';
import crypto from 'crypto';

// Payment configuration
const PAYFAST_CONFIG = {
  merchantId: process.env.PAYFAST_MERCHANT_ID || '10000100',
  merchantKey: process.env.PAYFAST_MERCHANT_KEY || '46f0cd694581a',
  passPhrase: process.env.PAYFAST_PASSPHRASE || 'jt7NOE43FZPn',
  testMode: process.env.NODE_ENV !== 'production',
  baseUrl: 'https://www.payfast.co.za/eng/process',
};

/**
 * GET /api/payments
 * Get payment methods or user payment history
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');

    if (action === 'methods') {
      return NextResponse.json({
        success: true,
        data: {
          methods: [
            { id: 'payfast', name: 'PayFast', currencies: ['ZAR'], fees: 0 },
            { id: 'ozow', name: 'Ozow', currencies: ['ZAR'], fees: 0 },
            { id: 'crypto_usdt', name: 'USDT (TRC-20)', currencies: ['USDT'], fees: 0 },
            { id: 'crypto_btc', name: 'Bitcoin', currencies: ['BTC'], fees: 0 },
            { id: 'internal', name: 'Wallet Balance', currencies: ['ZAR', 'USDT'], fees: 0 },
          ],
          cryptoWallets: {
            usdt: process.env.USDT_WALLET || 'TRC-20: TYourUSDTWalletAddress',
            btc: process.env.BTC_WALLET || 'bc1qYourBTCWalletAddress',
          },
        },
      });
    }

    if (userId) {
      const payments = await db.payment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      return NextResponse.json({
        success: true,
        data: { payments },
      });
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Payment API ready' },
    });

  } catch (error) {
    console.error('Payment API error:', error);
    return errorNextResponse('Failed to fetch payment data', ErrorCode.INTERNAL_ERROR);
  }
}

/**
 * POST /api/payments
 * Initiate a payment
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, amount, currency, method, type, reference } = body;

    if (!userId || !amount || !method) {
      return errorNextResponse('userId, amount, and method are required', ErrorCode.VALIDATION_ERROR);
    }

    // Create payment record
    const payment = await db.payment.create({
      data: {
        userId,
        type: type || 'deposit',
        amount,
        currency: currency || 'ZAR',
        status: 'pending',
        paymentMethod: method,
        metadata: JSON.stringify({ reference }),
      },
    });

    let paymentData: any = {};

    switch (method) {
      case 'payfast':
        paymentData = await generatePayFastUrl(payment, userId);
        break;
      case 'ozow':
        paymentData = await generateOzowUrl(payment, userId);
        break;
      case 'crypto_usdt':
      case 'crypto_btc':
        paymentData = generateCryptoPayment(payment, method);
        break;
      case 'internal':
        paymentData = await processInternalPayment(payment, userId);
        break;
      default:
        return errorNextResponse('Invalid payment method', ErrorCode.VALIDATION_ERROR);
    }

    return NextResponse.json({
      success: true,
      data: {
        payment,
        ...paymentData,
      },
    });

  } catch (error) {
    console.error('Create payment error:', error);
    return errorNextResponse('Failed to create payment', ErrorCode.INTERNAL_ERROR);
  }
}

/**
 * Generate PayFast payment URL
 */
async function generatePayFastUrl(payment: any, userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  
  const data: Record<string, string> = {
    merchant_id: PAYFAST_CONFIG.merchantId,
    merchant_key: PAYFAST_CONFIG.merchantKey,
    return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payment/success`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payment/cancel`,
    notify_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/payments/callback/payfast`,
    name_first: user?.name?.split(' ')[0] || 'User',
    name_last: user?.name?.split(' ').slice(1).join(' ') || 'User',
    email_address: user?.email || 'user@example.com',
    m_payment_id: payment.id,
    m_payment_plan_id: '',
    amount: payment.amount.toFixed(2),
    item_name: `43V3R BET AI - ${payment.type}`,
    item_description: `${payment.type} payment`,
    custom_int1: '',
    custom_str1: userId,
    custom_str2: payment.type,
    custom_str3: '',
    custom_str4: '',
    custom_str5: '',
    pass_phrase: PAYFAST_CONFIG.passPhrase,
    ...(PAYFAST_CONFIG.testMode && { test_mode: '1' }),
  };

  // Generate signature
  const signature = generatePayFastSignature(data);
  data.signature = signature;

  // Build URL
  const params = new URLSearchParams(data as any).toString();
  const paymentUrl = `${PAYFAST_CONFIG.baseUrl}?${params}`;

  return {
    paymentUrl,
    method: 'redirect',
    signature,
  };
}

/**
 * Generate PayFast signature
 */
function generatePayFastSignature(data: Record<string, string>): string {
  // Sort data alphabetically
  const sortedData = Object.keys(data)
    .sort()
    .reduce((acc: Record<string, string>, key) => {
      if (data[key] !== '' && data[key] !== undefined) {
        acc[key] = data[key];
      }
      return acc;
    }, {});

  // Build signature string
  const signatureString = Object.entries(sortedData)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

  // Generate MD5 hash
  return crypto.createHash('md5').update(signatureString).digest('hex');
}

/**
 * Generate Ozow payment URL
 */
async function generateOzowUrl(payment: any, userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  
  // Ozow integration (simplified)
  const ozowData = {
    SiteCode: process.env.OZOW_SITE_CODE || 'SITE-CODE',
    TransactionId: payment.id,
    Amount: payment.amount.toFixed(2),
    CurrencyCode: payment.currency || 'ZAR',
    BankReference: `43V3R-${payment.id.slice(0, 8)}`,
    CustomerReference: userId,
    CancelUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payment/cancel`,
    ErrorUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payment/error`,
    SuccessUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payment/success`,
    NotifyUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/payments/callback/ozow`,
    IsTest: process.env.NODE_ENV !== 'production',
    CustomerEmail: user?.email,
  };

  return {
    paymentUrl: 'https://api.ozow.com/post',
    method: 'redirect',
    data: ozowData,
  };
}

/**
 * Generate crypto payment details
 */
function generateCryptoPayment(payment: any, method: string) {
  const wallets: Record<string, { address: string; network: string }> = {
    crypto_usdt: {
      address: process.env.USDT_WALLET || 'TYourUSDTWalletAddress',
      network: 'TRC-20',
    },
    crypto_btc: {
      address: process.env.BTC_WALLET || 'bc1qYourBTCWalletAddress',
      network: 'Bitcoin',
    },
  };

  const wallet = wallets[method];

  return {
    method: 'crypto',
    walletAddress: wallet.address,
    network: wallet.network,
    amount: payment.amount,
    currency: method === 'crypto_usdt' ? 'USDT' : 'BTC',
    expectedConfirmations: 3,
    instructions: `Send ${payment.amount} ${method === 'crypto_usdt' ? 'USDT' : 'BTC'} to the wallet address above. Your account will be credited after ${3} confirmations.`,
  };
}

/**
 * Process internal wallet payment
 */
async function processInternalPayment(payment: any, userId: string) {
  const wallet = await db.wallet.findUnique({ where: { userId } });

  if (!wallet || wallet.balance < payment.amount) {
    // Mark payment as failed
    await db.payment.update({
      where: { id: payment.id },
      data: { status: 'failed' },
    });

    return {
      method: 'internal',
      success: false,
      message: 'Insufficient wallet balance',
    };
  }

  // Deduct from wallet
  await db.wallet.update({
    where: { userId },
    data: {
      balance: { decrement: payment.amount },
    },
  });

  // Mark payment as completed
  await db.payment.update({
    where: { id: payment.id },
    data: { status: 'completed', processedAt: new Date() },
  });

  // Create transaction record
  await db.transaction.create({
    data: {
      userId,
      type: payment.type,
      amount: payment.amount,
      status: 'completed',
      paymentMethod: 'internal',
      referenceId: payment.id,
    },
  });

  return {
    method: 'internal',
    success: true,
    message: 'Payment processed successfully',
    newBalance: wallet.balance - payment.amount,
  };
}
