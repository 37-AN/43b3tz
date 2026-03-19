import { NextRequest, NextResponse } from 'next/server';
import { 
  checkRateLimit,
  createRateLimiter,
  RATE_LIMITS,
  CACHE_KEYS,
} from '@/lib/redis';
import { 
  successResponse, 
  errorNextResponse, 
  toNextResponse,
  ErrorCode 
} from '@/lib/api-response';

/**
 * Rate Limit API Route
 * 
 * GET /api/rate-limit - Check rate limit status
 * POST /api/rate-limit - Check and potentially block if rate limited
 */

// Extract IP from request
function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfIP = request.headers.get('cf-connecting-ip'); // Cloudflare
  
  if (forwarded) {
    // x-forwarded-for may contain multiple IPs, first is client
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (cfIP) {
    return cfIP;
  }
  
  // Fallback to a default for development
  return '127.0.0.1';
}

// GET /api/rate-limit - Check rate limit status without incrementing
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ip = searchParams.get('ip') || getClientIP(request);
    const endpoint = searchParams.get('endpoint') || undefined;
    
    // Get the rate limit config for the endpoint or use default
    const config = endpoint && endpoint in RATE_LIMITS
      ? RATE_LIMITS[endpoint as keyof typeof RATE_LIMITS]
      : RATE_LIMITS.DEFAULT;
    
    // Check current status
    const key = `${CACHE_KEYS.RATE_LIMIT}:${ip}${endpoint ? `:${endpoint}` : ''}`;
    
    const result = await checkRateLimit(ip, config, endpoint || 'default');
    
    return toNextResponse(successResponse({
      ip,
      endpoint: endpoint || 'default',
      config: {
        requests: config.requests,
        window: config.window,
      },
      status: {
        allowed: result.allowed,
        remaining: result.remaining,
        resetAt: new Date(result.resetAt).toISOString(),
        retryAfter: result.retryAfter,
      },
    }));
  } catch (error) {
    console.error('Rate limit check error:', error);
    return errorNextResponse('Rate limit check failed', ErrorCode.INTERNAL_ERROR);
  }
}

// POST /api/rate-limit - Check and enforce rate limit
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { ip: providedIP, endpoint, requests, window } = body;
    
    const ip = providedIP || getClientIP(request);
    
    // Build config from request or use defaults
    const config = requests && window
      ? { requests, window }
      : endpoint && endpoint in RATE_LIMITS
        ? RATE_LIMITS[endpoint as keyof typeof RATE_LIMITS]
        : RATE_LIMITS.DEFAULT;
    
    const result = await checkRateLimit(ip, config, endpoint);
    
    // If rate limited, return 429
    if (!result.allowed) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please try again later.',
            details: {
              retryAfter: result.retryAfter,
              resetAt: new Date(result.resetAt).toISOString(),
            },
          },
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(result.retryAfter || 60),
            'X-RateLimit-Limit': String(config.requests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.floor(result.resetAt / 1000)),
          },
        }
      );
    }
    
    // Return success with rate limit headers
    return new NextResponse(
      JSON.stringify({
        success: true,
        data: {
          allowed: true,
          remaining: result.remaining,
          resetAt: new Date(result.resetAt).toISOString(),
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(config.requests),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(Math.floor(result.resetAt / 1000)),
        },
      }
    );
  } catch (error) {
    console.error('Rate limit check error:', error);
    return errorNextResponse('Rate limit check failed', ErrorCode.INTERNAL_ERROR);
  }
}
