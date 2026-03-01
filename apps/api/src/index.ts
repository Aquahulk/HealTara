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
import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';                                      // Password hashing for security
import jwt from 'jsonwebtoken';                                     // JWT tokens for user authentication
import cors from 'cors';                                            // Allows frontend to communicate with API
import { authMiddleware } from './middleware/authMiddleware';        // Custom middleware to verify user tokens
import multer from 'multer';
import path from 'path';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { mapQueryToSpecialties, suggestFromDoctors } from './conditionSpecialtyMap';
import { incrementTokenSpecialty, getAllWeights } from './learningStore';
import { seedSuggestions, mapQueryToSeedSpecialties } from './suggestionSeeds';

// Fast in-memory caches to reduce latency on frequent searches
const DOCTORS_CACHE_MS = 60 * 1000; // refresh doctor list every 60s
let cachedDoctors: any[] = [];
let lastDoctorsFetch = 0;
async function getDoctorCandidates(prismaClient: PrismaClient): Promise<any[]> {
  const now = Date.now();
  if (cachedDoctors.length && (now - lastDoctorsFetch) < DOCTORS_CACHE_MS) {
    return cachedDoctors;
  }
  const doctors = await prismaClient.user.findMany({
    where: { role: 'DOCTOR' },
    include: { doctorProfile: true },
  });
  cachedDoctors = doctors.filter((d: any) => !!d.doctorProfile);
  lastDoctorsFetch = now;
  return cachedDoctors;
}

// Hospital caching for better performance
const HOSPITALS_CACHE_MS = 5 * 1000; // refresh hospital list every 5 seconds (was 120s)
let cachedHospitals: any[] = [];
let lastHospitalsFetch = 0;
async function getHospitalCandidates(prismaClient: PrismaClient): Promise<any[]> {
  const now = Date.now();
  if (cachedHospitals.length && (now - lastHospitalsFetch) < HOSPITALS_CACHE_MS) {
    return cachedHospitals;
  }
  console.log(`🔄 Fetching fresh hospitals from database...`);
  
  // Use raw query for efficiency with complex counts and ratings
  const hospitals = await prismaClient.$queryRaw`
    SELECT 
      h.id,
      h.name,
      h.address,
      h.city,
      h.state,
      h.phone,
      h.subdomain,
      h.profile,
      h.status,
      h."createdAt",
      h."updatedAt",
      h."adminId",
      (SELECT COUNT(*)::int FROM "Department" WHERE "hospitalId" = h.id) as dept_count,
      (SELECT COUNT(*)::int FROM "HospitalDoctor" WHERE "hospitalId" = h.id) as doc_count,
      (SELECT COUNT(*)::int FROM "Appointment" WHERE "doctorId" IN (SELECT "doctorId" FROM "HospitalDoctor" WHERE "hospitalId" = h.id)) as appt_count,
      (SELECT COUNT(*)::int FROM comments WHERE entity_type = 'hospital' AND entity_id = CAST(h.id AS TEXT) AND is_active = true) as review_count,
      (SELECT COALESCE(AVG(rating), 0)::float FROM comments WHERE entity_type = 'hospital' AND entity_id = CAST(h.id AS TEXT) AND is_active = true AND rating IS NOT NULL) as avg_rating
    FROM "Hospital" h
    WHERE h.status = 'ACTIVE'
    ORDER BY h.id ASC
  `;

  // Format to match expected frontend structure
  const formattedHospitals = (hospitals as any[]).map(h => ({
    ...h,
    _count: {
      departments: h.dept_count || 0,
      doctors: h.doc_count || 0,
      appointments: h.appt_count || 0,
      reviews: h.review_count || 0
    },
    rating: h.avg_rating || 0,
    totalReviews: h.review_count || 0,
    profile: h.profile || { general: { logoUrl: null, description: "Healthcare facility" } }
  }));

  cachedHospitals = formattedHospitals;
  lastHospitalsFetch = now;
  console.log(`✅ Cached ${formattedHospitals.length} hospitals: ${formattedHospitals.map(h => h.name).join(', ')}`);
  return cachedHospitals;
}

const SEARCH_CACHE_MS = 30 * 1000;
const searchCache = new Map<string, { ts: number; result: any }>();

const AVAIL_CACHE_MS = 2 * 1000;
const availabilityCache = new Map<string, { ts: number; periodMinutes: number; hours: Array<{ hour: string; labelFrom: string; labelTo: string; capacity: number; bookedCount: number; isFull: boolean }> }>();

function dayWindowUtc(dateStr: string) {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(`${dateStr}T23:59:59.999Z`);
  return { start, end };
}

async function resolveDoctorCapacity(prismaClient: PrismaClient, doctorId: number) {
  const profile = await prismaClient.doctorProfile.findUnique({ where: { userId: doctorId }, select: { slotPeriodMinutes: true } });
  const periodMinutes = profile?.slotPeriodMinutes ?? 15;
  const capacity = Math.max(1, Math.floor(60 / periodMinutes));
  return { periodMinutes, capacity };
}

async function countBookedPerHour(prismaClient: PrismaClient, doctorId: number, start: Date, end: Date) {
  const appts = await prismaClient.appointment.findMany({
    where: { doctorId, status: { not: 'CANCELLED' }, date: { gte: start, lte: end } },
    select: { time: true },
  });
  const counts: Record<number, number> = {};
  for (const a of appts) {
    const h = Number(String(a.time).slice(0, 2));
    if (Number.isFinite(h)) counts[h] = (counts[h] || 0) + 1;
  }
  return counts;
}

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

// Initialize HTTP server and Socket.IO for realtime WebSocket updates
const server = createServer(app);
const io = new SocketIOServer(server, { cors: { origin: '*' } });
io.on('connection', (socket) => {
  socket.on('join-hospital', (hospitalId: number) => {
    if (Number.isFinite(hospitalId)) socket.join(`hospital:${hospitalId}`);
  });
  socket.on('join-doctor', (doctorId: number) => {
    if (Number.isFinite(doctorId)) socket.join(`doctor:${doctorId}`);
  });
  socket.on('join-patient', (patientId: number) => {
    if (Number.isFinite(patientId)) socket.join(`patient:${patientId}`);
  });
});

// ============================================================================
// ⚙️ MIDDLEWARE SETUP - Functions that run before your routes
// ============================================================================
app.use(cors());                                           // Allow cross-origin requests (frontend ↔ backend)
app.use(express.json({ limit: '50mb' }));                   // Parse JSON request bodies with increased limit
app.use(express.urlencoded({ limit: '50mb', extended: true })); // Parse URL-encoded bodies with increased limit

// ============================================================================
// 🩺 HEALTH CHECK - Keep the server alive
// ============================================================================
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Static file serving for uploads (logos, photos)
const uploadsDir = path.resolve(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsDir));

// --- SSE: Hospital & Patient appointment events ---
// Maintain per-hospital and per-patient client sets for real-time updates
interface SseClient { res: Response; heartbeat: NodeJS.Timeout }
const hospitalSseClients = new Map<number, Set<SseClient>>();
const patientSseClients = new Map<number, Set<SseClient>>();
const doctorSseClients = new Map<number, Set<SseClient>>();

function broadcastHospitalEvent(hospitalId: number, event: string, payload: any) {
  const set = hospitalSseClients.get(hospitalId);
  if (!set) {
    try { io.to(`hospital:${hospitalId}`).emit(event, payload); } catch (_) {}
    return;
  }
  const data = JSON.stringify(payload);
  for (const client of set) {
    try {
      client.res.write(`event: ${event}\n`);
      client.res.write(`data: ${data}\n\n`);
    } catch (_) {
      // ignore broken pipe errors
    }
  }
  try { io.to(`hospital:${hospitalId}`).emit(event, payload); } catch (_) {}
}

function broadcastPatientEvent(patientId: number | undefined | null, event: string, payload: any) {
  if (!patientId) return;
  const set = patientSseClients.get(patientId);
  const data = JSON.stringify(payload);
  if (set) {
    for (const client of set) {
      try {
        client.res.write(`event: ${event}\n`);
        client.res.write(`data: ${data}\n\n`);
      } catch (_) {}
    }
  }
  try { io.to(`patient:${patientId}`).emit(event, payload); } catch (_) {}
}

function broadcastDoctorEvent(doctorId: number | undefined | null, event: string, payload: any) {
  if (!doctorId) return;
  const set = doctorSseClients.get(doctorId);
  const data = JSON.stringify(payload);
  if (set) {
    for (const client of set) {
      try {
        client.res.write(`event: ${event}\n`);
        client.res.write(`data: ${data}\n\n`);
      } catch (_) {}
    }
  }
  try { io.to(`doctor:${doctorId}`).emit(event, payload); } catch (_) {}
}

