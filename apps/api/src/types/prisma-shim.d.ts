declare module '@prisma/client' {
  // Minimal type shim to allow TypeScript compilation when Prisma client
  // hasn’t been generated yet. Runtime will use the real PrismaClient.
  export class PrismaClient {
    // Allow any properties for dynamic model access (e.g., adminAuditLog)
    [key: string]: any;
    $transaction<T>(fn: (tx: any) => Promise<T>): Promise<T>;
  }
}