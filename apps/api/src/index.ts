import 'dotenv/config';
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
import { PrismaClient, Prisma } from '@prisma/client';               // Database ORM for easy database operations
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
// Create database connection with SSL enforced for hosted Postgres providers (e.g., Neon)
const rawDbUrl = process.env.DATABASE_URL;
const ensureSsl = (url?: string): string | undefined => {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    if (!u.searchParams.has('sslmode')) {
      u.searchParams.set('sslmode', 'require');
    }
    return u.toString();
  } catch {
    // If URL parsing fails, fall back to the original string
    return url;
  }
};

const prisma = rawDbUrl
  ? new PrismaClient({ datasourceUrl: ensureSsl(rawDbUrl)! })
  : new PrismaClient();                        // Create database connection
const app = express();                                     // Create Express application
const port = process.env.PORT || 3001;                    // Use environment port or default to 3001

// ============================================================================
// ⚙️ MIDDLEWARE SETUP - Functions that run before your routes
// ============================================================================
// Explicit CORS policy to allow frontend dev origins and Authorization header
// Include localhost:3002 for the web dev server
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001,http://localhost:3002').split(',');
const isAllowedDevOrigin = (o: string) => {
  try {
    const u = new URL(o);
    const host = u.hostname;
    const port = u.port;
    if (!port) return false; // must be explicit dev port
    // Allow localhost and typical LAN dev IPs
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.startsWith('192.168.') ||
      host.startsWith('10.')
    );
  } catch {
    return false;
  }
};
// Allow wildcard subdomains for local dev domains like lvh.me and localhost.com
const isAllowedWildcardDomain = (o: string) => {
  try {
    const u = new URL(o);
    const host = u.hostname.toLowerCase();
    // lvh.me resolves to 127.0.0.1 with wildcard subdomains
    if (host === 'lvh.me' || host.endsWith('.lvh.me')) return true;
    // localhost.com can be mapped via hosts with wildcard subdomains
    if (host === 'localhost.com' || host.endsWith('.localhost.com')) return true;
    // Optional: allow a configured primary domain and its subdomains
    const primary = (process.env.CORS_PRIMARY_DOMAIN || process.env.NEXT_PUBLIC_PRIMARY_DOMAIN || '').toLowerCase();
    if (primary && (host === primary || host.endsWith(`.${primary}`))) return true;
    return false;
  } catch {
    return false;
  }
};
const corsConfig = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    if (!origin) return callback(null, true); // allow non-browser or same-origin
    // In development, be permissive for easier local testing
    if (process.env.NODE_ENV !== 'production') {
      if (allowedOrigins.includes(origin) || isAllowedDevOrigin(origin) || isAllowedWildcardDomain(origin)) {
        return callback(null, true);
      }
    } else {
      // In production, allow explicit origins and configured primary domain/subdomains
      if (allowedOrigins.includes(origin) || isAllowedWildcardDomain(origin)) {
        return callback(null, true);
      }
    }
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  // Ensure our explicit OPTIONS handler can add extra headers before ending response
  preflightContinue: true,
};
app.use(cors(corsConfig));
// Robust preflight handler including Private Network Access for LAN dev scenarios
app.options('*', cors(corsConfig), (req, res) => {
  try {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
  } catch {}
  res.status(204).end();
});
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

