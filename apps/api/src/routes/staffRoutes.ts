// ============================================================================
// 👥 STAFF MANAGEMENT ROUTES - Slot Administrator System
// ============================================================================
// This module handles all staff-related operations including:
// - Staff registration and profile management
// - Assignment requests and approval workflows
// - Permission management
// - Staff dashboard operations
// ============================================================================

import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authMiddleware } from '../middleware/authMiddleware';
import { generateStaffCode } from '../utils/idGenerator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();

// ============================================================================
// 📝 STAFF REGISTRATION - Allow staff to create accounts
// ============================================================================
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, phone } = req.body;

    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({ 
        message: 'Email, password, and name are required' 
      });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: 'Email already registered' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate staff code
    const staffCode = await generateStaffCode();

    // Create user account with SLOT_ADMIN role
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'SLOT_ADMIN',
        staffCode,
        status: 'ACTIVE',
        canLogin: true
      }
    });

    // Create staff profile
    const staffProfile = await prisma.staffProfile.create({
      data: {
        userId: user.id,
        staffCode,
        name,
        phone: phone || null,
        status: 'ACTIVE'
      }
    });

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Staff account created successfully',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        staffCode: user.staffCode
      },
      profile: {
        id: staffProfile.id,
        name: staffProfile.name,
        phone: staffProfile.phone,
        staffCode: staffProfile.staffCode
      },
      token
    });
  } catch (error: any) {
    console.error('Staff registration error:', error);
    res.status(500).json({ 
      message: 'Failed to create staff account',
      error: error.message 
    });
  }
});

// ============================================================================
// 👤 GET STAFF PROFILE - View own profile
// ============================================================================
router.get('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const staffProfile = await prisma.staffProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            staffCode: true,
            status: true,
            createdAt: true
          }
        }
      }
    });

    if (!staffProfile) {
      return res.status(404).json({ 
        message: 'Staff profile not found' 
      });
    }

    res.json({ profile: staffProfile });
  } catch (error: any) {
    console.error('Get staff profile error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch staff profile',
      error: error.message 
    });
  }
});

// ============================================================================
// ✏️ UPDATE STAFF PROFILE - Update own profile
// ============================================================================
router.patch('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { name, phone } = req.body;

    const updatedProfile = await prisma.staffProfile.update({
      where: { userId },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        updatedAt: new Date()
      }
    });

    res.json({ 
      message: 'Profile updated successfully',
      profile: updatedProfile 
    });
  } catch (error: any) {
    console.error('Update staff profile error:', error);
    res.status(500).json({ 
      message: 'Failed to update profile',
      error: error.message 
    });
  }
});

// ============================================================================
// 📊 STAFF DASHBOARD - Get staff member's dashboard data
// ============================================================================
router.get('/dashboard', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    // Verify user is a staff member
    if (userRole !== 'SLOT_ADMIN') {
      return res.status(403).json({ 
        message: 'Only staff members can access this dashboard' 
      });
    }

    // Get staff profile
    const staffProfile = await prisma.staffProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        staffCode: true,
        name: true,
        phone: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });

    if (!staffProfile) {
      return res.status(404).json({ 
        message: 'Staff profile not found' 
      });
    }

    // Get active assignments
    const activeAssignments = await prisma.staffAssignment.findMany({
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
            doctorProfile: {
              select: {
                specialization: true,
                clinicName: true,
                city: true
              }
            }
          }
        },
        hospital: {
          select: {
            id: true,
            name: true,
            hospitalCode: true,
            city: true
          }
        },
        permissions: true
      }
    });

    // Get pending invitations
    const pendingInvitations = await prisma.staffAssignmentRequest.findMany({
      where: {
        staffId: staffProfile.id,
        status: { in: ['PENDING_STAFF_ACCEPTANCE', 'PENDING_DOCTOR_APPROVAL', 'PENDING_HOSPITAL_APPROVAL'] },
        expiresAt: { gte: new Date() }
      },
      include: {
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
        hospital: {
          select: {
            id: true,
            name: true,
            hospitalCode: true
          }
        }
      }
    });

    res.json({
      profile: staffProfile,
      activeAssignments: {
        count: activeAssignments.length,
        assignments: activeAssignments
      },
      pendingInvitations: {
        count: pendingInvitations.length,
        invitations: pendingInvitations
      }
    });
  } catch (error: any) {
    console.error('Staff dashboard error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch dashboard data',
      error: error.message 
    });
  }
});

