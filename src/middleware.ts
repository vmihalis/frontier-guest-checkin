import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { isDemoMode, logDemo } from '@/lib/demo-config';

// Routes that require authentication
const protectedRoutes = ['/invites', '/dashboard'];

// Routes that should redirect authenticated users (like login)
const authRoutes = ['/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 🎭 DEMO MODE: Skip all authentication checks
  if (isDemoMode()) {
    logDemo(`Middleware bypassed for ${pathname}`);
    return NextResponse.next();
  }
  
  // 🔒 PRODUCTION AUTH: Full middleware protection
  try {
    const { isAuthenticated } = await getAuthContext(request);
    
    // Check if current path is protected
    const isProtectedRoute = protectedRoutes.some(route => 
      pathname.startsWith(route)
    );
    
    // Check if current path is an auth route
    const isAuthRoute = authRoutes.some(route => 
      pathname.startsWith(route)
    );
    
    // Redirect to login if accessing protected route without authentication
    if (isProtectedRoute && !isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // Redirect to invites if accessing login while authenticated
    if (isAuthRoute && isAuthenticated) {
      return NextResponse.redirect(new URL('/invites', request.url));
    }
    
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    // On error, allow the request to continue
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};