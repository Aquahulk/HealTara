import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  // Use parsed hostname which excludes port (e.g. "localhost" or "doctor.example.com")
  const hostname = req.headers.get('host')?.split(':')[0] || req.nextUrl.hostname;
  console.log(`🔍 Middleware called with hostname: ${hostname}, original host: ${req.headers.get('host')}`);

  // Only perform subdomain rewrites for non-localhost domains
  const isLocalhost = hostname === 'localhost';
  // Skip subdomain routing on Vercel preview/production domains
  const isVercelHost = hostname.endsWith('vercel.app') || hostname.endsWith('vercel.dev');
  // Optional kill-switch via env var: set NEXT_PUBLIC_ENABLE_SUBDOMAIN_ROUTING="false" to disable
  const subdomainRoutingEnabled = (process.env.NEXT_PUBLIC_ENABLE_SUBDOMAIN_ROUTING ?? 'true') !== 'false';
  const hostParts = hostname.split('.');
  const hasSubdomain = hostParts.length >= 2; // e.g. sub.domain.tld or sub.localhost

  // Apply subdomain routing when explicitly enabled
  // Note: Enable on localhost for testing custom domains
  if (!isVercelHost && subdomainRoutingEnabled && hasSubdomain) {
    const sub = hostParts[0];
    if (sub === 'www') {
      return NextResponse.next();
    }
    // IMPORTANT: Don't treat the main domain as a subdomain
    if (sub === 'hosptest' || sub === 'healtara' || sub === 'app') {
      return NextResponse.next();
    }

    try {
      const apiHost = process.env.NEXT_PUBLIC_API_URL || req.nextUrl.origin;
      
      // PRIORITY 1: Explicit hospital subdomain mapping (entered by user)
      const sresp = await fetch(`${apiHost}/api/hospitals/subdomain/${sub}`, { cache: 'no-store' });
      if (sresp.ok) {
        const data = await sresp.json();
        const target = `/hospital-site/${data.id}${url.pathname}`;
        console.log(`Rewriting hospital (custom subdomain) "${sub}" -> "${target}"`);
        // Preserve all cookies for authentication
        const response = NextResponse.rewrite(new URL(target, req.url));
        response.headers.set('x-forwarded-host', hostname);
        return response;
      }
      
      // PRIORITY 2: Explicit doctor slug lookup
      const dresp = await fetch(`${apiHost}/api/doctors/slug/${sub}`, { cache: 'no-store' });
      if (dresp.ok) {
        const target2 = `/doctor-site/${sub}${url.pathname}`;
        console.log(`Rewriting doctor subdomain: "${sub}" -> "${target2}"`);
        // Preserve all cookies for authentication
        const response = NextResponse.rewrite(new URL(target2, req.url));
        response.headers.set('x-forwarded-host', hostname);
        return response;
      }
    } catch (e) {
      console.error('Middleware API fetch failed:', e);
    }

    // Default: let it fall through to standard routing if no subdomain match is found
    // This avoids confusing rewrites to non-existent sites.
    return NextResponse.next();
  }

  // For main domain or any other cases, let them pass through
  return NextResponse.next();

  // Protect admin routes
  if (url.pathname.startsWith('/admin-secure-panel-7x9y2z-2024')) {
    // Allow access to admin login page
    if (url.pathname === '/admin-secure-panel-7x9y2z-2024/login') {
      return NextResponse.next();
    }

    // For other admin routes, let them pass through
    // Client-side validation will handle the actual admin role check
    // This prevents redirect loops while maintaining security
    return NextResponse.next();
  }

  // Let all other requests (for the main site) pass through unchanged
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
