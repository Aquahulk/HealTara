// ============================================================================
// ✅ STAFF ASSIGNMENT APPROVAL & MANAGEMENT ROUTES
// ============================================================================
// Handles the approval workflow and active assignment management:
// - Doctor approval
// - Hospital approval  
// - Staff acceptance/rejection
// - Assignment revocation
// - Permission management
// ============================================================================

import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// ============================================================================
// ✅ DOCTOR APPROVES ASSIGNMENT REQUEST
// ============================================================================
router.post('/:requestId/doctor-approve', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const approverId = req.user!.userId;
    const approverRole = req.user!.role;

    // Verify user is a doctor
    if (approverRole !== 'DOCTOR') {
      return res.status(403).json({ 
        message: 'Only doctors can approve doctor assignments' 
      });
    }

    // Get the request
    const request = await prisma.staffAssignmentRequest.findUnique({
      where: { id: parseInt(requestId) },
      include: { staff: true, hospital: true }
    });

    if (!request) {
      return res.status(404).json({ message: 'Assignment request not found' });
    }

    // Verify this doctor is the one being assigned
    if (request.doctorId !== approverId) {
      return res.status(403).json({ 
        message: 'You can only approve assignments for yourself' 
      });
    }

    // Check if request is expired
    if (request.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Assignment request has expired' });
    }

    // Check current status
    if (!['PENDING', 'PENDING_DOCTOR_APPROVAL'].includes(request.status)) {
      return res.status(400).json({ 
        message: `Cannot approve request in ${request.status} status` 
      });
    }

    // Determine next status
    let nextStatus = 'PENDING_STAFF_ACCEPTANCE';
    if (request.hospitalId && !request.hospitalApprovedAt) {
      nextStatus = 'PENDING_HOSPITAL_APPROVAL';
    }

    // Update request
    const updatedRequest = await prisma.staffAssignmentRequest.update({
      where: { id: parseInt(requestId) },
      data: {
        doctorApprovedAt: new Date(),
        doctorApprovedBy: approverId,
        status: nextStatus,
        updatedAt: new Date()
      }
    });

    // Log the action
    await prisma.staffAssignmentAuditLog.create({
      data: {
        requestId: updatedRequest.id,
        action: 'DOCTOR_APPROVED',
        actorId: approverId,
        details: { requestId, nextStatus }
      }
    });

    // TODO: Send notification to hospital or staff

    res.json({
      message: 'Assignment request approved by doctor',
      request: updatedRequest
    });
  } catch (error: any) {
    console.error('Doctor approval error:', error);
    res.status(500).json({ 
      message: 'Failed to approve request',
      error: error.message 
    });
  }
});

// ============================================================================
// ✅ HOSPITAL APPROVES ASSIGNMENT REQUEST
// ============================================================================
router.post('/:requestId/hospital-approve', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const approverId = req.user!.userId;
    const approverRole = req.user!.role;

    // Verify user is hospital admin
    if (approverRole !== 'HOSPITAL_ADMIN') {
      return res.status(403).json({ 
        message: 'Only hospital administrators can approve hospital assignments' 
      });
    }

    // Get the request
    const request = await prisma.staffAssignmentRequest.findUnique({
      where: { id: parseInt(requestId) },
      include: { staff: true, hospital: true }
    });

    if (!request) {
      return res.status(404).json({ message: 'Assignment request not found' });
    }

    if (!request.hospitalId) {
      return res.status(400).json({ 
        message: 'This request does not require hospital approval' 
      });
    }

    // Verify hospital admin manages this hospital
    const hospital = await prisma.hospital.findFirst({
      where: {
        id: request.hospitalId,
        adminId: approverId
      }
    });

    if (!hospital) {
      return res.status(403).json({ 
        message: 'You can only approve assignments for your hospital' 
      });
    }

    // Check if request is expired
    if (request.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Assignment request has expired' });
    }

    // Check current status
    if (!['PENDING', 'PENDING_HOSPITAL_APPROVAL'].includes(request.status)) {
      return res.status(400).json({ 
        message: `Cannot approve request in ${request.status} status` 
      });
    }

    // Determine next status
    let nextStatus = 'PENDING_STAFF_ACCEPTANCE';
    if (request.doctorId && !request.doctorApprovedAt) {
      nextStatus = 'PENDING_DOCTOR_APPROVAL';
    }

    // Update request
    const updatedRequest = await prisma.staffAssignmentRequest.update({
      where: { id: parseInt(requestId) },
      data: {
        hospitalApprovedAt: new Date(),
        hospitalApprovedBy: approverId,
        status: nextStatus,
        updatedAt: new Date()
      }
    });

    // Log the action
    await prisma.staffAssignmentAuditLog.create({
      data: {
        requestId: updatedRequest.id,
        action: 'HOSPITAL_APPROVED',
        actorId: approverId,
        details: { requestId, hospitalId: request.hospitalId, nextStatus }
      }
    });

    // TODO: Send notification to doctor or staff

    res.json({
      message: 'Assignment request approved by hospital',
      request: updatedRequest
    });
  } catch (error: any) {
    console.error('Hospital approval error:', error);
    res.status(500).json({ 
      message: 'Failed to approve request',
      error: error.message 
    });
  }
});