// Optimized hospitals endpoint for homepage performance
app.get('/api/hospitals', async (_req: Request, res: Response) => {
  try {
    const hospitals = await prisma.hospital.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        state: true,
        phone: true,
        profile: true,
        _count: {
          select: {
            departments: true,
            doctors: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.status(200).json(hospitals);
  } catch (error) {
    console.error('[hospitals] error:', error);
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

// Get hospital linked to a doctor (public)
app.get('/api/hospitals/by-doctor/:doctorId', async (req: Request, res: Response) => {
  const doctorId = Number(req.params.doctorId);
  if (!Number.isInteger(doctorId) || doctorId <= 0) {
    return res.status(400).json({ message: 'Invalid doctorId.' });
  }
  try {
    const link = await prisma.hospitalDoctor.findFirst({
      where: { doctorId },
      include: { hospital: true },
    });
    if (!link || !link.hospital) {
      return res.status(404).json({ message: 'No hospital linked to this doctor.' });
    }
    return res.status(200).json({
      hospitalId: link.hospitalId,
      hospital: { id: link.hospital.id, name: link.hospital.name },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching linked hospital.' });
  }
});

// Hospital Admin: Manage doctor working hours (day-wise start/end)
app.get('/api/hospitals/:hospitalId/doctors/:doctorId/working-hours', authMiddleware, hospitalAdminMiddleware, async (req: Request, res: Response) => {
  const hospitalId = Number(req.params.hospitalId);
  const doctorId = Number(req.params.doctorId);
  if (!Number.isInteger(hospitalId) || hospitalId <= 0) {
    return res.status(400).json({ message: 'Invalid hospitalId.' });
  }
  if (!Number.isInteger(doctorId) || doctorId <= 0) {
    return res.status(400).json({ message: 'Invalid doctorId.' });
  }

  try {
    const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found.' });
    }
    const admin = req.user!;
    if (hospital.adminId !== admin.userId) {
      return res.status(403).json({ message: 'Forbidden: You are not the admin of this hospital.' });
    }

    const link = await prisma.hospitalDoctor.findFirst({ where: { hospitalId, doctorId } });
    if (!link) {
      return res.status(404).json({ message: 'Doctor is not linked to this hospital.' });
    }

    const doctorProfile = await prisma.doctorProfile.findUnique({ where: { userId: doctorId } });
    if (!doctorProfile) {
      return res.status(404).json({ message: 'Doctor profile not found.' });
    }

    const hours = await prisma.doctorWorkingHours.findMany({
      where: { doctorProfileId: doctorProfile.id },
      orderBy: { dayOfWeek: 'asc' },
    });
    return res.status(200).json(hours);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching working hours.' });
  }
});

app.put('/api/hospitals/:hospitalId/doctors/:doctorId/working-hours', authMiddleware, hospitalAdminMiddleware, async (req: Request, res: Response) => {
  const hospitalId = Number(req.params.hospitalId);
  const doctorId = Number(req.params.doctorId);
  if (!Number.isInteger(hospitalId) || hospitalId <= 0) {
    return res.status(400).json({ message: 'Invalid hospitalId.' });
  }
  if (!Number.isInteger(doctorId) || doctorId <= 0) {
    return res.status(400).json({ message: 'Invalid doctorId.' });
  }

  const payload = req.body;
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.hours)) {
    return res.status(400).json({ message: 'Invalid payload. Expecting { hours: Array<{ dayOfWeek, startTime, endTime }> }' });
  }

  try {
    const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found.' });
    }
    const admin = req.user!;
    if (hospital.adminId !== admin.userId) {
      return res.status(403).json({ message: 'Forbidden: You are not the admin of this hospital.' });
    }

    const link = await prisma.hospitalDoctor.findFirst({ where: { hospitalId, doctorId } });
    if (!link) {
      return res.status(404).json({ message: 'Doctor is not linked to this hospital.' });
    }

    const doctorProfile = await prisma.doctorProfile.findUnique({ where: { userId: doctorId } });
    if (!doctorProfile) {
      return res.status(404).json({ message: 'Doctor profile not found.' });
    }

    const hoursInput: Array<{ dayOfWeek: number; startTime: string; endTime: string }> = payload.hours;
    const results: any[] = [];
    for (const h of hoursInput) {
      if (typeof h.dayOfWeek !== 'number' || h.dayOfWeek < 0 || h.dayOfWeek > 6) {
        return res.status(400).json({ message: `Invalid dayOfWeek: ${h.dayOfWeek}. Expected 0-6.` });
      }
      if (typeof h.startTime !== 'string' || typeof h.endTime !== 'string') {
        return res.status(400).json({ message: 'startTime and endTime must be strings in HH:mm format.' });
      }
      const upserted = await prisma.doctorWorkingHours.upsert({
        where: { doctorProfileId_dayOfWeek: { doctorProfileId: doctorProfile.id, dayOfWeek: h.dayOfWeek } },
        update: { startTime: h.startTime, endTime: h.endTime },
        create: { doctorProfileId: doctorProfile.id, dayOfWeek: h.dayOfWeek, startTime: h.startTime, endTime: h.endTime },
      });
      results.push(upserted);
    }

    // Return the fully refreshed list
    const hours = await prisma.doctorWorkingHours.findMany({
      where: { doctorProfileId: doctorProfile.id },
      orderBy: { dayOfWeek: 'asc' },
    });
    return res.status(200).json(hours);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while updating working hours.' });
  }
});

// Hospital Admin: List and modify doctor appointments linked to the hospital
app.get('/api/hospitals/:hospitalId/doctors/:doctorId/appointments', authMiddleware, hospitalAdminMiddleware, async (req: Request, res: Response) => {
  const hospitalId = Number(req.params.hospitalId);
  const doctorId = Number(req.params.doctorId);
  if (!Number.isInteger(hospitalId) || hospitalId <= 0) {
    return res.status(400).json({ message: 'Invalid hospitalId.' });
  }
  if (!Number.isInteger(doctorId) || doctorId <= 0) {
    return res.status(400).json({ message: 'Invalid doctorId.' });
  }

  try {
    const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found.' });
    }
    const admin = req.user!;
    if (hospital.adminId !== admin.userId) {
      return res.status(403).json({ message: 'Forbidden: You are not the admin of this hospital.' });
    }

    const link = await prisma.hospitalDoctor.findFirst({ where: { hospitalId, doctorId } });
    if (!link) {
      return res.status(404).json({ message: 'Doctor is not linked to this hospital.' });
    }

    const where: any = { doctorId };
    const { status, dateFrom, dateTo } = (req.query as any) || {};
    if (typeof status === 'string' && status.trim().length) {
      where.status = status;
    }
    if (typeof dateFrom === 'string') {
      where.date = { ...(where.date || {}), gte: new Date(dateFrom) };
    }
    if (typeof dateTo === 'string') {
      where.date = { ...(where.date || {}), lte: new Date(dateTo) };
    }

    const appts = await prisma.appointment.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { patient: true, doctor: true },
    });
    return res.status(200).json(appts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching appointments.' });
  }
});

app.patch('/api/hospitals/:hospitalId/doctors/:doctorId/appointments/:appointmentId', authMiddleware, hospitalAdminMiddleware, async (req: Request, res: Response) => {
  const hospitalId = Number(req.params.hospitalId);
  const doctorId = Number(req.params.doctorId);
  const appointmentId = Number(req.params.appointmentId);
  if (!Number.isInteger(hospitalId) || hospitalId <= 0) {
    return res.status(400).json({ message: 'Invalid hospitalId.' });
  }
  if (!Number.isInteger(doctorId) || doctorId <= 0) {
    return res.status(400).json({ message: 'Invalid doctorId.' });
  }
  if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
    return res.status(400).json({ message: 'Invalid appointmentId.' });
  }

  try {
    const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found.' });
    }
    const admin = req.user!;
    if (hospital.adminId !== admin.userId) {
      return res.status(403).json({ message: 'Forbidden: You are not the admin of this hospital.' });
    }

    const link = await prisma.hospitalDoctor.findFirst({ where: { hospitalId, doctorId } });
    if (!link) {
      return res.status(404).json({ message: 'Doctor is not linked to this hospital.' });
    }

    const existing = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!existing || existing.doctorId !== doctorId) {
      return res.status(404).json({ message: 'Appointment not found for this doctor.' });
    }

    const { status, date, time, notes } = req.body || {};
    const data: any = {};
    if (typeof status === 'string' && status.trim().length) data.status = status;
    if (typeof date === 'string' && date.trim().length) data.date = new Date(date);
    if (typeof time === 'string' && time.trim().length) data.time = time;
    if (typeof notes === 'string') data.notes = notes;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update.' });
    }

    const updated = await prisma.appointment.update({ where: { id: appointmentId }, data });
    return res.status(200).json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while updating appointment.' });
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
    // Sorting and pagination controls
    const sort = String((req.query as any)?.sort || '').toLowerCase();
    const page = Math.max(parseInt(String((req.query as any)?.page || '1'), 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(String((req.query as any)?.pageSize || '30'), 10) || 30, 1), 100);

    // Optimized query with only necessary fields and proper pagination
    let orderBy: any = { id: 'asc' }; // default
    
    if (sort === 'trending') {
      // Sort by experience for trending (simplified algorithm for performance)
      orderBy = { 
        doctorProfile: { 
          experience: 'desc' 
        } 
      };
    } else if (sort === 'recent') {
      // Sort by creation date
      orderBy = { 
        createdAt: 'desc' 
      };
    }

    const doctors = await prisma.user.findMany({
      where: {
        role: 'DOCTOR',
        doctorProfile: {
          is: { micrositeEnabled: true },
        },
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
        doctorProfile: {
          select: {
            id: true,
            specialization: true,
            clinicName: true,
            clinicAddress: true,
            city: true,
            state: true,
            phone: true,
            consultationFee: true,
            experience: true,
            qualifications: true,
            micrositeEnabled: true,
            updatedAt: true
          }
        }
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // Filter out doctors without profiles (safety check)
    const doctorsWithProfiles = doctors.filter((doctor: any) => doctor.doctorProfile && doctor.doctorProfile.micrositeEnabled);

    // Apply additional sorting for trending if needed (simplified)
    if (sort === 'trending') {
      doctorsWithProfiles.sort((a: any, b: any) => {
        const aProfile = a.doctorProfile;
        const bProfile = b.doctorProfile;
        
        // Simplified trending score
        const aScore = (aProfile.experience || 0) + (aProfile.consultationFee || 0) / 100 + Math.random();
        const bScore = (bProfile.experience || 0) + (bProfile.consultationFee || 0) / 100 + Math.random();
        
        return bScore - aScore;
      });
    }

    res.status(200).json(doctorsWithProfiles);
  } catch (error) {
    console.error('[doctors] error:', error);
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

// --- Optimized Availability by Hour Endpoint (Public) ---
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

    // Single optimized query to get all data at once
    const [profile, dayAppointments, publishedSlots] = await Promise.all([
      prisma.doctorProfile.findUnique({ 
        where: { userId: normalizedDoctorId },
        select: { slotPeriodMinutes: true }
      }),
      prisma.appointment.findMany({
        where: {
          doctorId: normalizedDoctorId,
          date: requestedDate,
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
        select: { time: true }
      }),
      prisma.slot.findMany({
        where: { 
          doctorId: normalizedDoctorId, 
          date: requestedDate, 
          status: 'AVAILABLE' 
        },
        select: { time: true }
      })
    ]);

    const periodMinutes = profile?.slotPeriodMinutes ?? 15;
    const segmentsPerHour = Math.max(1, Math.floor(60 / periodMinutes));

    // Optimize hour calculation
    const hoursFromSlots = publishedSlots.length > 0 
      ? Array.from(new Set(publishedSlots.map((s: any) => s.time.slice(0, 2)))).sort()
      : [];
    
    const defaultHours = ['09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21'];
    const hoursToCheck = hoursFromSlots.length > 0 ? hoursFromSlots : defaultHours;

    // Pre-calculate appointment times for faster lookup
    const appointmentTimes = new Set(dayAppointments.map((a: any) => a.time));

    const results = hoursToCheck.map((hourStr) => {
      const segmentMinutes = Array.from({ length: segmentsPerHour }, (_, i) => String(i * periodMinutes).padStart(2, '0'));
      const segmentTimes = segmentMinutes.map(m => `${hourStr}:${m}`);
      const bookedCount = segmentTimes.filter(time => appointmentTimes.has(time)).length;
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

// --- Combined Slots & Availability Endpoint (Public) ---
// Single endpoint that returns both slots and availability data to reduce frontend API calls
app.get('/api/slots-availability', async (req: Request, res: Response) => {
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

    // Single optimized query to get all data at once
    const [profile, dayAppointments, publishedSlots] = await Promise.all([
      prisma.doctorProfile.findUnique({ 
        where: { userId: normalizedDoctorId },
        select: { slotPeriodMinutes: true }
      }),
      prisma.appointment.findMany({
        where: {
          doctorId: normalizedDoctorId,
          date: requestedDate,
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
        select: { time: true }
      }),
      prisma.slot.findMany({
        where: { 
          doctorId: normalizedDoctorId, 
          date: requestedDate, 
          status: 'AVAILABLE' 
        },
        select: { 
          id: true,
          time: true,
          status: true
        }
      })
    ]);

    const periodMinutes = profile?.slotPeriodMinutes ?? 15;
    const segmentsPerHour = Math.max(1, Math.floor(60 / periodMinutes));

    // Process slots data
    const availableTimes = publishedSlots
      .filter((s: any) => s.status === 'AVAILABLE')
      .map((s: any) => String(s.time).slice(0, 5))
      .filter((time: string, index: number, arr: string[]) => arr.indexOf(time) === index) // Remove duplicates
      .sort();

    // Process availability data
    const hoursFromSlots = publishedSlots.length > 0 
      ? Array.from(new Set(publishedSlots.map((s: any) => s.time.slice(0, 2)))).sort()
      : [];
    
    const defaultHours = ['09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21'];
    const hoursToCheck = hoursFromSlots.length > 0 ? hoursFromSlots : defaultHours;

    // Pre-calculate appointment times for faster lookup
    const appointmentTimes = new Set(dayAppointments.map((a: any) => a.time));

    const availabilityHours = hoursToCheck.map((hourStr) => {
      const segmentMinutes = Array.from({ length: segmentsPerHour }, (_, i) => String(i * periodMinutes).padStart(2, '0'));
      const segmentTimes = segmentMinutes.map(m => `${hourStr}:${m}`);
      const bookedCount = segmentTimes.filter(time => appointmentTimes.has(time)).length;
      const capacity = segmentsPerHour;
      const isFull = bookedCount >= capacity;
      
      // Labels (IST hour window)
      const labelFrom = `${hourStr}:00`;
      const nextHour = String((Number(hourStr) + 1)).padStart(2, '0');
      const labelTo = `${nextHour}:00`;
      
      return { hour: hourStr, capacity, bookedCount, isFull, labelFrom, labelTo };
    });

    // Return combined response
    res.status(200).json({
      slots: publishedSlots,
      availability: {
        periodMinutes,
        hours: availabilityHours
      },
      availableTimes
    });
  } catch (error) {
    console.error('[slots-availability] error', error);
    res.status(500).json({ message: 'Failed to fetch slots and availability.' });
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

    // --- Enforce doctor time-off blackout windows ---
    if (profileForDoctor?.id) {
      const blackout = await prisma.doctorTimeOff.findFirst({
        where: {
          doctorProfileId: profileForDoctor.id,
          start: { lte: requestedDateTime },
          end: { gte: requestedDateTime },
        }
      });
      if (blackout) {
        return res.status(409).json({ message: 'Doctor is unavailable during the selected time.' });
      }
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

// Optimized slots endpoint (public) with optional filtering by doctorId and date (IST)
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
    
    // Optimize query with select only needed fields
    const slots = await prisma.slot.findMany({ 
      where, 
      select: {
        id: true,
        doctorId: true,
        date: true,
        time: true,
        status: true
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }] 
    });
    
    console.info('[slots] optimized query', { doctorId, date, count: slots.length });
    res.status(200).json(slots);
  } catch (error) {
    console.error('[slots] error', error);
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
// Optional: ?doctorId=123 to fetch doctor-scoped slot admin within this hospital
app.get('/api/hospital/slot-admin', authMiddleware, hospitalAdminMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  const doctorIdParam = req.query.doctorId as string | undefined;
  const doctorId = doctorIdParam ? Number(doctorIdParam) : undefined;
  try {
    const hospital = await prisma.hospital.findFirst({ where: { adminId: user.userId } });
    if (!hospital) return res.status(404).json({ message: 'Hospital not found for admin.' });

    // If doctorId requested, validate membership and fetch doctor-scoped slot admin
    if (doctorId && Number.isInteger(doctorId) && doctorId > 0) {
      const membership = await prisma.hospitalDoctor.findFirst({ where: { hospitalId: hospital.id, doctorId } });
      if (!membership) return res.status(404).json({ message: 'Doctor is not linked to your hospital.' });
      const profile = await prisma.doctorProfile.findUnique({ where: { userId: doctorId } });
      if (!profile) return res.status(404).json({ message: 'Doctor profile not found.' });
      const slotAdmin = await prisma.user.findFirst({ where: { role: 'SLOT_ADMIN', managedDoctorProfileId: profile.id } });
      if (!slotAdmin) return res.status(200).json({ slotAdmin: null });
      return res.status(200).json({ slotAdmin: { id: slotAdmin.id, email: slotAdmin.email } });
    }

    // Default: hospital-level slot admin
    const slotAdmin = await prisma.user.findFirst({ where: { role: 'SLOT_ADMIN', managedHospitalId: hospital.id } });
    if (!slotAdmin) return res.status(200).json({ slotAdmin: null });
    return res.status(200).json({ slotAdmin: { id: slotAdmin.id, email: slotAdmin.email } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching slot admin.' });
  }
});

// Create or update slot admin for hospital admin
// Optional body: { doctorId } to create/update a doctor-scoped slot admin within this hospital
app.post('/api/hospital/slot-admin', authMiddleware, hospitalAdminMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  const { email, password, doctorId: doctorIdRaw } = req.body as { email: string; password: string; doctorId?: number };
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });
  const doctorId = doctorIdRaw !== undefined ? Number(doctorIdRaw) : undefined;
  try {
    const hospital = await prisma.hospital.findFirst({ where: { adminId: user.userId } });
    if (!hospital) return res.status(404).json({ message: 'Hospital not found for admin.' });
    const hashed = await bcrypt.hash(password, 10);

    // Doctor-scoped slot admin if doctorId provided
    if (doctorId && Number.isInteger(doctorId) && doctorId > 0) {
      const membership = await prisma.hospitalDoctor.findFirst({ where: { hospitalId: hospital.id, doctorId } });
      if (!membership) return res.status(404).json({ message: 'Doctor is not linked to your hospital.' });
      const profile = await prisma.doctorProfile.findUnique({ where: { userId: doctorId } });
      if (!profile) return res.status(404).json({ message: 'Doctor profile not found.' });

      const existing = await prisma.user.findFirst({ where: { role: 'SLOT_ADMIN', managedDoctorProfileId: profile.id } });
      if (existing) {
        const updated = await prisma.user.update({ where: { id: existing.id }, data: { email, password: hashed } });
        return res.status(200).json({ message: 'Slot admin updated', slotAdmin: { id: updated.id, email: updated.email } });
      } else {
        const created = await prisma.user.create({ data: { email, password: hashed, role: 'SLOT_ADMIN', managedDoctorProfile: { connect: { id: profile.id } } } });
        return res.status(201).json({ message: 'Slot admin created', slotAdmin: { id: created.id, email: created.email } });
      }
    }

    // Default: hospital-level slot admin
    const existing = await prisma.user.findFirst({ where: { role: 'SLOT_ADMIN', managedHospitalId: hospital.id } });
    if (existing) {
      const updated = await prisma.user.update({ where: { id: existing.id }, data: { email, password: hashed } });
      return res.status(200).json({ message: 'Slot admin updated', slotAdmin: { id: updated.id, email: updated.email } });
    } else {
      const created = await prisma.user.create({ data: { email, password: hashed, role: 'SLOT_ADMIN', managedHospital: { connect: { id: hospital.id } } } });
      return res.status(201).json({ message: 'Slot admin created', slotAdmin: { id: created.id, email: created.email } });
    }
  } catch (error: any) {
    if (error?.code === 'P2002') {
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

// ==============================================
// Slot Admin appointments listing
// ==============================================
app.get('/api/slot-admin/appointments', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role !== 'SLOT_ADMIN') {
    return res.status(403).json({ message: 'Forbidden: Only Slot Admins can view these appointments.' });
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
    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        doctor: { select: { id: true, email: true } },
        patient: { select: { id: true, email: true } },
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }]
    });
    return res.status(200).json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching appointments.' });
  }
});

// Update appointment status within slot admin scope
app.patch('/api/slot-admin/appointments/:appointmentId/status', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role !== 'SLOT_ADMIN') {
    return res.status(403).json({ message: 'Forbidden: Only Slot Admins can update appointments.' });
  }
  const appointmentId = Number(req.params.appointmentId);
  const { status } = req.body as { status?: string };
  const allowed = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];
  if (!Number.isInteger(appointmentId) || appointmentId <= 0) return res.status(400).json({ message: 'Invalid appointmentId.' });
  if (!status || !allowed.includes(status)) return res.status(400).json({ message: 'Invalid status value.' });
  try {
    const admin = await prisma.user.findUnique({ where: { id: user.userId }, select: { managedDoctorProfileId: true, managedHospitalId: true } });
    if (!admin) return res.status(401).json({ message: 'User not found.' });

    let doctorIds: number[] = [];
    if (admin.managedDoctorProfileId) {
      const profile = await prisma.doctorProfile.findUnique({ where: { id: admin.managedDoctorProfileId } });
      if (profile) doctorIds = [profile.userId];
    } else if (admin.managedHospitalId) {
      const memberships = await prisma.hospitalDoctor.findMany({ where: { hospitalId: admin.managedHospitalId } });
      doctorIds = memberships.map((m: any) => m.doctorId);
    }

    const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment || (doctorIds.length && !doctorIds.includes(appointment.doctorId))) {
      return res.status(404).json({ message: 'Appointment not found within your management scope.' });
    }

    const updated = await prisma.appointment.update({ where: { id: appointmentId }, data: { status } });
    return res.status(200).json({ message: 'Appointment status updated', appointment: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while updating appointment.' });
  }
});

// Cancel appointment within slot admin scope
app.patch('/api/slot-admin/appointments/:appointmentId/cancel', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role !== 'SLOT_ADMIN') {
    return res.status(403).json({ message: 'Forbidden: Only Slot Admins can cancel appointments.' });
  }
  const appointmentId = Number(req.params.appointmentId);
  const { reason } = req.body as { reason?: string };
  if (!Number.isInteger(appointmentId) || appointmentId <= 0) return res.status(400).json({ message: 'Invalid appointmentId.' });
  try {
    const admin = await prisma.user.findUnique({ where: { id: user.userId }, select: { managedDoctorProfileId: true, managedHospitalId: true } });
    if (!admin) return res.status(401).json({ message: 'User not found.' });

    let doctorIds: number[] = [];
    if (admin.managedDoctorProfileId) {
      const profile = await prisma.doctorProfile.findUnique({ where: { id: admin.managedDoctorProfileId } });
      if (profile) doctorIds = [profile.userId];
    } else if (admin.managedHospitalId) {
      const memberships = await prisma.hospitalDoctor.findMany({ where: { hospitalId: admin.managedHospitalId } });
      doctorIds = memberships.map((m: any) => m.doctorId);
    }

    const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment || (doctorIds.length && !doctorIds.includes(appointment.doctorId))) {
      return res.status(404).json({ message: 'Appointment not found within your management scope.' });
    }

    const updated = await prisma.appointment.update({ where: { id: appointmentId }, data: { status: 'CANCELLED', reason } });
    return res.status(200).json({ message: 'Appointment cancelled', appointment: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while cancelling appointment.' });
  }
});

// ==============================================
// Doctor Time-Off Management (Hospital Admin & Slot Admin)
// ==============================================

// List time-off windows for a doctor within hospital admin scope
app.get('/api/hospital/doctor/:doctorId/time-off', authMiddleware, hospitalAdminMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  const doctorId = Number(req.params.doctorId);
  if (!Number.isInteger(doctorId) || doctorId <= 0) return res.status(400).json({ message: 'Invalid doctorId.' });
  try {
    const hospital = await prisma.hospital.findFirst({ where: { adminId: user.userId } });
    if (!hospital) return res.status(404).json({ message: 'Hospital not found for admin.' });
    const membership = await prisma.hospitalDoctor.findFirst({ where: { hospitalId: hospital.id, doctorId } });
    if (!membership) return res.status(404).json({ message: 'Doctor is not linked to your hospital.' });
    const profile = await prisma.doctorProfile.findUnique({ where: { userId: doctorId } });
    if (!profile) return res.status(404).json({ message: 'Doctor profile not found.' });
    const offs = await prisma.doctorTimeOff.findMany({ where: { doctorProfileId: profile.id }, orderBy: { start: 'asc' } });
    return res.status(200).json(offs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching time-off.' });
  }
});

// Create or update (upsert) a time-off window for a doctor within hospital admin scope
app.post('/api/hospital/doctor/:doctorId/time-off', authMiddleware, hospitalAdminMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  const doctorId = Number(req.params.doctorId);
  const { id, start, end, reason } = req.body as { id?: number; start: string; end: string; reason?: string };
  if (!Number.isInteger(doctorId) || doctorId <= 0) return res.status(400).json({ message: 'Invalid doctorId.' });
  if (!start || !end) return res.status(400).json({ message: 'start and end are required.' });
  const startDt = new Date(start);
  const endDt = new Date(end);
  if (isNaN(startDt.getTime()) || isNaN(endDt.getTime()) || startDt >= endDt) return res.status(400).json({ message: 'Invalid time-off range.' });
  try {
    const hospital = await prisma.hospital.findFirst({ where: { adminId: user.userId } });
    if (!hospital) return res.status(404).json({ message: 'Hospital not found for admin.' });
    const membership = await prisma.hospitalDoctor.findFirst({ where: { hospitalId: hospital.id, doctorId } });
    if (!membership) return res.status(404).json({ message: 'Doctor is not linked to your hospital.' });
    const profile = await prisma.doctorProfile.findUnique({ where: { userId: doctorId } });
    if (!profile) return res.status(404).json({ message: 'Doctor profile not found.' });

    let result;
    if (id && Number.isInteger(Number(id))) {
      result = await prisma.doctorTimeOff.update({ where: { id: Number(id) }, data: { start: startDt, end: endDt, reason } });
    } else {
      result = await prisma.doctorTimeOff.create({ data: { doctorProfileId: profile.id, start: startDt, end: endDt, reason } });
    }
    return res.status(200).json({ message: 'Time-off saved', timeOff: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while saving time-off.' });
  }
});

// Delete a time-off window for a doctor within hospital admin scope
app.delete('/api/hospital/doctor/:doctorId/time-off/:id', authMiddleware, hospitalAdminMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  const doctorId = Number(req.params.doctorId);
  const id = Number(req.params.id);
  if (!Number.isInteger(doctorId) || doctorId <= 0 || !Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'Invalid parameters.' });
  try {
    const hospital = await prisma.hospital.findFirst({ where: { adminId: user.userId } });
    if (!hospital) return res.status(404).json({ message: 'Hospital not found for admin.' });
    const membership = await prisma.hospitalDoctor.findFirst({ where: { hospitalId: hospital.id, doctorId } });
    if (!membership) return res.status(404).json({ message: 'Doctor is not linked to your hospital.' });
    const deleted = await prisma.doctorTimeOff.delete({ where: { id } });
    return res.status(200).json({ message: 'Time-off deleted', timeOff: deleted });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while deleting time-off.' });
  }
});

// Slot Admin: list time-off for managed doctor profile
app.get('/api/slot-admin/time-off', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role !== 'SLOT_ADMIN') return res.status(403).json({ message: 'Forbidden' });
  try {
    const admin = await prisma.user.findUnique({ where: { id: user.userId }, select: { managedDoctorProfileId: true, managedHospitalId: true } });
    if (!admin) return res.status(401).json({ message: 'User not found.' });

    // Determine target doctorProfileId: direct doctor scope or via query for hospital scope
    let targetProfileId: number | null = null;
    if (admin.managedDoctorProfileId) {
      targetProfileId = admin.managedDoctorProfileId;
    } else if (admin.managedHospitalId) {
      const raw = (req.query as any)?.doctorProfileId;
      const doctorProfileId = raw !== undefined ? Number(raw) : NaN;
      if (!Number.isInteger(doctorProfileId) || doctorProfileId <= 0) {
        return res.status(200).json([]);
      }
      const profile = await prisma.doctorProfile.findUnique({ where: { id: doctorProfileId } });
      if (!profile) return res.status(404).json({ message: 'Doctor profile not found.' });
      const membership = await prisma.hospitalDoctor.findFirst({ where: { hospitalId: admin.managedHospitalId, doctorId: profile.userId } });
      if (!membership) return res.status(403).json({ message: 'Doctor is not in your hospital scope.' });
      targetProfileId = doctorProfileId;
    }

    if (!targetProfileId) return res.status(200).json([]);

    // Prefer Prisma delegate; if unavailable (client not regenerated), fall back to raw query
    const delegate = (prisma as any).doctorTimeOff;
    let offs: any[] = [];
    if (delegate && typeof delegate.findMany === 'function') {
      offs = await delegate.findMany({ where: { doctorProfileId: targetProfileId }, orderBy: { start: 'asc' } });
    } else {
      offs = await prisma.$queryRaw<any[]>`
        SELECT id, "doctorProfileId", "start", "end", "reason", "createdAt", "updatedAt"
        FROM "DoctorTimeOff"
        WHERE "doctorProfileId" = ${targetProfileId}
        ORDER BY "start" ASC
      `;
    }
    return res.status(200).json(offs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch time-off.' });
  }
});

