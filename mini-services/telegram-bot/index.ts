// 43V3R BET AI - Telegram Bot Service
// Posts value bets, fantasy tips, and results to Telegram channel
// Connects to AI Engine on port 3006 and database via Prisma

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { PrismaClient, Match, Odds, Player, Gameweek, Team, League, Prediction, Tipster, Tip } from '@prisma/client';

// ==================== CONFIGURATION ====================

const PORT = 3007;
const AI_ENGINE_PORT = 3006;
const MODEL_VERSION = '1.0.0-telegram-bot';

// Environment variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

// SAST timezone offset (UTC+2)
const SAST_OFFSET = 2 * 60 * 60 * 1000;

// Scheduled times (in SAST)
const DAILY_BETS_TIME = 10; // 10:00 SAST

// Thresholds
const VALUE_BET_EDGE_THRESHOLD = 0.07; // 7%+ edge

// ==================== LOGGING ====================

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const currentLogLevel = LOG_LEVELS.INFO;

function log(level: keyof typeof LOG_LEVELS, message: string, data?: any): void {
  const timestamp = new Date().toISOString();
  const levelNum = LOG_LEVELS[level];
  
  if (levelNum >= currentLogLevel) {
    const prefix = `[${timestamp}] [${level}]`;
    if (data) {
      console.log(`${prefix} ${message}`, JSON.stringify(data, null, 2));
    } else {
      console.log(`${prefix} ${message}`);
    }
  }
}

// ==================== DATABASE ====================

let prisma: PrismaClient | null = null;

function getDb(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' },
      ],
    });

    prisma.$on('query', (e: any) => {
      log('DEBUG', `[DB] ${e.query} | ${e.duration}ms`);
    });

    log('INFO', 'Database connection initialized');
  }
  return prisma;
}

async function closeDb(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    log('INFO', 'Database connection closed');
    prisma = null;
  }
}

// ==================== TELEGRAM API ====================

interface TelegramMessage {
  chat_id: string;
  text: string;
  parse_mode?: 'Markdown' | 'HTML';
  disable_notification?: boolean;
}

interface TelegramResponse {
  ok: boolean;
  result?: any;
  description?: string;
  error_code?: number;
}

async function sendTelegramMessage(message: TelegramMessage): Promise<TelegramResponse> {
  if (!TELEGRAM_BOT_TOKEN) {
    log('ERROR', 'TELEGRAM_BOT_TOKEN not configured');
    return { ok: false, description: 'Bot token not configured' };
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const data = await response.json() as TelegramResponse;
    
    if (!data.ok) {
      log('ERROR', 'Telegram API error', { 
        error: data.description,
        errorCode: data.error_code 
      });
    } else {
      log('INFO', 'Message sent to Telegram', { 
        chatId: message.chat_id,
        length: message.text.length 
      });
    }

    return data;
  } catch (error) {
    log('ERROR', 'Failed to send Telegram message', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return { ok: false, description: 'Network error' };
  }
}

async function sendToChannel(text: string, parseMode: 'Markdown' | 'HTML' = 'HTML'): Promise<TelegramResponse> {
  return sendTelegramMessage({
    chat_id: TELEGRAM_CHAT_ID,
    text,
    parse_mode: parseMode,
    disable_notification: false,
  });
}

// ==================== AI ENGINE API ====================

interface AIEngineRequest {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  leagueId: string;
  homeWinOdds: number;
  drawOdds: number;
  awayWinOdds: number;
  homeWinOpenOdds?: number;
  homeForm?: string;
  awayForm?: string;
  h2hHomeWins?: number;
  h2hDraws?: number;
  h2hAwayWins?: number;
}

interface ValueBet {
  matchId: string;
  prediction: 'home' | 'draw' | 'away';
  odds: number;
  aiProbability: number;
  impliedProbability: number;
  edge: number;
  confidence: number;
  kellyFraction: number;
  expectedValue: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendation: string;
}

interface AIEngineResponse {
  success: boolean;
  data?: {
    matchId: string;
    prediction: {
      homeWin: number;
      draw: number;
      awayWin: number;
      confidence: number;
    };
    valueBets: ValueBet[];
  };
  error?: string;
}

interface BatchValueBetsResponse {
  success: boolean;
  data?: {
    valueBets: ValueBet[];
    totalAnalyzed: number;
  };
  error?: string;
}

async function callAIEngine(endpoint: string, data: any): Promise<any> {
  // Use XTransformPort query param to connect to port 3006
  const url = `http://localhost:${AI_ENGINE_PORT}${endpoint}?XTransformPort=${AI_ENGINE_PORT}`;
  
  log('DEBUG', `Calling AI Engine: ${endpoint}`);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    log('DEBUG', `AI Engine response received`, { success: result.success });
    return result;
  } catch (error) {
    log('ERROR', 'Failed to call AI Engine', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint 
    });
    return { success: false, error: 'AI Engine unavailable' };
  }
}