// ============================================================================
// ✅ STAFF ACCEPTS ASSIGNMENT
// ============================================================================
router.post('/:requestId/accept', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const staffUserId = req.user!.userId;
    const { permissions } = req.body; // Optional: staff can request specific permissions

    // Get staff profile
    const staffProfile = await prisma.staffProfile.findUnique({
      where: { userId: staffUserId }
    });

    if (!staffProfile) {
      return res.status(404).json({ message: 'Staff profile not found' });
    }

    // Get the request
    const request = await prisma.staffAssignmentRequest.findUnique({
      where: { id: parseInt(requestId) }
    });

    if (!request) {
      return res.status(404).json({ message: 'Assignment request not found' });
    }

    // Verify this request is for this staff member
    if (request.staffId !== staffProfile.id) {
      return res.status(403).json({ 
        message: 'You can only accept invitations sent to you' 
      });
    }

    // Check if request is expired
    if (request.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Assignment request has expired' });
    }

    // Check current status
    if (request.status !== 'PENDING_STAFF_ACCEPTANCE') {
      return res.status(400).json({ 
        message: `Cannot accept request in ${request.status} status. Required approvals may be pending.` 
      });
    }

    // Create the active assignment
    const assignment = await prisma.staffAssignment.create({
      data: {
        requestId: request.id,
        staffId: staffProfile.id,
        doctorId: request.doctorId,
        hospitalId: request.hospitalId,
        scope: request.scope,
        status: 'ACTIVE',
        activatedAt: new Date()
      }
    });

    // Create default permissions (or use provided ones)
    const defaultPermissions = permissions || [
      { permission: 'APPOINTMENT_VIEW', granted: true },
      { permission: 'APPOINTMENT_MANAGE', granted: true },
      { permission: 'SLOT_VIEW', granted: true },
      { permission: 'SLOT_MANAGE', granted: true },
      { permission: 'WALKIN_CREATE', granted: true },
      { permission: 'TOKEN_VIEW', granted: true },
      { permission: 'TOKEN_MANAGE', granted: true },
      { permission: 'PATIENT_BASIC_INFO_VIEW', granted: true }
    ];

    await prisma.staffAssignmentPermission.createMany({
      data: defaultPermissions.map((p: any) => ({
        assignmentId: assignment.id,
        permission: p.permission,
        granted: p.granted
      }))
    });

    // Update request status
    await prisma.staffAssignmentRequest.update({
      where: { id: parseInt(requestId) },
      data: {
        staffAcceptedAt: new Date(),
        status: 'APPROVED',
        updatedAt: new Date()
      }
    });

    // Log the action
    await prisma.staffAssignmentAuditLog.create({
      data: {
        requestId: request.id,
        assignmentId: assignment.id,
        action: 'ASSIGNMENT_ACTIVATED',
        actorId: staffUserId,
        details: { 
          requestId, 
          assignmentId: assignment.id,
          scope: request.scope 
        }
      }
    });

    // Fetch complete assignment with relations
    const completeAssignment = await prisma.staffAssignment.findUnique({
      where: { id: assignment.id },
      include: {
        staff: true,
        doctor: {
          select: {
            id: true,
            email: true,
            doctorCode: true,
            doctorProfile: true
          }
        },
        hospital: {
          select: {
            id: true,
            name: true,
            hospitalCode: true
          }
        },
        permissions: true
      }
    });

    // TODO: Send notification to doctor and hospital

    res.status(201).json({
      message: 'Assignment accepted and activated',
      assignment: completeAssignment
    });
  } catch (error: any) {
    console.error('Staff acceptance error:', error);
    res.status(500).json({ 
      message: 'Failed to accept assignment',
      error: error.message 
    });
  }
});

