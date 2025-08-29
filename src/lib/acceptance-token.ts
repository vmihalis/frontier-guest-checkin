/**
 * JWT token generation and validation for guest acceptance links
 * Provides secure, time-limited tokens for terms acceptance workflow
 */

import { SignJWT, jwtVerify } from 'jose';

// Use a strong secret for JWT signing - convert to Uint8Array for jose
const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET || 'fallback-secret-for-development-only';
  return new TextEncoder().encode(secret);
};

export interface AcceptanceTokenPayload {
  invitationId: string;
  guestEmail: string;
  hostId: string;
}

/**
 * Generate a secure JWT token for guest acceptance
 * Token expires in 7 days to give guests time to respond
 */
export async function generateAcceptanceToken(
  invitationId: string,
  guestEmail: string,
  hostId: string
): Promise<string> {
  const payload: AcceptanceTokenPayload = {
    invitationId,
    guestEmail,
    hostId,
  };

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .setIssuer('frontier-tower')
    .setSubject('guest-acceptance')
    .sign(getJWTSecret());

  return token;
}

/**
 * Verify and decode an acceptance token
 * Returns the payload if valid, throws error if invalid/expired
 */
export async function verifyAcceptanceToken(token: string): Promise<AcceptanceTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, getJWTSecret(), {
      issuer: 'frontier-tower',
      subject: 'guest-acceptance',
    });
    
    return payload as AcceptanceTokenPayload;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        throw new Error('Acceptance link has expired. Please request a new invitation.');
      } else {
        throw new Error('Invalid acceptance link.');
      }
    }
    throw new Error('Token verification failed.');
  }
}

/**
 * Check if token is expired without throwing
 * Useful for UI feedback
 */
export async function isAcceptanceTokenExpired(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getJWTSecret());
    return false;
  } catch (error) {
    return error instanceof Error && error.message.includes('expired');
  }
}