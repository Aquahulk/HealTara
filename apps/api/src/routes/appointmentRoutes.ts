import express, { Request, Response, Router } from 'express';
import { prisma } from '../db';
const router: Router = express.Router();

// Define a type for the request body to ensure type safety
interface AppointmentBody {
  date: string;
  time: string;
  reason?: string;
  doctorId: number;
  patientId: number;
}

// POST /api/appointments/ - Creates a new appointment
router.post('/', async (req: Request, res: Response) => {
  try {
    const { date, time, reason, doctorId, patientId }: AppointmentBody = req.body;

    if (!date || !time || !doctorId || !patientId) {
      return res.status(400).json({ message: 'Missing required fields (date, time, doctorId, patientId).' });
    }
    const appointmentDate = new Date(date);
    if (appointmentDate < new Date()) {
      return res.status(400).json({ message: 'Cannot book an appointment in the past.' });
    }

    // Enforce: patient can book a particular doctor only once per day
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingSameDay = await prisma.appointment.findFirst({
      where: {
        patientId,
        doctorId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });
    if (existingSameDay) {
      return res.status(409).json({ message: 'You already have an appointment with this doctor on the selected date.' });
    }

    const newAppointment = await prisma.appointment.create({
      data: { date: appointmentDate, time, notes: reason, doctorId, patientId },
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
    const { status }: { status: string } = req.body;
    const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];
    if (!status || !validStatuses.includes(status)) {
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