import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  try {
    const { invitationId } = await params;

    // Get invitation with guest and host details
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: {
        guest: {
          select: {
            email: true,
            name: true,
            country: true,
            contactMethod: true,
            contactValue: true,
            profileCompleted: true,
            termsAcceptedAt: true,
          }
        },
        host: {
          select: {
            name: true,
            email: true,
          }
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Check if invitation is still valid
    if (invitation.status === 'EXPIRED') {
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 400 }
      );
    }

    if (invitation.status === 'CHECKED_IN') {
      return NextResponse.json(
        { error: 'This invitation has already been used' },
        { status: 400 }
      );
    }

    return NextResponse.json({ invitation });
  } catch (error) {
    console.error('Error fetching invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}