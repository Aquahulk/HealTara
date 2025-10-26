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
import multer from 'multer';
import path from 'path';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { mapQueryToSpecialties, suggestFromDoctors } from './conditionSpecialtyMap';
import { incrementTokenSpecialty, getAllWeights } from './learningStore';

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
app.use(express.json());                                   // Parse JSON request bodies

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
const upload = multer({ storage });

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
    // Auto-generate slug if missing and ensure uniqueness
    const slugify = (s: string) =>
      String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
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
    const doctors = await prisma.user.findMany({
      where: { role: 'DOCTOR' },
      include: { doctorProfile: true },
    });
    const doctorsWithProfiles = doctors.filter((doctor: any) => !!doctor.doctorProfile);
    res.status(200).json(doctorsWithProfiles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching doctors.' });
  }
});

// Smart Search: map condition → specialties and rank doctors
app.get('/api/search/doctors', async (req: Request, res: Response) => {
  const qRaw = String(req.query.q ?? '');
  const { normalizedQuery, conditions, specialties } = mapQueryToSpecialties(qRaw);
  try {
    const doctors = await prisma.user.findMany({
      where: { role: 'DOCTOR' },
      include: { doctorProfile: true },
    });
    const candidates = doctors.filter((d: any) => !!d.doctorProfile);

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
    const suggestions = Array.from(new Set([...mappedSuggestions, ...doctorSuggestions])).slice(0, 10);

    const finalDoctors = specialties.length > 0 ? ranked : candidates.filter((d: any) => {
      const profile = d.doctorProfile || {};
      const spec = String(profile.specialization || '').toLowerCase();
      const handle = String(d.email || '').split('@')[0].toLowerCase();
      return normalizedQuery ? (spec.includes(normalizedQuery) || handle.includes(normalizedQuery)) : true;
    });

    res.status(200).json({
      query: qRaw,
      normalizedQuery,
      matchedConditions: conditions,
      matchedSpecialties: specialties,
      doctors: finalDoctors,
      suggestions,
      meta: { strategy: specialties.length ? 'condition-specialty' : 'text-fallback' }
    });
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
    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { slug: slug.toLowerCase() },
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
    // Capacity enforcement per hour based on doctor's slot period
    const hour = Number(String(time).slice(0, 2));
    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: Number(doctorId) },
      select: { slotPeriodMinutes: true },
    });
    const periodMinutes = doctorProfile?.slotPeriodMinutes ?? 15;
    const capacity = Math.max(1, Math.floor(60 / periodMinutes));

    // Count existing bookings in the same hour for the given date (excluding cancelled)
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

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
      String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
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
  if (user.role !== 'DOCTOR') {
    return res.status(403).json({ message: 'Forbidden: Only doctors can reschedule appointments.' });
  }
  if (!Number.isFinite(appointmentId)) {
    return res.status(400).json({ message: 'Invalid appointmentId' });
  }
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: { select: { id: true } } }
    });
    if (!appointment || appointment.doctorId !== user.userId) {
      return res.status(404).json({ message: 'Appointment not found or you do not have permission to update it.' });
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

server.listen(port, () => {
  console.log(`[server]: API Server running at http://localhost:${port}`);
});

// --- Hospital Endpoints (Public) ---
app.get('/api/hospitals', async (req: Request, res: Response) => {
  try {
    const page = parseInt(String(req.query.page ?? '1'), 10);
    const limit = parseInt(String(req.query.limit ?? '12'), 10);
    const skip = (page - 1) * limit;
    const hospitals = await prisma.hospital.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        state: true,
        phone: true,
      }
    });
    res.status(200).json(hospitals);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching hospitals.' });
  }
});

// --- Public hospital details ---
app.get('/api/hospitals/:hospitalId/details', async (req: Request, res: Response) => {
  const hospitalId = Number(req.params.hospitalId);
  if (!Number.isFinite(hospitalId)) {
    return res.status(400).json({ message: 'Invalid hospitalId' });
  }
  try {
    const hospital = await prisma.hospital.findUnique({
      where: { id: hospitalId },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        state: true,
        phone: true,
        profile: true,
      }
    });
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }
    res.status(200).json(hospital);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching hospital details.' });
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
    const profile = await prisma.doctorProfile.findUnique({
      where: { userId: doctorId },
      select: { slotPeriodMinutes: true },
    });
    const periodMinutes = profile?.slotPeriodMinutes ?? 15;
    const capacity = Math.max(1, Math.floor(60 / periodMinutes));

    const dayStart = new Date(dateStr);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dateStr);
    dayEnd.setHours(23, 59, 59, 999);

    // Fetch appointments for doctor on that date (excluding cancelled)
    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        status: { not: 'CANCELLED' },
        date: { gte: dayStart, lte: dayEnd },
      },
      select: { time: true },
    });

    // Group by hour
    const counts: Record<number, number> = {};
    for (const a of appointments) {
      const h = Number(String(a.time).slice(0, 2));
      counts[h] = (counts[h] || 0) + 1;
    }

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

    return res.status(200).json({
      slots: [],
      availability: {
        periodMinutes,
        hours,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'An error occurred while fetching availability.' });
  }
});
