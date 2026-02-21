"use client";

import { Stethoscope, Building2, Home, Search } from "lucide-react";
import { usePathname } from "next/navigation";

interface MobileBottomNavigationProps {
  currentPath?: string;
  className?: string;
}

export default function MobileBottomNavigation({ 
  currentPath, 
  className = "" 
}: MobileBottomNavigationProps = {}) {
  const pathname = usePathname();
  const activePath = currentPath || pathname;

  const navItems = [
    {
      href: "/",
      icon: Home,
      label: "Home",
      ariaLabel: "Navigate to home page"
    },
    {
      href: "/doctors",
      icon: Stethoscope,
      label: "Doctors",
      ariaLabel: "Navigate to doctors page"
    },
    {
      href: "/hospitals",
      icon: Building2,
      label: "Hospitals",
      ariaLabel: "Navigate to hospitals page"
    },
    {
      href: "/search",
      icon: Search,
      label: "Search",
      ariaLabel: "Navigate to search page"
    }
  ];

  const isActive = (href: string) => {
    // Special handling for home page
    if (href === "/") {
      return activePath === "/" || activePath === "";
    }
    return activePath === href || activePath?.startsWith(href + "/");
  };

  return (
    <nav 
      className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg md:hidden z-50 ${className}`}
      role="navigation"
      aria-label="Mobile bottom navigation"
    >
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <a
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center justify-center
                min-h-[44px] min-w-[44px]
                py-2 px-1
                transition-all duration-200 ease-in-out
                active:scale-95 active:opacity-80
                ${active 
                  ? "text-blue-600 bg-blue-50" 
                  : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
                }
              `}
              aria-label={item.ariaLabel}
              aria-current={active ? "page" : undefined}
              role="link"
              tabIndex={0}
            >
              <Icon 
                className={`
                  w-5 h-5 mb-1
                  transition-transform duration-200
                  ${active ? "scale-110" : ""}
                `}
                aria-hidden="true"
              />
              <span className={`
                text-xs font-medium
                ${active ? "font-semibold" : ""}
              `}>
                {item.label}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
