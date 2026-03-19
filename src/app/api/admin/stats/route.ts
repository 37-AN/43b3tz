import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/stats - Get platform statistics
export async function GET(request: NextRequest) {
  try {
    // Mock data for demo - in production, fetch from database
    const stats = {
      totalUsers: 12453,
      activeUsers: 2341,
      totalBets: 89542,
      totalVolume: 2450000,
      platformProfit: 245000,
      activeTipsters: 156,
      pendingWithdrawals: 23,
      userGrowth: 12.5,
      revenueGrowth: 24.2,
      conversionRate: 8.4,
      averageBetSize: 125,
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch stats',
    }, { status: 500 });
  }
}
