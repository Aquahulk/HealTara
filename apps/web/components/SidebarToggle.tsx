'use client';

import React from 'react';

interface SidebarToggleProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarToggle({ children, className }: SidebarToggleProps) {
  const openSidebar = () => {
    const sidebar = document.getElementById('doctor-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar && overlay) {
      sidebar.classList.remove('translate-x-full');
      overlay.classList.remove('hidden');
    }
  };

  return (
    <button onClick={openSidebar} className={className}>
      {children}
    </button>
  );
}

interface SidebarOverlayProps {
  className?: string;
}

export function SidebarOverlay({ className }: SidebarOverlayProps) {
  const closeSidebar = () => {
    const sidebar = document.getElementById('doctor-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar && overlay) {
      sidebar.classList.add('translate-x-full');
      overlay.classList.add('hidden');
    }
  };

  return (
    <div 
      id="sidebar-overlay"
      className={className}
      onClick={closeSidebar}
    />
  );
}
