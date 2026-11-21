// ============================================================================
// 🔐 STAFF PERMISSION MIDDLEWARE - Check if staff has permission for action
// ============================================================================
// This middleware verifies that a staff member has the required permission
// to perform an action on behalf of a doctor or hospital
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';

/**
 * Check if staff member has a specific permission for a doctor/hospital
 */
export async function checkStaffPermission(
  staffUserId: number,
  doctorId: number | null,
  hospitalId: number | null,
  requiredPermission: string
): Promise<boolean> {
  try {
    // Get staff profile
    const staffProfile = await prisma.staffProfile.findUnique({
      where: { userId: staffUserId }
    });

    if (!staffProfile) {
      return false;
    }

    // Find active assignment that matches
    const assignment = await prisma.staffAssignment.findFirst({
      where: {
        staffId: staffProfile.id,
        status: 'ACTIVE',
        OR: [
          // Exact match
          {
            doctorId: doctorId,
            hospitalId: hospitalId
          },
          // Doctor scope (matches any hospital)
          {
            doctorId: doctorId,
            scope: 'DOCTOR'
          },
          // Hospital scope
          {
            hospitalId: hospitalId,
            scope: 'HOSPITAL'
          }
        ]
      },
      include: {
        permissions: true
      }
    });

    if (!assignment) {
      return false;
    }

    // Check if permission is granted
    const hasPermission = assignment.permissions.some(
      (p: { permission: string; granted: boolean }) => p.permission === requiredPermission && p.granted === true
    );

    return hasPermission;
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
}

/**
 * Middleware factory: Create middleware that checks for specific permission
 * Usage: router.get('/endpoint', authMiddleware, requireStaffPermission('APPOINTMENT_VIEW'), handler)
 */
export function requireStaffPermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      const role = req.user?.role;

      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // If not staff, check if they're the doctor/hospital admin themselves
      if (role !== 'SLOT_ADMIN') {
        // Doctors and hospital admins have implicit permission for their own resources
        return next();
      }

      // For staff, check permissions
      const doctorId = req.body.doctorId || req.query.doctorId || req.params.doctorId;
      const hospitalId = req.body.hospitalId || req.query.hospitalId || req.params.hospitalId;

      const hasPermission = await checkStaffPermission(
        userId,
        doctorId ? parseInt(doctorId as string) : null,
        hospitalId ? parseInt(hospitalId as string) : null,
        permission
      );

      if (!hasPermission) {
        return res.status(403).json({ 
          message: `Permission denied: ${permission} is required for this action`
        });
      }

      next();
    } catch (error: any) {
      console.error('Permission middleware error:', error);
      return res.status(500).json({ 
        message: 'Failed to check permissions',
        error: error.message 
      });
    }
  };
}

/**
 * Get all permissions for a staff member's assignment
 */
export async function getStaffPermissions(
  staffUserId: number,
  doctorId: number | null,
  hospitalId: number | null
): Promise<{ permission: string; granted: boolean }[]> {
  try {
    const staffProfile = await prisma.staffProfile.findUnique({
      where: { userId: staffUserId }
    });

    if (!staffProfile) {
      return [];
    }

    const assignment = await prisma.staffAssignment.findFirst({
      where: {
        staffId: staffProfile.id,
        status: 'ACTIVE',
        OR: [
          { doctorId: doctorId, hospitalId: hospitalId },
          { doctorId: doctorId, scope: 'DOCTOR' },
          { hospitalId: hospitalId, scope: 'HOSPITAL' }
        ]
      },
      include: {
        permissions: true
      }
    });

    return assignment?.permissions.map((p: { permission: string; granted: boolean }) => ({
      permission: p.permission,
      granted: p.granted
    })) || [];
  } catch (error) {
    console.error('Get permissions error:', error);
    return [];
  }
}

/**
 * Available permission types
 */
export const PERMISSIONS = {
  // Appointment permissions
  APPOINTMENT_VIEW: 'APPOINTMENT_VIEW',
  APPOINTMENT_MANAGE: 'APPOINTMENT_MANAGE',
  APPOINTMENT_CANCEL: 'APPOINTMENT_CANCEL',
  
  // Slot permissions
  SLOT_VIEW: 'SLOT_VIEW',
  SLOT_MANAGE: 'SLOT_MANAGE',
  SLOT_PERIOD_UPDATE: 'SLOT_PERIOD_UPDATE',
  
  // Walk-in permissions
  WALKIN_CREATE: 'WALKIN_CREATE',
  WALKIN_MANAGE: 'WALKIN_MANAGE',
  
  // Token queue permissions
  TOKEN_VIEW: 'TOKEN_VIEW',
  TOKEN_MANAGE: 'TOKEN_MANAGE',
  
  // Patient info permissions
  PATIENT_BASIC_INFO_VIEW: 'PATIENT_BASIC_INFO_VIEW',
  
  // Working hours permissions
  WORKING_HOURS_VIEW: 'WORKING_HOURS_VIEW',
  WORKING_HOURS_UPDATE: 'WORKING_HOURS_UPDATE',
  
  // Statistics permissions
  STATS_VIEW: 'STATS_VIEW'
} as const;
