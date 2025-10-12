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
      {/* Navigation Arrows */}
      <button
        onClick={() => scroll('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50 transition-colors opacity-80 hover:opacity-100"
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-5 h-5 text-gray-600" />
      </button>
      
      <button
        onClick={() => scroll('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50 transition-colors opacity-80 hover:opacity-100"
        aria-label="Scroll right"
      >
        <ChevronRight className="w-5 h-5 text-gray-600" />
      </button>

      {/* Scroll Container */}
      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto scrollbar-hide px-12 py-4"
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
              <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 w-80 p-6 border border-gray-100">
                {/* Hospital Header */}
                <div className="flex items-center mb-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold text-xl mr-4">
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={logoUrl} 
                        alt={name} 
                        className="w-14 h-14 rounded-xl object-cover"
                      />
                    ) : (
                      <Building2 className="w-8 h-8" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{name}</h3>
                    <p className="text-blue-600 font-semibold text-sm">Multi-Specialty Hospital</p>
                  </div>
                </div>

                {/* Hospital Details */}
                <div className="space-y-3 mb-6">
                  {location && (
                    <div className="flex items-center text-gray-600 text-sm">
                      <MapPin className="w-4 h-4 text-blue-500 mr-2" />
                      <span>{location}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center text-gray-600 text-sm">
                    <Building2 className="w-4 h-4 text-emerald-500 mr-2" />
                    <span>{hospital._count?.departments || 0} Departments</span>
                  </div>
                  
                  <div className="flex items-center text-gray-600 text-sm">
                    <Users className="w-4 h-4 text-green-500 mr-2" />
                    <span>{hospital._count?.doctors || 0} Doctors</span>
                  </div>
                  
                  {hospital.phone && (
                    <div className="flex items-center text-gray-600 text-sm">
                      <Phone className="w-4 h-4 text-gray-500 mr-2" />
                      <span>{hospital.phone}</span>
                    </div>
                  )}
                </div>

                {/* Visit Button */}
                <a
                  href={`/hospital-site/${hospital.id}`}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold py-3 px-6 rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-200 block text-center"
                >
                  Visit Hospital
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
