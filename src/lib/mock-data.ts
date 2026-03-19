// 43V3R BET AI - Mock Data Engine
// Generates realistic match data, odds, and predictions for demo

import type { Match, League, Team, Odds, Prediction, Tipster, Tip, MatchFeatures } from '@/types';

// ==================== LEAGUES ====================

export const leagues: League[] = [
  { id: 'premier-league', name: 'Premier League', country: 'England', isActive: true },
  { id: 'la-liga', name: 'La Liga', country: 'Spain', isActive: true },
  { id: 'bundesliga', name: 'Bundesliga', country: 'Germany', isActive: true },
  { id: 'serie-a', name: 'Serie A', country: 'Italy', isActive: true },
  { id: 'ligue-1', name: 'Ligue 1', country: 'France', isActive: true },
  { id: 'eredivisie', name: 'Eredivisie', country: 'Netherlands', isActive: true },
  { id: 'champions-league', name: 'Champions League', country: 'Europe', isActive: true },
  { id: 'premier-soccer', name: 'Premier Soccer League', country: 'South Africa', isActive: true },
];

// ==================== TEAMS ====================

export const teams: Team[] = [
  // Premier League
  { id: 'man-city', name: 'Manchester City', country: 'England', form: 'WWWDW', goalsScored: 45, goalsConceded: 18 },
  { id: 'arsenal', name: 'Arsenal', country: 'England', form: 'WWLWW', goalsScored: 42, goalsConceded: 20 },
  { id: 'liverpool', name: 'Liverpool', country: 'England', form: 'WLWWW', goalsScored: 48, goalsConceded: 22 },
  { id: 'chelsea', name: 'Chelsea', country: 'England', form: 'WDWLW', goalsScored: 35, goalsConceded: 25 },
  { id: 'man-united', name: 'Manchester United', country: 'England', form: 'LWWLD', goalsScored: 28, goalsConceded: 30 },
  { id: 'tottenham', name: 'Tottenham', country: 'England', form: 'WWDDL', goalsScored: 38, goalsConceded: 28 },
  
  // La Liga
  { id: 'real-madrid', name: 'Real Madrid', country: 'Spain', form: 'WWWWW', goalsScored: 52, goalsConceded: 15 },
  { id: 'barcelona', name: 'Barcelona', country: 'Spain', form: 'WDWWW', goalsScored: 48, goalsConceded: 18 },
  { id: 'atletico', name: 'Atletico Madrid', country: 'Spain', form: 'WWDWW', goalsScored: 35, goalsConceded: 20 },
  
  // Bundesliga
  { id: 'bayern', name: 'Bayern Munich', country: 'Germany', form: 'WWWWL', goalsScored: 55, goalsConceded: 22 },
  { id: 'dortmund', name: 'Borussia Dortmund', country: 'Germany', form: 'WLWDW', goalsScored: 42, goalsConceded: 28 },
  { id: 'leipzig', name: 'RB Leipzig', country: 'Germany', form: 'WDWLW', goalsScored: 38, goalsConceded: 25 },
  
  // Serie A
  { id: 'inter', name: 'Inter Milan', country: 'Italy', form: 'WWWWD', goalsScored: 45, goalsConceded: 16 },
  { id: 'napoli', name: 'Napoli', country: 'Italy', form: 'WLWWW', goalsScored: 40, goalsConceded: 20 },
  { id: 'ac-milan', name: 'AC Milan', country: 'Italy', form: 'WDWLL', goalsScored: 32, goalsConceded: 25 },
  { id: 'juventus', name: 'Juventus', country: 'Italy', form: 'DWDWW', goalsScored: 35, goalsConceded: 18 },
  
  // Ligue 1
  { id: 'psg', name: 'Paris Saint-Germain', country: 'France', form: 'WWWWW', goalsScored: 58, goalsConceded: 12 },
  { id: 'marseille', name: 'Marseille', country: 'France', form: 'WLWDW', goalsScored: 38, goalsConceded: 28 },
  
  // South Africa
  { id: 'kaizer-chiefs', name: 'Kaizer Chiefs', country: 'South Africa', form: 'WDWLL', goalsScored: 22, goalsConceded: 20 },
  { id: 'orlando-pirates', name: 'Orlando Pirates', country: 'South Africa', form: 'WWDLW', goalsScored: 25, goalsConceded: 18 },
  { id: 'mamelodi-sundowns', name: 'Mamelodi Sundowns', country: 'South Africa', form: 'WWWWW', goalsScored: 35, goalsConceded: 10 },
  { id: 'supersport', name: 'Supersport United', country: 'South Africa', form: 'WLDWW', goalsScored: 20, goalsConceded: 22 },
];

