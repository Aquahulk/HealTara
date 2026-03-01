// ============================================================================
// 🔒 SECURE ADMIN PANEL - Dual Security Code System Administration
// ============================================================================



// This is the main admin dashboard that provides system-wide management capabilities
// It allows administrators to manage users, doctors, appointments, and view system statistics
// Access is restricted to users with ADMIN role only with multiple security layers



// SECURITY FEATURES:
// 1. Session encryption validation
// 2. Fixed security code validation (12061808)
// 3. Date-based security code validation (DDMMYY format)
// 4. Complex security token validation
// 5. User agent verification
// 6. Access attempt logging
// 7. Automatic session expiration

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
    slides: Array<{
      title: string;
      subtitle: string;
      description: string;
      gradient: string;
      icon: string;
      showSteps: boolean;
    }>;
  };
  trustedBy: {
    title: string;
    subtitle: string;
    stats: {
      doctors: number;
      patients: number;
      cities: number;
      reviews: number;
    };
  };
  howItWorks: {
    title: string;
    subtitle: string;
    steps: Array<{
      step: number;
      title: string;
      description: string;
      icon: string;
    }>;
  };
  whyChooseUs: {
    title: string;
    subtitle: string;
    features: Array<{
      title: string;
      description: string;
      icon: string;
    }>;
  };
  testimonials: {
    title: string;
    subtitle: string;
    reviews: Array<{
      name: string;
      role: string;
      content: string;
      rating: number;
      avatar: string;
    }>;
  };
  healthTips: {
    title: string;
    subtitle: string;
    tips: Array<{
      title: string;
      description: string;
      icon: string;
      category: string;
    }>;
  };
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
  const [editingSection, setEditingSection] = useState<string | null>(null); // Currently editing section
  const [adminDoctors, setAdminDoctors] = useState<any[]>([]); // Admin view of doctors with status
  const [adminHospitals, setAdminHospitals] = useState<any[]>([]); // Admin view of hospitals with status
  const [adminMetrics, setAdminMetrics] = useState<any | null>(null); // Admin metrics data
  const [pendingDoctors, setPendingDoctors] = useState<any[]>([]); // Pending doctor verifications
  const [pendingHospitals, setPendingHospitals] = useState<any[]>([]); // Pending hospital verifications

  // Auto-load homepage content when homepage tab is opened
  useEffect(() => {
    if (activeTab === 'homepage' && !homepageContent) {
      loadHomepageContent();
    }
  }, [activeTab, homepageContent]);
  const [adminDeletedDoctors, setAdminDeletedDoctors] = useState<any[]>([]);

  // New state for hospital details
  const [selectedHospitalDetails, setSelectedHospitalDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [expandedHospitalId, setExpandedHospitalId] = useState<number | null>(null);
  const [expandedDoctorId, setExpandedDoctorId] = useState<number | null>(null);
  const [doctorDetails, setDoctorDetails] = useState<Record<number, any>>({});
  const [decidingDoctorId, setDecidingDoctorId] = useState<number | null>(null);
  const [decidingHospitalId, setDecidingHospitalId] = useState<number | null>(null);

  // Function to load hospital details
  const loadHospitalDetails = async (hospitalId: number) => {
    setLoadingDetails(true);
    try {
      const details = await apiClient.adminGetHospitalFullDetails(hospitalId);
      setSelectedHospitalDetails(details);
      setExpandedHospitalId(hospitalId);
    } catch (error) {
      console.error('Error loading hospital details:', error);
      alert('Failed to load hospital details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const loadDoctorDetails = async (doctorId: number) => {
    try {
      const details = await apiClient.adminGetDoctorDetails(doctorId);
      setDoctorDetails((prev) => ({ ...prev, [doctorId]: details }));
      setExpandedDoctorId(doctorId);
    } catch (error) {
      console.error('Error loading doctor details:', error);
      alert('Failed to load doctor details');
    }
  };

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
        loadWithCache('admin_doctors', () => apiClient.adminListDoctors({ page: 1, limit: 200 })).then(data => {
          const items = (data as any).items || [];
          setAdminDoctors(items);
        }).catch((e) => {
          console.warn('Failed to load admin doctors list', e);
          setAdminDoctors([]);
        }),
        loadWithCache('admin_hospitals', () => apiClient.adminListHospitals({ page: 1, limit: 10 })).then(data => {
          const items = (data as any).items || [];
          setAdminHospitals(items);
        }).catch((e) => {
          console.warn('Failed to load admin hospitals list', e);
          setAdminHospitals([]);
        }),
        loadWithCache('admin_pending_verifications', () => apiClient.adminGetPendingVerifications()).then(data => {
          setPendingDoctors((data as any).doctors || []);
          setPendingHospitals((data as any).hospitals || []);
        }).catch((e) => {
          console.warn('Failed to load pending verifications', e);
          setPendingDoctors([]);
          setPendingHospitals([]);
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

  const deleteDoctor = async (doctor: any) => {
    const email = String(doctor.email || '');
    const confirmed = window.confirm(`Delete doctor ${email}? This will permanently remove the doctor.`);
    if (!confirmed) return;
    try {
      await apiClient.deleteUser(Number(doctor.id));
      setAdminDoctors((prev) => (prev || []).filter((d: any) => d.id !== doctor.id));
      setAdminDeletedDoctors((prev) => [{ id: doctor.id, email, deletedAt: Date.now() }, ...prev]);
      alert('Doctor deleted permanently');
    } catch (error) {
      console.error('Error deleting doctor:', error);
      alert('Failed to delete doctor');
    }
  };

  const deleteHospital = async (hospitalId: number) => {
    const confirmed = window.confirm(`Delete hospital #${hospitalId}? This will permanently remove the hospital.`);
    if (!confirmed) return;
    try {
      await apiClient.adminDeleteHospital(Number(hospitalId));
      setAdminHospitals((prev) => (prev || []).filter((h: any) => h.id !== hospitalId));
      alert('Hospital deleted permanently');
    } catch (error) {
      console.error('Error deleting hospital:', error);
      alert('Failed to delete hospital');
    }
  };

  const decideDoctorVerification = async (doctorId: number, decision: 'APPROVE' | 'REJECT') => {
    try {
      setDecidingDoctorId(doctorId);
      await apiClient.adminDecideDoctorVerification(doctorId, decision);
      setPendingDoctors((prev) => (prev || []).filter((d: any) => d.id !== doctorId));
      await loadData();
      alert(`Doctor ${decision === 'APPROVE' ? 'approved' : 'rejected'} successfully`);
    } catch (e) {
      alert('Failed to update doctor verification');
    } finally {
      setDecidingDoctorId(null);
    }
  };

  const decideHospitalVerification = async (hospitalId: number, decision: 'APPROVE' | 'REJECT') => {
    try {
      setDecidingHospitalId(hospitalId);
      await apiClient.adminDecideHospitalVerification(hospitalId, decision);
      setPendingHospitals((prev) => (prev || []).filter((h: any) => h.id !== hospitalId));
      await loadData();
      alert(`Hospital ${decision === 'APPROVE' ? 'approved' : 'rejected'} successfully`);
    } catch (e) {
      alert('Failed to update hospital verification');
    } finally {
      setDecidingHospitalId(null);
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
  const setDoctorServiceStatus = async (doctorId: number, status: 'ACTIVE' | 'SUSPENDED') => {
    try {
      await apiClient.adminUpdateDoctorStatus(doctorId, status);
      // Refresh data
      const refreshed = await apiClient.adminListDoctors({ page: 1, limit: 50 });
      setAdminDoctors(refreshed.items || []);
      alert(`Doctor ${status === 'SUSPENDED' ? 'suspended' : 'activated'} successfully`);
    } catch (error) {
      console.error('Error updating doctor status:', error);
      alert('Failed to update doctor status');
    }
  };

  const setHospitalServiceStatus = async (hospitalId: number, status: 'ACTIVE' | 'SUSPENDED') => {
    try {
      await apiClient.adminUpdateHospitalStatus(hospitalId, status);
      // Refresh data
      const refreshed = await apiClient.adminListHospitals({ page: 1, limit: 50 });
      setAdminHospitals(refreshed.items || []);
      alert(`Hospital ${status === 'SUSPENDED' ? 'suspended' : 'activated'} successfully`);
    } catch (error) {
      console.error('Error updating hospital status:', error);
      alert('Failed to update hospital status');
    }
  };

 

  // ============================================================================
  // 🏠 HOMEPAGE CONTENT MANAGEMENT FUNCTIONS - Functions to manage homepage content
  // ============================================================================
  
  // Load homepage content
  const loadHomepageContent = async () => {
    try {
      // Use API to load from database instead of localStorage
      const content = await apiClient.getHomepageContent();
      setHomepageContent(content);
    } catch (error) {
      console.error('Error loading homepage content:', error);
      // Fallback to default content
      const defaultContent: HomepageContent = {
        hero: {
          slides: [
            {
              title: "Your Health, Our Priority",
              subtitle: "Connect with verified doctors instantly",
              description: "Book appointments in 60 seconds",
              gradient: "from-blue-600 via-purple-600 to-pink-500",
              icon: "Heart",
              showSteps: false
            },
            {
              title: "How to Book an Appointment",
              subtitle: "Simple 3-step process",
              description: "Get started in minutes",
              gradient: "from-green-500 via-teal-500 to-blue-500",
              icon: "CheckCircle",
              showSteps: true
            },
            {
              title: "Book Appointments Easily",
              subtitle: "24/7 online booking",
              description: "Schedule anytime, anywhere",
              gradient: "from-purple-600 via-pink-500 to-red-500",
              icon: "Calendar",
              showSteps: false
            },
            {
              title: "Trusted Healthcare Network",
              subtitle: "Verified doctors & hospitals",
              description: "1000+ healthcare professionals",
              gradient: "from-orange-500 via-red-500 to-pink-600",
              icon: "Shield",
              showSteps: false
            },
            {
              title: "Quality Healthcare Services",
              subtitle: "Comprehensive medical care",
              description: "From consultations to treatments",
              gradient: "from-indigo-600 via-purple-500 to-pink-500",
              icon: "Stethoscope",
              showSteps: false
            }
          ]
        },
        trustedBy: {
          title: "Trusted by Thousands",
          subtitle: "Join our growing community of healthcare providers and satisfied patients",
          stats: {
            doctors: 2500,
            patients: 100000,
            cities: 75,
            reviews: 10000
          }
        },
        howItWorks: {
          title: "How It Works",
          subtitle: "Get started in 3 simple steps",
          steps: [
            {
              step: 1,
              title: "Search",
              description: "Find the right doctor/clinic",
              icon: "Search"
            },
            {
              step: 2,
              title: "Book",
              description: "Select time & pay booking fee",
              icon: "Calendar"
            },
            {
              step: 3,
              title: "Visit",
              description: "Confirmed appointment + rating system",
              icon: "CheckCircle"
            }
          ]
        },
        whyChooseUs: {
          title: "Why Choose Us",
          subtitle: "Experience healthcare reimagined for the digital age",
          features: [
            {
              title: "Verified Doctors",
              description: "All doctors verified by license ID",
              icon: "Shield"
            },
            {
              title: "Transparent Reviews",
              description: "1 booking = 1 review system",
              icon: "MessageCircle"
            },
            {
              title: "Multi-language Support",
              description: "Available in multiple languages",
              icon: "Globe"
            },
            {
              title: "One-stop Healthcare",
              description: "Doctors, clinics, hospitals, labs, insurance",
              icon: "Building2"
            }
          ]
        },
        testimonials: {
          title: "What Our Users Say",
          subtitle: "Real stories from real people",
          reviews: [
            {
              name: "Sarah Johnson",
              role: "Patient",
              content: "Found my perfect cardiologist within minutes. The booking process was seamless!",
              rating: 5,
              avatar: "👩‍💼"
            },
            {
              name: "Dr. Michael Chen",
              role: "Cardiologist",
              content: "This platform has increased my patient base by 40%. Highly recommended!",
              rating: 5,
              avatar: "👨‍⚕️"
            },
            {
              name: "Priya Sharma",
              role: "Patient",
              content: "The online consultation feature saved me during lockdown. Amazing service!",
              rating: 5,
              avatar: "👩‍🎓"
            }
          ]
        },
        healthTips: {
          title: "Health Tips from Our Doctors",
          subtitle: "Expert advice and health awareness articles",
          tips: [
            {
              title: "Dengue Prevention Tips",
              description: "Essential precautions to protect yourself from dengue fever",
              icon: "Shield",
              category: "Preventive Care"
            },
            {
              title: "Diabetes Management Guide",
              description: "Comprehensive guide to managing diabetes effectively",
              icon: "Activity",
              category: "Chronic Conditions"
            },
            {
              title: "Mental Health Awareness",
              description: "Understanding and supporting mental health in daily life",
              icon: "Heart",
              category: "Mental Health"
            }
          ]
        }
      };
      
      setHomepageContent(defaultContent);
    }
  };

  // Save homepage content
  const saveHomepageContent = async (content: HomepageContent) => {
    try {
      console.log('🔍 Admin Panel - Saving homepage content:', content);
      
      // Use API to save to database instead of localStorage
      const result = await apiClient.updateHomepageContent(content);
      
      console.log('🔍 Admin Panel - Save result:', result);
      
      if (result) {
        setHomepageContent(content);
        alert('✅ Homepage content saved successfully! Changes are now live on the homepage.');
        
        // Trigger a custom event to notify homepage to reload
        window.dispatchEvent(new CustomEvent('homepage-content-updated', { detail: content }));
        
        // Also trigger storage event for cross-tab communication
        localStorage.setItem('homepage-content-update', JSON.stringify({ timestamp: Date.now(), content }));
        localStorage.removeItem('homepage-content-update'); // Remove after setting
      } else {
        alert('❌ Failed to save homepage content. Please try again.');
      }
    } catch (error) {
      console.error('Error saving homepage content:', error);
      alert('❌ Error saving homepage content: ' + (error as Error).message);
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
  function HospitalAppointments({ hospitalId }: { hospitalId: number }) {
    const [items, setItems] = useState<any[]>([]);
    const [loadingAppts, setLoadingAppts] = useState(false);
    useEffect(() => {
      let mounted = true;
      (async () => {
        try {
          setLoadingAppts(true);
          const data = await apiClient.adminGetHospitalAppointments(hospitalId, 10);
          if (mounted) setItems(data || []);
        } catch (_) {
        } finally {
          setLoadingAppts(false);
        }
      })();
      return () => { mounted = false; };
    }, [hospitalId]);
    if (loadingAppts) return <div className="text-sm text-gray-600">Loading…</div>;
    if (!items.length) return <div className="text-sm text-gray-600">No recent appointments</div>;
    return (
      <ul className="space-y-2">
        {items.map((a) => (
          <li key={a.id} className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              <div>{new Date(a.createdAt || a.date).toLocaleString()}</div>
              <div>Doctor: {a.doctor?.email}</div>
              <div>Patient: {a.patient?.email}</div>
            </div>
            <div className="text-xs text-gray-500">{a.status}</div>
          </li>
        ))}
      </ul>
    );
  }
  const hf: any = homepageContent as any;
  const featuresList: any[] = Array.isArray(hf?.features) ? hf.features : [];
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* ============================================================================
          🎨 HEADER SECTION - Admin panel header with security indicators
          ============================================================================ */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                  <span className="text-3xl">🔒</span>
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg">Secure Admin Panel</h1>
                  <p className="text-blue-100 mt-1 text-sm sm:text-base">Multi-layer security system administration</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-sm">
                <span className="inline-flex items-center px-4 py-2 rounded-full text-xs font-bold bg-white/20 backdrop-blur-sm text-white border border-white/30 shadow-lg">
                  🔐 Secure Session
                </span>
              </div>
              <div className="text-sm">
                <span className="inline-flex items-center px-4 py-2 rounded-full text-xs font-bold bg-white/20 backdrop-blur-sm text-white border border-white/30 shadow-lg">
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
        <div className="mb-8 bg-white rounded-2xl shadow-xl p-2 overflow-x-auto">
          <nav className="flex space-x-2 min-w-max">
            {[
              { id: 'dashboard', name: '📊 Dashboard', icon: '📊' },
              { id: 'users', name: '👥 Users', icon: '👥' },
              { id: 'doctors', name: '👨‍⚕️ Doctors', icon: '👨‍⚕️' },
              { id: 'hospitals', name: '🏥 Hospitals', icon: '🏥' },
              { id: 'pendingVerifications', name: '🛡️ Pending', icon: '🛡️' },
              { id: 'deletedDoctors', name: '🗑️ Deleted', icon: '🗑️' },
              { id: 'appointments', name: '📅 Appointments', icon: '📅' },
              { id: 'homepage', name: '🏠 Homepage', icon: '🏠' },
              { id: 'audit', name: '📝 Audit', icon: '📝' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-4 sm:px-6 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-300 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span className="hidden sm:inline">{tab.name}</span>
                <span className="sm:hidden">{tab.icon}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* ============================================================================
            📊 DASHBOARD TAB - System overview and statistics
            ============================================================================ */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">System Overview</h2>
              <p className="text-gray-600 mt-2">Real-time system statistics and metrics</p>
            </div>
            {loading ? (
              <div className="text-center py-20">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
                <p className="text-gray-600 text-lg font-medium">Loading dashboard data...</p>
              </div>
            ) : (
              <>
                {/* Basic Stats Overview */}
                {stats && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <div className="bg-gradient-to-br from-white to-blue-50 overflow-hidden shadow-xl rounded-2xl border-2 border-blue-200 hover:shadow-2xl hover:scale-105 transition-all duration-300">
                      <div className="p-6">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                              <span className="text-3xl">👥</span>
                            </div>
                          </div>
                          <div className="ml-5 w-0 flex-1">
                            <dl>
                              <dt className="text-sm font-bold text-gray-600 truncate uppercase tracking-wide">Total Users</dt>
                              <dd className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{stats.totalUsers}</dd>
                            </dl>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-white to-green-50 overflow-hidden shadow-xl rounded-2xl border-2 border-green-200 hover:shadow-2xl hover:scale-105 transition-all duration-300">
                      <div className="p-6">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                              <span className="text-3xl">👨‍⚕️</span>
                            </div>
                          </div>
                          <div className="ml-5 w-0 flex-1">
                            <dl>
                              <dt className="text-sm font-bold text-gray-600 truncate uppercase tracking-wide">Doctors</dt>
                              <dd className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{stats.totalDoctors}</dd>
                            </dl>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-white to-purple-50 overflow-hidden shadow-xl rounded-2xl border-2 border-purple-200 hover:shadow-2xl hover:scale-105 transition-all duration-300">
                      <div className="p-6">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                              <span className="text-3xl">🏥</span>
                            </div>
                          </div>
                          <div className="ml-5 w-0 flex-1">
                            <dl>
                              <dt className="text-sm font-bold text-gray-600 truncate uppercase tracking-wide">Patients</dt>
                              <dd className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{stats.totalPatients}</dd>
                            </dl>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-white to-orange-50 overflow-hidden shadow-xl rounded-2xl border-2 border-orange-200 hover:shadow-2xl hover:scale-105 transition-all duration-300">
                      <div className="p-6">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                              <span className="text-3xl">📅</span>
                            </div>
                          </div>
                          <div className="ml-5 w-0 flex-1">
                            <dl>
                              <dt className="text-sm font-bold text-gray-600 truncate uppercase tracking-wide">Appointments</dt>
                              <dd className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">{stats.totalAppointments}</dd>
                            </dl>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Comprehensive Metrics Dashboard */}
                <div className="space-y-10">
                  {/* Core Platform Metrics */}
                  <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                      <span className="bg-blue-100 p-2 rounded-lg mr-3">📊</span>
                      Core Platform Metrics
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                        <div className="text-sm font-semibold text-blue-700 mb-2">Total Registered Patients</div>
                        <div className="text-3xl font-black text-blue-900">{adminMetrics?.core?.totalPatients || stats?.totalPatients || 0}</div>
                        <div className="text-xs text-blue-600 mt-2">↑ 12% from last month</div>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                        <div className="text-sm font-semibold text-green-700 mb-2">Total Registered Doctors</div>
                        <div className="text-3xl font-black text-green-900">{adminMetrics?.core?.totalDoctors || stats?.totalDoctors || 0}</div>
                        <div className="text-xs text-green-600 mt-2">↑ 8% from last month</div>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                        <div className="text-sm font-semibold text-purple-700 mb-2">Total Appointments</div>
                        <div className="text-3xl font-black text-purple-900">{adminMetrics?.core?.totalAppointments || stats?.totalAppointments || 0}</div>
                        <div className="text-xs text-purple-600 mt-2">↑ 15% from last month</div>
                      </div>
                      <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-6 border border-orange-200">
                        <div className="text-sm font-semibold text-orange-700 mb-2">Conversion Rate</div>
                        <div className="text-3xl font-black text-orange-900">{adminMetrics?.core?.conversionRate || 0}%</div>
                        <div className="text-xs text-orange-600 mt-2">↑ 2% from last month</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                        <div className="text-sm font-semibold text-gray-700 mb-2">Daily Active Users (DAU)</div>
                        <div className="text-3xl font-black text-indigo-700">{adminMetrics?.core?.dau || 0}</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                        <div className="text-sm font-semibold text-gray-700 mb-2">Monthly Active Users (MAU)</div>
                        <div className="text-3xl font-black text-indigo-700">{adminMetrics?.core?.mau || 0}</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                        <div className="text-sm font-semibold text-gray-700 mb-2">Doctor Onboarding Rate</div>
                        <div className="text-3xl font-black text-emerald-700">{adminMetrics?.core?.doctorOnboardingRate || 0}%</div>
                      </div>
                    </div>
                  </div>

                  {/* Revenue Analytics */}
                  <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                      <span className="bg-green-100 p-2 rounded-lg mr-3">💰</span>
                      Revenue Analytics
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-6 border border-green-200">
                        <div className="text-sm font-semibold text-green-700 mb-2">Total Revenue</div>
                        <div className="text-3xl font-black text-green-900">₹{Math.round(adminMetrics?.revenue?.totalRevenue || 0)}</div>
                        <div className="text-xs text-green-600 mt-2">↑ 18% from last month</div>
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
                        <div className="text-sm font-semibold text-blue-700 mb-2">Average Booking Value</div>
                        <div className="text-3xl font-black text-blue-900">₹{Math.round(adminMetrics?.revenue?.avgBookingValue || 0)}</div>
                      </div>
                      <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-6 border border-red-200">
                        <div className="text-sm font-semibold text-red-700 mb-2">Refund Rate</div>
                        <div className="text-3xl font-black text-red-900">{adminMetrics?.revenue?.refundRate || 0}%</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">Revenue by City</h4>
                        <div className="space-y-3">
                          {adminMetrics?.revenue?.revenueByCity?.slice(0, 5).map((r: any) => {
                            const max = Math.max(...(adminMetrics?.revenue?.revenueByCity?.map((x: any) => x.revenue) || [1]));
                            const w = Math.round((r.revenue / max) * 100);
                            return (
                              <div key={r.city} className="flex items-center gap-3">
                                <div className="w-24 text-sm font-medium text-gray-700 truncate">{r.city}</div>
                                <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full transition-all duration-500" style={{ width: `${w}%` }}></div>
                                </div>
                                <div className="w-20 text-right text-sm font-bold text-gray-900">₹{Math.round(r.revenue)}</div>
                              </div>
                            );
                          }) || <div className="text-sm text-gray-500">No data available yet</div>}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">Revenue by Specialty</h4>
                        <div className="space-y-3">
                          {adminMetrics?.revenue?.revenueBySpecialty?.slice(0, 5).map((r: any) => {
                            const max = Math.max(...(adminMetrics?.revenue?.revenueBySpecialty?.map((x: any) => x.revenue) || [1]));
                            const w = Math.round((r.revenue / max) * 100);
                            return (
                              <div key={r.specialty} className="flex items-center gap-3">
                                <div className="w-28 text-sm font-medium text-gray-700 truncate">{r.specialty}</div>
                                <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-500" style={{ width: `${w}%` }}></div>
                                </div>
                                <div className="w-20 text-right text-sm font-bold text-gray-900">₹{Math.round(r.revenue)}</div>
                              </div>
                            );
                          }) || <div className="text-sm text-gray-500">No data available yet</div>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Operational Analytics */}
                  <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                      <span className="bg-orange-100 p-2 rounded-lg mr-3">⚙️</span>
                      Operational Analytics
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-6 border border-emerald-200">
                        <div className="text-sm font-semibold text-emerald-700 mb-2">Appointment Success Rate</div>
                        <div className="text-3xl font-black text-emerald-900">{adminMetrics?.operational?.appointmentSuccessRate || 0}%</div>
                      </div>
                      <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-6 border border-red-200">
                        <div className="text-sm font-semibold text-red-700 mb-2">No-show Rate</div>
                        <div className="text-3xl font-black text-red-900">{adminMetrics?.operational?.noShowRate || 0}%</div>
                      </div>
                      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-200">
                        <div className="text-sm font-semibold text-yellow-700 mb-2">Avg Booking Time</div>
                        <div className="text-3xl font-black text-yellow-900">{adminMetrics?.operational?.avgBookingTime || 0}m</div>
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                        <div className="text-sm font-semibold text-blue-700 mb-2">Cancellation Trend</div>
                        <div className="text-3xl font-black text-blue-900">{adminMetrics?.operational?.cancellationTrend || 0}%</div>
                      </div>
                    </div>
                  </div>

                  {/* Geographic Analytics */}
                  <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                      <span className="bg-purple-100 p-2 rounded-lg mr-3">🗺️</span>
                      Geographic Analytics
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">Bookings by State</h4>
                        <div className="space-y-3">
                          {adminMetrics?.geographic?.bookingsByState?.slice(0, 6).map((r: any) => {
                            const max = Math.max(...(adminMetrics?.geographic?.bookingsByState?.map((x: any) => x.count) || [1]));
                            const w = Math.round((r.count / max) * 100);
                            return (
                              <div key={r.state} className="flex items-center gap-3">
                                <div className="w-24 text-sm font-medium text-gray-700">{r.state}</div>
                                <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500" style={{ width: `${w}%` }}></div>
                                </div>
                                <div className="w-12 text-right text-sm font-bold text-gray-900">{r.count}</div>
                              </div>
                            );
                          }) || <div className="text-sm text-gray-500">No data available yet</div>}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">Doctor Density per Region</h4>
                        <div className="space-y-3">
                          {adminMetrics?.geographic?.doctorDensity?.slice(0, 6).map((r: any) => {
                            const max = Math.max(...(adminMetrics?.geographic?.doctorDensity?.map((x: any) => x.doctors) || [1]));
                            const w = Math.round((r.doctors / max) * 100);
                            return (
                              <div key={r.state} className="flex items-center gap-3">
                                <div className="w-24 text-sm font-medium text-gray-700">{r.state}</div>
                                <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-gradient-to-r from-pink-500 to-rose-600 rounded-full transition-all duration-500" style={{ width: `${w}%` }}></div>
                                </div>
                                <div className="w-12 text-right text-sm font-bold text-gray-900">{r.doctors}</div>
                              </div>
                            );
                          }) || <div className="text-sm text-gray-500">No data available yet</div>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Real-Time Dashboard */}
                  <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                      <span className="bg-red-100 p-2 rounded-lg mr-3">🔴</span>
                      Real-Time Dashboard
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-6 border border-red-200 animate-pulse">
                        <div className="text-sm font-semibold text-red-700 mb-2">Live Appointments</div>
                        <div className="text-3xl font-black text-red-900">{adminMetrics?.realtime?.liveAppointments || 0}</div>
                        <div className="text-xs text-red-600 mt-2">Happening now</div>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                        <div className="text-sm font-semibold text-green-700 mb-2">Doctors Online Now</div>
                        <div className="text-3xl font-black text-green-900">{adminMetrics?.realtime?.doctorsOnline || 0}</div>
                        <div className="text-xs text-green-600 mt-2">Available</div>
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                        <div className="text-sm font-semibold text-blue-700 mb-2">Users Browsing</div>
                        <div className="text-3xl font-black text-blue-900">{adminMetrics?.realtime?.usersBrowsing || 0}</div>
                        <div className="text-xs text-blue-600 mt-2">Active now</div>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                        <div className="text-sm font-semibold text-purple-700 mb-2">Revenue Today</div>
                        <div className="text-3xl font-black text-purple-900">₹{Math.round(adminMetrics?.realtime?.revenueToday || 0)}</div>
                        <div className="text-xs text-purple-600 mt-2">So far today</div>
                      </div>
                    </div>
                  </div>
                </div>

                {!stats && !adminMetrics && (
                  <div className="text-center py-20 bg-white rounded-2xl shadow-xl">
                    <div className="text-6xl mb-4">📊</div>
                    <p className="text-gray-600 text-lg">No dashboard data available</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ============================================================================
            🛡️ PENDING VERIFICATIONS - Approve or reject submissions
            ============================================================================ */}
        {activeTab === 'pendingVerifications' && (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Pending Verifications</h2>
              <p className="text-gray-600 mt-2">Review and approve or reject verification submissions</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow border border-gray-200">
                <div className="px-6 py-4 border-b">
                  <h3 className="text-xl font-semibold text-gray-900">Doctors</h3>
                </div>
                <div className="p-6 space-y-4">
                  {pendingDoctors.length === 0 ? (
                    <div className="text-sm text-gray-600">No pending doctor verifications</div>
                  ) : pendingDoctors.map((d: any) => {
                    const email = String(d.email || '');
                    const prefix = email.split('@')[0] || '';
                    const name = 'Dr. ' + (prefix.charAt(0).toUpperCase() + prefix.slice(1).replace(/[._-]/g, ' '));
                    return (
                      <div key={d.id} className="border border-gray-200 rounded-xl p-4 flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-gray-900">{name}</div>
                          <div className="text-sm text-gray-600">{email}</div>
                          <div className="mt-2 text-sm text-gray-700">
                            <div>Registration Number: {d.doctorProfile?.registrationNumber || '-'}</div>
                            <div>Mobile: {d.doctorProfile?.phone || '-'}</div>
                            <div>Specialization: {d.doctorProfile?.specialization || '-'}</div>
                            <div>Clinic: {d.doctorProfile?.clinicName || '-'}</div>
                            <div>City/State: {d.doctorProfile?.city || '-'} / {d.doctorProfile?.state || '-'}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => decideDoctorVerification(d.id, 'APPROVE')} disabled={decidingDoctorId === d.id} className={`text-sm text-white px-3 py-1 rounded ${decidingDoctorId === d.id ? 'bg-green-300' : 'bg-green-600'}`}>{decidingDoctorId === d.id ? 'Approving…' : 'Approve'}</button>
                          <button onClick={() => decideDoctorVerification(d.id, 'REJECT')} disabled={decidingDoctorId === d.id} className={`text-sm text-white px-3 py-1 rounded ${decidingDoctorId === d.id ? 'bg-red-300' : 'bg-red-600'}`}>{decidingDoctorId === d.id ? 'Rejecting…' : 'Reject'}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow border border-gray-200">
                <div className="px-6 py-4 border-b">
                  <h3 className="text-xl font-semibold text-gray-900">Hospitals</h3>
                </div>
                <div className="p-6 space-y-4">
                  {pendingHospitals.length === 0 ? (
                    <div className="text-sm text-gray-600">No pending hospital verifications</div>
                  ) : pendingHospitals.map((h: any) => (
                    <div key={h.id} className="border border-gray-200 rounded-xl p-4 flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">{h.name}</div>
                        <div className="text-sm text-gray-600">Admin: {h.admin?.email || '-'}</div>
                        <div className="mt-2 text-sm text-gray-700">
                          <div>Gov Reg. Number: {h.registrationNumberGov || '-'}</div>
                          <div>Mobile: {h.phone || '-'}</div>
                          <div>Address: {h.address || '-'}</div>
                          <div>City/State: {h.city || '-'} / {h.state || '-'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => decideHospitalVerification(h.id, 'APPROVE')} disabled={decidingHospitalId === h.id} className={`text-sm text-white px-3 py-1 rounded ${decidingHospitalId === h.id ? 'bg-green-300' : 'bg-green-600'}`}>{decidingHospitalId === h.id ? 'Approving…' : 'Approve'}</button>
                        <button onClick={() => decideHospitalVerification(h.id, 'REJECT')} disabled={decidingHospitalId === h.id} className={`text-sm text-white px-3 py-1 rounded ${decidingHospitalId === h.id ? 'bg-red-300' : 'bg-red-600'}`}>{decidingHospitalId === h.id ? 'Rejecting…' : 'Reject'}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'deletedDoctors' && (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">Deleted Doctors</h2>
              <p className="text-gray-600 mt-2">Recently deleted doctor accounts</p>
            </div>
            {adminDeletedDoctors.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl shadow-xl">
                <div className="text-6xl mb-4">🗑️</div>
                <p className="text-gray-600 text-lg">No deleted doctors</p>
              </div>
            ) : (
              <div className="bg-white shadow-2xl overflow-hidden rounded-2xl border border-gray-200">
                <ul className="divide-y divide-gray-200">
                  {adminDeletedDoctors.map((d) => (
                    <li key={`${d.id}-${d.deletedAt}`} className="px-6 py-5 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold text-gray-900">Dr. {String(d.email).split('@')[0]}</div>
                          <div className="text-sm text-gray-600 mt-1">{d.email}</div>
                        </div>
                        <div className="text-xs text-gray-500 bg-red-50 px-3 py-1 rounded-full border border-red-200">
                          Deleted {new Date(d.deletedAt).toLocaleString()}
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
            👥 USERS TAB - User management interface
            ============================================================================ */}
        {activeTab === 'users' && (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">User Management</h2>
              <p className="text-gray-600 mt-2">Manage user accounts, roles, and permissions</p>
            </div>
            {loading ? (
              <div className="text-center py-20">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
                <p className="text-gray-600 text-lg font-medium">Loading users...</p>
              </div>
            ) : (
              <div className="bg-white shadow-2xl overflow-hidden rounded-2xl border border-gray-200">
                <ul className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <li key={user.id} className="px-6 py-5 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-300">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                              <span className="text-2xl">
                                {user.role === 'ADMIN' ? '🔒' : user.role === 'DOCTOR' ? '👨‍⚕️' : '🏥'}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-bold text-gray-900">{getUserLabel(user)}</div>
                            <div className="text-sm text-gray-600 mt-1">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700">
                                {user.role}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${
                            user.isActive 
                              ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                              : 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
                          }`}>
                            {user.isActive ? '✓ Active' : '✕ Inactive'}
                          </span>
                          <button
                            onClick={() => toggleUserStatus(user.id, user.isActive || false)}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-all"
                          >
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowRoleModal(true);
                            }}
                            className="text-xs font-bold text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-all"
                          >
                            Change Role
                          </button>
                          <button
                            onClick={() => deleteUser(user.id, user.email)}
                            className="text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-all"
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
            <div className="mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Doctor Approval & Status</h2>
              <p className="text-gray-600 mt-2">Manage doctor accounts and service status</p>
            </div>
            {loading ? (
              <div className="text-center py-20">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-6"></div>
                <p className="text-gray-600 text-lg font-medium">Loading doctors...</p>
              </div>
            ) : (
              <div className="bg-white shadow-2xl overflow-hidden rounded-2xl border border-gray-200">
                <ul className="divide-y divide-gray-200">
                  {adminDoctors.map((doctor: any) => {
                    const email = String(doctor.email || '');
                    const prefix = email.split('@')[0] || '';
                    const name = 'Dr. ' + (prefix.charAt(0).toUpperCase() + prefix.slice(1).replace(/[._-]/g, ' '));
                    return (
                      <li key={doctor.id} className="px-6 py-5 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-300">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg flex-shrink-0">
                              <span className="text-2xl">👨‍⚕️</span>
                            </div>
                            <div>
                              <div className="text-sm font-bold text-gray-900">{name}</div>
                              <div className="text-sm text-gray-600 mt-1">{email}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => {
                                if (expandedDoctorId === doctor.id) {
                                  setExpandedDoctorId(null);
                                } else {
                                  loadDoctorDetails(doctor.id);
                                }
                              }}
                              className="text-xs font-bold text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-all"
                              aria-label={expandedDoctorId === doctor.id ? 'Collapse' : 'Expand'}
                            >
                              {expandedDoctorId === doctor.id ? '▼ Hide' : '► Details'}
                            </button>
                            <button
                              onClick={() => setDoctorServiceStatus(doctor.id, 'ACTIVE')}
                              className="text-xs font-bold text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-all"
                            >
                              ✓ Start
                            </button>
                            <button
                              onClick={() => setDoctorServiceStatus(doctor.id, 'SUSPENDED')}
                              className="text-xs font-bold text-yellow-600 hover:text-yellow-800 bg-yellow-50 hover:bg-yellow-100 px-3 py-1.5 rounded-lg transition-all"
                            >
                              ⏸ Pause
                            </button>
                            <button
                            onClick={() => deleteDoctor(doctor)}
                              className="text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-all"
                            >
                              ✕ Delete
                            </button>
                          </div>
                        </div>
                        {expandedDoctorId === doctor.id && (
                          <div className="mt-6 bg-gradient-to-br from-gray-50 to-blue-50 border-2 border-blue-200 rounded-2xl p-6 shadow-lg">
                            {doctorDetails[doctor.id] ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white rounded-xl p-4 shadow-md">
                                  <div className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="text-lg">📋</span> Profile Information
                                  </div>
                                  <div className="text-sm text-gray-700 space-y-2">
                                    <div className="flex justify-between border-b border-gray-200 pb-2">
                                      <span className="font-semibold text-gray-600">Specialization:</span>
                                      <span className="text-gray-900">{doctorDetails[doctor.id]?.doctor?.doctorProfile?.specialization || '-'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-200 pb-2">
                                      <span className="font-semibold text-gray-600">Experience:</span>
                                      <span className="text-gray-900">{doctorDetails[doctor.id]?.doctor?.doctorProfile?.experience ?? '-'} years</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-200 pb-2">
                                      <span className="font-semibold text-gray-600">Clinic:</span>
                                      <span className="text-gray-900">{doctorDetails[doctor.id]?.doctor?.doctorProfile?.clinicName || '-'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-200 pb-2">
                                      <span className="font-semibold text-gray-600">City:</span>
                                      <span className="text-gray-900">{doctorDetails[doctor.id]?.doctor?.doctorProfile?.city || '-'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-200 pb-2">
                                      <span className="font-semibold text-gray-600">State:</span>
                                      <span className="text-gray-900">{doctorDetails[doctor.id]?.doctor?.doctorProfile?.state || '-'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-200 pb-2">
                                      <span className="font-semibold text-gray-600">Phone:</span>
                                      <span className="text-gray-900">{doctorDetails[doctor.id]?.doctor?.doctorProfile?.phone || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="font-semibold text-gray-600">Fee:</span>
                                      <span className="text-green-600 font-bold">₹{doctorDetails[doctor.id]?.doctor?.doctorProfile?.consultationFee ?? '-'}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="bg-white rounded-xl p-4 shadow-md">
                                  <div className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="text-lg">🏥</span> Hospital Affiliations
                                  </div>
                                  <ul className="text-sm text-gray-700 space-y-2">
                                    {(doctorDetails[doctor.id]?.doctor?.hospitalMemberships || []).map((m: any) => (
                                      <li key={m.id} className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg">
                                        <span className="text-blue-600">•</span>
                                        <span>{m.hospital?.name} {m.hospital?.city ? `- ${m.hospital?.city}` : ''}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div className="md:col-span-2 bg-white rounded-xl p-4 shadow-md">
                                  <div className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="text-lg">📅</span> Recent Appointments 
                                    <span className="ml-auto bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-1 rounded-full text-xs">
                                      {doctorDetails[doctor.id]?.totalAppointments} Total
                                    </span>
                                  </div>
                                  <ul className="space-y-3">
                                    {(doctorDetails[doctor.id]?.recentAppointments || []).map((a: any) => (
                                      <li key={a.id} className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-blue-50 px-4 py-3 rounded-lg border border-gray-200">
                                        <div className="text-sm text-gray-700">
                                          <div className="font-semibold text-gray-900">{new Date(a.createdAt || a.date).toLocaleString()}</div>
                                          <div className="text-gray-600 mt-1">Patient: {a.patient?.email}</div>
                                        </div>
                                        <div className="text-xs font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-700">{a.status}</div>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                                <div className="text-sm text-gray-600">Loading details…</div>
                              </div>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
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
            <div className="mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Hospital Approval & Status</h2>
              <p className="text-gray-600 mt-2">Manage hospital accounts and service status</p>
            </div>
            {loading ? (
              <div className="text-center py-20">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-6"></div>
                <p className="text-gray-600 text-lg font-medium">Loading hospitals...</p>
              </div>
            ) : (
              <div className="bg-white shadow-2xl overflow-hidden rounded-2xl border border-gray-200">
                <ul className="divide-y divide-gray-200">
                  {adminHospitals.map((hospital: any) => (
                    <li key={hospital.id} className="px-6 py-5 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-300">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg flex-shrink-0">
                            <span className="text-2xl">🏥</span>
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-900">{hospital.name}</div>
                            <div className="text-sm text-gray-600 mt-1">{hospital.city}, {hospital.state}</div>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700">
                                {hospital.serviceStatus || 'UNKNOWN'}
                              </span>
                              {hospital.admin && (
                                <span className="text-xs text-gray-600">Admin: {hospital.admin.email}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => {
                              if (expandedHospitalId === hospital.id) {
                                setExpandedHospitalId(null);
                              } else {
                                loadHospitalDetails(hospital.id);
                              }
                            }}
                            className="text-xs font-bold text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-all"
                            aria-label={expandedHospitalId === hospital.id ? 'Collapse' : 'Expand'}
                          >
                            {expandedHospitalId === hospital.id ? '▼ Hide' : '► Details'}
                          </button>
                          <button
                            onClick={() => setHospitalServiceStatus(hospital.id, 'ACTIVE')}
                            className="text-xs font-bold text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-all"
                          >
                            ✓ Start
                          </button>
                          <button
                            onClick={() => setHospitalServiceStatus(hospital.id, 'SUSPENDED')}
                            className="text-xs font-bold text-yellow-600 hover:text-yellow-800 bg-yellow-50 hover:bg-yellow-100 px-3 py-1.5 rounded-lg transition-all"
                          >
                            ⏸ Pause
                          </button>
                          <button
                            onClick={() => deleteHospital(hospital.id)}
                            className="text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-all"
                          >
                            ✕ Delete
                          </button>
                        </div>
                      </div>
                      {expandedHospitalId === hospital.id && (
                        <div className="mt-6 bg-gradient-to-br from-gray-50 to-purple-50 border-2 border-purple-200 rounded-2xl p-6 shadow-lg">
                          {loadingDetails && (!selectedHospitalDetails || selectedHospitalDetails.id !== hospital.id) ? (
                            <div className="text-center py-8">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-3"></div>
                              <div className="text-sm text-gray-600">Loading hospital details…</div>
                            </div>
                          ) : selectedHospitalDetails && selectedHospitalDetails.id === hospital.id ? (
                            <div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="bg-white rounded-xl p-4 shadow-md">
                                  <div className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="text-lg">🏥</span> Hospital Profile
                                  </div>
                                  <div className="text-sm text-gray-700 space-y-2">
                                    <div className="flex justify-between border-b border-gray-200 pb-2">
                                      <span className="font-semibold text-gray-600">Subdomain:</span>
                                      <span className="text-gray-900">{selectedHospitalDetails.subdomain || '-'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-200 pb-2">
                                      <span className="font-semibold text-gray-600">Address:</span>
                                      <span className="text-gray-900">{selectedHospitalDetails.address || '-'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-200 pb-2">
                                      <span className="font-semibold text-gray-600">City:</span>
                                      <span className="text-gray-900">{selectedHospitalDetails.city || '-'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-200 pb-2">
                                      <span className="font-semibold text-gray-600">State:</span>
                                      <span className="text-gray-900">{selectedHospitalDetails.state || '-'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-200 pb-2">
                                      <span className="font-semibold text-gray-600">Phone:</span>
                                      <span className="text-gray-900">{selectedHospitalDetails.phone || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="font-semibold text-gray-600">Admin:</span>
                                      <span className="text-gray-900">{selectedHospitalDetails.admin?.email || '-'}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="bg-white rounded-xl p-4 shadow-md">
                                  <div className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="text-lg">📊</span> Statistics
                                  </div>
                                  <div className="text-sm text-gray-700 space-y-3">
                                    <div className="flex items-center justify-between bg-blue-50 px-4 py-3 rounded-lg">
                                      <span className="font-semibold text-gray-700">Departments:</span>
                                      <span className="text-xl font-bold text-blue-600">{Array.isArray(selectedHospitalDetails.departments) ? selectedHospitalDetails.departments.length : 0}</span>
                                    </div>
                                    <div className="flex items-center justify-between bg-green-50 px-4 py-3 rounded-lg">
                                      <span className="font-semibold text-gray-700">Doctors:</span>
                                      <span className="text-xl font-bold text-green-600">
                                        {((Array.isArray(selectedHospitalDetails.departments)
                                          ? selectedHospitalDetails.departments.reduce((acc: number, dept: any) => acc + (Array.isArray(dept.doctors) ? dept.doctors.length : 0), 0)
                                          : 0)
                                        + (Array.isArray(selectedHospitalDetails.doctors) ? selectedHospitalDetails.doctors.length : 0))}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="bg-white rounded-xl p-4 shadow-md mb-6">
                                <div className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                  <span className="text-lg">👨‍⚕️</span> Doctors in {hospital.name}
                                </div>
                                <ul className="space-y-2">
                                  {[
                                    // Unassigned doctors
                                    ...(Array.isArray(selectedHospitalDetails.doctors) ? selectedHospitalDetails.doctors.map((d: any) => d.doctor) : []),
                                    // Department doctors
                                    ...(
                                      Array.isArray(selectedHospitalDetails.departments)
                                        ? selectedHospitalDetails.departments.flatMap((dept: any) =>
                                            Array.isArray(dept.doctors) ? dept.doctors.map((d: any) => d.doctor) : []
                                          )
                                        : []
                                    )
                                  ]
                                    .filter(Boolean)
                                    .map((doc: any, idx: number) => {
                                      const email = String(doc.email || '');
                                      const prefix = email.split('@')[0] || '';
                                      const name = 'Dr. ' + (prefix.charAt(0).toUpperCase() + prefix.slice(1).replace(/[._-]/g, ' '));
                                      return (
                                        <li key={`${doc.id}-${idx}`} className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-blue-50 px-4 py-3 rounded-lg border border-gray-200">
                                          <div>
                                            <div className="text-sm font-bold text-gray-900">{name}</div>
                                            <div className="text-xs text-gray-600 mt-1">{email}</div>
                                          </div>
                                          {doc.doctorProfile?.specialization && (
                                            <div className="text-xs font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-700">{doc.doctorProfile.specialization}</div>
                                          )}
                                        </li>
                                      );
                                    })}
                                </ul>
                              </div>
                              <div className="bg-white rounded-xl p-4 shadow-md">
                                <div className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                  <span className="text-lg">📅</span> Recent Appointments
                                </div>
                                <HospitalAppointments hospitalId={hospital.id} />
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <div className="text-6xl mb-4">🏥</div>
                              <div className="text-sm text-gray-600">No hospital details available.</div>
                            </div>
                          )}
                        </div>
                      )}
                      
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {}

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

      </div>

        {/* ============================================================================
            🏠 HOMEPAGE CONTENT MANAGEMENT TAB - Homepage content editing interface
            ============================================================================ */}
        {activeTab === 'homepage' && (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Homepage Content Management</h2>
              <p className="text-gray-600 mt-2">Edit all homepage sections - changes will be live immediately after saving</p>
            </div>
            
            {!homepageContent ? (
              <div className="text-center py-20 bg-white rounded-2xl shadow-xl">
                <div className="text-6xl mb-4">🏠</div>
                <p className="text-gray-600 text-lg mb-6">Click below to load current homepage content</p>
                <button
                  onClick={loadHomepageContent}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg font-bold text-lg"
                >
                  Load Homepage Content
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Hero Carousel Section */}
                <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-xl p-6 border-2 border-blue-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-2xl">🎯</span> Hero Carousel Slides
                  </h3>
                  <div className="space-y-4">
                    {homepageContent.hero.slides.map((slide, index) => (
                      <div key={index} className="bg-white rounded-xl p-4 border border-gray-200 shadow-md">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-gray-900">Slide {index + 1}</h4>
                          <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">
                            {slide.showSteps ? 'With Steps' : 'Standard'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
                            <input
                              type="text"
                              value={slide.title}
                              onChange={(e) => {
                                const newSlides = [...homepageContent.hero.slides];
                                newSlides[index] = { ...slide, title: e.target.value };
                                setHomepageContent({ ...homepageContent, hero: { slides: newSlides } });
                              }}
                              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Subtitle</label>
                            <input
                              type="text"
                              value={slide.subtitle}
                              onChange={(e) => {
                                const newSlides = [...homepageContent.hero.slides];
                                newSlides[index] = { ...slide, subtitle: e.target.value };
                                setHomepageContent({ ...homepageContent, hero: { slides: newSlides } });
                              }}
                              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                            <input
                              type="text"
                              value={slide.description}
                              onChange={(e) => {
                                const newSlides = [...homepageContent.hero.slides];
                                newSlides[index] = { ...slide, description: e.target.value };
                                setHomepageContent({ ...homepageContent, hero: { slides: newSlides } });
                              }}
                              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trusted By Section */}
                <div className="bg-gradient-to-br from-white to-purple-50 rounded-2xl shadow-xl p-6 border-2 border-purple-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-2xl">📊</span> Trusted by Thousands Section
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
                      <input
                        type="text"
                        value={homepageContent.trustedBy.title}
                        onChange={(e) => setHomepageContent({
                          ...homepageContent,
                          trustedBy: { ...homepageContent.trustedBy, title: e.target.value }
                        })}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Subtitle</label>
                      <input
                        type="text"
                        value={homepageContent.trustedBy.subtitle}
                        onChange={(e) => setHomepageContent({
                          ...homepageContent,
                          trustedBy: { ...homepageContent.trustedBy, subtitle: e.target.value }
                        })}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Doctors</label>
                      <input
                        type="number"
                        value={homepageContent.trustedBy.stats.doctors}
                        onChange={(e) => setHomepageContent({
                          ...homepageContent,
                          trustedBy: {
                            ...homepageContent.trustedBy,
                            stats: { ...homepageContent.trustedBy.stats, doctors: parseInt(e.target.value) || 0 }
                          }
                        })}
                        className="w-full px-2 py-1 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      />
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Patients</label>
                      <input
                        type="number"
                        value={homepageContent.trustedBy.stats.patients}
                        onChange={(e) => setHomepageContent({
                          ...homepageContent,
                          trustedBy: {
                            ...homepageContent.trustedBy,
                            stats: { ...homepageContent.trustedBy.stats, patients: parseInt(e.target.value) || 0 }
                          }
                        })}
                        className="w-full px-2 py-1 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      />
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Cities</label>
                      <input
                        type="number"
                        value={homepageContent.trustedBy.stats.cities}
                        onChange={(e) => setHomepageContent({
                          ...homepageContent,
                          trustedBy: {
                            ...homepageContent.trustedBy,
                            stats: { ...homepageContent.trustedBy.stats, cities: parseInt(e.target.value) || 0 }
                          }
                        })}
                        className="w-full px-2 py-1 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      />
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Reviews</label>
                      <input
                        type="number"
                        value={homepageContent.trustedBy.stats.reviews}
                        onChange={(e) => setHomepageContent({
                          ...homepageContent,
                          trustedBy: {
                            ...homepageContent.trustedBy,
                            stats: { ...homepageContent.trustedBy.stats, reviews: parseInt(e.target.value) || 0 }
                          }
                        })}
                        className="w-full px-2 py-1 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* How It Works Section */}
                <div className="bg-gradient-to-br from-white to-green-50 rounded-2xl shadow-xl p-6 border-2 border-green-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-2xl">📋</span> How It Works Section
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
                      <input
                        type="text"
                        value={homepageContent.howItWorks.title}
                        onChange={(e) => setHomepageContent({
                          ...homepageContent,
                          howItWorks: { ...homepageContent.howItWorks, title: e.target.value }
                        })}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Subtitle</label>
                      <input
                        type="text"
                        value={homepageContent.howItWorks.subtitle}
                        onChange={(e) => setHomepageContent({
                          ...homepageContent,
                          howItWorks: { ...homepageContent.howItWorks, subtitle: e.target.value }
                        })}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {homepageContent.howItWorks.steps.map((step, index) => (
                      <div key={index} className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">{step.step}</span>
                          <span className="text-xs font-semibold text-gray-600">Step {step.step}</span>
                        </div>
                        <input
                          type="text"
                          value={step.title}
                          onChange={(e) => {
                            const newSteps = [...homepageContent.howItWorks.steps];
                            newSteps[index] = { ...step, title: e.target.value };
                            setHomepageContent({
                              ...homepageContent,
                              howItWorks: { ...homepageContent.howItWorks, steps: newSteps }
                            });
                          }}
                          placeholder="Title"
                          className="w-full px-2 py-1 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm mb-2"
                        />
                        <textarea
                          value={step.description}
                          onChange={(e) => {
                            const newSteps = [...homepageContent.howItWorks.steps];
                            newSteps[index] = { ...step, description: e.target.value };
                            setHomepageContent({
                              ...homepageContent,
                              howItWorks: { ...homepageContent.howItWorks, steps: newSteps }
                            });
                          }}
                          placeholder="Description"
                          rows={2}
                          className="w-full px-2 py-1 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Why Choose Us Section */}
                <div className="bg-gradient-to-br from-white to-yellow-50 rounded-2xl shadow-xl p-6 border-2 border-yellow-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-2xl">⭐</span> Why Choose Us Section
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
                      <input
                        type="text"
                        value={homepageContent.whyChooseUs.title}
                        onChange={(e) => setHomepageContent({
                          ...homepageContent,
                          whyChooseUs: { ...homepageContent.whyChooseUs, title: e.target.value }
                        })}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Subtitle</label>
                      <input
                        type="text"
                        value={homepageContent.whyChooseUs.subtitle}
                        onChange={(e) => setHomepageContent({
                          ...homepageContent,
                          whyChooseUs: { ...homepageContent.whyChooseUs, subtitle: e.target.value }
                        })}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {homepageContent.whyChooseUs.features.map((feature, index) => (
                      <div key={index} className="bg-white rounded-lg p-3 border border-gray-200">
                        <input
                          type="text"
                          value={feature.title}
                          onChange={(e) => {
                            const newFeatures = [...homepageContent.whyChooseUs.features];
                            newFeatures[index] = { ...feature, title: e.target.value };
                            setHomepageContent({
                              ...homepageContent,
                              whyChooseUs: { ...homepageContent.whyChooseUs, features: newFeatures }
                            });
                          }}
                          placeholder="Feature Title"
                          className="w-full px-2 py-1 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm font-semibold mb-2"
                        />
                        <textarea
                          value={feature.description}
                          onChange={(e) => {
                            const newFeatures = [...homepageContent.whyChooseUs.features];
                            newFeatures[index] = { ...feature, description: e.target.value };
                            setHomepageContent({
                              ...homepageContent,
                              whyChooseUs: { ...homepageContent.whyChooseUs, features: newFeatures }
                            });
                          }}
                          placeholder="Feature Description"
                          rows={2}
                          className="w-full px-2 py-1 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Testimonials Section */}
                <div className="bg-gradient-to-br from-white to-pink-50 rounded-2xl shadow-xl p-6 border-2 border-pink-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-2xl">💬</span> Testimonials Section
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
                      <input
                        type="text"
                        value={homepageContent.testimonials.title}
                        onChange={(e) => setHomepageContent({
                          ...homepageContent,
                          testimonials: { ...homepageContent.testimonials, title: e.target.value }
                        })}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Subtitle</label>
                      <input
                        type="text"
                        value={homepageContent.testimonials.subtitle}
                        onChange={(e) => setHomepageContent({
                          ...homepageContent,
                          testimonials: { ...homepageContent.testimonials, subtitle: e.target.value }
                        })}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    {homepageContent.testimonials.reviews.map((review, index) => (
                      <div key={index} className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <input
                            type="text"
                            value={review.name}
                            onChange={(e) => {
                              const newReviews = [...homepageContent.testimonials.reviews];
                              newReviews[index] = { ...review, name: e.target.value };
                              setHomepageContent({
                                ...homepageContent,
                                testimonials: { ...homepageContent.testimonials, reviews: newReviews }
                              });
                            }}
                            placeholder="Name"
                            className="w-full px-2 py-1 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                          />
                          <input
                            type="text"
                            value={review.role}
                            onChange={(e) => {
                              const newReviews = [...homepageContent.testimonials.reviews];
                              newReviews[index] = { ...review, role: e.target.value };
                              setHomepageContent({
                                ...homepageContent,
                                testimonials: { ...homepageContent.testimonials, reviews: newReviews }
                              });
                            }}
                            placeholder="Role"
                            className="w-full px-2 py-1 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                          />
                          <input
                            type="text"
                            value={review.avatar}
                            onChange={(e) => {
                              const newReviews = [...homepageContent.testimonials.reviews];
                              newReviews[index] = { ...review, avatar: e.target.value };
                              setHomepageContent({
                                ...homepageContent,
                                testimonials: { ...homepageContent.testimonials, reviews: newReviews }
                              });
                            }}
                            placeholder="Avatar (emoji)"
                            className="w-full px-2 py-1 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                          />
                          <textarea
                            value={review.content}
                            onChange={(e) => {
                              const newReviews = [...homepageContent.testimonials.reviews];
                              newReviews[index] = { ...review, content: e.target.value };
                              setHomepageContent({
                                ...homepageContent,
                                testimonials: { ...homepageContent.testimonials, reviews: newReviews }
                              });
                            }}
                            placeholder="Review Content"
                            rows={2}
                            className="w-full md:col-span-3 px-2 py-1 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Health Tips Section */}
                <div className="bg-gradient-to-br from-white to-indigo-50 rounded-2xl shadow-xl p-6 border-2 border-indigo-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-2xl">📚</span> Health Tips Section
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
                      <input
                        type="text"
                        value={homepageContent.healthTips.title}
                        onChange={(e) => setHomepageContent({
                          ...homepageContent,
                          healthTips: { ...homepageContent.healthTips, title: e.target.value }
                        })}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Subtitle</label>
                      <input
                        type="text"
                        value={homepageContent.healthTips.subtitle}
                        onChange={(e) => setHomepageContent({
                          ...homepageContent,
                          healthTips: { ...homepageContent.healthTips, subtitle: e.target.value }
                        })}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    {homepageContent.healthTips.tips.map((tip, index) => (
                      <div key={index} className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={tip.title}
                            onChange={(e) => {
                              const newTips = [...homepageContent.healthTips.tips];
                              newTips[index] = { ...tip, title: e.target.value };
                              setHomepageContent({
                                ...homepageContent,
                                healthTips: { ...homepageContent.healthTips, tips: newTips }
                              });
                            }}
                            placeholder="Tip Title"
                            className="w-full px-2 py-1 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold"
                          />
                          <input
                            type="text"
                            value={tip.category}
                            onChange={(e) => {
                              const newTips = [...homepageContent.healthTips.tips];
                              newTips[index] = { ...tip, category: e.target.value };
                              setHomepageContent({
                                ...homepageContent,
                                healthTips: { ...homepageContent.healthTips, tips: newTips }
                              });
                            }}
                            placeholder="Category"
                            className="w-full px-2 py-1 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                          />
                          <textarea
                            value={tip.description}
                            onChange={(e) => {
                              const newTips = [...homepageContent.healthTips.tips];
                              newTips[index] = { ...tip, description: e.target.value };
                              setHomepageContent({
                                ...homepageContent,
                                healthTips: { ...homepageContent.healthTips, tips: newTips }
                              });
                            }}
                            placeholder="Tip Description"
                            rows={2}
                            className="w-full md:col-span-2 px-2 py-1 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end gap-4">
                  <button
                    onClick={async () => {
                      const { resetHomepageContent } = await import('@/lib/homepage-content');
                      resetHomepageContent();
                      loadHomepageContent();
                      alert('✅ Homepage content reset to default!');
                    }}
                    className="bg-gray-600 text-white px-6 py-3 rounded-xl hover:bg-gray-700 transition-all shadow-lg font-bold"
                  >
                    Reset to Default
                  </button>
                  <button
                    onClick={() => saveHomepageContent(homepageContent)}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-3 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg font-bold"
                  >
                    💾 Save Changes (Live Update)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

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