// Slot Admin: create time-off for managed doctor profile
app.post('/api/slot-admin/time-off', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role !== 'SLOT_ADMIN') return res.status(403).json({ message: 'Forbidden' });
  const { start, end, reason, doctorProfileId: doctorProfileIdRaw } = req.body as { start: string; end: string; reason?: string; doctorProfileId?: number };
  if (!start || !end) return res.status(400).json({ message: 'start and end are required.' });
  const startDt = new Date(start);
  const endDt = new Date(end);
  if (isNaN(startDt.getTime()) || isNaN(endDt.getTime()) || startDt >= endDt) return res.status(400).json({ message: 'Invalid time-off range.' });
  try {
    const admin = await prisma.user.findUnique({ where: { id: user.userId }, select: { managedDoctorProfileId: true, managedHospitalId: true } });
    if (!admin) return res.status(401).json({ message: 'User not found.' });

    let targetProfileId: number | null = null;
    if (admin.managedDoctorProfileId) {
      targetProfileId = admin.managedDoctorProfileId;
    } else if (admin.managedHospitalId) {
      const doctorProfileId = doctorProfileIdRaw !== undefined ? Number(doctorProfileIdRaw) : NaN;
      if (!Number.isInteger(doctorProfileId) || doctorProfileId <= 0) return res.status(400).json({ message: 'doctorProfileId is required for hospital-managed slot admins.' });
      const profile = await prisma.doctorProfile.findUnique({ where: { id: doctorProfileId } });
      if (!profile) return res.status(404).json({ message: 'Doctor profile not found.' });
      const membership = await prisma.hospitalDoctor.findFirst({ where: { hospitalId: admin.managedHospitalId, doctorId: profile.userId } });
      if (!membership) return res.status(403).json({ message: 'Doctor is not in your hospital scope.' });
      targetProfileId = doctorProfileId;
    }

    if (!targetProfileId) return res.status(403).json({ message: 'Management scope not configured.' });

    const delegate = (prisma as any).doctorTimeOff;
    if (delegate && typeof delegate.create === 'function') {
      const created = await delegate.create({ data: { doctorProfileId: targetProfileId, start: startDt, end: endDt, reason } });
      return res.status(201).json({ message: 'Time-off created', timeOff: created });
    } else {
      const rows = await prisma.$queryRaw<any[]>`
        INSERT INTO "DoctorTimeOff" ("doctorProfileId", "start", "end", "reason")
        VALUES (${targetProfileId}, ${startDt}, ${endDt}, ${reason ?? null})
        RETURNING id, "doctorProfileId", "start", "end", "reason", "createdAt", "updatedAt"
      `;
      const created = rows[0];
      return res.status(201).json({ message: 'Time-off created', timeOff: created });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create time-off.' });
  }
});

