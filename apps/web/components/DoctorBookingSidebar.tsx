"use client";

import { useState } from "react";
import DoctorBookingCTA from "@/components/DoctorBookingCTA";

interface DoctorLink {
  doctor: {
    id: number;
    email: string;
    doctorProfile?: {
      slug?: string;
      specialization?: string;
      clinicName?: string;
      profileImage?: string;
      qualifications?: string;
      experience?: number;
      consultationFee?: number;
      about?: string;
      services?: string[];
      workingHours?: string;
    } | null;
  };
  department?: { id: number; name: string } | null;
}

interface DoctorBookingSidebarProps {
  doctors: DoctorLink[];
  hospitalName: string;
  contacts: {
    reception?: string;
    emergency?: string;
    ambulance?: string;
    appointment?: string;
    healthCheckups?: string;
    fax?: string;
  };
}

export default function DoctorBookingSidebar({ 
  doctors, 
  hospitalName, 
  contacts 
}: DoctorBookingSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const openSidebar = () => {
    setIsOpen(true);
  };

  const closeSidebar = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Trigger Button */}
      <button 
        onClick={openSidebar}
        className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 px-8 rounded-full hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
      >
        📅 Book Appointment
      </button>

      {/* Sidebar Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`fixed top-0 right-0 h-full w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 overflow-y-auto ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Book Appointment</h2>
            <button 
              onClick={closeSidebar}
              className="text-2xl hover:scale-110 transition-transform duration-200"
            >
              ✕
            </button>
          </div>
          <p className="text-blue-100">Select a doctor and book your appointment</p>
        </div>

        {/* Doctor List */}
        <div className="p-6">
          {doctors.length > 0 ? (
            <div className="space-y-4">
              {doctors.map((link, index) => {
                const doctor = link.doctor;
                const profile = doctor.doctorProfile;
                
                if (!profile) return null;
                
                return (
                  <div key={index} className="bg-gray-50 p-4 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200">
                    <div className="flex items-start space-x-4">
                      {/* Doctor Avatar */}
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
                        {profile.profileImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img 
                            src={profile.profileImage} 
                            alt={doctor.email.split('@')[0]} 
                            className="w-14 h-14 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl">👨‍⚕️</span>
                        )}
                      </div>
                      
                      {/* Doctor Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                          Dr. {doctor.email.split('@')[0]}
                        </h3>
                        <p className="text-blue-600 font-semibold text-sm mb-2">{profile.specialization}</p>
                        
                        <div className="space-y-1 text-sm text-gray-600">
                          {profile.experience && (
                            <div className="flex items-center">
                              <span className="text-blue-500 mr-1">⏰</span>
                              <span>{profile.experience}+ Years</span>
                            </div>
                          )}
                          
                          {profile.consultationFee && (
                            <div className="flex items-center">
                              <span className="text-green-500 mr-1">💰</span>
                              <span>₹{profile.consultationFee}</span>
                            </div>
                          )}
                          
                          {link.department && (
                            <div className="flex items-center">
                              <span className="text-purple-500 mr-1">🏥</span>
                              <span>{link.department.name}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Book Button */}
                        <div className="mt-3">
                          <DoctorBookingCTA doctorId={doctor.id} clinicName={profile.clinicName || hospitalName} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👩‍⚕️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Doctors Available</h3>
              <p className="text-gray-600">Please check back later or contact us directly.</p>
              {contacts.reception && (
                <a 
                  href={`tel:${contacts.reception}`}
                  className="inline-block mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Call Reception
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
