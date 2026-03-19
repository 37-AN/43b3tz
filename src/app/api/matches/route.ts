import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { 
  paginatedResponse, 
  errorNextResponse, 
  toNextResponse,
  ErrorCode 
} from '@/lib/api-response';
import { z } from 'zod';

// Query parameter validation schema
const MatchesQuerySchema = z.object({
  league: z.string().optional(),
  status: z.enum(['scheduled', 'live', 'finished', 'postponed']).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type MatchesQueryParams = z.infer<typeof MatchesQuerySchema>;

// Match response type with related data
export interface MatchWithRelations {
  id: string;
  leagueId: string;
  homeTeamId: string;
  awayTeamId: string;
  kickoffTime: Date;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  minute: number | null;
  createdAt: Date;
  updatedAt: Date;
  league: {
    id: string;
    name: string;
    country: string;
    logo: string | null;
  };
  homeTeam: {
    id: string;
    name: string;
    logo: string | null;
    country: string | null;
    form: string | null;
    goalsScored: number;
    goalsConceded: number;
  };
  awayTeam: {
    id: string;
    name: string;
    logo: string | null;
    country: string | null;
    form: string | null;
    goalsScored: number;
    goalsConceded: number;
  };
  odds: {
    id: string;
    homeWin: number;
    draw: number;
    awayWin: number;
    over25: number | null;
    under25: number | null;
    bttsYes: number | null;
    bttsNo: number | null;
    homeDraw: number | null;
    homeAway: number | null;
    drawAway: number | null;
    bookmaker: string;
  } | null;
  predictions: Array<{
    id: string;
    userId: string | null;
    homeWinProb: number;
    drawProb: number;
    awayWinProb: number;
    prediction: string;
    confidence: number;
    isValueBet: boolean;
    edge: number;
    kellyFraction: number;
    result: string | null;
    isPremium: boolean;
    price: number | null;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      league: searchParams.get('league') || undefined,
      status: searchParams.get('status') || undefined,
      date: searchParams.get('date') || undefined,
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
    };

    const validationResult = MatchesQuerySchema.safeParse(queryParams);
    
    if (!validationResult.success) {
      return errorNextResponse(
        `Invalid query parameters: ${validationResult.error.issues.map(e => e.message).join(', ')}`,
        ErrorCode.VALIDATION_ERROR
      );
    }

    const { league, status, date, limit, offset } = validationResult.data;

    // Build where clause for filtering
    const where: {
      leagueId?: string;
      status?: string;
      kickoffTime?: {
        gte?: Date;
        lte?: Date;
      };
    } = {};

    if (league) {
      where.leagueId = league;
    }

    if (status) {
      where.status = status;
    }

    if (date) {
      // Parse the date and create start/end of day range
      const dateStart = new Date(`${date}T00:00:00.000Z`);
      const dateEnd = new Date(`${date}T23:59:59.999Z`);
      
      where.kickoffTime = {
        gte: dateStart,
        lte: dateEnd,
      };
    }

    // Get total count for pagination
    const total = await db.match.count({ where });

    // Fetch matches with related data
    const matches = await db.match.findMany({
      where,
      include: {
        league: {
          select: {
            id: true,
            name: true,
            country: true,
            logo: true,
          },
        },
        homeTeam: {
          select: {
            id: true,
            name: true,
            logo: true,
            country: true,
            form: true,
            goalsScored: true,
            goalsConceded: true,
          },
        },
        awayTeam: {
          select: {
            id: true,
            name: true,
            logo: true,
            country: true,
            form: true,
            goalsScored: true,
            goalsConceded: true,
          },
        },
        odds: {
          select: {
            id: true,
            homeWin: true,
            draw: true,
            awayWin: true,
            over25: true,
            under25: true,
            bttsYes: true,
            bttsNo: true,
            homeDraw: true,
            homeAway: true,
            drawAway: true,
            bookmaker: true,
          },
        },
        predictions: {
          select: {
            id: true,
            userId: true,
            homeWinProb: true,
            drawProb: true,
            awayWinProb: true,
            prediction: true,
            confidence: true,
            isValueBet: true,
            edge: true,
            kellyFraction: true,
            result: true,
            isPremium: true,
            price: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        kickoffTime: 'asc',
      },
      take: limit,
      skip: offset,
    });

    // Calculate page from offset and limit
    const page = Math.floor(offset / limit) + 1;

    // Return paginated response
    return toNextResponse(
      paginatedResponse(
        matches as MatchWithRelations[],
        page,
        limit,
        total
      )
    );

  } catch (error) {
    console.error('Error fetching matches:', error);
    
    return errorNextResponse(
      'Failed to fetch matches from database',
      ErrorCode.DATABASE_ERROR
    );
  }
}