async function getValueBetsFromAI(matches: AIEngineRequest[], minEdge: number = VALUE_BET_EDGE_THRESHOLD): Promise<ValueBet[]> {
  const response: BatchValueBetsResponse = await callAIEngine('/value-bet', {
    matches,
    minEdge,
    minConfidence: 0.65,
  });

  if (!response.success || !response.data) {
    log('WARN', 'Failed to get value bets from AI', { error: response.error });
    return [];
  }

  return response.data.valueBets;
}

// ==================== BOT STATE ====================

interface BotState {
  isRunning: boolean;
  startedAt: Date | null;
  lastPostTime: {
    dailyBets: Date | null;
    valueBets: Date | null;
    fantasyTips: Date | null;
    results: Date | null;
  };
  stats: {
    messagesSent: number;
    valueBetsPosted: number;
    errors: number;
  };
  dailySchedulerInterval: NodeJS.Timeout | null;
}

const botState: BotState = {
  isRunning: false,
  startedAt: null,
  lastPostTime: {
    dailyBets: null,
    valueBets: null,
    fantasyTips: null,
    results: null,
  },
  stats: {
    messagesSent: 0,
    valueBetsPosted: 0,
    errors: 0,
  },
  dailySchedulerInterval: null,
};

// ==================== HELPER FUNCTIONS ====================

function getSASTTime(): Date {
  const now = new Date();
  return new Date(now.getTime() + SAST_OFFSET);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Johannesburg',
  });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-ZA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Africa/Johannesburg',
  });
}

function getPredictionEmoji(prediction: 'home' | 'draw' | 'away'): string {
  switch (prediction) {
    case 'home': return '🏠';
    case 'draw': return '🤝';
    case 'away': return '✈️';
  }
}

function getRiskEmoji(riskLevel: 'low' | 'medium' | 'high'): string {
  switch (riskLevel) {
    case 'low': return '🟢';
    case 'medium': return '🟡';
    case 'high': return '🔴';
  }
}

function getEdgeEmoji(edge: number): string {
  if (edge >= 0.12) return '🔥';
  if (edge >= 0.08) return '⚡';
  return '✅';
}

// ==================== DATABASE QUERIES ====================

async function getUpcomingMatches(): Promise<(Match & { odds: Odds | null; homeTeam: Team; awayTeam: Team; league: League })[]> {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  const matches = await getDb().match.findMany({
    where: {
      kickoffTime: {
        gte: now,
        lte: tomorrow,
      },
      status: 'scheduled',
    },
    include: {
      odds: true,
      homeTeam: true,
      awayTeam: true,
      league: true,
    },
    orderBy: {
      kickoffTime: 'asc',
    },
    take: 20,
  });

  return matches.filter(m => m.odds !== null);
}

async function getFinishedMatches(): Promise<(Match & { odds: Odds | null; homeTeam: Team; awayTeam: Team; predictions: Prediction[] })[]> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const matches = await getDb().match.findMany({
    where: {
      kickoffTime: {
        gte: yesterday,
        lt: today,
      },
      status: 'finished',
    },
    include: {
      odds: true,
      homeTeam: true,
      awayTeam: true,
      predictions: true,
    },
    orderBy: {
      kickoffTime: 'desc',
    },
    take: 20,
  });

  return matches;
}

async function getTopFantasyPicks(): Promise<(Player & { team: Team })[]> {
  // Get current gameweek
  const currentGW = await getDb().gameweek.findFirst({
    where: { isCurrent: true },
  });

  // Get top players by form and ownership
  const players = await getDb().player.findMany({
    where: {
      isActive: true,
      form: { gte: 5 },
    },
    include: {
      team: true,
    },
    orderBy: [
      { form: 'desc' },
      { totalPoints: 'desc' },
    ],
    take: 10,
  });

  return players;
}

async function getTopTipsters(): Promise<(Tipster & { tips: Tip[] })[]> {
  const tipsters = await getDb().tipster.findMany({
    where: {
      isVerified: true,
      winRate: { gte: 0.6 },
    },
    include: {
      tips: {
        where: {
          result: 'pending',
        },
        take: 3,
      },
    },
    orderBy: {
      roi: 'desc',
    },
    take: 5,
  });

  return tipsters;
}

