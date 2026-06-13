// ============================================================================
// 🔐 AUTHENTICATION CONTEXT - Global User State Management
// ============================================================================
// This context provides authentication state throughout the entire application
// It manages user login/logout, token storage, and user information
// All components can access user data and authentication functions through this context
// 
// IMPORTANT: This is the central authentication system for the entire DocProc app
// ============================================================================

// ============================================================================
// 📦 EXTERNAL DEPENDENCIES - What we're importing and why
// ============================================================================
'use client';                                              // Enable React hooks and client-side features
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'; // React core functionality
import { apiClient } from '@/lib/api';                     // API client for making HTTP requests
import { jwtDecode } from 'jwt-decode';                    // JWT decoder to extract user info from tokens

// ============================================================================
// 🏗️ INTERFACE DEFINITIONS - TypeScript types for our data
// ============================================================================
interface User {
  id: number;                                              // Unique user identifier from database
  email: string;                                           // User's email address
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN' | 'HOSPITAL_ADMIN'; // User's role in the system
}

interface AuthContextType {
  user: User | null;                                       // Current authenticated user (null if not logged in)
  loading: boolean;                                        // Loading state while checking authentication
  login: (email: string, password: string, requireAdminRole?: boolean) => Promise<void>; // Function to log in user
  register: (email: string, password: string, role: string, name?: string, phone?: string) => Promise<void>; // Function to register new user
  logout: () => void;                                      // Function to log out user
  updateUserFromToken: () => void;                         // Function to update user from stored token
}

// ============================================================================
// 🎯 CONTEXT CREATION - Create React context for authentication
// ============================================================================
// This creates a context that can be used throughout the app
// Components will use useContext(AuthContext) to access authentication data
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// 🔐 AUTHENTICATION PROVIDER - Component that wraps the app and provides auth data
// ============================================================================
// This component must wrap the entire application to provide authentication context
interface AuthProviderProps {
  children: ReactNode;                                     // Child components that will have access to auth context
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // ============================================================================
  // 🎯 STATE MANAGEMENT - Variables that control authentication behavior
  // ============================================================================
  const [user, setUser] = useState<User | null>(null);     // Store current user information
  const [loading, setLoading] = useState(true);            // Show loading while checking authentication status