// ============================================================================
// 🔍 SEARCH STAFF - Search for staff by code or name
// ============================================================================
router.get('/search', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ 
        message: 'Search query is required' 
      });
    }

    const searchTerm = query.trim();

    // Search by staff code or name
    const staffProfiles = await prisma.staffProfile.findMany({
      where: {
        OR: [
          { staffCode: { contains: searchTerm, mode: 'insensitive' } },
          { name: { contains: searchTerm, mode: 'insensitive' } }
        ],
        status: 'ACTIVE'
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            staffCode: true,
            status: true
          }
        }
      },
      take: 10
    });

    res.json({ 
      results: staffProfiles,
      count: staffProfiles.length 
    });
  } catch (error: any) {
    console.error('Search staff error:', error);
    res.status(500).json({ 
      message: 'Failed to search staff',
      error: error.message 
    });
  }
});

// ============================================================================
// 📋 GET STAFF BY CODE - Get specific staff member by their code
// ============================================================================
router.get('/code/:staffCode', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { staffCode } = req.params;

    const staffProfile = await prisma.staffProfile.findUnique({
      where: { staffCode },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            staffCode: true,
            status: true,
            createdAt: true
          }
        }
      }
    });

    if (!staffProfile) {
      return res.status(404).json({ 
        message: 'Staff member not found' 
      });
    }

    res.json({ staff: staffProfile });
  } catch (error: any) {
    console.error('Get staff by code error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch staff member',
      error: error.message 
    });
  }
});

// ============================================================================
// 📊 GET STAFF DASHBOARD - Overview of assignments and invitations
// ============================================================================
router.get('/dashboard', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Get staff profile
    const staffProfile = await prisma.staffProfile.findUnique({
      where: { userId }
    });

    if (!staffProfile) {
      return res.status(404).json({ 
        message: 'Staff profile not found' 
      });
    }

    // Get active assignments
    const activeAssignments = await prisma.staffAssignment.findMany({
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
            doctorProfile: {
              select: {
                specialization: true,
                clinicName: true,
                city: true
              }
            }
          }
        },
        hospital: {
          select: {
            id: true,
            name: true,
            hospitalCode: true,
            city: true
          }
        },
        permissions: true
      }
    });

    // Get pending invitations
    const pendingInvitations = await prisma.staffAssignmentRequest.findMany({
      where: {
        staffId: staffProfile.id,
        status: {
          in: ['PENDING_STAFF_ACCEPTANCE', 'PENDING']
        },
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
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
        hospital: {
          select: {
            id: true,
            name: true,
            hospitalCode: true
          }
        },
        initiator: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      }
    });

    res.json({
      profile: staffProfile,
      activeAssignments: {
        count: activeAssignments.length,
        assignments: activeAssignments
      },
      pendingInvitations: {
        count: pendingInvitations.length,
        invitations: pendingInvitations
      }
    });
  } catch (error: any) {
    console.error('Get staff dashboard error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch dashboard',
      error: error.message 
    });
  }
});

