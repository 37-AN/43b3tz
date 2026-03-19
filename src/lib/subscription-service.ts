// Subscription Service - Core business logic for subscription management

import { db } from './db';
import { Subscription, SubscriptionTier, SubscriptionPlan, CopyBetSetting } from '@/types';
import { addDays, isAfter, isBefore, differenceInDays } from 'date-fns';

// Subscription tier configurations
export const SUBSCRIPTION_TIERS: Record<string, SubscriptionTier> = {
  free: {
    id: 'free',
    name: 'free',
    displayName: 'Free',
    price: 0,
    currency: 'ZAR',
    duration: 0,
    features: [
      'Basic match predictions',
      'Limited AI insights',
      'Community access',
      '1 tipster follow',
    ],
    contentAccess: 'basic',
    maxTipsterSubscriptions: 1,
    maxDailyBets: 10,
    supportLevel: 'basic',
    analyticsAccess: false,
    copyBettingEnabled: false,
    aiPredictionsEnabled: false,
    premiumTipsEnabled: false,
  },
  pro: {
    id: 'pro',
    name: 'pro',
    displayName: 'Pro',
    price: 199,
    currency: 'ZAR',
    duration: 30,
    features: [
      'All Free features',
      'Advanced AI predictions',
      'Value bet alerts',
      '5 tipster subscriptions',
      'Copy betting (basic)',
      'Priority support',
      'Analytics dashboard',
    ],
    contentAccess: 'pro',
    maxTipsterSubscriptions: 5,
    maxDailyBets: 50,
    supportLevel: 'priority',
    analyticsAccess: true,
    copyBettingEnabled: true,
    aiPredictionsEnabled: true,
    premiumTipsEnabled: false,
  },
  premium: {
    id: 'premium',
    name: 'premium',
    displayName: 'Premium',
    price: 499,
    currency: 'ZAR',
    duration: 30,
    features: [
      'All Pro features',
      'Premium tipster tips',
      'Unlimited tipster subscriptions',
      'Advanced copy betting',
      'VIP support',
      'Exclusive insights',
      'Early access to features',
    ],
    contentAccess: 'full',
    maxTipsterSubscriptions: -1, // Unlimited
    maxDailyBets: -1, // Unlimited
    supportLevel: 'vip',
    analyticsAccess: true,
    copyBettingEnabled: true,
    aiPredictionsEnabled: true,
    premiumTipsEnabled: true,
  },
};

// Subscription plans for purchase
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'pro-weekly',
    name: 'Pro Weekly',
    tier: 'pro',
    type: 'weekly',
    price: 59,
    currency: 'ZAR',
    features: SUBSCRIPTION_TIERS.pro.features,
  },
  {
    id: 'pro-monthly',
    name: 'Pro Monthly',
    tier: 'pro',
    type: 'monthly',
    price: 199,
    currency: 'ZAR',
    features: SUBSCRIPTION_TIERS.pro.features,
    highlighted: true,
  },
  {
    id: 'pro-yearly',
    name: 'Pro Yearly',
    tier: 'pro',
    type: 'yearly',
    price: 1599,
    currency: 'ZAR',
    features: SUBSCRIPTION_TIERS.pro.features,
    discount: 33,
    originalPrice: 2388,
  },
  {
    id: 'premium-weekly',
    name: 'Premium Weekly',
    tier: 'premium',
    type: 'weekly',
    price: 149,
    currency: 'ZAR',
    features: SUBSCRIPTION_TIERS.premium.features,
  },
  {
    id: 'premium-monthly',
    name: 'Premium Monthly',
    tier: 'premium',
    type: 'monthly',
    price: 499,
    currency: 'ZAR',
    features: SUBSCRIPTION_TIERS.premium.features,
    highlighted: true,
  },
  {
    id: 'premium-yearly',
    name: 'Premium Yearly',
    tier: 'premium',
    type: 'yearly',
    price: 3999,
    currency: 'ZAR',
    features: SUBSCRIPTION_TIERS.premium.features,
    discount: 33,
    originalPrice: 5988,
  },
];

// Get subscription duration in days
export function getSubscriptionDuration(type: string): number {
  const durations: Record<string, number> = {
    weekly: 7,
    monthly: 30,
    yearly: 365,
    lifetime: 36500, // 100 years
  };
  return durations[type] || 30;
}

