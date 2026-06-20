"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { GripVertical } from "lucide-react";
import { getSocket, joinDoctorRoom, joinHospitalRoom, onAppointmentUpdates, onSlotUpdates } from "@/lib/realtime";
import MobileBottomNavigation from '@/components/MobileBottomNavigation';
import PatientDetailPopup from '@/components/PatientDetailPopup';

const API_URL = ""; // use relative URLs with Next.js dev rewrites

 type Slot = {
   id: number;
   date: string;   // YYYY-MM-DD
   time: string;   // HH:mm
   doctorProfileId?: number | null;
   hospitalId?: number | null;
   status?: string;
 };

type Appointment = {
  id: number;
  date: string;
  status: string;
  reason?: string;
  doctorId?: number;
  patientId?: number;
  doctor?: { id: number; email: string };
  patient?: { id: number; email: string };
  time?: string;
};

type DoctorTimeOff = {
  id: number;
  doctorProfileId: number;
  start: string;
  end: string;
  reason?: string;
  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// 🎨 SLOT COLOR UTILITY - Visual differentiation for slot boxes
// ============================================================================
const getSlotBoxColors = (appointmentCount: number, _slotStart: Date, capacity: number = 1) => {
  // Unified 5-level capacity palette (time-agnostic):
  // empty → low → medium → high → full
  const ratio = Math.max(0, Math.min(1, capacity > 0 ? appointmentCount / capacity : 0));
  if (ratio === 0) {
    return 'border border-sky-300 bg-sky-100 hover:bg-sky-200'; // empty
  } else if (ratio > 0 && ratio <= 0.25) {
    return 'border border-green-400 bg-green-200 hover:bg-green-300'; // low
  } else if (ratio > 0.25 && ratio <= 0.5) {
    return 'border border-yellow-400 bg-yellow-200 hover:bg-yellow-300'; // medium
  } else if (ratio > 0.5 && ratio < 1) {
    return 'border border-orange-500 bg-orange-200 hover:bg-orange-300'; // high
  } else {
    return 'border border-red-600 bg-red-200 hover:bg-red-300'; // full
  }
};

const getSegmentBoxColors = (appointmentCount: number, segStart: Date) => {
  const hour = segStart.getHours();
  const isEmpty = appointmentCount === 0;
  
  // Segment colors - lighter than slot colors
  if (isEmpty) {
    if (hour >= 6 && hour < 10) {
      return 'border border-blue-200 bg-blue-50 hover:bg-blue-100';
    } else if (hour >= 10 && hour < 14) {
      return 'border border-green-200 bg-green-50 hover:bg-green-100';
    } else if (hour >= 14 && hour < 18) {
      return 'border border-yellow-200 bg-yellow-50 hover:bg-yellow-100';
    } else if (hour >= 18 && hour < 22) {
      return 'border border-purple-200 bg-purple-50 hover:bg-purple-100';
    } else {
      return 'border border-gray-200 bg-gray-50 hover:bg-gray-100';
    }
  } else {
    if (hour >= 6 && hour < 10) {
      return 'border border-blue-300 bg-blue-100 hover:bg-blue-200';
    } else if (hour >= 10 && hour < 14) {
      return 'border border-green-300 bg-green-100 hover:bg-green-200';
    } else if (hour >= 14 && hour < 18) {
      return 'border border-yellow-300 bg-yellow-100 hover:bg-yellow-200';
    } else if (hour >= 18 && hour < 22) {
      return 'border border-purple-300 bg-purple-100 hover:bg-purple-200';
    } else {
      return 'border border-gray-300 bg-gray-100 hover:bg-gray-200';
    }
  }
};

export default function SlotAdminPanelPage() {
  // IST formatting and parsing helpers
  const formatIST = (date: Date, opts?: Intl.DateTimeFormatOptions) => {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      ...(opts || { dateStyle: 'medium', timeStyle: 'short', hour12: false })
    }).format(date);
  };
  const formatISTTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  };
  const getISTHoursMinutes = (date: Date) => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);
    const h = parts.find(p => p.type === 'hour')?.value || '00';
    const m = parts.find(p => p.type === 'minute')?.value || '00';
    return { hour: parseInt(h, 10) || 0, minute: parseInt(m, 10) || 0 };
  };
  const getISTDayIndex = (date: Date) => {
    const wk = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', weekday: 'short' }).format(date);
    const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return map[wk] ?? date.getDay();
  };
  const formatISTDateTimeLocal = (date: Date) => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(date);
    const get = (type: string) => parts.find(p => p.type === type)?.value || '';
    const y = get('year');
    const m = get('month');
    const d = get('day');
    const h = get('hour');
    const mi = get('minute');
    return `${y}-${m}-${d}T${h}:${mi}`;
  };

  const istLocalStringFromDate = (date: Date) => formatISTDateTimeLocal(date);
  const istLocalStringToISO = (s: string) => {
    // s: YYYY-MM-DDTHH:mm interpreted in IST (UTC+5:30)
    if (!s || !s.includes('T')) return new Date().toISOString();
    const [ymd, hm] = s.split('T');
    const [y, m, d] = ymd.split('-').map((x) => parseInt(x));
    const [hh, mm] = hm.split(':').map((x) => parseInt(x));
    const isoDate = new Date(Date.UTC(y, (m - 1), d, (hh - 5), (mm - 30), 0, 0));
    return isoDate.toISOString();
  };
  const istDateTimeFromDateAndTime = (dateStr: string, timeStr: string) => {
    // dateStr: YYYY-MM-DD, timeStr: HH:mm, treated as IST
    const [y, m, d] = dateStr.split('-').map((x) => parseInt(x));
    const [hh, mm] = timeStr.split(':').map((x) => parseInt(x));
    return new Date(Date.UTC(y, (m - 1), d, (hh - 5), (mm - 30), 0, 0));
  };
  const getISTNow = () => new Date(istLocalStringToISO(istLocalStringFromDate(new Date())));

  const [token, setToken] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [doctorName, setDoctorName] = useState<string>('');
  const [hospitalName, setHospitalName] = useState<string>('');
  const [hospitalId, setHospitalId] = useState<number | null>(null);
  const [doctorId, setDoctorId] = useState<number | null>(null);
  const [socketReady, setSocketReady] = useState(false);
  const [doctorProfileId, setDoctorProfileId] = useState<number | null>(null);
  const [doctorOptions, setDoctorOptions] = useState<Array<{ id: number; email: string; doctorProfileId: number }>>([]);
  const [timeOff, setTimeOff] = useState<DoctorTimeOff[]>([]);
  const [timeOffStart, setTimeOffStart] = useState<string>("");
  const [timeOffEnd, setTimeOffEnd] = useState<string>("");
  const [timeOffReason, setTimeOffReason] = useState<string>("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editStart, setEditStart] = useState<string>('');
  const [editEnd, setEditEnd] = useState<string>('');
  const [editReason, setEditReason] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [allotDateMap, setAllotDateMap] = useState<Record<number, string>>({});
  const [allotTimeMap, setAllotTimeMap] = useState<Record<number, string>>({});
  const [workingHours, setWorkingHours] = useState<Array<{ dayOfWeek: number; start: string | null; end: string | null }>>([]);
  const [hoursInputs, setHoursInputs] = useState<Record<number, { start: string; end: string }>>({
    0: { start: "09:00", end: "17:00" },
    1: { start: "09:00", end: "17:00" },
    2: { start: "09:00", end: "17:00" },
    3: { start: "09:00", end: "17:00" },
    4: { start: "09:00", end: "17:00" },
    5: { start: "10:00", end: "14:00" },
    6: { start: "", end: "" },
  });
  const [slotPeriodMinutes, setSlotPeriodMinutes] = useState<number>(15);
const [viewMode, setViewMode] = useState<'day' | 'grouped'>('day');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("slotAdminToken");
    setToken(t);
    if (t) {
      // Load context first so header shows correct doctor/hospital even with no appointments
      loadContext(t);
      loadSlots(t);
      loadAppointments(t);
    }
  }, []);

  const loadContext = async (tkn: string) => {
    try {
      const res = await fetch(`/api/slot-admin/context`, {
        headers: { Authorization: `Bearer ${tkn}` },
      });
      if (!res.ok) {
        // Do not surface as error banner; keep header fallback graceful
        return;
      }
      const data = await res.json();
      const doc = data?.doctor as { id: number; email: string; doctorProfileId?: number } | null;
      const hosp = data?.hospital as { id: number; name: string } | null;
      if (doc) {
        setDoctorId(doc.id);
        if (typeof doc.doctorProfileId === 'number') setDoctorProfileId(doc.doctorProfileId);
        const derivedName = doc.email ? doc.email.split('@')[0] : `Doctor ${doc.id}`;
        setDoctorName(derivedName);
        await loadSlotPeriod(tkn, doc.id);
      }
      if (hosp) {
        setHospitalId(hosp.id);
        setHospitalName(hosp.name || '');
        // If hospital-managed and doctor is not set, load doctors in scope for selection
        if (!doc) {
          await loadDoctors(tkn);
        }
      }
      // After context, load time-off and working hours for selected doctor
      if (doctorProfileId) {
        await loadTimeOff(tkn, doctorProfileId);
        const targetDoctorId = doc ? doc.id : (doctorId ?? undefined);
        await loadWorkingHours(tkn, targetDoctorId);
      }
    } catch {
      // ignore
    }
  };

  const loadDoctors = async (tkn: string) => {
    try {
      const res = await fetch(`/api/slot-admin/doctors`, {
        headers: { Authorization: `Bearer ${tkn}` },
      });
      if (!res.ok) return;
      const list = await res.json();
      if (Array.isArray(list)) {
        setDoctorOptions(list);
        // Auto-select single doctor
        if (list.length === 1) {
          setDoctorProfileId(list[0].doctorProfileId);
          setDoctorId(list[0].id);
          const derivedName = list[0].email ? list[0].email.split('@')[0] : `Doctor ${list[0].id}`;
          setDoctorName(derivedName);
        }
      }
    } catch {
      // ignore
    }
  };

  const loadSlots = async (tkn: string) => {
    try {
      setLoading(true);
      setMessage(null);
      const res = await fetch(`/api/slot-admin/slots`, {
        headers: { Authorization: `Bearer ${tkn}` },
      });
      if (!res.ok) {
        let msg = "Failed to load slots";
        try {
          const err = await res.json();
          msg = (err && err.message) ? err.message : msg;
        } catch {
          try {
            const txt = await res.text();
            msg = (txt && txt.trim()) ? txt.trim() : msg;
          } catch {}
        }
        throw new Error(msg);
      }
      const data = await res.json();
      setSlots(data?.slots || data || []);
    } catch (e: any) {
      setMessage(e?.message || "Failed to load slots");
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async (tkn: string) => {
    try {
      const res = await fetch(`/api/slot-admin/appointments`, {
        headers: { Authorization: `Bearer ${tkn}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to load appointments" }));
        throw new Error(err.message || "Failed to load appointments");
      }
      const data = await res.json();
      const items = Array.isArray(data) ? data : data?.appointments || [];
      setAppointments(items);
      // As a fallback, derive doctor/hospital context from first appointment if header is still empty
      if ((!doctorId || !doctorName || !hospitalName) && items && items.length > 0) {
        const first = items[0];
        const docId = (first.doctorId || first.doctor?.id) as number | undefined;
        if (docId && Number.isInteger(docId)) {
          setDoctorId((prev) => prev ?? docId);
          const email = first.doctor?.email || '';
          const derivedName = email ? email.split('@')[0] : `Doctor ${docId}`;
          setDoctorName((prev) => prev || derivedName);
          try {
            const hres = await fetch(`/api/hospitals/by-doctor/${docId}`);
            if (hres.ok) {
              const hjson = await hres.json();
              if (!hospitalName) setHospitalName(hjson?.hospital?.name || '');
            }
          } catch {
            // ignore
          }
        }
      }
    } catch (e: any) {
      setMessage(e?.message || "Failed to load appointments");
    }
  };

  // Live updates via WebSocket
  useEffect(() => {
    if (!token) return;
    
    if (hospitalId) joinHospitalRoom(hospitalId);
    if (doctorId) joinDoctorRoom(doctorId);

    const refresh = async () => {
      try {
        if (token) {
          await Promise.all([loadAppointments(token), loadSlots(token)]);
        }
      } catch {}
    };

    const unbindAppt = onAppointmentUpdates(() => {
      refresh();
    });

    const unbindSlot = onSlotUpdates(async (payload: any) => {
      try {
        if (!token) return;
        const did = Number(doctorId);
        if (payload && Number(payload.doctorId) === did) {
          await loadSlotPeriod(token, did);
        }
        await refresh();
      } catch {}
    });

    refresh();

    return () => {
      unbindAppt();
      unbindSlot();
    };
  }, [token, doctorId, hospitalId]);

  // SSE fallbacks are removed as sockets are preferred and centralized

  // Auto-update expired appointments to PENDING status
  useEffect(() => {
    if (!token) return;
    
    const checkExpiredAppointments = async () => {
      const now = getISTNow();
      const fmtDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
      
      // Find appointments that have passed their time and are not COMPLETED or CANCELLED
      const expiredAppointments = appointments.filter((a) => {
        if (a.status === 'COMPLETED' || a.status === 'CANCELLED') return false;
        
        try {
          const dateStr = a.date.includes('T') ? a.date.split('T')[0] : a.date;
          const timeStr = a.time || '00:00';
          const appointmentTime = istDateTimeFromDateAndTime(dateStr, timeStr);
          
          // Check if appointment time has passed
          return appointmentTime.getTime() < now.getTime();
        } catch {
          return false;
        }
      });

      // Update expired appointments to PENDING status
      for (const appt of expiredAppointments) {
        if (appt.status !== 'PENDING') {
          try {
            await updateAppointmentStatus(appt.id, 'PENDING');
          } catch (e) {
            console.error('Failed to auto-update appointment', appt.id, e);
          }
        }
      }
    };

    // Check immediately on mount
    checkExpiredAppointments();

    // Check every 5 minutes
    const interval = setInterval(checkExpiredAppointments, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [token, appointments]);

  // Load working hours; for hospital-managed admins, doctorId is required
  const loadWorkingHours = async (tkn: string, docId?: number) => {
    try {
      const qs = docId ? `?doctorId=${docId}` : '';
      const res = await fetch(`/api/slot-admin/working-hours${qs}`, {
        headers: { Authorization: `Bearer ${tkn}` },
      });
      if (!res.ok) return; // keep UI graceful if not configured
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.workingHours || [];
      setWorkingHours(list);
      const nextInputs: Record<number, { start: string; end: string }> = { ...hoursInputs };
      list.forEach((wh: any) => {
        if (typeof wh.dayOfWeek === 'number') {
          nextInputs[wh.dayOfWeek] = {
            start: wh.startTime ? wh.startTime.slice(0,5) : "",
            end: wh.endTime ? wh.endTime.slice(0,5) : "",
          };
        }
      });
      setHoursInputs(nextInputs);
    } catch {
      // ignore
    }
  };

  const loadSlotPeriod = async (tkn: string, docId?: number) => {
    try {
      const qs = docId ? `?doctorId=${docId}` : '';
      const res = await fetch(`/api/slot-admin/slot-period${qs}`, {
        headers: { Authorization: `Bearer ${tkn}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const maybe = (data && typeof data.slotPeriodMinutes === 'number') ? Number(data.slotPeriodMinutes) : undefined;
      setSlotPeriodMinutes((prev) => (maybe ?? prev ?? 15));
    } catch {
      // ignore
    }
  };

  const loadTimeOff = async (tkn: string, dpid?: number) => {
    try {
      const qs = dpid ? `?doctorProfileId=${dpid}` : '';
      const res = await fetch(`/api/slot-admin/time-off${qs}`, {
        headers: { Authorization: `Bearer ${tkn}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to load time-off" }));
        throw new Error(err.message || "Failed to load time-off");
      }
      const data = await res.json();
      setTimeOff(Array.isArray(data) ? data : data?.timeOff || data || []);
    } catch (e: any) {
      setMessage(e?.message || "Failed to load time-off");
    }
  };

  const cancelSlot = async (slotId: number) => {
    if (!token) return;
    try {
      setMessage(null);
      const res = await fetch(`/api/slot-admin/slots/${slotId}/cancel`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: "Cancelled by Slot Admin" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to cancel slot" }));
        throw new Error(err.message || "Failed to cancel slot");
      }
      // Refresh slots after cancellation
      await loadSlots(token);
      setMessage("Slot cancelled successfully");
    } catch (e: any) {
      setMessage(e?.message || "Failed to cancel slot");
    }
  };

  // Broadcast channel to sync updates across dashboards
  const [bc, setBc] = useState<BroadcastChannel | null>(null);
  useEffect(() => {
    const channel = new BroadcastChannel('appointments-updates');
    setBc(channel);
    channel.onmessage = (ev) => {
      const msg = ev.data as any;
      if (msg?.type === 'appointment-update') {
        setAppointments((prev) => prev.map((a) => (a.id === msg.id ? { ...a, status: msg.status } : a)));
      } else if (msg?.type === 'appointment-cancel') {
        setAppointments((prev) => prev.filter((a) => a.id !== msg.id));
      }
    };
    return () => channel.close();
  }, []);

  const updateAppointmentStatus = async (id: number, status: string) => {
    if (!token) return;
    try {
      setMessage(null);
      // Optimistically update local state to reflect change immediately
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      bc?.postMessage({ type: 'appointment-update', id, status });

      // Use correct endpoint to update status server-side
      const res = await fetch(`/api/slot-admin/appointments/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Failed to update appointment' }));
        throw new Error(err.message || 'Failed to update appointment');
      }
      setMessage('Appointment updated');
    } catch (e: any) {
      setMessage(e?.message || 'Failed to update appointment');
    }
  };

  const cancelAppointment = async (id: number) => {
    if (!token) return;
    try {
      setMessage(null);
      // Optimistically remove appointment locally to avoid reload delays
      setAppointments((prev) => prev.filter((a) => a.id !== id));
      bc?.postMessage({ type: 'appointment-cancel', id });

      // Use correct endpoint to cancel server-side
      const res = await fetch(`/api/slot-admin/appointments/${id}/cancel`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ reason: 'Cancelled by slot admin' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Failed to cancel appointment' }));
        throw new Error(err.message || 'Failed to cancel appointment');
      }
      setMessage('Appointment cancelled');
    } catch (e: any) {
      setMessage(e?.message || 'Failed to cancel appointment');
    }
  };

  // Drag-and-drop: start + reschedule + global drop
  const onDragStartAppointment = (ev: any, appointment: Appointment) => {
    if (!ev?.dataTransfer) return;
    try {
      ev.dataTransfer.setData('text/plain', JSON.stringify({ id: appointment.id }));
      ev.dataTransfer.setData('appointment-json', JSON.stringify(appointment));
      ev.dataTransfer.effectAllowed = 'move';
    } catch {}
  };

  const rescheduleAppointment = async (appointment: Appointment, targetStart: Date) => {
    if (!token) return;
    try {
      setMessage(null);
      const fmtDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
      const fmtTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
      const dateStr = fmtDate.format(targetStart);
      const timeStr = fmtTime.format(targetStart);

      console.log('Rescheduling appointment:', appointment.id, 'to', dateStr, timeStr);

      const res = await fetch(`/api/slot-admin/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ date: dateStr, time: timeStr }),
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Failed to reschedule appointment' }));
        console.error('Reschedule failed:', err);
        throw new Error(err.message || 'Failed to reschedule appointment');
      }
      
      const json = await res.json();
      console.log('Reschedule response:', json);
      
      // Manually refresh to get the updated data from server
      await loadAppointments(token);
      await loadSlots(token);
      
      setMessage('✓ Appointment rescheduled successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (e: any) {
      console.error('Reschedule error:', e);
      setMessage('✗ ' + (e?.message || 'Failed to reschedule appointment'));
    }
  };

  useEffect(() => {
    // Global fallback: allow drop anywhere, target nearest segment/hour box
    const onDragOver = (ev: DragEvent) => {
      ev.preventDefault();
      try { (ev as any).dataTransfer.dropEffect = 'move'; } catch {}
    };
    const onDrop = (ev: DragEvent) => {
      ev.preventDefault();
      try {
        const raw = (ev as any).dataTransfer.getData('appointment-json') || (ev as any).dataTransfer.getData('text/plain');
        if (!raw) return;
        const appt = JSON.parse(raw);
        const candidates = Array.from(document.querySelectorAll('[data-seg-start], [data-hour-start]')) as HTMLElement[];
        if (candidates.length === 0) return;
        const x = ev.clientX;
        const y = ev.clientY;
        let nearest: HTMLElement | null = null;
        let best = Number.POSITIVE_INFINITY;
        for (const el of candidates) {
          const r = el.getBoundingClientRect();
          if (r.width <= 0 || r.height <= 0) continue;
          // Calculate distance from drop point to center of slot box (both X and Y)
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const dx = x - cx;
          const dy = y - cy;
          const d = Math.sqrt(dx * dx + dy * dy); // Euclidean distance
          if (d < best) { best = d; nearest = el; }
        }
        if (!nearest) return;
        const startIso = nearest.getAttribute('data-seg-start') || nearest.getAttribute('data-hour-start');
        if (!startIso) return;
        const targetStart = new Date(startIso);
        rescheduleAppointment(appt as Appointment, targetStart);
      } catch {}
    };
    document.addEventListener('dragenter', onDragOver);
    document.addEventListener('dragover', onDragOver);
    document.addEventListener('drop', onDrop);
    return () => {
      document.removeEventListener('dragenter', onDragOver);
      document.removeEventListener('dragover', onDragOver);
      document.removeEventListener('drop', onDrop);
    };
  }, [token, doctorId]);

  // Allot pending expired booking: set new date/time and optionally confirm
  const allotPendingAppointment = async (id: number, date: string, time: string, status?: string) => {
    if (!token) return;
    try {
      setMessage(null);
      const body: any = { date, time };
      if (status) body.status = status;
      const res = await fetch(`/api/slot-admin/appointments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Failed to allot appointment' }));
        throw new Error(err.message || 'Failed to allot appointment');
      }
      const json = await res.json();
      const appointment = json?.appointment || json;
      setAppointments((prev) => prev.map((a) => (a.id === id ? appointment : a)));
      setMessage('Pending booking allotted');
    } catch (e: any) {
      setMessage(e?.message || 'Failed to allot appointment');
    }
  };

  const saveWorkingHours = async () => {
    if (!token) return;
    // For hospital-managed admins, require selecting a doctor
    if (!doctorId && hospitalName) {
      setMessage('Please select a doctor to set timing.');
      return;
    }
    try {
      setMessage(null);
      // Only include days with both start and end set; backend expects HH:mm
      const hours = Object.keys(hoursInputs).map((k) => {
        const day = Number(k);
        const { start, end } = hoursInputs[day];
        return { dayOfWeek: day, startTime: start || '', endTime: end || '' };
      }).filter((h) => h.startTime && h.endTime);
      const res = await fetch(`/api/slot-admin/working-hours`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ hours, doctorId: doctorId ?? undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Failed to save working hours' }));
        throw new Error(err.message || 'Failed to save working hours');
      }
      await loadWorkingHours(token, doctorId ?? undefined);
      setMessage('Doctor timing saved');
    } catch (e: any) {
      setMessage(e?.message || 'Failed to save working hours');
    }
  };

  const saveSlotPeriod = async (minutes: number) => {
    if (!token) return;
    // For hospital-managed admins, require selecting a doctor
    if (!doctorId && hospitalName) {
      setMessage('Please select a doctor to set slot period.');
      return;
    }
    try {
      setMessage(null);
      const previous = slotPeriodMinutes;
      // Optimistically update UI immediately
      setSlotPeriodMinutes(minutes);
      const body: any = { slotPeriodMinutes: minutes };
      if (doctorId) body.doctorId = doctorId;
      const res = await fetch(`/api/slot-admin/slot-period`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        let msg = 'Failed to update slot period';
        try {
          const err = await res.json();
          msg = (err && err.message) ? err.message : msg;
        } catch {
          try {
            const txt = await res.text();
            msg = (txt && txt.trim()) ? txt.trim() : msg;
          } catch {}
        }
        // Roll back optimistic change
        setSlotPeriodMinutes(previous);
        throw new Error(msg);
      }
      const json = await res.json();
      const updated = Number(json?.slotPeriodMinutes) || minutes;
      setSlotPeriodMinutes(updated);
      setMessage('Slot period updated');
    } catch (e: any) {
      setMessage(e?.message || 'Failed to update slot period');
      // In case the backend update actually succeeded but proxy failed, re-sync value.
      try { await loadSlotPeriod(token, doctorId ?? undefined); } catch {}
    }
  };

  const createTimeOff = async () => {
    if (!token) return;
    if (!timeOffStart || !timeOffEnd) {
      setMessage("Please select start and end time for time-off");
      return;
    }
    // Hospital-managed admins must choose a doctor
    if (!doctorProfileId && !doctorId && hospitalName) {
      setMessage("Please select a doctor to create time-off.");
      return;
    }
    try {
      setMessage(null);
      const res = await fetch(`/api/slot-admin/time-off`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ start: istLocalStringToISO(timeOffStart), end: istLocalStringToISO(timeOffEnd), reason: timeOffReason || undefined, doctorProfileId: doctorProfileId ?? undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to create time-off" }));
        throw new Error(err.message || "Failed to create time-off");
      }
      setTimeOffStart("");
      setTimeOffEnd("");
      setTimeOffReason("");
      await loadTimeOff(token, doctorProfileId ?? undefined);
      setMessage("Time-off created successfully");
    } catch (e: any) {
      setMessage(e?.message || "Failed to create time-off");
    }
  };

  const deleteTimeOff = async (id: number) => {
    if (!token) return;
    try {
      setMessage(null);
      const res = await fetch(`/api/slot-admin/time-off/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to delete time-off" }));
        throw new Error(err.message || "Failed to delete time-off");
      }
      await loadTimeOff(token);
      setMessage("Time-off deleted successfully");
    } catch (e: any) {
      setMessage(e?.message || "Failed to delete time-off");
    }
  };

  const startEditTimeOff = (t: DoctorTimeOff) => {
    setEditingId(t.id);
    // Convert ISO to datetime-local string in IST
    setEditStart(formatISTDateTimeLocal(new Date(t.start)));
    setEditEnd(formatISTDateTimeLocal(new Date(t.end)));
    setEditReason(t.reason || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditStart('');
    setEditEnd('');
    setEditReason('');
  };

  const updateTimeOff = async () => {
    if (!token || editingId === null) return;
    if (!editStart || !editEnd) {
      setMessage('Please set both start and end.');
      return;
    }
    try {
      setMessage(null);
      const res = await fetch(`/api/slot-admin/time-off/${editingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ start: istLocalStringToISO(editStart), end: istLocalStringToISO(editEnd), reason: editReason || undefined })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Failed to update time-off' }));
        throw new Error(err.message || 'Failed to update time-off');
      }
      await loadTimeOff(token);
      cancelEdit();
      setMessage('Time-off updated successfully');
    } catch (e: any) {
      setMessage(e?.message || 'Failed to update time-off');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("slotAdminToken");
    setToken(null);
    setSlots([]);
  };

  // ── Auto-refresh countdown ──
  const [countdown, setCountdown] = useState(10);
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());

  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (token) { loadAppointments(token); loadSlots(token); }
          return 10;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [token]);

  // ── Computed stats ──
  const fmtDateIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
  const todayStrIST = fmtDateIST.format(new Date());
  const todayAppts = appointments.filter(a => {
    try { return fmtDateIST.format(istDateTimeFromDateAndTime(a.date.slice(0,10), a.time || '00:00')) === todayStrIST; } catch { return false; }
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <div className="bg-white shadow-lg rounded-lg w-full max-w-md p-6 text-center">
          <div className="text-5xl mb-2">🕒</div>
          <h1 className="text-2xl font-bold text-gray-800">Doctors Management Panel</h1>
          <p className="text-gray-600 mb-4">Please log in to manage slots.</p>
          <Link href="/slot-admin/login" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg inline-block">Go to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex">
      {/* Compact Sidebar */}
      <aside className="hidden lg:flex flex-col w-52 bg-white border-r border-gray-100 fixed h-screen overflow-y-auto">
        <div className="p-4 flex-1">
          <div className="flex items-center gap-2 mb-5 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm">🕒</div>
            <div className="text-sm font-bold text-gray-900">Slot Admin</div>
          </div>
          <nav className="space-y-1">
            {[
              { href: '#appointments', icon: '📅', label: 'Appointments' },
              { href: '#pending-bookings', icon: '⏳', label: 'Pending' },
              { href: '#emergency-requests', icon: '🚨', label: 'Emergency' },
              { href: '#completed-bookings', icon: '✅', label: 'Completed' },
              { href: '#time-off', icon: '🏖️', label: 'Time-Off' },
              { href: '#assigned-slots', icon: '📋', label: 'Slots' },
              { href: '#doctor-timing', icon: '⏰', label: 'Timing' },
            ].map(n => (
              <a key={n.href} href={n.href} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                <span>{n.icon}</span><span>{n.label}</span>
              </a>
            ))}
          </nav>
        </div>
        <div className="p-4 border-t border-gray-100">
          <button onClick={handleLogout} className="w-full text-xs text-red-500 hover:text-red-700 font-medium py-1.5 rounded-lg hover:bg-red-50 transition-colors">Logout</button>
          <Link href="/slot-admin/login" className="block text-center text-[10px] text-gray-400 hover:text-gray-600 mt-1">Switch Account</Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${selectedAppointment ? 'lg:mr-[22rem]' : ''} lg:ml-52`}>

        {/* Compact Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-gray-900 truncate">
                {doctorName ? `Dr. ${doctorName}` : 'Doctors Management Panel'}
              </h1>
              <p className="text-[10px] text-gray-400 truncate">{hospitalName || 'Hospital'} · {slotPeriodMinutes}min slots · {Math.max(1, Math.floor(60 / slotPeriodMinutes))} slots/hr</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Auto-refresh countdown */}
              <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                🔄 <span className={`font-bold ${countdown <= 3 ? 'text-red-500' : 'text-blue-600'}`}>{countdown}s</span>
              </div>
              <button onClick={() => { if (token) { loadAppointments(token); loadSlots(token); setCountdown(10); } }}
                className="text-xs bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600 px-2.5 py-1 rounded-lg font-medium transition-colors">↻</button>
              <select value={String(slotPeriodMinutes)} onChange={e => saveSlotPeriod(Number(e.target.value))}
                className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none">
                {[10,15,20,30,60].map(m => <option key={m} value={m}>{m}min</option>)}
              </select>
            </div>
          </div>
        </header>

        <main className="px-4 py-4 pb-24 lg:pb-6 space-y-4 max-w-6xl mx-auto">
          {message && (
            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm font-medium">{message}</div>
          )}

          {/* ── STATS ROW ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Today's", value: todayAppts.length, icon: '📅', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
              { label: 'Pending', value: todayAppts.filter(a => a.status === 'PENDING').length, icon: '⏳', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
              { label: 'Confirmed', value: todayAppts.filter(a => a.status === 'CONFIRMED').length, icon: '✅', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
              { label: 'Completed', value: appointments.filter(a => a.status === 'COMPLETED').length, icon: '🏁', color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-3 flex items-center gap-3`}>
                <span className="text-xl">{s.icon}</span>
                <div>
                  <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                  <div className="text-[11px] text-gray-500 font-medium">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── APPOINTMENTS: two-col layout (left: day view, right: summary) ── */}
          <div id="appointments" className="flex gap-4 items-start scroll-mt-4">
            {/* LEFT: appointments card */}
            <div className="flex-1 min-w-0 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-sm font-bold text-gray-900">Doctor Appointments</h2>
                  <p className="text-[10px] text-gray-500">{slotPeriodMinutes}min · {Math.max(1,Math.floor(60/slotPeriodMinutes))} slots/hr</p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none">
                    <option value="">All</option>
                    <option value="PENDING">Pending</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="EMERGENCY">Emergency</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                  <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none" />
                  <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none" />
                  {(statusFilter || fromDate || toDate) && <button onClick={() => { setStatusFilter(''); setFromDate(''); setToDate(''); }} className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg hover:bg-gray-200">Clear</button>}
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                    <button onClick={() => setViewMode('day')} className={`px-2.5 py-1 text-xs font-medium ${viewMode==='day'?'bg-blue-600 text-white':'bg-white text-gray-600'}`}>Day</button>
                    <button onClick={() => setViewMode('grouped')} className={`px-2.5 py-1 text-xs font-medium ${viewMode==='grouped'?'bg-blue-600 text-white':'bg-white text-gray-600'}`}>Grouped</button>
                  </div>
                  <button onClick={() => setShowHistory(v => !v)} className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-lg">{showHistory ? 'Hide Past' : 'Past'}</button>
                </div>
              </div>
              <div className="p-3">
                {/* Grouped view */}
                {viewMode === 'grouped' && (() => {
                  const filtered = appointments.filter(a => {
                    if (!showHistory && a.status === 'COMPLETED') return false;
                    const okStatus = statusFilter ? a.status === statusFilter : true;
                    const dt = istDateTimeFromDateAndTime(a.date.slice(0,10), a.time || '00:00');
                    const okFrom = fromDate ? dt >= new Date(`${fromDate}T00:00:00`) : true;
                    const okTo = toDate ? dt <= new Date(`${toDate}T23:59:59`) : true;
                    if (!showHistory) {
                      const ok = fmtDateIST.format(dt) >= todayStrIST;
                      return ok && okStatus && okFrom && okTo;
                    }
                    return okStatus && okFrom && okTo;
                  });
                  if (filtered.length === 0) return (
                    <div className="text-center py-10 text-gray-400">
                      <div className="text-3xl mb-2">📅</div>
                      <p className="text-sm">No appointments to display</p>
                    </div>
                  );
                  const groups = new Map<string, Appointment[]>();
                  filtered.forEach(a => {
                    const dt = istDateTimeFromDateAndTime(a.date.slice(0,10), a.time || '00:00');
                    const key = `${fmtDateIST.format(dt)} ${String(new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Kolkata',hour:'2-digit',hour12:false}).format(dt)).padStart(2,'0')}`;
                    const arr = groups.get(key) || [];
                    arr.push(a);
                    groups.set(key, arr);
                  });
                  const period = Math.max(1, slotPeriodMinutes);
                  const segCount = Math.max(1, Math.floor(60 / period));
                  return (
                    <div className="space-y-4">
                      {Array.from(groups.entries()).sort(([a],[b])=>a<b?-1:1).map(([key, list]) => {
                        const base = istDateTimeFromDateAndTime(list[0].date.slice(0,10), list[0].time || '00:00');
                        const slotStart = new Date(base); slotStart.setMinutes(0,0,0);
                        const slotEnd = new Date(slotStart.getTime() + 3600000);
                        return (
                          <div key={key} className="rounded-xl border border-gray-200 overflow-hidden">
                            <div className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-between">
                              <div className="text-sm font-bold text-white">{formatIST(slotStart, {dateStyle:'medium',timeStyle:'short',hour12:false})} → {formatISTTime(slotEnd)}</div>
                              <span className="text-xs font-bold bg-white/20 text-white px-2 py-0.5 rounded-full">{list.length} booking{list.length!==1?'s':''}</span>
                            </div>
                            <div className="p-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                              {Array.from({length:segCount},(_,idx)=>{
                                const segStart = new Date(slotStart.getTime() + idx*period*60000);
                                const segEnd = new Date(segStart.getTime() + period*60000);
                                const inSeg = list.filter(a => { const t=istDateTimeFromDateAndTime(a.date.slice(0,10),a.time||'00:00').getTime(); return t>=segStart.getTime()&&t<segEnd.getTime(); });
                                if(inSeg.length===0) return null;
                                return (
                                  <div key={idx} className="rounded-lg border border-blue-200 bg-blue-50 overflow-hidden">
                                    <div className="px-3 py-1.5 bg-blue-100 flex items-center justify-between">
                                      <span className="text-[10px] font-bold text-blue-700">{formatISTTime(segStart)} – {formatISTTime(segEnd)}</span>
                                      <span className="text-[9px] text-blue-600">{inSeg.length} pt</span>
                                    </div>
                                    <div className="p-2 space-y-1.5">
                                      {inSeg.map(a => (
                                        <div key={a.id} className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm cursor-pointer hover:border-blue-300 hover:shadow-md transition-all"
                                          draggable onDragStart={ev => onDragStartAppointment(ev, a)}
                                          onClick={() => setSelectedAppointment(a)}>
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-bold text-gray-800 truncate">{(a.patient as any)?.name || a.patient?.email?.split('@')[0] || `Patient ${a.patientId}`}</span>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${a.status==='CONFIRMED'?'bg-emerald-100 text-emerald-700':a.status==='PENDING'?'bg-amber-100 text-amber-700':a.status==='CANCELLED'?'bg-red-100 text-red-600':a.status==='EMERGENCY'?'bg-red-600 text-white':'bg-blue-100 text-blue-700'}`}>{a.status}</span>
                                          </div>
                                          <div className="flex gap-1">
                                            <button onClick={e=>{e.stopPropagation();updateAppointmentStatus(a.id,'CONFIRMED')}} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] font-bold py-1 rounded">✓</button>
                                            <button onClick={e=>{e.stopPropagation();updateAppointmentStatus(a.id,'COMPLETED')}} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-[9px] font-bold py-1 rounded">✔✔</button>
                                            <button onClick={e=>{e.stopPropagation();cancelAppointment(a.id)}} className="flex-1 bg-red-500 hover:bg-red-600 text-white text-[9px] font-bold py-1 rounded">✕</button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Day view */}
                {viewMode === 'day' && (() => {
                  const activeAppts = appointments.filter(a => {
                    if (!showHistory) {
                      try { return fmtDateIST.format(istDateTimeFromDateAndTime(a.date.slice(0,10), a.time||'00:00')) >= todayStrIST; } catch { return false; }
                    }
                    return true;
                  }).filter(a => statusFilter ? a.status === statusFilter : true);
                  const dates = Array.from(new Set(activeAppts.map(a => a.date.slice(0,10)))).sort();
                  if (dates.length === 0) return (
                    <div className="text-center py-10 text-gray-400">
                      <div className="text-3xl mb-2">📅</div>
                      <p className="text-sm">No upcoming appointments</p>
                    </div>
                  );
                  return (
                    <div className="space-y-3">
                      {dates.map(dateKey => {
                        const dayAppts = activeAppts.filter(a => a.date.slice(0,10)===dateKey).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
                        const isToday = dateKey === todayStrIST;
                        const wh = workingHours.find(w => w.dayOfWeek === new Date(`${dateKey}T12:00:00`).getDay());
                        const startH = wh?.start ? parseInt(wh.start) : 8;
                        const endH = wh?.end ? parseInt(wh.end) : 20;
                        const hours = Array.from({length: endH-startH}, (_,i) => startH+i);
                        return (
                          <div key={dateKey} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                            <div className={`px-4 py-2.5 border-b border-gray-100 flex items-center justify-between ${isToday?'bg-blue-50':'bg-gray-50'}`}>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold ${isToday?'text-blue-700':'text-gray-700'}`}>{formatIST(new Date(`${dateKey}T12:00:00`), {dateStyle:'full'})}</span>
                                {isToday && <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-bold">Today</span>}
                              </div>
                              <span className="text-[10px] text-gray-500">{dayAppts.length} appt{dayAppts.length!==1?'s':''}</span>
                            </div>
                            <div className="divide-y divide-gray-50">
                              {hours.map(h => {
                                const hourAppts = dayAppts.filter(a => parseInt(a.time||'0') === h);
                                const hStart = new Date(`${dateKey}T${String(h).padStart(2,'0')}:00:00`);
                                return (
                                  <div key={h} className="flex min-h-[52px] hover:bg-gray-50/50">
                                    <div className="w-16 px-2 py-2 border-r border-gray-100 flex-shrink-0">
                                      <div className="text-[10px] font-bold text-gray-500">{formatISTTime(hStart)}</div>
                                      {hourAppts.length > 0 && <div className="text-[9px] text-blue-500 font-bold">{hourAppts.length} booked</div>}
                                    </div>
                                    <div className="flex-1 p-1.5">
                                      {hourAppts.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-gray-300 text-[10px]">—</div>
                                      ) : (
                                        <div className="grid grid-cols-2 gap-1">
                                          {hourAppts.map(a => (
                                            <div key={a.id} className="bg-blue-50 border border-blue-200 rounded-lg p-1.5 cursor-pointer hover:shadow-sm hover:border-blue-400 transition-all"
                                              onClick={() => setSelectedAppointment(a)}>
                                              <div className="flex items-center justify-between gap-1">
                                                <span className="text-[9px] font-bold text-gray-800 truncate">{(a.patient as any)?.name || a.patient?.email?.split('@')[0] || `#${a.patientId}`}</span>
                                                <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${a.status==='CONFIRMED'?'bg-emerald-500 text-white':a.status==='PENDING'?'bg-amber-400 text-white':a.status==='EMERGENCY'?'bg-red-600 text-white':'bg-gray-400 text-white'}`}>{a.status.slice(0,3)}</span>
                                              </div>
                                              <div className="flex gap-0.5 mt-1">
                                                <button onClick={e=>{e.stopPropagation();updateAppointmentStatus(a.id,'CONFIRMED')}} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[8px] py-0.5 rounded">✓</button>
                                                <button onClick={e=>{e.stopPropagation();updateAppointmentStatus(a.id,'COMPLETED')}} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-[8px] py-0.5 rounded">Done</button>
                                                <button onClick={e=>{e.stopPropagation();cancelAppointment(a.id)}} className="flex-1 bg-red-500 hover:bg-red-600 text-white text-[8px] py-0.5 rounded">✕</button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>{/* end left appointments card */}

            {/* RIGHT: Mini calendar + summary */}
            <div className="hidden lg:flex flex-col gap-3 w-52 flex-shrink-0">
              {/* Mini Calendar */}
              {(() => {
                const apptDates = new Set(appointments.map(a => a.date.slice(0,10)));
                const firstDay = new Date(calYear, calMonth, 1).getDay();
                const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
                const monthName = new Date(calYear, calMonth, 1).toLocaleString('default',{month:'long',year:'numeric'});
                const offset = firstDay === 0 ? 6 : firstDay-1;
                return (
                  <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-800">{monthName}</span>
                      <div className="flex gap-1">
                        <button onClick={()=>{ if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1);}} className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 text-xs">‹</button>
                        <button onClick={()=>{ if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1);}} className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 text-xs">›</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-7 gap-0.5 mb-1">{['Mo','Tu','We','Th','Fr','Sa','Su'].map(d=><div key={d} className="text-[9px] font-bold text-gray-400 text-center">{d}</div>)}</div>
                    <div className="grid grid-cols-7 gap-0.5">
                      {Array.from({length:offset}).map((_,i)=><div key={`e${i}`}/>)}
                      {Array.from({length:daysInMonth},(_,i)=>{
                        const day=i+1;
                        const dateStr=`${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                        const isToday=dateStr===todayStrIST;
                        const hasAppt=apptDates.has(dateStr);
                        return <div key={day} className={`relative w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-semibold mx-auto cursor-pointer transition-colors ${isToday?'bg-blue-600 text-white':hasAppt?'text-blue-600 hover:bg-blue-50':'text-gray-600 hover:bg-gray-100'}`}>{day}{hasAppt&&!isToday&&<div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400"/>}</div>;
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Appointment Summary */}
              <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-800">Today's Summary</span>
                  <span className="text-[9px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full font-bold">Today</span>
                </div>
                {[
                  {label:'Total', value:todayAppts.length, color:'text-gray-700'},
                  {label:'Confirmed', value:todayAppts.filter(a=>a.status==='CONFIRMED').length, color:'text-emerald-600'},
                  {label:'Pending', value:todayAppts.filter(a=>a.status==='PENDING').length, color:'text-amber-600'},
                  {label:'Completed', value:todayAppts.filter(a=>a.status==='COMPLETED').length, color:'text-blue-600'},
                  {label:'Cancelled', value:todayAppts.filter(a=>a.status==='CANCELLED').length, color:'text-red-500'},
                ].map(s=>(
                  <div key={s.label} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                    <span className="text-[11px] text-gray-500">{s.label}</span>
                    <span className={`text-[11px] font-bold ${s.color}`}>{s.value}</span>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                <span className="text-xs font-bold text-gray-800 block mb-2">Quick Actions</span>
                <div className="space-y-1.5">
                  <button onClick={()=>{ if(token){loadAppointments(token);loadSlots(token);setCountdown(10);} }} className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-xs font-medium text-blue-700 transition-colors">↻ Refresh Data</button>
                  <a href="#doctor-timing" className="block px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-xs font-medium text-teal-700 transition-colors">⏰ Set Timing</a>
                  <a href="#time-off" className="block px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-xs font-medium text-purple-700 transition-colors">🏖️ Add Time-Off</a>
                  <a href="#pending-bookings" className="block px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-xs font-medium text-amber-700 transition-colors">⏳ Pending ({appointments.filter(a=>a.status==='PENDING').length})</a>
                </div>
              </div>
            </div>
          </div>{/* end appointments flex */}

        <div id="pending-bookings" className="bg-white shadow-lg rounded-xl overflow-hidden mb-8 scroll-mt-20">
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-orange-50 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Pending Bookings (Expired Today)</h2>
              <p className="text-sm text-gray-600 mt-1">Admin can allot slot by setting date/time</p>
            </div>
          </div>
          <div className="p-6">
            {(() => {
              const now = getISTNow();
              const fmtDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
              const todayStr = fmtDate.format(now);
              const items = appointments.filter((a) => {
                if (a.status !== 'PENDING') return false;
                let d: Date;
                try {
                  const dateStr = a.date.includes('T') ? a.date.split('T')[0] : a.date;
                  const timeStr = a.time || '00:00';
                  d = istDateTimeFromDateAndTime(dateStr, timeStr);
                } catch {
                  d = new Date(a.date);
                }
                return fmtDate.format(d) === todayStr && d.getTime() < now.getTime();
              });
              if (items.length === 0) {
                return <div className="text-gray-600">No expired pending bookings.</div>;
              }
              return (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Appt</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Original</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">New Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">New Time</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((a) => (
                      <tr key={a.id}>
                        <td className="px-4 py-2 text-sm text-gray-900">#{a.id}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{(a.doctor as any)?.doctorProfile?.slug || a.doctor?.email?.split('@')[0] || a.doctorId}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{(a.patient as any)?.name || a.patient?.email?.split('@')[0] || a.patientId}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{formatIST(istDateTimeFromDateAndTime(a.date.includes('T') ? a.date.split('T')[0] : a.date, a.time || '00:00'))}</td>
                        <td className="px-4 py-2">
                          <input
                            type="date"
                            className="border border-gray-300 rounded px-2 py-1 text-sm"
                            value={allotDateMap[a.id] || ''}
                            onChange={(e) => setAllotDateMap((prev) => ({ ...prev, [a.id]: e.target.value }))}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="time"
                            className="border border-gray-300 rounded px-2 py-1 text-sm"
                            value={allotTimeMap[a.id] || ''}
                            onChange={(e) => setAllotTimeMap((prev) => ({ ...prev, [a.id]: e.target.value }))}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <button
                            className="px-3 py-1 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
                            disabled={!allotDateMap[a.id] || !allotTimeMap[a.id]}
                            onClick={() => allotPendingAppointment(a.id, allotDateMap[a.id], allotTimeMap[a.id], 'CONFIRMED')}
                          >
                            Allot & Confirm
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </div>
        </div>

        {/* Emergency Requests - EMERGENCY appointments to allot immediately */}
        <div id="emergency-requests" className="bg-white shadow-lg rounded-xl overflow-hidden mb-8 scroll-mt-20">
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-red-50 to-pink-50 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Emergency Requests</h2>
              <p className="text-sm text-gray-600 mt-1">Prioritize by allotting a slot and confirming</p>
            </div>
          </div>
          <div className="p-6">
            {(() => {
              const items = appointments.filter((a) => a.status === 'EMERGENCY');
              if (items.length === 0) {
                return <div className="text-gray-600">No emergency requests at the moment.</div>;
              }
              return (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Appt</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">New Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">New Time</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((a) => (
                      <tr key={a.id}>
                        <td className="px-4 py-2 text-sm text-gray-900">#{a.id}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{(a.doctor as any)?.doctorProfile?.slug || a.doctor?.email?.split('@')[0] || a.doctorId}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{a.patient?.email?.split('@')[0] || (a.patient as any)?.name || a.patientId}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{a.reason || '—'}</td>
                        <td className="px-4 py-2">
                          <input
                            type="date"
                            className="border border-gray-300 rounded px-2 py-1 text-sm"
                            value={allotDateMap[a.id] || ''}
                            onChange={(e) => setAllotDateMap((prev) => ({ ...prev, [a.id]: e.target.value }))}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="time"
                            className="border border-gray-300 rounded px-2 py-1 text-sm"
                            value={allotTimeMap[a.id] || ''}
                            onChange={(e) => setAllotTimeMap((prev) => ({ ...prev, [a.id]: e.target.value }))}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <button
                            className="px-3 py-1 rounded bg-red-600 text-white text-sm disabled:opacity-50"
                            disabled={!allotDateMap[a.id] || !allotTimeMap[a.id]}
                            onClick={() => allotPendingAppointment(a.id, allotDateMap[a.id], allotTimeMap[a.id], 'CONFIRMED')}
                          >
                            Allot & Confirm
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </div>
        </div>

        {/* Completed Bookings - COMPLETED appointments */}
        <div id="completed-bookings" className="bg-white shadow-lg rounded-xl overflow-hidden mb-8 scroll-mt-20">
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Completed Bookings</h2>
              <p className="text-sm text-gray-600 mt-1">All appointments marked as completed</p>
            </div>
          </div>
          <div className="p-6">
            {(() => {
              const items = appointments.filter((a) => a.status === 'COMPLETED');
              if (items.length === 0) {
                return <div className="text-gray-600">No completed bookings yet.</div>;
              }
              return (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Appt</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {items.map((a) => {
                        const dateStr = a.date.includes('T') ? a.date.split('T')[0] : a.date;
                        const timeStr = a.time || '00:00';
                        const dt = istDateTimeFromDateAndTime(dateStr, timeStr);
                        return (
                          <tr key={a.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">#{a.id}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{(a.patient as any)?.name || a.patient?.email?.split('@')[0] || `Patient ${a.patientId}`}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{formatIST(dt)}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{a.reason || '—'}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                ✓ Completed
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
        {/* Time-Off (Blackout) management */}
        <div id="time-off" className="bg-white shadow-lg rounded-xl overflow-hidden mb-8 scroll-mt-20">
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
            <h2 className="text-xl font-bold text-gray-900">Doctor Time-Off (Booking Stopper)</h2>
            <p className="text-sm text-gray-600 mt-1">Block time periods when appointments cannot be booked</p>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-lg text-gray-900 mb-4">Create Time-Off</h3>
              <div className="space-y-4">
                {/* Doctor selector for hospital-managed admins */}
                {doctorOptions.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Doctor</label>
                    <select
                      value={doctorProfileId ?? ''}
                      onChange={async (e) => {
                        const val = Number(e.target.value);
                        if (Number.isInteger(val) && val > 0) {
                          setDoctorProfileId(val);
                          if (token) await loadTimeOff(token, val);
                          const found = doctorOptions.find(d => d.doctorProfileId === val);
                          if (found) {
                            setDoctorId(found.id);
                            const derivedName = found.email ? found.email.split('@')[0] : `Doctor ${found.id}`;
                            setDoctorName(derivedName);
                            if (token) await loadSlotPeriod(token, found.id);
                            if (token) await loadWorkingHours(token, found.id);
                          }
                        } else {
                          setDoctorProfileId(null);
                        }
                      }}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    >
                      <option value="">Select a doctor</option>
                      {doctorOptions.map((d) => (
                        <option key={d.doctorProfileId} value={d.doctorProfileId}>Dr. {d.email.split('@')[0]} (ID: {d.id})</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start</label>
                  <input type="datetime-local" value={timeOffStart} onChange={(e) => setTimeOffStart(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End</label>
                  <input type="datetime-local" value={timeOffEnd} onChange={(e) => setTimeOffEnd(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reason (optional)</label>
                  <input type="text" value={timeOffReason} onChange={(e) => setTimeOffReason(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" placeholder="e.g., Conference, Leave" />
                </div>
                <div>
                  <button onClick={createTimeOff} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors w-full">Add Time-Off</button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">Appointments cannot be booked within these time ranges.</p>
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900 mb-4">Existing Time-Off</h3>
              {timeOff.length === 0 ? (
                <div className="text-gray-600">No time-off set.</div>
              ) : (
                <ul className="divide-y">
                  {timeOff.map((t) => (
                    <li key={t.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="font-mono text-sm text-gray-700">ID: {t.id}</div>
                        <div className="text-gray-800">{formatIST(new Date(t.start))} to {formatIST(new Date(t.end))}</div>
                        <div className="text-sm text-gray-600">{t.reason || "No reason provided"}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => startEditTimeOff(t)} className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-3 rounded-lg">Edit</button>
                        <button onClick={() => deleteTimeOff(t.id)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">Delete</button>
                      </div>
                      {editingId === t.id && (
                        <div className="mt-3 w-full">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Start</label>
                              <input type="datetime-local" value={editStart} onChange={(e) => setEditStart(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">End</label>
                              <input type="datetime-local" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Reason</label>
                              <input type="text" value={editReason} onChange={(e) => setEditReason(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
                            </div>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button onClick={updateTimeOff} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Save</button>
                            <button onClick={cancelEdit} className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg">Cancel</button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div id="assigned-slots" className="bg-white shadow-lg rounded-xl overflow-hidden scroll-mt-20">
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <h2 className="text-xl font-bold text-gray-900">Assigned Slots</h2>
            <p className="text-sm text-gray-600 mt-1">View and manage all assigned time slots</p>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="text-center text-gray-600">Loading slots...</div>
            ) : slots.length === 0 ? (
              <div className="text-center text-gray-600">No slots available in your scope.</div>
            ) : (
              <ul className="divide-y">
                {slots
                  .filter((s) => s.date >= new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(getISTNow()))
                  .map((slot) => {
                    const slotStart = istDateTimeFromDateAndTime(slot.date, String(slot.time).slice(0,5));
                    const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
                    const inSlot = appointments.filter((a) => {
                      // Exclude completed appointments from slot views
                      if (a.status === 'COMPLETED') return false;
                      const t = new Date(a.date).getTime();
                      return t >= slotStart.getTime() && t <= slotEnd.getTime();
                    });
                    const dayIdx = getISTDayIndex(slotStart);
                    const wh = hoursInputs[dayIdx];
                    const hasTiming = wh && wh.start && wh.end;
                    const within = (() => {
                      if (!hasTiming) return true;
                      const toMin = (t: string) => { const [hh, mm] = t.split(':').map(Number); return hh * 60 + mm; };
                      const { hour: istH, minute: istM } = getISTHoursMinutes(slotStart);
                      const startMin = istH * 60 + istM;
                      const endMin = startMin + 60;
                      const whStart = toMin(wh.start);
                      const whEnd = toMin(wh.end);
                      return startMin >= whStart && endMin <= whEnd;
                    })();
                    const period = Number(slotPeriodMinutes) || 15;
                    const count = Math.max(1, Math.floor(60 / Math.max(1, period)));
                    const segments = Array.from({ length: count }, (_, idx) => {
                      const segStart = new Date(slotStart.getTime() + idx * period * 60 * 1000);
                      const segEnd = new Date(segStart.getTime() + period * 60 * 1000);
                      const inSeg = inSlot.filter((a) => {
                        const t = new Date(a.date).getTime();
                        return t >= segStart.getTime() && t < segEnd.getTime();
                      });
                      return { idx, segStart, segEnd, inSeg };
                    });
                    return (
                      <li key={slot.id} className="py-6 px-5 flex items-start justify-between gap-6 hover:bg-gray-50 rounded-xl transition-colors border border-gray-200">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="font-mono text-base font-bold text-gray-900 bg-blue-100 px-3 py-1 rounded-lg">Slot #{slot.id}</div>
                            {hasTiming && !within && (
                              <div className="inline-block px-3 py-1 text-xs rounded-full bg-red-100 text-red-700 font-semibold">Not available</div>
                            )}
                          </div>
                          <div className="text-sm text-gray-800 font-semibold mb-3">
                            {formatIST(slotStart)} to {formatIST(slotEnd)}
                          </div>
                          <div className="text-sm text-gray-600 mb-5">
                            {slot.doctorProfileId ? `DoctorProfile: ${slot.doctorProfileId}` : ''}
                            {slot.hospitalId ? ` Hospital: ${slot.hospitalId}` : ''}
                            {slot.status ? ` Status: ${slot.status}` : ''}
                          </div>
                          {/* Render computed sub-slots */}
                          <div>
                            <div className="text-sm font-bold text-gray-800 mb-4">Sub-slots ({period} min): {count} per hour</div>
                            <ul className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                              {segments.map(({ idx, segStart, segEnd, inSeg }) => (
                                <li key={idx} className={`rounded-lg border-2 ${getSlotBoxColors(inSeg.length, segStart, 1)} overflow-hidden`}>
                                  <div className="px-4 py-3 bg-white bg-opacity-60 border-b border-gray-300">
                                    <div className="text-sm font-bold text-gray-900 mb-1">
                                      {formatISTTime(segStart)} to {formatISTTime(segEnd)}
                                    </div>
                                    <div className="text-xs font-medium text-gray-600">
                                      {inSeg.length === 0 ? '✓ Available' : `${inSeg.length} ${inSeg.length === 1 ? 'patient' : 'patients'}`}
                                    </div>
                                  </div>
                                  <div className="p-3 max-h-[400px] overflow-y-auto">
                                    {inSeg.length === 0 ? (
                                      <div className="text-center py-8 text-gray-400">
                                        <div className="text-3xl mb-2">📅</div>
                                        <div className="text-xs">No bookings</div>
                                      </div>
                                    ) : (
                                      <ul className="space-y-3">
                                        {inSeg.map((a) => (
                                          <li key={a.id} className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-move" draggable onDragStart={(ev) => onDragStartAppointment(ev, a)}>
                                            <div className="flex items-start justify-between mb-2">
                                              <div className="text-xs font-bold text-gray-900 truncate flex-1 mr-2">
                                                {(a.patient as any)?.name || a.patient?.email?.split('@')[0] || `Patient ${a.patientId}`}
                                              </div>
                                              <span className="text-[10px] uppercase bg-blue-600 text-white px-2 py-1 rounded-full font-bold whitespace-nowrap">{a.status}</span>
                                            </div>
                                            <div className="text-[10px] text-gray-500 mb-2">ID: #{a.id}</div>
                                            <div className="grid grid-cols-3 gap-1">
                                              <button 
                                                onClick={() => updateAppointmentStatus(a.id, 'CONFIRMED')} 
                                                className="bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold py-1.5 px-2 rounded transition-colors"
                                                title="Confirm"
                                              >
                                                ✓
                                              </button>
                                              <button 
                                                onClick={() => updateAppointmentStatus(a.id, 'COMPLETED')} 
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold py-1.5 px-2 rounded transition-colors"
                                                title="Complete"
                                              >
                                                ✓✓
                                              </button>
                                              <button 
                                                onClick={() => cancelAppointment(a.id)} 
                                                className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold py-1.5 px-2 rounded transition-colors"
                                                title="Cancel"
                                              >
                                                ✕
                                              </button>
                                            </div>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <div>
                          <button
                            onClick={() => cancelSlot(slot.id)}
                            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-5 rounded-lg transition-colors whitespace-nowrap"
                          >
                            Cancel Slot
                          </button>
                        </div>
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>
        </div>

        {/* Doctor Timing */}
        <div id="doctor-timing" className="bg-white shadow-lg rounded-xl overflow-hidden mt-8 scroll-mt-20">
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-cyan-50 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Doctor Timing</h2>
              <p className="text-sm text-gray-600 mt-1">Set working hours for each day of the week</p>
            </div>
            <button onClick={() => token && loadWorkingHours(token, doctorProfileId ?? undefined)} className="text-sm bg-white hover:bg-gray-50 border border-gray-300 px-4 py-2 rounded-lg font-medium transition-colors">Refresh</button>
          </div>
          <div className="p-6">
            {/* Doctor selector for hospital-managed admins */}
            {doctorOptions.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Doctor</label>
                <select
                  value={doctorProfileId ?? ''}
                  onChange={async (e) => {
                    const val = Number(e.target.value);
                    if (Number.isInteger(val) && val > 0) {
                      setDoctorProfileId(val);
                      if (token) await loadWorkingHours(token, val);
                      const found = doctorOptions.find(d => d.doctorProfileId === val);
                      if (found) {
                        setDoctorId(found.id);
                        const derivedName = found.email ? found.email.split('@')[0] : `Doctor ${found.id}`;
                        setDoctorName(derivedName);
                      }
                    } else {
                      setDoctorProfileId(null);
                    }
                  }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                >
                  <option value="">Select a doctor</option>
                  {doctorOptions.map((d) => (
                    <option key={d.doctorProfileId} value={d.doctorProfileId}>Dr. {d.email.split('@')[0]} (ID: {d.id})</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map((day, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gradient-to-br from-gray-50 to-white hover:shadow-md transition-shadow">
                  <div className="font-semibold text-gray-900 mb-3">{day}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2">Start</label>
                      <input type="time" value={hoursInputs[idx]?.start ?? ''} onChange={(e) => setHoursInputs((prev) => ({ ...prev, [idx]: { start: e.target.value, end: prev[idx]?.end ?? '' } }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2">End</label>
                      <input type="time" value={hoursInputs[idx]?.end ?? ''} onChange={(e) => setHoursInputs((prev) => ({ ...prev, [idx]: { start: prev[idx]?.start ?? '', end: e.target.value } }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <button onClick={saveWorkingHours} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">Save Timing</button>
            </div>
            <p className="text-xs text-gray-500 mt-3">These hours define when bookings are allowed, per day.</p>
          </div>
        </div>
      </main>
      </div>
      
      {/* Mobile Bottom Navigation - Only visible on mobile */}
      <div className="lg:hidden">
        <MobileBottomNavigation />
      </div>

      {/* Patient Detail Popup */}
      <PatientDetailPopup 
        appointment={selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        onStatusUpdate={(id, status) => {
          updateAppointmentStatus(id, status);
          if (selectedAppointment && selectedAppointment.id === id) {
            setSelectedAppointment({ ...selectedAppointment, status });
          }
        }}
      />
    </div>
  );
}
