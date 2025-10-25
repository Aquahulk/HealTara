// ============================================================================
// 🎨 HEADER COMPONENT - Main Navigation Bar
// ============================================================================
// This component displays the top navigation bar on all pages
// It shows the logo, navigation links, and user authentication status
// The header adapts based on whether the user is logged in and their role
// 
// IMPORTANT: This is the main navigation component that appears on every page
// ============================================================================

// ============================================================================
// 📦 EXTERNAL DEPENDENCIES - What we're importing and why
// ============================================================================
'use client';                                              // Enable React hooks and client-side features
import { useState } from 'react';                           // React hook for managing local state
import Link from 'next/link';                               // Next.js component for client-side navigation
import { useAuth } from '@/context/AuthContext';           // Custom hook to access user authentication state

// ============================================================================
// 🎨 HEADER COMPONENT - Main navigation bar component
// ============================================================================
export default function Header() {
  // ============================================================================
  // 🎯 STATE MANAGEMENT - Variables that control component behavior
  // ============================================================================
  const { user, logout } = useAuth();                      // Get user info and logout function from auth context
  const [isMenuOpen, setIsMenuOpen] = useState(false);     // Control mobile menu visibility
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false); // Control user dropdown menu visibility
  // Modal removed in favor of separate login pages

  // ============================================================================
  // 🚪 LOGOUT HANDLER - Function to handle user logout
  // ============================================================================
  const handleLogout = () => {
    logout();                                               // Call logout function from auth context
    setIsUserMenuOpen(false);                               // Close user menu after logout
  };

  // ============================================================================
  // 🎯 MAIN RENDER - Display the header navigation
  // ============================================================================
  return (
    <header className="bg-[#003a9f] text-white fixed top-0 left-0 right-0 z-50 w-full shadow">
      {/* ============================================================================
          📱 RESPONSIVE CONTAINER - Main header wrapper with responsive design
          ============================================================================ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* ============================================================================
              🏥 LOGO SECTION - Company branding and home link
              ============================================================================ */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="text-2xl">🏥</div>
              <span className="text-xl font-bold text-white">Healtara</span>
            </Link>
          </div>

          {/* Desktop navigation removed per request (Home, Find Doctors, Hospitals, Clinics, Reviews) */}
          <nav className="hidden lg:flex space-x-8" />

          {/* ============================================================================
              👤 USER SECTION - Authentication and user menu
              ============================================================================ */}
          <div className="flex items-center space-x-4">
            
            {/* ============================================================================
                📅 BOOK APPOINTMENT BUTTON - Prominent CTA button (always visible)
                ============================================================================ */}
            <Link
              href="/doctors"
              className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-2 rounded-full hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 transform hover:scale-105 shadow-lg font-semibold text-sm"
            >
              📅 Book Appointment
            </Link>
            
            {/* ============================================================================
                🔐 AUTHENTICATION STATUS - Show different content based on login state
                ============================================================================ */}
            {user ? (
              // ============================================================================
              // ✅ LOGGED IN USER - Show user menu and dashboard link
              // ============================================================================
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 text-white/90 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  <span>👤 {(user as any)?.name || user.email?.split('@')[0]}</span>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {user.role}
                  </span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* ============================================================================
                    📋 USER DROPDOWN MENU - User-specific navigation options
                    ============================================================================ */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    {/* ============================================================================
                        🏠 DASHBOARD LINK - Role-specific dashboard access
                        ============================================================================ */}
                    <Link
                      href="/dashboard"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      🏠 Dashboard
                    </Link>
                    
                    {/* ============================================================================
                        👤 PROFILE LINK - User profile management
                        ============================================================================ */}
                    <Link
                      href="/dashboard/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      👤 Profile
                    </Link>
                    
                    {/* ============================================================================
                        🚪 LOGOUT OPTION - Sign out of the application
                        ============================================================================ */}
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      🚪 Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // ============================================================================
              // ❌ NOT LOGGED IN - Show login and register links
              // ============================================================================
              <div className="flex space-x-2">
                <Link
                  href="/login"
                  className="text-white/90 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  🧑‍⚕️ Patient Login
                </Link>
                <Link
                  href="/login/doctors"
                  className="text-white/90 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  🏥 Doctor/Hospital Login
                </Link>
              </div>
            )}

            {/* ============================================================================
                📱 MOBILE MENU BUTTON - Hamburger menu for mobile devices
                ============================================================================ */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-white hover:text-white hover:bg-white/10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* ============================================================================
            📱 MOBILE NAVIGATION - Collapsible menu for mobile devices
            ============================================================================ */}
        {isMenuOpen && (
          <div className="lg:hidden border-t border-white/20">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {/* Mobile navigation items removed per request */}
              
              {/* ============================================================================
                  🔒 MOBILE ADMIN LINK - Admin panel access on mobile (only for admins)
                  ============================================================================ */}
              {user?.role === 'ADMIN' && (
                <a
                  href="/admin-panel/content"
                  className="text-white/90 hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  🔒 Admin Panel
                </a>
              )}
              <Link
                href="/slot-admin/login"
                className="text-white/90 hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                🧑‍⚕️ Doctors Management
              </Link>
              
              {/* ============================================================================
                  👤 MOBILE USER OPTIONS - User menu for mobile devices
                  ============================================================================ */}
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="text-white/90 hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    🏠 Dashboard
                  </Link>
                  <Link
                    href="/dashboard/profile"
                    className="text-white/90 hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    👤 Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-white/90 hover:text-white block w-full text-left px-3 py-2 rounded-md text-base font-medium transition-colors"
                  >
                    🚪 Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-white/90 hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    🧑‍⚕️ Patient Login
                  </Link>
                  <Link
                    href="/login/doctors"
                    className="text-white/90 hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    🏥 Doctor/Hospital Login
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
