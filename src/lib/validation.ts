// 43V3R BET AI - Zod Validation Schemas

import { z } from 'zod';

// ==================== COMMON SCHEMAS ====================

/**
 * Common pagination schema
 */
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * ID parameter schema
 */
export const IdSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

/**
 * Date range schema
 */
export const DateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine((data) => data.startDate <= data.endDate, {
  message: 'Start date must be before or equal to end date',
});

// ==================== USER SCHEMAS ====================

/**
 * User registration schema
 */
export const UserRegistrationSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().max(50).optional(),
});

/**
 * User login schema
 */
export const UserLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * User profile update schema
 */
export const UserProfileUpdateSchema = z.object({
  name: z.string().max(50).optional(),
  avatar: z.string().url().optional(),
  username: z.string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional(),
});

// ==================== MATCH SCHEMAS ====================

/**
 * Match status enum
 */
export const MatchStatusSchema = z.enum(['scheduled', 'live', 'finished', 'postponed']);

/**
 * Match filter schema for querying matches
 */
export const MatchFilterSchema = z.object({
  // Pagination
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  
  // Filters
  status: MatchStatusSchema.optional(),
  leagueId: z.string().optional(),
  teamId: z.string().optional(),
  
  // Date filters
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  
  // Sorting
  sortBy: z.enum(['kickoffTime', 'createdAt', 'popularity']).default('kickoffTime'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  
  // Search
  search: z.string().max(100).optional(),
});

/**
 * League schema
 */
export const LeagueSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  country: z.string().min(1).max(100),
  logo: z.string().url().optional(),
  isActive: z.boolean().default(true),
});

/**
 * Team schema
 */
export const TeamSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  logo: z.string().url().optional(),
  country: z.string().max(100).optional(),
  form: z.string().max(10).optional(),
  goalsScored: z.number().int().min(0).default(0),
  goalsConceded: z.number().int().min(0).default(0),
});

/**
 * Odds schema
 */
export const OddsSchema = z.object({
  homeWin: z.number().positive(),
  draw: z.number().positive(),
  awayWin: z.number().positive(),
  over25: z.number().positive().optional(),
  under25: z.number().positive().optional(),
  bttsYes: z.number().positive().optional(),
  bttsNo: z.number().positive().optional(),
  bookmaker: z.string().default('default'),
});

// ==================== BET SCHEMAS ====================

/**
 * Bet type enum
 */
export const BetTypeSchema = z.enum([
  'home',
  'draw',
  'away',
  'over25',
  'under25',
  'btts_yes',
  'btts_no',
  'home_draw',
  'home_away',
  'draw_away',
]);

/**
 * Bet status enum
 */
export const BetStatusSchema = z.enum(['pending', 'won', 'lost', 'void']);

/**
 * Create bet schema
 */
export const CreateBetSchema = z.object({
  matchId: z.string().min(1, 'Match ID is required'),
  betType: BetTypeSchema,
  odds: z.number().positive('Odds must be positive'),
  stake: z.number().positive('Stake must be positive'),
  isSimulation: z.boolean().default(false),
}).refine((data) => data.stake >= 1, {
  message: 'Minimum stake is 1',
});

/**
 * Bet schema (full)
 */
export const BetSchema = z.object({
  id: z.string(),
  userId: z.string(),
  matchId: z.string(),
  betType: z.string(),
  odds: z.number().positive(),
  stake: z.number().positive(),
  potentialWin: z.number().min(0),
  status: BetStatusSchema,
  result: z.string().optional(),
  isSimulation: z.boolean(),
  createdAt: z.coerce.date(),
});

/**
 * Bet slip item schema
 */
export const BetSlipItemSchema = z.object({
  matchId: z.string().min(1),
  betType: BetTypeSchema,
  odds: z.number().positive(),
  selection: z.string(),
});

/**
 * Multi-bet schema (accumulator)
 */
export const MultiBetSchema = z.object({
  items: z.array(BetSlipItemSchema).min(1, 'At least one selection required'),
  stake: z.number().positive('Stake must be positive'),
  isSimulation: z.boolean().default(false),
}).refine((data) => data.items.length <= 20, {
  message: 'Maximum 20 selections allowed in an accumulator',
});

/**
 * Bet filter schema
 */
export const BetFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: BetStatusSchema.optional(),
  betType: BetTypeSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  isSimulation: z.coerce.boolean().optional(),
});

// ==================== PREDICTION SCHEMAS ====================

/**
 * Prediction outcome enum
 */
export const PredictionOutcomeSchema = z.enum(['home', 'draw', 'away']);

/**
 * Risk level enum
 */