// ============================================================================
// 📝 CREATE ASSIGNMENT REQUEST - Doctor or Hospital initiates assignment
// ============================================================================
router.post('/assignments/request', authMiddleware, async (req: Request, res: Response) => {
  try {
    const initiatorUserId = req.user!.userId;
    const initiatorRole = req.user!.role;
    let { staffCode, doctorId, hospitalId, scope, permissions } = req.body;

    console.log('📩 Assignment request received:', {
      initiatorUserId,
      initiatorRole,
      staffCode,
      doctorId,
      hospitalId,
      scope,
      doctorIdType: typeof doctorId,
      doctorIdValue: doctorId
    });

    // Auto-fill doctorId if scope is DOCTOR and initiator is DOCTOR but doctorId is missing
    if (scope === 'DOCTOR' && initiatorRole === 'DOCTOR' && !doctorId) {
      console.log('Auto-filling doctorId with initiatorUserId:', initiatorUserId);
      doctorId = initiatorUserId;
    }

    // Validate required fields
    if (!staffCode || !scope) {
      return res.status(400).json({ 
        message: 'Staff code and scope are required' 
      });
    }

    // Validate scope
    if (!['DOCTOR', 'HOSPITAL', 'DOCTOR_HOSPITAL'].includes(scope)) {
      return res.status(400).json({ 
        message: 'Invalid scope. Must be DOCTOR, HOSPITAL, or DOCTOR_HOSPITAL' 
      });
    }

    // Validate scope-specific requirements
    if (scope === 'DOCTOR' && !doctorId) {
      return res.status(400).json({ 
        message: 'Doctor ID is required for DOCTOR scope' 
      });
    }

    if (scope === 'HOSPITAL' && !hospitalId) {
      return res.status(400).json({ 
        message: 'Hospital ID is required for HOSPITAL scope' 
      });
    }

    if (scope === 'DOCTOR_HOSPITAL' && (!doctorId || !hospitalId)) {
      return res.status(400).json({ 
        message: 'Both Doctor ID and Hospital ID are required for DOCTOR_HOSPITAL scope' 
      });
    }

    // Find staff profile
    const staffProfile = await prisma.staffProfile.findUnique({
      where: { staffCode }
    });

    if (!staffProfile) {
      return res.status(404).json({ 
        message: 'Staff member not found' 
      });
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.staffAssignment.findFirst({
      where: {
        staffId: staffProfile.id,
        doctorId: doctorId || null,
        hospitalId: hospitalId || null,
        scope,
        status: 'ACTIVE'
      }
    });

    if (existingAssignment) {
      return res.status(400).json({ 
        message: 'An active assignment already exists for this combination' 
      });
    }

    // Determine initial status based on initiator role
    let initialStatus = 'PENDING';
    if (initiatorRole === 'DOCTOR' && doctorId && scope !== 'HOSPITAL') {
      initialStatus = hospitalId ? 'PENDING_HOSPITAL_APPROVAL' : 'PENDING_STAFF_ACCEPTANCE';
    } else if (initiatorRole === 'HOSPITAL_ADMIN' && hospitalId) {
      initialStatus = doctorId ? 'PENDING_DOCTOR_APPROVAL' : 'PENDING_STAFF_ACCEPTANCE';
    }

    // Create assignment request
    const request = await prisma.staffAssignmentRequest.create({
      data: {
        staffId: staffProfile.id,
        doctorId: doctorId || null,
        hospitalId: hospitalId || null,
        scope,
        initiatedBy: initiatorUserId,
        status: initialStatus,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        ...(initiatorRole === 'DOCTOR' && doctorId && {
          doctorApprovedAt: new Date(),
          doctorApprovedBy: initiatorUserId
        }),
        ...(initiatorRole === 'HOSPITAL_ADMIN' && hospitalId && {
          hospitalApprovedAt: new Date(),
          hospitalApprovedBy: initiatorUserId
        })
      },
      include: {
        staff: true,
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
        hospital: {
          select: {
            id: true,
            name: true,
            hospitalCode: true
          }
        }
      }
    });

    // Log the action
    await prisma.staffAssignmentAuditLog.create({
      data: {
        requestId: request.id,
        action: 'REQUEST_CREATED',
        actorId: initiatorUserId,
        details: {
          staffCode,
          doctorId,
          hospitalId,
          scope,
          initiatorRole
        }
      }
    });

    // TODO: Send real-time notification to relevant parties

    res.status(201).json({
      message: 'Assignment request created successfully',
      request
    });
  } catch (error: any) {
    console.error('Create assignment request error:', error);
    res.status(500).json({ 
      message: 'Failed to create assignment request',
      error: error.message 
    });
  }
});

export default router;
