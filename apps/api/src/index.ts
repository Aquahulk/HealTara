// ============================================================================
// 🏥 DOCPROC API SERVER - MAIN ENTRY POINT
// ============================================================================
// This file contains all the API endpoints for the healthcare appointment system
// It handles user authentication, doctor profiles, appointments, and admin functions
// 
// IMPORTANT: This is the core backend that powers the entire DocProc application
// ============================================================================

// ============================================================================
// 📦 EXTERNAL DEPENDENCIES - What we're importing and why
// ============================================================================
import express, { Request, Response, NextFunction } from 'express';  // Web framework for building APIs
import { PrismaClient } from '@prisma/client';                      // Database ORM for easy database operations
import bcrypt from 'bcryptjs';                                      // Password hashing for security
import jwt from 'jsonwebtoken';                                     // JWT tokens for user authentication
import cors from 'cors';                                            // Allows frontend to communicate with API
import { authMiddleware } from './middleware/authMiddleware';        // Custom middleware to verify user tokens

// ============================================================================
// 🔐 TYPE DEFINITIONS - Extending Express Request to include user data
// ============================================================================
// This tells TypeScript that after authentication, req.user will contain user info
// This is added by our authMiddleware when a valid JWT token is provided
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;                                    // Unique user ID from database
        email: string;                                     // User's email address
        role: 'PATIENT' | 'DOCTOR' | 'ADMIN' | 'HOSPITAL_ADMIN' | 'SLOT_ADMIN';             // User's role in the system
      };
    }
  }
}

// ============================================================================
// 🚀 SERVER INITIALIZATION - Setting up the Express server
// ============================================================================
const prisma = new PrismaClient();                        // Create database connection
const app = express();                                     // Create Express application
const port = process.env.PORT || 3001;                    // Use environment port or default to 3001

// ============================================================================
// ⚙️ MIDDLEWARE SETUP - Functions that run before your routes
// ============================================================================
app.use(cors());                                           // Allow cross-origin requests (frontend ↔ backend)
app.use(express.json());                                   // Parse JSON request bodies

// IST timezone helpers
const IST_OFFSET = '+05:30';
const toISTMidnight = (dateOnly: string) => new Date(`${dateOnly}T00:00:00${IST_OFFSET}`);
const toISTDateTime = (dateOnly: string, timeHM: string) => new Date(`${dateOnly}T${timeHM}:00${IST_OFFSET}`);

// Doctor slot period persistence via Prisma DoctorProfile (minutes). Default: 15.

// Doctor Slot Period endpoints
app.get('/api/doctor/slot-period', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role !== 'DOCTOR') {
    return res.status(403).json({ message: 'Only doctors can read slot period.' });
  }
  try {
    const profile = await prisma.doctorProfile.findUnique({ where: { userId: user.userId } });
    const minutes = profile?.slotPeriodMinutes ?? 15;
    res.json({ slotPeriodMinutes: minutes });
  } catch (error) {
    console.error('[slot-period:get] error', error);
    res.status(500).json({ message: 'Failed to read slot period.' });
  }
});

app.put('/api/doctor/slot-period', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role !== 'DOCTOR') {
    return res.status(403).json({ message: 'Only doctors can update slot period.' });
  }
  const { slotPeriodMinutes } = req.body as { slotPeriodMinutes?: number };
  const allowed = [10, 15, 20, 30, 60];
  const minutes = Number(slotPeriodMinutes);
  if (!allowed.includes(minutes)) {
    return res.status(400).json({ message: 'Invalid slot period. Allowed: 10, 15, 20, 30, 60.' });
  }
  try {
    const profile = await prisma.doctorProfile.findUnique({ where: { userId: user.userId } });
    if (!profile) {
      return res.status(400).json({ message: 'Doctor profile not found. Please create a profile first.' });
    }
    const updated = await prisma.doctorProfile.update({ where: { userId: user.userId }, data: { slotPeriodMinutes: minutes } });
    console.info('[slot-period] set', { doctorId: user.userId, minutes });
    res.json({ slotPeriodMinutes: updated.slotPeriodMinutes });
  } catch (error) {
    console.error('[slot-period:put] error', error);
    res.status(500).json({ message: 'Failed to update slot period.' });
  }
});

