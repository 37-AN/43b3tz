// Content Gating Middleware - Protect premium content based on subscription tier

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// Access levels hierarchy
const ACCESS_LEVELS = {
  basic: 0,
  pro: 1,
  premium: 2,
  full: 3,
} as const;

// Content types and their required access levels
export const CONTENT_REQUIREMENTS = {
  // Basic content (free users)
  basic_predictions: 'basic',
  community_access: 'basic',
  free_tips: 'basic',
  
  // Pro content
  ai_predictions: 'pro',
  value_bets: 'pro',
  analytics_dashboard: 'pro',
  copy_betting_basic: 'pro',
  tipster_tips: 'pro',
  
  // Premium content
  premium_tips: 'premium',
  exclusive_insights: 'premium',
  copy_betting_advanced: 'premium',
  vip_support: 'premium',
  early_features: 'premium',
  
  // Full access
  admin_features: 'full',
  all_tipsters: 'full',
} as const;

export type ContentType = keyof typeof CONTENT_REQUIREMENTS;

// Check if user has access to specific content
export async function checkContentAccess(
  userId: string | undefined,
  contentType: ContentType
): Promise<{
  hasAccess: boolean;
  userTier: string;
  userAccessLevel: string;
  requiredLevel: string;
  message?: string;
}> {
  // Get required access level
  const requiredLevel = CONTENT_REQUIREMENTS[contentType] || 'basic';
  const requiredNumeric = ACCESS_LEVELS[requiredLevel as keyof typeof ACCESS_LEVELS] || 0;

  // Default to free tier
  if (!userId) {
    return {
      hasAccess: requiredNumeric === 0,
      userTier: 'free',
      userAccessLevel: 'basic',
      requiredLevel,
      message: requiredNumeric > 0 ? 'Authentication required' : undefined,
    };
  }

  // Get user's active subscriptions
  const subscriptions = await db.subscription.findMany({
    where: {
      userId,
      status: 'active',
      endDate: { gte: new Date() },
    },
    select: {
      tier: true,
      contentAccess: true,
      tipsterId: true,
    },
  });

  // Find highest access level
  let highestAccess = 'basic';
  let highestTier = 'free';

  for (const sub of subscriptions) {
    const subAccess = sub.contentAccess || 'basic';
    const currentNumeric = ACCESS_LEVELS[subAccess as keyof typeof ACCESS_LEVELS] || 0;
    const highestNumeric = ACCESS_LEVELS[highestAccess as keyof typeof ACCESS_LEVELS] || 0;

    if (currentNumeric > highestNumeric) {
      highestAccess = subAccess;
      highestTier = sub.tier;
    }
  }

  const userNumeric = ACCESS_LEVELS[highestAccess as keyof typeof ACCESS_LEVELS] || 0;
  const hasAccess = userNumeric >= requiredNumeric;

  return {
    hasAccess,
    userTier: highestTier,
    userAccessLevel: highestAccess,
    requiredLevel,
    message: !hasAccess 
      ? `This content requires ${requiredLevel} subscription. Your current tier: ${highestTier}` 
      : undefined,
  };
}

// Check if user can access tipster's premium content
export async function checkTipsterContentAccess(
  userId: string | undefined,
  tipsterId: string,
  isPremiumContent: boolean
): Promise<{
  hasAccess: boolean;
  isSubscribed: boolean;
  message?: string;
}> {
  // Free content is always accessible
  if (!isPremiumContent) {
    return { hasAccess: true, isSubscribed: false };
  }

  // Premium content requires authentication
  if (!userId) {
    return {
      hasAccess: false,
      isSubscribed: false,
      message: 'Authentication required to view premium content',
    };
  }

  // Check if user has active subscription to this tipster
  const subscription = await db.subscription.findFirst({
    where: {
      userId,
      tipsterId,
      status: 'active',
      endDate: { gte: new Date() },
    },
  });

  // Also check if user has premium platform subscription
  const premiumSub = await db.subscription.findFirst({
    where: {
      userId,
      tipsterId: null,
      tier: 'premium',
      status: 'active',
      endDate: { gte: new Date() },
    },
  });

  const hasAccess = !!(subscription || premiumSub);

  return {
    hasAccess,
    isSubscribed: !!subscription,
    message: !hasAccess 
      ? 'Subscribe to this tipster or upgrade to Premium to view this content' 
      : undefined,
  };
}

// Middleware wrapper for API routes
export function withContentProtection(
  contentType: ContentType,
  handler: (req: NextRequest, context: unknown) => Promise<NextResponse>
) {
  return async (req: NextRequest, context: unknown) => {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    const accessCheck = await checkContentAccess(userId, contentType);

    if (!accessCheck.hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied',
          message: accessCheck.message,
          required: {
            tier: accessCheck.requiredLevel,
            currentTier: accessCheck.userTier,
          },
        },
        { status: 403 }
      );
    }

    return handler(req, context);
  };
}

