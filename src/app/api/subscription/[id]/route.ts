import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  getSubscriptionDetails, 
  extendSubscription,
  getCopyBetSettings,
  setCopyBetSettings,
  SUBSCRIPTION_TIERS,
} from '@/lib/subscription-service';
import { db } from '@/lib/db';
import { addDays, differenceInDays } from 'date-fns';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/subscription/[id] - Get subscription details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const subscription = await getSubscriptionDetails(id, session.user.id);

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Calculate detailed stats
    const now = new Date();
    const endDate = new Date(subscription.endDate);
    const startDate = new Date(subscription.startDate);
    const daysRemaining = differenceInDays(endDate, now);
    const totalDays = differenceInDays(endDate, startDate);
    const percentUsed = Math.max(0, Math.min(100, ((totalDays - daysRemaining) / totalDays) * 100));

    // Get copy betting settings if this is a tipster subscription
    let copySettings = null;
    if (subscription.tipsterId) {
      copySettings = await getCopyBetSettings(session.user.id);
    }

    // Get payment history
    const payments = await db.transaction.findMany({
      where: {
        userId: session.user.id,
        type: 'subscription',
        referenceId: subscription.id,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get tip stats for tipster subscriptions
    let tipStats = null;
    if (subscription.tipsterId) {
      const tips = await db.tip.findMany({
        where: {
          tipsterId: subscription.tipsterId,
          createdAt: { gte: subscription.startDate },
        },
      });

      const wins = tips.filter(t => t.result === 'win').length;
      const losses = tips.filter(t => t.result === 'loss').length;
      const pending = tips.filter(t => !t.result || t.result === 'pending').length;

      tipStats = {
        totalTips: tips.length,
        wins,
        losses,
        pending,
        winRate: tips.length > 0 ? (wins / (wins + losses)) * 100 : 0,
        premiumTips: tips.filter(t => t.isPremium).length,
      };
    }

    // Get tier configuration
    const tierConfig = SUBSCRIPTION_TIERS[subscription.tier] || SUBSCRIPTION_TIERS.free;

    return NextResponse.json({
      success: true,
      data: {
        subscription: {
          ...subscription,
          daysRemaining,
          percentUsed,
          isExpired: daysRemaining <= 0,
          isExpiringSoon: daysRemaining > 0 && daysRemaining <= 7,
        },
        tierConfig,
        copySettings: copySettings && copySettings.tipsterId === subscription.tipsterId 
          ? copySettings 
          : null,
        payments,
        tipStats,
        renewalOptions: subscription.tipsterId ? [
          { type: 'weekly', label: '7 days', price: subscription.amount / 4 },
          { type: 'monthly', label: '30 days', price: subscription.amount },
          { type: 'yearly', label: '365 days', price: subscription.amount * 10, discount: '17%' },
        ] : null,
      },
    });

  } catch (error) {
    console.error('Get subscription details error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get subscription details' },
      { status: 500 }
    );
  }
}

// PATCH /api/subscription/[id] - Update subscription settings
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { autoRenew, copySettings } = body;

    // Verify ownership
    const subscription = await db.subscription.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'Subscription not found' },
        { status: 404 }
      );
    }

    const updates: Record<string, unknown> = {};

    // Update auto-renew setting
    if (typeof autoRenew === 'boolean') {
      updates.autoRenew = autoRenew;
    }

    // Apply updates
    if (Object.keys(updates).length > 0) {
      await db.subscription.update({
        where: { id },
        data: updates,
      });
    }

    // Update copy betting settings if provided
    if (copySettings && subscription.tipsterId) {
      await setCopyBetSettings(session.user.id, subscription.tipsterId, copySettings);
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription updated successfully',
      data: {
        autoRenew: autoRenew ?? subscription.autoRenew,
        copySettings: copySettings || null,
      },
    });

  } catch (error) {
    console.error('Update subscription error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
}

// DELETE /api/subscription/[id] - Cancel subscription
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const immediate = searchParams.get('immediate') === 'true';

    const subscription = await db.subscription.findFirst({
      where: { id, userId: session.user.id },
      include: { tipster: true },
    });

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'Subscription not found' },
        { status: 404 }
      );
    }

    if (subscription.status === 'cancelled') {
      return NextResponse.json(
        { success: false, error: 'Subscription is already cancelled' },
        { status: 400 }
      );
    }

    if (immediate) {
      // Immediate cancellation - revoke access
      await db.subscription.update({
        where: { id },
        data: {
          status: 'cancelled',
          autoRenew: false,
          isActive: false,
          endDate: new Date(),
        },
      });

      // Update tipster followers if applicable
      if (subscription.tipsterId) {
        await db.tipster.update({
          where: { id: subscription.tipsterId },
          data: { followersCount: { decrement: 1 } },
        });

        // Disable copy betting
        await db.copyBetSetting.updateMany({
          where: { 
            userId: session.user.id,
            tipsterId: subscription.tipsterId,
          },
          data: { isActive: false },
        });
      }
    } else {
      // Soft cancellation - disable auto-renew but keep access until end date
      await db.subscription.update({
        where: { id },
        data: { autoRenew: false },
      });
    }

    return NextResponse.json({
      success: true,
      message: immediate 
        ? 'Subscription cancelled immediately. Access has been revoked.' 
        : 'Auto-renew disabled. You will have access until the end of your billing period.',
      data: {
        cancelledAt: new Date(),
        accessUntil: immediate ? new Date() : subscription.endDate,
      },
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