// ============================================================================
// 👤 USER REGISTRATION ENDPOINT - Creates new user accounts
// ============================================================================
// Route: POST /api/register
// Purpose: Allows new users to create accounts (patients, doctors, admins)
// Security: No authentication required (public endpoint)
app.post('/api/register', async (req: Request, res: Response) => {
  const { email, password, role } = req.body;              // Extract data from request body
  
  // ============================================================================
  // ✅ INPUT VALIDATION - Check if required fields are provided
  // ============================================================================
  if (!email || !password || !role) {
    return res.status(400).json({ message: 'Email, password, and role are required' });
  }
  
  try {
    // ============================================================================
    // 🔍 DUPLICATE CHECK - Ensure email isn't already registered
    // ============================================================================
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // ============================================================================
    // 🔐 PASSWORD SECURITY - Hash password before storing in database
    // ============================================================================
    const hashedPassword = await bcrypt.hash(password, 10);  // 10 = salt rounds (higher = more secure)
    
    // ============================================================================
    // 💾 DATABASE CREATION - Save new user to database
    // ============================================================================
    const newUser = await prisma.user.create({
      data: { email, password: hashedPassword, role },
    });
    
    // ============================================================================
    // ✅ SUCCESS RESPONSE - Return user data (without password)
    // ============================================================================
    res.status(201).json({ 
        message: 'User created successfully',
        user: { id: newUser.id, email: newUser.email, role: newUser.role } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while creating the user' });
  }
});

// ============================================================================
// 🔑 USER LOGIN ENDPOINT - Authenticates users and provides JWT tokens
// ============================================================================
// Route: POST /api/login
// Purpose: Verifies user credentials and returns authentication token
// Security: No authentication required (public endpoint)
app.post('/api/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;                    // Extract login credentials
  
  // ============================================================================
  // ✅ INPUT VALIDATION - Check if credentials are provided
  // ============================================================================
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  
  try {
    // ============================================================================
    // 🔍 USER LOOKUP - Find user in database by email
    // ============================================================================
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    // Prevent login for booking-only accounts
    if (user.canLogin === false) {
      return res.status(403).json({ message: 'Login disabled for this account. Contact hospital admin.' });
    }
    
    // ============================================================================
    // 🔐 PASSWORD VERIFICATION - Compare input password with stored hash
    // ============================================================================
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // ============================================================================
    // 🎫 JWT TOKEN GENERATION - Create secure authentication token
    // ============================================================================
    // JWT contains: user ID, email, role, and expiration time
    // This token will be used for all future authenticated requests
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,                              // Secret key from environment variables
      { expiresIn: '24h' }                                 // Token expires in 24 hours
    );
    
    res.status(200).json({ message: 'Login successful', token: token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred during login' });
  }
});

// ============================================================================
// 👨‍⚕️ CREATE DOCTOR PROFILE ENDPOINT - Allows doctors to set up their profiles
// ============================================================================
// Route: POST /api/doctor/profile
// Purpose: Doctors create professional profiles with clinic information
// Security: Requires authentication + DOCTOR role
app.post('/api/doctor/profile', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;                                  // User data from authMiddleware
  
  // ============================================================================
  // 🚫 ROLE VERIFICATION - Ensure only doctors can create profiles
  // ============================================================================
  if (user.role !== 'DOCTOR') {
    return res.status(403).json({ message: 'Forbidden: Only users with DOCTOR role can create a profile.' });
  }
  
  // ============================================================================
  // 📝 PROFILE DATA EXTRACTION - Get all profile information from request
  // ============================================================================
  const { specialization, qualifications, experience, clinicName, clinicAddress, city, state, phone, consultationFee, slug } = req.body;
  
  // ============================================================================
  // ✅ REQUIRED FIELD VALIDATION - Check if essential fields are provided
  // ============================================================================
  if (!specialization || !clinicAddress || !phone || !consultationFee) {
    return res.status(400).json({ message: 'Required profile fields are missing.' });
  }
  
  try {
    // ============================================================================
    // 🔍 EXISTING PROFILE CHECK - Prevent duplicate profiles for same doctor
    // ============================================================================
    const existingProfile = await prisma.doctorProfile.findUnique({
      where: { userId: user.userId },
    });
    if (existingProfile) {
      return res.status(409).json({ message: 'Profile for this doctor already exists.' });
    }
    
    // ============================================================================
    // 💾 PROFILE CREATION - Save doctor profile to database
    // ============================================================================
    // Generate a URL-safe slug if none provided
    const baseSlug = (slug || `${clinicName || specialization || 'doctor'}-${user.userId}`)
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/--+/g, '-');

    // Ensure uniqueness by appending a short random suffix on conflict (up to 3 attempts)
    let finalSlug = baseSlug;
    for (let attempt = 0; attempt < 3; attempt++) {
      const exists = await prisma.doctorProfile.findUnique({ where: { slug: finalSlug } });
      if (!exists) break;
      const suffix = Math.random().toString(36).slice(2, 6);
      finalSlug = `${baseSlug}-${suffix}`;
    }

    const newProfile = await prisma.doctorProfile.create({
      data: {
        specialization, qualifications, experience, clinicName, clinicAddress, city, state, phone, consultationFee, slug: finalSlug,
        user: { connect: { id: user.userId } },              // Link profile to the authenticated user
      },
    });
    
    // ============================================================================
    // ✅ SUCCESS RESPONSE - Return the created profile
    // ============================================================================
    res.status(201).json({ message: 'Doctor profile created successfully', profile: newProfile });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while creating the profile.' });
  }
});

// ============================================================================
// 👨‍⚕️ GET DOCTOR PROFILE ENDPOINT - Fetch the authenticated doctor's profile
// ============================================================================
// Route: GET /api/doctor/profile
// Purpose: Return the doctor's existing profile so they can manage it
// Security: Requires authentication + DOCTOR role
app.get('/api/doctor/profile', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  
  if (user.role !== 'DOCTOR') {
    return res.status(403).json({ message: 'Forbidden: Only users with DOCTOR role can view a doctor profile.' });
  }
  
  try {
    const profile = await prisma.doctorProfile.findUnique({
      where: { userId: user.userId },
    });
    if (!profile) {
      return res.status(404).json({ message: 'Doctor profile not found.' });
    }
    res.status(200).json(profile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching the profile.' });
  }
});

// ============================================================================
// 📊 DOCTOR STATS ENDPOINT - Dashboard statistics for the authenticated doctor
// ============================================================================
// Route: GET /api/doctor/stats
// Purpose: Provide key metrics for the doctor's dashboard
// Security: Requires authentication + DOCTOR role
app.get('/api/doctor/stats', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  
  if (user.role !== 'DOCTOR') {
    return res.status(403).json({ message: 'Forbidden: Only users with DOCTOR role can view stats.' });
  }
  
  try {
    // Compute date range for current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [
      totalAppointments,
      pendingAppointments,
      completedAppointments,
      distinctPatients,
      doctorProfile
    ] = await Promise.all([
      prisma.appointment.count({ where: { doctorId: user.userId } }),
      prisma.appointment.count({ where: { doctorId: user.userId, status: 'PENDING' } }),
      prisma.appointment.count({ where: { doctorId: user.userId, status: 'COMPLETED' } }),
      prisma.appointment.findMany({
        where: { doctorId: user.userId },
        distinct: ['patientId'],
        select: { patientId: true },
      }),
      prisma.doctorProfile.findUnique({ where: { userId: user.userId } })
    ]);

    // Monthly revenue: number of completed appointments this month × consultationFee
    const completedThisMonth = await prisma.appointment.count({
      where: {
        doctorId: user.userId,
        status: 'COMPLETED',
        date: { gte: startOfMonth, lte: endOfMonth },
      }
    });
    const consultationFee = doctorProfile?.consultationFee || 0;
    const monthlyRevenue = completedThisMonth * consultationFee;
    const totalPatients = distinctPatients.length;

    res.status(200).json({
      totalAppointments,
      pendingAppointments,
      completedAppointments,
      totalPatients,
      monthlyRevenue,
      websiteViews: 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching doctor stats.' });
  }
});

// ============================================================================
// 🏥 HOSPITAL MANAGEMENT - Secure endpoints for hospital admins
// ============================================================================
const hospitalAdminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user || user.role !== 'HOSPITAL_ADMIN') {
    return res.status(403).json({ message: 'Forbidden: Only users with HOSPITAL_ADMIN role can access this resource.' });
  }
  next();
};

// Create a hospital (admin becomes the hospital admin)
app.post('/api/hospitals', authMiddleware, hospitalAdminMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  const { name, address, city, state, phone } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Hospital name is required.' });
  }
  try {
    const hospital = await prisma.hospital.create({
      data: {
        name,
        address: address || null,
        city: city || null,
        state: state || null,
        phone: phone || null,
        adminId: user.userId,
      },
    });
    res.status(201).json(hospital);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while creating the hospital.' });
  }
});

// Add a department to a hospital
app.post('/api/hospitals/:hospitalId/departments', authMiddleware, hospitalAdminMiddleware, async (req: Request, res: Response) => {
  const { hospitalId } = req.params;
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Department name is required.' });
  }
  try {
    const department = await prisma.department.create({
      data: {
        name,
        description: description || null,
        hospital: { connect: { id: Number(hospitalId) } },
      },
    });
    res.status(201).json(department);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while creating the department.' });
  }
});