// Subscribe to hospital appointment events
app.get('/api/hospitals/:hospitalId/appointments/events', authMiddleware, (req: Request, res: Response) => {
  const hospitalId = Number(req.params.hospitalId);
  const user = req.user!;
  if (!Number.isFinite(hospitalId)) {
    return res.status(400).json({ message: 'Invalid hospitalId' });
  }
  const allowed = ['ADMIN', 'HOSPITAL_ADMIN', 'SLOT_ADMIN', 'DOCTOR', 'PATIENT'];
  if (!allowed.includes(user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  // Initial handshake
  res.write(`event: connected\n`);
  res.write(`data: ${JSON.stringify({ hospitalId })}\n\n`);
  const heartbeat = setInterval(() => {
    try { res.write(':\n\n'); } catch (_) {}
  }, 30000);
  const client: SseClient = { res, heartbeat };
  let set = hospitalSseClients.get(hospitalId);
  if (!set) { set = new Set<SseClient>(); hospitalSseClients.set(hospitalId, set); }
  set.add(client);
  req.on('close', () => {
    clearInterval(heartbeat);
    const s = hospitalSseClients.get(hospitalId);
    if (s) {
      s.delete(client);
      if (s.size === 0) hospitalSseClients.delete(hospitalId);
    }
  });
});

// Subscribe to patient appointment events
app.get('/api/patients/:patientId/appointments/events', authMiddleware, (req: Request, res: Response) => {
  const patientId = Number(req.params.patientId);
  const user = req.user!;
  if (!Number.isFinite(patientId)) {
    return res.status(400).json({ message: 'Invalid patientId' });
  }
  // Allow the patient themselves, and admins/managers/doctors
  const allowed = ['ADMIN', 'HOSPITAL_ADMIN', 'SLOT_ADMIN', 'DOCTOR', 'PATIENT'];
  if (!allowed.includes(user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  // Patients can only subscribe to their own stream
  if (user.role === 'PATIENT' && user.userId !== patientId) {
    return res.status(403).json({ message: 'Forbidden: Patients can only subscribe to their own events' });
  }
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.write(`event: connected\n`);
  res.write(`data: ${JSON.stringify({ patientId })}\n\n`);
  const heartbeat = setInterval(() => {
    try { res.write(':\n\n'); } catch (_) {}
  }, 30000);
  const client: SseClient = { res, heartbeat };
  let set = patientSseClients.get(patientId);
  if (!set) { set = new Set<SseClient>(); patientSseClients.set(patientId, set); }
  set.add(client);
  req.on('close', () => {
    clearInterval(heartbeat);
    const s = patientSseClients.get(patientId);
    if (s) {
      s.delete(client);
      if (s.size === 0) patientSseClients.delete(patientId);
    }
  });
});

// Subscribe to doctor appointment events
app.get('/api/doctors/:doctorId/appointments/events', authMiddleware, (req: Request, res: Response) => {
  const doctorId = Number(req.params.doctorId);
  const user = req.user!;
  if (!Number.isFinite(doctorId)) {
    return res.status(400).json({ message: 'Invalid doctorId' });
  }
  const allowed = ['ADMIN', 'HOSPITAL_ADMIN', 'SLOT_ADMIN', 'DOCTOR'];
  if (!allowed.includes(user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  // Doctors can only subscribe to their own stream
  if (user.role === 'DOCTOR' && user.userId !== doctorId) {
    return res.status(403).json({ message: 'Forbidden: Doctors can only subscribe to their own events' });
  }
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.write(`event: connected\n`);
  res.write(`data: ${JSON.stringify({ doctorId })}\n\n`);
  const heartbeat = setInterval(() => {
    try { res.write(':\n\n'); } catch (_) {}
  }, 30000);
  const client: SseClient = { res, heartbeat };
  let set = doctorSseClients.get(doctorId);
  if (!set) { set = new Set<SseClient>(); doctorSseClients.set(doctorId, set); }
  set.add(client);
  req.on('close', () => {
    clearInterval(heartbeat);
    const s = doctorSseClients.get(doctorId);
    if (s) {
      s.delete(client);
      if (s.size === 0) doctorSseClients.delete(doctorId);
    }
  });
});

// Multer storage configuration for file uploads
const storage = multer.diskStorage({
  destination: (req: Request, file: any, cb: any) => cb(null, uploadsDir),
  filename: (req: Request, file: any, cb: any) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    fieldSize: 10 * 1024 * 1024, // 10MB limit for form fields
  },
  fileFilter: (req: Request, file: any, cb: any) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
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
    const initialStatus = ['DOCTOR', 'HOSPITAL_ADMIN'].includes(String(role)) ? 'PENDING' : 'ACTIVE';
    const newUser = await prisma.user.create({
      data: { email, password: hashedPassword, role, status: initialStatus },
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
    const jwtSecret = process.env.JWT_SECRET || 'dev-insecure-secret';
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: '24h' }
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
    // Auto-generate slug if missing and ensure uniqueness
    const slugify = (s: string) =>
      String(s).toLowerCase()
        .replace(/[^\w\s-]/g, '') // Keep alphanumeric, spaces, and hyphens
        .replace(/\s+/g, '-') // Replace spaces with single hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
    let profileSlug = slug ? slugify(slug) : slugify(clinicName || user.email || `doctor-${user.userId}`);
    let uniqueSlug = profileSlug;
    let suffix = 0;
    while (true) {
      const exists = await prisma.doctorProfile.findUnique({ where: { slug: uniqueSlug }, select: { id: true } });
      if (!exists) break;
      suffix++;
      uniqueSlug = `${profileSlug}-${suffix}`;
    }

    const newProfile = await prisma.doctorProfile.create({
      data: {
        specialization, qualifications, experience, clinicName, clinicAddress, city, state, phone, consultationFee, slug: uniqueSlug,
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

// --- Doctor: Submit verification details ---
app.post('/api/doctor/verification', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role !== 'DOCTOR') {
    return res.status(403).json({ message: 'Forbidden: Only doctors can submit verification.' });
  }
  try {
    const { registrationNumber, phone, specialization, clinicAddress, consultationFee } = (req.body || {}) as { 
      registrationNumber?: string; 
      phone?: string; 
      specialization?: string; 
      clinicAddress?: string; 
      consultationFee?: number;
    };
    let profile = await prisma.doctorProfile.findUnique({ where: { userId: user.userId } });
    if (!profile) {
      const defaultName = `Clinic of ${user.email.split('@')[0]}`;
      profile = await prisma.doctorProfile.create({
        data: {
          userId: user.userId,
          specialization: specialization || 'General Practice',
          qualifications: '',
          experience: 0,
          clinicName: defaultName,
          clinicAddress: clinicAddress || 'Not provided',
          city: '',
          state: '',
          phone: phone || '',
          consultationFee: Number.isFinite(consultationFee as number) ? Number(consultationFee) : 0,
          registrationNumber: registrationNumber || null,
          verificationSubmitted: true,
          verificationStatus: 'PENDING'
        }
      });
    } else {
      profile = await prisma.doctorProfile.update({
        where: { userId: user.userId },
        data: {
          registrationNumber: registrationNumber ?? profile.registrationNumber ?? null,
          phone: phone ?? profile.phone,
          verificationSubmitted: true,
          verificationStatus: 'PENDING'
        }
      });
    }
    await prisma.user.update({ where: { id: user.userId }, data: { status: 'PENDING' } });
    await prisma.adminAuditLog.create({
      data: { adminId: user.userId, action: 'DOCTOR_VERIFICATION_SUBMIT', entityType: 'USER', entityId: user.userId, details: registrationNumber || '' }
    }).catch(() => {});
    return res.status(200).json({ success: true, profile });
  } catch (error) {
    console.error('Doctor verification submit error:', error);
    return res.status(500).json({ message: 'Failed to submit verification' });
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
// 💾 SAVED ITEMS ENDPOINTS - Bookmark doctors & hospitals
// ============================================================================

// Save an item
app.post('/api/saved', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { entityType, entityId } = req.body;

  if (!entityType || !entityId) {
    return res.status(400).json({ message: 'entityType and entityId are required' });
  }

  try {
    const saved = await prisma.savedItem.create({
      data: {
        userId,
        entityType,
        entityId: Number(entityId)
      }
    });
    res.status(201).json(saved);
  } catch (error: any) {
    // Check for unique constraint violation (already saved)
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Item already saved' });
    }
    console.error('Error saving item:', error);
    res.status(500).json({ message: 'Failed to save item' });
  }
});

// Remove a saved item
app.delete('/api/saved', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { entityType, entityId } = req.query;

  if (!entityType || !entityId) {
    return res.status(400).json({ message: 'entityType and entityId are required' });
  }

  try {
    await prisma.savedItem.deleteMany({
      where: {
        userId,
        entityType: String(entityType),
        entityId: Number(entityId)
      }
    });
    res.status(200).json({ message: 'Item removed' });
  } catch (error) {
    console.error('Error removing saved item:', error);
    res.status(500).json({ message: 'Failed to remove saved item' });
  }
});

// Check if an item is saved
app.get('/api/saved/check', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { entityType, entityId } = req.query;

  if (!entityType || !entityId) {
    return res.status(400).json({ message: 'entityType and entityId are required' });
  }
  
  try {
    const item = await prisma.savedItem.findUnique({
      where: {
        userId_entityType_entityId: {
          userId,
          entityType: String(entityType),
          entityId: Number(entityId)
        }
      }
    });
    res.status(200).json({ saved: !!item });
  } catch (error) {
    console.error('Error checking saved status:', error);
    res.status(500).json({ message: 'Failed to check status' });
  }
});

// Get all saved items
app.get('/api/saved', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  try {
    const savedItems = await prisma.savedItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    // Enhance items with details
    const enhancedItems = await Promise.all(savedItems.map(async (item: any) => {
      let details = null;
      if (item.entityType === 'doctor') {
        const doctor = await prisma.user.findUnique({
          where: { id: item.entityId },
          include: { doctorProfile: true }
        });
        if (doctor) {
          details = {
            id: doctor.id,
            name: `Dr. ${doctor.email.split('@')[0]}`,
            email: doctor.email,
            specialization: doctor.doctorProfile?.specialization,
            image: doctor.doctorProfile?.profileImage,
            city: doctor.doctorProfile?.city,
            fee: doctor.doctorProfile?.consultationFee,
            slug: doctor.doctorProfile?.slug,
            experience: doctor.doctorProfile?.experience,
            clinicName: doctor.doctorProfile?.clinicName
          };
        }
      } else if (item.entityType === 'hospital') {
        const hospital = await prisma.hospital.findUnique({
          where: { id: item.entityId },
          include: { departments: true } // Include some departments for context
        });
        if (hospital) {
          details = {
            id: hospital.id,
            name: hospital.name,
            city: hospital.city,
            image: (hospital.profile as any)?.general?.logoUrl,
            subdomain: hospital.subdomain,
            departmentCount: hospital.departments.length
          };
        }
      }
      return { ...item, details };
    }));

    res.status(200).json(enhancedItems.filter(i => i.details));
  } catch (error) {
    console.error('Error fetching saved items:', error);
    res.status(500).json({ message: 'Failed to fetch saved items' });
  }
});

// ============================================================================
// 👤 PATIENT PROFILE - Create/Update and Fetch
// ============================================================================
// Fetch patient profile
app.get('/api/patient/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const profile = await prisma.patientProfile.findUnique({ where: { userId } });
    res.status(200).json(profile || {});
  } catch (error) {
    console.error('Error fetching patient profile:', error);
    res.status(500).json({ message: 'Failed to fetch patient profile' });
  }
});

// Create or update patient profile
app.post('/api/patient/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const {
      name,
      age,
      gender,
      phone,
      address,
      city,
      state,
      bloodGroup,
      allergies,
    } = req.body || {};

    const profile = await prisma.patientProfile.upsert({
      where: { userId },
      update: {
        name,
        age: typeof age === 'number' ? age : Number(age) || null,
        gender,
        phone,
        address,
        city,
        state,
        bloodGroup,
        allergies,
      },
      create: {
        userId,
        name,
        age: typeof age === 'number' ? age : Number(age) || null,
        gender,
        phone,
        address,
        city,
        state,
        bloodGroup,
        allergies,
      },
    });
    res.status(200).json({ success: true, profile });
  } catch (error) {
    console.error('Error saving patient profile:', error);
    res.status(500).json({ message: 'Failed to save patient profile' });
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
// --- Get All Doctors Endpoint (Public) ---
app.get('/api/doctors', async (req: Request, res: Response) => {
  try {
    const page = parseInt(String(req.query.page ?? '1'), 10);
    const pageSize = parseInt(String(req.query.pageSize ?? '30'), 10);
    const sort = String(req.query.sort ?? 'default');
    const skip = (page - 1) * pageSize;

    // Use raw query for efficient sorting and counting with ratings
    const doctorsSql = `
      SELECT 
        u.id,
        u.email,
        u.status,
        dp.id as profile_id,
        dp.specialization,
        dp.qualifications,
        dp.experience,
        dp."clinicName" as clinic_name,
        dp."clinicAddress" as clinic_address,
        dp.city,
        dp.state,
        dp.phone,
        dp."consultationFee" as consultation_fee,
        dp.slug,
        dp."profileImage" as profile_image,
        (SELECT COUNT(*)::int FROM "Appointment" WHERE "doctorId" = u.id) as appt_count,
        (SELECT COUNT(*)::int FROM comments WHERE entity_type = 'doctor' AND entity_id = CAST(u.id AS TEXT) AND is_active = true) as review_count,
        (SELECT COALESCE(AVG(rating), 0)::float FROM comments WHERE entity_type = 'doctor' AND entity_id = CAST(u.id AS TEXT) AND is_active = true AND rating IS NOT NULL) as avg_rating
      FROM "User" u
      JOIN "DoctorProfile" dp ON u.id = dp."userId"
      WHERE u.role = 'DOCTOR' AND u.status = 'ACTIVE'
      ORDER BY 
        ${sort === 'trending' ? 'appt_count DESC,' : ''}
        ${sort === 'experience' ? 'dp.experience DESC,' : ''}
        u."createdAt" DESC
      LIMIT $1 OFFSET $2
    `;

    const rows = await prisma.$queryRawUnsafe(doctorsSql, pageSize, skip);
    const totalCountRow: any[] = await prisma.$queryRaw`SELECT COUNT(*)::int as count FROM "User" WHERE role = 'DOCTOR' AND status = 'ACTIVE'`;
    const totalCount = totalCountRow[0]?.count || 0;

    const formattedDoctors = (rows as any[]).map(row => {
      const emailPrefix = row.email.split('@')[0];
      const derivedName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1).replace(/[._-]/g, ' ');
      
      return {
        id: row.id,
        email: row.email,
        status: row.status,
        name: derivedName,
        doctorProfile: {
          id: row.profile_id,
          specialization: row.specialization,
          qualifications: row.qualifications,
          experience: row.experience,
          clinicName: row.clinic_name,
          clinicAddress: row.clinic_address,
          city: row.city,
          state: row.state,
          phone: row.phone,
          consultationFee: row.consultation_fee,
          slug: row.slug,
          profileImage: row.profile_image
        },
        rating: row.avg_rating || 0,
        totalReviews: row.review_count || 0,
        _count: {
          appointments: row.appt_count || 0,
          reviews: row.review_count || 0
        }
      };
    });

    res.status(200).json({
      success: true,
      data: formattedDoctors,
      count: totalCount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An error occurred while fetching doctors.' });
  }
});

async function ensureCommentsSchema() {
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "public"."comments" (
    id SERIAL PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    user_id INTEGER,
    parent_id INTEGER,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    rating INTEGER,
    comment TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "public"."comment_reactions" (
    id SERIAL PRIMARY KEY,
    comment_id INTEGER NOT NULL,
    user_id INTEGER,
    reaction_type TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await prisma.$executeRawUnsafe(`DO $$ BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_comment_reaction ON "public"."comment_reactions"(comment_id, user_id, reaction_type);
  EXCEPTION WHEN others THEN NULL; END $$;`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_comments_entity ON "public"."comments"(entity_type, entity_id, is_active, created_at)`);
}

app.get('/api/comments', async (req: Request, res: Response) => {
  try {
    await ensureCommentsSchema();
    const entityType = String(req.query.entityType || '');
    const entityIdRaw = String(req.query.entityId || '');
    const page = parseInt(String(req.query.page || '1'), 10);
    const limit = parseInt(String(req.query.limit || '10'), 10);
    if (!entityType || !entityIdRaw) return res.status(400).json({ error: 'entityType and entityId are required' });
    const entityId = parseInt(entityIdRaw, 10);
    const offset = (page - 1) * limit;
    const rows = await prisma.$queryRawUnsafe(`
      SELECT 
        c.id,
        c.name,
        c.email,
        c.rating,
        c.comment,
        c.is_verified,
        c.created_at,
        c.parent_id,
        u."name" as user_name,
        null::text as user_avatar,
        (SELECT COUNT(*) FROM "public"."comments" WHERE parent_id = c.id AND is_active = true) as reply_count
      FROM "public"."comments" c
      LEFT JOIN "public"."User" u ON c.user_id = u.id
      WHERE c.entity_type = '${entityType}' AND c.entity_id = ${entityId} AND c.is_active = true
      ORDER BY c.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    const countRows: any[] = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*)::int as total FROM "public"."comments" WHERE entity_type = '${entityType}' AND entity_id = ${entityId} AND is_active = true
    `);
    const total = countRows[0]?.total ?? 0;
    return res.json({ success: true, data: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) {
    console.error('get comments error', e);
    return res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

app.post('/api/comments', async (req: Request, res: Response) => {
  try {
    await ensureCommentsSchema();
    const { entityType, entityId, userId, name, email, rating, comment, parentId = null } = req.body || {};
    
    // Validate required fields (relaxed validation for anonymous users or missing userId)
    if (!entityType || !entityId || !rating || !comment) {
      return res.status(400).json({ error: 'entityType, entityId, rating, comment are required' });
    }
    
    if (!['doctor', 'hospital'].includes(String(entityType))) return res.status(400).json({ error: 'entityType must be "doctor" or "hospital"' });
    const r = parseInt(String(rating), 10);
    if (!(r >= 1 && r <= 5)) return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    
    let finalName = name || 'Anonymous';
    let finalEmail = email || 'anonymous@example.com';
    let finalUserId = userId ? parseInt(String(userId), 10) : null;

    // If userId is provided but name/email are missing, try to fetch from DB
    if (finalUserId && (!name || !email)) {
      try {
        const u = await prisma.user.findUnique({ 
          where: { id: finalUserId }, 
          select: { email: true, name: true } 
        });
        
        if (u) {
          finalEmail = email || u.email || 'unknown@example.com';
          finalName = name || u.name || (u.email ? u.email.split('@')[0] : 'Anonymous');
        }
      } catch (e) {
        console.warn('Failed to fetch user details for comment:', e);
      }
    }
    
    // Insert using Prisma raw query
    // Note: We use parameterized queries for safety, but here we're constructing the SQL string
    // Ideally should use Prisma.sql`` but keeping consistent with existing style for now
    // Fix: Handle null parentId correctly in SQL
    const parentIdVal = parentId ? parseInt(String(parentId), 10) : 'NULL';
    const userIdVal = finalUserId ? finalUserId : 'NULL';
    
    const query = `
      INSERT INTO "public"."comments" (
        entity_type, entity_id, user_id, parent_id, name, email, rating, comment, is_verified, is_active, created_at
      )
      VALUES (
        '${entityType}', 
        ${parseInt(String(entityId), 10)}, 
        ${userIdVal}, 
        ${parentIdVal}, 
        '${finalName.replace(/'/g, "''")}', 
        '${finalEmail.replace(/'/g, "''")}', 
        ${r}, 
        '${comment.replace(/'/g, "''")}',
        true,
        true,
        NOW()
      )
      RETURNING id, name, email, rating, comment, created_at, is_verified, parent_id
    `;
    
    const rows: any[] = await prisma.$queryRawUnsafe(query);
    
    const result = rows[0];
    try {
      const idNum = parseInt(String(entityId), 10);
      if (entityType === 'hospital') {
        io.to(`hospital:${idNum}`).emit('rating:updated', { entityType, entityId: String(entityId) });
      } else if (entityType === 'doctor') {
        io.to(`doctor:${idNum}`).emit('rating:updated', { entityType, entityId: String(entityId) });
      }
      io.emit('rating:updated', { entityType, entityId: String(entityId) });
    } catch (e) {
      console.error('broadcast rating failed', e);
    }
    return res.json({ success: true, data: result, message: 'Comment posted successfully' });
  } catch (e) {
    console.error('post comment error', e);
    return res.status(500).json({ error: 'Failed to post comment' });
  }
});

app.patch('/api/comments', async (req: Request, res: Response) => {
  try {
    await ensureCommentsSchema();
    const { commentId, userId, name, email, rating, comment } = req.body || {};
    if (!commentId || !userId || !comment) return res.status(400).json({ error: 'commentId, userId, and comment are required' });
    const parentRows = await prisma.$queryRaw(`SELECT entity_type, entity_id FROM "public"."comments" WHERE id = ${parseInt(String(commentId), 10)} AND is_active = true`);
    if (parentRows.length === 0) return res.status(404).json({ error: 'Parent comment not found' });
    const { entity_type, entity_id } = parentRows[0];
    let finalName = name;
    let finalEmail = email;
    if (!finalName || !finalEmail) {
      try {
        const u = await prisma.user.findUnique({ where: { id: parseInt(String(userId), 10) }, select: { email: true } });
        const makeName = (em?: string | null) => {
          if (!em) return 'Anonymous';
          const base = String(em).split('@')[0] || '';
          return base ? base.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Anonymous';
        };
        finalEmail = finalEmail || u?.email || 'unknown@example.com';
        finalName = finalName || makeName(finalEmail);
      } catch {}
    }
    const rows = await prisma.$queryRaw(`
      INSERT INTO "public"."comments" (entity_type, entity_id, parent_id, user_id, name, email, rating, comment)
      VALUES (${String(entity_type)}, ${parseInt(String(entity_id), 10)}, ${parseInt(String(commentId), 10)}, ${parseInt(String(userId), 10)}, ${String(finalName)}, ${String(finalEmail)}, ${rating ? parseInt(String(rating), 10) : null}, ${String(comment)})
      RETURNING id, name, email, rating, comment, created_at, parent_id
    `);
    return res.json({ success: true, data: rows[0], message: 'Reply posted successfully' });
  } catch (e) {
    console.error('reply comment error', e);
    return res.status(500).json({ error: 'Failed to add reply' });
  }
});

app.put('/api/comments', async (req: Request, res: Response) => {
  try {
    await ensureCommentsSchema();
    const { commentId, userId, reactionType } = req.body || {};
    if (!commentId || !userId || !reactionType) return res.status(400).json({ error: 'commentId, userId, and reactionType are required' });
    if (!['helpful', 'not_helpful', 'spam'].includes(String(reactionType))) return res.status(400).json({ error: 'reactionType must be "helpful", "not_helpful", or "spam"' });
    await prisma.$executeRaw(`
      INSERT INTO "public"."comment_reactions" (comment_id, user_id, reaction_type)
      VALUES (${parseInt(String(commentId), 10)}, ${parseInt(String(userId), 10)}, ${String(reactionType)})
      ON CONFLICT (comment_id, user_id, reaction_type) DO UPDATE SET created_at = CURRENT_TIMESTAMP
    `);
    return res.json({ success: true, message: 'Reaction added successfully' });
  } catch (e) {
    console.error('add reaction error', e);
    return res.status(500).json({ error: 'Failed to add reaction' });
  }
});

// Smart Search: map condition → specialties and rank doctors
app.get('/api/search/doctors', async (req: Request, res: Response) => {
  const qRaw = String(req.query.q ?? '');
  const { normalizedQuery, conditions, specialties } = mapQueryToSpecialties(qRaw);
  try {
    // Short-circuit identical queries for a few seconds
    const cacheKey = normalizedQuery;
    const cached = cacheKey ? searchCache.get(cacheKey) : undefined;
    const now = Date.now();
    if (cached && (now - cached.ts) < SEARCH_CACHE_MS) {
      return res.status(200).json(cached.result);
    }
    const candidates = await getDoctorCandidates(prisma);

    const matchedSpecs = new Set(specialties.map(s => s.toLowerCase()));
    const scored = candidates.map((d: any) => {
      const profile = d.doctorProfile || {};
      const spec = String(profile.specialization || '').toLowerCase();
      const handle = String(d.email || '').split('@')[0].toLowerCase();
      const textMatch = normalizedQuery && (spec.includes(normalizedQuery) || handle.includes(normalizedQuery)) ? 0.2 : 0;
      const specMatch = matchedSpecs.size > 0 && Array.from(matchedSpecs).some(ms => spec.includes(ms)) ? 1.0 : 0;
      const experienceBoost = Number(profile.experience || 0) > 5 ? 0.1 : 0;
      const score = specMatch + textMatch + experienceBoost;
      return { score, d };
    }).filter((x: any) => x.score > 0 || specialties.length === 0);

    const ranked = scored.sort((a: any, b: any) => b.score - a.score).map((x: any) => x.d);

    const mappedSuggestions = specialties.map(s => `${s} (specialization)`);
    const doctorSuggestions = suggestFromDoctors(normalizedQuery, candidates);
    const seedSpecs = mapQueryToSeedSpecialties(normalizedQuery);
    const seedMappedSuggestions = seedSuggestions(normalizedQuery);
    const suggestions = Array.from(new Set([...mappedSuggestions, ...seedMappedSuggestions, ...doctorSuggestions])).slice(0, 10);

    const finalDoctors = specialties.length > 0 ? ranked : candidates.filter((d: any) => {
      const profile = d.doctorProfile || {};
      const spec = String(profile.specialization || '').toLowerCase();
      const handle = String(d.email || '').split('@')[0].toLowerCase();
      return normalizedQuery ? (spec.includes(normalizedQuery) || handle.includes(normalizedQuery)) : true;
    });

    const payload = {
      query: qRaw,
      normalizedQuery,
      matchedConditions: conditions,
      matchedSpecialties: Array.from(new Set([...specialties, ...seedSpecs])),
      doctors: finalDoctors,
      suggestions,
      meta: { strategy: (specialties.length || seedSpecs.length) ? 'seed+condition-specialty' : 'text-fallback' }
    };

    const cacheKey2 = normalizedQuery;
    if (cacheKey2) {
      searchCache.set(cacheKey2, { ts: Date.now(), result: payload });
    }
    res.status(200).json(payload);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Search failed' });
  }
});

// Analytics: capture search query to improve token→specialty mapping
app.post('/api/analytics/search', async (req: Request, res: Response) => {
  try {
    const { query, matchedSpecialties = [], matchedConditions = [], topDoctorIds = [] } = req.body || {};
    const qRaw = String(query ?? '');
    const { normalizedQuery } = mapQueryToSpecialties(qRaw);
    const tokens = normalizedQuery.split(' ').filter(Boolean);
    const tokensPlus = normalizedQuery && normalizedQuery.includes(' ') ? [...tokens, normalizedQuery] : tokens;

    // Learn from mapped specialties (curated suggestions)
    for (const t of tokensPlus) {
      for (const spec of matchedSpecialties) {
        incrementTokenSpecialty(t, String(spec), 1);
      }
    }

    // Learn from top doctor IDs (clicked or highly ranked results)
    const ids: number[] = Array.isArray(topDoctorIds) ? topDoctorIds.map((x: any) => Number(x)).filter(Number.isFinite) : [];
    if (ids.length > 0) {
      try {
        const profiles: Array<{ specialization: string | null }> = await prisma.doctorProfile.findMany({
          where: { userId: { in: ids } },
          select: { specialization: true }
        });
        const specs: string[] = Array.from(
          new Set(
            (profiles || [])
              .map((p: { specialization: string | null }) => String(p.specialization ?? '').trim())
              .filter((s: string) => s.length > 0)
          )
        );
        for (const t of tokensPlus) {
          for (const spec of specs) {
            incrementTokenSpecialty(String(t), spec, 2); // stronger signal for doctor-based learning
          }
        }
      } catch (_) {}
    }

    // Persist analytics if DB table exists
    try {
      await (prisma as any).searchAnalytics?.create?.({
        data: {
          query: qRaw,
          normalizedQuery,
          matchedConditions,
          matchedSpecialties,
          topDoctorIds: ids,
        }
      });
    } catch (_) {}

    return res.status(200).json({ ok: true, tokens: tokensPlus, updated: matchedSpecialties.length });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Analytics save failed' });
  }
});

// Analytics: doctor click → learn query→specialization
app.post('/api/analytics/doctor/click', async (req: Request, res: Response) => {
  try {
    const { doctorId, action, query } = req.body || {};
    const idNum = Number(doctorId);
    if (!Number.isFinite(idNum)) {
      return res.status(400).json({ message: 'Invalid doctorId' });
    }

    // Find doctor specialization
    const profile = await prisma.doctorProfile.findUnique({
      where: { userId: idNum },
      select: { specialization: true }
    });
    const spec = String(profile?.specialization || '').trim();

    // Optional: learn from query if provided
    if (query && spec) {
      const qRaw = String(query);
      const { normalizedQuery } = mapQueryToSpecialties(qRaw);
      const tokens = normalizedQuery.split(' ').filter(Boolean);
      const tokensPlus = normalizedQuery && normalizedQuery.includes(' ') ? [...tokens, normalizedQuery] : tokens;
      for (const t of tokensPlus) {
        incrementTokenSpecialty(t, spec, 3); // strongest signal: explicit click
      }
    }

    // Persist click analytics if table exists
    try {
      await (prisma as any).doctorClickAnalytics?.create?.({
        data: { doctorId: idNum, action: String(action || ''), query: String(query || ''), specialization: spec }
      });
    } catch (_) {}

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Doctor click analytics error:', error);
    res.status(500).json({ message: 'Doctor click analytics failed' });
  }
});

// Analytics: doctor view (minimal endpoint to avoid client errors)
app.post('/api/analytics/doctor/view', async (req: Request, res: Response) => {
  try {
    const { doctorId } = req.body || {};
    const idNum = Number(doctorId);
    if (!Number.isFinite(idNum)) {
      return res.status(400).json({ message: 'Invalid doctorId' });
    }
    try {
      await (prisma as any).doctorViewAnalytics?.create?.({ data: { doctorId: idNum } });
    } catch (_) {}
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Doctor view analytics error:', error);
    res.status(500).json({ message: 'Doctor view analytics failed' });
  }
});

// --- Get Doctor by Slug Endpoint (Public) ---
app.get('/api/doctors/slug/:slug', async (req: Request, res: Response) => {
  const { slug } = req.params;
  try {
    // 1. Try to find by exact slug
    let doctorProfile = await prisma.doctorProfile.findUnique({
      where: { slug: slug.toLowerCase() },
      include: { user: true },
    });

    // 2. Fallback: Search all doctors and match by slugified name
    if (!doctorProfile) {
      const allProfiles = await prisma.doctorProfile.findMany({
        include: { user: true }
      });
      doctorProfile = allProfiles.find((p: any) => {
        const name = p.user?.name || p.user?.email?.split('@')[0] || '';
        return slugifyHospitalName(name) === slug.toLowerCase();
      }) || null;
    }

    if (!doctorProfile) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    // Return the data in the format expected by the frontend
    res.status(200).json({
      id: doctorProfile.userId,
      email: doctorProfile.user.email,
      doctorProfile: {
        slug: doctorProfile.slug,
        specialization: doctorProfile.specialization,
        clinicName: doctorProfile.clinicName,
        clinicAddress: doctorProfile.clinicAddress,
        city: doctorProfile.city,
        state: doctorProfile.state,
        phone: doctorProfile.phone,
        consultationFee: doctorProfile.consultationFee,
        workingHours: doctorProfile.workingHours || null,
        profileImage: (doctorProfile as any).profileImage || null,
        about: (doctorProfile as any).about || null,
        services: (doctorProfile as any).services || null,
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching the doctor.' });
  }
});

// --- Create Appointment Endpoint (Protected, Patient Role) ---
app.post('/api/appointments', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role !== 'PATIENT') {
    return res.status(403).json({ message: 'Forbidden: Only patients can book appointments.' });
  }
  const { doctorId, date, reason, time } = req.body;
  const patientId = user.userId;
  if (!doctorId || !date || !time) {
    return res.status(400).json({ message: 'Doctor ID, date and time are required.' });
  }
  try {
    // Check if doctor or their hospital is suspended
    const doctor = await prisma.user.findUnique({
      where: { id: Number(doctorId) },
      select: { status: true }
    });

    if (doctor?.status === 'SUSPENDED') {
      return res.status(403).json({ message: 'Booking failed: Doctor is currently suspended.' });
    }

    const hospitalMembership = await prisma.hospitalDoctor.findFirst({
      where: { doctorId: Number(doctorId) },
      include: { hospital: { select: { status: true } } }
    });

    if (hospitalMembership?.hospital?.status === 'SUSPENDED') {
      return res.status(403).json({ message: 'Booking failed: Hospital is currently suspended.' });
    }

    // Capacity enforcement per hour based on doctor's slot period
    const hour = Number(String(time).slice(0, 2));
    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: Number(doctorId) },
      select: { slotPeriodMinutes: true },
    });
    const periodMinutes = doctorProfile?.slotPeriodMinutes ?? 15;
    const capacity = Math.max(1, Math.floor(60 / periodMinutes));

    // Count existing bookings in the same hour for the given date (excluding cancelled)
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    const existingCount = await prisma.appointment.count({
      where: {
        doctorId: Number(doctorId),
        status: { not: 'CANCELLED' },
        date: { gte: dayStart, lte: dayEnd },
        time: { startsWith: String(hour).padStart(2, '0') },
      },
    });

    if (existingCount >= capacity) {
      return res.status(409).json({ message: 'Slot unavailable: capacity reached for this hour.' });
    }

    const newAppointment = await prisma.appointment.create({
      data: {
        date: new Date(date),
        time: String(time),
        reason: reason,
        doctor: { connect: { id: Number(doctorId) } },
        patient: { connect: { id: patientId } },
      },
    });

    // Broadcast booking event to relevant rooms for realtime updates
    try {
      // hospital rooms (all hospitals the doctor belongs to)
      const memberships = await prisma.hospitalDoctor.findMany({
        where: { doctorId: Number(doctorId) },
        select: { hospitalId: true },
      });
      for (const m of memberships) {
        broadcastHospitalEvent(m.hospitalId, 'appointment-booked', { doctorId: Number(doctorId), appointmentId: newAppointment.id });
      }
      // doctor room
      broadcastDoctorEvent(Number(doctorId), 'appointment-booked', { doctorId: Number(doctorId), appointmentId: newAppointment.id });
      // patient room
      broadcastPatientEvent(Number(patientId), 'appointment-booked', { doctorId: Number(doctorId), appointmentId: newAppointment.id });
    } catch (_) {}

    res.status(201).json({ message: 'Appointment booked successfully', appointment: newAppointment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while booking the appointment.' });
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
    // Preserve current slug unless a new one is provided (ensure uniqueness)
    const slugify = (s: string) =>
      String(s).toLowerCase()
        .replace(/[^\w\s-]/g, '') // Keep alphanumeric, spaces, and hyphens
        .replace(/\s+/g, '-') // Replace spaces with single hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
    let desiredSlug = existingProfile.slug;
    if (slug) {
      let base = slugify(slug);
      if (base !== existingProfile.slug) {
        let uniqueSlug = base;
        let suffix = 0;
        while (true) {
          const exists = await prisma.doctorProfile.findUnique({ where: { slug: uniqueSlug }, select: { id: true } });
          if (!exists) break;
          suffix++;
          uniqueSlug = `${base}-${suffix}`;
        }
        desiredSlug = uniqueSlug;
      }
    }

    const updatedProfile = await prisma.doctorProfile.update({
      where: { userId: user.userId },
      data: {
        specialization, qualifications, experience, clinicName, clinicAddress, city, state, phone, consultationFee, slug: desiredSlug,
      },
    });
    res.status(200).json({ message: 'Doctor profile updated successfully', profile: updatedProfile });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while updating the profile.' });
  }
});

// --- Doctor: Get slot period (Protected, Doctor role) ---
app.get('/api/doctor/slot-period', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role !== 'DOCTOR') {
    return res.status(403).json({ message: 'Forbidden: Only doctors can access slot period.' });
  }
  try {
    const profile = await prisma.doctorProfile.findUnique({
      where: { userId: user.userId },
      select: { slotPeriodMinutes: true },
    });
    if (!profile) {
      return res.status(404).json({ message: 'Doctor profile not found.' });
    }
    return res.status(200).json({ slotPeriodMinutes: profile.slotPeriodMinutes ?? 15 });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'An error occurred while fetching slot period.' });
  }
});

// --- Doctor: Update slot period (Protected, Doctor role) ---
app.patch('/api/doctor/slot-period', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role !== 'DOCTOR') {
    return res.status(403).json({ message: 'Forbidden: Only doctors can update slot period.' });
  }
  const { minutes } = req.body as { minutes?: number };
  const allowed = [10, 15, 20, 30, 60];
  const value = Number(minutes);
  if (!Number.isFinite(value) || !allowed.includes(value)) {
    return res.status(400).json({ message: 'Invalid minutes. Allowed: 10, 15, 20, 30, 60' });
  }
  try {
    const profile = await prisma.doctorProfile.findUnique({ where: { userId: user.userId }, select: { id: true } });
    if (!profile) {
      return res.status(404).json({ message: 'Doctor profile not found.' });
    }
    await prisma.doctorProfile.update({ where: { userId: user.userId }, data: { slotPeriodMinutes: value } });
    try {
      broadcastDoctorEvent(user.userId, 'slots:period-updated', { doctorId: user.userId, minutes: value });
    } catch (_) {}
    return res.status(200).json({ message: 'Slot period updated', slotPeriodMinutes: value });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'An error occurred while updating slot period.' });
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

// --- Homepage Content (Admin) ---
app.get('/api/homepage', async (req: Request, res: Response) => {
  try {
    console.log('🔍 API - Loading homepage content...');
    
    const latest = await prisma.adminAuditLog.findFirst({
      where: { entityType: 'HOMEPAGE', action: 'HOMEPAGE_SAVE' },
      orderBy: { createdAt: 'desc' },
      select: { details: true, createdAt: true, adminId: true }
    });
    
    console.log('🔍 API - Latest homepage log:', {
      found: !!latest,
      hasDetails: !!latest?.details,
      createdAt: latest?.createdAt
    });
    
    if (!latest || !latest.details) {
      console.log('🔍 API - No homepage content found, returning empty');
      return res.status(200).json({});
    }
    
    try {
      const content = JSON.parse(latest.details);
      console.log('🔍 API - Parsed homepage content, keys:', Object.keys(content));
      return res.status(200).json(content || {});
    } catch (parseError) {
      console.error('🔍 API - Error parsing homepage content:', parseError);
      return res.status(200).json({});
    }
  } catch (error) {
    console.error('Failed to load homepage content:', error);
    return res.status(500).json({ message: 'Failed to load homepage content' });
  }
});

app.patch('/api/admin/homepage-content', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const payload = req.body || {};
    const details = JSON.stringify(payload);
    
    console.log('🔍 API - Admin saving homepage content:', {
      adminId,
      payloadKeys: Object.keys(payload),
      hasHero: !!payload.hero,
      hasTrustedBy: !!payload.trustedBy
    });
    
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'HOMEPAGE_SAVE',
        entityType: 'HOMEPAGE',
        entityId: null,
        details
      }
    });
    
    console.log('🔍 API - Homepage content saved successfully');
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Failed to save homepage content:', error);
    return res.status(500).json({ message: 'Failed to save homepage content' });
  }
});

// --- Admin: View learning weights ---
app.get('/api/admin/learning/weights', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const weights = getAllWeights();
    return res.status(200).json({ weights });
  } catch (error) {
    console.error('Failed to get learning weights:', error);
    return res.status(500).json({ message: 'Failed to retrieve learning weights' });
  }
});

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

app.get('/api/admin/metrics', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const dau: any[] = await prisma.$queryRaw`SELECT COUNT(DISTINCT "patientId")::int AS dau FROM "Appointment" WHERE "createdAt" >= NOW() - INTERVAL '1 day'`;
    const mau: any[] = await prisma.$queryRaw`SELECT COUNT(DISTINCT "patientId")::int AS mau FROM "Appointment" WHERE "createdAt" >= NOW() - INTERVAL '30 day'`;
    const totalPatients = await prisma.user.count({ where: { role: 'PATIENT' } });
    const totalDoctors = await prisma.user.count({ where: { role: 'DOCTOR' } });
    const totalAppointments = await prisma.appointment.count();
    const confirmedAppointments = await prisma.appointment.count({ where: { status: 'CONFIRMED' } });
    const cancelledAppointments = await prisma.appointment.count({ where: { status: 'CANCELLED' } });
    const revenueRows: any[] = await prisma.$queryRaw`
      SELECT COALESCE(SUM(dp."consultationFee"), 0)::float AS revenue
      FROM "Appointment" a
      JOIN "DoctorProfile" dp ON dp."userId" = a."doctorId"
      WHERE a.status = 'CONFIRMED'
    `;
    const revenueByCity: any[] = await prisma.$queryRaw`
      SELECT COALESCE(dp.city, 'Unknown') AS city, COALESCE(SUM(dp."consultationFee"),0)::float AS revenue, COUNT(*)::int AS count
      FROM "Appointment" a
      JOIN "DoctorProfile" dp ON dp."userId" = a."doctorId"
      WHERE a.status = 'CONFIRMED'
      GROUP BY city
      ORDER BY revenue DESC
      LIMIT 12
    `;
    const revenueBySpecialty: any[] = await prisma.$queryRaw`
      SELECT COALESCE(dp.specialization, 'General') AS specialty, COALESCE(SUM(dp."consultationFee"),0)::float AS revenue, COUNT(*)::int AS count
      FROM "Appointment" a
      JOIN "DoctorProfile" dp ON dp."userId" = a."doctorId"
      WHERE a.status = 'CONFIRMED'
      GROUP BY specialty
      ORDER BY revenue DESC
      LIMIT 12
    `;
    const revenueByTier: any[] = await prisma.$queryRaw`
      SELECT
        CASE
          WHEN dp."consultationFee" < 300 THEN 'Tier 1'
          WHEN dp."consultationFee" BETWEEN 300 AND 600 THEN 'Tier 2'
          ELSE 'Tier 3'
        END AS tier,
        COALESCE(SUM(dp."consultationFee"),0)::float AS revenue,
        COUNT(*)::int AS count
      FROM "Appointment" a
      JOIN "DoctorProfile" dp ON dp."userId" = a."doctorId"
      WHERE a.status = 'CONFIRMED'
      GROUP BY tier
      ORDER BY revenue DESC
    `;
    const bookingsByState: any[] = await prisma.$queryRaw`
      SELECT COALESCE(dp.state, 'Unknown') AS state, COUNT(*)::int AS count
      FROM "Appointment" a
      JOIN "DoctorProfile" dp ON dp."userId" = a."doctorId"
      GROUP BY state
      ORDER BY count DESC
      LIMIT 20
    `;
    const topCities: any[] = await prisma.$queryRaw`
      SELECT COALESCE(dp.city, 'Unknown') AS city, COUNT(*)::int AS count
      FROM "Appointment" a
      JOIN "DoctorProfile" dp ON dp."userId" = a."doctorId"
      GROUP BY city
      ORDER BY count DESC
      LIMIT 10
    `;
    const doctorDensity: any[] = await prisma.$queryRaw`
      SELECT COALESCE(dp.state, 'Unknown') AS state, COUNT(*)::int AS doctors
      FROM "DoctorProfile" dp
      GROUP BY state
      ORDER BY doctors DESC
      LIMIT 20
    `;
    const revenueTodayRows: any[] = await prisma.$queryRaw`
      SELECT COALESCE(SUM(dp."consultationFee"),0)::float AS revenue
      FROM "Appointment" a
      JOIN "DoctorProfile" dp ON dp."userId" = a."doctorId"
      WHERE a.status = 'CONFIRMED' AND DATE(a."createdAt") = CURRENT_DATE
    `;
    const liveAppointmentsRows: any[] = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS live
      FROM "Appointment" a
      WHERE a.status = 'CONFIRMED' AND a."createdAt" >= NOW() - INTERVAL '60 minute'
    `;
    const doctorsUpcomingRows: any[] = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT a."doctorId")::int AS count
      FROM "Appointment" a
      WHERE a."createdAt" >= NOW() - INTERVAL '120 minute'
    `;
    const dauVal = dau[0]?.dau || 0;
    const mauVal = mau[0]?.mau || 0;
    const totalRevenue = revenueRows[0]?.revenue || 0;
    const revenueToday = revenueTodayRows[0]?.revenue || 0;
    const liveAppointments = liveAppointmentsRows[0]?.live || 0;
    const doctorsOnline = doctorsUpcomingRows[0]?.count || 0;
    const avgBookingValue = confirmedAppointments ? totalRevenue / confirmedAppointments : 0;
    const conversionRate = totalAppointments ? Math.round((confirmedAppointments / Math.max(1, totalAppointments)) * 100) : 0;
    const refundRate = totalAppointments ? Math.round((cancelledAppointments / Math.max(1, totalAppointments)) * 100) : 0;
    res.status(200).json({
      core: {
        totalPatients,
        totalDoctors,
        dau: dauVal,
        mau: mauVal,
        totalAppointments,
        conversionRate,
        revenue: totalRevenue
      },
      revenue: {
        totalRevenue,
        revenueByCity,
        revenueBySpecialty,
        revenueByTier,
        avgBookingValue,
        refundRate,
        paymentFailureRate: 0
      },
      operational: {
        appointmentSuccessRate: totalAppointments ? Math.round((confirmedAppointments / Math.max(1, totalAppointments)) * 100) : 0,
        noShowRate: 0,
        cancellationTrend: cancelledAppointments
      },
      geographic: {
        bookingsByState,
        topCities,
        doctorDensity
      },
      realtime: {
        liveAppointments,
        doctorsOnline,
        usersBrowsing: dauVal,
        revenueToday
      }
    });
  } catch (error) {
    console.error('admin metrics error', error);
    res.status(500).json({ message: 'Failed to compute admin metrics' });
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
        canLogin: true,
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

    // Map canLogin -> isActive to match frontend expectations
    const transformed = users.map((u: any) => {
      const { canLogin, ...rest } = u;
      return { ...rest, isActive: !!canLogin };
    });

    res.status(200).json(transformed);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching users.' });
  }
});

// --- Update User Status (Admin Only) ---
app.patch('/api/admin/users/:userId/status', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { isActive } = req.body;
  
  try {
    const user = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { canLogin: Boolean(isActive) },
    });
    
    // Log the action
    await prisma.adminAuditLog.create({
      data: {
        adminId: req.user!.userId,
        action: isActive ? 'ACTIVATE' : 'DEACTIVATE',
        entityType: 'USER',
        entityId: parseInt(userId),
        details: JSON.stringify({ email: user.email, isActive: Boolean(isActive) }),
      },
    });
    
    res.json({ message: 'User status updated successfully', user });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ message: 'Failed to update user status' });
  }
});

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

// --- Admin: List all doctors with status and basic info ---
app.get('/api/admin/doctors', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const page = parseInt(String(req.query.page ?? '1'), 10);
    const limit = parseInt(String(req.query.limit ?? '10'), 10);
    const skip = (page - 1) * limit;
    const search = String(req.query.search ?? '').trim();

    const where: any = { role: 'DOCTOR' };
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { doctorProfile: { specialization: { contains: search, mode: 'insensitive' } } },
        { doctorProfile: { clinicName: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [doctors, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { 
          doctorProfile: true,
          hospitalMemberships: {
            include: { hospital: { select: { name: true } } }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.user.count({ where })
    ]);

    res.status(200).json({
      items: doctors,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch doctors list' });
  }
});

app.get('/api/admin/doctors/:doctorId/details', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const doctorId = Number(req.params.doctorId);
  if (!Number.isFinite(doctorId)) return res.status(400).json({ message: 'Invalid doctorId' });
  try {
    const user = await prisma.user.findUnique({
      where: { id: doctorId },
      include: {
        doctorProfile: true,
        hospitalMemberships: {
          include: { hospital: true }
        }
      }
    });
    if (!user || user.role !== 'DOCTOR') return res.status(404).json({ message: 'Doctor not found' });
    const appointments = await prisma.appointment.findMany({
      where: { doctorId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        patient: { select: { id: true, email: true } }
      }
    });
    const totalAppointments = await prisma.appointment.count({ where: { doctorId } });
    res.status(200).json({ doctor: user, totalAppointments, recentAppointments: appointments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch doctor details' });
  }
});
// --- Admin: List all hospitals with status and stats ---
app.get('/api/admin/hospitals', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const page = parseInt(String(req.query.page ?? '1'), 10);
    const limit = parseInt(String(req.query.limit ?? '10'), 10);
    const skip = (page - 1) * limit;
    const search = String(req.query.search ?? '').trim();

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [hospitals, total] = await Promise.all([
      prisma.hospital.findMany({
        where,
        include: {
          _count: {
            select: {
              departments: true,
              doctors: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.hospital.count({ where })
    ]);

    res.status(200).json({
      items: hospitals,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch hospitals list' });
  }
});

// --- Admin: Get hospital details (departments and doctors) ---
app.get('/api/admin/hospitals/:hospitalId/full-details', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const hospitalId = Number(req.params.hospitalId);
  if (!Number.isFinite(hospitalId)) return res.status(400).json({ message: 'Invalid hospitalId' });

  try {
    const hospital = await prisma.hospital.findUnique({
      where: { id: hospitalId },
      include: {
        departments: {
          include: {
            doctors: {
              include: {
                doctor: {
                  select: { id: true, email: true, status: true, doctorProfile: { select: { specialization: true } } }
                }
              }
            }
          }
        },
        doctors: {
          where: { departmentId: null }, // Doctors not assigned to any department
          include: {
            doctor: {
              select: { id: true, email: true, status: true, doctorProfile: { select: { specialization: true } } }
            }
          }
        }
      }
    });

    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
    res.status(200).json(hospital);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch hospital details' });
  }
});

app.get('/api/admin/hospitals/:hospitalId/appointments', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const hospitalId = Number(req.params.hospitalId);
  const limit = Number(req.query.limit ?? 10);
  if (!Number.isFinite(hospitalId)) return res.status(400).json({ message: 'Invalid hospitalId' });
  try {
    const memberships = await prisma.hospitalDoctor.findMany({
      where: { hospitalId },
      select: { doctorId: true }
    });
    const doctorIds = memberships.map((m: { doctorId: number }) => m.doctorId);
    if (!doctorIds.length) return res.status(200).json([]);
    const appts = await prisma.appointment.findMany({
      where: { doctorId: { in: doctorIds } },
      orderBy: { createdAt: 'desc' },
      take: Math.max(1, Math.min(100, limit)),
      include: {
        doctor: { select: { id: true, email: true } },
        patient: { select: { id: true, email: true } }
      }
    });
    res.status(200).json(appts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch hospital appointments' });
  }
});
// --- Admin: Update doctor status (suspend/unsuspend) ---
app.patch('/api/admin/doctors/:doctorId/status', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const doctorId = Number(req.params.doctorId);
  const { status } = req.body; // ACTIVE, SUSPENDED

  if (!Number.isFinite(doctorId)) return res.status(400).json({ message: 'Invalid doctorId' });
  if (!['ACTIVE', 'SUSPENDED'].includes(status)) return res.status(400).json({ message: 'Invalid status' });

  try {
    const updated = await prisma.user.update({
      where: { id: doctorId },
      data: { status }
    });
    // Update verification status on profile
    try {
      await prisma.doctorProfile.update({
        where: { userId: doctorId },
        data: { verificationStatus: status === 'ACTIVE' ? 'APPROVED' : 'PENDING' }
      });
    } catch {}

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.user!.userId,
        action: status === 'SUSPENDED' ? 'DOCTOR_SUSPEND' : 'DOCTOR_UNSUSPEND',
        entityType: 'USER',
        entityId: doctorId,
        details: `Doctor status updated to ${status}`
      }
    }).catch(() => {});

    res.status(200).json({ message: `Doctor ${status.toLowerCase()}ed successfully`, user: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update doctor status' });
  }
});

app.get('/api/admin/verifications/pending', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const doctors = await prisma.user.findMany({
      where: { role: 'DOCTOR', OR: [{ status: 'PENDING' }, { doctorProfile: { verificationStatus: 'PENDING' } }] },
      select: {
        id: true,
        email: true,
        status: true,
        doctorProfile: {
          select: {
            registrationNumber: true,
            phone: true,
            verificationSubmitted: true,
            verificationStatus: true,
            specialization: true,
            clinicName: true,
            city: true,
            state: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    const hospitals = await prisma.hospital.findMany({
      where: { OR: [{ status: 'PENDING' }, { verificationStatus: 'PENDING' }] },
      select: {
        id: true,
        name: true,
        status: true,
        registrationNumberGov: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        admin: { select: { email: true } },
        verificationSubmitted: true,
        verificationStatus: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ doctors, hospitals });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch pending verifications' });
  }
});

app.patch('/api/admin/verifications/doctor/:doctorId', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const doctorId = Number(req.params.doctorId);
  const decision = String(req.body?.decision || '').toUpperCase();
  if (!Number.isFinite(doctorId)) return res.status(400).json({ message: 'Invalid doctorId' });
  if (!['APPROVE', 'REJECT'].includes(decision)) return res.status(400).json({ message: 'Invalid decision' });
  try {
    if (decision === 'APPROVE') {
      await prisma.user.update({ where: { id: doctorId }, data: { status: 'ACTIVE' } });
      await prisma.doctorProfile.update({ where: { userId: doctorId }, data: { verificationStatus: 'APPROVED' } });
    } else {
      await prisma.user.update({ where: { id: doctorId }, data: { status: 'SUSPENDED' } });
      await prisma.doctorProfile.update({ where: { userId: doctorId }, data: { verificationStatus: 'REJECTED' } });
    }
    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update doctor verification' });
  }
});

app.patch('/api/admin/verifications/hospital/:hospitalId', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const hospitalId = Number(req.params.hospitalId);
  const decision = String(req.body?.decision || '').toUpperCase();
  if (!Number.isFinite(hospitalId)) return res.status(400).json({ message: 'Invalid hospitalId' });
  if (!['APPROVE', 'REJECT'].includes(decision)) return res.status(400).json({ message: 'Invalid decision' });
  try {
    if (decision === 'APPROVE') {
      await prisma.hospital.update({ where: { id: hospitalId }, data: { status: 'ACTIVE', verificationStatus: 'APPROVED' } });
    } else {
      await prisma.hospital.update({ where: { id: hospitalId }, data: { status: 'SUSPENDED', verificationStatus: 'REJECTED' } });
    }
    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update hospital verification' });
  }
});
// --- Admin: Update hospital status (suspend/unsuspend) ---
app.patch('/api/admin/hospitals/:hospitalId/status', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const hospitalId = Number(req.params.hospitalId);
  const { status } = req.body; // ACTIVE, SUSPENDED

  if (!Number.isFinite(hospitalId)) return res.status(400).json({ message: 'Invalid hospitalId' });
  if (!['ACTIVE', 'SUSPENDED'].includes(status)) return res.status(400).json({ message: 'Invalid status' });

  try {
    const updated = await prisma.hospital.update({
      where: { id: hospitalId },
      data: { status }
    });
    // Update verification status
    try {
      await prisma.hospital.update({
        where: { id: hospitalId },
        data: { verificationStatus: status === 'ACTIVE' ? 'APPROVED' : 'PENDING' }
      });
    } catch {}

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.user!.userId,
        action: status === 'SUSPENDED' ? 'HOSPITAL_SUSPEND' : 'HOSPITAL_UNSUSPEND',
        entityType: 'HOSPITAL',
        entityId: hospitalId,
        details: `Hospital status updated to ${status}`
      }
    }).catch(() => {});

    res.status(200).json({ message: `Hospital ${status.toLowerCase()}ed successfully`, hospital: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update hospital status' });
  }
});

// --- Update Appointment Status (Admin Only) ---
app.patch('/api/admin/appointments/:appointmentId/status', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { appointmentId } = req.params;
  const { status } = req.body as { status: string };
  const admin = req.user!;

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: parseInt(appointmentId) },
      include: { patient: { select: { id: true } } }
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    // Broadcast optimistic update to hospital(s), patient, and doctor
    try {
      const optimisticPayload: any = {
        id: appointment.id,
        status,
        date: appointment.date,
        time: appointment.time,
        doctorId: appointment.doctorId,
        patient: { id: appointment.patient?.id },
        doctor: { id: appointment.doctorId },
        optimistic: true,
      };
      const memberships = await prisma.hospitalDoctor.findMany({
        where: { doctorId: appointment.doctorId },
        select: { hospitalId: true },
      });
      for (const m of memberships) {
        broadcastHospitalEvent(m.hospitalId, 'appointment-updated-optimistic', optimisticPayload);
      }
      broadcastPatientEvent(appointment.patient?.id, 'appointment-updated-optimistic', optimisticPayload);
      broadcastDoctorEvent(appointment.doctorId, 'appointment-updated-optimistic', optimisticPayload);
    } catch (_) {}

    const updatedAppointment = await prisma.appointment.update({
      where: { id: parseInt(appointmentId) },
      data: { status },
      include: {
        doctor: { select: { id: true, email: true } },
        patient: { select: { id: true, email: true } },
      },
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

    // Broadcast final update to all subscribers
    try {
      const memberships = await prisma.hospitalDoctor.findMany({
        where: { doctorId: updatedAppointment.doctorId },
        select: { hospitalId: true },
      });
      for (const m of memberships) {
        broadcastHospitalEvent(m.hospitalId, 'appointment-updated', updatedAppointment);
      }
      broadcastPatientEvent(updatedAppointment.patient?.id, 'appointment-updated', updatedAppointment);
      broadcastDoctorEvent(updatedAppointment.doctor?.id ?? updatedAppointment.doctorId, 'appointment-updated', updatedAppointment);
    } catch (_) {}

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
      include: { patient: { select: { id: true } } }
    });
    if (!appointmentToUpdate) {
      return res.status(404).json({ message: 'Appointment not found or you do not have permission to update it.' });
    }

    // Broadcast optimistic update to doctor, patient, and hospitals (instant UI)
    try {
      const optimisticPayload: any = {
        id: appointmentToUpdate.id,
        status,
        date: appointmentToUpdate.date,
        time: appointmentToUpdate.time,
        doctorId: appointmentToUpdate.doctorId,
        patient: { id: appointmentToUpdate.patient?.id },
        doctor: { id: appointmentToUpdate.doctorId },
        optimistic: true,
      };
      const memberships = await prisma.hospitalDoctor.findMany({
        where: { doctorId: appointmentToUpdate.doctorId },
        select: { hospitalId: true },
      });
      for (const m of memberships) {
        broadcastHospitalEvent(m.hospitalId, 'appointment-updated-optimistic', optimisticPayload);
      }
      broadcastPatientEvent(appointmentToUpdate.patient?.id, 'appointment-updated-optimistic', optimisticPayload);
      broadcastDoctorEvent(appointmentToUpdate.doctorId, 'appointment-updated-optimistic', optimisticPayload);
    } catch (_) {}

    const updatedAppointment = await prisma.appointment.update({
      where: { id: parseInt(appointmentId) },
      data: { status },
      include: {
        doctor: { select: { id: true, email: true } },
        patient: { select: { id: true, email: true } },
      },
    });

    // Broadcast final update to all subscribers
    try {
      const memberships = await prisma.hospitalDoctor.findMany({
        where: { doctorId: updatedAppointment.doctorId },
        select: { hospitalId: true },
      });
      for (const m of memberships) {
        broadcastHospitalEvent(m.hospitalId, 'appointment-updated', updatedAppointment);
      }
      broadcastPatientEvent(updatedAppointment.patient?.id, 'appointment-updated', updatedAppointment);
      broadcastDoctorEvent(updatedAppointment.doctor?.id ?? updatedAppointment.doctorId, 'appointment-updated', updatedAppointment);
    } catch (_) {}

    res.status(200).json({ message: 'Appointment status updated successfully', appointment: updatedAppointment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while updating the appointment.' });
  }
});

// --- Doctor: Reschedule appointment (update date/time without hospital) ---
app.patch('/api/appointments/:appointmentId', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  const appointmentId = Number(req.params.appointmentId);
  if (!Number.isFinite(appointmentId)) {
    return res.status(400).json({ message: 'Invalid appointmentId' });
  }
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: { select: { id: true } } }
    });
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }
    if (appointment.doctorId !== user.userId) {
      return res.status(403).json({ message: 'Forbidden: Only the owning doctor can reschedule this appointment.' });
    }
    const { date, time, status } = req.body as { date?: string; time?: string; status?: string };

    const updateData: any = {};
    if (status) {
      const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status provided.' });
      }
      updateData.status = status;
    }
    if (date) updateData.date = new Date(date);
    if (time) updateData.time = String(time);

    // If date or time is changing, enforce capacity at target hour
    if (updateData.date || updateData.time) {
      const targetDate: Date = updateData.date ? new Date(updateData.date) : appointment.date;
      const targetTime: string = updateData.time ?? (appointment.time ?? '');
      const hourPrefix = String(targetTime).slice(0, 2); // e.g., "10"
      // Determine doctor's slot period and capacity
      const doctorProfile = await prisma.doctorProfile.findUnique({
        where: { userId: user.userId },
        select: { slotPeriodMinutes: true }
      });
      const periodMinutes = doctorProfile?.slotPeriodMinutes ?? 15;
      const capacity = Math.max(1, Math.floor(60 / periodMinutes));

      const dayStart = new Date(targetDate); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(targetDate); dayEnd.setHours(23, 59, 59, 999);

      const existingCount = await prisma.appointment.count({
        where: {
          doctorId: user.userId,
          status: { not: 'CANCELLED' },
          date: { gte: dayStart, lte: dayEnd },
          time: { startsWith: hourPrefix },
          id: { not: appointmentId }
        },
      });

      if (existingCount >= capacity) {
        return res.status(409).json({ message: 'Slot unavailable: capacity reached for this hour.' });
      }
    }

    // Broadcast optimistic update to connected clients (instant UI across dashboards)
    try {
      const optimisticPayload: any = {
        id: appointment.id,
        status: updateData.status ?? appointment.status,
        date: updateData.date ?? appointment.date,
        time: updateData.time ?? appointment.time,
        doctorId: appointment.doctorId,
        patient: { id: appointment.patient?.id },
        doctor: { id: appointment.doctorId },
        optimistic: true,
      };
      // Patient channel
      broadcastPatientEvent(appointment.patient?.id, 'appointment-updated-optimistic', optimisticPayload);
      // Doctor channel
      broadcastDoctorEvent(appointment.doctorId, 'appointment-updated-optimistic', optimisticPayload);
      // Hospital channels for all hospitals the doctor belongs to (if any)
      try {
        const memberships = await prisma.hospitalDoctor.findMany({ where: { doctorId: user.userId }, select: { hospitalId: true } });
        for (const m of memberships) {
          broadcastHospitalEvent(m.hospitalId, 'appointment-updated-optimistic', optimisticPayload);
        }
      } catch (_) {}
    } catch (_) {}

    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: updateData
    });

    // Notify patient, doctor, and hospitals via SSE (final commit)
    try {
      broadcastPatientEvent(appointment.patient?.id, 'appointment-updated', updatedAppointment);
      broadcastDoctorEvent(updatedAppointment?.doctorId, 'appointment-updated', updatedAppointment);
      try {
        const memberships = await prisma.hospitalDoctor.findMany({ where: { doctorId: updatedAppointment?.doctorId }, select: { hospitalId: true } });
        for (const m of memberships) {
          broadcastHospitalEvent(m.hospitalId, 'appointment-updated', updatedAppointment);
        }
      } catch {}
    } catch {}

    res.status(200).json(updatedAppointment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while updating the appointment.' });
  }
});

// --- Start the server ---
// --- Admin: List hospitals ---
app.get('/api/admin/hospitals', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const page = parseInt(String(req.query.page ?? '1'), 10);
    const limit = parseInt(String(req.query.limit ?? '20'), 10);
    const skip = (page - 1) * limit;
    const hospitals = await prisma.hospital.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        profile: true,
        admin: {
          select: { id: true, email: true }
        }
      }
    });
    const items = hospitals.map((h: any) => {
      const profile = (h.profile as any) ?? {};
      return {
        id: h.id,
        name: h.name,
        city: h.city,
        state: h.state,
        admin: h.admin ? { email: h.admin.email } : undefined,
        logoUrl: profile.logoUrl ?? undefined,
        serviceStatus: profile.serviceStatus ?? undefined,
      };
    });
    res.status(200).json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching hospitals.' });
  }
});

// --- Admin: Update hospital service status ---
app.patch('/api/admin/hospitals/:hospitalId/status', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const id = Number(req.params.hospitalId);
  const { action } = req.body as { action: 'START' | 'PAUSE' | 'REVOKE' };
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: 'Invalid hospitalId' });
  }
  if (!action || !['START', 'PAUSE', 'REVOKE'].includes(action)) {
    return res.status(400).json({ message: 'Invalid action' });
  }
  try {
    const hospital = await prisma.hospital.findUnique({ where: { id }, select: { profile: true } });
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }
    const currentProfile = (hospital.profile as any) ?? {};
    const newStatus = action === 'START' ? 'STARTED' : action === 'PAUSE' ? 'PAUSED' : 'REVOKED';
    const updatedProfile = { ...currentProfile, serviceStatus: newStatus };
    await prisma.hospital.update({ where: { id }, data: { profile: updatedProfile } });
    // Audit log
    const adminId = req.user!.userId;
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action: `HOSPITAL_${action}`,
        entityType: 'HOSPITAL',
        entityId: id,
        details: `Service status set to ${newStatus}`
      }
    }).catch(() => {});
    res.status(200).json({ serviceStatus: newStatus });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while updating hospital status.' });
  }
});

// --- Admin: Update hospital profile ---
app.put('/api/admin/hospitals/:hospitalId/profile', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const id = Number(req.params.hospitalId);
  const updates = req.body || {};
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: 'Invalid hospitalId' });
  }
  try {
    const hospital = await prisma.hospital.findUnique({ where: { id }, select: { profile: true } });
    const currentProfile = (hospital?.profile as any) ?? {};
    const updatedProfile = { ...currentProfile, ...updates };
    await prisma.hospital.update({ where: { id }, data: { profile: updatedProfile } });
    const adminId = req.user!.userId;
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'HOSPITAL_PROFILE_UPDATE',
        entityType: 'HOSPITAL',
        entityId: id,
        details: JSON.stringify(Object.keys(updates))
      }
    }).catch(() => {});
    res.status(200).json({ profile: updatedProfile });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while updating hospital profile.' });
  }
});

// --- Admin: Upload hospital logo ---
app.post('/api/admin/hospitals/:hospitalId/logo', authMiddleware, adminMiddleware, upload.single('logo'), async (req: Request, res: Response) => {
  const id = Number(req.params.hospitalId);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: 'Invalid hospitalId' });
  }
  const uploadedFile = (req as any).file;
  if (!uploadedFile) {
    return res.status(400).json({ message: 'Logo file is required' });
  }
  const url = `/uploads/${uploadedFile.filename}`;
  try {
    const hospital = await prisma.hospital.findUnique({ where: { id }, select: { profile: true } });
    const currentProfile = (hospital?.profile as any) ?? {};
    const updatedProfile = { ...currentProfile, logoUrl: url };
    await prisma.hospital.update({ where: { id }, data: { profile: updatedProfile } });
    const adminId = req.user!.userId;
    await prisma.adminAuditLog.create({
      data: { adminId, action: 'HOSPITAL_LOGO_UPLOAD', entityType: 'HOSPITAL', entityId: id, details: url }
    }).catch(() => {});
    res.status(200).json({ url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while uploading hospital logo.' });
  }
});

// --- Hospital Admin: Upload hospital logo ---
app.post('/api/hospitals/:hospitalId/logo', authMiddleware, upload.single('logo'), async (req: Request, res: Response) => {
  const id = Number(req.params.hospitalId);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: 'Invalid hospitalId' });
  }
  const user = req.user!;
  if (!['HOSPITAL_ADMIN', 'ADMIN'].includes(user.role)) {
    return res.status(403).json({ message: 'Forbidden: Hospital admin access required' });
  }
  if (user.role === 'HOSPITAL_ADMIN') {
    let hospital = await prisma.hospital.findFirst({ where: { adminId: user.userId } });
    if (!hospital) {
      const me = await prisma.user.findUnique({ where: { id: user.userId }, select: { managedHospitalId: true } });
      if (me?.managedHospitalId) hospital = await prisma.hospital.findUnique({ where: { id: me.managedHospitalId } });
    }
    if (!hospital || hospital.id !== id) return res.status(403).json({ message: 'You do not manage this hospital.' });
  }

  const uploadedFile = (req as any).file;
  if (!uploadedFile) {
    return res.status(400).json({ message: 'Logo file is required' });
  }
  const url = `/uploads/${uploadedFile.filename}`;
  try {
    const hospital = await prisma.hospital.findUnique({ where: { id }, select: { profile: true } });
    const currentProfile = (hospital?.profile as any) ?? {};
    const updatedProfile = { ...currentProfile, logoUrl: url };
    await prisma.hospital.update({ where: { id }, data: { profile: updatedProfile } });
    res.status(200).json({ url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while uploading hospital logo.' });
  }
});

// --- Admin: Upload doctor photo ---
app.post('/api/admin/doctors/:doctorId/photo', authMiddleware, adminMiddleware, upload.single('photo'), async (req: Request, res: Response) => {
  const doctorId = Number(req.params.doctorId);
  if (!Number.isFinite(doctorId)) {
    return res.status(400).json({ message: 'Invalid doctorId' });
  }
  const uploadedFile = (req as any).file;
  if (!uploadedFile) {
    return res.status(400).json({ message: 'Photo file is required' });
  }
  const url = `/uploads/${uploadedFile.filename}`;
  try {
    const profile = await prisma.doctorProfile.findUnique({ where: { userId: doctorId }, select: { id: true } });
    if (!profile) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }
    await prisma.doctorProfile.update({ where: { id: profile.id }, data: { profileImage: url } });
    const adminId = req.user!.userId;
    await prisma.adminAuditLog.create({
      data: { adminId, action: 'DOCTOR_PHOTO_UPLOAD', entityType: 'DOCTOR', entityId: doctorId, details: url }
    }).catch(() => {});
    res.status(200).json({ url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while uploading doctor photo.' });
  }
});

// --- Admin: Update doctor service status ---
app.patch('/api/admin/doctors/:doctorId/status', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const doctorId = Number(req.params.doctorId);
  const { action } = req.body as { action: 'START' | 'PAUSE' | 'REVOKE' };
  if (!Number.isFinite(doctorId)) {
    return res.status(400).json({ message: 'Invalid doctorId' });
  }
  if (!action || !['START', 'PAUSE', 'REVOKE'].includes(action)) {
    return res.status(400).json({ message: 'Invalid action' });
  }
  try {
    const profile = await prisma.doctorProfile.findUnique({ where: { userId: doctorId } });
    if (!profile) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }
    let micrositeEnabled = profile.micrositeEnabled;
    if (action === 'START') micrositeEnabled = true;
    if (action === 'REVOKE') micrositeEnabled = false;
    if (micrositeEnabled !== profile.micrositeEnabled) {
      await prisma.doctorProfile.update({ where: { id: profile.id }, data: { micrositeEnabled } });
    }
    const adminId = req.user!.userId;
    await prisma.adminAuditLog.create({
      data: { adminId, action: `DOCTOR_${action}`, entityType: 'DOCTOR', entityId: doctorId }
    }).catch(() => {});
    const serviceStatus = action === 'START' ? 'STARTED' : action === 'PAUSE' ? 'PAUSED' : 'REVOKED';
    res.status(200).json({ serviceStatus });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while updating doctor status.' });
  }
});

// --- Admin: Delete a hospital ---
app.delete('/api/admin/hospitals/:hospitalId', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const hospitalId = Number(req.params.hospitalId);
  if (!Number.isFinite(hospitalId)) {
    return res.status(400).json({ message: 'Invalid hospitalId' });
  }
  try {
    // Remove doctor memberships to avoid foreign key constraint issues
    await prisma.hospitalDoctor.deleteMany({ where: { hospitalId } });

    // Delete the hospital record
    await prisma.hospital.delete({ where: { id: hospitalId } });

    // Audit log (best-effort)
    const adminId = req.user!.userId;
    await prisma.adminAuditLog.create({
      data: { adminId, action: 'HOSPITAL_DELETE', entityType: 'HOSPITAL', entityId: hospitalId }
    }).catch(() => {});

    return res.status(200).json({ ok: true });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ message: 'Hospital not found' });
    }
    console.error(error);
    return res.status(500).json({ message: 'Failed to delete hospital' });
  }
});

// --- Admin: Delete a user ---
app.delete('/api/admin/users/:userId', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const userId = Number(req.params.userId);
  if (!Number.isFinite(userId)) {
    return res.status(400).json({ message: 'Invalid userId' });
  }
  try {
    await prisma.user.delete({ where: { id: userId } });
    const adminId = req.user!.userId;
    await prisma.adminAuditLog.create({
      data: { adminId, action: 'USER_DELETE', entityType: 'USER', entityId: userId }
    }).catch(() => {});
    res.status(200).json({ message: 'User deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while deleting user.' });
  }
});

// --- Admin: Bulk import hospitals and doctors ---
app.post('/api/admin/import', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const body = req.body || {};
  const hospitals = Array.isArray(body.hospitals) ? body.hospitals : [];
  const doctors = Array.isArray(body.doctors) ? body.doctors : [];
  const adminId = req.user!.userId;

  const results: { hospitals: any[]; doctors: any[] } = { hospitals: [], doctors: [] };

  // Import hospitals
  for (const h of hospitals) {
    try {
      const data: any = { name: String(h.name || '').trim() };
      if (!data.name) throw new Error('hospital.name is required');
      if (h.address) data.address = String(h.address);
      if (h.city) data.city = String(h.city);
      if (h.state) data.state = String(h.state);
      if (h.phone) data.phone = String(h.phone);
      if (h.profile) data.profile = h.profile;

      if (h.adminEmail) {
        const adminUser = await prisma.user.findUnique({ where: { email: String(h.adminEmail) } });
        if (!adminUser) throw new Error(`adminEmail not found: ${h.adminEmail}`);
        data.admin = { connect: { id: adminUser.id } };
      }

      // try to find by name + optional city to avoid dupes
      let existing = null as any;
      if (data.city) {
        existing = await prisma.hospital.findFirst({ where: { name: data.name, city: data.city } });
      } else {
        existing = await prisma.hospital.findFirst({ where: { name: data.name } });
      }

      let hospital: any;
      if (existing) {
        hospital = await prisma.hospital.update({ where: { id: existing.id }, data });
        results.hospitals.push({ id: hospital.id, name: hospital.name, action: 'updated' });
      } else {
        hospital = await prisma.hospital.create({ data });
        results.hospitals.push({ id: hospital.id, name: hospital.name, action: 'created' });
      }

      await prisma.adminAuditLog.create({
        data: { adminId, action: 'IMPORT_HOSPITAL', entityType: 'HOSPITAL', entityId: hospital.id, details: hospital.name }
      }).catch(() => {});
    } catch (err: any) {
      results.hospitals.push({ error: err?.message || String(err), input: h });
    }
  }

  // Import doctors (users + optional profiles + optional hospital membership)
  for (const d of doctors) {
    try {
      const email = String(d.email || '').trim();
      if (!email) throw new Error('doctor.email is required');
      let user = await prisma.user.findUnique({ where: { email } });
      let createdUser = false;
      if (!user) {
        const rawPassword = d.password || `${email}-Temp123!`;
        const hashedPassword = await bcrypt.hash(String(rawPassword), 10);
        const role = d.role && typeof d.role === 'string' ? d.role : 'DOCTOR';
        user = await prisma.user.create({ data: { email, password: hashedPassword, role } });
        createdUser = true;
      } else if (d.role && typeof d.role === 'string' && user.role !== d.role) {
        user = await prisma.user.update({ where: { id: user.id }, data: { role: d.role } });
      }

      // Optional doctor profile creation
      if (d.profile) {
        const p = d.profile;
        const required = ['specialization', 'clinicAddress', 'phone', 'consultationFee'] as const;
        for (const key of required) {
          if (!p[key]) throw new Error(`doctor.profile.${key} is required`);
        }
        const existingProfile = await prisma.doctorProfile.findUnique({ where: { userId: user.id } });
        if (!existingProfile) {
          const slugify = (s: string) => String(s).toLowerCase()
        .replace(/[^\w\s-]/g, '') // Keep alphanumeric, spaces, and hyphens
        .replace(/\s+/g, '-') // Replace spaces with single hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
          const base = String(p.slug || p.clinicName || email);
          let slug = slugify(base);
          let suffix = 0;
          while (true) {
            const exists = await prisma.doctorProfile.findUnique({ where: { slug }, select: { id: true } });
            if (!exists) break;
            suffix++;
            slug = `${slugify(base)}-${suffix}`;
          }
          await prisma.doctorProfile.create({
            data: {
              specialization: String(p.specialization),
              qualifications: p.qualifications ? String(p.qualifications) : undefined,
              experience: Number.isFinite(Number(p.experience)) ? Number(p.experience) : undefined,
              clinicName: p.clinicName ? String(p.clinicName) : undefined,
              clinicAddress: String(p.clinicAddress),
              city: p.city ? String(p.city) : undefined,
              state: p.state ? String(p.state) : undefined,
              phone: String(p.phone),
              consultationFee: Number(p.consultationFee),
              slug,
              user: { connect: { id: user.id } },
            }
          });
        }
      }

      // Optional hospital membership
      let hospitalId = d.hospitalId;
      if (!hospitalId && d.hospitalName) {
        const found = await prisma.hospital.findFirst({ where: { name: String(d.hospitalName) } });
        hospitalId = found?.id;
      }
      if (hospitalId && Number.isFinite(Number(hospitalId))) {
        const hid = Number(hospitalId);
        const membership = await prisma.hospitalDoctor.findFirst({ where: { hospitalId: hid, doctorId: user.id }, select: { id: true } });
        if (!membership) {
          await prisma.hospitalDoctor.create({ data: { hospitalId: hid, doctorId: user.id } });
        }
      }

      await prisma.adminAuditLog.create({
        data: { adminId, action: 'IMPORT_DOCTOR', entityType: 'USER', entityId: user.id, details: email }
      }).catch(() => {});

      results.doctors.push({ id: user.id, email, action: createdUser ? 'created' : 'updated' });
    } catch (err: any) {
      results.doctors.push({ error: err?.message || String(err), input: d });
    }
  }

  return res.status(200).json(results);
});

// ============================================================================
// 🕒 SLOT ADMIN API ENDPOINTS - For slot admin panel functionality
// ============================================================================

// Middleware to verify slot admin role
const slotAdminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user!;
  if (!['SLOT_ADMIN', 'ADMIN'].includes(user.role)) {
    return res.status(403).json({ message: 'Forbidden: Slot admin access required' });
  }
  next();
};

// Get slot admin context (doctor and hospital info)
app.get('/api/slot-admin/context', authMiddleware, slotAdminMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  try {
    let doctor = null;
    let hospital = null;

    if (user.role === 'SLOT_ADMIN') {
      // Find the doctor this slot admin manages
      const slotAdmin = await prisma.user.findUnique({
        where: { id: user.userId },
        include: {
          managedDoctorProfile: {
            include: {
              user: { select: { id: true, email: true } }
            }
          }
        }
      });

      if (slotAdmin?.managedDoctorProfile) {
        doctor = {
          id: slotAdmin.managedDoctorProfile.user.id,
          email: slotAdmin.managedDoctorProfile.user.email,
          doctorProfileId: slotAdmin.managedDoctorProfile.id
        };

        // Find hospital this doctor belongs to
        const hospitalDoctor = await prisma.hospitalDoctor.findFirst({
          where: { doctorId: doctor.id },
          include: { hospital: { select: { id: true, name: true } } }
        });

        if (hospitalDoctor) {
          hospital = hospitalDoctor.hospital;
        }
      }
    }

    res.status(200).json({ doctor, hospital });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load context' });
  }
});

// Get appointments for slot admin
app.get('/api/slot-admin/appointments', authMiddleware, slotAdminMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  try {
    let doctorId = null;

    if (user.role === 'SLOT_ADMIN') {
      // Find the doctor this slot admin manages
      const slotAdmin = await prisma.user.findUnique({
        where: { id: user.userId },
        include: { managedDoctorProfile: { select: { userId: true } } }
      });
      doctorId = slotAdmin?.managedDoctorProfile?.userId;
    }

    if (!doctorId) {
      return res.status(404).json({ message: 'No managed doctor found' });
    }

    const appointments = await prisma.appointment.findMany({
      where: { doctorId },
      include: {
        doctor: { select: { id: true, email: true } },
        patient: { select: { id: true, email: true } }
      },
      orderBy: { date: 'asc' }
    });

    res.status(200).json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load appointments' });
  }
});

// Get slots for slot admin
app.get('/api/slot-admin/slots', authMiddleware, slotAdminMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  try {
    let doctorId = null;

    if (user.role === 'SLOT_ADMIN') {
      const slotAdmin = await prisma.user.findUnique({
        where: { id: user.userId },
        include: { managedDoctorProfile: { select: { userId: true } } }
      });
      doctorId = slotAdmin?.managedDoctorProfile?.userId;
    }

    if (!doctorId) {
      return res.status(404).json({ message: 'No managed doctor found' });
    }

    const slots = await prisma.slot.findMany({
      where: { doctorId },
      orderBy: { date: 'asc' }
    });

    res.status(200).json({ slots });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load slots' });
  }
});

// Get working hours for slot admin
app.get('/api/slot-admin/working-hours', authMiddleware, slotAdminMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  try {
    let doctorId = null;

    if (user.role === 'SLOT_ADMIN') {
      const slotAdmin = await prisma.user.findUnique({
        where: { id: user.userId },
        include: { managedDoctorProfile: { select: { userId: true } } }
      });
      doctorId = slotAdmin?.managedDoctorProfile?.userId;
    }

    const queryDoctorId = req.query.doctorId ? Number(req.query.doctorId) : doctorId;

    if (!queryDoctorId) {
      return res.status(400).json({ message: 'Doctor ID required' });
    }

    // For now, return default working hours since we don't have a working hours table
    const defaultWorkingHours = [
      { dayOfWeek: 0, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 5, startTime: '10:00', endTime: '14:00' },
      { dayOfWeek: 6, startTime: null, endTime: null }
    ];

    res.status(200).json(defaultWorkingHours);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load working hours' });
  }
});

// Get slot period for slot admin
app.get('/api/slot-admin/slot-period', authMiddleware, slotAdminMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  try {
    let doctorId = null;

    if (user.role === 'SLOT_ADMIN') {
      const slotAdmin = await prisma.user.findUnique({
        where: { id: user.userId },
        include: { managedDoctorProfile: { select: { userId: true } } }
      });
      doctorId = slotAdmin?.managedDoctorProfile?.userId;
    }

    const queryDoctorId = req.query.doctorId ? Number(req.query.doctorId) : doctorId;

    if (!queryDoctorId) {
      return res.status(400).json({ message: 'Doctor ID required' });
    }

    // Check if doctor has a custom slot period
    const doctorProfile = await prisma.doctorProfile.findFirst({
      where: { userId: queryDoctorId },
      select: { slotPeriodMinutes: true }
    });

    const slotPeriodMinutes = doctorProfile?.slotPeriodMinutes || 15;
    res.status(200).json({ slotPeriodMinutes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load slot period' });
  }
});

// Get time-off for slot admin
app.get('/api/slot-admin/time-off', authMiddleware, slotAdminMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  try {
    let doctorProfileId = null;

    if (user.role === 'SLOT_ADMIN') {
      const slotAdmin = await prisma.user.findUnique({
        where: { id: user.userId },
        include: { managedDoctorProfile: { select: { id: true } } }
      });
      doctorProfileId = slotAdmin?.managedDoctorProfile?.id;
    }

    const queryDoctorProfileId = req.query.doctorProfileId ? Number(req.query.doctorProfileId) : doctorProfileId;

    if (!queryDoctorProfileId) {
      return res.status(400).json({ message: 'Doctor profile ID required' });
    }

    // For now, return empty time-off since we don't have a time-off table
    res.status(200).json([]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load time-off' });
  }
});

// Cancel slot
app.patch('/api/slot-admin/slots/:slotId/cancel', authMiddleware, slotAdminMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  const slotId = Number(req.params.slotId);
  const { reason } = req.body;

  if (!Number.isFinite(slotId)) {
    return res.status(400).json({ message: 'Invalid slot ID' });
  }

  try {
    let doctorId = null;

    if (user.role === 'SLOT_ADMIN') {
      const slotAdmin = await prisma.user.findUnique({
        where: { id: user.userId },
        include: { managedDoctorProfile: { select: { userId: true } } }
      });
      doctorId = slotAdmin?.managedDoctorProfile?.userId;
    }

    if (!doctorId) {
      return res.status(404).json({ message: 'No managed doctor found' });
    }

    // Verify slot belongs to managed doctor
    const slot = await prisma.slot.findFirst({
      where: { id: slotId, doctorId }
    });

    if (!slot) {
      return res.status(404).json({ message: 'Slot not found or not authorized' });
    }

    // Update slot status to cancelled
    await prisma.slot.update({
      where: { id: slotId },
      data: { 
        status: 'CANCELLED',
        // Add reason to notes if available
        ...(reason && { notes: reason })
      }
    });

    res.status(200).json({ message: 'Slot cancelled successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to cancel slot' });
  }
});

// Update appointment status
app.patch('/api/slot-admin/appointments/:appointmentId/status', authMiddleware, slotAdminMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  const appointmentId = Number(req.params.appointmentId);
  const { status } = req.body;

  if (!Number.isFinite(appointmentId)) {
    return res.status(400).json({ message: 'Invalid appointment ID' });
  }

  if (!['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    let doctorId = null;

    if (user.role === 'SLOT_ADMIN') {
      const slotAdmin = await prisma.user.findUnique({
        where: { id: user.userId },
        include: { managedDoctorProfile: { select: { userId: true } } }
      });
      doctorId = slotAdmin?.managedDoctorProfile?.userId;
    }

    if (!doctorId) {
      return res.status(404).json({ message: 'No managed doctor found' });
    }

    // Verify appointment belongs to managed doctor
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, doctorId }
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found or not authorized' });
    }

    // Update appointment status
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status },
      include: {
        doctor: { select: { id: true, email: true } },
        patient: { select: { id: true, email: true } }
      }
    });

    // Broadcast real-time update
    broadcastDoctorEvent(doctorId, 'appointment-updated', { appointment: updatedAppointment });
    if (appointment.patientId) {
      broadcastPatientEvent(appointment.patientId, 'appointment-updated', { appointment: updatedAppointment });
    }

    res.status(200).json(updatedAppointment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update appointment status' });
  }
});

// Cancel appointment
app.patch('/api/slot-admin/appointments/:appointmentId/cancel', authMiddleware, slotAdminMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  const appointmentId = Number(req.params.appointmentId);
  const { reason } = req.body;

  if (!Number.isFinite(appointmentId)) {
    return res.status(400).json({ message: 'Invalid appointment ID' });
  }

  try {
    let doctorId = null;

    if (user.role === 'SLOT_ADMIN') {
      const slotAdmin = await prisma.user.findUnique({
        where: { id: user.userId },
        include: { managedDoctorProfile: { select: { userId: true } } }
      });
      doctorId = slotAdmin?.managedDoctorProfile?.userId;
    }

    if (!doctorId) {
      return res.status(404).json({ message: 'No managed doctor found' });
    }

    // Verify appointment belongs to managed doctor
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, doctorId }
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found or not authorized' });
    }

    // Update appointment status to cancelled
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { 
        status: 'CANCELLED',
        ...(reason && { reason })
      },
      include: {
        doctor: { select: { id: true, email: true } },
        patient: { select: { id: true, email: true } }
      }
    });

    // Broadcast real-time update
    broadcastDoctorEvent(doctorId, 'appointment-cancelled', { appointment: updatedAppointment });
    if (appointment.patientId) {
      broadcastPatientEvent(appointment.patientId, 'appointment-cancelled', { appointment: updatedAppointment });
    }

    res.status(200).json(updatedAppointment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to cancel appointment' });
  }
});

// Update appointment (for allotting pending appointments)
app.patch('/api/slot-admin/appointments/:appointmentId', authMiddleware, slotAdminMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  const appointmentId = Number(req.params.appointmentId);
  const { date, time, status } = req.body;

  if (!Number.isFinite(appointmentId)) {
    return res.status(400).json({ message: 'Invalid appointment ID' });
  }

  try {
    let doctorId = null;

    if (user.role === 'SLOT_ADMIN') {
      const slotAdmin = await prisma.user.findUnique({
        where: { id: user.userId },
        include: { managedDoctorProfile: { select: { userId: true } } }
      });
      doctorId = slotAdmin?.managedDoctorProfile?.userId;
    }

    if (!doctorId) {
      return res.status(404).json({ message: 'No managed doctor found' });
    }

    // Verify appointment belongs to managed doctor
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, doctorId }
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found or not authorized' });
    }

    // Prepare update data
    const updateData: any = {};
    if (date) updateData.date = new Date(date);
    if (time) updateData.time = time;
    if (status) updateData.status = status;

    // Update appointment
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: updateData,
      include: {
        doctor: { select: { id: true, email: true } },
        patient: { select: { id: true, email: true } }
      }
    });

    // Broadcast real-time update
    broadcastDoctorEvent(doctorId, 'appointment-updated', { appointment: updatedAppointment });
    if (appointment.patientId) {
      broadcastPatientEvent(appointment.patientId, 'appointment-updated', { appointment: updatedAppointment });
    }

    res.status(200).json({ appointment: updatedAppointment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update appointment' });
  }
});

server.listen(port, () => {
  console.log(`[server]: API Server running at http://localhost:${port}`);
});