// Slot Admin: delete time-off for managed doctor profile
app.delete('/api/slot-admin/time-off/:id', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role !== 'SLOT_ADMIN') return res.status(403).json({ message: 'Forbidden' });
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'Invalid id.' });
  try {
    const admin = await prisma.user.findUnique({ where: { id: user.userId }, select: { managedDoctorProfileId: true, managedHospitalId: true } });
    if (!admin) return res.status(401).json({ message: 'User not found.' });

    // Fetch the existing record to validate scope
    const existingDelegate = (prisma as any).doctorTimeOff;
    let existing: any | null = null;
    if (existingDelegate && typeof existingDelegate.findUnique === 'function') {
      existing = await existingDelegate.findUnique({ where: { id } });
    } else {
      const rows = await prisma.$queryRaw<any[]>`
        SELECT id, "doctorProfileId" FROM "DoctorTimeOff" WHERE id = ${id}
      `;
      existing = rows[0] || null;
    }
    if (!existing) return res.status(404).json({ message: 'Time-off not found.' });

    let allowed = false;
    if (admin.managedDoctorProfileId && existing.doctorProfileId === admin.managedDoctorProfileId) {
      allowed = true;
    } else if (admin.managedHospitalId) {
      const profile = await prisma.doctorProfile.findUnique({ where: { id: existing.doctorProfileId } });
      if (profile) {
        const membership = await prisma.hospitalDoctor.findFirst({ where: { hospitalId: admin.managedHospitalId, doctorId: profile.userId } });
        if (membership) allowed = true;
      }
    }
    if (!allowed) return res.status(403).json({ message: 'Time-off not within your scope.' });

    const delegate = (prisma as any).doctorTimeOff;
    if (delegate && typeof delegate.delete === 'function') {
      const deleted = await delegate.delete({ where: { id } });
      return res.status(200).json({ message: 'Time-off deleted', timeOff: deleted });
    } else {
      const rows = await prisma.$queryRaw<any[]>`
        DELETE FROM "DoctorTimeOff"
        WHERE id = ${id}
        RETURNING id, "doctorProfileId", "start", "end", "reason", "createdAt", "updatedAt"
      `;
      const deleted = rows[0];
      return res.status(200).json({ message: 'Time-off deleted', timeOff: deleted });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete time-off.' });
  }
});

