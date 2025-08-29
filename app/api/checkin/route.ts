import { NextRequest, NextResponse } from 'next/server';
import { validateQRToken } from '@/lib/qr-token';

export async function POST(request: NextRequest) {
  // DEPRECATED: Single-guest API is deprecated in favor of unified multi-guest API
  // Convert single-guest token to multi-guest format and redirect
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'QR token is required' },
        { status: 400 }
      );
    }

    // Validate and decode QR token to extract guest info
    const tokenValidation = validateQRToken(token);
    if (!tokenValidation.isValid || !tokenValidation.data) {
      return NextResponse.json(
        { error: tokenValidation.error || 'Invalid QR token format. Please use multi-guest API at /api/checkin/multi-guest' },
        { status: 400 }
      );
    }

    const { guestEmail } = tokenValidation.data;

    // Find guest name from database
    const { prisma } = await import('@/lib/prisma');
    const guest = await prisma.guest.findUnique({
      where: { email: guestEmail },
      select: { name: true, email: true }
    });

    if (!guest) {
      return NextResponse.json(
        { error: 'Guest not found' },
        { status: 404 }
      );
    }

    // Convert to multi-guest format and forward to multi-guest API
    const multiGuestPayload = {
      guest: {
        e: guest.email,
        n: guest.name
      }
    };

    // Forward to multi-guest API
    const multiGuestResponse = await fetch(`${request.nextUrl.origin}/api/checkin/multi-guest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
        'Cookie': request.headers.get('Cookie') || ''
      },
      body: JSON.stringify(multiGuestPayload)
    });

    const result = await multiGuestResponse.json();
    return NextResponse.json(result, { status: multiGuestResponse.status });

  } catch (error) {
    console.error('Error in deprecated single-guest API:', error);
    return NextResponse.json(
      { error: 'Single-guest API is deprecated. Please use multi-guest API at /api/checkin/multi-guest' },
      { status: 500 }
    );
  }
}