// 43V3R BET AI - Type Definitions

// ==================== USER TYPES ====================

export interface User {
  id: string;
  email: string;
  username: string;
  name?: string;
  avatar?: string;
  role: 'user' | 'tipster' | 'admin';
  createdAt: Date;
  wallet?: Wallet;
  tipsterProfile?: Tipster;
}

export interface Wallet {
  id: string;
  balance: number;
  virtualBalance: number;
  totalProfit: number;
  totalBets: number;
  winRate: number;
  roi: number;
}

// ==================== MATCH TYPES ====================

export interface Match {
  id: string;
  league: League;
  homeTeam: Team;
  awayTeam: Team;
  kickoffTime: Date;
  status: 'scheduled' | 'live' | 'finished' | 'postponed';
  homeScore?: number;
  awayScore?: number;
  minute?: number;
  odds?: Odds;
  predictions?: Prediction[];
}

export interface League {
  id: string;
  name: string;
  country: string;
  logo?: string;
  isActive: boolean;
}

export interface Team {
  id: string;
  name: string;
  logo?: string;
  country?: string;
  form?: string;
  goalsScored: number;
  goalsConceded: number;
}

export interface Odds {
  id: string;
  homeWin: number;
  draw: number;
  awayWin: number;
  over25?: number;
  under25?: number;
  bttsYes?: number;
  bttsNo?: number;
  homeDraw?: number;
  homeAway?: number;
  drawAway?: number;
  bookmaker: string;
  homeWinOpen?: number;
  drawOpen?: number;
  awayWinOpen?: number;
}

// ==================== PREDICTION TYPES ====================

export interface Prediction {
  id: string;
  matchId: string;
  match?: Match;
  userId?: string;
  user?: User;
  
  // AI Predictions
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  
  // Outcome
  prediction: 'home' | 'draw' | 'away';
  confidence: number;
  
  // Value Bet
  isValueBet: boolean;
  edge: number;
  kellyFraction: number;
  
  // Result
  result?: 'win' | 'loss' | 'pending';
  
  // Premium
  isPremium: boolean;
  price?: number;
}

export interface ValueBet extends Prediction {
  impliedProb: number;
  odds: number;
  expectedValue: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendation: string;
}

// ==================== TIPSTER TYPES ====================

export interface Tipster {
  id: string;
  userId: string;
  user?: User;
  displayName: string;
  bio?: string;
  avatar?: string;
  isVerified: boolean;
  isFeatured: boolean;
  
  // Stats
  totalTips: number;
  wins: number;
  losses: number;
  roi: number;
  yield: number;
  winRate: number;
  avgOdds: number;
  profit: number;
  
  // Pricing
  monthlyPrice: number;
  weeklyPrice: number;
  singleTipPrice: number;
  followersCount: number;
}

export interface Tip {
  id: string;
  tipsterId: string;
  tipster?: Tipster;
  matchId: string;
  prediction: string;
  odds: number;
  stake: number;
  reasoning?: string;
  isPremium: boolean;
  isFree: boolean;
  result?: 'win' | 'loss' | 'void' | 'pending';
  likes?: Like[];
  comments?: Comment[];
}

export interface Subscription {
  id: string;
  userId: string;
  tipsterId?: string;
  tipster?: Tipster;
  type: 'weekly' | 'monthly' | 'yearly' | 'lifetime';
  tier: 'free' | 'pro' | 'premium';
  status: 'active' | 'cancelled' | 'expired' | 'pending_payment';
  startDate: Date;
  endDate: Date;
  price: number;
  amount: number;
  currency: string;
  paymentMethod?: string;
  externalRef?: string;
  paymentId?: string;
  autoRenew: boolean;
  contentAccess: 'basic' | 'pro' | 'premium' | 'full';
  features?: string;
  isActive: boolean;
  trialStart?: Date;
  trialEnd?: Date;
  isTrialActive: boolean;
  discountCode?: string;
  discountPercent?: number;
  expiryNotified: boolean;
  renewalNotified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionTier {
  id: string;
  name: string;
  displayName: string;
  price: number;
  currency: string;
  duration: number; // in days
  features: string[];
  contentAccess: 'basic' | 'pro' | 'premium' | 'full';
  maxTipsterSubscriptions: number;
  maxDailyBets: number;
  supportLevel: 'basic' | 'priority' | 'vip';
  analyticsAccess: boolean;
  copyBettingEnabled: boolean;
  aiPredictionsEnabled: boolean;
  premiumTipsEnabled: boolean;
}

export interface CopyBetSetting {
  id: string;
  userId: string;
  tipsterId: string;
  stakeMultiplier: number;
  maxStake: number;
  minStake: number;
  fixedStake?: number;
  maxDailySpend: number;
  maxOdds: number;
  minOdds: number;
  stopLoss?: number;
  allowedBetTypes?: string[];
  allowedLeagues?: string[];
  activeHours?: { start: string; end: string };
  isActive: boolean;
  copyCount: number;
  totalProfit: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: 'free' | 'pro' | 'premium';
  type: 'weekly' | 'monthly' | 'yearly' | 'lifetime';
  price: number;
  currency: string;
  features: string[];
  highlighted?: boolean;
  discount?: number;
  originalPrice?: number;
}

// ==================== BET TYPES ====================

export interface Bet {
  id: string;
  userId: string;
  matchId: string;
  match?: Match;
  betType: string;
  odds: number;
  stake: number;
  potentialWin: number;
  status: 'pending' | 'won' | 'lost' | 'void';
  result?: string;
  isSimulation: boolean;
  createdAt: Date;
}

export interface BetSlipItem {
  matchId: string;
  match: Match;
  betType: string;
  odds: number;
  selection: string;
}

// ==================== SOCIAL TYPES ====================

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
}

export interface Like {
  id: string;
  userId: string;
  tipId: string;
}

export interface Comment {
  id: string;
  userId: string;
  user?: User;
  tipId: string;
  content: string;
  createdAt: Date;
}

// ==================== TRANSACTION TYPES ====================

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'bet' | 'win' | 'subscription' | 'commission';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  description?: string;
  referenceId?: string;
  paymentMethod?: string;
  createdAt: Date;
}

// ==================== LEADERBOARD TYPES ====================

export interface LeaderboardEntry {
  id: string;
  userId: string;
  user?: User;
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
  profit: number;
  winRate: number;
  totalBets: number;
  rank?: number;
}

// ==================== AI ENGINE TYPES ====================

export interface MatchFeatures {
  homeForm: number;
  awayForm: number;
  homeGoalsScored: number;
  awayGoalsScored: number;
  homeGoalsConceded: number;
  awayGoalsConceded: number;
  homeAdvantage: number;
  h2hHomeWins: number;
  h2hDraws: number;
  h2hAwayWins: number;
  oddsMovement: number;
  leagueStrength: number;
}

export interface AIModelOutput {
  homeWin: number;
  draw: number;
  awayWin: number;
  confidence: number;
}

export interface ValueBetAnalysis {
  prediction: Prediction;
  impliedProb: number;
  aiProb: number;
  edge: number;
  kellyFraction: number;
  riskLevel: 'low' | 'medium' | 'high';
  expectedROI: number;
}

// ==================== API RESPONSE TYPES ====================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
