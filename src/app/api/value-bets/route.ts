// 43V3R BET AI - Value Bets API
// Fetches matches, gets AI predictions, and filters for value bets

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  successResponse,
  errorNextResponse,
  ErrorCode,
} from '@/lib/api-response';

// AI Engine port
const AI_ENGINE_PORT = 3006;

interface ValueBetResult {
  id: string;
  matchId: string;
  match: {
    id: string;
    homeTeam: { id: string; name: string; logo: string | null; form: string | null; };
    awayTeam: { id: string; name: string; logo: string | null; form: string | null; };
    league: { id: string; name: string; country: string; };
    kickoffTime: Date;
    status: string;
  };
  odds: { homeWin: number; draw: number; awayWin: number; };
  prediction: 'home' | 'draw' | 'away';
  aiProbability: number;
  impliedProbability: number;
  edge: number;
  confidence: number;
  kellyFraction: number;
  expectedValue: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendation: string;
  isPremium: boolean;
  createdAt: Date;
}

/**
 * GET /api/value-bets
 * Get all current value bets from AI analysis
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const minEdge = parseFloat(searchParams.get('minEdge') || '0.05');
    const minConfidence = parseFloat(searchParams.get('minConfidence') || '0.65');
    const leagueId = searchParams.get('league') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));

    // Get matches with odds that are scheduled
    const where: Record<string, unknown> = {
      status: 'scheduled',
      kickoffTime: { gte: new Date() },
    };

    if (leagueId) {
      where.leagueId = leagueId;
    }

    const matches = await db.match.findMany({
      where,
      include: { league: true, homeTeam: true, awayTeam: true, odds: true },
      orderBy: { kickoffTime: 'asc' },
      take: 50,
    });

    // Filter matches that have odds
    const matchesWithOdds = matches.filter(m => m.odds !== null);

    if (matchesWithOdds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          valueBets: [],
          total: 0,
          filters: { minEdge, minConfidence },
          message: 'No upcoming matches with odds available',
        },
      });
    }

    // Call AI Engine for value bet analysis
    let aiResponse;
    try {
      const aiUrl = `http://localhost:${AI_ENGINE_PORT}/value-bet?XTransformPort=${AI_ENGINE_PORT}`;
      const aiResult = await fetch(aiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matches: matchesWithOdds.map(m => ({
            matchId: m.id,
            homeTeamId: m.homeTeamId,
            awayTeamId: m.awayTeamId,
            leagueId: m.leagueId,
            homeWinOdds: m.odds!.homeWin,
            drawOdds: m.odds!.draw,
            awayWinOdds: m.odds!.awayWin,
            homeWinOpenOdds: m.odds!.homeWinOpen ?? undefined,
            homeForm: m.homeTeam.form ?? undefined,
            awayForm: m.awayTeam.form ?? undefined,
          })),
          minEdge,
          minConfidence,
        }),
      });
      aiResponse = await aiResult.json();
    } catch (error) {
      console.error('AI Engine error:', error);
      aiResponse = { success: false, error: 'AI Engine unavailable' };
    }

    let valueBets: ValueBetResult[] = [];

    if (aiResponse.success && aiResponse.data?.valueBets) {
      valueBets = aiResponse.data.valueBets.map((vb: any) => {
        const match = matchesWithOdds.find(m => m.id === vb.matchId)!;
        return {
          id: `${vb.matchId}-${vb.prediction}`,
          matchId: vb.matchId,
          match: {
            id: match.id,
            homeTeam: { id: match.homeTeam.id, name: match.homeTeam.name, logo: match.homeTeam.logo, form: match.homeTeam.form },
            awayTeam: { id: match.awayTeam.id, name: match.awayTeam.name, logo: match.awayTeam.logo, form: match.awayTeam.form },
            league: { id: match.league.id, name: match.league.name, country: match.league.country },
            kickoffTime: match.kickoffTime,
            status: match.status,
          },
          odds: { homeWin: match.odds!.homeWin, draw: match.odds!.draw, awayWin: match.odds!.awayWin },
          prediction: vb.prediction,
          aiProbability: vb.aiProbability,
          impliedProbability: vb.impliedProbability,
          edge: vb.edge,
          confidence: vb.confidence,
          kellyFraction: vb.kellyFraction,
          expectedValue: vb.expectedValue,
          riskLevel: vb.riskLevel,
          recommendation: vb.recommendation,
          isPremium: vb.edge > 0.1 && vb.confidence > 0.75,
          createdAt: new Date(),
        };
      });
    } else {
      valueBets = calculateValueBetsLocally(matchesWithOdds, minEdge, minConfidence);
    }

    // Sort by edge (highest first)
    valueBets.sort((a, b) => b.edge - a.edge);

    // Pagination
    const total = valueBets.length;
    const skip = (page - 1) * limit;
    const paginatedBets = valueBets.slice(skip, skip + limit);

    return NextResponse.json({
      success: true,
      data: {
        valueBets: paginatedBets,
        total,
        page,
        limit,
        filters: { minEdge, minConfidence },
        aiEngineStatus: aiResponse.success ? 'connected' : 'fallback',
      },
    });

  } catch (error) {
    console.error('Value bets API error:', error);
    return errorNextResponse(
      error instanceof Error ? error.message : 'Failed to fetch value bets',
      ErrorCode.INTERNAL_ERROR
    );
  }
}

/**
 * Fallback value bet calculation when AI Engine is unavailable
 */
