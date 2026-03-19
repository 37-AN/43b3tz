import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  successResponse,
  errorNextResponse,
  paginatedResponse,
  toNextResponse,
  ErrorCode,
} from '@/lib/api-response';

// Valid position values
const VALID_POSITIONS = ['GK', 'DEF', 'MID', 'FWD'] as const;

// Valid sort fields
const VALID_SORT_FIELDS = ['price', 'form', 'points', 'ownership', 'name', 'goals', 'assists'] as const;

// Sort order mapping
type SortField = typeof VALID_SORT_FIELDS[number];

interface PlayerWithRelations {
  id: string;
  name: string;
  position: string;
  shirtNumber: number;
  price: number;
  priceChange: number;
  form: number;
  totalPoints: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  yellowCards: number;
  redCards: number;
  minutesPlayed: number;
  expectedGoals: number;
  expectedAssists: number;
  ownershipPercent: number;
  isActive: boolean;
  teamId: string;
  team: {
    id: string;
    name: string;
    logo: string | null;
    form: string | null;
    goalsScored: number;
    goalsConceded: number;
  };
  gameweekStats: Array<{
    id: string;
    points: number;
    goals: number;
    assists: number;
    cleanSheet: boolean;
    yellowCard: boolean;
    redCard: boolean;
    minutesPlayed: number;
    gameweekId: string;
    gameweek: {
      id: string;
      number: number;
      name: string;
      isCurrent: boolean;
    };
  }>;
}

interface UpcomingFixture {
  id: string;
  kickoffTime: Date;
  isHome: boolean;
  opponent: {
    id: string;
    name: string;
    logo: string | null;
  };
  league: {
    id: string;
    name: string;
  };
}

