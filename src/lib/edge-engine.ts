// 43V3R BET AI - AI Edge Engine
// Value Bet Detection System using Probability Analysis

import type { Odds, Prediction, ValueBet, MatchFeatures } from '@/types';

/**
 * Calculate implied probability from bookmaker odds
 * Formula: implied_probability = 1 / decimal_odds
 */
export function calculateImpliedProbability(odds: number): number {
  if (odds <= 1) return 0;
  return 1 / odds;
}

/**
 * Calculate the bookmaker's margin (overround)
 * This represents the bookmaker's edge
 */
export function calculateBookmakerMargin(homeOdds: number, drawOdds: number, awayOdds: number): number {
  const homeImplied = calculateImpliedProbability(homeOdds);
  const drawImplied = calculateImpliedProbability(drawOdds);
  const awayImplied = calculateImpliedProbability(awayOdds);
  
  return (homeImplied + drawImplied + awayImplied) - 1;
}

/**
 * Remove bookmaker margin to get "true" implied probability
 */
export function removeBookmakerMargin(impliedProb: number, totalImplied: number): number {
  return impliedProb / totalImplied;
}

/**
 * Calculate edge (AI probability - implied probability)
 * Positive edge means the bookmaker has underestimated the probability
 */
export function calculateEdge(aiProb: number, impliedProb: number): number {
  return aiProb - impliedProb;
}

/**
 * Kelly Criterion - Optimal bet sizing
 * f = (bp - q) / b
 * where:
 * b = odds - 1 (net odds)
 * p = AI probability
 * q = 1 - p (probability of losing)
 */
export function calculateKellyFraction(odds: number, probability: number): number {
  if (odds <= 1 || probability <= 0) return 0;
  
  const b = odds - 1; // Net odds
  const p = probability;
  const q = 1 - p;
  
  const kelly = (b * p - q) / b;
  
  // Apply fractional Kelly (half Kelly) for risk management
  return Math.max(0, kelly * 0.5);
}

/**
 * Calculate expected value
 * EV = (Probability * Odds) - 1
 */
export function calculateExpectedValue(probability: number, odds: number): number {
  return (probability * odds) - 1;
}

/**
 * Determine risk level based on edge and odds
 */
export function determineRiskLevel(edge: number, odds: number): 'low' | 'medium' | 'high' {
  // High edge with reasonable odds = low risk
  if (edge > 0.1 && odds < 2.5) return 'low';
  
  // Moderate edge = medium risk
  if (edge > 0.05 && edge <= 0.1) return 'medium';
  
  // Low edge or high odds = high risk
  return 'high';
}

/**
 * Check if a bet qualifies as a value bet
 * Criteria:
 * - Edge > 5%
 * - Odds between 1.5 and 3.5
 * - Confidence > 60%
 */
export function isValueBet(
  aiProb: number,
  impliedProb: number,
  odds: number,
  confidence: number
): boolean {
  const edge = calculateEdge(aiProb, impliedProb);
  
  return (
    edge > 0.05 && // Edge > 5%
    odds >= 1.5 && // Minimum odds
    odds <= 3.5 && // Maximum odds
    confidence >= 60 // Minimum confidence
  );
}

/**
 * Generate AI prediction using feature analysis
 * This is a simplified model - in production, use trained ML models
 */