function calculateValueBetsLocally(
  matches: any[],
  minEdge: number,
  minConfidence: number
): ValueBetResult[] {
  const results: ValueBetResult[] = [];

  for (const match of matches) {
    if (!match.odds) continue;

    const odds = match.odds;
    
    // Calculate implied probabilities
    const homeImplied = 1 / odds.homeWin;
    const drawImplied = 1 / odds.draw;
    const awayImplied = 1 / odds.awayWin;
    const totalImplied = homeImplied + drawImplied + awayImplied;
    
    // Remove bookmaker margin
    const margin = totalImplied - 1;
    const homeTrue = homeImplied / (1 + margin);
    const drawTrue = drawImplied / (1 + margin);
    const awayTrue = awayImplied / (1 + margin);

    // Simple AI estimation (based on odds movement and form)
    const homeFormStrength = calculateFormStrength(match.homeTeam.form);
    const awayFormStrength = calculateFormStrength(match.awayTeam.form);
    
    // Adjust probabilities based on form
    const homeProb = Math.min(0.85, Math.max(0.15, homeTrue + (homeFormStrength - awayFormStrength) * 0.1));
    const awayProb = Math.min(0.85, Math.max(0.15, awayTrue + (awayFormStrength - homeFormStrength) * 0.1));
    const drawProb = Math.max(0.1, 1 - homeProb - awayProb);

    // Calculate edges
    const edges = [
      { prediction: 'home' as const, prob: homeProb, implied: homeTrue, odds: odds.homeWin },
      { prediction: 'draw' as const, prob: drawProb, implied: drawTrue, odds: odds.draw },
      { prediction: 'away' as const, prob: awayProb, implied: awayTrue, odds: odds.awayWin },
    ];

    for (const edge of edges) {
      const edgeValue = edge.prob - edge.implied;
      const confidence = 0.5 + Math.abs(edgeValue) * 2;

      if (edgeValue > minEdge && confidence > minConfidence) {
        const kelly = Math.max(0, ((edge.odds - 1) * edge.prob - (1 - edge.prob)) / (edge.odds - 1)) * 0.5;
        const ev = (edge.prob * edge.odds) - 1;

        let riskLevel: 'low' | 'medium' | 'high';
        if (edgeValue > 0.1 && edge.odds < 2.5 && confidence > 0.75) {
          riskLevel = 'low';
        } else if (edgeValue > 0.05 && confidence > 0.65) {
          riskLevel = 'medium';
        } else {
          riskLevel = 'high';
        }

        const selection = edge.prediction === 'home' ? match.homeTeam.name : 
                         edge.prediction === 'away' ? match.awayTeam.name : 'DRAW';
        let level = edgeValue > 0.1 && confidence > 0.75 ? '🔥 PREMIUM' : 
                    edgeValue > 0.07 && confidence > 0.70 ? '✅ STRONG' : '⚡ VALUE';

        results.push({
          id: `${match.id}-${edge.prediction}`,
          matchId: match.id,
          match: {
            id: match.id,
            homeTeam: { id: match.homeTeam.id, name: match.homeTeam.name, logo: match.homeTeam.logo, form: match.homeTeam.form },
            awayTeam: { id: match.awayTeam.id, name: match.awayTeam.name, logo: match.awayTeam.logo, form: match.awayTeam.form },
            league: { id: match.league.id, name: match.league.name, country: match.league.country },
            kickoffTime: match.kickoffTime,
            status: match.status,
          },
          odds: { homeWin: odds.homeWin, draw: odds.draw, awayWin: odds.awayWin },
          prediction: edge.prediction,
          aiProbability: edge.prob,
          impliedProbability: edge.implied,
          edge: edgeValue,
          confidence,
          kellyFraction: kelly,
          expectedValue: ev,
          riskLevel,
          recommendation: `${level} | ${selection} @ ${edge.odds.toFixed(2)} | Edge: +${(edgeValue * 100).toFixed(1)}% | Conf: ${(confidence * 100).toFixed(0)}%`,
          isPremium: edgeValue > 0.1 && confidence > 0.75,
          createdAt: new Date(),
        });
      }
    }
  }

  return results;
}

function calculateFormStrength(form: string | null): number {
  if (!form) return 0.5;
  let score = 0;
  const weights = [0.3, 0.25, 0.2, 0.15, 0.1];
  for (let i = 0; i < Math.min(5, form.length); i++) {
    let points = form[i].toUpperCase() === 'W' ? 1 : form[i].toUpperCase() === 'D' ? 0.33 : 0;
    score += points * weights[i];
  }
  return score / 0.3;
}