// ============================================================================
// ❌ REJECT ASSIGNMENT REQUEST
// ============================================================================
router.post('/:requestId/reject', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const rejectorId = req.user!.userId;
    const rejectorRole = req.user!.role;
    const { reason } = req.body;

    // Get the request
    const request = await prisma.staffAssignmentRequest.findUnique({
      where: { id: parseInt(requestId) },
      include: { staff: { include: { user: true } } }
    });

    if (!request) {
      return res.status(404).json({ message: 'Assignment request not found' });
    }

    // Verify rejector has authority
    const canReject = 
      (rejectorRole === 'DOCTOR' && request.doctorId === rejectorId) ||
      (rejectorRole === 'HOSPITAL_ADMIN' && request.hospitalId) ||
      (rejectorRole === 'SLOT_ADMIN' && request.staff.userId === rejectorId);

    if (!canReject) {
      return res.status(403).json({ 
        message: 'You do not have permission to reject this request' 
      });
    }

    // Update request to rejected
    const updatedRequest = await prisma.staffAssignmentRequest.update({
      where: { id: parseInt(requestId) },
      data: {
        status: 'REJECTED',
        rejectionReason: reason || null,
        rejectionBy: rejectorId,
        rejectedAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Log the action
    await prisma.staffAssignmentAuditLog.create({
      data: {
        requestId: request.id,
        action: 'REQUEST_REJECTED',
        actorId: rejectorId,
        details: { 
          requestId, 
          rejectorRole,
          reason: reason || 'No reason provided'
        }
      }
    });

    // TODO: Send notification to relevant parties

    res.json({
      message: 'Assignment request rejected',
      request: updatedRequest
    });
  } catch (error: any) {
    console.error('Reject request error:', error);
    res.status(500).json({ 
      message: 'Failed to reject request',
      error: error.message 
    });
  }
});

// ============================================================================
// 🗑️ REVOKE ACTIVE ASSIGNMENT
// ============================================================================
router.post('/:assignmentId/revoke', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { assignmentId } = req.params;
    const revokerId = req.user!.userId;
    const revokerRole = req.user!.role;
    const { reason } = req.body;

    // Get the assignment
    const assignment = await prisma.staffAssignment.findUnique({
      where: { id: parseInt(assignmentId) },
      include: { 
        staff: { include: { user: true } },
        doctor: true,
        hospital: true
      }
    });

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (assignment.status !== 'ACTIVE') {
      return res.status(400).json({ 
        message: `Cannot revoke assignment in ${assignment.status} status` 
      });
    }

    // Verify revoker has authority
    const canRevoke = 
      (revokerRole === 'DOCTOR' && assignment.doctorId === revokerId) ||
      (revokerRole === 'HOSPITAL_ADMIN' && assignment.hospitalId) ||
      (revokerRole === 'SLOT_ADMIN' && assignment.staff.userId === revokerId) ||
      (revokerRole === 'ADMIN');

    if (!canRevoke) {
      return res.status(403).json({ 
        message: 'You do not have permission to revoke this assignment' 
      });
    }

    // Revoke the assignment
    const revokedAssignment = await prisma.staffAssignment.update({
      where: { id: parseInt(assignmentId) },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedBy: revokerId,
        revocationReason: reason || null,
        updatedAt: new Date()
      }
    });

    // Log the action
    await prisma.staffAssignmentAuditLog.create({
      data: {
        assignmentId: assignment.id,
        action: 'ASSIGNMENT_REVOKED',
        actorId: revokerId,
        details: { 
          assignmentId, 
          revokerRole,
          reason: reason || 'No reason provided'
        }
      }
    });

    // TODO: Send notification to all parties

    res.json({
      message: 'Assignment revoked successfully',
      assignment: revokedAssignment
    });
  } catch (error: any) {
    console.error('Revoke assignment error:', error);
    res.status(500).json({ 
      message: 'Failed to revoke assignment',
      error: error.message 
    });
  }
});