// Link a doctor to a hospital (optionally to a department)
app.post('/api/hospitals/:hospitalId/doctors', authMiddleware, hospitalAdminMiddleware, async (req: Request, res: Response) => {
  const { hospitalId } = req.params;
  const { doctorId, departmentId } = req.body;
  if (!doctorId) {
    return res.status(400).json({ message: 'doctorId is required.' });
  }
  try {
    // Ensure the user is a doctor
    const doctorUser = await prisma.user.findUnique({ where: { id: Number(doctorId) } });
    if (!doctorUser || doctorUser.role !== 'DOCTOR') {
      return res.status(400).json({ message: 'Provided doctorId does not belong to a DOCTOR user.' });
    }

    const link = await prisma.hospitalDoctor.create({
      data: {
        hospital: { connect: { id: Number(hospitalId) } },
        doctor: { connect: { id: Number(doctorId) } },
        department: departmentId ? { connect: { id: Number(departmentId) } } : undefined,
      },
    });
    res.status(201).json(link);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Doctor is already linked to this hospital.' });
    }
    console.error(error);
    res.status(500).json({ message: 'An error occurred while linking the doctor to the hospital.' });
  }
});

// Create a new doctor account (without signup) and link to this hospital
// Allows hospital admins to make profile-listed doctors bookable
app.post('/api/hospitals/:hospitalId/doctors/create', authMiddleware, hospitalAdminMiddleware, async (req: Request, res: Response) => {
  const { hospitalId } = req.params;
  const { name, primarySpecialty, subSpecialty, departmentId } = req.body || {};
  const idNum = Number(hospitalId);
  if (!Number.isInteger(idNum) || idNum <= 0) {
    return res.status(400).json({ message: 'Invalid hospitalId.' });
  }
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ message: 'Doctor name is required.' });
  }
  try {
    const hospital = await prisma.hospital.findUnique({ where: { id: idNum } });
    if (!hospital) return res.status(404).json({ message: 'Hospital not found.' });

    // Generate a unique, internal-only email for the doctor account
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'doctor';
    const uniqueTag = `${Date.now()}-${Math.floor(Math.random()*10000)}`;
    const email = `doc-${idNum}-${slug}-${uniqueTag}@example.local`;
    const passwordPlain = `HospDoc-${uniqueTag}`;
    const hashedPassword = await bcrypt.hash(passwordPlain, 10);

    // Create user with DOCTOR role but disable login (booking-only)
    const doctorUser = await prisma.user.create({
      data: { email, password: hashedPassword, role: 'DOCTOR', canLogin: false }
    });

    // Optionally create a minimal profile so frontend has basic labels
    // Use hospital fields for required values if available; otherwise placeholders
    const clinicAddress = hospital.address || `${hospital.name} - Address Pending`;
    const phone = hospital.phone || '0000000000';
    const consultationFee = 0;
    await prisma.doctorProfile.create({
      data: {
        user: { connect: { id: doctorUser.id } },
        specialization: primarySpecialty || 'General Medicine',
        qualifications: subSpecialty || undefined,
        experience: undefined,
        clinicName: hospital.name,
        clinicAddress,
        city: hospital.city || undefined,
        state: hospital.state || undefined,
        phone,
        consultationFee,
        slug: null,
        micrositeEnabled: false
      }
    });

    // Link doctor to hospital (and optionally to department)
    const link = await prisma.hospitalDoctor.create({
      data: {
        hospital: { connect: { id: idNum } },
        doctor: { connect: { id: doctorUser.id } },
        department: departmentId ? { connect: { id: Number(departmentId) } } : undefined,
      }
    });

    return res.status(201).json({
      message: 'Doctor created and linked to hospital successfully',
      doctor: { id: doctorUser.id, email: doctorUser.email },
      link,
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Generated email already exists. Please retry.' });
    }
    console.error(error);
    return res.status(500).json({ message: 'An error occurred while creating and linking the doctor.' });
  }
});

// List hospitals (basic listing with departments and doctor counts)
app.get('/api/hospitals', async (_req: Request, res: Response) => {
  try {
    const hospitals = await prisma.hospital.findMany({
      include: {
        departments: true,
        doctors: true,
      },
    });
    res.status(200).json(hospitals);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching hospitals.' });
  }
});

// Get hospital for the logged-in hospital admin
app.get('/api/hospitals/my', authMiddleware, hospitalAdminMiddleware, async (req: Request, res: Response) => {
  const admin = req.user!;
  try {
    const hospital = await prisma.hospital.findFirst({
      where: { adminId: admin.userId },
      select: { id: true, name: true, profile: true, city: true, state: true, phone: true }
    });
    if (!hospital) {
      return res.status(404).json({ message: 'No hospital linked to this admin.' });
    }
    res.status(200).json(hospital);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching your hospital.' });
  }
});

// Get or update hospital profile (rich JSON content)
app.get('/api/hospitals/:hospitalId/profile', async (req: Request, res: Response) => {
  const { hospitalId } = req.params;
  const id = Number(hospitalId);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: 'Invalid hospitalId.' });
  }
  try {
    const hospital = await prisma.hospital.findUnique({
      where: { id },
      select: { id: true, name: true, profile: true }
    });
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found.' });
    }
    res.status(200).json({ hospitalId: hospital.id, name: hospital.name, profile: hospital.profile || null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching hospital profile.' });
  }
});

app.put('/api/hospitals/:hospitalId/profile', authMiddleware, hospitalAdminMiddleware, async (req: Request, res: Response) => {
  const { hospitalId } = req.params;
  const id = Number(hospitalId);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: 'Invalid hospitalId.' });
  }
  const admin = req.user!;
  const profilePayload = req.body;

  if (!profilePayload || typeof profilePayload !== 'object') {
    return res.status(400).json({ message: 'Invalid profile payload. Expecting a JSON object.' });
  }

  try {
    const hospital = await prisma.hospital.findUnique({ where: { id } });
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found.' });
    }

    // Ensure this admin manages the hospital
    if (hospital.adminId !== admin.userId) {
      return res.status(403).json({ message: 'Forbidden: You are not the admin of this hospital.' });
    }

    const updated = await prisma.hospital.update({
      where: { id },
      data: { profile: profilePayload as any },
      select: { id: true, profile: true }
    });
    return res.status(200).json({ message: 'Hospital profile updated successfully', hospitalId: updated.id, profile: updated.profile });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while updating hospital profile.' });
  }
});