// ==================== UPCOMING MATCHES ====================

export function generateUpcomingMatches(): Match[] {
  const now = new Date();
  
  return [
    // Today's matches
    {
      id: 'match-1',
      league: leagues[0], // Premier League
      homeTeam: teams[0], // Man City
      awayTeam: teams[1], // Arsenal
      kickoffTime: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours from now
      status: 'scheduled',
      odds: {
        id: 'odds-1',
        homeWin: 2.10,
        draw: 3.40,
        awayWin: 3.25,
        over25: 1.65,
        under25: 2.20,
        bttsYes: 1.75,
        bttsNo: 2.05,
        homeWinOpen: 2.20,
        drawOpen: 3.30,
        awayWinOpen: 3.15,
        bookmaker: 'aggregate'
      }
    },
    {
      id: 'match-2',
      league: leagues[0], // Premier League
      homeTeam: teams[2], // Liverpool
      awayTeam: teams[4], // Man United
      kickoffTime: new Date(now.getTime() + 5 * 60 * 60 * 1000), // 5 hours from now
      status: 'scheduled',
      odds: {
        id: 'odds-2',
        homeWin: 1.55,
        draw: 4.20,
        awayWin: 5.50,
        over25: 1.55,
        under25: 2.40,
        bttsYes: 1.70,
        bttsNo: 2.10,
        homeWinOpen: 1.60,
        drawOpen: 4.00,
        awayWinOpen: 5.25,
        bookmaker: 'aggregate'
      }
    },
    {
      id: 'match-3',
      league: leagues[1], // La Liga
      homeTeam: teams[6], // Real Madrid
      awayTeam: teams[7], // Barcelona
      kickoffTime: new Date(now.getTime() + 8 * 60 * 60 * 1000), // 8 hours from now
      status: 'scheduled',
      odds: {
        id: 'odds-3',
        homeWin: 2.25,
        draw: 3.50,
        awayWin: 2.90,
        over25: 1.60,
        under25: 2.30,
        bttsYes: 1.65,
        bttsNo: 2.20,
        homeWinOpen: 2.35,
        drawOpen: 3.40,
        awayWinOpen: 2.80,
        bookmaker: 'aggregate'
      }
    },
    // Tomorrow
    {
      id: 'match-4',
      league: leagues[2], // Bundesliga
      homeTeam: teams[9], // Bayern
      awayTeam: teams[10], // Dortmund
      kickoffTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      status: 'scheduled',
      odds: {
        id: 'odds-4',
        homeWin: 1.45,
        draw: 5.00,
        awayWin: 6.00,
        over25: 1.45,
        under25: 2.65,
        bttsYes: 1.55,
        bttsNo: 2.40,
        homeWinOpen: 1.50,
        drawOpen: 4.75,
        awayWinOpen: 5.75,
        bookmaker: 'aggregate'
      }
    },
    {
      id: 'match-5',
      league: leagues[3], // Serie A
      homeTeam: teams[12], // Inter
      awayTeam: teams[15], // Juventus
      kickoffTime: new Date(now.getTime() + 26 * 60 * 60 * 1000),
      status: 'scheduled',
      odds: {
        id: 'odds-5',
        homeWin: 1.85,
        draw: 3.60,
        awayWin: 4.20,
        over25: 1.80,
        under25: 2.00,
        bttsYes: 1.85,
        bttsNo: 1.95,
        homeWinOpen: 1.90,
        drawOpen: 3.50,
        awayWinOpen: 4.00,
        bookmaker: 'aggregate'
      }
    },
    {
      id: 'match-6',
      league: leagues[4], // Ligue 1
      homeTeam: teams[16], // PSG
      awayTeam: teams[17], // Marseille
      kickoffTime: new Date(now.getTime() + 28 * 60 * 60 * 1000),
      status: 'scheduled',
      odds: {
        id: 'odds-6',
        homeWin: 1.30,
        draw: 5.50,
        awayWin: 8.00,
        over25: 1.35,
        under25: 3.10,
        bttsYes: 1.60,
        bttsNo: 2.30,
        homeWinOpen: 1.35,
        drawOpen: 5.25,
        awayWinOpen: 7.50,
        bookmaker: 'aggregate'
      }
    },
    // South Africa matches
    {
      id: 'match-7',
      league: leagues[7], // PSL
      homeTeam: teams[18], // Kaizer Chiefs
      awayTeam: teams[19], // Orlando Pirates
      kickoffTime: new Date(now.getTime() + 30 * 60 * 60 * 1000),
      status: 'scheduled',
      odds: {
        id: 'odds-7',
        homeWin: 2.80,
        draw: 3.10,
        awayWin: 2.50,
        over25: 2.00,
        under25: 1.80,
        bttsYes: 2.00,
        bttsNo: 1.80,
        homeWinOpen: 2.70,
        drawOpen: 3.20,
        awayWinOpen: 2.55,
        bookmaker: 'aggregate'
      }
    },
    {
      id: 'match-8',
      league: leagues[7], // PSL
      homeTeam: teams[20], // Sundowns
      awayTeam: teams[21], // Supersport
      kickoffTime: new Date(now.getTime() + 32 * 60 * 60 * 1000),
      status: 'scheduled',
      odds: {
        id: 'odds-8',
        homeWin: 1.40,
        draw: 4.50,
        awayWin: 7.00,
        over25: 1.55,
        under25: 2.40,
        bttsYes: 1.90,
        bttsNo: 1.90,
        homeWinOpen: 1.45,
        drawOpen: 4.25,
        awayWinOpen: 6.50,
        bookmaker: 'aggregate'
      }
    },
    // Live match (for demo)
    {
      id: 'match-live-1',
      league: leagues[0], // Premier League
      homeTeam: teams[3], // Chelsea
      awayTeam: teams[5], // Tottenham
      kickoffTime: new Date(now.getTime() - 45 * 60 * 1000), // Started 45 mins ago
      status: 'live',
      homeScore: 1,
      awayScore: 0,
      minute: 45,
      odds: {
        id: 'odds-live-1',
        homeWin: 1.75,
        draw: 3.80,
        awayWin: 4.50,
        bookmaker: 'aggregate'
      }
    }
  ];
}

