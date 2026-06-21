// ============================================================================
// 🏥 GENERAL DASHBOARD - Role-aware Operations
// ============================================================================
// Purpose: One dashboard for multiple roles
// - DOCTOR: manage appointments, slots, and practice analytics
// - HOSPITAL_ADMIN: view hospital info and manage doctor appointments per doctor
// - SLOT_ADMIN/ADMIN: supervisory controls and status updates
// This file contains role detection and renders appropriate operational views.
// ============================================================================

// ============================================================================
// 📦 EXTERNAL DEPENDENCIES - What we're importing and why
// ============================================================================
'use client';                                              // Enable React hooks and client-side features
import { useState, useEffect, useRef, useMemo, useDeferredValue } from 'react';         // React hooks for state management, side effects, refs, memoization, and deferred updates
import { useAuth } from '@/context/AuthContext';           // Custom hook to access user authentication state
import { apiClient, Appointment, Slot, API_BASE_URL } from '@/lib/api';  // API client for making HTTP requests
import Link from 'next/link';                              // Next.js Link component for navigation
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarIcon, 
  UserGroupIcon, 
  CurrencyDollarIcon, 
  ChartBarIcon,
  GlobeAltIcon,
  CogIcon,
  BellIcon,
  ClockIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  BuildingOffice2Icon,
  ChartBarSquareIcon,
  MagnifyingGlassIcon,
  PlusIcon
} from '@heroicons/react/24/outline';                      // Heroicons for beautiful icons
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { doctorMicrositeUrl, hospitalMicrositeUrl, customSubdomainUrl, shouldUseSubdomainNav } from '@/lib/subdomain';
import { getDoctorLabel, getPatientLabel, getUserLabel } from '@/lib/utils';
import { io } from 'socket.io-client';
import { getSocket, joinDoctorRoom } from '@/lib/realtime';
import { Clock, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import MobileBottomNavigation from '@/components/MobileBottomNavigation';
import PatientDetailPopup from '@/components/PatientDetailPopup';

function WalkInReserveBox({ userId }: { userId: number }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [times, setTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTime, setSelectedTime] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [hoursInfo, setHoursInfo] = useState<Array<{ hour: string; capacity: number; bookedCount: number; isFull: boolean }>>([]);
  const fmtDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
  const todayStr = fmtDate.format(new Date());

  function apptIST(a: any): Date {
    try {
      const dateStr = String(a?.date || '');
      const timeStr = String(a?.time || '');
      if (/^\d{2}:\d{2}$/.test(timeStr)) {
        const datePart = dateStr.slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
          const [y, m, d] = datePart.split('-').map((x) => parseInt(x));
          const [hh, mm] = timeStr.split(':').map((x) => parseInt(x));
          return new Date(Date.UTC(y, (m - 1), d, (hh - 5), (mm - 30), 0, 0));
        }
      }
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) return d;
      return new Date();
    } catch {
      return new Date();
    }
  }

  const refreshTimes = async () => {
    try {
      setLoading(true);
      setMessage(null);
      setErrMsg(null);
      const [periodResp, availResp, myAppts] = await Promise.all([
        apiClient.getDoctorSlotPeriod().catch(() => ({ slotPeriodMinutes: 15 })),
        apiClient.getSlotsAndAvailability({ doctorId: userId, date: todayStr }).catch(() => ({ availability: { periodMinutes: 15, hours: [] } } as any)),
        apiClient.getMyAppointments().catch(() => [] as any),
      ]);
      const period = Number((periodResp as any)?.slotPeriodMinutes ?? 15) || 15;
      let hours = Array.isArray((availResp as any)?.availability?.hours) ? (availResp as any).availability.hours : [];
      setHoursInfo(hours.map((h: any) => ({ hour: h.hour, capacity: h.capacity, bookedCount: h.bookedCount, isFull: h.isFull })));
      const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
      const todayAppts = (myAppts as any[]).filter((a) => {
        const d = apptIST(a as any);
        return Number(a?.doctorId) === userId && a?.status !== 'CANCELLED' && fmt.format(d) === todayStr;
      });
      const bookedSet = new Set<string>(todayAppts.map(a => String(a?.time).slice(0,5)));
      const now = new Date();
      const nowTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
      const [nowHourStr, nowMinStr] = nowTime.split(':');
      const nowHour = Number(nowHourStr); const nowMin = Number(nowMinStr);
      const gen: string[] = [];
      if (!hours.length) {
        const startHour = 10, endHour = 18;
        hours = Array.from({ length: endHour - startHour }, (_, i) => ({
          hour: String(startHour + i).padStart(2,'0'),
          capacity: Math.max(1, Math.floor(60 / period)),
          bookedCount: 0,
          isFull: false,
          labelFrom: `${String(startHour + i).padStart(2,'0')}:00`,
          labelTo: `${String(startHour + i + 1).padStart(2,'0')}:00`,
        }));
        setHoursInfo(hours.map((h: any) => ({ hour: h.hour, capacity: h.capacity, bookedCount: h.bookedCount, isFull: h.isFull })));
      }
      hours.forEach((h: any) => {
        const hourNum = Number(String(h.hour).slice(0,2));
        for (let m = 0; m < 60; m += period) {
          const t = `${String(hourNum).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
          const isPast = hourNum < nowHour || (hourNum === nowHour && m <= nowMin);
          if (isPast) continue;
          if (bookedSet.has(t)) continue;
          if (h.isFull) continue;
          gen.push(t);
        }
      });
      const uniq = Array.from(new Set(gen)).sort((a, b) => a.localeCompare(b));
      if (!uniq.length) {
        // Fallback: next 8 increments from current time based on period
        const baseMin = nowMin + (period - (nowMin % period));
        const start = baseMin >= 60 ? { h: nowHour + 1, m: 0 } : { h: nowHour, m: baseMin };
        for (let i = 0; i < 12; i++) {
          const h = start.h + Math.floor((start.m + i * period) / 60);
          const m = (start.m + i * period) % 60;
          if (h >= 18) break;
          const t = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
          if (!bookedSet.has(t)) uniq.push(t);
        }
      }
      setTimes(uniq);
    } catch {
      setTimes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshTimes();
    const s = getSocket();
    joinDoctorRoom(userId);
    const onBooked = () => refreshTimes();
    const onPeriod = () => refreshTimes();
    const onUpdated = () => refreshTimes();
    const onCancelled = () => refreshTimes();
    s.on('appointment-booked', onBooked);
    s.on('slots:period-updated', onPeriod);
    s.on('appointment-updated', onUpdated);
    s.on('appointment-updated-optimistic', onUpdated);
    s.on('appointment-cancelled', onCancelled);
    return () => {
      s.off('appointment-booked', onBooked);
      s.off('slots:period-updated', onPeriod);
      s.off('appointment-updated', onUpdated);
      s.off('appointment-updated-optimistic', onUpdated);
      s.off('appointment-cancelled', onCancelled);
    };
  }, [userId]);

  const onReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setErrMsg(null);
    if (!name.trim() || !selectedTime) { setErrMsg('Please enter name and select a time'); return; }
    try {
      setLoading(true);
      await apiClient.reserveWalkInSlot({ name: name.trim(), phone: phone.trim() || undefined, date: todayStr, time: selectedTime });
      setName('');
      setPhone('');
      setMessage(`Reserved ${selectedTime} successfully`);
      setTimes((prev) => prev.filter((t) => t !== selectedTime));
      setHoursInfo((prev) => {
        const hh = selectedTime.slice(0,2);
        return prev.map((h) => h.hour === hh ? { ...h, bookedCount: h.bookedCount + 1, isFull: h.bookedCount + 1 >= h.capacity } : h);
      });
      setSelectedTime('');
      await refreshTimes();
    } catch {
      setErrMsg('Failed to reserve slot');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <form onSubmit={onReserve} className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Patient Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Rahul Sharma" className="w-full px-3 py-2 border rounded-md text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" className="w-full px-3 py-2 border rounded-md text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Time</label>
          <select name="walkin-time" value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm">
            <option value="" disabled>Select an available time</option>
            {times.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="mt-1 text-xs text-gray-500">
            {loading ? 'Refreshing…' : (
              (() => {
                const hh = selectedTime ? selectedTime.slice(0,2) : null;
                const h = hh ? hoursInfo.find(x => x.hour === hh) : null;
                if (h) {
                  const remaining = Math.max(0, h.capacity - h.bookedCount);
                  return `Capacity ${h.capacity}, booked ${h.bookedCount}, remaining ${remaining}`;
                }
                return `${times.length} available`;
              })()
            )}
          </div>
        </div>
        <div className="flex items-end">
          <button type="submit" disabled={loading || !name.trim() || !times.length} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm">
            Reserve
          </button>
          <button type="button" onClick={refreshTimes} className="ml-2 px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-md text-xs">
            Refresh
          </button>
        </div>
      </form>
      {message && <div className="mt-2 text-xs font-semibold text-emerald-700">✅ {message}</div>}
      {errMsg && <div className="mt-2 text-xs font-semibold text-red-600">⚠️ {errMsg}</div>}
    </div>
  );
}

// ============================================================================
// 🏗️ INTERFACE DEFINITIONS - TypeScript types for our data
// ============================================================================
interface DoctorProfile {
  id: number;
  slug: string;
  specialization: string;
  qualifications: string;
  experience: number;
  clinicName: string;
  clinicAddress: string;
  city: string;
  state: string;
  phone: string;
  consultationFee: number;
  about: string;
  services: string[];
  workingHours: string;
  websiteTheme: string;
  profileImage: string;
  // Whether the doctor's microsite is enabled (approved by admin)
  micrositeEnabled?: boolean;
  // Verification status from admin
  verificationStatus?: string;
  verificationSubmitted?: boolean;
  // Period length in minutes for booking slot subdivisions
  slotPeriodMinutes?: number;
  slotPeriodUpdatedAt?: string | null;
  previousSlotPeriodMinutes?: number | null;
}

interface DashboardStats {
  totalAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;
  totalPatients: number;
  monthlyRevenue: number;
  websiteViews: number;
  todaysBookings?: number;
}

// ============================================================================
// 🎨 SLOT COLOR UTILITY - Visual differentiation for slot boxes
// ============================================================================
const getISTDayIndex = (date: Date) => {
  const wk = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', weekday: 'short' }).format(date);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[wk] ?? date.getDay();
};

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

// ============================================================================
// 🏥 DOCTOR DASHBOARD COMPONENT - Main dashboard component
// ============================================================================
export default function DashboardPage() {
  // ============================================================================
  // 🎯 STATE MANAGEMENT - Variables that control component behavior
  // ============================================================================
  const { user, logout } = useAuth();                      // Get user info and logout function

  const [appointments, setAppointments] = useState<Appointment[]>([]); // List of appointments
  const [expandedUpcomingDates, setExpandedUpcomingDates] = useState<Record<string, boolean>>({});

  const toggleDateExpansion = (dateKey: string) => {
    setExpandedUpcomingDates(prev => ({
      ...prev,
      [dateKey]: !prev[dateKey]
    }));
  };
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null); // Doctor profile data
  const [stats, setStats] = useState<DashboardStats | null>(null); // Dashboard statistics
  const [slots, setSlots] = useState<Slot[]>([]);          // Doctor availability slots
  const [slotDate, setSlotDate] = useState('');            // New slot date (YYYY-MM-DD)
  const [slotTime, setSlotTime] = useState('');            // New slot time (HH:mm)
  const [isLoading, setIsLoading] = useState(true);        // Loading state
  const [error, setError] = useState<string | null>(null); // Error state
  const [activeTab, setActiveTab] = useState('overview');  // Currently selected tab
  const [appointmentViewMode, setAppointmentViewMode] = useState<'list' | 'grouped'>('grouped'); // Doctor appointments view mode
  const [selectedAppointmentForPopup, setSelectedAppointmentForPopup] = useState<Appointment | null>(null);
  const [doctorStatusFilter, setDoctorStatusFilter] = useState<'ALL'|'CONFIRMED'|'PENDING'|'CANCELLED'|'EMERGENCY'>('ALL'); // Doctor-only filter
  const [apptRefreshing, setApptRefreshing] = useState(false); // Appointments section refresh indicator
  const [apptLastRefreshed, setApptLastRefreshed] = useState<Date | null>(null);
  const [apptCountdown, setApptCountdown] = useState(10); // Countdown to next auto-refresh
  const [selectedHourKey, setSelectedHourKey] = useState<string | null>(null); // "dateKey:hour" e.g. "2026-05-28:9"
  const [collapsedHourKeys, setCollapsedHourKeys] = useState<Record<string, boolean>>({}); // Collapse per hour box
  const [showExpiredSlots, setShowExpiredSlots] = useState(false); // Collapsible for expired slots
  const [calYear, setCalYear] = useState(() => new Date().getFullYear()); // Mini calendar year
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth()); // Mini calendar month
  const [hospitalProfile, setHospitalProfile] = useState<any | null>(null); // Hospital profile data (admin)
  const [hospitalBI, setHospitalBI] = useState<any | null>(null); // Business intelligence data
  const [hospitalBILoading, setHospitalBILoading] = useState(false);
  const [patients, setPatients] = useState<Array<{ patientId: number; email: string; count: number; lastDate: string }>>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [hospitalDoctors, setHospitalDoctors] = useState<Array<{ id: number; email: string; doctorProfile?: any; departmentId?: number | null; departmentName?: string | null }>>([]);
  const [hospitalDoctorSearch, setHospitalDoctorSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // Sidebar collapse state
  const [deptCollapsed, setDeptCollapsed] = useState<Record<string, boolean>>({});
  const [deptSortMode, setDeptSortMode] = useState<'alpha' | 'activity'>('alpha');
  const [selectedDoctorView, setSelectedDoctorView] = useState<number | null>(null); // doctor id for detail panel
  const [hospitalView, setHospitalView] = useState<'departments' | 'list' | 'doctor'>('departments'); // hospital appointments view mode
  const deferredHospitalDoctorSearch = useDeferredValue(hospitalDoctorSearch);
  const filteredHospitalDoctors = useMemo(() => {
    const q = deferredHospitalDoctorSearch.trim().toLowerCase();
    if (!q) return hospitalDoctors;
    const words = q.split(/\s+/).filter(Boolean);
    return hospitalDoctors.filter((doc) => {
      const tokens: string[] = [];
      if (doc.doctorProfile?.slug) tokens.push(String(doc.doctorProfile.slug).toLowerCase());
      if (doc.doctorProfile?.specialization) tokens.push(String(doc.doctorProfile.specialization).toLowerCase());
      if (doc.email) tokens.push(String(doc.email.split('@')[0]).toLowerCase());
      tokens.push(String(doc.id).toLowerCase());
      return words.every((w) => tokens.some((t) => t.includes(w)));
    });
  }, [hospitalDoctors, deferredHospitalDoctorSearch]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (activeTab !== 'patients') return;
      if (!(user?.role === 'DOCTOR')) return;
      setPatientsLoading(true);
      try {
        const list = await apiClient.getMyPatients();
        if (!cancelled) setPatients(list);
      } catch (_) {
        if (!cancelled) setPatients([]);
      } finally {
        if (!cancelled) setPatientsLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [activeTab, user?.role]);

  const highlightDoctorLabel = (label: string) => {
    const q = deferredHospitalDoctorSearch.trim();
    if (!q) return label;
    const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    let parts: Array<{ text: string; match: boolean }> = [{ text: label, match: false }];
    tokens.forEach((t) => {
      const nextParts: Array<{ text: string; match: boolean }> = [];
      parts.forEach((p) => {
        if (p.match) { nextParts.push(p); return; }
        const idx = p.text.toLowerCase().indexOf(t);
        if (idx !== -1) {
          if (idx > 0) nextParts.push({ text: p.text.slice(0, idx), match: false });
          nextParts.push({ text: p.text.slice(idx, idx + t.length), match: true });
          const rest = p.text.slice(idx + t.length);
          if (rest) nextParts.push({ text: rest, match: false });
        } else {
          nextParts.push(p);
        }
      });
      parts = nextParts;
    });
    return (
      <span>
        {parts.map((p, i) => p.match ? (
          <mark key={i} className="bg-yellow-200 text-gray-900 rounded px-1">{p.text}</mark>
        ) : (
          <span key={i}>{p.text}</span>
        ))}
      </span>
    );
  };
  const [doctorAppointmentsMap, setDoctorAppointmentsMap] = useState<Record<number, Appointment[]>>({}); // Appointments per doctor
  const [loadingHospitalBookings, setLoadingHospitalBookings] = useState(false); // Loading flag for hospital bookings
  const [hospitalDoctorSlotsMap, setHospitalDoctorSlotsMap] = useState<Record<number, Slot[]>>({}); // Slots per doctor (hospital admin)
  const [hospitalDoctorPeriodMap, setHospitalDoctorPeriodMap] = useState<Record<number, number>>({}); // Slot period per doctor (hospital admin)
  const [hospitalDoctorAvailabilityMap, setHospitalDoctorAvailabilityMap] = useState<Record<number, Record<string, { periodMinutes: number; hours: Array<{ hour: string; capacity: number; bookedCount: number; isFull: boolean; labelFrom: string; labelTo: string }> }>>>({});
  const [hospitalDoctorErrorMap, setHospitalDoctorErrorMap] = useState<Record<number, string>>({});
  // Hour-level availability per date for doctor (capacity/booked)
  const [availabilityByDate, setAvailabilityByDate] = useState<Record<string, { periodMinutes: number; hours: Array<{ hour: string; capacity: number; bookedCount: number; isFull: boolean; labelFrom: string; labelTo: string }> }>>({});
  const [selectedDoctorForTiming, setSelectedDoctorForTiming] = useState<number | null>(null);
  // History toggles
  const [showDoctorHistory, setShowDoctorHistory] = useState(false);
  const [historyVisibleDoctor, setHistoryVisibleDoctor] = useState<Record<number, boolean>>({});
  const [hospitalWorkingHours, setHospitalWorkingHours] = useState<Array<{ dayOfWeek: number; start: string | null; end: string | null }>>([]);
  // Doctor's own working hours — used in appointments day view
  const [doctorWorkingHours, setDoctorWorkingHours] = useState<Record<number, { start: string; end: string }>>({
    0: { start: '09:00', end: '17:00' },
    1: { start: '09:00', end: '17:00' },
    2: { start: '09:00', end: '17:00' },
    3: { start: '09:00', end: '17:00' },
    4: { start: '09:00', end: '17:00' },
    5: { start: '10:00', end: '14:00' },
    6: { start: '', end: '' },
  });
  const [hospitalHoursInputs, setHospitalHoursInputs] = useState<Record<number, { start: string; end: string }>>({
    0: { start: "09:00", end: "17:00" },
    1: { start: "09:00", end: "17:00" },
    2: { start: "09:00", end: "17:00" },
    3: { start: "09:00", end: "17:00" },
    4: { start: "09:00", end: "17:00" },
    5: { start: "10:00", end: "14:00" },
    6: { start: "", end: "" },
  });
  const [selectedHospitalDate, setSelectedHospitalDate] = useState<string>('');
  const isDoctorLike = !!(user && (user.role === 'DOCTOR' || user.role === 'HOSPITAL_ADMIN'));
const [socketReady, setSocketReady] = useState(false);
  const [patientTokenByAppt, setPatientTokenByAppt] = useState<Record<number, { currentToken: number; myToken: number; total: number }>>({});
  const [doctorTokenToday, setDoctorTokenToday] = useState<{ currentToken: number; total: number }>({ currentToken: 0, total: 0 });

  // IST date/time helpers for consistent display
  const formatIST = (date: Date, opts?: Intl.DateTimeFormatOptions) => {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      ...(opts || { dateStyle: 'medium', timeStyle: 'short', hour12: false }),
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
  const istDateTimeFromDateAndTime = (dateStr: string, timeStr: string) => {
    // dateStr: YYYY-MM-DD, timeStr: HH:mm, treated as IST
    const [y, m, d] = dateStr.split('-').map((x) => parseInt(x));
    const [hh, mm] = timeStr.split(':').map((x) => parseInt(x));
    return new Date(Date.UTC(y, (m - 1), d, (hh - 5), (mm - 30), 0, 0));
  };
  const getAppointmentISTDate = (a: Appointment) => {    try {
      if (a.time && /^\d{2}:\d{2}$/.test(a.time)) {
        const datePart = a.date.slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
          return istDateTimeFromDateAndTime(datePart, a.time);
        }
      }
      const d = new Date(a.date);
      if (!isNaN(d.getTime())) return d;
      return new Date();
    } catch {
      return new Date();
    }
  };
  const getISTNow = () => {
    const now = new Date();
    const datePart = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    const timePart = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
    return istDateTimeFromDateAndTime(datePart, timePart);
  };

  // Defined after helpers — safe to use getAppointmentISTDate here
  const recentHospitalAppointments = useMemo(() => {
    const list = Object.values(doctorAppointmentsMap).flat();
    const sorted = list.slice().sort((a, b) => getAppointmentISTDate(b).getTime() - getAppointmentISTDate(a).getTime());
    return sorted.slice(0, 5);
  }, [doctorAppointmentsMap]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!selectedHospitalDate) {
      const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
      setSelectedHospitalDate(fmt.format(getISTNow()));
    }
  }, []);

  // ============================================================================
  // 🔄 TAB VALIDATION - Ensure non-doctors can't access doctor-specific tabs
  // ============================================================================
  useEffect(() => {
    if (user && !isDoctorLike && ['patients', 'website', 'settings', 'slots'].includes(activeTab)) {
      setActiveTab('overview');
    }
  }, [user, activeTab, isDoctorLike]);

  // ============================================================================
  // 📡 REAL-TIME REFRESH - Listen for global events to update dashboard state
  // ============================================================================
  useEffect(() => {
    if (!user) return;
    const s = getSocket();
    
    const refreshData = async (msg?: any) => {
      try {
        const appointmentsResult = await apiClient.getMyAppointments();
        setAppointments(appointmentsResult);
        
        const payload = msg?.payload || msg || {};
        const did = Number(payload?.doctorId);
        const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(getISTNow());

        // Helper to refresh slots for a specific doctor
        const refreshSlots = async (doctorIdToRefresh: number) => {
          try {
            const avail = await apiClient.getSlotsAndAvailability({ doctorId: doctorIdToRefresh, date: todayStr }).catch(() => null);
            if (avail && (avail as any).slots) {
              setHospitalDoctorSlotsMap((prev) => ({ ...prev, [doctorIdToRefresh]: (avail as any).slots }));
            }
          } catch {}
        };

        if (user.role === 'DOCTOR') {
          const [statsResult, mySlots] = await Promise.all([
            apiClient.getDoctorStats(),
            apiClient.getSlots({ doctorId: user.id }).catch(() => [])
          ]);
          setStats(statsResult);
          setSlots(Array.isArray(mySlots) ? mySlots : []);
          // Also update doctorAppointmentsMap so the day view refreshes
          setDoctorAppointmentsMap((prev) => ({ ...prev, [user.id]: appointmentsResult }));
          
          // Refresh Tokens
          const r = await apiClient.getDoctorTokensToday(user.id);
          setDoctorTokenToday({ currentToken: Number(r.currentToken || 0), total: Array.isArray(r.tokens) ? r.tokens.length : 0 });

          // Refresh Capacity Availability
          const fmtDateIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
          const dates = Array.from(new Set(appointmentsResult.map((a) => fmtDateIST.format(getAppointmentISTDate(a)))));
          if (dates.length > 0) {
            const results = await Promise.all(
              dates.map((date) => apiClient.getSlotsAndAvailability({ doctorId: user.id, date }).catch(() => null))
            );
            const next: any = {};
            dates.forEach((date, idx) => {
              const res = results[idx] as any;
              if (res && res.availability) next[date] = res.availability;
            });
            setAvailabilityByDate(prev => ({ ...prev, ...next }));
          }

          if (Number(did) === Number(user.id)) {
            setDoctorAppointmentsMap((prev) => ({
              ...prev,
              [user.id]: appointmentsResult,
            }));
            await refreshSlots(Number(user.id));
          }
        }

        if (did && (user.role === 'HOSPITAL_ADMIN' || user.role === 'ADMIN')) {
          const hid = hospitalProfile?.id;
          if (hid) {
            const items = await apiClient.getHospitalDoctorAppointments(hid, did);
            setDoctorAppointmentsMap((prev) => ({
              ...prev,
              [did]: Array.isArray(items) ? items : [],
            }));
            await refreshSlots(did);
          }
        }

        if (user.role === 'PATIENT') {
          // Patient token refresh logic is already handled by the 'token:updated' listener
        }
      } catch (err) {
        console.warn('Real-time refresh failed:', err);
      }
    };

    const onUpdate = (updated: any) => {
      try {
        const id = Number(updated?.id || updated?.appointment?.id);
        const newDid = Number(updated?.doctor?.id ?? updated?.doctorId ?? updated?.appointment?.doctorId);
        const nextStatus = updated?.status ?? updated?.appointment?.status;
        const nextDate = updated?.date ?? updated?.appointment?.date;
        const nextTime = updated?.time ?? updated?.appointment?.time;

        setAppointments((prev) => prev.map((a) => (
          a.id === id ? { ...a, status: nextStatus ?? a.status, date: nextDate ?? a.date, time: nextTime ?? a.time, doctorId: Number.isFinite(newDid) ? newDid : a.doctorId } : a
        )));

        setDoctorAppointmentsMap((prev) => {
          const next: Record<number, Appointment[]> = { ...prev };
          Object.keys(next).forEach((key) => {
            const didKey = Number(key);
            next[didKey] = (next[didKey] || []).filter((a) => a.id !== id);
          });
          if (Number.isFinite(newDid)) {
            const prevAppt = Object.values(prev).flat().find((a) => a.id === id);
            const updatedAppt = prevAppt ? { ...prevAppt, status: nextStatus ?? prevAppt.status, date: nextDate ?? prevAppt.date, time: nextTime ?? prevAppt.time, doctorId: newDid } : ({ id, status: nextStatus, date: nextDate, time: nextTime, doctorId: newDid } as any);
            next[newDid] = [...(next[newDid] || []), updatedAppt];
          }
          return next;
        });
        
        // Also do a full refresh to be sure
        refreshData(updated);
      } catch {}
    };

    const onCancel = (msg: any) => {
      try {
        const id = Number(msg?.id || msg?.appointment?.id);
        setAppointments((prev) => prev.filter((a) => a.id !== id));
        setDoctorAppointmentsMap((prev) => {
          const next: Record<number, Appointment[]> = { ...prev };
          Object.keys(next).forEach((key) => {
            const didKey = Number(key);
            next[didKey] = (next[didKey] || []).filter((a) => a.id !== id);
          });
          return next;
        });
        refreshData(msg);
      } catch {}
    };

    // Join appropriate rooms
    const joinRooms = () => {
      if (user.role === 'DOCTOR') joinDoctorRoom(user.id);
      if (hospitalProfile?.id) s.emit('join-hospital', hospitalProfile.id);
      if (user?.role === 'PATIENT' && user?.id) s.emit('join-patient', user.id);
    };

    s.on('connect', () => { setSocketReady(true); joinRooms(); });
    s.on('reconnect', () => { joinRooms(); });
    s.on('disconnect', () => setSocketReady(false));

    // Listen for appointment-related events
    s.on('appointment-booked', refreshData);
    s.on('appointment:new', refreshData);
    s.on('appointment-updated', onUpdate);
    s.on('appointment:updated', onUpdate);
    s.on('appointment-updated-optimistic', onUpdate);
    s.on('appointment-cancelled', onCancel);
    s.on('slots:updated', refreshData);
    
    joinRooms();

    return () => {
      s.off('appointment-booked', refreshData);
      s.off('appointment:new', refreshData);
      s.off('appointment-updated', onUpdate);
      s.off('appointment:updated', onUpdate);
      s.off('appointment-updated-optimistic', onUpdate);
      s.off('appointment-cancelled', onCancel);
      s.off('slots:updated', refreshData);
    };
  }, [user?.id, user?.role, hospitalProfile?.id]);

  // ============================================================================
  // 🔄 SIDE EFFECTS - Code that runs when component mounts or updates
  // ============================================================================
  useEffect(() => {
    if (!user) return;                                     // Don't fetch if no user

    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null); // Clear previous errors
        
        // ============================================================================
        // 📊 FETCH DASHBOARD DATA - Role-based data fetching
        // ============================================================================
        
        // Always fetch appointments (works for all user types)
        let appointmentsResult: Appointment[] = [];
        try {
          appointmentsResult = await apiClient.getMyAppointments();
          setAppointments(appointmentsResult);
        } catch (apptErr: any) {
          console.warn('⚠️ Failed to fetch appointments:', apptErr.message);
          // Don't set global error yet, just use empty list
          setAppointments([]);
          
          // If it's a critical database error, we might want to show a non-blocking toast or banner later
          if (apptErr.message?.includes('Database unavailable')) {
            console.error('🛑 DATABASE UNAVAILABLE');
          }
        }
        
        // Only fetch doctor-specific data if user is a doctor
        if (user.role === 'DOCTOR') {
          const [profileResult, statsResult] = await Promise.allSettled([
            apiClient.getDoctorProfile(),
            apiClient.getDoctorStats()
          ]);
          
          // Profile: optional – handle 404 gracefully
          if (profileResult.status === 'fulfilled') {
            setDoctorProfile(profileResult.value as any);
          } else {
            // If profile not found or other error, set to null and continue
            setDoctorProfile(null);
            console.warn('⚠️ Failed to fetch doctor profile');
          }

          // Load doctor's own working hours for appointments day view
          try {
            const wh = await apiClient.getDoctorWorkingHours();
            if (Array.isArray(wh) && wh.length > 0) {
              const next: Record<number, { start: string; end: string }> = {};
              wh.forEach((h: any) => {
                if (typeof h.dayOfWeek === 'number') {
                  next[h.dayOfWeek] = { start: h.startTime?.slice(0,5) || '', end: h.endTime?.slice(0,5) || '' };
                }
              });
              setDoctorWorkingHours(prev => ({ ...prev, ...next }));
            }
          } catch { /* keep defaults */ }
          
          // Stats: optional – default to zeros on failure
          if (statsResult.status === 'fulfilled') {
            setStats(statsResult.value as any);
          } else {
            setStats({
              totalAppointments: appointmentsResult.length,
              pendingAppointments: appointmentsResult.filter(a => a.status === 'PENDING').length,
              completedAppointments: appointmentsResult.filter(a => a.status === 'COMPLETED').length,
              totalPatients: 0,
              monthlyRevenue: 0,
              websiteViews: 0,
            });
          }

          // Load slots for this doctor
          try {
            const loadedSlots = await apiClient.getSlots({ doctorId: user.id });
            setSlots(loadedSlots);
          } catch (e) {
            console.warn('Failed to load slots:', e);
            setSlots([]);
          }
        } else if (user.role === 'HOSPITAL_ADMIN') {
          let didSetHStats = false;
          // Fetch hospital info for admin
          try {
            const myHospital = await apiClient.getMyHospital();
            if (myHospital?.id) {
              try {
                const [profileJson, details] = await Promise.all([
                  apiClient.getHospitalProfile(myHospital.id),
                  apiClient.getHospitalDetails(myHospital.id)
                ]);
                setHospitalProfile({ ...(myHospital as any), profile: profileJson, subdomain: (details as any)?.subdomain } as any);
              } catch (_) {
                setHospitalProfile(myHospital || null);
              }
            } else {
              setHospitalProfile(myHospital || null);
            }
            let gotHStats = false;
            if (myHospital?.id) {
              try {
                const hstats = await apiClient.getHospitalStats(myHospital.id);
                setStats(hstats as any);
                gotHStats = true;
                didSetHStats = true;
              } catch (e) {
                console.warn('Failed to load hospital stats:', e);
              }
            }
          } catch (e) {
            console.warn('Failed to load hospital profile:', e);
            setHospitalProfile(null);
          }

          // Hospital admins: doctor-specific profile not applicable
          setDoctorProfile(null);
          if (!didSetHStats) {
            setStats({
              totalAppointments: appointmentsResult.length,
              pendingAppointments: appointmentsResult.filter(a => a.status === 'PENDING').length,
              completedAppointments: appointmentsResult.filter(a => a.status === 'COMPLETED').length,
              totalPatients: 0,
              monthlyRevenue: 0,
              websiteViews: 0,
              todaysBookings: 0,
            });
          }
          // Slots are doctor-scoped; leave empty for hospital admins for now
          setSlots([]);
        } else {
          // For non-doctors, set doctor-specific data to null/defaults
          setDoctorProfile(null);
          setStats({
            totalAppointments: appointmentsResult.length,
            pendingAppointments: appointmentsResult.filter(a => a.status === 'PENDING').length,
            completedAppointments: appointmentsResult.filter(a => a.status === 'COMPLETED').length,
            totalPatients: 0,
            monthlyRevenue: 0,
            websiteViews: 0,
          });
        }
        
      } catch (err: any) {
        console.error('Dashboard data fetch error:', err);
        setError(err.message || 'Failed to fetch dashboard data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== 'PATIENT') return;
    const fmtDateIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
    const todayStr = fmtDateIST.format(getISTNow());
    const todaysConfirmed = appointments.filter(a => a.status === 'CONFIRMED' && fmtDateIST.format(getAppointmentISTDate(a)) === todayStr);
    if (todaysConfirmed.length === 0) { setPatientTokenByAppt({}); return; }
    (async () => {
      const entries = await Promise.allSettled(todaysConfirmed.map(a => apiClient.getDoctorTokensToday(a.doctorId).then(res => ({ a, res })).catch(() => ({ a, res: null as any }))));
      const map: Record<number, { currentToken: number; myToken: number; total: number }> = {};
      entries.forEach(e => {
        if (e.status === 'fulfilled' && e.value && e.value.res) {
          const { a, res } = e.value as any;
          const total = Array.isArray(res.tokens) ? res.tokens.length : 0;
          const mine = Array.isArray(res.tokens) ? (res.tokens.find((t: any) => Number(t.appointmentId) === a.id)?.token || 0) : 0;
          map[a.id] = { currentToken: Number(res.currentToken || 0), myToken: Number(mine || 0), total: Number(total || 0) };
        }
      });
      setPatientTokenByAppt(map);
    })();
  }, [appointments, user?.role]);

  useEffect(() => {
    if (!user || user.role !== 'PATIENT') return;
    const s = getSocket();
    const fmtDateIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
    const todayStr = fmtDateIST.format(getISTNow());
    const todaysConfirmed = appointments.filter(a => a.status === 'CONFIRMED' && fmtDateIST.format(getAppointmentISTDate(a)) === todayStr);
    const doctorIds = Array.from(new Set(todaysConfirmed.map(a => a.doctorId)));
    doctorIds.forEach(id => joinDoctorRoom(id));
    const handler = (p: any) => {
      const did = Number(p?.doctorId);
      if (!doctorIds.includes(did)) return;
      setPatientTokenByAppt(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => {
          const apptId = Number(k);
          const a = todaysConfirmed.find(x => x.id === apptId);
          if (a && a.doctorId === did) {
            const info = next[apptId] || { currentToken: 0, myToken: 0, total: 0 };
            next[apptId] = { ...info, currentToken: Number(p.currentToken || 0) };
          }
        });
        return next;
      });
    };
    s.on('token:updated', handler);
    return () => {
      s.off('token:updated', handler);
    };
  }, [appointments, user?.role]);

  useEffect(() => {
    if (!user || user.role !== 'DOCTOR') return;
    if (activeTab !== 'appointments') return;
    let mounted = true;
    (async () => {
      try {
        const r = await apiClient.getDoctorTokensToday(user.id);
        if (!mounted) return;
        setDoctorTokenToday({ currentToken: Number(r.currentToken || 0), total: Array.isArray(r.tokens) ? r.tokens.length : 0 });
      } catch {
        if (!mounted) return;
        setDoctorTokenToday({ currentToken: 0, total: 0 });
      }
    })();
    const s = getSocket();
    joinDoctorRoom(user.id);
    const handler = (p: any) => {
      if (Number(p?.doctorId) !== user.id) return;
      setDoctorTokenToday(prev => ({ ...prev, currentToken: Number(p.currentToken || 0) }));
    };
    const onBooked = async (msg: any) => {
      try {
        setApptRefreshing(true);
        // Server already sends only to this doctor's room — no need to filter by doctorId
        const [appts, mySlots] = await Promise.all([
          apiClient.getMyAppointments().catch(() => null),
          apiClient.getSlots({ doctorId: user.id }).catch(() => null),
        ]);
        if (!mounted) return;
        if (appts) {
          setAppointments(appts);
          setDoctorAppointmentsMap(prev => ({ ...prev, [user.id]: appts }));
        }
        if (mySlots) setSlots(Array.isArray(mySlots) ? mySlots : []);
        setApptLastRefreshed(new Date());
        try {
          const r = await apiClient.getDoctorTokensToday(user.id);
          if (!mounted) return;
          setDoctorTokenToday({ currentToken: Number(r.currentToken || 0), total: Array.isArray(r.tokens) ? r.tokens.length : 0 });
        } catch {}
      } catch {} finally { if (mounted) setApptRefreshing(false); }
    };
    s.on('token:updated', handler);
    s.on('appointment-booked', onBooked);
    s.on('slots:updated', onBooked);
    return () => {
      mounted = false;
      s.off('token:updated', handler);
      s.off('appointment-booked', onBooked);
      s.off('slots:updated', onBooked);
    };
  }, [user?.id, user?.role, activeTab]);

  // ── Separate polling interval — isolated so socket re-registrations don't reset it ──
  useEffect(() => {
    if (!user || user.role !== 'DOCTOR' || activeTab !== 'appointments') return;
    let mounted = true;
    const tick = async () => {
      try {
        const [r, appts] = await Promise.all([
          apiClient.getDoctorTokensToday(user.id),
          apiClient.getMyAppointments().catch(() => null),
        ]);
        if (!mounted) return;
        setDoctorTokenToday({ currentToken: Number(r.currentToken || 0), total: Array.isArray(r.tokens) ? r.tokens.length : 0 });
        if (appts) { setAppointments(appts); setDoctorAppointmentsMap(prev => ({ ...prev, [user.id]: appts })); }
        setApptLastRefreshed(new Date());
        setApptCountdown(10); // reset countdown after each refresh
      } catch {}
    };
    const id = setInterval(tick, 10000);
    return () => { mounted = false; clearInterval(id); };
  }, [user?.id, user?.role, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Countdown timer — ticks every second, resets on refresh ──
  useEffect(() => {
    if (!user || user.role !== 'DOCTOR' || activeTab !== 'appointments') return;
    setApptCountdown(10);
    const id = setInterval(() => {
      setApptCountdown(prev => prev <= 1 ? 10 : prev - 1);
    }, 1000);
    return () => clearInterval(id);
  }, [user?.id, user?.role, activeTab, apptLastRefreshed]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch hour-level availability for appointment dates (doctor)
  useEffect(() => {
    if (!user || user.role !== 'DOCTOR') return;
    const fmtDateIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
    const dates = Array.from(new Set(appointments.map((a) => fmtDateIST.format(getAppointmentISTDate(a)))));
    if (dates.length === 0) return;
    const missing = dates.filter((d) => !availabilityByDate[d]);
    if (missing.length === 0) return;

    // Instant local fallback for capacity to avoid UI lag
    const period = Number(doctorProfile?.slotPeriodMinutes ?? 15);
    const capacityPerHour = Math.max(1, Math.floor(60 / Math.max(1, period)));
    const initialAvail: Record<string, { periodMinutes: number; hours: Array<{ hour: string; capacity: number; bookedCount: number; isFull: boolean; labelFrom: string; labelTo: string }> }> = { ...availabilityByDate };
    missing.forEach((date) => {
      if (!initialAvail[date]) {
        initialAvail[date] = {
          periodMinutes: period,
          hours: Array.from({ length: 24 }, (_, h) => ({
            hour: String(h).padStart(2, '0') + ':00',
            capacity: capacityPerHour,
            bookedCount: 0,
            isFull: false,
            labelFrom: `${String(h).padStart(2, '0')}:00`,
            labelTo: `${String((h + 1) % 24).padStart(2, '0')}:00`,
          })),
        };
      }
    });
    setAvailabilityByDate(initialAvail);

    (async () => {
      try {
        const results = await Promise.all(
          missing.map((date) =>
            apiClient.getSlotsAndAvailability({ doctorId: user.id, date }).catch(() => null)
          )
        );
        const next: Record<string, { periodMinutes: number; hours: Array<{ hour: string; capacity: number; bookedCount: number; isFull: boolean; labelFrom: string; labelTo: string }> }> = { ...availabilityByDate };
        missing.forEach((date, idx) => {
          const r = results[idx] as any;
          if (r && r.availability) {
            next[date] = r.availability;
          }
        });
        setAvailabilityByDate(next);
      } catch (err) {
        console.warn('Failed to fetch availability:', err);
      }
    })();
  }, [user, appointments]);

  // Load hospital doctors and their bookings for hospital admins
  useEffect(() => {
    // Also load BI data
    if (user?.role === 'HOSPITAL_ADMIN' && hospitalProfile?.id) {
      setHospitalBILoading(true);
      apiClient.getHospitalBI(hospitalProfile.id)
        .then((data: any) => setHospitalBI(data))
        .catch(() => setHospitalBI(null))
        .finally(() => setHospitalBILoading(false));
    }
  }, [user?.role, hospitalProfile?.id]);

  useEffect(() => {
    const loadHospitalBookings = async () => {
      if (!user || user.role !== 'HOSPITAL_ADMIN' || !hospitalProfile?.id) return;
      try {
        setLoadingHospitalBookings(true);
        // Fetch full hospital info with linked doctors and departments
        const details = await apiClient.getHospitalFull(hospitalProfile.id);
        const links = ((details?.doctors || []) as Array<any>)
          .map((l) => {
            const d = l?.doctor || {};
            return { ...d, departmentId: l?.department?.id ?? null, departmentName: l?.department?.name ?? null };
          })
          .filter((d) => d && typeof d.id === 'number');
        setHospitalDoctors(links);

        const perDoctor: Record<number, Appointment[]> = {};
        const perDoctorSlots: Record<number, Slot[]> = {};
        const perDoctorPeriod: Record<number, number> = {};
        const availMapNext: Record<number, Record<string, { periodMinutes: number; hours: Array<{ hour: string; capacity: number; bookedCount: number; isFull: boolean; labelFrom: string; labelTo: string }> }>> = {};
        const errorMapNext: Record<number, string> = {};
        await Promise.all(
          links.map(async (d) => {
            try {
              const dateStr = selectedHospitalDate;
              const results = await Promise.allSettled([
                apiClient.getHospitalDoctorAppointments(hospitalProfile.id, d.id),
                apiClient.getSlotInsights({ doctorId: d.id, date: dateStr }).catch(() => null),
                apiClient.getHospitalDoctorSlotPeriod(hospitalProfile.id, d.id),
              ]);
              const items = results[0].status === 'fulfilled' ? (results[0].value as any) : [];
              const insights = results[1].status === 'fulfilled' ? (results[1].value as any) : null;
              const p = results[2].status === 'fulfilled' ? (results[2].value as any) : undefined;
              perDoctor[d.id] = Array.isArray(items) ? items : [];
              perDoctorSlots[d.id] = [];
              const prev = hospitalDoctorPeriodMap[d.id];
              const pval = (p && typeof (p as any).slotPeriodMinutes === 'number') ? Number((p as any).slotPeriodMinutes) : undefined;
              const profileVal = (d?.doctorProfile && typeof d.doctorProfile.slotPeriodMinutes === 'number') ? Number(d.doctorProfile.slotPeriodMinutes) : undefined;
              perDoctorPeriod[d.id] = pval ?? prev ?? profileVal ?? 15;
              if (insights && (insights as any).availability) {
                const byDate = availMapNext[d.id] || {};
                byDate[dateStr] = (insights as any).availability;
                availMapNext[d.id] = byDate;
              }
            } catch (e: any) {
              if (!perDoctor[d.id]) perDoctor[d.id] = [];
              if (!perDoctorSlots[d.id]) perDoctorSlots[d.id] = [];
              if (perDoctorPeriod[d.id] === undefined) {
                const prev = hospitalDoctorPeriodMap[d.id];
                const profileVal = (d?.doctorProfile && typeof d.doctorProfile.slotPeriodMinutes === 'number') ? Number(d.doctorProfile.slotPeriodMinutes) : undefined;
                perDoctorPeriod[d.id] = prev ?? profileVal ?? 15;
              }
              const msg = (e && e.message) ? String(e.message) : '';
              if (msg) errorMapNext[d.id] = msg;
            }
          })
        );
        setDoctorAppointmentsMap(perDoctor);
        setHospitalDoctorSlotsMap(perDoctorSlots);
        setHospitalDoctorPeriodMap(perDoctorPeriod);
        setHospitalDoctorAvailabilityMap(availMapNext);
        setHospitalDoctorErrorMap(errorMapNext);
      } catch (e) {
        console.warn('Failed to load hospital doctor bookings:', e);
      } finally {
        setLoadingHospitalBookings(false);
      }
    };

    loadHospitalBookings();
  }, [user, hospitalProfile, selectedHospitalDate]);

  useEffect(() => {
    let timer: any = null;
    let stopped = false;
    const run = async () => {
      if (!user || user.role !== 'HOSPITAL_ADMIN' || !hospitalProfile?.id) return;
      const links = hospitalDoctors && hospitalDoctors.length > 0 ? hospitalDoctors : [];
      if (links.length === 0) return;
      try {
        const perDoctor: Record<number, Appointment[]> = {};
        const perDoctorSlots: Record<number, Slot[]> = {};
        await Promise.all(
          links.map(async (d: any) => {
            try {
              const items = await apiClient.getHospitalDoctorAppointments(hospitalProfile.id, d.id);
              perDoctor[d.id] = Array.isArray(items) ? items : [];
              perDoctorSlots[d.id] = [];
            } catch {
              if (!perDoctor[d.id]) perDoctor[d.id] = [];
              if (!perDoctorSlots[d.id]) perDoctorSlots[d.id] = [];
            }
          })
        );
        if (stopped) return;
        setDoctorAppointmentsMap((prev) => ({ ...prev, ...perDoctor }));
        setHospitalDoctorSlotsMap((prev) => ({ ...prev, ...perDoctorSlots }));
      } catch {}
    };
    const start = () => {
      if (timer) return;
      timer = setInterval(run, 10000);
    };
    if (activeTab === 'appointments') {
      run();
      start();
    }
    const onVis = () => {
      if (document.visibilityState === 'visible' && activeTab === 'appointments') run();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      stopped = true;
      if (timer) {
        try { clearInterval(timer); } catch {}
        timer = null;
      }
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [user?.role, hospitalProfile?.id, activeTab, hospitalDoctors]);

  // Update appointment status (hospital admin -> per doctor)
  const updateDoctorAppointmentStatus = async (doctorId: number, appointmentId: number, newStatus: string) => {
    // Optimistically update UI immediately, then reconcile with server response
    let previous: Appointment[] | undefined;
    setDoctorAppointmentsMap((prev) => {
      previous = prev[doctorId];
      const nextList = (prev[doctorId] || []).map((a) =>
        a.id === appointmentId ? { ...a, status: newStatus } : a
      );
      return { ...prev, [doctorId]: nextList };
    });
    let previousAppointments: Appointment[] | undefined;
    setAppointments((prev) => {
      previousAppointments = prev;
      return prev.map((a) => (a.id === appointmentId ? { ...a, status: newStatus } : a));
    });
    // Broadcast to other dashboards (e.g., Slot Admin) for instant reflection
    try {
      const bc = new BroadcastChannel('appointments-updates');
      bc.postMessage({ type: 'appointment-update', id: appointmentId, status: newStatus });
      bc.close();
    } catch {}
    try {
      let updated: Appointment | null = null;
      if (hospitalProfile?.id) {
        updated = await apiClient.updateHospitalDoctorAppointment(
          hospitalProfile.id,
          doctorId,
          appointmentId,
          { status: newStatus }
        );
      } else if (user?.role === 'DOCTOR') {
        // Doctor updates own appointment via doctor-owned endpoint (no hospital context required)
        updated = await apiClient.updateDoctorAppointment(appointmentId, { status: newStatus });
      }
      if (updated) {
        setDoctorAppointmentsMap((prev) => ({
          ...prev,
          [doctorId]: (prev[doctorId] || []).map((a) => (a.id === appointmentId ? updated as Appointment : a)),
        }));
        setAppointments((prev) => prev.map((a) => (a.id === appointmentId ? updated as Appointment : a)));
      } else {
        throw new Error('No permission to update appointment');
      }
    } catch (e: any) {
      // Revert on failure
      setDoctorAppointmentsMap((prev) => ({
        ...prev,
        [doctorId]: previous || (prev[doctorId] || []),
      }));
      setAppointments((prev) => previousAppointments || prev);
      alert(e?.message || 'Failed to update appointment status');
    }
  };

  // Cancel appointment (doctor convenience wrapper)
  const cancelDoctorAppointment = async (appointmentId: number) => {
    try {
      if (!user?.id) return;
      await updateDoctorAppointmentStatus(user.id as number, appointmentId, 'CANCELLED');
    } catch (e: any) {
      alert(e?.message || 'Failed to cancel appointment');
    }
  };

  const onDragStartAppointment = (ev: any, appointment: Appointment) => {
    if (!ev?.dataTransfer) return;
    try {
      // Some browsers require a plain text payload to enable drop
      ev.dataTransfer.setData('text/plain', JSON.stringify({ id: appointment.id }));
      ev.dataTransfer.setData('appointment-json', JSON.stringify(appointment));
      ev.dataTransfer.effectAllowed = 'move';
      console.log('[DND] dragstart', { id: appointment.id, doctorId: appointment.doctorId, date: appointment.date, time: appointment.time });
    } catch {}
  };

  // Burst handling: debounce + small concurrency queue + retries
  const MAX_RESCHEDULE_CONCURRENCY = 3;
  const rescheduleQueueRef = useRef<{ running: number; q: Array<() => Promise<void>> }>({ running: 0, q: [] });
  const rescheduleTimersRef = useRef<Map<number, any>>(new Map());
  const latestRescheduleRef = useRef<Map<number, { dateStr: string; timeStr: string; doctorId: number }>>(new Map());
  const prevStatesRef = useRef<Map<number, { appts: Appointment[]; map: Record<number, Appointment[]> }>>(new Map());

  const processRescheduleQueue = () => {
    const q = rescheduleQueueRef.current;
    while (q.running < MAX_RESCHEDULE_CONCURRENCY && q.q.length > 0) {
      const task = q.q.shift()!;
      q.running++;
      task().finally(() => {
        q.running--;
        processRescheduleQueue();
      });
    }
  };
  const enqueueCommit = (fn: () => Promise<void>) => {
    rescheduleQueueRef.current.q.push(fn);
    processRescheduleQueue();
  };

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const withRetry = async <T,>(fn: () => Promise<T>, max = 5) => {
    let lastErr: any;
    for (let i = 0; i < max; i++) {
      try {
        return await fn();
      } catch (e: any) {
        lastErr = e;
        const delay = 250 * Math.pow(2, i) + Math.floor(Math.random() * 150);
        await sleep(delay);
      }
    }
    throw lastErr || new Error('Too many attempts, please try again');
  };

  const commitReschedule = async (appointmentId: number) => {
    const latest = latestRescheduleRef.current.get(appointmentId);
    if (!latest) return;
    const { dateStr, timeStr, doctorId: did } = latest;

    // Resolve hospital ID for both admin and doctor flows
    let hid = hospitalProfile?.id as number | undefined;
    if (!hid && user?.role === 'DOCTOR') {
      const byDoctor = await apiClient.getHospitalByDoctorId(did).catch(() => null);
      const maybeId = (byDoctor as any)?.id ?? (byDoctor as any)?.hospitalId;
      hid = Number.isFinite(maybeId) ? Number(maybeId) : hid;
    }
    if (!hid) {
      const myHospital = await apiClient.getMyHospital().catch(() => null);
      hid = myHospital?.id ?? hid;
    }

    // If no hospital context and not a doctor, avoid hitting doctor-only endpoint
    if (!hid && user?.role !== 'DOCTOR') {
      throw new Error('You do not have permission to perform this action.');
    }

    const doUpdate = () =>
      hid
        ? apiClient.updateHospitalDoctorAppointment(hid!, did, appointmentId, { date: dateStr, time: timeStr })
        : apiClient.updateDoctorAppointment(appointmentId, { date: dateStr, time: timeStr });

    await withRetry(doUpdate);

    try {
      const ch = new BroadcastChannel('appointments-updates');
      ch.postMessage({ type: 'appointment-reschedule', id: appointmentId, payload: { doctorId: did, date: dateStr, time: timeStr } });
      ch.close();
    } catch {}
  };

  const rescheduleDoctorAppointment = async (appointment: Appointment, targetStart: Date, targetDoctorId?: number) => {
    const did = targetDoctorId ?? (user?.id ? Number(user?.id) : undefined);
    if (!did) return;

    const fmtDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const fmtTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const dateStr = fmtDate.format(targetStart);
    const timeStr = fmtTime.format(targetStart);

    console.log('[DND] drop -> reschedule', { id: appointment.id, fromDoctorId: appointment.doctorId, toDoctorId: did, date: dateStr, time: timeStr });

    // Snapshot current state in case we need to revert this exact attempt
    prevStatesRef.current.set(appointment.id, { appts: appointments, map: doctorAppointmentsMap });

    // Optimistic UI update
    setAppointments((prev) =>
      prev.map((a) => (a.id === appointment.id ? { ...a, date: dateStr, time: timeStr, doctorId: did } : a))
    );
    setDoctorAppointmentsMap((prev) => {
      const next: Record<number, Appointment[]> = { ...prev };
      const oldDid = Number(appointment.doctorId || did);
      if (oldDid && next[oldDid]) {
        next[oldDid] = (next[oldDid] || []).filter((a) => a.id !== appointment.id);
      }
      next[did] = [...(next[did] || []), { ...appointment, date: dateStr, time: timeStr, doctorId: did }];
      return next;
    });

    // Record latest desired state for this appointment
    latestRescheduleRef.current.set(appointment.id, { dateStr, timeStr, doctorId: did });

    // Debounce commit to absorb rapid bursts
    const existing = rescheduleTimersRef.current.get(appointment.id);
    if (existing) {
      try { clearTimeout(existing as any); } catch {}
    }
    const timerId = setTimeout(() => {
      enqueueCommit(async () => {
        try {
          await commitReschedule(appointment.id);
          // Successful commit clears prev snapshot
          prevStatesRef.current.delete(appointment.id);
        } catch (e: any) {
          console.warn('[DND] reschedule commit failed', e);
          const latest = latestRescheduleRef.current.get(appointment.id);
          // Only revert if no newer reschedule has happened for this appointment
          if (latest && latest.dateStr === dateStr && latest.timeStr === timeStr && latest.doctorId === did) {
            const prev = prevStatesRef.current.get(appointment.id);
            if (prev) {
              setAppointments(prev.appts);
              setDoctorAppointmentsMap(prev.map);
            }
          }
          alert(e?.message || 'Failed to reschedule appointment');
        }
      });
      rescheduleTimersRef.current.delete(appointment.id);
    }, 250);
    rescheduleTimersRef.current.set(appointment.id, timerId);
  };

  // Listen for cross-dashboard updates to keep Hospital Admin in sync
  useEffect(() => {
    const channel = new BroadcastChannel('appointments-updates');
    channel.onmessage = (ev) => {
      const msg = ev.data as any;
      if (msg?.type === 'appointment-update') {
        setDoctorAppointmentsMap((prev) => {
          const next: Record<number, Appointment[]> = { ...prev };
          Object.keys(next).forEach((key) => {
            const did = Number(key);
            next[did] = (next[did] || []).map((a) => (a.id === msg.id ? { ...a, status: msg.status } : a));
          });
          return next;
        });
        setAppointments((prev) => prev.map((a) => (a.id === msg.id ? { ...a, status: msg.status } : a)));
      } else if (msg?.type === 'appointment-cancel') {
        setDoctorAppointmentsMap((prev) => {
          const next: Record<number, Appointment[]> = { ...prev };
          Object.keys(next).forEach((key) => {
            const did = Number(key);
            next[did] = (next[did] || []).filter((a) => a.id !== msg.id);
          });
          return next;
        });
        setAppointments((prev) => prev.filter((a) => a.id !== msg.id));
      } else if (msg?.type === 'appointment-reschedule') {
        const payload = msg?.payload || {};
        const newDid = Number(payload.doctorId);
        setAppointments((prev) => prev.map((a) => (a.id === msg.id ? { ...a, date: payload.date, time: payload.time, doctorId: newDid || a.doctorId } : a)));
        setDoctorAppointmentsMap((prev) => {
          const next: Record<number, Appointment[]> = { ...prev };
          // remove from all doctors first
          Object.keys(next).forEach((key) => {
            const did = Number(key);
            next[did] = (next[did] || []).filter((a) => a.id !== msg.id);
          });
          // add to new doctor
          if (newDid) {
            // try to find the base appointment from previous map
            const prevAppt = Object.values(prev).flat().find((a) => a.id === msg.id);
            const updated = prevAppt ? { ...prevAppt, date: payload.date, time: payload.time, doctorId: newDid } : ({ id: msg.id, date: payload.date, time: payload.time, doctorId: newDid } as any);
            next[newDid] = [...(next[newDid] || []), updated];
          }
          return next;
        });
      } else if (msg?.type === 'appointment-booked') {
        // On patient booking, refresh that doctor's appointments and slots for instant reflection
        const payload = msg?.payload || {};
        const did = Number(payload.doctorId);
        if (!did) return;

        const refreshForHospital = async (hid: number) => {
          try {
            const items = await apiClient.getHospitalDoctorAppointments(hid, did);
            setDoctorAppointmentsMap((prev) => ({
              ...prev,
              [did]: Array.isArray(items) ? items : [],
            }));
          } catch (e) {
            // keep UI graceful
          }
        };

        if (hospitalProfile?.id) {
          refreshForHospital(hospitalProfile.id);
        } else {
          // Fallback: fetch my hospital first if not yet loaded
          apiClient.getMyHospital().then((h) => {
            if (h?.id) refreshForHospital(h.id);
          }).catch(() => {});
        }
      }
    };
    return () => channel.close();
  }, []);


// Live updates via SSE: subscribe to hospital appointment events
  useEffect(() => {
    const hid = hospitalProfile?.id;
    if (!hid || socketReady) return;
    const es = new EventSource(`/api/hospitals/${hid}/appointments/events`);

    const onUpdate = (ev: MessageEvent) => {
      try {
        const updated: any = JSON.parse(ev.data);
        const id = Number(updated?.id);
        const newDid = Number(updated?.doctor?.id ?? updated?.doctorId);
        const nextStatus = updated?.status;
        const nextDate = updated?.date;
        const nextTime = updated?.time;

        setAppointments((prev) => prev.map((a) => (
          a.id === id ? { ...a, status: nextStatus ?? a.status, date: nextDate ?? a.date, time: nextTime ?? a.time, doctorId: Number.isFinite(newDid) ? newDid : a.doctorId } : a
        )));

        setDoctorAppointmentsMap((prev) => {
          const next: Record<number, Appointment[]> = { ...prev };
          Object.keys(next).forEach((key) => {
            const did = Number(key);
            next[did] = (next[did] || []).filter((a) => a.id !== id);
          });
          if (Number.isFinite(newDid)) {
            const prevAppt = Object.values(prev).flat().find((a) => a.id === id);
            const updatedAppt = prevAppt ? { ...prevAppt, status: nextStatus ?? prevAppt.status, date: nextDate ?? prevAppt.date, time: nextTime ?? prevAppt.time, doctorId: newDid } : ({ id, status: nextStatus, date: nextDate, time: nextTime, doctorId: newDid } as any);
            next[newDid] = [...(next[newDid] || []), updatedAppt];
          }
          return next;
        });
      } catch {}
    };

    const onCancel = (ev: MessageEvent) => {
      try {
        const msg: any = JSON.parse(ev.data);
        const id = Number(msg?.id);
        setAppointments((prev) => prev.filter((a) => a.id !== id));
        setDoctorAppointmentsMap((prev) => {
          const next: Record<number, Appointment[]> = { ...prev };
          Object.keys(next).forEach((key) => {
            const did = Number(key);
            next[did] = (next[did] || []).filter((a) => a.id !== id);
          });
          return next;
        });
      } catch {}
    };

    // On patient booking, refresh that doctor's appointments and slots
    const onBooked = async (ev: MessageEvent) => {
      try {
        const msg: any = JSON.parse(ev.data);
        const payload = msg?.payload || msg || {};
        const did = Number(payload?.doctorId);
        if (!did) return;

        const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(getISTNow());

        const refreshForHospital = async (hid2: number) => {
          try {
            const [items, avail] = await Promise.all([
              apiClient.getHospitalDoctorAppointments(hid2, did),
              apiClient.getSlotsAndAvailability({ doctorId: did, date: todayStr }).catch(() => null)
            ]);
            setDoctorAppointmentsMap((prev) => ({
              ...prev,
              [did]: Array.isArray(items) ? items : [],
            }));
            if (avail && (avail as any).slots) {
              setHospitalDoctorSlotsMap((prev) => ({ ...prev, [did]: (avail as any).slots }));
            }
          } catch {}
        };
        await refreshForHospital(hid);
      } catch {}
    };

    es.addEventListener('appointment-updated', onUpdate);
    es.addEventListener('appointment-updated-optimistic', onUpdate);
    es.addEventListener('appointment-cancelled', onCancel);
    es.addEventListener('appointment-booked', onBooked);
    es.onerror = () => {
      // Optional: could implement exponential backoff reconnect
    };

    return () => {
      es.close();
    };
  }, [hospitalProfile?.id]);

  // Live updates via SSE: subscribe to doctor appointment events
  useEffect(() => {
    const did = user?.role === 'DOCTOR' ? user?.id : undefined;
    if (!did || socketReady) return;
    const es = new EventSource(`/api/doctors/${did}/appointments/events`);

    const onUpdate = (ev: MessageEvent) => {
      try {
        const updated: any = JSON.parse(ev.data);
        const id = Number(updated?.id);
        const newDid = Number(updated?.doctor?.id ?? updated?.doctorId);
        const nextStatus = updated?.status;
        const nextDate = updated?.date;
        const nextTime = updated?.time;

        setAppointments((prev) => prev.map((a) => (
          a.id === id ? { ...a, status: nextStatus ?? a.status, date: nextDate ?? a.date, time: nextTime ?? a.time, doctorId: Number.isFinite(newDid) ? newDid : a.doctorId } : a
        )));

        setDoctorAppointmentsMap((prev) => {
          const next: Record<number, Appointment[]> = { ...prev };
          Object.keys(next).forEach((key) => {
            const didKey = Number(key);
            next[didKey] = (next[didKey] || []).filter((a) => a.id !== id);
          });
          if (Number.isFinite(newDid)) {
            const prevAppt = Object.values(prev).flat().find((a) => a.id === id);
            const updatedAppt = prevAppt ? { ...prevAppt, status: nextStatus ?? prevAppt.status, date: nextDate ?? prevAppt.date, time: nextTime ?? prevAppt.time, doctorId: newDid } : ({ id, status: nextStatus, date: nextDate, time: nextTime, doctorId: newDid } as any);
            next[newDid] = [...(next[newDid] || []), updatedAppt];
          }
          return next;
        });
      } catch {}
    };

    const onCancel = (ev: MessageEvent) => {
      try {
        const msg: any = JSON.parse(ev.data);
        const id = Number(msg?.id);
        setAppointments((prev) => prev.filter((a) => a.id !== id));
        setDoctorAppointmentsMap((prev) => {
          const next: Record<number, Appointment[]> = { ...prev };
          Object.keys(next).forEach((key) => {
            const didKey = Number(key);
            next[didKey] = (next[didKey] || []).filter((a) => a.id !== id);
          });
          return next;
        });
      } catch {}
    };

    // On patient booking, refresh that doctor's appointments and slots
    const onBooked = async (ev: MessageEvent) => {
      try {
        const msg: any = JSON.parse(ev.data);
        const payload = msg?.payload || {};
        const bookedDid = Number(payload?.doctorId);
        if (!bookedDid || bookedDid !== did) return;

        // Fetch fresh appointments and slots directly for this doctor
        const [mine, mySlots] = await Promise.all([
          apiClient.getMyAppointments().catch(() => []),
          apiClient.getSlots({ doctorId: did }).catch(() => []),
        ]);
        setAppointments(mine);
        setSlots(Array.isArray(mySlots) ? mySlots : []);
        setDoctorAppointmentsMap((prev) => ({ ...prev, [did]: mine }));

        // Also refresh hospital view if applicable
        if (hospitalProfile?.id) {
          try {
            const items = await apiClient.getHospitalDoctorAppointments(hospitalProfile.id, did);
            setDoctorAppointmentsMap((prev) => ({ ...prev, [did]: Array.isArray(items) ? items : mine }));
          } catch {}
        }
      } catch {}
    };

    es.addEventListener('appointment-updated', onUpdate);
    es.addEventListener('appointment-updated-optimistic', onUpdate);
    es.addEventListener('appointment-cancelled', onCancel);
    es.addEventListener('appointment-booked', onBooked);
    es.onerror = () => {
      // Optional: could implement exponential backoff reconnect
    };

    return () => {
      es.close();
    };
  }, [user?.id, user?.role]);

  // Live updates via SSE: subscribe to patient appointment events
  useEffect(() => {
    const pid = user?.role === 'PATIENT' ? user?.id : undefined;
    if (!pid || socketReady) return;
    const es = new EventSource(`/api/patients/${pid}/appointments/events`);

    const onUpdate = (ev: MessageEvent) => {
      try {
        const updated: any = JSON.parse(ev.data);
        const id = Number(updated?.id);
        const newDid = Number(updated?.doctor?.id ?? updated?.doctorId);
        const nextStatus = updated?.status;
        const nextDate = updated?.date;
        const nextTime = updated?.time;

        setAppointments((prev) => prev.map((a) => (
          a.id === id ? { ...a, status: nextStatus ?? a.status, date: nextDate ?? a.date, time: nextTime ?? a.time, doctorId: Number.isFinite(newDid) ? newDid : a.doctorId } : a
        )));

        setDoctorAppointmentsMap((prev) => {
          const next: Record<number, Appointment[]> = { ...prev };
          Object.keys(next).forEach((key) => {
            const did = Number(key);
            next[did] = (next[did] || []).filter((a) => a.id !== id);
          });
          if (Number.isFinite(newDid)) {
            const prevAppt = Object.values(prev).flat().find((a) => a.id === id);
            const updatedAppt = prevAppt ? { ...prevAppt, status: nextStatus ?? prevAppt.status, date: nextDate ?? prevAppt.date, time: nextTime ?? prevAppt.time, doctorId: newDid } : ({ id, status: nextStatus, date: nextDate, time: nextTime, doctorId: newDid } as any);
            next[newDid] = [...(next[newDid] || []), updatedAppt];
          }
          return next;
        });
      } catch {}
    };

    const onCancel = (ev: MessageEvent) => {
      try {
        const msg: any = JSON.parse(ev.data);
        const id = Number(msg?.id);
        setAppointments((prev) => prev.filter((a) => a.id !== id));
        setDoctorAppointmentsMap((prev) => {
          const next: Record<number, Appointment[]> = { ...prev };
          Object.keys(next).forEach((key) => {
            const did = Number(key);
            next[did] = (next[did] || []).filter((a) => a.id !== id);
          });
          return next;
        });
      } catch {}
    };

    // On patient booking, refresh that doctor's appointments and slots
    const onBooked = async (ev: MessageEvent) => {
      try {
        const msg: any = JSON.parse(ev.data);
        const payload = msg?.payload || {};
        const did = Number(payload?.doctorId);
        if (!did) return;

        const refreshForHospital = async (hid2: number) => {
          try {
            const [items, slots] = await Promise.all([
              apiClient.getHospitalDoctorAppointments(hid2, did),
              apiClient.getSlots({ doctorId: did }),
            ]);
            setDoctorAppointmentsMap((prev) => ({
              ...prev,
              [did]: Array.isArray(items) ? items : [],
            }));
            setHospitalDoctorSlotsMap((prev) => ({
              ...prev,
              [did]: Array.isArray(slots) ? slots : [],
            }));
          } catch {}
        };

        if (hospitalProfile?.id) {
          await refreshForHospital(hospitalProfile.id);
        } else {
          try {
            const h = await apiClient.getMyHospital();
            if (h?.id) await refreshForHospital(h.id);
          } catch {}
        }
      } catch {}
    };

    es.addEventListener('appointment-updated', onUpdate);
    es.addEventListener('appointment-updated-optimistic', onUpdate);
    es.addEventListener('appointment-cancelled', onCancel);
    es.addEventListener('appointment-booked', onBooked);
    es.onerror = () => {};
    return () => { es.close(); };
  }, [user?.role, user?.id]);

  // Global flags for drag/drop
  const dropHandledRef = useRef(false);

  // Global dragover/drop fallback for doctor grouped capacity view
  useEffect(() => {
    const shouldEnable = activeTab === 'appointments' && user?.role === 'DOCTOR' && appointmentViewMode === 'grouped';
    if (!shouldEnable) return;

    const onDragOver = (ev: DragEvent) => {
      ev.preventDefault();
      try { (ev as any).dataTransfer.dropEffect = 'move'; } catch {}
    };

    const onDrop = (ev: DragEvent) => {
      ev.preventDefault();
      if (dropHandledRef.current) { dropHandledRef.current = false; return; }
      try {
        const raw = (ev as any).dataTransfer.getData('appointment-json') || (ev as any).dataTransfer.getData('text/plain');
        if (!raw) { console.warn('[DND] global-drop: missing data'); return; }
        const appt = JSON.parse(raw);
        const candidates = Array.from(document.querySelectorAll('[data-seg-start], [data-hour-start]')) as HTMLElement[];
        if (candidates.length === 0) { console.warn('[DND] global-drop: no capacity candidates'); return; }
        const y = ev.clientY;
        let nearest: HTMLElement | null = null;
        let best = Number.POSITIVE_INFINITY;
        for (const el of candidates) {
          const r = el.getBoundingClientRect();
          if (r.width <= 0 || r.height <= 0) continue; // skip off-screen/hidden
          const cy = r.top + r.height / 2;
          const d = Math.abs(y - cy);
          if (d < best) { best = d; nearest = el; }
        }
        if (!nearest) { console.warn('[DND] global-drop: no nearest slot'); return; }
        const startIso = nearest.getAttribute('data-seg-start') || nearest.getAttribute('data-hour-start');
        const didStr = nearest.getAttribute('data-doctor-id') || String(user?.id ?? '');
        if (!startIso || !didStr) { console.warn('[DND] global-drop: missing target data'); return; }
        const did = Number(didStr);
        const targetStart = new Date(startIso);
        console.log('[DND] global drop', { apptId: appt.id, doctorId: did, startIso });
        rescheduleDoctorAppointment(appt, targetStart, did);
      } catch (err) {
        console.warn('[DND] global-drop parse error', err);
      }
    };

    document.addEventListener('dragenter', onDragOver);
    document.addEventListener('dragover', onDragOver);
    document.addEventListener('drop', onDrop);
    return () => {
      document.removeEventListener('dragenter', onDragOver);
      document.removeEventListener('dragover', onDragOver);
      document.removeEventListener('drop', onDrop);
    };
  }, [activeTab, appointmentViewMode, user?.role]);

  const loadHospitalDoctorWorkingHours = async (doctorId: number) => {
    if (!hospitalProfile?.id) return;
    try {
      const list = await apiClient.getHospitalDoctorWorkingHours(hospitalProfile.id, doctorId);
      const arr = Array.isArray(list) ? list : [];
      setHospitalWorkingHours(
        arr.map((wh: any) => ({
          dayOfWeek: wh.dayOfWeek,
          start: wh.startTime,
          end: wh.endTime,
        }))
      );
      const next: Record<number, { start: string; end: string }> = { ...hospitalHoursInputs };
      arr.forEach((wh: any) => {
        if (typeof wh.dayOfWeek === 'number') {
          next[wh.dayOfWeek] = {
            start: wh.startTime ? wh.startTime.slice(0,5) : '',
            end: wh.endTime ? wh.endTime.slice(0,5) : '',
          };
        }
      });
      setHospitalHoursInputs(next);
    } catch (e) {
      // keep UI graceful
    }
  };

  const saveHospitalDoctorWorkingHours = async () => {
    if (!hospitalProfile?.id || !selectedDoctorForTiming) return;
    try {
      const payload = Object.keys(hospitalHoursInputs)
        .map((k) => {
          const day = Number(k);
          const { start, end } = hospitalHoursInputs[day];
          if (start && end) {
            return { dayOfWeek: day, startTime: `${start}:00`, endTime: `${end}:00` };
          }
          return null;
        })
        .filter((v): v is { dayOfWeek: number; startTime: string; endTime: string } => v !== null);
      await apiClient.setHospitalDoctorWorkingHours(hospitalProfile.id, selectedDoctorForTiming, payload);
      await loadHospitalDoctorWorkingHours(selectedDoctorForTiming);
      alert('Doctor timing saved');
    } catch (e: any) {
      alert(e?.message || 'Failed to save timing');
    }
  };

  // Create a new slot
  const handleCreateSlot = async () => {
    if (!slotDate || !slotTime) {
      alert('Please enter both date and time');
      return;
    }
    try {
      const created = await apiClient.createSlot({ date: slotDate, time: slotTime });
      setSlots((prev) => [created, ...prev]);
      setSlotDate('');
      setSlotTime('');
    } catch (e: any) {
      alert(e?.message || 'Failed to create slot');
    }
  };

  // Cancel an existing slot
  const handleCancelSlot = async (slotId: number) => {
    try {
      const updated = await apiClient.cancelSlot(slotId);
      setSlots((prev) => prev.map((s) => (s.id === slotId ? updated : s)));
    } catch (e: any) {
      alert(e?.message || 'Failed to cancel slot');
    }
  };

  // ============================================================================
  // 🚫 ACCESS CONTROL - Redirect non-doctors
  // ============================================================================
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🏥</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Please log in</h1>
          <p className="text-gray-600 mb-6">Access your doctor dashboard</p>
          <Link 
            href="/login" 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all duration-200"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 🚫 ROLE CHECK - Allow both patients and doctors to access dashboard
  // ============================================================================
  // Removed role restriction - both patients and doctors can access dashboard

  // ============================================================================
  // 🔄 LOADING STATE - Show loading spinner while fetching data
  // ============================================================================
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // ❌ ERROR STATE - Show error message if data fetch fails
  // ============================================================================
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 🎯 MAIN RENDER - Display the modern doctor dashboard
  // ============================================================================
  // Helper: group appointments by date (YYYY-MM-DD) and hour (0-23)
  const groupAppointmentsByDateHour = (list: Appointment[]) => {
    const result: Record<string, Record<number, Appointment[]>> = {};
    const fmtDateIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
    list.forEach((a) => {
      const d = getAppointmentISTDate(a);
      const dateKey = fmtDateIST.format(d);
      const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }).formatToParts(d);
      const hourStr = parts.find((p) => p.type === 'hour')?.value || '00';
      const hour = parseInt(hourStr, 10) || 0;
      if (!result[dateKey]) result[dateKey] = {};
      if (!result[dateKey][hour]) result[dateKey][hour] = [];
      result[dateKey][hour].push(a);
    });
    return result;
  };

  // ── VERIFICATION GATE ──
  // Doctors: blocked until verificationStatus === 'APPROVED'
  // Hospital Admins: blocked until hospital verificationStatus === 'APPROVED'
  const doctorVerificationStatus = doctorProfile?.verificationStatus ?? 'PENDING';
  const hospitalVerificationStatus = (hospitalProfile as any)?.verificationStatus ?? 'PENDING';
  const isVerificationPending =
    (user?.role === 'DOCTOR' && doctorVerificationStatus !== 'APPROVED') ||
    (user?.role === 'HOSPITAL_ADMIN' && hospitalVerificationStatus !== 'APPROVED');

  if (user && isVerificationPending) {
    const isDoctor = user.role === 'DOCTOR';
    const vStatus = isDoctor ? doctorVerificationStatus : hospitalVerificationStatus;
    const hasSubmitted = isDoctor
      ? (doctorProfile?.verificationSubmitted ?? false)
      : ((hospitalProfile as any)?.verificationSubmitted ?? false);
    const isRejected = vStatus === 'REJECTED';

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center px-4">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8">
          {/* Status icon */}
          <div className="text-center mb-6">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isRejected ? 'bg-red-100' : hasSubmitted ? 'bg-amber-100' : 'bg-blue-100'}`}>
              <span className="text-3xl">{isRejected ? '❌' : hasSubmitted ? '⏳' : '📋'}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isRejected
                ? 'Verification Rejected'
                : hasSubmitted
                ? 'Awaiting Admin Approval'
                : isDoctor ? 'Complete Your Doctor Profile' : 'Complete Your Hospital Profile'}
            </h1>
            <p className="text-gray-500 text-sm mt-2">
              {isRejected
                ? 'Your verification was rejected. Please update your details and resubmit.'
                : hasSubmitted
                ? 'Your details have been submitted and are under review. You will gain full access once an admin approves your account.'
                : isDoctor
                ? 'Submit your registration details to get verified and appear on the platform.'
                : 'Submit your hospital registration details for admin verification.'}
            </p>
          </div>

          {/* Progress steps */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {[
              { label: 'Registered', done: true },
              { label: 'Details Submitted', done: hasSubmitted },
              { label: 'Admin Review', done: vStatus === 'APPROVED' || isRejected },
              { label: 'Approved', done: vStatus === 'APPROVED' },
            ].map((step, i, arr) => (
              <div key={i} className="flex items-center gap-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${step.done ? isRejected && i >= 2 ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {step.done ? (isRejected && i >= 2 ? '✕' : '✓') : i+1}
                </div>
                <span className="text-[10px] text-gray-500 hidden sm:inline">{step.label}</span>
                {i < arr.length - 1 && <div className={`w-5 h-px flex-shrink-0 ${step.done && !isRejected ? 'bg-emerald-400' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>

          {/* What's needed */}
          {!hasSubmitted && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 md:p-4 mb-5">
              <p className="text-xs font-bold text-blue-800 mb-2">What you need to submit:</p>
              <ul className="space-y-1">
                {isDoctor ? [
                  '✦ Medical Registration Number (MCI/State Council)',
                  '✦ Specialization & Qualifications',
                  '✦ Clinic Name & Address',
                  '✦ Consultation Fee',
                  '✦ Contact Phone Number',
                ] : [
                  '✦ Hospital Government Registration Number',
                  '✦ Hospital Name & Full Address',
                  '✦ City & State',
                  '✦ Contact Phone Number',
                ].map(item => (
                  <li key={item} className="text-xs text-blue-700">{item}</li>
                ))}
              </ul>
            </div>
          )}

          {isRejected && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 md:p-4 mb-5">
              <p className="text-xs text-red-700">Your submission was rejected. Please update your profile with accurate information and resubmit for review.</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Link
              href={isDoctor ? '/dashboard/profile' : '/hospital-admin/profile'}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-3 rounded-xl text-center transition-colors"
            >
              {isRejected ? 'Update & Resubmit' : hasSubmitted ? 'View / Update Profile' : 'Complete Profile & Submit →'}
            </Link>
            {hasSubmitted && !isRejected && (
              <p className="text-center text-xs text-gray-400">Typically reviewed within 24 hours. Contact support if you need urgent assistance.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Helper: format an hour range like "09:00 - 10:00"
  const formatHourRange = (dateKey: string, hour: number) => {
    const start = new Date(`${dateKey}T00:00:00`);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start);
    end.setHours(hour + 1);
    return `${formatISTTime(start)} - ${formatISTTime(end)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* ============================================================================
          📂 COLLAPSEABLE SIDEBAR - Navigation sidebar (Hidden on mobile)
          ============================================================================ */}
      <aside className={`fixed left-0 top-0 h-full bg-blue-900 border-r border-blue-800 transition-all duration-300 z-50 shadow-lg hidden md:flex md:flex-col ${sidebarCollapsed ? 'w-14' : 'w-52'}`}>
        {/* Toggle Button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-5 bg-blue-800 border border-blue-700 text-white rounded-full p-1 shadow-md hover:bg-blue-700 transition-all"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
          </svg>
        </button>

        {/* Logo/Brand */}
        <div className={`flex items-center border-b border-blue-800 flex-shrink-0 ${sidebarCollapsed ? 'justify-center p-3' : 'gap-2 px-3 py-3'}`}>
          <span className="text-lg flex-shrink-0">🏥</span>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <h2 className="font-bold text-sm text-white leading-tight">Healtara</h2>
              <p className="text-[10px] text-blue-300">Dashboard</p>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {(user?.role === 'PATIENT' ? [
            { label: 'Home', tab: null, href: '/', icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
            { label: 'Find Doctors', tab: null, href: '/doctors', icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg> },
            { label: 'Hospitals', tab: null, href: '/hospitals', icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
            { label: 'My Bookings', tab: 'appointments', icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
            { label: 'Profile', tab: null, href: '/dashboard/profile', icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
            { label: 'Saved', tab: null, href: '/saved', icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg> },
          ] : [
            { label: 'Dashboard', tab: null, href: '/dashboard', icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
            ...(user?.role === 'HOSPITAL_ADMIN' ? [{ label: 'Profile', tab: null, href: '/hospital-admin/profile', icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> }] : []),
            ...(user?.role === 'DOCTOR' ? [{ label: 'Profile', tab: null, href: '/dashboard/profile', icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> }] : []),
            { label: 'Appointments', tab: 'appointments', icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
            { label: 'Patients', tab: 'patients', icon: <UserGroupIcon className="w-4 h-4 flex-shrink-0" /> },
            { label: 'Prescriptions', tab: 'prescriptions', icon: <ChartBarSquareIcon className="w-4 h-4 flex-shrink-0" /> },
            { label: 'Analytics', tab: 'analytics', icon: <ChartBarIcon className="w-4 h-4 flex-shrink-0" /> },
            { label: 'Messages', tab: 'messages', badge: '8', icon: <EnvelopeIcon className="w-4 h-4 flex-shrink-0" /> },
            { label: 'Website', tab: 'website', icon: <GlobeAltIcon className="w-4 h-4 flex-shrink-0" /> },
            { label: 'Settings', tab: 'settings', icon: <CogIcon className="w-4 h-4 flex-shrink-0" /> },
          ]).map((item) => {
            const isActive = item.tab ? activeTab === item.tab : false;
            const cls = `w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-left ${isActive ? 'bg-blue-800 text-white' : 'text-blue-200 hover:bg-blue-800/60 hover:text-white'} ${sidebarCollapsed ? 'justify-center' : ''}`;
            if (item.href) {
              return (
                <Link key={item.label} href={item.href} className={cls} title={sidebarCollapsed ? item.label : undefined}>
                  {item.icon}
                  {!sidebarCollapsed && <span className="text-xs font-medium truncate">{item.label}</span>}
                </Link>
              );
            }
            return (
              <button key={item.label} onClick={() => item.tab && setActiveTab(item.tab as any)} className={cls} title={sidebarCollapsed ? item.label : undefined}>
                <div className="relative flex-shrink-0">
                  {item.icon}
                  {item.badge && !sidebarCollapsed && <span className="absolute -top-1 -right-1.5 bg-blue-500 text-[7px] font-bold px-1 rounded-full border border-blue-900 leading-tight">{item.badge}</span>}
                </div>
                {!sidebarCollapsed && <span className="text-xs font-medium truncate">{item.label}</span>}
                {item.badge && sidebarCollapsed && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-400 rounded-full" />}
              </button>
            );
          })}

          <button
            onClick={logout}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-blue-200 hover:bg-red-700/60 hover:text-white ${sidebarCollapsed ? 'justify-center' : ''}`}
            title={sidebarCollapsed ? 'Logout' : undefined}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!sidebarCollapsed && <span className="text-xs font-medium">Logout</span>}
          </button>
        </nav>

        {/* Pro upgrade card */}
        {!sidebarCollapsed && (
          <div className="px-2 py-2 flex-shrink-0">
            <div className="bg-blue-800/50 rounded-xl p-3 border border-blue-700/50">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">👑</span>
                <h4 className="text-[10px] font-bold text-white uppercase tracking-wide">Healtara Pro</h4>
              </div>
              <p className="text-[10px] text-blue-200 mb-2 leading-relaxed">Unlock advanced reports, patient insights and more.</p>
              <button className="w-full py-1.5 bg-blue-500 hover:bg-blue-400 text-white text-[10px] font-bold rounded-lg transition-all">
                Upgrade Now
              </button>
            </div>
          </div>
        )}

        {/* User Info at Bottom */}
        <div className={`flex-shrink-0 border-t border-blue-800 bg-blue-950 ${sidebarCollapsed ? 'p-2 flex justify-center' : 'px-3 py-2.5 flex items-center gap-2'}`}>
          <div className="w-7 h-7 rounded-full bg-blue-700 text-blue-100 flex items-center justify-center font-bold text-xs flex-shrink-0">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate text-white">{user?.email?.split('@')[0]}</p>
              <p className="text-[10px] text-blue-300 uppercase tracking-wide">{user?.role}</p>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area - Full width on mobile, margin on desktop */}
      <div className={`flex-1 transition-all duration-300 overflow-x-hidden ${sidebarCollapsed ? 'md:ml-14' : 'md:ml-52'} ${selectedAppointmentForPopup ? 'lg:mr-[24rem]' : ''}`}>
      {/* Removed TOP BAR header as per user request */}

      {/* ============================================================================
          📊 MAIN CONTENT - Dashboard content with tabs (with mobile bottom padding)
          ============================================================================ */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-2 sm:py-4 pb-24 md:pb-6">
        {/* ============================================================================
            🧭 NAVIGATION TABS - Tab navigation with smooth transitions (scrollable on mobile)
            ============================================================================ */}
        {user.role === 'PATIENT' && (() => {
          const fmtDateIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
          const todayStr = fmtDateIST.format(getISTNow());
          const activeAppts = appointments.filter(a => a.status === 'CONFIRMED' && fmtDateIST.format(getAppointmentISTDate(a)) === todayStr);
          if (activeAppts.length === 0) return null;

          return (
            <div className="mb-8 space-y-4 animate-in fade-in slide-in-from-top-4 duration-700">
              {activeAppts.map(a => {
                const info = patientTokenByAppt[a.id];
                const cur = info?.currentToken || 0;
                const mine = info?.myToken || 0;
                const total = info?.total || 0;
                const docLabel = getDoctorLabel(a.doctor as any) || `Doctor #${a.doctorId}`;
                const isMyTurn = cur > 0 && cur === mine;
                const hasPassed = cur > mine;

                return (
                  <div key={a.id} className={`relative overflow-hidden rounded-[2rem] shadow-2xl border-2 transition-all duration-500 ${
                    isMyTurn ? 'bg-gradient-to-r from-emerald-600 to-teal-600 border-emerald-400 scale-[1.02]' : 
                    hasPassed ? 'bg-gray-100 border-gray-200 opacity-75' :
                    'bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-400'
                  }`}>
                    <div className="px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                      <div className="flex items-center gap-5">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${isMyTurn ? 'bg-white text-emerald-600' : 'bg-white/20 text-white'}`}>
                          <Clock className="w-8 h-8" />
                        </div>
                        <div>
                          <h4 className="text-white text-base md:text-xl font-black">{isMyTurn ? 'It\'s Your Turn!' : hasPassed ? 'Appointment Completed' : 'Live Token Tracking'}</h4>
                          <p className="text-white/80 font-bold text-sm uppercase tracking-widest">{docLabel}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-8">
                        <div className="text-center">
                          <p className="text-white/60 text-[10px] font-black uppercase tracking-tighter mb-1">Now Serving</p>
                          <p className="text-white text-4xl font-black">{cur || '--'}</p>
                        </div>
                        <div className="w-px h-12 bg-white/20 hidden md:block"></div>
                        <div className="text-center">
                          <p className="text-white/60 text-[10px] font-black uppercase tracking-tighter mb-1">Your Token</p>
                          <p className={`text-4xl font-black ${isMyTurn ? 'text-white' : 'text-yellow-300'}`}>{mine || '--'}</p>
                        </div>
                      </div>

                      {!hasPassed && (
                        <div className="flex flex-col items-center gap-2">
                          <div className="bg-white/20 backdrop-blur-md px-6 py-2 rounded-2xl border border-white/30">
                            <span className="text-white font-black text-sm">
                              {isMyTurn ? 'Please proceed to cabin' : cur < mine ? `${mine - cur} people ahead` : 'Doctor is ready'}
                            </span>
                          </div>
                          {total > 0 && (
                            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${(cur/total)*100}%` }}
                                className="h-full bg-white"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        <div className="bg-white rounded-xl shadow-md mb-6 overflow-hidden -mx-4 sm:mx-0">
          <nav className="flex space-x-1 sm:space-x-1.5 p-1 sm:p-1.5 overflow-x-auto scrollbar-hide">
          {[
            { id: 'overview', name: '📊 Overview', icon: ChartBarIcon, shortName: 'Overview' },
            { id: 'appointments', name: '📅 Appointments', icon: CalendarIcon, shortName: 'Appts' },
            ...(isDoctorLike ? [{ id: 'slots', name: '🕒 Slots', icon: ClockIcon, shortName: 'Slots' }] : [])
          ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 py-1.5 px-2 sm:py-2 sm:px-3 font-bold text-[10px] sm:text-xs flex items-center justify-center space-x-1 sm:space-x-1.5 rounded-lg transition-all duration-300 whitespace-nowrap min-w-[60px] sm:min-w-0 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <tab.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">{tab.name}</span>
                <span className="sm:hidden text-[9px]">{tab.shortName}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* ============================================================================
            📊 OVERVIEW TAB - Dashboard overview with statistics
            ============================================================================ */}
        {activeTab === 'overview' && user.role === 'DOCTOR' && (
          <div className="space-y-4 pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h1 className="text-base md:text-xl font-bold text-gray-900 flex items-center gap-2">
                  Good morning, Dr. {doctorProfile?.clinicName.split(' ')[0] || user.email.split('@')[0]} 👋
                </h1>
                <p className="text-xs text-gray-500">Here's what's happening in your practice today.</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-sm">
                  <span className="text-xs font-medium text-gray-700">20 May, 2025</span>
                  <CalendarIcon className="h-4 w-4 text-gray-400" />
                </div>
                <button 
                  onClick={() => setActiveTab('slots')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm transition-all font-semibold text-xs"
                >
                  <PlusIcon className="h-4 w-4" />
                  New Appointment
                </button>
              </div>
            </div>

            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Today's Appointments", value: stats?.todaysBookings || 0, trend: "+ 20% from yesterday", icon: CalendarIcon, color: "text-blue-600", bg: "bg-blue-50" },
                { label: "Total Patients", value: stats?.totalPatients?.toLocaleString() || "0", trend: "+ 16% this month", icon: UserGroupIcon, color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Prescriptions", value: "86", trend: "+ 12% this month", icon: ChartBarIcon, color: "text-indigo-600", bg: "bg-indigo-50" },
                { label: "Patient Rating", value: "4.8/5", trend: "Based on 236 reviews", icon: ChartBarSquareIcon, color: "text-purple-600", bg: "bg-purple-50" },
              ].map((stat, i) => (
                <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                    {stat.trend.includes('%') && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                        {stat.trend.split(' ')[0]} {stat.trend.split(' ')[1]}
                      </span>
                    )}
                  </div>
                  <h3 className="text-gray-500 text-[10px] font-medium uppercase tracking-wider">{stat.label}</h3>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-base md:text-xl font-black text-gray-900">{stat.value}</span>
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">{stat.trend.split(' ').slice(2).join(' ')}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Row 2: Today's Appointments & Appointments Overview & Profile */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Today's Appointments List */}
              <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                <div className="px-3 py-2 md:px-4 md:py-3 border-b border-gray-50 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-900">Today's Appointments</h3>
                  <button onClick={() => setActiveTab('appointments')} className="text-blue-600 text-[10px] font-bold hover:underline">View all</button>
                </div>
                <div className="p-1 flex-1 overflow-y-auto max-h-[300px]">
                  {appointments.filter(a => {
                    const d = getAppointmentISTDate(a);
                    const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
                    return fmt.format(d) === new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(getISTNow());
                  }).length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-xs">No appointments</div>
                  ) : (
                    appointments
                      .filter(a => {
                        const d = getAppointmentISTDate(a);
                        const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
                        return fmt.format(d) === new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(getISTNow());
                      })
                      .map((a, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors group">
                          <div className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded shrink-0">
                            {a.time}
                          </div>
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-sm overflow-hidden shrink-0 border border-white shadow-sm">
                            {(a.patient as any)?.patientProfile?.profileImage ? (
                              <img src={`${API_BASE_URL}/uploads/${(a.patient as any).patientProfile.profileImage}`} alt="" className="w-full h-full object-cover" />
                            ) : "👤"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[10px] font-bold text-gray-900 truncate">{(a.patient as any)?.patientProfile?.name || a.patient.email.split('@')[0]}</h4>
                            <p className="text-[8px] text-gray-500 font-medium truncate">{a.reason || 'Consultation'}</p>
                          </div>
                          <div className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            a.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-600' : 
                            a.status === 'PENDING' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {a.status === 'CONFIRMED' ? 'OK' : 'Soon'}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Appointments Overview Chart */}
              <div className="lg:col-span-6 bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-gray-900">Appointments Overview</h3>
                  <select className="text-[10px] font-bold bg-gray-50 border-none rounded-lg focus:ring-0 py-1 px-2">
                    <option>This Week</option>
                    <option>This Month</option>
                  </select>
                </div>
                <div className="flex-1 min-h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[
                      { day: 'Mon', count: 15 },
                      { day: 'Tue', count: 24 },
                      { day: 'Wed', count: 18 },
                      { day: 'Thu', count: 22 },
                      { day: 'Fri', count: 35 },
                      { day: 'Sat', count: 30 },
                      { day: 'Sun', count: 18 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 'bold', fill: '#9ca3af' }} dy={10} />
                      <YAxis hide />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                        itemStyle={{ fontWeight: 'bold', color: '#2563eb' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#2563eb" 
                        strokeWidth={3} 
                        dot={{ r: 3, fill: '#2563eb', strokeWidth: 1.5, stroke: '#fff' }}
                        activeDot={{ r: 5, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                  <div>
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Total</p>
                    <p className="text-lg font-black text-gray-900">156</p>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-600 font-bold text-xs flex items-center gap-1 justify-end">
                      ↑ 18%
                    </span>
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">vs last week</p>
                  </div>
                </div>
              </div>

              {/* Profile Card (Right Side) */}
              <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                <div className="h-14 bg-blue-600 relative">
                  <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 w-14 h-14 rounded-xl border-2 border-white bg-white shadow-md overflow-hidden">
                    {doctorProfile?.profileImage ? (
                      <img src={`${API_BASE_URL}/uploads/${doctorProfile.profileImage}`} alt="" className="w-full h-full object-cover" />
                    ) : "👨‍⚕️"}
                  </div>
                  <button className="absolute top-1.5 right-1.5 bg-white/20 hover:bg-white/30 p-1 rounded-lg text-white transition-colors">
                    <CogIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="pt-8 p-4 text-center flex-1">
                  <h3 className="text-sm font-black text-gray-900 flex items-center justify-center gap-1">
                    Dr. {doctorProfile?.clinicName.split(' ')[0] || user.email.split('@')[0]}
                    <span className="text-blue-500 text-[10px]">✔️</span>
                  </h3>
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">{doctorProfile?.specialization || 'Specialist'}</p>
                  <p className="text-[8px] text-gray-400 font-medium mt-0.5">{doctorProfile?.qualifications || 'MBBS, MD'}</p>
                  <div className="flex items-center justify-center gap-1 text-[8px] text-gray-500 mt-1.5">
                    <MapPinIcon className="h-2.5 w-2.5" />
                    {doctorProfile?.clinicName || 'Apollo Hospitals'}, {doctorProfile?.city || 'Mumbai'}
                  </div>

                  <div className="grid grid-cols-3 gap-1 mt-4 pt-4 border-t border-gray-50">
                    <div>
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Exp.</p>
                      <p className="text-xs font-black text-gray-900">{doctorProfile?.experience || 8}+</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Patients</p>
                      <p className="text-xs font-black text-gray-900">{stats?.totalPatients || 1248}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Rating</p>
                      <p className="text-xs font-black text-gray-900">4.8</p>
                    </div>
                  </div>
                  
                  <button onClick={() => setActiveTab('website')} className="w-full mt-4 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-[10px] font-bold rounded-lg transition-all">
                    View Profile
                  </button>
                </div>
              </div>
            </div>

            {/* Row 3: Demographics & Conditions & Reviews */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Patient Demographics */}
              <div className="lg:col-span-4 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <h3 className="text-xs font-bold text-gray-900 mb-4">Patient Demographics</h3>
                <div className="flex items-center gap-3">
                  <div className="w-28 h-28 shrink-0 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: '0-18', value: 16, color: '#3b82f6' },
                            { name: '19-35', value: 28, color: '#fbbf24' },
                            { name: '36-55', value: 34, color: '#10b981' },
                            { name: '56+', value: 22, color: '#8b5cf6' },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={45}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {[ '#3b82f6', '#fbbf24', '#10b981', '#8b5cf6' ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[7px] font-bold text-gray-400 uppercase">Total</span>
                      <span className="text-sm font-black text-gray-900 leading-none">{stats?.totalPatients || '1,248'}</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    {[
                      { label: '0-18 Years', value: '16%', count: '199', color: 'bg-blue-500' },
                      { label: '19-35 Years', value: '28%', count: '349', color: 'bg-yellow-400' },
                      { label: '36-55 Years', value: '34%', count: '424', color: 'bg-emerald-500' },
                      { label: '56+ Years', value: '22%', count: '276', color: 'bg-purple-500' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between group">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${item.color}`} />
                          <span className="text-[9px] font-bold text-gray-500 group-hover:text-gray-900 transition-colors">{item.label}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] font-black text-gray-900">{item.value}</span>
                          <span className="text-[7px] text-gray-400 font-bold ml-0.5">({item.count})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Conditions */}
              <div className="lg:col-span-4 bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-gray-900">Top Conditions</h3>
                  <select className="text-[9px] font-bold bg-gray-50 border-none rounded-lg focus:ring-0 py-0.5 px-1.5">
                    <option>This Month</option>
                  </select>
                </div>
                <div className="space-y-3 flex-1">
                  {[
                    { label: 'Hypertension', value: '28%', count: '241', icon: '🩺', bg: 'bg-blue-50', color: 'text-blue-600' },
                    { label: 'CAD', value: '18%', count: '155', icon: '❤️', bg: 'bg-red-50', color: 'text-red-600' },
                    { label: 'Arrhythmia', value: '12%', count: '103', icon: '💓', bg: 'bg-emerald-50', color: 'text-emerald-600' },
                    { label: 'Diabetes', value: '10%', count: '86', icon: '🧪', bg: 'bg-cyan-50', color: 'text-cyan-600' },
                    { label: 'Others', value: '32%', count: '268', icon: '🧬', bg: 'bg-purple-50', color: 'text-purple-600' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between group">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-lg ${item.bg} ${item.color} flex items-center justify-center text-[10px] shadow-sm group-hover:scale-110 transition-transform`}>
                          {item.icon}
                        </div>
                        <span className="text-[10px] font-bold text-gray-700 group-hover:text-gray-900 transition-colors">{item.label}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black text-gray-900">{item.value}</span>
                        <span className="text-[8px] text-gray-400 font-bold ml-0.5">({item.count})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Reviews */}
              <div className="lg:col-span-4 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-gray-900">Recent Reviews</h3>
                  <button className="text-blue-600 text-[10px] font-bold hover:underline">View all</button>
                </div>
                <div className="space-y-3 md:space-y-4">
                  {[
                    { name: 'Riya Sharma', text: 'Kind and patient doctor.', rating: 5, date: '18 May' },
                    { name: 'Vikram Patel', text: 'Excellent experience.', rating: 5, date: '16 May' },
                    { name: 'Meera Joshi', text: 'Great diagnosis.', rating: 5, date: '14 May' },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-2 group">
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] shrink-0 shadow-sm border border-white">👤</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] font-bold text-gray-900 truncate">{item.name}</h4>
                          <span className="text-[8px] font-bold text-gray-400">{item.date}</span>
                        </div>
                        <div className="flex text-yellow-400 text-[8px] my-0.5">
                          {Array.from({ length: item.rating }).map((_, j) => <span key={j}>⭐</span>)}
                        </div>
                        <p className="text-[9px] text-gray-500 font-medium line-clamp-1 leading-tight">{item.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom: Quick Actions & Earnings Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Quick Actions */}
              <div className="lg:col-span-8 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <h3 className="text-xs font-bold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { label: 'New Appt', icon: CalendarIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Add Patient', icon: UserGroupIcon, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Prescribe', icon: ChartBarIcon, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Report', icon: GlobeAltIcon, color: 'text-cyan-600', bg: 'bg-cyan-50' },
                    { label: 'Message', icon: BellIcon, color: 'text-purple-600', bg: 'bg-purple-50' },
                  ].map((action, i) => (
                    <button key={i} className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-gray-50 transition-all group">
                      <div className={`p-2.5 rounded-xl ${action.bg} ${action.color} shadow-sm group-hover:scale-110 transition-all`}>
                        <action.icon className="h-5 w-5" />
                      </div>
                      <span className="text-[9px] font-bold text-gray-600 group-hover:text-gray-900 transition-colors text-center truncate w-full">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Earnings Overview */}
              <div className="lg:col-span-4 bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-gray-900">Earnings</h3>
                  <select className="text-[9px] font-bold bg-gray-50 border-none rounded-lg focus:ring-0 py-0.5 px-1.5">
                    <option>Month</option>
                  </select>
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span className="text-base md:text-xl font-black text-gray-900">₹{stats?.monthlyRevenue.toLocaleString() || "2.48k"}</span>
                    <span className="text-emerald-600 font-bold text-[10px] flex items-center gap-0.5">
                      ↑ 22%
                    </span>
                  </div>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-4">Earnings vs last month</p>
                  
                  <div className="h-12 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[
                        { v: 4000 }, { v: 3000 }, { v: 5000 }, { v: 4500 }, { v: 6000 }, { v: 5500 }, { v: 7000 }
                      ]}>
                        <defs>
                          <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="v" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorEarnings)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'overview' && user.role !== 'DOCTOR' && (
          <div className="space-y-3 md:space-y-5">
            {user.role === 'HOSPITAL_ADMIN' && hospitalProfile && (hospitalProfile as any)?.profile?.serviceStatus === 'PENDING' && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 flex items-center gap-2 text-sm">
                <span>⏳</span>
                <p><span className="font-semibold">Awaiting approval</span> — Hospital services are pending admin review.</p>
              </div>
            )}

            {user.role === 'HOSPITAL_ADMIN' && (
              <>
                {/* ── ROW 0: Status Banner ── */}
                <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 rounded-xl md:rounded-2xl p-3 md:p-4 shadow-lg">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {(hospitalProfile as any)?.profile?.general?.logoUrl ? (
                        <img src={(hospitalProfile as any).profile.general.logoUrl} alt="logo" className="w-9 h-9 md:w-12 md:h-12 rounded-xl object-cover bg-white/10" />
                      ) : (
                        <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl flex-shrink-0">🏥</div>
                      )}
                      <div>
                        <h2 className="text-lg font-black text-white leading-tight">
                          {(hospitalProfile as any)?.profile?.general?.brandName || (hospitalProfile as any)?.name || 'Hospital'}
                        </h2>
                        <p className="text-blue-200 text-[11px]">
                          {(hospitalProfile as any)?.city || ''}{(hospitalProfile as any)?.state ? ` · ${(hospitalProfile as any).state}` : ''}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="bg-emerald-400 text-emerald-900 text-[9px] font-black px-2 py-0.5 rounded-full">● LIVE</span>
                          <span className="text-blue-300 text-[10px]">{hospitalDoctors.length} doctors · {new Set(hospitalDoctors.map((d: any) => d?.departmentName || 'General')).size} depts</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setActiveTab('appointments')} className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all">📅 Appointments</button>
                      <a href="/hospital-admin/profile" className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all">✏️ Edit Profile</a>
                      <a href={`/hospital-site/${(hospitalProfile as any)?.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 bg-white text-blue-700 hover:bg-blue-50 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all">🌐 View Site</a>
                    </div>
                  </div>
                </div>

                {/* ── ROW 1: Revenue + KPIs ── */}
                {(() => {
                  const bi = hospitalBI;
                  const revTrend = bi && bi.yesterdayRevenue > 0 ? Math.round(((bi.todayRevenue - bi.yesterdayRevenue) / bi.yesterdayRevenue) * 100) : null;
                  const fmtD = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
                  const todayStr = fmtD.format(getISTNow());
                  const allAppts = Object.values(doctorAppointmentsMap).flat();
                  const todayAppts = allAppts.filter(a => fmtD.format(getAppointmentISTDate(a)) === todayStr);
                  const activeDoctorsNow = new Set(todayAppts.filter(a => a.status === 'CONFIRMED').map(a => a.doctorId)).size;
                  const waitingPatients = todayAppts.filter(a => a.status === 'PENDING').length;
                  return (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
                      <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl p-3 md:p-4 shadow-sm">
                        <div className="flex items-start justify-between mb-1">
                          <span className="text-xl">💰</span>
                          {revTrend !== null && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${revTrend >= 0 ? 'bg-white/20 text-white' : 'bg-red-400/30 text-white'}`}>{revTrend >= 0 ? '↑' : '↓'}{Math.abs(revTrend)}%</span>}
                        </div>
                        <div className="text-lg md:text-2xl font-black text-white">₹{bi ? (bi.todayRevenue >= 1000 ? `${(bi.todayRevenue/1000).toFixed(1)}k` : bi.todayRevenue) : '—'}</div>
                        <div className="text-white font-bold text-[11px]">Today's Revenue</div>
                        <div className="text-white/70 text-[10px] mt-0.5">Week: ₹{bi ? (bi.weekRevenue >= 1000 ? `${(bi.weekRevenue/1000).toFixed(1)}k` : bi.weekRevenue) : '—'} · Month: ₹{bi ? (bi.monthRevenue >= 1000 ? `${(bi.monthRevenue/1000).toFixed(1)}k` : bi.monthRevenue) : '—'}</div>
                      </div>
                      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-2.5 md:p-4 shadow-sm">
                        <div className="text-xl mb-1">👥</div>
                        <div className="text-lg md:text-lg md:text-2xl font-black text-white">{bi ? bi.todayPatients : (stats?.todaysBookings ?? 0)}</div>
                        <div className="text-white font-bold text-[11px]">Patients Today</div>
                        <div className="text-white/70 text-[10px] mt-0.5">Pending: {bi ? bi.todayPending : waitingPatients} · Confirmed: {bi ? bi.todayConfirmed : 0}</div>
                      </div>
                      <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl p-2.5 md:p-4 shadow-sm">
                        <div className="text-xl mb-1">👨‍⚕️</div>
                        <div className="text-lg md:text-2xl font-black text-white">{activeDoctorsNow || bi?.activeDoctors || hospitalDoctors.length}</div>
                        <div className="text-white font-bold text-[11px]">Active Doctors</div>
                        <div className="text-white/70 text-[10px] mt-0.5">{hospitalDoctors.length} total · Avg fee ₹{bi?.avgConsultFee || 0}</div>
                      </div>
                      <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-2.5 md:p-4 shadow-sm">
                        <div className="text-xl mb-1">⏱️</div>
                        <div className="text-lg md:text-2xl font-black text-white">{waitingPatients}</div>
                        <div className="text-white font-bold text-[11px]">Waiting Now</div>
                        <div className="text-white/70 text-[10px] mt-0.5">Completed today: {bi ? bi.todayCompleted : todayAppts.filter(a => a.status === 'COMPLETED').length}</div>
                      </div>
                    </div>
                  );
                })()}

                {/* ── ROW 2: Live Queue + Healtara Contribution ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {/* Live Queue */}
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                      <h3 className="text-sm font-bold text-gray-900">🔴 Live Queue</h3>
                      <span className="text-[10px] text-gray-400">Real-time token status</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {(() => {
                        const fmtD = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
                        const todayStr = fmtD.format(getISTNow());
                        const deptQueues = new Map<string, { serving: number; waiting: number; doctors: string[] }>();
                        hospitalDoctors.forEach((doc: any) => {
                          const dept = doc.departmentName || 'General';
                          const appts = (doctorAppointmentsMap[doc.id] || []).filter(a => fmtD.format(getAppointmentISTDate(a)) === todayStr);
                          const confirmed = appts.filter(a => a.status === 'CONFIRMED').length;
                          const pending = appts.filter(a => a.status === 'PENDING').length;
                          const entry = deptQueues.get(dept) || { serving: 0, waiting: 0, doctors: [] };
                          entry.serving += confirmed;
                          entry.waiting += pending;
                          entry.doctors.push(getDoctorLabel(doc));
                          deptQueues.set(dept, entry);
                        });
                        const queues = Array.from(deptQueues.entries());
                        if (queues.length === 0) return <div className="px-4 py-6 text-center text-xs text-gray-400">No active queues today</div>;
                        return queues.map(([dept, q]) => (
                          <div key={dept} className="flex items-center justify-between px-3 py-2 md:px-4 md:py-3 hover:bg-gray-50">
                            <div className="flex items-center gap-2.5">
                              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                              <div>
                                <p className="text-xs font-bold text-gray-900">{dept}</p>
                                <p className="text-[10px] text-gray-400">{q.doctors.slice(0,2).join(', ')}{q.doctors.length > 2 ? ` +${q.doctors.length-2}` : ''}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-center">
                                <div className="text-sm font-black text-emerald-600">{q.serving}</div>
                                <div className="text-[9px] text-gray-400">serving</div>
                              </div>
                              <div className="text-center">
                                <div className="text-sm font-black text-amber-600">{q.waiting}</div>
                                <div className="text-[9px] text-gray-400">waiting</div>
                              </div>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                  {/* Healtara Contribution */}
                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-indigo-100 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-indigo-900">💙 Healtara Contribution</h3>
                      <span className="text-[10px] text-indigo-400">Platform impact</span>
                    </div>
                    <div className="p-4 grid grid-cols-3 gap-3">
                      {[
                        { label: 'Today', value: hospitalBI?.healtaraToday ?? '—', sub: 'new patients', icon: '📅', color: 'text-indigo-700' },
                        { label: 'This Month', value: hospitalBI?.healtaraMonth ?? '—', sub: 'via platform', icon: '📆', color: 'text-blue-700' },
                        { label: 'Revenue', value: hospitalBI?.healtaraRevenue ? `₹${hospitalBI.healtaraRevenue >= 1000 ? `${(hospitalBI.healtaraRevenue/1000).toFixed(1)}k` : hospitalBI.healtaraRevenue}` : '₹—', sub: 'generated (month)', icon: '💰', color: 'text-emerald-700' },
                      ].map(s => (
                        <div key={s.label} className="bg-white rounded-xl p-3 text-center shadow-sm">
                          <div className="text-lg md:text-2xl mb-1">{s.icon}</div>
                          <div className={`text-base md:text-xl font-black ${s.color}`}>{s.value}</div>
                          <div className="text-[10px] font-bold text-gray-700">{s.label}</div>
                          <div className="text-[9px] text-gray-400">{s.sub}</div>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 pb-4">
                      <div className="bg-indigo-100 rounded-lg p-2.5 text-center">
                        <p className="text-[11px] text-indigo-800 font-medium">Every patient above booked through Healtara</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── ROW 3: Department Performance ── */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <h3 className="text-sm font-bold text-gray-900">🏥 Department Performance</h3>
                    <button onClick={() => setActiveTab('appointments')} className="text-[10px] text-blue-500 hover:text-blue-700 font-semibold">View all →</button>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {(() => {
                      const fmtD = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
                      const todayStr = fmtD.format(getISTNow());
                      const deptMap = new Map<string, { doctors: number; todayAppts: number; pendingAppts: number; completedAppts: number; todayRevenue: number; doctorList: typeof hospitalDoctors }>();
                      hospitalDoctors.forEach(doc => {
                        const dept = (doc as any).departmentName?.trim() || 'General';
                        const appts = doctorAppointmentsMap[doc.id] || [];
                        const fee = (doc as any).doctorProfile?.consultationFee || hospitalBI?.doctors?.find((d: any) => d.id === doc.id)?.consultationFee || 0;
                        const entry = deptMap.get(dept) || { doctors: 0, todayAppts: 0, pendingAppts: 0, completedAppts: 0, todayRevenue: 0, doctorList: [] };
                        entry.doctors++;
                        entry.doctorList.push(doc);
                        const todayDoctorAppts = appts.filter(a => fmtD.format(getAppointmentISTDate(a)) === todayStr);
                        entry.todayAppts += todayDoctorAppts.filter(a => a.status !== 'CANCELLED').length;
                        entry.pendingAppts += todayDoctorAppts.filter(a => a.status === 'PENDING').length;
                        entry.completedAppts += todayDoctorAppts.filter(a => a.status === 'COMPLETED').length;
                        entry.todayRevenue += todayDoctorAppts.filter(a => a.status === 'COMPLETED').length * fee;
                        deptMap.set(dept, entry);
                      });
                      const depts = Array.from(deptMap.entries()).sort((a, b) => b[1].todayAppts - a[1].todayAppts);
                      if (depts.length === 0) return <div className="px-4 py-6 text-center text-xs text-gray-400">No departments yet. <a href="/hospital-admin/profile" className="text-blue-500 hover:underline">Add doctors →</a></div>;
                      return depts.map(([name, data]) => (
                        <div key={name} className="px-3 py-2 md:px-4 md:py-3 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-sm font-black text-indigo-700">{name.charAt(0)}</div>
                              <div>
                                <p className="text-xs font-bold text-gray-900">{name}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                  {data.doctorList.slice(0,3).map((d: any) => (
                                    <span key={d.id} className="bg-blue-50 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer hover:bg-blue-100"
                                      onClick={() => { setActiveTab('appointments'); setSelectedDoctorView(d.id); }}>
                                      {getDoctorLabel(d).replace('Dr. ','Dr.')}
                                    </span>
                                  ))}
                                  {data.doctorList.length > 3 && <span className="text-[9px] text-gray-400">+{data.doctorList.length-3}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-center">
                              <div><div className="text-sm font-black text-blue-600">{data.todayAppts}</div><div className="text-[9px] text-gray-400">today</div></div>
                              <div><div className="text-sm font-black text-amber-600">{data.pendingAppts}</div><div className="text-[9px] text-gray-400">pending</div></div>
                              <div><div className="text-sm font-black text-emerald-600">{data.todayRevenue > 0 ? `₹${data.todayRevenue >= 1000 ? `${(data.todayRevenue/1000).toFixed(1)}k` : data.todayRevenue}` : '₹0'}</div><div className="text-[9px] text-gray-400">revenue</div></div>
                            </div>
                          </div>
                          {/* Utilization bar */}
                          {data.todayAppts > 0 && (
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-gradient-to-r from-blue-400 to-indigo-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.round((data.completedAppts / Math.max(data.todayAppts,1)) * 100))}%` }} />
                              </div>
                              <span className="text-[9px] text-gray-400">{Math.round((data.completedAppts/Math.max(data.todayAppts,1))*100)}% done</span>
                            </div>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* ── ROW 4: Doctor Utilization ── */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <h3 className="text-sm font-bold text-gray-900">👨‍⚕️ Doctor Utilization</h3>
                    <span className="text-[10px] text-gray-400">Click a doctor to see full stats</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {hospitalDoctors.length === 0 ? (
                      <div className="px-4 py-6 text-center text-xs text-gray-400">No doctors linked. <a href="/hospital-admin/profile" className="text-blue-500 hover:underline">Add doctors →</a></div>
                    ) : hospitalDoctors.map(doc => {
                      const fmtD = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
                      const todayStr = fmtD.format(getISTNow());
                      const appts = doctorAppointmentsMap[doc.id] || [];
                      const todayAppts = appts.filter(a => fmtD.format(getAppointmentISTDate(a)) === todayStr);
                      const todayBooked = todayAppts.filter(a => a.status !== 'CANCELLED').length;
                      const todayCompleted = todayAppts.filter(a => a.status === 'COMPLETED').length;
                      const totalBooked = appts.filter(a => a.status !== 'CANCELLED').length;
                      const totalCompleted = appts.filter(a => a.status === 'COMPLETED').length;
                      const utilPct = totalBooked > 0 ? Math.round((totalCompleted/totalBooked)*100) : 0;
                      const fee = (doc as any).doctorProfile?.consultationFee || 0;
                      const todayRev = todayCompleted * fee;
                      const biDoc = hospitalBI?.doctors?.find((d: any) => d.id === doc.id);
                      return (
                        <div key={doc.id} className="flex items-center gap-3 px-3 py-2 md:px-4 md:py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => { setActiveTab('appointments'); setSelectedDoctorView(doc.id); }}>
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-black flex-shrink-0">
                            {getDoctorLabel(doc).charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-xs font-bold text-gray-900 truncate">{getDoctorLabel(doc)}</p>
                              <span className="text-[9px] text-gray-400 flex-shrink-0">{(doc as any).departmentName || 'General'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${utilPct >= 80 ? 'bg-red-400' : utilPct >= 60 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                                  style={{ width: `${utilPct}%` }} />
                              </div>
                              <span className="text-[9px] font-bold text-gray-500 flex-shrink-0">{utilPct}%</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-center flex-shrink-0">
                            <div><div className="text-xs font-black text-blue-600">{todayBooked}</div><div className="text-[9px] text-gray-400">today</div></div>
                            <div><div className="text-xs font-black text-emerald-600">{todayRev > 0 ? `₹${todayRev >= 1000 ? `${(todayRev/1000).toFixed(1)}k` : todayRev}` : '₹0'}</div><div className="text-[9px] text-gray-400">rev today</div></div>
                            {todayAppts.filter(a => a.status === 'PENDING').length > 0 && (
                              <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">{todayAppts.filter(a => a.status === 'PENDING').length} pending</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── ROW 5: No-Show Tracking + Upcoming ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {/* No-Show Tracking */}
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                      <h3 className="text-sm font-bold text-gray-900">📊 Attendance & No-Shows</h3>
                    </div>
                    <div className="p-4 space-y-3">
                      {[
                        { label: 'Total Booked', value: hospitalBI?.bookedTotal ?? (stats?.totalAppointments ?? 0), color: 'bg-blue-100 text-blue-700' },
                        { label: 'Attended', value: hospitalBI?.attendedTotal ?? (stats?.completedAppointments ?? 0), color: 'bg-emerald-100 text-emerald-700' },
                        { label: 'No-Shows', value: hospitalBI?.noShowAppts ?? 0, color: 'bg-red-100 text-red-700' },
                        { label: 'Lost Revenue', value: `₹${hospitalBI?.noShowLost ?? 0}`, color: 'bg-orange-100 text-orange-700' },
                      ].map(s => (
                        <div key={s.label} className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">{s.label}</span>
                          <span className={`text-xs font-black px-2.5 py-1 rounded-full ${s.color}`}>{s.value}</span>
                        </div>
                      ))}
                      {hospitalBI && hospitalBI.bookedTotal > 0 && (
                        <div className="mt-1 pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${Math.round((hospitalBI.attendedTotal/hospitalBI.bookedTotal)*100)}%` }} />
                            </div>
                            <span className="text-[10px] text-gray-500 font-bold">{Math.round((hospitalBI.attendedTotal/hospitalBI.bookedTotal)*100)}% attendance</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Upcoming Appointments */}
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                      <h3 className="text-sm font-bold text-gray-900">🔜 Upcoming (Next 24h)</h3>
                      <button onClick={() => setActiveTab('appointments')} className="text-[10px] text-blue-500 hover:text-blue-700 font-semibold">All →</button>
                    </div>
                    <div className="divide-y divide-gray-50 max-h-52 overflow-y-auto">
                      {(() => {
                        const fmtD = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
                        const now = getISTNow();
                        const next24 = new Date(now.getTime() + 86400000);
                        const upcoming = Object.values(doctorAppointmentsMap).flat()
                          .filter(a => a.status !== 'CANCELLED' && getAppointmentISTDate(a) >= now && getAppointmentISTDate(a) <= next24)
                          .sort((a,b) => getAppointmentISTDate(a).getTime() - getAppointmentISTDate(b).getTime())
                          .slice(0,8);
                        if (upcoming.length === 0) return <div className="px-4 py-4 text-center text-xs text-gray-400">No upcoming appointments in next 24h</div>;
                        return upcoming.map(a => (
                          <div key={a.id} className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50">
                            <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-sm flex-shrink-0">👤</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-semibold text-gray-900 truncate">{getPatientLabel(a.patient as any, a.patientId)}</p>
                              <p className="text-[9px] text-gray-400">{formatISTTime(getAppointmentISTDate(a))} · {formatIST(getAppointmentISTDate(a), { month: 'short', day: 'numeric' })}</p>
                            </div>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${a.status==='CONFIRMED'?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>{a.status}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>

                {/* ── ROW 6: AI Recommendations ── */}
                {(() => {
                  const fmtD = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
                  const todayStr = fmtD.format(getISTNow());
                  const allAppts = Object.values(doctorAppointmentsMap).flat();
                  const todayAppts = allAppts.filter(a => fmtD.format(getAppointmentISTDate(a)) === todayStr);
                  const insights: Array<{ icon: string; msg: string; type: 'warning' | 'info' | 'success' }> = [];

                  // Overloaded doctors
                  hospitalDoctors.forEach(doc => {
                    const todayDocAppts = (doctorAppointmentsMap[doc.id] || []).filter(a => fmtD.format(getAppointmentISTDate(a)) === todayStr && a.status !== 'CANCELLED');
                    if (todayDocAppts.length >= 15) insights.push({ icon: '🔥', msg: `${getDoctorLabel(doc)} is overloaded with ${todayDocAppts.length} appointments today`, type: 'warning' });
                  });

                  // High no-show rate
                  if (hospitalBI?.noShowRate > 15) insights.push({ icon: '⚠️', msg: `No-show rate is ${hospitalBI.noShowRate}% — consider sending appointment reminders`, type: 'warning' });

                  // Revenue opportunity
                  if (hospitalBI?.avgConsultFee > 0 && hospitalBI?.todayPatients < 5) insights.push({ icon: '💡', msg: `Low footfall today (${hospitalBI.todayPatients} patients) — consider running a promotion`, type: 'info' });

                  // Pending action needed
                  const pendingOld = allAppts.filter(a => a.status === 'PENDING' && getAppointmentISTDate(a).getTime() < getISTNow().getTime());
                  if (pendingOld.length > 0) insights.push({ icon: '📋', msg: `${pendingOld.length} past appointment${pendingOld.length > 1 ? 's' : ''} still PENDING — confirm or cancel them`, type: 'warning' });

                  // Good day
                  if (hospitalBI && hospitalBI.todayRevenue > 0 && hospitalBI.noShowRate < 10) insights.push({ icon: '✅', msg: `Excellent day! Revenue ₹${hospitalBI.todayRevenue} with less than 10% no-show rate`, type: 'success' });

                  // No doctors
                  if (hospitalDoctors.length === 0) insights.push({ icon: '👨‍⚕️', msg: 'No doctors linked yet — add doctors to start receiving bookings', type: 'warning' });

                  if (insights.length === 0) return null;
                  return (
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                        <h3 className="text-sm font-bold text-gray-900">🤖 AI Recommendations</h3>
                      </div>
                      <div className="p-3 space-y-2">
                        {insights.map((ins, i) => (
                          <div key={i} className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium ${ins.type==='warning'?'bg-amber-50 text-amber-800 border border-amber-200':ins.type==='success'?'bg-emerald-50 text-emerald-800 border border-emerald-200':'bg-blue-50 text-blue-800 border border-blue-200'}`}>
                            <span className="flex-shrink-0 text-base">{ins.icon}</span>
                            <span>{ins.msg}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* ── ROW 7: Quick Actions ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                  {[
                    { icon: '📅', label: 'Appointments', desc: 'View & update bookings', action: () => setActiveTab('appointments') },
                    { icon: '👨‍⚕️', label: 'Add Doctor', desc: 'Link a new doctor', href: '/hospital-admin/profile' },
                    { icon: '🏥', label: 'Hospital Profile', desc: 'Edit info & departments', href: '/hospital-admin/profile' },
                    { icon: '🌐', label: 'View Microsite', desc: 'See public page', href: `/hospital-site/${(hospitalProfile as any)?.id}` },
                  ].map((q, i) => (
                    q.href ? (
                      <a key={i} href={q.href} className="bg-white border border-gray-200 rounded-xl p-3.5 hover:border-blue-300 hover:shadow-md transition-all flex items-start gap-2.5 group">
                        <span className="text-xl flex-shrink-0">{q.icon}</span>
                        <div><p className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{q.label}</p><p className="text-[10px] text-gray-400 mt-0.5">{q.desc}</p></div>
                      </a>
                    ) : (
                      <button key={i} onClick={q.action} className="bg-white border border-gray-200 rounded-xl p-3.5 hover:border-blue-300 hover:shadow-md transition-all flex items-start gap-2.5 group text-left">
                        <span className="text-xl flex-shrink-0">{q.icon}</span>
                        <div><p className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{q.label}</p><p className="text-[10px] text-gray-400 mt-0.5">{q.desc}</p></div>
                      </button>
                    )
                  ))}
                </div>
              </>
            )}


            {/* Non-hospital roles (PATIENT etc) keep original stats */}
            {user.role !== 'HOSPITAL_ADMIN' && stats && (
              <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6`}>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 overflow-hidden shadow-xl rounded-2xl transform hover:-translate-y-1 transition-all duration-300">
                  <div className="p-3 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-shrink-0 bg-white/20 p-2 sm:p-3 rounded-xl">
                        <CalendarIcon className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                      </div>
                      <div className="text-right">
                        <dt className="text-xs sm:text-sm font-medium text-blue-100 truncate">Total Appointments</dt>
                        <dd className="text-2xl sm:text-3xl font-black text-white mt-1">{stats.totalAppointments}</dd>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/10 px-3 sm:px-6 py-1 sm:py-2">
                    <div className="text-xs text-blue-100">All time bookings</div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-yellow-500 to-orange-500 overflow-hidden shadow-xl rounded-2xl transform hover:-translate-y-1 transition-all duration-300">
                  <div className="p-3 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-shrink-0 bg-white/20 p-3 rounded-xl">
                        <ClockIcon className="h-8 w-8 text-white" />
                      </div>
                      <div className="text-right">
                        <dt className="text-sm font-medium text-yellow-100 truncate">Pending</dt>
                        <dd className="text-3xl font-black text-white mt-1">{stats.pendingAppointments}</dd>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/10 px-6 py-2">
                    <div className="text-xs text-yellow-100">Awaiting confirmation</div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-emerald-600 overflow-hidden shadow-xl rounded-2xl transform hover:-translate-y-1 transition-all duration-300">
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-shrink-0 bg-white/20 p-3 rounded-xl">
                        <UserGroupIcon className="h-8 w-8 text-white" />
                      </div>
                      <div className="text-right">
                        <dt className="text-sm font-medium text-green-100 truncate">
                          {(user.role as string) === 'DOCTOR'
                            ? 'Total Patients'
                            : (user.role as string) === 'HOSPITAL_ADMIN'
                              ? 'Total Doctors'
                              : 'Doctors Visited'}
                        </dt>
                        <dd className="text-3xl font-black text-white mt-1">
                          {(user.role as string) === 'DOCTOR'
                            ? stats.totalPatients
                            : (user.role as string) === 'HOSPITAL_ADMIN'
                              ? hospitalDoctors.length
                              : (new Set(appointments.map((a: any) => a?.doctorId)).size)}
                        </dd>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/10 px-6 py-2">
                    <div className="text-xs text-green-100">
                      {(user.role as string) === 'DOCTOR' ? 'Unique patients' : (user.role as string) === 'HOSPITAL_ADMIN' ? 'Active doctors' : 'Unique doctors'}
                    </div>
                  </div>
                </div>

                {(user.role as string) === 'DOCTOR' && (
                  <div className="bg-gradient-to-br from-purple-500 to-pink-600 overflow-hidden shadow-xl rounded-2xl transform hover:-translate-y-1 transition-all duration-300">
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-shrink-0 bg-white/20 p-3 rounded-xl">
                          <CurrencyDollarIcon className="h-8 w-8 text-white" />
                        </div>
                        <div className="text-right">
                          <dt className="text-sm font-medium text-purple-100 truncate">Monthly Revenue</dt>
                          <dd className="text-3xl font-black text-white mt-1">₹{stats.monthlyRevenue}</dd>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white/10 px-6 py-2">
                      <div className="text-xs text-purple-100">This month's earnings</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {(user.role as string) === 'PATIENT' && (() => {
              const fmtDateIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
              const todayStr = fmtDateIST.format(getISTNow());
              const todays = appointments.filter(a => fmtDateIST.format(getAppointmentISTDate(a)) === todayStr);
              return (
                <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
                  <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-4">
                    <h3 className="text-base md:text-xl font-bold text-white flex items-center">
                      <span className="mr-2">🎫</span>
                      Today’s Bookings
                    </h3>
                  </div>
                  <div className="p-6 space-y-3">
                    {todays.length === 0 ? (
                      <div className="border rounded-lg px-4 py-3 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">No bookings today</div>
                          {(() => {
                            const upcomingSorted = appointments.slice().sort((a, b) => getAppointmentISTDate(a).getTime() - getAppointmentISTDate(b).getTime());
                            const nextA = upcomingSorted.find(a => getAppointmentISTDate(a).getTime() >= getISTNow().getTime());
                            if (!nextA) return <div className="text-xs text-gray-500">You have no upcoming bookings.</div>;
                            const docLabel = getDoctorLabel(nextA.doctor as any) || `Doctor #${nextA.doctorId}`;
                            return (
                              <div className="text-xs text-gray-600">
                                Next: Booking #{nextA.id} • {docLabel} • {formatIST(getAppointmentISTDate(nextA), { dateStyle: 'medium', timeStyle: 'short', hour12: false })}
                              </div>
                            );
                          })()}
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Tokens appear on the day after confirmation</div>
                        </div>
                      </div>
                    ) : todays.map(a => {
                      const info = patientTokenByAppt[a.id];
                      const cur = info?.currentToken || 0;
                      const mine = info?.myToken || 0;
                      const total = info?.total || 0;
                      const percent = total > 0 ? Math.max(0, Math.min(100, Math.round((cur / total) * 100))) : 0;
                      const docLabel = getDoctorLabel(a.doctor as any) || `Doctor #${a.doctorId}`;
                      return (
                        <div key={a.id} className="flex items-center justify-between border rounded-lg px-4 py-3">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">Booking #{a.id}</div>
                            <div className="text-sm text-gray-700">{docLabel}</div>
                            <div className="text-xs text-gray-500">{formatIST(getAppointmentISTDate(a), { dateStyle: 'medium', timeStyle: 'short', hour12: false })}</div>
                          </div>
                          {a.status === 'CONFIRMED' ? (
                            <div className="text-right">
                              <div className="text-lg font-bold text-gray-900">Token {cur} / {total}</div>
                              {mine > 0 && <div className={`text-xs font-semibold ${cur >= mine ? 'text-green-600' : 'text-gray-600'}`}>Your token: {mine}</div>}
                              <div className="mt-2 w-40 h-2 bg-gray-200 rounded">
                                <div className="h-2 bg-emerald-600 rounded" style={{ width: `${percent}%` }} />
                              </div>
                            </div>
                          ) : (
                            <div className="text-right">
                              <div className="text-sm font-semibold text-yellow-700">Awaiting confirmation</div>
                              <div className="text-xs text-gray-500">Tokens appear after confirmation</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div className="text-xs text-gray-500">Live token updates start after confirmation and advance when the doctor moves the queue.</div>
                  </div>
                </div>
              );
            })()}

            {/* ============================================================================
                🏥 HOSPITAL-SPECIFIC ANALYTICS - Additional metrics for hospitals
                ============================================================================ */}
            {user.role === 'HOSPITAL_ADMIN' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
                <div className="bg-gradient-to-br from-cyan-500 to-blue-600 overflow-hidden shadow-xl rounded-2xl transform hover:-translate-y-1 transition-all duration-300">
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-shrink-0 bg-white/20 p-3 rounded-xl">
                        <ChartBarIcon className="h-8 w-8 text-white" />
                      </div>
                      <div className="text-right">
                        <dt className="text-sm font-medium text-cyan-100 truncate">Completed</dt>
                        <dd className="text-3xl font-black text-white mt-1">{stats?.completedAppointments || 0}</dd>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/10 px-6 py-2">
                    <div className="text-xs text-cyan-100">Successfully completed</div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-pink-500 to-rose-600 overflow-hidden shadow-xl rounded-2xl transform hover:-translate-y-1 transition-all duration-300">
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-shrink-0 bg-white/20 p-3 rounded-xl">
                        <UserGroupIcon className="h-8 w-8 text-white" />
                      </div>
                      <div className="text-right">
                        <dt className="text-sm font-medium text-pink-100 truncate">Total Patients</dt>
                        <dd className="text-3xl font-black text-white mt-1">{stats?.totalPatients ?? new Set(appointments.map((a: any) => a?.patientId)).size}</dd>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/10 px-6 py-2">
                    <div className="text-xs text-pink-100">Unique patients served</div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 overflow-hidden shadow-xl rounded-2xl transform hover:-translate-y-1 transition-all duration-300">
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-shrink-0 bg-white/20 p-3 rounded-xl">
                        <BuildingOffice2Icon className="h-8 w-8 text-white" />
                      </div>
                      <div className="text-right">
                        <dt className="text-sm font-medium text-indigo-100 truncate">Departments</dt>
                        <dd className="text-3xl font-black text-white mt-1">{new Set(hospitalDoctors.map((d: any) => d?.departmentName || 'General')).size}</dd>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/10 px-6 py-2">
                    <div className="text-xs text-indigo-100">Active departments</div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-teal-500 to-emerald-600 overflow-hidden shadow-xl rounded-2xl transform hover:-translate-y-1 transition-all duration-300">
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-shrink-0 bg-white/20 p-3 rounded-xl">
                        <ChartBarSquareIcon className="h-8 w-8 text-white" />
                      </div>
                      <div className="text-right">
                        <dt className="text-sm font-medium text-teal-100 truncate">Today's Bookings</dt>
                        <dd className="text-3xl font-black text-white mt-1">{stats?.todaysBookings ?? 0}</dd>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/10 px-6 py-2">
                    <div className="text-xs text-teal-100">Appointments today</div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================================
                🏥 HOSPITAL PROFILE SUMMARY - Hospital information
                ============================================================================ */}
            {user.role === 'HOSPITAL_ADMIN' && hospitalProfile && (
              <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100 mt-8">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
                  <h3 className="text-base md:text-xl font-bold text-white flex items-center">
                    <span className="mr-2">🏥</span>
                    Hospital Information
                  </h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3 md:space-y-4">
                      <h4 className="text-2xl font-bold text-gray-900 mb-4">{(hospitalProfile as any)?.profile?.general?.name || (hospitalProfile as any)?.name || 'Hospital Name'}</h4>
                      <div className="space-y-3">
                        <div className="flex items-start text-gray-700 bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                          <MapPinIcon className="h-5 w-5 mr-3 mt-0.5 text-indigo-600 flex-shrink-0" />
                          <span className="text-sm">{(hospitalProfile as any)?.profile?.general?.address || (hospitalProfile as any)?.address || 'Address not set'}</span>
                        </div>
                        <div className="flex items-center text-gray-700 bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                          <PhoneIcon className="h-5 w-5 mr-3 text-green-600 flex-shrink-0" />
                          <span className="text-sm font-medium">{(hospitalProfile as any)?.profile?.general?.phone || (hospitalProfile as any)?.phone || 'Phone not set'}</span>
                        </div>
                        <div className="flex items-center text-gray-700 bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                          <EnvelopeIcon className="h-5 w-5 mr-3 text-blue-600 flex-shrink-0" />
                          <span className="text-sm">{user.email}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3 md:space-y-4">
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200 shadow-sm">
                        <h5 className="font-bold text-indigo-900 mb-3 flex items-center">
                          <span className="bg-indigo-200 p-2 rounded-lg mr-2">👨‍⚕️</span>
                          Active Doctors
                        </h5>
                        <p className="text-4xl font-black text-indigo-800">{hospitalDoctors.length}</p>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200 shadow-sm">
                        <h5 className="font-bold text-green-900 mb-3 flex items-center">
                          <span className="bg-green-200 p-2 rounded-lg mr-2">📊</span>
                          Status
                        </h5>
                        <p className="text-lg font-semibold text-green-800">
                          {(hospitalProfile as any)?.profile?.serviceStatus === 'APPROVED' ? '✅ Approved' : '⏳ Pending Approval'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================================
                🏥 PROFILE SUMMARY - Doctor profile information
                ============================================================================ */}
            {doctorProfile && (
              <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
                  <h3 className="text-base md:text-xl font-bold text-white flex items-center">
                    <span className="mr-2">🏥</span>
                    Practice Information
                  </h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3 md:space-y-4">
                      <h4 className="text-2xl font-bold text-gray-900 mb-4">{doctorProfile.clinicName}</h4>
                      <div className="space-y-3">
                        <div className="flex items-start text-gray-700 bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                          <MapPinIcon className="h-5 w-5 mr-3 mt-0.5 text-indigo-600 flex-shrink-0" />
                          <span className="text-sm">{doctorProfile.clinicAddress}, {doctorProfile.city}, {doctorProfile.state}</span>
                        </div>
                        <div className="flex items-center text-gray-700 bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                          <PhoneIcon className="h-5 w-5 mr-3 text-green-600 flex-shrink-0" />
                          <span className="text-sm font-medium">{doctorProfile.phone}</span>
                        </div>
                        <div className="flex items-center text-gray-700 bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                          <EnvelopeIcon className="h-5 w-5 mr-3 text-blue-600 flex-shrink-0" />
                          <span className="text-sm">{(user.role as string) === 'HOSPITAL_ADMIN' ? ((hospitalProfile as any)?.general?.name || (user.email?.split('@')[0])) : ((user.role as string) === 'DOCTOR' ? (doctorProfile?.slug || (user.email?.split('@')[0])) : (user.email?.split('@')[0]))}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3 md:space-y-4">
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200 shadow-sm">
                        <h5 className="font-bold text-indigo-900 mb-3 flex items-center">
                          <span className="bg-indigo-200 p-2 rounded-lg mr-2">🩺</span>
                          Specialization
                        </h5>
                        <p className="text-lg font-semibold text-indigo-800">{doctorProfile.specialization}</p>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200 shadow-sm">
                        <h5 className="font-bold text-green-900 mb-3 flex items-center">
                          <span className="bg-green-200 p-2 rounded-lg mr-2">💰</span>
                          Consultation Fee
                        </h5>
                        <p className="text-3xl font-black text-green-800">₹{doctorProfile.consultationFee}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================================
                📅 RECENT APPOINTMENTS - Latest appointment activity
                ============================================================================ */}
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Appointments</h3>
              </div>
              <div className="p-6">
                {(() => { const recents = (user.role as string) === 'HOSPITAL_ADMIN' ? recentHospitalAppointments : appointments.slice(0, 5); return recents.length > 0 ? (
                  <div className="space-y-3 md:space-y-4">
                    {recents.map((appointment) => (
                      <div key={appointment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">
                            {formatIST(getAppointmentISTDate(appointment), { dateStyle: 'medium' })} at {formatISTTime(getAppointmentISTDate(appointment))}
                          </p>
                                                       <p className="text-gray-600">
                            {(user.role as string) === 'DOCTOR' ? `Patient: ${(((appointment.patient as any)?.name) || 'Patient')}` : `Doctor: ${(((appointment.doctor as any)?.doctorProfile?.slug) || 'Doctor')}`}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          appointment.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                          appointment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          appointment.status === 'EMERGENCY' ? 'bg-orange-100 text-orange-800' :
                          appointment.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {appointment.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (<p className="text-gray-500 text-center py-8">No appointments found</p>); })()}
              </div>
            </div>
          </div>
        )}

        {/* ==========================================================================
            🕒 SLOTS TAB - Manage availability slots (DOCTORS ONLY)
            ==========================================================================
        */}
        {activeTab === 'slots' && isDoctorLike && (
          user.role === 'DOCTOR' ? (
            <SlotSettingsTab 
              doctorProfile={doctorProfile} 
              onPeriodUpdated={(minutes) => {
                setDoctorProfile(prev => prev ? { ...prev, slotPeriodMinutes: minutes } : null);
              }}
              onWorkingHoursUpdated={(hours) => setDoctorWorkingHours(hours)}
            />
          ) : (
            <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-5">
                <h3 className="text-base md:text-xl font-bold text-white flex items-center">
                  <span className="mr-2">📋</span>
                  Hospital Doctor Slots
                </h3>
              </div>
              <div className="p-12 text-center">
                <div className="text-6xl mb-6">⚙️</div>
                <h3 className="text-lg md:text-2xl font-black text-gray-900 mb-2">Manage per Doctor</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Hospital admins can manage individual doctor slot periods from the settings tab or by clicking on a doctor in the Appointments view.
                </p>
              </div>
            </div>
          )
        )}

        {/* ============================================================================
            📅 APPOINTMENTS TAB - Appointment management interface
            ============================================================================ */}
        {activeTab === 'appointments' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Tab header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {user.role === 'DOCTOR' ? 'Appointments' : user.role === 'HOSPITAL_ADMIN' ? 'Hospital Bookings' : 'My Appointments'}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-gray-400">View and manage your appointments</p>
                  {apptLastRefreshed && (
                    <span className="text-[10px] text-gray-300">
                      · updated {apptLastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  )}
                  {apptRefreshing && (
                    <span className="flex items-center gap-1 text-[10px] text-blue-400">
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      refreshing…
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Manual refresh button */}
                <button
                  onClick={async () => {
                    try {
                      setApptRefreshing(true);
                      const [appts, mySlots] = await Promise.all([
                        apiClient.getMyAppointments().catch(() => null),
                        user.role === 'DOCTOR' ? apiClient.getSlots({ doctorId: user.id }).catch(() => null) : Promise.resolve(null),
                      ]);
                      if (appts) { setAppointments(appts); if (user.role === 'DOCTOR') setDoctorAppointmentsMap(prev => ({ ...prev, [user.id]: appts })); }
                      if (mySlots) setSlots(Array.isArray(mySlots) ? mySlots : []);
                      setApptLastRefreshed(new Date());
                    } catch {} finally { setApptRefreshing(false); }
                  }}
                  disabled={apptRefreshing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg transition-all disabled:opacity-50"
                  title="Refresh appointments"
                >
                  <svg className={`w-3.5 h-3.5 ${apptRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {apptRefreshing ? 'Refreshing…' : 'Refresh'}
                </button>
                {user.role === 'DOCTOR' && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg">
                  <span className="text-xs text-blue-600 font-medium">Token</span>
                  <span className="text-sm font-bold text-blue-700">{doctorTokenToday.currentToken} / {doctorTokenToday.total}</span>
                  {doctorTokenToday.currentToken === 0 && (
                    <button className="ml-1 px-3 py-0.5 text-xs font-bold bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all"
                      onClick={async () => {
                        try {
                          const r = await apiClient.startDoctorToken(user.id);
                          setDoctorTokenToday({ currentToken: Number(r.currentToken || 0), total: Array.isArray(r.tokens) ? r.tokens.length : doctorTokenToday.total });
                        } catch {}
                      }}>Start</button>
                  )}
                  <button className="px-2 py-0.5 text-xs font-semibold bg-white border border-blue-200 text-blue-600 rounded-md hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    onClick={async () => {
                      try {
                        const r = await apiClient.advanceDoctorToken(user.id);
                        setDoctorTokenToday(prev => ({ ...prev, currentToken: Number(r.currentToken || prev.currentToken) }));
                      } catch {}
                    }}
                    disabled={doctorTokenToday.currentToken === 0 || doctorTokenToday.currentToken >= doctorTokenToday.total}>
                    Next →
                  </button>
                </div>
                )}
              </div>
            </div>
            <div id="walk-in-reservation-section" className="p-4 bg-gray-50/50">
              {user.role === 'DOCTOR' && (
                <div className="bg-white border rounded-2xl shadow-sm mb-6">
                  <div className="px-3 py-2 md:px-4 md:py-3 border-b bg-blue-50 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-blue-900">Walk-in Reservation</h4>
                    <div className="text-xs text-blue-700">Today</div>
                  </div>
                  <WalkInReserveBox userId={user.id} />
                </div>
              )}
              {user.role === 'HOSPITAL_ADMIN' ? (
                <div className="space-y-3 md:space-y-4">
                  {/* ── HOSPITAL STATS ROW ── */}
                  {(() => {
                    const fmtD = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
                    const todayStr = fmtD.format(getISTNow());
                    const allAppts = Object.values(doctorAppointmentsMap).flat();
                    const todayAppts = allAppts.filter(a => fmtD.format(getAppointmentISTDate(a)) === todayStr);
                    const pending = allAppts.filter(a => a.status === 'PENDING').length;
                    const confirmed = allAppts.filter(a => a.status === 'CONFIRMED').length;
                    const completed = allAppts.filter(a => a.status === 'COMPLETED').length;
                    const depts = Array.from(new Set(hospitalDoctors.map(d => (d as any).departmentName?.trim() || 'General'))).filter(Boolean);
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        {[
                          { label: "Today's Bookings", value: todayAppts.length, icon: '📅', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
                          { label: 'Pending', value: pending, icon: '⏳', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
                          { label: 'Confirmed', value: confirmed, icon: '✅', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                          { label: 'Completed', value: completed, icon: '🏁', color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
                          { label: 'Departments', value: depts.length, icon: '🏥', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
                        ].map(s => (
                          <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-3 flex items-center gap-2`}>
                            <span className="text-lg">{s.icon}</span>
                            <div>
                              <div className={`text-base md:text-xl font-black ${s.color}`}>{s.value}</div>
                              <div className="text-[10px] text-gray-500 font-medium leading-tight">{s.label}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* ── VIEW CONTROLS ── */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                      {(['departments', 'list'] as const).map(v => (
                        <button key={v} onClick={() => { setHospitalView(v); setSelectedDoctorView(null); }}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${hospitalView === v && selectedDoctorView === null ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                          {v === 'departments' ? '🏥 Departments' : '📋 All Doctors'}
                        </button>
                      ))}
                      {selectedDoctorView !== null && (
                        <button className="px-3 py-1.5 rounded-md text-xs font-semibold bg-white text-blue-600 shadow-sm">
                          👨‍⚕️ Doctor Detail
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="text" value={hospitalDoctorSearch} onChange={e => setHospitalDoctorSearch(e.target.value)}
                        placeholder="Search doctors…"
                        className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 w-40" />
                      <input type="date" value={selectedHospitalDate} onChange={e => setSelectedHospitalDate(e.target.value)}
                        className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      {loadingHospitalBookings && <span className="text-[10px] text-blue-500 font-medium">Loading…</span>}
                    </div>
                  </div>

                  {hospitalDoctors.length === 0 && !loadingHospitalBookings && (
                    <div className="text-center py-12 text-gray-400">
                      <div className="text-4xl mb-3">🏥</div>
                      <p className="text-sm font-medium">No doctors linked to your hospital yet.</p>
                      <p className="text-xs mt-1">Add doctors from the Hospital Profile section.</p>
                    </div>
                  )}

                  {/* ── DOCTOR DETAIL VIEW ── */}
                  {selectedDoctorView !== null && (() => {
                    const doc = hospitalDoctors.find(d => d.id === selectedDoctorView);
                    if (!doc) return null;
                    const items = doctorAppointmentsMap[doc.id] || [];
                    const fmtD = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
                    const todayStr = fmtD.format(getISTNow());
                    const todayAppts = items.filter(a => {
                      const apptDate = a.date.slice(0, 10);
                      return apptDate === todayStr || fmtD.format(getAppointmentISTDate(a)) === todayStr;
                    });
                    const upcoming = items.filter(a => getAppointmentISTDate(a).getTime() >= getISTNow().getTime() || a.status === 'PENDING');
                    const onDate = items.filter(a => {
                      const apptDate = a.date.slice(0, 10);
                      return apptDate === selectedHospitalDate || fmtD.format(getAppointmentISTDate(a)) === selectedHospitalDate;
                    });
                    return (
                      <div className="space-y-3 md:space-y-4">
                        {/* Back + Doctor header */}
                        <div className="flex items-center gap-3">
                          <button onClick={() => setSelectedDoctorView(null)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold">
                            ← Back
                          </button>
                          <div className="flex-1 bg-white border border-gray-200 rounded-xl p-2.5 md:p-4 flex items-center gap-4 shadow-sm">
                            <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-xl flex-shrink-0">👨‍⚕️</div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-bold text-gray-900">{doc.doctorProfile?.clinicName || getDoctorLabel(doc)}</h3>
                              <p className="text-xs text-gray-500">{doc.doctorProfile?.specialization || 'General'} · {(doc as any).departmentName || 'Unassigned'}</p>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-center">
                              {[
                                { label: "Today", value: todayAppts.length, color: 'text-blue-600' },
                                { label: "Upcoming", value: upcoming.length, color: 'text-emerald-600' },
                                { label: "Total", value: items.length, color: 'text-gray-700' },
                              ].map(s => (
                                <div key={s.label}>
                                  <div className={`text-lg font-black ${s.color}`}>{s.value}</div>
                                  <div className="text-[10px] text-gray-400">{s.label}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Appointments on selected date */}
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                          <div className="px-3 py-2 md:px-4 md:py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <h4 className="text-sm font-bold text-gray-800">Appointments on {selectedHospitalDate}</h4>
                            <span className="text-xs text-gray-500">{onDate.length} booked</span>
                          </div>
                          {onDate.length === 0 ? (
                            <div className="px-4 py-6 text-center text-xs text-gray-400">No appointments on this date</div>
                          ) : (
                            <div className="divide-y divide-gray-50">
                              {onDate.sort((a, b) => getAppointmentISTDate(a).getTime() - getAppointmentISTDate(b).getTime()).map(appt => (
                                <div key={appt.id} className="px-3 py-2 md:px-4 md:py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-sm flex-shrink-0">👤</div>
                                    <div>
                                      <p className="text-xs font-semibold text-gray-900">{getPatientLabel(appt.patient as any, appt.patientId)}</p>
                                      <p className="text-[10px] text-gray-400">{formatISTTime(getAppointmentISTDate(appt))}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      appt.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700' :
                                      appt.status === 'PENDING' ? 'bg-amber-50 text-amber-700' :
                                      appt.status === 'CANCELLED' ? 'bg-red-50 text-red-600' :
                                      appt.status === 'COMPLETED' ? 'bg-blue-50 text-blue-600' :
                                      'bg-gray-100 text-gray-600'}`}>{appt.status}</span>
                                    <select className="border border-gray-200 rounded text-[10px] px-1.5 py-1 text-gray-700 bg-white focus:outline-none"
                                      value={appt.status}
                                      onChange={e => updateDoctorAppointmentStatus(doc.id, appt.id, e.target.value)}>
                                      <option value="PENDING">Pending</option>
                                      <option value="CONFIRMED">Confirmed</option>
                                      <option value="COMPLETED">Completed</option>
                                      <option value="CANCELLED">Cancelled</option>
                                    </select>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Upcoming appointments */}
                        {upcoming.length > 0 && (
                          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="px-3 py-2 md:px-4 md:py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                              <h4 className="text-sm font-bold text-gray-800">All Appointments ({items.length})</h4>
                              <span className="text-xs text-gray-500">Pending: {items.filter(a => a.status === 'PENDING').length}</span>
                            </div>
                            <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                              {items.sort((a, b) => getAppointmentISTDate(b).getTime() - getAppointmentISTDate(a).getTime()).slice(0, 30).map(appt => (
                                <div key={appt.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-gray-50">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-[10px]">👤</div>
                                    <div>
                                      <p className="text-xs font-semibold text-gray-900">{getPatientLabel(appt.patient as any, appt.patientId)}</p>
                                      <p className="text-[10px] text-gray-400">{appt.date.slice(0,10)} · {appt.time || formatISTTime(getAppointmentISTDate(appt))}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      appt.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700' :
                                      appt.status === 'PENDING' ? 'bg-amber-50 text-amber-700' :
                                      appt.status === 'COMPLETED' ? 'bg-blue-50 text-blue-600' :
                                      'bg-red-50 text-red-600'}`}>{appt.status}</span>
                                    <select className="border border-gray-200 rounded text-[10px] px-1.5 py-1 text-gray-700 bg-white focus:outline-none"
                                      value={appt.status}
                                      onChange={e => updateDoctorAppointmentStatus(doc.id, appt.id, e.target.value)}>
                                      <option value="PENDING">Pending</option>
                                      <option value="CONFIRMED">Confirmed</option>
                                      <option value="COMPLETED">Completed</option>
                                      <option value="CANCELLED">Cancelled</option>
                                    </select>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* ── DEPARTMENTS VIEW ── */}
                  {selectedDoctorView === null && hospitalView === 'departments' && hospitalDoctors.length > 0 && (() => {
                    const fmtD = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
                    const todayStr = fmtD.format(getISTNow());
                    // Group doctors by department
                    const groups = new Map<string, typeof hospitalDoctors>();
                    filteredHospitalDoctors.forEach(doc => {
                      const key = (doc as any).departmentName?.trim() || 'General / Unassigned';
                      const arr = groups.get(key) || [];
                      arr.push(doc);
                      groups.set(key, arr);
                    });
                    const deptList = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
                    return (
                      <div className="space-y-3 md:space-y-4">
                        {deptList.map(([deptName, docs]) => {
                          const deptAppts = docs.flatMap(d => doctorAppointmentsMap[d.id] || []);
                          const todayCount = deptAppts.filter(a => fmtD.format(getAppointmentISTDate(a)) === todayStr).length;
                          const pendingCount = deptAppts.filter(a => a.status === 'PENDING').length;
                          const isCollapsed = deptCollapsed[deptName];
                          return (
                            <div key={deptName} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                              {/* Department header */}
                              <div className="px-3 py-2 md:px-4 md:py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100 flex items-center justify-between cursor-pointer"
                                onClick={() => setDeptCollapsed(prev => ({ ...prev, [deptName]: !prev[deptName] }))}>
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                    {deptName.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <h3 className="text-sm font-bold text-gray-900">{deptName}</h3>
                                    <p className="text-[10px] text-gray-500">{docs.length} doctor{docs.length !== 1 ? 's' : ''}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex gap-2 text-center">
                                    <div className="bg-white rounded-lg px-2 py-1 border border-gray-100">
                                      <div className="text-sm font-black text-blue-600">{todayCount}</div>
                                      <div className="text-[9px] text-gray-400">Today</div>
                                    </div>
                                    {pendingCount > 0 && (
                                      <div className="bg-amber-50 rounded-lg px-2 py-1 border border-amber-100">
                                        <div className="text-sm font-black text-amber-600">{pendingCount}</div>
                                        <div className="text-[9px] text-gray-400">Pending</div>
                                      </div>
                                    )}
                                  </div>
                                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
                                </div>
                              </div>

                              {/* Doctor columns inside department */}
                              {!isCollapsed && (
                                <div className="p-3">
                                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                    {docs.map(doc => {
                                      const items = doctorAppointmentsMap[doc.id] || [];
                                      const docToday = items.filter(a => fmtD.format(getAppointmentISTDate(a)) === todayStr);
                                      const docOnDate = items.filter(a => fmtD.format(getAppointmentISTDate(a)) === selectedHospitalDate);
                                      const docPending = items.filter(a => a.status === 'PENDING').length;
                                      const docUpcoming = items.filter(a => getAppointmentISTDate(a).getTime() >= getISTNow().getTime()).length;
                                      return (
                                        <div key={doc.id} className="border border-gray-100 rounded-xl overflow-hidden hover:border-blue-200 hover:shadow-md transition-all">
                                          {/* Doctor card header */}
                                          <div className="px-3 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                                            <div className="flex items-center gap-2 min-w-0">
                                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                                {(doc.doctorProfile?.clinicName || getDoctorLabel(doc)).charAt(0).toUpperCase()}
                                              </div>
                                              <div className="min-w-0">
                                                <p className="text-xs font-bold text-gray-900 truncate">{doc.doctorProfile?.clinicName || getDoctorLabel(doc)}</p>
                                                <p className="text-[10px] text-gray-400 truncate">{doc.doctorProfile?.specialization || 'General'}</p>
                                              </div>
                                            </div>
                                            <button onClick={() => { setSelectedDoctorView(doc.id); setHospitalView('doctor'); }}
                                              className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold flex-shrink-0 ml-1">
                                              View →
                                            </button>
                                          </div>

                                          {/* Mini stats */}
                                          <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
                                            {[
                                              { label: 'Today', value: docToday.length, color: 'text-blue-600' },
                                              { label: 'Upcoming', value: docUpcoming, color: 'text-emerald-600' },
                                              { label: 'Pending', value: docPending, color: docPending > 0 ? 'text-amber-600' : 'text-gray-400' },
                                            ].map(s => (
                                              <div key={s.label} className="py-2 text-center">
                                                <div className={`text-sm font-black ${s.color}`}>{s.value}</div>
                                                <div className="text-[9px] text-gray-400">{s.label}</div>
                                              </div>
                                            ))}
                                          </div>

                                          {/* Appointments on selected date */}
                                          <div className="p-2 max-h-40 overflow-y-auto">
                                            {docOnDate.length === 0 ? (
                                              <p className="text-[10px] text-gray-400 text-center py-2">No appointments on {selectedHospitalDate}</p>
                                            ) : (
                                              <div className="space-y-1">
                                                {docOnDate.sort((a, b) => getAppointmentISTDate(a).getTime() - getAppointmentISTDate(b).getTime()).map(appt => (
                                                  <div key={appt.id} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                      <span className="text-[10px] font-bold text-gray-500 flex-shrink-0">{formatISTTime(getAppointmentISTDate(appt))}</span>
                                                      <span className="text-[10px] text-gray-700 truncate">{getPatientLabel(appt.patient as any, appt.patientId)}</span>
                                                    </div>
                                                    <select className="border border-gray-200 rounded text-[9px] px-1 py-0.5 text-gray-600 bg-white focus:outline-none flex-shrink-0 ml-1"
                                                      value={appt.status}
                                                      onChange={e => updateDoctorAppointmentStatus(doc.id, appt.id, e.target.value)}>
                                                      <option value="PENDING">Pending</option>
                                                      <option value="CONFIRMED">Confirmed</option>
                                                      <option value="COMPLETED">Completed</option>
                                                      <option value="CANCELLED">Cancelled</option>
                                                    </select>
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
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* ── ALL DOCTORS LIST VIEW ── */}
                  {selectedDoctorView === null && hospitalView === 'list' && hospitalDoctors.length > 0 && (() => {
                    const fmtD = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
                    const todayStr = fmtD.format(getISTNow());
                    return (
                      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="px-3 py-2 md:px-4 md:py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                          <h3 className="text-sm font-bold text-gray-800">All Doctors ({filteredHospitalDoctors.length})</h3>
                          <span className="text-xs text-gray-400">Date: {selectedHospitalDate}</span>
                        </div>
                        <div className="divide-y divide-gray-50">
                          {filteredHospitalDoctors.map(doc => {
                            const items = doctorAppointmentsMap[doc.id] || [];
                            const todayCount = items.filter(a => fmtD.format(getAppointmentISTDate(a)) === todayStr).length;
                            const onDate = items.filter(a => fmtD.format(getAppointmentISTDate(a)) === selectedHospitalDate).length;
                            const pending = items.filter(a => a.status === 'PENDING').length;
                            return (
                              <div key={doc.id} className="px-3 py-2 md:px-4 md:py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                    {(doc.doctorProfile?.clinicName || getDoctorLabel(doc)).charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{doc.doctorProfile?.clinicName || getDoctorLabel(doc)}</p>
                                    <p className="text-xs text-gray-400">{doc.doctorProfile?.specialization || 'General'} · {(doc as any).departmentName || 'Unassigned'}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 flex-shrink-0">
                                  <div className="hidden md:flex gap-3 text-center">
                                    {[
                                      { label: 'Today', value: todayCount, color: 'text-blue-600' },
                                      { label: selectedHospitalDate.slice(5), value: onDate, color: 'text-indigo-600' },
                                      { label: 'Pending', value: pending, color: pending > 0 ? 'text-amber-600' : 'text-gray-400' },
                                    ].map(s => (
                                      <div key={s.label} className="text-center">
                                        <div className={`text-sm font-black ${s.color}`}>{s.value}</div>
                                        <div className="text-[9px] text-gray-400">{s.label}</div>
                                      </div>
                                    ))}
                                  </div>
                                  <button onClick={() => { setSelectedDoctorView(doc.id); setHospitalView('doctor'); }}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-all">
                                    View
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : appointments.length > 0 ? (
                user.role === 'DOCTOR' ? (
                  <div className="space-y-3 md:space-y-4">
                    {/* ── STATS ROW ── */}
                    {(() => {
                      const fmtD = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
                      const todayStr = fmtD.format(getISTNow());
                      const todayAppts = appointments.filter(a => fmtD.format(getAppointmentISTDate(a)) === todayStr);
                      const completed = todayAppts.filter(a => a.status === 'COMPLETED').length;
                      const upcoming = appointments.filter(a => getAppointmentISTDate(a).getTime() >= getISTNow().getTime()).length;
                      const cancelled = todayAppts.filter(a => a.status === 'CANCELLED').length;
                      return (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                          {[
                            { label: "Today's", value: todayAppts.length, icon: '📅', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
                            { label: 'Completed', value: completed, icon: '✅', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                            { label: 'Upcoming', value: upcoming, icon: '🕐', color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
                            { label: 'Cancelled', value: cancelled, icon: '❌', color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' },
                          ].map((s) => (
                            <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-3 flex items-center gap-3`}>
                              <span className="text-xl">{s.icon}</span>
                              <div>
                                <div className={`text-lg md:text-2xl font-black ${s.color}`}>{s.value}</div>
                                <div className="text-[11px] text-gray-500 font-medium">{s.label}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                    {/* ── VIEW TOGGLE + FILTER ── */}
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                        {(['grouped', 'list'] as const).map((mode) => (
                          <button key={mode} onClick={() => setAppointmentViewMode(mode)}
                            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${appointmentViewMode === mode ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            {mode === 'grouped' ? 'Day View' : 'List View'}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Auto-refresh Countdown Timer */}
                        <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
                          <span className="text-gray-400">🔄</span>
                          <span>Refreshing in</span>
                          <span className={`font-bold ${apptCountdown <= 3 ? 'text-red-500' : 'text-blue-600'}`}>
                            {apptCountdown}s
                          </span>
                        </div>
                        <select value={doctorStatusFilter} onChange={(e) => setDoctorStatusFilter(e.target.value as any)}
                          className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="ALL">All Status</option>
                          <option value="CONFIRMED">Confirmed</option>
                          <option value="PENDING">Pending</option>
                          <option value="EMERGENCY">Emergency</option>
                          <option value="CANCELLED">Cancelled</option>
                          <option value="COMPLETED">Completed</option>
                        </select>
                      </div>
                    </div>
                    {appointmentViewMode === 'grouped' ? (
                      <>
                        <div className="flex gap-4 items-start">
                          {/* LEFT — Day view slots */}
                          <div className="flex-1 min-w-0">
                        {(() => {
                          const getCapacityForHour = (dateStr: string, hour: number) => {                            let period = Number(doctorProfile?.slotPeriodMinutes ?? 15);
                            if (doctorProfile?.slotPeriodUpdatedAt && (doctorProfile as any)?.previousSlotPeriodMinutes) {
                              const updateDate = new Date(doctorProfile.slotPeriodUpdatedAt);
                              const transitionTime = new Date(updateDate.getTime());
                              transitionTime.setMinutes(0, 0, 0);
                              transitionTime.setMilliseconds(0);
                              transitionTime.setHours(transitionTime.getHours() + 1);

                              // Construct targetTime in IST (UTC+5:30)
                              const targetTime = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:00:00+05:30`);
                              if (targetTime.getTime() < transitionTime.getTime()) {
                                period = Number((doctorProfile as any).previousSlotPeriodMinutes);
                              }
                            }
                            return {
                              period,
                              countPerHour: Math.max(1, Math.floor(60 / Math.max(1, period)))
                            };
                          };

                          const fmtDateIST2 = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
                          
                          const now = getISTNow();
                          const nowTime = now.getTime();

                          // Separate active and expired appointments
                          const activeAppointments = appointments.filter(a => getAppointmentISTDate(a).getTime() >= nowTime);
                          const expiredAppointments = appointments.filter(a => getAppointmentISTDate(a).getTime() < nowTime);

                          // Identify dates that have activity (active only)
                          const dateWithAppointments = new Set(activeAppointments.map((a) => fmtDateIST2.format(getAppointmentISTDate(a))));
                          const capacitySlots = slots.filter((slot) => dateWithAppointments.has(slot.date));
                          const list = capacitySlots.length > 0 ? capacitySlots : slots;

                          const todayStr = fmtDateIST2.format(now);
                          
                          // Determine which dates to show (exclude past dates from active view)
                          let displayDates: string[] = [];
                          if (list.length === 0) {
                            displayDates = Array.from(dateWithAppointments).filter((d) => d >= todayStr).sort((a, b) => a.localeCompare(b));
                            if (displayDates.length === 0) {
                              displayDates = Array.from({ length: 3 }, (_, i) => {
                                const d = new Date(now);
                                d.setDate(now.getDate() + i);
                                return fmtDateIST2.format(d);
                              });
                            }
                          } else {
                            displayDates = Array.from(new Set(list.map(s => s.date))).filter(d => d >= todayStr).sort((a, b) => a.localeCompare(b));
                          }

                          return (
                            <div className="space-y-3 md:space-y-4">
                              {displayDates.map((dateKey) => {
                                const dayDate = new Date(`${dateKey}T00:00:00`);
                                const isToday = dateKey === todayStr;
                                const isExpanded = isToday || expandedUpcomingDates[dateKey];
                                
                                // Get hours for this day from doctor's own working hours
                                const dayIdx = getISTDayIndex(dayDate);
                                const wh = doctorWorkingHours?.[dayIdx];
                                // If no working hours set for this day, skip (day off)
                                const isDayOff = !wh?.start || !wh?.end;
                                const startHour = wh?.start ? parseInt(wh.start.split(':')[0]) : 9;
                                const endHour = wh?.end ? parseInt(wh.end.split(':')[0]) : 17;
                                // Include the end hour slot so e.g. 09:00–17:00 shows 09–17
                                const hoursList = isDayOff ? [] : Array.from({ length: Math.max(1, endHour - startHour) }, (_, i) => startHour + i);

                                return (
                                  <div key={dateKey} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                    {/* Date header */}
                                    <div className={`flex items-center justify-between px-4 py-2.5 border-b border-gray-100 ${!isToday ? 'cursor-pointer' : ''} ${isToday ? 'bg-blue-50' : 'bg-gray-50 hover:bg-gray-100'}`}
                                      onClick={() => !isToday && toggleDateExpansion(dateKey)}>
                                      <div className="flex items-center gap-2">
                                        <span className={`text-sm font-bold ${isToday ? 'text-blue-700' : 'text-gray-700'}`}>
                                          {formatIST(dayDate, { dateStyle: 'full' })}
                                        </span>
                                        {isToday && <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">Today</span>}
                                      </div>
                                      {!isToday && <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />}
                                    </div>

                                    {isExpanded && (
                                      <div className="divide-y divide-gray-50">
                                        {isDayOff ? (
                                          <div className="px-4 py-4 flex items-center gap-2 text-gray-400">
                                            <span className="text-sm">🚫</span>
                                            <span className="text-xs font-medium">Day off — no working hours set for this day</span>
                                            <button onClick={() => setActiveTab('slots')} className="ml-auto text-[10px] text-blue-500 hover:text-blue-700 font-semibold underline">Set hours</button>
                                          </div>
                                        ) : hoursList.map((h) => {
                                          const hourStart = new Date(`${dateKey}T${String(h).padStart(2, '0')}:00:00`);
                                          const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
                                          const { period, countPerHour } = getCapacityForHour(dateKey, h);
                                          const hourAppointments = activeAppointments.filter((a) => {
                                            const t = getAppointmentISTDate(a).getTime();
                                            return t >= hourStart.getTime() && t < hourEnd.getTime() &&
                                              (doctorStatusFilter === 'ALL' || a.status === doctorStatusFilter);
                                          });
                                          const hourKey = `${dateKey}:${h}`;
                                          const isHourSelected = selectedHourKey === hourKey;
                                          return (
                                            <div key={`${dateKey}-${h}`} className={`flex hover:bg-gray-50/50 transition-colors min-h-[60px] ${isHourSelected ? 'bg-blue-50/30' : ''}`}>
                                              {/* Time column */}
                                              <div className="w-20 px-3 py-2 flex flex-col justify-start border-r border-gray-100 flex-shrink-0 cursor-pointer hover:bg-blue-50 transition-colors"
                                                onClick={() => setSelectedHourKey(hourKey)}>
                                                <div className={`text-xs font-bold ${isHourSelected ? 'text-blue-600' : 'text-gray-500'}`}>{formatISTTime(hourStart)}</div>
                                                {hourAppointments.length > 0 && <div className={`text-[10px] font-semibold mt-0.5 ${isHourSelected ? 'text-blue-600' : 'text-blue-500'}`}>{hourAppointments.length} booked</div>}
                                              </div>
                                              {/* Sub-slots */}
                                              <div className="flex-1 p-2">
                                                {hourAppointments.length === 0 ? (
                                                  <div className="h-full">
                                                    <button 
                                                      className="w-full h-full flex items-center justify-center bg-white border-2 border-dashed border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50/30 transition-all group py-4"
                                                      onClick={() => {
                                                        setSlotDate(dateKey);
                                                        setSlotTime(formatISTTime(hourStart));
                                                        // Scroll to Walk-in Reservation section
                                                        const walkinSection = document.getElementById('walk-in-reservation-section');
                                                        if (walkinSection) {
                                                          walkinSection.scrollIntoView({ behavior: 'smooth' });
                                                        }
                                                      }}
                                                    >
                                                      <div className="flex items-center gap-2">
                                                        <PlusIcon className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
                                                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest group-hover:text-blue-500">Add Booking</span>
                                                      </div>
                                                    </button>
                                                  </div>
                                                ) : (
                                                  <div className="grid grid-cols-2 gap-1.5">
                                                    {Array.from({ length: countPerHour }, (_, idx) => {
                                                      const segStart = new Date(hourStart.getTime() + idx * period * 60 * 1000);
                                                      const segEnd = new Date(segStart.getTime() + period * 60 * 1000);
                                                      const inSeg = hourAppointments.filter((a) => {
                                                        const t = getAppointmentISTDate(a).getTime();
                                                        return t >= segStart.getTime() && t < segEnd.getTime();
                                                      });
                                                      const isFull = inSeg.length >= 1;
                                                      if (!isFull) return null; // Only show occupied slots

                                                      return (
                                                        <div key={idx}
                                                          className={`relative rounded-lg border transition-all duration-200 min-h-[48px] flex flex-col ${isFull ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100 hover:border-blue-200'}`}
                                                          data-seg-start={segStart.toISOString()}
                                                          onDragEnter={(ev) => ev.preventDefault()}
                                                          onDragOver={(ev) => ev.preventDefault()}
                                                          onDrop={(ev) => {
                                                            ev.preventDefault(); ev.stopPropagation();
                                                            const data = ev.dataTransfer.getData('appointment-json');
                                                            if (!data) return;
                                                            try { const appt = JSON.parse(data); rescheduleDoctorAppointment(appt, segStart, user.id); } catch {}
                                                          }}>
                                                          <div className={`px-2 py-0.5 flex items-center justify-between border-b ${isFull ? 'bg-blue-100/60 border-blue-200' : 'bg-gray-50 border-gray-100'}`}>
                                                            <span className="text-[10px] font-bold text-gray-500">{formatISTTime(segStart)}</span>
                                                            {isFull && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                                                          </div>
                                                          <div className="p-1.5 flex-1">
                                                            <div className="space-y-1">
                                                              {inSeg.map((a) => (
                                                                <div key={a.id}
                                                                  className="bg-white rounded-md p-1.5 shadow-sm border border-blue-100 hover:shadow-md transition-all cursor-pointer group/item relative"
                                                                  draggable 
                                                                  onDragStart={(ev) => {
                                                                    if ((ev.target as HTMLElement).classList.contains('drag-handle') || (ev.target as HTMLElement).closest('.drag-handle')) {
                                                                      onDragStartAppointment(ev, a);
                                                                    } else {
                                                                      ev.preventDefault();
                                                                    }
                                                                  }}
                                                                  onClick={() => setSelectedAppointmentForPopup(a)}
                                                                >
                                                                  {/* Drag Handle Icon - Top Left */}
                                                                  <div className="absolute top-1 left-1 drag-handle cursor-grab active:cursor-grabbing p-0.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors z-10 opacity-0 group-hover/item:opacity-100">
                                                                    <GripVertical className="w-3 h-3" />
                                                                  </div>

                                                                  <div className="flex items-center gap-1 pl-4">
                                                                    <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center text-[8px] flex-shrink-0">👤</div>
                                                                    <div className="text-[10px] font-bold text-gray-800 truncate">{(a.patient as any)?.name || a.patient?.email?.split('@')[0] || 'Patient'}</div>
                                                                  </div>
                                                                  <div className="flex gap-1 mt-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                                    <button onClick={(e) => { e.stopPropagation(); updateDoctorAppointmentStatus(user.id, a.id, 'CONFIRMED'); }} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[8px] font-bold py-0.5 rounded transition-colors">✓</button>
                                                                    <button onClick={(e) => { e.stopPropagation(); updateDoctorAppointmentStatus(user.id, a.id, 'CANCELLED'); }} className="flex-1 bg-red-500 hover:bg-red-600 text-white text-[8px] font-bold py-0.5 rounded transition-colors">✕</button>
                                                                  </div>
                                                                </div>
                                                              ))}
                                                            </div>
                                                          </div>
                                                        </div>
                                                      );
                                                    })}
                                                    {/* If there are some bookings but also free slots, show one Add Booking button at the end */}
                                                    {hourAppointments.length < countPerHour && (
                                                      <button 
                                                        className="relative rounded-lg border-2 border-dashed border-gray-100 bg-gray-50/30 hover:bg-white hover:border-blue-200 transition-all flex items-center justify-center min-h-[48px] group"
                                                        onClick={() => {
                                                          setSlotDate(dateKey);
                                                          setSlotTime(formatISTTime(hourStart));
                                                          const walkinSection = document.getElementById('walk-in-reservation-section');
                                                          if (walkinSection) walkinSection.scrollIntoView({ behavior: 'smooth' });
                                                        }}
                                                      >
                                                        <PlusIcon className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                                                      </button>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              {expiredAppointments.length > 0 && (
                                <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                                  <button onClick={() => setShowExpiredSlots(!showExpiredSlots)}
                                    className="w-full px-3 py-2 md:px-4 md:py-3 flex items-center justify-between hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center gap-2">
                                      <Clock className="w-4 h-4 text-gray-400" />
                                      <span className="text-sm font-semibold text-gray-600">Past Appointments ({expiredAppointments.length})</span>
                                    </div>
                                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showExpiredSlots ? 'rotate-180' : ''}`} />
                                  </button>
                                  {showExpiredSlots && (
                                    <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 border-t border-gray-200">
                                      {expiredAppointments.sort((a, b) => getAppointmentISTDate(b).getTime() - getAppointmentISTDate(a).getTime()).map((a) => (
                                        <div key={a.id} className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm">
                                          <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[10px] text-gray-400 font-medium">{formatIST(getAppointmentISTDate(a), { dateStyle: 'medium' })}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : a.status === 'CANCELLED' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600'}`}>{a.status}</span>
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-xs font-semibold text-gray-700 truncate">{(a.patient as any)?.name || a.patient?.email?.split('@')[0] || 'Patient'}</span>
                                          </div>
                                          <div className="text-[10px] text-gray-400 mt-0.5">{formatISTTime(getAppointmentISTDate(a))}</div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                          </div>{/* end LEFT day view */}

                          {/* RIGHT — Summary panel */}
                          <div className="hidden lg:flex flex-col gap-3 w-56 flex-shrink-0">

                            {selectedHourKey ? (
                              // Show selected hour bookings
                              (() => {
                                const [dateKey, hStr] = selectedHourKey.split(':');
                                const h = parseInt(hStr);
                                const hourStart = new Date(`${dateKey}T${String(h).padStart(2, '0')}:00:00`);
                                const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
                                
                                // Re-define getCapacityForHour for this scope
                                const getCapacityForHourForPanel = (dateStr: string, hour: number) => {
                                  let period = Number(doctorProfile?.slotPeriodMinutes ?? 15);
                                  if (doctorProfile?.slotPeriodUpdatedAt && (doctorProfile as any)?.previousSlotPeriodMinutes) {
                                    const updateDate = new Date(doctorProfile.slotPeriodUpdatedAt);
                                    const transitionTime = new Date(updateDate.getTime());
                                    transitionTime.setMinutes(0, 0, 0);
                                    transitionTime.setMilliseconds(0);
                                    transitionTime.setHours(transitionTime.getHours() + 1);
                                    const targetTime = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:00:00+05:30`);
                                    if (targetTime.getTime() < transitionTime.getTime()) {
                                      period = Number((doctorProfile as any).previousSlotPeriodMinutes);
                                    }
                                  }
                                  return {
                                    period,
                                    countPerHour: Math.max(1, Math.floor(60 / Math.max(1, period)))
                                  };
                                };
                                const { period, countPerHour } = getCapacityForHourForPanel(dateKey, h);
                                
                                // Re-define activeAppointments for this scope
                                const now = getISTNow();
                                const nowTime = now.getTime();
                                const activeAppointments = appointments.filter(a => getAppointmentISTDate(a).getTime() >= nowTime);
                                
                                const hourAppointments = activeAppointments.filter((a) => {
                                  const t = getAppointmentISTDate(a).getTime();
                                  return t >= hourStart.getTime() && t < hourEnd.getTime() &&
                                    (doctorStatusFilter === 'ALL' || a.status === doctorStatusFilter);
                                });

                                return (
                                  <>
                                    {/* Selected Hour Header */}
                                    <div className="bg-white border border-blue-200 rounded-xl p-3 shadow-sm">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-gray-800">Selected Hour</span>
                                        <button onClick={() => setSelectedHourKey(null)} className="text-gray-400 hover:text-gray-600">
                                          <span className="text-sm">✕</span>
                                        </button>
                                      </div>
                                      <div className="text-base font-bold text-blue-600 mb-1">{formatISTTime(hourStart)} - {formatISTTime(hourEnd)}</div>
                                      <div className="text-[10px] text-gray-500">{formatIST(hourStart, { dateStyle: 'full' })}</div>
                                      <div className="mt-2 pt-2 border-t border-gray-100">
                                        <div className="text-[11px] text-gray-600">{hourAppointments.length} booking{hourAppointments.length !== 1 ? 's' : ''} · {countPerHour - hourAppointments.length} slot{countPerHour - hourAppointments.length !== 1 ? 's' : ''} available</div>
                                      </div>
                                    </div>

                                    {/* Hour Bookings */}
                                    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm max-h-[300px] overflow-y-auto">
                                      <span className="text-xs font-bold text-gray-800 block mb-2">Hour Bookings</span>
                                      {hourAppointments.length === 0 ? (
                                        <div className="text-center py-4 text-gray-400 text-[11px]">
                                          <div className="mb-1">🕐</div>
                                          No bookings for this hour
                                        </div>
                                      ) : (
                                        <div className="space-y-2">
                                          {hourAppointments.map((a) => (
                                            <div key={a.id} className="border border-gray-200 rounded-lg p-2 hover:bg-blue-50/50 transition-colors cursor-pointer"
                                              onClick={() => setSelectedAppointmentForPopup(a)}>
                                              <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-1.5">
                                                  <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px]">👤</span>
                                                  <span className="text-xs font-bold text-gray-800">{(a.patient as any)?.name || a.patient?.email?.split('@')[0] || 'Patient'}</span>
                                                </div>
                                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                                                  a.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-600' :
                                                  a.status === 'PENDING' ? 'bg-amber-50 text-amber-600' :
                                                  a.status === 'CANCELLED' ? 'bg-red-50 text-red-600' :
                                                  a.status === 'COMPLETED' ? 'bg-blue-50 text-blue-600' :
                                                  'bg-gray-50 text-gray-600'
                                                }`}>{a.status}</span>
                                              </div>
                                              <div className="text-[10px] text-gray-500">{formatISTTime(getAppointmentISTDate(a))}</div>
                                              {a.reason && <div className="text-[10px] text-gray-400 truncate mt-1">{a.reason}</div>}
                                              <div className="flex gap-1 mt-2 pt-2 border-t border-gray-100">
                                                <button onClick={(e) => { e.stopPropagation(); updateDoctorAppointmentStatus(user.id, a.id, 'CONFIRMED'); }} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] font-bold py-1 rounded transition-colors">Confirm</button>
                                                <button onClick={(e) => { e.stopPropagation(); updateDoctorAppointmentStatus(user.id, a.id, 'CANCELLED'); }} className="flex-1 bg-red-500 hover:bg-red-600 text-white text-[9px] font-bold py-1 rounded transition-colors">Cancel</button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                                      <span className="text-xs font-bold text-gray-800 block mb-2">Quick Actions</span>
                                      <div className="grid grid-cols-2 gap-1.5">
                                        {[
                                          { icon: '➕', label: 'Add Booking', action: () => { setSlotDate(dateKey); setSlotTime(formatISTTime(hourStart)); const walkinSection = document.getElementById('walk-in-reservation-section'); if (walkinSection) walkinSection.scrollIntoView({ behavior: 'smooth' }); } },
                                          { icon: '📋', label: 'List View', action: () => setAppointmentViewMode('list') },
                                          { icon: '📅', label: 'Manage Slots', action: () => setActiveTab('slots') },
                                          { icon: '↩️', label: 'Go Back', action: () => setSelectedHourKey(null) },
                                        ].map(q => (
                                          <button key={q.label} onClick={q.action}
                                            className="flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all text-center">
                                            <span className="text-base">{q.icon}</span>
                                            <span className="text-[9px] font-semibold text-gray-600">{q.label}</span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </>
                                );
                              })()
                            ) : (
                              // Show default summary view
                              <>
                                {/* Mini Calendar */}
                                {(() => {
                                  const now = getISTNow();
                                  const fmtD = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
                                  const todayStr = fmtD.format(now);
                                  const apptDates = new Set(appointments.map(a => fmtD.format(getAppointmentISTDate(a))));
                                  const firstDay = new Date(calYear, calMonth, 1).getDay();
                                  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
                                  const monthName = new Date(calYear, calMonth, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
                                  const days = ['Mo','Tu','We','Th','Fr','Sa','Su'];
                                  const offset = firstDay === 0 ? 6 : firstDay - 1;
                                  return (
                                    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-gray-800">{monthName}</span>
                                        <div className="flex gap-1">
                                          <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1); } else setCalMonth(m => m-1); }} className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 text-xs">‹</button>
                                          <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1); } else setCalMonth(m => m+1); }} className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 text-xs">›</button>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-7 gap-0.5 mb-1">
                                        {days.map(d => <div key={d} className="text-[9px] font-bold text-gray-400 text-center">{d}</div>)}
                                      </div>
                                      <div className="grid grid-cols-7 gap-0.5">
                                        {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}
                                        {Array.from({ length: daysInMonth }, (_, i) => {
                                          const day = i + 1;
                                          const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                                          const isToday = dateStr === todayStr;
                                          const hasAppt = apptDates.has(dateStr);
                                          return (
                                            <div key={day} className={`relative w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-semibold mx-auto cursor-pointer transition-colors ${isToday ? 'bg-blue-600 text-white' : hasAppt ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-600 hover:bg-gray-100'}`}>
                                              {day}
                                              {hasAppt && !isToday && <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400" />}
                                            </div>
                                          );
                                        })}
                                      </div>
                                      <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-gray-100">
                                        {[['bg-emerald-500','Confirmed'],['bg-blue-400','Upcoming'],['bg-red-400','Cancelled']].map(([c,l]) => (
                                          <div key={l} className="flex items-center gap-1"><div className={`w-1.5 h-1.5 rounded-full ${c}`}/><span className="text-[9px] text-gray-500">{l}</span></div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Appointment Summary */}
                                {(() => {
                                  const fmtD = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
                                  const todayStr = fmtD.format(getISTNow());
                                  const todayAppts = appointments.filter(a => fmtD.format(getAppointmentISTDate(a)) === todayStr);
                                  const confirmed = todayAppts.filter(a => a.status === 'CONFIRMED').length;
                                  const upcoming = appointments.filter(a => getAppointmentISTDate(a).getTime() >= getISTNow().getTime()).length;
                                  const completed = todayAppts.filter(a => a.status === 'COMPLETED').length;
                                  const cancelled = todayAppts.filter(a => a.status === 'CANCELLED').length;
                                  const total = todayAppts.length || 1;
                                  return (
                                    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-gray-800">Appointment Summary</span>
                                        <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">Today</span>
                                      </div>
                                      <div className="space-y-1.5">
                                        {[
                                          { label: 'Confirmed', value: confirmed, pct: Math.round(confirmed/total*100), color: 'text-emerald-600' },
                                          { label: 'Upcoming', value: upcoming, pct: Math.round(upcoming/total*100), color: 'text-blue-600' },
                                          { label: 'Completed', value: completed, pct: Math.round(completed/total*100), color: 'text-gray-600' },
                                          { label: 'Cancelled', value: cancelled, pct: Math.round(cancelled/total*100), color: 'text-red-500' },
                                        ].map(s => (
                                          <div key={s.label} className="flex items-center justify-between">
                                            <span className="text-[11px] text-gray-500">{s.label}</span>
                                            <span className={`text-[11px] font-bold ${s.color}`}>{s.value} <span className="text-gray-400 font-normal">({s.pct}%)</span></span>
                                          </div>
                                        ))}
                                        <div className="border-t border-gray-100 pt-1.5 flex items-center justify-between">
                                          <span className="text-[11px] font-semibold text-gray-700">Total</span>
                                          <span className="text-[11px] font-bold text-gray-900">{todayAppts.length}</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Quick Actions */}
                                <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                                  <span className="text-xs font-bold text-gray-800 block mb-2">Quick Actions</span>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    {[
                                      { icon: '📅', label: 'Add Slot', action: () => setActiveTab('slots') },
                                      { icon: '🚫', label: 'Block Slots', action: () => setActiveTab('slots') },
                                      { icon: '⏰', label: 'Manage Slots', action: () => setActiveTab('slots') },
                                      { icon: '📋', label: 'List View', action: () => setAppointmentViewMode('list') },
                                    ].map(q => (
                                      <button key={q.label} onClick={q.action}
                                        className="flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all text-center">
                                        <span className="text-base">{q.icon}</span>
                                        <span className="text-[9px] font-semibold text-gray-600">{q.label}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Tip */}
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2">
                                  <span className="text-base flex-shrink-0">💡</span>
                                  <div>
                                    <p className="text-[10px] font-bold text-blue-700 mb-0.5">Tip</p>
                                    <p className="text-[10px] text-blue-600 leading-relaxed">Click the time column (like "09:00") to see bookings for that hour</p>
                                  </div>
                                </div>
                              </>
                            )}

                          </div>{/* end RIGHT panel */}
                        </div>{/* end flex row */}
                      </>
                    ) : (
                      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <ul className="divide-y divide-gray-100">
                          {appointments
                            .filter((a) => doctorStatusFilter === 'ALL' || a.status === doctorStatusFilter)
                            .sort((a, b) => getAppointmentISTDate(a).getTime() - getAppointmentISTDate(b).getTime())
                            .map((appointment) => (
                              <li key={appointment.id} className="flex items-center justify-between px-3 py-2 md:px-4 md:py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                                onClick={() => setSelectedAppointmentForPopup(appointment)}>
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-sm flex-shrink-0">👤</div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{((appointment.patient as any)?.name) || 'Patient'}</p>
                                    <p className="text-xs text-gray-400">{formatIST(getAppointmentISTDate(appointment), { dateStyle: 'medium' })} · {formatISTTime(getAppointmentISTDate(appointment))}</p>
                                    {appointment.reason && <p className="text-xs text-gray-500 truncate">{appointment.reason}</p>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    appointment.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700' :
                                    appointment.status === 'PENDING' ? 'bg-amber-50 text-amber-700' :
                                    appointment.status === 'CANCELLED' ? 'bg-red-50 text-red-600' :
                                    appointment.status === 'COMPLETED' ? 'bg-blue-50 text-blue-600' :
                                    'bg-gray-100 text-gray-600'}`}>{appointment.status}</span>
                                  <select className="border border-gray-200 rounded-md px-2 py-1 text-[10px] text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    value={appointment.status}
                                    onChange={(e) => updateDoctorAppointmentStatus(user.id, appointment.id, e.target.value)}>
                                    <option value="PENDING">Pending</option>
                                    <option value="CONFIRMED">Confirmed</option>
                                    <option value="EMERGENCY">Emergency</option>
                                    <option value="COMPLETED">Completed</option>
                                    <option value="CANCELLED">Cancelled</option>
                                  </select>
                                </div>
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date & Time
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Doctor
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Reason
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {appointments.map((appointment) => (
                          <tr key={appointment.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatIST(getAppointmentISTDate(appointment), { dateStyle: 'medium' })}<br/>
                              <span className="text-gray-500">{formatISTTime(getAppointmentISTDate(appointment))}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {(((appointment.doctor as any)?.doctorProfile?.slug) || 'Doctor')}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {appointment.reason || 'No reason provided'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                appointment.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                                appointment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                appointment.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {appointment.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button className="text-blue-600 hover:text-blue-900 mr-3">Update</button>
                              <button className="text-red-600 hover:text-red-900">Cancel</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                <p className="text-gray-500 text-center py-8">No appointments found</p>
              )}
            </div>
          </div>
        )}

        {/* ============================================================================
            👥 PATIENTS TAB - Patient management interface (DOCTORS ONLY)
            ============================================================================ */}
        {activeTab === 'patients' && isDoctorLike && (
          <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-5">
              <h3 className="text-base md:text-xl font-bold text-white flex items-center">
                <span className="mr-2">👥</span>
                Patients
              </h3>
            </div>
            <div className="p-6">
              {patientsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Loading patients…</p>
                </div>
              ) : patients.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">👤</div>
                  <p className="text-gray-500 text-lg font-medium">No patients yet</p>
                  <p className="text-gray-400 text-sm mt-2">Your patient list will appear here once you have appointments</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">👤 Name</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">📧 Email</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">📊 Total Visits</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">📅 Last Visit</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {patients.map((p) => {
                        const name = p.email ? p.email.split('@')[0] : p.patientId;
                        const dt = new Date(p.lastDate);
                        const last = isNaN(dt.getTime()) ? '' : new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', hour12: false }).format(dt);
                        return (
                          <tr key={p.patientId} className="hover:bg-purple-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{String(name)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{p.email || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border border-blue-200">
                                {p.count} visits
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{last}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================================
            🌐 WEBSITE TAB - Website customization interface (DOCTORS ONLY)
            ============================================================================ */}
        {activeTab === 'website' && isDoctorLike && (
          <div className="space-y-8">
            <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
              <div className="bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-5">
                <h3 className="text-base md:text-xl font-bold text-white flex items-center">
                  <span className="mr-2">🌐</span>
                  Website Management
                </h3>
                <p className="text-sm text-cyan-100 mt-1">Customize your professional website</p>
              </div>
              <div className="p-6 bg-gradient-to-br from-gray-50 to-white">
                {user.role === 'DOCTOR' ? (
                  doctorProfile ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                            <span className="bg-blue-100 p-2 rounded-lg mr-2">🔗</span>
                            Website Preview
                          </h4>
                          <div className="border-2 border-blue-200 rounded-xl p-6 bg-gradient-to-br from-blue-50 to-cyan-50 shadow-sm">
                            <p className="text-sm font-semibold text-gray-700 mb-3">Your website URL:</p>
                            <p className="font-mono text-blue-600 font-bold text-lg break-all">
                              {doctorProfile.slug ? doctorMicrositeUrl(doctorProfile.slug) : 'No website yet'}
                            </p>
                          </div>
                          <div className="mt-4">
                            <Link 
                              href={doctorProfile.slug ? `/doctor-site/${doctorProfile.slug}` : '#'}
                              target="_blank"
                              onClick={(e) => {
                                if (doctorProfile.slug) {
                                  e.preventDefault();
                                  window.open(doctorMicrositeUrl(doctorProfile.slug), '_blank');
                                }
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200"
                            >
                              View Website
                            </Link>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h4>
                          <div className="space-y-3">
                            <button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200">
                              Edit Profile Information
                            </button>
                            <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200">
                              Customize Website Theme
                            </button>
                            <button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200">
                              Manage Services
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">🌐</div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">No Website Profile</h4>
                      <p className="text-gray-600 mb-4">Create your professional website to attract more patients</p>
                      <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200">
                        Create Website Profile
                      </button>
                    </div>
                  )
                ) : (
                  hospitalProfile ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-lg font-medium text-gray-900 mb-4">Hospital Site Preview</h4>
                          <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                            <p className="text-sm text-gray-600 mb-2">Your hospital site URL:</p>
                            <p className="font-mono text-blue-600">
                              {(() => {
                                const sub = (hospitalProfile as any)?.subdomain as string | undefined;
                                if (sub && sub.length > 1) return customSubdomainUrl(sub);
                                if (hospitalProfile.name) return hospitalMicrositeUrl(hospitalProfile.name);
                                if (hospitalProfile.name) return hospitalMicrositeUrl(hospitalProfile.name);
                                return `${typeof window !== 'undefined' ? window.location.origin : ''}/hospital-site/${hospitalProfile.id}`;
                              })()}
                            </p>
                          </div>
                          <div className="mt-4">
                            <Link 
                              href={`/hospital-site/${hospitalProfile.id}`}
                              target="_blank"
                              onClick={(e) => {
                                e.preventDefault();
                                const sub = (hospitalProfile as any)?.subdomain as string | undefined;
                                if (shouldUseSubdomainNav()) {
                                  if (sub && sub.length > 1) {
                                    window.open(customSubdomainUrl(sub), '_blank');
                                  } else if (hospitalProfile.name) {
                                    window.open(hospitalMicrositeUrl(hospitalProfile.name), '_blank');
                                  } else {
                                    window.open(`/hospital-site/${hospitalProfile.id}`, '_blank');
                                  }
                                } else {
                                  window.open(`/hospital-site/${hospitalProfile.id}`, '_blank');
                                }
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200"
                            >
                              View Website
                            </Link>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h4>
                          <div className="space-y-3">
                            <button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200">
                              Edit Hospital Profile
                            </button>
                            <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200">
                              Customize Site Theme
                            </button>
                            <button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200">
                              Manage Services
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">🌐</div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">No Hospital Configured</h4>
                      <p className="text-gray-600 mb-4">Create your hospital profile to enable the website</p>
                      <Link 
                        href="/hospital-admin/profile"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200"
                      >
                        Go to Hospital Profile
                      </Link>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================================
            ⚙️ SETTINGS TAB - Account and practice settings (DOCTORS ONLY)
            ============================================================================ */}
        {activeTab === 'settings' && isDoctorLike && (
          user.role === 'DOCTOR' ? <DoctorSettings /> : (
            <HospitalSettings
              onPeriodUpdated={(doctorId, minutes) => {
                setHospitalDoctorPeriodMap((prev) => ({ ...prev, [doctorId]: minutes }));
              }}
            />
          )
        )}
      </div>
      </div>
      
      {/* Mobile Bottom Navigation - Only visible on mobile */}
      <div className="md:hidden">
        <MobileBottomNavigation />
      </div>

      <PatientDetailPopup 
        appointment={selectedAppointmentForPopup}
        onClose={() => setSelectedAppointmentForPopup(null)}
        onStatusUpdate={(id, status) => {
          updateDoctorAppointmentStatus(user.id, id, status);
          if (selectedAppointmentForPopup && selectedAppointmentForPopup.id === id) {
            setSelectedAppointmentForPopup({ ...selectedAppointmentForPopup, status });
          }
        }}
      />
    </div>
  );
}

// ============================================================================
// ⚙️ DOCTOR SETTINGS COMPONENT - Manage Slot Admin credentials
// ============================================================================
// Helper to sanitize server error messages that may contain HTML
function sanitizeMessage(raw?: any): string | null {
  if (raw == null) return null;
  const str = String(raw);
  const pre = str.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  if (pre && pre[1]) return pre[1].replace(/\s+/g, ' ').trim();
  const text = str
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  const cannot = text.match(/Cannot\s+\w+\s+[^\s]+/i);
  return (cannot && cannot[0]) || text.slice(0, 500);
}
function DoctorSettings() {
  const { user } = useAuth();
  const [currentSlotAdminEmail, setCurrentSlotAdminEmail] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Doctor-configurable slot period (view preference); persisted in backend
  const [slotPeriodMinutes, setSlotPeriodMinutes] = useState<number>(15);
  // Bookable ON/OFF switch state
  const [isBookable, setIsBookable] = useState<boolean>(true);
  const [savingBookable, setSavingBookable] = useState<boolean>(false);
  // Profile photo upload state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  useEffect(() => {
    const loadSlotPeriod = async () => {
      try {
        const res = await apiClient.getDoctorSlotPeriod();
        if (res && typeof res.slotPeriodMinutes === 'number') {
          setSlotPeriodMinutes(Number(res.slotPeriodMinutes));
          return;
        }
      } catch (e: any) {
        // fall through to profile-based fallback
      }
      try {
        const prof = await apiClient.getDoctorProfile();
        const maybe = (prof && typeof (prof as any)?.slotPeriodMinutes === 'number')
          ? Number((prof as any).slotPeriodMinutes)
          : (prof && (prof as any)?.doctorProfile && typeof (prof as any).doctorProfile.slotPeriodMinutes === 'number'
              ? Number((prof as any).doctorProfile.slotPeriodMinutes)
              : undefined);
        if (typeof maybe === 'number') {
          setSlotPeriodMinutes(maybe);
        }
      } catch {}
    };
    const loadProfile = async () => {
      try {
        const prof = await apiClient.getDoctorProfile();
        const flag = (prof as any)?.isBookable;
        if (typeof flag === 'boolean') setIsBookable(flag);
        if ((prof as any)?.profileImage) setProfileImageUrl((prof as any).profileImage);
      } catch {}
    };
    if (user?.role === 'DOCTOR') { loadSlotPeriod(); loadProfile(); }
  }, [user]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await apiClient.getDoctorSlotAdmin();
        if (res?.slotAdmin) {
          setCurrentSlotAdminEmail(res.slotAdmin.email);
          setEmail(res.slotAdmin.email);
        } else {
          setCurrentSlotAdminEmail(null);
        }
      } catch (e: any) {
        setMessage(sanitizeMessage(e?.message) || 'Failed to load Slot Admin info');
      } finally {
        setLoading(false);
      }
    };
    if (user?.role === 'DOCTOR') load();
  }, [user]);

  const handleSave = async () => {
    if (!email || !password) {
      setMessage('Please provide email and password');
      return;
    }
    try {
      setLoading(true);
      setMessage(null);
      const res = await apiClient.upsertDoctorSlotAdmin(email, password);
      setCurrentSlotAdminEmail(res.slotAdmin.email);
      setPassword('');
      setMessage('Slot Admin credentials updated successfully');
    } catch (e: any) {
      setMessage(sanitizeMessage(e?.message) || 'Failed to update Slot Admin credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBookable = async (nextVal: boolean) => {
    setIsBookable(nextVal);
    try {
      setSavingBookable(true);
      setMessage(null);
      await apiClient.updateDoctorProfile({ isBookable: nextVal });
      setMessage(nextVal ? 'Bookings enabled' : 'Bookings disabled');
    } catch (e: any) {
      setMessage(e?.message || 'Failed to update booking status');
    } finally {
      setSavingBookable(false);
    }
  };

  return (
    <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
      <div className="bg-gradient-to-r from-orange-500 to-red-600 px-6 py-5">
        <h3 className="text-base md:text-xl font-bold text-white flex items-center">
          <span className="mr-2">⚙️</span>
          Settings
        </h3>
      </div>
      <div className="p-6 space-y-8 bg-gradient-to-br from-gray-50 to-white">
        {/* Clinic Logo / Profile Photo */}
        {user?.role === 'DOCTOR' && (
          <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h4 className="text-lg font-bold text-gray-900 mb-2 flex items-center">
              <span className="bg-blue-100 p-2 rounded-lg mr-2">📸</span>
              Clinic Logo / Profile Photo
            </h4>
            <p className="text-sm text-gray-600 mb-4">Upload your clinic logo or profile photo.</p>
            {profileImageUrl && (
              <div className="mb-4">
                <img src={profileImageUrl} alt="Current profile" className="w-32 h-32 object-cover rounded-xl border-4 border-blue-200 shadow-md" />
              </div>
            )}
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                className="border-2 border-gray-300 rounded-xl px-3 py-2 md:px-4 md:py-3 w-full focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
              <button
                onClick={async () => {
                  if (!photoFile) { setMessage('Please select a photo'); return; }
                  try {
                    setUploadingPhoto(true);
                    setMessage(null);
                    const res = await apiClient.uploadDoctorPhoto(photoFile!);
                    setProfileImageUrl(res.url);
                    setMessage('Logo/photo uploaded successfully');
                  } catch (e: any) {
                    setMessage(e?.message || 'Failed to upload');
                  } finally {
                    setUploadingPhoto(false);
                  }
                }}
                disabled={!photoFile || uploadingPhoto}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold py-3 px-6 rounded-xl disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all whitespace-nowrap"
              >
                {uploadingPhoto ? '⏳ Uploading…' : '📤 Upload'}
              </button>
            </div>
          </section>
        )}
        {/* Bookable ON/OFF */}
        <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h4 className="text-lg font-bold text-gray-900 mb-2 flex items-center">
            <span className="bg-green-100 p-2 rounded-lg mr-2">🔔</span>
            Make Bookable
          </h4>
          <p className="text-sm text-gray-600 mb-4">Turn patient booking on or off for your profile.</p>
          <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl px-6 py-4 shadow-sm">
            <span className="text-gray-800 font-semibold">Currently <span className={isBookable ? 'text-green-600' : 'text-red-600'}>{isBookable ? 'ON ✅' : 'OFF ❌'}</span></span>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isBookable}
                onChange={(e) => handleToggleBookable(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-200 rounded-full peer peer-checked:bg-green-500 transition-colors shadow-inner"></div>
              <div className="-ml-12 w-6 h-6 bg-white rounded-full shadow-lg transform peer-checked:translate-x-7 transition-transform"></div>
            </label>
          </div>
          {savingBookable && <p className="text-xs text-blue-600 mt-2 font-medium">💾 Saving…</p>}
        </section>
        {/* Slot Period Preference */}
        <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h4 className="text-lg font-bold text-gray-900 mb-2 flex items-center">
            <span className="bg-purple-100 p-2 rounded-lg mr-2">⏱️</span>
            Slot Period
          </h4>
          <p className="text-sm text-gray-600 mb-4">
            Choose how your schedule groups bookings. Patients select an hour; you can view bookings as {slotPeriodMinutes}-minute slots. This preference affects dashboard display only.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Slot period (minutes)</label>
              <select
                value={slotPeriodMinutes}
                onChange={async (e) => {
                  const val = Number(e.target.value);
                  setSlotPeriodMinutes(val);
                  try {
                    await apiClient.setDoctorSlotPeriod(val);
                    setMessage('Slot period saved');
                  } catch (err: any) {
                    setMessage(err?.message || 'Failed to save slot period');
                  }
                }}
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all font-medium"
              >
                {[10, 15, 20, 30, 60].map((m) => (
                  <option key={m} value={m}>{m} minutes</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 text-sm text-gray-600 bg-blue-50 p-4 rounded-xl border border-blue-200">
              <span className="font-semibold text-blue-800">💡 Tip:</span> We currently assign patients to the next available 15‑minute slot inside the chosen hour. Custom periods will be honored in a future backend update.
            </div>
          </div>
        </section>

        {/* Doctors Management Credentials */}
        <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h4 className="text-lg font-bold text-gray-900 mb-2 flex items-center">
            <span className="bg-indigo-100 p-2 rounded-lg mr-2">👨‍⚕️</span>
            Doctors Management
          </h4>
          <p className="text-sm text-gray-600 mb-4">
            Create or update a dedicated Doctors Management login for managing your slots.
          </p>
          {message && (
            <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 text-yellow-900 font-medium shadow-sm">{message}</div>
          )}
          <div className="space-y-3 md:space-y-4">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <label className="block text-sm font-bold text-gray-700 mb-2">Current Slot Admin</label>
              <div className="text-gray-800">
                {currentSlotAdminEmail ? (
                  <span className="font-mono bg-blue-100 px-3 py-1.5 rounded-lg text-blue-800 font-semibold">{currentSlotAdminEmail}</span>
                ) : (
                  <span className="text-gray-500 italic">No Slot Admin configured yet</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                  <span className="mr-2">📧</span> Slot Admin Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="slot-admin@example.com"
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                  <span className="mr-2">🔒</span> New Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-4">
              <button
                onClick={handleSave}
                disabled={loading}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 px-8 rounded-xl transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {loading ? '⏳ Saving...' : (currentSlotAdminEmail ? '✏️ Update Slot Admin' : '➕ Create Slot Admin')}
              </button>
              <Link 
                href="/slot-admin/login" 
                className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-2 hover:underline transition-all"
              >
                <span>🔗</span> Slot Admin Login
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// ============================================================================
// ⚙️ HOSPITAL SETTINGS COMPONENT - Manage Hospital Slot Admin credentials
// ============================================================================
// ============================================================================
// ⏱️ SLOT SETTINGS COMPONENT - Manage Patients per Hour
// ============================================================================
function SlotSettingsTab({ doctorProfile, onPeriodUpdated, onWorkingHoursUpdated }: { doctorProfile: any, onPeriodUpdated: (minutes: number) => void, onWorkingHoursUpdated?: (hours: Record<number, { start: string; end: string }>) => void }) {
  const [patientsPerHour, setPatientsPerHour] = useState<number>(4);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Working hours state — start empty, filled from DB
  const [hoursInputs, setHoursInputs] = useState<Record<number, { start: string; end: string }>>({
    0: { start: '', end: '' },
    1: { start: '', end: '' },
    2: { start: '', end: '' },
    3: { start: '', end: '' },
    4: { start: '', end: '' },
    5: { start: '', end: '' },
    6: { start: '', end: '' },
  });
  const [hoursLoading, setHoursLoading] = useState(false);
  const [hoursMessage, setHoursMessage] = useState<string | null>(null);
  const [hoursLoaded, setHoursLoaded] = useState(false);

  useEffect(() => {
    if (doctorProfile?.slotPeriodMinutes) {
      setPatientsPerHour(Math.round(60 / doctorProfile.slotPeriodMinutes));
    }
  }, [doctorProfile]);

  // Load working hours on mount — always from DB, never from local state
  useEffect(() => {
    const load = async () => {
      try {
        const list = await apiClient.getDoctorWorkingHours();
        // Build a clean map from DB data only
        const next: Record<number, { start: string; end: string }> = {
          0: { start: '', end: '' }, 1: { start: '', end: '' }, 2: { start: '', end: '' },
          3: { start: '', end: '' }, 4: { start: '', end: '' }, 5: { start: '', end: '' },
          6: { start: '', end: '' },
        };
        if (Array.isArray(list)) {
          list.forEach((wh: any) => {
            if (typeof wh.dayOfWeek === 'number') {
              next[wh.dayOfWeek] = {
                start: wh.startTime ? wh.startTime.slice(0, 5) : '',
                end: wh.endTime ? wh.endTime.slice(0, 5) : '',
              };
            }
          });
        }
        setHoursInputs(next);
        // Notify appointments tab of loaded hours
        if (onWorkingHoursUpdated) onWorkingHoursUpdated(next);
      } catch { /* keep empty */ }
      finally { setHoursLoaded(true); }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const minutes = Math.max(1, Math.round(60 / Math.max(1, patientsPerHour)));
      await apiClient.setDoctorSlotPeriod(minutes);
      onPeriodUpdated(minutes);
      setMessage('✅ Slot period saved successfully');
    } catch (err: any) {
      setMessage('❌ ' + (err.message || 'Failed to save slot period'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveHours = async () => {
    setHoursLoading(true);
    setHoursMessage(null);
    try {
      const payload = Object.keys(hoursInputs)
        .map((k) => {
          const day = Number(k);
          const { start, end } = hoursInputs[day];
          if (start && end) return { dayOfWeek: day, startTime: `${start}:00`, endTime: `${end}:00` };
          return null;
        })
        .filter((v): v is { dayOfWeek: number; startTime: string; endTime: string } => v !== null);
      await apiClient.setDoctorWorkingHours(payload);
      setHoursMessage('✅ Working hours saved');
      // Notify appointments tab so it adjusts immediately
      if (onWorkingHoursUpdated) onWorkingHoursUpdated(hoursInputs);
    } catch (err: any) {
      setHoursMessage('❌ ' + (err.message || 'Failed to save working hours'));
    } finally {
      setHoursLoading(false);
    }
  };

  const period = Math.max(1, Math.round(60 / Math.max(1, patientsPerHour)));
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column: Settings */}
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-0.5">Slot Period Settings</h3>
            <p className="text-xs text-gray-400 mb-4">Set how many patients you can see within 1 hour.</p>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-2.5 mb-4">
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] shrink-0 mt-0.5 font-bold">i</div>
              <div>
                <p className="text-xs font-bold text-blue-900 mb-0.5">What is Slot Period?</p>
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  Slot period defines the number of patients you can see in a fixed time duration (1 hour).
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-bold text-gray-900">Patients per Hour</h4>
                <p className="text-[11px] text-gray-400">Choose how many patients you can see in one hour</p>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                {[4, 6, 12].map((val) => (
                  <button
                    key={val}
                    onClick={() => setPatientsPerHour(val)}
                    className={`relative p-3 rounded-xl border-2 transition-all text-center ${
                      patientsPerHour === val 
                        ? 'border-blue-600 bg-blue-50 shadow-sm' 
                        : 'border-gray-100 hover:border-blue-200 bg-white'
                    }`}
                  >
                    <div className={`absolute top-2 left-2 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                      patientsPerHour === val ? 'border-blue-600 bg-white' : 'border-gray-300'
                    }`}>
                      {patientsPerHour === val && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                    </div>
                    <div className="text-base md:text-xl font-black text-gray-900 mt-1">{val}</div>
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Patients</div>
                    <div className={`mt-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      val === 4 ? 'bg-emerald-100 text-emerald-700' :
                      val === 6 ? 'bg-blue-100 text-blue-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {val === 4 ? 'Standard' : val === 6 ? 'High Volume' : 'Max Capacity'}
                    </div>
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Custom Patients/Hour</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={patientsPerHour}
                    onChange={(e) => setPatientsPerHour(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-white border-2 border-gray-200 focus:border-blue-500 rounded-lg transition-all font-bold text-gray-900 text-sm outline-none"
                    min={1}
                    max={60}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Patients</div>
                </div>
              </div>
            </div>

            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg flex gap-2.5">
              <span className="text-sm shrink-0">⏱️</span>
              <div>
                <p className="text-xs font-bold text-emerald-900 mb-0.5">Example ({patientsPerHour} Patients/Hour)</p>
                <p className="text-[11px] text-emerald-700 leading-relaxed">
                  Consultation duration: <span className="font-bold">{period} mins</span> · <span className="font-bold">{patientsPerHour} slots</span> per hour.
                </p>
              </div>
            </div>

            <button 
              onClick={handleSave}
              disabled={loading}
              className="w-full mt-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2.5 rounded-lg shadow transition-all disabled:opacity-50 text-sm"
            >
              {loading ? 'Saving...' : 'Save Slot Period'}
            </button>
            
            {message && (
              <div className={`mt-2 p-2.5 rounded-lg text-center text-xs font-bold ${
                message.includes('✅') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
              }`}>
                {message}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Working Hours */}
        <div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-0.5">Working Hours</h3>
                <p className="text-xs text-gray-400">Set your available hours for each day</p>
              </div>
              <button
                onClick={async () => {
                  try {
                    const list = await apiClient.getDoctorWorkingHours();
                    const next: Record<number, { start: string; end: string }> = {
                      0: { start: '', end: '' }, 1: { start: '', end: '' }, 2: { start: '', end: '' },
                      3: { start: '', end: '' }, 4: { start: '', end: '' }, 5: { start: '', end: '' },
                      6: { start: '', end: '' },
                    };
                    if (Array.isArray(list)) {
                      list.forEach((wh: any) => {
                        if (typeof wh.dayOfWeek === 'number') {
                          next[wh.dayOfWeek] = { start: wh.startTime?.slice(0,5) || '', end: wh.endTime?.slice(0,5) || '' };
                        }
                      });
                    }
                    setHoursInputs(next);
                    if (onWorkingHoursUpdated) onWorkingHoursUpdated(next);
                  } catch {}
                }}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-all"
              >
                Refresh
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {DAYS.map((day, idx) => {
                const val = hoursInputs[idx] || { start: '', end: '' };
                const isOff = !val.start && !val.end;
                return (
                  <div key={idx} className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${isOff ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200'}`}>
                    {/* Day toggle */}
                    <button
                      onClick={() => {
                        if (isOff) {
                          setHoursInputs(prev => ({ ...prev, [idx]: { start: '09:00', end: '17:00' } }));
                        } else {
                          setHoursInputs(prev => ({ ...prev, [idx]: { start: '', end: '' } }));
                        }
                      }}
                      className={`w-8 h-4 rounded-full transition-all flex-shrink-0 relative ${isOff ? 'bg-gray-200' : 'bg-blue-500'}`}
                    >
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${isOff ? 'left-0.5' : 'left-4'}`} />
                    </button>
                    <span className={`text-xs font-semibold w-20 flex-shrink-0 ${isOff ? 'text-gray-400' : 'text-gray-700'}`}>{day}</span>
                    {isOff ? (
                      <span className="text-[11px] text-gray-400 italic">Day off</span>
                    ) : (
                      <div className="flex items-center gap-1.5 flex-1">
                        <input
                          type="time"
                          value={val.start}
                          onChange={(e) => setHoursInputs(prev => ({ ...prev, [idx]: { ...prev[idx], start: e.target.value } }))}
                          className="flex-1 border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <span className="text-[10px] text-gray-400 font-medium">to</span>
                        <input
                          type="time"
                          value={val.end}
                          onChange={(e) => setHoursInputs(prev => ({ ...prev, [idx]: { ...prev[idx], end: e.target.value } }))}
                          className="flex-1 border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleSaveHours}
              disabled={hoursLoading}
              className="w-full mt-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold py-2.5 rounded-lg shadow transition-all disabled:opacity-50 text-sm"
            >
              {hoursLoading ? 'Saving...' : 'Save Working Hours'}
            </button>

            {hoursMessage && (
              <div className={`mt-2 p-2.5 rounded-lg text-center text-xs font-bold ${
                hoursMessage.includes('✅') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
              }`}>
                {hoursMessage}
              </div>
            )}

            <p className="text-[10px] text-gray-400 mt-2">These hours define when patients can book appointments with you.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HospitalSettings({ onPeriodUpdated }: { onPeriodUpdated?: (doctorId: number, minutes: number) => void }) {
  const { user } = useAuth();
  const [currentSlotAdminEmail, setCurrentSlotAdminEmail] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [hospitalId, setHospitalId] = useState<number | null>(null);
  const [doctors, setDoctors] = useState<Array<{ id: number; email: string }>>([]);
  const [doctorAdminForm, setDoctorAdminForm] = useState<Record<number, { currentEmail?: string | null; email: string; password: string; loading: boolean; message?: string | null }>>({});
  const [doctorPeriodForm, setDoctorPeriodForm] = useState<Record<number, { minutes: number; loading: boolean; message: string | null }>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false);
  const [hospitalLogoUrl, setHospitalLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // No-op: slot admin is loaded per-doctor below
        setCurrentSlotAdminEmail(null);
      } catch (e: any) {
        setMessage(sanitizeMessage(e?.message) || 'Failed to load Slot Admin info');
      } finally {
        setLoading(false);
      }
    };
    if (user?.role === 'HOSPITAL_ADMIN') load();
  }, [user]);

  // Load doctors linked to this hospital and their current Slot Admin emails
  useEffect(() => {
    const loadDoctors = async () => {
      if (!user || user.role !== 'HOSPITAL_ADMIN') return;
      try {
        const myHospital = await apiClient.getMyHospital();
        const hid = myHospital?.id;
        if (!hid) return;
        setHospitalId(hid);
        const logo = (myHospital as any)?.profile?.general?.logoUrl || (myHospital as any)?.general?.logoUrl || (myHospital as any)?.logoUrl || null;
        if (logo) setHospitalLogoUrl(logo);
        const details = await apiClient.getHospitalDetails(hid);
        const links = ((details?.doctors || []) as Array<any>)
          .map((l) => l?.doctor)
          .filter((d) => d && typeof d.id === 'number');
        setDoctors(links);
        // Initialize form state per doctor and load current slot admin emails
        const initial: Record<number, { currentEmail?: string | null; email: string; password: string; loading: boolean; message?: string | null }> = {};
        const periodInitial: Record<number, { minutes: number; loading: boolean; message: string | null }> = {};
        await Promise.all(
          links.map(async (d: any) => {
            initial[d.id] = { currentEmail: null, email: '', password: '', loading: true, message: null };
            const profileVal = (d?.doctorProfile && typeof d.doctorProfile.slotPeriodMinutes === 'number') ? Number(d.doctorProfile.slotPeriodMinutes) : undefined;
            periodInitial[d.id] = { minutes: profileVal ?? 15, loading: true, message: '' };
            try {
              const res = await apiClient.getHospitalSlotAdmin(d.id);
              const cur = res?.slotAdmin?.email || null;
              initial[d.id] = { currentEmail: cur, email: cur || '', password: '', loading: false, message: null };
            } catch (e: any) {
              initial[d.id] = { currentEmail: null, email: '', password: '', loading: false, message: sanitizeMessage(e?.message) || null };
            }
            try {
              const sp = await apiClient.getHospitalDoctorSlotPeriod(hid, d.id);
              const pval = (sp && typeof sp.slotPeriodMinutes === 'number') ? Number(sp.slotPeriodMinutes) : undefined;
              periodInitial[d.id] = { minutes: pval ?? (periodInitial[d.id]?.minutes ?? 15), loading: false, message: '' };
            } catch {
              periodInitial[d.id] = { minutes: (periodInitial[d.id]?.minutes ?? 15), loading: false, message: '' };
            }
          })
        );
        setDoctorAdminForm(initial);
        setDoctorPeriodForm(periodInitial);
      } catch (e) {
        // Silent fail to avoid blocking settings UI
        console.warn('Failed to load hospital doctors or doctor slot admins', e);
      }
    };
    loadDoctors();
  }, [user]);

  const updateDoctorAdminField = (doctorId: number, field: 'email' | 'password', value: string) => {
    setDoctorAdminForm((prev) => ({
      ...prev,
      [doctorId]: { ...(prev[doctorId] || { email: '', password: '', loading: false }), [field]: value },
    }));
  };

  const saveDoctorAdmin = async (doctorId: number) => {
    const form = doctorAdminForm[doctorId] || { email: '', password: '' };
    if (!form.email || !form.password) {
      setDoctorAdminForm((prev) => ({
        ...prev,
        [doctorId]: { ...(prev[doctorId] || { email: '', password: '' }), message: 'Please provide email and password' },
      }));
      return;
    }
    try {
      setDoctorAdminForm((prev) => ({ ...prev, [doctorId]: { ...(prev[doctorId] || {}), loading: true, message: null } }));
      const res = await apiClient.upsertHospitalSlotAdmin(form.email, form.password, doctorId);
      setDoctorAdminForm((prev) => ({
        ...prev,
        [doctorId]: { ...(prev[doctorId] || {}), currentEmail: res.slotAdmin.email, password: '', loading: false, message: 'Updated successfully' },
      }));
    } catch (e: any) {
      setDoctorAdminForm((prev) => ({
        ...prev,
        [doctorId]: { ...(prev[doctorId] || {}), loading: false, message: sanitizeMessage(e?.message) || 'Failed to update' },
      }));
    }
  };

  const handleSave = async () => {
    if (!email || !password) {
      setMessage('Please provide email and password');
      return;
    }
    try {
      setLoading(true);
      setMessage(null);
      if (!doctors.length) {
        setMessage('No linked doctors found for this hospital');
        setLoading(false);
        return;
      }
      const res = await apiClient.upsertHospitalSlotAdmin(email, password, doctors[0].id);
      setCurrentSlotAdminEmail(res.slotAdmin.email);
      setPassword('');
      setMessage('Slot Admin credentials updated successfully');
    } catch (e: any) {
      setMessage(e?.message || 'Failed to update Slot Admin credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Settings</h3>
      </div>
      <div className="p-6 space-y-8">
        {/* Hospital Logo Upload */}
        {user?.role === 'HOSPITAL_ADMIN' && (
          <section>
            <h4 className="text-md font-semibold text-gray-900 mb-2">Hospital Logo</h4>
            <p className="text-sm text-gray-600 mb-4">Upload your hospital logo for branding across the site.</p>
            {hospitalLogoUrl && (
              <div className="mb-3">
                <img src={hospitalLogoUrl} alt="Current logo" className="w-24 h-24 object-contain rounded bg-gray-50 border" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                className="border rounded-lg px-3 py-2 w-full"
              />
              <button
                onClick={async () => {
                  if (!logoFile) { setMessage('Please select a logo'); return; }
                  if (!hospitalId) { setMessage('Hospital ID not found'); return; }
                  try {
                    setUploadingLogo(true);
                    setMessage(null);
                    const res = await apiClient.uploadHospitalLogo(hospitalId, logoFile!);
                    setHospitalLogoUrl(res.url);
                    setMessage('Hospital logo uploaded successfully');
                  } catch (e: any) {
                    setMessage(e?.message || 'Failed to upload logo');
                  } finally {
                    setUploadingLogo(false);
                  }
                }}
                disabled={!logoFile || uploadingLogo || !hospitalId}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-2 px-4 rounded-lg"
              >
                {uploadingLogo ? 'Uploading…' : 'Upload Logo'}
              </button>
            </div>
          </section>
        )}
        {/* Slot Admin Credentials */}
        <section>
          <h4 className="text-md font-semibold text-gray-900 mb-2">Slot Booking Admin</h4>
          <p className="text-sm text-gray-600 mb-4">
            Create or update a dedicated Slot Admin login for managing hospital slots.
          </p>
          {message && (
            <div className="mb-4 p-3 rounded bg-yellow-50 border border-yellow-200 text-yellow-800">{message}</div>
          )}
          <div className="space-y-3 md:space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Doctors Management</label>
              <div className="text-gray-800">
                {currentSlotAdminEmail ? (
                  <span className="font-mono">{currentSlotAdminEmail}</span>
                ) : (
                  <span className="text-gray-500">No Doctors Management configured yet</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Doctors Management Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="slot-admin@example.com"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>
            <div>
              <button
                onClick={handleSave}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200"
              >
                {loading ? 'Saving...' : 'Save Doctors Management'}
              </button>
            </div>
          </div>
        </section>

        {/* Slot Period per Doctor */}
        {user?.role === 'HOSPITAL_ADMIN' && doctors.length > 0 && (
          <section className="pt-6 border-t border-gray-200">
            <h4 className="text-md font-semibold text-gray-900 mb-2">Slot Period</h4>
            <p className="text-sm text-gray-600 mb-4">
              Choose how your schedule groups bookings. Patients select an hour; you can view bookings as shorter slots. This preference affects dashboard display only.
            </p>
            <div className="space-y-3 md:space-y-4">
              {doctors.map((d) => {
                const form = doctorPeriodForm[d.id] || { minutes: 15, loading: false, message: '' };
                const capacity = Math.max(1, Math.floor(60 / Math.max(1, form.minutes)));
                return (
                  <div key={d.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-sm text-gray-600">Doctor</div>
                        <div className="font-medium text-gray-900">Dr. {(((d as any)?.doctorProfile?.slug) || 'Doctor')}</div>
                      </div>
                      <div className="text-sm text-gray-600">Capacity per hour: <span className="font-medium text-gray-900">{capacity}</span> • Period {form.minutes} min</div>
                    </div>
                    {form.message && (
                      <div className="mb-2 p-2 rounded bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">{form.message}</div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                      <label className="text-sm text-gray-700">Slot period (minutes)</label>
                      <select
                        value={String(form.minutes)}
                        onChange={async (e) => {
                          const val = Number(e.target.value);
                          if (!hospitalId) return;
                          try {
                            setDoctorPeriodForm((prev) => ({ ...prev, [d.id]: { ...(prev[d.id] || { minutes: 15, loading: false, message: '' }), minutes: val, loading: true, message: '' } }));
                            const res = await apiClient.setHospitalDoctorSlotPeriod(hospitalId, d.id, val);
                            const mins = Number(res?.slotPeriodMinutes) || val;
                            setDoctorPeriodForm((prev) => ({ ...prev, [d.id]: { ...(prev[d.id] || { minutes: 15, loading: false, message: '' }), minutes: mins, loading: false, message: 'Saved' } }));
                            onPeriodUpdated && onPeriodUpdated(d.id, mins);
                          } catch (err: any) {
                            setDoctorPeriodForm((prev) => ({ ...prev, [d.id]: { ...(prev[d.id] || { minutes: 15, loading: false, message: '' }), loading: false, message: err?.message || 'Failed to save' } }));
                          }
                        }}
                        disabled={!hospitalId || form.loading}
                        className="w-full border rounded-lg px-3 py-2"
                      >
                        {[10, 15, 20, 30, 60].map((m) => (
                          <option key={m} value={m}>{m} minutes</option>
                        ))}
                      </select>
                      <div className="text-sm text-gray-600">Tip: We currently assign patients to the next available 15‑minute slot inside the chosen hour. Custom periods will be honored in a future backend update.</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Doctor-specific Doctors Management */}
        <section className="pt-6 border-t border-gray-200">
          <h4 className="text-md font-semibold text-gray-900 mb-2">Doctor Management Credentials</h4>
          <p className="text-sm text-gray-600 mb-4">View and set Doctors Management login per doctor.</p>
          {doctors.length === 0 ? (
            <p className="text-sm text-gray-500">No linked doctors found.</p>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {doctors.map((d) => {
                const form = doctorAdminForm[d.id] || { email: '', password: '', currentEmail: null, loading: false, message: null };
                return (
                  <div key={d.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <p className="text-sm text-gray-600">Doctor</p>
                        <p className="font-medium text-gray-900">Dr. {(((d as any)?.doctorProfile?.slug) || 'Doctor')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Current Slot Admin</p>
                        <p className="font-mono text-gray-900">{form.currentEmail || 'Not set'}</p>
                      </div>
                    </div>
                    {form.message && (
                      <div className="mb-2 p-2 rounded bg-yellow-50 border border-yellow-200 text-yellow-800">{form.message}</div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => updateDoctorAdminField(d.id, 'email', e.target.value)}
                        placeholder="slot-admin@example.com"
                        className="w-full border rounded-lg px-3 py-2"
                      />
                      <input
                        type="password"
                        value={form.password}
                        onChange={(e) => updateDoctorAdminField(d.id, 'password', e.target.value)}
                        placeholder="New password"
                        className="w-full border rounded-lg px-3 py-2"
                      />
                      <button
                        onClick={() => saveDoctorAdmin(d.id)}
                        disabled={!!form.loading}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold px-4 py-2 rounded-lg"
                      >
                        {form.loading ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
        {/* Helpful Link */}
        <section className="pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Share the login URL with your staff: <Link href="/slot-admin/login" className="text-blue-600 underline">Slot Admin Login</Link>
          </p>
        </section>
      </div>
    </div>
  );
}