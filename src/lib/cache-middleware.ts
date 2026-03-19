/**
 * Cache Middleware Utilities for 43V3R BET AI Platform
 * 
 * Provides easy-to-use caching middleware for API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  redis,
  CACHE_TTL,
  CACHE_KEYS,
  RATE_LIMITS,
  checkRateLimit,
  generateCacheKey,
  setCacheHeaders,
} from '@/lib/redis';

// Types
export interface CacheMiddlewareOptions {
  ttl?: number;
  prefix?: string;
  visibility?: 'public' | 'private';
  forceRefresh?: boolean;
}

export interface RateLimitMiddlewareOptions {
  requests?: number;
  window?: number;
  keyGenerator?: (request: NextRequest) => string;
  endpoint?: string;
}

export interface MiddlewareContext {
  ip: string;
  userId?: string;
  rateLimit: {
    allowed: boolean;
    remaining: number;
    resetAt: number;
    retryAfter?: number;
  };
  cache: {
    hit: boolean;
    key: string;
  };
}

// Extract IP from request
function extractIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfIP = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) return realIP;
  if (cfIP) return cfIP;
  return '127.0.0.1';
}

/**
 * Rate limiting middleware
 */
export async function withRateLimit(
  request: NextRequest,
  options: RateLimitMiddlewareOptions = {}
): Promise<{ allowed: boolean; response?: NextResponse; headers: Headers }> {
  const {
    requests = RATE_LIMITS.DEFAULT.requests,
    window = RATE_LIMITS.DEFAULT.window,
    keyGenerator,
    endpoint,
  } = options;

  const ip = keyGenerator ? keyGenerator(request) : extractIP(request);
  const result = await checkRateLimit(ip, { requests, window }, endpoint);

  const headers = new Headers({
    'X-RateLimit-Limit': String(requests),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.resetAt / 1000)),
  });

  if (!result.allowed) {
    headers.set('Retry-After', String(result.retryAfter || window));
    const response = NextResponse.json(
      {
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
          details: {
            retryAfter: result.retryAfter,
            resetAt: new Date(result.resetAt).toISOString(),
          },
        },
      },
      { status: 429, headers }
    );
    return { allowed: false, response, headers };
  }

  return { allowed: true, headers };
}

/**
 * Cache response middleware for GET requests
 */
export async function withCache(
  request: NextRequest,
  key: string,
  fetcher: () => Promise<unknown>,
  options: CacheMiddlewareOptions = {}
): Promise<Response> {
  const {
    ttl = CACHE_TTL.MATCHES,
    visibility = 'public',
    forceRefresh = false,
  } = options;

  // Check if we should skip cache
  const cacheControl = request.headers.get('Cache-Control');
  const skipCache = forceRefresh || cacheControl?.includes('no-cache');

  if (!skipCache) {
    const cached = await redis.get(key);
    if (cached !== null) {
      const headers = new Headers({
        'Content-Type': 'application/json',
        'Cache-Control': `${visibility}, max-age=${ttl}, s-maxage=${ttl}`,
        'X-Cache-Status': 'HIT',
        'X-Cache-Key': key,
      });
      return new Response(JSON.stringify(cached), { headers });
    }
  }

  // Fetch fresh data
  const data = await fetcher();
  
  // Cache the result
  await redis.set(key, data, ttl);

  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': `${visibility}, max-age=${ttl}, s-maxage=${ttl}`,
    'X-Cache-Status': 'MISS',
    'X-Cache-Key': key,
  });

  return new Response(JSON.stringify(data), { headers });
}

/**
 * Combined middleware: rate limiting + caching
 */
export async function withRateLimitAndCache<T>(
  request: NextRequest,
  key: string,
  fetcher: () => Promise<T>,
  options: {
    rateLimit?: RateLimitMiddlewareOptions;
    cache?: CacheMiddlewareOptions;
  } = {}
): Promise<Response> {
  // Check rate limit first
  const { allowed, response, headers: rateLimitHeaders } = await withRateLimit(
    request,
    options.rateLimit
  );

  if (!allowed && response) {
    return response;
  }

  // Apply caching
  const cacheOptions = options.cache || {};
  const ttl = cacheOptions.ttl || CACHE_TTL.MATCHES;
  const visibility = cacheOptions.visibility || 'public';
  const forceRefresh = cacheOptions.forceRefresh || false;

  const cacheControl = request.headers.get('Cache-Control');
  const skipCache = forceRefresh || cacheControl?.includes('no-cache');

  if (!skipCache) {
    const cached = await redis.get<T>(key);
    if (cached !== null) {
      const headers = new Headers(rateLimitHeaders);
      headers.set('Content-Type', 'application/json');
      headers.set('Cache-Control', `${visibility}, max-age=${ttl}, s-maxage=${ttl}`);
      headers.set('X-Cache-Status', 'HIT');
      headers.set('X-Cache-Key', key);
      return new Response(JSON.stringify(cached), { headers });
    }
  }

  // Fetch fresh data
  const data = await fetcher();
  
  // Cache the result
  await redis.set(key, data, ttl);

  const headers = new Headers(rateLimitHeaders);
  headers.set('Content-Type', 'application/json');
  headers.set('Cache-Control', `${visibility}, max-age=${ttl}, s-maxage=${ttl}`);
  headers.set('X-Cache-Status', 'MISS');
  headers.set('X-Cache-Key', key);

  return new Response(JSON.stringify(data), { headers });
}