// Get hospital details
app.get('/api/hospitals/:hospitalId', async (req: Request, res: Response) => {
  const { hospitalId } = req.params;
  const id = Number(hospitalId);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: 'Invalid hospitalId.' });
  }
  try {
    const hospital = await prisma.hospital.findUnique({
      where: { id },
      include: {
        departments: true,
        doctors: {
          include: {
            doctor: {
              include: {
                doctorProfile: true,
              },
            },
            department: true,
          },
        },
      },
    });
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found.' });
    }
    res.status(200).json(hospital);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching the hospital.' });
  }
});

// --- Get All Users Endpoint (for debugging) ---
app.get('/api/users', async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true, createdAt: true }
    });
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching users.' });
  }
});

// --- Get All Doctors Endpoint (Public) ---
app.get('/api/doctors', async (req: Request, res: Response) => {
  try {
    // Only return doctors whose microsites are enabled
    const doctors = await prisma.user.findMany({
      where: {
        role: 'DOCTOR',
        doctorProfile: {
          is: { micrositeEnabled: true },
        },
      },
      include: { doctorProfile: true },
    });
    const doctorsWithProfiles = doctors.filter((doctor: any) => doctor.doctorProfile && doctor.doctorProfile.micrositeEnabled);
    res.status(200).json(doctorsWithProfiles);
  } catch (error) {
    // Graceful fallback: if database is not reachable or auth fails, return empty list
    const code = (error as any)?.code;
    const isDbInitError = code === 'P1000' || code === 'P1001' || code === 'P1011';
    if (isDbInitError) {
      console.warn('Database not ready or authentication failed. Returning empty doctors list.');
      return res.status(200).json([]);
    }
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching doctors.' });
  }
});