// ==================== TIPSTERS ====================

export const mockTipsters: Tipster[] = [
  {
    id: 'tipster-1',
    userId: 'user-1',
    displayName: 'ProBettingSA',
    bio: 'Professional sports bettor with 5+ years experience. Specializing in Premier League and PSL.',
    isVerified: true,
    isFeatured: true,
    totalTips: 342,
    wins: 218,
    losses: 124,
    roi: 28.5,
    yield: 12.3,
    winRate: 63.7,
    avgOdds: 1.95,
    profit: 8542.50,
    monthlyPrice: 29.99,
    weeklyPrice: 9.99,
    singleTipPrice: 4.99,
    followersCount: 1247
  },
  {
    id: 'tipster-2',
    userId: 'user-2',
    displayName: 'ValueHunter',
    bio: 'AI-assisted value bet finder. Data-driven predictions with strict bankroll management.',
    isVerified: true,
    isFeatured: true,
    totalTips: 528,
    wins: 312,
    losses: 216,
    roi: 18.2,
    yield: 8.7,
    winRate: 59.1,
    avgOdds: 2.15,
    profit: 12540.00,
    monthlyPrice: 24.99,
    weeklyPrice: 7.99,
    singleTipPrice: 3.99,
    followersCount: 2341
  },
  {
    id: 'tipster-3',
    userId: 'user-3',
    displayName: 'SoccerGenius',
    bio: 'Former professional footballer. Deep understanding of team tactics and player psychology.',
    isVerified: false,
    isFeatured: false,
    totalTips: 156,
    wins: 89,
    losses: 67,
    roi: 22.1,
    yield: 10.2,
    winRate: 57.1,
    avgOdds: 2.05,
    profit: 3250.00,
    monthlyPrice: 19.99,
    weeklyPrice: 6.99,
    singleTipPrice: 2.99,
    followersCount: 432
  },
  {
    id: 'tipster-4',
    userId: 'user-4',
    displayName: 'AfricanFootballKing',
    bio: 'PSL and African football specialist. Deep local knowledge and insider connections.',
    isVerified: true,
    isFeatured: true,
    totalTips: 198,
    wins: 128,
    losses: 70,
    roi: 35.2,
    yield: 15.8,
    winRate: 64.6,
    avgOdds: 1.85,
    profit: 5680.00,
    monthlyPrice: 34.99,
    weeklyPrice: 11.99,
    singleTipPrice: 5.99,
    followersCount: 876
  }
];

// ==================== GENERATE TIPS ====================

