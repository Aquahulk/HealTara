import express, { Request, Response, Router } from 'express';
import { PrismaClient, AppointmentStatus } from '@prisma/client';

const prisma = new PrismaClient();
const router: Router = express.Router();

// Define a type for the request body to ensure type safety
interface AppointmentBody {
  date: string;
  reason: string;
  doctorId: number;
  patientId: number;
}

// POST /api/appointments/ - Creates a new appointment
router.post('/', async (req: Request, res: Response) => {
  try {
    const { date, reason, doctorId, patientId }: AppointmentBody = req.body;

    if (!date || !reason || !doctorId || !patientId) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }
    const appointmentDate = new Date(date);
    if (appointmentDate < new Date()) {
      return res.status(400).json({ message: 'Cannot book an appointment in the past.' });
    }

    const newAppointment = await prisma.appointment.create({
      data: { date: appointmentDate, reason, doctorId, patientId },
    });
    res.status(201).json({ message: 'Appointment booked successfully', appointment: newAppointment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error booking appointment' });
  }
});

// GET /api/appointments/user/:userId - Fetches appointments for a user
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const appointments = await prisma.appointment.findMany({
      where: {
        OR: [{ patientId: parseInt(userId) }, { doctorId: parseInt(userId) }],
      },
      orderBy: { date: 'desc' },
    });
    res.status(200).json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching appointments' });
  }
});

// PATCH /api/appointments/:id - Updates an appointment's status
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status }: { status: AppointmentStatus } = req.body;

    if (!status || !Object.values(AppointmentStatus).includes(status)) {
      return res.status(400).json({ message: 'Invalid status provided.' });
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id: parseInt(id) },
      data: { status, updatedAt: new Date() },
    });
    res.status(200).json({ message: 'Appointment status updated', appointment: updatedAppointment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating appointment' });
  }
});

export default router;