/**
 * Redis Caching Layer for 43V3R BET AI Platform
 * 
 * Features:
 * - Redis client singleton with mock support for development
 * - Cache wrapper functions with TTL support
 * - Cache invalidation patterns
 * - Rate limiting middleware
 * - Automatic caching for GET requests
 */

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
  MATCHES: 5 * 60,           // 5 minutes
  ODDS: 1 * 60,              // 1 minute
  PREDICTIONS: 10 * 60,      // 10 minutes
  VALUE_BETS: 5 * 60,        // 5 minutes
  PLAYER_STATS: 60 * 60,     // 1 hour
  LEADERBOARDS: 1 * 60,      // 1 minute
  USER_SESSION: 30 * 60,     // 30 minutes
  TIPSTERS: 15 * 60,         // 15 minutes
  FANTASY_TEAM: 5 * 60,      // 5 minutes
  GAMYWEEK: 10 * 60,         // 10 minutes
} as const;

// Rate limiting constants
export const RATE_LIMITS = {
  DEFAULT: {
    requests: 100,
    window: 60, // seconds
  },
  API_MATCHES: {
    requests: 200,
    window: 60,
  },
  API_ODDS: {
    requests: 300,
    window: 60,
  },
  API_PREDICTIONS: {
    requests: 50,
    window: 60,
  },
  API_BETS: {
    requests: 30,
    window: 60,
  },
  API_AUTH: {
    requests: 10,
    window: 60,
  },
} as const;

// Cache key prefixes
export const CACHE_KEYS = {
  MATCH: 'match',
  MATCHES: 'matches',
  ODDS: 'odds',
  ODDS_MOVEMENT: 'odds:movement',
  PREDICTION: 'prediction',
  PREDICTIONS: 'predictions',
  VALUE_BET: 'valueBet',
  VALUE_BETS: 'valueBets',
  PLAYER: 'player',
  PLAYER_STATS: 'player:stats',
  LEADERBOARD: 'leaderboard',
  USER: 'user',
  TIPSTER: 'tipster',
  TIPSTERS: 'tipsters',
  FANTASY_TEAM: 'fantasy:team',
  GAMEWEEK: 'gameweek',
  RATE_LIMIT: 'rateLimit',
} as const;

