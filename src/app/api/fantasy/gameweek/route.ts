// Fantasy Gameweek API Route
// GET - Fetch gameweek information
// POST - Trigger gameweek automation (admin only)
// PUT - Update gameweek settings

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import {
  successResponse,
  errorNextResponse,
  paginatedResponse,
  toNextResponse,
  ErrorCode,
} from '@/lib/api-response';
import { z } from 'zod';

// ==================== VALIDATION SCHEMAS ====================

const CreateGameweekSchema = z.object({
  number: z.number().int().min(1),
  name: z.string().min(1),
  deadline: z.string().transform(str => new Date(str)),
});

const UpdateGameweekSchema = z.object({
  gameweekId: z.string().min(1),
  name: z.string().optional(),
  deadline: z.string().transform(str => new Date(str)).optional(),
  isActive: z.boolean().optional(),
  isCurrent: z.boolean().optional(),
});

const CalculatePointsSchema = z.object({
  gameweekId: z.string().min(1),
});

// ==================== CONSTANTS ====================

// Fantasy points scoring
const POINTS_SCORING = {
  // Goals
  goal: {
    GK: 10,
    DEF: 6,
    MID: 5,
    FWD: 4,
  },
  // Assists
  assist: 3,
  // Clean sheets
  cleanSheet: {
    GK: 4,
    DEF: 4,
    MID: 1,
    FWD: 0,
  },
  // Cards
  yellowCard: -1,
  redCard: -3,
  // Minutes
  minutesPlayed: {
    threshold60: 2,
    threshold30: 1,
  },
  // Bonus
  bonus: {
    1: 3,
    2: 2,
    3: 1,
  },
  // Saves (GK only)
  save: 0.5, // Per save, rounded down
  saveBonus: 3, // For 3+ saves
  // Penalty save (GK only)
  penaltySave: 5,
  // Penalty miss
  penaltyMiss: -2,
  // Own goal
  ownGoal: -2,
};

// ==================== HELPER FUNCTIONS ====================

async function isAdmin(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role === 'admin';
}

function calculatePlayerPoints(
  stats: {
    goals: number;
    assists: number;
    cleanSheet: boolean;
    yellowCard: boolean;
    redCard: boolean;
    minutesPlayed: number;
    saves?: number;
    penaltySaves?: number;
    penaltyMisses?: number;
    ownGoals?: number;
  },
  position: string
): number {
  let points = 0;

  // Goals
  const goalPoints = POINTS_SCORING.goal[position as keyof typeof POINTS_SCORING.goal] || 4;
  points += stats.goals * goalPoints;

  // Assists
  points += stats.assists * POINTS_SCORING.assist;

  // Clean sheet
  if (stats.cleanSheet) {
    const csPoints = POINTS_SCORING.cleanSheet[position as keyof typeof POINTS_SCORING.cleanSheet] || 0;
    points += csPoints;
  }

  // Cards
  if (stats.yellowCard) points += POINTS_SCORING.yellowCard;
  if (stats.redCard) points += POINTS_SCORING.redCard;

  // Minutes played
  if (stats.minutesPlayed >= 60) {
    points += POINTS_SCORING.minutesPlayed.threshold60;
  } else if (stats.minutesPlayed >= 30) {
    points += POINTS_SCORING.minutesPlayed.threshold30;
  }

  // GK specific
  if (position === 'GK') {
    if (stats.saves) {
      points += Math.floor(stats.saves * POINTS_SCORING.save);
      if (stats.saves >= 3) points += POINTS_SCORING.saveBonus;
    }
    if (stats.penaltySaves) {
      points += stats.penaltySaves * POINTS_SCORING.penaltySave;
    }
  }

  // Penalty misses
  if (stats.penaltyMisses) {
    points += stats.penaltyMisses * POINTS_SCORING.penaltyMiss;
  }

  // Own goals
  if (stats.ownGoals) {
    points += stats.ownGoals * POINTS_SCORING.ownGoal;
  }

  return Math.max(0, points); // Points can't be negative
}