// --- Simple health endpoint ---
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// --- Get Doctor by Slug Endpoint (Public) ---
app.get('/api/doctors/slug/:slug', async (req: Request, res: Response) => {
  const { slug } = req.params;
  try {
    const doctorProfile = await prisma.doctorProfile.findFirst({
      where: {
        micrositeEnabled: true,
        OR: [
          { slug },
          { slug: slug.toLowerCase() },
          { slug: slug.toUpperCase() },
        ],
      },
      include: { user: true },
    });
    if (!doctorProfile) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    // Return the data in the format expected by the frontend
    res.status(200).json({
      email: doctorProfile.user.email,
      doctorProfile: {
        specialization: doctorProfile.specialization,
        clinicName: doctorProfile.clinicName,
        clinicAddress: doctorProfile.clinicAddress,
        city: doctorProfile.city,
        state: doctorProfile.state,
        phone: doctorProfile.phone,
        consultationFee: doctorProfile.consultationFee,
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching the doctor.' });
  }
});

// --- Availability by Hour Endpoint (Public) ---
// Computes hour-level availability for a doctor/date based on their slot period
// Capacity per hour = 60 / slotPeriodMinutes; when bookedCount >= capacity, mark as unavailable
app.get('/api/availability', async (req: Request, res: Response) => {
  const { doctorId, date } = req.query as { doctorId?: string; date?: string };
  if (!doctorId || !date) {
    return res.status(400).json({ message: 'doctorId and date are required.' });
  }
  try {
    const normalizedDoctorId = Number(doctorId);
    const requestedDate = toISTMidnight(String(date));
    if (isNaN(requestedDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date provided.' });
    }

    // Determine doctor slot period
    const profile = await prisma.doctorProfile.findUnique({ where: { userId: normalizedDoctorId } });
    const periodMinutes = profile?.slotPeriodMinutes ?? 15;
    const segmentsPerHour = Math.max(1, Math.floor(60 / periodMinutes));

    // Fetch appointments for the day (PENDING/CONFIRMED)
    const dayAppointments = await prisma.appointment.findMany({
      where: {
        doctorId: normalizedDoctorId,
        date: requestedDate,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      select: { time: true }
    });

    // Determine which hours to show. Prefer published slots; otherwise default 9..21
    const publishedSlots = await prisma.slot.findMany({
      where: { doctorId: normalizedDoctorId, date: requestedDate, status: 'AVAILABLE' },
      select: { time: true }
    });

    const hoursFromSlots = Array.from(new Set(publishedSlots.map((s: any) => s.time.slice(0, 2)))).sort();
    const defaultHours = Array.from({ length: 13 }, (_, i) => String(i + 9).padStart(2, '0')); // 09..21
    const hoursToCheck = (hoursFromSlots.length ? hoursFromSlots : defaultHours);

    const results = hoursToCheck.map((hourStr) => {
      const segmentMinutes = Array.from({ length: segmentsPerHour }, (_, i) => String(i * periodMinutes).padStart(2, '0'));
      const segmentTimes = segmentMinutes.map(m => `${hourStr}:${m}`);
      const bookedCount = dayAppointments.filter((a: any) => segmentTimes.includes(a.time)).length;
      const capacity = segmentsPerHour;
      const isFull = bookedCount >= capacity;
      // Labels (IST hour window)
      const labelFrom = `${hourStr}:00`;
      const nextHour = String((Number(hourStr) + 1)).padStart(2, '0');
      const labelTo = `${nextHour}:00`;
      return { hour: hourStr, capacity, bookedCount, isFull, labelFrom, labelTo };
    });

    res.status(200).json({ periodMinutes, hours: results });
  } catch (error) {
    console.error('[availability] error', error);
    res.status(500).json({ message: 'Failed to compute availability.' });
  }
});

// --- Create Appointment Endpoint (Protected, Patient Role) ---
app.post('/api/appointments', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role !== 'PATIENT') {
    return res.status(403).json({ message: 'Forbidden: Only patients can book appointments.' });
  }
  const { doctorId, date, time, reason } = req.body;
  const patientId = user.userId;
  if (!doctorId || !date || !time) {
    return res.status(400).json({ message: 'Doctor ID, date, and time are required.' });
  }
  try {
    // --- Normalize inputs ---
    const normalizedDoctorId = Number(doctorId);
    const requestedDate = toISTMidnight(String(date));
    const normalizedTime = String(time).length >= 5 ? String(time).slice(0, 5) : String(time);

    // --- Validate date is valid ---
    if (isNaN(requestedDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date provided.' });
    }

    // --- Enforce one booking per doctor per day for the patient ---
    const existingSameDayForPatient = await prisma.appointment.findFirst({
      where: {
        patientId: Number(patientId),
        doctorId: normalizedDoctorId,
        date: requestedDate,
      }
    });
    if (existingSameDayForPatient) {
      return res.status(409).json({ message: 'You already have an appointment with this doctor on the selected date.' });
    }

    // --- Determine sub-slot period for this doctor (capacity per hour = 60 / period) ---
    const profileForDoctor = await prisma.doctorProfile.findUnique({ where: { userId: normalizedDoctorId } });
    const periodMinutes = profileForDoctor?.slotPeriodMinutes ?? 15;
    const segmentsPerHour = Math.max(1, Math.floor(60 / periodMinutes));
    const hourStr = normalizedTime.slice(0, 2);
    const segmentMinutes = Array.from({ length: segmentsPerHour }, (_, i) => String(i * periodMinutes).padStart(2, '0'));
    const segmentTimes = segmentMinutes.map(m => `${hourStr}:${m}`);
    const preferredIsSegment = segmentTimes.includes(normalizedTime);

    // Find existing appointments in this hour for the doctor
    const existingQuarterAppointments = await prisma.appointment.findMany({
      where: {
        doctorId: normalizedDoctorId,
        date: requestedDate,
        time: { in: segmentTimes },
        status: { in: ['PENDING', 'CONFIRMED'] }
      },
      select: { time: true }
    });
    const takenTimes = new Set(existingQuarterAppointments.map((a: any) => a.time));

    // Choose final 15-min time
    let finalTime: string | null = null;
    if (preferredIsSegment && !takenTimes.has(normalizedTime)) {
      finalTime = normalizedTime;
    } else {
      for (const seg of segmentTimes) {
        if (!takenTimes.has(seg)) {
          finalTime = seg;
          break;
        }
      }
    }
    if (!finalTime) {
      console.info('[book] hour-full', { doctorId: normalizedDoctorId, date, hour: hourStr, requestedTime: normalizedTime, periodMinutes });
      return res.status(409).json({ message: 'Selected hour is fully booked. Please choose another hour.' });
    }

    // --- Validate final time not in the past ---
    const requestedDateTime = toISTDateTime(String(date), finalTime);
    if (isNaN(requestedDateTime.getTime())) {
      return res.status(400).json({ message: 'Invalid time provided.' });
    }
    const now = new Date();
    if (requestedDateTime.getTime() < now.getTime()) {
      return res.status(400).json({ message: 'Cannot book an appointment in the past.' });
    }

    // Prevent collisions on the chosen 15-min sub-slot
    const existing = await prisma.appointment.findFirst({
      where: {
        doctorId: normalizedDoctorId,
        date: requestedDate,
        time: finalTime,
        status: { in: ['PENDING', 'CONFIRMED'] }
      }
    });
    if (existing) {
      console.info('[book] conflict-existing', { doctorId: normalizedDoctorId, date, time: finalTime, appointmentId: existing.id });
      return res.status(409).json({ message: 'Selected time slot is already booked for this doctor.' });
    }

    // Optional slot enforcement: If a matching slot exists, respect its status.
    // If no slot exists, allow booking (subject to conflict and past checks).
    const matchedSlot = await prisma.slot.findFirst({
      where: {
        doctorId: normalizedDoctorId,
        date: requestedDate,
        time: finalTime,
      }
    });

    if (matchedSlot) {
      if (matchedSlot.status === 'CANCELLED') {
      console.info('[book] slot-found-cancelled', { slotId: matchedSlot.id, doctorId: normalizedDoctorId, date, time: finalTime });
        return res.status(409).json({ message: 'Selected time has been cancelled by the doctor.' });
      }
      if (matchedSlot.status === 'BOOKED') {
      console.info('[book] slot-found-booked', { slotId: matchedSlot.id, doctorId: normalizedDoctorId, date, time: finalTime });
        return res.status(409).json({ message: 'Selected time slot is already booked for this doctor.' });
      }
      // AVAILABLE: book atomically and mark slot as BOOKED
      console.info('[book] slot-found-available', { slotId: matchedSlot.id, doctorId: normalizedDoctorId, date, time: finalTime });
      const result = await prisma.$transaction(async (tx: any) => {
        const created = await tx.appointment.create({
          data: {
            date: requestedDate,
            time: finalTime,
            notes: reason,
            doctor: { connect: { id: normalizedDoctorId } },
            patient: { connect: { id: Number(patientId) } },
          },
        });
        await tx.slot.update({
          where: { id: matchedSlot.id },
          data: { status: 'BOOKED' }
        });
        return created;
      });
      return res.status(201).json({ message: 'Appointment booked successfully', appointment: result });
    } else {
      // No slot exists: proceed with booking without slot constraints
      console.info('[book] slot-optional-none', { doctorId: normalizedDoctorId, date, time: finalTime });
      const created = await prisma.appointment.create({
        data: {
          date: requestedDate,
          time: finalTime,
          notes: reason,
          doctor: { connect: { id: normalizedDoctorId } },
          patient: { connect: { id: Number(patientId) } },
        },
      });
      return res.status(201).json({ message: 'Appointment booked successfully', appointment: created });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while booking the appointment.' });
  }
});

// ================================
// Slot endpoints
// ================================

// Create a slot for the logged-in doctor
app.post('/api/slots', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  const { date, time } = req.body;
  if (user.role !== 'DOCTOR') {
    return res.status(403).json({ message: 'Only doctors can publish slots.' });
  }
  if (!date || !time) {
    return res.status(400).json({ message: 'Date and time are required.' });
  }
  try {
    const slotDate = toISTMidnight(String(date));
    if (isNaN(slotDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date provided.' });
    }
    if (slotDate.getTime() < Date.now()) {
      return res.status(400).json({ message: 'Cannot create a slot in the past.' });
    }
    const slot = await prisma.slot.create({
      data: {
        doctorId: user.userId,
        date: slotDate,
        time: String(time),
        status: 'AVAILABLE'
      }
    });
    res.status(201).json({ message: 'Slot created', slot });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'A slot already exists for this date and time.' });
    }
    console.error(error);
    res.status(500).json({ message: 'An error occurred while creating the slot.' });
  }
});

// List slots (public) with optional filtering by doctorId and date (IST)
app.get('/api/slots', async (req: Request, res: Response) => {
  const { doctorId, date } = req.query as { doctorId?: string; date?: string };
  try {
    const where: any = {};
    if (doctorId) where.doctorId = Number(doctorId);
    if (date) {
      const start = toISTMidnight(String(date));
      const end = new Date(`${String(date)}T23:59:59${IST_OFFSET}`);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        where.date = { gte: start, lte: end };
      }
    }
    const slots = await prisma.slot.findMany({ where, orderBy: [{ date: 'asc' }, { time: 'asc' }] });
    console.info('[slots] query', { doctorId, date, where });
    console.info('[slots] results', { count: slots.length, times: slots.map((s: any) => s.time).slice(0, 10) });
    res.status(200).json(slots);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching slots.' });
  }
});

// Cancel a slot (doctor only)
app.patch('/api/slots/:slotId/cancel', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  const { slotId } = req.params;
  if (user.role !== 'DOCTOR') {
    return res.status(403).json({ message: 'Only doctors can cancel slots.' });
  }
  try {
    const slot = await prisma.slot.findUnique({ where: { id: Number(slotId) } });
    if (!slot || slot.doctorId !== user.userId) {
      return res.status(404).json({ message: 'Slot not found for this doctor.' });
    }
    const updated = await prisma.slot.update({ where: { id: slot.id }, data: { status: 'CANCELLED' } });
    res.status(200).json({ message: 'Slot cancelled', slot: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while cancelling the slot.' });
  }
});

// =============================================================
// Slot Admin Management (Doctor/Hospital create or update login)
// =============================================================

// Get existing slot admin for the authenticated doctor
app.get('/api/doctor/slot-admin', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role !== 'DOCTOR') {
    return res.status(403).json({ message: 'Forbidden: Only doctors can manage slot admin credentials.' });
  }
  try {
    const profile = await prisma.doctorProfile.findUnique({ where: { userId: user.userId } });
    if (!profile) return res.status(404).json({ message: 'Doctor profile not found.' });
    const slotAdmin = await prisma.user.findFirst({ where: { role: 'SLOT_ADMIN', managedDoctorProfileId: profile.id } });
    if (!slotAdmin) return res.status(200).json({ slotAdmin: null });
    return res.status(200).json({ slotAdmin: { id: slotAdmin.id, email: slotAdmin.email } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching slot admin.' });
  }
});

// Create or update slot admin credentials for the authenticated doctor
app.post('/api/doctor/slot-admin', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role !== 'DOCTOR') {
    return res.status(403).json({ message: 'Forbidden: Only doctors can manage slot admin credentials.' });
  }
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });
  try {
    const profile = await prisma.doctorProfile.findUnique({ where: { userId: user.userId } });
    if (!profile) return res.status(404).json({ message: 'Doctor profile not found.' });

    const existing = await prisma.user.findFirst({ where: { role: 'SLOT_ADMIN', managedDoctorProfileId: profile.id } });
    const hashed = await bcrypt.hash(password, 10);
    if (existing) {
      // Update existing slot admin
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: { email, password: hashed }
      });
      return res.status(200).json({ message: 'Slot admin updated', slotAdmin: { id: updated.id, email: updated.email } });
    } else {
      // Create new slot admin linked to doctor profile
      const created = await prisma.user.create({
        data: { email, password: hashed, role: 'SLOT_ADMIN', managedDoctorProfile: { connect: { id: profile.id } } }
      });
      return res.status(201).json({ message: 'Slot admin created', slotAdmin: { id: created.id, email: created.email } });
    }
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Email already in use.' });
    }
    console.error(error);
    res.status(500).json({ message: 'An error occurred while saving slot admin.' });
  }
});

