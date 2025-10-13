import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

// Ensure SSL for hosted Postgres providers (e.g., Neon)
const ensureSsl = (url?: string): string | undefined => {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    if (!u.searchParams.has('sslmode')) {
      u.searchParams.set('sslmode', 'require');
    }
    return u.toString();
  } catch {
    return url;
  }
};

const rawDbUrl = process.env.DATABASE_URL;
const secureUrl = ensureSsl(rawDbUrl);
if (secureUrl && secureUrl !== rawDbUrl) {
  process.env.DATABASE_URL = secureUrl;
}

// Export a singleton Prisma client
export const prisma = new PrismaClient();