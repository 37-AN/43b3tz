// 43V3R BET AI - Scraper Service Database Integration
// Direct database access using Prisma Client

import { PrismaClient, Match, Odds, OddsHistory, League, Team } from '@prisma/client';

// Database singleton
let prisma: PrismaClient | null = null;

export function getDb(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' },
      ],
    });

    // Log all queries in development
    prisma.$on('query', (e: any) => {
      console.log(`[DB QUERY] ${e.query} | Duration: ${e.duration}ms`);
    });

    console.log('[DB] Database connection initialized');
  }
  return prisma;
}

// Graceful shutdown
export async function closeDb(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    console.log('[DB] Database connection closed');
    prisma = null;
  }
}

// ==================== LEAGUE OPERATIONS ====================

export async function upsertLeague(data: {
  name: string;
  country: string;
  logo?: string;
}): Promise<League> {
  const db = getDb();
  
  console.log(`[DB] Upserting league: ${data.name} (${data.country})`);
  
  const league = await db.league.upsert({
    where: {
      // Find by name + country combination
      id: await db.league.findFirst({
        where: { name: data.name, country: data.country },
        select: { id: true }
      }).then(l => l?.id || 'not-found')
    },
    update: {
      name: data.name,
      country: data.country,
      logo: data.logo,
      isActive: true,
    },
    create: {
      name: data.name,
      country: data.country,
      logo: data.logo,
      isActive: true,
    },
  });

  console.log(`[DB] League ${league.id} upserted successfully`);
  return league;
}

// ==================== TEAM OPERATIONS ====================

export async function upsertTeam(data: {
  name: string;
  logo?: string;
  country?: string;
  leagueId?: string;
  form?: string;
  goalsScored?: number;
  goalsConceded?: number;
}): Promise<Team> {
  const db = getDb();
  
  console.log(`[DB] Upserting team: ${data.name}`);
  
  // Find existing team by name
  const existingTeam = await db.team.findFirst({
    where: { name: data.name }
  });

  if (existingTeam) {
    const updated = await db.team.update({
      where: { id: existingTeam.id },
      data: {
        logo: data.logo ?? existingTeam.logo,
        country: data.country ?? existingTeam.country,
        leagueId: data.leagueId ?? existingTeam.leagueId,
        form: data.form ?? existingTeam.form,
        goalsScored: data.goalsScored ?? existingTeam.goalsScored,
        goalsConceded: data.goalsConceded ?? existingTeam.goalsConceded,
      },
    });
    console.log(`[DB] Team ${updated.id} updated successfully`);
    return updated;
  }

  const newTeam = await db.team.create({
    data: {
      name: data.name,
      logo: data.logo,
      country: data.country,
      leagueId: data.leagueId,
      form: data.form,
      goalsScored: data.goalsScored ?? 0,
      goalsConceded: data.goalsConceded ?? 0,
    },
  });

  console.log(`[DB] Team ${newTeam.id} created successfully`);
  return newTeam;
}

// ==================== MATCH OPERATIONS ====================

export interface MatchData {
  externalId?: string; // External API fixture ID
  leagueId: string;
  homeTeamId: string;
  awayTeamId: string;
  kickoffTime: Date;
  status?: string;
  homeScore?: number;
  awayScore?: number;
  minute?: number;
}

export async function findExistingMatch(
  homeTeamId: string,
  awayTeamId: string,
  kickoffTime: Date
): Promise<Match | null> {
  const db = getDb();
  
  // Allow 1 hour tolerance for kickoff time
  const timeStart = new Date(kickoffTime.getTime() - 60 * 60 * 1000);
  const timeEnd = new Date(kickoffTime.getTime() + 60 * 60 * 1000);
  
  const match = await db.match.findFirst({
    where: {
      homeTeamId,
      awayTeamId,
      kickoffTime: {
        gte: timeStart,
        lte: timeEnd,
      },
    },
  });
  
  return match;
}

export async function upsertMatch(data: MatchData): Promise<Match> {
  const db = getDb();
  
  console.log(`[DB] Upserting match: ${data.homeTeamId} vs ${data.awayTeamId} at ${data.kickoffTime.toISOString()}`);
  
  // Check for existing match first (deduplication)
  const existingMatch = await findExistingMatch(
    data.homeTeamId,
    data.awayTeamId,
    data.kickoffTime
  );

  if (existingMatch) {
    const updated = await db.match.update({
      where: { id: existingMatch.id },
      data: {
        status: data.status ?? existingMatch.status,
        homeScore: data.homeScore ?? existingMatch.homeScore,
        awayScore: data.awayScore ?? existingMatch.awayScore,
        minute: data.minute ?? existingMatch.minute,
      },
    });
    console.log(`[DB] Match ${updated.id} updated successfully`);
    return updated;
  }

  const newMatch = await db.match.create({
    data: {
      leagueId: data.leagueId,
      homeTeamId: data.homeTeamId,
      awayTeamId: data.awayTeamId,
      kickoffTime: data.kickoffTime,
      status: data.status ?? 'scheduled',
      homeScore: data.homeScore,
      awayScore: data.awayScore,
      minute: data.minute,
    },
  });

  console.log(`[DB] Match ${newMatch.id} created successfully`);
  return newMatch;
}