export function generateMockTips(): Tip[] {
  const matches = generateUpcomingMatches();
  
  return [
    {
      id: 'tip-1',
      tipsterId: 'tipster-1',
      tipster: mockTipsters[0],
      matchId: 'match-1',
      prediction: 'home',
      odds: 2.10,
      stake: 8,
      reasoning: 'Man City at home with Haaland in form. Arsenal defense has been shaky recently. Good value at 2.10.',
      isPremium: false,
      isFree: true,
      result: 'pending'
    },
    {
      id: 'tip-2',
      tipsterId: 'tipster-2',
      tipster: mockTipsters[1],
      matchId: 'match-2',
      prediction: 'over25',
      odds: 1.55,
      stake: 9,
      reasoning: 'Liverpool vs Man Utd always produces goals. Both teams scoring freely. High confidence.',
      isPremium: true,
      isFree: false,
      result: 'pending'
    },
    {
      id: 'tip-3',
      tipsterId: 'tipster-4',
      tipster: mockTipsters[3],
      matchId: 'match-7',
      prediction: 'away',
      odds: 2.50,
      stake: 7,
      reasoning: 'Orlando Pirates in better form. Kaizer Chiefs struggling with injuries. Value on the away side.',
      isPremium: false,
      isFree: true,
      result: 'pending'
    },
    {
      id: 'tip-4',
      tipsterId: 'tipster-1',
      tipster: mockTipsters[0],
      matchId: 'match-3',
      prediction: 'btts_yes',
      odds: 1.65,
      stake: 8,
      reasoning: 'El Clasico rarely disappoints. Both teams scoring freely. BTTS is the safe play.',
      isPremium: true,
      isFree: false,
      result: 'pending'
    }
  ];
}

// ==================== MATCH FEATURES FOR AI ====================

export function generateMatchFeatures(match: Match): MatchFeatures {
  const homeForm = calculateFormScore(match.homeTeam.form || 'WDWLW');
  const awayForm = calculateFormScore(match.awayTeam.form || 'WLWDW');
  
  return {
    homeForm,
    awayForm,
    homeGoalsScored: match.homeTeam.goalsScored,
    awayGoalsScored: match.awayTeam.goalsScored,
    homeGoalsConceded: match.homeTeam.goalsConceded,
    awayGoalsConceded: match.awayTeam.goalsConceded,
    homeAdvantage: 1, // 1 = home advantage
    h2hHomeWins: 3,
    h2hDraws: 2,
    h2hAwayWins: 1,
    oddsMovement: calculateOddsMovement(match.odds!),
    leagueStrength: getLeagueStrength(match.league.name)
  };
}

function calculateFormScore(form: string): number {
  let score = 0;
  for (const result of form) {
    if (result === 'W') score += 3;
    else if (result === 'D') score += 1;
  }
  return score;
}

function calculateOddsMovement(odds: Odds): number {
  if (!odds.homeWinOpen) return 0;
  return (odds.homeWinOpen - odds.homeWin) / odds.homeWinOpen;
}

function getLeagueStrength(leagueName: string): number {
  const strengths: Record<string, number> = {
    'Premier League': 1.0,
    'La Liga': 0.95,
    'Bundesliga': 0.9,
    'Serie A': 0.88,
    'Ligue 1': 0.85,
    'Champions League': 1.0,
    'Premier Soccer League': 0.65,
    'Eredivisie': 0.75
  };
  return strengths[leagueName] || 0.7;
}

// ==================== LEADERBOARD ====================

export function generateLeaderboard(): Array<{
  rank: number;
  username: string;
  profit: number;
  winRate: number;
  totalBets: number;
  roi: number;
}> {
  return [
    { rank: 1, username: 'ValueHunter', profit: 12540.00, winRate: 59.1, totalBets: 528, roi: 18.2 },
    { rank: 2, username: 'ProBettingSA', profit: 8542.50, winRate: 63.7, totalBets: 342, roi: 28.5 },
    { rank: 3, username: 'AfricanFootballKing', profit: 5680.00, winRate: 64.6, totalBets: 198, roi: 35.2 },
    { rank: 4, username: 'SoccerGenius', profit: 3250.00, winRate: 57.1, totalBets: 156, roi: 22.1 },
    { rank: 5, username: 'BettingPro99', profit: 2890.00, winRate: 55.8, totalBets: 201, roi: 15.3 },
    { rank: 6, username: 'OddsMaster', profit: 2150.00, winRate: 52.4, totalBets: 168, roi: 12.8 },
    { rank: 7, username: 'SABettor', profit: 1890.00, winRate: 58.2, totalBets: 134, roi: 14.1 },
    { rank: 8, username: 'FootballGuru', profit: 1540.00, winRate: 49.5, totalBets: 198, roi: 7.8 },
    { rank: 9, username: 'TipKing', profit: 1230.00, winRate: 51.2, totalBets: 145, roi: 8.5 },
    { rank: 10, username: 'WinnerTakesAll', profit: 980.00, winRate: 47.8, totalBets: 112, roi: 8.7 },
  ];
}
