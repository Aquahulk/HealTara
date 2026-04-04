/**
 * MobileHeader Component
 * Mobile-optimized header with reduced height, hamburger menu, and optional scroll-to-hide behavior
 * 
 * Features:
 * - Maximum 64px height on mobile
 * - Hamburger menu toggle
 * - Collapsible user menu
 * - Optional scroll-to-hide behavior
 * - Sticky positioning
 * 
 * Requirements: 7.1, 7.2, 7.5, 7.6, 7.7
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useMobile } from '@/context/MobileContext';
import { Menu, X } from 'lucide-react';

export interface MobileHeaderProps {
  hideOnScroll?: boolean;
  showLogo?: boolean;
  showBookButton?: boolean;
}

/**
 * MobileHeader component
 * Displays a mobile-optimized header with hamburger menu and user controls
 */
export default function MobileHeader({
  hideOnScroll = false,
  showLogo = true,
  showBookButton = true,
}: MobileHeaderProps) {
  const { user, logout } = useAuth();
  const { isHamburgerMenuOpen, setHamburgerMenuOpen, viewport } = useMobile();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Handle scroll-to-hide behavior
  useEffect(() => {
    if (!hideOnScroll) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Show header when scrolling up, hide when scrolling down
      if (currentScrollY < lastScrollY || currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 64) {
        setIsVisible(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [hideOnScroll, lastScrollY]);

  // Prevent body scroll when hamburger menu is open
  useEffect(() => {
    if (isHamburgerMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isHamburgerMenuOpen]);

  // Handle logout
  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    setHamburgerMenuOpen(false);
  };

  // Toggle hamburger menu
  const toggleHamburgerMenu = () => {
    setHamburgerMenuOpen(!isHamburgerMenuOpen);
    setIsUserMenuOpen(false);
  };

  // Only render on mobile devices
  if (!viewport.isMobile) {
    return null;
  }

  return (
    <>
      {/* Mobile Header - Maximum 64px height */}
      <header
        className={`
          fixed top-0 left-0 right-0 z-50 
          bg-[#003a9f] text-white shadow-md
          transition-transform duration-300
          ${isVisible ? 'translate-y-0' : '-translate-y-full'}
        `}
        style={{ maxHeight: '64px' }}
      >
        <div className="flex items-center justify-between h-16 px-4">
          {/* Hamburger Menu Button - Left side */}
          <button
            onClick={toggleHamburgerMenu}
            className="
              flex items-center justify-center
              min-w-[44px] min-h-[44px]
              -ml-2
              text-white hover:bg-white/10 rounded-md
              transition-colors
            "
            aria-label={isHamburgerMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isHamburgerMenuOpen}
          >
            {isHamburgerMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>

          {/* Logo - Center */}
          {showLogo && (
            <Link href="/" className="flex items-center space-x-2">
              <div className="text-xl">🏥</div>
              <span className="text-lg font-bold text-white">Healtara</span>
            </Link>
          )}

          {/* Book Appointment Button - Right side */}
          {showBookButton && (
            <Link
              href="/doctors"
              className="
                bg-gradient-to-r from-emerald-500 to-teal-500 
                text-white text-xs font-semibold
                px-3 py-2 rounded-full
                hover:from-emerald-600 hover:to-teal-600
                transition-all duration-300
                shadow-md
                min-h-[44px] flex items-center
              "
            >
              📅 Book
            </Link>
          )}
        </div>
      </header>

      {/* Full-Screen Hamburger Menu Overlay */}
      {isHamburgerMenuOpen && (
        <div
          className="
            fixed inset-0 z-40 
            bg-white
            overflow-y-auto
          "
          style={{ top: '64px' }}
        >
          <nav className="flex flex-col p-4 space-y-2">
            {/* User Section */}
            {user ? (
              <div className="border-b border-gray-200 pb-4 mb-4">
                {/* User Info */}
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="
                    flex items-center justify-between w-full
                    text-gray-900 font-medium
                    px-4 py-3 rounded-lg
                    hover:bg-gray-100
                    transition-colors
                    min-h-[44px]
                  "
                >
                  <div className="flex items-center space-x-2">
                    <span>👤</span>
                    <span>{(user as any)?.name || user.email?.split('@')[0]}</span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      {user.role}
                    </span>
                  </div>
                  <svg
                    className={`w-5 h-5 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* User Menu Items */}
                {isUserMenuOpen && (
                  <div className="mt-2 space-y-1 pl-4">
                    <Link
                      href="/dashboard"
                      className="
                        block text-gray-700 
                        px-4 py-3 rounded-lg
                        hover:bg-gray-100
                        transition-colors
                        min-h-[44px] flex items-center
                      "
                      onClick={() => setHamburgerMenuOpen(false)}
                    >
                      🏠 Dashboard
                    </Link>
                    <Link
                      href="/dashboard/profile"
                      className="
                        block text-gray-700 
                        px-4 py-3 rounded-lg
                        hover:bg-gray-100
                        transition-colors
                        min-h-[44px] flex items-center
                      "
                      onClick={() => setHamburgerMenuOpen(false)}
                    >
                      👤 Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="
                        block w-full text-left text-gray-700 
                        px-4 py-3 rounded-lg
                        hover:bg-gray-100
                        transition-colors
                        min-h-[44px] flex items-center
                      "
                    >
                      🚪 Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="border-b border-gray-200 pb-4 mb-4 space-y-2">
                <Link
                  href="/login"
                  className="
                    block text-gray-900 font-medium
                    px-4 py-3 rounded-lg
                    hover:bg-gray-100
                    transition-colors
                    min-h-[44px] flex items-center
                  "
                  onClick={() => setHamburgerMenuOpen(false)}
                >
                  🧑‍⚕️ Patient Login
                </Link>
                <Link
                  href="/login/doctors"
                  className="
                    block text-gray-900 font-medium
                    px-4 py-3 rounded-lg
                    hover:bg-gray-100
                    transition-colors
                    min-h-[44px] flex items-center
                  "
                  onClick={() => setHamburgerMenuOpen(false)}
                >
                  🏥 Doctor/Hospital Login
                </Link>
              </div>
            )}

            {/* Admin Links */}
            {user?.role === 'ADMIN' && (
              <a
                href="/admin-panel/content"
                className="
                  block text-gray-900 font-medium
                  px-4 py-3 rounded-lg
                  hover:bg-gray-100
                  transition-colors
                  min-h-[44px] flex items-center
                "
                onClick={() => setHamburgerMenuOpen(false)}
              >
                🔒 Admin Panel
              </a>
            )}

            <Link
              href="/slot-admin/login"
              className="
                block text-gray-900 font-medium
                px-4 py-3 rounded-lg
                hover:bg-gray-100
                transition-colors
                min-h-[44px] flex items-center
              "
              onClick={() => setHamburgerMenuOpen(false)}
            >
              🧑‍⚕️ Doctors Management
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}