  // ============================================================================
  // 🔄 SIDE EFFECTS - Code that runs when component mounts or updates
  // ============================================================================
  useEffect(() => {
    // ============================================================================
    // 🔍 INITIAL AUTH CHECK - Check if user is already logged in when app starts
    // ============================================================================
    const readCookie = (name: string): string | null => {
      if (typeof document === 'undefined') return null;
      const cookies = document.cookie ? document.cookie.split('; ') : [];
      for (const c of cookies) {
        const [k, ...v] = c.split('=');
        if (k === name) return decodeURIComponent(v.join('='));
      }
      return null;
    };

    const checkAuthStatus = () => {
      try {
        // =========================================================================
        // 🎫 TOKEN RETRIEVAL - Get stored token using apiClient's cross-domain method
        // =========================================================================
        const token = apiClient.getStoredToken();
        
        // Debug: Log token retrieval with more visible output
        console.log('🔍🔍🔍 AUTHCONTEXT TOKEN CHECK 🔍🔍🔍');
        console.log('Hostname:', typeof window !== 'undefined' ? window.location.hostname : 'SSR');
        console.log('Token found:', token ? 'YES ✅' : 'NO ❌');
        console.log('Token length:', token?.length || 0);
        console.log('🔍🔍🔍 END TOKEN CHECK 🔍🔍🔍');
        
        if (token) {
          // ============================================================================
          // 🔐 TOKEN VALIDATION - Decode JWT to get user information
          // ============================================================================
          const decoded = jwtDecode(token) as any;
          const currentTime = Date.now() / 1000;
          
          // ============================================================================
          // ⏰ EXPIRATION CHECK - Ensure token hasn't expired
          // ============================================================================
          if (decoded.exp > currentTime) {
            // ============================================================================
            // 👤 USER STATE UPDATE - Set authenticated user information
            // ============================================================================
            setUser({
              id: decoded.id,
              email: decoded.email,
              role: decoded.role,
            });
            setLoading(false);
            
            // Debug: Log successful authentication
            console.log('✅ AuthContext Debug - User authenticated:', {
              hostname: typeof window !== 'undefined' ? window.location.hostname : 'SSR',
              userId: decoded.id,
              userEmail: decoded.email,
              userRole: decoded.role
            });
            
            return;
          } else {
            // ============================================================================
            // ⏰ EXPIRED TOKEN - Remove expired token and clear user data
            // ============================================================================
            localStorage.removeItem('authToken');
            apiClient.clearToken();
          }
        }
      } catch (error) {
        // ============================================================================
        // ❌ TOKEN ERROR - Handle invalid tokens by clearing them
        // ============================================================================
        console.error('Error checking auth status:', error);
        localStorage.removeItem('authToken');
        apiClient.clearToken();
      } finally {
        setLoading(false);                                  // Hide loading state
      }
    };

    // ============================================================================
    // 🚀 INITIAL CHECK - Run authentication check when component mounts
    // ============================================================================
    checkAuthStatus();

    const onMessage = (event: MessageEvent) => {
      try {
        const data: any = (event as any).data;
        if (data && data.type === 'request-auth-token') {
          const token = apiClient.getStoredToken();
          if (token && (event.source as WindowProxy | null)) {
            (event.source as WindowProxy).postMessage({ type: 'auth-token', token }, event.origin);
          }
        }
      } catch {}
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('message', onMessage);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('message', onMessage);
      }
    };
  }, []); // Empty dependency array means this runs only once when component mounts

  // ============================================================================
  // 🔑 LOGIN FUNCTION - Authenticate user with email and password
  // ============================================================================
  const login = async (email: string, password: string, requireAdminRole: boolean = false) => {
    try {
      // ============================================================================
      // 🌐 API CALL - Send login request to backend server
      // ============================================================================
      const response = await apiClient.login(email, password);
      
      // ============================================================================
      // 🎫 TOKEN EXTRACTION - Get JWT token from login response
      // ============================================================================
      const token = response.token;
      
      if (token) {
        // ============================================================================
        // 🔐 TOKEN DECODING - Extract user information from JWT
        // ============================================================================
        const decoded = jwtDecode(token) as any;

        // ============================================================================
        // 🚫 BLOCK SLOT ADMIN FROM NORMAL LOGIN
        // ============================================================================
        if (decoded?.role === 'SLOT_ADMIN') {
          apiClient.clearToken();
          localStorage.removeItem('authToken');
          throw new Error('This account is for Doctors Management. Please use /slot-admin/login.');
        }
        
        // ============================================================================
        // 💾 USER DATA STORAGE - Save user information and token
        // ============================================================================
        const userData: User = {
          id: decoded.userId,
          email: decoded.email,
          role: decoded.role
        };
        
        // ============================================================================
        // 🚫 ROLE VALIDATION - Check if admin role is required for this login
        // ============================================================================
        if (requireAdminRole && userData.role !== 'ADMIN') {
          // ============================================================================
          // ❌ ACCESS DENIED - Clear token and throw error for non-admin users
          // ============================================================================
          apiClient.clearToken();
          localStorage.removeItem('authToken');
          throw new Error('Access denied. Admin privileges required.');
        }
        
        setUser(userData);                                  // Update user state
        apiClient.setToken(token);                          // Store token in API client
        localStorage.setItem('authToken', token);           // Save token in localStorage
        
        // ============================================================================
        // 🎯 ROLE-BASED REDIRECTION - Redirect users based on their role
        // ============================================================================
        
        // Check for redirect param in current URL
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect');
        
        if (redirect) {
          window.location.href = decodeURIComponent(redirect);
          return;
        }

        if (userData.role === 'ADMIN') {
          // ============================================================================
          // 🔒 ADMIN REDIRECT - Send admins to admin panel
          // ============================================================================
          window.location.href = '/admin-secure-panel-7x9y2z-2024';
        } else if (userData.role === 'DOCTOR') {
          // ============================================================================
          // 🩺 DOCTOR REDIRECT - Send doctors to their dashboard
          // ============================================================================
          window.location.href = '/dashboard';
        } else if (userData.role === 'HOSPITAL_ADMIN') {
          // ============================================================================
          // 🏥 HOSPITAL ADMIN REDIRECT - Send hospital admins to dashboard
          // ============================================================================
          window.location.href = '/dashboard';
        } else {
          // ============================================================================
          // 🏠 PATIENT REDIRECT - Send patients to homepage
          // ============================================================================
          window.location.href = '/';
        }
      } else {
        throw new Error('No token received from login');
      }
    } catch (error) {
      // ============================================================================
      // ❌ LOGIN ERROR - Handle login failures
      // ============================================================================
      console.error('Login error:', error);
      throw error;                                          // Re-throw error for component handling
    }
  };

  // ============================================================================
  // 📝 REGISTER FUNCTION - Create new user account
  // ============================================================================
  const register = async (email: string, password: string, role: string, name?: string, phone?: string) => {
    try {
      // ============================================================================
      // 🌐 API CALL - Send registration request to backend server
      // ============================================================================
      await apiClient.register(email, password, role, name, phone);
      
      // ============================================================================
      // 🔑 AUTO-LOGIN - Automatically log in user after successful registration
      // ============================================================================
      await login(email, password);
    } catch (error) {
      // ============================================================================
      // ❌ REGISTRATION ERROR - Handle registration failures
      // ============================================================================
      console.error('Registration error:', error);
      throw error;                                          // Re-throw error for component handling
    }
  };

  // ============================================================================
  // 🚪 LOGOUT FUNCTION - Clear user authentication and data
  // ============================================================================
  const logout = () => {
    // ============================================================================
    // 🗑️ DATA CLEANUP - Remove all authentication data
    // ============================================================================
    setUser(null);                                          // Clear user state
    apiClient.clearToken();                                 // Clear token from API client
    localStorage.removeItem('authToken');                   // Remove token from localStorage
  };

  // ============================================================================
  // 🔄 TOKEN UPDATE FUNCTION - Refresh user data from stored token
  // ============================================================================
  const updateUserFromToken = () => {
    try {
      // ============================================================================
      // 🎫 TOKEN RETRIEVAL - Get current token from localStorage
      // ============================================================================
      const token = localStorage.getItem('authToken');
      
      if (token) {
        // ============================================================================
        // 🔐 TOKEN DECODING - Extract fresh user information
        // ============================================================================
        const decoded = jwtDecode(token) as any;
        
        // ============================================================================
        // ✅ USER UPDATE - Update user state with fresh data
        // ============================================================================
        const userData: User = {
          id: decoded.userId,
          email: decoded.email,
          role: decoded.role
        };
        
        setUser(userData);                                  // Update user state
        apiClient.setToken(token);                          // Ensure API client has token
      }
    } catch (error) {
      // ============================================================================
      // ❌ TOKEN ERROR - Handle invalid tokens by logging out
      // ============================================================================
      console.error('Error updating user from token:', error);
      logout();                                             // Clear invalid authentication
    }
  };

  // ============================================================================
  // 🎯 CONTEXT VALUE - Data and functions provided to child components
  // ============================================================================
  const value: AuthContextType = {
    user,                                                   // Current user information
    loading,                                                // Loading state
    login,                                                  // Login function
    register,                                               // Registration function
    logout,                                                 // Logout function
    updateUserFromToken                                     // Token update function
  };

  // ============================================================================
  // 🎨 RENDER - Provide authentication context to all child components
  // ============================================================================
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// ============================================================================
// 🎣 CUSTOM HOOK - Easy way for components to access authentication context
// ============================================================================
// Components use this hook instead of useContext directly
// It provides better error handling and TypeScript support
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    // ============================================================================
    // ❌ CONTEXT ERROR - Helpful error if hook is used outside provider
    // ============================================================================
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};