async function updateFantasyTeamRankings(): Promise<void> {
  // Get all fantasy teams ordered by total points
  const teams = await db.fantasyTeam.findMany({
    orderBy: { totalPoints: 'desc' },
    select: { id: true },
  });

  // Update rankings
  await Promise.all(
    teams.map((team, index) =>
      db.fantasyTeam.update({
        where: { id: team.id },
        data: { overallRank: index + 1 },
      })
    )
  );
}

async function updateLeagueRankings(): Promise<void> {
  // Get all leagues
  const leagues = await db.fantasyLeague.findMany({
    select: { id: true },
  });

  for (const league of leagues) {
    // Get members ordered by total points
    const members = await db.fantasyLeagueMember.findMany({
      where: { leagueId: league.id },
      orderBy: { totalPoints: 'desc' },
      select: { id: true },
    });

    // Update rankings
    await Promise.all(
      members.map((member, index) =>
        db.fantasyLeagueMember.update({
          where: { id: member.id },
          data: {
            rank: index + 1,
          },
        })
      )
    );
  }
}

// ==================== GET HANDLER ====================

/**
 * GET /api/fantasy/gameweek
 * Fetch gameweek information
 * - gameweekId: Specific gameweek
 * - type=current: Current gameweek
 * - type=all: All gameweeks
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return errorNextResponse('Authentication required', ErrorCode.UNAUTHORIZED);
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'current';
    const gameweekId = searchParams.get('gameweekId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    // Fetch specific gameweek
    if (gameweekId) {
      const gameweek = await db.gameweek.findUnique({
        where: { id: gameweekId },
        include: {
          playerStats: {
            include: {
              player: {
                include: {
                  team: {
                    select: { id: true, name: true },
                  },
                },
              },
            },
            orderBy: { points: 'desc' },
            take: 50,
          },
        },
      });

      if (!gameweek) {
        return errorNextResponse('Gameweek not found', ErrorCode.NOT_FOUND);
      }

      const response = {
        id: gameweek.id,
        number: gameweek.number,
        name: gameweek.name,
        deadline: gameweek.deadline,
        isActive: gameweek.isActive,
        isCurrent: gameweek.isCurrent,
        topPerformers: gameweek.playerStats.map(stat => ({
          player: {
            id: stat.player.id,
            name: stat.player.name,
            position: stat.player.position,
            team: stat.player.team,
          },
          points: stat.points,
          goals: stat.goals,
          assists: stat.assists,
          cleanSheet: stat.cleanSheet,
          minutesPlayed: stat.minutesPlayed,
        })),
      };

      return toNextResponse(successResponse(response));
    }

    // Fetch current gameweek
    if (type === 'current') {
      const gameweek = await db.gameweek.findFirst({
        where: { isCurrent: true },
      });

      if (!gameweek) {
        return toNextResponse(successResponse(null));
      }

      const now = new Date();
      const deadline = new Date(gameweek.deadline);
      const timeUntilDeadline = deadline.getTime() - now.getTime();
      const isDeadlinePassed = timeUntilDeadline <= 0;

      const response = {
        id: gameweek.id,
        number: gameweek.number,
        name: gameweek.name,
        deadline: gameweek.deadline,
        isActive: gameweek.isActive,
        isDeadlinePassed,
        timeUntilDeadline: isDeadlinePassed ? 0 : timeUntilDeadline,
        daysUntilDeadline: isDeadlinePassed ? 0 : Math.ceil(timeUntilDeadline / (1000 * 60 * 60 * 24)),
        hoursUntilDeadline: isDeadlinePassed ? 0 : Math.ceil(timeUntilDeadline / (1000 * 60 * 60)),
      };

      return toNextResponse(successResponse(response));
    }

    // Fetch all gameweeks
    if (type === 'all') {
      const total = await db.gameweek.count();
      
      const gameweeks = await db.gameweek.findMany({
        orderBy: { number: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      });

      const response = gameweeks.map(gw => ({
        id: gw.id,
        number: gw.number,
        name: gw.name,
        deadline: gw.deadline,
        isActive: gw.isActive,
        isCurrent: gw.isCurrent,
      }));

      return toNextResponse(paginatedResponse(response, page, limit, total));
    }

    return errorNextResponse('Invalid request type', ErrorCode.VALIDATION_ERROR);
  } catch (error) {
    console.error('Error fetching gameweek:', error);
    return errorNextResponse('Failed to fetch gameweek', ErrorCode.INTERNAL_ERROR);
  }
}

// ==================== POST HANDLER ====================

/**
 * POST /api/fantasy/gameweek
 * Admin operations:
 * - Create new gameweek
 * - Calculate points for gameweek
 * - Advance to next gameweek
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return errorNextResponse('Authentication required', ErrorCode.UNAUTHORIZED);
    }

    const userId = session.user.id;

    // Check admin status
    const admin = await isAdmin(userId);
    if (!admin) {
      return errorNextResponse('Admin access required', ErrorCode.FORBIDDEN);
    }

    const body = await request.json();

    // Create new gameweek
    if (body.number && body.name && body.deadline) {
      const validation = CreateGameweekSchema.safeParse(body);

      if (!validation.success) {
        return errorNextResponse(
          validation.error.errors[0]?.message || 'Validation failed',
          ErrorCode.VALIDATION_ERROR
        );
      }

      const { number, name, deadline } = validation.data;

      // Check if gameweek number exists
      const existing = await db.gameweek.findUnique({
        where: { number },
      });

      if (existing) {
        return errorNextResponse(
          'Gameweek with this number already exists',
          ErrorCode.CONFLICT
        );
      }

      const gameweek = await db.gameweek.create({
        data: {
          number,
          name,
          deadline,
          isActive: true,
          isCurrent: false,
        },
      });

      return toNextResponse(successResponse({
        id: gameweek.id,
        number: gameweek.number,
        name: gameweek.name,
        deadline: gameweek.deadline,
      }));
    }

    // Calculate points for gameweek
    if (body.gameweekId && body.calculatePoints) {
      const validation = CalculatePointsSchema.safeParse(body);

      if (!validation.success) {
        return errorNextResponse(
          validation.error.errors[0]?.message || 'Validation failed',
          ErrorCode.VALIDATION_ERROR
        );
      }

      const { gameweekId } = validation.data;

      // Get gameweek
      const gameweek = await db.gameweek.findUnique({
        where: { id: gameweekId },
      });

      if (!gameweek) {
        return errorNextResponse('Gameweek not found', ErrorCode.NOT_FOUND);
      }

      // Get all player stats for this gameweek
      const playerStats = await db.playerGameweekStat.findMany({
        where: { gameweekId },
        include: {
          player: {
            select: { id: true, position: true },
          },
        },
      });

      // Calculate and update points for each player
      for (const stat of playerStats) {
        const points = calculatePlayerPoints(
          {
            goals: stat.goals,
            assists: stat.assists,
            cleanSheet: stat.cleanSheet,
            yellowCard: stat.yellowCard,
            redCard: stat.redCard,
            minutesPlayed: stat.minutesPlayed,
          },
          stat.player.position
        );

        await db.playerGameweekStat.update({
          where: { id: stat.id },
          data: { points },
        });
      }

      // Update fantasy team points
      const fantasyTeams = await db.fantasyTeam.findMany({
        select: { id: true, players: true, captainId: true, viceCaptainId: true },
      });

      for (const team of fantasyTeams) {
        const playerIds: string[] = JSON.parse(team.players);
        
        // Get player stats for this team
        const teamPlayerStats = await db.playerGameweekStat.findMany({
          where: {
            gameweekId,
            playerId: { in: playerIds },
          },
        });

        // Calculate team points with captain bonus
        let teamPoints = 0;
        for (const stat of teamPlayerStats) {
          let playerPoints = stat.points;
          
          // Captain gets 2x points
          if (stat.playerId === team.captainId) {
            playerPoints *= 2;
          }
          // Vice captain gets 2x points if captain didn't play
          else if (stat.playerId === team.viceCaptainId && stat.minutesPlayed > 0) {
            const captainStats = teamPlayerStats.find(s => s.playerId === team.captainId);
            if (!captainStats || captainStats.minutesPlayed === 0) {
              playerPoints *= 2;
            }
          }
          
          teamPoints += playerPoints;
        }

        // Update team
        await db.fantasyTeam.update({
          where: { id: team.id },
          data: {
            gameweekPoints: teamPoints,
            totalPoints: { increment: teamPoints },
            freeTransfers: Math.min(2, 1), // Reset to 1, max 2
          },
        });
      }

      // Update rankings
      await updateFantasyTeamRankings();
      await updateLeagueRankings();

      return toNextResponse(successResponse({
        message: 'Points calculated successfully',
        playersProcessed: playerStats.length,
      }));
    }

    // Advance to next gameweek
    if (body.advanceGameweek) {
      // Get current gameweek
      const currentGw = await db.gameweek.findFirst({
        where: { isCurrent: true },
      });

      if (!currentGw) {
        return errorNextResponse('No current gameweek found', ErrorCode.NOT_FOUND);
      }

      // Get next gameweek
      const nextGw = await db.gameweek.findFirst({
        where: { number: currentGw.number + 1 },
      });

      if (!nextGw) {
        return errorNextResponse('No next gameweek found', ErrorCode.NOT_FOUND);
      }

      // Update gameweeks
      await db.$transaction([
        db.gameweek.update({
          where: { id: currentGw.id },
          data: { isCurrent: false },
        }),
        db.gameweek.update({
          where: { id: nextGw.id },
          data: { isCurrent: true },
        }),
      ]);

      return toNextResponse(successResponse({
        message: 'Advanced to next gameweek',
        previousGameweek: {
          id: currentGw.id,
          number: currentGw.number,
        },
        currentGameweek: {
          id: nextGw.id,
          number: nextGw.number,
          name: nextGw.name,
          deadline: nextGw.deadline,
        },
      }));
    }

    return errorNextResponse('Invalid operation', ErrorCode.VALIDATION_ERROR);
  } catch (error) {
    console.error('Error in gameweek operation:', error);
    return errorNextResponse('Failed to process gameweek operation', ErrorCode.INTERNAL_ERROR);
  }
}

// ==================== PUT HANDLER ====================

/**
 * PUT /api/fantasy/gameweek
 * Update gameweek settings (admin only)
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return errorNextResponse('Authentication required', ErrorCode.UNAUTHORIZED);
    }

    const userId = session.user.id;

    // Check admin status
    const admin = await isAdmin(userId);
    if (!admin) {
      return errorNextResponse('Admin access required', ErrorCode.FORBIDDEN);
    }

    const body = await request.json();
    const validation = UpdateGameweekSchema.safeParse(body);

    if (!validation.success) {
      return errorNextResponse(
        validation.error.errors[0]?.message || 'Validation failed',
        ErrorCode.VALIDATION_ERROR
      );
    }

    const { gameweekId, ...updates } = validation.data;

    // Handle isCurrent update (only one gameweek can be current)
    if (updates.isCurrent === true) {
      await db.$transaction([
        // Unset current on all gameweeks
        db.gameweek.updateMany({
          where: { isCurrent: true },
          data: { isCurrent: false },
        }),
        // Set current on target gameweek
        db.gameweek.update({
          where: { id: gameweekId },
          data: updates,
        }),
      ]);
    } else {
      await db.gameweek.update({
        where: { id: gameweekId },
        data: updates,
      });
    }

    const gameweek = await db.gameweek.findUnique({
      where: { id: gameweekId },
    });

    return toNextResponse(successResponse({
      id: gameweek!.id,
      number: gameweek!.number,
      name: gameweek!.name,
      deadline: gameweek!.deadline,
      isActive: gameweek!.isActive,
      isCurrent: gameweek!.isCurrent,
    }));
  } catch (error) {
    console.error('Error updating gameweek:', error);
    return errorNextResponse('Failed to update gameweek', ErrorCode.INTERNAL_ERROR);
  }
}
