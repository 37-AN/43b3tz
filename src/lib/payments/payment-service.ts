// 43V3R BET AI - Payment Integration Services
// PayFast, Ozow, and Crypto (USDT) payment gateways

import crypto from 'crypto';

// ==================== TYPES ====================

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  redirectUrl?: string;
  message?: string;
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  userId: string;
  email: string;
  description?: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
}

// ==================== PAYFAST INTEGRATION ====================

export class PayFastService {
  private merchantId: string;
  private merchantKey: string;
  private passPhrase: string;
  private baseUrl: string;
  private isSandbox: boolean;

  constructor() {
    this.merchantId = process.env.PAYFAST_MERCHANT_ID || '10000100';
    this.merchantKey = process.env.PAYFAST_MERCHANT_KEY || '46f0cd694581a';
    this.passPhrase = process.env.PAYFAST_PASSPHRASE || '';
    this.isSandbox = process.env.PAYFAST_SANDBOX === 'true';
    this.baseUrl = this.isSandbox 
      ? 'https://sandbox.payfast.co.za/eng/process' 
      : 'https://www.payfast.co.za/eng/process';
  }

  private generateSignature(data: Record<string, string>): string {
    // Sort parameters alphabetically
    const sortedKeys = Object.keys(data).sort();
    const paramString = sortedKeys
      .filter(key => data[key] !== '' && data[key] !== undefined)
      .map(key => `${key}=${encodeURIComponent(data[key])}`)
      .join('&');

    // Add passphrase
    const stringToSign = this.passPhrase 
      ? `${paramString}&passphrase=${encodeURIComponent(this.passPhrase)}` 
      : paramString;

    return crypto.createHash('md5').update(stringToSign).digest('hex');
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResult> {
    const paymentId = `PF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const paymentData: Record<string, string> = {
      merchant_id: this.merchantId,
      merchant_key: this.merchantKey,
      return_url: request.returnUrl,
      cancel_url: request.cancelUrl,
      notify_url: request.notifyUrl,
      name_first: 'User',
      name_last: request.userId.slice(0, 8),
      email_address: request.email,
      m_payment_id: paymentId,
      amount: request.amount.toFixed(2),
      item_name: request.description || '43V3R BET AI Wallet Top-up',
      item_description: `Wallet deposit for user ${request.userId}`,
    };

    // Generate signature
    const signature = this.generateSignature(paymentData);
    paymentData.signature = signature;

    // Build payment URL
    const params = new URLSearchParams(paymentData);
    const paymentUrl = `${this.baseUrl}?${params.toString()}`;

    return {
      success: true,
      transactionId: paymentId,
      amount: request.amount,
      currency: 'ZAR',
      status: 'pending',
      redirectUrl: paymentUrl,
      message: 'Redirect user to PayFast payment page',
    };
  }

  async verifyCallback(data: Record<string, string>): Promise<{
    valid: boolean;
    paymentId: string;
    status: 'completed' | 'failed';
    amount: number;
  }> {
    // Verify signature
    const receivedSignature = data.signature;
    const dataWithoutSignature = { ...data };
    delete dataWithoutSignature.signature;
    
    const calculatedSignature = this.generateSignature(dataWithoutSignature);
    
    if (receivedSignature !== calculatedSignature) {
      return { valid: false, paymentId: '', status: 'failed', amount: 0 };
    }

    // Verify with PayFast server
    const verifyUrl = this.isSandbox 
      ? 'https://sandbox.payfast.co.za/eng/query/validate' 
      : 'https://www.payfast.co.za/eng/query/validate';

    try {
      const response = await fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(data).toString(),
      });

      const text = await response.text();
      const isValid = text === 'VALID';

      return {
        valid: isValid,
        paymentId: data.m_payment_id,
        status: data.payment_status === 'COMPLETE' ? 'completed' : 'failed',
        amount: parseFloat(data.amount_gross),
      };
    } catch (error) {
      console.error('PayFast verification error:', error);
      return { valid: false, paymentId: '', status: 'failed', amount: 0 };
    }
  }
}

// ==================== OZOW INTEGRATION ====================

export class OzowService {
  private siteCode: string;
  private privateKey: string;
  private apiKey: string;
  private baseUrl: string;
  private isSandbox: boolean;

  constructor() {
    this.siteCode = process.env.OZOW_SITE_CODE || '';
    this.privateKey = process.env.OZOW_PRIVATE_KEY || '';
    this.apiKey = process.env.OZOW_API_KEY || '';
    this.isSandbox = process.env.OZOW_SANDBOX === 'true';
    this.baseUrl = this.isSandbox 
      ? 'https://stagingapi.ozow.com' 
      : 'https://api.ozow.com';
  }

  private generateHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex').toLowerCase();
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResult> {
    const transactionId = `OZ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const paymentData = {
      SiteCode: this.siteCode,
      TransactionId: transactionId,
      Amount: request.amount.toFixed(2),
      CurrencyCode: request.currency,
      BankReference: `43V3R-${request.userId.slice(0, 8)}`,
      Customer: request.email,
      CancelUrl: request.cancelUrl,
      ErrorUrl: request.cancelUrl,
      SuccessUrl: request.returnUrl,
      NotifyUrl: request.notifyUrl,
      IsTest: this.isSandbox,
    };

    // Generate hash
    const hashString = `${this.siteCode}${transactionId}${request.amount.toFixed(2)}${request.currency}${request.email}${request.returnUrl}${request.cancelUrl}${request.notifyUrl}${this.privateKey}`;
    const hash = this.generateHash(hashString);

    try {
      const response = await fetch(`${this.baseUrl}/PostPaymentRequest`, {
        method: 'POST',
        headers: {
          'ApiKey': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...paymentData, HashCheck: hash }),
      });

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          transactionId,
          amount: request.amount,
          currency: request.currency,
          status: 'pending',
          redirectUrl: result.url,
          message: 'Redirect user to Ozow payment page',
        };
      }

