import { NextResponse } from 'next/server';

export async function POST() {
  // JWT-only auth: logout is handled client-side by removing token from localStorage
  // This endpoint just confirms the logout action
  return NextResponse.json({
    success: true,
    message: 'Logout successful',
  });
}