// ==================== MESSAGE FORMATTING ====================

function formatValueBetMessage(
  bet: ValueBet, 
  match: { homeTeam: Team; awayTeam: Team; league: League; kickoffTime: Date },
  index: number
): string {
  const predictionText = bet.prediction === 'home' 
    ? match.homeTeam.name 
    : bet.prediction === 'away' 
      ? match.awayTeam.name 
      : 'DRAW';

  return `
<b>${index + 1}. ${match.homeTeam.name} vs ${match.awayTeam.name}</b>
${getPredictionEmoji(bet.prediction)} <b>Prediction: ${predictionText}</b>
📊 League: ${match.league.name}
⏰ Kickoff: ${formatTime(match.kickoffTime)} SAST

💰 Odds: <b>${bet.odds.toFixed(2)}</b>
🎯 AI Probability: <b>${(bet.aiProbability * 100).toFixed(1)}%</b>
${getEdgeEmoji(bet.edge)} Edge: <b>+${(bet.edge * 100).toFixed(1)}%</b>
${getRiskEmoji(bet.riskLevel)} Risk: ${bet.riskLevel.toUpperCase()}
📈 Kelly Stake: ${(bet.kellyFraction * 100).toFixed(1)}%
`;
}

function formatDailyBetsMessage(valueBets: Array<{
  bet: ValueBet;
  match: { homeTeam: Team; awayTeam: Team; league: League; kickoffTime: Date };
}>): string {
  const date = formatDate(new Date());
  
  let message = `🔥 <b>43V3R BET AI - Daily Value Bets</b>
📅 ${date}

`;

  if (valueBets.length === 0) {
    message += `\n⚠️ No high-value bets found for today.\nStay tuned for updates!`;
  } else {
    message += `<b>Top ${valueBets.length} AI Value Bets:</b>
`;

    for (let i = 0; i < valueBets.length; i++) {
      const { bet, match } = valueBets[i];
      message += formatValueBetMessage(bet, match, i);
      message += '\n───────────────\n';
    }

    // Summary
    const avgEdge = valueBets.reduce((sum, v) => sum + v.bet.edge, 0) / valueBets.length;
    message += `
📊 <b>Summary:</b>
• Total Value Bets: ${valueBets.length}
• Average Edge: +${(avgEdge * 100).toFixed(1)}%
• Best Edge: +${(Math.max(...valueBets.map(v => v.bet.edge)) * 100).toFixed(1)}%

<i>⚠️ Bet responsibly. These are AI predictions, not guarantees.</i>

#ValueBets #AI #43V3RBET`;
  }

  return message;
}

function formatValueBetsAlertMessage(valueBets: Array<{
  bet: ValueBet;
  match: { homeTeam: Team; awayTeam: Team; league: League; kickoffTime: Date };
}>): string {
  const time = formatTime(new Date());
  
  let message = `⚡ <b>URGENT VALUE BET ALERT!</b>
🕐 ${time} SAST

`;

  for (let i = 0; i < Math.min(3, valueBets.length); i++) {
    const { bet, match } = valueBets[i];
    const predictionText = bet.prediction === 'home' 
      ? match.homeTeam.name 
      : bet.prediction === 'away' 
        ? match.awayTeam.name 
        : 'DRAW';

    message += `<b>${match.homeTeam.name} vs ${match.awayTeam.name}</b>
${getPredictionEmoji(bet.prediction)} ${predictionText} @ ${bet.odds.toFixed(2)}
${getEdgeEmoji(bet.edge)} Edge: +${(bet.edge * 100).toFixed(1)}%
${getRiskEmoji(bet.riskLevel)} Risk: ${bet.riskLevel.toUpperCase()}

`;
  }

  message += `<i>🔥 These bets have 7%+ edge!</i>
#ValueAlert #AI #43V3RBET`;

  return message;
}