export const RiskLevelSchema = z.enum(['low', 'medium', 'high']);

/**
 * Create prediction schema
 */
export const CreatePredictionSchema = z.object({
  matchId: z.string().min(1, 'Match ID is required'),
  prediction: PredictionOutcomeSchema,
  confidence: z.number().min(0).max(100),
  isPremium: z.boolean().default(false),
  price: z.number().min(0).optional(),
}).refine((data) => {
  if (data.isPremium && (!data.price || data.price <= 0)) {
    return false;
  }
  return true;
}, {
  message: 'Premium predictions must have a price greater than 0',
});

/**
 * Prediction schema (full)
 */
export const PredictionSchema = z.object({
  id: z.string(),
  matchId: z.string(),
  userId: z.string().optional(),
  
  // AI predictions
  homeWinProb: z.number().min(0).max(100),
  drawProb: z.number().min(0).max(100),
  awayWinProb: z.number().min(0).max(100),
  
  // Outcome
  prediction: PredictionOutcomeSchema,
  confidence: z.number().min(0).max(100),
  
  // Value bet
  isValueBet: z.boolean(),
  edge: z.number(),
  kellyFraction: z.number(),
  
  // Result
  result: z.enum(['win', 'loss', 'pending']).optional(),
  
  // Premium
  isPremium: z.boolean(),
  price: z.number().optional(),
});

/**
 * Value bet schema
 */
export const ValueBetSchema = z.object({
  matchId: z.string(),
  prediction: PredictionSchema,
  impliedProb: z.number().min(0).max(100),
  odds: z.number().positive(),
  expectedValue: z.number(),
  riskLevel: RiskLevelSchema,
  recommendation: z.string(),
});

/**
 * Prediction filter schema
 */
export const PredictionFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  matchId: z.string().optional(),
  userId: z.string().optional(),
  isPremium: z.coerce.boolean().optional(),
  isValueBet: z.coerce.boolean().optional(),
  minConfidence: z.coerce.number().min(0).max(100).optional(),
  result: z.enum(['win', 'loss', 'pending']).optional(),
});

// ==================== FANTASY TEAM SCHEMAS ====================

/**
 * Player position enum
 */
export const PlayerPositionSchema = z.enum(['goalkeeper', 'defender', 'midfielder', 'forward']);

/**
 * Fantasy player schema
 */
export const FantasyPlayerSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  team: z.string(),
  position: PlayerPositionSchema,
  price: z.number().positive(),
  points: z.number().min(0).default(0),
  form: z.number().min(0).max(10).optional(),
  isSelected: z.boolean().default(false),
});

/**
 * Create fantasy team schema
 */
export const FantasyTeamSchema = z.object({
  name: z.string()
    .min(3, 'Team name must be at least 3 characters')
    .max(30, 'Team name must be at most 30 characters'),
  players: z.array(z.string()).min(11, 'Team must have at least 11 players').max(15, 'Team can have at most 15 players'),
  captain: z.string().min(1, 'Captain is required'),
  viceCaptain: z.string().min(1, 'Vice captain is required'),
  budget: z.number().min(0).default(100),
}).refine((data) => {
  // Captain and vice captain must be in the team
  return data.players.includes(data.captain) && data.players.includes(data.viceCaptain);
}, {
  message: 'Captain and vice captain must be part of the team',
}).refine((data) => {
  // Captain and vice captain must be different
  return data.captain !== data.viceCaptain;
}, {
  message: 'Captain and vice captain must be different players',
});

/**
 * Fantasy team update schema
 */
export const FantasyTeamUpdateSchema = z.object({
  name: z.string().min(3).max(30).optional(),
  players: z.array(z.string()).min(11).max(15).optional(),
  captain: z.string().optional(),
  viceCaptain: z.string().optional(),
});

// ==================== SUBSCRIPTION SCHEMAS ====================

/**
 * Subscription type enum
 */
export const SubscriptionTypeSchema = z.enum(['weekly', 'monthly', 'yearly']);

/**
 * Create subscription schema
 */
export const SubscriptionSchema = z.object({
  tipsterId: z.string().min(1, 'Tipster ID is required'),
  type: SubscriptionTypeSchema,
  autoRenew: z.boolean().default(false),
});

/**
 * Subscription update schema
 */
export const SubscriptionUpdateSchema = z.object({
  autoRenew: z.boolean().optional(),
  status: z.enum(['active', 'cancelled', 'expired']).optional(),
});

/**
 * Subscription filter schema
 */
export const SubscriptionFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  userId: z.string().optional(),
  tipsterId: z.string().optional(),
  type: SubscriptionTypeSchema.optional(),
  status: z.enum(['active', 'cancelled', 'expired']).optional(),
});