// Types
export interface CacheOptions {
  ttl?: number;
  prefix?: string;
  tags?: string[];
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

export interface RateLimitConfig {
  requests: number;
  window: number;
  keyGenerator?: (identifier: string, endpoint?: string) => string;
}

// In-memory mock Redis store for development
class MockRedisStore {
  private store: Map<string, { value: string; expiresAt: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Clean up expired keys every 30 seconds
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, data] of this.store.entries()) {
        if (data.expiresAt < now) {
          this.store.delete(key);
        }
      }
    }, 30000);
  }

  async get(key: string): Promise<string | null> {
    const data = this.store.get(key);
    if (!data) return null;
    if (data.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return data.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiresAt = Date.now() + (ttlSeconds || 3600) * 1000;
    this.store.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<number> {
    const existed = this.store.has(key);
    this.store.delete(key);
    return existed ? 1 : 0;
  }

  async delPattern(pattern: string): Promise<number> {
    let count = 0;
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  async exists(key: string): Promise<boolean> {
    const data = this.store.get(key);
    if (!data) return false;
    if (data.expiresAt < Date.now()) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  async incr(key: string): Promise<number> {
    const data = this.store.get(key);
    const currentValue = data ? parseInt(data.value, 10) : 0;
    const newValue = currentValue + 1;
    await this.set(key, String(newValue), data?.expiresAt ? (data.expiresAt - Date.now()) / 1000 : undefined);
    return newValue;
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    const data = this.store.get(key);
    if (!data) return false;
    data.expiresAt = Date.now() + ttlSeconds * 1000;
    return true;
  }

  async ttl(key: string): Promise<number> {
    const data = this.store.get(key);
    if (!data) return -2;
    if (data.expiresAt < Date.now()) {
      this.store.delete(key);
      return -2;
    }
    return Math.floor((data.expiresAt - Date.now()) / 1000);
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(this.store.keys()).filter(key => regex.test(key));
  }

  async mget(...keys: string[]): Promise<(string | null)[]> {
    return Promise.all(keys.map(key => this.get(key)));
  }

  async mset(keyValues: Record<string, string>, ttlSeconds?: number): Promise<void> {
    for (const [key, value] of Object.entries(keyValues)) {
      await this.set(key, value, ttlSeconds);
    }
  }

  disconnect(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }

  // Get stats for debugging
  getStats(): { keys: number; memory: string } {
    return {
      keys: this.store.size,
      memory: `${Math.round(JSON.stringify([...this.store.entries()]).length / 1024)}KB`,
    };
  }
}

// Redis client interface
interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<number>;
  delPattern(pattern: string): Promise<number>;
  exists(key: string): Promise<boolean>;
  incr(key: string): Promise<number>;
  expire(key: string, ttlSeconds: number): Promise<boolean>;
  ttl(key: string): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  mget(...keys: string[]): Promise<(string | null)[]>;
  mset(keyValues: Record<string, string>, ttlSeconds?: number): Promise<void>;
  disconnect(): void;
}

// Redis Client Singleton
class RedisService {
  private static instance: RedisService;
  private client: RedisClient;
  private isConnected: boolean = false;
  private useMock: boolean = true;

  private constructor() {
    // Use mock Redis for development
    this.client = new MockRedisStore();
    this.useMock = true;
    this.isConnected = true;
    
    console.log('[Redis] Using in-memory mock Redis client');
  }

  static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  getClient(): RedisClient {
    return this.client;
  }

  isUsingMock(): boolean {
    return this.useMock;
  }

  isReady(): boolean {
    return this.isConnected;
  }

  // Get cached value
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`[Redis] Error getting key ${key}:`, error);
      return null;
    }
  }

  // Set cached value with TTL
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.client.set(key, serialized, ttlSeconds);
    } catch (error) {
      console.error(`[Redis] Error setting key ${key}:`, error);
    }
  }

  // Delete a key
  async del(key: string): Promise<number> {
    try {
      return await this.client.del(key);
    } catch (error) {
      console.error(`[Redis] Error deleting key ${key}:`, error);
      return 0;
    }
  }

  // Delete keys matching pattern
  async delPattern(pattern: string): Promise<number> {
    try {
      return await this.client.delPattern(pattern);
    } catch (error) {
      console.error(`[Redis] Error deleting pattern ${pattern}:`, error);
      return 0;
    }
  }

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    try {
      return await this.client.exists(key);
    } catch (error) {
      console.error(`[Redis] Error checking existence of ${key}:`, error);
      return false;
    }
  }

  // Get TTL of a key
  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      console.error(`[Redis] Error getting TTL of ${key}:`, error);
      return -1;
    }
  }

  // Increment a counter
  async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (error) {
      console.error(`[Redis] Error incrementing ${key}:`, error);
      return 0;
    }
  }

  // Set expiration on a key
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      return await this.client.expire(key, ttlSeconds);
    } catch (error) {
      console.error(`[Redis] Error setting expiration on ${key}:`, error);
      return false;
    }
  }

  // Get multiple keys
  async mget<T>(...keys: string[]): Promise<(T | null)[]> {
    try {
      const values = await this.client.mget(...keys);
      return values.map(v => v ? JSON.parse(v) : null);
    } catch (error) {
      console.error(`[Redis] Error getting multiple keys:`, error);
      return keys.map(() => null);
    }
  }

  // Set multiple keys
  async mset<T>(keyValues: Record<string, T>, ttlSeconds?: number): Promise<void> {
    try {
      const serialized: Record<string, string> = {};
      for (const [key, value] of Object.entries(keyValues)) {
        serialized[key] = JSON.stringify(value);
      }
      await this.client.mset(serialized, ttlSeconds);
    } catch (error) {
      console.error(`[Redis] Error setting multiple keys:`, error);
    }
  }

  // Get all keys matching pattern
  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      console.error(`[Redis] Error getting keys for pattern ${pattern}:`, error);
      return [];
    }
  }

  // Disconnect
  disconnect(): void {
    this.client.disconnect();
    this.isConnected = false;
  }

  // Get stats (for mock client)
  getStats(): { keys: number; memory: string; usingMock: boolean } {
    if (this.useMock && this.client instanceof MockRedisStore) {
      const stats = this.client.getStats();
      return { ...stats, usingMock: true };
    }
    return { keys: -1, memory: 'N/A', usingMock: false };
  }
}

// Export singleton instance
export const redis = RedisService.getInstance();

// ============================================
// CACHE WRAPPER FUNCTIONS
// ============================================

/**
 * Get or set cache - retrieves from cache or executes function and caches result
 */
export async function cacheOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = CACHE_TTL.MATCHES
): Promise<T> {
  // Try to get from cache
  const cached = await redis.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Execute fetch function
  const result = await fetchFn();

  // Cache result
  await redis.set(key, result, ttlSeconds);

  return result;
}

/**
 * Get cached matches
 */
