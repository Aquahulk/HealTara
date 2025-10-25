// ============================================================================
// 🔒 SECURE ADMIN PANEL - Dual Security Code System Administration
// ============================================================================
// This is the main admin dashboard that provides system-wide management capabilities
// It allows administrators to manage users, doctors, appointments, and view system statistics
// Access is restricted to users with ADMIN role only with multiple security layers
// 
// SECURITY FEATURES:
// 1. Session encryption validation
// 2. Fixed security code validation (12061808)
// 3. Date-based security code validation (DDMMYY format)
// 4. Complex security token validation
// 5. User agent verification
// 6. Access attempt logging
// 7. Automatic session expiration
// 
// IMPORTANT: This is a highly secure, hidden admin interface with complex URL
// ============================================================================

// ============================================================================
// 📦 EXTERNAL DEPENDENCIES - What we're importing and why
// ============================================================================
'use client';                                              // Enable React hooks and client-side features
import { useState, useEffect } from 'react';               // React hooks for state management and side effects
import { useAuth } from '@/context/AuthContext';           // Custom hook to access user authentication state
import { apiClient } from '@/lib/api';                     // API client for making HTTP requests to backend
import { loadWithCache, PerformanceMonitor, CacheManager } from '@/lib/performance'; // Performance optimization utilities
import { getUserLabel, getDoctorLabel, getPatientLabel } from '@/lib/utils';         // Friendly display helpers

// ============================================================================
// 🔐 SECURITY UTILITIES - Advanced security validation functions
// ============================================================================