// ==================== PAYMENT SCHEMAS ====================

/**
 * Payment method enum
 */
export const PaymentMethodSchema = z.enum([
  'credit_card',
  'debit_card',
  'bank_transfer',
  'crypto',
  'e_wallet',
]);

/**
 * Transaction type enum
 */
export const TransactionTypeSchema = z.enum([
  'deposit',
  'withdrawal',
  'bet',
  'win',
  'subscription',
  'commission',
]);

/**
 * Transaction status enum
 */
export const TransactionStatusSchema = z.enum(['pending', 'completed', 'failed']);

/**
 * Deposit schema
 */
export const DepositSchema = z.object({
  amount: z.number()
    .positive('Amount must be positive')
    .min(10, 'Minimum deposit is $10')
    .max(10000, 'Maximum deposit is $10,000'),
  paymentMethod: PaymentMethodSchema,
  currency: z.string().length(3).default('USD'),
  callbackUrl: z.string().url().optional(),
}).refine((data) => data.amount > 0, {
  message: 'Deposit amount must be greater than 0',
});

/**
 * Withdrawal schema
 */
export const WithdrawalSchema = z.object({
  amount: z.number()
    .positive('Amount must be positive')
    .min(10, 'Minimum withdrawal is $10')
    .max(5000, 'Maximum withdrawal is $5,000'),
  paymentMethod: PaymentMethodSchema,
  accountDetails: z.record(z.string()),
  currency: z.string().length(3).default('USD'),
});

/**
 * Payment callback schema
 */
export const PaymentCallbackSchema = z.object({
  transactionId: z.string().min(1),
  status: TransactionStatusSchema,
  reference: z.string().optional(),
  signature: z.string().optional(),
  timestamp: z.coerce.date().optional(),
});

/**
 * Payment schema (full)
 */
export const PaymentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: TransactionTypeSchema,
  amount: z.number().positive(),
  status: TransactionStatusSchema,
  description: z.string().optional(),
  referenceId: z.string().optional(),
  paymentMethod: PaymentMethodSchema.optional(),
  createdAt: z.coerce.date(),
});

/**
 * Payment filter schema
 */
export const PaymentFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: TransactionTypeSchema.optional(),
  status: TransactionStatusSchema.optional(),
  paymentMethod: PaymentMethodSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  minAmount: z.number().positive().optional(),
  maxAmount: z.number().positive().optional(),
});

// ==================== WALLET SCHEMAS ====================

/**
 * Wallet schema
 */
export const WalletSchema = z.object({
  id: z.string(),
  balance: z.number().min(0),
  virtualBalance: z.number().min(0),
  totalProfit: z.number(),
  totalBets: z.number().int().min(0),
  winRate: z.number().min(0).max(100),
  roi: z.number(),
});

// ==================== TIPSTER SCHEMAS ====================

/**
 * Create tipster profile schema
 */
export const CreateTipsterSchema = z.object({
  displayName: z.string()
    .min(3, 'Display name must be at least 3 characters')
    .max(50, 'Display name must be at most 50 characters'),
  bio: z.string().max(500).optional(),
  monthlyPrice: z.number().min(0).default(0),
  weeklyPrice: z.number().min(0).default(0),
  singleTipPrice: z.number().min(0).default(0),
});

/**
 * Tipster filter schema
 */
export const TipsterFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  isVerified: z.coerce.boolean().optional(),
  isFeatured: z.coerce.boolean().optional(),
  minRoi: z.number().optional(),
  minWinRate: z.number().min(0).max(100).optional(),
  sortBy: z.enum(['roi', 'winRate', 'profit', 'followers']).default('roi'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ==================== UTILITY FUNCTIONS ====================

/**
 * Validates data against a Zod schema and returns a typed result
 * 
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validated data or throws error
 */
export function validate<T extends z.ZodSchema>(
  schema: T,
  data: unknown
): z.infer<T> {
  return schema.parse(data);
}

/**
 * Safe validation that returns either success or error
 * 
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Object with success status and data/error
 */
export function safeValidate<T extends z.ZodSchema>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { success: false, errors: result.error };
}

/**
 * Formats Zod validation errors into a user-friendly object
 * 
 * @param error - Zod error
 * @returns Record of field names to error messages
 */
export function formatValidationErrors(
  error: z.ZodError
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(issue.message);
  }
  
  return errors;
}

/**
 * Type for extracting the input type from a Zod schema
 */
export type SchemaInput<T extends z.ZodSchema> = z.input<T>;

/**
 * Type for extracting the output type from a Zod schema
 */
export type SchemaOutput<T extends z.ZodSchema> = z.output<T>;