// --- Doctor Slot Admin Endpoints ---
// Get current slot admin for the logged-in doctor
app.get('/api/doctor/slot-admin', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role !== 'DOCTOR') {
    return res.status(403).json({ message: 'Forbidden: Only doctors can manage slot admin.' });
  }
  try {
    const profile = await prisma.doctorProfile.findUnique({ where: { userId: user.userId }, select: { id: true } });
    if (!profile) return res.status(404).json({ message: 'Doctor profile not found' });
    const admin = await prisma.user.findFirst({ where: { managedDoctorProfileId: profile.id, role: 'SLOT_ADMIN' }, select: { email: true } });
    if (!admin) return res.status(200).json({ slotAdmin: null });
    return res.status(200).json({ slotAdmin: { email: admin.email } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'An error occurred while fetching slot admin.' });
  }
});

// Create or update slot admin for the logged-in doctor
app.post('/api/doctor/slot-admin', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role !== 'DOCTOR') {
    return res.status(403).json({ message: 'Forbidden: Only doctors can manage slot admin.' });
  }
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });
  try {
    const profile = await prisma.doctorProfile.findUnique({ where: { userId: user.userId }, select: { id: true } });
    if (!profile) return res.status(404).json({ message: 'Doctor profile not found' });

    const hashed = await bcrypt.hash(password, 10);

    // Find existing slot admin for this doctor
    const existing = await prisma.user.findFirst({ where: { managedDoctorProfileId: profile.id, role: 'SLOT_ADMIN' } });
    if (existing) {
      // Update existing admin credentials
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: { email, password: hashed, role: 'SLOT_ADMIN', canLogin: true },
        select: { email: true }
      });
      return res.status(200).json({ slotAdmin: { email: updated.email } });
    }

    // If an account with the target email exists, repurpose as slot admin
    const byEmail = await prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      const updated = await prisma.user.update({
        where: { id: byEmail.id },
        data: { password: hashed, role: 'SLOT_ADMIN', managedDoctorProfileId: profile.id, canLogin: true },
        select: { email: true }
      });
      return res.status(200).json({ slotAdmin: { email: updated.email } });
    }

    // Otherwise create a fresh slot admin user
    const created = await prisma.user.create({
      data: { email, password: hashed, role: 'SLOT_ADMIN', managedDoctorProfileId: profile.id, canLogin: true },
      select: { email: true }
    });
    return res.status(201).json({ slotAdmin: { email: created.email } });
  } catch (error) {
    console.error(error);
  return res.status(500).json({ message: 'An error occurred while upserting slot admin.' });
  }
});

