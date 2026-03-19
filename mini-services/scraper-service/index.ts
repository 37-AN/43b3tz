// 43V3R BET AI - Scraper Service
// Standalone service for scraping and storing match/odds data
// Writes directly to database with deduplication and retry logic

import { createServer } from 'http';
import { ScraperService, scraperService } from './lib/scraper.js';
import { checkDatabaseHealth, closeDb, getDatabaseStats } from './lib/db.js';

const PORT = 3004;
const HTTP_PORT = 3005;

// ==================== HTTP SERVER ====================

const httpServer = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${HTTP_PORT}`);

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
      const dbHealth = await checkDatabaseHealth();
      const scraperStatus = scraperService.getStatus();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: dbHealth,
        scraper: scraperStatus,
      }));
      return;
    }

    // Stats endpoint
    if (url.pathname === '/stats') {
      const stats = await scraperService.getStats();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(stats, null, 2));
      return;
    }

    // Manual trigger endpoint
    if (url.pathname === '/scrape' && req.method === 'POST') {
      console.log('[HTTP] Manual scrape triggered');
      const result = await scraperService.scrapeOnce();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result, null, 2));
      return;
    }

    // Start scraper
    if (url.pathname === '/start' && req.method === 'POST') {
      await scraperService.start();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Scraper started', status: scraperService.getStatus() }));
      return;
    }

    // Stop scraper
    if (url.pathname === '/stop' && req.method === 'POST') {
      await scraperService.stop();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Scraper stopped', status: scraperService.getStatus() }));
      return;
    }

    // Database stats
    if (url.pathname === '/db/stats') {
      const dbStats = await getDatabaseStats();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(dbStats, null, 2));
      return;
    }

    // 404 for unknown routes
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  } catch (error) {
    console.error('[HTTP] Error handling request:', error);
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
    await scraperService.stop();
    await closeDb();
    httpServer.close(() => {
      console.log('[MAIN] HTTP server closed');
      process.exit(0);
    });
  } catch (error) {
    console.error('[MAIN] Error during shutdown:', error);
    process.exit(1);
  }

  // Force exit after 5 seconds
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
  ║   🕷️  43V3R BET AI - Scraper Service                         ║
  ║                                                              ║
  ║   Writing directly to database with deduplication            ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  `);

  // Check database connection
  console.log('[MAIN] Checking database connection...');
  const dbHealth = await checkDatabaseHealth();

  if (!dbHealth.connected) {
    console.error('[MAIN] Database connection failed:', dbHealth.error);
    process.exit(1);
  }

  console.log(`[MAIN] Database connected (latency: ${dbHealth.latency}ms)`);

  // Show initial stats
  const initialStats = await getDatabaseStats();
  console.log('[MAIN] Current database stats:', initialStats);

  // Start HTTP server
  httpServer.listen(HTTP_PORT, () => {
    console.log(`[MAIN] HTTP API server running on port ${HTTP_PORT}`);
    console.log(`
  Available endpoints:
  • GET  /health      - Health check
  • GET  /stats       - Scraper and database stats
  • POST /scrape      - Trigger manual scrape
  • POST /start       - Start scraper
  • POST /stop        - Stop scraper
  • GET  /db/stats    - Database statistics
    `);
  });

  // Start scraper
  console.log('[MAIN] Starting scraper service...');
  await scraperService.start();

  console.log('[MAIN] Scraper service is now running!');
}

// Run main function
main().catch((error) => {
  console.error('[MAIN] Fatal error:', error);
  process.exit(1);
});

// Export for external use
export { ScraperService, scraperService };
