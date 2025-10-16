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
  
  // Get list of all doctors
  async getDoctors(): Promise<Doctor[]> {
    return this.request<Doctor[]>('/api/doctors');
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
  async bookAppointment(appointmentData: { doctorId: number; date: string; reason?: string }): Promise<any> {
    return this.request('/api/appointments', {
      method: 'POST',                                       // HTTP POST method
      body: JSON.stringify(appointmentData),                // Send appointment data as JSON
    });
  }

  // Get user's appointments
  async getMyAppointments(): Promise<Appointment[]> {
    return this.request<Appointment[]>('/api/my-appointments');
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

  // Update appointment status
  async updateAdminAppointmentStatus(appointmentId: number, status: string): Promise<any> {
    return this.request(`/api/admin/appointments/${appointmentId}/status`, {
      method: 'PATCH',                                      // HTTP PATCH method for updates
      body: JSON.stringify({ status }),                     // Send new status as JSON
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