// --- Hospital Admin: Get/Upsert Slot Admin for a Doctor ---
app.get('/api/hospitals/slot-admin', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  if (!['HOSPITAL_ADMIN', 'ADMIN'].includes(user.role)) {
    return res.status(403).json({ message: 'Forbidden: Hospital admin access required' });
  }
  const doctorId = Number((req.query as any)?.doctorId);
  if (!Number.isFinite(doctorId)) {
    return res.status(400).json({ message: 'Invalid doctorId' });
  }
  try {
    if (user.role === 'HOSPITAL_ADMIN') {
      // Verify the doctor is linked to the admin's hospital
      let hospital = await prisma.hospital.findFirst({ where: { adminId: user.userId } });
      if (!hospital) {
        const me = await prisma.user.findUnique({ where: { id: user.userId }, select: { managedHospitalId: true } });
        if (me?.managedHospitalId) hospital = await prisma.hospital.findUnique({ where: { id: me.managedHospitalId } });
      }
      if (!hospital) return res.status(404).json({ message: 'No hospital found for this admin.' });
      const membership = await prisma.hospitalDoctor.findFirst({ where: { hospitalId: hospital.id, doctorId } });
      if (!membership) return res.status(403).json({ message: 'Doctor not linked to your hospital.' });
    }
    const profile = await prisma.doctorProfile.findUnique({ where: { userId: doctorId }, select: { id: true } });
    if (!profile) return res.status(200).json({ slotAdmin: null });
    const admin = await prisma.user.findFirst({ where: { managedDoctorProfileId: profile.id, role: 'SLOT_ADMIN' }, select: { email: true } });
    return res.status(200).json({ slotAdmin: admin ? { email: admin.email } : null });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'An error occurred while fetching slot admin.' });
  }
});

