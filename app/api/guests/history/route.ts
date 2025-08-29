import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth';
import { getGuestStats } from '@/lib/validations';

export async function GET(request: NextRequest) {
  try {
    const hostId = await getCurrentUserId(request);
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';

    // Get all guests that have had invitations from this host
    const guestsQuery = await prisma.guest.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
            ],
          },
          {
            invitations: {
              some: { hostId },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get stats for each guest
    const guestsWithStats = await Promise.all(
      guestsQuery.map(async (guest) => {
        const stats = await getGuestStats(guest.email);
        return {
          ...guest,
          ...stats,
        };
      })
    );

    return NextResponse.json({ guests: guestsWithStats });
  } catch (error) {
    console.error('Error fetching guest history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}