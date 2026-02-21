"use client";

import { Stethoscope, Building2, Calendar, Search } from "lucide-react";

export default function MobileBottomNavigation() {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg md:hidden z-50">
      <div className="grid grid-cols-4 h-16">
        <a 
          href="/doctors" 
          className="flex flex-col items-center justify-center py-2 text-gray-600 hover:text-blue-600 transition-colors"
        >
          <Stethoscope className="w-5 h-5 mb-1" />
          <span className="text-xs">Doctors</span>
        </a>
        
        <a 
          href="/hospitals" 
          className="flex flex-col items-center justify-center py-2 text-gray-600 hover:text-blue-600 transition-colors"
        >
          <Building2 className="w-5 h-5 mb-1" />
          <span className="text-xs">Hospitals</span>
        </a>
        
        <a 
          href="/appointments" 
          className="flex flex-col items-center justify-center py-2 text-gray-600 hover:text-blue-600 transition-colors"
        >
          <Calendar className="w-5 h-5 mb-1" />
          <span className="text-xs">Booking</span>
        </a>
        
        <a 
          href="/search" 
          className="flex flex-col items-center justify-center py-2 text-gray-600 hover:text-blue-600 transition-colors"
        >
          <Search className="w-5 h-5 mb-1" />
          <span className="text-xs">Search</span>
        </a>
      </div>
    </div>
  );
}
