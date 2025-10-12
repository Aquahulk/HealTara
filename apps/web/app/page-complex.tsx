"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import BookAppointmentModal from '@/components/BookAppointmentModal';
import HorizontalDoctorScroll from '@/components/HorizontalDoctorScroll';
import HorizontalHospitalScroll from '@/components/HorizontalHospitalScroll';
import Header from '@/components/Header';
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
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Animation refs
  const heroRef = useRef(null);
  const statsRef = useRef(null);
  const featuresRef = useRef(null);
  const doctorsRef = useRef(null);
  const hospitalsRef = useRef(null);

  // Scroll-based animations
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  // In view animations
  const isHeroInView = useInView(heroRef, { once: true });
  const isStatsInView = useInView(statsRef, { once: true });
  const isFeaturesInView = useInView(featuresRef, { once: true });
  const isDoctorsInView = useInView(doctorsRef, { once: true });
  const isHospitalsInView = useInView(hospitalsRef, { once: true });

  // ============================================================================
  // 🔄 DATA LOADING - Optimized parallel loading
  // ============================================================================
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Fetch data in parallel for maximum performance
        const [hospitalsRes, doctorsRes] = await Promise.allSettled([
          apiClient.getHospitals(),
          apiClient.getDoctors({ sort: 'trending', page: 1, pageSize: 20 })
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

  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0 }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const scaleIn = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-emerald-50 to-blue-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-blue-200 border-r-blue-500 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
          </div>
          <p className="text-gray-600 font-medium">Loading healthcare providers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-emerald-50 to-blue-50">
      <Header />
      
      <main>
        {/* ============================================================================
            🌟 HERO SECTION - Professional with Parallax Effects
            ============================================================================ */}
        <section ref={heroRef} className="relative min-h-screen flex items-center justify-center px-4 py-20 overflow-hidden">
          {/* Parallax Background */}
          <motion.div 
            style={{ y: heroY, opacity: heroOpacity }}
            className="absolute inset-0 bg-gradient-to-br from-emerald-100 via-white to-blue-100"
          />
          
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
            className="absolute top-20 left-20 text-6xl opacity-20"
          >
            <Stethoscope className="text-emerald-500" />
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
            className="absolute top-32 right-32 text-5xl opacity-15"
          >
            <Pill className="text-blue-500" />
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
            className="absolute bottom-32 left-1/4 text-4xl opacity-20"
          >
            <Heart className="text-emerald-400" />
          </motion.div>

          <div className="relative z-10 max-w-7xl mx-auto text-center">
            {/* Main Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.8 }}
            >
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
            </motion.div>

            {/* Search Container */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="max-w-4xl mx-auto mb-12"
            >
              <div className="bg-white/80 backdrop-blur-sm border border-emerald-200 rounded-2xl p-6 shadow-xl">
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

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-wrap justify-center gap-6"
            >
              <button className="group bg-white border border-emerald-200 rounded-xl px-8 py-4 hover:bg-emerald-50 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                <div className="flex items-center space-x-3">
                  <Building2 className="w-6 h-6 text-emerald-500 group-hover:text-emerald-600" />
                  <span className="text-gray-900 font-semibold">Find Hospitals</span>
                </div>
              </button>
              
              <button className="group bg-white border border-blue-200 rounded-xl px-8 py-4 hover:bg-blue-50 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                <div className="flex items-center space-x-3">
                  <Users className="w-6 h-6 text-blue-500 group-hover:text-blue-600" />
                  <span className="text-gray-900 font-semibold">Book Doctor</span>
                </div>
              </button>
              
              <button className="group bg-white border border-red-200 rounded-xl px-8 py-4 hover:bg-red-50 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                <div className="flex items-center space-x-3">
                  <Activity className="w-6 h-6 text-red-500 group-hover:text-red-600" />
                  <span className="text-gray-900 font-semibold">Emergency</span>
                </div>
              </button>
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
                className="text-gray-400"
              >
                <ArrowDown className="w-6 h-6" />
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ============================================================================
            📊 STATISTICS SECTION - Animated Counters
            ============================================================================ */}
        <section ref={statsRef} className="relative py-20 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate={isStatsInView ? "visible" : "hidden"}
              className="grid grid-cols-2 md:grid-cols-4 gap-8"
            >
              {[
                { label: "Expert Doctors", value: 2500, icon: Users, color: "from-emerald-500 to-teal-500" },
                { label: "Happy Patients", value: 100000, icon: Heart, color: "from-blue-500 to-cyan-500" },
                { label: "Cities Covered", value: 75, icon: MapPin, color: "from-purple-500 to-pink-500" },
                { label: "Partner Hospitals", value: 150, icon: Building2, color: "from-orange-500 to-red-500" }
              ].map((stat, index) => (
                <motion.div key={index} variants={scaleIn} className="text-center">
                  <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100">
                    <div className={`w-16 h-16 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center mx-auto mb-4`}>
                      <stat.icon className="w-8 h-8 text-white" />
                    </div>
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={isStatsInView ? { scale: 1 } : { scale: 0 }}
                      transition={{ delay: index * 0.1 + 0.5 }}
                      className={`text-4xl font-black bg-gradient-to-r ${stat.color} bg-clip-text text-transparent mb-2`}
                    >
                      {stat.value.toLocaleString()}+
                    </motion.div>
                    <div className="text-gray-600 font-medium">{stat.label}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ============================================================================
            🎯 DOCTORS SECTION - Horizontal Scroll + Grid
            ============================================================================ */}
        <section ref={doctorsRef} className="relative py-20 px-4 bg-gradient-to-br from-emerald-50 to-white">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={isDoctorsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
                Featured Healthcare Providers
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 mx-auto mb-6"></div>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Meet our top-rated doctors and specialists, verified by our AI system for excellence in care.
              </p>
            </motion.div>

            {/* Horizontal Scroll */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={isDoctorsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mb-16"
            >
              <HorizontalDoctorScroll 
                doctors={filteredDoctors} 
                onBookAppointment={handleBookAppointment}
              />
            </motion.div>

            {/* Grid View */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate={isDoctorsInView ? "visible" : "hidden"}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {filteredDoctors.slice(0, 6).map((doctor, index) => (
                <motion.div key={doctor.id} variants={fadeInUp}>
                  <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-6 border border-gray-100">
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

                    <button
                      onClick={() => handleBookAppointment(doctor)}
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold py-3 px-6 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-emerald-200"
                    >
                      Book Appointment
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ============================================================================
            🏥 HOSPITALS SECTION - Horizontal Scroll + Grid
            ============================================================================ */}
        <section ref={hospitalsRef} className="relative py-20 px-4 bg-gradient-to-br from-blue-50 to-white">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={isHospitalsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
                Partner Hospitals
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 mx-auto mb-6"></div>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Discover our partner hospitals offering world-class healthcare services and specialized treatments.
              </p>
            </motion.div>

            {/* Horizontal Scroll */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={isHospitalsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mb-16"
            >
              <HorizontalHospitalScroll hospitals={hospitals} />
            </motion.div>

            {/* Grid View */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate={isHospitalsInView ? "visible" : "hidden"}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {hospitals.slice(0, 6).map((hospital, index) => {
                const name = hospital.name || 'Hospital Name';
                const location = hospital.address ? `${hospital.city || ''}, ${hospital.state || ''}`.trim() : 'Location';
                const logoUrl = hospital.profile && typeof hospital.profile === 'object' && 'logoUrl' in hospital.profile ? (hospital.profile as any).logoUrl : null;
                
                return (
                  <motion.div key={hospital.id} variants={fadeInUp}>
                    <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-6 border border-gray-100">
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
                            <Clock className="w-4 h-4 text-gray-500 mr-2" />
                            <span>{hospital.phone}</span>
                          </div>
                        )}
                      </div>

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
            </motion.div>
          </div>
        </section>

        {/* ============================================================================
            🌟 FEATURES SECTION - Professional Icons
            ============================================================================ */}
        <section ref={featuresRef} className="relative py-20 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={isFeaturesInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
                Why Choose Our Platform?
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-emerald-500 to-blue-500 mx-auto mb-6"></div>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Experience the future of healthcare with our revolutionary platform features.
              </p>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate={isFeaturesInView ? "visible" : "hidden"}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
            >
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
                  color: "from-blue-500 to-cyan-500"
                },
                {
                  icon: Building2,
                  title: "Hospital Network",
                  description: "Access to premium hospitals and specialized departments",
                  color: "from-purple-500 to-pink-500"
                },
                {
                  icon: Smartphone,
                  title: "Mobile First",
                  description: "Seamless experience across all devices and platforms",
                  color: "from-orange-500 to-red-500"
                }
              ].map((feature, index) => (
                <motion.div key={index} variants={scaleIn}>
                  <div className="group bg-white rounded-2xl p-8 text-center hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 hover:border-emerald-200">
                    <div className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      </main>

      {/* ============================================================================
          📅 BOOKING MODAL
          ============================================================================ */}
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