import { NextRequest } from 'next/server';
import { 
  redis,
  CACHE_TTL,
  CACHE_KEYS,
  invalidateMatchCaches,
  invalidateOddsCaches,
  invalidatePredictionCaches,
  invalidateLeaderboardCache,
  invalidateTipsterCache,
  invalidateAllCaches,
  getCacheStats,
} from '@/lib/redis';
import { 
  successResponse, 
  errorNextResponse, 
  toNextResponse,
  ErrorCode 
} from '@/lib/api-response';

// GET /api/cache - Get cache statistics and status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Get cache statistics
    if (action === 'stats' || !action) {
      const stats = getCacheStats();
      
      return toNextResponse(successResponse({
        status: 'healthy',
        connected: redis.isReady(),
        usingMock: redis.isUsingMock(),
        statistics: stats,
        ttlConfig: CACHE_TTL,
        keyPrefixes: CACHE_KEYS,
      }));
    }

    // Get keys matching a pattern
    if (action === 'keys') {
      const pattern = searchParams.get('pattern') || '*';
      const keys = await redis.keys(pattern);
      
      return toNextResponse(successResponse({
        pattern,
        count: keys.length,
        keys: keys.slice(0, 100), // Limit to 100 keys for safety
      }));
    }

    // Get value for a specific key
    if (action === 'get') {
      const key = searchParams.get('key');
      if (!key) {
        return errorNextResponse('Key parameter required', ErrorCode.VALIDATION_ERROR);
      }
      
      const value = await redis.get(key);
      const ttl = await redis.ttl(key);
      
      return toNextResponse(successResponse({
        key,
        value,
        ttl,
        exists: value !== null,
      }));
    }

    return errorNextResponse('Invalid action', ErrorCode.VALIDATION_ERROR);
  } catch (error) {
    console.error('Cache API error:', error);
    return errorNextResponse('Cache operation failed', ErrorCode.INTERNAL_ERROR);
  }
}

// DELETE /api/cache - Invalidate caches
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') || 'all';
    const id = searchParams.get('id');

    switch (scope) {
      case 'matches':
        await invalidateMatchCaches(id || undefined);
        break;
      case 'odds':
        await invalidateOddsCaches(id || undefined);
        break;
      case 'predictions':
        await invalidatePredictionCaches();
        break;
      case 'leaderboard':
        await invalidateLeaderboardCache(id || undefined);
        break;
      case 'tipsters':
        await invalidateTipsterCache(id || undefined);
        break;
      case 'all':
        await invalidateAllCaches();
        break;
      case 'key':
        if (!id) {
          return errorNextResponse('Key (id) parameter required for key scope', ErrorCode.VALIDATION_ERROR);
        }
        await redis.del(id);
        break;
      case 'pattern':
        if (!id) {
          return errorNextResponse('Pattern (id) parameter required for pattern scope', ErrorCode.VALIDATION_ERROR);
        }
        await redis.delPattern(id);
        break;
      default:
        return errorNextResponse('Invalid scope', ErrorCode.VALIDATION_ERROR);
    }

    return toNextResponse(successResponse({
      message: `Cache invalidated: ${scope}`,
      scope,
      id: id || null,
    }));
  } catch (error) {
    console.error('Cache invalidation error:', error);
    return errorNextResponse('Cache invalidation failed', ErrorCode.INTERNAL_ERROR);
  }
}

// POST /api/cache - Manual cache operations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, key, value, ttl, keys, keyValues } = body;

    switch (action) {
      case 'set':
        if (!key || value === undefined) {
          return errorNextResponse('Key and value required for set action', ErrorCode.VALIDATION_ERROR);
        }
        await redis.set(key, value, ttl);
        return toNextResponse(successResponse({
          message: 'Key set successfully',
          key,
          ttl: ttl || 'default',
        }));

      case 'mset':
        if (!keyValues || typeof keyValues !== 'object') {
          return errorNextResponse('keyValues object required for mset action', ErrorCode.VALIDATION_ERROR);
        }
        await redis.mset(keyValues, ttl);
        return toNextResponse(successResponse({
          message: 'Multiple keys set successfully',
          count: Object.keys(keyValues).length,
          ttl: ttl || 'default',
        }));

      case 'mget':
        if (!keys || !Array.isArray(keys)) {
          return errorNextResponse('Keys array required for mget action', ErrorCode.VALIDATION_ERROR);
        }
        const values = await redis.mget(...keys);
        return toNextResponse(successResponse({
          keys,
          values,
        }));

      case 'expire':
        if (!key || !ttl) {
          return errorNextResponse('Key and ttl required for expire action', ErrorCode.VALIDATION_ERROR);
        }
        const success = await redis.expire(key, ttl);
        return toNextResponse(successResponse({
          message: success ? 'TTL updated' : 'Key not found',
          key,
          ttl,
          success,
        }));

      default:
        return errorNextResponse('Invalid action', ErrorCode.VALIDATION_ERROR);
    }
  } catch (error) {
    console.error('Cache POST error:', error);
    return errorNextResponse('Cache operation failed', ErrorCode.INTERNAL_ERROR);
  }
}