export function generateAIPrediction(features: MatchFeatures): {
  homeWin: number;
  draw: number;
  awayWin: number;
  confidence: number;
} {
  // Weight factors
  const weights = {
    form: 0.25,
    goals: 0.20,
    homeAdvantage: 0.15,
    h2h: 0.15,
    oddsMovement: 0.15,
    leagueStrength: 0.10
  };
  
  // Calculate base probabilities from form
  const homeFormScore = features.homeForm / 15; // Max 15 points from last 5 games (W=3, D=1, L=0)
  const awayFormScore = features.awayForm / 15;
  
  // Goal difference impact
  const homeGoalDiff = features.homeGoalsScored - features.homeGoalsConceded;
  const awayGoalDiff = features.awayGoalsScored - features.awayGoalsConceded;
  const goalDiffFactor = (homeGoalDiff - awayGoalDiff) / 20;
  
  // Home advantage (typically worth ~0.1 probability shift)
  const homeAdvantageFactor = features.homeAdvantage * 0.08;
  
  // H2H impact
  const totalH2H = features.h2hHomeWins + features.h2hDraws + features.h2hAwayWins;
  const h2hFactor = totalH2H > 0 
    ? (features.h2hHomeWins - features.h2hAwayWins) / totalH2H * 0.1
    : 0;
  
  // Odds movement (if odds dropped, suggests smart money on that outcome)
  const oddsFactor = features.oddsMovement * 0.05;
  
  // Combine factors for home win probability
  let homeWin = 0.35; // Base probability
  homeWin += (homeFormScore - awayFormScore) * weights.form;
  homeWin += goalDiffFactor * weights.goals;
  homeWin += homeAdvantageFactor;
  homeWin += h2hFactor * weights.h2h;
  homeWin += oddsFactor * weights.oddsMovement;
  
  // Calculate draw probability (inverse of team strength difference)
  const strengthDiff = Math.abs(homeWin - 0.35);
  let draw = 0.28 - (strengthDiff * 0.3);
  
  // Calculate away win probability
  let awayWin = 1 - homeWin - draw;
  
  // Normalize probabilities
  const total = homeWin + draw + awayWin;
  homeWin = Math.max(0.05, Math.min(0.85, homeWin / total));
  draw = Math.max(0.10, Math.min(0.35, draw / total));
  awayWin = Math.max(0.05, Math.min(0.85, awayWin / total));
  
  // Re-normalize
  const sum = homeWin + draw + awayWin;
  homeWin /= sum;
  draw /= sum;
  awayWin /= sum;
  
  // Calculate confidence based on feature certainty
  const confidence = Math.round(
    60 + // Base confidence
    (1 - strengthDiff) * 20 + // Higher confidence when teams are different strength
    features.leagueStrength * 10
  );
  
  return {
    homeWin: Math.round(homeWin * 100) / 100,
    draw: Math.round(draw * 100) / 100,
    awayWin: Math.round(awayWin * 100) / 100,
    confidence: Math.min(95, Math.max(50, confidence))
  };
}

/**
 * Analyze a match for value bets
 */
