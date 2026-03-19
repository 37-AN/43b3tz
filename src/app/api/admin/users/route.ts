import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/admin/users - List users with pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role');
    const status = searchParams.get('status');

    const skip = (page - 1) * limit;

    // Build filter
    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { name: { contains: search } },
        { username: { contains: search } },
      ];
    }
    if (role) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          wallet: true,
          tipsterProfile: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.user.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        username: u.username,
        role: u.role,
        balance: u.wallet?.balance || 0,
        virtualBalance: u.wallet?.virtualBalance || 0,
        totalBets: u.wallet?.totalBets || 0,
        winRate: u.wallet?.winRate || 0,
        roi: u.wallet?.roi || 0,
        isTipster: !!u.tipsterProfile,
        createdAt: u.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch users',
    }, { status: 500 });
  }
}

// PUT /api/admin/users - Update user
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, role, status } = body;

    const user = await db.user.update({
      where: { id: userId },
      data: { role },
    });

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update user',
    }, { status: 500 });
  }
}

// DELETE /api/admin/users - Suspend user
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID required',
      }, { status: 400 });
    }

    // Soft delete or suspend
    await db.user.update({
      where: { id: userId },
      data: { role: 'suspended' },
    });

    return NextResponse.json({
      success: true,
      message: 'User suspended',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to suspend user',
    }, { status: 500 });
  }
}
