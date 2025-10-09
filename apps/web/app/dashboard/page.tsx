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
  const [doctorStatusFilter, setDoctorStatusFilter] = useState<'ALL'|'CONFIRMED'|'PENDING'|'CANCELLED'>('ALL'); // Doctor-only filter
  const [collapsedHourKeys, setCollapsedHourKeys] = useState<Record<string, boolean>>({}); // Collapse per hour box

  // ============================================================================
  // 🔄 TAB VALIDATION - Ensure non-doctors can't access doctor-specific tabs
  // ============================================================================
  useEffect(() => {
    if (user && user.role !== 'DOCTOR' && ['patients', 'website', 'settings', 'slots'].includes(activeTab)) {
      setActiveTab('overview');
    }
  }, [user, activeTab]);

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
                  {user.role === 'DOCTOR' ? 'Doctor Dashboard' : 'Patient Dashboard'}
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
            // Only show doctor-specific tabs for doctors
            ...(user.role === 'DOCTOR' ? [
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
        {activeTab === 'slots' && user.role === 'DOCTOR' && (
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
                {user.role === 'DOCTOR' ? 'Appointment Management' : 'My Appointments'}
              </h3>
            </div>
            <div className="p-6">
              {appointments.length > 0 ? (
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
        {activeTab === 'patients' && user.role === 'DOCTOR' && (
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
        {activeTab === 'website' && user.role === 'DOCTOR' && (
          <div className="space-y-8">
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Website Management</h3>
                <p className="text-sm text-gray-600 mt-1">Customize your professional website</p>
              </div>
              <div className="p-6">
                {doctorProfile ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-4">Website Preview</h4>
                        <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                          <p className="text-sm text-gray-600 mb-2">Your website URL:</p>
                          <p className="font-mono text-blue-600">
                            {doctorProfile.slug ? `https://${doctorProfile.slug}.docproc.com` : 'No website yet'}
                          </p>
                        </div>
                        <div className="mt-4">
                          <Link 
                            href={doctorProfile.slug ? `/site/${doctorProfile.slug}` : '#'}
                            target="_blank"
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
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================================
            ⚙️ SETTINGS TAB - Account and practice settings (DOCTORS ONLY)
            ============================================================================ */}
        {activeTab === 'settings' && user.role === 'DOCTOR' && (
          <DoctorSettings />
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
  useEffect(() => {
    const loadSlotPeriod = async () => {
      try {
        const res = await apiClient.getDoctorSlotPeriod();
        if (res?.slotPeriodMinutes) setSlotPeriodMinutes(res.slotPeriodMinutes);
      } catch (e: any) {
        console.error('Failed to load slot period', e);
      }
    };
    if (user?.role === 'DOCTOR') loadSlotPeriod();
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

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Settings</h3>
      </div>
      <div className="p-6 space-y-8">
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

        {/* Slot Admin Credentials */}
        <section>
          <h4 className="text-md font-semibold text-gray-900 mb-2">Slot Booking Admin</h4>
          <p className="text-sm text-gray-600 mb-4">
            Create or update a dedicated Slot Admin login for managing your slots.
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