export function analyzeMatchForValueBets(
  matchId: string,
  odds: Odds,
  features: MatchFeatures
): ValueBet[] {
  const valueBets: ValueBet[] = [];
  const aiPrediction = generateAIPrediction(features);
  
  // Calculate true implied probabilities (removing bookmaker margin)
  const margin = calculateBookmakerMargin(odds.homeWin, odds.draw, odds.awayWin);
  const totalImplied = 1 + margin;
  
  const homeImpliedTrue = removeBookmakerMargin(
    calculateImpliedProbability(odds.homeWin),
    totalImplied
  );
  const drawImpliedTrue = removeBookmakerMargin(
    calculateImpliedProbability(odds.draw),
    totalImplied
  );
  const awayImpliedTrue = removeBookmakerMargin(
    calculateImpliedProbability(odds.awayWin),
    totalImplied
  );
  
  // Check home win value
  const homeEdge = calculateEdge(aiPrediction.homeWin, homeImpliedTrue);
  if (homeEdge > 0.05) {
    const kellyFraction = calculateKellyFraction(odds.homeWin, aiPrediction.homeWin);
    const ev = calculateExpectedValue(aiPrediction.homeWin, odds.homeWin);
    
    valueBets.push({
      id: `${matchId}-home`,
      matchId,
      prediction: 'home',
      confidence: aiPrediction.confidence,
      homeWinProb: aiPrediction.homeWin,
      drawProb: aiPrediction.draw,
      awayWinProb: aiPrediction.awayWin,
      isValueBet: true,
      edge: homeEdge,
      kellyFraction,
      impliedProb: homeImpliedTrue,
      odds: odds.homeWin,
      expectedValue: ev,
      riskLevel: determineRiskLevel(homeEdge, odds.homeWin),
      recommendation: generateRecommendation(homeEdge, kellyFraction, odds.homeWin, 'home')
    });
  }
  
  // Check draw value
  const drawEdge = calculateEdge(aiPrediction.draw, drawImpliedTrue);
  if (drawEdge > 0.05) {
    const kellyFraction = calculateKellyFraction(odds.draw, aiPrediction.draw);
    const ev = calculateExpectedValue(aiPrediction.draw, odds.draw);
    
    valueBets.push({
      id: `${matchId}-draw`,
      matchId,
      prediction: 'draw',
      confidence: aiPrediction.confidence,
      homeWinProb: aiPrediction.homeWin,
      drawProb: aiPrediction.draw,
      awayWinProb: aiPrediction.awayWin,
      isValueBet: true,
      edge: drawEdge,
      kellyFraction,
      impliedProb: drawImpliedTrue,
      odds: odds.draw,
      expectedValue: ev,
      riskLevel: determineRiskLevel(drawEdge, odds.draw),
      recommendation: generateRecommendation(drawEdge, kellyFraction, odds.draw, 'draw')
    });
  }
  
  // Check away win value
  const awayEdge = calculateEdge(aiPrediction.awayWin, awayImpliedTrue);
  if (awayEdge > 0.05) {
    const kellyFraction = calculateKellyFraction(odds.awayWin, aiPrediction.awayWin);
    const ev = calculateExpectedValue(aiPrediction.awayWin, odds.awayWin);
    
    valueBets.push({
      id: `${matchId}-away`,
      matchId,
      prediction: 'away',
      confidence: aiPrediction.confidence,
      homeWinProb: aiPrediction.homeWin,
      drawProb: aiPrediction.draw,
      awayWinProb: aiPrediction.awayWin,
      isValueBet: true,
      edge: awayEdge,
      kellyFraction,
      impliedProb: awayImpliedTrue,
      odds: odds.awayWin,
      expectedValue: ev,
      riskLevel: determineRiskLevel(awayEdge, odds.awayWin),
      recommendation: generateRecommendation(awayEdge, kellyFraction, odds.awayWin, 'away')
    });
  }
  
  // Sort by edge (highest first)
  return valueBets.sort((a, b) => b.edge - a.edge);
}

/**
 * Generate human-readable recommendation
 */
function generateRecommendation(
  edge: number,
  kellyFraction: number,
  odds: number,
  prediction: string
): string {
  const edgePercent = (edge * 100).toFixed(1);
  const kellyPercent = (kellyFraction * 100).toFixed(1);
  const selection = prediction === 'home' ? 'Home Win' : prediction === 'draw' ? 'Draw' : 'Away Win';
  
  let risk = '';
  if (edge > 0.1) {
    risk = 'HIGH CONFIDENCE 🔥';
  } else if (edge > 0.07) {
    risk = 'MEDIUM CONFIDENCE ✅';
  } else {
    risk = 'MODERATE EDGE ⚡';
  }
  
  return `${risk} | ${selection} @ ${odds.toFixed(2)} | Edge: ${edgePercent}% | Recommended Stake: ${kellyPercent}% of bankroll`;
}

/**
 * Format edge as percentage string
 */
export function formatEdge(edge: number): string {
  const sign = edge >= 0 ? '+' : '';
  return `${sign}${(edge * 100).toFixed(1)}%`;
}

/**
 * Get edge color class
 */
export function getEdgeColorClass(edge: number): string {
  if (edge > 0.1) return 'text-emerald-400';
  if (edge > 0.07) return 'text-green-400';
  if (edge > 0.05) return 'text-yellow-400';
  return 'text-gray-400';
}

/**
 * Get risk level color class
 */
export function getRiskColorClass(risk: 'low' | 'medium' | 'high'): string {
  switch (risk) {
    case 'low': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
  }
}