// Slot Admin: update an existing time-off window for managed doctor profile
app.patch('/api/slot-admin/time-off/:id', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role !== 'SLOT_ADMIN') return res.status(403).json({ message: 'Forbidden' });
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'Invalid id.' });
  const { start, end, reason } = req.body as { start?: string; end?: string; reason?: string };
  if (!start || !end) return res.status(400).json({ message: 'start and end are required.' });
  const startDt = new Date(start);
  const endDt = new Date(end);
  if (isNaN(startDt.getTime()) || isNaN(endDt.getTime()) || startDt >= endDt) return res.status(400).json({ message: 'Invalid time-off range.' });
  try {
    const admin = await prisma.user.findUnique({ where: { id: user.userId }, select: { managedDoctorProfileId: true, managedHospitalId: true } });
    if (!admin) return res.status(401).json({ message: 'User not found.' });
    // Ensure the time-off belongs to this managed doctor profile or hospital scope
    const delegate = (prisma as any).doctorTimeOff;
    // Load existing record to validate scope
    let existing: any | null = null;
    if (delegate && typeof delegate.findUnique === 'function') {
      existing = await delegate.findUnique({ where: { id } });
    } else {
      const rows = await prisma.$queryRaw<any[]>`
        SELECT id, "doctorProfileId" FROM "DoctorTimeOff" WHERE id = ${id}
      `;
      existing = rows[0] || null;
    }
    if (!existing) return res.status(404).json({ message: 'Time-off not found.' });

    let allowed = false;
    if (admin.managedDoctorProfileId && existing.doctorProfileId === admin.managedDoctorProfileId) {
      allowed = true;
    } else if (admin.managedHospitalId) {
      const profile = await prisma.doctorProfile.findUnique({ where: { id: existing.doctorProfileId } });
      if (profile) {
        const membership = await prisma.hospitalDoctor.findFirst({ where: { hospitalId: admin.managedHospitalId, doctorId: profile.userId } });
        if (membership) allowed = true;
      }
    }
    if (!allowed) return res.status(403).json({ message: 'Time-off not within your scope.' });

    if (delegate && typeof delegate.update === 'function') {
      const updated = await delegate.update({ where: { id }, data: { start: startDt, end: endDt, reason } });
      return res.status(200).json({ message: 'Time-off updated', timeOff: updated });
    } else {
      const rows = await prisma.$queryRaw<any[]>`
        UPDATE "DoctorTimeOff"
        SET "start" = ${startDt}, "end" = ${endDt}, "reason" = ${reason ?? null}, "updatedAt" = NOW()
        WHERE id = ${id}
        RETURNING id, "doctorProfileId", "start", "end", "reason", "createdAt", "updatedAt"
      `;
      const updated = rows[0];
      return res.status(200).json({ message: 'Time-off updated', timeOff: updated });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update time-off.' });
  }
});

