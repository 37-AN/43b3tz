// 43V3R BET AI - Scraper Service Core Logic
// Handles data fetching, deduplication, validation, and database storage

import {
  upsertLeague,
  upsertTeam,
  upsertMatch,
  upsertOdds,
  findExistingMatch,
  findExistingOdds,
  getDatabaseStats,
  type MatchData,
  type OddsData,
} from './db.js';
import {
  validateMatchData,
  validateOddsData,
  logValidationResult,
  type RawMatchData,
  type RawOddsData,
} from './validator.js';

// ==================== TYPES ====================

export interface ScraperConfig {
  maxRetries: number;
  retryDelayMs: number;
  scrapeIntervalMs: number;
  enableMockData: boolean;
}

export interface ScraperResult {
  success: boolean;
  matchesProcessed: number;
  oddsProcessed: number;
  matchesSkipped: number;
  oddsSkipped: number;
  errors: string[];
  duration: number;
}

export interface ScrapeData {
  match: RawMatchData;
  odds?: RawOddsData;
}

// ==================== DEFAULT CONFIG ====================

const DEFAULT_CONFIG: ScraperConfig = {
  maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
  retryDelayMs: parseInt(process.env.RETRY_DELAY_MS || '1000', 10),
  scrapeIntervalMs: parseInt(process.env.SCRAPER_INTERVAL_MS || '60000', 10),
  enableMockData: true,
};

