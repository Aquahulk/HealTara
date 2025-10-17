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
const API_BASE_URL = 'http://localhost:3001';              // Backend server address

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
  slotPeriodMinutes?: number;                              // Preferred slot period in minutes
  createdAt: string;                                       // When profile was created
  updatedAt: string;                                       // When profile was last updated
}

export interface Doctor extends User {
  doctorProfile: DoctorProfile | null;                     // Doctor's professional profile (null if not created yet)
}

export interface Appointment {
  id: number;                                              // Unique appointment identifier
  date: string;                                            // Appointment date and time
  reason?: string;                                         // Reason for appointment (optional)
  status: string;                                          // Current status (PENDING, CONFIRMED, CANCELLED, COMPLETED)
  createdAt: string;                                       // When appointment was created
  updatedAt: string;                                       // When appointment was last updated
  doctorId: number;                                        // ID of the doctor
  patientId: number;                                       // ID of the patient
  doctor: User;                                            // Doctor's user information
  patient: User;                                           // Patient's user information
}

// Working hours for a doctor profile
export interface DoctorWorkingHours {
  id: number;
  doctorProfileId: number;
  dayOfWeek: number; // 0-6 (Sun-Sat)
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  createdAt: string;
  updatedAt: string;
}

// Slots represent granular booking windows inside an hour
export interface Slot {
  id: number;                                              // Unique slot identifier
  doctorId: number;                                        // Doctor associated with the slot
  date: string;                                            // ISO date (yyyy-MM-dd)
  time: string;                                            // HH:mm time inside the date
  status: 'AVAILABLE' | 'BOOKED' | 'CANCELLED' | string;   // Slot status
  createdAt?: string;                                      // Creation timestamp
  updatedAt?: string;                                      // Update timestamp
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
      const url = `${this.baseURL}${endpoint}`;
      
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
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
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
  
