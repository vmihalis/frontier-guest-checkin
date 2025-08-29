import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateActivateQR } from '@/lib/validations';
import { generateQRToken } from '@/lib/qr-token';
import { nowInLA, getQRTokenExpiration } from '@/lib/timezone';

// TODO: Replace with actual auth middleware
function getCurrentUserId(request: NextRequest): string {
  return 'mock-host-id';
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const hostId = getCurrentUserId(request);
    const invitationId = params.id;

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
  } catch (error) {
    console.error('Error activating QR code:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}