"use client";

import { useState, useEffect, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useInstantNav } from "../hooks/useInstantNav";
import { 
  Home, Calendar, Heart, Stethoscope, Building2, User, Settings,
  LogOut, LayoutDashboard
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
        { href: "/", icon: Home, label: "Home", protected: false },
        { href: "/doctors", icon: Stethoscope, label: "Doctors", protected: false },
        { href: "/hospitals", icon: Building2, label: "Hospitals", protected: false },
        { href: "/login", icon: User, label: "Sign In", protected: false },
      ];
    }
    if (user.role === "DOCTOR") {
      return [
        { href: "/dashboard", icon: LayoutDashboard, label: "Overview", protected: true },
        { href: "/dashboard?tab=appointments", icon: Calendar, label: "Bookings", protected: true },
        { href: "/dashboard/profile", icon: User, label: "Profile", protected: true },
        { href: "/dashboard?tab=settings", icon: Settings, label: "Settings", protected: true },
      ];
    }
    if (user.role === "HOSPITAL_ADMIN") {
      return [
        { href: "/dashboard", icon: LayoutDashboard, label: "Overview", protected: true },
        { href: "/hospital-admin/profile", icon: Building2, label: "Hospital", protected: true },
        { href: "/dashboard?tab=appointments", icon: Calendar, label: "Bookings", protected: true },
        { href: "/dashboard?tab=settings", icon: Settings, label: "Settings", protected: true },
      ];
    }
    return [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", protected: true },
      { href: "/", icon: Home, label: "Home", protected: false },
      { href: "/dashboard?tab=appointments", icon: Calendar, label: "Bookings", protected: true },
      { href: "/saved", icon: Heart, label: "Saved", protected: true },
      { href: "/doctors", icon: Stethoscope, label: "Doctors", protected: false },
      { href: "/hospitals", icon: Building2, label: "Hospitals", protected: false },
      { href: "/dashboard/profile", icon: User, label: "Profile", protected: true },
    ];
  };

  const navItems = getNavItems();

  const handleNav = (href: string, isProtected: boolean) => {
    if (isProtected && !user) {
      router.push("/login?redirect=" + encodeURIComponent(href));
      return;
    }
    router.push(href);
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
          {navItems.map((item) => {
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
