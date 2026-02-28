"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
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
  LogOut
} from "lucide-react";

interface DesktopSidebarProps {
  className?: string;
  onCollapseChange?: (collapsed: boolean) => void;
}

export default function DesktopSidebar({ className = "", onCollapseChange }: DesktopSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
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

  const navItems = [
    {
      href: "/",
      icon: Home,
      label: "Home",
      description: "Back to homepage",
      protected: false
    },
    {
      href: "/my-bookings",
      icon: Calendar,
      label: "My Bookings",
      description: "View appointments",
      protected: true
    },
    {
      href: "/saved",
      icon: Heart,
      label: "Saved",
      description: "Saved doctors & hospitals",
      protected: true
    },
    {
      href: "/doctors",
      icon: Stethoscope,
      label: "Find Doctors",
      description: "Search doctors",
      protected: false
    },
    {
      href: "/hospitals",
      icon: Building2,
      label: "Hospitals",
      description: "Browse hospitals",
      protected: false
    },
    {
      href: "/history",
      icon: Clock,
      label: "History",
      description: "Past appointments",
      protected: true
    },
    {
      href: "/profile",
      icon: User,
      label: "Profile",
      description: "Your profile",
      protected: true
    },
    {
      href: "/settings",
      icon: Settings,
      label: "Settings",
      description: "Account settings",
      protected: true
    }
  ];

  const handleNavigation = (href: string, isProtected: boolean) => {
    if (isProtected && !user) {
      // Redirect to login if user is not authenticated for protected routes
      router.push('/auth?redirect=' + encodeURIComponent(href));
      return;
    }
    router.push(href);
  };

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname?.startsWith(href);
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
                  Save your favorite doctors for faster booking next time!
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
