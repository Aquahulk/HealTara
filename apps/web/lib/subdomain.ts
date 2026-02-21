"use client";

// Utilities to build name-only subdomain URLs for microsites
// Hospital: https://<slugified-hospital-name>.<PRIMARY_DOMAIN>[:port]/
// Doctor:   https://<doctor-slug>.<PRIMARY_DOMAIN>[:port]/

export function slugifyName(input: string): string {
  const s = (input || "").toLowerCase().trim();
  // Handle spaces and special characters properly
  return s
    .replace(/[^\w\s-]/g, '') // Keep alphanumeric, spaces, and hyphens
    .replace(/\s+/g, '-') // Replace spaces with single hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

function getPrimaryDomain(): string {
  const envDomain = process.env.NEXT_PUBLIC_PRIMARY_DOMAIN;
  if (envDomain && envDomain.trim().length > 0) return envDomain.trim();
  if (typeof window !== "undefined") {
    const host = window.location.hostname; // may include subdomain
    const parts = host.split(".");
    // If there are 3+ parts (e.g., hospital-birla.lvh.me), drop the first
    if (parts.length >= 3) return parts.slice(1).join(".");
    // For localhost subdomains (e.g., hospital1.localhost), return localhost
    if (host.endsWith('.localhost')) return 'localhost';
    // On localhost, avoid lvh.me to prevent extension blocks; use localhost
    if (host === "localhost" || host === "127.0.0.1") return "localhost";
    return host; // localhost or bare domain
  }
  // Fallback for SSR
  return "lvh.me";
}

function getAuthTokenForNav(): string | null {
  try {
    if (typeof document !== 'undefined') {
      const cookies = document.cookie ? document.cookie.split('; ') : [];
      for (const c of cookies) {
        const [k, ...v] = c.split('=');
        if (k === 'authToken') return decodeURIComponent(v.join('='));
      }
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      const ls = window.localStorage.getItem('authToken');
      if (ls) return ls;
    }
  } catch {}
  return null;
}

function buildUrl(subdomain: string): string {
  const protocol = typeof window !== "undefined" ? window.location.protocol : "http:";
  const port = typeof window !== "undefined" && window.location.port ? `:${window.location.port}` : "";
  const root = getPrimaryDomain();
  const base = `${protocol}//${subdomain}.${root}${port}/`;
  const token = getAuthTokenForNav();
  if (token) return `${base}#authToken=${encodeURIComponent(token)}`;
  return base;
}

export function hospitalMicrositeUrl(nameOrSlug: string): string {
  const slug = slugifyName(nameOrSlug);
  return buildUrl(slug);
}

export function doctorMicrositeUrl(slug: string): string {
  const s = (slug || "").toLowerCase();
  return buildUrl(s);
}

// Fallback for legacy pattern when only hospital ID is known
export function hospitalIdMicrositeUrl(id: string | number): string {
  return buildUrl(`hospital-${String(id)}`);
}

// Use an explicitly assigned custom domain or subdomain
export function customSubdomainUrl(sub: string): string {
  const s = (sub || '').toLowerCase().trim();
  if (!s) return '';
  
  // Check if it's a custom domain (contains dots)
  if (s.includes('.')) {
    // Custom domain - use as-is
    return buildUrl(s);
  } else {
    // Subdomain - use as-is
    return buildUrl(s);
  }
}

// Determine whether to navigate via subdomain microsites.
  // Note: Enable on localhost for testing custom domains and subdomains
export function shouldUseSubdomainNav(): boolean {
  const enabled = (process.env.NEXT_PUBLIC_ENABLE_SUBDOMAIN_ROUTING ?? 'true') !== 'false';
  if (!enabled) return false;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    // Allow localhost testing for subdomain routing
    if (host === 'localhost' || host === '127.0.0.1') {
      console.log('🧪 Subdomain routing enabled on localhost for testing');
      return true;
    }
    if (host === 'lvh.me') return false;
  }
  return true;
}
