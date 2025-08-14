import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import { authMiddleware } from './middleware/authMiddleware';

// Assuming req.user is added by authMiddleware, let's define its type
// You might need to adjust this based on your authMiddleware file
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        email: string;
        role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
      };
    }
  }
}

const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- User Registration Endpoint ---
app.post('/api/register', async (req: Request, res: Response) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) {
    return res.status(400).json({ message: 'Email, password, and role are required' });
  }
  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: { email, password: hashedPassword, role },
    });
    res.status(201).json({ 
        message: 'User created successfully',
        user: { id: newUser.id, email: newUser.email, role: newUser.role } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while creating the user' });
  }
});

// --- User Login Endpoint ---
app.post('/api/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );
    res.status(200).json({ message: 'Login successful', token: token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred during login' });
  }
});

// --- Create Doctor Profile Endpoint (Protected) ---
app.post('/api/doctor/profile', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role !== 'DOCTOR') {
    return res.status(403).json({ message: 'Forbidden: Only users with DOCTOR role can create a profile.' });
  }
  const { specialization, qualifications, experience, clinicName, clinicAddress, city, state, phone, consultationFee, slug } = req.body;
  if (!specialization || !clinicAddress || !phone || !consultationFee || !slug) {
    return res.status(400).json({ message: 'Required profile fields are missing.' });
  }
  try {
    const existingProfile = await prisma.doctorProfile.findUnique({
      where: { userId: user.userId },
    });
    if (existingProfile) {
      return res.status(409).json({ message: 'Profile for this doctor already exists.' });
    }
    const newProfile = await prisma.doctorProfile.create({
      data: {
        specialization, qualifications, experience, clinicName, clinicAddress, city, state, phone, consultationFee, slug,
        user: { connect: { id: user.userId } },
      },
    });
    res.status(201).json({ message: 'Doctor profile created successfully', profile: newProfile });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while creating the profile.' });
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
    const doctorsWithProfiles = doctors.filter(doctor => doctor.doctorProfile);
    res.status(200).json(doctorsWithProfiles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching doctors.' });
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
  const { doctorId, date, reason } = req.body;
  const patientId = user.userId;
  if (!doctorId || !date) {
    return res.status(400).json({ message: 'Doctor ID and date are required.' });
  }
  try {
    const newAppointment = await prisma.appointment.create({
      data: {
        date: new Date(date),
        reason: reason,
        doctor: { connect: { id: doctorId } },
        patient: { connect: { id: patientId } },
      },
    });
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
  if (!specialization || !clinicAddress || !phone || !consultationFee || !slug) {
    return res.status(400).json({ message: 'Required profile fields are missing.' });
  }
  try {
    const existingProfile = await prisma.doctorProfile.findUnique({
      where: { userId: user.userId },
    });
    if (!existingProfile) {
      return res.status(404).json({ message: 'Profile not found. Please create a profile first.' });
    }
    const updatedProfile = await prisma.doctorProfile.update({
      where: { userId: user.userId },
      data: {
        specialization, qualifications, experience, clinicName, clinicAddress, city, state, phone, consultationFee, slug,
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
        isActive: true,
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

// --- Update User Status (Admin Only) ---
app.patch('/api/admin/users/:userId/status', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { isActive } = req.body;
  
  try {
    const user = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { isActive },
    });
    
    // Log the action
    await prisma.adminAuditLog.create({
      data: {
        adminId: req.user!.userId,
        action: isActive ? 'ACTIVATE' : 'DEACTIVATE',
        entityType: 'USER',
        entityId: parseInt(userId),
        details: JSON.stringify({ email: user.email, isActive }),
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