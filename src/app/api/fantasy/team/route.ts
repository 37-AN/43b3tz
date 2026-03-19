// Fantasy Team API Route
// GET - Fetch user's fantasy team
// POST - Create new fantasy team
// PUT - Update fantasy team

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import {
  successResponse,
  errorNextResponse,
  toNextResponse,
  ErrorCode,
} from '@/lib/api-response';
import { z } from 'zod';

// ==================== VALIDATION SCHEMAS ====================

const CreateFantasyTeamSchema = z.object({
  name: z.string()
    .min(3, 'Team name must be at least 3 characters')
    .max(30, 'Team name must be at most 30 characters'),
  players: z.array(z.string())
    .min(11, 'Team must have at least 11 players')
    .max(15, 'Team can have at most 15 players'),
  captainId: z.string().min(1, 'Captain is required'),
  viceCaptainId: z.string().min(1, 'Vice captain is required'),
});

const UpdateFantasyTeamSchema = z.object({
  name: z.string().min(3).max(30).optional(),
  players: z.array(z.string()).min(11).max(15).optional(),
  captainId: z.string().optional(),
  viceCaptainId: z.string().optional(),
});

// ==================== CONSTANTS ====================

const BUDGET_LIMIT = 100.0;
const MIN_PLAYERS_PER_POSITION: Record<string, number> = {
  GK: 1,
  DEF: 3,
  MID: 2,
  FWD: 1,
};
const MAX_PLAYERS_PER_POSITION: Record<string, number> = {
  GK: 2,
  DEF: 5,
  MID: 5,
  FWD: 3,
};
const MAX_PLAYERS_PER_TEAM = 3;

// ==================== HELPER FUNCTIONS ====================

interface PlayerWithTeam {
  id: string;
  name: string;
  position: string;
  price: number;
  teamId: string;
  team: {
    id: string;
    name: string;
  };
}