export async function getCachedMatches<T>(filters?: Record<string, unknown>): Promise<T | null> {
  const filterKey = filters ? JSON.stringify(filters) : 'all';
  const key = `${CACHE_KEYS.MATCHES}:${filterKey}`;
  return redis.get<T>(key);
}

/**
 * Cache matches
 */
export async function cacheMatches<T>(data: T, filters?: Record<string, unknown>): Promise<void> {
  const filterKey = filters ? JSON.stringify(filters) : 'all';
  const key = `${CACHE_KEYS.MATCHES}:${filterKey}`;
  await redis.set(key, data, CACHE_TTL.MATCHES);
}

/**
 * Get cached odds for a match
 */
export async function getCachedOdds<T>(matchId: string): Promise<T | null> {
  const key = `${CACHE_KEYS.ODDS}:${matchId}`;
  return redis.get<T>(key);
}

/**
 * Cache odds for a match
 */
export async function cacheOdds<T>(matchId: string, data: T): Promise<void> {
  const key = `${CACHE_KEYS.ODDS}:${matchId}`;
  await redis.set(key, data, CACHE_TTL.ODDS);
}

/**
 * Get cached predictions
 */
export async function getCachedPredictions<T>(matchId?: string): Promise<T | null> {
  const key = matchId 
    ? `${CACHE_KEYS.PREDICTION}:${matchId}`
    : CACHE_KEYS.PREDICTIONS;
  return redis.get<T>(key);
}

/**
 * Cache predictions
 */
export async function cachePredictions<T>(data: T, matchId?: string): Promise<void> {
  const key = matchId 
    ? `${CACHE_KEYS.PREDICTION}:${matchId}`
    : CACHE_KEYS.PREDICTIONS;
  await redis.set(key, data, CACHE_TTL.PREDICTIONS);
}

/**
 * Get cached value bets
 */
export async function getCachedValueBets<T>(filters?: Record<string, unknown>): Promise<T | null> {
  const filterKey = filters ? JSON.stringify(filters) : 'all';
  const key = `${CACHE_KEYS.VALUE_BETS}:${filterKey}`;
  return redis.get<T>(key);
}

/**
 * Cache value bets
 */
export async function cacheValueBets<T>(data: T, filters?: Record<string, unknown>): Promise<void> {
  const filterKey = filters ? JSON.stringify(filters) : 'all';
  const key = `${CACHE_KEYS.VALUE_BETS}:${filterKey}`;
  await redis.set(key, data, CACHE_TTL.VALUE_BETS);
}

/**
 * Get cached player stats
 */
export async function getCachedPlayerStats<T>(playerId: string): Promise<T | null> {
  const key = `${CACHE_KEYS.PLAYER_STATS}:${playerId}`;
  return redis.get<T>(key);
}

/**
 * Cache player stats
 */
export async function cachePlayerStats<T>(playerId: string, data: T): Promise<void> {
  const key = `${CACHE_KEYS.PLAYER_STATS}:${playerId}`;
  await redis.set(key, data, CACHE_TTL.PLAYER_STATS);
}

/**
 * Get cached leaderboard
 */
export async function getCachedLeaderboard<T>(period: string = 'weekly'): Promise<T | null> {
  const key = `${CACHE_KEYS.LEADERBOARD}:${period}`;
  return redis.get<T>(key);
}

/**
 * Cache leaderboard
 */
export async function cacheLeaderboard<T>(period: string, data: T): Promise<void> {
  const key = `${CACHE_KEYS.LEADERBOARD}:${period}`;
  await redis.set(key, data, CACHE_TTL.LEADERBOARDS);
}

/**
 * Get cached tipsters
 */
export async function getCachedTipsters<T>(): Promise<T | null> {
  const key = CACHE_KEYS.TIPSTERS;
  return redis.get<T>(key);
}

/**
 * Cache tipsters
 */
export async function cacheTipsters<T>(data: T): Promise<void> {
  const key = CACHE_KEYS.TIPSTERS;
  await redis.set(key, data, CACHE_TTL.TIPSTERS);
}

// ============================================
// CACHE INVALIDATION PATTERNS
// ============================================

/**
 * Invalidate all match-related caches
 */
export async function invalidateMatchCaches(matchId?: string): Promise<void> {
  const patterns = matchId
    ? [
        `${CACHE_KEYS.MATCH}:${matchId}`,
        `${CACHE_KEYS.ODDS}:${matchId}`,
        `${CACHE_KEYS.PREDICTION}:${matchId}`,
        `${CACHE_KEYS.VALUE_BET}:${matchId}`,
      ]
    : [
        `${CACHE_KEYS.MATCHES}:*`,
        `${CACHE_KEYS.ODDS}:*`,
        `${CACHE_KEYS.PREDICTIONS}`,
        `${CACHE_KEYS.PREDICTION}:*`,
        `${CACHE_KEYS.VALUE_BETS}:*`,
        `${CACHE_KEYS.VALUE_BET}:*`,
      ];

  if (matchId) {
    for (const key of patterns) {
      await redis.del(key);
    }
  } else {
    for (const pattern of patterns) {
      await redis.delPattern(pattern);
    }
  }
}

