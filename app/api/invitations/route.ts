import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth';
import { validateCreateInvitation } from '@/lib/validations';
import { todayInLA } from '@/lib/timezone';
import { sendInvitationEmail } from '@/lib/email';
import { getCurrentUserId } from '@/lib/auth';
import type { ContactMethod } from '@prisma/client';

export async function POST(request: NextRequest) {
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
    const body = await request.json();
    
    const { 
      name, 
      email, 
      country, 
      contactMethod, 
      contactValue,
      inviteDate,
      termsAccepted,
      visitorAgreementAccepted 
    } = body;

    // Validate required fields
    if (!name || !email || !country || !contactMethod || !contactValue) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!termsAccepted || !visitorAgreementAccepted) {
      return NextResponse.json(
        { error: 'Terms and Visitor Agreement must be accepted' },
        { status: 400 }
      );
    }

    // Validate business rules
    const validation = await validateCreateInvitation(hostId, email);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const inviteDateParsed = new Date(inviteDate || todayInLA());

    // Upsert guest
    const guest = await prisma.guest.upsert({
      where: { email },
      update: {
        name,
        country,
        contactMethod: contactMethod as ContactMethod,
        contactValue,
      },
      create: {
        email,
        name,
        country,
        contactMethod: contactMethod as ContactMethod,
        contactValue,
      },
    });

    // Create invitation
    const invitation = await prisma.invitation.create({
      data: {
        guestId: guest.id,
        hostId,
        inviteDate: inviteDateParsed,
      },
      include: {
        guest: true,
      },
    });

    // Create acceptance record (mock - in production this would be done by guest)
    await prisma.acceptance.create({
      data: {
        guestId: guest.id,
        termsVersion: '1.0',
        visitorAgreementVersion: '1.0',
      },
    });

    // Send invitation email (non-blocking - don't fail creation if email fails)
    // TODO: Get actual host name from user record when auth is implemented
    const hostName = 'Your Host'; // Mock - replace with actual host name
    
    try {
      const emailResult = await sendInvitationEmail(
        guest.email,
        guest.name,
        hostName,
        invitation.id
      );
      
      if (!emailResult.success) {
        console.error('Failed to send invitation email:', emailResult.error);
        // TODO: Queue for retry in background job system
      } else {
        console.log(`Invitation email sent successfully: ${emailResult.messageId}`);
      }
    } catch {
      console.error('Email service error during invitation creation:');
      // TODO: Queue for retry in background job system
    }

    return NextResponse.json({
      invitation,
      message: 'Invitation created successfully',
    });
  } catch {
    console.error('Error creating invitation:');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || todayInLA();

    const invitations = await prisma.invitation.findMany({
      where: {
        hostId,
        inviteDate: new Date(date),
      },
      include: {
        guest: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ invitations });
  } catch {
    console.error('Error fetching invitations:');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}