function formatFantasyTipsMessage(players: (Player & { team: Team })[]): string {
  const date = formatDate(new Date());
  
  let message = `🎮 <b>43V3R FANTASY - Captain Picks</b>
📅 ${date}

`;

  if (players.length === 0) {
    message += `\n⚠️ No standout captain picks found.\nCheck back for gameweek updates!`;
  } else {
    message += `<b>Top Captain Candidates:</b>\n\n`;

    for (let i = 0; i < Math.min(5, players.length); i++) {
      const player = players[i];
      const positionEmoji = player.position === 'FWD' ? '⚽' : 
                            player.position === 'MID' ? '🎯' : 
                            player.position === 'DEF' ? '🛡️' : '🧤';

      message += `<b>${i + 1}. ${player.name}</b> ${positionEmoji}
• Team: ${player.team.name}
• Position: ${player.position}
• Price: R${player.price.toFixed(1)}M
• Form: ${player.form.toFixed(1)} | Points: ${player.totalPoints}
• Goals: ${player.goals} | Assists: ${player.assists}
• xG: ${player.expectedGoals.toFixed(2)} | xA: ${player.expectedAssists.toFixed(2)}
• Ownership: ${player.ownershipPercent.toFixed(1)}%

`;
    }

    message += `📊 <b>Tip:</b> Consider players with high xG/xA and good form for captain picks.

<i>📈 Data-driven fantasy recommendations</i>

#Fantasy #CaptainPick #43V3RFANTASY`;
  }

  return message;
}

function formatResultsMessage(matches: (Match & { odds: Odds | null; homeTeam: Team; awayTeam: Team; predictions: Prediction[] })[]): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = formatDate(yesterday);
  
  let message = `📊 <b>43V3R BET AI - Yesterday's Results</b>
📅 ${dateStr}

`;

  if (matches.length === 0) {
    message += `\n⚠️ No completed matches found for yesterday.`;
  } else {
    let correctPredictions = 0;
    let totalPredictions = 0;

    message += `<b>Match Results:</b>\n\n`;

    for (const match of matches.slice(0, 10)) {
      const homeWin = match.homeScore! > match.awayScore!;
      const awayWin = match.awayScore! > match.homeScore!;
      const draw = match.homeScore === match.awayScore;

      const resultEmoji = homeWin ? '🏠' : awayWin ? '✈️' : '🤝';
      const score = `${match.homeScore} - ${match.awayScore}`;

      message += `<b>${match.homeTeam.name} ${score} ${match.awayTeam.name}</b> ${resultEmoji}
`;

      // Check predictions
      const matchPred = match.predictions[0];
      if (matchPred) {
        totalPredictions++;
        const predResult = matchPred.prediction === 'home' && homeWin ||
                          matchPred.prediction === 'away' && awayWin ||
                          matchPred.prediction === 'draw' && draw;

        if (predResult) {
          correctPredictions++;
          message += `✅ AI Prediction Correct (${matchPred.prediction.toUpperCase()})\n`;
        } else {
          message += `❌ AI Prediction Wrong (${matchPred.prediction.toUpperCase()})\n`;
        }
      }

      message += `\n`;
    }

    // Summary
    if (totalPredictions > 0) {
      const accuracy = (correctPredictions / totalPredictions) * 100;
      message += `
<b>📈 AI Performance:</b>
• Correct: ${correctPredictions}/${totalPredictions}
• Accuracy: ${accuracy.toFixed(1)}%

`;
    }

    message += `#Results #AI #43V3RBET`;
  }

  return message;
}

// ==================== CORE FUNCTIONS ====================

/**
 * Post top AI value bets daily at 10:00 SAST
 */
async function postDailyBets(): Promise<{ success: boolean; message: string }> {
  log('INFO', 'Starting postDailyBets()');

  try {
    // Get upcoming matches
    const matches = await getUpcomingMatches();
    log('INFO', `Found ${matches.length} upcoming matches`);

    if (matches.length === 0) {
      return { success: false, message: 'No upcoming matches found' };
    }

    // Prepare AI engine requests
    const aiRequests: AIEngineRequest[] = matches.map(m => ({
      matchId: m.id,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      leagueId: m.leagueId,
      homeWinOdds: m.odds!.homeWin,
      drawOdds: m.odds!.draw,
      awayWinOdds: m.odds!.awayWin,
      homeWinOpenOdds: m.odds!.homeWinOpen ?? undefined,
      homeForm: m.homeTeam.form ?? undefined,
      awayForm: m.awayTeam.form ?? undefined,
    }));

    // Get value bets from AI
    const valueBets = await getValueBetsFromAI(aiRequests, 0.05); // 5% minimum edge
    log('INFO', `AI found ${valueBets.length} value bets`);

    // Sort by edge (highest first) and take top 5
    valueBets.sort((a, b) => b.edge - a.edge);
    const topBets = valueBets.slice(0, 5);

    // Match with full match data
    const betsToSend = topBets.map(bet => {
      const match = matches.find(m => m.id === bet.matchId);
      if (!match) return null;
      return {
        bet,
        match: {
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          league: match.league,
          kickoffTime: match.kickoffTime,
        },
      };
    }).filter(Boolean) as Array<{ bet: ValueBet; match: { homeTeam: Team; awayTeam: Team; league: League; kickoffTime: Date } }>;

    // Format and send message
    const message = formatDailyBetsMessage(betsToSend);
    const result = await sendToChannel(message);

    if (result.ok) {
      botState.lastPostTime.dailyBets = new Date();
      botState.stats.messagesSent++;
      botState.stats.valueBetsPosted += betsToSend.length;
      log('INFO', `Daily bets posted successfully (${betsToSend.length} bets)`);
      return { success: true, message: `Posted ${betsToSend.length} value bets` };
    } else {
      botState.stats.errors++;
      log('ERROR', 'Failed to post daily bets', { error: result.description });
      return { success: false, message: result.description || 'Failed to send message' };
    }
  } catch (error) {
    botState.stats.errors++;
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    log('ERROR', 'Error in postDailyBets()', { error: errorMsg });
    return { success: false, message: errorMsg };
  }
}

