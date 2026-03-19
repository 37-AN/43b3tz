import { NextResponse } from 'next/server';

// Health check endpoint for Docker/Kubernetes probes
export async function GET() {
  const timestamp = new Date().toISOString();
  
  try {
    // Basic health check
    const health = {
      status: 'healthy',
      timestamp,
      service: '43v3r-frontend',
      version: process.env.npm_package_version || '0.2.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      checks: {
        database: 'unknown',
        redis: 'unknown',
        services: {
          aiEngine: 'unknown',
          scraper: 'unknown',
          realtime: 'unknown',
          telegramBot: 'unknown',
        },
      },
    };

    // Check database connectivity
    try {
      const { db } = await import('@/lib/db');
      await db.$queryRaw`SELECT 1`;
      health.checks.database = 'connected';
    } catch (error) {
      health.checks.database = 'disconnected';
      health.status = 'degraded';
    }

    // Check Redis connectivity (if configured)
    // Note: Redis check would require redis client initialization
    // For now, we'll mark it as not configured
    if (process.env.REDIS_URL) {
      health.checks.redis = 'configured';
    } else {
      health.checks.redis = 'not_configured';
    }

    // Check AI Engine health
    const aiEngineUrl = process.env.AI_ENGINE_URL || 'http://localhost:3006';
    try {
      const aiEngineResponse = await fetch(`${aiEngineUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      health.checks.services.aiEngine = aiEngineResponse.ok ? 'healthy' : 'unhealthy';
    } catch {
      health.checks.services.aiEngine = 'unreachable';
    }

    // Check Scraper Service health
    const scraperUrl = process.env.SCRAPER_URL || 'http://localhost:3005';
    try {
      const scraperResponse = await fetch(`${scraperUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      health.checks.services.scraper = scraperResponse.ok ? 'healthy' : 'unhealthy';
    } catch {
      health.checks.services.scraper = 'unreachable';
    }

    // Check Realtime Service health
    const realtimeUrl = process.env.REALTIME_URL || 'http://localhost:3003';
    try {
      const realtimeResponse = await fetch(`${realtimeUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      health.checks.services.realtime = realtimeResponse.ok ? 'healthy' : 'unhealthy';
    } catch {
      health.checks.services.realtime = 'unreachable';
    }

    // Check Telegram Bot health
    const telegramBotUrl = process.env.TELEGRAM_BOT_URL || 'http://localhost:3008';
    try {
      const telegramResponse = await fetch(`${telegramBotUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      health.checks.services.telegramBot = telegramResponse.ok ? 'healthy' : 'unhealthy';
    } catch {
      health.checks.services.telegramBot = 'unreachable';
    }

    // Determine overall status
    const allServicesHealthy = Object.values(health.checks.services).every(
      status => status === 'healthy' || status === 'unreachable'
    );
    
    if (health.checks.database === 'disconnected') {
      health.status = 'unhealthy';
    } else if (!allServicesHealthy) {
      health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp,
        service: '43v3r-frontend',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}

// Head request for liveness probe
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
