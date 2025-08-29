import { NextRequest, NextResponse } from 'next/server';
import { signInUser, createSessionResponse } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Sign in user (password is ignored, just checks if email exists in database)
    const result = await signInUser(email, password);

    if (result.error || !result.user) {
      return NextResponse.json(
        { error: result.error || 'Sign in failed' },
        { status: 401 }
      );
    }

    // Create session response with cookie
    return createSessionResponse(result.user);
  } catch (error) {
    console.error('Sign in API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}