/**
 * Post value bets with 7%+ edge
 */
async function postValueBets(): Promise<{ success: boolean; message: string }> {
  log('INFO', 'Starting postValueBets()');

  try {
    // Get upcoming matches for next 6 hours
    const now = new Date();
    const sixHoursLater = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    
    const matches = await getDb().match.findMany({
      where: {
        kickoffTime: {
          gte: now,
          lte: sixHoursLater,
        },
        status: 'scheduled',
      },
      include: {
        odds: true,
        homeTeam: true,
        awayTeam: true,
        league: true,
      },
    });

    const matchesWithOdds = matches.filter(m => m.odds !== null);
    log('INFO', `Found ${matchesWithOdds.length} matches in next 6 hours`);

    if (matchesWithOdds.length === 0) {
      return { success: false, message: 'No matches in next 6 hours' };
    }

    // Prepare AI engine requests
    const aiRequests: AIEngineRequest[] = matchesWithOdds.map(m => ({
      matchId: m.id,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      leagueId: m.leagueId,
      homeWinOdds: m.odds!.homeWin,
      drawOdds: m.odds!.draw,
      awayWinOdds: m.odds!.awayWin,
      homeWinOpenOdds: m.odds!.homeWinOpen ?? undefined,
      homeForm: m.homeTeam.form ?? undefined,
      awayForm: m.awayTeam.form ?? undefined,
    }));

    // Get value bets with 7%+ edge
    const valueBets = await getValueBetsFromAI(aiRequests, VALUE_BET_EDGE_THRESHOLD);
    log('INFO', `AI found ${valueBets.length} value bets with 7%+ edge`);

    if (valueBets.length === 0) {
      return { success: false, message: 'No value bets with 7%+ edge found' };
    }

    // Sort by edge and take top 3
    valueBets.sort((a, b) => b.edge - a.edge);
    const topBets = valueBets.slice(0, 3);

    // Match with full match data
    const betsToSend = topBets.map(bet => {
      const match = matchesWithOdds.find(m => m.id === bet.matchId);
      if (!match) return null;
      return {
        bet,
        match: {
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          league: match.league,
          kickoffTime: match.kickoffTime,
        },
      };
    }).filter(Boolean) as Array<{ bet: ValueBet; match: { homeTeam: Team; awayTeam: Team; league: League; kickoffTime: Date } }>;

    // Format and send message
    const message = formatValueBetsAlertMessage(betsToSend);
    const result = await sendToChannel(message);

    if (result.ok) {
      botState.lastPostTime.valueBets = new Date();
      botState.stats.messagesSent++;
      botState.stats.valueBetsPosted += betsToSend.length;
      log('INFO', `Value bets alert posted successfully (${betsToSend.length} bets)`);
      return { success: true, message: `Posted ${betsToSend.length} value bet alerts` };
    } else {
      botState.stats.errors++;
      log('ERROR', 'Failed to post value bets alert', { error: result.description });
      return { success: false, message: result.description || 'Failed to send message' };
    }
  } catch (error) {
    botState.stats.errors++;
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    log('ERROR', 'Error in postValueBets()', { error: errorMsg });
    return { success: false, message: errorMsg };
  }
}

/**
 * Post fantasy captain picks
 */
