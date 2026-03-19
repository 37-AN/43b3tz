import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  subscribeToTipster, 
  canSubscribeToMoreTipsters,
  setCopyBetSettings,
} from '@/lib/subscription-service';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ tipsterId: string }>;
}

// POST /api/subscribe/[tipsterId] - Subscribe to a tipster
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
    
    const { 
      type = 'monthly', 
      paymentMethod,
      externalRef,
      copySettings 
    } = body;

    // Validate subscription type
    const validTypes = ['weekly', 'monthly', 'yearly'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid subscription type' },
        { status: 400 }
      );
    }

    // Check if tipster exists
    const tipster = await db.tipster.findUnique({
      where: { id: tipsterId },
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
    });

    if (!tipster) {
      return NextResponse.json(
        { success: false, error: 'Tipster not found' },
        { status: 404 }
      );
    }

    // Check if user can subscribe to more tipsters
    const { canSubscribe, remaining } = await canSubscribeToMoreTipsters(session.user.id);
    
    if (!canSubscribe) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Subscription limit reached. Please upgrade your plan.',
          remaining: 0 
        },
        { status: 403 }
      );
    }

    // Create subscription
    const subscription = await subscribeToTipster({
      userId: session.user.id,
      tipsterId,
      type,
      paymentMethod,
      externalRef,
    });

    // Set up copy betting settings if provided
    if (copySettings) {
      try {
        await setCopyBetSettings(session.user.id, tipsterId, copySettings);
      } catch (error) {
        console.error('Failed to set copy betting settings:', error);
        // Don't fail the subscription if copy settings fail
      }
    }

    // Create notification for tipster
    await db.notification.create({
      data: {
        userId: tipster.userId,
        type: 'new_subscriber',
        title: 'New Subscriber!',
        message: `${session.user.name || session.user.email} just subscribed to your tips!`,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        subscription,
        tipster: {
          id: tipster.id,
          displayName: tipster.displayName,
          avatar: tipster.avatar,
          user: tipster.user,
        },
        remainingSlots: remaining - 1,
      },
      message: `Successfully subscribed to ${tipster.displayName}`,
    });

  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to subscribe' 
      },
      { status: 500 }
    );
  }
}

// GET /api/subscribe/[tipsterId] - Get subscription preview/pricing
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tipsterId } = await params;

    const tipster = await db.tipster.findUnique({
      where: { id: tipsterId },
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
    });

    if (!tipster) {
      return NextResponse.json(
        { success: false, error: 'Tipster not found' },
        { status: 404 }
      );
    }

    // Calculate prices with yearly discount
    const pricing = {
      weekly: {
        price: tipster.weeklyPrice,
        duration: '7 days',
        savings: 0,
      },
      monthly: {
        price: tipster.monthlyPrice,
        duration: '30 days',
        savings: 0,
      },
      yearly: {
        price: tipster.monthlyPrice * 10,
        originalPrice: tipster.monthlyPrice * 12,
        duration: '365 days',
        savings: tipster.monthlyPrice * 2,
        discount: '17%',
      },
    };

    // Check if user already subscribed
    const session = await getServerSession(authOptions);
    let isSubscribed = false;
    let currentSubscription = null;

    if (session?.user?.id) {
      const existing = await db.subscription.findFirst({
        where: {
          userId: session.user.id,
          tipsterId,
          status: 'active',
          endDate: { gte: new Date() },
        },
      });

      if (existing) {
        isSubscribed = true;
        currentSubscription = existing;
      }

      // Check subscription limits
      const { canSubscribe, remaining } = await canSubscribeToMoreTipsters(session.user.id);
      
      return NextResponse.json({
        success: true,
        data: {
          tipster: {
            id: tipster.id,
            displayName: tipster.displayName,
            bio: tipster.bio,
            avatar: tipster.avatar,
            isVerified: tipster.isVerified,
            isFeatured: tipster.isFeatured,
            stats: {
              totalTips: tipster.totalTips,
              wins: tipster.wins,
              losses: tipster.losses,
              roi: tipster.roi,
              winRate: tipster.winRate,
              profit: tipster.profit,
              followersCount: tipster.followersCount,
            },
            user: tipster.user,
          },
          pricing,
          isSubscribed,
          currentSubscription,
          canSubscribe,
          remainingSlots: remaining,
          userTier: await getUserTierQuick(session.user.id),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        tipster: {
          id: tipster.id,
          displayName: tipster.displayName,
          bio: tipster.bio,
          avatar: tipster.avatar,
          isVerified: tipster.isVerified,
          isFeatured: tipster.isFeatured,
          stats: {
            totalTips: tipster.totalTips,
            wins: tipster.wins,
            losses: tipster.losses,
            roi: tipster.roi,
            winRate: tipster.winRate,
            profit: tipster.profit,
            followersCount: tipster.followersCount,
          },
          user: tipster.user,
        },
        pricing,
        isSubscribed: false,
        canSubscribe: true,
      },
    });

  } catch (error) {
    console.error('Get subscription preview error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get subscription preview' },
      { status: 500 }
    );
  }
}

// Helper function to get user tier quickly
async function getUserTierQuick(userId: string): Promise<string> {
  const subscription = await db.subscription.findFirst({
    where: {
      userId,
      status: 'active',
      endDate: { gte: new Date() },
      tipsterId: null,
    },
    orderBy: { tier: 'desc' },
  });
  
  return subscription?.tier || 'free';
}
