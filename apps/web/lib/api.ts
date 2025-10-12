// ============================================================================
// 🌐 API CLIENT - Backend Communication Layer
// ============================================================================
// This file contains all the functions needed to communicate with the backend API
// It handles HTTP requests, authentication tokens, and data formatting
// All frontend components use this client to interact with the server
// 
// IMPORTANT: This is the bridge between frontend and backend - all API calls go through here
// ============================================================================

// ============================================================================
// 🔗 API CONFIGURATION - Server connection settings
// ============================================================================
// Prefer relative paths with Next.js dev rewrites in the browser.
// For server-side rendering, if no base URL is set, use the backend host.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

// ============================================================================
// 🏗️ INTERFACE DEFINITIONS - TypeScript types for our data
// ============================================================================
export interface User {
  id: number;                                              // Unique user identifier from database
  email: string;                                           // User's email address
  role: string;                                            // User's role (PATIENT, DOCTOR, ADMIN)
}

export interface DoctorProfile {
  id: number;                                              // Unique profile identifier
  userId: number;                                          // ID of the user this profile belongs to
  slug?: string;                                           // URL-friendly identifier for microsite
  specialization: string;                                   // Medical specialty (e.g., "Cardiology")
  qualifications?: string;                                  // Doctor's qualifications and degrees
  experience?: number;                                      // Years of experience
  clinicName?: string;                                     // Name of the doctor's clinic
  clinicAddress: string;                                   // Physical address of the clinic
  city?: string;                                           // City where clinic is located
  state?: string;                                          // State/province where clinic is located
  phone: string;                                           // Contact phone number
  consultationFee: number;                                 // Cost of consultation
  createdAt: string;                                       // When profile was created
  updatedAt: string;                                       // When profile was last updated
}

export interface Doctor extends User {
  doctorProfile: DoctorProfile | null;                     // Doctor's professional profile (null if not created yet)
}

export interface Appointment {
  id: number;                                              // Unique appointment identifier
  date: string;                                            // Appointment date and time
  time?: string;                                           // Appointment time (HH:mm) if provided
  reason?: string;                                         // Reason for appointment (optional)
  status: string;                                          // Current status (PENDING, CONFIRMED, CANCELLED, COMPLETED)
  createdAt: string;                                       // When appointment was created
  updatedAt: string;                                       // When appointment was last updated
  doctorId: number;                                        // ID of the doctor
  patientId: number;                                       // ID of the patient
  doctor: User;                                            // Doctor's user information
  patient: User;                                           // Patient's user information
}

// 📆 Doctor Time-Off periods (blackout windows where booking is blocked)
export interface DoctorTimeOff {
  id: number;
  doctorProfileId: number;
  start: string;         // ISO datetime string
  end: string;           // ISO datetime string
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

// 🕒 Doctor Working Hours (day-wise)
export interface DoctorWorkingHours {
  id: number;
  doctorProfileId: number;
  dayOfWeek: number;      // 0=Sunday, 6=Saturday
  startTime: string;       // HH:mm
  endTime: string;         // HH:mm
  createdAt: string;
  updatedAt: string;
}

// =========================================================================
// 🕒 SLOT DEFINITIONS - Availability slots for doctors
// =========================================================================
export interface Slot {
  id: number;
  doctorId: number;
  date: string;            // YYYY-MM-DD
  time: string;            // HH:mm
  status: 'AVAILABLE' | 'BOOKED' | 'CANCELLED';
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginResponse {
  message: string;                                          // Success/error message from server
  token: string;                                            // JWT authentication token
}

export interface RegisterResponse {
  message: string;                                          // Success/error message from server
  user: User;                                               // Created user information
}

// ============================================================================
// 🚀 API CLIENT CLASS - Main class for making HTTP requests
// ============================================================================
// This class handles all communication with the backend server
// It automatically includes authentication tokens and handles common HTTP operations
class ApiClient {
  // ============================================================================
  // 🎯 PRIVATE PROPERTIES - Internal state management
  // ============================================================================
  private baseURL: string;                                  // Base URL for all API requests
  private token: string | null;                             // Current authentication token

