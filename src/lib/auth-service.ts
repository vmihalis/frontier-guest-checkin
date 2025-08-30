/**
 * External authentication service client
 * Connects to the auth API service at localhost:8080
 */

export interface AuthServiceCredentials {
  email: string;
  password: string;
}

export interface AuthServiceResponse {
  // Add expected response fields here when the actual API is implemented
  // For now, we'll handle empty body responses
  success?: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

/**
 * Authenticate with external auth service
 */
export async function authenticateWithService(
  credentials: AuthServiceCredentials
): Promise<AuthServiceResponse | null> {
  try {
    console.log(`Attempting auth service login for: ${credentials.email}`);
    
    const response = await fetch('http://localhost:8080/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    console.log(`Auth service response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      if (response.status === 404) {
        console.warn('Auth service endpoint not found - service may not be properly configured');
      } else {
        console.error('Auth service returned error:', response.status, response.statusText);
      }
      return null;
    }

    // Handle empty body response as success for stub implementation
    const contentLength = response.headers.get('content-length');
    if (contentLength === '0' || !response.body) {
      console.log('Auth service returned empty body - treating as success');
      return { success: true };
    }

    const result = await response.json();
    console.log('Auth service returned JSON response:', result);
    return result;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'TimeoutError') {
        console.warn('Auth service request timed out');
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.warn('Auth service connection failed - service may not be running');
      } else {
        console.error('Auth service error:', error.message);
      }
    } else {
      console.error('Unknown auth service error:', error);
    }
    return null;
  }
}

/**
 * Check if auth service is available
 */
export async function isAuthServiceAvailable(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:8080/health', {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    return response.ok;
  } catch {
    return false;
  }
}