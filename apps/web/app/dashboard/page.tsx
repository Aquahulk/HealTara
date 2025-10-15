// ============================================================================
// 🏥 DOCTOR DASHBOARD - Modern Practice Management System
// ============================================================================
// This is the main dashboard for doctors to manage their practice
// It includes appointment management, website customization, and practice analytics
// Features a modern, professional interface with comprehensive functionality
// 
// IMPORTANT: This dashboard provides doctors with complete control over their practice
// ============================================================================

// ============================================================================
// 📦 EXTERNAL DEPENDENCIES - What we're importing and why
// ============================================================================
'use client';                                              // Enable React hooks and client-side features
import { useState, useEffect } from 'react';               // React hooks for state management and side effects
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
  EnvelopeIcon
} from '@heroicons/react/24/outline';                      // Heroicons for beautiful icons
import { doctorMicrositeUrl, hospitalMicrositeUrl } from '@/lib/subdomain';

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
}

interface DashboardStats {
  totalAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;
  totalPatients: number;
  monthlyRevenue: number;
  websiteViews: number;
}

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
  const [doctorStatusFilter, setDoctorStatusFilter] = useState<'ALL'|'CONFIRMED'|'PENDING'|'CANCELLED'|'EMERGENCY'>('ALL'); // Doctor-only filter
  const [collapsedHourKeys, setCollapsedHourKeys] = useState<Record<string, boolean>>({}); // Collapse per hour box
  const [hospitalProfile, setHospitalProfile] = useState<any | null>(null); // Hospital profile data (admin)
  const [hospitalDoctors, setHospitalDoctors] = useState<Array<{ id: number; email: string; doctorProfile?: any }>>([]); // Linked doctors
  const [doctorAppointmentsMap, setDoctorAppointmentsMap] = useState<Record<number, Appointment[]>>({}); // Appointments per doctor
  const [loadingHospitalBookings, setLoadingHospitalBookings] = useState(false); // Loading flag for hospital bookings
  const [hospitalDoctorSlotsMap, setHospitalDoctorSlotsMap] = useState<Record<number, Slot[]>>({}); // Slots per doctor (hospital admin)
  const [selectedDoctorForTiming, setSelectedDoctorForTiming] = useState<number | null>(null);
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
  const isDoctorLike = !!(user && (user.role === 'DOCTOR' || user.role === 'HOSPITAL_ADMIN'));

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
          // Fetch hospital info for admin
          try {
            const myHospital = await apiClient.getMyHospital();
            setHospitalProfile(myHospital || null);
          } catch (e) {
            console.warn('Failed to load hospital profile:', e);
            setHospitalProfile(null);
          }

          // Hospital admins: doctor-specific profile not applicable
          setDoctorProfile(null);
          setStats({
            totalAppointments: appointmentsResult.length,
            pendingAppointments: appointmentsResult.filter(a => a.status === 'PENDING').length,
            completedAppointments: appointmentsResult.filter(a => a.status === 'COMPLETED').length,
            totalPatients: 0,
            monthlyRevenue: 0,
            websiteViews: 0,
          });
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

  // Load hospital doctors and their bookings for hospital admins
  useEffect(() => {
    const loadHospitalBookings = async () => {
      if (!user || user.role !== 'HOSPITAL_ADMIN' || !hospitalProfile?.id) return;
      try {
        setLoadingHospitalBookings(true);
        // Fetch detailed hospital info to get linked doctors
        const details = await apiClient.getHospitalDetails(hospitalProfile.id);
        const links = ((details?.doctors || []) as Array<any>)
          .map((l) => l?.doctor)
          .filter((d) => d && typeof d.id === 'number');
        setHospitalDoctors(links);

        const perDoctor: Record<number, Appointment[]> = {};
        const perDoctorSlots: Record<number, Slot[]> = {};
        await Promise.all(
          links.map(async (d) => {
            try {
              const [items, s] = await Promise.all([
                apiClient.getHospitalDoctorAppointments(hospitalProfile.id, d.id),
                apiClient.getSlots({ doctorId: d.id }),
              ]);
              perDoctor[d.id] = Array.isArray(items) ? items : [];
              perDoctorSlots[d.id] = Array.isArray(s) ? s : [];
            } catch {
              if (!perDoctor[d.id]) perDoctor[d.id] = [];
              if (!perDoctorSlots[d.id]) perDoctorSlots[d.id] = [];
            }
          })
        );
        setDoctorAppointmentsMap(perDoctor);
        setHospitalDoctorSlotsMap(perDoctorSlots);
      } catch (e) {
        console.warn('Failed to load hospital doctor bookings:', e);
      } finally {
        setLoadingHospitalBookings(false);
      }
    };

    loadHospitalBookings();
  }, [user, hospitalProfile]);

  // Update appointment status (hospital admin -> per doctor)
  const updateDoctorAppointmentStatus = async (doctorId: number, appointmentId: number, newStatus: string) => {
    if (!hospitalProfile?.id) return;
    // Optimistically update UI immediately, then reconcile with server response
    let previous: Appointment[] | undefined;
    setDoctorAppointmentsMap((prev) => {
      previous = prev[doctorId];
      const nextList = (prev[doctorId] || []).map((a) =>
        a.id === appointmentId ? { ...a, status: newStatus } : a
      );
      return { ...prev, [doctorId]: nextList };
    });
    // Broadcast to other dashboards (e.g., Slot Admin) for instant reflection
    try {
      const bc = new BroadcastChannel('appointments-updates');
      bc.postMessage({ type: 'appointment-update', id: appointmentId, status: newStatus });
      bc.close();
    } catch {}
    try {
      const updated = await apiClient.updateHospitalDoctorAppointment(
        hospitalProfile.id,
        doctorId,
        appointmentId,
        { status: newStatus }
      );
      setDoctorAppointmentsMap((prev) => ({
        ...prev,
        [doctorId]: (prev[doctorId] || []).map((a) => (a.id === appointmentId ? updated : a)),
      }));
    } catch (e: any) {
      // Revert on failure
      setDoctorAppointmentsMap((prev) => ({
        ...prev,
        [doctorId]: previous || (prev[doctorId] || []),
      }));
      alert(e?.message || 'Failed to update appointment status');
    }
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
      } else if (msg?.type === 'appointment-cancel') {
        setDoctorAppointmentsMap((prev) => {
          const next: Record<number, Appointment[]> = { ...prev };
          Object.keys(next).forEach((key) => {
            const did = Number(key);
            next[did] = (next[did] || []).filter((a) => a.id !== msg.id);
          });
          return next;
        });
      } else if (msg?.type === 'appointment-booked') {
        // On patient booking, refresh that doctor's appointments and slots for instant reflection
        const payload = msg?.payload || {};
        const did = Number(payload.doctorId);
        if (!did) return;

        const refreshForHospital = async (hid: number) => {
          try {
            const [items, slots] = await Promise.all([
              apiClient.getHospitalDoctorAppointments(hid, did),
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
    list.forEach((a) => {
      const d = new Date(a.date);
      const dateKey = d.toISOString().slice(0, 10); // stable date key
      const hour = d.getHours();
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
    const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
    return `${start.toLocaleTimeString([], opts)} - ${end.toLocaleTimeString([], opts)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ============================================================================
          🎨 HEADER SECTION - Dashboard header with navigation
          ============================================================================ */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="text-3xl">🏥</div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {isDoctorLike ? 'Doctor Dashboard' : 'Patient Dashboard'}
                </h1>
                <p className="text-gray-600">
                  Welcome back, {user.role === 'DOCTOR' ? 'Dr. ' : ''}{user.email}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-gray-600">
                <BellIcon className="h-6 w-6" />
                <span className="text-sm">Notifications</span>
              </div>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ============================================================================
          📊 MAIN CONTENT - Dashboard content with tabs
          ============================================================================ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ============================================================================
            🧭 NAVIGATION TABS - Tab navigation for different sections
            ============================================================================ */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
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
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white overflow-hidden shadow-lg rounded-lg">
                  <div className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <CalendarIcon className="h-8 w-8 text-blue-600" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Total Appointments</dt>
                          <dd className="text-2xl font-bold text-gray-900">{stats.totalAppointments}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow-lg rounded-lg">
                  <div className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <ClockIcon className="h-8 w-8 text-yellow-600" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                          <dd className="text-2xl font-bold text-gray-900">{stats.pendingAppointments}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow-lg rounded-lg">
                  <div className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <UserGroupIcon className="h-8 w-8 text-green-600" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            {user.role === 'DOCTOR' ? 'Total Patients' : 'Doctors Visited'}
                          </dt>
                          <dd className="text-2xl font-bold text-gray-900">{stats.totalPatients}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow-lg rounded-lg">
                  <div className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <CurrencyDollarIcon className="h-8 w-8 text-purple-600" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            {user.role === 'DOCTOR' ? 'Monthly Revenue' : 'Total Spent'}
                          </dt>
                          <dd className="text-2xl font-bold text-gray-900">₹{stats.monthlyRevenue}</dd>
                        </dl>
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
              <div className="bg-white shadow-lg rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Practice Information</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4">{doctorProfile.clinicName}</h4>
                      <div className="space-y-3">
                        <div className="flex items-center text-gray-600">
                          <MapPinIcon className="h-5 w-5 mr-3" />
                          <span>{doctorProfile.clinicAddress}, {doctorProfile.city}, {doctorProfile.state}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <PhoneIcon className="h-5 w-5 mr-3" />
                          <span>{doctorProfile.phone}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <EnvelopeIcon className="h-5 w-5 mr-3" />
                          <span>{user.email}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h5 className="font-medium text-blue-900 mb-2">Specialization</h5>
                        <p className="text-blue-800">{doctorProfile.specialization}</p>
                        <div className="mt-3">
                          <h5 className="font-medium text-blue-900 mb-2">Consultation Fee</h5>
                          <p className="text-2xl font-bold text-blue-800">₹{doctorProfile.consultationFee}</p>
                        </div>
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
                {appointments.length > 0 ? (
                  <div className="space-y-4">
                    {appointments.slice(0, 5).map((appointment) => (
                      <div key={appointment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">
                            {new Date(appointment.date).toLocaleDateString()} at {new Date(appointment.date).toLocaleTimeString()}
                          </p>
                                                     <p className="text-gray-600">
                             {user.role === 'DOCTOR' ? `Patient: ${appointment.patient.email}` : `Doctor: ${appointment.doctor?.email || 'Unknown Doctor'}`}
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
                ) : (
                  <p className="text-gray-500 text-center py-8">No appointments found</p>
                )}
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
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Create Availability Slot</h3>
                <p className="text-sm text-gray-600 mt-1">Publish times patients can book</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={slotDate}
                      onChange={(e) => setSlotDate(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                    <input
                      type="time"
                      value={slotTime}
                      onChange={(e) => setSlotTime(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleCreateSlot}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200"
                    >
                      Publish Slot
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Slot List */}
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">My Slots</h3>
              </div>
              <div className="p-6">
                {slots.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {slots.map((slot, idx) => (
                          <tr key={slot.id ?? `${String(slot.date ?? '')}-${String(slot.time ?? '')}-${idx}`}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{slot.date}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{slot.time}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                slot.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                                slot.status === 'BOOKED' ? 'bg-blue-100 text-blue-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {slot.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {slot.status === 'AVAILABLE' && (
                                <button
                                  onClick={() => handleCancelSlot(slot.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Cancel
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No slots published yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================================
            📅 APPOINTMENTS TAB - Appointment management interface
            ============================================================================ */}
        {activeTab === 'appointments' && (
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {user.role === 'DOCTOR' ? 'Appointment Management' : user.role === 'HOSPITAL_ADMIN' ? 'Hospital Bookings by Doctor' : 'My Appointments'}
              </h3>
            </div>
            <div className="p-6">
              {user.role === 'HOSPITAL_ADMIN' ? (
                <div>
                  {loadingHospitalBookings && (
                    <div className="text-center py-4 text-gray-600">Loading doctor bookings…</div>
                  )}
                  {(!loadingHospitalBookings && hospitalDoctors.length === 0) && (
                    <div className="text-center py-8 text-gray-600">No doctors linked to your hospital yet.</div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {hospitalDoctors.map((doc) => {
                      const items = doctorAppointmentsMap[doc.id] || [];
                      return (
                        <div key={doc.id} className="border rounded-lg overflow-hidden">
                          <div className="px-4 py-3 border-b bg-gray-50">
                            <div className="font-semibold text-gray-900">Doctor: {doc.email}</div>
                            {doc.doctorProfile?.clinicName && (
                              <div className="text-sm text-gray-600">{doc.doctorProfile.clinicName}</div>
                            )}
                          </div>
                  <div className="p-4">
                            {(items.length === 0 && (hospitalDoctorSlotsMap[doc.id] || []).length === 0) ? (
                              <div className="text-sm text-gray-500">No bookings or slots found for this doctor.</div>
                            ) : (
                              <ul className="space-y-4">
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
                                  const children = slots.map((slot) => {
                                    const slotStart = new Date(`${slot.date}T${String(slot.time).slice(0,5)}:00`);
                                    const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
                                    const slotAppointments = items.filter((a) => {
                                      const t = new Date(a.date).getTime();
                                      return t >= slotStart.getTime() && t <= slotEnd.getTime();
                                    });
                                    return (
                                      <li key={slot.id} className="border border-gray-200 rounded">
                                        <div className="px-3 py-2">
                                          <div className="text-sm font-medium text-gray-900">Slot #{slot.id}</div>
                                          <div className="text-sm text-gray-700">{slotStart.toLocaleString()} → {slotEnd.toLocaleString()}</div>
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
                                        <div className="px-3 pb-3">
                                          {slotAppointments.length === 0 ? (
                                            <div className="text-sm text-gray-500">No bookings in this slot.</div>
                                          ) : (
                                            <ul className="space-y-2">
                                              {slotAppointments.map((a) => (
                                                <li key={a.id} className="border border-gray-100 rounded px-3 py-2 flex items-center justify-between">
                                                  <div>
                                                    <div className="text-sm text-gray-800">Appt #{a.id} — {new Date(a.date).toLocaleTimeString()}</div>
                                                    <div className="text-xs text-gray-600">Patient: {a.patient?.email || a.patientId} • Status: {a.status}</div>
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
                                          )}
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
                                              <li key={`appt-${a.id}`} className="border border-gray-100 rounded px-3 py-2 flex items-center justify-between">
                                                <div>
                                                  <div className="text-sm text-gray-800">Appt #{a.id} — {new Date(a.date).toLocaleString()}</div>
                                                  <div className="text-xs text-gray-600">Patient: {a.patient?.email || a.patientId} • Status: {a.status}</div>
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
                            <option key={d.id} value={d.id}>{d.email}</option>
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
                    {/* Doctor-only controls */}
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
                      <button
                        className="text-sm text-blue-600 hover:text-blue-800"
                        onClick={() => {
                          const groups = groupAppointmentsByDateHour(appointments);
                          const next: Record<string, boolean> = {};
                          let anyOpen = false;
                          Object.entries(groups).forEach(([dateKey, hours]) => {
                            Object.keys(hours).forEach((h) => {
                              const k = `${dateKey}-${h}`;
                              if (!collapsedHourKeys[k]) anyOpen = true;
                            });
                          });
                          Object.entries(groups).forEach(([dateKey, hours]) => {
                            Object.keys(hours).forEach((h) => {
                              const k = `${dateKey}-${h}`;
                              next[k] = anyOpen; // if any were open, close all; otherwise open all
                            });
                          });
                          setCollapsedHourKeys(next);
                        }}
                      >
                        {Object.values(collapsedHourKeys).some((v) => !v) ? 'Collapse All' : 'Expand All'}
                      </button>
                    </div>

                    {Object.entries(groupAppointmentsByDateHour(appointments))
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([dateKey, hours]) => (
                        <div key={dateKey} className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-md font-semibold text-gray-900">
                              {new Date(dateKey).toLocaleDateString()}
                            </h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(hours)
                              .sort(([ha], [hb]) => Number(ha) - Number(hb))
                              .map(([hourStr, items]) => {
                                const filtered = doctorStatusFilter === 'ALL' ? items : items.filter(a => a.status === doctorStatusFilter);
                                if (filtered.length === 0) return null;
                                const counts = {
                                  CONFIRMED: items.filter(a => a.status === 'CONFIRMED').length,
                                  PENDING: items.filter(a => a.status === 'PENDING').length,
                                  EMERGENCY: items.filter(a => a.status === 'EMERGENCY').length,
                                  CANCELLED: items.filter(a => a.status === 'CANCELLED').length,
                                };
                                const key = `${dateKey}-${hourStr}`;
                                const isCollapsed = !!collapsedHourKeys[key];
                                return (
                                  <div key={hourStr} className="border rounded-lg bg-gray-50">
                                    <button
                                      className="w-full px-4 py-2 border-b flex items-center justify-between hover:bg-gray-100"
                                      onClick={() => setCollapsedHourKeys(prev => ({...prev, [key]: !prev[key]}))}
                                    >
                                      <div className="font-medium text-gray-900">
                                        {formatHourRange(dateKey, Number(hourStr))}
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">{filtered.length} booked</span>
                                        {counts.CONFIRMED > 0 && (
                                          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">{counts.CONFIRMED} confirmed</span>
                                        )}
                                        {counts.PENDING > 0 && (
                                          <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">{counts.PENDING} pending</span>
                                        )}
                                        {counts.CANCELLED > 0 && (
                                          <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-800">{counts.CANCELLED} cancelled</span>
                                        )}
                                        <span className="text-xs text-gray-500">{isCollapsed ? '▲' : '▼'}</span>
                                      </div>
                                    </button>
                                    {!isCollapsed && (
                                      <div className="p-3 space-y-2">
                                        {filtered.map((appointment) => (
                                          <div key={appointment.id} className="flex items-center justify-between bg-white border rounded-md p-2">
                                            <div className="min-w-0">
                                              <p className="text-sm font-medium text-gray-900 truncate">
                                                Patient: {appointment.patient.email}
                                              </p>
                                              {appointment.reason && (
                                                <p className="text-xs text-gray-600 truncate">{appointment.reason}</p>
                                              )}
                                            </div>
                                            <div className="flex items-center space-x-3">
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
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      ))}
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
                              {new Date(appointment.date).toLocaleDateString()}<br/>
                              <span className="text-gray-500">{new Date(appointment.date).toLocaleTimeString()}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {appointment.doctor?.email || 'Unknown Doctor'}
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
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Patient Management</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-500 text-center py-8">Patient management features coming soon...</p>
            </div>
          </div>
        )}

        {/* ============================================================================
            🌐 WEBSITE TAB - Website customization interface (DOCTORS ONLY)
            ============================================================================ */}
        {activeTab === 'website' && isDoctorLike && (
          <div className="space-y-8">
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Website Management</h3>
                <p className="text-sm text-gray-600 mt-1">Customize your professional website</p>
              </div>
              <div className="p-6">
                {user.role === 'DOCTOR' ? (
                  doctorProfile ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-lg font-medium text-gray-900 mb-4">Website Preview</h4>
                          <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                            <p className="text-sm text-gray-600 mb-2">Your website URL:</p>
                            <p className="font-mono text-blue-600">
                              {doctorProfile.slug ? doctorMicrositeUrl(doctorProfile.slug) : 'No website yet'}
                            </p>
                          </div>
                          <div className="mt-4">
                            <Link 
                              href={doctorProfile.slug ? `/site/${doctorProfile.slug}` : '#'}
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
                              {hospitalMicrositeUrl((hospitalProfile as any)?.general?.name || String(hospitalProfile.id))}
                            </p>
                          </div>
                          <div className="mt-4">
                            <Link 
                              href={`/hospital-site/${hospitalProfile.id}`}
                              target="_blank"
                              onClick={(e) => {
                                e.preventDefault();
                                const name = (hospitalProfile as any)?.general?.name || String(hospitalProfile.id);
                                window.open(hospitalMicrositeUrl(name), '_blank');
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
          user.role === 'DOCTOR' ? <DoctorSettings /> : <HospitalSettings />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ⚙️ DOCTOR SETTINGS COMPONENT - Manage Slot Admin credentials
// ============================================================================
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
        if (res?.slotPeriodMinutes) setSlotPeriodMinutes(res.slotPeriodMinutes);
      } catch (e: any) {
        console.error('Failed to load slot period', e);
      }
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
        setMessage(e?.message || 'Failed to load Slot Admin info');
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
      setMessage(e?.message || 'Failed to update Slot Admin credentials');
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
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Settings</h3>
      </div>
      <div className="p-6 space-y-8">
        {/* Clinic Logo / Profile Photo */}
        {user?.role === 'DOCTOR' && (
          <section>
            <h4 className="text-md font-semibold text-gray-900 mb-2">Clinic Logo / Profile Photo</h4>
            <p className="text-sm text-gray-600 mb-4">Upload your clinic logo or profile photo.</p>
            {profileImageUrl && (
              <div className="mb-3">
                <img src={profileImageUrl} alt="Current profile" className="w-24 h-24 object-cover rounded" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                className="border rounded-lg px-3 py-2 w-full"
              />
              <button
                onClick={async () => {
                  if (!photoFile) { setMessage('Please select a photo'); return; }
                  try {
                    setUploadingPhoto(true);
                    setMessage(null);
                    const res = await apiClient.uploadDoctorPhoto(photoFile);
                    setProfileImageUrl(res.url);
                    setMessage('Logo/photo uploaded successfully');
                  } catch (e: any) {
                    setMessage(e?.message || 'Failed to upload');
                  } finally {
                    setUploadingPhoto(false);
                  }
                }}
                disabled={!photoFile || uploadingPhoto}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50"
              >
                {uploadingPhoto ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          </section>
        )}
        {/* Bookable ON/OFF */}
        <section>
          <h4 className="text-md font-semibold text-gray-900 mb-2">Make Bookable</h4>
          <p className="text-sm text-gray-600 mb-4">Turn patient booking on or off for your profile.</p>
          <div className="flex items-center justify-between bg-gray-50 border rounded-lg px-4 py-3">
            <span className="text-gray-800">Currently {isBookable ? 'ON' : 'OFF'}</span>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isBookable}
                onChange={(e) => handleToggleBookable(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-green-500 transition-colors"></div>
              <div className="-ml-8 w-5 h-5 bg-white rounded-full shadow transform peer-checked:translate-x-5 transition-transform"></div>
            </label>
          </div>
          {savingBookable && <p className="text-xs text-gray-500 mt-2">Saving…</p>}
        </section>
        {/* Slot Period Preference */}
        <section>
          <h4 className="text-md font-semibold text-gray-900 mb-2">Slot Period</h4>
          <p className="text-sm text-gray-600 mb-4">
            Choose how your schedule groups bookings. Patients select an hour; you can view bookings as {slotPeriodMinutes}-minute slots. This preference affects dashboard display only.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slot period (minutes)</label>
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
                className="w-full border rounded-lg px-3 py-2"
              >
                {[10, 15, 20, 30, 60].map((m) => (
                  <option key={m} value={m}>{m} minutes</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 text-sm text-gray-600">
              Tip: We currently assign patients to the next available 15‑minute slot inside the chosen hour. Custom periods will be honored in a future backend update.
            </div>
          </div>
        </section>

        {/* Doctors Management Credentials */}
        <section>
          <h4 className="text-md font-semibold text-gray-900 mb-2">Doctors Management</h4>
          <p className="text-sm text-gray-600 mb-4">
            Create or update a dedicated Doctors Management login for managing your slots.
          </p>
          {message && (
            <div className="mb-4 p-3 rounded bg-yellow-50 border border-yellow-200 text-yellow-800">{message}</div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Slot Admin</label>
              <div className="text-gray-800">
                {currentSlotAdminEmail ? (
                  <span className="font-mono">{currentSlotAdminEmail}</span>
                ) : (
                  <span className="text-gray-500">No Slot Admin configured yet</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slot Admin Email</label>
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
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 disabled:opacity-50"
              >
                {loading ? 'Saving...' : (currentSlotAdminEmail ? 'Update Slot Admin' : 'Create Slot Admin')}
              </button>
            </div>
          </div>
        </section>

        {/* Helpful Link */}
        <section className="pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            After configuring, share the login URL with your staff: <Link href="/slot-admin/login" className="text-blue-600 underline">Slot Admin Login</Link>
          </p>
        </section>
      </div>
    </div>
  );
}

// ============================================================================
// ⚙️ HOSPITAL SETTINGS COMPONENT - Manage Hospital Slot Admin credentials
// ============================================================================
function HospitalSettings() {
  const { user } = useAuth();
  const [currentSlotAdminEmail, setCurrentSlotAdminEmail] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [hospitalId, setHospitalId] = useState<number | null>(null);
  const [doctors, setDoctors] = useState<Array<{ id: number; email: string }>>([]);
  const [doctorAdminForm, setDoctorAdminForm] = useState<Record<number, { currentEmail?: string | null; email: string; password: string; loading: boolean; message?: string | null }>>({});
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
        setMessage(e?.message || 'Failed to load Slot Admin info');
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
        await Promise.all(
          links.map(async (d: any) => {
            initial[d.id] = { currentEmail: null, email: '', password: '', loading: true, message: null };
            try {
              const res = await apiClient.getHospitalSlotAdmin(d.id);
              const cur = res?.slotAdmin?.email || null;
              initial[d.id] = { currentEmail: cur, email: cur || '', password: '', loading: false, message: null };
            } catch (e: any) {
              initial[d.id] = { currentEmail: null, email: '', password: '', loading: false, message: e?.message || null };
            }
          })
        );
        setDoctorAdminForm(initial);
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
        [doctorId]: { ...(prev[doctorId] || {}), loading: false, message: e?.message || 'Failed to update' },
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
      const res = await apiClient.upsertHospitalSlotAdmin(email, password);
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
                    const res = await apiClient.uploadHospitalLogo(hospitalId, logoFile);
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
                        <p className="font-medium text-gray-900">{d.email}</p>
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