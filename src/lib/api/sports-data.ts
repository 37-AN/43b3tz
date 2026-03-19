// 43V3R BET AI - External API Service Layer
// Connects to API-Football, OddsAPI, and Sportmonks

// ==================== TYPES ====================

export interface ApiFootballMatch {
  fixture: {
    id: number;
    referee: string;
    timezone: string;
    date: string;
    timestamp: number;
    periods: {
      first: number;
      second: number;
    };
    venue: {
      id: number;
      name: string;
      city: string;
    };
    status: {
      long: string;
      short: string;
      elapsed: number;
    };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string;
    season: number;
    round: string;
  };
  teams: {
    home: {
      id: number;
      name: string;
      logo: string;
      winner: boolean | null;
    };
    away: {
      id: number;
      name: string;
      logo: string;
      winner: boolean | null;
    };
  };
  goals: {
    home: number;
    away: number;
  };
  score: {
    halftime: { home: number; away: number };
    fulltime: { home: number; away: number };
    extratime: { home: number | null; away: number | null };
    penalty: { home: number | null; away: number | null };
  };
}

export interface ApiFootballOdds {
  fixture: {
    id: number;
    timezone: string;
    date: string;
    timestamp: number;
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string;
    season: number;
  };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
  bookmakers: Array<{
    id: number;
    name: string;
    bets: Array<{
      id: number;
      name: string;
      values: Array<{
        value: string;
        odd: string;
      }>;
    }>;
  }>;
}

export interface OddsAPIEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    key: string;
    title: string;
    last_update: string;
    markets: Array<{
      key: string;
      last_update: string;
      outcomes: Array<{
        name: string;
        price: number;
        point?: number;
      }>;
    }>;
  }>;
}

// ==================== API-FOOTBALL SERVICE ====================

export class ApiFootballService {
  private baseUrl = 'https://api-football-v1.p.rapidapi.com/v3';
  private apiKey: string;
  private host = 'api-football-v1.p.rapidapi.com';

  constructor() {
    this.apiKey = process.env.API_FOOTBALL_KEY || '';
  }

  private async fetch<T>(endpoint: string, params: Record<string, string | number>): Promise<T> {
    const url = new URL(`${this.baseUrl}/${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': this.apiKey,
        'X-RapidAPI-Host': this.host,
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      throw new Error(`API-Football error: ${response.status}`);
    }

    const data = await response.json();
    return data.response as T;
  }

  async getLiveMatches(): Promise<ApiFootballMatch[]> {
    return this.fetch<ApiFootballMatch[]>('fixtures', { live: 'all' });
  }

  async getUpcomingMatches(league?: number, season?: number): Promise<ApiFootballMatch[]> {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const params: Record<string, string | number> = {
      from: today.toISOString().split('T')[0],
      to: nextWeek.toISOString().split('T')[0],
    };

    if (league) params.league = league;
    if (season) params.season = season;

    return this.fetch<ApiFootballMatch[]>('fixtures', params);
  }

  async getMatchOdds(fixtureId: number): Promise<ApiFootballOdds[]> {
    return this.fetch<ApiFootballOdds[]>('odds', { fixture: fixtureId });
  }

  async getTeamStatistics(teamId: number, league: number, season: number) {
    return this.fetch('teams/statistics', { team: teamId, league, season });
  }

  async getHeadToHead(team1Id: number, team2Id: number) {
    return this.fetch('fixtures/headtohead', { h2h: `${team1Id}-${team2Id}` });
  }

  async getLeagues(country?: string) {
    const params: Record<string, string | number> = { current: 'true' };
    if (country) params.country = country;
    return this.fetch('leagues', params);
  }
}

// ==================== ODDS API SERVICE ====================

export class OddsAPIService {
  private baseUrl = 'https://api.the-odds-api.com/v4';
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ODDS_API_KEY || '';
  }

  private async fetch<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}/${endpoint}`, {
      next: { revalidate: 30 }, // Cache for 30 seconds
    });

    if (!response.ok) {
      throw new Error(`Odds API error: ${response.status}`);
    }

    return response.json();
  }

  async getSports(): Promise<Array<{ key: string; title: string; group: string }>> {
    return this.fetch<Array<{ key: string; title: string; group: string }>>(
      `sports?apiKey=${this.apiKey}`
    );
  }

  async getOdds(sport: string, regions = 'uk,eu,us'): Promise<OddsAPIEvent[]> {
    return this.fetch<OddsAPIEvent[]>(
      `sports/${sport}/odds/?apiKey=${this.apiKey}&regions=${regions}&markets=h2h,spreads,totals&oddsFormat=decimal`
    );
  }

