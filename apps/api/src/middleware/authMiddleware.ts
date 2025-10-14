// ============================================================================
// 🔐 AUTHENTICATION MIDDLEWARE - JWT Token Verification
// ============================================================================
// This middleware runs before protected routes to verify user authentication
// It extracts JWT tokens from request headers and validates them
// If valid, it adds user information to req.user for use in route handlers
// 
// IMPORTANT: This is the security layer that protects all private endpoints
// ============================================================================

// ============================================================================
// 📦 EXTERNAL DEPENDENCIES - What we're importing and why
// ============================================================================
import { Request, Response, NextFunction } from 'express';   // Express types for middleware
import jwt from 'jsonwebtoken';                             // JWT library for token verification
import { Prisma } from '@prisma/client';                    // Prisma error types for granular handling
import { prisma } from '../db';              // Shared Prisma client with SSL enforced

// Prisma client comes from the shared db singleton

// ============================================================================
// 🔐 AUTHENTICATION MIDDLEWARE FUNCTION - Main security function
// ============================================================================
// This function is called before every protected route
// It checks if the user has a valid JWT token and is still in the database
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // ============================================================================
    // 📨 TOKEN EXTRACTION - Get JWT token from Authorization header
    // ============================================================================
    // Expected format: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        message: 'Authorization token is required. Format: Bearer <token>' 
      });
    }
    
    // ============================================================================
    // 🎫 TOKEN EXTRACTION - Remove "Bearer " prefix to get just the token
    // ============================================================================
    const token = authHeader.substring(7);                   // Remove "Bearer " (7 characters)
    
    if (!token) {
      return res.status(401).json({ message: 'Token is missing' });
    }
    
    // ============================================================================
    // 🔍 JWT VERIFICATION - Decode and verify the JWT token
    // ============================================================================
    // This will throw an error if the token is invalid, expired, or tampered with
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: number;
      email: string;
      role: string;
    };
    
    // ============================================================================
    // 🗄️ USER VERIFICATION - Check if user still exists in database
    // ============================================================================
    // This prevents issues if a user was deleted after getting a token
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true }
    });
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    // ============================================================================
    // 🚫 ACCOUNT STATUS CHECK - Ensure user account is active
    // ============================================================================
    // User is active by default (no isActive field in schema)
    
    // ============================================================================
    // ✅ AUTHENTICATION SUCCESS - Add user data to request object
    // ============================================================================
    // This makes user information available to all route handlers
    // Route handlers can now access: req.user.id, req.user.email, req.user.role
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role as 'PATIENT' | 'DOCTOR' | 'ADMIN' | 'HOSPITAL_ADMIN' | 'SLOT_ADMIN'
    };
    
    // ============================================================================
    // ➡️ CONTINUE TO ROUTE - Pass control to the actual route handler
    // ============================================================================
    next();
    
  } catch (error) {
    // ============================================================================
    // ❌ ERROR HANDLING - Handle various authentication failures
    // ============================================================================
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Token has expired' });
    }

    // Database connectivity issues (e.g., Neon unreachable) should return 503 to avoid confusing auth failures
    const errAny = error as any;
    const isDbUnavailable =
      (typeof errAny?.code === 'string' && errAny.code === 'P1001') ||
      error instanceof (Prisma as any).PrismaClientInitializationError ||
      error instanceof (Prisma as any).PrismaClientRustPanicError;
    if (isDbUnavailable) {
      console.error('Database connectivity error during authentication:', error);
      return res.status(503).json({ message: 'Database unavailable. Please check DATABASE_URL and connectivity.' });
    }
    
    // ============================================================================
    // 🐛 UNEXPECTED ERRORS - Log and return generic error for security
    // ============================================================================
    console.error('Authentication middleware error:', error);
    return res.status(500).json({ message: 'Authentication failed' });
  }
};