  // Get list of all doctors (supports optional sorting and pagination)
  async getDoctors(params: { sort?: string; page?: number; pageSize?: number } = {}): Promise<Doctor[]> {
    const qs = new URLSearchParams();
    if (params.sort) qs.append('sort', params.sort);
    if (params.page !== undefined) qs.append('page', String(params.page));
    if (params.pageSize !== undefined) qs.append('pageSize', String(params.pageSize));
    const path = qs.toString() ? `/api/doctors?${qs}` : '/api/doctors';
    return this.request<Doctor[]>(path);
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

  // ============================================================================
  // 📅 APPOINTMENT ENDPOINTS - Appointment booking and management
  // ============================================================================
  
  // Book a new appointment
  async bookAppointment(appointmentData: { doctorId: number; date: string; time?: string; reason?: string }): Promise<any> {
    return this.request('/api/appointments', {
      method: 'POST',                                       // HTTP POST method
      body: JSON.stringify(appointmentData),                // Send appointment data as JSON
    });
  }

  // Emergency appointment request (patient triggers admin allocation)
  async bookEmergencyAppointment(payload: { doctorId: number; reason?: string }): Promise<any> {
    return this.request('/api/appointments/emergency', {
      method: 'POST',                                       // HTTP POST method
      body: JSON.stringify(payload),                        // Send emergency request as JSON
    });
  }

  // Get user's appointments
  async getMyAppointments(): Promise<Appointment[]> {
    return this.request<Appointment[]>('/api/my-appointments');
  }

  // ============================================================================
  // ⏱️ SLOTS & AVAILABILITY - Manage doctor availability slots
  // ============================================================================

  // Get slots for a doctor, optionally filtered by date
  async getSlots(params: { doctorId: number; date?: string }): Promise<Slot[]> {
    const query = new URLSearchParams();
    query.set('doctorId', String(params.doctorId));
    if (params.date) query.set('date', params.date);
    const endpoint = `/api/slots${query.toString() ? `?${query.toString()}` : ''}`;
    return this.request<Slot[]>(endpoint).catch(() => []);
  }

  // Create a slot for the authenticated doctor
  async createSlot(payload: { date: string; time: string }): Promise<Slot> {
    return this.request<Slot>('/api/doctor/slots', {
      method: 'POST',
      body: JSON.stringify(payload),
    }).catch(() => ({ id: Date.now(), doctorId: 0, date: payload.date, time: payload.time, status: 'AVAILABLE' }));
  }

  // Cancel an existing slot
  async cancelSlot(slotId: number): Promise<Slot> {
    return this.request<Slot>(`/api/doctor/slots/${slotId}/cancel`, {
      method: 'PATCH',
    }).catch(() => ({ id: slotId, doctorId: 0, date: new Date().toISOString().slice(0,10), time: '00:00', status: 'CANCELLED' }));
  }

  // Combined endpoint to fetch slots and hour-level availability for a day
  async getSlotsAndAvailability(params: { doctorId: number; date: string }): Promise<{ slots: Slot[]; availability: { periodMinutes: number; hours: Array<{ hour: string; capacity: number; bookedCount: number; isFull: boolean; labelFrom: string; labelTo: string }> } }> {
    const query = new URLSearchParams();
    query.set('doctorId', String(params.doctorId));
    query.set('date', params.date);
    const endpoint = `/api/slots/availability?${query.toString()}`;
    const data = await this.request<{ slots: Slot[]; availability: { periodMinutes: number; hours: Array<{ hour: string; capacity: number; bookedCount: number; isFull: boolean; labelFrom: string; labelTo: string }> } }>(endpoint);
    return data;
  }

  // Slot Admin: working hours for a doctor (day-of-week schedule)
  async getSlotAdminWorkingHours(params: { doctorId: number }): Promise<Array<{ dayOfWeek: number; startTime: string; endTime: string }>> {
    const endpoint = `/api/slot-admin/working-hours?doctorId=${params.doctorId}`;
    return this.request<Array<{ dayOfWeek: number; startTime: string; endTime: string }>>(endpoint).catch(() => []);
  }

  // Preferred slot period for authenticated doctor
  async getDoctorSlotPeriod(): Promise<{ slotPeriodMinutes: number }> {
    return this.request<{ slotPeriodMinutes: number }>(`/api/doctor/slot-period`).catch(() => ({ slotPeriodMinutes: 15 }));
  }

  async setDoctorSlotPeriod(minutes: number): Promise<any> {
    return this.request(`/api/doctor/slot-period`, {
      method: 'PATCH',
      body: JSON.stringify({ minutes }),
    });
  }

  // Hospital ↔ Doctor specific slot period
  async getHospitalDoctorSlotPeriod(hospitalId: number, doctorId: number): Promise<{ slotPeriodMinutes: number }> {
    return this.request<{ slotPeriodMinutes: number }>(`/api/hospitals/${hospitalId}/doctors/${doctorId}/slot-period`).catch(() => ({ slotPeriodMinutes: 15 }));
  }

  async setHospitalDoctorSlotPeriod(hospitalId: number, doctorId: number, minutes: number): Promise<any> {
    return this.request(`/api/hospitals/${hospitalId}/doctors/${doctorId}/slot-period`, {
      method: 'PATCH',
      body: JSON.stringify({ minutes }),
    });
  }

  // ============================================================================
  // 🏥 HOSPITAL ENDPOINTS - Hospital management
  // ============================================================================

  // Get hospital associated with authenticated admin
  async getMyHospital(): Promise<any> {
    return this.request('/api/hospital/my').catch(() => null);
  }

  // Get hospital public details including linked doctors
  async getHospitalDetails(hospitalId: number): Promise<any> {
    return this.request(`/api/hospitals/${hospitalId}/details`).catch(() => ({ doctors: [] }));
  }

  // Get hospital profile document
  async getHospitalProfile(hospitalId: number): Promise<{ profile: any }> {
    return this.request<{ profile: any }>(`/api/hospitals/${hospitalId}/profile`).catch(() => ({ profile: {} }));
  }

  // Update hospital profile
  async updateHospitalProfile(hospitalId: number, profileUpdate: any): Promise<any> {
    return this.request(`/api/hospitals/${hospitalId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(profileUpdate),
    });
  }

  // Public: get list of hospitals (optional pagination)
  async getHospitals(params: { page?: number; limit?: number } = {}): Promise<any[]> {
    const qs = new URLSearchParams();
    if (params.page !== undefined) qs.append('page', String(params.page));
    if (params.limit !== undefined) qs.append('limit', String(params.limit));
    const path = qs.toString() ? `/api/hospitals?${qs}` : '/api/hospitals';
    return this.request<any[]>(path);
  }

  // Create a hospital entity (for admins)
  async createHospital(payload: { name: string; address?: string; city?: string; state?: string; phone?: string }): Promise<{ id: number }> {
    return this.request<{ id: number }>(`/api/hospitals`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Upload hospital logo (non-admin endpoint used by hospital admins)
  async uploadHospitalLogo(hospitalId: number, file: File): Promise<{ url: string }> {
    const res = await this.uploadFile(`/api/hospitals/${hospitalId}/logo`, file, 'logo');
    return { url: res?.url || '' };
  }

  // Doctor: upload own profile photo image
  async uploadDoctorPhoto(file: File): Promise<{ url: string }> {
    const res = await this.uploadFile(`/api/doctor/photo`, file, 'photo');
    return { url: res?.url || '' };
  }

  // Hospital → Doctor: create and link a real doctor account
  async createHospitalDoctor(hospitalId: number, payload: { name: string; primarySpecialty?: string; subSpecialty?: string }): Promise<{ doctor: { id: number; email?: string } }> {
    return this.request<{ doctor: { id: number; email?: string } }>(`/api/hospitals/${hospitalId}/doctors`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Get hospital linked to a doctor
  async getHospitalByDoctorId(doctorId: number): Promise<{ hospitalId: number; hospital?: { name?: string } }> {
    return this.request<{ hospitalId: number; hospital?: { name?: string } }>(`/api/hospitals/by-doctor/${doctorId}`);
  }

  // Hospital → Doctor appointments
  async getHospitalDoctorAppointments(hospitalId: number, doctorId: number): Promise<Appointment[]> {
    return this.request<Appointment[]>(`/api/hospitals/${hospitalId}/doctors/${doctorId}/appointments`).catch(() => []);
  }

  // Update appointment (status or cancellation) for a doctor within a hospital
  async updateHospitalDoctorAppointment(
    hospitalId: number,
    doctorId: number,
    appointmentId: number,
    update: { status?: string; date?: string; time?: string }
  ): Promise<Appointment> {
    return this.request<Appointment>(`/api/hospitals/${hospitalId}/doctors/${doctorId}/appointments/${appointmentId}`, {
      method: 'PATCH',
      body: JSON.stringify(update),
    });
  }

  // Hospital → Doctor working hours
  async getHospitalDoctorWorkingHours(hospitalId: number, doctorId: number): Promise<DoctorWorkingHours[]> {
    return this.request<DoctorWorkingHours[]>(`/api/hospitals/${hospitalId}/doctors/${doctorId}/working-hours`).catch(() => []);
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

  // ============================================================================
  // 👥 SLOT ADMIN ENDPOINTS - Manage Slot Admin credentials
  // ============================================================================

  // Get hospital slot admin, optionally doctor-scoped
  async getHospitalSlotAdmin(doctorId?: number): Promise<{ slotAdmin?: { email: string } }> {
    const endpoint = typeof doctorId === 'number' ? `/api/hospital/slot-admin?doctorId=${doctorId}` : `/api/hospital/slot-admin`;
    return this.request<{ slotAdmin?: { email: string } }>(endpoint).catch(() => ({ slotAdmin: undefined }));
  }

  // Get doctor slot admin (for authenticated doctor)
  async getDoctorSlotAdmin(): Promise<{ slotAdmin?: { email: string } }> {
    return this.request<{ slotAdmin?: { email: string } }>(`/api/doctor/slot-admin`).catch(() => ({ slotAdmin: undefined }));
  }

  // Create or update doctor slot admin (for authenticated doctor)
  async upsertDoctorSlotAdmin(email: string, password: string): Promise<{ slotAdmin: { email: string } }> {
    return this.request<{ slotAdmin: { email: string } }>(`/api/doctor/slot-admin`, {
      method: 'PUT',
      body: JSON.stringify({ email, password }),
    });
  }

  // Create or update hospital slot admin for a doctor
  async upsertHospitalSlotAdmin(email: string, password: string, doctorId: number): Promise<{ slotAdmin: { email: string } }> {
    return this.request<{ slotAdmin: { email: string } }>(`/api/hospital/slot-admin`, {
      method: 'PUT',
      body: JSON.stringify({ email, password, doctorId }),
    });
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

  // List doctors for admin view (wraps /api/doctors with optional pagination)
  async adminListDoctors(params: { page?: number; limit?: number } = {}): Promise<{ items: Doctor[] }> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    const endpoint = `/api/doctors${query.toString() ? `?${query.toString()}` : ''}`;
    const doctors = await this.request<Doctor[]>(endpoint);
    return { items: doctors };
  }

  // List hospitals for admin view (placeholder implementation)
  async adminListHospitals(params: { page?: number; limit?: number } = {}): Promise<{ items: any[] }> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    const endpoint = `/api/admin/hospitals${query.toString() ? `?${query.toString()}` : ''}`;
    // Return items array shape expected by admin panel
    const hospitals = await this.request<any[]>(endpoint).catch(() => []);
    return { items: hospitals };
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

  // Update appointment status
  async updateAdminAppointmentStatus(appointmentId: number, status: string): Promise<any> {
    return this.request(`/api/admin/appointments/${appointmentId}/status`, {
      method: 'PATCH',                                      // HTTP PATCH method for updates
      body: JSON.stringify({ status }),                     // Send new status as JSON
    });
  }

  // Admin: set doctor service status
  async adminSetDoctorStatus(doctorId: number, action: 'START' | 'PAUSE' | 'REVOKE'): Promise<any> {
    return this.request(`/api/admin/doctors/${doctorId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ action }),
    });
  }

  // Admin: set hospital service status
  async adminSetHospitalStatus(hospitalId: number, action: 'START' | 'PAUSE' | 'REVOKE'): Promise<any> {
    return this.request(`/api/admin/hospitals/${hospitalId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ action }),
    });
  }

  // Admin: update hospital profile
  async adminUpdateHospitalProfile(hospitalId: number, profileUpdate: any): Promise<any> {
    return this.request(`/api/admin/hospitals/${hospitalId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(profileUpdate),
    });
  }

  // Internal helper: upload file via multipart/form-data
  private async uploadFile(endpoint: string, file: File, fieldName: string = 'file'): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;
    const formData = new FormData();
    formData.append(fieldName, file);
    const headers: any = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    const response = await fetch(url, { method: 'POST', body: formData, headers });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // Admin: upload hospital logo image
  async adminUploadHospitalLogo(hospitalId: number, file: File): Promise<{ url: string }> {
    const res = await this.uploadFile(`/api/admin/hospitals/${hospitalId}/logo`, file, 'logo');
    return { url: res?.url || '' };
  }

  // Admin: upload doctor photo image
  async adminUploadDoctorPhoto(doctorId: number, file: File): Promise<{ url: string }> {
    const res = await this.uploadFile(`/api/admin/doctors/${doctorId}/photo`, file, 'photo');
    return { url: res?.url || '' };
  }

  // Admin: delete a user
  async deleteUser(userId: number): Promise<any> {
    return this.request(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // Admin: get homepage content
  async getHomepageContent(): Promise<any> {
    return this.request('/api/admin/homepage-content');
  }

  // Admin: update homepage content
  async updateHomepageContent(content: any): Promise<any> {
    return this.request('/api/admin/homepage-content', {
      method: 'PATCH',
      body: JSON.stringify(content),
    });
  }

  // Analytics: doctor view tracking
  async trackDoctorView(doctorId: number): Promise<void> {
    try {
      await this.request('/api/analytics/doctor/view', {
        method: 'POST',
        body: JSON.stringify({ doctorId })
      });
    } catch (_) {
      // ignore errors
    }
  }

  // Analytics: doctor click tracking
  async trackDoctorClick(doctorId: number, action: string): Promise<void> {
    try {
      await this.request('/api/analytics/doctor/click', {
        method: 'POST',
        body: JSON.stringify({ doctorId, action })
      });
    } catch (_) {
      // ignore errors
    }
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