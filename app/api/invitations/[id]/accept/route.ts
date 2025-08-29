import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    let hostId: string;
    try {
      hostId = await getCurrentUserId(request);
    } catch {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
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
  } catch {
    console.error('Error recording acceptance:');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}