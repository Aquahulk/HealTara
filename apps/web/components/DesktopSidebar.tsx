"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useInstantNav } from "../hooks/useInstantNav";
import { 
  Home, 
  Calendar, 
  Heart, 
  Stethoscope, 
  Building2, 
  User, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  LogOut,
  LayoutDashboard,
  Users,
  Briefcase,
  PlusCircle,
  ClipboardList
} from "lucide-react";

interface DesktopSidebarProps {
  className?: string;
  onCollapseChange?: (collapsed: boolean) => void;
}

export default function DesktopSidebar({ className = "", onCollapseChange }: DesktopSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { getNavProps } = useInstantNav();

  // Notify parent when collapse state changes
  useEffect(() => {
    if (onCollapseChange) {
      onCollapseChange(isCollapsed);
    }
    // Update CSS variable for main content margin
    document.documentElement.style.setProperty(
      '--sidebar-width',
      isCollapsed ? '5rem' : '16rem'
    );
  }, [isCollapsed, onCollapseChange]);

  // Role-specific navigation items
  const getNavItems = () => {
    // 🏠 DEFAULT (NOT LOGGED IN)
    if (!user) {
      return [
        { href: "/", icon: Home, label: "Home", description: "Back to homepage", protected: false },
        { href: "/doctors", icon: Stethoscope, label: "Find Doctors", description: "Search specialists", protected: false },
        { href: "/hospitals", icon: Building2, label: "Hospitals", description: "Browse facilities", protected: false },
        { href: "/login", icon: User, label: "Login / Register", description: "Access your account", protected: false },
      ];
    }

    // 👨‍⚕️ DOCTOR SIDEBAR
    if (user.role === "DOCTOR") {
      return [
        { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", description: "Practice overview", protected: true },
        { href: "/dashboard?tab=appointments", icon: Calendar, label: "Appointments", description: "Manage bookings", protected: true },
        { href: "/dashboard/profile", icon: User, label: "My Profile", description: "Practice details", protected: true },
        { href: "/dashboard/settings", icon: Settings, label: "Settings", description: "Account config", protected: true },
      ];
    }

    // 🏥 HOSPITAL ADMIN SIDEBAR
    if (user.role === "HOSPITAL_ADMIN") {
      return [
        { href: "/hospital-admin", icon: Building2, label: "Admin Panel", description: "Facility management", protected: true },
        { href: "/hospital-admin/doctors", icon: Users, label: "Our Doctors", description: "Manage medical staff", protected: true },
        { href: "/hospital-admin/profile", icon: User, label: "Hospital Profile", description: "Update details", protected: true },
        { href: "/hospital-admin/settings", icon: Settings, label: "Settings", description: "Admin config", protected: true },
      ];
    }

    // 👤 PATIENT SIDEBAR
    return [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", description: "Your overview", protected: true },
      { href: "/", icon: Home, label: "Home Page", description: "Find care", protected: false },
      { href: "/dashboard?tab=appointments", icon: Calendar, label: "My Bookings", description: "View appointments", protected: true },
      { href: "/saved", icon: Heart, label: "Saved", description: "Doctors & Hospitals", protected: true },
      { href: "/doctors", icon: Stethoscope, label: "Find Doctors", description: "Search care", protected: false },
      { href: "/hospitals", icon: Building2, label: "Hospitals", description: "Browse facilities", protected: false },
      { href: "/history", icon: Clock, label: "History", description: "Past visits", protected: true },
      { href: "/dashboard/profile", icon: User, label: "My Profile", description: "Personal info", protected: true },
    ];
  };

  const navItems = getNavItems();

  const handleNavigation = (href: string, isProtected: boolean) => {
    // Resolve destination based on route and role
    const resolveHref = (raw: string) => {
      if (raw === "/my-bookings") {
        return "/dashboard?tab=appointments";
      }
      if (raw === "/profile") {
        if (user?.role === "HOSPITAL_ADMIN") return "/hospital-admin/profile";
        // Patients and Doctors land on the unified dashboard profile editor
        return "/dashboard/profile";
      }
      return raw;
    };

    const target = resolveHref(href);

    if (isProtected && !user) {
      router.push("/login?redirect=" + encodeURIComponent(target));
      return;
    }

    router.push(target);
  };

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    
    // Special handling for My Bookings - active when on dashboard with appointments tab
    if (href === "/my-bookings") {
      return pathname === "/dashboard" && searchParams?.get('tab') === 'appointments';
    }
    
    // Profile can resolve to different routes based on role
    if (href === "/dashboard/profile" || href === "/hospital-admin/profile") {
      return pathname === href;
    }
    
    // Exact match for dashboard home
    if (href === "/dashboard" || href === "/hospital-admin") {
      return pathname === href && !searchParams?.get('tab');
    }

    // Tab match for appointments
    if (href.includes("tab=appointments")) {
      return searchParams?.get('tab') === 'appointments';
    }
    
    return pathname === href || pathname?.startsWith(href + "/");
  };

  return (
    <aside 
      className={`hidden md:flex flex-col bg-gradient-to-b from-blue-600 to-blue-800 border-r border-blue-900 shadow-lg transition-all duration-300 fixed left-0 top-0 h-screen z-40 ${
        isCollapsed ? "w-20" : "w-64"
      } ${className}`}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4 border-b border-blue-700">
        {!isCollapsed && (
          <h2 className="text-lg font-bold text-white">Navigation</h2>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-blue-700 transition-colors ml-auto"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5 text-white" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-white" />
          )}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <li key={item.href}>
                <button
                  onClick={() => handleNavigation(item.href, item.protected)}
                  {...getNavProps(item.href)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-3 rounded-lg
                    transition-all duration-200
                    ${active 
                      ? "bg-white text-blue-600 shadow-md" 
                      : "text-blue-100 hover:bg-blue-700"
                    }
                    ${isCollapsed ? "justify-center" : ""}
                  `}
                  title={isCollapsed ? item.label : ""}
                >
                  <Icon 
                    className={`w-5 h-5 flex-shrink-0 ${
                      active ? "text-blue-600" : "text-blue-200"
                    }`}
                  />
                  {!isCollapsed && (
                    <div className="flex-1 text-left">
                      <div className={`font-semibold text-sm ${
                        active ? "text-blue-600" : "text-white"
                      }`}>
                        {item.label}
                      </div>
                      <div className={`text-xs ${
                        active ? "text-blue-500" : "text-blue-200"
                      }`}>
                        {item.description}
                      </div>
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Sidebar Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-blue-700">
          <div className="bg-blue-700 rounded-lg p-3 border border-blue-600 mb-2">
            <div className="flex items-start gap-2">
              <FileText className="w-5 h-5 text-blue-200 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">
                  Quick Tip
                </h3>
                <p className="text-xs text-blue-100">
                  {user?.role === 'DOCTOR' 
                    ? "Update your working hours to stay available!" 
                    : user?.role === 'HOSPITAL_ADMIN'
                    ? "Add your top doctors to get more bookings!"
                    : "Save your favorite doctors for faster booking!"}
                </p>
              </div>
            </div>
          </div>
          
          {user && (
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-blue-100 hover:bg-blue-700 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Log Out</span>
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
