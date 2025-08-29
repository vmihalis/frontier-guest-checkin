import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const policies = await prisma.policy.findFirst({
      where: { id: 1 }
    });

    if (!policies) {
      // Create default policies if none exist
      const defaultPolicies = await prisma.policy.create({
        data: {
          id: 1,
          guestMonthlyLimit: 3,
          hostConcurrentLimit: 3
        }
      });
      return NextResponse.json(defaultPolicies);
    }

    return NextResponse.json(policies);
  } catch (error) {
    console.error('Error fetching policies:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { guestMonthlyLimit, hostConcurrentLimit } = await request.json();

    // Validate input
    if (typeof guestMonthlyLimit !== 'number' || guestMonthlyLimit < 1 || guestMonthlyLimit > 100) {
      return NextResponse.json(
        { error: 'Guest monthly limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    if (typeof hostConcurrentLimit !== 'number' || hostConcurrentLimit < 1 || hostConcurrentLimit > 50) {
      return NextResponse.json(
        { error: 'Host concurrent limit must be between 1 and 50' },
        { status: 400 }
      );
    }

    const updatedPolicies = await prisma.policy.upsert({
      where: { id: 1 },
      update: {
        guestMonthlyLimit,
        hostConcurrentLimit,
        updatedAt: new Date()
      },
      create: {
        id: 1,
        guestMonthlyLimit,
        hostConcurrentLimit
      }
    });

    return NextResponse.json({
      success: true,
      policies: updatedPolicies,
      message: 'Policies updated successfully'
    });
  } catch (error) {
    console.error('Error updating policies:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}