app.post('/api/hospitals/slot-admin', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  if (!['HOSPITAL_ADMIN', 'ADMIN'].includes(user.role)) {
    return res.status(403).json({ message: 'Forbidden: Hospital admin access required' });
  }
  const { doctorId, email, password } = (req.body || {}) as { doctorId?: number; email?: string; password?: string };
  if (!Number.isFinite(Number(doctorId))) return res.status(400).json({ message: 'Invalid doctorId' });
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });
  try {
    if (user.role === 'HOSPITAL_ADMIN') {
      let hospital = await prisma.hospital.findFirst({ where: { adminId: user.userId } });
      if (!hospital) {
        const me = await prisma.user.findUnique({ where: { id: user.userId }, select: { managedHospitalId: true } });
        if (me?.managedHospitalId) hospital = await prisma.hospital.findUnique({ where: { id: me.managedHospitalId } });
      }
      if (!hospital) return res.status(404).json({ message: 'No hospital found for this admin.' });
      const membership = await prisma.hospitalDoctor.findFirst({ where: { hospitalId: hospital.id, doctorId: Number(doctorId) } });
      if (!membership) return res.status(403).json({ message: 'Doctor not linked to your hospital.' });
    }
    const profile = await prisma.doctorProfile.findUnique({ where: { userId: Number(doctorId) }, select: { id: true } });
    if (!profile) return res.status(404).json({ message: 'Doctor profile not found' });
    const hashed = await bcrypt.hash(password, 10);
    const existing = await prisma.user.findFirst({ where: { managedDoctorProfileId: profile.id, role: 'SLOT_ADMIN' } });
    if (existing) {
      const updated = await prisma.user.update({ where: { id: existing.id }, data: { email, password: hashed, role: 'SLOT_ADMIN', canLogin: true }, select: { email: true } });
      return res.status(200).json({ slotAdmin: { email: updated.email } });
    }
    const byEmail = await prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      const updated = await prisma.user.update({ where: { id: byEmail.id }, data: { password: hashed, role: 'SLOT_ADMIN', managedDoctorProfileId: profile.id, canLogin: true }, select: { email: true } });
      return res.status(200).json({ slotAdmin: { email: updated.email } });
    }
    const created = await prisma.user.create({ data: { email, password: hashed, role: 'SLOT_ADMIN', managedDoctorProfileId: profile.id, canLogin: true }, select: { email: true } });
    return res.status(201).json({ slotAdmin: { email: created.email } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'An error occurred while upserting slot admin.' });
  }
});