// Get slot admin tied to the authenticated hospital admin
app.get('/api/hospital/slot-admin', authMiddleware, hospitalAdminMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  try {
    const hospital = await prisma.hospital.findFirst({ where: { adminId: user.userId } });
    if (!hospital) return res.status(404).json({ message: 'Hospital not found for admin.' });
    const slotAdmin = await prisma.user.findFirst({ where: { role: 'SLOT_ADMIN', managedHospitalId: hospital.id } });
    if (!slotAdmin) return res.status(200).json({ slotAdmin: null });
    return res.status(200).json({ slotAdmin: { id: slotAdmin.id, email: slotAdmin.email } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching slot admin.' });
  }
});

// Create or update slot admin for hospital admin
app.post('/api/hospital/slot-admin', authMiddleware, hospitalAdminMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });
  try {
    const hospital = await prisma.hospital.findFirst({ where: { adminId: user.userId } });
    if (!hospital) return res.status(404).json({ message: 'Hospital not found for admin.' });
    const existing = await prisma.user.findFirst({ where: { role: 'SLOT_ADMIN', managedHospitalId: hospital.id } });
    const hashed = await bcrypt.hash(password, 10);
    if (existing) {
      const updated = await prisma.user.update({ where: { id: existing.id }, data: { email, password: hashed } });
      return res.status(200).json({ message: 'Slot admin updated', slotAdmin: { id: updated.id, email: updated.email } });
    } else {
      const created = await prisma.user.create({ data: { email, password: hashed, role: 'SLOT_ADMIN', managedHospital: { connect: { id: hospital.id } } } });
      return res.status(201).json({ message: 'Slot admin created', slotAdmin: { id: created.id, email: created.email } });
    }
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Email already in use.' });
    }
    console.error(error);
    res.status(500).json({ message: 'An error occurred while saving slot admin.' });
  }
});

// ==============================================
// Slot Admin scoped slots listing and management
// ==============================================

// List slots for the slot admin's scope (doctor or hospital)
app.get('/api/slot-admin/slots', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role !== 'SLOT_ADMIN') {
    return res.status(403).json({ message: 'Forbidden: Only Slot Admins can view these slots.' });
  }
  try {
    const admin = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { managedDoctorProfileId: true, managedHospitalId: true }
    });
    if (!admin) return res.status(401).json({ message: 'User not found.' });

    let doctorIds: number[] = [];
    if (admin.managedDoctorProfileId) {
      const profile = await prisma.doctorProfile.findUnique({ where: { id: admin.managedDoctorProfileId } });
      if (profile) doctorIds = [profile.userId];
    } else if (admin.managedHospitalId) {
      const memberships = await prisma.hospitalDoctor.findMany({ where: { hospitalId: admin.managedHospitalId } });
      doctorIds = memberships.map((m: any) => m.doctorId);
    }

    const where: any = {};
    if (doctorIds.length) where.doctorId = { in: doctorIds };
    const slots = await prisma.slot.findMany({ where, orderBy: [{ date: 'asc' }, { time: 'asc' }] });
    return res.status(200).json(slots);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching scoped slots.' });
  }
});

// Cancel a slot within the slot admin's scope
app.patch('/api/slot-admin/slots/:slotId/cancel', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role !== 'SLOT_ADMIN') {
    return res.status(403).json({ message: 'Forbidden: Only Slot Admins can manage slots.' });
  }
  const { slotId } = req.params;
  try {
    const admin = await prisma.user.findUnique({ where: { id: user.userId }, select: { managedDoctorProfileId: true, managedHospitalId: true } });
    if (!admin) return res.status(401).json({ message: 'User not found.' });

    let allowedDoctorIds: number[] = [];
    if (admin.managedDoctorProfileId) {
      const profile = await prisma.doctorProfile.findUnique({ where: { id: admin.managedDoctorProfileId } });
      if (profile) allowedDoctorIds = [profile.userId];
    } else if (admin.managedHospitalId) {
      const memberships = await prisma.hospitalDoctor.findMany({ where: { hospitalId: admin.managedHospitalId } });
      allowedDoctorIds = memberships.map((m: any) => m.doctorId);
    }

    const slot = await prisma.slot.findUnique({ where: { id: Number(slotId) } });
    if (!slot || (allowedDoctorIds.length && !allowedDoctorIds.includes(slot.doctorId))) {
      return res.status(404).json({ message: 'Slot not found within your management scope.' });
    }
    const updated = await prisma.slot.update({ where: { id: Number(slotId) }, data: { status: 'CANCELLED' } });
    return res.status(200).json({ message: 'Slot cancelled', slot: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while cancelling the slot.' });
  }
});


