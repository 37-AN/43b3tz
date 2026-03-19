// 43V3R BET AI - Predictions API
// Database-connected predictions endpoint with value bet analysis

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  toNextResponse,
  errorNextResponse,
  createdResponse,
  forbiddenResponse,
  ErrorCode,
} from '@/lib/api-response';
import {
  calculateImpliedProbability,
  calculateEdge,
  calculateKellyFraction,
  determineRiskLevel,
  calculateBookmakerMargin,
  removeBookmakerMargin,
} from '@/lib/edge-engine';
import {
  CACHE_TTL,
  CACHE_KEYS,
  withRateLimitAndCache,
  generateCacheKey,
  invalidatePredictionCaches,
} from '@/lib/redis';

// Types for the response
interface PredictionResponse {
  id: string;
  matchId: string;
  match: {
    id: string;
    homeTeam: {
      id: string;
      name: string;
      logo: string | null;
      form: string | null;
    };
    awayTeam: {
      id: string;
      name: string;
      logo: string | null;
      form: string | null;
    };
    league: {
      id: string;
      name: string;
      country: string;
      logo: string | null;
    };
    kickoffTime: Date;
    status: string;
  };
  odds: {
    homeWin: number;
    draw: number;
    awayWin: number;
    over25: number | null;
    under25: number | null;
    bttsYes: number | null;
    bttsNo: number | null;
  } | null;
  aiPrediction: {
    homeWin: number;
    draw: number;
    awayWin: number;
    confidence: number;
  };
  edges: {
    home: number;
    draw: number;
    away: number;
  };
  valueBetAnalysis: {
    prediction: string;
    odds: number;
    edge: number;
    kellyFraction: number;
    riskLevel: 'low' | 'medium' | 'high';
    expectedValue: number;
  }[];
  isValueBet: boolean;
  isPremium: boolean;
  price: number | null;
  result: string | null;
  createdAt: Date;
}