// ============================================================================
// 📋 GET ACTIVE ASSIGNMENTS - List all active assignments
// ============================================================================
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    let assignments: any[] = [];

    if (userRole === 'SLOT_ADMIN') {
      // Staff member: get their assignments
      const staffProfile = await prisma.staffProfile.findUnique({
        where: { userId }
      });

      if (staffProfile) {
        assignments = await prisma.staffAssignment.findMany({
          where: {
            staffId: staffProfile.id,
            status: 'ACTIVE'
          },
          include: {
            doctor: {
              select: {
                id: true,
                email: true,
                doctorCode: true,
                doctorProfile: true
              }
            },
            hospital: {
              select: {
                id: true,
                name: true,
                hospitalCode: true
              }
            },
            permissions: true
          }
        });
      }
    } else if (userRole === 'DOCTOR') {
      // Doctor: get staff assigned to them
      assignments = await prisma.staffAssignment.findMany({
        where: {
          doctorId: userId,
          status: 'ACTIVE'
        },
        include: {
          staff: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  staffCode: true
                }
              }
            }
          },
          hospital: {
            select: {
              id: true,
              name: true,
              hospitalCode: true
            }
          },
          permissions: true
        }
      });
    } else if (userRole === 'HOSPITAL_ADMIN') {
      // Hospital admin: get all staff in their hospital
      const hospital = await prisma.hospital.findFirst({
        where: { adminId: userId }
      });

      if (hospital) {
        assignments = await prisma.staffAssignment.findMany({
          where: {
            hospitalId: hospital.id,
            status: 'ACTIVE'
          },
          include: {
            staff: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    staffCode: true
                  }
                }
              }
            },
            doctor: {
              select: {
                id: true,
                email: true,
                doctorCode: true,
                doctorProfile: {
                  select: {
                    specialization: true,
                    clinicName: true
                  }
                }
              }
            },
            permissions: true
          }
        });
      }
    }

    res.json({
      count: assignments.length,
      assignments
    });
  } catch (error: any) {
    console.error('Get assignments error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch assignments',
      error: error.message 
    });
  }
});

// ============================================================================
// 📋 GET PENDING REQUESTS - List all pending assignment requests
// ============================================================================
router.get('/requests/pending', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    let requests: any[] = [];

    if (userRole === 'SLOT_ADMIN') {
      // Staff member: get requests pending their acceptance
      const staffProfile = await prisma.staffProfile.findUnique({
        where: { userId }
      });

      if (staffProfile) {
        requests = await prisma.staffAssignmentRequest.findMany({
          where: {
            staffId: staffProfile.id,
            status: { in: ['PENDING_STAFF_ACCEPTANCE', 'PENDING_DOCTOR_APPROVAL', 'PENDING_HOSPITAL_APPROVAL'] },
            expiresAt: { gte: new Date() }
          },
          include: {
            initiator: {
              select: {
                id: true,
                email: true,
                role: true,
                doctorCode: true,
                doctorProfile: {
                  select: {
                    name: true,
                    specialization: true
                  }
                }
              }
            },
            doctor: {
              select: {
                id: true,
                email: true,
                doctorCode: true,
                doctorProfile: true
              }
            },
            hospital: {
              select: {
                id: true,
                name: true,
                hospitalCode: true
              }
            }
          }
        });
      }
    } else if (userRole === 'DOCTOR') {
      // Doctor: get requests pending their approval
      requests = await prisma.staffAssignmentRequest.findMany({
        where: {
          doctorId: userId,
          status: { in: ['PENDING_DOCTOR_APPROVAL', 'PENDING_STAFF_ACCEPTANCE'] },
          expiresAt: { gte: new Date() }
        },
        include: {
          staff: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  staffCode: true
                }
              }
            }
          },
          hospital: {
            select: {
              id: true,
              name: true,
              hospitalCode: true
            }
          }
        }
      });
    } else if (userRole === 'HOSPITAL_ADMIN') {
      // Hospital admin: get all pending requests for their hospital
      const hospital = await prisma.hospital.findFirst({
        where: { adminId: userId }
      });

      if (hospital) {
        requests = await prisma.staffAssignmentRequest.findMany({
          where: {
            hospitalId: hospital.id,
            status: { in: ['PENDING_HOSPITAL_APPROVAL', 'PENDING_DOCTOR_APPROVAL', 'PENDING_STAFF_ACCEPTANCE'] },
            expiresAt: { gte: new Date() }
          },
          include: {
            staff: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    staffCode: true
                  }
                }
              }
            },
            doctor: {
              select: {
                id: true,
                email: true,
                doctorCode: true,
                doctorProfile: {
                  select: {
                    specialization: true,
                    clinicName: true
                  }
                }
              }
            }
          }
        });
      }
    }

    res.json({
      count: requests.length,
      requests
    });
  } catch (error: any) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch pending requests',
      error: error.message 
    });
  }
});

export default router;
