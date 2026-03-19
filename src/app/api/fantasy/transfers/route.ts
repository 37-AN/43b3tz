// Fantasy Transfers API Route
// GET - Fetch transfer history
// POST - Make a transfer
// DELETE - Cancel pending transfer

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

const MakeTransferSchema = z.object({
  playerInId: z.string().min(1, 'Player to add is required'),
  playerOutId: z.string().min(1, 'Player to remove is required'),
});

const CancelTransferSchema = z.object({
  transferId: z.string().min(1, 'Transfer ID is required'),
});

// ==================== CONSTANTS ====================

const POINTS_PER_HIT = 4;
const MAX_FREE_TRANSFERS = 2;
const PRICE_CHANGE_THRESHOLD = 0.1;

// ==================== HELPER FUNCTIONS ====================

async function getPlayerDetails(playerId: string) {
  return db.player.findUnique({
    where: { id: playerId },
    include: {
      team: {
        select: { id: true, name: true },
      },
    },
  });
}

async function checkPriceChangeEligibility(
  fantasyTeamId: string,
  playerId: string,
  isBuying: boolean
): Promise<{ eligible: boolean; warning?: string }> {
  const player = await getPlayerDetails(playerId);
  
  if (!player) {
    return { eligible: false, warning: 'Player not found' };
  }

  // Check if player has significant price change that might affect transfer
  if (Math.abs(player.priceChange) >= PRICE_CHANGE_THRESHOLD) {
    return {
      eligible: true,
      warning: `Player price has changed by ${player.priceChange.toFixed(1)}m`,
    };
  }

  return { eligible: true };
}

// ==================== GET HANDLER ====================

