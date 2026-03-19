// 43V3R BET AI - Subscription API
// Handles premium subscriptions and content access

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorNextResponse, ErrorCode } from '@/lib/api-response';

// Subscription tiers
const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    features: ['3 value bets/day', 'Basic predictions', 'Limited tipster access'],
    valueBetsPerDay: 3,
    predictionsAccess: 'basic',
  },
  pro: {
    name: 'Pro',
    price: 99, // R99/month
    features: ['Unlimited value bets', 'AI predictions', 'Tipster access', 'Fantasy tools'],
    valueBetsPerDay: -1, // unlimited
    predictionsAccess: 'full',
  },
  premium: {
    name: 'Premium',
    price: 299, // R299/month
    features: ['Everything in Pro', 'Copy betting', 'Premium tipsters', 'Priority support', 'Telegram alerts'],
    valueBetsPerDay: -1,
    predictionsAccess: 'premium',
  },
};

/**
 * GET /api/subscriptions
 * Get subscription tiers or user's current subscription
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // If userId provided, return user's subscription
    if (userId) {
      const subscription = await db.subscription.findFirst({
        where: {
          userId,
          status: 'active',
          endDate: { gte: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      const user = await db.user.findUnique({
        where: { id: userId },
        include: { wallet: true },
      });

      return NextResponse.json({
        success: true,
        data: {
          subscription,
          tier: subscription?.tier || 'free',
          user,
          tierDetails: SUBSCRIPTION_TIERS[subscription?.tier as keyof typeof SUBSCRIPTION_TIERS] || SUBSCRIPTION_TIERS.free,
        },
      });
    }

    // Return all subscription tiers
    return NextResponse.json({
      success: true,
      data: {
        tiers: SUBSCRIPTION_TIERS,
      },
    });

  } catch (error) {
    console.error('Subscription API error:', error);
    return errorNextResponse('Failed to fetch subscription data', ErrorCode.INTERNAL_ERROR);
  }
}

/**
 * POST /api/subscriptions
 * Create a new subscription (after payment)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, tier, paymentId, amount, paymentMethod } = body;

    if (!userId || !tier) {
      return errorNextResponse('userId and tier are required', ErrorCode.VALIDATION_ERROR);
    }

    const tierConfig = SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS];
    if (!tierConfig) {
      return errorNextResponse('Invalid subscription tier', ErrorCode.VALIDATION_ERROR);
    }

    // Calculate subscription dates
    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1);

    // Create subscription
    const subscription = await db.subscription.create({
      data: {
        userId,
        type: 'monthly',
        tier,
        status: 'active',
        startDate: now,
        endDate,
        amount: amount || tierConfig.price,
        currency: 'ZAR',
        paymentMethod: paymentMethod || 'internal',
        paymentId,
        isActive: true,
        contentAccess: tierConfig.predictionsAccess,
        features: JSON.stringify(tierConfig.features),
      },
    });

    // Update user role if premium
    if (tier === 'premium') {
      await db.user.update({
        where: { id: userId },
        data: { role: 'premium' },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        subscription,
        tierDetails: tierConfig,
        message: `Successfully subscribed to ${tierConfig.name}!`,
      },
    });

  } catch (error) {
    console.error('Create subscription error:', error);
    return errorNextResponse('Failed to create subscription', ErrorCode.INTERNAL_ERROR);
  }
}

/**
 * PATCH /api/subscriptions
 * Update subscription (upgrade/downgrade/cancel)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscriptionId, action, newTier } = body;

    if (!subscriptionId || !action) {
      return errorNextResponse('subscriptionId and action are required', ErrorCode.VALIDATION_ERROR);
    }

    const subscription = await db.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      return errorNextResponse('Subscription not found', ErrorCode.NOT_FOUND);
    }

    let updateData: any = {};

    switch (action) {
      case 'cancel':
        updateData = {
          status: 'cancelled',
          autoRenew: false,
          isActive: false,
        };
        break;
      case 'upgrade':
      case 'downgrade':
        if (!newTier) {
          return errorNextResponse('newTier is required for upgrade/downgrade', ErrorCode.VALIDATION_ERROR);
        }
        const newTierConfig = SUBSCRIPTION_TIERS[newTier as keyof typeof SUBSCRIPTION_TIERS];
        updateData = {
          tier: newTier,
          amount: newTierConfig.price,
          contentAccess: newTierConfig.predictionsAccess,
          features: JSON.stringify(newTierConfig.features),
        };
        break;
      case 'renew':
        const newEndDate = new Date(subscription.endDate);
        newEndDate.setMonth(newEndDate.getMonth() + 1);
        updateData = {
          endDate: newEndDate,
          status: 'active',
          isActive: true,
        };
        break;
      default:
        return errorNextResponse('Invalid action', ErrorCode.VALIDATION_ERROR);
    }

    const updated = await db.subscription.update({
      where: { id: subscriptionId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        subscription: updated,
        message: `Subscription ${action} successful`,
      },
    });

  } catch (error) {
    console.error('Update subscription error:', error);
    return errorNextResponse('Failed to update subscription', ErrorCode.INTERNAL_ERROR);
  }
}