// Create a new subscription
export async function createSubscription(data: {
  userId: string;
  tipsterId?: string;
  type: string;
  tier: string;
  paymentMethod?: string;
  externalRef?: string;
  discountCode?: string;
}): Promise<Subscription> {
  const duration = getSubscriptionDuration(data.type);
  const tierConfig = SUBSCRIPTION_TIERS[data.tier];
  
  let price = tierConfig.price;
  let discountPercent = 0;
  
  // Apply discount if provided
  if (data.discountCode) {
    const discount = await validateDiscountCode(data.discountCode);
    if (discount.valid) {
      discountPercent = discount.percent;
      price = price * (1 - discount.percent / 100);
    }
  }
  
  const startDate = new Date();
  const endDate = addDays(startDate, duration);
  
  const subscription = await db.subscription.create({
    data: {
      userId: data.userId,
      tipsterId: data.tipsterId,
      type: data.type,
      tier: data.tier,
      status: 'active',
      startDate,
      endDate,
      price,
      amount: price,
      currency: 'ZAR',
      paymentMethod: data.paymentMethod,
      externalRef: data.externalRef,
      autoRenew: true,
      contentAccess: tierConfig.contentAccess,
      features: JSON.stringify(tierConfig.features),
      discountCode: data.discountCode,
      discountPercent,
    },
    include: {
      tipster: true,
    },
  });
  
  return subscription as unknown as Subscription;
}

// Subscribe to a tipster
export async function subscribeToTipster(data: {
  userId: string;
  tipsterId: string;
  type: 'weekly' | 'monthly' | 'yearly';
  paymentMethod?: string;
  externalRef?: string;
}): Promise<Subscription> {
  // Check if user already has an active subscription to this tipster
  const existing = await db.subscription.findFirst({
    where: {
      userId: data.userId,
      tipsterId: data.tipsterId,
      status: 'active',
      endDate: { gte: new Date() },
    },
  });
  
  if (existing) {
    throw new Error('You already have an active subscription to this tipster');
  }
  
  // Get tipster pricing
  const tipster = await db.tipster.findUnique({
    where: { id: data.tipsterId },
  });
  
  if (!tipster) {
    throw new Error('Tipster not found');
  }
  
  // Calculate price based on subscription type
  let price = tipster.monthlyPrice;
  if (data.type === 'weekly') {
    price = tipster.weeklyPrice;
  } else if (data.type === 'yearly') {
    price = tipster.monthlyPrice * 10; // ~17% discount
  }
  
  const duration = getSubscriptionDuration(data.type);
  const startDate = new Date();
  const endDate = addDays(startDate, duration);
  
  const subscription = await db.subscription.create({
    data: {
      userId: data.userId,
      tipsterId: data.tipsterId,
      type: data.type,
      tier: 'pro', // Tipster subscriptions are pro tier
      status: 'active',
      startDate,
      endDate,
      price,
      amount: price,
      currency: 'ZAR',
      paymentMethod: data.paymentMethod,
      externalRef: data.externalRef,
      autoRenew: true,
      contentAccess: 'pro',
    },
    include: {
      tipster: true,
    },
  });
  
  // Update tipster followers count
  await db.tipster.update({
    where: { id: data.tipsterId },
    data: { followersCount: { increment: 1 } },
  });
  
  return subscription as unknown as Subscription;
}

// Unsubscribe from a tipster
export async function unsubscribeFromTipster(userId: string, tipsterId: string): Promise<void> {
  const subscription = await db.subscription.findFirst({
    where: {
      userId,
      tipsterId,
      status: 'active',
    },
  });
  
  if (!subscription) {
    throw new Error('No active subscription found');
  }
  
  await db.subscription.update({
    where: { id: subscription.id },
    data: {
      status: 'cancelled',
      autoRenew: false,
    },
  });
  
  // Update tipster followers count
  await db.tipster.update({
    where: { id: tipsterId },
    data: { followersCount: { decrement: 1 } },
  });
  
  // Disable any copy betting settings
  await db.copyBetSetting.updateMany({
    where: { userId, tipsterId },
    data: { isActive: false },
  });
}

