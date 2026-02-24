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
import { apiClient, Appointment, Slot } from '@/lib/api';  // API client for making HTTP requests
import Link from 'next/link';                              // Next.js Link component for navigation
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
  ChartBarSquareIcon
} from '@heroicons/react/24/outline';                      // Heroicons for beautiful icons
import { doctorMicrositeUrl, hospitalMicrositeUrl, customSubdomainUrl, shouldUseSubdomainNav } from '@/lib/subdomain';
import { getDoctorLabel, getPatientLabel, getUserLabel } from '@/lib/utils';
import { io } from 'socket.io-client';

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
  // Period length in minutes for booking slot subdivisions
  slotPeriodMinutes?: number;
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
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null); // Doctor profile data
  const [stats, setStats] = useState<DashboardStats | null>(null); // Dashboard statistics
  const [slots, setSlots] = useState<Slot[]>([]);          // Doctor availability slots
  const [slotDate, setSlotDate] = useState('');            // New slot date (YYYY-MM-DD)
  const [slotTime, setSlotTime] = useState('');            // New slot time (HH:mm)
  const [isLoading, setIsLoading] = useState(true);        // Loading state
  const [error, setError] = useState<string | null>(null); // Error state
  const [activeTab, setActiveTab] = useState('overview');  // Currently selected tab
  const [appointmentViewMode, setAppointmentViewMode] = useState<'list' | 'grouped'>('grouped'); // Doctor appointments view mode
  const [doctorStatusFilter, setDoctorStatusFilter] = useState<'ALL'|'CONFIRMED'|'PENDING'|'CANCELLED'|'EMERGENCY'>('ALL'); // Doctor-only filter
  const [collapsedHourKeys, setCollapsedHourKeys] = useState<Record<string, boolean>>({}); // Collapse per hour box
  const [hospitalProfile, setHospitalProfile] = useState<any | null>(null); // Hospital profile data (admin)
  const [patients, setPatients] = useState<Array<{ patientId: number; email: string; count: number; lastDate: string }>>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [hospitalDoctors, setHospitalDoctors] = useState<Array<{ id: number; email: string; doctorProfile?: any; departmentId?: number | null; departmentName?: string | null }>>([]);
  const [hospitalDoctorSearch, setHospitalDoctorSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // Sidebar collapse state
  const [deptCollapsed, setDeptCollapsed] = useState<Record<string, boolean>>({});
  const [deptSortMode, setDeptSortMode] = useState<'alpha' | 'activity'>('alpha');
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

  const recentHospitalAppointments = useMemo(() => {
    const list = Object.values(doctorAppointmentsMap).flat();
    const sorted = list.slice().sort((a, b) => getAppointmentISTDate(b).getTime() - getAppointmentISTDate(a).getTime());
    return sorted.slice(0, 5);
  }, [doctorAppointmentsMap]);

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
  const getAppointmentISTDate = (a: Appointment) => {
    try {
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
  // 🔄 SIDE EFFECTS - Code that runs when component mounts or updates
  // ============================================================================
  useEffect(() => {
    if (!user) return;                                     // Don't fetch if no user

    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // ============================================================================
        // 📊 FETCH DASHBOARD DATA - Role-based data fetching
        // ============================================================================
        
        // Always fetch appointments (works for all user types)
        const appointmentsResult = await apiClient.getMyAppointments();
        setAppointments(appointmentsResult);
        
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
          }
          
          // Stats: optional – default to zeros on failure
          if (statsResult.status === 'fulfilled') {
            setStats(statsResult.value as any);
          } else {
            setStats({
              totalAppointments: 0,
              pendingAppointments: 0,
              completedAppointments: 0,
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
    const loadHospitalBookings = async () => {
      if (!user || user.role !== 'HOSPITAL_ADMIN' || !hospitalProfile?.id) return;
      try {
        setLoadingHospitalBookings(true);
        // Fetch detailed hospital info to get linked doctors
        const details = await apiClient.getHospitalDetails(hospitalProfile.id);
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

  // Live updates via WebSocket: prefer sockets when connected
useEffect(() => {
  if (!user) return;

  const socket = io(process.env.NEXT_PUBLIC_API_URL || undefined, { transports: ['websocket'] });

  const onUpdate = (updated: any) => {
    try {
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

  const onCancel = (msg: any) => {
    try {
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

  const joinRooms = () => {
    if (hospitalProfile?.id) socket.emit('join-hospital', hospitalProfile.id);
    if (user?.role === 'DOCTOR' && user?.id) socket.emit('join-doctor', user.id);
    if (user?.role === 'PATIENT' && user?.id) socket.emit('join-patient', user.id);
  };

  socket.on('connect', () => { setSocketReady(true); joinRooms(); });
  socket.on('disconnect', () => setSocketReady(false));
  socket.on('appointment-updated', onUpdate);
  socket.on('appointment-updated-optimistic', onUpdate);
  socket.on('appointment-cancelled', onCancel);

  // On patient booking, refresh that doctor's appointments and slots
    const onBooked = async (msg: any) => {
      try {
        const payload = msg?.payload || {};
        const did = Number(payload?.doctorId);
        if (!did) return;

        const refreshForHospital = async (hid: number) => {
          try {
            const items = await apiClient.getHospitalDoctorAppointments(hid, did);
            setDoctorAppointmentsMap((prev) => ({
              ...prev,
              [did]: Array.isArray(items) ? items : [],
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
  socket.on('appointment-booked', onBooked);

  joinRooms();

  return () => {
    socket.off('appointment-updated', onUpdate);
    socket.off('appointment-updated-optimistic', onUpdate);
    socket.off('appointment-cancelled', onCancel);
    socket.off('appointment-booked', onBooked);
    socket.disconnect();
  };
}, [user?.id, user?.role, hospitalProfile?.id]);

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
        const payload = msg?.payload || {};
        const did = Number(payload?.doctorId);
        if (!did) return;
        const refreshForHospital = async (hid2: number) => {
          try {
            const items = await apiClient.getHospitalDoctorAppointments(hid2, did);
            setDoctorAppointmentsMap((prev) => ({
              ...prev,
              [did]: Array.isArray(items) ? items : [],
            }));
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
            href="/auth" 
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
          📂 COLLAPSEABLE SIDEBAR - Navigation sidebar
          ============================================================================ */}
      <aside className={`fixed left-0 top-0 h-full bg-blue-900 border-r border-blue-800 transition-all duration-300 z-50 shadow-lg ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
        {/* Toggle Button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-6 bg-blue-800 border border-blue-700 text-white rounded-full p-1.5 shadow-md hover:shadow-lg transition-all hover:scale-110 hover:bg-blue-700"
        >
          {sidebarCollapsed ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          )}
        </button>

        {/* Logo/Brand */}
        <div className="p-4 border-b border-blue-800">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">🏥</div>
            {!sidebarCollapsed && (
              <div>
                <h2 className="font-bold text-lg text-white">Healtara</h2>
                <p className="text-xs text-blue-300">Dashboard</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center space-x-3 px-3 py-2.5 rounded-lg hover:bg-blue-800 transition-all text-blue-100 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            {!sidebarCollapsed && <span className="font-medium">Dashboard</span>}
          </Link>

          {user?.role === 'HOSPITAL_ADMIN' && (
            <Link
              href="/hospital-admin/profile"
              className="flex items-center space-x-3 px-3 py-2.5 rounded-lg hover:bg-blue-800 transition-all text-blue-100 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {!sidebarCollapsed && <span className="font-medium">Profile</span>}
            </Link>
          )}

          {user?.role === 'DOCTOR' && (
            <Link
              href="/dashboard/profile"
              className="flex items-center space-x-3 px-3 py-2.5 rounded-lg hover:bg-blue-800 transition-all text-blue-100 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {!sidebarCollapsed && <span className="font-medium">Profile</span>}
            </Link>
          )}

          <button
            onClick={() => setActiveTab('appointments')}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg hover:bg-blue-800 transition-all text-blue-100 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {!sidebarCollapsed && <span className="font-medium">Appointments</span>}
          </button>

          <Link
            href="/slot-admin"
            className="flex items-center space-x-3 px-3 py-2.5 rounded-lg hover:bg-blue-800 transition-all text-blue-100 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {!sidebarCollapsed && <span className="font-medium">Slot Admin</span>}
          </Link>

          <button
            onClick={() => setActiveTab('settings')}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg hover:bg-blue-800 transition-all text-blue-100 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {!sidebarCollapsed && <span className="font-medium">Settings</span>}
          </button>

          <button
            onClick={logout}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg hover:bg-red-700 transition-all text-blue-100 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!sidebarCollapsed && <span className="font-medium">Logout</span>}
          </button>
        </nav>

        {/* User Info at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-blue-800 bg-blue-950">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-700 text-blue-100 flex items-center justify-center font-bold">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-white">{user?.email?.split('@')[0]}</p>
                <p className="text-xs text-blue-300">{user?.role}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
      {/* ============================================================================
          🎨 TOP BAR - Dark blue header with dashboard title and conditional logout
          ============================================================================ */}
      <header className="bg-blue-900 border-b border-blue-800 shadow-lg sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-white">
              {user.role === 'HOSPITAL_ADMIN' ? 'Hospital Dashboard' : isDoctorLike ? 'Doctor Dashboard' : 'Patient Dashboard'}
            </h1>
            
            {/* Logout button - only shows when sidebar is collapsed */}
            {sidebarCollapsed && (
              <button
                onClick={logout}
                className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="font-medium">Logout</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ============================================================================
          📊 MAIN CONTENT - Dashboard content with tabs
          ============================================================================ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ============================================================================
            🧭 NAVIGATION TABS - Tab navigation with smooth transitions
            ============================================================================ */}
        <div className="bg-white rounded-2xl shadow-xl mb-8 overflow-hidden">
          <nav className="flex space-x-2 p-2">
          {[
            { id: 'overview', name: '📊 Overview', icon: ChartBarIcon },
            { id: 'appointments', name: '📅 Appointments', icon: CalendarIcon },
            // Show doctor-like tabs for doctors and hospital admins
            ...(isDoctorLike ? [
                { id: 'slots', name: '🕒 Slots', icon: ClockIcon },
                { id: 'patients', name: '👥 Patients', icon: UserGroupIcon },
                { id: 'website', name: '🌐 Website', icon: GlobeAltIcon },
                { id: 'settings', name: '⚙️ Settings', icon: CogIcon }
              ] : [])
          ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 px-4 font-bold text-sm flex items-center justify-center space-x-2 rounded-xl transition-all duration-300 transform ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* ============================================================================
            📊 OVERVIEW TAB - Dashboard overview with statistics
            ============================================================================ */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* ==========================================================================
                ⏳ APPROVAL STATUS - Show pending approval alerts on dashboard
                ==========================================================================*/}
            {user.role === 'DOCTOR' && doctorProfile && doctorProfile.micrositeEnabled === false && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4">
                <p className="font-medium">Waiting for approval</p>
                <p className="text-sm">Your profile is awaiting admin approval. Some features are disabled until approval.</p>
              </div>
            )}
            {user.role === 'HOSPITAL_ADMIN' && hospitalProfile && (hospitalProfile as any)?.profile?.serviceStatus === 'PENDING' && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4">
                <p className="font-medium">Waiting for approval</p>
                <p className="text-sm">Hospital services are awaiting admin approval. Some features are disabled until approval.</p>
              </div>
            )}
            {/* ============================================================================
                📈 STATISTICS CARDS - Key metrics display (role-based)
                ============================================================================ */}
            {stats && (
              <div className={`grid grid-cols-1 md:grid-cols-2 ${user.role === 'DOCTOR' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6`}>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 overflow-hidden shadow-xl rounded-2xl transform hover:-translate-y-1 transition-all duration-300">
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-shrink-0 bg-white/20 p-3 rounded-xl">
                        <CalendarIcon className="h-8 w-8 text-white" />
                      </div>
                      <div className="text-right">
                        <dt className="text-sm font-medium text-blue-100 truncate">Total Appointments</dt>
                        <dd className="text-3xl font-black text-white mt-1">{stats.totalAppointments}</dd>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/10 px-6 py-2">
                    <div className="text-xs text-blue-100">All time bookings</div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-yellow-500 to-orange-500 overflow-hidden shadow-xl rounded-2xl transform hover:-translate-y-1 transition-all duration-300">
                  <div className="p-6">
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
                          {user.role === 'DOCTOR'
                            ? 'Total Patients'
                            : user.role === 'HOSPITAL_ADMIN'
                              ? 'Total Doctors'
                              : 'Doctors Visited'}
                        </dt>
                        <dd className="text-3xl font-black text-white mt-1">
                          {user.role === 'DOCTOR'
                            ? stats.totalPatients
                            : user.role === 'HOSPITAL_ADMIN'
                              ? hospitalDoctors.length
                              : (new Set(appointments.map((a: any) => a?.doctorId)).size)}
                        </dd>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/10 px-6 py-2">
                    <div className="text-xs text-green-100">
                      {user.role === 'DOCTOR' ? 'Unique patients' : user.role === 'HOSPITAL_ADMIN' ? 'Active doctors' : 'Unique doctors'}
                    </div>
                  </div>
                </div>

                {user.role === 'DOCTOR' && (
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
                  <h3 className="text-xl font-bold text-white flex items-center">
                    <span className="mr-2">🏥</span>
                    Hospital Information
                  </h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
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
                    <div className="space-y-4">
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
                  <h3 className="text-xl font-bold text-white flex items-center">
                    <span className="mr-2">🏥</span>
                    Practice Information
                  </h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
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
                          <span className="text-sm">{user.role === 'HOSPITAL_ADMIN' ? ((hospitalProfile as any)?.general?.name || (user.email?.split('@')[0])) : (user.role === 'DOCTOR' ? (doctorProfile?.slug || (user.email?.split('@')[0])) : (user.email?.split('@')[0]))}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
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
                {(() => { const recents = user.role === 'HOSPITAL_ADMIN' ? recentHospitalAppointments : appointments.slice(0, 5); return recents.length > 0 ? (
                  <div className="space-y-4">
                    {recents.map((appointment) => (
                      <div key={appointment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">
                            {formatIST(getAppointmentISTDate(appointment), { dateStyle: 'medium' })} at {formatISTTime(getAppointmentISTDate(appointment))}
                          </p>
                                                       <p className="text-gray-600">
                            {user.role === 'DOCTOR' ? `Patient: ${(((appointment.patient as any)?.name) || 'Patient')}` : `Doctor: ${(((appointment.doctor as any)?.doctorProfile?.slug) || 'Doctor')}`}
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
          <div className="space-y-8">
            {/* Create Slot */}
            <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-5">
                <h3 className="text-xl font-bold text-white flex items-center">
                  <span className="mr-2">🕒</span>
                  Create Availability Slot
                </h3>
                <p className="text-sm text-green-100 mt-1">Publish times patients can book</p>
              </div>
              <div className="p-6 bg-gradient-to-br from-gray-50 to-white">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                      <span className="mr-1">📅</span> Date
                    </label>
                    <input
                      type="date"
                      value={slotDate}
                      onChange={(e) => setSlotDate(e.target.value)}
                      className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                      <span className="mr-1">⏰</span> Time
                    </label>
                    <input
                      type="time"
                      value={slotTime}
                      onChange={(e) => setSlotTime(e.target.value)}
                      className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleCreateSlot}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      ✨ Publish Slot
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Slot List */}
            <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-5">
                <h3 className="text-xl font-bold text-white flex items-center">
                  <span className="mr-2">📋</span>
                  My Slots
                </h3>
              </div>
              <div className="p-6">
                {slots.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">📅 Date</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">⏰ Time</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">📊 Status</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">⚡ Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {slots.map((slot, idx) => (
                          <tr key={slot.id ?? `${String(slot.date ?? '')}-${String(slot.time ?? '')}-${idx}`} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{slot.date}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{slot.time}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-3 py-1.5 text-xs font-bold rounded-full shadow-sm ${
                                slot.status === 'AVAILABLE' ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200' :
                                slot.status === 'BOOKED' ? 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border border-blue-200' :
                                'bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border border-red-200'
                              }`}>
                                {slot.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {slot.status === 'AVAILABLE' && (
                                <button
                                  onClick={() => handleCancelSlot(slot.id)}
                                  className="text-red-600 hover:text-red-800 font-semibold hover:underline transition-all"
                                >
                                  ❌ Cancel
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📭</div>
                    <p className="text-gray-500 text-lg font-medium">No slots published yet</p>
                    <p className="text-gray-400 text-sm mt-2">Create your first slot above to get started</p>
                  </div>
                )}
              </div>
            </div>

            {/* Appointment Slot Boxes (Per-hour capacity view) */}
            <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
              <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-purple-600 border-b border-blue-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <span className="text-2xl">📊</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Slot Boxes (Capacity)</h3>
                    <p className="text-sm text-blue-100">Visual capacity management</p>
                  </div>
                </div>
                <div className="text-sm font-semibold text-white bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30">
                  Period: {Number(doctorProfile?.slotPeriodMinutes ?? 15)} min
                </div>
              </div>
              <div className="p-6 bg-gray-50">
                {(() => {
                  const filtered = appointments.slice();
                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl border-2 border-dashed border-gray-300">
                        <div className="text-6xl mb-4">📅</div>
                        <p className="text-gray-600 font-medium">No bookings to display</p>
                        <p className="text-sm text-gray-500 mt-2">Appointments will appear here when scheduled</p>
                      </div>
                    );
                  }
                  const fmtDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
                  const fmtHour = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false });
                  const groups = new Map<string, Appointment[]>();
                  filtered.forEach((a) => {
                    const d = getAppointmentISTDate(a);
                    const key = `${fmtDate.format(d)} ${fmtHour.format(d)}`;
                    const arr = groups.get(key) || [];
                    arr.push(a);
                    groups.set(key, arr);
                  });
                  const entries = Array.from(groups.entries()).sort(([ka], [kb]) => (ka < kb ? -1 : ka > kb ? 1 : 0));
                  const period = Number(doctorProfile?.slotPeriodMinutes ?? 15);
                  const segCount = Math.max(1, Math.floor(60 / Math.max(1, period)));
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6" onDragEnter={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {} }} onDragOver={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {} }} >
                      {entries.map(([key, list]) => {
                        const base = new Date(list[0].date);
                        const slotStart = new Date(base);
                        slotStart.setMinutes(0, 0, 0);
                        const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
                        const segments = Array.from({ length: segCount }).map((_, idx) => {
                          const segStart = new Date(slotStart.getTime() + idx * period * 60 * 1000);
                          const segEnd = new Date(segStart.getTime() + period * 60 * 1000);
                          const inSeg = list.filter((a) => {
                            const t = getAppointmentISTDate(a).getTime();
                            return t >= segStart.getTime() && t < segEnd.getTime();
                          });
                          return { segStart, segEnd, inSeg };
                        });
                        const totalBooked = list.length;
                        return (
                          <div key={key} className="group rounded-2xl border-2 border-gray-200 bg-gradient-to-br from-white to-gray-50 overflow-hidden hover:shadow-xl hover:scale-102 transition-all duration-300" data-hour-start={slotStart.toISOString()} data-doctor-id={String(user.id)} onDragEnter={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {}; try { const el = ev.currentTarget as HTMLElement; el.style.transition = 'transform 120ms ease, background-color 120ms ease, outline 120ms ease'; el.style.transform = 'scale(1.02)'; el.style.outline = '2px solid #60a5fa'; el.style.outlineOffset = '2px'; el.style.backgroundColor = '#f0f7ff'; } catch {} }} onDragLeave={(ev) => { try { const el = ev.currentTarget as HTMLElement; el.style.transform = ''; el.style.outline = ''; el.style.outlineOffset = ''; el.style.backgroundColor = ''; } catch {} }} onDragOver={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {} }} onDrop={(ev) => { ev.preventDefault(); ev.stopPropagation(); try { const el = ev.currentTarget as HTMLElement; el.style.transition = 'transform 140ms ease, background-color 140ms ease, outline 140ms ease'; el.style.transform = 'scale(1.05)'; el.style.outline = '2px solid #22c55e'; el.style.outlineOffset = '2px'; el.style.backgroundColor = '#ecfdf5'; setTimeout(() => { el.style.transform = ''; el.style.outline=''; el.style.outlineOffset=''; el.style.backgroundColor=''; }, 180); } catch {}; dropHandledRef.current = true; const data = ev.dataTransfer.getData('appointment-json') || ev.dataTransfer.getData('text/plain'); if (!data) { console.warn('[DND] doctor-hour-drop: missing data'); return; } try { const appt = JSON.parse(data); console.log('[DND] doctor-hour-drop', { targetStart: slotStart, doctorId: user.id, apptId: appt.id }); rescheduleDoctorAppointment(appt, slotStart, user.id as number); } catch (err) { console.warn('[DND] doctor-hour-drop parse error', err); } }}>
                            {/* Decorative gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                            
                            <div className="relative px-5 py-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                                  <span className="text-white text-sm font-bold">🕐</span>
                                </div>
                                <div>
                                  <div className="text-sm font-bold text-gray-900">
                                    {formatIST(slotStart)}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    to {formatISTTime(slotEnd)}
                                  </div>
                                </div>
                              </div>
                              <div className="text-xs font-semibold text-gray-700 bg-white px-3 py-1.5 rounded-full shadow-sm">
                                {totalBooked} / {segCount}
                              </div>
                            </div>
                            <div className="relative p-4 grid grid-cols-2 md:grid-cols-3 gap-3" onDragEnter={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {} }} onDragOver={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {} }}>
                              {segments.map((seg, i) => {
                                const capacity = 1;
                                const ratio = capacity > 0 ? seg.inSeg.length / capacity : 0;
                                let bgGradient = 'from-sky-50 to-sky-100';
                                let borderColor = 'border-sky-300';
                                let statusColor = 'text-sky-700';
                                
                                if (ratio === 0) {
                                  bgGradient = 'from-sky-50 to-sky-100';
                                  borderColor = 'border-sky-300';
                                  statusColor = 'text-sky-700';
                                } else if (ratio > 0 && ratio <= 0.25) {
                                  bgGradient = 'from-green-50 to-green-100';
                                  borderColor = 'border-green-400';
                                  statusColor = 'text-green-700';
                                } else if (ratio > 0.25 && ratio <= 0.5) {
                                  bgGradient = 'from-yellow-50 to-yellow-100';
                                  borderColor = 'border-yellow-400';
                                  statusColor = 'text-yellow-700';
                                } else if (ratio > 0.5 && ratio < 1) {
                                  bgGradient = 'from-orange-50 to-orange-100';
                                  borderColor = 'border-orange-500';
                                  statusColor = 'text-orange-700';
                                } else {
                                  bgGradient = 'from-red-50 to-red-100';
                                  borderColor = 'border-red-600';
                                  statusColor = 'text-red-700';
                                }
                                
                                return (
                                  <div key={i} className={`rounded-xl border-2 ${borderColor} bg-gradient-to-br ${bgGradient} p-3 hover:scale-105 hover:shadow-lg transition-all duration-200`} data-seg-start={seg.segStart.toISOString()} data-doctor-id={String(user.id)} onDragEnter={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {}; try { const el = ev.currentTarget as HTMLElement; el.style.transition = 'transform 120ms ease, background-color 120ms ease, outline 120ms ease'; el.style.transform = 'scale(1.02)'; el.style.outline = '2px solid #60a5fa'; el.style.outlineOffset = '2px'; el.style.backgroundColor = '#f0f7ff'; } catch {} }} onDragLeave={(ev) => { try { const el = ev.currentTarget as HTMLElement; el.style.transform = ''; el.style.outline = ''; el.style.outlineOffset = ''; el.style.backgroundColor = ''; } catch {} }} onDragOver={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {} }} onDrop={(ev) => { ev.preventDefault(); ev.stopPropagation(); try { const el = ev.currentTarget as HTMLElement; el.style.transition = 'transform 140ms ease, background-color 140ms ease, outline 140ms ease'; el.style.transform = 'scale(1.05)'; el.style.outline = '2px solid #22c55e'; el.style.outlineOffset = '2px'; el.style.backgroundColor = '#ecfdf5'; setTimeout(() => { el.style.transform = ''; el.style.outline=''; el.style.outlineOffset=''; el.style.backgroundColor=''; }, 180); } catch {}; dropHandledRef.current = true; const data = ev.dataTransfer.getData('appointment-json') || ev.dataTransfer.getData('text/plain'); if (!data) { console.warn('[DND] doctor-seg-drop: missing data'); return; } try { const appt = JSON.parse(data); console.log('[DND] doctor-seg-drop', { targetStart: seg.segStart, doctorId: user.id, apptId: appt.id }); rescheduleDoctorAppointment(appt, seg.segStart, user.id as number); } catch (err) { console.warn('[DND] doctor-seg-drop parse error', err); } }}>
                                    <div className="text-xs font-bold text-gray-900 mb-1">
                                      {formatISTTime(seg.segStart)}
                                    </div>
                                    <div className="text-xs text-gray-600 mb-1">
                                      {formatISTTime(seg.segEnd)}
                                    </div>
                                    <div className={`text-xs font-semibold ${statusColor}`}>
                                      {seg.inSeg.length} {seg.inSeg.length === 1 ? 'user' : 'users'}
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
            </div>
          </div>
        )}

        {/* ============================================================================
            📅 APPOINTMENTS TAB - Appointment management interface
            ============================================================================ */}
        {activeTab === 'appointments' && (
          <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-600 px-6 py-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center">
                  <span className="mr-2">📅</span>
                  {user.role === 'DOCTOR' ? 'Appointment Management' : user.role === 'HOSPITAL_ADMIN' ? 'Hospital Bookings by Doctor' : 'My Appointments'}
                </h3>
                {user.role === 'DOCTOR' && (
                  <div className="inline-flex rounded-lg overflow-hidden shadow-md">
                    <button
                      className={`px-4 py-2 text-sm font-medium transition-all ${appointmentViewMode === 'grouped' ? 'bg-white text-blue-600' : 'bg-blue-400/30 text-white hover:bg-blue-400/50'}`}
                      onClick={() => setAppointmentViewMode('grouped')}
                    >
                      📊 Grouped
                    </button>
                    <button
                      className={`px-4 py-2 text-sm font-medium transition-all ${appointmentViewMode === 'list' ? 'bg-white text-blue-600' : 'bg-blue-400/30 text-white hover:bg-blue-400/50'}`}
                      onClick={() => setAppointmentViewMode('list')}
                    >
                      📋 List
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 bg-gray-50">
              {user.role === 'HOSPITAL_ADMIN' ? (
                <div>
                  {loadingHospitalBookings && (
                    <div className="text-center py-4 text-gray-600">Loading doctor bookings…</div>
                  )}
                  {(!loadingHospitalBookings && hospitalDoctors.length === 0) && (
                    <div className="text-center py-8 text-gray-600">No doctors linked to your hospital yet.</div>
                  )}
                  <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                    <input
                      type="text"
                      value={hospitalDoctorSearch}
                      onChange={(e) => setHospitalDoctorSearch(e.target.value)}
                      placeholder="Search doctors by name, slug, or email handle"
                      className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {hospitalDoctorSearch && (
                      <button onClick={() => setHospitalDoctorSearch('')} className="ml-2 text-sm text-gray-600 hover:text-gray-800">Clear</button>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                      <select
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        {(() => {
                          const names = Array.from(new Set(hospitalDoctors.map((d) => (d as any).departmentName?.trim() || 'General / Unassigned'))).sort((a,b)=>a.localeCompare(b));
                          const opts = ['All', ...names];
                          return opts.map((n) => <option key={n} value={n}>{n === 'All' ? 'All Departments' : n}</option>);
                        })()}
                      </select>
                      <button
                        onClick={() => setDeptSortMode((m) => (m === 'alpha' ? 'activity' : 'alpha'))}
                        className="text-sm px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        {deptSortMode === 'alpha' ? 'Sort: A–Z' : 'Sort: Activity'}
                      </button>
                      <button
                        onClick={() => {
                          const names = Array.from(new Set(hospitalDoctors.map((d) => (d as any).departmentName?.trim() || 'General / Unassigned')));
                          const anyOpen = names.some((n) => !deptCollapsed[n || '']);
                          const next: Record<string, boolean> = {};
                          names.forEach((n) => { next[n || ''] = anyOpen; });
                          setDeptCollapsed(next);
                        }}
                        className="text-sm px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Toggle All
                      </button>
                      <label className="text-sm text-gray-700">Date</label>
                      <input
                        type="date"
                        value={selectedHospitalDate}
                        onChange={(e) => setSelectedHospitalDate(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  {(() => {
                    const groups = new Map<string, Array<any>>();
                    let candidateDocs = [...filteredHospitalDoctors];
                    if (departmentFilter && departmentFilter !== 'All') {
                      candidateDocs = candidateDocs.filter((d) => ((d as any).departmentName?.trim() || 'General / Unassigned') === departmentFilter);
                    }
                    const orderedDocs = [...candidateDocs].sort((a, b) => {
                      const da = (a as any).departmentName?.trim() || 'General / Unassigned';
                      const db = (b as any).departmentName?.trim() || 'General / Unassigned';
                      return da.localeCompare(db);
                    });
                    orderedDocs.forEach((doc) => {
                      const key = (doc as any).departmentName?.trim() || 'General / Unassigned';
                      const arr = groups.get(key) || [];
                      arr.push(doc);
                      groups.set(key, arr);
                    });
                    const entries = Array.from(groups.entries());
                    const withScore = entries.map(([depName, docs]) => {
                      const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
                      const todayStr = fmt.format(getISTNow());
                      let score = 0;
                      docs.forEach((doc) => {
                        const items = doctorAppointmentsMap[doc.id] || [];
                        score += items.filter((a) => fmt.format(getAppointmentISTDate(a)) === todayStr).length;
                      });
                      return { depName, docs, score };
                    });
                    const orderedGroups = deptSortMode === 'activity'
                      ? withScore.sort((a, b) => b.score - a.score || a.depName.localeCompare(b.depName))
                      : withScore.sort((a, b) => a.depName.localeCompare(b.depName));
                    return orderedGroups.map(({ depName, docs, score }) => (
                      <div key={`group-${depName}`} className="mb-8 border border-gray-200 rounded-lg bg-white shadow-sm">
                        <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setDeptCollapsed((prev) => ({ ...prev, [depName]: !prev[depName] }))}
                              className={`${deptCollapsed[depName]
                                ? 'text-xs px-2 py-1 border border-emerald-300 text-emerald-700 bg-emerald-50 rounded hover:bg-emerald-100'
                                : 'text-xs px-2 py-1 border border-blue-300 text-blue-700 bg-blue-50 rounded hover:bg-blue-100'}`}
                              aria-pressed={!deptCollapsed[depName]}
                            >
                              {deptCollapsed[depName] ? 'Expand' : 'Collapse'}
                            </button>
                            <div className="text-base font-semibold text-gray-900">{depName}</div>
                          </div>
                          <div className="text-xs text-gray-600">{docs.length} doctor{docs.length !== 1 ? 's' : ''} • Today: {score}</div>
                        </div>
                        <div className={deptCollapsed[depName] ? 'hidden' : 'p-4'}>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {docs.map((doc) => {
                            const items = doctorAppointmentsMap[doc.id] || [];
                            return (
                              <div key={doc.id} className="border rounded-lg overflow-hidden">
                                <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                                  <div>
                                    <div className="font-semibold text-gray-900">Doctor: {highlightDoctorLabel(getDoctorLabel(doc))}</div>
                                    {doc.doctorProfile?.clinicName && (
                                      <div className="text-sm text-gray-600">{doc.doctorProfile.clinicName}</div>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => setHistoryVisibleDoctor((prev) => ({ ...prev, [doc.id]: !prev[doc.id] }))}
                                    className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
                                  >
                                    {historyVisibleDoctor[doc.id] ? 'Hide History' : 'Show History'}
                                  </button>
                                </div>
                                <div className="p-4" onDragEnterCapture={(ev) => { ev.preventDefault(); try { (ev as any).dataTransfer.dropEffect = 'move'; } catch {} }} onDragOverCapture={(ev) => { ev.preventDefault(); try { (ev as any).dataTransfer.dropEffect = 'move'; } catch {} }}>
                                  {(() => {
                                    const fmtDateIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
                                    const todayStr = fmtDateIST.format(getISTNow());
                                    const nowTs = getISTNow().getTime();
                                    const pendingToday = items.filter((a) => {
                                      const d = getAppointmentISTDate(a);
                                      const isToday = fmtDateIST.format(d) === todayStr;
                                      return isToday && d.getTime() < nowTs && a.status === 'PENDING';
                                    });
                                    if (pendingToday.length === 0) return null;
                                    return (
                                      <div className="bg-white border rounded-lg overflow-hidden mb-3">
                                        <div className="px-4 py-2 border-b border-yellow-200 flex items-center justify-between">
                                          <h4 className="text-sm font-semibold text-gray-900">Pending Bookings</h4>
                                          <div className="text-xs text-gray-600">Time passed, awaiting action</div>
                                        </div>
                                        <div className="p-3 space-y-2">
                                          {pendingToday.map((appointment) => (
                                            <div key={appointment.id} className="border rounded px-3 py-2">
                                              <div className="text-sm font-medium text-gray-900">{formatIST(getAppointmentISTDate(appointment), { dateStyle: 'medium', timeStyle: 'short', hour12: false })}</div>
                                              <div className="text-xs text-gray-600">Patient: {getPatientLabel(appointment.patient as any, appointment.patientId)} • Status: {appointment.status}</div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                  {(() => {
                                    const fmtDateIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
                                    const todayStr = fmtDateIST.format(getISTNow());
                                    const nextDays = 14;
                                    const todayTs = getISTNow().getTime();
                                    const endTs = todayTs + nextDays * 24 * 60 * 60 * 1000;
                                    const upcoming = items.filter((a) => {
                                      const d = getAppointmentISTDate(a);
                                      const ds = fmtDateIST.format(d);
                                      return ds >= todayStr && d.getTime() <= endTs;
                                    });
                                    if (upcoming.length === 0) return null;
                                    return (
                                      <div className="bg-white border rounded-lg overflow-hidden mb-3">
                                        <div className="px-4 py-2 border-b border-blue-200 flex items-center justify-between">
                                          <h4 className="text-sm font-semibold text-gray-900">Upcoming Bookings</h4>
                                          <div className="text-xs text-gray-600">Next {nextDays} days</div>
                                        </div>
                                        <div className="p-3 space-y-2">
                                          {upcoming.map((appointment) => (
                                            <div key={appointment.id} className="border rounded px-3 py-2">
                                              <div className="text-sm font-medium text-gray-900">{formatIST(getAppointmentISTDate(appointment), { dateStyle: 'medium', timeStyle: 'short', hour12: false })}</div>
                                              <div className="text-xs text-gray-600">Patient: {getPatientLabel(appointment.patient as any, appointment.patientId)} • Status: {appointment.status}</div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                  {(() => {
                                    const fmtDateIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
                                    const apptsOnDate = items.filter((a) => fmtDateIST.format(getAppointmentISTDate(a)) === selectedHospitalDate);
                                    if (apptsOnDate.length === 0) return null;
                                    return (
                                      <div className="mt-3 bg-white border rounded-lg overflow-hidden">
                                        <div className="px-4 py-2 border-b border-blue-200 flex items-center justify-between">
                                          <h4 className="text-sm font-semibold text-gray-900">Appointments on {selectedHospitalDate}</h4>
                                          <div className="text-xs text-gray-600">{apptsOnDate.length} booked</div>
                                        </div>
                                        <div className="p-3 space-y-2">
                                          {apptsOnDate.map((appointment) => (
                                            <div key={appointment.id} className="border rounded px-3 py-2">
                                              <div className="text-sm font-medium text-gray-900">{formatIST(getAppointmentISTDate(appointment), { dateStyle: 'medium', timeStyle: 'short', hour12: false })}</div>
                                              <div className="text-xs text-gray-600">Patient: {getPatientLabel(appointment.patient as any, appointment.patientId)} • Status: {appointment.status}</div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            );
                          })}
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                  <div className="hidden grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredHospitalDoctors.map((doc) => {
                      const items = doctorAppointmentsMap[doc.id] || [];
                      return (
                        <div key={doc.id} className="border rounded-lg overflow-hidden">
                          <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-gray-900">Doctor: {highlightDoctorLabel(getDoctorLabel(doc))}</div>
                              {doc.doctorProfile?.clinicName && (
                                <div className="text-sm text-gray-600">{doc.doctorProfile.clinicName}</div>
                              )}
                            </div>
                            <button
                              onClick={() => setHistoryVisibleDoctor((prev) => ({ ...prev, [doc.id]: !prev[doc.id] }))}
                              className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
                            >
                              {historyVisibleDoctor[doc.id] ? 'Hide History' : 'Show History'}
                            </button>
                          </div>
                  <div className="p-4" onDragEnterCapture={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {} }} onDragOverCapture={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {} }}>
                          {/* Pending Bookings (time has passed, today) */}
                          {(() => {
                              const fmtDateIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
                              const todayStr = fmtDateIST.format(getISTNow());
                              const nowTs = getISTNow().getTime();
                              const pendingToday = items.filter((a) => {
                                const d = getAppointmentISTDate(a);
                                const isToday = fmtDateIST.format(d) === todayStr;
                                return isToday && d.getTime() < nowTs && a.status === 'PENDING';
                              });
                              if (pendingToday.length === 0) return null;
                              return (
                                <div className="bg-white border rounded-lg overflow-hidden mb-3">
                                  <div className="px-4 py-2 border-b border-yellow-200 flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-gray-900">Pending Bookings</h4>
                                    <div className="text-xs text-gray-600">Time passed, awaiting action</div>
                                  </div>
                                  <div className="p-3 space-y-2">
                                    {pendingToday.map((appointment) => (
                                      <div key={appointment.id} className="border rounded px-3 py-2">
                                        <div className="text-sm font-medium text-gray-900">{formatIST(getAppointmentISTDate(appointment), { dateStyle: 'medium', timeStyle: 'short', hour12: false })}</div>
                                        <div className="text-xs text-gray-600">Patient: {getPatientLabel(appointment.patient as any, appointment.patientId)} • Status: {appointment.status}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                          })()}
                          {(() => {
                            const fmtDateIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
                            const todayStr = fmtDateIST.format(getISTNow());
                            const nextDays = 14;
                            const todayTs = getISTNow().getTime();
                            const endTs = todayTs + nextDays * 24 * 60 * 60 * 1000;
                            const upcoming = items.filter((a) => {
                              const d = getAppointmentISTDate(a);
                              const ds = fmtDateIST.format(d);
                              return ds >= todayStr && d.getTime() <= endTs;
                            });
                            if (upcoming.length === 0) return null;
                            return (
                              <div className="bg-white border rounded-lg overflow-hidden mb-3">
                                <div className="px-4 py-2 border-b border-blue-200 flex items-center justify-between">
                                  <h4 className="text-sm font-semibold text-gray-900">Upcoming Bookings</h4>
                                  <div className="text-xs text-gray-600">Next {nextDays} days</div>
                                </div>
                                <div className="p-3 space-y-2">
                                  {upcoming.map((appointment) => (
                                    <div key={appointment.id} className="border rounded px-3 py-2">
                                      <div className="text-sm font-medium text-gray-900">{formatIST(getAppointmentISTDate(appointment), { dateStyle: 'medium', timeStyle: 'short', hour12: false })}</div>
                                      <div className="text-xs text-gray-600">Patient: {getPatientLabel(appointment.patient as any, appointment.patientId)} • Status: {appointment.status}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                            {/* History of Bookings (previous days) */}
                            {historyVisibleDoctor[doc.id] && (() => {
                              const fmtDateIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
                              const todayStr = fmtDateIST.format(getISTNow());
                              const history = items.filter((a) => fmtDateIST.format(getAppointmentISTDate(a)) < todayStr);
                              if (history.length === 0) return <div className="text-sm text-gray-600">No previous bookings.</div>;
                              return (
                                <div className="bg-white border rounded-lg overflow-hidden mb-3">
                                  <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-gray-900">History of Bookings</h4>
                                    <div className="text-xs text-gray-600">Previous days</div>
                                  </div>
                                  <div className="p-3 space-y-2">
                                    {history.map((appointment) => (
                                      <div key={appointment.id} className="border rounded px-3 py-2">
                                        <div className="text-sm font-medium text-gray-900">{formatIST(getAppointmentISTDate(appointment), { dateStyle: 'medium', timeStyle: 'short', hour12: false })}</div>
                                        <div className="text-xs text-gray-600">Patient: {getPatientLabel(appointment.patient as any, appointment.patientId)} • Status: {appointment.status}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                            {(items.length === 0 && (hospitalDoctorSlotsMap[doc.id] || []).length === 0) ? (
                              (() => {
                                const dateStr = selectedHospitalDate;
                                const av = (hospitalDoctorAvailabilityMap[doc.id] || {})[dateStr];
                                if (!av) {
                                  const err = hospitalDoctorErrorMap[doc.id];
                                  if (err) {
                                    let text = 'No bookings or slots found for this doctor.';
                                    try { const parsed = JSON.parse(err); if (parsed?.message) text = parsed.message; } catch {}
                                    return <div className="text-sm text-gray-500">{text}</div>;
                                  }
                                  return <div className="text-sm text-gray-500">No bookings or slots found for this doctor.</div>;
                                }
                                const period = Number(hospitalDoctorPeriodMap[doc.id] ?? doc?.doctorProfile?.slotPeriodMinutes ?? 15);
                                const countPerHour = Math.max(1, Math.floor(60 / Math.max(1, period)));
                                return (
                                  <div className="space-y-2">
                                    <div className="text-sm text-gray-700">Capacity view for {dateStr}</div>
                                    <ul className="space-y-2">
                                      {av.hours.map((h) => (
                                        <li key={h.hour} className={`rounded ${getSlotBoxColors(h.bookedCount, new Date(), countPerHour)}`}>
                                          <div className="px-3 py-2 flex items-center justify-between">
                                            <div className="text-sm font-medium text-gray-900">{h.labelFrom} → {h.labelTo}</div>
                                            <div className="text-xs text-gray-600">Users: {h.bookedCount} • Capacity: {countPerHour}</div>
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                    {(() => {
                                      const fmtDateIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
                                      const apptsOnDate = items.filter((a) => fmtDateIST.format(getAppointmentISTDate(a)) === dateStr);
                                      if (apptsOnDate.length === 0) return null;
                                      return (
                                        <div className="mt-3 bg-white border rounded-lg overflow-hidden">
                                          <div className="px-4 py-2 border-b border-blue-200 flex items-center justify-between">
                                            <h4 className="text-sm font-semibold text-gray-900">Appointments on {dateStr}</h4>
                                            <div className="text-xs text-gray-600">{apptsOnDate.length} booked</div>
                                          </div>
                                          <div className="p-3 space-y-2">
                                            {apptsOnDate.map((appointment) => (
                                              <div key={appointment.id} className="border rounded px-3 py-2">
                                                <div className="text-sm font-medium text-gray-900">{formatIST(getAppointmentISTDate(appointment), { dateStyle: 'medium', timeStyle: 'short', hour12: false })}</div>
                                                <div className="text-xs text-gray-600">Patient: {getPatientLabel(appointment.patient as any, appointment.patientId)} • Status: {appointment.status}</div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                );
                              })()
                            ) : (
                              <ul className="space-y-4" onDragEnter={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {} }} onDragOver={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {} }}>
                                {(() => {
                                  const fmtDateIST2 = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
                                  const todayStr = fmtDateIST2.format(getISTNow());
                                  const slots = (hospitalDoctorSlotsMap[doc.id] || [])
                                    .filter((slot) => slot.date >= todayStr)
                                    .filter((slot) => {
                                      const slotStart = new Date(`${slot.date}T${String(slot.time).slice(0,5)}:00`);
                                      const dayIdx = slotStart.getDay();
                                      const wh = hospitalHoursInputs[dayIdx];
                                      const hasTiming = selectedDoctorForTiming === doc.id && wh && wh.start && wh.end;
                                      if (!hasTiming) return true;
                                      const toMin = (t: string) => { const [hh, mm] = t.split(':').map(Number); return hh * 60 + mm; };
                                      const startMin = slotStart.getHours() * 60 + slotStart.getMinutes();
                                      const endMin = startMin + 60;
                                      const whStart = toMin(wh.start);
                                      const whEnd = toMin(wh.end);
                                      return startMin >= whStart && endMin <= whEnd;
                                    });
                                  if (slots.length === 0) {
                                    const fmtDateIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
                                    const apptsOnDate = items.filter((a) => fmtDateIST.format(getAppointmentISTDate(a)) === selectedHospitalDate);
                                    if (apptsOnDate.length === 0) return <li className="text-sm text-gray-500">No slots defined; showing appointments:</li>;
                                    return (
                                      <>
                                        <li className="text-sm text-gray-700">Appointments on {selectedHospitalDate}</li>
                                        {apptsOnDate.map((appointment) => (
                                          <li key={appointment.id} className="border rounded px-3 py-2">
                                            <div className="text-sm font-medium text-gray-900">{formatIST(getAppointmentISTDate(appointment), { dateStyle: 'medium', timeStyle: 'short', hour12: false })}</div>
                                            <div className="text-xs text-gray-600">Patient: {getPatientLabel(appointment.patient as any, appointment.patientId)} • Status: {appointment.status}</div>
                                          </li>
                                        ))}
                                      </>
                                    );
                                  }
                                  const children = slots.map((slot) => {
                                    const slotStart = new Date(`${slot.date}T${String(slot.time).slice(0,5)}:00`);
                                    const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
                                    const slotAppointments = items.filter((a) => {
                                      const t = getAppointmentISTDate(a).getTime();
                                      return t >= slotStart.getTime() && t <= slotEnd.getTime();
                                    });
                                    return (
                                      <li key={slot.id} className="border border-gray-200 rounded" onDragEnter={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {}; try { const el = ev.currentTarget as HTMLElement; el.style.transition = 'transform 120ms ease, background-color 120ms ease, outline 120ms ease'; el.style.transform = 'scale(1.02)'; el.style.outline = '2px solid #60a5fa'; el.style.outlineOffset = '2px'; el.style.backgroundColor = '#f0f7ff'; } catch {} }} onDragLeave={(ev) => { try { const el = ev.currentTarget as HTMLElement; el.style.transform = ''; el.style.outline = ''; el.style.outlineOffset = ''; el.style.backgroundColor = ''; } catch {} }} onDragOver={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {} }} onDrop={(ev) => { ev.preventDefault(); ev.stopPropagation(); try { const el = ev.currentTarget as HTMLElement; el.style.transition = 'transform 140ms ease, background-color 140ms ease, outline 140ms ease'; el.style.transform = 'scale(1.05)'; el.style.outline = '2px solid #22c55e'; el.style.outlineOffset = '2px'; el.style.backgroundColor = '#ecfdf5'; setTimeout(() => { el.style.transform = ''; el.style.outline=''; el.style.outlineOffset=''; el.style.backgroundColor=''; }, 180); } catch {}; dropHandledRef.current = true; const data = ev.dataTransfer.getData('appointment-json') || ev.dataTransfer.getData('text/plain'); if (!data) { console.warn('[DND] drop: missing data'); return; } try { const appt = JSON.parse(data); console.log('[DND] slot-level drop', { targetStart: slotStart, doctorId: doc.id, apptId: appt.id }); rescheduleDoctorAppointment(appt, slotStart, doc.id); } catch (err) { console.warn('[DND] drop parse error', err); } }}>
                                        <div className="px-3 py-2">
                                          <div className="text-sm font-medium text-gray-900">Slot #{slot.id}</div>
                                          <div className="text-sm text-gray-700">{formatIST(slotStart)} → {formatIST(slotEnd)}</div>
                                          <div className="text-xs text-gray-500">Status: {slot.status || 'UNKNOWN'}</div>
                                          {(() => {
                                            const dayIdx = slotStart.getDay();
                                            const wh = hospitalHoursInputs[dayIdx];
                                            const hasTiming = selectedDoctorForTiming === doc.id && wh && wh.start && wh.end;
                                            const within = (() => {
                                              if (!hasTiming) return true;
                                              const toMin = (t: string) => {
                                                const [hh, mm] = t.split(':').map(Number);
                                                return hh * 60 + mm;
                                              };
                                              const startMin = slotStart.getHours() * 60 + slotStart.getMinutes();
                                              const endMin = startMin + 60;
                                              const whStart = toMin(wh.start);
                                              const whEnd = toMin(wh.end);
                                              return startMin >= whStart && endMin <= whEnd;
                                            })();
                                            return hasTiming && !within ? (
                                              <div className="mt-1 inline-block px-2 py-0.5 text-xs rounded bg-red-100 text-red-700">Not available</div>
                                            ) : null;
                                          })()}
                                        </div>
                                        <div className="px-3 pb-3" onDragEnter={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {} }} onDragOver={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {} }}>
                                          {(() => {
                                            const period = Number(hospitalDoctorPeriodMap[doc.id] ?? doc?.doctorProfile?.slotPeriodMinutes ?? 15);
                                            const count = Math.max(1, Math.floor(60 / Math.max(1, period)));
                                            const segments = Array.from({ length: count }, (_, idx) => {
                                              const segStart = new Date(slotStart.getTime() + idx * period * 60 * 1000);
                                              const segEnd = new Date(segStart.getTime() + period * 60 * 1000);
                                              const inSeg = slotAppointments.filter((a) => {
                                                const t = getAppointmentISTDate(a).getTime();
                                                return t >= segStart.getTime() && t < segEnd.getTime();
                                              });
                                              return { idx, segStart, segEnd, inSeg };
                                            });
                                            return (
                                              <div>
                                                <div className="text-xs text-gray-600 mb-2">Sub-slots ({period} min): {count} per hour</div>
                                                <ul className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                  {segments.map(({ idx, segStart, segEnd, inSeg }) => (
                                                    <li key={idx} className="border border-gray-200 rounded px-3 py-2 hover:bg-blue-50" onDragEnter={(ev) => { try { ev.dataTransfer.dropEffect = 'move'; } catch {} }} onDragOver={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {} }} onDrop={(ev) => { ev.preventDefault(); ev.stopPropagation(); const data = ev.dataTransfer.getData('appointment-json') || ev.dataTransfer.getData('text/plain'); if (!data) { console.warn('[DND] seg-drop: missing data'); return; } try { const appt = JSON.parse(data); console.log('[DND] seg-level drop', { targetStart: segStart, doctorId: doc.id, apptId: appt.id }); rescheduleDoctorAppointment(appt, segStart, doc.id); } catch (err) { console.warn('[DND] seg-drop parse error', err); } }}>
                                                      <div className="text-xs font-medium text-gray-800">
                                                        {formatISTTime(segStart)}
                                                        {' '}
                                                        →
                                                        {' '}
                                                        {formatISTTime(segEnd)}
                                                      </div>
                                                      {inSeg.length === 0 ? (
                                                        <div className="text-xs text-gray-500 mt-1">Empty</div>
                                                      ) : (
                                                        <ul className="mt-1 space-y-1">
                                                          {inSeg.map((a) => (
                                                            <li key={a.id} className="flex items-center justify-between cursor-move" draggable onDragStart={(ev) => onDragStartAppointment(ev, a)}>
                                                              <div className="text-xs text-gray-800">Appt #{a.id} — {formatISTTime(getAppointmentISTDate(a))}</div>
                                                              <div>
                                                                <select
                                                                  className="border rounded px-2 py-1 text-xs"
                                                                  value={a.status}
                                                                  onChange={(e) => updateDoctorAppointmentStatus(doc.id, a.id, e.target.value)}
                                                                >
                                                                  <option value="PENDING">Pending</option>
                                                                  <option value="EMERGENCY">Emergency</option>
                                                                  <option value="CONFIRMED">Confirmed</option>
                                                                  <option value="CANCELLED">Cancelled</option>
                                                                  <option value="COMPLETED">Completed</option>
                                                                </select>
                                                              </div>
                                                            </li>
                                                          ))}
                                                        </ul>
                                                      )}
                                                    </li>
                                                  ))}
                                                </ul>
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      </li>
                                    );
                                  });
                                  if (slots.length === 0 && items.length > 0) {
                                    children.push(
                                      <li key={`fallback-${doc.id}`} className="border border-gray-200 rounded">
                                        <div className="px-3 py-2">
                                          <div className="text-sm font-medium text-gray-900">Appointments (no slots configured)</div>
                                        </div>
                                        <div className="px-3 pb-3">
                                          <ul className="space-y-2">
                                            {items.map((a) => (
                                              <li key={`appt-${a.id}`} className="border border-gray-100 rounded px-3 py-2 flex items-center justify-between cursor-move" draggable onDragStart={(ev) => onDragStartAppointment(ev, a)}>
                                                <div>
                                                  <div className="text-sm text-gray-800">Appt #{a.id} — {formatIST(getAppointmentISTDate(a))}</div>
                                                  <div className="text-xs text-gray-600">Patient: {((a.patient as any)?.name) || 'Patient'} • Status: {a.status}</div>
                                                </div>
                                                <div>
                                                  <select
                                                    className="border rounded px-2 py-1 text-xs"
                                                    value={a.status}
                                                    onChange={(e) => updateDoctorAppointmentStatus(doc.id, a.id, e.target.value)}
                                                  >
                                                    <option value="PENDING">Pending</option>
                                                    <option value="EMERGENCY">Emergency</option>
                                                    <option value="CONFIRMED">Confirmed</option>
                                                    <option value="CANCELLED">Cancelled</option>
                                                    <option value="COMPLETED">Completed</option>
                                                  </select>
                                                </div>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      </li>
                                    );
                                  }
                                  return children;
                                })()}
                              </ul>
                            )}
                            {/* Capacity-only Slot Boxes */}
                            {(() => {
                              const slots = (hospitalDoctorSlotsMap[doc.id] || []).filter((slot) => {
                                const slotStart = new Date(`${slot.date}T${String(slot.time).slice(0,5)}:00`);
                                const dayIdx = slotStart.getDay();
                                const wh = hospitalHoursInputs[dayIdx];
                                const hasTiming = selectedDoctorForTiming === doc.id && wh && wh.start && wh.end;
                                if (!hasTiming) return true;
                                const toMin = (t: string) => { const [hh, mm] = t.split(':').map(Number); return hh * 60 + mm; };
                                const startMin = slotStart.getHours() * 60 + slotStart.getMinutes();
                                const endMin = startMin + 60;
                                const whStart = toMin(wh.start);
                                const whEnd = toMin(wh.end);
                                return startMin >= whStart && endMin <= whEnd;
                              });
                              if (slots.length === 0) return null;
                              const period = Number(hospitalDoctorPeriodMap[doc.id] ?? doc?.doctorProfile?.slotPeriodMinutes ?? 15);
                              const count = Math.max(1, Math.floor(60 / Math.max(1, period)));
                              return (
                                <div className="mt-4">
                                  <div className="text-sm font-semibold text-gray-900 mb-2">Slot Boxes (Capacity View)</div>
                                  <p className="text-xs text-gray-600 mb-3">Each hour shows {count} user slots ({period} min each)</p>
                                  <ul className="space-y-3" onDragEnter={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {} }} onDragOver={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {} }}>
                                    {slots.map((slot) => {
                                      const slotStart = new Date(`${slot.date}T${String(slot.time).slice(0,5)}:00`);
                                      const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
                                      const slotAppointments = items.filter((a) => {
                                        const t = getAppointmentISTDate(a).getTime();
                                        return t >= slotStart.getTime() && t <= slotEnd.getTime();
                                      });
                                      const segments = Array.from({ length: count }, (_, idx) => {
                                        const segStart = new Date(slotStart.getTime() + idx * period * 60 * 1000);
                                        const segEnd = new Date(segStart.getTime() + period * 60 * 1000);
                                        const inSeg = slotAppointments.filter((a) => {
                                          const t = getAppointmentISTDate(a).getTime();
                                          return t >= segStart.getTime() && t < segEnd.getTime();
                                        });
                                        return { idx, segStart, segEnd, inSeg };
                                      });
                                      return (
                                        <li
                                          key={`cap-${slot.id}`}
                                          className={`rounded ${getSlotBoxColors(slotAppointments.length, slotStart, count)}`}
                                          data-hour-start={slotStart.toISOString()}
                                          data-doctor-id={String(slot.doctorId)}
                                          onDragEnter={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {}; try { const el = ev.currentTarget as HTMLElement; el.style.transition = 'transform 120ms ease, background-color 120ms ease, outline 120ms ease'; el.style.transform = 'scale(1.02)'; el.style.outline = '2px solid #60a5fa'; el.style.outlineOffset = '2px'; el.style.backgroundColor = '#f0f7ff'; } catch {} }}
                                          onDragLeave={(ev) => { try { const el = ev.currentTarget as HTMLElement; el.style.transform = ''; el.style.outline = ''; el.style.outlineOffset = ''; el.style.backgroundColor = ''; } catch {} }}
                                          onDragOver={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {} }}
                                          onDrop={(ev) => {
                                            ev.preventDefault();
                                            ev.stopPropagation();
                                            try { const el = ev.currentTarget as HTMLElement; el.style.transition = 'transform 140ms ease, background-color 140ms ease, outline 140ms ease'; el.style.transform = 'scale(1.05)'; el.style.outline = '2px solid #22c55e'; el.style.outlineOffset = '2px'; el.style.backgroundColor = '#ecfdf5'; setTimeout(() => { el.style.transform = ''; el.style.outline=''; el.style.outlineOffset=''; el.style.backgroundColor=''; }, 180); } catch {};
                                            dropHandledRef.current = true;
                                            const data = ev.dataTransfer.getData('appointment-json') || ev.dataTransfer.getData('text/plain');
                                            if (!data) { console.warn('[DND] drop: missing data'); return; }
                                            try {
                                              const appt = JSON.parse(data);
                                              console.log('[DND] slot-level drop', { targetStart: slotStart, doctorId: slot.doctorId, apptId: appt.id });
                                              rescheduleDoctorAppointment(appt, slotStart, slot.doctorId);
                                            } catch (err) { console.warn('[DND] drop parse error', err); }
                                          }}
                                        >
                                          <div className="px-3 py-2">
                                            <div className="text-sm font-medium text-gray-900">Slot #{slot.id}</div>
                                            <div className="text-sm text-gray-700">{formatIST(slotStart)} → {formatIST(slotEnd)}</div>
                                            <div className="text-xs text-gray-500">Status: {slot.status || 'UNKNOWN'}</div>
                                          </div>
                                          <div className="px-3 pb-3" onDragEnter={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {} }}
                                                    onDragOver={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {} }}>
                                            <ul className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                              {segments.map(({ idx, segStart, segEnd, inSeg }) => (
                                                <li
                                                  key={idx}
                                                  className={`rounded px-3 py-2 ${getSegmentBoxColors(inSeg.length, segStart)}`}
                                                  data-seg-start={segStart.toISOString()}
                                                  data-doctor-id={String(slot.doctorId)}
                                                  onDragEnter={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {}; try { const el = ev.currentTarget as HTMLElement; el.style.transition = 'transform 120ms ease, background-color 120ms ease, outline 120ms ease'; el.style.transform = 'scale(1.02)'; el.style.outline = '2px solid #60a5fa'; el.style.outlineOffset = '2px'; el.style.backgroundColor = '#f0f7ff'; } catch {} }}
                                                  onDragLeave={(ev) => { try { const el = ev.currentTarget as HTMLElement; el.style.transform = ''; el.style.outline = ''; el.style.outlineOffset = ''; el.style.backgroundColor = ''; } catch {} }}
                                                  onDragOver={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {} }}
                                                  onDrop={(ev) => {
                                                    ev.preventDefault();
                                                    ev.stopPropagation();
                                                    try { const el = ev.currentTarget as HTMLElement; el.style.transition = 'transform 140ms ease, background-color 140ms ease, outline 140ms ease'; el.style.transform = 'scale(1.05)'; el.style.outline = '2px solid #22c55e'; el.style.outlineOffset = '2px'; el.style.backgroundColor = '#ecfdf5'; setTimeout(() => { el.style.transform = ''; el.style.outline=''; el.style.outlineOffset=''; el.style.backgroundColor=''; }, 180); } catch {};
                                                    dropHandledRef.current = true;
                                                    const raw = ev.dataTransfer.getData('appointment-json') || ev.dataTransfer.getData('text/plain');
                                                    if (!raw) { console.warn('[DND] seg-drop: missing data'); return; }
                                                    try {
                                                      const appt = JSON.parse(raw);
                                                      console.log('[DND] seg-level drop', { targetStart: segStart, doctorId: slot.doctorId, apptId: appt.id });
                                                      rescheduleDoctorAppointment(appt, segStart, slot.doctorId);
                                                    } catch (err) { console.warn('[DND] seg-drop parse error', err); }
                                                  }}
                                                >
                                                  <div className="text-xs font-medium text-gray-800">
                                                    {formatISTTime(segStart)} → {formatISTTime(segEnd)}
                                                  </div>
                                                  <div className="text-xs text-gray-600 mt-1">Users: {inSeg.length}</div>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-6 border rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                      <div className="font-semibold text-gray-900">Doctor Timing</div>
                      <div className="flex items-center gap-2">
                        <select
                          className="border rounded px-3 py-2 text-sm"
                          value={selectedDoctorForTiming ?? ''}
                          onChange={async (e) => {
                            const val = Number(e.target.value);
                            setSelectedDoctorForTiming(Number.isInteger(val) && val > 0 ? val : null);
                            if (Number.isInteger(val) && val > 0) await loadHospitalDoctorWorkingHours(val);
                          }}
                        >
                          <option value="">Select a doctor</option>
                          {hospitalDoctors.map((d) => (
                            <option key={d.id} value={d.id}>Dr. {getDoctorLabel(d)}</option>
                          ))}
                        </select>
                        <button onClick={() => selectedDoctorForTiming && loadHospitalDoctorWorkingHours(selectedDoctorForTiming)} className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded">Refresh</button>
                      </div>
                    </div>
                    <div className="p-4">
                      {selectedDoctorForTiming ? (
                        <div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map((day, idx) => (
                              <div key={idx} className="border border-gray-200 rounded p-3 bg-gray-50">
                                <div className="font-medium mb-2">{day}</div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">Start</label>
                                    <input type="time" value={hospitalHoursInputs[idx]?.start ?? ''} onChange={(e) => setHospitalHoursInputs((prev) => ({ ...prev, [idx]: { start: e.target.value, end: prev[idx]?.end ?? '' } }))} className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white text-gray-900 placeholder-gray-400" />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">End</label>
                                    <input type="time" value={hospitalHoursInputs[idx]?.end ?? ''} onChange={(e) => setHospitalHoursInputs((prev) => ({ ...prev, [idx]: { start: prev[idx]?.start ?? '', end: e.target.value } }))} className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white text-gray-900 placeholder-gray-400" />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4">
                            <button onClick={saveHospitalDoctorWorkingHours} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Save Timing</button>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">These hours define booking windows per day for the selected doctor.</p>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-600">Select a doctor to configure timing.</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : appointments.length > 0 ? (
                user.role === 'DOCTOR' ? (
                  <div className="space-y-8">
                    {appointmentViewMode === 'grouped' ? (
                      <>
                        {/* Doctor-only controls */}
                        {/* Pending Bookings (time has passed, today) */}
                        {(() => {
                          const fmtDateIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
                          const todayStr = fmtDateIST.format(getISTNow());
                          const nowTs = getISTNow().getTime();
                          const pendingToday = appointments.filter((a) => {
                            const d = getAppointmentISTDate(a);
                            const isToday = fmtDateIST.format(d) === todayStr;
                            return isToday && d.getTime() < nowTs && a.status === 'PENDING';
                          });
                          if (pendingToday.length === 0) return null;
                          return (
                            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
                              <div className="px-6 py-4 border-b border-yellow-200 flex items-center justify-between">
                                <h4 className="text-md font-semibold text-gray-900">Pending Bookings</h4>
                                <div className="text-xs text-gray-600">Time passed, awaiting action</div>
                              </div>
                              <div className="p-4 space-y-2">
                                {pendingToday.map((appointment) => (
                                  <div key={appointment.id} className="border rounded px-3 py-2">
                                    <div className="text-sm font-medium text-gray-900">{formatIST(getAppointmentISTDate(appointment), { dateStyle: 'medium', timeStyle: 'short', hour12: false })}</div>
                                    <div className="text-xs text-gray-600">Patient: {((appointment.patient as any)?.name) || 'Patient'} • Status: {appointment.status}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {/* History of Bookings (previous days) toggle */}
                        <div className="flex justify-end mt-2">
                          <button
                            onClick={() => setShowDoctorHistory((v) => !v)}
                            className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
                          >
                            {showDoctorHistory ? 'Hide History' : 'Show History'}
                          </button>
                        </div>
                        {showDoctorHistory && (() => {
                          const fmtDateIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
                          const todayStr = fmtDateIST.format(getISTNow());
                          const history = appointments.filter((a) => fmtDateIST.format(getAppointmentISTDate(a)) < todayStr);
                          if (history.length === 0) return <div className="text-sm text-gray-600">No previous bookings.</div>;
                          return (
                            <div className="bg-white shadow-lg rounded-lg overflow-hidden mt-2">
                              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                                <h4 className="text-md font-semibold text-gray-900">History of Bookings</h4>
                                <div className="text-xs text-gray-600">Previous days</div>
                              </div>
                              <div className="p-4 space-y-2">
                                {history.map((appointment) => (
                                  <div key={appointment.id} className="border rounded px-3 py-2">
                                    <div className="text-sm font-medium text-gray-900">{formatIST(getAppointmentISTDate(appointment), { dateStyle: 'medium', timeStyle: 'short', hour12: false })}</div>
                                    <div className="text-xs text-gray-600">Patient: {((appointment.patient as any)?.name) || 'Patient'} • Status: {appointment.status}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Capacity-only Slot Boxes (Appointments) */}
                        {(() => {
                          const period = Number(doctorProfile?.slotPeriodMinutes ?? 15);
                          const count = Math.max(1, Math.floor(60 / Math.max(1, period)));
                          const fmtDateIST2 = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
                          const dateWithAppointments = new Set(appointments.map((a) => fmtDateIST2.format(getAppointmentISTDate(a))));
                          const capacitySlots = slots.filter((slot) => dateWithAppointments.has(slot.date));
                          const list = capacitySlots.length > 0 ? capacitySlots : slots;
                          if (list.length === 0) {
                            const today = getISTNow();
                            const todayStr = fmtDateIST2.format(today);
                            let dates = Array.from(dateWithAppointments).filter((d) => d >= todayStr).sort((a, b) => a.localeCompare(b));
                            // Fallback: show capacity boxes for the next 7 days when there are no appointments or slots
                            if (dates.length === 0) {
                              dates = Array.from({ length: 7 }, (_, i) => {
                                const d = new Date(today);
                                d.setDate(today.getDate() + i);
                                return fmtDateIST2.format(d);
                              });
                            }
                            return (
                              <div className="space-y-4 mt-2" onDragEnterCapture={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {} }} onDragOverCapture={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {} }}>
                                <div className="flex items-center justify-between mb-6">
                                  <div>
                                    <h4 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Slot Boxes (Capacity)</h4>
                                    <p className="text-sm text-gray-600 mt-1">Visual capacity management for appointment slots</p>
                                  </div>
                                  <div className="flex items-center space-x-3">
                                    <label className="text-sm text-gray-700">Filter:</label>
                                    <select
                                      value={doctorStatusFilter}
                                      onChange={(e) => setDoctorStatusFilter(e.target.value as any)}
                                      className="border rounded-md px-2 py-1 text-sm"
                                    >
                                      <option value="ALL">All</option>
                                      <option value="CONFIRMED">Confirmed</option>
                                      <option value="PENDING">Pending</option>
                                      <option value="EMERGENCY">Emergency</option>
                                      <option value="CANCELLED">Cancelled</option>
                                    </select>
                                  </div>
                                </div>
                                {dates.map((dateKey) => {
                                  let avail = availabilityByDate[dateKey];
                                  if (!avail || !Array.isArray(avail.hours) || avail.hours.length === 0) {
                                    // Local fallback to show capacity instantly without waiting for network
                                    const periodMinutes = Number(doctorProfile?.slotPeriodMinutes ?? 15);
                                    const localCapacity = Math.max(1, Math.floor(60 / Math.max(1, periodMinutes)));
                                    avail = {
                                      periodMinutes,
                                      hours: Array.from({ length: 24 }, (_, h) => ({
                                        hour: String(h).padStart(2, '0') + ':00',
                                        capacity: localCapacity,
                                        bookedCount: 0,
                                        isFull: false,
                                        labelFrom: `${String(h).padStart(2, '0')}:00`,
                                        labelTo: `${String((h + 1) % 24).padStart(2, '0')}:00`,
                                      })),
                                    };
                                  }
                                  return (
                                    <div key={dateKey} className="border border-gray-200 rounded">
                                      <div className="px-3 py-2">
                                        <div className="text-sm font-medium text-gray-900">{formatIST(new Date(`${dateKey}T00:00:00`), { dateStyle: 'medium' })}</div>
                                        <div className="text-xs text-gray-600">Period: {avail.periodMinutes} min</div>
                                      </div>
                                      <div className="px-3 pb-3">
                                        <ul className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                          {avail.hours.map((h, idx) => {
                                            const start = new Date(`${dateKey}T${h.hour}:00`);
                                            const end = new Date(start.getTime() + 60 * 60 * 1000);
                                            const filteredBooked = appointments.filter((a) => {
                                              const t = getAppointmentISTDate(a).getTime();
                                              return (
                                                t >= start.getTime() &&
                                                t < end.getTime() &&
                                                (doctorStatusFilter === 'ALL' || a.status === doctorStatusFilter)
                                              );
                                            }).length;
                                            const hourAppointments = appointments.filter((a) => {
                                              const t = getAppointmentISTDate(a).getTime();
                                              return (
                                                t >= start.getTime() &&
                                                t < end.getTime() &&
                                                (doctorStatusFilter === 'ALL' || a.status === doctorStatusFilter)
                                              );
                                            });
                                            const isFull = hourAppointments.length >= h.capacity;
                                            return (
                                              <li key={`${dateKey}-${idx}`} className={`rounded px-3 py-2 ${getSlotBoxColors(hourAppointments.length, start, h.capacity)}`} data-hour-start={start.toISOString()} data-doctor-id={String(user.id)} onDragEnter={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {}; try { const el = ev.currentTarget as HTMLElement; el.style.transition = 'transform 120ms ease, background-color 120ms ease, outline 120ms ease'; el.style.transform = 'scale(1.02)'; el.style.outline = '2px solid #60a5fa'; el.style.outlineOffset = '2px'; el.style.backgroundColor = '#f0f7ff'; } catch {} }} onDragLeave={(ev) => { try { const el = ev.currentTarget as HTMLElement; el.style.transform = ''; el.style.outline = ''; el.style.outlineOffset = ''; el.style.backgroundColor = ''; } catch {} }} onDragOver={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {} }} onDrop={(ev) => { ev.preventDefault(); ev.stopPropagation(); try { const el = ev.currentTarget as HTMLElement; el.style.transition = 'transform 140ms ease, background-color 140ms ease, outline 140ms ease'; el.style.transform = 'scale(1.05)'; el.style.outline = '2px solid #22c55e'; el.style.outlineOffset = '2px'; el.style.backgroundColor = '#ecfdf5'; setTimeout(() => { el.style.transform = ''; el.style.outline=''; el.style.outlineOffset=''; el.style.backgroundColor=''; }, 180); } catch {}; dropHandledRef.current = true; const data = ev.dataTransfer.getData('appointment-json') || ev.dataTransfer.getData('text/plain'); if (!data) { console.warn('[DND] hour-availability-drop: missing data'); return; } try { const appt = JSON.parse(data); console.log('[DND] hour-availability drop', { targetStart: start, doctorId: user.id, apptId: appt.id }); rescheduleDoctorAppointment(appt, start, user.id as number); } catch (err) { console.warn('[DND] hour-availability parse error', err); } }}>
                                                <div className="text-xs font-medium text-gray-800">
                                                  {h.labelFrom} → {h.labelTo}
                                                </div>
                                                <div className="text-xs text-gray-600 mt-1">Capacity: {h.capacity}</div>
                                                <div className="text-xs text-gray-600">Booked: {hourAppointments.length}</div>
                                                <div className="text-xs text-gray-600">Free: {Math.max(0, h.capacity - hourAppointments.length)}</div>
                                                {hourAppointments.length > 0 && (
                                                  <ul className="mt-2 space-y-2">
                                                    {hourAppointments.map((appointment) => (
                                                      <li key={appointment.id} className="flex items-center justify-between cursor-move" draggable onDragStart={(ev) => onDragStartAppointment(ev, appointment)}>
                                                        <div className="min-w-0">
                                                          <p className="text-xs font-medium text-gray-900 truncate">
                                                            {((appointment.patient as any)?.name) || 'Patient'}
                                                          </p>
                                                          {appointment.reason && (
                                                            <p className="text-[11px] text-gray-600 truncate">
                                                              {appointment.reason}
                                                            </p>
                                                          )}
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                          <span className={`px-2 py-1 rounded-full text-[11px] font-medium ${
                                                            appointment.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                                                            appointment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                                            appointment.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                                            'bg-gray-100 text-gray-800'
                                                          }`}>
                                                            {appointment.status}
                                                          </span>
                                                          <button
                                                            className="text-blue-600 hover:text-blue-900 text-[11px]"
                                                            onClick={() => updateDoctorAppointmentStatus(appointment.doctorId, appointment.id, appointment.status === 'CONFIRMED' ? 'PENDING' : 'CONFIRMED')}
                                                          >
                                                            Update
                                                          </button>
                                                          <button
                                                            className="text-red-600 hover:text-red-900 text-[11px]"
                                                            onClick={() => updateDoctorAppointmentStatus(appointment.doctorId, appointment.id, 'CANCELLED')}
                                                          >
                                                            Cancel
                                                          </button>
                                                        </div>
                                                      </li>
                                                    ))}
                                                  </ul>
                                                )}
                                              </li>
                                            );
                                          })}
                                        </ul>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          }
                          return (
                            <div className="space-y-4 mt-2" onDragEnter={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {} }} onDragOver={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {} }} >
                              <div className="flex items-center justify-between mb-6">
                                <div>
                                  <h4 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Slot Boxes (Capacity)</h4>
                                  <p className="text-sm text-gray-600 mt-1">Visual capacity management for appointment slots</p>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <label className="text-sm text-gray-700">Filter:</label>
                                  <select
                                    value={doctorStatusFilter}
                                    onChange={(e) => setDoctorStatusFilter(e.target.value as any)}
                                    className="border rounded-md px-2 py-1 text-sm"
                                  >
                                    <option value="ALL">All</option>
                                    <option value="CONFIRMED">Confirmed</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="EMERGENCY">Emergency</option>
                                    <option value="CANCELLED">Cancelled</option>
                                  </select>
                                </div>
                              </div>
                              <p className="text-xs text-gray-600">Each hour shows {count} user slots ({period} min each)</p>
                              <ul className="space-y-3" onDragEnter={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {} }} onDragOver={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {} }} >
                                {list
                                  .sort((a, b) =>
                                    new Date(`${a.date}T${String(a.time).slice(0, 5)}:00`).getTime() -
                                    new Date(`${b.date}T${String(b.time).slice(0, 5)}:00`).getTime()
                                  )
                                  .map((slot) => {
                                    const slotStart = new Date(`${slot.date}T${String(slot.time).slice(0, 5)}:00`);
                                    const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
                                    const slotAppointments = appointments.filter((a) => {
                                      const t = getAppointmentISTDate(a).getTime();
                                      return (
                                        t >= slotStart.getTime() &&
                                        t <= slotEnd.getTime() &&
                                        (doctorStatusFilter === 'ALL' || a.status === doctorStatusFilter)
                                      );
                                    });
                                    const segments = Array.from({ length: count }, (_, idx) => {
                                      const segStart = new Date(slotStart.getTime() + idx * period * 60 * 1000);
                                      const segEnd = new Date(segStart.getTime() + period * 60 * 1000);
                                      const inSeg = slotAppointments.filter((a) => {
                                        const t = getAppointmentISTDate(a).getTime();
                                        return t >= segStart.getTime() && t < segEnd.getTime();
                                      });
                                      return { idx, segStart, segEnd, inSeg };
                                    });
                                    return (
                                      <li
                                        key={`appt-cap-${slot.id}`}
                                        className="border border-gray-200 rounded hover:bg-blue-50"
                                        data-hour-start={slotStart.toISOString()}
                                        data-doctor-id={String(slot.doctorId)}
                                         onDragEnter={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {} }}
                                          onDragOver={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {} }}
                                         onDrop={(ev) => {
                                           ev.preventDefault();
                                           ev.stopPropagation();
                                           const data = ev.dataTransfer.getData('appointment-json') || ev.dataTransfer.getData('text/plain');
                                           if (!data) { console.warn('[DND] drop: missing data'); return; }
                                           try {
                                             const appt = JSON.parse(data);
                                             console.log('[DND] slot-level drop', { targetStart: slotStart, doctorId: slot.doctorId, apptId: appt.id });
                                             rescheduleDoctorAppointment(appt, slotStart, slot.doctorId);
                                           } catch (err) { console.warn('[DND] drop parse error', err); }
                                         }}
                                      >
                                        <div className="px-3 py-2">
                                          <div className="text-sm font-medium text-gray-900">
                                            {formatIST(slotStart, { dateStyle: 'medium' })} •{' '}
                                            {formatISTTime(slotStart)} →{' '}
                                        {formatISTTime(slotEnd)}
                                          </div>
                                          <div className="text-xs text-gray-500">Slot #{slot.id} • Status: {slot.status || 'UNKNOWN'}</div>
                                        </div>
                                        <div className="px-3 pb-3" onDragEnter={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {} }}
                                                  onDragOver={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {} }}>
                                          <ul className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            {segments.map(({ idx, segStart, segEnd, inSeg }) => (
                                              <li
                                                key={idx}
                                                className="border border-gray-200 rounded px-3 py-2 hover:bg-blue-50"
                                                data-seg-start={segStart.toISOString()}
                                                data-doctor-id={String(slot.doctorId)}
                                                 onDragEnter={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {} }}
                                                 onDragOver={(ev) => { ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch {} }}
                                                 onDrop={(ev) => {
                                                   ev.preventDefault();
                                                   ev.stopPropagation();
                                                   const data = ev.dataTransfer.getData('appointment-json') || ev.dataTransfer.getData('text/plain');
                                                   if (!data) { console.warn('[DND] seg-drop: missing data'); return; }
                                                   try {
                                                     const appt = JSON.parse(data);
                                                     console.log('[DND] seg-level drop', { targetStart: segStart, doctorId: slot.doctorId, apptId: appt.id });
                                                     rescheduleDoctorAppointment(appt, segStart, slot.doctorId);
                                                   } catch (err) { console.warn('[DND] seg-drop parse error', err); }
                                                 }}
                                              >
                                                <div className="text-xs font-medium text-gray-800">
                                                  {formatISTTime(segStart)} →{' '}
                                                  {formatISTTime(segEnd)}
                                                </div>
                                                <div className="text-xs text-gray-600 mt-1">Users: {inSeg.length}</div>
                                                {inSeg.length > 0 && (
                                                  <ul className="mt-2 space-y-2">
                                                    {inSeg.map((appointment) => (
                                                      <li key={appointment.id} className="flex items-center justify-between cursor-move" draggable onDragStart={(ev) => onDragStartAppointment(ev, appointment)}>
                                                        <div className="min-w-0">
                                                          <p className="text-xs font-medium text-gray-900 truncate">
                                                            {((appointment.patient as any)?.name) || 'Patient'}
                                                          </p>
                                                          {appointment.reason && (
                                                            <p className="text-[11px] text-gray-600 truncate">
                                                              {appointment.reason}
                                                            </p>
                                                          )}
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                          <span className={`px-2 py-1 rounded-full text-[11px] font-medium ${
                                                            appointment.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                                                            appointment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                                            appointment.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                                            'bg-gray-100 text-gray-800'
                                                          }`}>
                                                            {appointment.status}
                                                          </span>
                                                          <button
                                                            className="text-blue-600 hover:text-blue-900 text-[11px]"
                                                            onClick={() => updateDoctorAppointmentStatus(appointment.doctorId, appointment.id, appointment.status === 'CONFIRMED' ? 'PENDING' : 'CONFIRMED')}
                                                          >
                                                            Update
                                                          </button>
                                                          <button
                                                            className="text-red-600 hover:text-red-900 text-[11px]"
                                                            onClick={() => updateDoctorAppointmentStatus(appointment.doctorId, appointment.id, 'CANCELLED')}
                                                          >
                                                            Cancel
                                                          </button>
                                                        </div>
                                                      </li>
                                                    ))}
                                                  </ul>
                                                )}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      </li>
                                    );
                                  })}
                              </ul>
                            </div>
                          );
                        })()}
                      </>
                    ) : (
                      <>
                        {/* Doctor list view */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <label className="text-sm text-gray-700">Filter:</label>
                            <select
                              value={doctorStatusFilter}
                              onChange={(e) => setDoctorStatusFilter(e.target.value as any)}
                              className="border rounded-md px-2 py-1 text-sm"
                            >
                              <option value="ALL">All</option>
                              <option value="CONFIRMED">Confirmed</option>
                              <option value="PENDING">Pending</option>
                              <option value="EMERGENCY">Emergency</option>
                              <option value="CANCELLED">Cancelled</option>
                            </select>
                          </div>
                        </div>
                        <ul className="space-y-3 mt-4">
                          {appointments
                            .filter((a) => doctorStatusFilter === 'ALL' || a.status === doctorStatusFilter)
                            .sort((a, b) => getAppointmentISTDate(a).getTime() - getAppointmentISTDate(b).getTime())
                            .map((appointment) => (
                              <li key={appointment.id} className="bg-white border rounded-md p-3 flex items-center justify-between">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{formatIST(getAppointmentISTDate(appointment))}</p>
                                  <p className="text-xs text-gray-700 truncate">Patient: {((appointment.patient as any)?.name) || 'Patient'}</p>
                                  {appointment.reason && (
                                    <p className="text-xs text-gray-600 truncate">{appointment.reason}</p>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    appointment.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                                    appointment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                    appointment.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {appointment.status}
                                  </span>
                                  <button className="text-blue-600 hover:text-blue-900 text-xs">Update</button>
                                  <button className="text-red-600 hover:text-red-900 text-xs">Cancel</button>
                                </div>
                              </li>
                            ))}
                        </ul>
                      </>
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
              <h3 className="text-xl font-bold text-white flex items-center">
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
                <h3 className="text-xl font-bold text-white flex items-center">
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
        <h3 className="text-xl font-bold text-white flex items-center">
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
                className="border-2 border-gray-300 rounded-xl px-4 py-3 w-full focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
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
          <div className="space-y-4">
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
        const res = await apiClient.getHospitalSlotAdmin();
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
          <div className="space-y-4">
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
            <div className="space-y-4">
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
            <div className="space-y-4">
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
