"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import Header from '@/components/Header';
import BookAppointmentModal from '@/components/BookAppointmentModal';
import { 
  Search, 
  ArrowDown, 
  MapPin, 
  Clock, 
  DollarSign,
  Users,
  Building2,
  Shield,
  Zap,
  Heart,
  Smartphone,
  Stethoscope,
  Pill,
  Activity
} from "lucide-react";

export default function HomePage() {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        console.log('Loading data...');

        const [hospitalsRes, doctorsRes] = await Promise.allSettled([
          apiClient.getHospitals(),
          apiClient.getDoctors({ sort: 'trending', page: 1, pageSize: 12 })
        ]);

        console.log('Hospitals response:', hospitalsRes);
        console.log('Doctors response:', doctorsRes);

        if (hospitalsRes.status === 'fulfilled') {
          setHospitals(hospitalsRes.value || []);
          console.log('Hospitals loaded:', hospitalsRes.value?.length || 0);
        }
        if (doctorsRes.status === 'fulfilled') {
          setDoctors(doctorsRes.value || []);
          console.log('Doctors loaded:', doctorsRes.value?.length || 0);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleBookAppointment = (doctor: any) => {
    setSelectedDoctor(doctor);
    setShowAppointmentModal(true);
  };

  const filteredDoctors = doctors.filter((doctor: any) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    const profile = doctor.doctorProfile;
    return (
      profile?.specialization?.toLowerCase().includes(query) ||
      profile?.clinicName?.toLowerCase().includes(query) ||
      profile?.city?.toLowerCase().includes(query) ||
      doctor.email?.toLowerCase().includes(query)
    );
  });

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="relative py-16 px-4 overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-slate-800 to-indigo-900" />
          
          {/* Floating Medical Icons */}
          <motion.div
            animate={{
              y: [0, -20, 0],
              rotate: [0, 5, 0]
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-20 left-20 text-6xl opacity-30"
          >
            <Stethoscope className="text-emerald-300" />
          </motion.div>
          
          <motion.div
            animate={{
              y: [0, 15, 0],
              rotate: [0, -5, 0]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
            className="absolute top-32 right-32 text-5xl opacity-25"
          >
            <Pill className="text-blue-300" />
          </motion.div>
          
          <motion.div
            animate={{
              y: [0, -10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2
            }}
            className="absolute bottom-32 left-1/4 text-4xl opacity-30"
          >
            <Heart className="text-emerald-300" />
          </motion.div>

          <div className="relative z-10 max-w-6xl mx-auto text-center flex items-center justify-center min-h-[60vh]">
            {/* Main Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-4xl md:text-6xl font-black text-white mb-4 leading-tight">
                Find Your Perfect
                <span className="block bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                  Healthcare Provider
                </span>
          </h1>
              
              <p className="text-lg md:text-xl text-gray-200 mb-6 max-w-3xl mx-auto leading-relaxed">
                Connect with top-rated doctors and hospitals. Book appointments instantly 
                with our AI-powered matching system.
              </p>
            </motion.div>

            {/* Search Container */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="max-w-3xl mx-auto mb-8"
            >
              <div className="bg-white/90 backdrop-blur-sm border border-emerald-300 rounded-2xl p-6 shadow-xl">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                      placeholder="Search doctors, hospitals, or specialties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300"
              />
                  </div>
                  <button className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 transform hover:scale-105 shadow-lg">
                Search
              </button>
            </div>
          </div>
            </motion.div>

            {/* Scroll Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
            >
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-gray-300"
              >
                <ArrowDown className="w-6 h-6" />
              </motion.div>
            </motion.div>
        </div>
      </section>

        {/* Statistics Section */}
        <section className="relative py-12 px-4 bg-gradient-to-br from-emerald-600 via-blue-700 to-purple-800">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: "Expert Doctors", value: 2500, icon: Users, color: "from-emerald-500 to-teal-500" },
                { label: "Happy Patients", value: 100000, icon: Heart, color: "from-blue-600 to-slate-600" },
                { label: "Cities Covered", value: 75, icon: MapPin, color: "from-slate-600 to-blue-700" },
                { label: "Partner Hospitals", value: 150, icon: Building2, color: "from-blue-700 to-slate-800" }
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100">
                    <div className={`w-16 h-16 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center mx-auto mb-4`}>
                      <stat.icon className="w-8 h-8 text-white" />
            </div>
                    <div className={`text-4xl font-black bg-gradient-to-r ${stat.color} bg-clip-text text-transparent mb-2`}>
                      {stat.value.toLocaleString()}+
            </div>
                    <div className="text-gray-600 font-medium">{stat.label}</div>
          </div>
        </div>
            ))}
          </div>
        </div>
      </section>

        {/* Doctors Section */}
        <section className="relative py-12 px-4 bg-gradient-to-br from-purple-600 via-pink-700 to-red-600">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            Featured Healthcare Providers
          </h2>
              <div className="w-20 h-1 bg-gradient-to-r from-purple-400 to-pink-400 mx-auto mb-4"></div>
              <p className="text-lg text-gray-200 max-w-2xl mx-auto">
                Meet our top-rated doctors and specialists, verified by our AI system for excellence in care.
              </p>
          </div>

            {/* Vertical Doctor Cards - One per row */}
            <div className="space-y-4 mb-8">
              {filteredDoctors.slice(0, 6).map((doctor, index) => (
                <motion.div 
                key={doctor.id}
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-6 border border-gray-100 w-full">
                    <div className="flex items-center justify-between">
                      {/* Doctor Info */}
                      <div className="flex items-center flex-1">
                        <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-white font-bold text-2xl mr-6">
                          👨‍⚕️
          </div>
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold text-gray-900 mb-2">
                            Dr. {doctor.email.split('@')[0]}
                          </h3>
                          <p className="text-emerald-600 font-semibold text-lg mb-3">
                            {doctor.doctorProfile?.specialization || 'General Practitioner'}
                          </p>
                          
                          <div className="flex flex-wrap gap-6">
                            {doctor.doctorProfile?.city && (
                              <div className="flex items-center text-gray-600">
                                <MapPin className="w-5 h-5 text-emerald-500 mr-2" />
                                <span>{doctor.doctorProfile.city}, {doctor.doctorProfile.state}</span>
            </div>
          )}
                            
                            {doctor.doctorProfile?.experience && (
                              <div className="flex items-center text-gray-600">
                                <Clock className="w-5 h-5 text-blue-500 mr-2" />
                                <span>{doctor.doctorProfile.experience}+ Years Experience</span>
            </div>
          )}
                            
                            {doctor.doctorProfile?.consultationFee && (
                              <div className="flex items-center text-gray-600">
                                <DollarSign className="w-5 h-5 text-green-500 mr-2" />
                                <span>₹{doctor.doctorProfile.consultationFee}</span>
            </div>
          )}
        </div>
                        </div>
                      </div>

                      {/* Book Button */}
                      <div className="ml-6">
                        <button 
                          onClick={() => handleBookAppointment(doctor)}
                          className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold py-4 px-8 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-emerald-200 min-w-[200px]"
                        >
                          Book Appointment
                        </button>
                      </div>
                </div>
              </div>
                </motion.div>
            ))}
          </div>
        </div>
      </section>

        {/* Hospitals Section */}
        <section className="relative py-12 px-4 bg-gradient-to-br from-orange-600 via-yellow-600 to-green-600">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
                Partner Hospitals
          </h2>
              <div className="w-20 h-1 bg-gradient-to-r from-orange-400 to-green-400 mx-auto mb-4"></div>
              <p className="text-lg text-gray-200 max-w-2xl mx-auto">
                Discover our partner hospitals offering world-class healthcare services and specialized treatments.
              </p>
            </div>

            {/* Vertical Hospital Cards - One per row */}
            <div className="space-y-4 mb-8">
              {hospitals.slice(0, 6).map((hospital, index) => {
                const name = hospital.name || 'Hospital Name';
                const location = hospital.address ? `${hospital.city || ''}, ${hospital.state || ''}`.trim() : 'Location';
                
                return (
                  <motion.div 
                    key={hospital.id}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-6 border border-gray-100 w-full">
                      <div className="flex items-center justify-between">
                        {/* Hospital Info */}
                        <div className="flex items-center flex-1">
                          <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-slate-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl mr-6">
                            🏥
                          </div>
                          <div className="flex-1">
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">{name}</h3>
                            <p className="text-blue-600 font-semibold text-lg mb-3">Multi-Specialty Hospital</p>
                            
                            <div className="flex flex-wrap gap-6">
                              {location && (
                                <div className="flex items-center text-gray-600">
                                  <MapPin className="w-5 h-5 text-blue-500 mr-2" />
                                  <span>{location}</span>
                                </div>
                              )}
                              
                              <div className="flex items-center text-gray-600">
                                <Building2 className="w-5 h-5 text-emerald-500 mr-2" />
                                <span>{hospital._count?.departments || 0} Departments</span>
                              </div>
                              
                              <div className="flex items-center text-gray-600">
                                <Users className="w-5 h-5 text-green-500 mr-2" />
                                <span>{hospital._count?.doctors || 0} Doctors</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Visit Button */}
                        <div className="ml-6">
                          <a
                            href={`/hospital-site/${hospital.id}`}
                            className="bg-gradient-to-r from-blue-600 to-slate-600 text-white font-bold py-4 px-8 rounded-xl hover:from-blue-700 hover:to-slate-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-200 block text-center min-w-[200px]"
                          >
                            Visit Hospital
                          </a>
                        </div>
                </div>
              </div>
                  </motion.div>
                );
              })}
          </div>
        </div>
      </section>

        {/* Features Section */}
        <section className="relative py-12 px-4 bg-gradient-to-br from-indigo-600 via-cyan-600 to-teal-600">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
                Why Choose Our Platform?
              </h2>
              <div className="w-20 h-1 bg-gradient-to-r from-indigo-400 to-teal-400 mx-auto mb-4"></div>
              <p className="text-lg text-gray-200 max-w-2xl mx-auto">
                Experience the future of healthcare with our revolutionary platform features.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: Shield,
                  title: "AI-Powered Matching",
                  description: "Advanced algorithms match you with the perfect healthcare provider",
                  color: "from-emerald-500 to-teal-500"
                },
                {
                  icon: Zap,
                  title: "Instant Booking",
                  description: "Book appointments in seconds with real-time availability",
                  color: "from-blue-600 to-slate-600"
                },
                {
                  icon: Building2,
                  title: "Hospital Network",
                  description: "Access to premium hospitals and specialized departments",
                  color: "from-slate-600 to-blue-700"
                },
                {
                  icon: Smartphone,
                  title: "Mobile First",
                  description: "Seamless experience across all devices and platforms",
                  color: "from-blue-700 to-slate-800"
                }
              ].map((feature, index) => (
                <div key={index}>
                  <div className="group bg-white rounded-2xl p-6 text-center hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 hover:border-emerald-200">
                    <div className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="w-8 h-8 text-white" />
                </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      </main>

      {/* Booking Modal */}
      {showAppointmentModal && selectedDoctor && (
        <BookAppointmentModal
          open={showAppointmentModal}
          onClose={() => {
            setShowAppointmentModal(false);
            setSelectedDoctor(null);
          }}
          doctor={selectedDoctor}
          doctorId={selectedDoctor.id}
          doctorName={`Dr. ${selectedDoctor.email.split('@')[0]}`}
          onSubmit={async (appointmentData) => {
            try {
              if (appointmentData.time) {
                await apiClient.bookAppointment({
                  ...appointmentData,
                  time: appointmentData.time
                });
                setShowAppointmentModal(false);
                setSelectedDoctor(null);
                alert('Appointment booked successfully!');
              }
            } catch (error) {
              console.error('Error booking appointment:', error);
              alert('Failed to book appointment. Please try again.');
            }
          }}
          patientLoggedIn={!!user}
          patientRole={user?.role}
        />
      )}
    </div>
  );
}