// --- Me: Hospital for current admin ---
app.get('/api/me/hospital', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  if (!['ADMIN', 'HOSPITAL_ADMIN'].includes(user.role)) {
    return res.status(403).json({ message: 'Forbidden: Hospital admin access required' });
  }
  try {
    let hospital = await prisma.hospital.findFirst({ where: { adminId: user.userId } });
    if (!hospital) {
      const me = await prisma.user.findUnique({ where: { id: user.userId }, select: { managedHospitalId: true } });
      if (me?.managedHospitalId) {
        hospital = await prisma.hospital.findUnique({ where: { id: me.managedHospitalId } });
      }
    }
    if (!hospital) {
      return res.status(404).json({ message: 'No hospital found for this admin.' });
    }
    return res.status(200).json({
      id: hospital.id,
      name: hospital.name,
      address: hospital.address ?? undefined,
      city: hospital.city ?? undefined,
      state: hospital.state ?? undefined,
      phone: hospital.phone ?? undefined,
      subdomain: hospital.subdomain ?? undefined,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'An error occurred while fetching hospital.' });
  }
});

// Create a hospital and link to current admin
app.post('/api/hospitals', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  if (!['ADMIN', 'HOSPITAL_ADMIN'].includes(user.role)) {
    return res.status(403).json({ message: 'Forbidden: Hospital admin access required' });
  }
  const { name, address, city, state, phone } = (req.body || {}) as { name?: string; address?: string; city?: string; state?: string; phone?: string };
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ message: 'Hospital name is required.' });
  }
  try {
    const created = await prisma.hospital.create({
      data: { name: name.trim(), address, city, state, phone, adminId: user.userId, status: 'PENDING', verificationSubmitted: false, verificationStatus: 'PENDING' },
      select: { id: true }
    });
    cachedHospitals = [];
    lastHospitalsFetch = 0;
    // Audit log for traceability
    await prisma.adminAuditLog.create({ data: { adminId: user.userId, action: 'CREATE_HOSPITAL', entityType: 'Hospital', entityId: created.id } });
    return res.status(201).json({ id: created.id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'An error occurred while creating hospital.' });
  }
});

// --- Hospital Admin: Submit verification details ---
app.post('/api/hospital/verification', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  if (!['HOSPITAL_ADMIN', 'ADMIN'].includes(user.role)) {
    return res.status(403).json({ message: 'Forbidden: Hospital admin access required' });
  }
  try {
    let hospital = await prisma.hospital.findFirst({ where: { adminId: user.userId } });
    if (!hospital) {
      const me = await prisma.user.findUnique({ where: { id: user.userId }, select: { managedHospitalId: true, email: true } });
      if (me?.managedHospitalId) {
        hospital = await prisma.hospital.findUnique({ where: { id: me.managedHospitalId } });
      }
    }
    const { registrationNumberGov, phone, address, city, state, name } = (req.body || {}) as { registrationNumberGov?: string; phone?: string; address?: string; city?: string; state?: string; name?: string };
    if (!hospital) {
      const derivedName = name || `Hospital of ${user.email.split('@')[0]}`;
      hospital = await prisma.hospital.create({
        data: {
          name: derivedName,
          address: address || '',
          city: city || '',
          state: state || '',
          phone: phone || '',
          adminId: user.userId,
          status: 'PENDING',
          verificationSubmitted: false,
          verificationStatus: 'PENDING',
          registrationNumberGov: null
        }
      });
    }
    const updated = await prisma.hospital.update({
      where: { id: hospital.id },
      data: {
        registrationNumberGov: registrationNumberGov ?? hospital.registrationNumberGov ?? null,
        phone: phone ?? hospital.phone,
        address: address ?? hospital.address,
        city: city ?? hospital.city,
        state: state ?? hospital.state,
        verificationSubmitted: true,
        verificationStatus: 'PENDING',
        status: 'PENDING'
      }
    });
    await prisma.adminAuditLog.create({
      data: { adminId: user.userId, action: 'HOSPITAL_VERIFICATION_SUBMIT', entityType: 'HOSPITAL', entityId: updated.id, details: registrationNumberGov || '' }
    }).catch(() => {});
    return res.status(200).json({ success: true, hospital: { id: updated.id } });
  } catch (error) {
    console.error('Hospital verification submit error:', error);
    return res.status(500).json({ message: 'Failed to submit hospital verification' });
  }
});
// --- Debug endpoint for hospital cache ---
app.get('/api/debug/hospitals', async (req: Request, res: Response) => {
  try {
    console.log('🔍 Manual hospital cache debug triggered');
    
    // Force refresh hospital cache
    const hospitals = await getHospitalCandidates(prisma);
    
    res.status(200).json({
      message: 'Hospital cache debug complete',
      count: hospitals.length,
      hospitals: hospitals.map(h => ({
        id: h.id,
        name: h.name,
        hasProfile: !!h.profile
      }))
    });
  } catch (err: any) {
    console.error('Debug endpoint error:', err);
    res.status(500).json({ 
      message: 'Debug failed', 
      error: err && err.message ? String(err.message) : String(err) 
    });
  }
});

// --- Subdomain utilities and endpoints ---
const RESERVED_SUBDOMAINS = new Set(['www','api','admin','doctor','doctors','hospital','hospitals']);
function normalizeSubdomain(s: string): string {
  return String(s || '').toLowerCase().trim();
}
function isValidSubdomain(s: string): boolean {
  const v = normalizeSubdomain(s);
  if (!v) return false;
  if (RESERVED_SUBDOMAINS.has(v)) return false;
  if (v.length < 2 || v.length > 63) return false;
  // Support both subdomains and custom domains
  if (!/^[a-z0-9.-]+$/.test(v)) return false;
  if (v.startsWith('.') || v.endsWith('.')) return false;
  if (v.startsWith('-') || v.endsWith('-')) return false;
  return true;
}

// Check availability
app.get('/api/hospitals/subdomain-available/:name', async (req: Request, res: Response) => {
  const raw = String(req.params.name || '').toLowerCase();
  if (!isValidSubdomain(raw)) {
    return res.status(400).json({ available: false, message: 'Invalid subdomain format' });
  }
  const existing = await prisma.hospital.findFirst({ where: { subdomain: raw }, select: { id: true } });
  return res.status(200).json({ available: !existing });
});

// Resolve hospital by subdomain
app.get('/api/hospitals/subdomain/:name', async (req: Request, res: Response) => {
  const raw = String(req.params.name || '').toLowerCase();
  const item = await prisma.hospital.findFirst({ where: { subdomain: raw }, select: { id: true, name: true, subdomain: true } });
  if (!item) return res.status(404).json({ message: 'Hospital not found' });
  return res.status(200).json(item);
});

// Set/update hospital subdomain
app.patch('/api/hospitals/:hospitalId/subdomain', authMiddleware, async (req: Request, res: Response) => {
  const hospitalId = Number(req.params.hospitalId);
  if (!Number.isFinite(hospitalId)) return res.status(400).json({ message: 'Invalid hospitalId' });
  const desired = normalizeSubdomain((req.body || {}).subdomain);

  try {
    const user = req.user!;
    // Authorization: admin or owning hospital admin / managedHospitalId
    let authorized = user.role === 'ADMIN';
    if (!authorized && user.role === 'HOSPITAL_ADMIN') {
      const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId }, select: { adminId: true } });
      if (hospital?.adminId === user.userId) authorized = true;
      if (!authorized) {
        const me = await prisma.user.findUnique({ where: { id: user.userId }, select: { managedHospitalId: true } });
        if (me?.managedHospitalId === hospitalId) authorized = true;
      }
    }
    if (!authorized) return res.status(403).json({ message: 'Forbidden' });

    if (desired && !isValidSubdomain(desired)) {
      return res.status(400).json({ message: 'Invalid subdomain. Use a-z, 0-9, - only.' });
    }
    if (desired) {
      const existing = await prisma.hospital.findFirst({ where: { subdomain: desired, NOT: { id: hospitalId } }, select: { id: true } });
      if (existing) return res.status(409).json({ message: 'Subdomain already taken' });
    }
    const updated = await prisma.hospital.update({ where: { id: hospitalId }, data: { subdomain: desired || null }, select: { id: true, subdomain: true } });
    cachedHospitals = [];
    lastHospitalsFetch = 0;
    await prisma.adminAuditLog.create({ data: { adminId: user.userId, action: 'SET_HOSPITAL_SUBDOMAIN', entityType: 'Hospital', entityId: hospitalId, details: desired || '' } }).catch(() => {});
    return res.status(200).json(updated);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Failed to set subdomain' });
  }
});

// --- Hospital Endpoints (Public) ---
app.get('/api/hospitals', async (req: Request, res: Response) => {
  try {
    const page = parseInt(String(req.query.page ?? '1'), 10);
    const limitParam = String(req.query.limit ?? '100');
    const allHospitals = await getHospitalCandidates(prisma);
    const limit = limitParam.toLowerCase() === 'all' ? allHospitals.length : parseInt(limitParam, 10);
    const skip = (page - 1) * limit;
    
    // Apply pagination to cached data
    const paginatedHospitals = allHospitals.slice(skip, skip + limit);
    
    console.log(`🏥 API: Returning ${paginatedHospitals.length} hospitals (Total: ${allHospitals.length})`);
    
    res.status(200).json({
      success: true,
      data: paginatedHospitals,
      count: allHospitals.length
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ success: false, message: 'An error occurred while fetching hospitals.' });
  }
});

// Resolve hospital by slug (slugified name)
function slugifyHospitalName(input: string): string {
  const s = (input || '').toLowerCase().trim();
  // Handle spaces and special characters properly
  return s.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
}