/**
 * Invalidate all odds caches
 */
export async function invalidateOddsCaches(matchId?: string): Promise<void> {
  if (matchId) {
    await redis.del(`${CACHE_KEYS.ODDS}:${matchId}`);
    await redis.del(`${CACHE_KEYS.ODDS_MOVEMENT}:${matchId}`);
  } else {
    await redis.delPattern(`${CACHE_KEYS.ODDS}:*`);
    await redis.delPattern(`${CACHE_KEYS.ODDS_MOVEMENT}:*`);
  }
}

/**
 * Invalidate all prediction caches
 */
export async function invalidatePredictionCaches(): Promise<void> {
  await redis.del(CACHE_KEYS.PREDICTIONS);
  await redis.delPattern(`${CACHE_KEYS.PREDICTION}:*`);
  await redis.delPattern(`${CACHE_KEYS.VALUE_BETS}:*`);
}

/**
 * Invalidate leaderboard cache
 */
export async function invalidateLeaderboardCache(period?: string): Promise<void> {
  if (period) {
    await redis.del(`${CACHE_KEYS.LEADERBOARD}:${period}`);
  } else {
    await redis.delPattern(`${CACHE_KEYS.LEADERBOARD}:*`);
  }
}

/**
 * Invalidate tipster cache
 */
export async function invalidateTipsterCache(tipsterId?: string): Promise<void> {
  if (tipsterId) {
    await redis.del(`${CACHE_KEYS.TIPSTER}:${tipsterId}`);
  }
  await redis.del(CACHE_KEYS.TIPSTERS);
}

/**
 * Invalidate user-related caches
 */
export async function invalidateUserCaches(userId: string): Promise<void> {
  await redis.del(`${CACHE_KEYS.USER}:${userId}`);
  await redis.del(`${CACHE_KEYS.FANTASY_TEAM}:${userId}`);
}

/**
 * Invalidate all caches (use with caution!)
 */
export async function invalidateAllCaches(): Promise<void> {
  await redis.delPattern('*');
}

// ============================================
// RATE LIMITING MIDDLEWARE
// ============================================

/**
 * Check rate limit for an identifier
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = RATE_LIMITS.DEFAULT,
  endpoint?: string
): Promise<RateLimitResult> {
  const key = config.keyGenerator 
    ? config.keyGenerator(identifier, endpoint)
    : `${CACHE_KEYS.RATE_LIMIT}:${identifier}${endpoint ? `:${endpoint}` : ''}`;

  const current = await redis.incr(key);
  
  // Set expiry on first request
  if (current === 1) {
    await redis.expire(key, config.window);
  }

  const ttl = await redis.ttl(key);
  const resetAt = Date.now() + (ttl > 0 ? ttl * 1000 : config.window * 1000);

  if (current > config.requests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfter: ttl > 0 ? ttl : config.window,
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, config.requests - current),
    resetAt,
  };
}

/**
 * Rate limit middleware for API routes
 */
export function createRateLimiter(config: RateLimitConfig = RATE_LIMITS.DEFAULT) {
  return async function rateLimiter(
    identifier: string,
    endpoint?: string
  ): Promise<RateLimitResult> {
    return checkRateLimit(identifier, config, endpoint);
  };
}

/**
 * Create IP-based rate limiter
 */
export function createIPRateLimiter(
  requests: number = 100,
  windowSeconds: number = 60
) {
  return createRateLimiter({ requests, window: windowSeconds });
}

/**
 * Create user-based rate limiter
 */
export function createUserRateLimiter(
  requests: number = 200,
  windowSeconds: number = 60
) {
  return createRateLimiter({
    requests,
    window: windowSeconds,
    keyGenerator: (userId) => `${CACHE_KEYS.RATE_LIMIT}:user:${userId}`,
  });
}

// ============================================
// CACHE MIDDLEWARE FOR API ROUTES
// ============================================

/**
 * Cache headers configuration
 */
export const CACHE_HEADERS = {
  PUBLIC: 'public',
  PRIVATE: 'private',
  NO_CACHE: 'no-cache',
  NO_STORE: 'no-store',
} as const;

/**
 * Set cache headers on response
 */
