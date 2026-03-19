import { NextRequest, NextResponse } from 'next/server';
import { mockTipsters, generateMockTips } from '@/lib/mock-data';
import {
  CACHE_TTL,
  CACHE_KEYS,
  withRateLimitAndCache,
  generateCacheKey,
} from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const featured = searchParams.get('featured');
    const tipsterId = searchParams.get('id');

    // Generate cache key based on query parameters
    const cacheKey = generateCacheKey(CACHE_KEYS.TIPSTERS, request, {
      featured,
      tipsterId,
    });

    // Use cache with rate limiting
    return withRateLimitAndCache(
      request,
      cacheKey,
      async () => {
        // Get specific tipster
        if (tipsterId) {
          const tipster = mockTipsters.find(t => t.id === tipsterId);
          if (!tipster) {
            return {
              success: false,
              error: 'Tipster not found',
              status: 404,
            };
          }
          
          const tips = generateMockTips().filter(t => t.tipsterId === tipsterId);
          
          return {
            success: true,
            data: {
              ...tipster,
              tips
            }
          };
        }

        // Get featured tipsters
        if (featured === 'true') {
          const featuredTipsters = mockTipsters.filter(t => t.isFeatured);
          return {
            success: true,
            data: featuredTipsters,
            total: featuredTipsters.length
          };
        }

        // Get all tipsters
        return {
          success: true,
          data: mockTipsters,
          total: mockTipsters.length
        };
      },
      {
        cache: {
          ttl: CACHE_TTL.TIPSTERS,
          visibility: 'public',
        },
        rateLimit: {
          requests: 100,
          window: 60,
        },
      }
    );
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch tipsters'
    }, { status: 500 });
  }
}
