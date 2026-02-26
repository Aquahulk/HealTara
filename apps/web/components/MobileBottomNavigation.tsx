"use client";

import { Stethoscope, Building2, Home, Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useInstantNav } from "../hooks/useInstantNav";

interface MobileBottomNavigationProps {
  currentPath?: string;
  className?: string;
}

export default function MobileBottomNavigation({ 
  currentPath, 
  className = "" 
}: MobileBottomNavigationProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { getNavProps } = useInstantNav();
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

  const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    
    // Special handling for Home button - always check for subdomain or microsite path
    if (href === "/" && typeof window !== 'undefined') {
      const currentHost = window.location.hostname;
      const currentPath = window.location.pathname;
      
      console.log('Home clicked - Current host:', currentHost, 'Path:', currentPath);
      
      // Check if we're on a hospital/doctor microsite route (path-based)
      const isOnMicrosite = currentPath.startsWith('/hospital-site/') || 
                           currentPath.startsWith('/site/') || 
                           currentPath.startsWith('/doctor-site/');
      
      // ALWAYS redirect to homepage if on microsite path
      if (isOnMicrosite) {
        console.log('On microsite path, forcing redirect to main homepage');
        // Force full page reload to ensure we leave the microsite
        window.location.href = window.location.origin + '/';
        return;
      }
      
      // For localhost with subdomain simulation (e.g., holaamigo.localhost:3000)
      if (currentHost.includes('.localhost') && currentHost !== 'localhost') {
        // Extract just 'localhost' and navigate there
        const port = window.location.port ? `:${window.location.port}` : '';
        const mainUrl = `${window.location.protocol}//localhost${port}/`;
        console.log('Redirecting from subdomain to main localhost:', mainUrl);
        window.location.href = mainUrl;
        return;
      }
      
      // For production subdomains (e.g., holaamigo.example.com)
      const parts = currentHost.split('.');
      if (parts.length > 2 && parts[0] !== 'www') {
        // We're on a subdomain, navigate to primary domain
        const primaryDomain = parts.slice(-2).join('.');
        const protocol = window.location.protocol;
        const port = window.location.port ? `:${window.location.port}` : '';
        const mainUrl = `${protocol}//${primaryDomain}${port}/`;
        console.log('Redirecting from subdomain to primary domain:', mainUrl);
        window.location.href = mainUrl;
        return;
      }
    }
    
    // For all other navigation, use Next.js router
    console.log('Using router for:', href);
    router.push(href);
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
              onClick={(e) => handleNavigation(e, item.href)}
              {...getNavProps(item.href)}
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
