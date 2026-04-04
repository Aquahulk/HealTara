// ============================================================================
// 🎨 ENHANCED SIDEBAR COMPONENT - Interactive & Engaging
// ============================================================================

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
  TrendingUp,
  Activity,
  Zap,
  MapPin,
  Video,
  Shield,
  Star,
  Bell,
  MessageCircle,
  Users,
  BarChart3,
  Phone,
  AlertCircle,
  CheckCircle
} from "lucide-react";

interface DesktopSidebarProps {
  className?: string;
  onCollapseChange?: (collapsed: boolean) => void;
}

export default function EnhancedDesktopSidebar({ className = "", onCollapseChange }: DesktopSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState('nav');
  const pathname = usePathname();
  const router = useRouter();

  // Mock data for demonstration
  const [healthStats, setHealthStats] = useState({
    doctorsAvailable: 1247,
    hospitalsOpen: 89,
    appointmentsToday: 342,
    avgWaitTime: "15 min"
  });

  const [trendingServices, setTrendingServices] = useState([
    { name: "General Checkup", bookings: 89, trend: "up" },
    { name: "COVID Testing", bookings: 67, trend: "up" },
    { name: "Mental Health", bookings: 45, trend: "stable" },
    { name: "Pediatrics", bookings: 38, trend: "up" }
  ]);

  const [quickActions] = useState([
    { icon: Phone, label: "Emergency", color: "red", action: "emergency" },
    { icon: Video, label: "Video Call", color: "blue", action: "video" },
    { icon: MapPin, label: "Nearest Hospital", color: "green", action: "nearest" },
    { icon: Shield, label: "Health Package", color: "purple", action: "package" }
  ]);

  // Notify parent when collapse state changes
  useEffect(() => {
    if (onCollapseChange) {
      onCollapseChange(isCollapsed);
    }
    document.documentElement.style.setProperty(
      '--sidebar-width',
      isCollapsed ? '5rem' : '16rem'
    );
  }, [isCollapsed, onCollapseChange]);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setHealthStats(prev => ({
        ...prev,
        doctorsAvailable: prev.doctorsAvailable + Math.floor(Math.random() * 10 - 5),
        appointmentsToday: prev.appointmentsToday + Math.floor(Math.random() * 3)
      }));
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

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

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'emergency':
        router.push('/emergency');
        break;
      case 'video':
        router.push('/video-consultation');
        break;
      case 'nearest':
        router.push('/nearest-hospital');
        break;
      case 'package':
        router.push('/health-packages');
        break;
    }
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
          <h2 className="text-lg font-bold text-gray-900">Health Hub</h2>
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

      {/* Section Tabs */}
      {!isCollapsed && (
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveSection('nav')}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              activeSection === 'nav' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Navigation
          </button>
          <button
            onClick={() => setActiveSection('stats')}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              activeSection === 'stats' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveSection('tools')}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              activeSection === 'tools' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Tools
          </button>
        </div>
      )}

      {/* Content Based on Active Section */}
      <div className="flex-1 overflow-y-auto py-4">
        {activeSection === 'nav' && (
          <nav>
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
                          <div className="font-medium">{item.label}</div>
                          <div className="text-xs opacity-75">{item.description}</div>
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        {activeSection === 'stats' && !isCollapsed && (
          <div className="px-4 space-y-4">
            {/* Health Stats Dashboard */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Live Health Stats
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Doctors Available</span>
                  <span className="text-sm font-bold text-green-600">{healthStats.doctorsAvailable}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Hospitals Open</span>
                  <span className="text-sm font-bold text-blue-600">{healthStats.hospitalsOpen}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Appointments Today</span>
                  <span className="text-sm font-bold text-purple-600">{healthStats.appointmentsToday}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Avg Wait Time</span>
                  <span className="text-sm font-bold text-orange-600">{healthStats.avgWaitTime}</span>
                </div>
              </div>
            </div>

            {/* Trending Services */}
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-4 border border-orange-200">
              <h3 className="text-sm font-semibold text-orange-900 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Trending Services
              </h3>
              <div className="space-y-2">
                {trendingServices.map((service, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-xs text-gray-700">{service.name}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium">{service.bookings}</span>
                      {service.trend === 'up' && <TrendingUp className="w-3 h-3 text-green-500" />}
                      {service.trend === 'stable' && <Activity className="w-3 h-3 text-blue-500" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'tools' && !isCollapsed && (
          <div className="px-4 space-y-4">
            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
              <h3 className="text-sm font-semibold text-green-900 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={index}
                      onClick={() => handleQuickAction(action.action)}
                      className={`
                        flex flex-col items-center gap-1 p-3 rounded-lg border transition-all
                        hover:scale-105 active:scale-95
                        ${
                          action.color === 'red' ? 'bg-red-100 border-red-200 hover:bg-red-200' :
                          action.color === 'blue' ? 'bg-blue-100 border-blue-200 hover:bg-blue-200' :
                          action.color === 'green' ? 'bg-green-100 border-green-200 hover:bg-green-200' :
                          'bg-purple-100 border-purple-200 hover:bg-purple-200'
                        }
                      `}
                    >
                      <Icon className={`w-4 h-4 ${
                        action.color === 'red' ? 'text-red-600' :
                        action.color === 'blue' ? 'text-blue-600' :
                        action.color === 'green' ? 'text-green-600' :
                        'text-purple-600'
                      }`} />
                      <span className="text-xs font-medium text-gray-700">{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
              <h3 className="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Updates & Alerts
              </h3>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-700">Lab results ready for 3 patients</span>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-3 h-3 text-orange-500 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-700">2 appointments pending confirmation</span>
                </div>
                <div className="flex items-start gap-2">
                  <MessageCircle className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-700">New health tip available</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Collapsed State Icons */}
        {isCollapsed && (
          <div className="px-2 space-y-4">
            <div className="flex justify-center">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex justify-center">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <div className="flex justify-center">
              <Zap className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex justify-center">
              <Bell className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