async function validateTeamComposition(
  playerIds: string[],
  captainId: string,
  viceCaptainId: string
): Promise<{ valid: boolean; error?: string; players?: PlayerWithTeam[] }> {
  // Check captain and vice captain are in the team
  if (!playerIds.includes(captainId)) {
    return { valid: false, error: 'Captain must be in the team' };
  }
  if (!playerIds.includes(viceCaptainId)) {
    return { valid: false, error: 'Vice captain must be in the team' };
  }
  if (captainId === viceCaptainId) {
    return { valid: false, error: 'Captain and vice captain must be different players' };
  }

  // Fetch all players
  const players = await db.player.findMany({
    where: {
      id: { in: playerIds },
      isActive: true,
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (players.length !== playerIds.length) {
    return { valid: false, error: 'Some players are invalid or inactive' };
  }

  // Check position constraints
  const positionCounts: Record<string, number> = {};
  const teamCounts: Record<string, number> = {};

  for (const player of players) {
    // Count positions
    positionCounts[player.position] = (positionCounts[player.position] || 0) + 1;
    // Count players per team
    teamCounts[player.teamId] = (teamCounts[player.teamId] || 0) + 1;
  }

  // Validate position counts
  for (const [position, count] of Object.entries(positionCounts)) {
    const min = MIN_PLAYERS_PER_POSITION[position] ?? 0;
    const max = MAX_PLAYERS_PER_POSITION[position] ?? 15;
    if (count < min) {
      return { valid: false, error: `Need at least ${min} ${position} players` };
    }
    if (count > max) {
      return { valid: false, error: `Maximum ${max} ${position} players allowed` };
    }
  }

  // Validate players per team
  for (const [teamId, count] of Object.entries(teamCounts)) {
    if (count > MAX_PLAYERS_PER_TEAM) {
      const team = players.find(p => p.teamId === teamId)?.team;
      return {
        valid: false,
        error: `Maximum ${MAX_PLAYERS_PER_TEAM} players allowed from ${team?.name || 'same team'}`
      };
    }
  }

  return { valid: true, players: players as PlayerWithTeam[] };
}

function calculateTeamValue(players: PlayerWithTeam[]): number {
  return players.reduce((sum, p) => sum + p.price, 0);
}

// ==================== GET HANDLER ====================

/**
 * GET /api/fantasy/team
 * Fetch user's fantasy team with player details
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return errorNextResponse('Authentication required', ErrorCode.UNAUTHORIZED);
    }

    const userId = session.user.id;

    // Get user's fantasy team
    const fantasyTeam = await db.fantasyTeam.findUnique({
      where: { userId },
      include: {
        transfers: {
          where: { status: 'completed' },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        leagueMembers: {
          include: {
            league: {
              select: {
                id: true,
                name: true,
                isPublic: true,
              },
            },
          },
        },
      },
    });

    if (!fantasyTeam) {
      return toNextResponse(successResponse(null));
    }

    // Parse player IDs
    const playerIds: string[] = JSON.parse(fantasyTeam.players);

    // Fetch player details
    const players = await db.player.findMany({
      where: {
        id: { in: playerIds },
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
        gameweekStats: {
          where: {
            gameweek: { isCurrent: true },
          },
          take: 1,
        },
      },
    });

    // Create player map for quick lookup
    const playerMap = new Map(players.map(p => [p.id, p]));

    // Sort players in original order
    const orderedPlayers = playerIds
      .map(id => playerMap.get(id))
      .filter(Boolean);

    // Get captain and vice captain details
    const captain = playerMap.get(fantasyTeam.captainId);
    const viceCaptain = playerMap.get(fantasyTeam.viceCaptainId);

    // Get current gameweek
    const currentGameweek = await db.gameweek.findFirst({
      where: { isCurrent: true },
    });

    // Build response
    const response = {
      id: fantasyTeam.id,
      name: fantasyTeam.name,
      budget: fantasyTeam.budget,
      remainingBudget: fantasyTeam.remainingBudget,
      teamValue: fantasyTeam.teamValue,
      totalPoints: fantasyTeam.totalPoints,
      gameweekPoints: fantasyTeam.gameweekPoints,
      rank: fantasyTeam.rank,
      overallRank: fantasyTeam.overallRank,
      freeTransfers: fantasyTeam.freeTransfers,
      transfersUsed: fantasyTeam.transfersUsed,
      hits: fantasyTeam.hits,
      
      players: orderedPlayers.map(p => ({
        id: p!.id,
        name: p!.name,
        position: p!.position,
        shirtNumber: p!.shirtNumber,
        price: p!.price,
        priceChange: p!.priceChange,
        form: p!.form,
        totalPoints: p!.totalPoints,
        team: p!.team,
        gameweekPoints: p!.gameweekStats[0]?.points ?? 0,
        isCaptain: p!.id === fantasyTeam.captainId,
        isViceCaptain: p!.id === fantasyTeam.viceCaptainId,
      })),
      
      captain: captain ? {
        id: captain.id,
        name: captain.name,
        position: captain.position,
      } : null,
      
      viceCaptain: viceCaptain ? {
        id: viceCaptain.id,
        name: viceCaptain.name,
        position: viceCaptain.position,
      } : null,
      
      recentTransfers: fantasyTeam.transfers.map(t => ({
        id: t.id,
        playerInId: t.playerInId,
        playerOutId: t.playerOutId,
        cost: t.cost,
        createdAt: t.createdAt,
      })),
      
      leagues: fantasyTeam.leagueMembers.map(m => ({
        id: m.league.id,
        name: m.league.name,
        rank: m.rank,
        totalPoints: m.totalPoints,
      })),
      
      currentGameweek: currentGameweek ? {
        id: currentGameweek.id,
        number: currentGameweek.number,
        name: currentGameweek.name,
        deadline: currentGameweek.deadline,
      } : null,
    };

    return toNextResponse(successResponse(response));
  } catch (error) {
    console.error('Error fetching fantasy team:', error);
    return errorNextResponse('Failed to fetch fantasy team', ErrorCode.INTERNAL_ERROR);
  }
}

// ==================== POST HANDLER ====================

/**
 * POST /api/fantasy/team
 * Create a new fantasy team
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return errorNextResponse('Authentication required', ErrorCode.UNAUTHORIZED);
    }

    const userId = session.user.id;

    // Check if user already has a team
    const existingTeam = await db.fantasyTeam.findUnique({
      where: { userId },
    });

    if (existingTeam) {
      return errorNextResponse('You already have a fantasy team', ErrorCode.CONFLICT);
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = CreateFantasyTeamSchema.safeParse(body);

    if (!validation.success) {
      return errorNextResponse(
        validation.error.errors[0]?.message || 'Validation failed',
        ErrorCode.VALIDATION_ERROR
      );
    }

    const { name, players, captainId, viceCaptainId } = validation.data;

    // Validate team composition
    const teamValidation = await validateTeamComposition(players, captainId, viceCaptainId);
    
    if (!teamValidation.valid) {
      return errorNextResponse(teamValidation.error!, ErrorCode.VALIDATION_ERROR);
    }

    // Calculate team value
    const teamValue = calculateTeamValue(teamValidation.players!);
    const remainingBudget = BUDGET_LIMIT - teamValue;

    if (remainingBudget < 0) {
      return errorNextResponse(
        `Team value exceeds budget by ${Math.abs(remainingBudget).toFixed(1)}`,
        ErrorCode.VALIDATION_ERROR
      );
    }

    // Create fantasy team
    const fantasyTeam = await db.fantasyTeam.create({
      data: {
        userId,
        name,
        players: JSON.stringify(players),
        captainId,
        viceCaptainId,
        budget: BUDGET_LIMIT,
        remainingBudget,
        teamValue,
        freeTransfers: 1,
        transfersUsed: 0,
        hits: 0,
        totalPoints: 0,
        gameweekPoints: 0,
      },
    });

    // Update player ownership percentages
    await db.player.updateMany({
      where: { id: { in: players } },
      data: {
        ownershipPercent: {
          increment: 1,
        },
      },
    });

    return toNextResponse(successResponse({
      id: fantasyTeam.id,
      name: fantasyTeam.name,
      budget: fantasyTeam.budget,
      remainingBudget: fantasyTeam.remainingBudget,
      teamValue: fantasyTeam.teamValue,
      players: teamValidation.players!.map(p => ({
        id: p.id,
        name: p.name,
        position: p.position,
        price: p.price,
        team: p.team,
      })),
    }));
  } catch (error) {
    console.error('Error creating fantasy team:', error);
    return errorNextResponse('Failed to create fantasy team', ErrorCode.INTERNAL_ERROR);
  }
}

// ==================== PUT HANDLER ====================

/**
 * PUT /api/fantasy/team
 * Update fantasy team (name, captain, vice captain, or full squad update)
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return errorNextResponse('Authentication required', ErrorCode.UNAUTHORIZED);
    }

    const userId = session.user.id;

    // Get existing team
    const existingTeam = await db.fantasyTeam.findUnique({
      where: { userId },
    });

    if (!existingTeam) {
      return errorNextResponse('Fantasy team not found', ErrorCode.NOT_FOUND);
    }

    // Check if within transfer window (before gameweek deadline)
    const currentGameweek = await db.gameweek.findFirst({
      where: { isCurrent: true },
    });

    if (currentGameweek && new Date() > currentGameweek.deadline) {
      return errorNextResponse(
        'Cannot make changes after gameweek deadline',
        ErrorCode.VALIDATION_ERROR
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = UpdateFantasyTeamSchema.safeParse(body);

    if (!validation.success) {
      return errorNextResponse(
        validation.error.errors[0]?.message || 'Validation failed',
        ErrorCode.VALIDATION_ERROR
      );
    }

    const { name, players, captainId, viceCaptainId } = validation.data;
    const updates: Record<string, unknown> = {};

    // Handle squad update (requires transfer processing)
    if (players && players.length > 0) {
      const currentPlayers: string[] = JSON.parse(existingTeam.players);
      const playersOut = currentPlayers.filter(p => !players.includes(p));
      const playersIn = players.filter(p => !currentPlayers.includes(p));

      // Calculate number of transfers
      const numTransfers = Math.max(playersOut.length, playersIn.length);
      
      if (numTransfers > 0) {
        // Check free transfers
        const freeTransfers = existingTeam.freeTransfers;
        const hitsNeeded = Math.max(0, numTransfers - freeTransfers);
        const transferCost = hitsNeeded * 4; // 4 points per hit

        // Get player prices for calculation
        const outPlayers = await db.player.findMany({
          where: { id: { in: playersOut } },
          select: { id: true, price: true },
        });
        const inPlayers = await db.player.findMany({
          where: { id: { in: playersIn } },
          select: { id: true, price: true },
        });

        const outValue = outPlayers.reduce((sum, p) => sum + p.price, 0);
        const inValue = inPlayers.reduce((sum, p) => sum + p.price, 0);
        const priceDiff = inValue - outValue;

        // Check if can afford the transfers
        const newRemainingBudget = existingTeam.remainingBudget - priceDiff;
        if (newRemainingBudget < 0) {
          return errorNextResponse(
            `Insufficient budget. Need ${Math.abs(newRemainingBudget).toFixed(1)} more`,
            ErrorCode.VALIDATION_ERROR
          );
        }

        // Validate new squad composition
        const captain = captainId || existingTeam.captainId;
        const viceCaptain = viceCaptainId || existingTeam.viceCaptainId;
        const teamValidation = await validateTeamComposition(players, captain, viceCaptain);
        
        if (!teamValidation.valid) {
          return errorNextResponse(teamValidation.error!, ErrorCode.VALIDATION_ERROR);
        }

        // Calculate new team value
        const newTeamValue = calculateTeamValue(teamValidation.players!);

        // Create transfer records
        if (currentGameweek) {
          for (let i = 0; i < numTransfers; i++) {
            await db.transfer.create({
              data: {
                fantasyTeamId: existingTeam.id,
                playerInId: playersIn[i] || playersOut[i],
                playerOutId: playersOut[i] || playersIn[i],
                gameweekId: currentGameweek.id,
                cost: i >= freeTransfers ? 4 : 0,
                priceDiff: (inPlayers[i]?.price || 0) - (outPlayers[i]?.price || 0),
                status: 'completed',
              },
            });
          }
        }

        // Update ownership percentages
        if (playersOut.length > 0) {
          await db.player.updateMany({
            where: { id: { in: playersOut } },
            data: { ownershipPercent: { decrement: 1 } },
          });
        }
        if (playersIn.length > 0) {
          await db.player.updateMany({
            where: { id: { in: playersIn } },
            data: { ownershipPercent: { increment: 1 } },
          });
        }

        updates.players = JSON.stringify(players);
        updates.remainingBudget = newRemainingBudget;
        updates.teamValue = newTeamValue;
        updates.freeTransfers = Math.max(0, freeTransfers - numTransfers);
        updates.transfersUsed = existingTeam.transfersUsed + numTransfers;
        updates.hits = existingTeam.hits + hitsNeeded;
      }
    }

    // Handle captain changes
    if (captainId || viceCaptainId) {
      const currentPlayers: string[] = players 
        ? players 
        : JSON.parse(existingTeam.players);
      
      const newCaptain = captainId || existingTeam.captainId;
      const newViceCaptain = viceCaptainId || existingTeam.viceCaptainId;

      // Validate captains
      if (captainId && !currentPlayers.includes(captainId)) {
        return errorNextResponse('Captain must be in the team', ErrorCode.VALIDATION_ERROR);
      }
      if (viceCaptainId && !currentPlayers.includes(viceCaptainId)) {
        return errorNextResponse('Vice captain must be in the team', ErrorCode.VALIDATION_ERROR);
      }
      if (newCaptain === newViceCaptain) {
        return errorNextResponse('Captain and vice captain must be different', ErrorCode.VALIDATION_ERROR);
      }

      if (captainId) updates.captainId = captainId;
      if (viceCaptainId) updates.viceCaptainId = viceCaptainId;
    }

    // Handle name update
    if (name) {
      updates.name = name;
    }

    // Apply updates
    if (Object.keys(updates).length > 0) {
      const updatedTeam = await db.fantasyTeam.update({
        where: { userId },
        data: updates,
      });

      return toNextResponse(successResponse({
        id: updatedTeam.id,
        name: updatedTeam.name,
        remainingBudget: updatedTeam.remainingBudget,
        teamValue: updatedTeam.teamValue,
        freeTransfers: updatedTeam.freeTransfers,
        transfersUsed: updatedTeam.transfersUsed,
        hits: updatedTeam.hits,
      }));
    }

    return toNextResponse(successResponse({ message: 'No changes made' }));
  } catch (error) {
    console.error('Error updating fantasy team:', error);
    return errorNextResponse('Failed to update fantasy team', ErrorCode.INTERNAL_ERROR);
  }
}
