import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { unsubscribeFromTipster } from '@/lib/subscription-service';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ tipsterId: string }>;
}

// POST /api/unsubscribe/[tipsterId] - Unsubscribe from a tipster
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { tipsterId } = await params;
    const body = await request.json().catch(() => ({}));
    const { reason, feedback } = body;

    // Get tipster info before unsubscribing
    const tipster = await db.tipster.findUnique({
      where: { id: tipsterId },
    });

    if (!tipster) {
      return NextResponse.json(
        { success: false, error: 'Tipster not found' },
        { status: 404 }
      );
    }

    // Get current subscription
    const subscription = await db.subscription.findFirst({
      where: {
        userId: session.user.id,
        tipsterId,
        status: 'active',
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Unsubscribe
    await unsubscribeFromTipster(session.user.id, tipsterId);

    // Store feedback if provided
    if (reason || feedback) {
      await db.notification.create({
        data: {
          userId: tipster.userId,
          type: 'subscription_feedback',
          title: 'Subscription Cancelled',
          message: `User cancelled subscription. Reason: ${reason || 'Not provided'}. Feedback: ${feedback || 'None'}`,
        },
      });
    }

    // Create transaction record for the cancellation
    await db.transaction.create({
      data: {
        userId: session.user.id,
        type: 'subscription',
        amount: 0,
        status: 'completed',
        description: `Cancelled subscription to ${tipster.displayName}`,
        referenceId: subscription.id,
        paymentMethod: subscription.paymentMethod,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully unsubscribed from ${tipster.displayName}`,
      data: {
        subscriptionId: subscription.id,
        cancelledAt: new Date(),
        accessUntil: subscription.endDate, // User still has access until end date
      },
    });

  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to unsubscribe' 
      },
      { status: 500 }
    );
  }
}

// GET /api/unsubscribe/[tipsterId] - Get subscription details for cancellation preview
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { tipsterId } = await params;

    const subscription = await db.subscription.findFirst({
      where: {
        userId: session.user.id,
        tipsterId,
        status: 'active',
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

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Calculate remaining time
    const now = new Date();
    const endDate = new Date(subscription.endDate);
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Check for copy betting settings
    const copySettings = await db.copyBetSetting.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json({
      success: true,
      data: {
        subscription: {
          id: subscription.id,
          type: subscription.type,
          tier: subscription.tier,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          amount: subscription.amount,
          currency: subscription.currency,
          autoRenew: subscription.autoRenew,
          daysRemaining,
        },
        tipster: subscription.tipster,
        copyBettingActive: copySettings?.isActive && copySettings?.tipsterId === tipsterId,
        cancellationReasons: [
          { value: 'performance', label: 'Not meeting expectations' },
          { value: 'price', label: 'Too expensive' },
          { value: 'frequency', label: 'Not enough tips' },
          { value: 'quality', label: 'Poor quality tips' },
          { value: 'other', label: 'Other reason' },
        ],
      },
    });

  } catch (error) {
    console.error('Get subscription for cancellation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get subscription details' },
      { status: 500 }
    );
  }
}