async function postFantasyTips(): Promise<{ success: boolean; message: string }> {
  log('INFO', 'Starting postFantasyTips()');

  try {
    // Get top fantasy picks
    const players = await getTopFantasyPicks();
    log('INFO', `Found ${players.length} top fantasy picks`);

    if (players.length === 0) {
      return { success: false, message: 'No standout fantasy picks found' };
    }

    // Format and send message
    const message = formatFantasyTipsMessage(players);
    const result = await sendToChannel(message);

    if (result.ok) {
      botState.lastPostTime.fantasyTips = new Date();
      botState.stats.messagesSent++;
      log('INFO', 'Fantasy tips posted successfully');
      return { success: true, message: 'Posted fantasy tips' };
    } else {
      botState.stats.errors++;
      log('ERROR', 'Failed to post fantasy tips', { error: result.description });
      return { success: false, message: result.description || 'Failed to send message' };
    }
  } catch (error) {
    botState.stats.errors++;
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    log('ERROR', 'Error in postFantasyTips()', { error: errorMsg });
    return { success: false, message: errorMsg };
  }
}

/**
 * Post yesterday's results
 */
async function postResults(): Promise<{ success: boolean; message: string }> {
  log('INFO', 'Starting postResults()');

  try {
    // Get finished matches from yesterday
    const matches = await getFinishedMatches();
    log('INFO', `Found ${matches.length} finished matches from yesterday`);

    if (matches.length === 0) {
      return { success: false, message: 'No finished matches found' };
    }

    // Format and send message
    const message = formatResultsMessage(matches);
    const result = await sendToChannel(message);

    if (result.ok) {
      botState.lastPostTime.results = new Date();
      botState.stats.messagesSent++;
      log('INFO', 'Results posted successfully');
      return { success: true, message: 'Posted yesterday\'s results' };
    } else {
      botState.stats.errors++;
      log('ERROR', 'Failed to post results', { error: result.description });
      return { success: false, message: result.description || 'Failed to send message' };
    }
  } catch (error) {
    botState.stats.errors++;
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    log('ERROR', 'Error in postResults()', { error: errorMsg });
    return { success: false, message: errorMsg };
  }
}

/**
 * Handle incoming Telegram commands/callbacks
 */
async function handleCallback(data: { 
  command?: string; 
  message?: string;
  from?: { id: number; username?: string };
}): Promise<{ success: boolean; message: string }> {
  log('INFO', 'Handling callback', { data });

  try {
    const { command, message, from } = data;

    // Handle different commands
    if (command) {
      switch (command.toLowerCase()) {
        case '/start':
          return startBot();
        case '/stop':
          return stopBot();
        case '/status':
          return getStatusResponse();
        case '/daily':
          return postDailyBets();
        case '/value':
          return postValueBets();
        case '/fantasy':
          return postFantasyTips();
        case '/results':
          return postResults();
        default:
          return { success: false, message: `Unknown command: ${command}` };
      }
    }

    // Handle message
    if (message) {
      log('INFO', `Received message: ${message}`);
      // Could implement NLP or keyword matching here
      return { success: true, message: 'Message received' };
    }

    return { success: false, message: 'No command or message provided' };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    log('ERROR', 'Error in handleCallback()', { error: errorMsg });
    return { success: false, message: errorMsg };
  }
}

/**
 * Send custom message to channel
 */
async function sendCustomMessage(text: string, parseMode: 'Markdown' | 'HTML' = 'HTML'): Promise<{ success: boolean; message: string }> {
  log('INFO', 'Sending custom message');

  try {
    if (!text || text.trim().length === 0) {
      return { success: false, message: 'Message text cannot be empty' };
    }

    const result = await sendToChannel(text, parseMode);

    if (result.ok) {
      botState.stats.messagesSent++;
      log('INFO', 'Custom message sent successfully');
      return { success: true, message: 'Message sent successfully' };
    } else {
      botState.stats.errors++;
      log('ERROR', 'Failed to send custom message', { error: result.description });
      return { success: false, message: result.description || 'Failed to send message' };
    }
  } catch (error) {
    botState.stats.errors++;
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    log('ERROR', 'Error in sendCustomMessage()', { error: errorMsg });
    return { success: false, message: errorMsg };
  }
}

// ==================== BOT CONTROL ====================

/**
 * Start the bot - run initial bot start
 */
function startBot(): { success: boolean; message: string } {
  log('INFO', 'Starting bot...');

  if (botState.isRunning) {
    return { success: false, message: 'Bot is already running' };
  }

  botState.isRunning = true;
  botState.startedAt = new Date();

  // Start daily scheduler
  startDailyScheduler();

  log('INFO', 'Bot started successfully');
  return { success: true, message: 'Bot started successfully' };
}

