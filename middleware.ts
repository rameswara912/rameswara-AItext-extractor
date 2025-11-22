import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Add CSP header for Electron app
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self' https://aozsuqxcpbotbxmwstin.supabase.co; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; " +
    "style-src 'self' 'unsafe-inline' https:; " +
    "img-src 'self' data: blob: https:; " +
    "font-src 'self' data: https:; " +
    "connect-src 'self' https://aozsuqxcpbotbxmwstin.supabase.co wss://aozsuqxcpbotbxmwstin.supabase.co http://localhost:* https: wss:; " +
    "object-src 'self' data: blob: https: http:; " +
    "frame-src 'self' data: blob: https: http:; " +
    "worker-src 'self' blob:; " +
    "frame-ancestors 'self';"
  );
  
  return response;
}

export const config = {
  matcher: ['/:path*'],
};