/**
 * GET /api/predictions
 * Fetch predictions with optional filtering
 * 
 * Query Parameters:
 * - matchId: Filter by specific match ID
 * - minConfidence: Filter by minimum confidence (0-100)
 * - isValueBet: Filter value bets only (true/false)
 * - premium: Filter premium predictions (true/false)
 * - page: Page number for pagination (default: 1)
 * - limit: Items per page (default: 20, max: 50)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const matchId = searchParams.get('matchId') || undefined;
    const minConfidence = searchParams.get('minConfidence') 
      ? parseFloat(searchParams.get('minConfidence')!) 
      : undefined;
    const isValueBet = searchParams.get('isValueBet') === 'true' 
      ? true 
      : searchParams.get('isValueBet') === 'false' 
        ? false 
        : undefined;
    const premium = searchParams.get('premium') === 'true' 
      ? true 
      : searchParams.get('premium') === 'false' 
        ? false 
        : undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    // Generate cache key based on query parameters
    const cacheKey = generateCacheKey(CACHE_KEYS.PREDICTIONS, request, {
      matchId,
      minConfidence,
      isValueBet,
      premium,
      page,
      limit,
    });

    // Use cache with rate limiting
    return withRateLimitAndCache(
      request,
      cacheKey,
      async () => {
        // Build where clause
        const where: Record<string, unknown> = {};
        
        if (matchId) {
          where.matchId = matchId;
        }
        
        if (minConfidence !== undefined) {
          where.confidence = { gte: minConfidence };
        }
        
        if (isValueBet !== undefined) {
          where.isValueBet = isValueBet;
        }
        
        if (premium !== undefined) {
          where.isPremium = premium;
        }

        // Get total count for pagination
        const total = await db.prediction.count({ where });

        // Fetch predictions with related data
        const predictions = await db.prediction.findMany({
          where,
          include: {
            match: {
              include: {
                league: true,
                homeTeam: true,
                awayTeam: true,
                odds: true,
              },
            },
            user: {
              select: {
                id: true,
                username: true,
                name: true,
              },
            },
          },
          orderBy: [
            { isValueBet: 'desc' },
            { edge: 'desc' },
            { confidence: 'desc' },
            { createdAt: 'desc' },
          ],
          skip,
          take: limit,
        });

        // Transform predictions to response format
        const transformedPredictions: PredictionResponse[] = predictions.map((pred) => {
          const match = pred.match;
          const odds = match.odds;
          
          // Calculate implied probabilities and edges if odds exist
          let edges = { home: 0, draw: 0, away: 0 };
          let valueBetAnalysis: PredictionResponse['valueBetAnalysis'] = [];
          
          if (odds) {
            // Calculate bookmaker margin and true probabilities
            const margin = calculateBookmakerMargin(odds.homeWin, odds.draw, odds.awayWin);
            const totalImplied = 1 + margin;
            
            const homeImplied = removeBookmakerMargin(
              calculateImpliedProbability(odds.homeWin),
              totalImplied
            );
            const drawImplied = removeBookmakerMargin(
              calculateImpliedProbability(odds.draw),
              totalImplied
            );
            const awayImplied = removeBookmakerMargin(
              calculateImpliedProbability(odds.awayWin),
              totalImplied
            );
            
            // Calculate edges
            const homeEdge = calculateEdge(pred.homeWinProb, homeImplied);
            const drawEdge = calculateEdge(pred.drawProb, drawImplied);
            const awayEdge = calculateEdge(pred.awayWinProb, awayImplied);
            
            edges = {
              home: Math.round(homeEdge * 1000) / 1000,
              draw: Math.round(drawEdge * 1000) / 1000,
              away: Math.round(awayEdge * 1000) / 1000,
            };
            
            // Build value bet analysis for each outcome
            const outcomes: Array<{ prediction: string; odds: number; prob: number; edge: number }> = [
              { prediction: 'home', odds: odds.homeWin, prob: pred.homeWinProb, edge: homeEdge },
              { prediction: 'draw', odds: odds.draw, prob: pred.drawProb, edge: drawEdge },
              { prediction: 'away', odds: odds.awayWin, prob: pred.awayWinProb, edge: awayEdge },
            ];
            
            for (const outcome of outcomes) {
              if (outcome.edge > 0) {
                const kellyFraction = calculateKellyFraction(outcome.odds, outcome.prob);
                const expectedValue = (outcome.prob * outcome.odds) - 1;
                
                valueBetAnalysis.push({
                  prediction: outcome.prediction,
                  odds: outcome.odds,
                  edge: Math.round(outcome.edge * 1000) / 1000,
                  kellyFraction: Math.round(kellyFraction * 1000) / 1000,
                  riskLevel: determineRiskLevel(outcome.edge, outcome.odds),
                  expectedValue: Math.round(expectedValue * 1000) / 1000,
                });
              }
            }
            
            // Sort value bet analysis by edge (highest first)
            valueBetAnalysis.sort((a, b) => b.edge - a.edge);
          }
          
          return {
            id: pred.id,
            matchId: pred.matchId,
            match: {
              id: match.id,
              homeTeam: {
                id: match.homeTeam.id,
                name: match.homeTeam.name,
                logo: match.homeTeam.logo,
                form: match.homeTeam.form,
              },
              awayTeam: {
                id: match.awayTeam.id,
                name: match.awayTeam.name,
                logo: match.awayTeam.logo,
                form: match.awayTeam.form,
              },
              league: {
                id: match.league.id,
                name: match.league.name,
                country: match.league.country,
                logo: match.league.logo,
              },
              kickoffTime: match.kickoffTime,
              status: match.status,
            },
            odds: odds ? {
              homeWin: odds.homeWin,
              draw: odds.draw,
              awayWin: odds.awayWin,
              over25: odds.over25,
              under25: odds.under25,
              bttsYes: odds.bttsYes,
              bttsNo: odds.bttsNo,
            } : null,
            aiPrediction: {
              homeWin: pred.homeWinProb,
              draw: pred.drawProb,
              awayWin: pred.awayWinProb,
              confidence: pred.confidence,
            },
            edges,
            valueBetAnalysis,
            isValueBet: pred.isValueBet,
            isPremium: pred.isPremium,
            price: pred.price,
            result: pred.result,
            createdAt: pred.createdAt,
          };
        });

        // Return paginated response
        return paginatedResponse(transformedPredictions, page, limit, total);
      },
      {
        cache: {
          ttl: CACHE_TTL.PREDICTIONS,
          visibility: 'public',
        },
        rateLimit: {
          requests: 50,
          window: 60,
        },
      }
    );
    
  } catch (error) {
    console.error('Predictions API error:', error);
    return errorNextResponse(
      error instanceof Error ? error.message : 'Failed to fetch predictions',
      ErrorCode.INTERNAL_ERROR
    );
  }
}

/**
 * POST /api/predictions
 * Create a new prediction (admin only)
 * 
 * Request Body:
 * - matchId: string (required)
 * - homeWinProb: number (required, 0-1)
 * - drawProb: number (required, 0-1)
 * - awayWinProb: number (required, 0-1)
 * - prediction: string (required: 'home' | 'draw' | 'away')
 * - confidence: number (required, 0-100)
 * - isValueBet: boolean (optional, default: false)
 * - isPremium: boolean (optional, default: false)
 * - price: number (optional)
 * 
 * Headers:
 * - x-admin-key: Admin API key for authorization
 */