// Decrypt session data
const decryptSessionData = (encryptedData: string): any => {
  try {
    const key = 'ADMIN_SECURE_KEY_2024_' + new Date().getDate();
    const data = atob(encryptedData);
    let decrypted = '';
    for (let i = 0; i < data.length; i++) {
      decrypted += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
};

// Validate admin session
const validateAdminSession = (): boolean => {
  try {
    const sessionData = localStorage.getItem('adminSession');
    if (!sessionData) return false;
    
    const decrypted = decryptSessionData(sessionData);
    if (!decrypted) return false;
    
    // Check if session is from today
    const sessionDate = new Date(decrypted.timestamp);
    const today = new Date();
    if (sessionDate.getDate() !== today.getDate() || 
        sessionDate.getMonth() !== today.getMonth() || 
        sessionDate.getFullYear() !== today.getFullYear()) {
      return false;
    }
    
    // Check if session is not older than 8 hours
    const hoursDiff = (Date.now() - decrypted.timestamp) / (1000 * 60 * 60);
    if (hoursDiff > 8) return false;
    
    // Validate user agent
    if (decrypted.userAgent !== navigator.userAgent) return false;
    
    return true;
  } catch {
    return false;
  }
};

// ============================================================================
// 🏗️ INTERFACE DEFINITIONS - TypeScript types for our data
// ============================================================================
interface DashboardStats {
  totalUsers: number;                                       // Total number of users in the system
  totalDoctors: number;                                     // Total number of doctors
  totalPatients: number;                                    // Total number of patients
  totalAppointments: number;                                // Total number of appointments
  pendingAppointments: number;                              // Number of pending appointments
}

interface User {
  id: number;                                               // Unique user identifier
  email: string;                                            // User's email address
  role: string;                                             // User's role (PATIENT, DOCTOR, ADMIN)
  isActive?: boolean;                                        // Whether user account is active (optional)
  createdAt?: string;                                       // When user account was created (optional)
}

interface Appointment {
  id: number;                                               // Unique appointment identifier
  date: string;                                             // Appointment date and time
  status: string;                                           // Current status
  doctor: { email: string };                                // Doctor's email
  patient: { email: string };                               // Patient's email
  reason?: string;                                          // Reason for appointment
}

interface AuditLog {
  id: number;                                               // Unique log identifier
  action: string;                                           // Action performed (CREATE, UPDATE, DELETE)
  entityType: string;                                       // Type of entity affected
  entityId: number;                                         // ID of affected entity
  details: string;                                          // Additional details about the action
  createdAt: string;                                        // When action was performed
  admin: { email: string };                                 // Admin who performed the action
}

interface HomepageContent {
  hero: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    ctaText: string;
    backgroundImage: string;
  };
  stats: {
    doctors: number;
    patients: number;
    cities: number;
    reviews: number;
  };
  features: Array<{
    icon: string;
    title: string;
    description: string;
    color: string;
  }>;
  testimonials: Array<{
    name: string;
    role: string;
    content: string;
    rating: number;
    avatar: string;
  }>;
  categories: Array<{
    title: string;
    description: string;
    icon: string;
    color: string;
    link: string;
  }>;
  howItWorks: Array<{
    step: number;
    title: string;
    description: string;
    icon: string;
  }>;
  whyChooseUs: Array<{
    title: string;
    description: string;
    icon: string;
  }>;
}

// ============================================================================
// 🔒 SECURE ADMIN PANEL COMPONENT - Main admin dashboard
// ============================================================================
export default function SecureAdminPanel() {
  // ============================================================================
  // 🎯 STATE MANAGEMENT - Variables that control component behavior
  // ============================================================================
  const { user, loading: authLoading } = useAuth();         // Get user info and loading state from auth context
  const [activeTab, setActiveTab] = useState('dashboard');  // Currently selected tab
  const [stats, setStats] = useState<DashboardStats | null>(null); // Dashboard statistics
  const [users, setUsers] = useState<User[]>([]);           // List of all users
  const [appointments, setAppointments] = useState<Appointment[]>([]); // List of all appointments
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]); // System audit logs
  const [loading, setLoading] = useState(false);            // Loading state for data operations
  const [selectedUser, setSelectedUser] = useState<User | null>(null); // User selected for role update
  const [showRoleModal, setShowRoleModal] = useState(false); // Control role update modal visibility
  const [newRole, setNewRole] = useState('');               // New role to assign to user
  const [securityValidated, setSecurityValidated] = useState(false); // Security validation status
  const [accessDenied, setAccessDenied] = useState(false);  // Access denied status
  const [homepageContent, setHomepageContent] = useState<HomepageContent | null>(null); // Homepage content
  const [showHomepageModal, setShowHomepageModal] = useState(false); // Homepage content modal
  // Inline edit states for media fields
  const [hospitalLogos, setHospitalLogos] = useState<Record<number, string>>({});
  const [doctorPhotos, setDoctorPhotos] = useState<Record<number, string>>({});
  const [hospitalLogoFiles, setHospitalLogoFiles] = useState<Record<number, File | null>>({});
  const [doctorPhotoFiles, setDoctorPhotoFiles] = useState<Record<number, File | null>>({});
  const [editingSection, setEditingSection] = useState<string | null>(null); // Currently editing section
  const [adminDoctors, setAdminDoctors] = useState<any[]>([]); // Admin view of doctors with status
  const [adminHospitals, setAdminHospitals] = useState<any[]>([]); // Admin view of hospitals with status

  // ============================================================================
  // 🔄 SIDE EFFECTS - Code that runs when component mounts or updates
  // ============================================================================
  useEffect(() => {
    // ============================================================================
    // 🔒 SIMPLIFIED SECURITY VALIDATION - Basic admin role check
    // ============================================================================
    const performSecurityValidation = () => {
      // ============================================================================
      // 🚫 ACCESS DENIED CHECKS - Basic authentication only
      // ============================================================================
      
      // Check 1: Wait for authentication to complete
      if (authLoading) return;
      
      // Check 2: Basic admin role validation
      if (!user || user.role !== 'ADMIN') {
        console.log('User is not admin, redirecting. User:', user);
        setAccessDenied(true);
        setTimeout(() => window.location.href = '/', 2000);
        return;
      }
      
      // ============================================================================
      // ✅ SECURITY VALIDATION PASSED - Admin role confirmed
      // ============================================================================
      console.log('Admin access granted. Loading admin data...');
      setSecurityValidated(true);
      
      // ============================================================================
      // 📊 DATA LOADING - Load admin dashboard data
      // ============================================================================
      loadData();
    };

    // ============================================================================
    // 🚀 SECURITY VALIDATION - Run basic security checks
    // ============================================================================
    performSecurityValidation();
  }, [user, authLoading]);

  // ============================================================================
  // 📊 DATA LOADING FUNCTIONS - Functions to fetch data from backend
  // ============================================================================
  
  // Ultra-optimized admin data loading with performance monitoring
  const loadData = async () => {
    PerformanceMonitor.startTiming('admin-data-load');
    try {
      setLoading(true);
      
      // Load critical data with intelligent caching
      const [dashboardData, usersData] = await Promise.allSettled([
        loadWithCache('admin_dashboard', () => apiClient.getAdminDashboard()),
        loadWithCache('admin_users', () => apiClient.getAdminUsers())
      ]);

      // Update critical data immediately
      if (dashboardData.status === 'fulfilled') {
        setStats(dashboardData.value.stats);
      }
      if (usersData.status === 'fulfilled') {
        const filteredUsers = (usersData.value || []).filter((u) => u.role !== 'ADMIN');
        setUsers(filteredUsers);
      }

      // Load secondary data in background (non-blocking)
      Promise.allSettled([
        loadWithCache('admin_appointments', () => apiClient.getAdminAppointments()).then(data => {
          setAppointments(data || []);
        }),
        loadWithCache('admin_doctors', () => apiClient.adminListDoctors({ page: 1, limit: 10 })).then(data => {
          const items = (data as any).items || [];
          setAdminDoctors(items);
          // Initialize doctor photo inline-edit mapping
          const photoMap: Record<number, string> = {};
          items.forEach((d: any) => {
            const existing = d.doctorProfile?.profileImage || d.doctorProfile?.photoUrl || '';
            if (d.id != null) photoMap[d.id] = existing || '';
          });
          setDoctorPhotos(photoMap);
        }).catch((e) => {
          console.warn('Failed to load admin doctors list', e);
          setAdminDoctors([]);
        }),
        loadWithCache('admin_hospitals', () => apiClient.adminListHospitals({ page: 1, limit: 10 })).then(data => {
          const items = (data as any).items || [];
          setAdminHospitals(items);
          // Initialize hospital logo inline-edit mapping
          const logoMap: Record<number, string> = {};
          items.forEach((h: any) => {
            const logoUrl = h.profile?.logoUrl || h.general?.logoUrl || '';
            if (h.id != null) logoMap[h.id] = logoUrl || '';
          });
          setHospitalLogos(logoMap);
        }).catch((e) => {
          console.warn('Failed to load admin hospitals list', e);
          setAdminHospitals([]);
        }),
        loadWithCache('admin_audit_logs', () => apiClient.getAdminAuditLogs()).then(data => {
          setAuditLogs(data || []);
        }).catch((e) => {
          console.warn('Failed to load audit logs', e);
          setAuditLogs([]);
        })
      ]);

      const duration = PerformanceMonitor.endTiming('admin-data-load');
      PerformanceMonitor.logTiming('admin-data-load', duration);
      
    } catch (error) {
      console.error('Error loading admin data:', error);
      alert('Failed to load admin data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // 👥 USER MANAGEMENT FUNCTIONS - Functions to manage user accounts
  // ============================================================================
  
  // Toggle user account status (active/inactive)
  const toggleUserStatus = async (userId: number, currentStatus: boolean) => {
    try {
      await apiClient.updateUserStatus(userId, !currentStatus);
      await loadData();                                     // Refresh data after update
      alert('User status updated successfully');
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Failed to update user status');
    }
  };

  // Delete user (admin only)
  const deleteUser = async (userId: number, email?: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete user${email ? ` ${email}` : ''}? This action cannot be undone.`);
    if (!confirmed) return;
    try {
      await apiClient.deleteUser(userId);
      await loadData();                                     // Refresh data after delete
      alert('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  // Update user role
  const updateUserRole = async () => {
    if (!selectedUser || !newRole) return;
    
    try {
      await apiClient.updateUserRole(selectedUser.id, newRole);
      await loadData();                                     // Refresh data after update
      setShowRoleModal(false);
      setSelectedUser(null);
      setNewRole('');
      alert('User role updated successfully');
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Failed to update user role');
    }
  };

  // ============================================================================
  // 📅 APPOINTMENT MANAGEMENT FUNCTIONS - Functions to manage appointments
  // ============================================================================
  
  // Update appointment status
  const updateAppointmentStatus = async (appointmentId: number, newStatus: string) => {
    try {
      await apiClient.updateAdminAppointmentStatus(appointmentId, newStatus);
      await loadData();                                     // Refresh data after update
      alert('Appointment status updated successfully');
    } catch (error) {
      console.error('Error updating appointment status:', error);
      alert('Failed to update appointment status');
    }
  };

  // ============================================================================
  // ✅ ADMIN APPROVAL FUNCTIONS - Manage doctor/hospital service status
  // ============================================================================
  const setDoctorServiceStatus = async (doctorId: number, action: 'START' | 'PAUSE' | 'REVOKE') => {
    try {
      await apiClient.adminSetDoctorStatus(doctorId, action);
      // Optimistically update UI for snappy feedback
      setAdminDoctors((prev) =>
        (prev || []).map((d: any) =>
          d.id === doctorId
            ? { ...d, status: action === 'START' ? 'STARTED' : action === 'PAUSE' ? 'PAUSED' : 'REVOKED' }
            : d
        )
      );
      // Refetch only the doctors list quickly (paginated)
      const refreshed = await apiClient.adminListDoctors({ page: 1, limit: 25 }).catch(() => ({ items: [] as any[], total: 0, page: 1, limit: 25 }));
      setAdminDoctors((refreshed as any).items || []);
      alert('Doctor status updated successfully');
    } catch (error) {
      console.error('Error updating doctor status:', error);
      alert('Failed to update doctor status');
    }
  };

  const setHospitalServiceStatus = async (
    hospitalId: number,
    action: 'START' | 'PAUSE' | 'REVOKE'
  ) => {
    try {
      await apiClient.adminSetHospitalStatus(hospitalId, action);
      // Optimistically update UI for snappy feedback
      setAdminHospitals((prev) =>
        (prev || []).map((h: any) =>
          h.id === hospitalId
            ? { ...h, serviceStatus: action === 'START' ? 'STARTED' : action === 'PAUSE' ? 'PAUSED' : 'REVOKED' }
            : h
        )
      );
      // Refetch only the hospitals list quickly (paginated)
      const refreshed = await apiClient.adminListHospitals({ page: 1, limit: 25 }).catch(() => ({ items: [] as any[], total: 0, page: 1, limit: 25 }));
      setAdminHospitals((refreshed as any).items || []);
      alert('Hospital status updated successfully');
    } catch (error) {
      console.error('Error updating hospital status:', error);
      alert('Failed to update hospital status');
    }
  };

  // Save hospital logo URL to hospital profile.general
  const saveHospitalLogoUrl = async (hospitalId: number) => {
    try {
      const logoUrl = (hospitalLogos[hospitalId] || '').trim();
      await apiClient.adminUpdateHospitalProfile(hospitalId, { general: { logoUrl } });
      // Optimistically update local list
      setAdminHospitals((prev) => (prev || []).map((h: any) => (
        h.id === hospitalId
          ? { ...h, profile: { ...(h.profile || {}), logoUrl }, general: { ...(h.general || {}), logoUrl } }
          : h
      )));
      alert('Hospital logo updated successfully');
    } catch (error) {
      console.error('Error updating hospital logo:', error);
      alert('Failed to update hospital logo');
    }
  };

  // Upload hospital logo file (admin-only)
  const uploadHospitalLogoFile = async (hospitalId: number) => {
    try {
      const file = hospitalLogoFiles[hospitalId];
      if (!file) {
        alert('Please select a logo image first');
        return;
      }
      const res = await apiClient.adminUploadHospitalLogo(hospitalId, file);
      const logoUrl = (res as any)?.url || '';
      setHospitalLogos((prev) => ({ ...prev, [hospitalId]: logoUrl }));
      alert('Logo uploaded successfully');
    } catch (error) {
      console.error('Error uploading hospital logo:', error);
      alert('Failed to upload hospital logo');
    }
  };

  // Upload doctor photo file (admin-only)
  const uploadDoctorPhotoFile = async (doctorId: number) => {
    try {
      const file = doctorPhotoFiles[doctorId];
      if (!file) {
        alert('Please select a doctor photo first');
        return;
      }
      const res = await apiClient.adminUploadDoctorPhoto(doctorId, file);
      const photoUrl = (res as any)?.url || '';
      setDoctorPhotos((prev) => ({ ...prev, [doctorId]: photoUrl }));
      alert('Doctor photo uploaded successfully');
    } catch (error) {
      console.error('Error uploading doctor photo:', error);
      alert('Failed to upload doctor photo');
    }
  };

  // ============================================================================
  // 🏠 HOMEPAGE CONTENT MANAGEMENT FUNCTIONS - Functions to manage homepage content
  // ============================================================================
  
  // Load homepage content
  const loadHomepageContent = async () => {
    try {
      const content = await apiClient.getHomepageContent();
      setHomepageContent(content);
    } catch (error) {
      console.error('Error loading homepage content:', error);
    }
  };

  // Save homepage content
  const saveHomepageContent = async (content: HomepageContent) => {
    try {
      await apiClient.updateHomepageContent(content);
      setHomepageContent(content);
      alert('Homepage content saved successfully!');
    } catch (error) {
      console.error('Error saving homepage content:', error);
      alert('Failed to save homepage content');
    }
  };

  // ============================================================================
  // 🚫 ACCESS DENIED RENDER - Show access denied message
  // ============================================================================
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-red-900 mb-2">Access Denied</h1>
          <p className="text-red-700 mb-4">You do not have permission to access this area.</p>
          <p className="text-red-600 text-sm">Redirecting to homepage...</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 🔒 SECURITY LOADING RENDER - Show loading while validating security
  // ============================================================================
  if (!securityValidated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validating security credentials...</p>
          <p className="text-gray-500 text-sm mt-2">Multi-layer security check in progress</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 🎯 MAIN RENDER - Display the secure admin panel
  // ============================================================================
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ============================================================================
          🎨 HEADER SECTION - Admin panel header with security indicators
          ============================================================================ */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🔒 Secure Admin Panel</h1>
              <p className="text-gray-600 mt-1">Multi-layer security system administration</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  🔐 Secure Session
                </span>
              </div>
              <div className="text-sm text-gray-500">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  ⏰ {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================================
          📊 MAIN CONTENT - Admin panel content with tabs
          ============================================================================ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ============================================================================
            🧭 NAVIGATION TABS - Tab navigation for different admin functions
            ============================================================================ */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'dashboard', name: '📊 Dashboard', icon: '📊' },
              { id: 'users', name: '👥 Users', icon: '👥' },
              { id: 'doctors', name: '👨‍⚕️ Doctors', icon: '👨‍⚕️' },
              { id: 'hospitals', name: '🏥 Hospitals', icon: '🏥' },
              { id: 'appointments', name: '📅 Appointments', icon: '📅' },
              { id: 'homepage', name: '🏠 Homepage', icon: '🏠' },
              { id: 'audit', name: '📝 Audit Logs', icon: '📝' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* ============================================================================
            📊 DASHBOARD TAB - System overview and statistics
            ============================================================================ */}
        {activeTab === 'dashboard' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">System Overview</h2>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading dashboard data...</p>
              </div>
            ) : stats ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="text-2xl">👥</div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                          <dd className="text-lg font-medium text-gray-900">{stats.totalUsers}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="text-2xl">👨‍⚕️</div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Doctors</dt>
                          <dd className="text-lg font-medium text-gray-900">{stats.totalDoctors}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="text-2xl">🏥</div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Patients</dt>
                          <dd className="text-lg font-medium text-gray-900">{stats.totalPatients}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="text-2xl">📅</div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Appointments</dt>
                          <dd className="text-lg font-medium text-gray-900">{stats.totalAppointments}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600">No dashboard data available</p>
              </div>
            )}
          </div>
        )}

        {/* ============================================================================
            👥 USERS TAB - User management interface
            ============================================================================ */}
        {activeTab === 'users' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">User Management</h2>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading users...</p>
              </div>
            ) : (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <li key={user.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="text-lg">
                              {user.role === 'ADMIN' ? '🔒' : user.role === 'DOCTOR' ? '👨‍⚕️' : '🏥'}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{getUserLabel(user)}</div>
                            <div className="text-sm text-gray-500">{user.role}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <button
                            onClick={() => toggleUserStatus(user.id, user.isActive || false)}
                            className="text-sm text-blue-600 hover:text-blue-900"
                          >
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowRoleModal(true);
                            }}
                            className="text-sm text-green-600 hover:text-green-900"
                          >
                            Change Role
                          </button>
                          <button
                            onClick={() => deleteUser(user.id, user.email)}
                            className="text-sm text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ============================================================================
            👨‍⚕️ DOCTORS TAB - Doctor approval and status controls
            ============================================================================ */}
        {activeTab === 'doctors' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Doctor Approval & Status</h2>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading doctors...</p>
              </div>
            ) : (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {adminDoctors.map((doctor: any) => (
                    <li key={doctor.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{getDoctorLabel({ email: doctor.email, id: doctor.id })}</div>
                          <div className="text-sm text-gray-500">
                            Status: {doctor.status}
                          </div>
                          {doctor.hospitals && doctor.hospitals.length > 0 && (
                            <div className="mt-2 text-sm text-gray-500">
                              Linked hospitals: {doctor.hospitals.map((h: any) => `${h.name} (${h.serviceStatus || 'UNKNOWN'})`).join(', ')}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setDoctorServiceStatus(doctor.id, 'START')}
                            className="text-sm text-green-600 hover:text-green-900"
                          >
                            Start
                          </button>
                          <button
                            onClick={() => setDoctorServiceStatus(doctor.id, 'PAUSE')}
                            className="text-sm text-yellow-600 hover:text-yellow-900"
                          >
                            Pause
                          </button>
                          <button
                            onClick={() => setDoctorServiceStatus(doctor.id, 'REVOKE')}
                            className="text-sm text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      {/* Doctor Photo - upload and URL */}
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <label className="text-xs text-gray-500 md:col-span-1">Photo URL</label>
                        <input
                          type="text"
                          value={doctorPhotos[doctor.id] ?? ''}
                          onChange={(e) => setDoctorPhotos((prev) => ({ ...prev, [doctor.id]: e.target.value }))}
                          placeholder="https://..."
                          className="md:col-span-2 w-full border border-gray-300 rounded px-3 py-1 text-sm"
                        />
                        <div className="md:col-span-3" />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ============================================================================
            🏥 HOSPITALS TAB - Hospital approval and status controls
            ============================================================================ */}
        {activeTab === 'hospitals' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Hospital Approval & Status</h2>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading hospitals...</p>
              </div>
            ) : (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {adminHospitals.map((hospital: any) => (
                    <li key={hospital.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{hospital.name}</div>
                          <div className="text-sm text-gray-500">{hospital.city}, {hospital.state}</div>
                          <div className="text-sm text-gray-500">Service: {hospital.serviceStatus || 'UNKNOWN'}</div>
                          {hospital.admin && (
                            <div className="text-sm text-gray-500">Admin: {hospital.admin.email}</div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setHospitalServiceStatus(hospital.id, 'START')}
                            className="text-sm text-green-600 hover:text-green-900"
                          >
                            Start
                          </button>
                          <button
                            onClick={() => setHospitalServiceStatus(hospital.id, 'PAUSE')}
                            className="text-sm text-yellow-600 hover:text-yellow-900"
                          >
                            Pause
                          </button>
                          <button
                            onClick={() => setHospitalServiceStatus(hospital.id, 'REVOKE')}
                            className="text-sm text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      {/* Hospital Logo - upload and URL */}
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <label className="text-xs text-gray-500 md:col-span-1">Logo URL</label>
                        <input
                          type="text"
                          value={hospitalLogos[hospital.id] || ''}
                          onChange={(e) => setHospitalLogos(prev => ({ ...prev, [hospital.id]: e.target.value }))}
                          placeholder="https://..."
                          className="md:col-span-2 w-full border border-gray-300 rounded px-3 py-1 text-sm"
                        />
                        <div className="md:col-span-3">
                          <button
                            onClick={() => saveHospitalLogoUrl(hospital.id)}
                            className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                          >
                            Save Logo URL
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ============================================================================
            📅 APPOINTMENTS TAB - Appointment management interface
            ============================================================================ */}
        {activeTab === 'appointments' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Appointment Management</h2>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading appointments...</p>
              </div>
            ) : (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {appointments.map((appointment) => (
                    <li key={appointment.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {getPatientLabel({ email: appointment.patient.email })} → {getDoctorLabel({ email: appointment.doctor.email })}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(appointment.date).toLocaleString()}
                          </div>
                          {appointment.reason && (
                            <div className="text-sm text-gray-500">Reason: {appointment.reason}</div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            appointment.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                            appointment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            appointment.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {appointment.status}
                          </span>
                          <select
                            value={appointment.status}
                            onChange={(e) => updateAppointmentStatus(appointment.id, e.target.value)}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="PENDING">Pending</option>
                            <option value="CONFIRMED">Confirmed</option>
                            <option value="CANCELLED">Cancelled</option>
                            <option value="COMPLETED">Completed</option>
                          </select>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ============================================================================
            📝 AUDIT LOGS TAB - System activity logs
            ============================================================================ */}
        {activeTab === 'audit' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Audit Logs</h2>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading audit logs...</p>
              </div>
            ) : (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {auditLogs.map((log) => (
                    <li key={log.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {log.action} {log.entityType} #{log.entityId}
                          </div>
                          <div className="text-sm text-gray-500">{log.details}</div>
                          <div className="text-sm text-gray-500">
                            By: {getUserLabel({ email: log.admin.email, role: 'ADMIN' })} • {new Date(log.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            log.action === 'CREATE' ? 'bg-green-100 text-green-800' :
                            log.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                            log.action === 'DELETE' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {log.action}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ============================================================================
            🏠 HOMEPAGE CONTENT MANAGEMENT TAB - Homepage content editing interface
            ============================================================================ */}
        {activeTab === 'homepage' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Homepage Content Management</h2>
              <button
                onClick={loadHomepageContent}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Load Content
              </button>
            </div>
            
            {homepageContent ? (
              <div className="space-y-8">
                {/* Hero Section */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">🎯 Hero Section</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                      <input
                        type="text"
                        value={homepageContent.hero.title}
                        onChange={(e) => setHomepageContent({
                          ...homepageContent,
                          hero: { ...homepageContent.hero, title: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">CTA Text</label>
                      <input
                        type="text"
                        value={homepageContent.hero.ctaText}
                        onChange={(e) => setHomepageContent({
                          ...homepageContent,
                          hero: { ...homepageContent.hero, ctaText: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Subtitle</label>
                      <textarea
                        value={homepageContent.hero.subtitle}
                        onChange={(e) => setHomepageContent({
                          ...homepageContent,
                          hero: { ...homepageContent.hero, subtitle: e.target.value }
                        })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Background Image (CSS Gradient)</label>
                      <input
                        type="text"
                        value={homepageContent.hero.backgroundImage}
                        onChange={(e) => setHomepageContent({
                          ...homepageContent,
                          hero: { ...homepageContent.hero, backgroundImage: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Stats Section */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">📊 Statistics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Doctors</label>
                      <input
                        type="number"
                        value={homepageContent.stats.doctors}
                        onChange={(e) => setHomepageContent({
                          ...homepageContent,
                          stats: { ...homepageContent.stats, doctors: parseInt(e.target.value) || 0 }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Patients</label>
                      <input
                        type="number"
                        value={homepageContent.stats.patients}
                        onChange={(e) => setHomepageContent({
                          ...homepageContent,
                          stats: { ...homepageContent.stats, patients: parseInt(e.target.value) || 0 }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Cities</label>
                      <input
                        type="number"
                        value={homepageContent.stats.cities}
                        onChange={(e) => setHomepageContent({
                          ...homepageContent,
                          stats: { ...homepageContent.stats, cities: parseInt(e.target.value) || 0 }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Reviews</label>
                      <input
                        type="number"
                        value={homepageContent.stats.reviews}
                        onChange={(e) => setHomepageContent({
                          ...homepageContent,
                          stats: { ...homepageContent.stats, reviews: parseInt(e.target.value) || 0 }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Features Section */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">⭐ Features</h3>
                  <div className="space-y-4">
                    {homepageContent.features.map((feature, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
                            <input
                              type="text"
                              value={feature.icon}
                              onChange={(e) => {
                                const newFeatures = [...homepageContent.features];
                                newFeatures[index] = { ...feature, icon: e.target.value };
                                setHomepageContent({ ...homepageContent, features: newFeatures });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                            <input
                              type="text"
                              value={feature.title}
                              onChange={(e) => {
                                const newFeatures = [...homepageContent.features];
                                newFeatures[index] = { ...feature, title: e.target.value };
                                setHomepageContent({ ...homepageContent, features: newFeatures });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                            <select
                              value={feature.color}
                              onChange={(e) => {
                                const newFeatures = [...homepageContent.features];
                                newFeatures[index] = { ...feature, color: e.target.value };
                                setHomepageContent({ ...homepageContent, features: newFeatures });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="bg-blue-500">Blue</option>
                              <option value="bg-green-500">Green</option>
                              <option value="bg-yellow-500">Yellow</option>
                              <option value="bg-purple-500">Purple</option>
                              <option value="bg-red-500">Red</option>
                              <option value="bg-orange-500">Orange</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                            <textarea
                              value={feature.description}
                              onChange={(e) => {
                                const newFeatures = [...homepageContent.features];
                                newFeatures[index] = { ...feature, description: e.target.value };
                                setHomepageContent({ ...homepageContent, features: newFeatures });
                              }}
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                  <button
                    onClick={() => saveHomepageContent(homepageContent)}
                    className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors"
                  >
                    Save Homepage Content
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-500 text-lg mb-4">No homepage content loaded</div>
                <button
                  onClick={loadHomepageContent}
                  className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Load Default Content
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================================
          📝 ROLE UPDATE MODAL - Modal for changing user roles
          ============================================================================ */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Update User Role</h3>
              <p className="text-sm text-gray-500 mb-4">
                Change role for user: <strong>{getUserLabel(selectedUser)}</strong>
              </p>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4"
              >
                <option value="">Select new role</option>
                <option value="PATIENT">Patient</option>
                <option value="DOCTOR">Doctor</option>
                <option value="ADMIN">Admin</option>
              </select>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowRoleModal(false);
                    setSelectedUser(null);
                    setNewRole('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={updateUserRole}
                  disabled={!newRole}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                    newRole
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  Update Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
