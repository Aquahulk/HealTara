"use client";

// Utilities to build name-only subdomain URLs for microsites
// Hospital: https://<slugified-hospital-name>.<PRIMARY_DOMAIN>[:port]/
// Doctor:   https://<doctor-slug>.<PRIMARY_DOMAIN>[:port]/

export function slugifyName(input: string): string {
  const s = (input || "").toLowerCase().trim();
  return s
    .replace(/[^a-z0-9\s-]/g, "") // remove non-alphanumerics
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function getPrimaryDomain(): string {
  const envDomain = process.env.NEXT_PUBLIC_PRIMARY_DOMAIN;
  if (envDomain && envDomain.trim().length > 0) return envDomain.trim();
  if (typeof window !== "undefined") {
    const host = window.location.hostname; // may include subdomain
    const parts = host.split(".");
    // If there are 3+ parts (e.g., hospital-birla.lvh.me), drop the first
    if (parts.length >= 3) return parts.slice(1).join(".");
    // On localhost, avoid lvh.me to prevent extension blocks; use localhost
    if (host === "localhost" || host === "127.0.0.1") return "localhost";
    return host; // localhost or bare domain
  }
  // Fallback for SSR
  return "lvh.me";
}

function buildUrl(subdomain: string): string {
  const protocol = typeof window !== "undefined" ? window.location.protocol : "http:";
  const port = typeof window !== "undefined" && window.location.port ? `:${window.location.port}` : "";
  const root = getPrimaryDomain();
  return `${protocol}//${subdomain}.${root}${port}/`;
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

// Determine whether to navigate via subdomain microsites.
// Disabled on localhost to avoid lvh.me redirects being blocked by wallet extensions.
export function shouldUseSubdomainNav(): boolean {
  const enabled = (process.env.NEXT_PUBLIC_ENABLE_SUBDOMAIN_ROUTING ?? 'true') !== 'false';
  if (!enabled) return false;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') return false;
  }
  return true;
}