// =================================================================
// --- NEWLY ADDED ENDPOINTS ---
// =================================================================

// --- Get Appointments for the Logged-In User (Patient or Doctor) ---
app.get('/api/my-appointments', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        OR: [
          { patientId: user.userId },
          { doctorId: user.userId },
        ],
      },
      include: {
        doctor: {
          select: { id: true, email: true, doctorProfile: true }
        },
        patient: {
          select: { id: true, email: true }
        }
      },
      orderBy: {
        date: 'asc',
      },
    });
    res.status(200).json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching appointments.' });
  }
});

// --- Update Doctor Profile Endpoint (Protected) ---
app.put('/api/doctor/profile', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role !== 'DOCTOR') {
    return res.status(403).json({ message: 'Forbidden: Only users with DOCTOR role can update a profile.' });
  }
  const { specialization, qualifications, experience, clinicName, clinicAddress, city, state, phone, consultationFee, slug } = req.body;
  if (!specialization || !clinicAddress || !phone || !consultationFee) {
    return res.status(400).json({ message: 'Required profile fields are missing.' });
  }
  try {
    const existingProfile = await prisma.doctorProfile.findUnique({
      where: { userId: user.userId },
    });
    if (!existingProfile) {
      return res.status(404).json({ message: 'Profile not found. Please create a profile first.' });
    }
    // If a new slug is provided, sanitize and ensure it’s unique
    let sanitizedSlug: string | undefined;
    if (typeof slug === 'string' && slug.trim().length > 0) {
      const nextSlug = slug
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/--+/g, '-');
      if (nextSlug !== existingProfile.slug) {
        const conflict = await prisma.doctorProfile.findUnique({ where: { slug: nextSlug } });
        if (conflict && conflict.userId !== user.userId) {
          return res.status(409).json({ message: 'Slug already in use. Please choose another.' });
        }
      }
      sanitizedSlug = nextSlug;
    }
    const updatedProfile = await prisma.doctorProfile.update({
      where: { userId: user.userId },
      data: {
        specialization, qualifications, experience, clinicName, clinicAddress, city, state, phone, consultationFee,
        ...(sanitizedSlug ? { slug: sanitizedSlug } : {}),
      },
    });
    res.status(200).json({ message: 'Doctor profile updated successfully', profile: updatedProfile });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while updating the profile.' });
  }
});

// =================================================================
// --- ADMIN ENDPOINTS ---
// =================================================================

// --- Admin Middleware ---
const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized: User not authenticated.' });
  }
  
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Forbidden: Admin access required.' });
  }
  next();
};

// --- Get Dashboard Stats (Admin Only) ---
app.get('/api/admin/dashboard', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const [totalUsers, totalDoctors, totalPatients, totalAppointments, pendingAppointments] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'DOCTOR' } }),
      prisma.user.count({ where: { role: 'PATIENT' } }),
      prisma.appointment.count(),
      prisma.appointment.count({ where: { status: 'PENDING' } }),
    ]);

    res.status(200).json({
      stats: {
        totalUsers,
        totalDoctors,
        totalPatients,
        totalAppointments,
        pendingAppointments,
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching dashboard stats.' });
  }
});

// --- Get All Users (Admin Only) ---
app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        doctorProfile: {
          select: {
            id: true,
            specialization: true,
            clinicName: true,
            slug: true,
          }
        },
        _count: {
          select: {
            doctorAppointments: true,
            patientAppointments: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching users.' });
  }
});

// --- Delete User (Admin Only) ---
app.delete('/api/admin/users/:userId', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { userId } = req.params;
  const admin = req.user!;

  try {
    const id = parseInt(userId);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: 'Invalid user ID.' });
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Delete associated doctor profile first if present to avoid FK issues
    if (existing.role === 'DOCTOR') {
      const profile = await prisma.doctorProfile.findUnique({ where: { userId: id } as any });
      if (profile) {
        await prisma.doctorProfile.delete({ where: { id: profile.id } });
      }
    }

    await prisma.user.delete({ where: { id } });

    await prisma.adminAuditLog.create({
      data: {
        adminId: admin.userId,
        action: 'DELETE',
        entityType: 'USER',
        entityId: id,
        details: `User ${existing.email} deleted by admin ${admin.email}`,
      }
    });

    return res.status(200).json({ message: 'User deleted successfully.' });
  } catch (error: any) {
    if (error.code === 'P2003') {
      return res.status(409).json({ message: 'Cannot delete user due to related records. Remove associations first.' });
    }
    console.error('Error deleting user:', error);
    return res.status(500).json({ message: 'An error occurred while deleting the user.' });
  }
});

// --- Update User Status (Admin Only) ---
// Note: User activation/deactivation functionality removed as isActive field doesn't exist in schema

// --- Update user role (admin only)
app.patch('/api/admin/users/:userId/role', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { role } = req.body;
  
  // Validate role
  if (!['PATIENT', 'DOCTOR', 'ADMIN'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role. Must be PATIENT, DOCTOR, or ADMIN' });
  }
  
  try {
    const user = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { role },
    });
    
    // Log the action
    await prisma.adminAuditLog.create({
      data: {
        adminId: req.user!.userId,
        action: 'UPDATE',
        entityType: 'USER',
        entityId: parseInt(userId),
        details: JSON.stringify({ email: user.email, oldRole: user.role, newRole: role }),
      },
    });
    
    res.json({ message: 'User role updated successfully', user });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Failed to update user role' });
  }
});

// --- Get All Appointments (Admin Only) ---
app.get('/api/admin/appointments', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const appointments = await prisma.appointment.findMany({
      include: {
        doctor: {
          select: { id: true, email: true, doctorProfile: { select: { clinicName: true } } }
        },
        patient: {
          select: { id: true, email: true }
        }
      },
      orderBy: { date: 'desc' }
    });
    res.status(200).json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching appointments.' });
  }
});

// --- Update Appointment Status (Admin Only) ---
app.patch('/api/admin/appointments/:appointmentId/status', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { appointmentId } = req.params;
  const { status } = req.body;
  const admin = req.user!;

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: parseInt(appointmentId) }
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id: parseInt(appointmentId) },
      data: { status }
    });

    // Log admin action
    await prisma.adminAuditLog.create({
      data: {
        adminId: admin.userId,
        action: 'UPDATE',
        entityType: 'APPOINTMENT',
        entityId: parseInt(appointmentId),
        details: JSON.stringify({ oldStatus: appointment.status, newStatus: status })
      }
    });

    res.status(200).json({ message: 'Appointment status updated successfully', appointment: updatedAppointment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while updating appointment status.' });
  }
});

