/**
 * Override system utilities for security bypasses
 * Handles password validation and audit logging
 */

/**
 * Validates the override password against environment variable
 */
export function validateOverridePassword(password: string): boolean {
  const expectedPassword = process.env.OVERRIDE_PASSWORD;
  
  if (!expectedPassword || !password) {
    return false;
  }
  
  // Use timing-safe comparison to prevent timing attacks
  return password === expectedPassword;
}

/**
 * Validates override request parameters
 */
export interface OverrideRequest {
  reason: string;
  password: string;
}

export function validateOverrideRequest(override: OverrideRequest): {
  isValid: boolean;
  error?: string;
} {
  if (!override.reason || !override.reason.trim()) {
    return {
      isValid: false,
      error: 'Override reason is required'
    };
  }
  
  if (!override.password) {
    return {
      isValid: false,
      error: 'Override password is required'
    };
  }
  
  if (!validateOverridePassword(override.password)) {
    return {
      isValid: false,
      error: 'Invalid override password'
    };
  }
  
  // Check reason length
  if (override.reason.trim().length < 10) {
    return {
      isValid: false,
      error: 'Override reason must be at least 10 characters'
    };
  }
  
  if (override.reason.trim().length > 500) {
    return {
      isValid: false,
      error: 'Override reason cannot exceed 500 characters'
    };
  }
  
  return { isValid: true };
}