// ==================== RETRY MECHANISM ====================

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  config: ScraperConfig
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      const result = await operation();
      if (attempt > 1) {
        console.log(`[RETRY] ${operationName} succeeded on attempt ${attempt}`);
      }
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[RETRY] ${operationName} failed on attempt ${attempt}/${config.maxRetries}: ${lastError.message}`);
      
      if (attempt < config.maxRetries) {
        // Exponential backoff
        const delay = config.retryDelayMs * Math.pow(2, attempt - 1);
        console.log(`[RETRY] Waiting ${delay}ms before retry...`);
        await sleep(delay);
      }
    }
  }

  throw new Error(`${operationName} failed after ${config.maxRetries} attempts: ${lastError?.message}`);
}

// ==================== DATA PROCESSING ====================

export class ScraperService {
  private config: ScraperConfig;
  private isRunning: boolean = false;
  private intervalId: Timer | null = null;

  constructor(config: Partial<ScraperConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    console.log('[SCRAPER] Initialized with config:', this.config);
  }

  // ==================== MAIN SCRAPE LOGIC ====================

  async scrapeOnce(): Promise<ScraperResult> {
    const startTime = Date.now();
    const result: ScraperResult = {
      success: true,
      matchesProcessed: 0,
      oddsProcessed: 0,
      matchesSkipped: 0,
      oddsSkipped: 0,
      errors: [],
    };

    console.log('\n[SCRAPER] Starting scrape cycle...');

    try {
      // Get data (mock or real)
      const data = await this.fetchData();

      // Process each match and odds
      for (const item of data) {
        try {
          await this.processItem(item, result);
        } catch (error) {
          const errorMsg = `Failed to process item: ${error instanceof Error ? error.message : String(error)}`;
          console.error(`[SCRAPER] ${errorMsg}`);
          result.errors.push(errorMsg);
          result.success = false;
        }
      }
    } catch (error) {
      const errorMsg = `Scrape failed: ${error instanceof Error ? error.message : String(error)}`;
      console.error(`[SCRAPER] ${errorMsg}`);
      result.errors.push(errorMsg);
      result.success = false;
    }

    result.duration = Date.now() - startTime;
    console.log(`[SCRAPER] Scrape completed in ${result.duration}ms`);
    console.log(`[SCRAPER] Stats: Matches=${result.matchesProcessed} processed, ${result.matchesSkipped} skipped | Odds=${result.oddsProcessed} processed, ${result.oddsSkipped} skipped`);

    if (result.errors.length > 0) {
      console.error(`[SCRAPER] Errors: ${result.errors.length}`);
    }

    return result;
  }

  // ==================== FETCH DATA ====================

  private async fetchData(): Promise<ScrapeData[]> {
    if (this.config.enableMockData) {
      return this.generateMockData();
    }

    // Real API fetching would go here
    // For now, fall back to mock data
    console.log('[SCRAPER] No real API configured, using mock data');
    return this.generateMockData();
  }

  private generateMockData(): ScrapeData[] {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return [
      // Premier League
      {
        match: {
          homeTeam: 'Arsenal',
          awayTeam: 'Chelsea',
          league: 'Premier League',
          country: 'England',
          kickoffTime: tomorrow,
          status: 'scheduled',
        },
        odds: {
          homeWin: 2.10,
          draw: 3.40,
          awayWin: 3.50,
          over25: 1.85,
          under25: 1.95,
          bttsYes: 1.75,
          bttsNo: 2.05,
          bookmaker: 'Bet365',
        },
      },
      {
        match: {
          homeTeam: 'Manchester United',
          awayTeam: 'Liverpool',
          league: 'Premier League',
          country: 'England',
          kickoffTime: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000),
          status: 'scheduled',
        },
        odds: {
          homeWin: 3.20,
          draw: 3.30,
          awayWin: 2.30,
          over25: 1.70,
          under25: 2.15,
          bookmaker: 'William Hill',
        },
      },
      // La Liga
      {
        match: {
          homeTeam: 'Real Madrid',
          awayTeam: 'Barcelona',
          league: 'La Liga',
          country: 'Spain',
          kickoffTime: new Date(tomorrow.getTime() + 4 * 60 * 60 * 1000),
          status: 'scheduled',
        },
        odds: {
          homeWin: 2.25,
          draw: 3.50,
          awayWin: 3.00,
          over25: 1.65,
          under25: 2.25,
          bookmaker: 'aggregate',
        },
      },
      {
        match: {
          homeTeam: 'Atletico Madrid',
          awayTeam: 'Sevilla',
          league: 'La Liga',
          country: 'Spain',
          kickoffTime: new Date(tomorrow.getTime() + 6 * 60 * 60 * 1000),
          status: 'scheduled',
        },
        odds: {
          homeWin: 1.75,
          draw: 3.60,
          awayWin: 4.50,
          bookmaker: 'aggregate',
        },
      },
      // Bundesliga
      {
        match: {
          homeTeam: 'Bayern Munich',
          awayTeam: 'Borussia Dortmund',
          league: 'Bundesliga',
          country: 'Germany',
          kickoffTime: new Date(tomorrow.getTime() + 8 * 60 * 60 * 1000),
          status: 'scheduled',
        },
        odds: {
          homeWin: 1.60,
          draw: 4.20,
          awayWin: 5.00,
          over25: 1.50,
          under25: 2.60,
          bookmaker: 'Betway',
        },
      },
      // Serie A
      {
        match: {
          homeTeam: 'Juventus',
          awayTeam: 'AC Milan',
          league: 'Serie A',
          country: 'Italy',
          kickoffTime: new Date(tomorrow.getTime() + 10 * 60 * 60 * 1000),
          status: 'scheduled',
        },
        odds: {
          homeWin: 2.00,
          draw: 3.40,
          awayWin: 3.80,
          bookmaker: 'aggregate',
        },
      },
      // PSL South Africa
      {
        match: {
          homeTeam: 'Kaizer Chiefs',
          awayTeam: 'Orlando Pirates',
          league: 'PSL',
          country: 'South Africa',
          kickoffTime: new Date(tomorrow.getTime() + 12 * 60 * 60 * 1000),
          status: 'scheduled',
        },
        odds: {
          homeWin: 2.80,
          draw: 3.10,
          awayWin: 2.50,
          bookmaker: 'Hollywoodbets',
        },
      },
      {
        match: {
          homeTeam: 'Mamelodi Sundowns',
          awayTeam: 'Supersport United',
          league: 'PSL',
          country: 'South Africa',
          kickoffTime: new Date(tomorrow.getTime() + 14 * 60 * 60 * 1000),
          status: 'scheduled',
        },
        odds: {
          homeWin: 1.55,
          draw: 4.00,
          awayWin: 5.50,
          bookmaker: 'Betway',
        },
      },
      // Champions League
      {
        match: {
          homeTeam: 'Paris Saint-Germain',
          awayTeam: 'Inter Milan',
          league: 'Champions League',
          country: 'Europe',
          kickoffTime: new Date(tomorrow.getTime() + 16 * 60 * 60 * 1000),
          status: 'scheduled',
        },
        odds: {
          homeWin: 1.90,
          draw: 3.60,
          awayWin: 4.00,
          over25: 1.60,
          under25: 2.35,
          bookmaker: 'aggregate',
        },
      },
      // Live match (for testing live updates)
      {
        match: {
          homeTeam: 'Newcastle',
          awayTeam: 'Tottenham',
          league: 'Premier League',
          country: 'England',
          kickoffTime: new Date(now.getTime() - 45 * 60 * 1000), // Started 45 mins ago
          status: 'live',
          homeScore: 1,
          awayScore: 1,
          minute: 45,
        },
        odds: {
          homeWin: 2.50,
          draw: 3.20,
          awayWin: 2.90,
          bookmaker: 'Live',
        },
      },
    ];
  }

  // ==================== PROCESS ITEM ====================

  private async processItem(item: ScrapeData, result: ScraperResult): Promise<void> {
    // Validate match data
    const matchValidation = validateMatchData(item.match);
    logValidationResult(`Match: ${item.match.homeTeam} vs ${item.match.awayTeam}`, matchValidation);

    if (!matchValidation.valid) {
      result.matchesSkipped++;
      result.errors.push(`Invalid match data: ${matchValidation.errors.join(', ')}`);
      return;
    }

    // Use retry mechanism for database operations
    await withRetry(async () => {
      // 1. Create/Update League
      const league = await upsertLeague({
        name: matchValidation.data!.league,
        country: matchValidation.data!.country,
      });

      // 2. Create/Update Teams
      const [homeTeam, awayTeam] = await Promise.all([
        upsertTeam({
          name: matchValidation.data!.homeTeam,
          country: matchValidation.data!.country,
          leagueId: league.id,
        }),
        upsertTeam({
          name: matchValidation.data!.awayTeam,
          country: matchValidation.data!.country,
          leagueId: league.id,
        }),
      ]);

      // 3. Check for existing match (deduplication)
      const existingMatch = await findExistingMatch(
        homeTeam.id,
        awayTeam.id,
        matchValidation.data!.kickoffTime
      );

      // 4. Create/Update Match
      const match = await upsertMatch({
        leagueId: league.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        kickoffTime: matchValidation.data!.kickoffTime,
        status: item.match.status as string,
        homeScore: item.match.homeScore as number | undefined,
        awayScore: item.match.awayScore as number | undefined,
        minute: item.match.minute as number | undefined,
      });

      if (existingMatch) {
        console.log(`[SCRAPER] Match already existed, updated: ${match.id}`);
      } else {
        console.log(`[SCRAPER] New match created: ${match.id}`);
        result.matchesProcessed++;
      }

      // 5. Process Odds if provided
      if (item.odds) {
        await this.processOdds(match.id, item.odds, result);
      }
    }, `Process match ${item.match.homeTeam} vs ${item.match.awayTeam}`, this.config);
  }

  private async processOdds(matchId: string, rawOdds: RawOddsData, result: ScraperResult): Promise<void> {
    const oddsValidation = validateOddsData(rawOdds);
    logValidationResult(`Odds for match ${matchId}`, oddsValidation);

    if (!oddsValidation.valid) {
      result.oddsSkipped++;
      result.errors.push(`Invalid odds data: ${oddsValidation.errors.join(', ')}`);
      return;
    }

    await withRetry(async () => {
      // Check for existing odds (deduplication)
      const existingOdds = await findExistingOdds(matchId);

      // Create/Update Odds
      const odds = await upsertOdds({
        matchId,
        homeWin: oddsValidation.data!.homeWin,
        draw: oddsValidation.data!.draw,
        awayWin: oddsValidation.data!.awayWin,
        over25: oddsValidation.data!.over25,
        under25: oddsValidation.data!.under25,
        bttsYes: oddsValidation.data!.bttsYes,
        bttsNo: oddsValidation.data!.bttsNo,
        bookmaker: rawOdds.bookmaker as string,
      });

      if (existingOdds) {
        console.log(`[SCRAPER] Odds updated for match ${matchId}`);
      } else {
        console.log(`[SCRAPER] New odds created for match ${matchId}`);
        result.oddsProcessed++;
      }
    }, `Process odds for match ${matchId}`, this.config);
  }

  // ==================== SERVICE CONTROL ====================

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[SCRAPER] Service already running');
      return;
    }

    console.log(`[SCRAPER] Starting service with ${this.config.scrapeIntervalMs}ms interval`);
    this.isRunning = true;

    // Run initial scrape
    await this.scrapeOnce();

    // Schedule periodic scrapes
    this.intervalId = setInterval(async () => {
      if (this.isRunning) {
        await this.scrapeOnce();
      }
    }, this.config.scrapeIntervalMs);

    console.log('[SCRAPER] Service started successfully');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('[SCRAPER] Service not running');
      return;
    }

    console.log('[SCRAPER] Stopping service...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('[SCRAPER] Service stopped');
  }

  getStatus(): { running: boolean; config: ScraperConfig } {
    return {
      running: this.isRunning,
      config: this.config,
    };
  }

  async getStats(): Promise<{
    database: Awaited<ReturnType<typeof getDatabaseStats>>;
    scraper: { running: boolean; config: ScraperConfig };
  }> {
    const [databaseStats] = await Promise.all([getDatabaseStats()]);

    return {
      database: databaseStats,
      scraper: this.getStatus(),
    };
  }
}

// Export singleton instance
export const scraperService = new ScraperService();