// --- Get Admin Audit Logs (Admin Only) ---
app.get('/api/admin/audit-logs', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const logs = await prisma.adminAuditLog.findMany({
      include: {
        admin: {
          select: { id: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100 // Limit to last 100 logs
    });
    res.status(200).json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching audit logs.' });
  }
});

// ============================================================================
// 🏠 HOMEPAGE CONTENT MANAGEMENT ENDPOINTS - Admin content management
// ============================================================================

// --- Get Homepage Content (Public) ---
app.get('/api/homepage/content', async (req: Request, res: Response) => {
  try {
    // For now, return default content
    // TODO: Store and retrieve from database
    const defaultContent = {
      hero: {
        title: "Find Trusted Healthcare Providers Near You",
        subtitle: "Book appointments with verified doctors, clinics, and hospitals in seconds. Quality healthcare made simple.",
        searchPlaceholder: "Search by doctor, specialty, or location...",
        ctaText: "Find a Doctor Now",
        backgroundImage: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
      },
      stats: {
        doctors: 1250,
        patients: 50000,
        cities: 45,
        reviews: 12000
      },
      features: [
        {
          icon: "🏥",
          title: "Verified Doctors",
          description: "All doctors are verified with valid medical licenses",
          color: "bg-blue-500"
        },
        {
          icon: "⭐",
          title: "Real Reviews",
          description: "10,000+ verified patient reviews and ratings",
          color: "bg-yellow-500"
        },
        {
          icon: "🌐",
          title: "Multi-language Support",
          description: "Available in multiple languages for better accessibility",
          color: "bg-green-500"
        },
        {
          icon: "🔒",
          title: "Secure & Private",
          description: "Your health data is protected with enterprise-grade security",
          color: "bg-purple-500"
        }
      ],
      testimonials: [
        {
          name: "Sarah Johnson",
          role: "Patient",
          content: "Amazing platform! Found my perfect doctor in just 2 minutes. The booking process was so smooth.",
          rating: 5,
          avatar: "👩"
        },
        {
          name: "Dr. Michael Chen",
          role: "Cardiologist",
          content: "This platform has helped me reach more patients and manage my appointments efficiently.",
          rating: 5,
          avatar: "👨‍⚕️"
        },
        {
          name: "Emily Rodriguez",
          role: "Patient",
          content: "The reviews helped me choose the right doctor. The consultation was excellent!",
          rating: 5,
          avatar: "👩‍🦱"
        }
      ],
      categories: [
        {
          title: "Hospitals",
          description: "Find top-rated hospitals near you",
          icon: "🏥",
          color: "bg-red-500",
          link: "/hospitals"
        },
        {
          title: "Single Doctors",
          description: "Connect with individual practitioners",
          icon: "👨‍⚕️",
          color: "bg-blue-500",
          link: "/doctors"
        },
        {
          title: "Multi-Doctor Clinics",
          description: "Access comprehensive clinic services",
          icon: "👩‍⚕️",
          color: "bg-green-500",
          link: "/clinics"
        },
        {
          title: "Online Consultation",
          description: "Get medical advice from home",
          icon: "💻",
          color: "bg-purple-500",
          link: "/online"
        },
        {
          title: "Labs & Diagnostics",
          description: "Book lab tests and diagnostics",
          icon: "🧪",
          color: "bg-orange-500",
          link: "/labs"
        },
        {
          title: "Emergency Care",
          description: "24/7 emergency medical services",
          icon: "🚨",
          color: "bg-red-600",
          link: "/emergency"
        }
      ],
      howItWorks: [
        {
          step: 1,
          title: "Search & Find",
          description: "Search by doctor, specialty, or location to find the right healthcare provider",
          icon: "🔍"
        },
        {
          step: 2,
          title: "Book & Pay",
          description: "Select your preferred time slot and complete the booking with secure payment",
          icon: "📅"
        },
        {
          step: 3,
          title: "Visit & Rate",
          description: "Attend your appointment and share your experience to help others",
          icon: "⭐"
        }
      ],
      whyChooseUs: [
        {
          title: "Verified Doctors Only",
          description: "No scammers - all doctors are verified with valid medical licenses and credentials",
          icon: "✅"
        },
        {
          title: "Transparent Reviews",
          description: "One booking equals one review - ensuring authentic patient feedback",
          icon: "📝"
        },
        {
          title: "Multi-language Support",
          description: "Breaking language barriers to make healthcare accessible to everyone",
          icon: "🌍"
        },
        {
          title: "One-stop Healthcare",
          description: "Complete ecosystem with doctors, clinics, hospitals, labs, and insurance",
          icon: "🏥"
        }
      ]
    };
    
    res.status(200).json(defaultContent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching homepage content.' });
  }
});

// --- Update Homepage Content (Admin Only) ---
app.put('/api/admin/homepage/content', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const admin = req.user!;
  const content = req.body;

  try {
    // TODO: Store content in database
    // For now, just return success
    console.log('Homepage content updated by admin:', admin.email);
    console.log('New content:', JSON.stringify(content, null, 2));

    // Log admin action
    await prisma.adminAuditLog.create({
      data: {
        adminId: admin.userId,
        action: 'UPDATE',
        entityType: 'HOMEPAGE_CONTENT',
        entityId: 1, // Assuming single homepage content record
        details: JSON.stringify({ section: 'homepage_content', changes: 'content_updated' })
      }
    });

    res.status(200).json({ message: 'Homepage content updated successfully', content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while updating homepage content.' });
  }
});

// --- Update Appointment Status (Protected, Doctor Role) ---
app.patch('/api/appointments/:appointmentId/status', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  const { appointmentId } = req.params;
  const { status } = req.body as { status: string };
  if (user.role !== 'DOCTOR') {
    return res.status(403).json({ message: 'Forbidden: Only doctors can update appointment status.' });
  }
  const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status provided.' });
  }
  try {
    const appointmentToUpdate = await prisma.appointment.findFirst({
      where: {
        id: parseInt(appointmentId),
        doctorId: user.userId,
      },
    });
    if (!appointmentToUpdate) {
      return res.status(404).json({ message: 'Appointment not found or you do not have permission to update it.' });
    }
    const updatedAppointment = await prisma.appointment.update({
      where: {
        id: parseInt(appointmentId),
      },
      data: { status },
    });
    res.status(200).json({ message: 'Appointment status updated successfully', appointment: updatedAppointment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while updating the appointment.' });
  }
});

// --- Start the server ---
app.listen(port, () => {
  console.log(`[server]: API Server running at http://localhost:${port}`);
});