  // ============================================================================
  // 🏗️ CONSTRUCTOR - Initialize the API client
  // ============================================================================
  constructor(baseURL: string = API_BASE_URL) {
    // In SSR, relative '/api' won't pass through Next.js rewrites.
    // Ensure server-side requests use an absolute backend URL.
    if (typeof window === 'undefined' && (!baseURL || baseURL.trim() === '')) {
      baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    }
    this.baseURL = baseURL;                                 // Set the server address
    this.token = this.getStoredToken();                     // Load any existing token from storage
  }

  // ============================================================================
  // 🎫 TOKEN MANAGEMENT - Functions to handle authentication tokens
  // ============================================================================
  
  // Get token from browser's localStorage
  private getStoredToken(): string | null {
    if (typeof window !== 'undefined') {                    // Check if we're in a browser environment
      return localStorage.getItem('authToken');              // Retrieve token from localStorage
    }
    return null;                                            // Return null if not in browser
  }

  // Save token to browser's localStorage
  private setStoredToken(token: string): void {
    if (typeof window !== 'undefined') {                    // Check if we're in a browser environment
      localStorage.setItem('authToken', token);              // Store token in localStorage
    }
  }

  // Remove token from browser's localStorage
  private removeStoredToken(): void {
    if (typeof window !== 'undefined') {                    // Check if we're in a browser environment
      localStorage.removeItem('authToken');                  // Remove token from localStorage
    }
  }

  // Set the current authentication token
  setToken(token: string): void {
    this.token = token;                                     // Store token in memory
    this.setStoredToken(token);                             // Save token to localStorage
  }

  // Get the current authentication token
  getToken(): string | null {
    return this.token;                                      // Return current token
  }

  // Clear the current authentication token
  clearToken(): void {
    this.token = null;                                      // Clear token from memory
    this.removeStoredToken();                               // Remove token from localStorage
  }

  // ============================================================================
  // 🌐 HTTP REQUEST HANDLER - Core function for making API calls
  // ============================================================================
  // This function handles all HTTP requests to the backend
  // It automatically includes authentication headers and handles common errors
  private async request<T>(
    endpoint: string,                                       // API endpoint (e.g., "/api/login")
    options: RequestInit = {}                               // HTTP options (method, body, headers)
  ): Promise<T> {
    try {
      // ============================================================================
      // 🔗 URL CONSTRUCTION - Build the full URL for the request
      // ============================================================================
      const url = `${this.baseURL}${endpoint}`; // if baseURL is empty, use relative path
      
      // ============================================================================
      // 📨 HEADER PREPARATION - Set up request headers
      // ============================================================================
      const headers: any = {
        'Content-Type': 'application/json',                  // Tell server we're sending JSON
        ...options.headers,                                  // Include any custom headers
      };

      // ============================================================================
      // 🔐 AUTHENTICATION HEADER - Add token if available
      // ============================================================================
      if (this.token) {
        headers.Authorization = `Bearer ${this.token}`;      // Include JWT token in Authorization header
      }

      // ============================================================================
      // 🌐 HTTP REQUEST - Make the actual request to the server
      // ============================================================================
      const response = await fetch(url, {
        ...options,                                         // Include all provided options
        headers,                                             // Use our prepared headers
      });

      // ============================================================================
      // ❌ ERROR HANDLING - Check if request was successful
      // ============================================================================
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        const message = errorData.message || `HTTP error! status: ${response.status}`;
        // Auto-handle invalid/expired tokens: clear and hint to re-login
        if (typeof window !== 'undefined' && response.status === 401 && /invalid token|jwt|unauthorized/i.test(message)) {
          try { localStorage.removeItem('authToken'); } catch {}
        }
        throw new Error(message);
      }

      // ============================================================================
      // ✅ SUCCESS RESPONSE - Parse and return the response data
      // ============================================================================
      return response.json();
    } catch (error) {
      // ============================================================================
      // 🐛 ERROR LOGGING - Log errors for debugging
      // ============================================================================
      console.error('API request error:', error);
      throw error;                                           // Re-throw error for component handling
    }
  }

  // ============================================================================
  // 🔐 AUTHENTICATION ENDPOINTS - User login and registration
  // ============================================================================
  
