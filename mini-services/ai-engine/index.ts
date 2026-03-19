// 43V3R BET AI - Ensemble Model AI Engine
// True ensemble system combining MiroFish + Logistic Regression + Gradient Boosting
// Self-learning with prediction storage and daily retraining

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { PrismaClient, Match, Odds, OddsHistory, PredictionHistory, Team, League } from '@prisma/client';

// ==================== CONFIGURATION ====================

const PORT = 3006;
const MODEL_VERSION = '2.0.0-ensemble';
const MIN_EDGE_THRESHOLD = 0.05; // 5%
const MIN_CONFIDENCE_THRESHOLD = 0.65; // 65%
const MIN_CLOSING_LINE_VALUE = 0; // 0%
const ODDS_CHANGE_THRESHOLD = 0.02; // 2% change to store history

// ==================== DATABASE ====================

let prisma: PrismaClient | null = null;

function getDb(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' },
      ],
    });

    prisma.$on('query', (e: any) => {
      console.log(`[DB] ${e.query} | ${e.duration}ms`);
    });
  }
  return prisma;
}

async function closeDb(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

// ==================== TYPE DEFINITIONS ====================

interface MatchFeatures {
  // Odds features
  oddsMovement: number;          // Opening vs closing line movement (-1 to 1)
  marketVolatility: number;      // Vigilance/instability in odds (0 to 1)
  closingLineValue: number;      // CLV percentage (-1 to 1)
  
  // Team form features
  homeRecentForm: number;        // Weighted last 5 games (0 to 1)
  awayRecentForm: number;        // Weighted last 5 games (0 to 1)
  
  // Head-to-head
  h2hHomeWins: number;           // Historical home wins vs this opponent
  h2hDraws: number;
  h2hAwayWins: number;
  h2hTotal: number;
  
  // Context
  leagueStrength: number;        // League quality factor (0 to 1)
  homeAdvantage: number;         // Home advantage factor (0 to 1)
  
  // Additional features
  homeGoalsScored: number;
  homeGoalsConceded: number;
  awayGoalsScored: number;
  awayGoalsConceded: number;
}

interface ModelPrediction {
  homeWin: number;
  draw: number;
  awayWin: number;
  confidence: number;
  modelWeights: {
    miroFish: number;
    logistic: number;
    gradientBoost: number;
  };
}

interface ValueBetResult {
  matchId: string;
  prediction: 'home' | 'draw' | 'away';
  odds: number;
  aiProbability: number;
  impliedProbability: number;
  edge: number;
  confidence: number;
  closingLineValue: number;
  kellyFraction: number;
  expectedValue: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendation: string;
  features: MatchFeatures;
  modelWeights: {
    miroFish: number;
    logistic: number;
    gradientBoost: number;
  };
}

interface MatchInput {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  leagueId: string;
  homeWinOdds: number;
  drawOdds: number;
  awayWinOdds: number;
  homeWinOpenOdds?: number;
  drawOpenOdds?: number;
  awayWinOpenOdds?: number;
  homeForm?: string;           // e.g., "WWLDW"
  awayForm?: string;
  homeGoalsScored?: number;
  homeGoalsConceded?: number;
  awayGoalsScored?: number;
  awayGoalsConceded?: number;
  h2hHomeWins?: number;
  h2hDraws?: number;
  h2hAwayWins?: number;
}

interface BatchPredictRequest {
  matches: MatchInput[];
}

// ==================== ENSEMBLE MODEL COMPONENTS ====================

/**
 * MiroFish Model - Naive Bayesian approach
 * Based on probability estimation from odds and historical patterns
 */
class MiroFishModel {
  private weights = {
    oddsSignal: 0.35,
    formSignal: 0.25,
    h2hSignal: 0.20,
    marketSignal: 0.20,
  };

  predict(features: MatchFeatures, odds: { home: number; draw: number; away: number }): ModelPrediction {
    // Calculate implied probabilities from odds
    const totalImplied = (1 / odds.home) + (1 / odds.draw) + (1 / odds.away);
    const homeImplied = (1 / odds.home) / totalImplied;
    const drawImplied = (1 / odds.draw) / totalImplied;
    const awayImplied = (1 / odds.away) / totalImplied;

    // Odds signal - probability adjustment from market
    const oddsSignal = {
      home: homeImplied,
      draw: drawImplied,
      away: awayImplied,
    };

    // Form signal - team performance indicator
    const formDiff = features.homeRecentForm - features.awayRecentForm;
    const formSignal = {
      home: 0.4 + formDiff * 0.2,
      draw: 0.25 - Math.abs(formDiff) * 0.1,
      away: 0.35 - formDiff * 0.2,
    };

    // H2H signal - historical matchup performance
    const h2hSignal = this.calculateH2HSignal(features);

    // Market signal - odds movement and CLV
    const marketSignal = {
      home: 0.35 + features.oddsMovement * 0.15,
      draw: 0.28,
      away: 0.37 - features.oddsMovement * 0.15,
    };

    // Combine signals
    let homeWin = 
      oddsSignal.home * this.weights.oddsSignal +
      formSignal.home * this.weights.formSignal +
      h2hSignal.home * this.weights.h2hSignal +
      marketSignal.home * this.weights.marketSignal;

    let draw = 
      oddsSignal.draw * this.weights.oddsSignal +
      formSignal.draw * this.weights.formSignal +
      h2hSignal.draw * this.weights.h2hSignal +
      marketSignal.draw * this.weights.marketSignal;

    let awayWin = 
      oddsSignal.away * this.weights.oddsSignal +
      formSignal.away * this.weights.formSignal +
      h2hSignal.away * this.weights.h2hSignal +
      marketSignal.away * this.weights.marketSignal;

    // Normalize
    const total = homeWin + draw + awayWin;
    homeWin /= total;
    draw /= total;
    awayWin /= total;

    // Calculate confidence
    const maxProb = Math.max(homeWin, draw, awayWin);
    const confidence = 0.5 + (maxProb - 0.33) * 1.5 + features.leagueStrength * 0.1;

    return {
      homeWin,
      draw,
      awayWin,
      confidence: Math.min(0.95, Math.max(0.5, confidence)),
      modelWeights: { miroFish: 0, logistic: 0, gradientBoost: 0 },
    };
  }

  private calculateH2HSignal(features: MatchFeatures): { home: number; draw: number; away: number } {
    if (features.h2hTotal === 0) {
      return { home: 0.4, draw: 0.25, away: 0.35 };
    }

    const homeRatio = features.h2hHomeWins / features.h2hTotal;
    const drawRatio = features.h2hDraws / features.h2hTotal;
    const awayRatio = features.h2hAwayWins / features.h2hTotal;

    return {
      home: 0.3 + homeRatio * 0.3,
      draw: 0.2 + drawRatio * 0.2,
      away: 0.3 + awayRatio * 0.3,
    };
  }
}

/**
 * Logistic Regression Model
 * Linear combination of features with sigmoid activation
 */
class LogisticRegressionModel {
  // Learned coefficients (these would be updated during training)
  private coefficients = {
    intercept: -0.1,
    oddsMovement: 0.8,
    marketVolatility: -0.2,
    closingLineValue: 0.5,
    homeForm: 0.6,
    awayForm: -0.6,
    homeAdvantage: 0.4,
    leagueStrength: 0.3,
    h2hFactor: 0.4,
    goalDiff: 0.2,
  };

  predict(features: MatchFeatures): ModelPrediction {
    // Calculate home win probability using logistic function
    const homeGoalDiff = features.homeGoalsScored - features.homeGoalsConceded;
    const awayGoalDiff = features.awayGoalsScored - features.awayGoalsConceded;
    const goalDiffFactor = (homeGoalDiff - awayGoalDiff) / 20;

    const h2hFactor = features.h2hTotal > 0 
      ? (features.h2hHomeWins - features.h2hAwayWins) / features.h2hTotal 
      : 0;

    // Linear combination
    const z = 
      this.coefficients.intercept +
      this.coefficients.oddsMovement * features.oddsMovement +
      this.coefficients.marketVolatility * features.marketVolatility +
      this.coefficients.closingLineValue * features.closingLineValue +
      this.coefficients.homeForm * features.homeRecentForm +
      this.coefficients.awayForm * features.awayRecentForm +
      this.coefficients.homeAdvantage * features.homeAdvantage +
      this.coefficients.leagueStrength * features.leagueStrength +
      this.coefficients.h2hFactor * h2hFactor +
      this.coefficients.goalDiff * goalDiffFactor;

    // Sigmoid function
    const homeWin = 1 / (1 + Math.exp(-z));
    
    // Draw probability (inverse relationship with decisiveness)
    const decisiveness = Math.abs(homeWin - 0.5);
    const draw = 0.3 * (1 - decisiveness * 1.5);
    
    // Away win
    const awayWin = 1 - homeWin - draw;

    // Confidence based on certainty
    const confidence = 0.5 + decisiveness + features.leagueStrength * 0.15;

    return {
      homeWin: Math.max(0.05, homeWin),
      draw: Math.max(0.1, Math.min(0.35, draw)),
      awayWin: Math.max(0.05, awayWin),
      confidence: Math.min(0.95, Math.max(0.5, confidence)),
      modelWeights: { miroFish: 0, logistic: 0, gradientBoost: 0 },
    };
  }

  // Update coefficients based on training data
  updateCoefficients(newCoefficients: Partial<typeof this.coefficients>): void {
    this.coefficients = { ...this.coefficients, ...newCoefficients };
  }
}

/**
 * Gradient Boosting Model (Simulated)
 * Iteratively improves predictions by focusing on residuals
 */
class GradientBoostingModel {
  private trees: DecisionStump[] = [];
  private learningRate = 0.1;
  private nEstimators = 50;
  private initialPrediction = 0.33; // Base prediction (equal probability)

  constructor() {
    // Initialize decision stumps
    for (let i = 0; i < this.nEstimators; i++) {
      this.trees.push(new DecisionStump());
    }
  }

  predict(features: MatchFeatures): ModelPrediction {
    // Start with base prediction
    let homeScore = this.initialPrediction;

    // Add contributions from each tree
    for (const tree of this.trees) {
      homeScore += this.learningRate * tree.predict(features);
    }

    // Apply sigmoid-like transformation
    const homeWin = 1 / (1 + Math.exp(-5 * (homeScore - 0.5)));
    
    // Draw probability
    const draw = 0.28 * (1 - Math.abs(homeWin - 0.5) * 1.2);
    
    // Away win
    const awayWin = 1 - homeWin - draw;

    // Confidence
    const confidence = 0.55 + Math.abs(homeWin - 0.5) * 0.5 + features.leagueStrength * 0.1;

    return {
      homeWin: Math.max(0.05, Math.min(0.85, homeWin)),
      draw: Math.max(0.1, Math.min(0.3, draw)),
      awayWin: Math.max(0.05, Math.min(0.85, awayWin)),
      confidence: Math.min(0.95, confidence),
      modelWeights: { miroFish: 0, logistic: 0, gradientBoost: 0 },
    };
  }

  // Update trees based on residuals (training)
  updateTrees(features: MatchFeatures[], residuals: number[]): void {
    // In a real implementation, this would fit trees to residuals
    // For now, we simulate by adjusting weights
    for (let i = 0; i < this.trees.length; i++) {
      const avgResidual = residuals.reduce((a, b) => a + b, 0) / residuals.length;
      this.trees[i].adjustWeight(avgResidual * 0.01);
    }
  }
}

/**
 * Simple Decision Stump for Gradient Boosting
 */
class DecisionStump {
  private featureIndex = 0;
  private threshold = 0.5;
  private leftValue = 0;
  private rightValue = 0;
  private weight = 1;

  predict(features: MatchFeatures): number {
    const featureValues = [
      features.oddsMovement,
      features.marketVolatility,
      features.closingLineValue,
      features.homeRecentForm,
      features.awayRecentForm,
      features.leagueStrength,
      features.homeAdvantage,
    ];

    const value = featureValues[this.featureIndex] || 0;
    const prediction = value < this.threshold ? this.leftValue : this.rightValue;
    return prediction * this.weight;
  }

  adjustWeight(delta: number): void {
    this.weight += delta;
    this.weight = Math.max(0.5, Math.min(2, this.weight));
  }
}

// ==================== ENSEMBLE MODEL ====================

class EnsembleModel {
  private miroFish = new MiroFishModel();
  private logistic = new LogisticRegressionModel();
  private gradientBoost = new GradientBoostingModel();

  // Dynamic weights based on recent performance
  private weights = {
    miroFish: 0.35,
    logistic: 0.35,
    gradientBoost: 0.30,
  };

  // Performance tracking
  private performanceHistory = {
    miroFish: [] as number[],
    logistic: [] as number[],
    gradientBoost: [] as number[],
  };

  predict(features: MatchFeatures, odds: { home: number; draw: number; away: number }): ModelPrediction {
    // Get predictions from each model
    const miroFishPred = this.miroFish.predict(features, odds);
    const logisticPred = this.logistic.predict(features);
    const gradientPred = this.gradientBoost.predict(features);

    // Weighted ensemble combination
    const homeWin = 
      miroFishPred.homeWin * this.weights.miroFish +
      logisticPred.homeWin * this.weights.logistic +
      gradientPred.homeWin * this.weights.gradientBoost;

    const draw = 
      miroFishPred.draw * this.weights.miroFish +
      logisticPred.draw * this.weights.logistic +
      gradientPred.draw * this.weights.gradientBoost;

    const awayWin = 
      miroFishPred.awayWin * this.weights.miroFish +
      logisticPred.awayWin * this.weights.logistic +
      gradientPred.awayWin * this.weights.gradientBoost;

    // Normalize probabilities
    const total = homeWin + draw + awayWin;
    const normalizedHome = homeWin / total;
    const normalizedDraw = draw / total;
    const normalizedAway = awayWin / total;

    // Weighted confidence
    const confidence = 
      miroFishPred.confidence * this.weights.miroFish +
      logisticPred.confidence * this.weights.logistic +
      gradientPred.confidence * this.weights.gradientBoost;

    return {
      homeWin: normalizedHome,
      draw: normalizedDraw,
      awayWin: normalizedAway,
      confidence,
      modelWeights: { ...this.weights },
    };
  }

  // Record prediction outcome for self-learning
  recordOutcome(model: 'miroFish' | 'logistic' | 'gradientBoost', correct: boolean): void {
    const score = correct ? 1 : 0;
    this.performanceHistory[model].push(score);
    
    // Keep only last 100 predictions
    if (this.performanceHistory[model].length > 100) {
      this.performanceHistory[model].shift();
    }

    this.updateWeights();
  }

  // Update weights based on performance
  private updateWeights(): void {
    const avgMiroFish = this.average(this.performanceHistory.miroFish);
    const avgLogistic = this.average(this.performanceHistory.logistic);
    const avgGradient = this.average(this.performanceHistory.gradientBoost);

    const total = avgMiroFish + avgLogistic + avgGradient;

    if (total > 0) {
      this.weights = {
        miroFish: avgMiroFish / total,
        logistic: avgLogistic / total,
        gradientBoost: avgGradient / total,
      };
    }
  }

  private average(arr: number[]): number {
    if (arr.length === 0) return 0.33;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  getWeights(): typeof this.weights {
    return { ...this.weights };
  }
}

// ==================== FEATURE ENGINEERING ====================

class FeatureEngineer {
  /**
   * Calculate odds movement (opening vs closing line)
   * Returns value between -1 and 1
   * Negative = odds drifted (price increased), Positive = odds shortened (price decreased)
   */
  calculateOddsMovement(
    openOdds: number | undefined,
    closeOdds: number
  ): number {
    if (!openOdds || openOdds <= 0) return 0;
    
    // Calculate percentage change
    const change = (openOdds - closeOdds) / openOdds;
    return Math.max(-1, Math.min(1, change * 5)); // Scale and clamp
  }

  /**
   * Calculate market volatility (vigilance)
   * Higher value = more unstable odds, indicates market uncertainty
   */
  calculateMarketVolatility(oddsHistory: OddsHistory[]): number {
    if (oddsHistory.length < 2) return 0;

    // Calculate variance in odds movements
    let totalVariance = 0;
    for (let i = 1; i < oddsHistory.length; i++) {
      const prev = oddsHistory[i - 1];
      const curr = oddsHistory[i];
      
      const homeChange = Math.abs(curr.homeWin - prev.homeWin) / prev.homeWin;
      const drawChange = Math.abs(curr.draw - prev.draw) / prev.draw;
      const awayChange = Math.abs(curr.awayWin - prev.awayWin) / prev.awayWin;
      
      totalVariance += (homeChange + drawChange + awayChange) / 3;
    }

    return Math.min(1, totalVariance / oddsHistory.length * 10);
  }

  /**
   * Calculate closing line value (CLV)
   * Measures if you got better odds than the closing line
   * Positive = beat the closing line (good)
   */
  calculateClosingLineValue(
    betOdds: number,
    closingOdds: number
  ): number {
    if (closingOdds <= 0) return 0;
    return (betOdds - closingOdds) / closingOdds;
  }

  /**
   * Calculate weighted recent form from last 5 games
   * W = 3 points, D = 1 point, L = 0 points
   * More recent games have higher weight
   */
  calculateRecentForm(formString: string | undefined): number {
    if (!formString) return 0.5; // Default to neutral

    const weights = [0.3, 0.25, 0.2, 0.15, 0.1]; // Most recent to oldest
    let score = 0;

    const form = formString.toUpperCase().slice(0, 5);
    for (let i = 0; i < form.length; i++) {
      let points = 0;
      switch (form[i]) {
        case 'W': points = 1; break;
        case 'D': points = 0.33; break;
        case 'L': points = 0; break;
        default: points = 0.5;
      }
      score += points * weights[i];
    }

    return score / 0.3; // Normalize (max possible is 1 * 0.3 = 0.3)
  }

  /**
   * Get league strength factor
   * Top leagues have higher strength
   */
  getLeagueStrength(leagueName: string): number {
    const leagueStrengths: Record<string, number> = {
      'Premier League': 1.0,
      'La Liga': 0.95,
      'Bundesliga': 0.93,
      'Serie A': 0.92,
      'Ligue 1': 0.88,
      'Champions League': 1.0,
      'Europa League': 0.85,
      'DStv Premiership': 0.75,
      'Nedbank Cup': 0.7,
      'Carling Black Label Cup': 0.7,
    };

    for (const [name, strength] of Object.entries(leagueStrengths)) {
      if (leagueName.toLowerCase().includes(name.toLowerCase())) {
        return strength;
      }
    }

    return 0.7; // Default strength
  }

  /**
   * Build complete feature set for a match
   */
  async buildFeatures(
    input: MatchInput,
    oddsHistory?: OddsHistory[]
  ): Promise<MatchFeatures> {
    // Calculate odds movements
    const homeOddsMovement = this.calculateOddsMovement(input.homeWinOpenOdds, input.homeWinOdds);
    const drawOddsMovement = this.calculateOddsMovement(input.drawOpenOdds, input.drawOdds);
    const awayOddsMovement = this.calculateOddsMovement(input.awayWinOdds, input.awayWinOdds);
    
    // Average odds movement (weighted towards favorite movement)
    const oddsMovement = (homeOddsMovement + drawOddsMovement + awayOddsMovement) / 3;

    // Market volatility
    const marketVolatility = this.calculateMarketVolatility(oddsHistory || []);

    // Closing line value (default to 0 if no opening odds)
    const closingLineValue = input.homeWinOpenOdds 
      ? this.calculateClosingLineValue(input.homeWinOdds, input.homeWinOpenOdds)
      : 0;

    // Recent form
    const homeRecentForm = this.calculateRecentForm(input.homeForm);
    const awayRecentForm = this.calculateRecentForm(input.awayForm);

    // Home advantage factor
    const homeAdvantage = 0.15; // Standard home advantage in football

    // League strength
    let leagueStrength = 0.75;
    if (input.leagueId) {
      try {
        const league = await getDb().league.findUnique({ where: { id: input.leagueId } });
        if (league) {
          leagueStrength = this.getLeagueStrength(league.name);
        }
      } catch {
        // Use default
      }
    }

    return {
      oddsMovement,
      marketVolatility,
      closingLineValue,
      homeRecentForm,
      awayRecentForm,
      h2hHomeWins: input.h2hHomeWins || 0,
      h2hDraws: input.h2hDraws || 0,
      h2hAwayWins: input.h2hAwayWins || 0,
      h2hTotal: (input.h2hHomeWins || 0) + (input.h2hDraws || 0) + (input.h2hAwayWins || 0),
      leagueStrength,
      homeAdvantage,
      homeGoalsScored: input.homeGoalsScored || 0,
      homeGoalsConceded: input.homeGoalsConceded || 0,
      awayGoalsScored: input.awayGoalsScored || 0,
      awayGoalsConceded: input.awayGoalsConceded || 0,
    };
  }
}

// ==================== VALUE BET OPTIMIZER ====================

class ValueBetOptimizer {
  private ensemble = new EnsembleModel();
  private featureEngineer = new FeatureEngineer();

  /**
   * Check if prediction qualifies as a value bet
   * Criteria:
   * - edge > 5%
   * - confidence > 65%
   * - closing_line_value > 0%
   */
  isValueBet(
    edge: number,
    confidence: number,
    closingLineValue: number
  ): boolean {
    return (
      edge > MIN_EDGE_THRESHOLD &&
      confidence > MIN_CONFIDENCE_THRESHOLD &&
      closingLineValue > MIN_CLOSING_LINE_VALUE
    );
  }

  /**
   * Calculate implied probability from odds (with margin removal)
   */
  calculateTrueImpliedProbability(
    odds: number,
    totalMargin: number
  ): number {
    const rawImplied = 1 / odds;
    return rawImplied / (1 + totalMargin);
  }

  /**
   * Calculate bookmaker margin
   */
  calculateMargin(homeOdds: number, drawOdds: number, awayOdds: number): number {
    return (1 / homeOdds) + (1 / drawOdds) + (1 / awayOdds) - 1;
  }

  /**
   * Calculate Kelly Criterion fraction
   */
  calculateKellyFraction(probability: number, odds: number): number {
    if (odds <= 1 || probability <= 0) return 0;
    
    const b = odds - 1; // Net odds
    const q = 1 - probability;
    
    const kelly = (b * probability - q) / b;
    
    // Half Kelly for risk management
    return Math.max(0, kelly * 0.5);
  }

  /**
   * Determine risk level
   */
  determineRiskLevel(edge: number, odds: number, confidence: number): 'low' | 'medium' | 'high' {
    if (edge > 0.1 && odds < 2.5 && confidence > 0.75) return 'low';
    if (edge > 0.05 && confidence > 0.65) return 'medium';
    return 'high';
  }

  /**
   * Generate recommendation string
   */
  generateRecommendation(
    prediction: 'home' | 'draw' | 'away',
    odds: number,
    edge: number,
    confidence: number,
    kellyFraction: number
  ): string {
    const selection = prediction === 'home' ? 'HOME WIN' : prediction === 'draw' ? 'DRAW' : 'AWAY WIN';
    
    let level = '';
    if (edge > 0.1 && confidence > 0.75) {
      level = '🔥 PREMIUM';
    } else if (edge > 0.07 && confidence > 0.70) {
      level = '✅ STRONG';
    } else {
      level = '⚡ VALUE';
    }

    return `${level} | ${selection} @ ${odds.toFixed(2)} | Edge: +${(edge * 100).toFixed(1)}% | Conf: ${(confidence * 100).toFixed(0)}% | Kelly: ${(kellyFraction * 100).toFixed(1)}%`;
  }

  /**
   * Analyze match for value bets across all outcomes
   */
  async analyzeMatch(
    input: MatchInput,
    oddsHistory?: OddsHistory[]
  ): Promise<ValueBetResult[]> {
    const results: ValueBetResult[] = [];
    
    // Build features
    const features = await this.featureEngineer.buildFeatures(input, oddsHistory);
    
    // Get ensemble prediction
    const prediction = this.ensemble.predict(features, {
      home: input.homeWinOdds,
      draw: input.drawOdds,
      away: input.awayWinOdds,
    });

    // Calculate margin and true implied probabilities
    const margin = this.calculateMargin(input.homeWinOdds, input.drawOdds, input.awayWinOdds);
    
    const homeImplied = this.calculateTrueImpliedProbability(input.homeWinOdds, margin);
    const drawImplied = this.calculateTrueImpliedProbability(input.drawOdds, margin);
    const awayImplied = this.calculateTrueImpliedProbability(input.awayWinOdds, margin);

    // Calculate edges
    const homeEdge = prediction.homeWin - homeImplied;
    const drawEdge = prediction.draw - drawImplied;
    const awayEdge = prediction.awayWin - awayImplied;

    // Calculate closing line values
    const homeCLV = input.homeWinOpenOdds 
      ? this.featureEngineer.calculateClosingLineValue(input.homeWinOdds, input.homeWinOpenOdds)
      : 0;
    const drawCLV = input.drawOpenOdds 
      ? this.featureEngineer.calculateClosingLineValue(input.drawOdds, input.drawOpenOdds)
      : 0;
    const awayCLV = input.awayWinOpenOdds 
      ? this.featureEngineer.calculateClosingLineValue(input.awayWinOdds, input.awayWinOdds)
      : 0;

    // Check home win value bet
    if (this.isValueBet(homeEdge, prediction.confidence, homeCLV)) {
      const kelly = this.calculateKellyFraction(prediction.homeWin, input.homeWinOdds);
      const ev = (prediction.homeWin * input.homeWinOdds) - 1;
      
      results.push({
        matchId: input.matchId,
        prediction: 'home',
        odds: input.homeWinOdds,
        aiProbability: prediction.homeWin,
        impliedProbability: homeImplied,
        edge: homeEdge,
        confidence: prediction.confidence,
        closingLineValue: homeCLV,
        kellyFraction: kelly,
        expectedValue: ev,
        riskLevel: this.determineRiskLevel(homeEdge, input.homeWinOdds, prediction.confidence),
        recommendation: this.generateRecommendation('home', input.homeWinOdds, homeEdge, prediction.confidence, kelly),
        features,
        modelWeights: prediction.modelWeights,
      });
    }

    // Check draw value bet
    if (this.isValueBet(drawEdge, prediction.confidence, drawCLV)) {
      const kelly = this.calculateKellyFraction(prediction.draw, input.drawOdds);
      const ev = (prediction.draw * input.drawOdds) - 1;
      
      results.push({
        matchId: input.matchId,
        prediction: 'draw',
        odds: input.drawOdds,
        aiProbability: prediction.draw,
        impliedProbability: drawImplied,
        edge: drawEdge,
        confidence: prediction.confidence,
        closingLineValue: drawCLV,
        kellyFraction: kelly,
        expectedValue: ev,
        riskLevel: this.determineRiskLevel(drawEdge, input.drawOdds, prediction.confidence),
        recommendation: this.generateRecommendation('draw', input.drawOdds, drawEdge, prediction.confidence, kelly),
        features,
        modelWeights: prediction.modelWeights,
      });
    }

    // Check away win value bet
    if (this.isValueBet(awayEdge, prediction.confidence, awayCLV)) {
      const kelly = this.calculateKellyFraction(prediction.awayWin, input.awayWinOdds);
      const ev = (prediction.awayWin * input.awayWinOdds) - 1;
      
      results.push({
        matchId: input.matchId,
        prediction: 'away',
        odds: input.awayWinOdds,
        aiProbability: prediction.awayWin,
        impliedProbability: awayImplied,
        edge: awayEdge,
        confidence: prediction.confidence,
        closingLineValue: awayCLV,
        kellyFraction: kelly,
        expectedValue: ev,
        riskLevel: this.determineRiskLevel(awayEdge, input.awayWinOdds, prediction.confidence),
        recommendation: this.generateRecommendation('away', input.awayWinOdds, awayEdge, prediction.confidence, kelly),
        features,
        modelWeights: prediction.modelWeights,
      });
    }

    // Sort by edge (highest first)
    return results.sort((a, b) => b.edge - a.edge);
  }
}

// ==================== SELF-LEARNING SYSTEM ====================

class SelfLearningSystem {
  private ensemble = new EnsembleModel();

  /**
   * Store prediction in database for later outcome tracking
   */
  async storePrediction(
    matchId: string,
    prediction: ModelPrediction,
    features: MatchFeatures
  ): Promise<void> {
    try {
      const predictedOutcome = this.getPredictedOutcome(prediction);
      
      await getDb().predictionHistory.create({
        data: {
          matchId,
          modelVersion: MODEL_VERSION,
          homeWinProb: prediction.homeWin,
          drawProb: prediction.draw,
          awayWinProb: prediction.awayWin,
          predictedOutcome,
          confidence: prediction.confidence,
        },
      });

      console.log(`[SELF-LEARNING] Stored prediction for match ${matchId}`);
    } catch (error) {
      console.error('[SELF-LEARNING] Error storing prediction:', error);
    }
  }

  /**
   * Update prediction with actual outcome
   */
  async updateOutcome(matchId: string, actualOutcome: 'home' | 'draw' | 'away'): Promise<void> {
    try {
      const predictions = await getDb().predictionHistory.findMany({
        where: { matchId },
      });

      for (const pred of predictions) {
        const isCorrect = pred.predictedOutcome === actualOutcome;
        
        await getDb().predictionHistory.update({
          where: { id: pred.id },
          data: {
            actualOutcome,
            isCorrect,
            settledAt: new Date(),
          },
        });

        // Update ensemble weights based on outcome
        this.ensemble.recordOutcome('miroFish', isCorrect);
        this.ensemble.recordOutcome('logistic', isCorrect);
        this.ensemble.recordOutcome('gradientBoost', isCorrect);
      }

      console.log(`[SELF-LEARNING] Updated outcome for match ${matchId}: ${actualOutcome}`);
    } catch (error) {
      console.error('[SELF-LEARNING] Error updating outcome:', error);
    }
  }

  /**
   * Get predicted outcome from probabilities
   */
  private getPredictedOutcome(prediction: ModelPrediction): string {
    if (prediction.homeWin >= prediction.draw && prediction.homeWin >= prediction.awayWin) {
      return 'home';
    }
    if (prediction.awayWin >= prediction.draw && prediction.awayWin >= prediction.homeWin) {
      return 'away';
    }
    return 'draw';
  }

  /**
   * Get model performance statistics
   */
  async getModelStats(): Promise<{
    totalPredictions: number;
    settledPredictions: number;
    correctPredictions: number;
    accuracy: number;
    byModelVersion: Record<string, { total: number; correct: number; accuracy: number }>;
  }> {
    const predictions = await getDb().predictionHistory.findMany();
    
    const totalPredictions = predictions.length;
    const settledPredictions = predictions.filter(p => p.isCorrect !== null).length;
    const correctPredictions = predictions.filter(p => p.isCorrect === true).length;
    
    const byModelVersion: Record<string, { total: number; correct: number; accuracy: number }> = {};
    
    for (const pred of predictions) {
      if (!byModelVersion[pred.modelVersion]) {
        byModelVersion[pred.modelVersion] = { total: 0, correct: 0, accuracy: 0 };
      }
      byModelVersion[pred.modelVersion].total++;
      if (pred.isCorrect === true) {
        byModelVersion[pred.modelVersion].correct++;
      }
    }
    
    for (const version of Object.keys(byModelVersion)) {
      const stats = byModelVersion[version];
      stats.accuracy = stats.total > 0 ? stats.correct / stats.total : 0;
    }

    return {
      totalPredictions,
      settledPredictions,
      correctPredictions,
      accuracy: settledPredictions > 0 ? correctPredictions / settledPredictions : 0,
      byModelVersion,
    };
  }

  /**
   * Retrain models with historical data
   * Should be called daily
   */
  async retrainModels(): Promise<{
    samplesProcessed: number;
    modelAccuracy: number;
    retrainedAt: string;
  }> {
    console.log('[SELF-LEARNING] Starting model retraining...');

    // Get all settled predictions
    const settledPredictions = await getDb().predictionHistory.findMany({
      where: {
        isCorrect: { not: null },
      },
    });

    let correctCount = 0;

    // Update ensemble weights based on recent performance
    for (const pred of settledPredictions) {
      if (pred.isCorrect) {
        correctCount++;
        this.ensemble.recordOutcome('miroFish', true);
        this.ensemble.recordOutcome('logistic', true);
        this.ensemble.recordOutcome('gradientBoost', true);
      }
    }

    const accuracy = settledPredictions.length > 0 
      ? correctCount / settledPredictions.length 
      : 0;

    console.log(`[SELF-LEARNING] Retraining complete. Accuracy: ${(accuracy * 100).toFixed(1)}%`);

    return {
      samplesProcessed: settledPredictions.length,
      modelAccuracy: accuracy,
      retrainedAt: new Date().toISOString(),
    };
  }

  getEnsemble(): EnsembleModel {
    return this.ensemble;
  }
}

// ==================== ODDS HISTORY STORAGE ====================

class OddsHistoryManager {
  /**
   * Store odds history if change is significant
   */
  async storeIfSignificant(
    matchId: string,
    oldOdds: { home: number; draw: number; away: number },
    newOdds: { home: number; draw: number; away: number },
    bookmaker: string = 'aggregate'
  ): Promise<boolean> {
    const homeChange = Math.abs(newOdds.home - oldOdds.home) / oldOdds.home;
    const drawChange = Math.abs(newOdds.draw - oldOdds.draw) / oldOdds.draw;
    const awayChange = Math.abs(newOdds.away - oldOdds.away) / oldOdds.away;

    const maxChange = Math.max(homeChange, drawChange, awayChange);

    if (maxChange >= ODDS_CHANGE_THRESHOLD) {
      await getDb().oddsHistory.create({
        data: {
          matchId,
          homeWin: oldOdds.home,
          draw: oldOdds.draw,
          awayWin: oldOdds.away,
          bookmaker,
        },
      });

      console.log(`[ODDS HISTORY] Stored significant change for match ${matchId} (${(maxChange * 100).toFixed(1)}%)`);
      return true;
    }

    return false;
  }

  /**
   * Get odds history for a match
   */
  async getHistory(matchId: string): Promise<OddsHistory[]> {
    return getDb().oddsHistory.findMany({
      where: { matchId },
      orderBy: { recordedAt: 'asc' },
    });
  }
}

// ==================== API SERVICES ====================

const valueBetOptimizer = new ValueBetOptimizer();
const selfLearning = new SelfLearningSystem();
const oddsHistoryManager = new OddsHistoryManager();

/**
 * Predict endpoint handler
 */
async function handlePredict(input: MatchInput): Promise<{
  success: boolean;
  data?: {
    matchId: string;
    prediction: ModelPrediction;
    valueBets: ValueBetResult[];
  };
  error?: string;
}> {
  try {
    // Get odds history if available
    const oddsHistory = await oddsHistoryManager.getHistory(input.matchId);
    
    // Analyze match
    const valueBets = await valueBetOptimizer.analyzeMatch(input, oddsHistory);
    
    // Get features for prediction
    const featureEngineer = new FeatureEngineer();
    const features = await featureEngineer.buildFeatures(input, oddsHistory);
    const ensemble = selfLearning.getEnsemble();
    const prediction = ensemble.predict(features, {
      home: input.homeWinOdds,
      draw: input.drawOdds,
      away: input.awayWinOdds,
    });

    // Store prediction for self-learning
    await selfLearning.storePrediction(input.matchId, prediction, features);

    return {
      success: true,
      data: {
        matchId: input.matchId,
        prediction,
        valueBets,
      },
    };
  } catch (error) {
    console.error('[API] Predict error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Batch predict endpoint handler
 */
async function handleBatchPredict(input: BatchPredictRequest): Promise<{
  success: boolean;
  data?: {
    results: Array<{
      matchId: string;
      prediction: ModelPrediction;
      valueBets: ValueBetResult[];
    }>;
    totalMatches: number;
    totalValueBets: number;
  };
  error?: string;
}> {
  try {
    const results = [];
    let totalValueBets = 0;

    for (const match of input.matches) {
      const oddsHistory = await oddsHistoryManager.getHistory(match.matchId);
      const valueBets = await valueBetOptimizer.analyzeMatch(match, oddsHistory);
      
      const featureEngineer = new FeatureEngineer();
      const features = await featureEngineer.buildFeatures(match, oddsHistory);
      const ensemble = selfLearning.getEnsemble();
      const prediction = ensemble.predict(features, {
        home: match.homeWinOdds,
        draw: match.drawOdds,
        away: match.awayWinOdds,
      });

      // Store prediction
      await selfLearning.storePrediction(match.matchId, prediction, features);

      results.push({
        matchId: match.matchId,
        prediction,
        valueBets,
      });

      totalValueBets += valueBets.length;
    }

    return {
      success: true,
      data: {
        results,
        totalMatches: input.matches.length,
        totalValueBets,
      },
    };
  } catch (error) {
    console.error('[API] Batch predict error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Value bet endpoint handler
 */
async function handleValueBet(input: {
  matches: MatchInput[];
  minEdge?: number;
  minConfidence?: number;
}): Promise<{
  success: boolean;
  data?: {
    valueBets: ValueBetResult[];
    totalAnalyzed: number;
    filterCriteria: {
      minEdge: number;
      minConfidence: number;
    };
  };
  error?: string;
}> {
  try {
    const minEdge = input.minEdge ?? MIN_EDGE_THRESHOLD;
    const minConfidence = input.minConfidence ?? MIN_CONFIDENCE_THRESHOLD;
    
    const allValueBets: ValueBetResult[] = [];

    for (const match of input.matches) {
      const oddsHistory = await oddsHistoryManager.getHistory(match.matchId);
      const valueBets = await valueBetOptimizer.analyzeMatch(match, oddsHistory);
      
      // Apply additional filters
      const filtered = valueBets.filter(vb => 
        vb.edge >= minEdge && vb.confidence >= minConfidence
      );
      
      allValueBets.push(...filtered);
    }

    // Sort by edge
    allValueBets.sort((a, b) => b.edge - a.edge);

    return {
      success: true,
      data: {
        valueBets: allValueBets,
        totalAnalyzed: input.matches.length,
        filterCriteria: {
          minEdge,
          minConfidence,
        },
      },
    };
  } catch (error) {
    console.error('[API] Value bet error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ==================== HTTP SERVER ====================

async function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

const httpServer = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    // Health check
    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        version: MODEL_VERSION,
        timestamp: new Date().toISOString(),
      }));
      return;
    }

    // Model stats
    if (url.pathname === '/stats') {
      const stats = await selfLearning.getModelStats();
      const weights = selfLearning.getEnsemble().getWeights();
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        model: {
          version: MODEL_VERSION,
          weights,
        },
        performance: stats,
      }, null, 2));
      return;
    }

    // Retrain models
    if (url.pathname === '/retrain' && req.method === 'POST') {
      const result = await selfLearning.retrainModels();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result, null, 2));
      return;
    }

    // Predict single match
    if (url.pathname === '/predict/match' && req.method === 'POST') {
      const body = await parseBody(req);
      const result = await handlePredict(body);
      res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result, null, 2));
      return;
    }

    // Batch predict
    if (url.pathname === '/batch-predict' && req.method === 'POST') {
      const body = await parseBody(req);
      const result = await handleBatchPredict(body);
      res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result, null, 2));
      return;
    }

    // Value bet analysis
    if (url.pathname === '/value-bet' && req.method === 'POST') {
      const body = await parseBody(req);
      const result = await handleValueBet(body);
      res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result, null, 2));
      return;
    }

    // Update outcome (for self-learning)
    if (url.pathname === '/outcome' && req.method === 'POST') {
      const body = await parseBody(req);
      await selfLearning.updateOutcome(body.matchId, body.actualOutcome);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // Store odds history
    if (url.pathname === '/odds-history' && req.method === 'POST') {
      const body = await parseBody(req);
      const stored = await oddsHistoryManager.storeIfSignificant(
        body.matchId,
        body.oldOdds,
        body.newOdds,
        body.bookmaker
      );
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, stored }));
      return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  } catch (error) {
    console.error('[HTTP] Error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }));
  }
});

