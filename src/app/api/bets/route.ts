import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, matchId, betType, odds, stake, isSimulation = true } = body;

    // Validate inputs
    if (!matchId || !betType || !odds || !stake) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    if (stake <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Stake must be greater than 0'
      }, { status: 400 });
    }

    const potentialWin = stake * odds;

    // In a real app, we would:
    // 1. Check user balance
    // 2. Create the bet in the database
    // 3. Deduct the stake from wallet
    // 4. Return the bet details

    const bet = {
      id: `bet-${Date.now()}`,
      userId: userId || 'demo-user',
      matchId,
      betType,
      odds,
      stake,
      potentialWin,
      status: 'pending',
      isSimulation,
      createdAt: new Date()
    };

    return NextResponse.json({
      success: true,
      data: bet,
      message: isSimulation 
        ? 'Simulation bet placed successfully' 
        : 'Bet placed successfully'
    });
  } catch (error) {
    console.error('Place bet error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to place bet'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'demo-user';
    const status = searchParams.get('status');

    // In a real app, fetch from database
    // For demo, return mock data
    const bets = [
      {
        id: 'bet-1',
        userId,
        matchId: 'match-1',
        match: {
          homeTeam: { name: 'Manchester City' },
          awayTeam: { name: 'Arsenal' },
          league: { name: 'Premier League' }
        },
        betType: 'home',
        odds: 2.10,
        stake: 50,
        potentialWin: 105,
        status: 'pending',
        isSimulation: true,
        createdAt: new Date()
      }
    ];

    return NextResponse.json({
      success: true,
      data: bets,
      total: bets.length
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch bets'
    }, { status: 500 });
  }
}
