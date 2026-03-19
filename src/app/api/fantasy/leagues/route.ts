// Fantasy Leagues API Route
// GET - Fetch leagues (public or user's leagues)
// POST - Create a new league
// PUT - Update league settings
// DELETE - Leave a league

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
import { nanoid } from 'nanoid';

// ==================== VALIDATION SCHEMAS ====================

const CreateLeagueSchema = z.object({
  name: z.string()
    .min(3, 'League name must be at least 3 characters')
    .max(50, 'League name must be at most 50 characters'),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(false),
  maxMembers: z.number().int().min(2).max(100).default(20),
  prizePool: z.number().min(0).default(0),
});

const JoinLeagueSchema = z.object({
  code: z.string().min(1, 'League code is required'),
});

const UpdateLeagueSchema = z.object({
  leagueId: z.string().min(1, 'League ID is required'),
  name: z.string().min(3).max(50).optional(),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
  maxMembers: z.number().int().min(2).max(100).optional(),
  prizePool: z.number().min(0).optional(),
});

const LeaveLeagueSchema = z.object({
  leagueId: z.string().min(1, 'League ID is required'),
});

// ==================== CONSTANTS ====================

const DEFAULT_LEAGUE_CODE_LENGTH = 8;

// ==================== HELPER FUNCTIONS ====================

function generateLeagueCode(): string {
  return nanoid(DEFAULT_LEAGUE_CODE_LENGTH).toUpperCase();
}

async function getUserLeagueRole(userId: string, leagueId: string): Promise<string | null> {
  const member = await db.fantasyLeagueMember.findUnique({
    where: {
      leagueId_userId: { leagueId, userId },
    },
    select: { role: true },
  });
  return member?.role || null;
}

async function getLeagueMemberCount(leagueId: string): Promise<number> {
  return db.fantasyLeagueMember.count({
    where: { leagueId },
  });
}

// ==================== GET HANDLER ====================