/**
 * GET /api/fantasy/players
 * Fetch fantasy players with filtering, sorting, and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const position = searchParams.get('position')?.toUpperCase();
    const teamId = searchParams.get('team');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort')?.toLowerCase() as SortField | null;
    const sortOrder = searchParams.get('sortOrder')?.toLowerCase() || 'desc';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    // Validate position
    if (position && !VALID_POSITIONS.includes(position as typeof VALID_POSITIONS[number])) {
      return errorNextResponse(
        `Invalid position. Must be one of: ${VALID_POSITIONS.join(', ')}`,
        ErrorCode.VALIDATION_ERROR
      );
    }

    // Build where clause
    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (position) {
      where.position = position;
    }

    if (teamId) {
      where.teamId = teamId;
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) {
        (where.price as Record<string, unknown>).gte = parseFloat(minPrice);
      }
      if (maxPrice) {
        (where.price as Record<string, unknown>).lte = parseFloat(maxPrice);
      }
    }

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Build orderBy clause
    let orderBy: Record<string, unknown>[] = [{ totalPoints: 'desc' }];

    if (sort && VALID_SORT_FIELDS.includes(sort)) {
      const orderDirection = sortOrder === 'asc' ? 'asc' : 'desc';
      
      switch (sort) {
        case 'price':
          orderBy = [{ price: orderDirection }];
          break;
        case 'form':
          orderBy = [{ form: orderDirection }];
          break;
        case 'points':
          orderBy = [{ totalPoints: orderDirection }];
          break;
        case 'ownership':
          orderBy = [{ ownershipPercent: orderDirection }];
          break;
        case 'name':
          orderBy = [{ name: orderDirection }];
          break;
        case 'goals':
          orderBy = [{ goals: orderDirection }];
          break;
        case 'assists':
          orderBy = [{ assists: orderDirection }];
          break;
        default:
          orderBy = [{ totalPoints: orderDirection }];
      }
    }

    // Get total count for pagination
    const total = await db.player.count({ where });

    // Fetch players with relations
    const players = await db.player.findMany({
      where,
      orderBy,
      skip: offset,
      take: limit,
      include: {
        team: {
          select: {
            id: true,
            name: true,
            logo: true,
            form: true,
            goalsScored: true,
            goalsConceded: true,
          },
        },
        gameweekStats: {
          where: {
            gameweek: {
              isCurrent: true,
            },
          },
          include: {
            gameweek: {
              select: {
                id: true,
                number: true,
                name: true,
                isCurrent: true,
              },
            },
          },
        },
      },
    });

    // Get current gameweek for fixture lookup
    const currentGameweek = await db.gameweek.findFirst({
      where: { isCurrent: true },
    });

    // Get upcoming fixtures for each player's team
    const teamIds = [...new Set(players.map(p => p.teamId))];
    const now = new Date();
    
    // Fetch upcoming matches for all teams
    const upcomingMatches = await db.match.findMany({
      where: {
        OR: [
          { homeTeamId: { in: teamIds } },
          { awayTeamId: { in: teamIds } },
        ],
        status: 'scheduled',
        kickoffTime: {
          gte: now,
        },
      },
      include: {
        league: {
          select: { id: true, name: true },
        },
        homeTeam: {
          select: { id: true, name: true, logo: true },
        },
        awayTeam: {
          select: { id: true, name: true, logo: true },
        },
      },
      orderBy: { kickoffTime: 'asc' },
    });

    // Build fixtures map by team
    const fixturesByTeam: Record<string, UpcomingFixture[]> = {};
    
    for (const match of upcomingMatches) {
      // Home team fixture
      if (!fixturesByTeam[match.homeTeamId]) {
        fixturesByTeam[match.homeTeamId] = [];
      }
      if (fixturesByTeam[match.homeTeamId].length < 3) {
        fixturesByTeam[match.homeTeamId].push({
          id: match.id,
          kickoffTime: match.kickoffTime,
          isHome: true,
          opponent: {
            id: match.awayTeam.id,
            name: match.awayTeam.name,
            logo: match.awayTeam.logo,
          },
          league: {
            id: match.league.id,
            name: match.league.name,
          },
        });
      }

      // Away team fixture
      if (!fixturesByTeam[match.awayTeamId]) {
        fixturesByTeam[match.awayTeamId] = [];
      }
      if (fixturesByTeam[match.awayTeamId].length < 3) {
        fixturesByTeam[match.awayTeamId].push({
          id: match.id,
          kickoffTime: match.kickoffTime,
          isHome: false,
          opponent: {
            id: match.homeTeam.id,
            name: match.homeTeam.name,
            logo: match.homeTeam.logo,
          },
          league: {
            id: match.league.id,
            name: match.league.name,
          },
        });
      }
    }

    // Transform players to response format
    const playersResponse = players.map((player: PlayerWithRelations) => {
      // Get current gameweek stats
      const currentGwStats = player.gameweekStats[0] || null;
      
      // Get upcoming fixtures for player's team (max 3)
      const upcomingFixtures = (fixturesByTeam[player.teamId] || []).slice(0, 3);

      return {
        id: player.id,
        name: player.name,
        position: player.position,
        shirtNumber: player.shirtNumber,
        
        // Team info
        team: {
          id: player.team.id,
          name: player.team.name,
          logo: player.team.logo,
          form: player.team.form,
        },
        
        // Price info
        price: player.price,
        priceChange: player.priceChange,
        
        // Form and points
        form: player.form,
        totalPoints: player.totalPoints,
        
        // Season stats
        seasonStats: {
          goals: player.goals,
          assists: player.assists,
          cleanSheets: player.cleanSheets,
          yellowCards: player.yellowCards,
          redCards: player.redCards,
          minutesPlayed: player.minutesPlayed,
        },
        
        // xG/xA data
        advancedStats: {
          expectedGoals: player.expectedGoals,
          expectedAssists: player.expectedAssists,
        },
        
        // Ownership
        ownershipPercent: player.ownershipPercent,
        
        // Current gameweek points
        gameweekPoints: currentGwStats?.points ?? 0,
        currentGameweek: currentGameweek ? {
          number: currentGameweek.number,
          name: currentGameweek.name,
        } : null,
        
        // Upcoming fixtures (next 3)
        upcomingFixtures: upcomingFixtures.map(fixture => ({
          id: fixture.id,
          kickoffTime: fixture.kickoffTime.toISOString(),
          isHome: fixture.isHome,
          opponent: fixture.opponent,
          league: fixture.league,
        })),
      };
    });

    // Build paginated response
    const response = paginatedResponse(playersResponse, Math.floor(offset / limit) + 1, limit, total);
    
    return toNextResponse(response);
  } catch (error) {
    console.error('Error fetching fantasy players:', error);
    return errorNextResponse(
      'Failed to fetch fantasy players',
      ErrorCode.INTERNAL_ERROR
    );
  }
}
