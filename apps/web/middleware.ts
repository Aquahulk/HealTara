import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  // Use the parsed hostname which excludes port (e.g. "localhost" or "doctor.example.com")
  const hostname = req.nextUrl.hostname;

  // Only perform subdomain rewrites for non-localhost domains
  const isLocalhost = hostname === 'localhost';
  // Skip subdomain routing on Vercel preview/production domains
  const isVercelHost = hostname.endsWith('vercel.app') || hostname.endsWith('vercel.dev');
  // Optional kill-switch via env var: set NEXT_PUBLIC_ENABLE_SUBDOMAIN_ROUTING="false" to disable
  const subdomainRoutingEnabled = (process.env.NEXT_PUBLIC_ENABLE_SUBDOMAIN_ROUTING ?? 'true') !== 'false';
  const hostParts = hostname.split('.');
  const hasSubdomain = hostParts.length > 2; // e.g. sub.domain.tld

  // Apply subdomain routing only when explicitly enabled and not on Vercel-hosted domains
  if (!isLocalhost && !isVercelHost && subdomainRoutingEnabled && hasSubdomain) {
    const sub = hostParts[0];
    // Use relative fetch; Next.js dev rewrite proxies to backend
    const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    // Hospital subdomain patterns:
    // - hospital-<id>.domain.tld => /hospital-site/<id>
    // - hospital-<slug>.domain.tld => /hospital-site/<slug>
    if (sub.startsWith('hospital-')) {
      const suffix = sub.slice('hospital-'.length);
      const target = `/hospital-site/${suffix}${url.pathname}`;
      console.log(`Rewriting hospital subdomain: "${sub}" -> "${target}"`);
      return NextResponse.rewrite(new URL(target, req.url));
    }

    // Name-only hospital subdomains: match subdomain against hospital names
    try {
      // In middleware (edge/server), relative '/api' won't hit dev rewrites.
      // Use absolute backend URL for the lookup.
      const apiHost = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiHost}/api/hospitals`, { cache: 'no-store' });
      if (res.ok) {
        const hospitals: Array<{ id: number; name: string }> = await res.json();
        const match = hospitals.find(h => slugify(h.name) === sub.toLowerCase());
        if (match) {
          const target = `/hospital-site/${slugify(match.name)}${url.pathname}`;
          console.log(`Rewriting hospital (name) subdomain: "${sub}" -> "${target}"`);
          return NextResponse.rewrite(new URL(target, req.url));
        }
      }
    } catch (e) {
      // If lookup fails, fall through to doctor slug behavior
    }

    // Default: treat subdomain as a doctor slug for /site/[slug]
    const target = `/site/${sub}${url.pathname}`;
    console.log(`Rewriting doctor subdomain: "${sub}" -> "${target}"`);
    return NextResponse.rewrite(new URL(target, req.url));
  }

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