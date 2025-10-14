import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

// Ensure SSL for hosted Postgres providers (e.g., Neon) and set sane pool defaults
const normalizeDbUrl = (url?: string): string | undefined => {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    // Force SSL where supported
    if (!u.searchParams.has('sslmode')) {
      u.searchParams.set('sslmode', 'require');
    }
    // Increase connection limit to mitigate pool starvation in dev
    if (!u.searchParams.has('connection_limit')) {
      u.searchParams.set('connection_limit', '5');
    }
    // Extend pool timeout to reduce transient timeouts under parallel loads
    if (!u.searchParams.has('pool_timeout')) {
      u.searchParams.set('pool_timeout', '30');
    }
    return u.toString();
  } catch {
    return url;
  }
};

const rawDbUrl = process.env.DATABASE_URL;
const normalizedUrl = normalizeDbUrl(rawDbUrl);
if (normalizedUrl && normalizedUrl !== rawDbUrl) {
  process.env.DATABASE_URL = normalizedUrl;
}

// Export a singleton Prisma client
export const prisma = new PrismaClient();