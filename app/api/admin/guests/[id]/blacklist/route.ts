import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nowInLA } from '@/lib/timezone';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { action } = await request.json();

    if (!['blacklist', 'unblacklist'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "blacklist" or "unblacklist"' },
        { status: 400 }
      );
    }

    const guest = await prisma.guest.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, blacklistedAt: true }
    });

    if (!guest) {
      return NextResponse.json(
        { error: 'Guest not found' },
        { status: 404 }
      );
    }

    let updateData: { blacklistedAt: Date | null };
    let message: string;

    if (action === 'blacklist') {
      if (guest.blacklistedAt) {
        return NextResponse.json(
          { error: 'Guest is already blacklisted' },
          { status: 400 }
        );
      }
      
      updateData = { blacklistedAt: nowInLA() };
      message = `${guest.name} has been blacklisted`;
    } else {
      if (!guest.blacklistedAt) {
        return NextResponse.json(
          { error: 'Guest is not blacklisted' },
          { status: 400 }
        );
      }
      
      updateData = { blacklistedAt: null };
      message = `${guest.name} has been removed from blacklist`;
    }

    const updatedGuest = await prisma.guest.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      message,
      guest: {
        id: updatedGuest.id,
        name: updatedGuest.name,
        email: updatedGuest.email,
        isBlacklisted: !!updatedGuest.blacklistedAt
      }
    });
  } catch (error) {
    console.error('Error updating guest blacklist status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}