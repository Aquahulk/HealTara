"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
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
  FileText
} from "lucide-react";

interface DesktopSidebarProps {
  className?: string;
  onCollapseChange?: (collapsed: boolean) => void;
}

export default function DesktopSidebar({ className = "", onCollapseChange }: DesktopSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

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
      description: "Back to homepage"
    },
    {
      href: "/my-bookings",
      icon: Calendar,
      label: "My Bookings",
      description: "View appointments"
    },
    {
      href: "/saved",
      icon: Heart,
      label: "Saved",
      description: "Saved doctors & hospitals"
    },
    {
      href: "/doctors",
      icon: Stethoscope,
      label: "Find Doctors",
      description: "Search doctors"
    },
    {
      href: "/hospitals",
      icon: Building2,
      label: "Hospitals",
      description: "Browse hospitals"
    },
    {
      href: "/history",
      icon: Clock,
      label: "History",
      description: "Past appointments"
    },
    {
      href: "/profile",
      icon: User,
      label: "Profile",
      description: "Your profile"
    },
    {
      href: "/settings",
      icon: Settings,
      label: "Settings",
      description: "Account settings"
    }
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname?.startsWith(href);
  };

  return (
    <aside 
      className={`hidden md:flex flex-col bg-white border-r border-gray-200 shadow-sm transition-all duration-300 fixed left-0 top-0 h-screen z-40 ${
        isCollapsed ? "w-20" : "w-64"
      } ${className}`}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!isCollapsed && (
          <h2 className="text-lg font-bold text-gray-900">Navigation</h2>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors ml-auto"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-gray-600" />
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
                  onClick={() => router.push(item.href)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-3 rounded-lg
                    transition-all duration-200
                    ${active 
                      ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-md" 
                      : "text-gray-700 hover:bg-gray-100"
                    }
                    ${isCollapsed ? "justify-center" : ""}
                  `}
                  title={isCollapsed ? item.label : ""}
                >
                  <Icon 
                    className={`w-5 h-5 flex-shrink-0 ${
                      active ? "text-white" : "text-gray-600"
                    }`}
                  />
                  {!isCollapsed && (
                    <div className="flex-1 text-left">
                      <div className={`font-semibold text-sm ${
                        active ? "text-white" : "text-gray-900"
                      }`}>
                        {item.label}
                      </div>
                      <div className={`text-xs ${
                        active ? "text-white/80" : "text-gray-500"
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
        <div className="p-4 border-t border-gray-200">
          <div className="bg-gradient-to-r from-emerald-50 to-cyan-50 rounded-lg p-3 border border-emerald-200">
            <div className="flex items-start gap-2">
              <FileText className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  Quick Tip
                </h3>
                <p className="text-xs text-gray-600">
                  Save your favorite doctors for faster booking next time!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