app.get('/api/hospitals/slug/:slug/profile', async (req: Request, res: Response) => {
  const slug = String(req.params.slug || '').toLowerCase();
  try {
    // Optimization: Use cached hospitals if available
    let match = null;
    
    // 1. Try to treat slug as ID first
    const id = parseInt(slug);
    if (!isNaN(id)) {
      match = await prisma.hospital.findUnique({
        where: { id },
        select: { id: true, name: true, profile: true }
      });
    }

    // 2. If not found by ID, try to match by slug in cached hospitals
    if (!match) {
      const allHospitals = await getHospitalCandidates(prisma);
      match = allHospitals.find((h: any) => slugifyHospitalName(h.name) === slug);
    }

    // 3. If still not found, try a direct DB search (fallback)
    if (!match) {
      const items = await prisma.hospital.findMany({ select: { id: true, name: true, profile: true } });
      match = items.find((h: any) => slugifyHospitalName(h.name) === slug);
    }

    if (!match) return res.status(404).json({ message: 'Hospital not found' });
    return res.status(200).json({ hospitalId: match.id, name: match.name, profile: match.profile ?? null });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: 'An error occurred while resolving hospital by slug.' });
  }
});

app.get('/api/hospitals/slug/:slug', async (req: Request, res: Response) => {
  const slug = String(req.params.slug || '').toLowerCase();
  try {
    // Optimization: Similar logic for full details
    let match = null;
    const id = parseInt(slug);
    
    if (!isNaN(id)) {
      match = await prisma.hospital.findUnique({
        where: { id },
        select: { id: true, name: true, profile: true }
      });
    }

    if (!match) {
      const allHospitals = await getHospitalCandidates(prisma);
      match = allHospitals.find((h: any) => slugifyHospitalName(h.name) === slug);
    }

    if (!match) {
      const items = await prisma.hospital.findMany({ select: { id: true, name: true, profile: true } });
      match = items.find((h: any) => slugifyHospitalName(h.name) === slug);
    }

    if (!match) return res.status(404).json({ message: 'Hospital not found' });
    
    const hospitalId = match.id;
    const hospital = { id: hospitalId, name: match.name, profile: match.profile } as { id: number; name: string; profile: any | null };
    
    // Fetch departments and doctors in parallel
    const [departmentsResult, links] = await Promise.all([
      prisma.department.findMany({ where: { hospitalId }, select: { id: true, name: true } }),
      prisma.hospitalDoctor.findMany({
        where: { hospitalId },
        select: {
          departmentId: true,
          doctor: {
            select: {
              id: true,
              email: true,
              doctorProfile: true,
            }
          },
          department: { select: { id: true, name: true } },
        },
      })
    ]);

    const departments = Array.isArray((hospital.profile as any)?.departments)
      ? (hospital.profile as any).departments
      : departmentsResult;

    // Skip the expensive auto-healing logic if we already have links
    // This logic seems to be for one-time setup or data correction
    // and shouldn't run on every page load if possible.
    
    const doctors = links.map((l: any) => ({ doctor: l.doctor, department: l.department || null }));
    return res.status(200).json({ 
      id: hospital.id, 
      name: hospital.name, 
      profile: hospital.profile, // Include profile in full details
      departments, 
      doctors 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'An error occurred while resolving hospital by slug.' });
  }
});

// --- Public hospital details ---
app.get('/api/hospitals/:hospitalId/details', async (req: Request, res: Response) => {
  const hospitalId = Number(req.params.hospitalId);
  if (!Number.isFinite(hospitalId)) {
    return res.status(400).json({ message: 'Invalid hospitalId' });
  }
  try {
    let hospital: any = null;
    try {
      hospital = await prisma.hospital.findUnique({
        where: { id: hospitalId },
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          state: true,
          phone: true,
          subdomain: true,
          profile: true,
        }
      });
    } catch (e: any) {
      if (e && e.code === 'P2022') {
        hospital = await prisma.hospital.findUnique({
          where: { id: hospitalId },
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
            phone: true,
            subdomain: true,
            profile: true,
          }
        });
      } else {
        throw e;
      }
    }
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }
    res.status(200).json(hospital);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching hospital details.' });
  }
});

// --- Public hospital full details expected by microsite consumers ---
app.get('/api/hospitals/:hospitalId', async (req: Request, res: Response) => {
  const hospitalId = Number(req.params.hospitalId);
  if (!Number.isFinite(hospitalId)) {
    return res.status(400).json({ message: 'Invalid hospitalId' });
  }
  try {
    const hospital = await prisma.hospital.findUnique({
      where: { id: hospitalId },
      select: { id: true, name: true, profile: true, subdomain: true },
    });
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
    const departments = Array.isArray((hospital.profile as any)?.departments)
      ? (hospital.profile as any).departments
      : [];
    let links: Array<{ departmentId: number | null; doctor: { id: number; email: string; doctorProfile: any | null }; department: { id: number; name: string } | null }> = await prisma.hospitalDoctor.findMany({
      where: { hospitalId },
      select: {
        departmentId: true,
        doctor: {
          select: {
            id: true,
            email: true,
            doctorProfile: true,
          }
        },
        department: { select: { id: true, name: true } },
      },
    });

    // Auto-heal missing department links from profile.doctors when exactly one department is assigned
    try {
      const profile: any = hospital.profile || {};
      const profileDoctors: any[] = Array.isArray(profile.doctors) ? profile.doctors : [];
      const deptByDoctorId = new Map<number, string>();
      const doctorIdsInProfile: number[] = [];
      for (const d of profileDoctors) {
        const did = Number(d?.doctorId);
        const deptName = Array.isArray(d?.departments) && d.departments[0] ? String(d.departments[0]).trim() : '';
        if (Number.isFinite(did)) doctorIdsInProfile.push(did);
        if (Number.isFinite(did) && deptName) deptByDoctorId.set(did, deptName);
      }
      {
        const existingIds = new Set<number>(links.map((l) => l.doctor.id));
        const missing = doctorIdsInProfile.filter((id) => !existingIds.has(id));
        for (const did of missing) {
          try {
            await prisma.hospitalDoctor.create({ data: { hospitalId, doctorId: did } });
          } catch (_) {}
        }
        if (missing.length > 0) {
          links = await prisma.hospitalDoctor.findMany({
            where: { hospitalId },
            select: {
              departmentId: true,
              doctor: { select: { id: true, email: true, doctorProfile: true } },
              department: { select: { id: true, name: true } },
            }
          });
        }
      }
      const toFix = links.filter((l) => !l.departmentId && deptByDoctorId.has(l.doctor.id));
      for (const l of toFix) {
        const name = deptByDoctorId.get(l.doctor.id)!;
        let dep = await prisma.department.findFirst({ where: { hospitalId, name } });
        if (!dep) dep = await prisma.department.create({ data: { hospitalId, name } });
        await prisma.hospitalDoctor.update({ where: { hospitalId_doctorId: { hospitalId, doctorId: l.doctor.id } }, data: { departmentId: dep.id } });
      }
      if (toFix.length > 0) {
        links = await prisma.hospitalDoctor.findMany({
          where: { hospitalId },
          select: {
            departmentId: true,
            doctor: { select: { id: true, email: true, doctorProfile: true } },
            department: { select: { id: true, name: true } },
          }
        });
      }
    } catch {}
    const doctors = links.map((l) => ({ doctor: l.doctor, department: l.department || null }));
    return res.status(200).json({ 
      id: hospital.id, 
      name: hospital.name, 
      profile: hospital.profile, 
      subdomain: hospital.subdomain,
      departments, 
      doctors 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'An error occurred while fetching hospital details.' });
  }
});

// --- Hospital Admin: Create and link a real doctor account (bookable) ---
app.post('/api/hospitals/:hospitalId/doctors', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  if (!['ADMIN', 'HOSPITAL_ADMIN'].includes(user.role)) {
    return res.status(403).json({ message: 'Forbidden: Hospital admin access required.' });
  }
  const hospitalId = Number(req.params.hospitalId);
  if (!Number.isFinite(hospitalId)) {
    return res.status(400).json({ message: 'Invalid hospitalId' });
  }
  const { name, primarySpecialty, subSpecialty, departmentId: reqDepartmentId, departmentName } = (req.body || {}) as { name?: string; primarySpecialty?: string; subSpecialty?: string; departmentId?: number; departmentName?: string };
  try {
    const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId }, select: { adminId: true, address: true, phone: true, profile: true, name: true } });
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
    if (user.role !== 'ADMIN' && hospital.adminId !== user.userId) {
      return res.status(403).json({ message: 'Forbidden: You do not manage this hospital.' });
    }
    let resolvedDepartmentId: number | null = null;
    if (typeof reqDepartmentId === 'number' && Number.isFinite(reqDepartmentId)) {
      const dep = await prisma.department.findUnique({ where: { id: Number(reqDepartmentId) } });
      if (!dep || dep.hospitalId !== hospitalId) {
        return res.status(400).json({ message: 'Invalid departmentId for this hospital.' });
      }
      resolvedDepartmentId = dep.id;
    } else if (typeof departmentName === 'string' && departmentName.trim().length > 0) {
      const depName = departmentName.trim();
      let dep = await prisma.department.findFirst({ where: { hospitalId, name: depName } });
      if (!dep) {
        dep = await prisma.department.create({ data: { hospitalId, name: depName } });
      }
      resolvedDepartmentId = dep.id;
    }
    const base = (name || 'doctor').toString().trim().toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
    const rnd = Math.floor(10000 + Math.random() * 90000);
    const email = `${base || 'doctor'}+${hospitalId}.${rnd}@book.local`;
    const password = Math.random().toString(36).slice(2, 10);
    const hashed = await bcrypt.hash(password, 10);
    const createdUser = await prisma.user.create({ data: { email, password: hashed, role: 'DOCTOR', canLogin: false } });
    const profile = await prisma.doctorProfile.create({
      data: {
        userId: createdUser.id,
        specialization: primarySpecialty || 'General',
        qualifications: subSpecialty || null,
        clinicName: name || null,
        clinicAddress: hospital.address || 'Not provided',
        city: null,
        state: null,
        phone: hospital.phone || 'N/A',
        consultationFee: 500,
        slotPeriodMinutes: 15,
      },
    });
    await prisma.hospitalDoctor.create({ data: { hospitalId, doctorId: createdUser.id, departmentId: resolvedDepartmentId } });

    // Ensure hospital.profile.departments includes this department name for microsite rendering
    try {
      if (resolvedDepartmentId) {
        const dep = await prisma.department.findUnique({ where: { id: resolvedDepartmentId } });
        const depName = dep?.name?.trim();
        if (depName) {
          const currentProfile: any = hospital.profile || {};
          const list: any[] = Array.isArray(currentProfile?.departments) ? currentProfile.departments : [];
          const exists = list.some((d: any) => String(d?.name || '').trim().toLowerCase() === depName.toLowerCase());
          if (!exists) {
            const updated = { ...(currentProfile || {}) };
            updated.departments = [...list, { name: depName }];
            await prisma.hospital.update({ where: { id: hospitalId }, data: { profile: updated } });
          }
        }
      }
    } catch (_) {}

    return res.status(201).json({ doctor: { id: createdUser.id, email: createdUser.email, profileId: profile.id }, departmentId: resolvedDepartmentId });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'An error occurred while creating and linking doctor.' });
  }
});

// --- Hospital Admin: Update a linked doctor's department ---
app.patch('/api/hospitals/:hospitalId/doctors/:doctorId/department', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  if (!['ADMIN', 'HOSPITAL_ADMIN'].includes(user.role)) {
    return res.status(403).json({ message: 'Forbidden: Hospital admin access required.' });
  }
  const hospitalId = Number(req.params.hospitalId);
  const doctorId = Number(req.params.doctorId);
  if (!Number.isFinite(hospitalId) || !Number.isFinite(doctorId)) {
    return res.status(400).json({ message: 'Invalid hospitalId or doctorId' });
  }
  const { departmentId: reqDepartmentId, departmentName } = (req.body || {}) as { departmentId?: number; departmentName?: string };
  try {
    const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId }, select: { adminId: true, profile: true } });
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
    if (user.role !== 'ADMIN' && hospital.adminId !== user.userId) {
      return res.status(403).json({ message: 'Forbidden: You do not manage this hospital.' });
    }
    const membership = await prisma.hospitalDoctor.findUnique({ where: { hospitalId_doctorId: { hospitalId, doctorId } } });
    if (!membership) return res.status(404).json({ message: 'Doctor not linked to this hospital' });

    let resolvedDepartmentId: number | null = null;
    if (typeof reqDepartmentId === 'number' && Number.isFinite(reqDepartmentId)) {
      const dep = await prisma.department.findUnique({ where: { id: Number(reqDepartmentId) } });
      if (!dep || dep.hospitalId !== hospitalId) {
        return res.status(400).json({ message: 'Invalid departmentId for this hospital.' });
      }
      resolvedDepartmentId = dep.id;
    } else if (typeof departmentName === 'string' && departmentName.trim().length > 0) {
      const depName = departmentName.trim();
      let dep = await prisma.department.findFirst({ where: { hospitalId, name: depName } });
      if (!dep) {
        dep = await prisma.department.create({ data: { hospitalId, name: depName } });
      }
      resolvedDepartmentId = dep.id;
    } else {
      return res.status(400).json({ message: 'Provide departmentId or departmentName.' });
    }

    const updated = await prisma.hospitalDoctor.update({
      where: { hospitalId_doctorId: { hospitalId, doctorId } },
      data: { departmentId: resolvedDepartmentId },
      include: { department: { select: { id: true, name: true } } }
    });

    // Ensure hospital profile contains department name so microsite shows the card
    try {
      if (resolvedDepartmentId) {
        const dep = await prisma.department.findUnique({ where: { id: resolvedDepartmentId } });
        const depName = dep?.name?.trim();
        if (depName) {
          const currentProfile: any = hospital.profile || {};
          const list: any[] = Array.isArray(currentProfile?.departments) ? currentProfile.departments : [];
          const exists = list.some((d: any) => String(d?.name || '').trim().toLowerCase() === depName.toLowerCase());
          if (!exists) {
            const updatedProfile = { ...(currentProfile || {}) };
            updatedProfile.departments = [...list, { name: depName }];
            await prisma.hospital.update({ where: { id: hospitalId }, data: { profile: updatedProfile } });
          }
        }
      }
    } catch (_) {}
    return res.status(200).json({ ok: true, membership: updated });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to update doctor department' });
  }
});

// --- Hospital ↔ Doctor: Get slot period (Protected, Hospital Admin / Slot Admin / Admin) ---
app.get('/api/hospitals/:hospitalId/doctors/:doctorId/slot-period', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  const hospitalId = Number(req.params.hospitalId);
  const doctorId = Number(req.params.doctorId);
  if (!Number.isFinite(hospitalId) || !Number.isFinite(doctorId)) {
    return res.status(400).json({ message: 'Invalid hospitalId or doctorId' });
  }
  if (!['ADMIN', 'HOSPITAL_ADMIN', 'SLOT_ADMIN'].includes(user.role)) {
    return res.status(403).json({ message: 'Forbidden: Hospital or slot admin required.' });
  }
  try {
    // Ensure doctor belongs to hospital
    const membership = await prisma.hospitalDoctor.findUnique({
      where: { hospitalId_doctorId: { hospitalId, doctorId } },
      select: { id: true },
    });
    if (!membership) {
      return res.status(404).json({ message: 'Doctor not linked to this hospital' });
    }
    // Authorization: if not ADMIN, ensure user manages this hospital
    if (user.role !== 'ADMIN') {
      const [hospital, userRecord] = await Promise.all([
        prisma.hospital.findUnique({
          where: { id: hospitalId },
          select: { adminId: true, slotAdmins: { select: { id: true } } },
        }),
        prisma.user.findUnique({ where: { id: user.userId }, select: { managedHospitalId: true } }),
      ]);
      const isManager = !!hospital && (hospital.adminId === user.userId || (hospital.slotAdmins || []).some((sa: { id: number }) => sa.id === user.userId));
      const hasManagedRelation = userRecord?.managedHospitalId === hospitalId;
      if (!isManager && !hasManagedRelation) {
        return res.status(403).json({ message: 'Forbidden: You do not manage this hospital.' });
      }
    }
    const profile = await prisma.doctorProfile.findUnique({ where: { userId: doctorId }, select: { slotPeriodMinutes: true } });
    if (!profile) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }
    return res.status(200).json({ slotPeriodMinutes: profile.slotPeriodMinutes ?? 15 });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'An error occurred while fetching slot period.' });
  }
});

// --- Hospital ↔ Doctor: Update slot period (Protected, Hospital Admin / Slot Admin / Admin) ---
app.patch('/api/hospitals/:hospitalId/doctors/:doctorId/slot-period', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  const hospitalId = Number(req.params.hospitalId);
  const doctorId = Number(req.params.doctorId);
  if (!Number.isFinite(hospitalId) || !Number.isFinite(doctorId)) {
    return res.status(400).json({ message: 'Invalid hospitalId or doctorId' });
  }
  if (!['ADMIN', 'HOSPITAL_ADMIN', 'SLOT_ADMIN'].includes(user.role)) {
    return res.status(403).json({ message: 'Forbidden: Hospital or slot admin required.' });
  }
  const { minutes } = req.body as { minutes?: number };
  const allowed = [10, 15, 20, 30, 60];
  const value = Number(minutes);
  if (!Number.isFinite(value) || !allowed.includes(value)) {
    return res.status(400).json({ message: 'Invalid minutes. Allowed: 10, 15, 20, 30, 60' });
  }
  try {
    // Ensure doctor belongs to hospital
    const membership = await prisma.hospitalDoctor.findUnique({ where: { hospitalId_doctorId: { hospitalId, doctorId } }, select: { id: true } });
    if (!membership) {
      return res.status(404).json({ message: 'Doctor not linked to this hospital' });
    }
    // Authorization: if not ADMIN, ensure user manages this hospital
    if (user.role !== 'ADMIN') {
      const [hospital, userRecord] = await Promise.all([
        prisma.hospital.findUnique({ where: { id: hospitalId }, select: { adminId: true, slotAdmins: { select: { id: true } } } }),
        prisma.user.findUnique({ where: { id: user.userId }, select: { managedHospitalId: true } }),
      ]);
      const isManager = !!hospital && (hospital.adminId === user.userId || (hospital.slotAdmins || []).some((sa: { id: number }) => sa.id === user.userId));
      const hasManagedRelation = userRecord?.managedHospitalId === hospitalId;
      if (!isManager && !hasManagedRelation) {
        return res.status(403).json({ message: 'Forbidden: You do not manage this hospital.' });
      }
    }
    const profile = await prisma.doctorProfile.findUnique({ where: { userId: doctorId }, select: { id: true } });
    if (!profile) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }
    await prisma.doctorProfile.update({ where: { userId: doctorId }, data: { slotPeriodMinutes: value } });
    try {
      broadcastDoctorEvent(doctorId, 'slots:period-updated', { doctorId, minutes: value });
      broadcastHospitalEvent(hospitalId, 'slots:period-updated', { hospitalId, doctorId, minutes: value });
    } catch (_) {}
    return res.status(200).json({ message: 'Slot period updated', slotPeriodMinutes: value });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'An error occurred while updating slot period.' });
  }
});