// Get user's active subscriptions
export async function getUserSubscriptions(userId: string): Promise<Subscription[]> {
  const subscriptions = await db.subscription.findMany({
    where: {
      userId,
      status: { in: ['active', 'pending_payment'] },
    },
    include: {
      tipster: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              avatar: true,
            },
          },
        },
      },
    },
    orderBy: { endDate: 'asc' },
  });
  
  return subscriptions as unknown as Subscription[];
}

// Get subscription details
export async function getSubscriptionDetails(subscriptionId: string, userId: string): Promise<Subscription | null> {
  const subscription = await db.subscription.findFirst({
    where: {
      id: subscriptionId,
      userId,
    },
    include: {
      tipster: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              avatar: true,
            },
          },
        },
      },
    },
  });
  
  return subscription as unknown as Subscription | null;
}

// Check if subscription is active
export function isSubscriptionActive(subscription: Subscription): boolean {
  if (subscription.status !== 'active') return false;
  return isAfter(subscription.endDate, new Date());
}

// Get days until subscription expires
export function getDaysUntilExpiry(subscription: Subscription): number {
  return differenceInDays(subscription.endDate, new Date());
}

// Check if user has access to content
export async function checkContentAccess(
  userId: string,
  requiredAccess: 'basic' | 'pro' | 'premium' | 'full'
): Promise<{ hasAccess: boolean; tier: string }> {
  const subscription = await db.subscription.findFirst({
    where: {
      userId,
      status: 'active',
      endDate: { gte: new Date() },
    },
    orderBy: { tier: 'desc' },
  });
  
  const accessLevels = ['basic', 'pro', 'premium', 'full'];
  const userAccess = subscription?.contentAccess || 'basic';
  const userLevel = accessLevels.indexOf(userAccess);
  const requiredLevel = accessLevels.indexOf(requiredAccess);
  
  return {
    hasAccess: userLevel >= requiredLevel,
    tier: subscription?.tier || 'free',
  };
}

// Check if user can subscribe to more tipsters
export async function canSubscribeToMoreTipsters(userId: string): Promise<{ canSubscribe: boolean; remaining: number }> {
  const userTier = await getUserTier(userId);
  const tierConfig = SUBSCRIPTION_TIERS[userTier];
  
  const activeSubscriptions = await db.subscription.count({
    where: {
      userId,
      tipsterId: { not: null },
      status: 'active',
      endDate: { gte: new Date() },
    },
  });
  
  const maxAllowed = tierConfig.maxTipsterSubscriptions;
  const remaining = maxAllowed === -1 ? Infinity : maxAllowed - activeSubscriptions;
  
  return {
    canSubscribe: maxAllowed === -1 || remaining > 0,
    remaining: maxAllowed === -1 ? -1 : Math.max(0, remaining),
  };
}

// Get user's current tier
export async function getUserTier(userId: string): Promise<string> {
  const subscription = await db.subscription.findFirst({
    where: {
      userId,
      status: 'active',
      endDate: { gte: new Date() },
      tipsterId: null, // Platform subscription, not tipster subscription
    },
    orderBy: { tier: 'desc' },
  });
  
  return subscription?.tier || 'free';
}

// Validate discount code
export async function validateDiscountCode(code: string): Promise<{ valid: boolean; percent: number; message: string }> {
  // In a real app, this would check a discount codes table
  const validCodes: Record<string, number> = {
    'WELCOME20': 20,
    'PRO50': 50,
    'VIP30': 30,
    'EARLY25': 25,
  };
  
  const percent = validCodes[code.toUpperCase()];
  
  if (percent) {
    return { valid: true, percent, message: `${percent}% discount applied!` };
  }
  
  return { valid: false, percent: 0, message: 'Invalid discount code' };
}

// Extend subscription
export async function extendSubscription(subscriptionId: string, days: number): Promise<Subscription> {
  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
  });
  
  if (!subscription) {
    throw new Error('Subscription not found');
  }
  
  const newEndDate = addDays(subscription.endDate, days);
  
  const updated = await db.subscription.update({
    where: { id: subscriptionId },
    data: {
      endDate: newEndDate,
      status: 'active',
    },
  });
  
  return updated as unknown as Subscription;
}