/**
 * Stop the bot
 */
function stopBot(): { success: boolean; message: string } {
  log('INFO', 'Stopping bot...');

  if (!botState.isRunning) {
    return { success: false, message: 'Bot is not running' };
  }

  // Stop daily scheduler
  if (botState.dailySchedulerInterval) {
    clearInterval(botState.dailySchedulerInterval);
    botState.dailySchedulerInterval = null;
  }

  botState.isRunning = false;
  botState.startedAt = null;

  log('INFO', 'Bot stopped successfully');
  return { success: true, message: 'Bot stopped successfully' };
}

/**
 * Get bot status response
 */
function getStatusResponse(): { success: boolean; message: string } {
  const status = botState.isRunning ? '🟢 RUNNING' : '🔴 STOPPED';
  const uptime = botState.startedAt 
    ? Math.floor((Date.now() - botState.startedAt.getTime()) / 1000 / 60) 
    : 0;

  const message = `
<b>43V3R Telegram Bot Status</b>

Status: ${status}
Uptime: ${uptime} minutes

<b>Statistics:</b>
• Messages Sent: ${botState.stats.messagesSent}
• Value Bets Posted: ${botState.stats.valueBetsPosted}
• Errors: ${botState.stats.errors}

<b>Last Posts:</b>
• Daily Bets: ${botState.lastPostTime.dailyBets ? formatTime(botState.lastPostTime.dailyBets) : 'Never'}
• Value Alerts: ${botState.lastPostTime.valueBets ? formatTime(botState.lastPostTime.valueBets) : 'Never'}
• Fantasy Tips: ${botState.lastPostTime.fantasyTips ? formatTime(botState.lastPostTime.fantasyTips) : 'Never'}
• Results: ${botState.lastPostTime.results ? formatTime(botState.lastPostTime.results) : 'Never'}

<i>Version: ${MODEL_VERSION}</i>
`;

  return { success: true, message };
}

/**
 * Start daily scheduler for automated posts
 */
function startDailyScheduler(): void {
  log('INFO', 'Starting daily scheduler');

  // Check every minute
  botState.dailySchedulerInterval = setInterval(async () => {
    if (!botState.isRunning) return;

    const sastTime = getSASTTime();
    const hour = sastTime.getUTCHours();
    const minute = sastTime.getUTCMinutes();

    // Daily bets at 10:00 SAST
    if (hour === DAILY_BETS_TIME && minute === 0) {
      log('INFO', 'Triggering scheduled daily bets post');
      await postDailyBets();
    }

    // Value bet checks every 2 hours during active hours (8 AM - 10 PM SAST)
    if (hour >= 8 && hour <= 22 && minute === 0 && hour % 2 === 0) {
      log('INFO', 'Triggering scheduled value bets check');
      await postValueBets();
    }

    // Fantasy tips at 9:00 SAST on match days
    if (hour === 9 && minute === 0) {
      // Check if there are matches today
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const matchesToday = await getDb().match.count({
        where: {
          kickoffTime: {
            gte: today,
            lt: tomorrow,
          },
        },
      });

      if (matchesToday > 0) {
        log('INFO', 'Triggering scheduled fantasy tips post');
        await postFantasyTips();
      }
    }

    // Results at 8:00 SAST
    if (hour === 8 && minute === 0) {
      log('INFO', 'Triggering scheduled results post');
      await postResults();
    }
  }, 60 * 1000); // Check every minute

  log('INFO', 'Daily scheduler started');
}

// ==================== HTTP SERVER ====================