// ==================== ODDS OPERATIONS ====================

export interface OddsData {
  matchId: string;
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
  bookmaker?: string;
  homeWinOpen?: number;
  drawOpen?: number;
  awayWinOpen?: number;
}

export async function findExistingOdds(matchId: string): Promise<Odds | null> {
  const db = getDb();
  return db.odds.findUnique({
    where: { matchId }
  });
}

export async function upsertOdds(data: OddsData): Promise<Odds> {
  const db = getDb();
  
  console.log(`[DB] Upserting odds for match ${data.matchId}: H=${data.homeWin} D=${data.draw} A=${data.awayWin}`);
  
  const existing = await findExistingOdds(data.matchId);

  if (existing) {
    // Check if odds have changed (for movement tracking)
    const hasChanged = 
      existing.homeWin !== data.homeWin ||
      existing.draw !== data.draw ||
      existing.awayWin !== data.awayWin;

    if (hasChanged) {
      // Store previous odds in history before updating
      await storeOddsHistory({
        matchId: data.matchId,
        homeWin: existing.homeWin,
        draw: existing.draw,
        awayWin: existing.awayWin,
        bookmaker: existing.bookmaker,
      });
    }

    const updated = await db.odds.update({
      where: { matchId: data.matchId },
      data: {
        homeWin: data.homeWin,
        draw: data.draw,
        awayWin: data.awayWin,
        over25: data.over25 ?? existing.over25,
        under25: data.under25 ?? existing.under25,
        bttsYes: data.bttsYes ?? existing.bttsYes,
        bttsNo: data.bttsNo ?? existing.bttsNo,
        homeDraw: data.homeDraw ?? existing.homeDraw,
        homeAway: data.homeAway ?? existing.homeAway,
        drawAway: data.drawAway ?? existing.drawAway,
        bookmaker: data.bookmaker ?? existing.bookmaker,
        homeWinOpen: data.homeWinOpen ?? existing.homeWinOpen,
        drawOpen: data.drawOpen ?? existing.drawOpen,
        awayWinOpen: data.awayWinOpen ?? existing.awayWinOpen,
      },
    });

    console.log(`[DB] Odds for match ${data.matchId} updated (changed: ${hasChanged})`);
    return updated;
  }

  const newOdds = await db.odds.create({
    data: {
      matchId: data.matchId,
      homeWin: data.homeWin,
      draw: data.draw,
      awayWin: data.awayWin,
      over25: data.over25,
      under25: data.under25,
      bttsYes: data.bttsYes,
      bttsNo: data.bttsNo,
      homeDraw: data.homeDraw,
      homeAway: data.homeAway,
      drawAway: data.drawAway,
      bookmaker: data.bookmaker ?? 'aggregate',
      homeWinOpen: data.homeWinOpen ?? data.homeWin,
      drawOpen: data.drawOpen ?? data.draw,
      awayWinOpen: data.awayWinOpen ?? data.awayWin,
    },
  });

  console.log(`[DB] Odds for match ${data.matchId} created successfully`);
  return newOdds;
}

// ==================== ODDS HISTORY ====================

export async function storeOddsHistory(data: {
  matchId: string;
  homeWin: number;
  draw: number;
  awayWin: number;
  bookmaker: string;
}): Promise<OddsHistory> {
  const db = getDb();
  
  console.log(`[DB] Storing odds history for match ${data.matchId}`);
  
  const history = await db.oddsHistory.create({
    data: {
      matchId: data.matchId,
      homeWin: data.homeWin,
      draw: data.draw,
      awayWin: data.awayWin,
      bookmaker: data.bookmaker,
    },
  });

  return history;
}

export async function getOddsHistory(matchId: string): Promise<OddsHistory[]> {
  const db = getDb();
  return db.oddsHistory.findMany({
    where: { matchId },
    orderBy: { recordedAt: 'asc' },
  });
}

// ==================== HEALTH CHECK ====================

export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  latency?: number;
  error?: string;
}> {
  const db = getDb();
  
  try {
    const start = Date.now();
    await db.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    
    return {
      connected: true,
      latency,
    };
  } catch (error) {
    console.error('[DB] Health check failed:', error);
    return {
      connected: false,
      error: String(error),
    };
  }
}

// ==================== STATISTICS ====================

export async function getDatabaseStats(): Promise<{
  leagues: number;
  teams: number;
  matches: number;
  odds: number;
  oddsHistory: number;
}> {
  const db = getDb();
  
  const [leagues, teams, matches, odds, oddsHistory] = await Promise.all([
    db.league.count(),
    db.team.count(),
    db.match.count(),
    db.odds.count(),
    db.oddsHistory.count(),
  ]);

  return { leagues, teams, matches, odds, oddsHistory };
}

// Export types
export type { Match, Odds, OddsHistory, League, Team };
