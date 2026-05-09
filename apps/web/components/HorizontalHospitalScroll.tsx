"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, MapPin, Building2, Users, Phone } from "lucide-react";
import SaveButton from "@/components/SaveButton";
import { EnhancedRatingDisplay } from './SimpleRatingDisplay';

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
              <div className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 w-48 md:w-64 p-3 md:p-4 border border-gray-100 relative">
                <div className="absolute top-1.5 right-1.5 z-20 scale-90">
                    <SaveButton entityType="hospital" entityId={hospital.id} />
                </div>
                {/* Hospital Header - Compact on mobile */}
                <div className="flex items-center mb-2 md:mb-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold text-base md:text-lg mr-2 md:mr-3">
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={logoUrl} 
                        alt={name} 
                        className="w-8 h-8 md:w-10 md:h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <Building2 className="w-5 h-5 md:w-6 md:h-6" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs md:text-sm font-bold text-gray-900 truncate">{name}</h3>
                    <p className="text-blue-600 font-bold text-[10px] md:text-xs truncate">Hospital</p>
                  </div>
                </div>

                {/* Hospital Details - Compact on mobile */}
                <div className="space-y-1 md:space-y-2 mb-3 md:mb-4">
                  {location && (
                    <div className="flex items-center text-gray-600 text-[10px] md:text-xs">
                      <MapPin className="w-2.5 h-2.5 md:w-3 md:h-3 text-blue-500 mr-1 md:mr-1.5 flex-shrink-0" />
                      <span className="truncate">{location}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center text-gray-600 text-[10px] md:text-xs">
                    <Users className="w-2.5 h-2.5 md:w-3 md:h-3 text-green-500 mr-1 md:mr-1.5 flex-shrink-0" />
                    <span>{hospital._count?.doctors || 0} Doctors</span>
                  </div>

                  <div className="mt-1.5 pt-1.5 border-t border-gray-50">
                    <EnhancedRatingDisplay entityType="hospital" entityId={String(hospital.id)} size="sm" />
                  </div>
                </div>

                {/* Visit Button - Compact on mobile */}
                <a
                  href={`/hospital-site/${hospital.id}`}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-black py-1.5 md:py-2 px-3 md:px-4 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 shadow-sm block text-center text-[10px] md:text-xs uppercase"
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