// ==============================================
// Slot Admin: Working Hours management
// ==============================================
app.get('/api/slot-admin/working-hours', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role !== 'SLOT_ADMIN') return res.status(403).json({ message: 'Forbidden' });
  try {
    const admin = await prisma.user.findUnique({ where: { id: user.userId }, select: { managedDoctorProfileId: true, managedHospitalId: true } });
    if (!admin) return res.status(401).json({ message: 'User not found.' });

    let doctorProfileId: number | null = null;
    if (admin.managedDoctorProfileId) {
      doctorProfileId = admin.managedDoctorProfileId;
    } else if (admin.managedHospitalId) {
      const rawDoctorId = (req.query as any)?.doctorId;
      const doctorId = rawDoctorId !== undefined ? Number(rawDoctorId) : NaN;
      if (!Number.isInteger(doctorId) || doctorId <= 0) return res.status(400).json({ message: 'doctorId is required for hospital-managed slot admins.' });
      const membership = await prisma.hospitalDoctor.findFirst({ where: { hospitalId: admin.managedHospitalId, doctorId } });
      if (!membership) return res.status(404).json({ message: 'Doctor is not linked to your hospital.' });
      const profile = await prisma.doctorProfile.findUnique({ where: { userId: doctorId } });
      if (!profile) return res.status(404).json({ message: 'Doctor profile not found.' });
      doctorProfileId = profile.id;
    }

    if (!doctorProfileId) return res.status(404).json({ message: 'No doctor scope found.' });
    const hours = await prisma.doctorWorkingHours.findMany({ where: { doctorProfileId }, orderBy: { dayOfWeek: 'asc' } });
    return res.status(200).json(hours);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching working hours.' });
  }
});