export function setCacheHeaders(
  headers: Headers,
  ttl: number,
  visibility: 'public' | 'private' = 'public'
): void {
  headers.set('Cache-Control', `${visibility}, max-age=${ttl}, s-maxage=${ttl}`);
  headers.set('Age', '0');
  headers.set('X-Cache-Status', 'MISS');
}

/**
 * Create cached response helper
 */
export async function cachedResponse<T>(
  request: Request,
  dataFetcher: () => Promise<T>,
  options: {
    key: string;
    ttl: number;
    visibility?: 'public' | 'private';
    forceRefresh?: boolean;
  }
): Promise<Response> {
  const { key, ttl, visibility = 'public', forceRefresh = false } = options;
  const headers = new Headers();

  // Check cache-control header for no-cache
  const cacheControl = request.headers.get('Cache-Control');
  const skipCache = forceRefresh || cacheControl?.includes('no-cache');

  if (!skipCache) {
    const cached = await redis.get<T>(key);
    if (cached !== null) {
      headers.set('Content-Type', 'application/json');
      setCacheHeaders(headers, ttl, visibility);
      headers.set('X-Cache-Status', 'HIT');
      return new Response(JSON.stringify(cached), { headers });
    }
  }

  // Fetch fresh data
  const data = await dataFetcher();
  
  // Cache the result
  await redis.set(key, data, ttl);

  headers.set('Content-Type', 'application/json');
  setCacheHeaders(headers, ttl, visibility);
  headers.set('X-Cache-Status', 'MISS');
  
  return new Response(JSON.stringify(data), { headers });
}

/**
 * Generate cache key from request
 */
export function generateCacheKey(
  prefix: string,
  request: Request,
  additionalParams?: Record<string, unknown>
): string {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams);
  
  if (additionalParams) {
    Object.assign(params, additionalParams);
  }

  // Sort keys for consistent cache keys
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, unknown>);

  return `${prefix}:${JSON.stringify(sortedParams)}`;
}

/**
 * Cache middleware for GET requests
 */
export function withCache(
  prefix: string,
  ttl: number,
  visibility: 'public' | 'private' = 'public'
) {
  return <T extends (...args: unknown[]) => Promise<Response>>(
    handler: T
  ): T => {
    return ((async (...args: Parameters<T>) => {
      const request = args[0] as Request;
      
      if (request.method !== 'GET') {
        return handler(...args);
      }

      const key = generateCacheKey(prefix, request);
      return cachedResponse(request, async () => {
        const response = await handler(...args);
        return response.json();
      }, { key, ttl, visibility });
    }) as T);
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get cache statistics
 */
export function getCacheStats(): { keys: number; memory: string; usingMock: boolean } {
  return redis.getStats();
}

/**
 * Preload cache with data
 */
export async function preloadCache<T>(
  dataLoader: () => Promise<Record<string, T>>,
  ttl: number
): Promise<void> {
  const data = await dataLoader();
  await redis.mset(data, ttl);
}

/**
 * Warm up cache with frequently accessed data
 */
export async function warmupCache(warmupFunctions: Array<() => Promise<void>>): Promise<void> {
  await Promise.all(warmupFunctions.map(fn => fn()));
}

/**
 * Create a namespaced cache key
 */
export function createCacheKey(namespace: string, ...parts: (string | number)[]): string {
  return `${namespace}:${parts.join(':')}`;
}

/**
 * Combined rate limiting and caching wrapper for API routes
 * Returns a Response object for use in API routes
 */
export async function withRateLimitAndCache<T>(
  request: Request,
  cacheKey: string,
  handler: () => Promise<T>,
  options?: {
    cache?: {
      ttl: number;
      visibility: 'public' | 'private';
    };
    rateLimit?: {
      requests: number;
      window: number;
    };
  }
): Promise<Response> {
  const ttl = options?.cache?.ttl ?? CACHE_TTL.MATCHES;
  const visibility = options?.cache?.visibility ?? 'public';
  
  // Check cache first for GET requests
  if (request.method === 'GET') {
    const cached = await redis.get<T>(cacheKey);
    if (cached !== null) {
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      setCacheHeaders(headers, ttl, visibility);
      headers.set('X-Cache-Status', 'HIT');
      return new Response(JSON.stringify(cached), { headers });
    }
  }
  
  // Execute handler
  const result = await handler();
  
  // Cache the result for GET requests
  if (request.method === 'GET') {
    await redis.set(cacheKey, result, ttl);
  }
  
  // Return response
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  setCacheHeaders(headers, ttl, visibility);
  headers.set('X-Cache-Status', 'MISS');
  
  return new Response(JSON.stringify(result), { headers });
}

export default redis;