async function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, data: any): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = req.url?.split('?')[0] || '/';
  const method = req.method || 'GET';

  log('DEBUG', `Incoming request: ${method} ${url}`);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // Health check
    if (url === '/health' && method === 'GET') {
      sendJson(res, 200, {
        status: 'healthy',
        service: 'telegram-bot',
        version: MODEL_VERSION,
        timestamp: new Date().toISOString(),
        botRunning: botState.isRunning,
      });
      return;
    }

    // Bot status
    if (url === '/status' && method === 'GET') {
      const status = getStatusResponse();
      sendJson(res, 200, {
        ...status,
        ...botState,
        uptime: botState.startedAt 
          ? Math.floor((Date.now() - botState.startedAt.getTime()) / 1000)
          : 0,
      });
      return;
    }

    // Start bot
    if (url === '/start' && method === 'POST') {
      const result = startBot();
      sendJson(res, result.success ? 200 : 400, result);
      return;
    }

    // Stop bot
    if (url === '/stop' && method === 'POST') {
      const result = stopBot();
      sendJson(res, result.success ? 200 : 400, result);
      return;
    }

    // Post daily bets
    if (url === '/daily' && method === 'POST') {
      const result = await postDailyBets();
      sendJson(res, result.success ? 200 : 500, result);
      return;
    }

    // Post value bets
    if (url === '/value' && method === 'POST') {
      const result = await postValueBets();
      sendJson(res, result.success ? 200 : 500, result);
      return;
    }

    // Post fantasy tips
    if (url === '/fantasy' && method === 'POST') {
      const result = await postFantasyTips();
      sendJson(res, result.success ? 200 : 500, result);
      return;
    }

    // Post results
    if (url === '/results' && method === 'POST') {
      const result = await postResults();
      sendJson(res, result.success ? 200 : 500, result);
      return;
    }

    // Handle callback
    if (url === '/callback' && method === 'POST') {
      const body = await parseBody(req);
      const result = await handleCallback(body);
      sendJson(res, result.success ? 200 : 400, result);
      return;
    }

    // Send custom message
    if (url === '/send' && method === 'POST') {
      const body = await parseBody(req);
      const result = await sendCustomMessage(body.text, body.parseMode || 'HTML');
      sendJson(res, result.success ? 200 : 500, result);
      return;
    }

    // Get config
    if (url === '/config' && method === 'GET') {
      sendJson(res, 200, {
        port: PORT,
        aiEnginePort: AI_ENGINE_PORT,
        dailyBetsTime: DAILY_BETS_TIME,
        valueBetEdgeThreshold: VALUE_BET_EDGE_THRESHOLD,
        configured: {
          botToken: !!TELEGRAM_BOT_TOKEN,
          chatId: !!TELEGRAM_CHAT_ID,
        },
      });
      return;
    }

    // 404 for unknown routes
    sendJson(res, 404, {
      error: 'Not Found',
      message: `Unknown route: ${method} ${url}`,
    });

  } catch (error) {
    log('ERROR', 'Request handling error', { error: error instanceof Error ? error.message : 'Unknown' });
    sendJson(res, 500, {
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// ==================== MAIN ====================

async function main(): Promise<void> {
  log('INFO', `Starting 43V3R Telegram Bot Service v${MODEL_VERSION}`);
  log('INFO', `Port: ${PORT}`);
  log('INFO', `AI Engine Port: ${AI_ENGINE_PORT}`);

  // Check configuration
  if (!TELEGRAM_BOT_TOKEN) {
    log('WARN', 'TELEGRAM_BOT_TOKEN not set - bot will not be able to send messages');
  }
  if (!TELEGRAM_CHAT_ID) {
    log('WARN', 'TELEGRAM_CHAT_ID not set - bot will not be able to send messages');
  }

  // Initialize database connection
  try {
    await getDb().$connect();
    log('INFO', 'Database connected successfully');
  } catch (error) {
    log('ERROR', 'Failed to connect to database', { error: error instanceof Error ? error.message : 'Unknown' });
  }

  // Create HTTP server
  const server = createServer(handleRequest);

  server.listen(PORT, () => {
    log('INFO', `Telegram Bot Service listening on port ${PORT}`);
    log('INFO', 'Available endpoints:');
    log('INFO', '  GET  /health   - Health check');
    log('INFO', '  GET  /status   - Bot status');
    log('INFO', '  POST /start    - Start bot');
    log('INFO', '  POST /stop     - Stop bot');
    log('INFO', '  POST /daily    - Post daily bets');
    log('INFO', '  POST /value    - Post value bets (7%+ edge)');
    log('INFO', '  POST /fantasy  - Post fantasy tips');
    log('INFO', '  POST /results  - Post yesterday\'s results');
    log('INFO', '  POST /callback - Handle Telegram callback');
    log('INFO', '  POST /send     - Send custom message');
    log('INFO', '  GET  /config   - Get service configuration');
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    log('INFO', 'Shutting down...');
    stopBot();
    await closeDb();
    server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    log('INFO', 'Shutting down...');
    stopBot();
    await closeDb();
    server.close();
    process.exit(0);
  });
}

main().catch(error => {
  log('ERROR', 'Fatal error', { error: error instanceof Error ? error.message : 'Unknown' });
  process.exit(1);
});
