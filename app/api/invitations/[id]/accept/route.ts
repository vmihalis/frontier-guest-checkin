import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// TODO: Replace with actual auth middleware
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getCurrentUserId(_request: NextRequest): Promise<string> {
  // Mock implementation - get the first host user from the database
  const hostUser = await prisma.user.findFirst({
    where: { role: 'host' },
    select: { id: true }
  });
  
  if (!hostUser) {
    throw new Error('No host user found in database');
  }
  
  return hostUser.id;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const hostId = await getCurrentUserId(_request);
    const { id: invitationId } = await params;

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: { guest: true },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    if (invitation.hostId !== hostId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Create or update acceptance (mock toggle for demo)
    const existingAcceptance = await prisma.acceptance.findFirst({
      where: { guestId: invitation.guestId },
      orderBy: { acceptedAt: 'desc' },
    });

    let acceptance;
    if (!existingAcceptance) {
      acceptance = await prisma.acceptance.create({
        data: {
          guestId: invitation.guestId,
          termsVersion: '1.0',
          visitorAgreementVersion: '1.0',
        },
      });
    }

    return NextResponse.json({
      acceptance: acceptance || existingAcceptance,
      message: 'Guest acceptance recorded',
    });
  } catch (error) {
    console.error('Error recording acceptance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}