app.put('/api/slot-admin/working-hours', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role !== 'SLOT_ADMIN') return res.status(403).json({ message: 'Forbidden' });
  const payload = req.body as { doctorId?: number; hours?: Array<{ dayOfWeek: number; startTime: string; endTime: string }> };
  if (!payload || !Array.isArray(payload.hours)) {
    return res.status(400).json({ message: 'Invalid payload. Expecting { hours: Array<{ dayOfWeek, startTime, endTime }>, doctorId? }' });
  }
  try {
    const admin = await prisma.user.findUnique({ where: { id: user.userId }, select: { managedDoctorProfileId: true, managedHospitalId: true } });
    if (!admin) return res.status(401).json({ message: 'User not found.' });

    let doctorProfileId: number | null = null;
    if (admin.managedDoctorProfileId) {
      doctorProfileId = admin.managedDoctorProfileId;
    } else if (admin.managedHospitalId) {
      const doctorId = Number(payload?.doctorId);
      if (!Number.isInteger(doctorId) || doctorId <= 0) return res.status(400).json({ message: 'doctorId is required for hospital-managed slot admins.' });
      const membership = await prisma.hospitalDoctor.findFirst({ where: { hospitalId: admin.managedHospitalId, doctorId } });
      if (!membership) return res.status(404).json({ message: 'Doctor is not linked to your hospital.' });
      const profile = await prisma.doctorProfile.findUnique({ where: { userId: doctorId } });
      if (!profile) return res.status(404).json({ message: 'Doctor profile not found.' });
      doctorProfileId = profile.id;
    }

    if (!doctorProfileId) return res.status(404).json({ message: 'No doctor scope found.' });

    await prisma.$transaction(async (tx) => {
      await tx.doctorWorkingHours.deleteMany({ where: { doctorProfileId: doctorProfileId! } });
      for (const h of payload.hours!) {
        if (typeof h.dayOfWeek !== 'number' || h.dayOfWeek < 0 || h.dayOfWeek > 6) continue;
        await tx.doctorWorkingHours.create({ data: { doctorProfileId: doctorProfileId!, dayOfWeek: h.dayOfWeek, startTime: h.startTime, endTime: h.endTime } });
      }
    });

    const refreshed = await prisma.doctorWorkingHours.findMany({ where: { doctorProfileId }, orderBy: { dayOfWeek: 'asc' } });
    return res.status(200).json(refreshed);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while updating working hours.' });
  }
});