  async getScoresOdds(sport: string): Promise<OddsAPIEvent[]> {
    return this.fetch<OddsAPIEvent[]>(
      `sports/${sport}/odds/?apiKey=${this.apiKey}&regions=uk,eu&markets=h2h&oddsFormat=decimal`
    );
  }

  // Calculate remaining API calls
  async getUsage(): Promise<{ used: number; remaining: number }> {
    const response = await fetch(`${this.baseUrl}/sports?apiKey=${this.apiKey}`);
    const used = parseInt(response.headers.get('x-requests-used') || '0');
    const remaining = parseInt(response.headers.get('x-requests-remaining') || '0');
    return { used, remaining };
  }
}

// ==================== SPORTMONKS SERVICE ====================

export class SportmonksService {
  private baseUrl = 'https://api.sportmonks.com/v3/football';
  private apiToken: string;

  constructor() {
    this.apiToken = process.env.SPORTMONKS_API_TOKEN || '';
  }

  private async fetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}/${endpoint}`);
    url.searchParams.append('api_token', this.apiToken);
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString(), {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error(`Sportmonks error: ${response.status}`);
    }

    const data = await response.json();
    return data.data as T;
  }

  async getLiveScores() {
    return this.fetch('livescores', { include: 'participants;scores' });
  }

  async getFixturesByDate(date: string) {
    return this.fetch(`fixtures/date/${date}`, { include: 'participants;league;odds' });
  }

  async getOddsByFixture(fixtureId: string) {
    return this.fetch(`odds/fixtures/${fixtureId}`, { include: 'bookmaker;market' });
  }

  async getTeamForm(teamId: string) {
    return this.fetch(`teams/${teamId}`, { include: 'form' });
  }
}

// ==================== UNIFIED DATA SERVICE ====================

export class SportsDataService {
  private apiFootball: ApiFootballService;
  private oddsApi: OddsAPIService;
  private sportmonks: SportmonksService;

  constructor() {
    this.apiFootball = new ApiFootballService();
    this.oddsApi = new OddsAPIService();
    this.sportmonks = new SportmonksService();
  }

  // Get best odds from multiple bookmakers
  async getBestOdds(fixtureId: number): Promise<{
    home: number;
    draw: number;
    away: number;
    bookmaker: string;
  } | null> {
    try {
      const odds = await this.apiFootball.getMatchOdds(fixtureId);
      
      if (!odds.length || !odds[0].bookmakers.length) return null;

      // Find best odds across all bookmakers
      let bestHome = 0, bestDraw = 0, bestAway = 0;
      let bestBookmaker = '';

      for (const bookmaker of odds[0].bookmakers) {
        const matchWinnerBet = bookmaker.bets.find(b => b.id === 1); // Match Winner
        if (matchWinnerBet) {
          const homeOdd = parseFloat(matchWinnerBet.values.find(v => v.value === 'Home')?.odd || '0');
          const drawOdd = parseFloat(matchWinnerBet.values.find(v => v.value === 'Draw')?.odd || '0');
          const awayOdd = parseFloat(matchWinnerBet.values.find(v => v.value === 'Away')?.odd || '0');

          if (homeOdd > bestHome) bestHome = homeOdd;
          if (drawOdd > bestDraw) bestDraw = drawOdd;
          if (awayOdd > bestAway) bestAway = awayOdd;
          bestBookmaker = bookmaker.name;
        }
      }

      return {
        home: bestHome,
        draw: bestDraw,
        away: bestAway,
        bookmaker: 'aggregate',
      };
    } catch (error) {
      console.error('Error fetching odds:', error);
      return null;
    }
  }

  // Get comprehensive match data
  async getMatchData(matchId: number) {
    // Combine data from multiple sources
    const [matchStats, odds] = await Promise.allSettled([
      this.apiFootball.getTeamStatistics(matchId, 39, 2024), // Premier League 2024
      this.getBestOdds(matchId),
    ]);

    return {
      stats: matchStats.status === 'fulfilled' ? matchStats.value : null,
      odds: odds.status === 'fulfilled' ? odds.value : null,
    };
  }

  // Get live scores from multiple sources
  async getLiveScores() {
    try {
      const [apiFootballLive, sportmonksLive] = await Promise.allSettled([
        this.apiFootball.getLiveMatches(),
        this.sportmonks.getLiveScores(),
      ]);

      return {
        apiFootball: apiFootballLive.status === 'fulfilled' ? apiFootballLive.value : [],
        sportmonks: sportmonksLive.status === 'fulfilled' ? sportmonksLive.value : [],
      };
    } catch (error) {
      console.error('Error fetching live scores:', error);
      return null;
    }
  }
}

// Export singleton instance
export const sportsDataService = new SportsDataService();
