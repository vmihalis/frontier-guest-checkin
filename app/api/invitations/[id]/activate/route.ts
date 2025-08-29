import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateActivateQR } from '@/lib/validations';
import { generateQRToken } from '@/lib/qr-token';
import { nowInLA, getQRTokenExpiration } from '@/lib/timezone';
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

    // Check if guest has accepted terms and conditions
    const acceptance = await prisma.acceptance.findFirst({
      where: { guestId: invitation.guestId },
      orderBy: { acceptedAt: 'desc' },
    });

    if (!acceptance) {
      return NextResponse.json(
        { error: 'Guest must accept Terms and Conditions before QR code can be generated' },
        { status: 400 }
      );
    }

    // Validate business rules
    const validation = await validateActivateQR(
      hostId,
      invitation.guestId,
      invitation.guest.email
    );
    
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Generate QR token
    const now = nowInLA();
    const expiresAt = getQRTokenExpiration();
    const qrToken = generateQRToken(invitationId, invitation.guest.email, hostId);

    // Update invitation
    const updatedInvitation = await prisma.invitation.update({
      where: { id: invitationId },
      data: {
        status: 'ACTIVATED',
        qrToken,
        qrIssuedAt: now,
        qrExpiresAt: expiresAt,
      },
      include: { guest: true },
    });

    return NextResponse.json({
      invitation: updatedInvitation,
      qrToken,
      expiresAt,
      message: 'QR code activated successfully',
    });
  } catch {
    console.error('Error activating QR code:');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}