// ==============================================
// Slot Admin: doctor/hospital context for header display
// ==============================================
app.get('/api/slot-admin/context', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role !== 'SLOT_ADMIN') return res.status(403).json({ message: 'Forbidden' });
  try {
    const admin = await prisma.user.findUnique({ where: { id: user.userId }, select: { managedDoctorProfileId: true, managedHospitalId: true } });
    if (!admin) return res.status(401).json({ message: 'User not found.' });

    let doctor: { id: number; email: string; doctorProfileId: number } | null = null;
    let hospital: { id: number; name: string } | null = null;

    if (admin.managedDoctorProfileId) {
      const profile = await prisma.doctorProfile.findUnique({ where: { id: admin.managedDoctorProfileId } });
      if (profile) {
        const docUser = await prisma.user.findUnique({ where: { id: profile.userId }, select: { id: true, email: true } });
        if (docUser) doctor = { id: docUser.id, email: docUser.email, doctorProfileId: profile.id };
        // Try to resolve hospital via membership
        const membership = await prisma.hospitalDoctor.findFirst({ where: { doctorId: profile.userId }, include: { hospital: true } });
        if (membership?.hospital) hospital = { id: membership.hospital.id, name: membership.hospital.name };
      }
    }

    if (!hospital && admin.managedHospitalId) {
      const hosp = await prisma.hospital.findUnique({ where: { id: admin.managedHospitalId }, select: { id: true, name: true } });
      if (hosp) hospital = { id: hosp.id, name: hosp.name };
    }

    return res.status(200).json({ doctor, hospital });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch context.' });
  }
});

// List doctors within the Slot Admin's management scope
app.get('/api/slot-admin/doctors', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role !== 'SLOT_ADMIN') return res.status(403).json({ message: 'Forbidden' });
  try {
    const admin = await prisma.user.findUnique({ where: { id: user.userId }, select: { managedDoctorProfileId: true, managedHospitalId: true } });
    if (!admin) return res.status(401).json({ message: 'User not found.' });

    let doctors: Array<{ id: number; email: string; doctorProfileId: number }> = [];
    if (admin.managedDoctorProfileId) {
      const profile = await prisma.doctorProfile.findUnique({ where: { id: admin.managedDoctorProfileId } });
      if (profile) {
        const docUser = await prisma.user.findUnique({ where: { id: profile.userId }, select: { id: true, email: true } });
        if (docUser) doctors.push({ id: docUser.id, email: docUser.email, doctorProfileId: profile.id });
      }
    } else if (admin.managedHospitalId) {
      const memberships = await prisma.hospitalDoctor.findMany({ where: { hospitalId: admin.managedHospitalId } });
      for (const m of memberships) {
        const profile = await prisma.doctorProfile.findUnique({ where: { userId: m.doctorId } });
        if (!profile) continue;
        const docUser = await prisma.user.findUnique({ where: { id: m.doctorId }, select: { id: true, email: true } });
        if (docUser) doctors.push({ id: docUser.id, email: docUser.email, doctorProfileId: profile.id });
      }
    }
    return res.status(200).json(doctors);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch doctors.' });
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

// Analytics route disabled for now