// Process expired subscriptions (should be run as a cron job)
export async function processExpiredSubscriptions(): Promise<number> {
  const expired = await db.subscription.updateMany({
    where: {
      status: 'active',
      endDate: { lt: new Date() },
    },
    data: {
      status: 'expired',
      isActive: false,
    },
  });
  
  return expired.count;
}

// ============ COPY BETTING FUNCTIONS ============

// Create or update copy betting settings
export async function setCopyBetSettings(
  userId: string,
  tipsterId: string,
  settings: Partial<CopyBetSetting>
): Promise<CopyBetSetting> {
  // Check if user has access to copy betting
  const userTier = await getUserTier(userId);
  const tierConfig = SUBSCRIPTION_TIERS[userTier];
  
  if (!tierConfig.copyBettingEnabled) {
    throw new Error('Copy betting requires a Pro or Premium subscription');
  }
  
  // Check if user is subscribed to this tipster
  const subscription = await db.subscription.findFirst({
    where: {
      userId,
      tipsterId,
      status: 'active',
      endDate: { gte: new Date() },
    },
  });
  
  if (!subscription) {
    throw new Error('You must be subscribed to this tipster to enable copy betting');
  }
  
  const existing = await db.copyBetSetting.findUnique({
    where: { userId },
  });
  
  if (existing) {
    const updated = await db.copyBetSetting.update({
      where: { userId },
      data: {
        tipsterId,
        ...settings,
        updatedAt: new Date(),
      },
    });
    return updated as unknown as CopyBetSetting;
  }
  
  const created = await db.copyBetSetting.create({
    data: {
      userId,
      tipsterId,
      stakeMultiplier: settings.stakeMultiplier || 1,
      maxStake: settings.maxStake || 100,
      minStake: settings.minStake || 10,
      fixedStake: settings.fixedStake,
      maxDailySpend: settings.maxDailySpend || 500,
      maxOdds: settings.maxOdds || 10,
      minOdds: settings.minOdds || 1.2,
      stopLoss: settings.stopLoss,
      allowedBetTypes: settings.allowedBetTypes ? JSON.stringify(settings.allowedBetTypes) : null,
      allowedLeagues: settings.allowedLeagues ? JSON.stringify(settings.allowedLeagues) : null,
      activeHours: settings.activeHours ? JSON.stringify(settings.activeHours) : null,
      isActive: settings.isActive ?? true,
    },
  });
  
  return created as unknown as CopyBetSetting;
}

// Get copy betting settings
export async function getCopyBetSettings(userId: string): Promise<CopyBetSetting | null> {
  const settings = await db.copyBetSetting.findUnique({
    where: { userId },
  });
  
  if (!settings) return null;
  
  return {
    ...settings,
    allowedBetTypes: settings.allowedBetTypes ? JSON.parse(settings.allowedBetTypes) : undefined,
    allowedLeagues: settings.allowedLeagues ? JSON.parse(settings.allowedLeagues) : undefined,
    activeHours: settings.activeHours ? JSON.parse(settings.activeHours) : undefined,
  } as unknown as CopyBetSetting;
}

// Check if a bet should be copied based on settings
export function shouldCopyBet(
  settings: CopyBetSetting,
  bet: { odds: number; betType: string; stake: number }
): boolean {
  if (!settings.isActive) return false;
  
  // Check odds range
  if (bet.odds < settings.minOdds || bet.odds > settings.maxOdds) return false;
  
  // Check bet types
  if (settings.allowedBetTypes?.length && !settings.allowedBetTypes.includes(bet.betType)) {
    return false;
  }
  
  // Check active hours if set
  if (settings.activeHours) {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    if (currentTime < settings.activeHours.start || currentTime > settings.activeHours.end) {
      return false;
    }
  }
  
  return true;
}

// Calculate copied stake
export function calculateCopiedStake(settings: CopyBetSetting, originalStake: number): number {
  let stake: number;
  
  if (settings.fixedStake) {
    stake = settings.fixedStake;
  } else {
    stake = originalStake * settings.stakeMultiplier;
  }
  
  // Clamp to min/max
  return Math.max(settings.minStake, Math.min(settings.maxStake, stake));
}
