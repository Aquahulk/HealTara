/**
 * MobileContext
 * Provides global mobile-specific state including viewport info, navigation visibility,
 * hamburger menu state, and performance metrics
 */

'use client';

import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { useViewport, type ViewportInfo } from '@/hooks/useViewport';
import { useMobilePerformance, type MobilePerformanceMetrics } from '@/hooks/useMobilePerformance';

export interface MobileContextValue {
  viewport: ViewportInfo;
  isBottomNavVisible: boolean;
  setBottomNavVisible: (visible: boolean) => void;
  isHamburgerMenuOpen: boolean;
  setHamburgerMenuOpen: (open: boolean) => void;
  performanceMetrics: MobilePerformanceMetrics;
}

const MobileContext = createContext<MobileContextValue | undefined>(undefined);

export interface MobileProviderProps {
  children: ReactNode;
}

/**
 * MobileProvider component
 * Wraps the application to provide mobile-specific state and functionality
 */
export function MobileProvider({ children }: MobileProviderProps): React.ReactElement {
  // Use viewport hook for reactive viewport information
  const viewport = useViewport();

  // Use performance hook for monitoring
  const { metrics: performanceMetrics } = useMobilePerformance();

  // Bottom navigation visibility state
  const [isBottomNavVisible, setBottomNavVisible] = useState(true);

  // Hamburger menu state
  const [isHamburgerMenuOpen, setHamburgerMenuOpen] = useState(false);

  const value: MobileContextValue = {
    viewport,
    isBottomNavVisible,
    setBottomNavVisible,
    isHamburgerMenuOpen,
    setHamburgerMenuOpen,
    performanceMetrics,
  };

  return (
    <MobileContext.Provider value={value}>
      {children}
    </MobileContext.Provider>
  );
}

/**
 * useMobile hook
 * Provides access to mobile context
 * @throws Error if used outside of MobileProvider
 * @returns Mobile context value
 */
export function useMobile(): MobileContextValue {
  const context = useContext(MobileContext);

  if (context === undefined) {
    throw new Error('useMobile must be used within a MobileProvider');
  }

  return context;
}
