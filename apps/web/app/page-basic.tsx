"use client";

import { useState, useEffect } from "react";
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import Header from '@/components/Header';

export default function HomePage() {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [hospitalsRes, doctorsRes] = await Promise.allSettled([
          apiClient.getHospitals(),
          apiClient.getDoctors({ sort: 'trending', page: 1, pageSize: 12 })
        ]);

        if (hospitalsRes.status === 'fulfilled') {
          setHospitals(hospitalsRes.value || []);
        }
        if (doctorsRes.status === 'fulfilled') {
          setDoctors(doctorsRes.value || []);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-emerald-50 to-blue-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 border-4 border-emerald-500 rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">Loading healthcare providers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-emerald-50 to-blue-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 py-20">
        {/* Hero Section */}
        <section className="text-center mb-20">
          <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-6 leading-tight">
            Find Your Perfect
            <span className="block bg-gradient-to-r from-emerald-500 to-blue-500 bg-clip-text text-transparent">
              Healthcare Provider
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed">
            Connect with top-rated doctors and hospitals. Book appointments instantly 
            with our AI-powered matching system.
          </p>
        </section>

        {/* Doctors Section */}
        <section className="mb-20">
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-16 text-center">
            Featured Healthcare Providers
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {doctors.slice(0, 6).map((doctor) => (
              <div key={doctor.id} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
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
                
                <div className="space-y-3 mb-6">
                  {doctor.doctorProfile?.city && (
                    <div className="flex items-center text-gray-600 text-sm">
                      <span className="w-4 h-4 bg-emerald-500 rounded mr-2"></span>
                      <span>{doctor.doctorProfile.city}, {doctor.doctorProfile.state}</span>
                    </div>
                  )}
                  
                  {doctor.doctorProfile?.experience && (
                    <div className="flex items-center text-gray-600 text-sm">
                      <span className="w-4 h-4 bg-blue-500 rounded mr-2"></span>
                      <span>{doctor.doctorProfile.experience}+ Years Experience</span>
                    </div>
                  )}
                  
                  {doctor.doctorProfile?.consultationFee && (
                    <div className="flex items-center text-gray-600 text-sm">
                      <span className="w-4 h-4 bg-green-500 rounded mr-2"></span>
                      <span>₹{doctor.doctorProfile.consultationFee}</span>
                    </div>
                  )}
                </div>

                <button className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold py-3 px-6 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all duration-300">
                  Book Appointment
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Hospitals Section */}
        <section className="mb-20">
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-16 text-center">
            Partner Hospitals
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {hospitals.slice(0, 6).map((hospital) => {
              const name = hospital.name || 'Hospital Name';
              const location = hospital.address ? `${hospital.city || ''}, ${hospital.state || ''}`.trim() : 'Location';
              
              return (
                <div key={hospital.id} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                  <div className="flex items-center mb-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold text-xl mr-4">
                      🏥
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900">{name}</h3>
                      <p className="text-blue-600 font-semibold text-sm">Multi-Specialty Hospital</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    {location && (
                      <div className="flex items-center text-gray-600 text-sm">
                        <span className="w-4 h-4 bg-blue-500 rounded mr-2"></span>
                        <span>{location}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center text-gray-600 text-sm">
                      <span className="w-4 h-4 bg-emerald-500 rounded mr-2"></span>
                      <span>{hospital._count?.departments || 0} Departments</span>
                    </div>
                    
                    <div className="flex items-center text-gray-600 text-sm">
                      <span className="w-4 h-4 bg-green-500 rounded mr-2"></span>
                      <span>{hospital._count?.doctors || 0} Doctors</span>
                    </div>
                  </div>

                  <a
                    href={`/hospital-site/${hospital.id}`}
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold py-3 px-6 rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 block text-center"
                  >
                    Visit Hospital
                  </a>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