/**
 * GET /api/fantasy/leagues
 * Fetch leagues based on query parameters
 * - type=my: User's leagues
 * - type=public: Public leagues to join
 * - leagueId={id}: Specific league details
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return errorNextResponse('Authentication required', ErrorCode.UNAUTHORIZED);
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    
    const type = searchParams.get('type') || 'my';
    const leagueId = searchParams.get('leagueId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const search = searchParams.get('search');

    // Fetch specific league details
    if (leagueId) {
      const league = await db.fantasyLeague.findUnique({
        where: { id: leagueId },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, username: true },
              },
              fantasyTeam: {
                select: { name: true, totalPoints: true },
              },
            },
            orderBy: { totalPoints: 'desc' },
          },
        },
      });

      if (!league) {
        return errorNextResponse('League not found', ErrorCode.NOT_FOUND);
      }

      // Check if user is a member
      const userMember = league.members.find(m => m.userId === userId);
      const isMember = !!userMember;

      // For non-members, only show basic info for public leagues
      if (!isMember && !league.isPublic) {
        return errorNextResponse('League not found', ErrorCode.NOT_FOUND);
      }

      // Build response
      const response = {
        id: league.id,
        name: league.name,
        description: league.description,
        code: isMember ? league.code : null,
        isPublic: league.isPublic,
        maxMembers: league.maxMembers,
        prizePool: league.prizePool,
        memberCount: league.members.length,
        createdAt: league.createdAt,
        isMember,
        userRole: userMember?.role || null,
        userRank: userMember?.rank || null,
        members: isMember ? league.members.map((m, index) => ({
          id: m.id,
          rank: index + 1,
          user: m.user,
          teamName: m.fantasyTeam.name,
          totalPoints: m.totalPoints,
          gameweekPoints: m.gameweekPoints,
        })) : undefined,
      };

      return toNextResponse(successResponse(response));
    }

    // Fetch user's leagues
    if (type === 'my') {
      const where = {
        members: {
          some: { userId },
        },
      };

      const total = await db.fantasyLeague.count({ where });

      const leagues = await db.fantasyLeague.findMany({
        where,
        include: {
          members: {
            where: { userId },
            select: {
              rank: true,
              totalPoints: true,
              gameweekPoints: true,
              role: true,
            },
          },
          _count: {
            select: { members: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      const response = leagues.map(league => ({
        id: league.id,
        name: league.name,
        code: league.code,
        isPublic: league.isPublic,
        memberCount: league._count.members,
        userRank: league.members[0]?.rank,
        userTotalPoints: league.members[0]?.totalPoints,
        userGameweekPoints: league.members[0]?.gameweekPoints,
        userRole: league.members[0]?.role,
      }));

      return toNextResponse(paginatedResponse(response, page, limit, total));
    }

    // Fetch public leagues to join
    if (type === 'public') {
      const where: Record<string, unknown> = {
        isPublic: true,
        isActive: true,
        NOT: {
          members: {
            some: { userId },
          },
        },
      };

      if (search) {
        where.name = {
          contains: search,
          mode: 'insensitive',
        };
      }

      const total = await db.fantasyLeague.count({ where });

      const leagues = await db.fantasyLeague.findMany({
        where,
        include: {
          _count: {
            select: { members: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { prizePool: 'desc' },
          { createdAt: 'desc' },
        ],
      });

      const response = leagues.map(league => ({
        id: league.id,
        name: league.name,
        description: league.description,
        memberCount: league._count.members,
        maxMembers: league.maxMembers,
        prizePool: league.prizePool,
        isFull: league._count.members >= league.maxMembers,
      }));

      return toNextResponse(paginatedResponse(response, page, limit, total));
    }

    return errorNextResponse('Invalid request type', ErrorCode.VALIDATION_ERROR);
  } catch (error) {
    console.error('Error fetching leagues:', error);
    return errorNextResponse('Failed to fetch leagues', ErrorCode.INTERNAL_ERROR);
  }
}

// ==================== POST HANDLER ====================

/**
 * POST /api/fantasy/leagues
 * Create a new league or join an existing league
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return errorNextResponse('Authentication required', ErrorCode.UNAUTHORIZED);
    }

    const userId = session.user.id;
    const body = await request.json();

    // Check if this is a join request
    if (body.code) {
      const validation = JoinLeagueSchema.safeParse(body);

      if (!validation.success) {
        return errorNextResponse(
          validation.error.errors[0]?.message || 'Validation failed',
          ErrorCode.VALIDATION_ERROR
        );
      }

      const { code } = validation.data;

      // Find league by code
      const league = await db.fantasyLeague.findUnique({
        where: { code: code.toUpperCase() },
        include: {
          _count: {
            select: { members: true },
          },
        },
      });

      if (!league) {
        return errorNextResponse('Invalid league code', ErrorCode.NOT_FOUND);
      }

      if (!league.isActive) {
        return errorNextResponse('This league is no longer active', ErrorCode.VALIDATION_ERROR);
      }

      // Check if already a member
      const existingMember = await db.fantasyLeagueMember.findUnique({
        where: {
          leagueId_userId: { leagueId: league.id, userId },
        },
      });

      if (existingMember) {
        return errorNextResponse('You are already a member of this league', ErrorCode.CONFLICT);
      }

      // Check if league is full
      if (league._count.members >= league.maxMembers) {
        return errorNextResponse('This league is full', ErrorCode.VALIDATION_ERROR);
      }

      // Get user's fantasy team
      const fantasyTeam = await db.fantasyTeam.findUnique({
        where: { userId },
      });

      if (!fantasyTeam) {
        return errorNextResponse(
          'You need to create a fantasy team first',
          ErrorCode.VALIDATION_ERROR
        );
      }

      // Join the league
      const member = await db.fantasyLeagueMember.create({
        data: {
          leagueId: league.id,
          userId,
          fantasyTeamId: fantasyTeam.id,
          role: 'member',
          totalPoints: fantasyTeam.totalPoints,
          gameweekPoints: fantasyTeam.gameweekPoints,
        },
        include: {
          league: {
            select: { id: true, name: true },
          },
        },
      });

      return toNextResponse(successResponse({
        message: 'Successfully joined the league',
        league: {
          id: league.id,
          name: league.name,
          code: league.code,
        },
      }));
    }

    // Create new league
    const validation = CreateLeagueSchema.safeParse(body);

    if (!validation.success) {
      return errorNextResponse(
        validation.error.errors[0]?.message || 'Validation failed',
        ErrorCode.VALIDATION_ERROR
      );
    }

    const { name, description, isPublic, maxMembers, prizePool } = validation.data;

    // Get user's fantasy team
    const fantasyTeam = await db.fantasyTeam.findUnique({
      where: { userId },
    });

    if (!fantasyTeam) {
      return errorNextResponse(
        'You need to create a fantasy team first',
        ErrorCode.VALIDATION_ERROR
      );
    }

    // Generate unique code
    let code = generateLeagueCode();
    let codeExists = await db.fantasyLeague.findUnique({ where: { code } });
    
    while (codeExists) {
      code = generateLeagueCode();
      codeExists = await db.fantasyLeague.findUnique({ where: { code } });
    }

    // Create league with user as admin
    const result = await db.$transaction(async (tx) => {
      // Create league
      const league = await tx.fantasyLeague.create({
        data: {
          name,
          description,
          code,
          creatorId: userId,
          isPublic,
          maxMembers,
          prizePool,
        },
      });

      // Add creator as admin member
      await tx.fantasyLeagueMember.create({
        data: {
          leagueId: league.id,
          userId,
          fantasyTeamId: fantasyTeam.id,
          role: 'admin',
          totalPoints: fantasyTeam.totalPoints,
          gameweekPoints: fantasyTeam.gameweekPoints,
        },
      });

      return league;
    });

    return toNextResponse(successResponse({
      id: result.id,
      name: result.name,
      code: result.code,
      isPublic: result.isPublic,
      maxMembers: result.maxMembers,
      prizePool: result.prizePool,
    }));
  } catch (error) {
    console.error('Error creating/joining league:', error);
    return errorNextResponse('Failed to create/join league', ErrorCode.INTERNAL_ERROR);
  }
}

// ==================== PUT HANDLER ====================

/**
 * PUT /api/fantasy/leagues
 * Update league settings (admin only)
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return errorNextResponse('Authentication required', ErrorCode.UNAUTHORIZED);
    }

    const userId = session.user.id;
    const body = await request.json();
    const validation = UpdateLeagueSchema.safeParse(body);

    if (!validation.success) {
      return errorNextResponse(
        validation.error.errors[0]?.message || 'Validation failed',
        ErrorCode.VALIDATION_ERROR
      );
    }

    const { leagueId, ...updates } = validation.data;

    // Check if user is admin
    const role = await getUserLeagueRole(userId, leagueId);
    
    if (role !== 'admin') {
      return errorNextResponse(
        'Only league admins can update settings',
        ErrorCode.FORBIDDEN
      );
    }

    // Check max members constraint
    if (updates.maxMembers) {
      const currentCount = await getLeagueMemberCount(leagueId);
      if (updates.maxMembers < currentCount) {
        return errorNextResponse(
          `Cannot reduce max members below current count (${currentCount})`,
          ErrorCode.VALIDATION_ERROR
        );
      }
    }

    // Update league
    const league = await db.fantasyLeague.update({
      where: { id: leagueId },
      data: updates,
    });

    return toNextResponse(successResponse({
      id: league.id,
      name: league.name,
      description: league.description,
      isPublic: league.isPublic,
      maxMembers: league.maxMembers,
      prizePool: league.prizePool,
    }));
  } catch (error) {
    console.error('Error updating league:', error);
    return errorNextResponse('Failed to update league', ErrorCode.INTERNAL_ERROR);
  }
}

// ==================== DELETE HANDLER ====================

/**
 * DELETE /api/fantasy/leagues
 * Leave a league or delete it (admin only for deletion)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return errorNextResponse('Authentication required', ErrorCode.UNAUTHORIZED);
    }

    const userId = session.user.id;
    const body = await request.json();
    const validation = LeaveLeagueSchema.safeParse(body);

    if (!validation.success) {
      return errorNextResponse(
        validation.error.errors[0]?.message || 'Validation failed',
        ErrorCode.VALIDATION_ERROR
      );
    }

    const { leagueId } = validation.data;

    // Get member info
    const member = await db.fantasyLeagueMember.findUnique({
      where: {
        leagueId_userId: { leagueId, userId },
      },
    });

    if (!member) {
      return errorNextResponse('You are not a member of this league', ErrorCode.NOT_FOUND);
    }

    // Get league info
    const league = await db.fantasyLeague.findUnique({
      where: { id: leagueId },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    if (!league) {
      return errorNextResponse('League not found', ErrorCode.NOT_FOUND);
    }

    // If admin and only member, delete the league
    if (member.role === 'admin' && league._count.members === 1) {
      await db.$transaction([
        db.fantasyLeagueMember.delete({
          where: { id: member.id },
        }),
        db.fantasyLeague.delete({
          where: { id: leagueId },
        }),
      ]);

      return toNextResponse(successResponse({
        message: 'League deleted successfully',
      }));
    }

    // If admin with other members, transfer admin role first
    if (member.role === 'admin' && league._count.members > 1) {
      // Find another member to transfer admin to
      const nextAdmin = await db.fantasyLeagueMember.findFirst({
        where: {
          leagueId,
          userId: { not: userId },
        },
        orderBy: { joinedAt: 'asc' },
      });

      if (nextAdmin) {
        await db.$transaction([
          // Transfer admin role
          db.fantasyLeagueMember.update({
            where: { id: nextAdmin.id },
            data: { role: 'admin' },
          }),
          // Remove current user
          db.fantasyLeagueMember.delete({
            where: { id: member.id },
          }),
          // Update creator
          db.fantasyLeague.update({
            where: { id: leagueId },
            data: { creatorId: nextAdmin.userId },
          }),
        ]);

        return toNextResponse(successResponse({
          message: 'Left league successfully. Admin rights transferred.',
        }));
      }
    }

    // Regular member leaving
    await db.fantasyLeagueMember.delete({
      where: { id: member.id },
    });

    return toNextResponse(successResponse({
      message: 'Left league successfully',
    }));
  } catch (error) {
    console.error('Error leaving league:', error);
    return errorNextResponse('Failed to leave league', ErrorCode.INTERNAL_ERROR);
  }
}