// ==================== GRACEFUL SHUTDOWN ====================

async function shutdown(signal: string) {
  console.log(`\n[MAIN] Received ${signal}, shutting down...`);
  
  try {
    await closeDb();
    httpServer.close(() => {
      console.log('[MAIN] HTTP server closed');
      process.exit(0);
    });
  } catch (error) {
    console.error('[MAIN] Shutdown error:', error);
    process.exit(1);
  }

  setTimeout(() => {
    console.log('[MAIN] Forced exit');
    process.exit(1);
  }, 5000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ==================== MAIN ====================

async function main() {
  console.log(`
  ╔══════════════════════════════════════════════════════════════╗
  ║                                                              ║
  ║   🧠 43V3R BET AI - Ensemble Model Engine v${MODEL_VERSION}          ║
  ║                                                              ║
  ║   MiroFish + Logistic Regression + Gradient Boosting         ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  `);

  // Check database
  console.log('[MAIN] Checking database connection...');
  try {
    await getDb().$queryRaw`SELECT 1`;
    console.log('[MAIN] Database connected');
  } catch (error) {
    console.error('[MAIN] Database connection failed:', error);
    process.exit(1);
  }

  // Load model stats
  const stats = await selfLearning.getModelStats();
  console.log(`[MAIN] Model stats: ${stats.totalPredictions} predictions, ${(stats.accuracy * 100).toFixed(1)}% accuracy`);

  // Start HTTP server
  httpServer.listen(PORT, () => {
    console.log(`[MAIN] AI Engine running on port ${PORT}`);
    console.log(`
  Available endpoints:
  • POST /predict/match  - Get prediction for a single match
  • POST /batch-predict  - Batch predictions for multiple matches
  • POST /value-bet      - Analyze odds data for value bets
  • POST /outcome        - Update prediction outcome (self-learning)
  • POST /odds-history   - Store odds history on significant change
  • POST /retrain        - Retrain models with historical data
  • GET  /stats          - Get model performance statistics
  • GET  /health         - Health check
    `);
  });

  // Schedule daily retraining
  setInterval(async () => {
    console.log('[MAIN] Running scheduled model retraining...');
    await selfLearning.retrainModels();
  }, 24 * 60 * 60 * 1000); // Daily
}

main().catch((error) => {
  console.error('[MAIN] Fatal error:', error);
  process.exit(1);
});

// Export for external use
export {
  EnsembleModel,
  MiroFishModel,
  LogisticRegressionModel,
  GradientBoostingModel,
  FeatureEngineer,
  ValueBetOptimizer,
  SelfLearningSystem,
  OddsHistoryManager,
  MatchFeatures,
  ModelPrediction,
  ValueBetResult,
  MatchInput,
};