      return {
        success: false,
        transactionId,
        amount: request.amount,
        currency: request.currency,
        status: 'failed',
        message: result.errorMessage || 'Payment creation failed',
      };
    } catch (error) {
      console.error('Ozow payment error:', error);
      return {
        success: false,
        transactionId,
        amount: request.amount,
        currency: request.currency,
        status: 'failed',
        message: 'Payment service unavailable',
      };
    }
  }

  async verifyCallback(data: Record<string, string>): Promise<{
    valid: boolean;
    transactionId: string;
    status: 'completed' | 'failed';
    amount: number;
  }> {
    const hashString = `${this.siteCode}${data.TransactionId}${data.Status}${data.Amount}${this.privateKey}`;
    const calculatedHash = this.generateHash(hashString);

    return {
      valid: calculatedHash === data.Hash,
      transactionId: data.TransactionId,
      status: data.Status === 'Complete' ? 'completed' : 'failed',
      amount: parseFloat(data.Amount),
    };
  }
}

// ==================== CRYPTO (USDT) INTEGRATION ====================

export class CryptoPaymentService {
  private walletAddress: string;
  private apiKey: string;
  private webhookSecret: string;

  constructor() {
    this.walletAddress = process.env.CRYPTO_WALLET_ADDRESS || '';
    this.apiKey = process.env.CRYPTO_API_KEY || '';
    this.webhookSecret = process.env.CRYPTO_WEBHOOK_SECRET || '';
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResult> {
    const transactionId = `CR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // For demo, generate a simple payment address
    // In production, use a proper crypto payment processor like BitPay, CoinGate, etc.
    const paymentAddress = this.walletAddress || 'TRC20-USDT-DEMO-ADDRESS';

    return {
      success: true,
      transactionId,
      amount: request.amount,
      currency: 'USDT',
      status: 'pending',
      message: `Send ${request.amount} USDT (TRC20) to: ${paymentAddress}`,
      redirectUrl: `/payment/crypto?tx=${transactionId}&amount=${request.amount}&address=${paymentAddress}`,
    };
  }

  async verifyPayment(transactionHash: string): Promise<{
    confirmed: boolean;
    amount: number;
    confirmations: number;
  }> {
    // In production, verify with blockchain API (TronScan, Etherscan, etc.)
    // For demo, return mock data
    return {
      confirmed: true,
      amount: 0,
      confirmations: 12,
    };
  }

  async getPaymentStatus(transactionId: string): Promise<{
    status: 'pending' | 'confirmed' | 'failed';
    amount: number;
    confirmations: number;
  }> {
    // Check blockchain for payment status
    return {
      status: 'pending',
      amount: 0,
      confirmations: 0,
    };
  }
}

// ==================== UNIFIED PAYMENT SERVICE ====================

export class PaymentService {
  private payfast: PayFastService;
  private ozow: OzowService;
  private crypto: CryptoPaymentService;

  constructor() {
    this.payfast = new PayFastService();
    this.ozow = new OzowService();
    this.crypto = new CryptoPaymentService();
  }

  async createDeposit(
    method: 'payfast' | 'ozow' | 'crypto',
    request: PaymentRequest
  ): Promise<PaymentResult> {
    switch (method) {
      case 'payfast':
        return this.payfast.createPayment(request);
      case 'ozow':
        return this.ozow.createPayment(request);
      case 'crypto':
        return this.crypto.createPayment(request);
      default:
        return {
          success: false,
          transactionId: '',
          amount: request.amount,
          currency: request.currency,
          status: 'failed',
          message: 'Invalid payment method',
        };
    }
  }

  async processCallback(
    method: 'payfast' | 'ozow' | 'crypto',
    data: Record<string, string>
  ): Promise<{
    valid: boolean;
    paymentId: string;
    status: 'completed' | 'failed';
    amount: number;
  }> {
    switch (method) {
      case 'payfast':
        return this.payfast.verifyCallback(data);
      case 'ozow':
        return this.ozow.verifyCallback(data);
      default:
        return { valid: false, paymentId: '', status: 'failed', amount: 0 };
    }
  }

  getAvailableMethods(): Array<{
    id: string;
    name: string;
    currencies: string[];
    minAmount: number;
    maxAmount: number;
    fee: number;
    processingTime: string;
  }> {
    return [
      {
        id: 'payfast',
        name: 'PayFast',
        currencies: ['ZAR'],
        minAmount: 10,
        maxAmount: 500000,
        fee: 0,
        processingTime: 'Instant',
      },
      {
        id: 'ozow',
        name: 'Ozow (Instant EFT)',
        currencies: ['ZAR'],
        minAmount: 50,
        maxAmount: 500000,
        fee: 0,
        processingTime: 'Instant',
      },
      {
        id: 'crypto',
        name: 'USDT (TRC20)',
        currencies: ['USDT'],
        minAmount: 10,
        maxAmount: 1000000,
        fee: 1,
        processingTime: '1-12 confirmations',
      },
    ];
  }
}

// Export singleton
export const paymentService = new PaymentService();