// React hook for client-side content protection
export function createContentGate(userTier: string, userAccessLevel: string) {
  return {
    canAccess: (contentType: ContentType): boolean => {
      const required = CONTENT_REQUIREMENTS[contentType] || 'basic';
      const requiredNumeric = ACCESS_LEVELS[required as keyof typeof ACCESS_LEVELS] || 0;
      const userNumeric = ACCESS_LEVELS[userAccessLevel as keyof typeof ACCESS_LEVELS] || 0;
      return userNumeric >= requiredNumeric;
    },
    getUpgradeMessage: (contentType: ContentType): string | null => {
      const required = CONTENT_REQUIREMENTS[contentType] || 'basic';
      const requiredNumeric = ACCESS_LEVELS[required as keyof typeof ACCESS_LEVELS] || 0;
      const userNumeric = ACCESS_LEVELS[userAccessLevel as keyof typeof ACCESS_LEVELS] || 0;
      
      if (userNumeric >= requiredNumeric) return null;
      
      return `Upgrade to ${required} tier to access this content`;
    },
  };
}

// Check daily betting limits
export async function checkDailyBettingLimit(
  userId: string
): Promise<{
  canBet: boolean;
  usedToday: number;
  remaining: number;
  maxDaily: number;
}> {
  // Get user's tier config
  const subscription = await db.subscription.findFirst({
    where: {
      userId,
      status: 'active',
      endDate: { gte: new Date() },
      tipsterId: null,
    },
  });

  const tier = subscription?.tier || 'free';
  const tierLimits = {
    free: 10,
    pro: 50,
    premium: -1, // Unlimited
  };

  const maxDaily = tierLimits[tier as keyof typeof tierLimits] || 10;

  // Get today's bets count
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const usedToday = await db.bet.count({
    where: {
      userId,
      createdAt: { gte: today },
    },
  });

  const remaining = maxDaily === -1 ? -1 : Math.max(0, maxDaily - usedToday);
  const canBet = maxDaily === -1 || usedToday < maxDaily;

  return {
    canBet,
    usedToday,
    remaining,
    maxDaily,
  };
}

// Check feature access
export async function checkFeatureAccess(
  userId: string | undefined,
  feature: 'copy_betting' | 'ai_predictions' | 'premium_tips' | 'analytics' | 'vip_support'
): Promise<boolean> {
  if (!userId) return false;

  const subscription = await db.subscription.findFirst({
    where: {
      userId,
      status: 'active',
      endDate: { gte: new Date() },
      tipsterId: null,
    },
  });

  const tier = subscription?.tier || 'free';

  const featureAccess = {
    free: ['basic'],
    pro: ['copy_betting', 'ai_predictions', 'analytics'],
    premium: ['copy_betting', 'ai_predictions', 'analytics', 'premium_tips', 'vip_support'],
  };

  return featureAccess[tier as keyof typeof featureAccess]?.includes(feature) || false;
}

// Validate premium tip access
export async function validatePremiumTipAccess(
  userId: string | undefined,
  tipId: string
): Promise<{
  canView: boolean;
  canViewFull: boolean;
  reason?: string;
}> {
  // Get tip details
  const tip = await db.tip.findUnique({
    where: { id: tipId },
    include: { tipster: true },
  });

  if (!tip) {
    return { canView: false, canViewFull: false, reason: 'Tip not found' };
  }

  // Free tips are always viewable
  if (tip.isFree) {
    return { canView: true, canViewFull: true };
  }

  // Non-premium tips require subscription to tipster
  if (!tip.isPremium) {
    return { canView: true, canViewFull: true };
  }

  // Premium tips require subscription or premium tier
  if (!userId) {
    return { 
      canView: true, 
      canViewFull: false, 
      reason: 'Sign in to view premium tips' 
    };
  }

  // Check tipster subscription
  const tipsterSub = await db.subscription.findFirst({
    where: {
      userId,
      tipsterId: tip.tipsterId,
      status: 'active',
      endDate: { gte: new Date() },
    },
  });

  if (tipsterSub) {
    return { canView: true, canViewFull: true };
  }

  // Check premium platform subscription
  const premiumSub = await db.subscription.findFirst({
    where: {
      userId,
      tipsterId: null,
      tier: 'premium',
      status: 'active',
      endDate: { gte: new Date() },
    },
  });

  if (premiumSub) {
    return { canView: true, canViewFull: true };
  }

  // User can see partial content (preview)
  return { 
    canView: true, 
    canViewFull: false, 
    reason: 'Subscribe to view full tip' 
  };
}