/**
 * GET /api/fantasy/transfers
 * Fetch transfer history for the user's team
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return errorNextResponse('Authentication required', ErrorCode.UNAUTHORIZED);
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const status = searchParams.get('status'); // pending, completed, cancelled
    const gameweekId = searchParams.get('gameweekId');

    // Get user's fantasy team
    const fantasyTeam = await db.fantasyTeam.findUnique({
      where: { userId },
    });

    if (!fantasyTeam) {
      return errorNextResponse('Fantasy team not found', ErrorCode.NOT_FOUND);
    }

    // Build where clause
    const where: Record<string, unknown> = {
      fantasyTeamId: fantasyTeam.id,
    };

    if (status) {
      where.status = status;
    }
    if (gameweekId) {
      where.gameweekId = gameweekId;
    }

    // Get total count
    const total = await db.transfer.count({ where });

    // Fetch transfers
    const transfers = await db.transfer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get player details for transfers
    const allPlayerIds = transfers.flatMap(t => [t.playerInId, t.playerOutId]);
    const players = await db.player.findMany({
      where: { id: { in: allPlayerIds } },
      include: {
        team: { select: { id: true, name: true } },
      },
    });

    const playerMap = new Map(players.map(p => [p.id, p]));

    // Build response
    const transfersResponse = transfers.map(transfer => ({
      id: transfer.id,
      status: transfer.status,
      cost: transfer.cost,
      priceDiff: transfer.priceDiff,
      createdAt: transfer.createdAt,
      playerIn: playerMap.get(transfer.playerInId) ? {
        id: transfer.playerInId,
        name: playerMap.get(transfer.playerInId)!.name,
        position: playerMap.get(transfer.playerInId)!.position,
        price: playerMap.get(transfer.playerInId)!.price,
        team: playerMap.get(transfer.playerInId)!.team,
      } : null,
      playerOut: playerMap.get(transfer.playerOutId) ? {
        id: transfer.playerOutId,
        name: playerMap.get(transfer.playerOutId)!.name,
        position: playerMap.get(transfer.playerOutId)!.position,
        price: playerMap.get(transfer.playerOutId)!.price,
        team: playerMap.get(transfer.playerOutId)!.team,
      } : null,
    }));

    // Get current gameweek for transfer info
    const currentGameweek = await db.gameweek.findFirst({
      where: { isCurrent: true },
    });

    const response = {
      transfers: transfersResponse,
      freeTransfers: fantasyTeam.freeTransfers,
      transfersUsed: fantasyTeam.transfersUsed,
      hits: fantasyTeam.hits,
      currentGameweek: currentGameweek ? {
        id: currentGameweek.id,
        number: currentGameweek.number,
        deadline: currentGameweek.deadline,
      } : null,
    };

    return toNextResponse(paginatedResponse(
      response.transfers,
      page,
      limit,
      total
    ));
  } catch (error) {
    console.error('Error fetching transfers:', error);
    return errorNextResponse('Failed to fetch transfers', ErrorCode.INTERNAL_ERROR);
  }
}

// ==================== POST HANDLER ====================

/**
 * POST /api/fantasy/transfers
 * Make a transfer (swap one player for another)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return errorNextResponse('Authentication required', ErrorCode.UNAUTHORIZED);
    }

    const userId = session.user.id;

    // Get user's fantasy team
    const fantasyTeam = await db.fantasyTeam.findUnique({
      where: { userId },
    });

    if (!fantasyTeam) {
      return errorNextResponse('Fantasy team not found', ErrorCode.NOT_FOUND);
    }

    // Check if within transfer window
    const currentGameweek = await db.gameweek.findFirst({
      where: { isCurrent: true },
    });

    if (currentGameweek && new Date() > currentGameweek.deadline) {
      return errorNextResponse(
        'Transfer window is closed for this gameweek',
        ErrorCode.VALIDATION_ERROR
      );
    }

    // Parse and validate request
    const body = await request.json();
    const validation = MakeTransferSchema.safeParse(body);

    if (!validation.success) {
      return errorNextResponse(
        validation.error.errors[0]?.message || 'Validation failed',
        ErrorCode.VALIDATION_ERROR
      );
    }

    const { playerInId, playerOutId } = validation.data;

    // Validate players are different
    if (playerInId === playerOutId) {
      return errorNextResponse('Cannot transfer the same player', ErrorCode.VALIDATION_ERROR);
    }

    // Get current squad
    const currentPlayers: string[] = JSON.parse(fantasyTeam.players);

    // Validate player out is in squad
    if (!currentPlayers.includes(playerOutId)) {
      return errorNextResponse(
        'Player to remove is not in your squad',
        ErrorCode.VALIDATION_ERROR
      );
    }

    // Validate player in is not already in squad
    if (currentPlayers.includes(playerInId)) {
      return errorNextResponse(
        'Player to add is already in your squad',
        ErrorCode.VALIDATION_ERROR
      );
    }

    // Get player details
    const playerIn = await getPlayerDetails(playerInId);
    const playerOut = await getPlayerDetails(playerOutId);

    if (!playerIn || !playerIn.isActive) {
      return errorNextResponse('Player to add is invalid or inactive', ErrorCode.VALIDATION_ERROR);
    }

    if (!playerOut) {
      return errorNextResponse('Player to remove is invalid', ErrorCode.VALIDATION_ERROR);
    }

    // Check position compatibility
    if (playerIn.position !== playerOut.position) {
      // Allow flexible transfers but warn about position imbalance
      const positionCounts: Record<string, number> = {};
      
      for (const playerId of currentPlayers) {
        if (playerId === playerOutId) continue;
        const p = await getPlayerDetails(playerId);
        if (p) {
          positionCounts[p.position] = (positionCounts[p.position] || 0) + 1;
        }
      }
      positionCounts[playerIn.position] = (positionCounts[playerIn.position] || 0) + 1;

      // Check minimum position requirements
      const minPositions: Record<string, number> = {
        GK: 1, DEF: 3, MID: 2, FWD: 1,
      };

      for (const [pos, min] of Object.entries(minPositions)) {
        if ((positionCounts[pos] || 0) < min) {
          return errorNextResponse(
            `Transfer would leave you with fewer than ${min} ${pos} players`,
            ErrorCode.VALIDATION_ERROR
          );
        }
      }
    }

    // Check team limit (max 3 players from same team)
    const teamCounts: Record<string, number> = {};
    for (const playerId of currentPlayers) {
      if (playerId === playerOutId) continue;
      const p = await getPlayerDetails(playerId);
      if (p) {
        teamCounts[p.teamId] = (teamCounts[p.teamId] || 0) + 1;
      }
    }
    
    if ((teamCounts[playerIn.teamId] || 0) >= 3) {
      return errorNextResponse(
        `You already have 3 players from ${playerIn.team.name}`,
        ErrorCode.VALIDATION_ERROR
      );
    }

    // Calculate price difference
    const priceDiff = playerIn.price - playerOut.price;
    const newRemainingBudget = fantasyTeam.remainingBudget - priceDiff;

    if (newRemainingBudget < 0) {
      return errorNextResponse(
        `Insufficient budget. Need ${Math.abs(newRemainingBudget).toFixed(1)}m more`,
        ErrorCode.VALIDATION_ERROR
      );
    }

    // Calculate transfer cost
    const freeTransfersUsed = Math.min(1, fantasyTeam.freeTransfers);
    const hitsIncurred = freeTransfersUsed > 0 ? 0 : 1;
    const transferCost = hitsIncurred * POINTS_PER_HIT;

    // Update squad
    const newPlayers = currentPlayers.map(p => p === playerOutId ? playerInId : p);
    const newTeamValue = fantasyTeam.teamValue + priceDiff;

    // Create transfer record and update team in transaction
    const result = await db.$transaction(async (tx) => {
      // Create transfer record
      const transfer = await tx.transfer.create({
        data: {
          fantasyTeamId: fantasyTeam.id,
          playerInId,
          playerOutId,
          gameweekId: currentGameweek?.id || '',
          cost: transferCost,
          priceDiff,
          status: 'completed',
        },
      });

      // Update fantasy team
      const updatedTeam = await tx.fantasyTeam.update({
        where: { id: fantasyTeam.id },
        data: {
          players: JSON.stringify(newPlayers),
          remainingBudget: newRemainingBudget,
          teamValue: newTeamValue,
          freeTransfers: Math.max(0, fantasyTeam.freeTransfers - freeTransfersUsed),
          transfersUsed: fantasyTeam.transfersUsed + 1,
          hits: fantasyTeam.hits + hitsIncurred,
        },
      });

      // Update captain/vice captain if needed
      if (fantasyTeam.captainId === playerOutId) {
        await tx.fantasyTeam.update({
          where: { id: fantasyTeam.id },
          data: { captainId: playerInId },
        });
      }
      if (fantasyTeam.viceCaptainId === playerOutId) {
        await tx.fantasyTeam.update({
          where: { id: fantasyTeam.id },
          data: { viceCaptainId: playerInId },
        });
      }

      // Update ownership percentages
      await tx.player.update({
        where: { id: playerOutId },
        data: { ownershipPercent: { decrement: 1 } },
      });
      await tx.player.update({
        where: { id: playerInId },
        data: { ownershipPercent: { increment: 1 } },
      });

      return { transfer, updatedTeam };
    });

    return toNextResponse(successResponse({
      transfer: {
        id: result.transfer.id,
        status: result.transfer.status,
        cost: result.transfer.cost,
        priceDiff: result.transfer.priceDiff,
        createdAt: result.transfer.createdAt,
      },
      team: {
        remainingBudget: result.updatedTeam.remainingBudget,
        teamValue: result.updatedTeam.teamValue,
        freeTransfers: result.updatedTeam.freeTransfers,
        transfersUsed: result.updatedTeam.transfersUsed,
        hits: result.updatedTeam.hits,
      },
      playerIn: {
        id: playerIn.id,
        name: playerIn.name,
        position: playerIn.position,
        price: playerIn.price,
        team: playerIn.team,
      },
      playerOut: {
        id: playerOut.id,
        name: playerOut.name,
        position: playerOut.position,
        price: playerOut.price,
        team: playerOut.team,
      },
    }));
  } catch (error) {
    console.error('Error making transfer:', error);
    return errorNextResponse('Failed to make transfer', ErrorCode.INTERNAL_ERROR);
  }
}

// ==================== DELETE HANDLER ====================

/**
 * DELETE /api/fantasy/transfers
 * Cancel a pending transfer (only if before deadline)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return errorNextResponse('Authentication required', ErrorCode.UNAUTHORIZED);
    }

    const userId = session.user.id;

    // Get user's fantasy team
    const fantasyTeam = await db.fantasyTeam.findUnique({
      where: { userId },
    });

    if (!fantasyTeam) {
      return errorNextResponse('Fantasy team not found', ErrorCode.NOT_FOUND);
    }

    // Parse request
    const body = await request.json();
    const validation = CancelTransferSchema.safeParse(body);

    if (!validation.success) {
      return errorNextResponse(
        validation.error.errors[0]?.message || 'Validation failed',
        ErrorCode.VALIDATION_ERROR
      );
    }

    const { transferId } = validation.data;

    // Find the transfer
    const transfer = await db.transfer.findFirst({
      where: {
        id: transferId,
        fantasyTeamId: fantasyTeam.id,
        status: 'pending',
      },
    });

    if (!transfer) {
      return errorNextResponse(
        'Pending transfer not found',
        ErrorCode.NOT_FOUND
      );
    }

    // Cancel the transfer
    await db.transfer.update({
      where: { id: transferId },
      data: { status: 'cancelled' },
    });

    return toNextResponse(successResponse({
      message: 'Transfer cancelled successfully',
    }));
  } catch (error) {
    console.error('Error cancelling transfer:', error);
    return errorNextResponse('Failed to cancel transfer', ErrorCode.INTERNAL_ERROR);
  }
}
