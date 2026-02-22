"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, MapPin, Building2, Users, Phone } from "lucide-react";

interface Hospital {
  id: number;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  profile?: any;
  _count?: {
    departments?: number;
    doctors?: number;
  };
}

interface HorizontalHospitalScrollProps {
  hospitals: Hospital[];
}

export default function HorizontalHospitalScroll({ hospitals }: HorizontalHospitalScrollProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 400;
      const currentScroll = scrollRef.current.scrollLeft;
      const targetScroll = direction === 'left' 
        ? currentScroll - scrollAmount 
        : currentScroll + scrollAmount;
      
      scrollRef.current.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="relative">
      {/* Navigation Arrows - Smaller on mobile */}
      <button
        onClick={() => scroll('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-1.5 md:p-2 hover:bg-gray-50 transition-colors opacity-80 hover:opacity-100"
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
      </button>
      
      <button
        onClick={() => scroll('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-1.5 md:p-2 hover:bg-gray-50 transition-colors opacity-80 hover:opacity-100"
        aria-label="Scroll right"
      >
        <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
      </button>

      {/* Scroll Container */}
      <div
        ref={scrollRef}
        className="flex gap-3 md:gap-6 overflow-x-auto scrollbar-hide px-8 md:px-12 py-3 md:py-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {hospitals.map((hospital, index) => {
          const name = hospital.name || 'Hospital Name';
          const location = hospital.address ? `${hospital.city || ''}, ${hospital.state || ''}`.trim() : 'Location';
          const logoUrl = hospital.profile && typeof hospital.profile === 'object' && 'logoUrl' in hospital.profile ? (hospital.profile as any).logoUrl : null;
          
          return (
            <motion.div
              key={hospital.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex-shrink-0"
            >
              <div className="group bg-white rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 w-56 md:w-80 p-4 md:p-6 border border-gray-100">
                {/* Hospital Header - Compact on mobile */}
                <div className="flex items-center mb-3 md:mb-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg md:rounded-xl flex items-center justify-center text-white font-bold text-lg md:text-xl mr-3 md:mr-4">
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={logoUrl} 
                        alt={name} 
                        className="w-10 h-10 md:w-14 md:h-14 rounded-lg md:rounded-xl object-cover"
                      />
                    ) : (
                      <Building2 className="w-6 h-6 md:w-8 md:h-8" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm md:text-lg font-bold text-gray-900 truncate">{name}</h3>
                    <p className="text-blue-600 font-semibold text-xs md:text-sm truncate">Multi-Specialty</p>
                  </div>
                </div>

                {/* Hospital Details - Compact on mobile */}
                <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
                  {location && (
                    <div className="flex items-center text-gray-600 text-xs md:text-sm">
                      <MapPin className="w-3 h-3 md:w-4 md:h-4 text-blue-500 mr-1.5 md:mr-2 flex-shrink-0" />
                      <span className="truncate">{location}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center text-gray-600 text-xs md:text-sm">
                    <Building2 className="w-3 h-3 md:w-4 md:h-4 text-emerald-500 mr-1.5 md:mr-2 flex-shrink-0" />
                    <span>{hospital._count?.departments || 0} Depts</span>
                  </div>
                  
                  <div className="flex items-center text-gray-600 text-xs md:text-sm">
                    <Users className="w-3 h-3 md:w-4 md:h-4 text-green-500 mr-1.5 md:mr-2 flex-shrink-0" />
                    <span>{hospital._count?.doctors || 0} Doctors</span>
                  </div>
                  
                  {hospital.phone && (
                    <div className="flex items-center text-gray-600 text-xs md:text-sm">
                      <Phone className="w-3 h-3 md:w-4 md:h-4 text-gray-500 mr-1.5 md:mr-2 flex-shrink-0" />
                      <span className="truncate">{hospital.phone}</span>
                    </div>
                  )}
                </div>

                {/* Visit Button - Compact on mobile */}
                <a
                  href={`/hospital-site/${hospital.id}`}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold py-2 md:py-3 px-4 md:px-6 rounded-lg md:rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-200 block text-center text-xs md:text-base"
                >
                  Visit
                </a>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Fade Gradients */}
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white to-transparent pointer-events-none"></div>
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white to-transparent pointer-events-none"></div>
    </div>
  );
}
