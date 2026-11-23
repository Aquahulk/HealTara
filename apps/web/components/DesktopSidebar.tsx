"use client";

import { useState, useEffect, Suspense, startTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useInstantNav } from "../hooks/useInstantNav";
import { 
  Home, Calendar, Heart, Stethoscope, Building2, User, Settings,
  LogOut, LayoutDashboard, ClipboardList, Users, Briefcase, 
  Clock, BarChart3, Globe, MessageSquare
} from "lucide-react";

interface DesktopSidebarProps {
  className?: string;
  onCollapseChange?: (collapsed: boolean) => void;
}

// Wrap in Suspense to satisfy Next.js static build (useSearchParams requires it)
export default function DesktopSidebar(props: DesktopSidebarProps) {
  return (
    <Suspense fallback={<div className="hidden md:block fixed left-0 top-[64px] w-20 h-[calc(100vh-64px)] bg-[#1a2744] z-40" />}>
      <DesktopSidebarInner {...props} />
    </Suspense>
  );
}

function DesktopSidebarInner({ className = "", onCollapseChange }: DesktopSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { getNavProps } = useInstantNav();

  useEffect(() => {
    const width = isExpanded ? '14rem' : '5rem';
    document.documentElement.style.setProperty('--sidebar-width', width);
    if (onCollapseChange) onCollapseChange(!isExpanded);
  }, [isExpanded, onCollapseChange]);

  const getNavItems = () => {
    if (!user) {
      return [
        { href: "/", icon: Home, label: "Home", protected: false, section: "main" },
        { href: "/doctors", icon: Stethoscope, label: "Doctors", protected: false, section: "main" },
        { href: "/hospitals", icon: Building2, label: "Hospitals", protected: false, section: "main" },
        { href: "/login", icon: User, label: "Sign In", protected: false, section: "main" },
      ];
    }
    
    if (user.role === "DOCTOR") {
      return [
        // Dashboard Section
        { href: "/dashboard", icon: LayoutDashboard, label: "Overview", protected: true, section: "Dashboard" },
        
        // Operations Section
        { href: "/dashboard?tab=appointments", icon: Calendar, label: "Appointments", protected: true, section: "Operations" },
        { href: "/dashboard?tab=slots", icon: Clock, label: "Slots & Hours", protected: true, section: "Operations" },
        { href: "/dashboard?tab=patients", icon: Users, label: "Patients", protected: true, section: "Operations" },
        
        // Staff Section
        { href: "/dashboard?tab=staff", icon: Briefcase, label: "My Staff", protected: true, section: "Staff" },
        
        // Profile & Settings
        { href: "/dashboard?tab=website", icon: Globe, label: "My Website", protected: true, section: "Profile" },
        { href: "/dashboard/profile", icon: User, label: "Profile", protected: true, section: "Profile" },
        { href: "/dashboard?tab=settings", icon: Settings, label: "Settings", protected: true, section: "Profile" },
      ];
    }
    
    if (user.role === "HOSPITAL_ADMIN") {
      return [
        // Dashboard Section
        { href: "/dashboard", icon: LayoutDashboard, label: "Overview", protected: true, section: "Dashboard" },
        
        // Management Section
        { href: "/dashboard?tab=management", icon: ClipboardList, label: "Doctors", protected: true, section: "Management" },
        { href: "/dashboard?tab=appointments", icon: Calendar, label: "Appointments", protected: true, section: "Management" },
        
        // Staff Section
        { href: "/dashboard?tab=staff", icon: Briefcase, label: "Hospital Staff", protected: true, section: "Staff" },
        
        // Hospital Profile
        { href: "/hospital-admin/profile", icon: Building2, label: "Hospital Info", protected: true, section: "Hospital" },
        { href: "/dashboard?tab=analytics", icon: BarChart3, label: "Analytics", protected: true, section: "Hospital" },
        { href: "/dashboard?tab=settings", icon: Settings, label: "Settings", protected: true, section: "Hospital" },
      ];
    }
    
    if (user.role === "SLOT_ADMIN") {
      return [
        // Dashboard Section
        { href: "/dashboard", icon: LayoutDashboard, label: "My Dashboard", protected: true, section: "Dashboard" },
        
        // Work Section
        { href: "/dashboard?tab=appointments", icon: Calendar, label: "Appointments", protected: true, section: "Work" },
        { href: "/dashboard?tab=slots", icon: Clock, label: "Manage Slots", protected: true, section: "Work" },
        
        // Profile Section
        { href: "/dashboard/profile", icon: User, label: "My Profile", protected: true, section: "Profile" },
      ];
    }
    
    return [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", protected: true, section: "main" },
      { href: "/", icon: Home, label: "Home", protected: false, section: "main" },
      { href: "/dashboard?tab=appointments", icon: Calendar, label: "Bookings", protected: true, section: "main" },
      { href: "/saved", icon: Heart, label: "Saved", protected: true, section: "main" },
      { href: "/doctors", icon: Stethoscope, label: "Doctors", protected: false, section: "main" },
      { href: "/hospitals", icon: Building2, label: "Hospitals", protected: false, section: "main" },
      { href: "/dashboard/profile", icon: User, label: "Profile", protected: true, section: "main" },
    ];
  };

  const navItems = getNavItems();

  const handleNav = (href: string, isProtected: boolean) => {
    if (isProtected && !user) {
      router.push("/login?redirect=" + encodeURIComponent(href));
      return;
    }
    
    // If navigating within dashboard with tab parameter, use shallow navigation
    if (href.startsWith('/dashboard?tab=')) {
      const tab = new URLSearchParams(href.split('?')[1]).get('tab');
      if (tab && pathname === '/dashboard') {
        // Use shallow navigation with startTransition for instant feel
        startTransition(() => {
          router.replace(href, { scroll: false });
        });
        return;
      }
    }
    
    startTransition(() => {
      router.push(href);
    });
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/dashboard" || href === "/hospital-admin") {
      return pathname === href && !searchParams?.get('tab');
    }
    if (href.includes("tab=")) {
      const tab = new URLSearchParams(href.split('?')[1]).get('tab');
      return searchParams?.get('tab') === tab;
    }
    return pathname === href || pathname?.startsWith(href + "/");
  };

  return (
    <aside
      className={`hidden md:flex flex-col bg-[#1a2744] border-r border-white/10 shadow-lg transition-all duration-200 fixed left-0 top-[64px] h-[calc(100vh-64px)] z-40 ${
        isExpanded ? "w-56" : "w-20"
      } ${className}`}
    >
      {/* Toggle — floating pill on edge */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -right-3 top-8 w-6 h-12 bg-[#1a2744] border border-white/20 rounded-r-full flex items-center justify-center shadow-lg hover:bg-[#253552] transition-all group z-50"
        aria-label="Toggle sidebar"
      >
        <div className={`w-3 h-3 border-t-2 border-r-2 border-white/60 group-hover:border-white transition-all ${isExpanded ? 'rotate-[225deg] translate-x-0.5' : 'rotate-45 -translate-x-0.5'}`} />
      </button>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-hide">
        <ul className="space-y-0.5 px-2">
          {(() => {
            const items = navItems;
            const sections = [...new Set(items.map(item => item.section))];
            
            // If only one section or "main", don't show headers
            if (sections.length === 1 || (sections.length === 1 && sections[0] === 'main')) {
              return items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <button
                      onClick={() => handleNav(item.href, item.protected)}
                      {...getNavProps(item.href)}
                      title={!isExpanded ? item.label : undefined}
                      className={`w-full flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 rounded-xl transition-all duration-150 ${
                        isExpanded ? "flex-row gap-3 px-3 py-2.5 justify-start" : ""
                      } ${active ? "bg-white/15 text-white" : "text-white/60 hover:bg-white/10 hover:text-white"}`}
                    >
                      <Icon className={`flex-shrink-0 ${isExpanded ? "w-5 h-5" : "w-6 h-6"}`} />
                      {isExpanded
                        ? <span className="text-sm font-medium truncate">{item.label}</span>
                        : <span className="text-[9px] font-medium leading-tight text-center w-full">{item.label}</span>}
                    </button>
                  </li>
                );
              });
            }
            
            // Show sections with headers
            return sections.map((section, sectionIdx) => {
              const sectionItems = items.filter(item => item.section === section);
              return (
                <div key={section} className={sectionIdx > 0 ? 'mt-4' : ''}>
                  {isExpanded && section !== 'main' && (
                    <div className="px-3 py-2 text-[10px] font-bold text-white/40 uppercase tracking-wider">
                      {section}
                    </div>
                  )}
                  {!isExpanded && section !== 'main' && sectionIdx > 0 && (
                    <div className="h-px bg-white/10 my-2 mx-2"></div>
                  )}
                  {sectionItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <li key={item.href}>
                        <button
                          onClick={() => handleNav(item.href, item.protected)}
                          {...getNavProps(item.href)}
                          title={!isExpanded ? item.label : undefined}
                          className={`w-full flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 rounded-xl transition-all duration-150 ${
                            isExpanded ? "flex-row gap-3 px-3 py-2.5 justify-start" : ""
                          } ${active ? "bg-white/15 text-white" : "text-white/60 hover:bg-white/10 hover:text-white"}`}
                        >
                          <Icon className={`flex-shrink-0 ${isExpanded ? "w-5 h-5" : "w-6 h-6"}`} />
                          {isExpanded
                            ? <span className="text-sm font-medium truncate">{item.label}</span>
                            : <span className="text-[9px] font-medium leading-tight text-center w-full">{item.label}</span>}
                        </button>
                      </li>
                    );
                  })}
                </div>
              );
            });
          })()}
        </ul>
      </nav>

      {/* Logout */}
      {user && (
        <div className="py-2 px-2 border-t border-white/10">
          <button onClick={logout} title={!isExpanded ? "Log Out" : undefined}
            className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-xl text-white/50 hover:bg-white/10 hover:text-red-400 transition-all ${
              !isExpanded ? "flex-col gap-0.5 px-1" : ""
            }`}>
            <LogOut className="flex-shrink-0 w-5 h-5" />
            {isExpanded ? <span className="text-sm font-medium">Log Out</span> : <span className="text-[9px] font-medium">Out</span>}
          </button>
        </div>
      )}
    </aside>
  );
}
