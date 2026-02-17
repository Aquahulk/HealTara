"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, MapPin, Clock, DollarSign } from "lucide-react";
import BookAppointmentModal from "./BookAppointmentModal";
import { Doctor } from '@/lib/api';

interface HorizontalDoctorScrollProps {
  doctors: Doctor[];
  onBookAppointment: (doctor: Doctor) => void;
}

export default function HorizontalDoctorScroll({ doctors, onBookAppointment }: HorizontalDoctorScrollProps) {
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
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

  const handleBookAppointment = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setShowBookingModal(true);
  };

  return (
    <>
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
          {doctors.map((doctor, index) => (
            <motion.div
              key={doctor.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex-shrink-0"
            >
              <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 w-80 p-6 border border-gray-100">
                {/* Doctor Header */}
                <div className="flex items-center mb-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-white font-bold text-xl mr-4">
                    👨‍⚕️
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">
                      Dr. {doctor.email.split('@')[0]}
                    </h3>
                    <p className="text-emerald-600 font-semibold text-sm">
                      {doctor.doctorProfile?.specialization || 'General Practitioner'}
                    </p>
                  </div>
                </div>

                {/* Doctor Details */}
                <div className="space-y-3 mb-6">
                  {doctor.doctorProfile?.city && (
                    <div className="flex items-center text-gray-600 text-sm">
                      <MapPin className="w-4 h-4 text-emerald-500 mr-2" />
                      <span>{doctor.doctorProfile.city}, {doctor.doctorProfile.state}</span>
                    </div>
                  )}
                  
                  {doctor.doctorProfile?.experience && (
                    <div className="flex items-center text-gray-600 text-sm">
                      <Clock className="w-4 h-4 text-blue-500 mr-2" />
                      <span>{doctor.doctorProfile.experience}+ Years Experience</span>
                    </div>
                  )}
                  
                  {doctor.doctorProfile?.consultationFee && (
                    <div className="flex items-center text-gray-600 text-sm">
                      <DollarSign className="w-4 h-4 text-green-500 mr-2" />
                      <span>₹{doctor.doctorProfile.consultationFee}</span>
                    </div>
                  )}
                </div>

                {/* Book Button */}
                <button
                  onClick={() => handleBookAppointment(doctor)}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold py-3 px-6 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-emerald-200"
                >
                  Book Appointment
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Fade Gradients */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white to-transparent pointer-events-none"></div>
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white to-transparent pointer-events-none"></div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && selectedDoctor && (
        <BookAppointmentModal
          open={showBookingModal}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedDoctor(null);
          }}
          doctor={selectedDoctor}
          doctorId={selectedDoctor.id}
          doctorName={`Dr. ${selectedDoctor.email.split('@')[0]}`}
          onSubmit={async (appointmentData) => {
            const { apiClient } = await import('@/lib/api');
            return apiClient.bookAppointment(appointmentData);
          }}
        />
      )}
    </>
  );
}