  // Log in an existing user
  async login(email: string, password: string): Promise<LoginResponse> {
    return this.request<LoginResponse>('/api/login', {
      method: 'POST',                                       // HTTP POST method
      body: JSON.stringify({ email, password }),            // Send credentials as JSON
    });
  }

  // Register a new user
  async register(email: string, password: string, role: string): Promise<RegisterResponse> {
    return this.request<RegisterResponse>('/api/register', {
      method: 'POST',                                       // HTTP POST method
      body: JSON.stringify({ email, password, role }),      // Send user data as JSON
    });
  }

  // ============================================================================
  // 👨‍⚕️ DOCTOR ENDPOINTS - Doctor profile management
  // ============================================================================
  
  // Get list of all doctors, with optional sort/pagination
  async getDoctors(params?: { sort?: 'trending' | 'recent' | 'default'; page?: number; pageSize?: number }): Promise<Doctor[]> {
    const query = new URLSearchParams();
    if (params?.sort) query.set('sort', params.sort);
    if (params?.page && params.page > 0) query.set('page', String(params.page));
    if (params?.pageSize && params.pageSize > 0) query.set('pageSize', String(params.pageSize));
    const qs = query.toString();
    const endpoint = qs ? `/api/doctors?${qs}` : '/api/doctors';
    return this.request<Doctor[]>(endpoint);
  }