// --- Hospital ↔ Doctor: Update appointment (status/date/time and optional reassignment) ---
app.patch('/api/hospitals/:hospitalId/doctors/:doctorId/appointments/:appointmentId', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  const hospitalId = Number(req.params.hospitalId);
  const targetDoctorId = Number(req.params.doctorId);
  const appointmentId = Number(req.params.appointmentId);
  if (!Number.isFinite(hospitalId) || !Number.isFinite(targetDoctorId) || !Number.isFinite(appointmentId)) {
    return res.status(400).json({ message: 'Invalid hospitalId, doctorId, or appointmentId' });
  }

  const allowedRoles = ['ADMIN', 'HOSPITAL_ADMIN', 'SLOT_ADMIN', 'DOCTOR'];
  if (!allowedRoles.includes(user.role)) {
    return res.status(403).json({ message: 'Forbidden: Unauthorized role' });
  }

  try {
    // Ensure target doctor belongs to hospital
    const membership = await prisma.hospitalDoctor.findUnique({ where: { hospitalId_doctorId: { hospitalId, doctorId: targetDoctorId } }, select: { id: true } });
    if (!membership) {
      return res.status(404).json({ message: 'Target doctor not linked to this hospital' });
    }

    // Authorization: doctors can only reschedule within their own doctorId
    if (user.role === 'DOCTOR' && user.userId !== targetDoctorId) {
      return res.status(403).json({ message: 'Forbidden: Doctors can only reschedule their own appointments.' });
    }

    // Non-admins must manage the hospital
    if (!['ADMIN'].includes(user.role) && user.role !== 'DOCTOR') {
      const [hospital, userRecord] = await Promise.all([
        prisma.hospital.findUnique({ where: { id: hospitalId }, select: { adminId: true, slotAdmins: { select: { id: true } } } }),
        prisma.user.findUnique({ where: { id: user.userId }, select: { managedHospitalId: true } }),
      ]);
      const isManager = !!hospital && (hospital.adminId === user.userId || (hospital.slotAdmins || []).some((sa: { id: number }) => sa.id === user.userId));
      const hasManagedRelation = userRecord?.managedHospitalId === hospitalId;
      if (!isManager && !hasManagedRelation) {
        return res.status(403).json({ message: 'Forbidden: You do not manage this hospital.' });
      }
    }

    const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId }, select: { id: true, doctorId: true, status: true, patient: { select: { id: true } }, date: true, time: true } });
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const { status, date, time } = req.body as { status?: string; date?: string; time?: string };

    // Build update object
    const updateData: any = {};
    if (typeof status === 'string' && status.length > 0) {
      const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status provided.' });
      }
      updateData.status = status;
    }
    if (typeof date === 'string' && date.length > 0) {
      updateData.date = date;
    }
    if (typeof time === 'string' && time.length > 0) {
      updateData.time = String(time);
    }

    // If target doctor differs, reassign appointment (admins/managers only)
    if (appointment.doctorId !== targetDoctorId) {
      if (user.role === 'DOCTOR') {
        return res.status(403).json({ message: 'Forbidden: Doctors cannot reassign to another doctor.' });
      }
      updateData.doctor = { connect: { id: targetDoctorId } };
    }

    // Broadcast optimistic update before committing to DB
    try {
      const optimisticPayload: any = {
        id: appointment.id,
        status: updateData.status ?? appointment.status,
        date: updateData.date ?? appointment.date,
        time: updateData.time ?? appointment.time,
        doctorId: targetDoctorId,
        patient: { id: appointment.patient?.id },
        doctor: { id: targetDoctorId },
        optimistic: true,
      };
      broadcastHospitalEvent(hospitalId, 'appointment-updated-optimistic', optimisticPayload);
      broadcastPatientEvent(appointment.patient?.id, 'appointment-updated-optimistic', optimisticPayload);
      broadcastDoctorEvent(targetDoctorId, 'appointment-updated-optimistic', optimisticPayload);
    } catch (_) {}

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: updateData,
      include: {
        doctor: { select: { id: true, email: true } },
        patient: { select: { id: true, email: true } },
      },
    });

    // Broadcast real-time updates to hospital, patient, and doctor subscribers
    try {
      broadcastHospitalEvent(hospitalId, 'appointment-updated', updated);
      broadcastPatientEvent(updated.patient?.id, 'appointment-updated', updated);
      broadcastDoctorEvent(updated.doctor?.id ?? updated.doctorId, 'appointment-updated', updated);
    } catch (_) {}

    return res.status(200).json(updated);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'An error occurred while updating the appointment.' });
  }
});

// --- Hospital ↔ Doctor: List appointments (Protected, Hospital Admin / Slot Admin / Admin / Doctor) ---
app.get('/api/hospitals/:hospitalId/doctors/:doctorId/appointments', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  const hospitalId = Number(req.params.hospitalId);
  const doctorId = Number(req.params.doctorId);
  if (!Number.isFinite(hospitalId) || !Number.isFinite(doctorId)) {
    return res.status(400).json({ message: 'Invalid hospitalId or doctorId' });
  }

  const allowedRoles = ['ADMIN', 'HOSPITAL_ADMIN', 'SLOT_ADMIN', 'DOCTOR'];
  if (!allowedRoles.includes(user.role)) {
    return res.status(403).json({ message: 'Forbidden: Unauthorized role' });
  }

  try {
    // Ensure doctor belongs to hospital
    const membership = await prisma.hospitalDoctor.findUnique({
      where: { hospitalId_doctorId: { hospitalId, doctorId } },
      select: { id: true }
    });
    if (!membership) {
      return res.status(404).json({ message: 'Doctor not linked to this hospital' });
    }

    // Authorization: doctors can only view their own appointments
    if (user.role === 'DOCTOR' && user.userId !== doctorId) {
      return res.status(403).json({ message: 'Forbidden: Doctors can only view their own appointments.' });
    }

    // Non-admins must manage the hospital to view
    if (!['ADMIN'].includes(user.role) && user.role !== 'DOCTOR') {
      const [hospital, userRecord] = await Promise.all([
        prisma.hospital.findUnique({ where: { id: hospitalId }, select: { adminId: true, slotAdmins: { select: { id: true } } } }),
        prisma.user.findUnique({ where: { id: user.userId }, select: { managedHospitalId: true } }),
      ]);
      const isManager = !!hospital && (hospital.adminId === user.userId || (hospital.slotAdmins || []).some((sa: { id: number }) => sa.id === user.userId));
      const hasManagedRelation = userRecord?.managedHospitalId === hospitalId;
      if (!isManager && !hasManagedRelation) {
        return res.status(403).json({ message: 'Forbidden: You do not manage this hospital.' });
      }
    }

    const appointments = await prisma.appointment.findMany({
      where: { doctorId },
      include: {
        doctor: { select: { id: true, email: true, doctorProfile: { select: { slug: true } } } },
        patient: { select: { id: true, email: true } },
      },
      orderBy: { date: 'asc' },
    });

    return res.status(200).json(appointments);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'An error occurred while fetching appointments.' });
  }
});

// --- Hospital: Aggregate stats (Protected: Admin / Hospital Admin / Slot Admin) ---
app.get('/api/hospitals/:hospitalId/stats', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  const hospitalId = Number(req.params.hospitalId);
  if (!Number.isFinite(hospitalId)) {
    return res.status(400).json({ message: 'Invalid hospitalId' });
  }

  if (!['ADMIN', 'HOSPITAL_ADMIN', 'SLOT_ADMIN'].includes(user.role)) {
    return res.status(403).json({ message: 'Forbidden: Unauthorized role' });
  }

  try {
    if (user.role !== 'ADMIN') {
      const [hospital, userRecord] = await Promise.all([
        prisma.hospital.findUnique({ where: { id: hospitalId }, select: { adminId: true, slotAdmins: { select: { id: true } } } }),
        prisma.user.findUnique({ where: { id: user.userId }, select: { managedHospitalId: true } }),
      ]);
      const isManager = !!hospital && (hospital.adminId === user.userId || (hospital.slotAdmins || []).some((sa: { id: number }) => sa.id === user.userId));
      const hasManagedRelation = userRecord?.managedHospitalId === hospitalId;
      if (!isManager && !hasManagedRelation) {
        return res.status(403).json({ message: 'Forbidden: You do not manage this hospital.' });
      }
    }

    const links = await prisma.hospitalDoctor.findMany({ where: { hospitalId }, select: { doctorId: true } });
    const doctorIds = links
      .map((l: { doctorId: number | null }) => l.doctorId)
      .filter((id: number | null): id is number => Number.isFinite(id as any));
    if (doctorIds.length === 0) {
      return res.status(200).json({
        totalAppointments: 0,
        pendingAppointments: 0,
        completedAppointments: 0,
        totalPatients: 0,
        todaysBookings: 0,
        monthlyRevenue: 0,
        websiteViews: 0,
      });
    }

    const now = new Date();
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    const { start: dayStart, end: dayEnd } = dayWindowUtc(todayStr);

    const [
      totalAppointments,
      pendingAppointments,
      completedAppointments,
      distinctPatients,
      todaysBookings
    ] = await Promise.all([
      prisma.appointment.count({ where: { doctorId: { in: doctorIds } } }),
      prisma.appointment.count({ where: { doctorId: { in: doctorIds }, status: 'PENDING' } }),
      prisma.appointment.count({ where: { doctorId: { in: doctorIds }, status: 'COMPLETED' } }),
      prisma.appointment.findMany({ where: { doctorId: { in: doctorIds }, status: { not: 'CANCELLED' } }, distinct: ['patientId'], select: { patientId: true } }),
      prisma.appointment.count({ where: { doctorId: { in: doctorIds }, status: { not: 'CANCELLED' }, date: { gte: dayStart, lte: dayEnd } } }),
    ]);

    return res.status(200).json({
      totalAppointments,
      pendingAppointments,
      completedAppointments,
      totalPatients: distinctPatients.length,
      todaysBookings,
      monthlyRevenue: 0,
      websiteViews: 0,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'An error occurred while fetching hospital stats.' });
  }
});

// --- Public hospital profile JSON ---
app.get('/api/hospitals/:hospitalId/profile', async (req: Request, res: Response) => {
  const hospitalId = Number(req.params.hospitalId);
  if (!Number.isFinite(hospitalId)) {
    return res.status(400).json({ message: 'Invalid hospitalId' });
  }
  try {
    const hospital = await prisma.hospital.findUnique({
      where: { id: hospitalId },
      select: { profile: true }
    });
    if (!hospital || hospital.profile == null) {
      return res.status(404).json({ message: 'Hospital profile not found' });
    }
    res.status(200).json(hospital.profile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching hospital profile.' });
  }
});

// Update hospital profile (authorized: ADMIN or owning HOSPITAL_ADMIN)
app.put('/api/hospitals/:hospitalId/profile', authMiddleware, async (req: Request, res: Response) => {
  const hospitalId = Number(req.params.hospitalId);
  const updates = req.body || {};
  if (!Number.isFinite(hospitalId)) {
    return res.status(400).json({ message: 'Invalid hospitalId' });
  }
  try {
    const user = req.user!;
    let authorized = false;

    if (user.role === 'ADMIN') {
      authorized = true;
    } else if (user.role === 'HOSPITAL_ADMIN') {
      const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId }, select: { adminId: true } });
      if (hospital?.adminId === user.userId) {
        authorized = true;
      } else {
        const me = await prisma.user.findUnique({ where: { id: user.userId }, select: { managedHospitalId: true } });
        if (me?.managedHospitalId === hospitalId) authorized = true;
      }
    }

    if (!authorized) {
      return res.status(403).json({ message: 'Forbidden: You are not allowed to update this hospital profile.' });
    }

    const current = await prisma.hospital.findUnique({ where: { id: hospitalId }, select: { profile: true } });
    if (!current) {
      return res.status(404).json({ message: 'Hospital not found' });
    }
    const currentProfile = (current.profile as any) ?? {};
    const updatedProfile: any = { ...currentProfile, ...updates };

    // Safe merge for departments: union by name (case-insensitive), updates override fields, keep existing others
    if (Array.isArray(updates?.departments)) {
      const existing: any[] = Array.isArray(currentProfile?.departments) ? currentProfile.departments : [];
      const incoming: any[] = Array.isArray(updates.departments) ? updates.departments : [];
      if (incoming.length === 0) {
        // Do not clear existing departments when client sends empty list
        updatedProfile.departments = existing;
      } else {
        const map = new Map<string, any>();
        for (const d of existing) {
          const key = String(d?.name || '').trim().toLowerCase();
          if (key) map.set(key, d);
        }
        const result: any[] = [];
        const seen = new Set<string>();
        for (const d of incoming) {
          const key = String(d?.name || '').trim().toLowerCase();
          if (!key) continue;
          const base = map.get(key) || {};
          const merged = { ...base, ...d };
          result.push(merged);
          seen.add(key);
          map.delete(key);
        }
        // Append existing departments not touched by incoming
        for (const [key, d] of map.entries()) {
          if (!seen.has(key)) result.push(d);
        }
        updatedProfile.departments = result;
      }
    }

    // Safe merge for doctors list: merge by doctorId if present, else by name (case-insensitive)
    if (Array.isArray(updates?.doctors)) {
      const existing: any[] = Array.isArray(currentProfile?.doctors) ? currentProfile.doctors : [];
      const incoming: any[] = Array.isArray(updates.doctors) ? updates.doctors : [];
      if (incoming.length === 0) {
        updatedProfile.doctors = existing;
      } else {
        const keyOf = (d: any) => (Number.isFinite(d?.doctorId) && d.doctorId) ? `id:${d.doctorId}` : `name:${String(d?.name || '').trim().toLowerCase()}`;
        const map = new Map<string, any>();
        for (const d of existing) map.set(keyOf(d), d);
        const result: any[] = [];
        const seen = new Set<string>();
        for (const d of incoming) {
          const k = keyOf(d);
          const base = map.get(k) || {};
          const merged = { ...base, ...d };
          result.push(merged);
          seen.add(k);
          map.delete(k);
        }
        for (const [k, d] of map.entries()) {
          if (!seen.has(k)) result.push(d);
        }
        updatedProfile.doctors = result;
      }
    }

    await prisma.hospital.update({ where: { id: hospitalId }, data: { profile: updatedProfile } });

    // Best-effort audit log entry
    const adminId = user.userId;
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'HOSPITAL_PROFILE_UPDATE',
        entityType: 'HOSPITAL',
        entityId: hospitalId,
        details: JSON.stringify(Object.keys(updates))
      }
    }).catch(() => {});

    res.status(200).json({ profile: updatedProfile });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while updating hospital profile.' });
  }
});

// --- Find hospital by doctor ---
app.get('/api/hospitals/by-doctor/:doctorId', async (req: Request, res: Response) => {
  const doctorId = Number(req.params.doctorId);
  if (!Number.isFinite(doctorId)) {
    return res.status(400).json({ message: 'Invalid doctorId' });
  }
  try {
    const hd = await prisma.hospitalDoctor.findFirst({
      where: { doctorId },
      include: {
        hospital: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
            phone: true,
            subdomain: true,
          }
        }
      }
    });
    if (!hd || !hd.hospital) {
      return res.status(404).json({ message: 'Hospital not found for the given doctor.' });
    }
    res.status(200).json(hd.hospital);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching hospital by doctor.' });
  }
});

app.get('/api/slots/availability', async (req: Request, res: Response) => {
  const doctorIdParam = req.query.doctorId;
  const dateStr = String(req.query.date || '');
  const doctorId = Number(doctorIdParam);
  if (!Number.isFinite(doctorId) || !dateStr) {
    return res.status(400).json({ message: 'doctorId and date (YYYY-MM-DD) are required.' });
  }
  try {
    const cacheKey = `${doctorId}:${dateStr}`;
    const now = Date.now();
    const cached = availabilityCache.get(cacheKey);
    if (cached && (now - cached.ts) < AVAIL_CACHE_MS) {
      return res.status(200).json({ slots: [], availability: { periodMinutes: cached.periodMinutes, hours: cached.hours } });
    }
    const { periodMinutes, capacity } = await resolveDoctorCapacity(prisma, doctorId);
    const { start: dayStart, end: dayEnd } = dayWindowUtc(dateStr);
    const counts = await countBookedPerHour(prisma, doctorId, dayStart, dayEnd);

    // Default working hours: 10 to 18
    const startHour = 10;
    const endHour = 18;

    const hours: {
      hour: string;
      labelFrom: string;
      labelTo: string;
      capacity: number;
      bookedCount: number;
      isFull: boolean;
    }[] = [];

    for (let h = startHour; h < endHour; h++) {
      const bookedCount = counts[h] || 0;
      hours.push({
        hour: String(h).padStart(2, '0'),
        labelFrom: `${String(h).padStart(2, '0')}:00`,
        labelTo: `${String(h + 1).padStart(2, '0')}:00`,
        capacity,
        bookedCount,
        isFull: bookedCount >= capacity,
      });
    }
    availabilityCache.set(cacheKey, { ts: now, periodMinutes, hours });
    return res.status(200).json({ slots: [], availability: { periodMinutes, hours } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'An error occurred while fetching availability.' });
  }
});

app.get('/api/slots/insights', async (req: Request, res: Response) => {
  const doctorIdParam = req.query.doctorId;
  const dateStr = String(req.query.date || '');
  const doctorId = Number(doctorIdParam);
  if (!Number.isFinite(doctorId) || !dateStr) {
    return res.status(400).json({ message: 'doctorId and date (YYYY-MM-DD) are required.' });
  }
  try {
    const cacheKey = `${doctorId}:${dateStr}`;
    const now = Date.now();
    const cached = availabilityCache.get(cacheKey);
    if (cached && (now - cached.ts) < AVAIL_CACHE_MS) {
      return res.status(200).json({ availability: { periodMinutes: cached.periodMinutes, hours: cached.hours } });
    }
    const { periodMinutes, capacity } = await resolveDoctorCapacity(prisma, doctorId);
    const { start: dayStart, end: dayEnd } = dayWindowUtc(dateStr);
    const counts = await countBookedPerHour(prisma, doctorId, dayStart, dayEnd);

    const startHour = 10;
    const endHour = 18;
    const hours: any[] = [];
    for (let h = startHour; h < endHour; h++) {
      const bookedCount = counts[h] || 0;
      hours.push({
        hour: String(h).padStart(2, '0'),
        labelFrom: `${String(h).padStart(2, '0')}:00`,
        labelTo: `${String(h + 1).padStart(2, '0')}:00`,
        capacity,
        bookedCount,
        isFull: bookedCount >= capacity,
      });
    }
    availabilityCache.set(cacheKey, { ts: now, periodMinutes, hours });
    return res.status(200).json({ availability: { periodMinutes, hours } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'An error occurred while fetching insights.' });
  }
});

app.get('/api/doctor/patients', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role !== 'DOCTOR') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  try {
    const appts = await prisma.appointment.findMany({
      where: { doctorId: user.userId, status: { not: 'CANCELLED' } },
      select: { patientId: true, date: true, patient: { select: { id: true, email: true } } },
    });
    const m = new Map<number, { patientId: number; email: string; count: number; lastDate: string }>();
    for (const a of appts) {
      const pid = Number(a.patientId);
      if (!Number.isFinite(pid)) continue;
      const email = (a as any).patient?.email || '';
      const d = a.date instanceof Date ? a.date : new Date(a.date as any);
      const iso = d.toISOString();
      const prev = m.get(pid);
      if (!prev) m.set(pid, { patientId: pid, email, count: 1, lastDate: iso });
      else {
        prev.count += 1;
        if (iso > prev.lastDate) prev.lastDate = iso;
      }
    }
    const items = Array.from(m.values()).sort((a, b) => b.count - a.count || b.lastDate.localeCompare(a.lastDate));
    return res.status(200).json({ items });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'An error occurred while fetching patients.' });
  }
});