export async function POST(request: NextRequest) {
  try {
    // Simple admin check via header
    const adminKey = request.headers.get('x-admin-key');
    const expectedAdminKey = process.env.ADMIN_API_KEY || 'admin-secret-key';
    
    if (adminKey !== expectedAdminKey) {
      return forbiddenResponse('Admin access required');
    }

    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    const {
      matchId,
      homeWinProb,
      drawProb,
      awayWinProb,
      prediction,
      confidence,
      isValueBet = false,
      isPremium = false,
      price,
    } = body;

    // Validation
    if (!matchId) {
      return errorNextResponse('matchId is required', ErrorCode.VALIDATION_ERROR);
    }
    
    if (typeof homeWinProb !== 'number' || homeWinProb < 0 || homeWinProb > 1) {
      return errorNextResponse('homeWinProb must be a number between 0 and 1', ErrorCode.VALIDATION_ERROR);
    }
    
    if (typeof drawProb !== 'number' || drawProb < 0 || drawProb > 1) {
      return errorNextResponse('drawProb must be a number between 0 and 1', ErrorCode.VALIDATION_ERROR);
    }
    
    if (typeof awayWinProb !== 'number' || awayWinProb < 0 || awayWinProb > 1) {
      return errorNextResponse('awayWinProb must be a number between 0 and 1', ErrorCode.VALIDATION_ERROR);
    }
    
    // Validate probabilities sum to ~1
    const probSum = homeWinProb + drawProb + awayWinProb;
    if (Math.abs(probSum - 1) > 0.05) {
      return errorNextResponse(`Probabilities must sum to 1 (got ${probSum.toFixed(3)})`, ErrorCode.VALIDATION_ERROR);
    }
    
    if (!['home', 'draw', 'away'].includes(prediction)) {
      return errorNextResponse('prediction must be "home", "draw", or "away"', ErrorCode.VALIDATION_ERROR);
    }
    
    if (typeof confidence !== 'number' || confidence < 0 || confidence > 100) {
      return errorNextResponse('confidence must be a number between 0 and 100', ErrorCode.VALIDATION_ERROR);
    }

    // Check if match exists
    const match = await db.match.findUnique({
      where: { id: matchId },
      include: { odds: true },
    });

    if (!match) {
      return errorNextResponse('Match not found', ErrorCode.NOT_FOUND);
    }

    // Calculate edge if odds exist
    let edge = 0;
    let kellyFraction = 0;
    
    if (match.odds) {
      const margin = calculateBookmakerMargin(
        match.odds.homeWin,
        match.odds.draw,
        match.odds.awayWin
      );
      const totalImplied = 1 + margin;
      
      // Get the relevant implied probability based on prediction
      let impliedProb: number;
      let odds: number;
      
      switch (prediction) {
        case 'home':
          impliedProb = removeBookmakerMargin(
            calculateImpliedProbability(match.odds.homeWin),
            totalImplied
          );
          odds = match.odds.homeWin;
          edge = calculateEdge(homeWinProb, impliedProb);
          break;
        case 'draw':
          impliedProb = removeBookmakerMargin(
            calculateImpliedProbability(match.odds.draw),
            totalImplied
          );
          odds = match.odds.draw;
          edge = calculateEdge(drawProb, impliedProb);
          break;
        case 'away':
          impliedProb = removeBookmakerMargin(
            calculateImpliedProbability(match.odds.awayWin),
            totalImplied
          );
          odds = match.odds.awayWin;
          edge = calculateEdge(awayWinProb, impliedProb);
          break;
      }
      
      kellyFraction = calculateKellyFraction(odds, prediction === 'home' ? homeWinProb : prediction === 'draw' ? drawProb : awayWinProb);
    }

    // Create prediction
    const newPrediction = await db.prediction.create({
      data: {
        matchId,
        homeWinProb,
        drawProb,
        awayWinProb,
        prediction,
        confidence,
        isValueBet,
        edge,
        kellyFraction,
        isPremium,
        price: isPremium ? price : null,
        result: 'pending',
      },
      include: {
        match: {
          include: {
            league: true,
            homeTeam: true,
            awayTeam: true,
          },
        },
      },
    });

    return createdResponse({
      id: newPrediction.id,
      matchId: newPrediction.matchId,
      prediction: newPrediction.prediction,
      confidence: newPrediction.confidence,
      edge: newPrediction.edge,
      kellyFraction: newPrediction.kellyFraction,
      isValueBet: newPrediction.isValueBet,
      isPremium: newPrediction.isPremium,
      createdAt: newPrediction.createdAt,
    });
    
  } catch (error) {
    console.error('Create prediction error:', error);
    return errorNextResponse(
      error instanceof Error ? error.message : 'Failed to create prediction',
      ErrorCode.INTERNAL_ERROR
    );
  }
}