/**
 * Create a cached API route handler
 */
export function createCachedHandler<T>(
  prefix: string,
  fetcher: (request: NextRequest) => Promise<T>,
  options: {
    ttl?: number;
    visibility?: 'public' | 'private';
    rateLimit?: RateLimitMiddlewareOptions;
    keyGenerator?: (request: NextRequest) => string;
  } = {}
) {
  return async function cachedHandler(request: NextRequest): Promise<Response> {
    const key = options.keyGenerator
      ? options.keyGenerator(request)
      : generateCacheKey(prefix, request);
    
    return withRateLimitAndCache(request, key, () => fetcher(request), {
      cache: {
        ttl: options.ttl,
        visibility: options.visibility,
      },
      rateLimit: options.rateLimit,
    });
  };
}

/**
 * Pre-configured handlers for common endpoints
 */
export const CachedHandlers = {
  // Matches endpoint (5 min cache)
  matches: <T>(fetcher: (request: NextRequest) => Promise<T>) =>
    createCachedHandler(CACHE_KEYS.MATCHES, fetcher, {
      ttl: CACHE_TTL.MATCHES,
      rateLimit: { endpoint: 'API_MATCHES' },
    }),

  // Odds endpoint (1 min cache)
  odds: <T>(fetcher: (request: NextRequest) => Promise<T>) =>
    createCachedHandler(CACHE_KEYS.ODDS, fetcher, {
      ttl: CACHE_TTL.ODDS,
      rateLimit: { endpoint: 'API_ODDS' },
    }),

  // Predictions endpoint (10 min cache)
  predictions: <T>(fetcher: (request: NextRequest) => Promise<T>) =>
    createCachedHandler(CACHE_KEYS.PREDICTIONS, fetcher, {
      ttl: CACHE_TTL.PREDICTIONS,
      rateLimit: { endpoint: 'API_PREDICTIONS' },
    }),

  // Value bets endpoint (5 min cache)
  valueBets: <T>(fetcher: (request: NextRequest) => Promise<T>) =>
    createCachedHandler(CACHE_KEYS.VALUE_BETS, fetcher, {
      ttl: CACHE_TTL.VALUE_BETS,
      rateLimit: { endpoint: 'API_PREDICTIONS' },
    }),

  // Player stats endpoint (1 hour cache)
  playerStats: <T>(fetcher: (request: NextRequest) => Promise<T>) =>
    createCachedHandler(CACHE_KEYS.PLAYER_STATS, fetcher, {
      ttl: CACHE_TTL.PLAYER_STATS,
    }),

  // Leaderboard endpoint (1 min cache)
  leaderboard: <T>(fetcher: (request: NextRequest) => Promise<T>) =>
    createCachedHandler(CACHE_KEYS.LEADERBOARD, fetcher, {
      ttl: CACHE_TTL.LEADERBOARDS,
    }),

  // Tipsters endpoint (15 min cache)
  tipsters: <T>(fetcher: (request: NextRequest) => Promise<T>) =>
    createCachedHandler(CACHE_KEYS.TIPSTERS, fetcher, {
      ttl: CACHE_TTL.TIPSTERS,
    }),
};

/**
 * Invalidate cache and return fresh data
 */
export async function invalidateAndRefetch<T>(
  keyOrPattern: string,
  fetcher: () => Promise<T>,
  isPattern: boolean = false
): Promise<T> {
  if (isPattern) {
    await redis.delPattern(keyOrPattern);
  } else {
    await redis.del(keyOrPattern);
  }
  
  return fetcher();
}

/**
 * Cache invalidation helper for mutations
 */
export async function withCacheInvalidation<T>(
  mutation: () => Promise<T>,
  keysToInvalidate: string[],
  patternsToInvalidate: string[] = []
): Promise<T> {
  const result = await mutation();
  
  // Invalidate specific keys
  await Promise.all(keysToInvalidate.map(key => redis.del(key)));
  
  // Invalidate patterns
  await Promise.all(patternsToInvalidate.map(pattern => redis.delPattern(pattern)));
  
  return result;
}

// Named export object to avoid anonymous default export
const cacheMiddleware = {
  withRateLimit,
  withCache,
  withRateLimitAndCache,
  createCachedHandler,
  CachedHandlers,
  invalidateAndRefetch,
  withCacheInvalidation,
};

export default cacheMiddleware;