  // Create a new doctor account and link to a hospital (admin-only)
  async createHospitalDoctor(hospitalId: number, payload: { name: string; primarySpecialty?: string; subSpecialty?: string; departmentId?: number }): Promise<any> {
    return this.request(`/api/hospitals/${hospitalId}/doctors/create`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Get doctor by their unique slug
  async getDoctorBySlug(slug: string): Promise<Doctor> {
    return this.request<Doctor>(`/api/doctors/slug/${slug}`);
  }

  // Set doctor slug (debug endpoint)
  async setDoctorSlug(email: string, slug: string): Promise<any> {
    return this.request('/api/debug/doctor/slug', {
      method: 'POST',
      body: JSON.stringify({ email, slug }),
    });
  }

  // Get current doctor's profile
  async getDoctorProfile(): Promise<DoctorProfile> {
    return this.request<DoctorProfile>('/api/doctor/profile');
  }

  // Get doctor dashboard statistics
  async getDoctorStats(): Promise<any> {
    return this.request('/api/doctor/stats');
  }

  // Doctor slot period preference (minutes)
  async getDoctorSlotPeriod(): Promise<{ slotPeriodMinutes: number }> {
    return this.request<{ slotPeriodMinutes: number }>('/api/doctor/slot-period');
  }

  async setDoctorSlotPeriod(slotPeriodMinutes: number): Promise<{ slotPeriodMinutes: number }> {
    return this.request<{ slotPeriodMinutes: number }>('/api/doctor/slot-period', {
      method: 'PUT',
      body: JSON.stringify({ slotPeriodMinutes }),
    });
  }

  // Create doctor profile
  async createDoctorProfile(profileData: any): Promise<any> {
    return this.request('/api/doctor/profile', {
      method: 'POST',                                       // HTTP POST method
      body: JSON.stringify(profileData),                    // Send profile data as JSON
    });
  }

  // Update doctor profile
  async updateDoctorProfile(profileData: any): Promise<any> {
    return this.request('/api/doctor/profile', {
      method: 'PUT',                                        // HTTP PUT method for updates
      body: JSON.stringify(profileData),                    // Send profile data as JSON
    });
  }

  // Slot Admin management (Doctor)
  async getDoctorSlotAdmin(): Promise<{ slotAdmin: { id: number; email: string } | null }> {
    return this.request('/api/doctor/slot-admin');
  }

  async upsertDoctorSlotAdmin(email: string, password: string): Promise<{ message: string; slotAdmin: { id: number; email: string } }> {
    return this.request('/api/doctor/slot-admin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  // ============================================================================
  // 📅 APPOINTMENT ENDPOINTS - Appointment booking and management
  // ============================================================================
  
  // Book a new appointment
  async bookAppointment(appointmentData: { doctorId: number; date: string; time: string; reason?: string }): Promise<any> {
    return this.request('/api/appointments', {
      method: 'POST',                                       // HTTP POST method
      body: JSON.stringify(appointmentData),                // Send appointment data as JSON
    });
  }

  // Get user's appointments
  async getMyAppointments(): Promise<Appointment[]> {
    return this.request<Appointment[]>('/api/my-appointments');
  }

  // =========================================================================
  // 🕒 SLOT ENDPOINTS - Manage doctor availability slots
  // =========================================================================
  async getSlots(params?: { doctorId?: number; date?: string }): Promise<Slot[]> {
    const query = new URLSearchParams();
    if (params?.doctorId) query.set('doctorId', String(params.doctorId));
    if (params?.date) query.set('date', params.date);
    const qs = query.toString();
    const endpoint = qs ? `/api/slots?${qs}` : '/api/slots';
    return this.request<Slot[]>(endpoint);
  }

  // Hour-level availability for a doctor on a date
  async getAvailability(params: { doctorId: number; date: string }): Promise<{ periodMinutes: number; hours: { hour: string; capacity: number; bookedCount: number; isFull: boolean; labelFrom: string; labelTo: string }[] }>
  {
    const query = new URLSearchParams();
    query.set('doctorId', String(params.doctorId));
    query.set('date', params.date);
    return this.request(`/api/availability?${query.toString()}`);
  }

  // Combined slots and availability endpoint for better performance
  async getSlotsAndAvailability(params: { doctorId: number; date: string }): Promise<{ 
    slots: Slot[]; 
    availability: { periodMinutes: number; hours: { hour: string; capacity: number; bookedCount: number; isFull: boolean; labelFrom: string; labelTo: string }[] }; 
    availableTimes: string[] 
  }> {
    const query = new URLSearchParams();
    query.set('doctorId', String(params.doctorId));
    query.set('date', params.date);
    return this.request(`/api/slots-availability?${query.toString()}`);
  }

  async createSlot(data: { date: string; time: string }): Promise<Slot> {
    return this.request<Slot>('/api/slots', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async cancelSlot(slotId: number): Promise<Slot> {
    return this.request<Slot>(`/api/slots/${slotId}/cancel`, {
      method: 'PATCH',
    });
  }

  // Slot Admin scoped slots
  async getSlotAdminSlots(): Promise<Slot[]> {
    return this.request<Slot[]>(`/api/slot-admin/slots`);
  }

  async cancelSlotAsAdmin(slotId: number): Promise<Slot> {
    return this.request<Slot>(`/api/slot-admin/slots/${slotId}/cancel`, {
      method: 'PATCH',
    });
  }

  // Slot Admin appointments for managed doctor
  async getSlotAdminAppointments(): Promise<Appointment[]> {
    return this.request<Appointment[]>(`/api/slot-admin/appointments`);
  }

  async updateSlotAdminAppointmentStatus(appointmentId: number, status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'): Promise<{ message: string; appointment: Appointment }> {
    return this.request<{ message: string; appointment: Appointment }>(`/api/slot-admin/appointments/${appointmentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async cancelSlotAdminAppointment(appointmentId: number, reason?: string): Promise<{ message: string; appointment: Appointment }> {
    return this.request<{ message: string; appointment: Appointment }>(`/api/slot-admin/appointments/${appointmentId}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  }

  // Slot Admin time-off management for managed doctor
  async getSlotAdminTimeOff(params?: { doctorProfileId?: number }): Promise<DoctorTimeOff[]> {
    const query = new URLSearchParams();
    if (params?.doctorProfileId) query.set('doctorProfileId', String(params.doctorProfileId));
    const qs = query.toString();
    const endpoint = qs ? `/api/slot-admin/time-off?${qs}` : `/api/slot-admin/time-off`;
    return this.request<DoctorTimeOff[]>(endpoint);
  }

  async getSlotAdminWorkingHours(params?: { doctorId?: number }): Promise<DoctorWorkingHours[]> {
    const query = new URLSearchParams();
    if (params?.doctorId) query.set('doctorId', String(params.doctorId));
    const qs = query.toString();
    const endpoint = qs ? `/api/slot-admin/working-hours?${qs}` : `/api/slot-admin/working-hours`;
    return this.request<DoctorWorkingHours[]>(endpoint);
  }

  async setSlotAdminWorkingHours(hours: Array<{ dayOfWeek: number; startTime: string; endTime: string }>, doctorId?: number): Promise<DoctorWorkingHours[]> {
    const body: any = { hours };
    if (doctorId) body.doctorId = doctorId;
    return this.request<DoctorWorkingHours[]>(`/api/slot-admin/working-hours`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async createSlotAdminTimeOff(data: { start: string; end: string; reason?: string; doctorProfileId?: number }): Promise<DoctorTimeOff> {
    return this.request<DoctorTimeOff>(`/api/slot-admin/time-off`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteSlotAdminTimeOff(id: number): Promise<{ message: string } | DoctorTimeOff> {
    return this.request<{ message: string } | DoctorTimeOff>(`/api/slot-admin/time-off/${id}`, {
      method: 'DELETE',
    });
  }

  // Slot Admin: list doctors within management scope
  async getSlotAdminDoctors(): Promise<Array<{ id: number; email: string; doctorProfileId: number }>> {
    return this.request<Array<{ id: number; email: string; doctorProfileId: number }>>(`/api/slot-admin/doctors`);
  }

  // ============================================================================
  // 🔒 ADMIN ENDPOINTS - Administrative functions (admin only)
  // ============================================================================
  
  // Get all users (for debugging/admin)
  async getUsers(): Promise<User[]> {
    return this.request<User[]>('/api/users');
  }

  // Get admin dashboard statistics
  async getAdminDashboard(): Promise<any> {
    return this.request('/api/admin/dashboard');
  }

  // Get all users for admin management
  async getAdminUsers(): Promise<User[]> {
    return this.request<User[]>('/api/admin/users');
  }

  // Get all appointments for admin management
  async getAdminAppointments(): Promise<Appointment[]> {
    return this.request<Appointment[]>('/api/admin/appointments');
  }

  // Get admin audit logs
  async getAdminAuditLogs(): Promise<any[]> {
    return this.request<any[]>('/api/admin/audit-logs');
  }

  // Update user role (admin only)
  async updateUserRole(userId: number, role: string): Promise<any> {
    return this.request(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',                                      // HTTP PATCH method for updates
      body: JSON.stringify({ role }),                       // Send new role as JSON
    });
  }

  // Update user status (active/inactive)
  async updateUserStatus(userId: number, isActive: boolean): Promise<any> {
    return this.request(`/api/admin/users/${userId}/status`, {
      method: 'PATCH',                                      // HTTP PATCH method for updates
      body: JSON.stringify({ isActive }),                   // Send new status as JSON
    });
  }

  // Delete user (admin only)
  async deleteUser(userId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // Update appointment status
  async updateAdminAppointmentStatus(appointmentId: number, status: string): Promise<any> {
    return this.request(`/api/admin/appointments/${appointmentId}/status`, {
      method: 'PATCH',                                      // HTTP PATCH method for updates
      body: JSON.stringify({ status }),                     // Send new status as JSON
    });
  }

  // ============================================================================
  // 🏠 HOMEPAGE CONTENT MANAGEMENT ENDPOINTS - Content management functions
  // ============================================================================
  
  // Get homepage content
  async getHomepageContent(): Promise<any> {
    return this.request('/api/homepage/content');
  }

  // Update homepage content (admin only)
  async updateHomepageContent(content: any): Promise<any> {
    return this.request('/api/admin/homepage/content', {
      method: 'PUT',
      body: JSON.stringify(content),
    });
  }

  // ============================================================================
  // 📈 ANALYTICS - Engagement tracking (lightweight)
  // ============================================================================
  async trackDoctorClick(doctorId: number, type: 'site' | 'book'): Promise<{ ok: boolean }>
  {
    try {
      return await this.request<{ ok: boolean }>(`/api/analytics/doctor-click`, {
        method: 'POST',
        body: JSON.stringify({ doctorId, type }),
      });
    } catch (e) {
      // ignore errors in client analytics
      return { ok: false } as any;
    }
  }

  // ============================================================================
  // 🏥 HOSPITAL ENDPOINTS - Hospital profile management
  // ============================================================================
  async getHospitals(): Promise<any[]> {
    return this.request<any[]>('/api/hospitals');
  }

  // Get hospital linked to a doctor (for redirecting hospital doctors)
  async getHospitalByDoctorId(doctorId: number): Promise<{ hospitalId: number; hospital: { id: number; name: string } }> {
    return this.request<{ hospitalId: number; hospital: { id: number; name: string } }>(`/api/hospitals/by-doctor/${doctorId}`);
  }

  async getHospitalProfile(hospitalId: number): Promise<any> {
    return this.request<any>(`/api/hospitals/${hospitalId}/profile`);
  }

  async updateHospitalProfile(hospitalId: number, profile: any): Promise<any> {
    return this.request<any>(`/api/hospitals/${hospitalId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
  }

  async createHospital(data: { name: string; address?: string; city?: string; state?: string; phone?: string }): Promise<any> {
    return this.request<any>('/api/hospitals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMyHospital(): Promise<any> {
    return this.request<any>('/api/hospitals/my');
  }

  // Get detailed hospital info including linked doctors and departments
  async getHospitalDetails(hospitalId: number): Promise<any> {
    return this.request<any>(`/api/hospitals/${hospitalId}`);
  }

  // Slot Admin management (Hospital Admin)
  async getHospitalSlotAdmin(doctorId?: number): Promise<{ slotAdmin: { id: number; email: string } | null }> {
    const qs = doctorId && doctorId > 0 ? `?doctorId=${doctorId}` : '';
    return this.request(`/api/hospital/slot-admin${qs}`);
  }

  async upsertHospitalSlotAdmin(email: string, password: string, doctorId?: number): Promise<{ message: string; slotAdmin: { id: number; email: string } }> {
    const body: any = { email, password };
    if (doctorId && doctorId > 0) body.doctorId = doctorId;
    return this.request('/api/hospital/slot-admin', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // Doctor Working Hours & Bookings (Hospital Admin)
  async getHospitalDoctorWorkingHours(hospitalId: number, doctorId: number): Promise<DoctorWorkingHours[]> {
    return this.request<DoctorWorkingHours[]>(`/api/hospitals/${hospitalId}/doctors/${doctorId}/working-hours`);
  }

  async setHospitalDoctorWorkingHours(
    hospitalId: number,
    doctorId: number,
    hours: Array<{ dayOfWeek: number; startTime: string; endTime: string }>
  ): Promise<DoctorWorkingHours[]> {
    return this.request<DoctorWorkingHours[]>(`/api/hospitals/${hospitalId}/doctors/${doctorId}/working-hours`, {
      method: 'PUT',
      body: JSON.stringify({ hours }),
    });
  }

  async getHospitalDoctorAppointments(
    hospitalId: number,
    doctorId: number,
    params?: { status?: string; dateFrom?: string; dateTo?: string }
  ): Promise<Appointment[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params?.dateTo) query.set('dateTo', params.dateTo);
    const qs = query.toString();
    const endpoint = qs
      ? `/api/hospitals/${hospitalId}/doctors/${doctorId}/appointments?${qs}`
      : `/api/hospitals/${hospitalId}/doctors/${doctorId}/appointments`;
    return this.request<Appointment[]>(endpoint);
  }

  async updateHospitalDoctorAppointment(
    hospitalId: number,
    doctorId: number,
    appointmentId: number,
    data: { status?: string; date?: string; time?: string; notes?: string }
  ): Promise<Appointment> {
    return this.request<Appointment>(`/api/hospitals/${hospitalId}/doctors/${doctorId}/appointments/${appointmentId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ============================================================================
  // 🚪 LOGOUT FUNCTION - Clear authentication data
  // ============================================================================
  logout(): void {
    this.clearToken();                                      // Remove authentication token
  }
}

// ============================================================================
// 🌍 GLOBAL INSTANCE - Create and export a single API client instance
// ============================================================================
// All components will use this same instance to ensure consistent state
export const apiClient = new ApiClient();