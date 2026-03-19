// 43V3R BET AI - Leaderboard API
// Returns weekly/monthly/all-time leaderboards

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorNextResponse, ErrorCode } from '@/lib/api-response';

/**
 * GET /api/leaderboard
 * Get leaderboard entries
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'weekly';
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));

    // Return sample leaderboard data
    // In production, this would come from the database
    const sampleLeaderboard = [
      { rank: 1, username: 'ProBettor99', profit: 15420, winRate: 78, bets: 156 },
      { rank: 2, username: 'SundownsKing', profit: 12850, winRate: 74, bets: 142 },
      { rank: 3, username: 'ValueHunter', profit: 9750, winRate: 71, bets: 128 },
      { rank: 4, username: 'PSL Expert', profit: 8200, winRate: 68, bets: 115 },
      { rank: 5, username: 'ChiefsFan', profit: 6500, winRate: 65, bets: 98 },
      { rank: 6, username: 'BucsLoyal', profit: 5200, winRate: 62, bets: 87 },
      { rank: 7, username: 'DownsDynasty', profit: 4100, winRate: 60, bets: 75 },
      { rank: 8, username: 'BetMaster', profit: 3200, winRate: 58, bets: 64 },
      { rank: 9, username: 'OddsKing', profit: 2400, winRate: 55, bets: 52 },
      { rank: 10, username: 'NewbieBetter', profit: 1500, winRate: 52, bets: 42 },
    ];

    return NextResponse.json({
      success: true,
      data: sampleLeaderboard,
      period,
      total: sampleLeaderboard.length,
    });

  } catch (error) {
    console.error('Leaderboard API error:', error);
    return errorNextResponse(
      error instanceof Error ? error.message : 'Failed to fetch leaderboard',
      ErrorCode.INTERNAL_ERROR
    );
  }
}
