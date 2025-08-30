import { NextResponse } from 'next/server';
import { generateAcceptanceToken } from '@/lib/acceptance-token';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Test endpoints not available in production' },
        { status: 403 }
      );
    }

    // Find a test invitation to generate token for
    const invitation = await prisma.invitation.findFirst({
      include: { 
        guest: true, 
        host: true 
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!invitation) {
      return NextResponse.json({
        error: 'No invitations found. Please create some test data first with: npm run db:seed',
      }, { status: 404 });
    }

    // Generate acceptance token
    const token = await generateAcceptanceToken(
      invitation.id,
      invitation.guest.email,
      invitation.hostId
    );

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
    const testUrl = `${baseUrl}/accept/${token}`;

    return NextResponse.json({
      success: true,
      token,
      testUrl,
      invitation: {
        id: invitation.id,
        guestName: invitation.guest.name,
        guestEmail: invitation.guest.email,
        hostName: invitation.host.name,
      },
      instructions: [
        'Open the testUrl in your browser',
        'Test the signature functionality!',
        'The form will validate and require all three: terms acceptance, visitor agreement, and signature'
      ]
    });

  } catch (error) {
    console.error('Error generating test token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}