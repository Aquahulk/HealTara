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
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';              // Backend server address

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

export interface SearchDoctorsResponse {
  query: string;
  normalizedQuery: string;
  matchedConditions: string[];
  matchedSpecialties: string[];
  doctors: Doctor[];
  suggestions: string[];
  meta?: any;
}

export interface Appointment {
  id: number;                                              // Unique appointment identifier
  date: string;                                            // Appointment date (ISO or YYYY-MM-DD)
  time?: string;                                           // Optional time in HH:mm (IST-local)
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
  private _searchDebounceTimer: any;                        // Timer for debounced search tracking
  // Client-side micro cache for rapid repeated queries
  private _searchCache: Map<string, { at: number; payload: SearchDoctorsResponse } > = new Map();
  private _searchCacheTTL: number = 3000; // milliseconds
  // Local suggestion memory (session) for reinforcing user-confirmed terms
  private _localSuggestions: Map<string, string[]> = new Map();
  private _localSuggestionStoreKey: string = 'localSearchSuggestions';
  private _commonSeeds: string[] = [
    'Cardiology', 'Dermatology', 'Orthopedics', 'Pediatrics', 'Neurology',
    'Diabetes', 'Hypertension', 'ENT', 'Dentist', 'Physician', 'Oncology',
    'Eye Care', 'Gynecology', 'Urology', 'Psychiatry', 'Physiotherapy'
  ];
  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.token = this.getStoredToken();
    // Load local suggestions from sessionStorage if available
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const raw = window.sessionStorage.getItem(this._localSuggestionStoreKey);
        if (raw) {
          const obj = JSON.parse(raw);
          if (obj && typeof obj === 'object') {
            Object.entries(obj).forEach(([k, arr]) => {
              if (Array.isArray(arr)) this._localSuggestions.set(String(k).toLowerCase(), arr.slice(0, 10));
            });
          }
        }
      }
    } catch {}
    this._searchDebounceTimer = null;                       // Initialize debounce timer
  }

  // ============================================================================
  // 🎫 TOKEN MANAGEMENT - Functions to handle authentication tokens
  // ============================================================================
  
  // Cookie helpers for cross-subdomain auth
  private getPrimaryDomainForCookie(): string | null {
    try {
      const env = (process.env.NEXT_PUBLIC_PRIMARY_DOMAIN || '').trim();
      if (env) return env.startsWith('.') ? env : `.${env}`;
      if (typeof window !== 'undefined') {
        const host = window.location.hostname.toLowerCase();
        if (host === 'localhost' || host === '127.0.0.1') return null; // don't set domain for localhost
        const parts = host.split('.');
        if (parts.length >= 2) {
          const base = parts.slice(parts.length - 2).join('.');
          return `.${base}`;
        }
      }
    } catch {}
    return null;
  }

  private readCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const cookies = document.cookie ? document.cookie.split('; ') : [];
    for (const c of cookies) {
      const [k, ...v] = c.split('=');
      if (k === name) return decodeURIComponent(v.join('='));
    }
    return null;
  }

  private writeCookie(name: string, value: string, maxAgeSeconds: number = 60 * 60 * 24 * 7) {
    if (typeof document === 'undefined') return;
    const domain = this.getPrimaryDomainForCookie();
    const attrs = [
      `${name}=${encodeURIComponent(value)}`,
      'Path=/',
      `Max-Age=${maxAgeSeconds}`,
    ];
    if (domain) attrs.push(`Domain=${domain}`, 'Secure');
    attrs.push('SameSite=Lax');
    document.cookie = attrs.join('; ');
  }

  private deleteCookie(name: string) {
    if (typeof document === 'undefined') return;
    const domain = this.getPrimaryDomainForCookie();
    const attrs = [
      `${name}=; Path=/; Max-Age=0`,
    ];
    if (domain) attrs.push(`Domain=${domain}`, 'Secure');
    attrs.push('SameSite=Lax');
    document.cookie = attrs.join('; ');
  }

  // Get token from storage (cookie preferred for cross-subdomain; fallback to localStorage)
  private getStoredToken(): string | null {
    if (typeof window !== 'undefined') {
      const fromCookie = this.readCookie('authToken');
      if (fromCookie) return fromCookie;
      const fromLS = localStorage.getItem('authToken');
      return fromLS;
    }
    return null;
  }

  // Save token to storage (cookie + localStorage for backward compatibility)
  private setStoredToken(token: string): void {
    if (typeof window !== 'undefined') {
      try { this.writeCookie('authToken', token); } catch {}
      try { localStorage.setItem('authToken', token); } catch {}
    }
  }

  // Remove token from storage
  private removeStoredToken(): void {
    if (typeof window !== 'undefined') {
      try { this.deleteCookie('authToken'); } catch {}
      try { localStorage.removeItem('authToken'); } catch {}
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
  // This function handles all HTTP requests to backend
  // It automatically includes authentication headers and handles common errors
  private async request<T>(
    endpoint: string,                                       // API endpoint (e.g., "/api/login")
    options: RequestInit = {}                               // HTTP options (method, body, headers)
  ): Promise<T> {
    try {
      // ============================================================================
      // 🔗 URL CONSTRUCTION - Build the full URL for the request
      // ============================================================================
      const primaryUrl = `${this.baseURL}${endpoint}`;
      const fallbackUrl = endpoint; // relative URL fallback to current origin
      
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
      let response: Response;
      try {
        response = await fetch(primaryUrl, {
          ...options,
          headers,
        });
      } catch (networkErr: any) {
        // Network failure (CORS redirect, DNS, etc.). Try relative URL as fallback.
        if (this.baseURL && this.baseURL.startsWith('http')) {
          response = await fetch(fallbackUrl, {
            ...options,
            headers,
          });
        } else {
          throw networkErr;
        }
      }

      if (!response.ok) {
        let message = 'Request failed';
        try {
          const txt = await response.text();
          if (txt) {
            try {
              const obj = JSON.parse(txt);
              message = obj?.message || txt;
            } catch {
              message = txt;
            }
          }
        } catch {}
        if (response.status === 401) {
          const m = String(message || '').toLowerCase();
          if (m.includes('invalid token') || m.includes('token has expired') || m.includes('authorization token is required')) {
            this.clearToken();
            message = 'Your session has expired. Please log in again.';
          }
        }
        const detail = `${message} (url=${response.url || primaryUrl})`;
        throw new Error(detail);
      }

      // Parse JSON response if possible
      try {
        return await response.json();
      } catch (_) {
        return undefined as unknown as T;                   // Some endpoints may not return JSON
      }
    } catch (error: any) {
      const msg = error?.message || String(error);
      const enriched = msg.includes('Failed to fetch')
        ? `${msg}. Please check API URL and CORS. Attempted: base="${this.baseURL}" endpoint="${endpoint}"`
        : msg;
      throw new Error(enriched);
    }
  }

  // ============================================================================
  // 🔑 AUTHENTICATION ENDPOINTS - Login & Registration
  // ============================================================================
  async login(email: string, password: string): Promise<LoginResponse> {
    return this.request('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(email: string, password: string, role: string, name?: string): Promise<RegisterResponse> {
    return this.request('/api/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, role, name }),
    });
  }

  // ============================================================================
  // 👨‍⚕️ DOCTOR LISTING & SEARCH
  // ============================================================================
  async getDoctors(params: { sort?: string; page?: number; pageSize?: number } = {}): Promise<Doctor[]> {
    const query = new URLSearchParams({
      sort: params.sort || 'trending',
      page: String(params.page || 1),
      pageSize: String(params.pageSize || 30),
    }).toString();
    return this.request(`/api/doctors?${query}`);
  }

  async searchDoctors(q: string): Promise<SearchDoctorsResponse> {
    const query = new URLSearchParams({ q }).toString();
    const key = q.trim().toLowerCase();
    // Return from micro-cache if fresh
    const cached = this._searchCache.get(key);
    if (cached && (Date.now() - cached.at) < this._searchCacheTTL) {
      return Promise.resolve(cached.payload);
    }
    const resp = await this.request<SearchDoctorsResponse>(`/api/search/doctors?${query}`);
    // Store in micro-cache
    this._searchCache.set(key, { at: Date.now(), payload: resp });
    return resp;
  }

  async getDoctorBySlug(slug: string): Promise<Doctor> {
    return this.request(`/api/doctors/slug/${slug}`);
  }

  async setDoctorSlug(email: string, slug: string): Promise<any> {
    return this.request('/api/doctor/slug', {
      method: 'POST',
      body: JSON.stringify({ email, slug }),
    });
  }

  async getDoctorProfile(): Promise<DoctorProfile> {
    return this.request('/api/doctor/profile');
  }

  async getDoctorStats(): Promise<any> {
    return this.request('/api/doctor/stats');
  }

  async createDoctorProfile(profileData: any): Promise<any> {
    return this.request('/api/doctor/profile', {
      method: 'POST',
      body: JSON.stringify(profileData),
    });
  }

  async updateDoctorProfile(profileData: any): Promise<any> {
    return this.request('/api/doctor/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async bookAppointment(appointmentData: { doctorId: number; date: string; time?: string; reason?: string }): Promise<any> {
    return this.request('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(appointmentData),
    });
  }

  async bookEmergencyAppointment(payload: { doctorId: number; reason?: string }): Promise<any> {
    return this.request('/api/appointments/emergency', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getMyAppointments(): Promise<Appointment[]> {
    return this.request('/api/my-appointments');
  }

  async getMyPatients(): Promise<Array<{ patientId: number; email: string; count: number; lastDate: string }>> {
    const resp = await this.request<{ items: Array<{ patientId: number; email: string; count: number; lastDate: string }> }>('/api/doctor/patients');
    return resp.items || [];
  }

  async updateDoctorAppointment(
    appointmentId: number,
    update: { status?: string; date?: string; time?: string }
  ): Promise<Appointment> {
    return this.request(`/api/appointments/${appointmentId}`, {
      method: 'PATCH',
      body: JSON.stringify(update),
    });
  }

  async getSlots(params: { doctorId: number; date?: string }): Promise<Slot[]> {
    const query = new URLSearchParams({
      doctorId: String(params.doctorId),
      date: params.date || '',
    }).toString();
    return this.request(`/api/slots?${query}`);
  }

  async createSlot(payload: { date: string; time: string }): Promise<Slot> {
    return this.request('/api/slots', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async cancelSlot(slotId: number): Promise<Slot> {
    return this.request(`/api/slots/${slotId}`, {
      method: 'DELETE',
    });
  }

  async getSlotsAndAvailability(params: { doctorId: number; date: string }): Promise<{ slots: Slot[]; availability: { periodMinutes: number; hours: Array<{ hour: string; capacity: number; bookedCount: number; isFull: boolean; labelFrom: string; labelTo: string }> } }> {
    const query = new URLSearchParams({
      doctorId: String(params.doctorId),
      date: params.date,
    }).toString();
    return this.request(`/api/slots/availability?${query}`);
  }

  async getSlotInsights(params: { doctorId: number; date: string }): Promise<{ availability: { periodMinutes: number; hours: Array<{ hour: string; capacity: number; bookedCount: number; isFull: boolean; labelFrom: string; labelTo: string }> } }> {
    const query = new URLSearchParams({
      doctorId: String(params.doctorId),
      date: params.date,
    }).toString();
    return this.request(`/api/slots/insights?${query}`);
  }

  async getSlotAdminWorkingHours(params: { doctorId: number }): Promise<Array<{ dayOfWeek: number; startTime: string; endTime: string }>> {
    const query = new URLSearchParams({ doctorId: String(params.doctorId) }).toString();
    return this.request(`/api/slot-admin/working-hours?${query}`);
  }

  async getDoctorSlotPeriod(): Promise<{ slotPeriodMinutes: number }> {
    return this.request('/api/doctor/slot-period');
  }

  async setDoctorSlotPeriod(minutes: number): Promise<any> {
    return this.request('/api/doctor/slot-period', {
      method: 'PATCH',
      body: JSON.stringify({ minutes }),
    });
  }

  async getHospitalDoctorSlotPeriod(hospitalId: number, doctorId: number): Promise<{ slotPeriodMinutes: number }> {
    return this.request(`/api/hospitals/${hospitalId}/doctors/${doctorId}/slot-period`);
  }

  async setHospitalDoctorSlotPeriod(hospitalId: number, doctorId: number, minutes: number): Promise<any> {
    return this.request(`/api/hospitals/${hospitalId}/doctors/${doctorId}/slot-period`, {
      method: 'PATCH',
      body: JSON.stringify({ minutes }),
    });
  }

  async getMyHospital(): Promise<any> {
    return this.request('/api/me/hospital');
  }

  async getHospitalDetails(hospitalId: number): Promise<any> {
    return this.request(`/api/hospitals/${hospitalId}`);
  }

  async getHospitalProfile(hospitalId: number): Promise<any> {
    return this.request(`/api/hospitals/${hospitalId}/profile`);
  }

  async updateHospitalProfile(hospitalId: number, profileUpdate: any): Promise<any> {
    return this.request(`/api/hospitals/${hospitalId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(profileUpdate),
    });
  }

  async getHospitals(params: { page?: number; limit?: number } = {}): Promise<any[]> {
    const query = new URLSearchParams({
      page: String(params.page || 1),
      limit: String(params.limit || 50),
    }).toString();
    return this.request(`/api/hospitals?${query}`);
  }

  async createHospital(payload: { name: string; address?: string; city?: string; state?: string; phone?: string }): Promise<{ id: number }> {
    return this.request('/api/hospitals', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- Hospital subdomain management ---
  async isHospitalSubdomainAvailable(name: string): Promise<{ available: boolean; message?: string }> {
    return this.request(`/api/hospitals/subdomain-available/${encodeURIComponent(name)}`);
  }

  async setHospitalSubdomain(hospitalId: number, subdomain: string): Promise<{ id: number; subdomain: string | null }> {
    return this.request(`/api/hospitals/${hospitalId}/subdomain`, {
      method: 'PATCH',
      body: JSON.stringify({ subdomain }),
    });
  }

  async uploadHospitalLogo(hospitalId: number, file: File): Promise<{ url: string }> {
    return this.uploadFile(`/api/hospitals/${hospitalId}/logo`, file, 'logo');
  }

  async uploadDoctorPhoto(file: File): Promise<{ url: string }> {
    return this.uploadFile('/api/admin/doctor/photo', file, 'photo');
  }

  async createHospitalDoctor(
    hospitalId: number,
    payload: { name: string; primarySpecialty?: string; subSpecialty?: string; departmentId?: number; departmentName?: string }
  ): Promise<{ doctor: { id: number; email?: string }, departmentId?: number }> {
    return this.request(`/api/hospitals/${hospitalId}/doctors`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateHospitalDoctorDepartment(
    hospitalId: number,
    doctorId: number,
    payload: { departmentId?: number; departmentName?: string }
  ): Promise<{ ok: boolean; membership: any }> {
    return this.request(`/api/hospitals/${hospitalId}/doctors/${doctorId}/department`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async getHospitalByDoctorId(doctorId: number): Promise<{ id: number; name?: string; address?: string; city?: string; state?: string; phone?: string; subdomain?: string | null }> {
    return this.request(`/api/hospitals/by-doctor/${doctorId}`);
  }

  async getHospitalDoctorAppointments(hospitalId: number, doctorId: number): Promise<Appointment[]> {
    return this.request(`/api/hospitals/${hospitalId}/doctors/${doctorId}/appointments`);
  }

  async updateHospitalDoctorAppointment(
    hospitalId: number,
    doctorId: number,
    appointmentId: number,
    update: { status?: string; date?: string; time?: string }
  ): Promise<Appointment> {
    return this.request(`/api/hospitals/${hospitalId}/doctors/${doctorId}/appointments/${appointmentId}`, {
      method: 'PATCH',
      body: JSON.stringify(update),
    });
  }

  async getHospitalDoctorWorkingHours(hospitalId: number, doctorId: number): Promise<DoctorWorkingHours[]> {
    return this.request(`/api/hospitals/${hospitalId}/doctors/${doctorId}/working-hours`);
  }

  async setHospitalDoctorWorkingHours(
    hospitalId: number,
    doctorId: number,
    hours: Array<{ dayOfWeek: number; startTime: string; endTime: string }>
  ): Promise<DoctorWorkingHours[]> {
    return this.request(`/api/hospitals/${hospitalId}/doctors/${doctorId}/working-hours`, {
      method: 'PUT',
      body: JSON.stringify(hours),
    });
  }

  async getHospitalSlotAdmin(doctorId?: number): Promise<{ slotAdmin?: { email: string } }> {
    const query = new URLSearchParams({ doctorId: String(doctorId || '') }).toString();
    return this.request(`/api/hospitals/slot-admin?${query}`);
  }

  async getDoctorSlotAdmin(): Promise<{ slotAdmin?: { email: string } }> {
    return this.request('/api/doctor/slot-admin');
  }

  async upsertDoctorSlotAdmin(email: string, password: string): Promise<{ slotAdmin: { email: string } }> {
    return this.request('/api/doctor/slot-admin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async upsertHospitalSlotAdmin(email: string, password: string, doctorId: number): Promise<{ slotAdmin: { email: string } }> {
    return this.request('/api/hospitals/slot-admin', {
      method: 'POST',
      body: JSON.stringify({ email, password, doctorId }),
    });
  }

  async getUsers(): Promise<User[]> {
    return this.request('/api/users');
  }

  async getAdminDashboard(): Promise<any> {
    return this.request('/api/admin/dashboard');
  }

  async getAdminUsers(): Promise<User[]> {
    return this.request('/api/admin/users');
  }

  async adminListDoctors(params: { page?: number; limit?: number } = {}): Promise<{ items: Doctor[] }> {
    const query = new URLSearchParams({
      page: String(params.page || 1),
      limit: String(params.limit || 50),
    }).toString();
    return this.request(`/api/admin/doctors?${query}`);
  }

  async adminListHospitals(params: { page?: number; limit?: number } = {}): Promise<{ items: any[] }> {
    const query = new URLSearchParams({
      page: String(params.page || 1),
      limit: String(params.limit || 50),
    }).toString();
    return this.request(`/api/admin/hospitals?${query}`);
  }

  async getAdminAppointments(): Promise<Appointment[]> {
    return this.request('/api/admin/appointments');
  }

  async getAdminAuditLogs(): Promise<any[]> {
    return this.request('/api/admin/audit-logs');
  }

  async updateUserRole(userId: number, role: string): Promise<any> {
    return this.request(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  }

  async updateUserStatus(userId: number, isActive: boolean): Promise<any> {
    return this.request(`/api/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  }

  async updateAdminAppointmentStatus(appointmentId: number, status: string): Promise<any> {
    return this.request(`/api/admin/appointments/${appointmentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async adminSetDoctorStatus(doctorId: number, action: 'START' | 'PAUSE' | 'REVOKE'): Promise<any> {
    return this.request(`/api/admin/doctors/${doctorId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ action }),
    });
  }

  async adminSetHospitalStatus(hospitalId: number, action: 'START' | 'PAUSE' | 'REVOKE'): Promise<any> {
    return this.request(`/api/admin/hospitals/${hospitalId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ action }),
    });
  }

  async adminUpdateHospitalProfile(hospitalId: number, profileUpdate: any): Promise<any> {
    return this.request(`/api/admin/hospitals/${hospitalId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(profileUpdate),
    });
  }

  private async uploadFile(endpoint: string, file: File, fieldName: string = 'file'): Promise<any> {
    const formData = new FormData();
    formData.append(fieldName, file);
    return this.request(endpoint, {
      method: 'POST',
      body: formData as any,
      headers: {},
    });
  }

  async adminUploadHospitalLogo(hospitalId: number, file: File): Promise<{ url: string }> {
    return this.uploadFile(`/api/admin/hospitals/${hospitalId}/logo`, file, 'logo');
  }

  async adminUploadDoctorPhoto(doctorId: number, file: File): Promise<{ url: string }> {
    return this.uploadFile(`/api/admin/doctors/${doctorId}/photo`, file, 'photo');
  }

  async deleteUser(userId: number): Promise<any> {
    return this.request(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async getHomepageContent(): Promise<any> {
    return this.request('/api/homepage');
  }

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
  async trackDoctorClick(doctorId: number, action: string, query?: string): Promise<void> {
    try {
      await this.request('/api/analytics/doctor/click', {
        method: 'POST',
        body: JSON.stringify({ doctorId, action, query })
      });
    } catch (_) {
      // ignore errors
    }
  }

  // Analytics: search query tracking for learning loop
  async trackSearch(
    query: string,
    data: { matchedSpecialties?: string[]; matchedConditions?: string[]; topDoctorIds?: number[]; source?: string; selectedSuggestion?: string } = {}
  ): Promise<void> {
    try {
      await this.request('/api/analytics/search', {
        method: 'POST',
        body: JSON.stringify({ query, ...data })
      });
    } catch (_) {
      // ignore errors
    }
  }

  // Debounced variant to avoid spamming the analytics on fast typing
  async trackSearchDebounced(
    query: string,
    data: { matchedSpecialties?: string[]; matchedConditions?: string[]; topDoctorIds?: number[] } = {},
    delayMs: number = 250
  ): Promise<void> {
    if (this._searchDebounceTimer) {
      try { clearTimeout(this._searchDebounceTimer); } catch (_) {}
      this._searchDebounceTimer = null;
    }
    return new Promise((resolve) => {
      this._searchDebounceTimer = setTimeout(async () => {
        try { await this.trackSearch(query, data); } catch (_) {}
        resolve();
      }, delayMs);
    });
  }

  // Peek cached search result without network
  peekCachedSearch(q: string): SearchDoctorsResponse | null {
    const key = q.trim().toLowerCase();
    const cached = this._searchCache.get(key);
    if (cached && (Date.now() - cached.at) < this._searchCacheTTL) {
      return cached.payload;
    }
    return null;
  }

  // Suggestion memory helpers
  getSeedSuggestions(): string[] {
    const mem = Array.from(this._localSuggestions.values()).flat();
    const uniq = Array.from(new Set([...mem, ...this._commonSeeds]));
    return uniq.slice(0, 12);
  }

  getLocalSuggestions(q: string): string[] {
    const key = q.trim().toLowerCase();
    if (!key) return this.getSeedSuggestions();
    const direct = this._localSuggestions.get(key) || [];
    const related: string[] = [];
    for (const [tok, arr] of this._localSuggestions.entries()) {
      if (tok.includes(key)) related.push(...arr);
      else arr.forEach((s) => { if (s.toLowerCase().includes(key)) related.push(s); });
    }
    const uniq = Array.from(new Set([...direct, ...related]));
    return uniq.slice(0, 12);
  }

  addLocalSuggestion(q: string, suggestion: string): void {
    const key = q.trim().toLowerCase();
    const s = suggestion.trim();
    if (!key || !s) return;
    const arr = this._localSuggestions.get(key) || [];
    if (!arr.includes(s)) {
      const next = [s, ...arr].slice(0, 10);
      this._localSuggestions.set(key, next);
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          const obj: Record<string, string[]> = {};
          for (const [k, v] of this._localSuggestions.entries()) { obj[k] = v; }
          window.sessionStorage.setItem(this._localSuggestionStoreKey, JSON.stringify(obj));
        }
      } catch {}
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
